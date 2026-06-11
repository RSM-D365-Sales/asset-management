import type { Gauge } from '../data/types'
import { fmtNum } from '../lib/format'

// Big numeric readout like the bottom strip on the asset detail screen.
export function GaugeReadout({ g }: { g: Gauge }) {
  const low = g.warnBelow != null && g.value < g.warnBelow
  return (
    <div className="rounded-xl bg-navy-900 px-4 py-3 text-center text-white">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-harbor-400">
        {g.label}
      </div>
      <div
        className={`mt-1 text-3xl font-extrabold tabular-nums ${low ? 'text-amber-400' : 'text-white'}`}
      >
        {fmtNum(g.value)}
      </div>
      <div className="text-[11px] text-navy-300">
        {g.unit}
        {g.max ? ` · ${Math.round((g.value / g.max) * 100)}%` : ''}
      </div>
    </div>
  )
}

// Compact horizontal bar for asset cards.
export function GaugeBar({ g }: { g: Gauge }) {
  const pct = g.max ? Math.min(100, Math.round((g.value / g.max) * 100)) : 0
  const low = g.warnBelow != null && g.value < g.warnBelow
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-slate-500">{g.label}</span>
        <span className={`font-semibold tabular-nums ${low ? 'text-amber-600' : 'text-slate-700'}`}>
          {fmtNum(g.value)} {g.unit}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${low ? 'bg-amber-400' : 'bg-harbor-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
