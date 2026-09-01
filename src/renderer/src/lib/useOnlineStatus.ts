import { useEffect, useState } from 'react'

// T-17: tracks navigator.onLine via the real browser online/offline
// events (Chromium's own connectivity detection, not a custom heartbeat)
// — used by OfflineBanner and by App.tsx to trigger a resync on reconnect.
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    function goOnline(): void {
      setIsOnline(true)
    }
    function goOffline(): void {
      setIsOnline(false)
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return isOnline
}
