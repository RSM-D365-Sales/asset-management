import type { Component, ComponentLogEntry, ComponentService } from '../data/types'
import { fmtDate, fmtNum } from '../lib/format'

const DAY = 86400000
const toneColor = { ok: '#16a34a', warn: '#f59e0b', fail: '#dc2626' } as const

export interface UsageFit {
  slope: number // hours per millisecond
  intercept: number
  pts: { t: number; h: number }[]
}

// Least-squares fit through the actual meter readings — the usage rate comes
// from the captured history, not a configured assumption.
export function fitUsage(logs: ComponentLogEntry[], fallbackPerDay = 12): UsageFit | null {
  const pts = logs
    .map((l) => ({ t: new Date(l.at).getTime(), h: l.reading }))
    .sort((a, b) => a.t - b.t)
  if (pts.length === 0) return null
  if (pts.length === 1) {
    const slope = fallbackPerDay / DAY
    return { slope, intercept: pts[0].h - slope * pts[0].t, pts }
  }
  const n = pts.length
  const mt = pts.reduce((s, p) => s + p.t, 0) / n
  const mh = pts.reduce((s, p) => s + p.h, 0) / n
  let num = 0
  let den = 0
  for (const p of pts) {
    num += (p.t - mt) * (p.h - mh)
    den += (p.t - mt) ** 2
  }
  const slope = den === 0 || num <= 0 ? fallbackPerDay / DAY : num / den
  return { slope, intercept: mh - slope * mt, pts }
}

export function projectService(fit: UsageFit, s: ComponentService) {
  const dueAtHours = (s.lastCompletedHours ?? 0) + s.intervalHours
  // When does the fitted trend reach the due meter reading?
  const dueTime = (dueAtHours - fit.intercept) / fit.slope
  const dueInHours = dueAtHours - fit.pts[fit.pts.length - 1].h
  const tone: keyof typeof toneColor =
    dueInHours < 0 ? 'fail' : dueTime - Date.now() <= 30 * DAY ? 'warn' : 'ok'
  return { dueAtHours, dueTime, dueInHours, tone }
}

export const ratePerDay = (fit: UsageFit) => fit.slope * DAY

const monthTicks = (xMin: number, xMax: number) => {
  const ticks: number[] = []
  const d = new Date(xMin)
  d.setHours(0, 0, 0, 0)
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  while (d.getTime() <= xMax) {
    ticks.push(d.getTime())
    d.setMonth(d.getMonth() + 1)
  }
  return ticks
}

// SVG chart: logged readings, fitted trend extended 150 days out, and dashed
// due-threshold lines where the trend crossing marks the projected due date.
export default function UsageChart({
  component,
  fit,
  horizonDays = 150,
}: {
  component: Component
  fit: UsageFit
  horizonDays?: number
}) {
  const W = 760
  const H = 240
  const pl = 64
  const pr = 10
  const pt = 18
  const pb = 26

  const now = Date.now()
  const trendAt = (t: number) => fit.slope * t + fit.intercept
  const xMin = fit.pts[0].t
  const xMax = now + horizonDays * DAY

  const yLo = Math.min(...fit.pts.map((p) => p.h))
  const yHiTrend = trendAt(xMax)

  // Only thresholds the trend can reach within the horizon are drawn; the
  // legend below the chart still lists every service.
  const shown = (component.services ?? [])
    .map((s) => ({ s, p: projectService(fit, s) }))
    .filter(({ p }) => p.dueAtHours <= yHiTrend && p.dueAtHours >= yLo)
    .sort((a, b) => a.p.dueAtHours - b.p.dueAtHours)

  const yPad = (yHiTrend - yLo) * 0.04
  const yMin = yLo - yPad
  const yMax = yHiTrend + yPad

  const x = (t: number) => pl + ((t - xMin) / (xMax - xMin)) * (W - pl - pr)
  const y = (h: number) => pt + (1 - (h - yMin) / (yMax - yMin)) * (H - pt - pb)

  const last = fit.pts[fit.pts.length - 1]
  const historyPath = fit.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t)},${y(p.h)}`).join(' ')

  // Nudge overlapping threshold labels apart (top to bottom).
  let prevLabelY = -Infinity
  const labels = [...shown]
    .sort((a, b) => b.p.dueAtHours - a.p.dueAtHours)
    .map(({ s, p }) => {
      const lineY = y(p.dueAtHours)
      const labelY = Math.max(lineY - 5, prevLabelY + 11)
      prevLabelY = labelY
      return { s, p, lineY, labelY }
    })

  const yTicks = [0, 1, 2, 3].map((i) => yMin + ((i + 0.5) / 4) * (yMax - yMin))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Hours trend for ${component.name}`}>
      {/* y grid + labels */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="#f1f5f9" />
          <text x={pl - 8} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">
            {fmtNum(Math.round(v / 10) * 10)}
          </text>
        </g>
      ))}
      {/* x month ticks */}
      {monthTicks(xMin, xMax).map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={pt} y2={H - pb} stroke="#f8fafc" />
          <text x={x(t)} y={H - pb + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">
            {new Date(t).toLocaleDateString(undefined, { month: 'short' })}
          </text>
        </g>
      ))}

      {/* today marker */}
      <line x1={x(now)} x2={x(now)} y1={pt} y2={H - pb} stroke="#cbd5e1" strokeDasharray="3 3" />
      <text x={x(now) + 4} y={pt + 8} fontSize={9} fill="#94a3b8">
        Today
      </text>

      {/* due thresholds */}
      {labels.map(({ s, p, lineY, labelY }) => (
        <g key={s.name}>
          <line
            x1={pl}
            x2={W - pr}
            y1={lineY}
            y2={lineY}
            stroke={toneColor[p.tone]}
            strokeDasharray="5 3"
            opacity={0.75}
          />
          <text x={W - pr - 4} y={labelY} textAnchor="end" fontSize={10} fontWeight={600} fill={toneColor[p.tone]}>
            {s.name} · ~ {fmtDate(new Date(p.dueTime).toISOString())}
          </text>
          {p.dueTime >= xMin && p.dueTime <= xMax && (
            <circle cx={x(p.dueTime)} cy={lineY} r={4} fill={toneColor[p.tone]} stroke="#fff" strokeWidth={1.5} />
          )}
        </g>
      ))}

      {/* projection from last reading out to the horizon */}
      <line
        x1={x(last.t)}
        y1={y(last.h)}
        x2={x(xMax)}
        y2={y(trendAt(xMax))}
        stroke="#0d9488"
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={0.5}
      />

      {/* logged history */}
      <path d={historyPath} fill="none" stroke="#0d9488" strokeWidth={2} />
      {fit.pts.map((p) => (
        <circle key={p.t} cx={x(p.t)} cy={y(p.h)} r={2.5} fill="#0d9488" />
      ))}
      <circle cx={x(last.t)} cy={y(last.h)} r={4} fill="#0b1f3a" stroke="#fff" strokeWidth={1.5} />
    </svg>
  )
}
