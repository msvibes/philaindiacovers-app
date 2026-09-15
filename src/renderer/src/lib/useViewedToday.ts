import { useCallback, useState } from 'react'

const STORAGE_KEY = 'philaindiacovers:viewedToday'

interface ViewedTodayRecord {
  date: string
  ids: string[]
}

// Same local-calendar-date reasoning as dailyPrompt.ts's own
// todayLocalDateString -- never toISOString()/UTC, which would show
// yesterday's date to an IST user for hours after real local midnight.
function todayLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyToday(): ViewedTodayRecord {
  return { date: todayLocalDateString(), ids: [] }
}

function readStored(): ViewedTodayRecord {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyToday()
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as ViewedTodayRecord).date === 'string' &&
      Array.isArray((parsed as ViewedTodayRecord).ids)
    ) {
      const record = parsed as ViewedTodayRecord
      // A record from a previous day is stale -- today's count starts
      // fresh, it's never carried over as yesterday's total.
      return record.date === todayLocalDateString() ? record : emptyToday()
    }
    return emptyToday()
  } catch {
    return emptyToday()
  }
}

// Stat strip (2026-09-15): distinct covers opened today. Deliberately its
// own hook/storage key, separate from useRecentlyViewed.ts -- that hook
// answers "what are the last 8 covers, regardless of when," this one
// answers "how many DIFFERENT covers today," a genuinely different
// question with its own reset-at-midnight behavior. Deduped by cover id
// (re-opening the same cover repeatedly doesn't inflate the count) --
// same "accurate over falsely blended" principle as FR-15/KAN-37's spend
// report and KAN-61's honest shared-circle counts.
export function useViewedToday(): {
  viewedTodayCount: number
  recordViewToday: (id: string) => void
} {
  const [record, setRecord] = useState<ViewedTodayRecord>(readStored)

  const recordViewToday = useCallback((id: string) => {
    setRecord((prev) => {
      const today = todayLocalDateString()
      const priorIds = prev.date === today ? prev.ids : []
      if (priorIds.includes(id)) {
        // Already counted today -- normalize a stale date onto today if
        // needed, but don't duplicate the id.
        return prev.date === today ? prev : { date: today, ids: priorIds }
      }
      const next: ViewedTodayRecord = { date: today, ids: [...priorIds, id] }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Storage can genuinely fail (quota, private-mode restrictions) --
        // same "nice-to-have" tolerance as useRecentlyViewed's own write.
      }
      return next
    })
  }, [])

  // Guards the read side too, not just recordViewToday's write side -- if
  // the app stays open across a real midnight without a new view firing,
  // the stale in-memory record shouldn't keep reporting yesterday's count.
  const viewedTodayCount = record.date === todayLocalDateString() ? record.ids.length : 0

  return { viewedTodayCount, recordViewToday }
}
