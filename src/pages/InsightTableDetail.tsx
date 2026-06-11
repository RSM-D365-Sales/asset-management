import { Fragment, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Download, Lock } from 'lucide-react'
import { db } from '../data/db'
import { EmptyState, PageHeader } from '../components/ui'
import UsageChart, { fitUsage, projectService, ratePerDay } from '../components/UsageChart'
import { fmtDate, fmtNum, priorityTone, relativeDue, woStatusTone } from '../lib/format'
import type {
  Asset,
  Component,
  ComponentLogEntry,
  ComponentService,
  InsightTable,
  WorkOrder,
  WorkRequest,
} from '../data/types'

// ---------------------------------------------------------------------------
// Due-projection math: next due point = last completion + interval; the
// calendar date is projected from the component's operating tempo.
// ---------------------------------------------------------------------------
function projectDue(c: Component, s: ComponentService) {
  const running = c.runningHours ?? 0
  const dueAtHours = (s.lastCompletedHours ?? 0) + s.intervalHours
  const dueInHours = dueAtHours - running
  const days = dueInHours / (c.avgHoursPerDay ?? 12)
  const dueDate = new Date(Date.now() + days * 86400000).toISOString()
  return { dueAtHours, dueInHours, dueDate }
}

function ServiceCompletedCell({ s }: { s: ComponentService }) {
  if (s.lastCompletedAt === undefined)
    return <span className="text-xs italic text-slate-300">Never Completed</span>
  return (
    <div className="text-xs">
      <div className="font-semibold text-navy-800">{fmtDate(s.lastCompletedAt)}</div>
      <div className="text-slate-400">{fmtNum(s.lastCompletedHours ?? 0)} hrs.</div>
    </div>
  )
}

function ServiceDueCell({ c, s }: { c: Component; s: ComponentService }) {
  const { dueInHours, dueDate } = projectDue(c, s)
  const overdue = dueInHours < 0
  const soon = !overdue && dueInHours <= 150
  const tone = overdue ? 'text-signal-fail' : soon ? 'text-signal-warn' : 'text-signal-ok'
  return (
    <div className="text-xs">
      <div className={`font-semibold ${tone}`}>
        {overdue
          ? `${fmtNum(Math.abs(dueInHours))} hr(s) overdue`
          : `Due in ${fmtNum(dueInHours)} hours`}
      </div>
      <div className="text-slate-400">~ {fmtDate(dueDate)}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CSV export — every renderer also produces plain rows for download.
// ---------------------------------------------------------------------------
function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const th = 'whitespace-nowrap px-3 py-2.5 text-left label'
const td = 'whitespace-nowrap px-3 py-2.5 align-top'

function DataTable({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>{header}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}

function AssetLink({ assetId, name }: { assetId: string; name?: string }) {
  return (
    <Link to={`/assets/${assetId}`} className="font-bold uppercase text-harbor-600 hover:underline">
      {name ?? assetId}
    </Link>
  )
}

interface RendererProps {
  table: InsightTable
  assets: Asset[]
  components: Component[]
  logs: ComponentLogEntry[]
  workOrders: WorkOrder[]
  requests: WorkRequest[]
  onExport: (fn: () => void) => void
}

// ---------------------------------------------------------------------------
// Renderers per insight-table kind
// ---------------------------------------------------------------------------
function ManufacturerSummary({ table, components, assets, onExport }: RendererProps) {
  const rows = useMemo(() => {
    const byAsset = new Map(assets.map((a) => [a.id, a]))
    return components
      .filter((c) => c.manufacturer === table.manufacturer)
      .map((c) => ({ c, asset: byAsset.get(c.assetId) }))
      .sort((a, b) => `${a.asset?.name} ${a.c.code}`.localeCompare(`${b.asset?.name} ${b.c.code}`))
  }, [components, assets, table.manufacturer])

  // Column set = the service plan shared by this manufacturer's engines.
  const serviceNames = rows[0]?.c.services?.map((s) => s.name) ?? []

  onExport(() => {
    const header = [
      'Asset', 'Component', 'Model', 'Current Hours',
      ...serviceNames.flatMap((n) => [`${n} - Completed`, `${n} - Due`]),
    ]
    const data = rows.map(({ c, asset }) => [
      asset?.name ?? c.assetId, c.name, c.model ?? '', c.runningHours ?? 0,
      ...serviceNames.flatMap((n) => {
        const s = c.services?.find((x) => x.name === n)
        if (!s) return ['', '']
        const { dueInHours, dueDate } = projectDue(c, s)
        return [
          s.lastCompletedAt
            ? `${fmtDate(s.lastCompletedAt)} (${s.lastCompletedHours} hrs)`
            : 'Never Completed',
          `${dueInHours < 0 ? `${Math.abs(dueInHours)} hrs overdue` : `Due in ${dueInHours} hrs`} ~ ${fmtDate(dueDate)}`,
        ]
      }),
    ])
    downloadCsv(`${table.name}.csv`, header, data)
  })

  if (rows.length === 0) return <EmptyState title={`No ${table.manufacturer} equipment found`} />

  return (
    <DataTable
      header={
        <>
          <th className={th}>Asset</th>
          <th className={th}>Component</th>
          <th className={th}>Model</th>
          <th className={th}>Current Hours</th>
          {serviceNames.map((n) => (
            <Fragment key={n}>
              <th className={th}>{n} — Completed</th>
              <th className={th}>{n} — Due</th>
            </Fragment>
          ))}
        </>
      }
    >
      {rows.map(({ c, asset }) => (
        <tr key={c.id} className="hover:bg-slate-50">
          <td className={td}>
            <AssetLink assetId={c.assetId} name={asset?.name} />
          </td>
          <td className={`${td} text-slate-600`}>{c.name}</td>
          <td className={`${td} text-slate-500`}>{c.model}</td>
          <td className={td}>
            <span className="font-semibold tabular-nums text-navy-800">
              {fmtNum(c.runningHours ?? 0)} hrs.
            </span>
          </td>
          {serviceNames.map((n) => {
            const s = c.services?.find((x) => x.name === n)
            return (
              <Fragment key={n}>
                <td className={td}>{s && <ServiceCompletedCell s={s} />}</td>
                <td className={td}>{s && <ServiceDueCell c={c} s={s} />}</td>
              </Fragment>
            )
          })}
        </tr>
      ))}
    </DataTable>
  )
}

function HoursLog({ table, components, assets, logs, onExport }: RendererProps) {
  const byAsset = new Map(assets.map((a) => [a.id, a]))
  const byComponent = new Map(components.map((c) => [c.id, c]))
  const rows = [...logs].sort((a, b) => b.at.localeCompare(a.at))

  onExport(() =>
    downloadCsv(
      `${table.name}.csv`,
      ['Date', 'Asset', 'Component', 'Reading', 'Unit', 'Recorded By', 'Note'],
      rows.map((l) => [
        fmtDate(l.at), byAsset.get(l.assetId)?.name ?? l.assetId,
        byComponent.get(l.componentId)?.name ?? l.componentId,
        l.reading, l.unit, l.recordedBy, l.note ?? '',
      ]),
    ),
  )

  if (rows.length === 0) return <EmptyState title="No readings logged yet" />

  return (
    <DataTable
      header={
        <>
          <th className={th}>Date</th>
          <th className={th}>Asset</th>
          <th className={th}>Component</th>
          <th className={th}>Reading</th>
          <th className={th}>Recorded By</th>
          <th className={th}>Note</th>
        </>
      }
    >
      {rows.map((l) => (
        <tr key={l.id} className="hover:bg-slate-50">
          <td className={`${td} text-slate-500`}>{fmtDate(l.at)}</td>
          <td className={td}>
            <AssetLink assetId={l.assetId} name={byAsset.get(l.assetId)?.name} />
          </td>
          <td className={`${td} text-slate-600`}>
            {byComponent.get(l.componentId)?.name ?? l.componentId}
          </td>
          <td className={td}>
            <span className="font-semibold tabular-nums text-navy-800">
              {fmtNum(l.reading)} {l.unit}
            </span>
          </td>
          <td className={`${td} text-slate-500`}>{l.recordedBy}</td>
          <td className="px-3 py-2.5 text-xs text-slate-400">{l.note}</td>
        </tr>
      ))}
    </DataTable>
  )
}

function PmStatus({ table, assets, workOrders, onExport }: RendererProps) {
  const byAsset = new Map(assets.map((a) => [a.id, a]))
  const rows = workOrders
    .filter((w) => w.category === table.routineCategory)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  onExport(() =>
    downloadCsv(
      `${table.name}.csv`,
      ['WO #', 'Title', 'Asset', 'Status', 'Priority', 'Due', 'Assigned To'],
      rows.map((w) => [
        w.number, w.title, byAsset.get(w.assetId)?.name ?? w.assetId,
        w.status, w.priority, fmtDate(w.dueDate), w.assignedTo,
      ]),
    ),
  )

  if (rows.length === 0) return <EmptyState title={`No ${table.routineCategory} work orders`} />

  return (
    <DataTable
      header={
        <>
          <th className={th}>WO #</th>
          <th className={th}>Title</th>
          <th className={th}>Asset</th>
          <th className={th}>Status</th>
          <th className={th}>Priority</th>
          <th className={th}>Due</th>
          <th className={th}>Assigned To</th>
        </>
      }
    >
      {rows.map((w) => {
        const due = relativeDue(w.dueDate)
        const dueTone = w.status === 'Completed' ? 'text-slate-400' : `text-signal-${due.tone}`
        return (
          <tr key={w.id} className="hover:bg-slate-50">
            <td className={td}>
              <Link to={`/work-orders/${w.id}`} className="font-bold text-harbor-600 hover:underline">
                {w.number}
              </Link>
            </td>
            <td className={`${td} max-w-[280px] truncate text-slate-700`}>{w.title}</td>
            <td className={td}>
              <AssetLink assetId={w.assetId} name={byAsset.get(w.assetId)?.name} />
            </td>
            <td className={td}>
              <span className={`chip ${woStatusTone[w.status]}`}>{w.status}</span>
            </td>
            <td className={td}>
              <span className={`chip ${priorityTone[w.priority]}`}>{w.priority}</span>
            </td>
            <td className={td}>
              <div className={`text-xs font-semibold ${dueTone}`}>{due.text}</div>
              <div className="text-xs text-slate-400">{fmtDate(w.dueDate)}</div>
            </td>
            <td className={`${td} text-slate-500`}>{w.assignedTo}</td>
          </tr>
        )
      })}
    </DataTable>
  )
}

function DeficiencySummary({ table, assets, requests, onExport }: RendererProps) {
  const rows = useMemo(() => {
    const open = requests.filter((r) => r.status !== 'Resolved' && r.status !== 'Closed')
    const grouped = new Map<string, WorkRequest[]>()
    open.forEach((r) => grouped.set(r.assetId, [...(grouped.get(r.assetId) ?? []), r]))
    return [...grouped.entries()]
      .map(([assetId, reqs]) => ({
        asset: assets.find((a) => a.id === assetId),
        assetId,
        total: reqs.length,
        critical: reqs.filter((r) => r.priority === 'Critical').length,
        high: reqs.filter((r) => r.priority === 'High' || r.priority === 'Elevated').length,
        oldest: reqs.reduce((min, r) => (r.reportedAt < min ? r.reportedAt : min), reqs[0].reportedAt),
      }))
      .sort((a, b) => b.critical - a.critical || b.total - a.total)
  }, [requests, assets])

  onExport(() =>
    downloadCsv(
      `${table.name}.csv`,
      ['Asset', 'Open Deficiencies', 'Critical', 'High / Elevated', 'Oldest Open Report'],
      rows.map((r) => [r.asset?.name ?? r.assetId, r.total, r.critical, r.high, fmtDate(r.oldest)]),
    ),
  )

  if (rows.length === 0) return <EmptyState title="No open deficiencies — clean fleet" />

  return (
    <DataTable
      header={
        <>
          <th className={th}>Asset</th>
          <th className={th}>Open Deficiencies</th>
          <th className={th}>Critical</th>
          <th className={th}>High / Elevated</th>
          <th className={th}>Oldest Open Report</th>
        </>
      }
    >
      {rows.map((r) => (
        <tr key={r.assetId} className="hover:bg-slate-50">
          <td className={td}>
            <AssetLink assetId={r.assetId} name={r.asset?.name} />
          </td>
          <td className={td}>
            <span className="font-semibold tabular-nums text-navy-800">{r.total}</span>
          </td>
          <td className={td}>
            <span
              className={`font-semibold tabular-nums ${r.critical > 0 ? 'text-signal-fail' : 'text-slate-300'}`}
            >
              {r.critical}
            </span>
          </td>
          <td className={td}>
            <span
              className={`font-semibold tabular-nums ${r.high > 0 ? 'text-signal-warn' : 'text-slate-300'}`}
            >
              {r.high}
            </span>
          </td>
          <td className={`${td} text-slate-500`}>{fmtDate(r.oldest)}</td>
        </tr>
      ))}
    </DataTable>
  )
}

function UsageProjection({ table, components, assets, logs, onExport }: RendererProps) {
  const engines = useMemo(() => {
    const byAsset = new Map(assets.map((a) => [a.id, a]))
    return components
      .filter((c) => (c.services?.length ?? 0) > 0)
      .map((c) => ({
        c,
        asset: byAsset.get(c.assetId),
        fit: fitUsage(
          logs.filter((l) => l.componentId === c.id),
          c.avgHoursPerDay,
        ),
      }))
      .filter((e): e is typeof e & { fit: NonNullable<typeof e.fit> } => e.fit !== null)
      .sort((a, b) => `${a.asset?.name} ${a.c.code}`.localeCompare(`${b.asset?.name} ${b.c.code}`))
  }, [components, assets, logs])

  onExport(() =>
    downloadCsv(
      `${table.name}.csv`,
      ['Asset', 'Component', 'Current Hours', 'Observed Rate (hrs/day)', 'Service', 'Due At (hrs)', 'Due In (hrs)', 'Projected Due Date'],
      engines.flatMap(({ c, asset, fit }) =>
        (c.services ?? []).map((s) => {
          const p = projectService(fit, s)
          return [
            asset?.name ?? c.assetId, c.name, fit.pts[fit.pts.length - 1].h,
            ratePerDay(fit).toFixed(1), s.name, p.dueAtHours, p.dueInHours,
            fmtDate(new Date(p.dueTime).toISOString()),
          ]
        }),
      ),
    ),
  )

  if (engines.length === 0) return <EmptyState title="No logged readings to chart yet" />

  return (
    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
      {engines.map(({ c, asset, fit }) => {
        const last = fit.pts[fit.pts.length - 1]
        return (
          <div key={c.id} className="card p-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <AssetLink assetId={c.assetId} name={asset?.name} />
                <span className="text-sm font-semibold text-slate-600">{c.name}</span>
                {c.model && <span className="chip bg-slate-100 text-slate-500">{c.manufacturer} {c.model}</span>}
              </div>
              <div className="text-xs text-slate-400">
                <span className="font-semibold tabular-nums text-navy-800">{fmtNum(last.h)} hrs.</span>
                {' · '}≈ {ratePerDay(fit).toFixed(1)} hrs/day observed over {fit.pts.length} readings
              </div>
            </div>

            <UsageChart component={c} fit={fit} />

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-xs">
              {(c.services ?? []).map((s) => {
                const p = projectService(fit, s)
                const tone =
                  p.tone === 'fail' ? 'text-signal-fail' : p.tone === 'warn' ? 'text-signal-warn' : 'text-signal-ok'
                return (
                  <span key={s.name} className={`font-semibold ${tone}`}>
                    {s.name}:{' '}
                    {p.dueInHours < 0
                      ? `${fmtNum(Math.abs(p.dueInHours))} hrs overdue (was ~ ${fmtDate(new Date(p.dueTime).toISOString())})`
                      : `in ${fmtNum(p.dueInHours)} hrs ~ ${fmtDate(new Date(p.dueTime).toISOString())}`}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function InsightTableDetail() {
  const { id } = useParams()
  // `?? null` distinguishes "not found" (null) from "still loading" (undefined).
  const table = useLiveQuery(async () => (await db.insightTables.get(id ?? '')) ?? null, [id])
  const assets = useLiveQuery(() => db.assets.toArray(), [])
  const components = useLiveQuery(() => db.components.toArray(), [])
  const logs = useLiveQuery(() => db.componentLogs.toArray(), [])
  const workOrders = useLiveQuery(() => db.workOrders.toArray(), [])
  const requests = useLiveQuery(() => db.workRequests.toArray(), [])

  // The active renderer registers its CSV builder during render; the export
  // button reads the latest one at click time.
  const exportRef = useRef<(() => void) | null>(null)
  const onExport = (fn: () => void) => {
    exportRef.current = fn
  }

  if (table === undefined || !assets || !components || !logs || !workOrders || !requests)
    return null
  if (table === null)
    return (
      <div>
        <Link
          to="/insights"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-harbor-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to all tables
        </Link>
        <EmptyState title="Insight table not found" hint="It may have been removed." />
      </div>
    )

  const props: RendererProps = { table, assets, components, logs, workOrders, requests, onExport }

  return (
    <div>
      <Link
        to="/insights"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-harbor-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to all tables
      </Link>

      <PageHeader
        title={table.name}
        subtitle={table.description}
        action={
          <div className="flex items-center gap-3">
            {table.restricted && (
              <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                <Lock className="h-3.5 w-3.5" /> Restricted Access
              </span>
            )}
            <button className="btn-outline" onClick={() => exportRef.current?.()}>
              <Download className="h-4 w-4" /> Export Table
            </button>
          </div>
        }
      />

      {table.kind === 'manufacturer-summary' && <ManufacturerSummary {...props} />}
      {table.kind === 'hours-log' && <HoursLog {...props} />}
      {table.kind === 'pm-status' && <PmStatus {...props} />}
      {table.kind === 'deficiency-summary' && <DeficiencySummary {...props} />}
      {table.kind === 'usage-projection' && <UsageProjection {...props} />}
    </div>
  )
}
