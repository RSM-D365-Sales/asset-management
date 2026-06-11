import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CheckCircle2,
  ChevronLeft,
  CircleDashed,
  Clock,
  DollarSign,
  FileText,
  Flag,
  ListChecks,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { db } from '../data/db'
import { uid, useSync } from '../data/sync'
import { Chip } from '../components/ui'
import { fmtNum, priorityTone, relativeDue, woStatusTone } from '../lib/format'
import type { ChecklistStep, LaborEntry, WorkOrder } from '../data/types'

type Result = NonNullable<ChecklistStep['result']>

export default function WorkOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const wo = useLiveQuery(() => (id ? db.workOrders.get(id) : undefined), [id])
  const asset = useLiveQuery(() => (wo ? db.assets.get(wo.assetId) : undefined), [wo?.assetId])
  const { enqueue } = useSync()
  const [showJobAid, setShowJobAid] = useState(false)
  const [showLabor, setShowLabor] = useState(false)

  if (!wo) return <div className="text-slate-400">Loading work order…</div>

  const steps = wo.steps
  const completed = steps.filter((s) => s.done).length
  const incomplete = steps.length - completed
  const flagged = steps.filter((s) => s.result === 'flag').length
  const failed = steps.filter((s) => s.result === 'fail').length

  const persist = async (next: Partial<WorkOrder>, summary: string) => {
    await db.workOrders.update(wo.id, next)
    await enqueue({
      entity: 'workOrder',
      entityId: wo.id,
      op: 'update',
      summary,
      payload: next,
    })
  }

  const updateStep = async (stepId: string, patch: Partial<ChecklistStep>, summary: string) => {
    const nextSteps = steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s))
    await persist({ steps: nextSteps }, summary)
  }

  const setResult = (s: ChecklistStep, result: Result) =>
    updateStep(
      s.id,
      { result, done: true },
      `${wo.number}: marked step ${result.toUpperCase()}`,
    )

  const toggleDone = (s: ChecklistStep) =>
    updateStep(
      s.id,
      { done: !s.done, result: !s.done ? s.result ?? 'pass' : s.result },
      `${wo.number}: ${!s.done ? 'completed' : 'reopened'} step`,
    )

  const setGauge = (s: ChecklistStep, value: number) => {
    // Auto-result a gauge reading vs. its target band.
    let result: Result = 'pass'
    if (s.target != null) {
      const span = (s.max ?? 100) - (s.min ?? 0) || 1
      const delta = Math.abs(value - s.target) / span
      result = delta > 0.25 ? 'fail' : delta > 0.12 ? 'flag' : 'pass'
    }
    updateStep(s.id, { value, result, done: true }, `${wo.number}: logged reading ${value}${s.unit ?? ''}`)
  }

  const markAllPass = async () => {
    const nextSteps = steps.map((s) =>
      s.done ? s : { ...s, done: true, result: 'pass' as Result, value: s.kind === 'gauge' ? s.target ?? s.value ?? 0 : s.value },
    )
    await persist({ steps: nextSteps }, `${wo.number}: marked all remaining steps complete`)
  }

  const completeWorkOrder = async () => {
    await persist(
      { status: 'Completed', completedAt: new Date().toISOString() },
      `${wo.number}: work order completed`,
    )
    navigate('/work-orders')
  }

  const addLabor = async (entry: LaborEntry) => {
    await persist(
      { laborEntries: [...wo.laborEntries, entry] },
      `${wo.number}: added ${entry.hours}h labor (${entry.costCategory})`,
    )
  }
  const removeLabor = async (entryId: string) => {
    await persist(
      { laborEntries: wo.laborEntries.filter((l) => l.id !== entryId) },
      `${wo.number}: removed labor entry`,
    )
  }

  const due = relativeDue(wo.dueDate)
  const totalLaborHours = wo.laborEntries.reduce((sum, l) => sum + l.hours, 0)

  return (
    <div>
      <Link
        to="/work-orders"
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-navy-700"
      >
        <ChevronLeft className="h-4 w-4" /> Work Orders
      </Link>

      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-harbor-600">{wo.number}</span>
              {wo.isPreventive && <Chip className="bg-harbor-500/10 text-harbor-700">Preventive</Chip>}
            </div>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-navy-900">{wo.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              {asset && (
                <Link to={`/assets/${asset.id}`} className="font-semibold text-navy-700 hover:underline">
                  {asset.name}
                </Link>
              )}
              <span>{wo.category}</span>
              <span>· {wo.assignedTo}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> est {wo.estHours}h
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Chip className={priorityTone[wo.priority]}>{wo.priority}</Chip>
            <Chip className={woStatusTone[wo.status]}>{wo.status}</Chip>
            {wo.status !== 'Completed' && (
              <span
                className={`text-xs font-semibold ${
                  due.tone === 'fail' ? 'text-red-600' : due.tone === 'warn' ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                {due.text}
              </span>
            )}
          </div>
        </div>

        {wo.jobAidUrl && (
          <button
            onClick={() => setShowJobAid(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-100"
          >
            <FileText className="h-4 w-4" /> Open PDF Job Aid
          </button>
        )}
      </div>

      {/* Progress counters (mirrors the complete/incomplete tiles) */}
      {steps.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Counter label="Complete" value={completed} tone="ok" />
          <Counter label="Incomplete" value={incomplete} tone={incomplete ? 'warn' : 'ok'} />
          <Counter label="Flagged" value={flagged} tone={flagged ? 'flag' : 'muted'} />
          <Counter label="Failed" value={failed} tone={failed ? 'fail' : 'muted'} />
        </div>
      )}

      {/* Checklist toolbar */}
      {wo.status !== 'Completed' && steps.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <ListChecks className="h-5 w-5 text-harbor-600" /> Checklist
          </h2>
          <div className="flex gap-2">
            <button onClick={markAllPass} className="btn-outline bg-white">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Mark all remaining Pass
            </button>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="mt-3 space-y-2.5">
        {steps.map((s, i) => (
          <StepRow
            key={s.id}
            index={i + 1}
            step={s}
            disabled={wo.status === 'Completed'}
            onToggle={() => toggleDone(s)}
            onResult={(r) => setResult(s, r)}
            onGauge={(v) => setGauge(s, v)}
          />
        ))}
      </div>

      {/* Labor / cost capture */}
      <div className="mt-6 card p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <DollarSign className="h-4 w-4 text-harbor-600" /> Labor & Cost Capture
          </h2>
          <button onClick={() => setShowLabor(true)} className="btn-outline">
            <Plus className="h-4 w-4" /> Add labor
          </button>
        </div>
        {wo.laborEntries.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            No labor logged yet. Capture work effort to associate costs with this order.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {wo.laborEntries.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-semibold text-navy-900">{l.worker}</span>
                  <span className="ml-2 text-xs text-slate-500">{l.costCategory}</span>
                  {l.note && <span className="ml-2 text-xs text-slate-400">· {l.note}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums text-navy-900">{l.hours}h</span>
                  {wo.status !== 'Completed' && (
                    <button
                      onClick={() => removeLabor(l.id)}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 text-sm font-bold text-navy-900">
              <span>Total labor</span>
              <span className="tabular-nums">{totalLaborHours}h</span>
            </div>
          </div>
        )}
      </div>

      {/* Complete bar */}
      {wo.status !== 'Completed' ? (
        <div className="sticky bottom-0 z-10 mt-6 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="text-sm text-slate-500">
            <span className="font-bold text-navy-900">{completed}</span> of {steps.length} steps done
            {incomplete > 0 && <span className="ml-1 text-amber-600">· {incomplete} remaining</span>}
          </div>
          <button onClick={completeWorkOrder} className="btn-primary">
            <CheckCircle2 className="h-4 w-4" /> Complete Work Order
          </button>
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700 ring-1 ring-green-200">
          <CheckCircle2 className="h-5 w-5" /> Completed
          {wo.completedAt ? ` · ${new Date(wo.completedAt).toLocaleString()}` : ''}
        </div>
      )}

      {showJobAid && <JobAidModal title={wo.title} onClose={() => setShowJobAid(false)} />}
      {showLabor && (
        <LaborModal
          onClose={() => setShowLabor(false)}
          onAdd={(e) => {
            void addLabor(e)
            setShowLabor(false)
          }}
        />
      )}
    </div>
  )
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'ok' | 'warn' | 'fail' | 'flag' | 'muted'
}) {
  const toneMap = {
    ok: 'text-green-600',
    warn: 'text-amber-600',
    fail: 'text-red-600',
    flag: 'text-purple-600',
    muted: 'text-slate-300',
  }
  return (
    <div className="card flex flex-col items-center py-3">
      <div className={`text-3xl font-extrabold tabular-nums ${toneMap[tone]}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}

const resultBtns: { key: Result; label: string; on: string; off: string; icon?: typeof Flag }[] = [
  { key: 'fail', label: 'Fail', on: 'bg-red-600 text-white', off: 'text-red-600 ring-1 ring-red-200 hover:bg-red-50' },
  { key: 'flag', label: 'Flag', on: 'bg-purple-600 text-white', off: 'text-purple-600 ring-1 ring-purple-200 hover:bg-purple-50', icon: Flag },
  { key: 'pass', label: 'Pass', on: 'bg-green-600 text-white', off: 'text-green-700 ring-1 ring-green-200 hover:bg-green-50' },
]

function StepRow({
  index,
  step,
  disabled,
  onToggle,
  onResult,
  onGauge,
}: {
  index: number
  step: ChecklistStep
  disabled: boolean
  onToggle: () => void
  onResult: (r: Result) => void
  onGauge: (v: number) => void
}) {
  const tone =
    step.result === 'fail'
      ? 'ring-red-200 bg-red-50/40'
      : step.result === 'flag'
        ? 'ring-purple-200 bg-purple-50/40'
        : step.done
          ? 'ring-green-200 bg-green-50/40'
          : 'ring-slate-200'

  return (
    <div className={`card p-3.5 ring-1 ${tone}`}>
      <div className="flex items-start gap-3">
        {step.kind === 'yesno' ? (
          <button
            onClick={onToggle}
            disabled={disabled}
            className="mt-0.5 shrink-0"
            aria-label="toggle complete"
          >
            {step.done ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <CircleDashed className="h-6 w-6 text-slate-300 hover:text-slate-400" />
            )}
          </button>
        ) : (
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
            {index}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className={`text-sm ${step.done ? 'text-slate-500' : 'text-navy-900'}`}>
            {step.instruction}
          </p>

          {step.kind === 'gauge' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {fmtNum(step.min ?? 0)} {step.unit}
                </span>
                <span className="text-base font-extrabold tabular-nums text-navy-900">
                  {step.value != null ? fmtNum(step.value) : '—'} {step.unit}
                </span>
                <span>
                  {fmtNum(step.max ?? 100)} {step.unit}
                </span>
              </div>
              <input
                type="range"
                className="gauge-slider mt-1.5 w-full"
                min={step.min ?? 0}
                max={step.max ?? 100}
                value={step.value ?? step.min ?? 0}
                disabled={disabled}
                onChange={(e) => onGauge(Number(e.target.value))}
              />
              {step.target != null && (
                <div className="mt-1 text-[11px] text-slate-400">
                  Target ≈ {fmtNum(step.target)} {step.unit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fail / Flag / Pass */}
        <div className="flex shrink-0 gap-1.5">
          {resultBtns.map((b) => {
            const active = step.result === b.key
            return (
              <button
                key={b.key}
                onClick={() => onResult(b.key)}
                disabled={disabled}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  active ? b.on : `bg-white ${b.off}`
                }`}
              >
                {b.icon && <b.icon className="h-3 w-3" />}
                {b.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function JobAidModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
            <FileText className="h-5 w-5 text-harbor-600" /> Job Aid — {title}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
          <FileText className="h-20 w-20 text-slate-300" />
          <div className="font-semibold text-slate-500">Procedure PDF (job aid)</div>
          <p className="max-w-sm text-sm text-slate-400">
            In production this renders the cached procedure PDF so crews can follow the full
            procedure without per-step approval — available offline once downloaded.
          </p>
        </div>
      </div>
    </div>
  )
}

function LaborModal({ onClose, onAdd }: { onClose: () => void; onAdd: (e: LaborEntry) => void }) {
  const [worker, setWorker] = useState('You')
  const [hours, setHours] = useState('1')
  const [costCategory, setCostCategory] = useState('Maintenance Labor')
  const [note, setNote] = useState('')

  const add = () => {
    const h = Number(hours)
    if (!Number.isFinite(h) || h <= 0) return
    onAdd({ id: uid('le'), worker, hours: h, costCategory, note: note || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-navy-900">Add Labor</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Worker</label>
            <input value={worker} onChange={(e) => setWorker(e.target.value)} className="input mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Hours</label>
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                type="number"
                step="0.25"
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Cost Category</label>
              <select
                value={costCategory}
                onChange={(e) => setCostCategory(e.target.value)}
                className="input mt-1"
              >
                <option>Maintenance Labor</option>
                <option>Contract Labor</option>
                <option>Overtime</option>
                <option>Inspection</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="input mt-1" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={add} className="btn-accent">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
