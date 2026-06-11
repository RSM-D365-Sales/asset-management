import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { uid, useSync } from '../data/sync'
import Modal from './Modal'
import type { Priority, WorkRequest } from '../data/types'

const priorities: Priority[] = ['Low', 'Normal', 'Elevated', 'High', 'Critical']

// Log a deficiency / work request against an asset. Works fully offline — the
// record is written to IndexedDB and queued for sync to D365.
export default function DeficiencyForm({
  assetId,
  onClose,
}: {
  assetId?: string
  onClose: () => void
}) {
  const assets = useLiveQuery(() => db.assets.toArray(), [])
  const { enqueue } = useSync()
  const [targetAsset, setTargetAsset] = useState(assetId ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('Normal')
  const [saving, setSaving] = useState(false)

  const components = useLiveQuery(
    () => (targetAsset ? db.components.where('assetId').equals(targetAsset).toArray() : []),
    [targetAsset],
  )
  const [componentId, setComponentId] = useState('')

  const canSave = targetAsset && title.trim().length > 2

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    const nowIso = new Date().toISOString()
    const req: WorkRequest = {
      id: uid('wr'),
      number: `WR-${Math.floor(3400 + Math.random() * 600)}`,
      title: title.trim(),
      description: description.trim(),
      assetId: targetAsset,
      componentId: componentId || undefined,
      priority,
      status: 'New',
      reportedBy: 'You',
      reportedAt: nowIso,
      history: [{ at: nowIso, by: 'You', event: 'Deficiency logged' }],
    }
    await db.workRequests.add(req)
    await enqueue({
      entity: 'workRequest',
      entityId: req.id,
      op: 'create',
      summary: `New deficiency ${req.number} — ${req.title}`,
      payload: req,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      title="Log Deficiency"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={submit} disabled={!canSave || saving} className="btn-accent">
            {saving ? 'Saving…' : 'Submit Deficiency'}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Asset</label>
          <select
            value={targetAsset}
            onChange={(e) => {
              setTargetAsset(e.target.value)
              setComponentId('')
            }}
            className="input mt-1"
          >
            <option value="">Select asset…</option>
            {(assets ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {(components?.length ?? 0) > 0 && (
          <div>
            <label className="label">Component (optional)</label>
            <select
              value={componentId}
              onChange={(e) => setComponentId(e.target.value)}
              className="input mt-1"
            >
              <option value="">— Whole asset —</option>
              {(components ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Port nav light intermittent"
            className="input mt-1"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you observe? Any temporary action taken?"
            rows={3}
            className="input mt-1 resize-none"
          />
        </div>

        <div>
          <label className="label">Priority</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {priorities.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  priority === p
                    ? 'bg-navy-700 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}
