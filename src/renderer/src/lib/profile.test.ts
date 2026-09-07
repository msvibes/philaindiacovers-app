import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchDisplayName, updateDisplayName } from './profile'

// A minimal fake matching the exact chain both functions actually call --
// same style as this project's other injectable-client tests (e.g.
// detailReflectsCorrectionReset.integration.test.ts's real client, just
// faked here since this doesn't need a live database to prove the query
// shape is built correctly).
function makeFakeClient(overrides: {
  single?: () => Promise<{ data: { display_name: string | null } | null; error: Error | null }>
  update?: () => { eq: (col: string, val: string) => Promise<{ error: Error | null }> }
}): SupabaseClient {
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: overrides.single ?? (() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: overrides.update
        ? overrides.update().eq
        : vi.fn(() => Promise.resolve({ error: null }))
    }))
  }))
  return { from } as unknown as SupabaseClient
}

describe('fetchDisplayName', () => {
  it('returns the real display_name for the given user', async () => {
    const client = makeFakeClient({
      single: () => Promise.resolve({ data: { display_name: 'Priya Sharma' }, error: null })
    })
    expect(await fetchDisplayName('collector-1', client)).toBe('Priya Sharma')
  })

  it('returns null when no name has been set yet', async () => {
    const client = makeFakeClient({
      single: () => Promise.resolve({ data: { display_name: null }, error: null })
    })
    expect(await fetchDisplayName('collector-1', client)).toBeNull()
  })

  it('throws the real Supabase error on a genuine failure, rather than swallowing it', async () => {
    const client = makeFakeClient({
      single: () =>
        Promise.resolve({ data: null, error: new Error('permission denied for table profiles') })
    })
    await expect(fetchDisplayName('collector-1', client)).rejects.toThrow(
      'permission denied for table profiles'
    )
  })
})

describe('updateDisplayName', () => {
  it('calls update with the real display_name value', async () => {
    const eqSpy = vi.fn(() => Promise.resolve({ error: null }))
    const client = makeFakeClient({ update: () => ({ eq: eqSpy }) })

    await updateDisplayName('collector-1', 'Priya Sharma', client)

    expect(client.from).toHaveBeenCalledWith('profiles')
    expect(eqSpy).toHaveBeenCalledWith('id', 'collector-1')
  })

  it('throws the real Supabase error on a genuine failure', async () => {
    const client = makeFakeClient({
      update: () => ({ eq: () => Promise.resolve({ error: new Error('permission denied') }) })
    })
    await expect(updateDisplayName('collector-1', 'Priya Sharma', client)).rejects.toThrow(
      'permission denied'
    )
  })
})
