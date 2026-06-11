// Domain model for marine Enterprise Asset Management.
// These shapes deliberately echo D365 F&SCM EAM entities so the local-first
// store can later map cleanly onto Dataverse / Finance & Supply Chain.

export type AssetType = 'Tug' | 'Dock' | 'Barge' | 'Crane'
export type AssetStatus = 'In Service' | 'Out of Service' | 'In Maintenance'

export interface Gauge {
  id: string
  label: string
  value: number
  unit: string
  // optional operating thresholds used to colour the readout
  min?: number
  max?: number
  warnBelow?: number // value below this is a warning (e.g. low fuel)
}

export interface Asset {
  id: string
  name: string
  type: AssetType
  status: AssetStatus
  location: string
  imageColor: string // gradient seed for placeholder imagery
  classCode: string // EAM functional location / asset class
  manufacturer?: string
  yearBuilt?: number
  hoursMeter?: number // running hours used to trigger PM
  gauges: Gauge[]
  // Regulatory dates driving the drydock planning board
  coiExpiration?: string // USCG Certificate of Inspection
  ismAuditDate?: string // last ISM / TSMS audit
  drydockExpiration?: string // latest date the next drydock must start
}

// A recurring service tracked against a component's hour meter. Insight tables
// project the next due point from the last completion + interval.
export interface ComponentService {
  name: string // e.g. 'Oil Change', 'Valve Adjustment'
  intervalHours: number
  lastCompletedAt?: string // ISO; absent = never completed
  lastCompletedHours?: number
}

// Equipment tree node (functional location -> component -> sub-component)
export interface Component {
  id: string
  assetId: string
  parentId: string | null
  name: string
  code: string
  category: string
  manufacturer?: string // OEM, e.g. 'Caterpillar' — drives manufacturer insight tables
  model?: string // e.g. '3512E'
  runningHours?: number // drives hour-based PM triggers
  nextServiceHours?: number
  avgHoursPerDay?: number // operating tempo used to project due dates
  services?: ComponentService[]
}

export type RoutineCategory =
  | 'Engine'
  | 'Generator'
  | 'Hull & Structure'
  | 'Deck & Safety'
  | 'Electrical'
  | 'Inspection'

export type ChecklistKind = 'yesno' | 'gauge'

export interface ChecklistStep {
  id: string
  instruction: string
  kind: ChecklistKind
  // for gauge steps:
  unit?: string
  min?: number
  max?: number
  target?: number
  // captured result (local)
  value?: number | null
  result?: 'pass' | 'fail' | 'flag' | null
  done?: boolean
  note?: string
}

export type WorkOrderStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue'
export type Priority = 'Low' | 'Normal' | 'Elevated' | 'High' | 'Critical'

export interface WorkOrder {
  id: string
  number: string // e.g. WO-10245
  title: string
  assetId: string
  componentId?: string
  category: RoutineCategory
  status: WorkOrderStatus
  priority: Priority
  isPreventive: boolean
  dueDate: string // ISO
  assignedTo: string
  jobAidUrl?: string // PDF job aid
  estHours: number
  steps: ChecklistStep[]
  laborEntries: LaborEntry[]
  createdAt: string
  completedAt?: string
}

export interface LaborEntry {
  id: string
  worker: string
  hours: number
  costCategory: string
  note?: string
}

export type RequestStatus = 'New' | 'Triaged' | 'In Progress' | 'Resolved' | 'Closed'

export interface WorkRequest {
  id: string
  number: string // WR-3389
  title: string
  description: string
  assetId: string
  componentId?: string
  priority: Priority
  status: RequestStatus
  reportedBy: string
  reportedAt: string
  // timeline / history of the deficiency
  history: { at: string; by: string; event: string }[]
}

export interface ComponentLogEntry {
  id: string
  assetId: string
  componentId: string
  at: string
  reading: number // hours on machine
  unit: string
  recordedBy: string
  note?: string
}

// Drydock planning board: each vessel × half-month period can carry a planned
// service code. Periods with no slot record are implicitly 'H' (in service) —
// the store stays sparse and every change is one sync op.
export type DrydockCode =
  | 'DD' // planned drydock / yard period
  | 'RDD' // regulatory drydock (USCG / class deadline)
  | 'OOS' // out of service / lay berth

export interface DrydockSlot {
  id: string // `${assetId}:${period}` keeps one record per cell
  assetId: string
  period: string // e.g. '2026-07-A' (1st–15th) / '2026-07-B' (16th–EOM)
  code: DrydockCode
  note?: string
}

// Saved report definitions ("Insight Tables") — cross-system summaries built
// from the captured logs. Each kind maps to a renderer that computes rows live
// from the local store (in production: a D365 saved query / Power BI dataset).
export type InsightCategory = 'Engineering' | 'Safety' | 'Operations' | 'Human Relations'

export type InsightTableKind =
  | 'manufacturer-summary' // engines of one OEM across the fleet, PM due projections
  | 'hours-log' // raw component hour readings
  | 'pm-status' // work orders for a routine category
  | 'deficiency-summary' // open work requests rolled up per asset
  | 'usage-projection' // charts: logged hours over time, trend fit, due-point crossings

export interface InsightTable {
  id: string
  name: string
  description: string
  category: InsightCategory
  resourceType: 'Assets' | 'Users'
  createdBy: string
  restricted: boolean
  kind: InsightTableKind
  manufacturer?: string // for manufacturer-summary
  routineCategory?: RoutineCategory // for pm-status
}

export interface Announcement {
  id: string
  title: string
  body: string
  pinned: boolean
  acknowledged: boolean
  date: string
}

// Ad-hoc analytics: a widget the user drops onto the report canvas. Dataset /
// dimension / measure / filter ids resolve against src/lib/reporting.ts.
export type ReportWidgetType = 'kpi' | 'bar' | 'line' | 'donut' | 'table'

export interface ReportWidget {
  id: string
  type: ReportWidgetType
  dataset: string
  measure: string
  dimension?: string
  filter?: string
  title?: string // user override; otherwise derived from the field wells
  size: 1 | 2 // grid columns spanned
  order: number
}

// A pending change waiting to sync to the D365 backend when connectivity returns.
export type SyncEntity =
  | 'workOrder'
  | 'workRequest'
  | 'componentLog'
  | 'checklistStep'
  | 'announcement'
  | 'drydockSlot'

export interface SyncOp {
  id: string
  entity: SyncEntity
  entityId: string
  op: 'create' | 'update'
  summary: string
  payload: unknown
  createdAt: string
  status: 'pending' | 'synced'
}
