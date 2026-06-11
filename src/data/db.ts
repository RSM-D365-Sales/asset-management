import Dexie, { type EntityTable } from 'dexie'
import type {
  Announcement,
  Asset,
  Component,
  ComponentLogEntry,
  DrydockSlot,
  InsightTable,
  ReportWidget,
  SyncOp,
  WorkOrder,
  WorkRequest,
} from './types'

// IndexedDB is our offline-first source of truth. The UI always reads/writes
// here; a separate sync engine replays the SyncOp queue to D365 F&SCM when
// connectivity returns.
export class HarborDB extends Dexie {
  assets!: EntityTable<Asset, 'id'>
  components!: EntityTable<Component, 'id'>
  workOrders!: EntityTable<WorkOrder, 'id'>
  workRequests!: EntityTable<WorkRequest, 'id'>
  componentLogs!: EntityTable<ComponentLogEntry, 'id'>
  announcements!: EntityTable<Announcement, 'id'>
  insightTables!: EntityTable<InsightTable, 'id'>
  drydockSlots!: EntityTable<DrydockSlot, 'id'>
  reportWidgets!: EntityTable<ReportWidget, 'id'>
  syncQueue!: EntityTable<SyncOp, 'id'>

  constructor() {
    super('harbormaster')
    this.version(1).stores({
      assets: 'id, type, status',
      components: 'id, assetId, parentId',
      // Note: booleans (isPreventive/pinned) are not valid IndexedDB keys, so
      // they are not declared as indexes — filter those in memory instead.
      workOrders: 'id, assetId, status, dueDate, category',
      workRequests: 'id, assetId, status, priority',
      componentLogs: 'id, assetId, componentId',
      announcements: 'id',
      syncQueue: 'id, status, entity, createdAt',
    })
    // v2 adds saved insight-table definitions (restricted is a boolean — not
    // indexable — so only category/resourceType are declared).
    this.version(2).stores({
      insightTables: 'id, category, resourceType',
    })
    // v3 adds the drydock planning board slots.
    this.version(3).stores({
      drydockSlots: 'id, assetId, period',
    })
    // v4 adds the ad-hoc analytics canvas. Deliberately NOT cleared on reseed —
    // a report built for a demo should survive seed-data refreshes.
    this.version(4).stores({
      reportWidgets: 'id, order',
    })
  }
}

export const db = new HarborDB()
