import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Plus, TriangleAlert } from 'lucide-react'
import { db } from '../data/db'
import { useSync } from '../data/sync'
import { Chip, PageHeader } from '../components/ui'
import { fmtDate, fmtDateTime, priorityTone, reqStatusTone } from '../lib/format'
import DeficiencyForm from '../components/DeficiencyForm'
import type { RequestStatus, WorkRequest } from '../data/types'

const filters: (RequestStatus | 'All' | 'Open')[] = [
  'Open',
  'All',
  'New',
  'Triaged',
  'In Progress',
  'Resolved',
]

export default function WorkRequests() {
  const requests = useLiveQuery(() => db.workRequests.toArray(), [])
  const assets = useLiveQuery(() => db.assets.toArray(), [])
  const [filter, setFilter] = useState<RequestStatus | 'All' | 'Open'>('Open')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const assetName = (id: string) => assets?.find((a) => a.id === id)?.name ?? id

  const list = (requests ?? [])
    .filter((r) => {
      if (filter === 'Open') return r.status !== 'Resolved' && r.status !== 'Closed'
      if (filter === 'All') return true
      return r.status === filter
    })
    .sort((a, b) => +new Date(b.reportedAt) - +new Date(a.reportedAt))

  return (
    <div>
      <PageHeader
        title="Work Requests"
        subtitle="Deficiencies reported from the field — history and timeline for each."
        action={
          <button onClick={() => setShowForm(true)} className="btn-accent">
            <Plus className="h-4 w-4" /> Log Deficiency
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              filter === f
                ? 'bg-navy-700 text-white'
                : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {list.length === 0 && (
          <div className="card p-8 text-center text-sm text-slate-400">No work requests match.</div>
        )}
        {list.map((r) => (
          <RequestCard
            key={r.id}
            r={r}
            assetName={assetName(r.assetId)}
            open={expanded === r.id}
            onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
          />
        ))}
      </div>

      {showForm && <DeficiencyForm onClose={() => setShowForm(false)} />}
    </div>
  )
}

function RequestCard({
  r,
  assetName,
  open,
  onToggle,
}: {
  r: WorkRequest
  assetName: string
  open: boolean
  onToggle: () => void
}) {
  const { enqueue } = useSync()

  const advance = async (status: RequestStatus, event: string) => {
    const history = [...r.history, { at: new Date().toISOString(), by: 'You', event }]
    await db.workRequests.update(r.id, { status, history })
    await enqueue({
      entity: 'workRequest',
      entityId: r.id,
      op: 'update',
      summary: `${r.number}: ${event}`,
      payload: { status },
    })
  }

  const next: { label: string; status: RequestStatus; event: string } | null =
    r.status === 'New'
      ? { label: 'Triage', status: 'Triaged', event: 'Triaged' }
      : r.status === 'Triaged'
        ? { label: 'Start work', status: 'In Progress', event: 'Work started' }
        : r.status === 'In Progress'
          ? { label: 'Resolve', status: 'Resolved', event: 'Resolved' }
          : null

  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            r.priority === 'Critical' || r.priority === 'High'
              ? 'bg-red-50 text-red-600'
              : 'bg-amber-50 text-amber-600'
          }`}
        >
          <TriangleAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-navy-900">{r.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <span className="font-medium text-slate-600">{r.number}</span>
            <span>·</span>
            <span>{assetName}</span>
            <span>·</span>
            <span>by {r.reportedBy}</span>
            <span>·</span>
            <span>{fmtDate(r.reportedAt)}</span>
          </div>
        </div>
        <Chip className={priorityTone[r.priority]}>{r.priority}</Chip>
        <Chip className={reqStatusTone[r.status]}>{r.status}</Chip>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-300 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
          <p className="text-sm text-slate-700">{r.description}</p>

          <div className="mt-4">
            <div className="label mb-2">Timeline</div>
            <ol className="relative space-y-3 border-l-2 border-slate-200 pl-4">
              {r.history.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-harbor-500 ring-2 ring-white" />
                  <div className="text-sm font-medium text-navy-900">{h.event}</div>
                  <div className="text-[11px] text-slate-400">
                    {h.by} · {fmtDateTime(h.at)}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Link
              to={`/assets/${r.assetId}`}
              className="btn-outline bg-white"
            >
              View asset
            </Link>
            {next && (
              <button
                onClick={() => advance(next.status, next.event)}
                className="btn-accent"
              >
                {next.label}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
