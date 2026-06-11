import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Wrench } from 'lucide-react'
import { db } from '../data/db'
import { Chip, PageHeader } from '../components/ui'
import { fmtDate, priorityTone, relativeDue, woStatusTone } from '../lib/format'
import type { WorkOrderStatus } from '../data/types'

const statusFilters: (WorkOrderStatus | 'All' | 'My')[] = [
  'My',
  'All',
  'Scheduled',
  'In Progress',
  'Overdue',
  'Completed',
]

export default function WorkOrders() {
  const workOrders = useLiveQuery(() => db.workOrders.toArray(), [])
  const assets = useLiveQuery(() => db.assets.toArray(), [])
  const [filter, setFilter] = useState<WorkOrderStatus | 'All' | 'My'>('My')

  const assetName = (id: string) => assets?.find((a) => a.id === id)?.name ?? id

  const list = (workOrders ?? [])
    .filter((w) => {
      if (filter === 'My') return w.assignedTo === 'You'
      if (filter === 'All') return true
      return w.status === filter
    })
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))

  return (
    <div>
      <PageHeader
        title="Work Orders"
        subtitle="Preventive routines and corrective maintenance across the fleet."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {statusFilters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              filter === f
                ? 'bg-navy-700 text-white'
                : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {f === 'My' ? 'Assigned to me' : f}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {list.length === 0 && (
          <div className="card p-8 text-center text-sm text-slate-400">No work orders match.</div>
        )}
        {list.map((wo) => {
          const due = relativeDue(wo.dueDate)
          const done = wo.steps.filter((s) => s.done).length
          const pct = wo.steps.length ? Math.round((done / wo.steps.length) * 100) : 0
          return (
            <Link
              key={wo.id}
              to={`/work-orders/${wo.id}`}
              className="card flex items-center gap-4 p-4 transition hover:ring-navy-300"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-navy-900">{wo.title}</span>
                  {wo.isPreventive && <Chip className="bg-harbor-500/10 text-harbor-700">PM</Chip>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">{wo.number}</span>
                  <span>·</span>
                  <span>{assetName(wo.assetId)}</span>
                  <span>·</span>
                  <span>{wo.category}</span>
                  <span>·</span>
                  <span>{wo.assignedTo}</span>
                  <span>·</span>
                  <span>{fmtDate(wo.dueDate)}</span>
                </div>
                {wo.steps.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-harbor-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {done}/{wo.steps.length} steps
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Chip className={priorityTone[wo.priority]}>{wo.priority}</Chip>
                <Chip className={woStatusTone[wo.status]}>{wo.status}</Chip>
                {wo.status !== 'Completed' && (
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
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
