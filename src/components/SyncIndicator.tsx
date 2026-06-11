import { useEffect } from 'react'
import { Cloud, CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useSync } from '../data/sync'
import { fmtDateTime } from '../lib/format'

// Compact connectivity + sync queue status shown in the top bar.
export default function SyncIndicator() {
  const { online, forcedOffline, syncing, pending, lastSyncedAt, toggleForcedOffline, sync, refreshPending } =
    useSync()
  const effectiveOnline = online && !forcedOffline

  useEffect(() => {
    void refreshPending()
  }, [refreshPending])

  return (
    <div className="flex items-center gap-2">
      {pending > 0 && (
        <button
          onClick={() => void sync()}
          disabled={!effectiveOnline || syncing}
          className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:opacity-60"
          title={effectiveOnline ? 'Sync now' : 'Will sync when back online'}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : `${pending} to sync`}
        </button>
      )}
      {pending === 0 && lastSyncedAt && effectiveOnline && (
        <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:flex">
          <Cloud className="h-3.5 w-3.5" /> Synced {fmtDateTime(lastSyncedAt)}
        </span>
      )}

      <button
        onClick={toggleForcedOffline}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${
          effectiveOnline
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100'
            : 'bg-slate-700 text-white ring-slate-600 hover:bg-slate-600'
        }`}
        title="Toggle to simulate working at sea with no connectivity"
      >
        {effectiveOnline ? (
          <>
            <Wifi className="h-3.5 w-3.5" /> Online
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5" /> Offline
          </>
        )}
      </button>

      {!effectiveOnline && (
        <span className="hidden items-center gap-1 text-xs font-medium text-slate-400 md:flex">
          <CloudOff className="h-3.5 w-3.5" /> Changes saved locally
        </span>
      )}
    </div>
  )
}
