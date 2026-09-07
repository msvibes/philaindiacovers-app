import type { Session } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isFirstLoginToday, markActiveToday } from './dailyPrompt'
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
