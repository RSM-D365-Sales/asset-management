import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Pin,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { db } from '../data/db'
import { useSync } from '../data/sync'
import { Chip, PageHeader, StatCard } from '../components/ui'
import { fmtDate, priorityTone, relativeDue, woStatusTone } from '../lib/format'
import type { Announcement } from '../data/types'

export default function Dashboard() {
  const workOrders = useLiveQuery(() => db.workOrders.toArray(), [])
  const requests = useLiveQuery(() => db.workRequests.toArray(), [])
  const assets = useLiveQuery(() => db.assets.toArray(), [])
  // Booleans aren't valid IndexedDB keys, so sort pinned-first in memory.
  const announcements = useLiveQuery(
    async () => {
      const all = await db.announcements.toArray()
      return all.sort((a, b) => Number(b.pinned) - Number(a.pinned) || +new Date(b.date) - +new Date(a.date))
    },
    [],
  )

  const assetName = (id: string) => assets?.find((a) => a.id === id)?.name ?? id

  const myOrders = (workOrders ?? []).filter((w) => w.assignedTo === 'You' && w.status !== 'Completed')
  const overdue = (workOrders ?? []).filter((w) => w.status === 'Overdue')
  const openRequests = (requests ?? []).filter((r) => r.status !== 'Resolved' && r.status !== 'Closed')
  const dueToday = myOrders.filter((w) => relativeDue(w.dueDate).tone !== 'ok')

  return (
    <div>
      <PageHeader
        title="Good morning, Ryan"
        subtitle="Here's your maintenance picture for today across the fleet."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="My open work orders" value={myOrders.length} sub="assigned to you" />
        <StatCard
          label="Due today / overdue"
          value={dueToday.length}
          tone={dueToday.length ? 'warn' : 'ok'}
          sub="needs attention"
        />
        <StatCard
          label="Open deficiencies"
          value={openRequests.length}
          tone={openRequests.length ? 'warn' : 'ok'}
          sub="across fleet"
        />
        <StatCard
          label="Assets in service"
          value={`${(assets ?? []).filter((a) => a.status === 'In Service').length}/${assets?.length ?? 0}`}
          tone="ok"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Assigned tasks */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
              <ClipboardList className="h-5 w-5 text-harbor-600" /> My Assigned Tasks
            </h2>
            <Link to="/work-orders" className="text-sm font-semibold text-harbor-600 hover:underline">
              View all
            </Link>
          </div>

          {overdue.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
              <TriangleAlert className="h-4 w-4" />
              {overdue.length} preventive work order{overdue.length > 1 ? 's are' : ' is'} overdue
            </div>
          )}

          <div className="space-y-2.5">
            {myOrders.length === 0 && (
              <div className="card p-6 text-center text-sm text-slate-400">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-400" />
                All caught up — no open work orders assigned to you.
              </div>
            )}
            {myOrders.map((wo) => {
              const due = relativeDue(wo.dueDate)
              const done = wo.steps.filter((s) => s.done).length
              return (
                <Link
                  key={wo.id}
                  to={`/work-orders/${wo.id}`}
                  className="card flex items-center gap-3 p-3.5 transition hover:ring-navy-300"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-navy-900">{wo.title}</span>
                      {wo.isPreventive && (
                        <Chip className="bg-harbor-500/10 text-harbor-700">PM</Chip>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">{wo.number}</span>
                      <span>·</span>
                      <span>{assetName(wo.assetId)}</span>
                      <span>·</span>
                      <span>{wo.category}</span>
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
                  <div className="flex flex-col items-end gap-1.5">
                    <Chip className={woStatusTone[wo.status]}>{wo.status}</Chip>
                    <span
                      className={`text-xs font-semibold ${
                        due.tone === 'fail'
                          ? 'text-red-600'
                          : due.tone === 'warn'
                            ? 'text-amber-600'
                            : 'text-slate-400'
                      }`}
                    >
                      {due.text}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </Link>
              )
            })}
          </div>

          {/* Open deficiencies preview */}
          <div className="mb-3 mt-7 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
              <TriangleAlert className="h-5 w-5 text-amber-500" /> Open Deficiencies
            </h2>
            <Link to="/requests" className="text-sm font-semibold text-harbor-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2.5">
            {openRequests.slice(0, 4).map((r) => (
              <Link
                key={r.id}
                to="/requests"
                className="card flex items-center gap-3 p-3.5 transition hover:ring-navy-300"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-navy-900">{r.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {r.number} · {assetName(r.assetId)} · reported {fmtDate(r.reportedAt)}
                  </div>
                </div>
                <Chip className={priorityTone[r.priority]}>{r.priority}</Chip>
              </Link>
            ))}
          </div>
        </section>

        {/* Announcements */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy-900">
            <Bell className="h-5 w-5 text-harbor-600" /> Announcements
          </h2>
          <div className="space-y-2.5">
            {(announcements ?? []).map((a) => (
              <AnnouncementCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function AnnouncementCard({ a }: { a: Announcement }) {
  const { enqueue } = useSync()
  const acknowledge = async () => {
    await db.announcements.update(a.id, { acknowledged: true })
    await enqueue({
      entity: 'announcement',
      entityId: a.id,
      op: 'update',
      summary: `Acknowledged "${a.title}"`,
      payload: { acknowledged: true },
    })
  }
  return (
    <div className={`card p-3.5 ${a.pinned ? 'ring-harbor-200' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {a.pinned && <Pin className="h-3.5 w-3.5 text-harbor-600" />}
          <span className="text-sm font-bold text-navy-900">{a.title}</span>
        </div>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.body}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{fmtDate(a.date)}</span>
        {a.acknowledged ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledged
          </span>
        ) : (
          <button
            onClick={acknowledge}
            className="rounded-md bg-navy-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-navy-600"
          >
            Acknowledge
          </button>
        )}
      </div>
    </div>
  )
}
