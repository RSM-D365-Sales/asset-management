import type { Priority, RequestStatus, WorkOrderStatus } from '../data/types'

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export const fmtNum = (n: number) => n.toLocaleString()

export function relativeDue(iso: string): { text: string; tone: 'ok' | 'warn' | 'fail' } {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: 'fail' }
  if (days === 0) return { text: 'Due today', tone: 'warn' }
  if (days === 1) return { text: 'Due tomorrow', tone: 'warn' }
  return { text: `Due in ${days}d`, tone: 'ok' }
}

export const priorityTone: Record<Priority, string> = {
  Low: 'bg-slate-100 text-slate-600',
  Normal: 'bg-sky-100 text-sky-700',
  Elevated: 'bg-amber-100 text-amber-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
}

export const woStatusTone: Record<WorkOrderStatus, string> = {
  Scheduled: 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-sky-100 text-sky-700',
  Completed: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
}

export const reqStatusTone: Record<RequestStatus, string> = {
  New: 'bg-red-100 text-red-700',
  Triaged: 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-sky-100 text-sky-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-slate-100 text-slate-600',
}
