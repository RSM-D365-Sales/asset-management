import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Anchor, ChevronRight, MapPin, Search, Ship } from 'lucide-react'
import { db } from '../data/db'
import { PageHeader } from '../components/ui'
import { AssetThumb } from '../components/ui'
import { GaugeBar } from '../components/GaugeReadout'
import type { AssetStatus, AssetType } from '../data/types'

const statusTone: Record<AssetStatus, string> = {
  'In Service': 'bg-green-100 text-green-700',
  'In Maintenance': 'bg-amber-100 text-amber-700',
  'Out of Service': 'bg-red-100 text-red-700',
}

const typeFilters: (AssetType | 'All')[] = ['All', 'Tug', 'Dock', 'Barge', 'Crane']

export default function Assets() {
  const assets = useLiveQuery(() => db.assets.toArray(), [])
  const workOrders = useLiveQuery(() => db.workOrders.toArray(), [])
  const requests = useLiveQuery(() => db.workRequests.toArray(), [])
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [type, setType] = useState<AssetType | 'All'>('All')

  const counts = useMemo(() => {
    const wo = new Map<string, number>()
    const wr = new Map<string, number>()
    ;(workOrders ?? []).forEach((w) => {
      if (w.status !== 'Completed') wo.set(w.assetId, (wo.get(w.assetId) ?? 0) + 1)
    })
    ;(requests ?? []).forEach((r) => {
      if (r.status !== 'Resolved' && r.status !== 'Closed')
        wr.set(r.assetId, (wr.get(r.assetId) ?? 0) + 1)
    })
    return { wo, wr }
  }, [workOrders, requests])

  const filtered = (assets ?? []).filter((a) => {
    if (type !== 'All' && a.type !== type) return false
    if (q && !`${a.name} ${a.location} ${a.classCode}`.toLowerCase().includes(q.toLowerCase()))
      return false
    return true
  })

  return (
    <div>
      <PageHeader
        title="Fleet & Assets"
        subtitle="Every tug, dock, and barge under management."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name, location, class…"
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
          {typeFilters.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                type === t ? 'bg-navy-700 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((a) => (
          <Link
            key={a.id}
            to={`/assets/${a.id}`}
            className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className="relative h-24"
              style={{
                background: `linear-gradient(135deg, ${a.imageColor}, #06122a)`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                {a.type === 'Tug' ? (
                  <Ship className="h-16 w-16 text-white" />
                ) : (
                  <Anchor className="h-14 w-14 text-white" />
                )}
              </div>
              <span
                className={`absolute right-3 top-3 chip ${statusTone[a.status]} ring-1 ring-white/40`}
              >
                {a.status}
              </span>
              <div className="absolute bottom-2 left-3 text-white">
                <div className="text-lg font-extrabold leading-none drop-shadow">{a.name}</div>
                <div className="text-[11px] font-medium text-white/80">{a.classCode}</div>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> {a.location}
              </div>

              {a.gauges.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {a.gauges.slice(0, 4).map((g) => (
                    <GaugeBar key={g.id} g={g} />
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <div className="flex gap-3">
                  <span className="font-semibold text-navy-700">
                    {counts.wo.get(a.id) ?? 0} open WO
                  </span>
                  <span
                    className={`font-semibold ${
                      (counts.wr.get(a.id) ?? 0) > 0 ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  >
                    {counts.wr.get(a.id) ?? 0} deficiencies
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
