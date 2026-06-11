import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Anchor, Info } from 'lucide-react'
import { db } from '../data/db'
import { useSync } from '../data/sync'
import { PageHeader } from '../components/ui'
import { fmtDate } from '../lib/format'
import type { DrydockCode, DrydockSlot } from '../data/types'

// ---------------------------------------------------------------------------
// Half-month planning periods: 'YYYY-MM-A' = 1st–15th, 'YYYY-MM-B' = 16th–EOM.
// ---------------------------------------------------------------------------
interface Period {
  key: string
  month: string // 'Jun 26'
  half: 'A' | 'B'
  isCurrent: boolean
}

function buildPeriods(monthsAhead = 12): Period[] {
  const today = new Date()
  const currentKey = periodKeyFor(today)
  const out: Period[] = []
  const d = new Date(today.getFullYear(), today.getMonth(), 1)
  for (let i = 0; i < monthsAhead; i++) {
    const month = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    for (const half of ['A', 'B'] as const) {
      const key = `${ym}-${half}`
      out.push({ key, month, half, isCurrent: key === currentKey })
    }
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

function periodKeyFor(date: Date): string {
  const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  return `${ym}-${date.getDate() <= 15 ? 'A' : 'B'}`
}

// Click cycles a cell through the planning codes and back to in-service.
const nextCode: Record<'H' | DrydockCode, DrydockCode | null> = {
  H: 'DD',
  DD: 'RDD',
  RDD: 'OOS',
  OOS: null, // back to H (record deleted)
}

const codeStyle: Record<DrydockCode, string> = {
  DD: 'bg-amber-400 text-white',
  RDD: 'bg-red-500 text-white',
  OOS: 'bg-slate-600 text-white',
}

const codeLabel: Record<DrydockCode, string> = {
  DD: 'Drydock (planned)',
  RDD: 'Regulatory drydock',
  OOS: 'Out of service / lay',
}

// Regulatory date urgency: red when past or <120 days out, amber <240 days.
function dateTone(isoDate?: string): string {
  if (!isoDate) return 'text-slate-300'
  const days = (new Date(isoDate).getTime() - Date.now()) / 86400000
  if (days < 120) return 'font-semibold text-signal-fail'
  if (days < 240) return 'font-semibold text-signal-warn'
  return 'text-slate-500'
}

export default function Drydock() {
  const assets = useLiveQuery(() => db.assets.where('type').equals('Tug').toArray(), [])
  const slots = useLiveQuery(() => db.drydockSlots.toArray(), [])
  const enqueue = useSync((s) => s.enqueue)

  const periods = useMemo(() => buildPeriods(12), [])

  const slotMap = useMemo(() => {
    const m = new Map<string, DrydockSlot>()
    ;(slots ?? []).forEach((s) => m.set(s.id, s))
    return m
  }, [slots])

  if (!assets || !slots) return null

  const tugs = [...assets].sort((a, b) => a.name.localeCompare(b.name))

  const cycle = async (assetId: string, period: string) => {
    const id = `${assetId}:${period}`
    const existing = slotMap.get(id)
    const next = nextCode[existing?.code ?? 'H']
    const tug = tugs.find((t) => t.id === assetId)
    const label = `${tug?.name ?? assetId} · ${period}`
    if (next === null) {
      await db.drydockSlots.delete(id)
      await enqueue({
        entity: 'drydockSlot',
        entityId: id,
        op: 'update',
        summary: `${label} → In Service`,
        payload: { assetId, period, code: null },
      })
    } else {
      const slot: DrydockSlot = { id, assetId, period, code: next }
      await db.drydockSlots.put(slot)
      await enqueue({
        entity: 'drydockSlot',
        entityId: id,
        op: existing ? 'update' : 'create',
        summary: `${label} → ${next}`,
        payload: slot,
      })
    }
  }

  // Group period columns by month for the colSpan header row.
  const months = periods.reduce<{ month: string; count: number }[]>((acc, p) => {
    const last = acc[acc.length - 1]
    if (last && last.month === p.month) last.count++
    else acc.push({ month: p.month, count: 1 })
    return acc
  }, [])

  const headerCell = 'border-l border-slate-200 px-1 py-1 text-center text-[10px] font-semibold text-slate-400'

  return (
    <div>
      <PageHeader
        title="Drydock Schedule"
        subtitle="Tentative yard and service planning by half-month period — click a cell to plan."
      />

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-7 rounded bg-slate-100 text-center text-[10px] font-semibold leading-4 text-slate-400">H</span>
          In service
        </span>
        {(Object.keys(codeLabel) as DrydockCode[]).map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className={`inline-block h-4 w-7 rounded text-center text-[10px] font-bold leading-4 ${codeStyle[c]}`}>{c}</span>
            {codeLabel[c]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-7 rounded ring-2 ring-inset ring-red-400" />
          Drydock deadline
        </span>
        <span className="ml-auto flex items-center gap-1 text-slate-400">
          <Info className="h-3.5 w-3.5" /> Changes queue for D365 like any other edit
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th rowSpan={2} className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left label">Tug</th>
              <th rowSpan={2} className="px-2 py-2 text-left label">COI Exp.</th>
              <th rowSpan={2} className="px-2 py-2 text-left label">ISM Audit</th>
              <th rowSpan={2} className="px-2 py-2 text-left label">DD Expire</th>
              {months.map((m) => (
                <th key={m.month} colSpan={m.count} className="border-l border-slate-200 px-1 py-1.5 text-center text-[11px] font-bold uppercase text-navy-700">
                  {m.month}
                </th>
              ))}
              <th rowSpan={2} className="border-l border-slate-200 px-2 py-2 text-center label">In Svc</th>
            </tr>
            <tr className="bg-slate-50">
              {periods.map((p) => (
                <th key={p.key} className={`${headerCell} ${p.isCurrent ? 'bg-harbor-500/10 text-harbor-600' : ''}`}>
                  {p.half === 'A' ? '1-15' : '16-31'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tugs.map((t) => {
              const deadlineKey = t.drydockExpiration ? periodKeyFor(new Date(t.drydockExpiration)) : null
              const planned = periods.filter((p) => slotMap.has(`${t.id}:${p.key}`)).length
              const inSvcMonths = (periods.length - planned) * 0.5
              return (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                    <Link to={`/assets/${t.id}`} className="font-bold uppercase text-harbor-600 hover:underline">
                      {t.name}
                    </Link>
                    <div className="text-[10px] text-slate-400">{t.classCode}</div>
                  </td>
                  <td className={`whitespace-nowrap px-2 py-1.5 text-xs ${dateTone(t.coiExpiration)}`}>
                    {t.coiExpiration ? fmtDate(t.coiExpiration) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs text-slate-500">
                    {t.ismAuditDate ? fmtDate(t.ismAuditDate) : '—'}
                  </td>
                  <td className={`whitespace-nowrap px-2 py-1.5 text-xs ${dateTone(t.drydockExpiration)}`}>
                    {t.drydockExpiration ? fmtDate(t.drydockExpiration) : '—'}
                  </td>
                  {periods.map((p) => {
                    const s = slotMap.get(`${t.id}:${p.key}`)
                    const isDeadline = p.key === deadlineKey
                    return (
                      <td key={p.key} className="border-l border-slate-100 p-0.5">
                        <button
                          onClick={() => void cycle(t.id, p.key)}
                          title={
                            (s ? `${codeLabel[s.code]}${s.note ? ` — ${s.note}` : ''}` : 'In service') +
                            (isDeadline ? ' · drydock deadline falls here' : '') +
                            ' (click to change)'
                          }
                          className={`block h-6 w-8 rounded text-center text-[10px] font-bold leading-6 transition ${
                            s ? codeStyle[s.code] : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          } ${isDeadline ? 'ring-2 ring-inset ring-red-400' : ''}`}
                        >
                          {s ? s.code : 'H'}
                        </button>
                      </td>
                    )
                  })}
                  <td className="border-l border-slate-200 px-2 py-1.5 text-center text-xs font-semibold tabular-nums text-navy-800">
                    {inSvcMonths.toFixed(1)} mo
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Anchor className="h-3.5 w-3.5" />
        Plan yard periods ahead of the DD Expire deadline — overlapping engine services (see Insight Tables) can ride the same window.
      </div>
    </div>
  )
}
