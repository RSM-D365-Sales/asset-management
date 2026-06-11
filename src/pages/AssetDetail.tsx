import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Activity,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Gauge as GaugeIcon,
  ListTree,
  MapPin,
  Package,
  Plus,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { db } from '../data/db'
import { GaugeReadout } from '../components/GaugeReadout'
import { Chip } from '../components/ui'
import { fmtDate, fmtDateTime, fmtNum, priorityTone, relativeDue, woStatusTone } from '../lib/format'
import type { RoutineCategory } from '../data/types'
import ComponentLogPanel from '../components/ComponentLogPanel'
import DeficiencyForm from '../components/DeficiencyForm'

type Tab = 'routines' | 'tree' | 'log' | 'deficiencies'

const categories: (RoutineCategory | 'All')[] = [
  'All',
  'Engine',
  'Generator',
  'Hull & Structure',
  'Deck & Safety',
  'Electrical',
  'Inspection',
]

export default function AssetDetail() {
  const { id } = useParams()
  const asset = useLiveQuery(() => (id ? db.assets.get(id) : undefined), [id])
  const components = useLiveQuery(() => (id ? db.components.where('assetId').equals(id).toArray() : []), [id])
  const workOrders = useLiveQuery(
    () => (id ? db.workOrders.where('assetId').equals(id).toArray() : []),
    [id],
  )
  const requests = useLiveQuery(
    () => (id ? db.workRequests.where('assetId').equals(id).toArray() : []),
    [id],
  )
  const logs = useLiveQuery(
    () => (id ? db.componentLogs.where('assetId').equals(id).reverse().sortBy('at') : []),
    [id],
  )

  const [tab, setTab] = useState<Tab>('routines')
  const [cat, setCat] = useState<RoutineCategory | 'All'>('All')
  const [showDeficiency, setShowDeficiency] = useState(false)

  if (!asset) {
    return <div className="text-slate-400">Loading asset…</div>
  }

  const openRequests = (requests ?? []).filter((r) => r.status !== 'Resolved' && r.status !== 'Closed')
  const routines = (workOrders ?? []).filter((w) => cat === 'All' || w.category === cat)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-400">
        <Link to="/assets" className="hover:text-navy-700">
          Assets
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-navy-700">{asset.name}</span>
      </div>

      {/* Asset header */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white"
        style={{ background: `linear-gradient(120deg, ${asset.imageColor}, #06122a)` }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">{asset.name}</h1>
              <Chip className="bg-white/15 text-white ring-1 ring-white/30">{asset.status}</Chip>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {asset.location}
              </span>
              <span>{asset.classCode}</span>
              {asset.manufacturer && <span>{asset.manufacturer}</span>}
              {asset.yearBuilt && <span>Built {asset.yearBuilt}</span>}
              {asset.hoursMeter != null && (
                <span className="font-semibold text-harbor-300">
                  {fmtNum(asset.hoursMeter)} hrs
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeficiency(true)}
              className="btn bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
            >
              <TriangleAlert className="h-4 w-4" /> Log Deficiency
            </button>
            <button
              onClick={() => setTab('log')}
              className="btn-accent"
            >
              <GaugeIcon className="h-4 w-4" /> Component Log
            </button>
          </div>
        </div>

        {/* Gauge strip */}
        {asset.gauges.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {asset.gauges.map((g) => (
              <GaugeReadout key={g.id} g={g} />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { icon: Wrench, label: 'New Work Order', to: '/work-orders' },
          { icon: TriangleAlert, label: 'Log Deficiency', action: () => setShowDeficiency(true) },
          { icon: ClipboardCheck, label: 'Checklists', action: () => setTab('routines') },
          { icon: GaugeIcon, label: 'Record Hours', action: () => setTab('log') },
          { icon: ListTree, label: 'Equipment Tree', action: () => setTab('tree') },
          { icon: FileText, label: 'Documentation', action: () => {} },
          { icon: Package, label: 'Part Requests', action: () => {} },
        ].map(({ icon: Icon, label, to, action }) =>
          to ? (
            <Link key={label} to={to} className="btn-outline bg-white">
              <Icon className="h-4 w-4 text-harbor-600" /> {label}
            </Link>
          ) : (
            <button key={label} onClick={action} className="btn-outline bg-white">
              <Icon className="h-4 w-4 text-harbor-600" /> {label}
            </button>
          ),
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {(
          [
            ['routines', `Routines (${workOrders?.length ?? 0})`],
            ['tree', 'Equipment Tree'],
            ['log', 'Component Log'],
            ['deficiencies', `Deficiencies (${openRequests.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === key
                ? 'border-harbor-500 text-navy-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {tab === 'routines' && (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      cat === c
                        ? 'bg-navy-700 text-white'
                        : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="space-y-2.5">
                {routines.length === 0 && (
                  <div className="card p-6 text-center text-sm text-slate-400">
                    No routines in this category.
                  </div>
                )}
                {routines.map((wo) => {
                  const due = relativeDue(wo.dueDate)
                  const done = wo.steps.filter((s) => s.done).length
                  return (
                    <Link
                      key={wo.id}
                      to={`/work-orders/${wo.id}`}
                      className="card flex items-center gap-3 p-3.5 transition hover:ring-navy-300"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-navy-900">{wo.title}</span>
                          {wo.isPreventive && (
                            <Chip className="bg-harbor-500/10 text-harbor-700">PM</Chip>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                          <span className="font-medium">{wo.number}</span>
                          <span>·</span>
                          <span>{wo.category}</span>
                          <span>·</span>
                          <span>{wo.assignedTo}</span>
                          {wo.steps.length > 0 && (
                            <>
                              <span>·</span>
                              <span>
                                {done}/{wo.steps.length} steps
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Chip className={woStatusTone[wo.status]}>{wo.status}</Chip>
                      <span
                        className={`hidden text-xs font-semibold sm:block ${
                          due.tone === 'fail'
                            ? 'text-red-600'
                            : due.tone === 'warn'
                              ? 'text-amber-600'
                              : 'text-slate-400'
                        }`}
                      >
                        {due.text}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'tree' && <EquipmentTree assetId={asset.id} components={components ?? []} />}

          {tab === 'log' && (
            <ComponentLogPanel
              assetId={asset.id}
              components={(components ?? []).filter((c) => c.runningHours != null)}
              logs={logs ?? []}
            />
          )}

          {tab === 'deficiencies' && (
            <div className="space-y-2.5">
              {openRequests.length === 0 && (
                <div className="card p-6 text-center text-sm text-slate-400">
                  No open deficiencies on {asset.name}.
                </div>
              )}
              {openRequests.map((r) => (
                <div key={r.id} className="card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-navy-900">{r.title}</div>
                      <div className="text-xs text-slate-500">
                        {r.number} · reported by {r.reportedBy} · {fmtDate(r.reportedAt)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Chip className={priorityTone[r.priority]}>{r.priority}</Chip>
                      <span className="text-[11px] font-semibold text-slate-400">{r.status}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{r.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity log */}
        <aside>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900">
            <Activity className="h-4 w-4 text-harbor-600" /> Activity Log
          </h3>
          <div className="card divide-y divide-slate-100">
            {buildActivity(workOrders ?? [], requests ?? [], logs ?? []).map((ev, i) => (
              <div key={i} className="flex gap-3 p-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-harbor-500" />
                <div className="min-w-0">
                  <div className="text-sm text-navy-900">{ev.text}</div>
                  <div className="text-[11px] text-slate-400">{fmtDateTime(ev.at)}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {showDeficiency && (
        <DeficiencyForm assetId={asset.id} onClose={() => setShowDeficiency(false)} />
      )}
    </div>
  )
}

function buildActivity(
  wos: import('../data/types').WorkOrder[],
  reqs: import('../data/types').WorkRequest[],
  logs: import('../data/types').ComponentLogEntry[],
) {
  const events: { at: string; text: string }[] = []
  wos.forEach((w) => {
    if (w.completedAt) events.push({ at: w.completedAt, text: `Completed ${w.number} — ${w.title}` })
    events.push({ at: w.createdAt, text: `${w.number} ${w.title} created` })
  })
  reqs.forEach((r) =>
    r.history.forEach((h) => events.push({ at: h.at, text: `${r.number}: ${h.event}` })),
  )
  logs.forEach((l) =>
    events.push({ at: l.at, text: `Hours logged: ${fmtNum(l.reading)} ${l.unit} by ${l.recordedBy}` }),
  )
  return events.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 12)
}

function EquipmentTree({
  assetId,
  components,
}: {
  assetId: string
  components: import('../data/types').Component[]
}) {
  const roots = components.filter((c) => c.parentId === null)
  const childrenOf = (pid: string) => components.filter((c) => c.parentId === pid)

  if (components.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-slate-400">
        No equipment hierarchy defined for this asset yet.
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900">
        <ListTree className="h-4 w-4 text-harbor-600" /> Functional Locations & Components
      </div>
      <div className="space-y-1">
        {roots.map((r) => (
          <div key={r.id}>
            <Node c={r} />
            <div className="ml-5 border-l border-slate-200 pl-3">
              {childrenOf(r.id).map((c) => (
                <Node key={c.id} c={c} child />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Node({ c, child }: { c: import('../data/types').Component; child?: boolean }) {
  const dueSoon =
    c.runningHours != null && c.nextServiceHours != null && c.nextServiceHours - c.runningHours <= 100
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${child ? 'bg-slate-300' : 'bg-harbor-500'}`}
        />
        <span className={`text-sm ${child ? 'text-slate-600' : 'font-semibold text-navy-900'}`}>
          {c.name}
        </span>
        <span className="text-[11px] text-slate-400">{c.code}</span>
      </div>
      {c.runningHours != null && (
        <span
          className={`text-[11px] font-semibold ${dueSoon ? 'text-amber-600' : 'text-slate-400'}`}
        >
          {fmtNum(c.runningHours)} hrs
          {c.nextServiceHours ? ` · next @ ${fmtNum(c.nextServiceHours)}` : ''}
        </span>
      )}
    </div>
  )
}
