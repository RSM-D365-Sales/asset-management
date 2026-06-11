import { useState } from 'react'
import { Gauge, Plus, TrendingUp } from 'lucide-react'
import { db } from '../data/db'
import { uid, useSync } from '../data/sync'
import { fmtDateTime, fmtNum } from '../lib/format'
import type { Component, ComponentLogEntry } from '../data/types'

// Record machine hours. Logging a reading at/over the next-service threshold
// surfaces a "PM due" trigger — the mechanism the client described where hours
// on the machine drive the next maintenance.
export default function ComponentLogPanel({
  assetId,
  components,
  logs,
}: {
  assetId: string
  components: Component[]
  logs: ComponentLogEntry[]
}) {
  const { enqueue } = useSync()
  const [componentId, setComponentId] = useState(components[0]?.id ?? '')
  const [reading, setReading] = useState('')
  const [note, setNote] = useState('')
  const [trigger, setTrigger] = useState<string | null>(null)

  const selected = components.find((c) => c.id === componentId)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(reading)
    if (!componentId || !Number.isFinite(value)) return

    const entry: ComponentLogEntry = {
      id: uid('cl'),
      assetId,
      componentId,
      at: new Date().toISOString(),
      reading: value,
      unit: 'hrs',
      recordedBy: 'You',
      note: note || undefined,
    }
    await db.componentLogs.add(entry)
    // Update the running hours on the component.
    await db.components.update(componentId, { runningHours: value })
    await enqueue({
      entity: 'componentLog',
      entityId: entry.id,
      op: 'create',
      summary: `Logged ${fmtNum(value)} hrs on ${selected?.name}`,
      payload: entry,
    })

    // Hour-based PM trigger.
    if (selected?.nextServiceHours != null && value >= selected.nextServiceHours) {
      setTrigger(
        `${selected.name} reached ${fmtNum(value)} hrs — preventive service due at ${fmtNum(
          selected.nextServiceHours,
        )} hrs. A PM work order should be scheduled.`,
      )
    } else if (selected?.nextServiceHours != null) {
      setTrigger(
        `${selected.name} logged at ${fmtNum(value)} hrs · ${fmtNum(
          selected.nextServiceHours - value,
        )} hrs until next service.`,
      )
    } else {
      setTrigger(`Reading saved for ${selected?.name}.`)
    }
    setReading('')
    setNote('')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900">
          <Gauge className="h-4 w-4 text-harbor-600" /> Record Component Hours
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Component</label>
            <select
              value={componentId}
              onChange={(e) => setComponentId(e.target.value)}
              className="input mt-1"
            >
              {components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({fmtNum(c.runningHours ?? 0)} hrs)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Hour Meter Reading</label>
            <input
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              type="number"
              inputMode="numeric"
              placeholder="e.g. 18500"
              className="input mt-1"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="label">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="End of shift reading…"
            className="input mt-1"
          />
        </div>
        <button type="submit" className="btn-accent mt-3">
          <Plus className="h-4 w-4" /> Log Reading
        </button>

        {trigger && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
            {trigger}
          </div>
        )}
      </form>

      <div className="card">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-navy-900">
          Reading History
        </div>
        <div className="divide-y divide-slate-100">
          {logs.length === 0 && (
            <div className="p-4 text-sm text-slate-400">No readings logged yet.</div>
          )}
          {logs.map((l) => {
            const comp = components.find((c) => c.id === l.componentId)
            return (
              <div key={l.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-navy-900">
                    {comp?.name ?? l.componentId}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {l.recordedBy} · {fmtDateTime(l.at)}
                    {l.note ? ` · ${l.note}` : ''}
                  </div>
                </div>
                <div className="text-right font-bold tabular-nums text-harbor-700">
                  {fmtNum(l.reading)} {l.unit}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
