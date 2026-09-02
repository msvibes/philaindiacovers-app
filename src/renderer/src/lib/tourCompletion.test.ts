import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { hasCompletedTour, markTourCompleted } from './tourCompletion'
import { supabase } from './supabaseClient'

vi.mock('./supabaseClient', () => ({
  supabase: { auth: { updateUser: vi.fn() } }
}))

function makeSession(userMetadata: Record<string, unknown>): Session {
  return { user: { user_metadata: userMetadata } } as unknown as Session
}

describe('hasCompletedTour', () => {
  it('is false when tour_completed was never set — every existing account before this shipped', () => {
    expect(hasCompletedTour(makeSession({}))).toBe(false)
  })

  it('is false for any other truthy-but-not-true value, not just missing', () => {
    expect(hasCompletedTour(makeSession({ tour_completed: 'yes' }))).toBe(false)
  })

  it('is true only once user_metadata.tour_completed is exactly true', () => {
    expect(hasCompletedTour(makeSession({ tour_completed: true }))).toBe(true)
  })
})

describe('markTourCompleted', () => {
  it('writes tour_completed: true via updateUser, not a new profiles column', async () => {
    const mockedUpdateUser = vi.mocked(supabase.auth.updateUser)
    mockedUpdateUser.mockResolvedValue({ data: { user: null }, error: null } as never)

    await markTourCompleted()

    expect(mockedUpdateUser).toHaveBeenCalledExactlyOnceWith({ data: { tour_completed: true } })
  })
})
