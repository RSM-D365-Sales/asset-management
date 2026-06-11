import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Lock, Search, Table2 } from 'lucide-react'
import { db } from '../data/db'
import { EmptyState, PageHeader } from '../components/ui'
import type { InsightCategory } from '../data/types'

const categoryTone: Record<InsightCategory, string> = {
  Engineering: 'bg-sky-100 text-sky-700',
  Safety: 'bg-amber-100 text-amber-700',
  Operations: 'bg-green-100 text-green-700',
  'Human Relations': 'bg-purple-100 text-purple-700',
}

export default function Insights() {
  const tables = useLiveQuery(() => db.insightTables.toArray(), [])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<InsightCategory | 'All'>('All')

  const categories = useMemo(() => {
    const present = new Set((tables ?? []).map((t) => t.category))
    return ['All', ...(['Engineering', 'Safety', 'Operations', 'Human Relations'] as const).filter((c) => present.has(c))]
  }, [tables])

  const filtered = (tables ?? [])
    .filter((t) => category === 'All' || t.category === category)
    .filter((t) => !q || `${t.name} ${t.description}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <PageHeader
        title="Insight Tables"
        subtitle="Saved summaries built from the logs captured across the fleet."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter tables…"
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c as InsightCategory | 'All')}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                category === c ? 'bg-navy-700 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Table2 className="h-10 w-10" />}
          title="No insight tables match"
          hint="Adjust the filter or category."
        />
      ) : (
        <div className="card divide-y divide-slate-100">
          <div className="hidden grid-cols-[1fr_140px_140px_20px] gap-3 px-4 py-2.5 sm:grid">
            <span className="label">Table Name</span>
            <span className="label">Resource Type</span>
            <span className="label">Created By</span>
            <span />
          </div>
          {filtered.map((t) => (
            <Link
              key={t.id}
              to={`/insights/${t.id}`}
              className="grid grid-cols-1 gap-1 px-4 py-3 transition hover:bg-slate-50 sm:grid-cols-[1fr_140px_140px_20px] sm:items-center sm:gap-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-navy-800">{t.name}</span>
                  <span className={`chip ${categoryTone[t.category]}`}>{t.category}</span>
                  {t.restricted && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-red-500">
                      <Lock className="h-3 w-3" /> Restricted Access
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-400">{t.description}</div>
              </div>
              <span className="text-sm text-slate-500">{t.resourceType}</span>
              <span className="text-sm text-slate-500">{t.createdBy}</span>
              <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:block" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
