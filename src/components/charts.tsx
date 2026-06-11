import type { Slice } from '../lib/reporting'

// Shared categorical palette for the ad-hoc report widgets.
export const chartPalette = [
  '#264f96', '#14b8a6', '#f59e0b', '#7098d4', '#0d9488',
  '#a855f7', '#dc2626', '#64748b', '#fb923c', '#22c55e',
]

export function BarRows({ data, fmt }: { data: Slice[]; fmt: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <div key={d.label} className="grid grid-cols-[120px_1fr_70px] items-center gap-2 text-xs">
          <span className="truncate text-slate-500" title={d.label}>{d.label}</span>
          <div className="h-4 rounded bg-slate-100">
            <div
              className="h-4 rounded transition-all"
              style={{ width: `${(d.value / max) * 100}%`, background: chartPalette[i % chartPalette.length] }}
            />
          </div>
          <span className="text-right font-semibold tabular-nums text-navy-800">{fmt(d.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function LineChartSvg({ data, fmt }: { data: Slice[]; fmt: (n: number) => string }) {
  const W = 440
  const H = 150
  const pl = 8
  const pr = 8
  const pt = 16
  const pb = 20
  const max = Math.max(...data.map((d) => d.value), 1)
  const x = (i: number) => pl + (i / Math.max(data.length - 1, 1)) * (W - pl - pr)
  const y = (v: number) => pt + (1 - v / max) * (H - pt - pb)
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${H - pb} L${x(0)},${H - pb} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      <line x1={pl} x2={W - pr} y1={H - pb} y2={H - pb} stroke="#e2e8f0" />
      <path d={area} fill="#14b8a6" opacity={0.12} />
      <path d={line} fill="none" stroke="#0d9488" strokeWidth={2} />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r={2.5} fill="#0d9488" />
          {i % 2 === 0 && (
            <text x={x(i)} y={H - pb + 13} textAnchor="middle" fontSize={9} fill="#94a3b8">
              {d.label}
            </text>
          )}
          {d.value > 0 && d.value === max && (
            <text x={x(i)} y={y(d.value) - 6} textAnchor="middle" fontSize={9} fontWeight={600} fill="#0f766e">
              {fmt(d.value)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export function DonutSvg({ data, fmt }: { data: Slice[]; fmt: (n: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const R = 46
  const C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0">
        {data.map((d, i) => {
          const frac = d.value / total
          const start = acc
          acc += frac
          return (
            <circle
              key={d.label}
              cx={60}
              cy={60}
              r={R}
              fill="none"
              stroke={chartPalette[i % chartPalette.length]}
              strokeWidth={20}
              strokeDasharray={`${Math.max(frac * C - 1.5, 0.01)} ${C}`}
              transform={`rotate(${start * 360 - 90} 60 60)`}
            />
          )
        })}
        <text x={60} y={64} textAnchor="middle" fontSize={17} fontWeight={800} fill="#11244a">
          {fmt(total)}
        </text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartPalette[i % chartPalette.length] }} />
            <span className="truncate text-slate-500" title={d.label}>{d.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-navy-800">{fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
