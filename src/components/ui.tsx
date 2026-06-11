import type { ReactNode } from 'react'

export function Chip({ className = '', children }: { className?: string; children: ReactNode }) {
  return <span className={`chip ${className}`}>{children}</span>
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'navy',
}: {
  label: string
  value: ReactNode
  sub?: string
  tone?: 'navy' | 'ok' | 'warn' | 'fail'
}) {
  const toneMap = {
    navy: 'text-navy-900',
    ok: 'text-signal-ok',
    warn: 'text-signal-warn',
    fail: 'text-signal-fail',
  }
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className={`mt-1 text-3xl font-extrabold tabular-nums ${toneMap[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
      {icon && <div className="mb-2 text-slate-300">{icon}</div>}
      <div className="font-semibold text-slate-500">{title}</div>
      {hint && <div className="mt-1 text-sm text-slate-400">{hint}</div>}
    </div>
  )
}

// Deterministic gradient avatar for assets (placeholder for vessel photography).
export function AssetThumb({
  name,
  color,
  size = 48,
}: {
  name: string
  color: string
  size?: number
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg font-bold text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}cc 40%, #06122a)`,
        fontSize: size * 0.34,
      }}
    >
      {initials}
    </div>
  )
}
