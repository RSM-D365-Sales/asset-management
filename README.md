# HarborMaster — Marine EAM (Demo)

An offline-first React web app for managing a marine fleet's assets and maintenance.
Built as a presales prototype for a tugboat operator. The production backend is intended
to be **Dynamics 365 Finance & Supply Chain Management with Enterprise Asset Management
(EAM)**; this demo seeds local data to walk through the use cases without a live backend.

## Why offline-first

Crews complete work at sea with no connectivity. Every read and write goes to a local
IndexedDB store first; changes are queued and replayed to D365 when the connection
returns. The app is also a PWA (installable, cached for offline launch).

Use the **Online / Offline** toggle in the top bar to simulate working at sea. Make
changes while offline (complete checklist steps, log a deficiency, record hours) and
watch the **"N to sync"** badge — flip back to Online to drain the queue to the backend.

## Use cases covered

- **Dashboard** — assigned work orders, due-today/overdue, open deficiencies, announcements with acknowledgement.
- **Fleet & Assets** — every tug, dock, and barge; status, location, and live fluid gauges.
- **Asset detail (e.g. Apollo)** — categorized preventive routines, equipment tree (functional locations → components), component hour logging that **triggers the next PM**, deficiencies, activity log, and live gauge readouts (potable water, fuel, oil, grey water).
- **Work order execution** — low-click checklists in two styles: **yes/no** completion and **gauge/slider** readings, each with **Fail / Flag / Pass**; complete/incomplete counters; **PDF job aid** (full procedure, no per-step approval); **labor & cost capture**.
- **Work requests / deficiencies** — prioritized list with full **history & timeline**, status progression, and offline logging.

## Tech

- React 18 + TypeScript + Vite
- Tailwind CSS
- Dexie (IndexedDB) for the offline store + a sync queue
- Zustand for connectivity/sync state
- React Router
- `vite-plugin-pwa` (service worker, installable, offline cache)

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build + service worker
npm run preview  # serve the production build
```

The local database seeds itself on first load. To reset, clear site data in the
browser (or call `resetData()` from `src/data/seed.ts`).

## Mapping to D365 F&SCM EAM

The domain types in `src/data/types.ts` deliberately echo EAM entities (assets /
functional locations, components, work orders, maintenance requests, checklists,
labor/cost lines) so the local-first store can later map onto Dataverse / OData.
The `syncQueue` table is where a real backend adapter would POST queued operations.

> Notes captured from discovery (offline sync, equipment tree, Lubo oil-analysis API,
> hour-driven PM, JSA / LOTO routines) are reflected in the seed data and flows.
> Follow-up transcripts can extend these.
