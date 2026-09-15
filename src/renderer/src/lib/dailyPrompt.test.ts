import type { Session } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { daysSinceLastVisit, isFirstLoginToday, markActiveToday } from './dailyPrompt'
import { supabase } from './supabaseClient'

vi.mock('./supabaseClient', () => ({
  supabase: { auth: { updateUser: vi.fn() } }
}))

function fakeSession(lastActiveDate?: string): Session {
  return {
    user: { id: 'collector-1', user_metadata: { last_active_date: lastActiveDate } }
  } as unknown as Session
}

describe('isFirstLoginToday', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is true when last_active_date is unset — a genuinely new account', () => {
    expect(isFirstLoginToday(fakeSession(undefined))).toBe(true)
  })

  it("is false when last_active_date already matches today's local date", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 7, 14, 30)) // 2026-09-07, local
    expect(isFirstLoginToday(fakeSession('2026-09-07'))).toBe(false)
  })

  it('is true when last_active_date is an earlier date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 7, 14, 30))
    expect(isFirstLoginToday(fakeSession('2026-09-06'))).toBe(true)
  })

  // The real bug this guards against: comparing via toISOString() (UTC)
  // instead of local date components would report the WRONG day for
  // anyone in IST (UTC+5:30) during early-morning local hours, since UTC
  // is still on the previous calendar day until 5:30am IST.
  it('uses the local calendar date, not UTC — the real IST early-morning case', () => {
    vi.useFakeTimers()
    // 2026-09-07 01:00 local time. If this machine's local timezone is
    // ahead of UTC (as IST is), the naive UTC-based bug would compute
    // '2026-09-06' here instead of '2026-09-07'.
    vi.setSystemTime(new Date(2026, 8, 7, 1, 0))
    expect(isFirstLoginToday(fakeSession('2026-09-07'))).toBe(false)
  })
})

// Stat strip (2026-09-15): reuses last_active_date, not a new column --
// same timing constraint as isFirstLoginToday (must be read before
// markActiveToday's write resolves), so these tests mirror that
// describe block's own fixed-clock style exactly.
describe('daysSinceLastVisit', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is null when last_active_date is unset — a genuinely new account, not "0 days ago"', () => {
    expect(daysSinceLastVisit(fakeSession(undefined))).toBeNull()
  })

  it('is 0 when the last recorded visit was today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 7, 14, 30))
    expect(daysSinceLastVisit(fakeSession('2026-09-07'))).toBe(0)
  })

  it('is 1 for yesterday, 5 for five days ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 7, 14, 30))
    expect(daysSinceLastVisit(fakeSession('2026-09-06'))).toBe(1)
    expect(daysSinceLastVisit(fakeSession('2026-09-02'))).toBe(5)
  })

  // Same real IST early-morning case isFirstLoginToday's own test guards
  // against — parsing via new Date(dateStr) directly (UTC midnight)
  // would shift this by a day in either direction depending on the
  // machine's offset.
  it('uses local calendar dates throughout, not UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 7, 1, 0)) // 2026-09-07, 01:00 local
    expect(daysSinceLastVisit(fakeSession('2026-09-06'))).toBe(1)
  })
})

describe('markActiveToday', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("writes today's real local date via updateUser, not a new profiles column", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 7, 14, 30))
    const mockedUpdateUser = vi.mocked(supabase.auth.updateUser)
    mockedUpdateUser.mockResolvedValue({ data: { user: null }, error: null } as never)

    await markActiveToday()

    expect(mockedUpdateUser).toHaveBeenCalledExactlyOnceWith({
      data: { last_active_date: '2026-09-07' }
    })
  })
})
