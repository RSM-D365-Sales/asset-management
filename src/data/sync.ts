import { create } from 'zustand'
import { db } from './db'
import type { SyncEntity, SyncOp } from './types'

// Generate a stable-ish id without extra deps.
export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

interface SyncState {
  online: boolean
  // user-controlled "force offline" toggle to demo offline mode regardless of
  // the real browser connection
  forcedOffline: boolean
  syncing: boolean
  pending: number
  lastSyncedAt: string | null
  setOnline: (v: boolean) => void
  toggleForcedOffline: () => void
  refreshPending: () => Promise<void>
  enqueue: (op: Omit<SyncOp, 'id' | 'createdAt' | 'status'>) => Promise<void>
  sync: () => Promise<void>
}

const effectiveOnline = (online: boolean, forced: boolean) => online && !forced

export const useSync = create<SyncState>((set, get) => ({
  online: navigator.onLine,
  forcedOffline: false,
  syncing: false,
  pending: 0,
  lastSyncedAt: null,

  setOnline: (v) => {
    set({ online: v })
    if (effectiveOnline(v, get().forcedOffline)) {
      void get().sync()
    }
  },

  toggleForcedOffline: () => {
    const next = !get().forcedOffline
    set({ forcedOffline: next })
    if (effectiveOnline(get().online, next)) {
      void get().sync()
    }
  },

  refreshPending: async () => {
    const pending = await db.syncQueue.where('status').equals('pending').count()
    set({ pending })
  },

  enqueue: async (op) => {
    const full: SyncOp = {
      ...op,
      id: uid('sync'),
      createdAt: new Date().toISOString(),
      status: 'pending',
    }
    await db.syncQueue.add(full)
    await get().refreshPending()
    // If we're online, replay immediately.
    if (effectiveOnline(get().online, get().forcedOffline)) {
      void get().sync()
    }
  },

  sync: async () => {
    if (get().syncing) return
    if (!effectiveOnline(get().online, get().forcedOffline)) return
    const ops = await db.syncQueue.where('status').equals('pending').toArray()
    if (ops.length === 0) return
    set({ syncing: true })
    // Simulate a network round-trip to D365 F&SCM EAM. In production this would
    // POST each op to the OData / custom service endpoint and reconcile.
    await new Promise((r) => setTimeout(r, 900))
    await db.transaction('rw', db.syncQueue, async () => {
      for (const op of ops) {
        await db.syncQueue.update(op.id, { status: 'synced' })
      }
    })
    set({ syncing: false, lastSyncedAt: new Date().toISOString() })
    await get().refreshPending()
  },
}))

// Convenience used across the app to label sync ops.
export const entityLabel: Record<SyncEntity, string> = {
  workOrder: 'Work Order',
  workRequest: 'Work Request',
  componentLog: 'Component Log',
  checklistStep: 'Checklist Step',
  announcement: 'Announcement',
  drydockSlot: 'Drydock Slot',
}

// Wire up browser connectivity events once.
export function initConnectivity() {
  const s = useSync.getState()
  window.addEventListener('online', () => useSync.getState().setOnline(true))
  window.addEventListener('offline', () => useSync.getState().setOnline(false))
  void s.refreshPending()
}
