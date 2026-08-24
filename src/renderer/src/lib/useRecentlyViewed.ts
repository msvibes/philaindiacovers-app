import { useCallback, useState } from 'react'

const STORAGE_KEY = 'philaindiacovers:recentlyViewedIds'
const MAX_RECENT = 8

function readStored(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

// FR-28/US-53: tracks recently viewed covers, most-recent-first, deduped,
// capped at 8. No Home screen exists yet to render this (T-29, not yet
// built) — this hook only owns the tracking/persistence, which is
// independent of that rendering surface, same split the design prototype's
// own recentIds algorithm demonstrates. Persisted to localStorage (not
// component state) so the list survives an app restart, matching what a
// "recently viewed" feature actually implies.
export function useRecentlyViewed(): {
  recentIds: string[]
  recordView: (id: string) => void
} {
  const [recentIds, setRecentIds] = useState<string[]>(readStored)

  const recordView = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((existing) => existing !== id)].slice(0, MAX_RECENT)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Storage can genuinely fail (quota, private-mode restrictions) —
        // recently-viewed is a nice-to-have, not worth surfacing an error
        // for.
      }
      return next
    })
  }, [])

  return { recentIds, recordView }
}
