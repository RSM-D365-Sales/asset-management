import { db } from './db'
import type {
  Announcement,
  Asset,
  ChecklistStep,
  Component,
  ComponentLogEntry,
  ComponentService,
  DrydockSlot,
  Gauge,
  InsightTable,
  Priority,
  RoutineCategory,
  WorkOrder,
  WorkRequest,
} from './types'

const now = new Date('2026-06-08T08:00:00')
const iso = (daysFromNow: number) =>
  new Date(now.getTime() + daysFromNow * 86400000).toISOString()

// Bump when seed data changes shape so existing demo browsers reseed.
const SEED_VERSION = 5
const SEED_VERSION_KEY = 'harbormaster-seed-version'

// ----------------------------------------------------------------------------
// Assets — the fleet (tugs + shore assets), mirroring the prospect's vessels
// ----------------------------------------------------------------------------
const tugGauges = (
  water: number,
  waterMax: number,
  fuel: number,
  fuelMax: number,
  oilPct: number,
  grey: number,
  greyMax: number,
): Gauge[] => [
  { id: 'g-water', label: 'Potable Water', value: water, unit: 'gal', max: waterMax, warnBelow: Math.round(waterMax * 0.25) },
  { id: 'g-fuel', label: 'Fuel', value: fuel, unit: 'gal', max: fuelMax, warnBelow: Math.round(fuelMax * 0.22) },
  { id: 'g-oil', label: 'Oil', value: oilPct, unit: '%', max: 100, warnBelow: 25 },
  { id: 'g-grey', label: 'Grey Water', value: grey, unit: 'gal', max: greyMax },
]

const assets: Asset[] = [
  {
    id: 'apollo',
    name: 'Apollo',
    type: 'Tug',
    status: 'In Service',
    location: 'Berth 7 — Inner Harbor',
    imageColor: '#1b3c79',
    classCode: 'TUG-Z-DRIVE',
    manufacturer: 'Robert Allan Ltd.',
    yearBuilt: 2019,
    hoursMeter: 18420,
    coiExpiration: '2027-07-15T12:00:00',
    ismAuditDate: '2026-04-13T12:00:00',
    drydockExpiration: '2027-03-15T12:00:00',
    gauges: [
      { id: 'g-water', label: 'Potable Water', value: 5810, unit: 'gal', max: 8000, warnBelow: 2000 },
      { id: 'g-fuel', label: 'Fuel', value: 24258, unit: 'gal', max: 30000, warnBelow: 6000 },
      { id: 'g-oil', label: 'Oil', value: 82, unit: '%', max: 100, warnBelow: 25 },
      { id: 'g-grey', label: 'Grey Water', value: 890, unit: 'gal', max: 2000 },
    ],
  },
  {
    id: 'andrew-k',
    name: 'Andrew K',
    type: 'Tug',
    status: 'In Service',
    location: 'West Channel — Underway',
    imageColor: '#0d9488',
    classCode: 'TUG-ASD',
    manufacturer: 'Damen',
    yearBuilt: 2016,
    hoursMeter: 27310,
    coiExpiration: '2026-12-01T12:00:00',
    ismAuditDate: '2026-02-03T12:00:00',
    drydockExpiration: '2026-12-05T12:00:00',
    gauges: [
      { id: 'g-water', label: 'Potable Water', value: 3120, unit: 'gal', max: 6000, warnBelow: 1500 },
      { id: 'g-fuel', label: 'Fuel', value: 9870, unit: 'gal', max: 22000, warnBelow: 5000 },
      { id: 'g-oil', label: 'Oil', value: 64, unit: '%', max: 100, warnBelow: 25 },
      { id: 'g-grey', label: 'Grey Water', value: 1340, unit: 'gal', max: 1800 },
    ],
  },
  {
    id: 'artois',
    name: 'Artois',
    type: 'Tug',
    status: 'In Maintenance',
    location: 'Dry Dock 2',
    imageColor: '#264f96',
    classCode: 'TUG-CONVENTIONAL',
    manufacturer: 'Master Boat Builders',
    yearBuilt: 2012,
    hoursMeter: 41980,
    coiExpiration: '2026-09-20T12:00:00',
    ismAuditDate: '2025-10-05T12:00:00',
    drydockExpiration: '2026-07-10T12:00:00',
    gauges: [
      { id: 'g-water', label: 'Potable Water', value: 1100, unit: 'gal', max: 6000, warnBelow: 1500 },
      { id: 'g-fuel', label: 'Fuel', value: 4200, unit: 'gal', max: 22000, warnBelow: 5000 },
      { id: 'g-oil', label: 'Oil', value: 18, unit: '%', max: 100, warnBelow: 25 },
      { id: 'g-grey', label: 'Grey Water', value: 410, unit: 'gal', max: 1800 },
    ],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    type: 'Tug',
    status: 'In Service',
    location: 'Berth 3 — Inner Harbor',
    imageColor: '#11244a',
    classCode: 'TUG-Z-DRIVE',
    manufacturer: 'Robert Allan Ltd.',
    yearBuilt: 2021,
    hoursMeter: 9650,
    coiExpiration: '2028-06-22T12:00:00',
    ismAuditDate: '2026-08-10T12:00:00',
    drydockExpiration: '2028-06-30T12:00:00',
    gauges: [
      { id: 'g-water', label: 'Potable Water', value: 6400, unit: 'gal', max: 8000, warnBelow: 2000 },
      { id: 'g-fuel', label: 'Fuel', value: 27600, unit: 'gal', max: 30000, warnBelow: 6000 },
      { id: 'g-oil', label: 'Oil', value: 91, unit: '%', max: 100, warnBelow: 25 },
      { id: 'g-grey', label: 'Grey Water', value: 320, unit: 'gal', max: 2000 },
    ],
  },
  {
    id: 'atlas',
    name: 'Atlas',
    type: 'Tug',
    status: 'In Service',
    location: 'East Channel — Underway',
    imageColor: '#162f5e',
    classCode: 'TUG-ASD',
    manufacturer: 'Damen',
    yearBuilt: 2018,
    hoursMeter: 22140,
    coiExpiration: '2027-09-07T12:00:00',
    ismAuditDate: '2026-05-04T12:00:00',
    drydockExpiration: '2027-09-07T12:00:00',
    gauges: [
      { id: 'g-water', label: 'Potable Water', value: 4500, unit: 'gal', max: 6000, warnBelow: 1500 },
      { id: 'g-fuel', label: 'Fuel', value: 15300, unit: 'gal', max: 22000, warnBelow: 5000 },
      { id: 'g-oil', label: 'Oil', value: 73, unit: '%', max: 100, warnBelow: 25 },
      { id: 'g-grey', label: 'Grey Water', value: 760, unit: 'gal', max: 1800 },
    ],
  },
  {
    id: 'brizo',
    name: 'Brizo',
    type: 'Tug',
    status: 'In Service',
    location: 'Berth 5 — Inner Harbor',
    imageColor: '#0f766e',
    classCode: 'TUG-ASD',
    manufacturer: 'Damen',
    yearBuilt: 2017,
    hoursMeter: 24890,
    coiExpiration: '2027-02-18T12:00:00',
    ismAuditDate: '2026-01-12T12:00:00',
    drydockExpiration: '2027-02-18T12:00:00',
    gauges: tugGauges(3900, 6000, 13400, 22000, 77, 620, 1800),
  },
  {
    id: 'gemini',
    name: 'Gemini',
    type: 'Tug',
    status: 'In Service',
    location: 'Berth 2 — Inner Harbor',
    imageColor: '#1d4ed8',
    classCode: 'TUG-Z-DRIVE',
    manufacturer: 'Robert Allan Ltd.',
    yearBuilt: 2020,
    hoursMeter: 13750,
    coiExpiration: '2027-11-30T12:00:00',
    ismAuditDate: '2026-03-22T12:00:00',
    drydockExpiration: '2027-11-30T12:00:00',
    gauges: tugGauges(5200, 8000, 21800, 30000, 86, 540, 2000),
  },
  {
    id: 'poseidon',
    name: 'Poseidon',
    type: 'Tug',
    status: 'In Service',
    location: 'Outer Anchorage — Standby',
    imageColor: '#334155',
    classCode: 'TUG-CONVENTIONAL',
    manufacturer: 'Main Iron Works',
    yearBuilt: 2010,
    hoursMeter: 47620,
    coiExpiration: '2026-10-27T12:00:00',
    ismAuditDate: '2025-11-15T12:00:00',
    drydockExpiration: '2026-09-30T12:00:00',
    gauges: tugGauges(2600, 6000, 8100, 20000, 58, 990, 1800),
  },
  {
    id: 'pier-9',
    name: 'Pier 9 Loading Dock',
    type: 'Dock',
    status: 'In Service',
    location: 'Inner Harbor',
    imageColor: '#1e3a5f',
    classCode: 'SHORE-DOCK',
    yearBuilt: 2008,
    gauges: [],
  },
  {
    id: 'barge-14',
    name: 'Barge 14',
    type: 'Barge',
    status: 'Out of Service',
    location: 'Lay Berth',
    imageColor: '#475569',
    classCode: 'BARGE-DECK',
    yearBuilt: 2005,
    gauges: [],
  },
]

// ----------------------------------------------------------------------------
// Equipment tree (functional locations -> components)
// ----------------------------------------------------------------------------

// Builds a PM plan from last-completed meter readings; completion dates are
// back-projected from the component's operating tempo.
const plan = (
  running: number,
  avgPerDay: number,
  entries: [name: string, intervalHours: number, lastCompletedHours?: number][],
): ComponentService[] =>
  entries.map(([name, intervalHours, lastCompletedHours]) => ({
    name,
    intervalHours,
    lastCompletedHours,
    lastCompletedAt:
      lastCompletedHours === undefined
        ? undefined
        : iso(-Math.round((running - lastCompletedHours) / avgPerDay)),
  }))

// Standard Caterpillar marine PM plan (omit a reading = never completed).
const catPlan = (running: number, avg: number, oil?: number, valve?: number, cam?: number, top?: number) =>
  plan(running, avg, [
    ['Oil Change', 500, oil],
    ['Valve Adjustment', 2000, valve],
    ['8000 Hr Cam Follower Inspection', 8000, cam],
    ['Top End Overhaul', 16000, top],
  ])

// EMD two-stroke PM plan.
const emdPlan = (running: number, avg: number, oil?: number, power?: number, turbo?: number, overhaul?: number) =>
  plan(running, avg, [
    ['Oil Change', 500, oil],
    ['Power Assembly Inspection', 4000, power],
    ['Turbocharger Inspection', 8000, turbo],
    ['Main Bearing Overhaul', 20000, overhaul],
  ])

const components: Component[] = [
  { id: 'apollo-prop', assetId: 'apollo', parentId: null, name: 'Propulsion', code: 'PROP', category: 'Engine' },
  { id: 'apollo-eng-port', assetId: 'apollo', parentId: 'apollo-prop', name: 'Main Engine — Port', code: 'ME-P', category: 'Engine', manufacturer: 'Caterpillar', model: '3512E', runningHours: 18420, nextServiceHours: 18500, avgHoursPerDay: 14, services: catPlan(18420, 14, 18130, 16600, 16000) },
  { id: 'apollo-eng-stbd', assetId: 'apollo', parentId: 'apollo-prop', name: 'Main Engine — Stbd', code: 'ME-S', category: 'Engine', manufacturer: 'Caterpillar', model: '3512E', runningHours: 18390, nextServiceHours: 18500, avgHoursPerDay: 14, services: catPlan(18390, 14, 18050, 16600, 16000) },
  { id: 'apollo-zdrive-p', assetId: 'apollo', parentId: 'apollo-prop', name: 'Z-Drive — Port', code: 'ZD-P', category: 'Engine', runningHours: 18420, nextServiceHours: 20000 },
  { id: 'apollo-zdrive-s', assetId: 'apollo', parentId: 'apollo-prop', name: 'Z-Drive — Stbd', code: 'ZD-S', category: 'Engine', runningHours: 18390, nextServiceHours: 20000 },
  { id: 'apollo-power', assetId: 'apollo', parentId: null, name: 'Power Generation', code: 'PWR', category: 'Generator' },
  { id: 'apollo-gen-1', assetId: 'apollo', parentId: 'apollo-power', name: 'Ship Service Generator 1', code: 'SSG-1', category: 'Generator', runningHours: 12060, nextServiceHours: 12100 },
  { id: 'apollo-gen-2', assetId: 'apollo', parentId: 'apollo-power', name: 'Ship Service Generator 2', code: 'SSG-2', category: 'Generator', runningHours: 11890, nextServiceHours: 12100 },
  { id: 'apollo-hull', assetId: 'apollo', parentId: null, name: 'Hull & Structure', code: 'HULL', category: 'Hull & Structure' },
  { id: 'apollo-tanks', assetId: 'apollo', parentId: 'apollo-hull', name: 'Integral Tanks', code: 'TANK', category: 'Hull & Structure' },
  { id: 'apollo-deck', assetId: 'apollo', parentId: null, name: 'Deck & Safety', code: 'DECK', category: 'Deck & Safety' },
  { id: 'apollo-winch', assetId: 'apollo', parentId: 'apollo-deck', name: 'Tow Winch', code: 'WNCH', category: 'Deck & Safety', runningHours: 4200, nextServiceHours: 4500 },

  // Main engines across the rest of the fleet (feed the manufacturer insight
  // tables). Port oil change on Andrew K is deliberately overdue.
  { id: 'andrewk-eng-port', assetId: 'andrew-k', parentId: null, name: 'Main Engine — Port', code: 'ME-P', category: 'Engine', manufacturer: 'Caterpillar', model: '3516C', runningHours: 27310, nextServiceHours: 27223, avgHoursPerDay: 16, services: catPlan(27310, 16, 26723, 26000, 24000, 16050) },
  { id: 'andrewk-eng-stbd', assetId: 'andrew-k', parentId: null, name: 'Main Engine — Stbd', code: 'ME-S', category: 'Engine', manufacturer: 'Caterpillar', model: '3516C', runningHours: 27260, nextServiceHours: 27480, avgHoursPerDay: 16, services: catPlan(27260, 16, 26980, 26000, 24000, 16050) },
  { id: 'atlas-eng-port', assetId: 'atlas', parentId: null, name: 'Main Engine — Port', code: 'ME-P', category: 'Engine', manufacturer: 'Caterpillar', model: '3516C', runningHours: 22140, nextServiceHours: 22390, avgHoursPerDay: 15, services: catPlan(22140, 15, 21890, 20400, 16200) },
  { id: 'atlas-eng-stbd', assetId: 'atlas', parentId: null, name: 'Main Engine — Stbd', code: 'ME-S', category: 'Engine', manufacturer: 'Caterpillar', model: '3516C', runningHours: 22090, nextServiceHours: 22300, avgHoursPerDay: 15, services: catPlan(22090, 15, 21800, 20400, 16200) },
  { id: 'aurora-eng-port', assetId: 'aurora', parentId: null, name: 'Main Engine — Port', code: 'ME-P', category: 'Engine', manufacturer: 'Caterpillar', model: '3512E', runningHours: 9650, nextServiceHours: 9890, avgHoursPerDay: 10, services: catPlan(9650, 10, 9390, 8200, 8000) },
  { id: 'aurora-eng-stbd', assetId: 'aurora', parentId: null, name: 'Main Engine — Stbd', code: 'ME-S', category: 'Engine', manufacturer: 'Caterpillar', model: '3512E', runningHours: 9610, nextServiceHours: 9860, avgHoursPerDay: 10, services: catPlan(9610, 10, 9360, 8200, 8000) },
  { id: 'artois-eng-port', assetId: 'artois', parentId: null, name: 'Main Engine — Port', code: 'ME-P', category: 'Engine', manufacturer: 'EMD', model: '8-710G7C', runningHours: 41980, nextServiceHours: 42030, avgHoursPerDay: 6, services: emdPlan(41980, 6, 41530, 40200, 36500, 24100) },
  { id: 'artois-eng-stbd', assetId: 'artois', parentId: null, name: 'Main Engine — Stbd', code: 'ME-S', category: 'Engine', manufacturer: 'EMD', model: '8-710G7C', runningHours: 41875, nextServiceHours: 41920, avgHoursPerDay: 6, services: emdPlan(41875, 6, 41420, 40200, 36500, 24100) },
  { id: 'brizo-eng-port', assetId: 'brizo', parentId: null, name: 'Main Engine — Port', code: 'ME-P', category: 'Engine', manufacturer: 'Caterpillar', model: '3516C', runningHours: 24890, nextServiceHours: 25140, avgHoursPerDay: 15, services: catPlan(24890, 15, 24640, 23200, 17800, 16100) },
  { id: 'brizo-eng-stbd', assetId: 'brizo', parentId: null, name: 'Main Engine — Stbd', code: 'ME-S', category: 'Engine', manufacturer: 'Caterpillar', model: '3516C', runningHours: 24840, nextServiceHours: 25090, avgHoursPerDay: 15, services: catPlan(24840, 15, 24590, 23200, 17800, 16100) },
  { id: 'gemini-eng-port', assetId: 'gemini', parentId: null, name: 'Main Engine — Port', code: 'ME-P', category: 'Engine', manufacturer: 'Caterpillar', model: '3512E', runningHours: 13750, nextServiceHours: 14010, avgHoursPerDay: 12, services: catPlan(13750, 12, 13510, 12400, 8000) },
  { id: 'gemini-eng-stbd', assetId: 'gemini', parentId: null, name: 'Main Engine — Stbd', code: 'ME-S', category: 'Engine', manufacturer: 'Caterpillar', model: '3512E', runningHours: 13705, nextServiceHours: 13960, avgHoursPerDay: 12, services: catPlan(13705, 12, 13460, 12400, 8000) },
  { id: 'poseidon-eng-port', assetId: 'poseidon', parentId: null, name: 'Main Engine — Port', code: 'ME-P', category: 'Engine', manufacturer: 'EMD', model: '8-710G7C', runningHours: 47620, nextServiceHours: 47850, avgHoursPerDay: 8, services: emdPlan(47620, 8, 47390, 44200, 40300, 28500) },
  { id: 'poseidon-eng-stbd', assetId: 'poseidon', parentId: null, name: 'Main Engine — Stbd', code: 'ME-S', category: 'Engine', manufacturer: 'EMD', model: '8-710G7C', runningHours: 47480, nextServiceHours: 47710, avgHoursPerDay: 8, services: emdPlan(47480, 8, 47250, 44200, 40300, 28500) },
]

// ----------------------------------------------------------------------------
// Checklist builders
// ----------------------------------------------------------------------------
const yesNo = (id: string, instruction: string): ChecklistStep => ({
  id,
  instruction,
  kind: 'yesno',
  done: false,
  result: null,
  value: null,
})
const gauge = (
  id: string,
  instruction: string,
  unit: string,
  min: number,
  max: number,
  target: number,
): ChecklistStep => ({
  id,
  instruction,
  kind: 'gauge',
  unit,
  min,
  max,
  target,
  value: null,
  result: null,
  done: false,
})

// Daily engine room checklist (yes/no) — from "vessel inspection" screenshot
const dailyEngineRoom: ChecklistStep[] = [
  yesNo('s1', 'Check oil pressure and confirm within normal range, then start engine'),
  yesNo('s2', 'Check and pump down bilges as needed — bilges should be kept clean and free of debris'),
  yesNo('s3', 'Drain air at tank receivers and water trap'),
  yesNo('s4', 'Clear 1/2 sight glass, and conduct seawater calibration process on DNG'),
  yesNo('s5', 'Confirm wing and generator make once, 24 hours as outlined in TMSA'),
  yesNo('s6', 'Inspect steering gear, rudder linkages, and confirm full travel port to starboard'),
  yesNo('s7', 'Verify fire suppression bottles charged and tags current'),
  yesNo('s8', 'Test general alarm and emergency stops'),
]

// Hull & integral tank gauge readings (sliders) — from "checklist gauges" screenshot
const hullTankGauges: ChecklistStep[] = [
  gauge('g1', 'Check fluid levels in hydraulic reservoir and log HERE and in Engine Data', '%', 0, 100, 85),
  gauge('g2', 'Check fluid levels in potable water tank and log HERE and in Engine Data', 'gal', 0, 8000, 6000),
  gauge('g3', 'Check fluid levels in slow oil tank and log HERE and in Engine Data', '%', 0, 100, 70),
  gauge('g4', 'Check fluid levels in gear oil tank and log HERE and in Engine Data', '%', 0, 100, 80),
  gauge('g5', 'Check fluid levels in DEF tank and log HERE and in Engine Data', 'gal', 0, 300, 240),
]

// Lube/grease PM (yes/no) — from "completed task" screenshot
const winchLube: ChecklistStep[] = [
  yesNo('w1', 'Grease winch drum bearings, drum brake assembly, and gear assembly'),
  yesNo('w2', 'Lubricate level wind drum cylinder via zerks with NLGI #2'),
  yesNo('w3', 'Check oil. Drain lower, mid, or condensation in the gearbox gear case and oil as client refers to manual for instructions'),
  yesNo('w4', 'Manually turn the hand adjustment for wind level and apply a thin coat of lube/grease'),
  yesNo('w5', 'Lubricate wire rope with NLGI #2 dressing'),
]

// ----------------------------------------------------------------------------
// Work Orders (preventive routines + corrective)
// ----------------------------------------------------------------------------
const workOrders: WorkOrder[] = [
  {
    id: 'wo-1',
    number: 'WO-10245',
    title: 'Engine Room Daily Maintenance & Inspection',
    assetId: 'apollo',
    componentId: 'apollo-eng-port',
    category: 'Engine',
    status: 'In Progress',
    priority: 'Normal',
    isPreventive: true,
    dueDate: iso(0),
    assignedTo: 'You',
    jobAidUrl: '#job-aid-engine-daily',
    estHours: 1.5,
    steps: dailyEngineRoom.map((s) => ({ ...s })),
    laborEntries: [],
    createdAt: iso(-1),
  },
  {
    id: 'wo-2',
    number: 'WO-10246',
    title: 'Hull & Integral Tank Fluid Level Survey',
    assetId: 'apollo',
    componentId: 'apollo-tanks',
    category: 'Hull & Structure',
    status: 'Scheduled',
    priority: 'Normal',
    isPreventive: true,
    dueDate: iso(0),
    assignedTo: 'You',
    jobAidUrl: '#job-aid-tank-survey',
    estHours: 0.75,
    steps: hullTankGauges.map((s) => ({ ...s })),
    laborEntries: [],
    createdAt: iso(-1),
  },
  {
    id: 'wo-3',
    number: 'WO-10240',
    title: 'Tow Winch Weekly Lubrication',
    assetId: 'apollo',
    componentId: 'apollo-winch',
    category: 'Deck & Safety',
    status: 'Scheduled',
    priority: 'Normal',
    isPreventive: true,
    dueDate: iso(2),
    assignedTo: 'You',
    jobAidUrl: '#job-aid-winch-lube',
    estHours: 1,
    steps: winchLube.map((s) => ({ ...s })),
    laborEntries: [],
    createdAt: iso(-3),
  },
  {
    id: 'wo-4',
    number: 'WO-10231',
    title: 'Ship Service Generator 1 — 250hr Service',
    assetId: 'apollo',
    componentId: 'apollo-gen-1',
    category: 'Generator',
    status: 'Overdue',
    priority: 'High',
    isPreventive: true,
    dueDate: iso(-2),
    assignedTo: 'M. Okafor',
    jobAidUrl: '#job-aid-gen-250',
    estHours: 3,
    steps: [
      yesNo('gs1', 'Replace primary and secondary fuel filters'),
      yesNo('gs2', 'Change engine oil and oil filter'),
      yesNo('gs3', 'Inspect coolant level and concentration'),
      yesNo('gs4', 'Inspect/adjust drive belts'),
      gauge('gs5', 'Record coolant temperature at operating load', '°F', 120, 230, 195),
      gauge('gs6', 'Record oil pressure at operating load', 'psi', 0, 80, 55),
    ],
    laborEntries: [],
    createdAt: iso(-30),
  },
  {
    id: 'wo-5',
    number: 'WO-10250',
    title: 'Job Safety Analysis — Docking Evolution',
    assetId: 'apollo',
    category: 'Deck & Safety',
    status: 'Scheduled',
    priority: 'Normal',
    isPreventive: true,
    dueDate: iso(1),
    assignedTo: 'You',
    jobAidUrl: '#job-aid-jsa',
    estHours: 0.5,
    steps: [
      yesNo('j1', 'Review weather, current, and traffic conditions with crew'),
      yesNo('j2', 'Confirm Lock Out / Tag Out applied to winch where required'),
      yesNo('j3', 'Verify PPE worn by all hands on deck'),
      yesNo('j4', 'Confirm radio comms with bridge and line handlers'),
    ],
    laborEntries: [],
    createdAt: iso(-1),
  },
  {
    id: 'wo-6',
    number: 'WO-10199',
    title: 'Z-Drive Oil Sample & Analysis — Port',
    assetId: 'andrew-k',
    componentId: undefined,
    category: 'Engine',
    status: 'Scheduled',
    priority: 'Normal',
    isPreventive: true,
    dueDate: iso(3),
    assignedTo: 'D. Reyes',
    estHours: 0.5,
    steps: [
      yesNo('z1', 'Draw oil sample from port Z-drive sump'),
      yesNo('z2', 'Label and log sample for lab analysis (Lubo API)'),
    ],
    laborEntries: [],
    createdAt: iso(-2),
  },
  {
    id: 'wo-7',
    number: 'WO-10180',
    title: 'Annual Hull Survey & Anode Replacement',
    assetId: 'artois',
    componentId: undefined,
    category: 'Hull & Structure',
    status: 'In Progress',
    priority: 'Elevated',
    isPreventive: true,
    dueDate: iso(5),
    assignedTo: 'Yard Team',
    estHours: 40,
    steps: [
      yesNo('h1', 'Pressure wash and inspect hull plating'),
      yesNo('h2', 'Replace sacrificial anodes'),
      yesNo('h3', 'Gauge shell plating thickness'),
    ],
    laborEntries: [
      { id: 'le-1', worker: 'Yard Team', hours: 16, costCategory: 'Contract Labor', note: 'Hull prep' },
    ],
    createdAt: iso(-10),
  },
]

// ----------------------------------------------------------------------------
// Historical maintenance record — 12 months of completed PM + corrective work
// per tug. Deterministic generators (no Math.random) keep the demo stable; the
// volume feeds the analytics canvas and insight tables with believable history.
// ----------------------------------------------------------------------------
const tugIds = ['apollo', 'andrew-k', 'artois', 'aurora', 'atlas', 'brizo', 'gemini', 'poseidon']
const crew = ['M. Okafor', 'D. Reyes', 'J. Santos', 'L. Tran', 'S. Patel', 'You']

const pmTemplates: [RoutineCategory, string, number][] = [
  ['Engine', 'Main Engine Oil & Filter Service', 3],
  ['Generator', 'Generator 250hr Service', 2.5],
  ['Deck & Safety', 'Deck Machinery & Winch Lubrication', 1.5],
  ['Hull & Structure', 'Hull, Tank & Void Inspection', 2],
  ['Electrical', 'Electrical & Nav Systems Check', 1.5],
  ['Inspection', 'Monthly TSMS Safety Inspection', 1],
]

const correctiveTemplates: [RoutineCategory, string, number][] = [
  ['Engine', 'Corrective — Raw water pump seal replacement', 4],
  ['Electrical', 'Corrective — Nav light wiring repair', 2],
  ['Deck & Safety', 'Corrective — Tow winch brake band adjustment', 3],
  ['Generator', 'Corrective — Coolant hose replacement', 2],
]

let woSeq = 9000
const historicalWorkOrders: WorkOrder[] = []
tugIds.forEach((assetId, ti) => {
  for (let m = 12; m >= 1; m--) {
    // 2–3 PM routines a month, rotating through the template list per vessel
    const picks = [(m + ti) % 6, (m + ti + 2) % 6, ...(m % 2 === 0 ? [(m + ti + 4) % 6] : [])]
    picks.forEach((pi, k) => {
      const [category, title, estHours] = pmTemplates[pi]
      const due = iso(-m * 30 + ((ti * 7 + k * 9) % 26))
      const worker = crew[(ti + m + k) % crew.length]
      const hours = Math.round((estHours + ((m + k) % 3) * 0.5) * 2) / 2
      const seq = woSeq++
      historicalWorkOrders.push({
        id: `wo-h-${seq}`,
        number: `WO-${seq}`,
        title,
        assetId,
        category,
        status: 'Completed',
        priority: 'Normal',
        isPreventive: true,
        dueDate: due,
        assignedTo: worker,
        estHours,
        steps: [],
        laborEntries: [
          { id: `le-${seq}-1`, worker, hours, costCategory: 'Vessel Labor' },
          ...(k === 0
            ? [{ id: `le-${seq}-2`, worker: crew[(ti + m + k + 1) % crew.length], hours: 1, costCategory: 'Vessel Labor' }]
            : []),
        ],
        createdAt: iso(-m * 30 - 5),
        completedAt: due,
      })
    })
    // sprinkle corrective work between the routines
    if ((m + ti) % 4 === 0) {
      const [category, title, estHours] = correctiveTemplates[(m * 7 + ti) % 4]
      const due = iso(-m * 30 + 12)
      const worker = crew[(ti + m) % crew.length]
      const seq = woSeq++
      historicalWorkOrders.push({
        id: `wo-h-${seq}`,
        number: `WO-${seq}`,
        title,
        assetId,
        category,
        status: 'Completed',
        priority: m % 2 === 0 ? 'High' : 'Elevated',
        isPreventive: false,
        dueDate: due,
        assignedTo: worker,
        estHours,
        steps: [],
        laborEntries: [
          { id: `le-${seq}-1`, worker, hours: estHours + 1, costCategory: m % 3 === 0 ? 'Contract Labor' : 'Vessel Labor' },
        ],
        createdAt: iso(-m * 30 + 10),
        completedAt: due,
      })
    }
  }
})

const deficiencyTemplates: [string, Priority][] = [
  ['Hydraulic hose weep at steering ram', 'Elevated'],
  ['Radar display intermittent', 'Normal'],
  ['Galley AC tripping breaker', 'Low'],
  ['Fender bolt sheared', 'Normal'],
  ['Bilge pump float switch sticking', 'High'],
  ['Wheelhouse door gasket leaking', 'Low'],
  ['Fuel polishing system alarm', 'Elevated'],
  ['Searchlight motor seized', 'Normal'],
]

let wrSeq = 3300
const historicalRequests: WorkRequest[] = []
tugIds.forEach((assetId, ti) => {
  for (let k = 0; k < 4; k++) {
    const daysAgo = 15 + ((ti * 31 + k * 83) % 330)
    const [title, priority] = deficiencyTemplates[(ti + k * 3) % 8]
    const reporter = crew[(ti + k) % crew.length]
    const resolved = daysAgo > 25
    const seq = wrSeq++
    historicalRequests.push({
      id: `wr-h-${seq}`,
      number: `WR-${seq}`,
      title,
      description: `${title} — logged during rounds.`,
      assetId,
      priority,
      status: resolved ? 'Resolved' : 'Triaged',
      reportedBy: reporter,
      reportedAt: iso(-daysAgo),
      history: [
        { at: iso(-daysAgo), by: reporter, event: 'Deficiency logged' },
        ...(resolved ? [{ at: iso(-daysAgo + 6), by: 'Port Engineer', event: 'Resolved' }] : []),
      ],
    })
  }
})

// ----------------------------------------------------------------------------
// Work Requests (deficiencies)
// ----------------------------------------------------------------------------
const workRequests: WorkRequest[] = [
  {
    id: 'wr-1',
    number: 'WR-3391',
    title: 'Port nav light intermittent',
    description:
      'Port running light flickers when underway. Suspect corroded connector at the mast base junction box.',
    assetId: 'apollo',
    componentId: 'apollo-deck',
    priority: 'Elevated',
    status: 'New',
    reportedBy: 'You',
    reportedAt: iso(-1),
    history: [{ at: iso(-1), by: 'You', event: 'Deficiency logged from deck round' }],
  },
  {
    id: 'wr-2',
    number: 'WR-3388',
    title: 'Stbd main engine coolant weep',
    description:
      'Small coolant weep observed at the starboard main engine water pump gasket. Top-up holding for now; schedule gasket replacement.',
    assetId: 'apollo',
    componentId: 'apollo-eng-stbd',
    priority: 'High',
    status: 'Triaged',
    reportedBy: 'M. Okafor',
    reportedAt: iso(-4),
    history: [
      { at: iso(-4), by: 'M. Okafor', event: 'Deficiency logged' },
      { at: iso(-3), by: 'Port Engineer', event: 'Triaged — parts ordered via Lubo API' },
    ],
  },
  {
    id: 'wr-3',
    number: 'WR-3385',
    title: 'Galley refrigerator not holding temp',
    description: 'Galley reefer running warm (48°F). Crew moved perishables to backup cooler.',
    assetId: 'andrew-k',
    priority: 'Normal',
    status: 'In Progress',
    reportedBy: 'D. Reyes',
    reportedAt: iso(-6),
    history: [
      { at: iso(-6), by: 'D. Reyes', event: 'Deficiency logged' },
      { at: iso(-5), by: 'Port Engineer', event: 'Assigned to shoreside tech' },
      { at: iso(-2), by: 'Shoreside Tech', event: 'Compressor diagnosed — awaiting part' },
    ],
  },
  {
    id: 'wr-4',
    number: 'WR-3380',
    title: 'Towline showing wear at thimble',
    description: 'Primary towline shows broken wires near the thimble. Flagged during weekly rig check.',
    assetId: 'atlas',
    componentId: undefined,
    priority: 'Critical',
    status: 'New',
    reportedBy: 'J. Santos',
    reportedAt: iso(-1),
    history: [{ at: iso(-1), by: 'J. Santos', event: 'Deficiency logged — line removed from service' }],
  },
  {
    id: 'wr-5',
    number: 'WR-3371',
    title: 'Dock cleat loose at Pier 9',
    description: 'Forward bollard at Pier 9 has play in the base bolts.',
    assetId: 'pier-9',
    priority: 'Normal',
    status: 'Resolved',
    reportedBy: 'You',
    reportedAt: iso(-12),
    history: [
      { at: iso(-12), by: 'You', event: 'Deficiency logged' },
      { at: iso(-9), by: 'Shore Crew', event: 'Bolts torqued and re-bedded' },
      { at: iso(-9), by: 'Shore Crew', event: 'Resolved' },
    ],
  },
]

// ----------------------------------------------------------------------------
// Component log (hours on machine -> triggers next maintenance)
// ----------------------------------------------------------------------------
// Weekly hour-meter history per engine. The sine wobble varies the weekly
// tempo (weather, job mix) while staying deterministic and monotonic, so the
// usage-projection charts have a realistic observed rate to fit against.
let logSeq = 100
const hoursHistory = (
  assetId: string,
  componentId: string,
  current: number,
  perDay: number,
  recordedBy: string,
  weeks = 26,
): ComponentLogEntry[] =>
  Array.from({ length: weeks }, (_, i) => {
    const daysAgo = (weeks - 1 - i) * 7
    const wobble = daysAgo === 0 ? 0 : Math.sin(i * 1.7 + componentId.length) * perDay * 1.5
    return {
      id: `cl-${logSeq++}`,
      assetId,
      componentId,
      at: iso(-daysAgo),
      reading: Math.round(current - perDay * daysAgo + wobble),
      unit: 'hrs',
      recordedBy,
    }
  })

const componentLogs: ComponentLogEntry[] = [
  { id: 'cl-3', assetId: 'apollo', componentId: 'apollo-gen-1', at: iso(-1), reading: 12060, unit: 'hrs', recordedBy: 'M. Okafor', note: 'Approaching 250hr service interval' },
  ...hoursHistory('apollo', 'apollo-eng-port', 18420, 14, 'You'),
  ...hoursHistory('apollo', 'apollo-eng-stbd', 18390, 14, 'You'),
  ...hoursHistory('andrew-k', 'andrewk-eng-port', 27310, 16, 'D. Reyes'),
  ...hoursHistory('andrew-k', 'andrewk-eng-stbd', 27260, 16, 'D. Reyes'),
  ...hoursHistory('atlas', 'atlas-eng-port', 22140, 15, 'J. Santos'),
  ...hoursHistory('atlas', 'atlas-eng-stbd', 22090, 15, 'J. Santos'),
  ...hoursHistory('aurora', 'aurora-eng-port', 9650, 10, 'M. Okafor'),
  ...hoursHistory('aurora', 'aurora-eng-stbd', 9610, 10, 'M. Okafor'),
  ...hoursHistory('artois', 'artois-eng-port', 41980, 6, 'Yard Team'),
  ...hoursHistory('artois', 'artois-eng-stbd', 41875, 6, 'Yard Team'),
  ...hoursHistory('brizo', 'brizo-eng-port', 24890, 15, 'L. Tran'),
  ...hoursHistory('brizo', 'brizo-eng-stbd', 24840, 15, 'L. Tran'),
  ...hoursHistory('gemini', 'gemini-eng-port', 13750, 12, 'S. Patel'),
  ...hoursHistory('gemini', 'gemini-eng-stbd', 13705, 12, 'S. Patel'),
  ...hoursHistory('poseidon', 'poseidon-eng-port', 47620, 8, 'M. Okafor'),
  ...hoursHistory('poseidon', 'poseidon-eng-stbd', 47480, 8, 'M. Okafor'),
]

// ----------------------------------------------------------------------------
// Insight Tables — saved cross-system summary reports
// ----------------------------------------------------------------------------
const insightTables: InsightTable[] = [
  {
    id: 'it-cat-summary',
    name: 'Engineering: Caterpillar Summary',
    description: 'All Caterpillar main engines fleet-wide with hours and PM due projections.',
    category: 'Engineering',
    resourceType: 'Assets',
    createdBy: 'Port Engineer',
    restricted: true,
    kind: 'manufacturer-summary',
    manufacturer: 'Caterpillar',
  },
  {
    id: 'it-emd-summary',
    name: 'Engineering: EMD Summary',
    description: 'All EMD main engines fleet-wide with hours and PM due projections.',
    category: 'Engineering',
    resourceType: 'Assets',
    createdBy: 'Port Engineer',
    restricted: true,
    kind: 'manufacturer-summary',
    manufacturer: 'EMD',
  },
  {
    id: 'it-usage-projection',
    name: 'Engineering: Engine Usage & PM Projection',
    description:
      'Logged hours plotted over time per engine; the observed usage rate projects when each service comes due.',
    category: 'Engineering',
    resourceType: 'Assets',
    createdBy: 'Port Engineer',
    restricted: false,
    kind: 'usage-projection',
  },
  {
    id: 'it-engine-hours',
    name: 'Engine Hours Log',
    description: 'Every logged hour-meter reading across the fleet, newest first.',
    category: 'Engineering',
    resourceType: 'Assets',
    createdBy: 'J. Voor',
    restricted: false,
    kind: 'hours-log',
  },
  {
    id: 'it-engine-pm',
    name: 'Engineering: Engine PM Status',
    description: 'Open and recent engine-category work orders across the fleet.',
    category: 'Engineering',
    resourceType: 'Assets',
    createdBy: 'Port Engineer',
    restricted: false,
    kind: 'pm-status',
    routineCategory: 'Engine',
  },
  {
    id: 'it-safety-pm',
    name: 'Safety: Deck & Safety PM Status',
    description: 'Deck & safety routines (JSA, LOTO, rigging) and their completion state.',
    category: 'Safety',
    resourceType: 'Assets',
    createdBy: 'B. Reeves',
    restricted: false,
    kind: 'pm-status',
    routineCategory: 'Deck & Safety',
  },
  {
    id: 'it-open-deficiencies',
    name: 'Operations: Open Deficiencies by Vessel',
    description: 'Outstanding work requests rolled up per asset with priority breakdown.',
    category: 'Operations',
    resourceType: 'Assets',
    createdBy: 'R. Derrane',
    restricted: false,
    kind: 'deficiency-summary',
  },
]

// ----------------------------------------------------------------------------
// Announcements
// ----------------------------------------------------------------------------
const announcements: Announcement[] = [
  {
    id: 'an-1',
    title: 'Notice of Updated Lockout / Tagout Procedure — Rev C',
    body: 'All engineers must acknowledge the revised LOTO procedure before the next docking evolution.',
    pinned: true,
    acknowledged: false,
    date: iso(-3),
  },
  {
    id: 'an-2',
    title: 'USCG Subchapter M Annual Inspection Window Opens June 15',
    body: 'Ensure all Towing Safety Management System (TSMS) records are current in HarborMaster.',
    pinned: true,
    acknowledged: false,
    date: iso(-5),
  },
  {
    id: 'an-3',
    title: 'New Fuel Vendor Effective This Month',
    body: 'Bunkering now coordinated through the updated vendor in D365. Submit fuel logs as usual.',
    pinned: false,
    acknowledged: true,
    date: iso(-7),
  },
]

// ----------------------------------------------------------------------------
// Drydock planning board — tentative yard periods (periods without a slot are
// implicitly 'H' / in service)
// ----------------------------------------------------------------------------
const slot = (assetId: string, period: string, code: DrydockSlot['code'], note?: string): DrydockSlot => ({
  id: `${assetId}:${period}`,
  assetId,
  period,
  code,
  note,
})

const drydockSlots: DrydockSlot[] = [
  // Artois is on the blocks now — USCG drydock expires 7/10/26
  slot('artois', '2026-06-A', 'DD', 'Hull survey prep — Dry Dock 2'),
  slot('artois', '2026-06-B', 'DD'),
  slot('artois', '2026-07-A', 'RDD', 'USCG drydock survey + anode replacement'),
  // Andrew K must start drydock before 12/05/26
  slot('andrew-k', '2026-11-A', 'RDD', 'Regulatory drydock — book yard slot'),
  slot('andrew-k', '2026-11-B', 'RDD'),
  // Apollo tentative yard period ahead of 3/15/27 expiration
  slot('apollo', '2027-02-A', 'DD', 'Tentative — Z-drive 20k hr service in same window'),
  slot('apollo', '2027-02-B', 'DD'),
  // Atlas planned lay period for crew rotation
  slot('atlas', '2026-08-B', 'OOS', 'Lay berth — crew rotation'),
  // Poseidon must start drydock before 9/30/26
  slot('poseidon', '2026-09-A', 'RDD', 'Regulatory drydock — North Yard'),
  slot('poseidon', '2026-09-B', 'RDD'),
  // Brizo tentative yard window ahead of 2/18/27 expiration
  slot('brizo', '2027-01-A', 'DD', 'Tentative — pair with 25k hr engine services'),
]

export async function seedIfEmpty() {
  // Reseed when empty OR when the seed data itself has been revised, so demo
  // browsers that already ran an older build still pick up new entities.
  const count = await db.assets.count()
  const version = Number(localStorage.getItem(SEED_VERSION_KEY) ?? '0')
  if (count > 0 && version === SEED_VERSION) return
  await clearAll()
  await db.transaction(
    'rw',
    [db.assets, db.components, db.workOrders, db.workRequests, db.componentLogs, db.announcements, db.insightTables, db.drydockSlots],
    async () => {
      await db.assets.bulkAdd(assets)
      await db.components.bulkAdd(components)
      await db.workOrders.bulkAdd([...workOrders, ...historicalWorkOrders])
      await db.workRequests.bulkAdd([...workRequests, ...historicalRequests])
      await db.componentLogs.bulkAdd(componentLogs)
      await db.announcements.bulkAdd(announcements)
      await db.insightTables.bulkAdd(insightTables)
      await db.drydockSlots.bulkAdd(drydockSlots)
    },
  )
  localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION))
}

async function clearAll() {
  await db.transaction(
    'rw',
    [db.assets, db.components, db.workOrders, db.workRequests, db.componentLogs, db.announcements, db.insightTables, db.drydockSlots, db.syncQueue],
    async () => {
      await Promise.all([
        db.assets.clear(),
        db.components.clear(),
        db.workOrders.clear(),
        db.workRequests.clear(),
        db.componentLogs.clear(),
        db.announcements.clear(),
        db.insightTables.clear(),
        db.drydockSlots.clear(),
        db.syncQueue.clear(),
      ])
    },
  )
}

export async function resetData() {
  await clearAll()
  await seedIfEmpty()
}
