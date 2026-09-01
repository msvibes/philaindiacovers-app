import { useEffect, useState } from 'react'
import { syncCacheFromSupabase } from '../lib/covers'

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'never'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// T-17: shown only while offline — FR-16's "visible warning banner, not a
// hard error" plus FR-17's last-synced timestamp/manual refresh, bundled
// into one component matching T-17's own compound task description
// ("offline banner + 'last synced' timestamp/manual refresh"). Refresh
// re-attempts a real sync; if still offline, it fails the same way the
// original sync did and the banner simply stays up — no special handling
// needed, syncCacheFromSupabase already throws on a real Supabase error.
export default function OfflineBanner(): React.JSX.Element {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    window.api.cache.getLastSyncedAt().then(setLastSyncedAt)
  }, [])

  async function handleRefresh(): Promise<void> {
    setIsRefreshing(true)
    try {
      await syncCacheFromSupabase()
      const updated = await window.api.cache.getLastSyncedAt()
      setLastSyncedAt(updated)
    } catch {
      // Still offline (or Supabase is still unreachable) — the banner
      // simply stays up with its existing last-synced time, same as
      // before the refresh attempt.
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="bg-stamp/10 border-b border-stamp/30 px-4 py-2 flex items-center justify-between text-[13px] text-ink">
      <span>You&apos;re offline — showing covers as of {formatSyncedAt(lastSyncedAt)}.</span>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="underline text-stamp disabled:opacity-50"
      >
        {isRefreshing ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  )
}
