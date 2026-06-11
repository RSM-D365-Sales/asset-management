import { useState } from 'react'
import type { DragEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BarChart3,
  GripVertical,
  Hash,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  PieChart,
  Table,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { db } from '../data/db'
import { uid } from '../data/sync'
import { EmptyState, PageHeader } from '../components/ui'
import { BarRows, DonutSvg, LineChartSvg } from '../components/charts'
import {
  getDataset,
  groupByDimension,
  groupByMonth,
  resolve,
} from '../lib/reporting'
import type { ReportData } from '../lib/reporting'
import type { ReportWidget, ReportWidgetType } from '../data/types'

// ---------------------------------------------------------------------------
// Widget palette — drag onto the canvas (or click) to add.
// ---------------------------------------------------------------------------
const palette: { type: ReportWidgetType; label: string; icon: typeof Hash; hint: string }[] = [
  { type: 'kpi', label: 'KPI Card', icon: Hash, hint: 'Single headline number' },
  { type: 'bar', label: 'Bar Chart', icon: BarChart3, hint: 'Compare across a dimension' },
  { type: 'line', label: 'Trend Line', icon: TrendingUp, hint: 'Measure by month' },
  { type: 'donut', label: 'Donut', icon: PieChart, hint: 'Share of total' },
  { type: 'table', label: 'Table', icon: Table, hint: 'Ranked breakdown' },
]

// Sensible starting field wells per widget type — each lands showing real data.
const defaults: Record<ReportWidgetType, Omit<ReportWidget, 'id' | 'order' | 'type'>> = {
  kpi: { dataset: 'workOrders', measure: 'count', filter: 'open', size: 1 },
  bar: { dataset: 'workOrders', measure: 'count', dimension: 'asset', filter: 'all', size: 1 },
  line: { dataset: 'workOrders', measure: 'count', filter: 'completed', size: 1 },
  donut: { dataset: 'workOrders', measure: 'count', dimension: 'category', filter: 'all', size: 1 },
  table: { dataset: 'labor', measure: 'hours', dimension: 'worker', filter: 'all', size: 1 },
}

const DRAG_TYPE = 'application/x-widget-type'
const DRAG_ID = 'application/x-widget-id'

const selectCls =
  'rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] font-medium text-slate-600 outline-none focus:border-navy-400'

function WidgetCard({
  widget,
  data,
  onRemove,
  onPatch,
  onDropBefore,
}: {
  widget: ReportWidget
  data: ReportData
  onRemove: () => void
  onPatch: (patch: Partial<ReportWidget>) => void
  onDropBefore: (draggedId: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const ds = getDataset(widget.dataset)
  const { measure, dimension, filter } = resolve(ds, widget.measure, widget.dimension, widget.filter)
  const rows = ds.rows(data).filter(filter.pred)

  const needsDimension = widget.type === 'bar' || widget.type === 'donut' || widget.type === 'table'
  const slices = needsDimension && dimension ? groupByDimension(rows, dimension, measure, widget.type === 'donut' ? 6 : 8) : []

  const autoTitle =
    widget.type === 'kpi'
      ? `${measure.label}${filter.id !== 'all' ? ` — ${filter.label.replace(' only', '')}` : ''}`
      : widget.type === 'line'
        ? `${measure.label} by month`
        : `${measure.label} by ${dimension?.label ?? ''}`

  const changeDataset = (id: string) => {
    const next = getDataset(id)
    onPatch({
      dataset: next.id,
      measure: next.measures[0].id,
      dimension: needsDimension ? next.dimensions[0].id : undefined,
      filter: 'all',
      title: undefined,
    })
  }

  return (
    <div
      data-widget={widget.type}
      className={`card flex flex-col p-4 transition ${widget.size === 2 ? 'lg:col-span-2' : ''} ${
        dragOver ? 'ring-2 ring-harbor-500' : ''
      }`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_ID)) {
          e.preventDefault()
          setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        const draggedId = e.dataTransfer.getData(DRAG_ID)
        if (draggedId && draggedId !== widget.id) {
          e.preventDefault()
          e.stopPropagation()
          onDropBefore(draggedId)
        }
        setDragOver(false)
      }}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span
          draggable
          onDragStart={(e: DragEvent) => e.dataTransfer.setData(DRAG_ID, widget.id)}
          className="cursor-grab text-slate-300 hover:text-slate-500"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <input
          value={widget.title ?? autoTitle}
          onChange={(e) => onPatch({ title: e.target.value })}
          className="min-w-0 flex-1 truncate bg-transparent text-sm font-bold text-navy-900 outline-none focus:rounded focus:bg-slate-50 focus:px-1"
        />
        <button
          onClick={() => onPatch({ size: widget.size === 1 ? 2 : 1 })}
          className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
          title={widget.size === 1 ? 'Expand to full width' : 'Shrink to half width'}
        >
          {widget.size === 1 ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onRemove}
          className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
          title="Remove widget"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* field wells */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <select value={ds.id} onChange={(e) => changeDataset(e.target.value)} className={selectCls} title="Dataset">
          {/* options come from the reporting engine */}
          {['workOrders', 'labor', 'workRequests', 'componentLogs', 'drydock', 'assets'].map((id) => (
            <option key={id} value={id}>
              {getDataset(id).label}
            </option>
          ))}
        </select>
        <select
          value={measure.id}
          onChange={(e) => onPatch({ measure: e.target.value, title: undefined })}
          className={selectCls}
          title="Measure"
        >
          {ds.measures.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {needsDimension && (
          <select
            value={dimension?.id}
            onChange={(e) => onPatch({ dimension: e.target.value, title: undefined })}
            className={selectCls}
            title="Group by"
          >
            {ds.dimensions.map((x) => (
              <option key={x.id} value={x.id}>
                by {x.label}
              </option>
            ))}
          </select>
        )}
        {ds.filters.length > 1 && (
          <select
            value={filter.id}
            onChange={(e) => onPatch({ filter: e.target.value, title: undefined })}
            className={selectCls}
            title="Filter"
          >
            {ds.filters.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {widget.type === 'kpi' && (
          <div className="py-2">
            <div className="text-4xl font-extrabold tabular-nums text-navy-900">{measure.fmt(measure.agg(rows))}</div>
            <div className="mt-1 text-xs text-slate-400">
              {ds.label}
              {filter.id !== 'all' ? ` · ${filter.label}` : ''} · live from local store
            </div>
          </div>
        )}
        {widget.type === 'bar' && (slices.length ? <BarRows data={slices} fmt={measure.fmt} /> : <NoData />)}
        {widget.type === 'donut' && (slices.length ? <DonutSvg data={slices} fmt={measure.fmt} /> : <NoData />)}
        {widget.type === 'line' &&
          (ds.timeKey ? (
            <LineChartSvg data={groupByMonth(rows, ds.timeKey, measure, 12)} fmt={measure.fmt} />
          ) : (
            <div className="py-4 text-xs italic text-slate-400">This dataset has no date field — pick another for a trend.</div>
          ))}
        {widget.type === 'table' &&
          (slices.length ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-1 pr-2 label">#</th>
                  <th className="py-1 pr-2 label">{dimension?.label}</th>
                  <th className="py-1 text-right label">{measure.label}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slices.map((s, i) => (
                  <tr key={s.label}>
                    <td className="py-1 pr-2 text-slate-300">{i + 1}</td>
                    <td className="py-1 pr-2 font-medium text-slate-600">{s.label}</td>
                    <td className="py-1 text-right font-semibold tabular-nums text-navy-800">{measure.fmt(s.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <NoData />
          ))}
      </div>
    </div>
  )
}

function NoData() {
  return <div className="py-4 text-xs italic text-slate-400">No rows match this filter.</div>
}

export default function Analytics() {
  const widgets = useLiveQuery(() => db.reportWidgets.orderBy('order').toArray(), [])
  const assets = useLiveQuery(() => db.assets.toArray(), [])
  const components = useLiveQuery(() => db.components.toArray(), [])
  const workOrders = useLiveQuery(() => db.workOrders.toArray(), [])
  const workRequests = useLiveQuery(() => db.workRequests.toArray(), [])
  const componentLogs = useLiveQuery(() => db.componentLogs.toArray(), [])
  const drydockSlots = useLiveQuery(() => db.drydockSlots.toArray(), [])
  const [canvasOver, setCanvasOver] = useState(false)

  if (!widgets || !assets || !components || !workOrders || !workRequests || !componentLogs || !drydockSlots)
    return null

  const data: ReportData = { assets, components, workOrders, workRequests, componentLogs, drydockSlots }

  const addWidget = async (type: ReportWidgetType) => {
    const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1)
    await db.reportWidgets.add({ id: uid('rw'), type, order: maxOrder + 1, ...defaults[type] })
  }

  // Renumber 0..n so order values stay clean after fractional inserts.
  const normalize = async () => {
    const all = await db.reportWidgets.orderBy('order').toArray()
    await db.reportWidgets.bulkPut(all.map((w, i) => ({ ...w, order: i })))
  }

  const moveBefore = async (draggedId: string, targetId: string) => {
    const target = widgets.find((w) => w.id === targetId)
    if (!target) return
    await db.reportWidgets.update(draggedId, { order: target.order - 0.5 })
    await normalize()
  }

  const moveToEnd = async (draggedId: string) => {
    const maxOrder = widgets.reduce((m, w) => Math.max(m, w.order), -1)
    await db.reportWidgets.update(draggedId, { order: maxOrder + 1 })
    await normalize()
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Build a report live — drag widgets onto the canvas, then point them at any captured data."
        action={
          widgets.length > 0 ? (
            <button className="btn-outline" onClick={() => void db.reportWidgets.clear()}>
              <Trash2 className="h-4 w-4" /> Clear canvas
            </button>
          ) : undefined
        }
      />

      {/* palette */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {palette.map(({ type, label, icon: Icon, hint }) => (
          <button
            key={type}
            draggable
            onDragStart={(e: DragEvent) => e.dataTransfer.setData(DRAG_TYPE, type)}
            onClick={() => void addWidget(type)}
            className="card flex cursor-grab items-center gap-2.5 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
            title={`${hint} — drag onto the canvas or click to add`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-harbor-500/10 text-harbor-600">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-navy-900">{label}</span>
              <span className="block truncate text-[10px] text-slate-400">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      {/* canvas */}
      <div
        className={`rounded-xl transition ${canvasOver ? 'bg-harbor-500/5 ring-2 ring-dashed ring-harbor-400' : ''}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE) || e.dataTransfer.types.includes(DRAG_ID)) {
            e.preventDefault()
            setCanvasOver(true)
          }
        }}
        onDragLeave={() => setCanvasOver(false)}
        onDrop={(e) => {
          setCanvasOver(false)
          const type = e.dataTransfer.getData(DRAG_TYPE) as ReportWidgetType
          const draggedId = e.dataTransfer.getData(DRAG_ID)
          if (type) {
            e.preventDefault()
            void addWidget(type)
          } else if (draggedId) {
            e.preventDefault()
            void moveToEnd(draggedId)
          }
        }}
      >
        {widgets.length === 0 ? (
          <EmptyState
            icon={<LayoutDashboard className="h-10 w-10" />}
            title="Blank canvas"
            hint="Drag a widget here (or click one above) and shape it with the dataset, measure, and group-by wells."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {widgets.map((w) => (
              <WidgetCard
                key={w.id}
                widget={w}
                data={data}
                onRemove={() => void db.reportWidgets.delete(w.id)}
                onPatch={(patch) => void db.reportWidgets.update(w.id, patch)}
                onDropBefore={(draggedId) => void moveBefore(draggedId, w.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
