import type {
  Asset,
  Component,
  ComponentLogEntry,
  DrydockSlot,
  WorkOrder,
  WorkRequest,
} from '../data/types'
import { fmtNum } from './format'

// ---------------------------------------------------------------------------
// Ad-hoc reporting engine. Each dataset flattens domain entities into plain
// rows; widgets pick a dimension (group-by column), a measure (aggregate),
// and an optional filter — the Power BI "field wells" model, computed live
// from the local store.
// ---------------------------------------------------------------------------
export interface ReportData {
  assets: Asset[]
  components: Component[]
  workOrders: WorkOrder[]
  workRequests: WorkRequest[]
  componentLogs: ComponentLogEntry[]
  drydockSlots: DrydockSlot[]
}

export type Row = Record<string, string | number | undefined>

export interface DimensionDef {
  id: string // row property to group by
  label: string
}

export interface MeasureDef {
  id: string
  label: string
  agg: (rows: Row[]) => number
  fmt: (n: number) => string
}

export interface FilterDef {
  id: string
  label: string
  pred: (r: Row) => boolean
}

export interface DatasetDef {
  id: string
  label: string
  rows: (d: ReportData) => Row[]
  dimensions: DimensionDef[]
  measures: MeasureDef[]
  filters: FilterDef[] // first entry is the default
  timeKey?: string // row property with an ISO date — enables trend widgets
}

const count: MeasureDef['agg'] = (rows) => rows.length
const sum =
  (key: string): MeasureDef['agg'] =>
  (rows) =>
    rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
const maxOf =
  (key: string): MeasureDef['agg'] =>
  (rows) =>
    rows.reduce((m, r) => Math.max(m, Number(r[key]) || 0), 0)

const int = (n: number) => fmtNum(Math.round(n))
const hrs = (n: number) => `${fmtNum(Math.round(n * 10) / 10)} hrs`

const all: FilterDef = { id: 'all', label: 'All', pred: () => true }

const assetName = (d: ReportData) => {
  const m = new Map(d.assets.map((a) => [a.id, a.name]))
  return (id: string) => m.get(id) ?? id
}

export const datasets: DatasetDef[] = [
  {
    id: 'workOrders',
    label: 'Work Orders',
    rows: (d) => {
      const name = assetName(d)
      return d.workOrders.map((w) => ({
        asset: name(w.assetId),
        category: w.category,
        status: w.status,
        priority: w.priority,
        workType: w.isPreventive ? 'Preventive' : 'Corrective',
        assigned: w.assignedTo,
        estHours: w.estHours,
        laborHours: w.laborEntries.reduce((s, l) => s + l.hours, 0),
        date: w.completedAt ?? w.dueDate,
      }))
    },
    dimensions: [
      { id: 'asset', label: 'Asset' },
      { id: 'category', label: 'Category' },
      { id: 'status', label: 'Status' },
      { id: 'priority', label: 'Priority' },
      { id: 'workType', label: 'Preventive vs Corrective' },
      { id: 'assigned', label: 'Assigned To' },
    ],
    measures: [
      { id: 'count', label: 'Work order count', agg: count, fmt: int },
      { id: 'laborHours', label: 'Labor hours', agg: sum('laborHours'), fmt: hrs },
      { id: 'estHours', label: 'Estimated hours', agg: sum('estHours'), fmt: hrs },
    ],
    filters: [
      all,
      { id: 'open', label: 'Open only', pred: (r) => r.status !== 'Completed' },
      { id: 'completed', label: 'Completed only', pred: (r) => r.status === 'Completed' },
      { id: 'corrective', label: 'Corrective only', pred: (r) => r.workType === 'Corrective' },
      { id: 'preventive', label: 'Preventive only', pred: (r) => r.workType === 'Preventive' },
    ],
    timeKey: 'date',
  },
  {
    id: 'labor',
    label: 'Labor & Cost',
    rows: (d) => {
      const name = assetName(d)
      return d.workOrders.flatMap((w) =>
        w.laborEntries.map((l) => ({
          asset: name(w.assetId),
          category: w.category,
          worker: l.worker,
          costCategory: l.costCategory,
          hours: l.hours,
          date: w.completedAt ?? w.dueDate,
        })),
      )
    },
    dimensions: [
      { id: 'worker', label: 'Worker' },
      { id: 'costCategory', label: 'Cost Category' },
      { id: 'asset', label: 'Asset' },
      { id: 'category', label: 'Work Category' },
    ],
    measures: [
      { id: 'hours', label: 'Labor hours', agg: sum('hours'), fmt: hrs },
      { id: 'count', label: 'Labor entries', agg: count, fmt: int },
    ],
    filters: [
      all,
      { id: 'contract', label: 'Contract labor', pred: (r) => r.costCategory === 'Contract Labor' },
      { id: 'vessel', label: 'Vessel labor', pred: (r) => r.costCategory === 'Vessel Labor' },
    ],
    timeKey: 'date',
  },
  {
    id: 'workRequests',
    label: 'Deficiencies',
    rows: (d) => {
      const name = assetName(d)
      return d.workRequests.map((r) => ({
        asset: name(r.assetId),
        status: r.status,
        priority: r.priority,
        reportedBy: r.reportedBy,
        date: r.reportedAt,
      }))
    },
    dimensions: [
      { id: 'asset', label: 'Asset' },
      { id: 'status', label: 'Status' },
      { id: 'priority', label: 'Priority' },
      { id: 'reportedBy', label: 'Reported By' },
    ],
    measures: [{ id: 'count', label: 'Deficiency count', agg: count, fmt: int }],
    filters: [
      all,
      { id: 'open', label: 'Open only', pred: (r) => r.status !== 'Resolved' && r.status !== 'Closed' },
      { id: 'resolved', label: 'Resolved only', pred: (r) => r.status === 'Resolved' || r.status === 'Closed' },
    ],
    timeKey: 'date',
  },
  {
    id: 'componentLogs',
    label: 'Hour Readings',
    rows: (d) => {
      const name = assetName(d)
      const comp = new Map(d.components.map((c) => [c.id, c.name]))
      return d.componentLogs.map((l) => ({
        asset: name(l.assetId),
        component: comp.get(l.componentId) ?? l.componentId,
        recordedBy: l.recordedBy,
        reading: l.reading,
        date: l.at,
      }))
    },
    dimensions: [
      { id: 'asset', label: 'Asset' },
      { id: 'component', label: 'Component' },
      { id: 'recordedBy', label: 'Recorded By' },
    ],
    measures: [
      { id: 'count', label: 'Readings logged', agg: count, fmt: int },
      { id: 'peak', label: 'Peak meter reading', agg: maxOf('reading'), fmt: hrs },
    ],
    filters: [all],
    timeKey: 'date',
  },
  {
    id: 'drydock',
    label: 'Drydock Plan',
    rows: (d) => {
      const name = assetName(d)
      return d.drydockSlots.map((s) => ({
        asset: name(s.assetId),
        code: s.code,
        // '2026-07-A' → mid-half date for the trend axis
        date: `${s.period.slice(0, 7)}-${s.period.endsWith('A') ? '08' : '23'}`,
      }))
    },
    dimensions: [
      { id: 'asset', label: 'Asset' },
      { id: 'code', label: 'Service Code' },
    ],
    measures: [{ id: 'count', label: 'Planned yard periods', agg: count, fmt: int }],
    filters: [
      all,
      { id: 'regulatory', label: 'Regulatory (RDD) only', pred: (r) => r.code === 'RDD' },
    ],
    timeKey: 'date',
  },
  {
    id: 'assets',
    label: 'Fleet',
    rows: (d) =>
      d.assets.map((a) => ({
        name: a.name,
        type: a.type,
        status: a.status,
        class: a.classCode,
        builder: a.manufacturer ?? '—',
        hours: a.hoursMeter ?? 0,
      })),
    dimensions: [
      { id: 'type', label: 'Asset Type' },
      { id: 'status', label: 'Status' },
      { id: 'class', label: 'Class' },
      { id: 'builder', label: 'Builder' },
    ],
    measures: [
      { id: 'count', label: 'Asset count', agg: count, fmt: int },
      { id: 'hours', label: 'Fleet running hours', agg: sum('hours'), fmt: hrs },
    ],
    filters: [all, { id: 'tugs', label: 'Tugs only', pred: (r) => r.type === 'Tug' }],
  },
]

export const getDataset = (id: string) => datasets.find((d) => d.id === id) ?? datasets[0]

export function resolve(ds: DatasetDef, measureId: string, dimensionId?: string, filterId?: string) {
  const measure = ds.measures.find((m) => m.id === measureId) ?? ds.measures[0]
  const dimension = dimensionId ? ds.dimensions.find((x) => x.id === dimensionId) ?? ds.dimensions[0] : undefined
  const filter = ds.filters.find((f) => f.id === filterId) ?? ds.filters[0]
  return { measure, dimension, filter }
}

// ---------------------------------------------------------------------------
// Aggregations
// ---------------------------------------------------------------------------
export interface Slice {
  label: string
  value: number
}

export function groupByDimension(rows: Row[], dim: DimensionDef, measure: MeasureDef, top = 10): Slice[] {
  const groups = new Map<string, Row[]>()
  rows.forEach((r) => {
    const key = String(r[dim.id] ?? '—')
    groups.set(key, [...(groups.get(key) ?? []), r])
  })
  return [...groups.entries()]
    .map(([label, g]) => ({ label, value: measure.agg(g) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, top)
}

export function groupByMonth(rows: Row[], timeKey: string, measure: MeasureDef, monthsBack = 12): Slice[] {
  const out: Slice[] = []
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - (monthsBack - 1))
  for (let i = 0; i < monthsBack; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const inMonth = rows.filter((r) => typeof r[timeKey] === 'string' && (r[timeKey] as string).startsWith(key))
    out.push({
      label: d.toLocaleDateString(undefined, { month: 'short' }),
      value: measure.agg(inMonth),
    })
    d.setMonth(d.getMonth() + 1)
  }
  return out
}
