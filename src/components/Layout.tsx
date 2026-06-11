import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Anchor,
  BarChart3,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Search,
  Ship,
  Table2,
  TriangleAlert,
  Waves,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import SyncIndicator from './SyncIndicator'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/assets', label: 'Assets', icon: Ship },
  { to: '/work-orders', label: 'Work Orders', icon: ClipboardList },
  { to: '/requests', label: 'Work Requests', icon: TriangleAlert },
  { to: '/insights', label: 'Insight Tables', icon: Table2 },
  { to: '/drydock', label: 'Drydock Schedule', icon: CalendarRange },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-navy-900 text-navy-100">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-harbor-500/20 ring-1 ring-harbor-400/30">
          <Anchor className="h-5 w-5 text-harbor-400" />
        </div>
        <div>
          <div className="text-base font-extrabold leading-none text-white">HarborMaster</div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-harbor-400">
            Marine EAM
          </div>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-harbor-500 text-white shadow-sm'
                  : 'text-navy-200 hover:bg-navy-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-navy-800 px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-navy-300">
          <Waves className="h-4 w-4 text-harbor-400" />
          Backend: D365 F&amp;SCM EAM
        </div>
        <div className="mt-1 text-[11px] text-navy-400">Offline-first · syncs on connect</div>
      </div>
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <form
            className="relative hidden flex-1 sm:block"
            onSubmit={(e) => {
              e.preventDefault()
              if (query.trim()) navigate(`/assets?q=${encodeURIComponent(query.trim())}`)
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets, components, work orders…"
              className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-navy-400 focus:bg-white"
            />
          </form>

          <div className="ml-auto flex items-center gap-3">
            <SyncIndicator />
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-white">
                RM
              </div>
              <div className="hidden leading-tight md:block">
                <div className="text-sm font-semibold text-navy-900">R. Masschelin</div>
                <div className="text-[11px] text-slate-400">Engineer · Apollo</div>
              </div>
            </div>
          </div>
        </header>

        <main className="scroll-thin flex-1 overflow-y-auto bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
