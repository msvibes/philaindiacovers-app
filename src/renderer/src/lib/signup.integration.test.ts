import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Integration tier (live Supabase, not mocked) — same pattern as
// logout.integration.test.ts/detailReflectsCorrectionReset.integration.test.ts.
// Requires SUPABASE_SERVICE_ROLE_KEY passed inline, e.g.:
// SUPABASE_SERVICE_ROLE_KEY=... npm test
//
// Proves the real client.auth.signUp() path (US-01/FR-26) — not
// admin.auth.admin.createUser(), which every other throwaway account in
// this project's test suite uses, and which does NOT exercise the same
// validation/trigger path a genuine self-service signup does. Confirmed
// live (Step 0 of the US-01+US-02 plan) that Supabase's public signUp()
// rejects @example.test as an invalid address — this test uses a real,
// deliverable disposable domain instead, a small accepted real-email-send
// cost per CI run, same "known accepted risk, logged not silently
// accepted" treatment this project already gives the shared dev-project
// CI concurrency risk.
//
// Deliberately does NOT attempt to click the real confirmation link or
// sign in afterward — that step needs a real inbox, and was already
// verified live, by hand, during planning (see PROGRESS.md). What this
// test CAN and does prove without one: signUp() succeeds, no session is
// returned (confirmation genuinely required), and — the one thing no
// existing test in either repo covers — the handle_new_user() trigger
// fires correctly (role='collector') for a row created via this exact
// path, not just the admin-API path.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey)

if (!hasCredentials) {
  console.warn(
    '[signup.integration.test] Skipped — SUPABASE_SERVICE_ROLE_KEY not set. ' +
      'Pass inline: SUPABASE_SERVICE_ROLE_KEY=... npm test. This test needs a live Supabase connection.'
  )
}

describe.skipIf(!hasCredentials)('supabase.auth.signUp() (US-01/FR-26, US-02/FR-27)', () => {
  const runId = `signup-${Date.now()}`
  const email = `${runId}@mailinator.com`
  const password = `SignupTest-${runId}`
  let admin: SupabaseClient
  let anonClient: SupabaseClient
  let userId: string

  beforeAll(() => {
    admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } })
    anonClient = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })
  })

  afterAll(async () => {
    if (!userId) return
    const { error: profileErr } = await admin.from('profiles').delete().eq('id', userId)
    if (profileErr) throw new Error(`Cleanup failed (profile): ${profileErr.message}`)

    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId)
    if (deleteErr) throw new Error(`Cleanup failed (user): ${deleteErr.message}`)
  }, 30_000)

  it('creates an unconfirmed account with no session, and the profiles trigger still assigns role=collector', async () => {
    const { data, error } = await anonClient.auth.signUp({ email, password })

    expect(error).toBeNull()
    expect(data.session).toBeNull()
    expect(data.user).not.toBeNull()
    // A genuinely fresh identity, not the anti-enumeration empty-array
    // shape signUp() returns for an email that already has an account.
    expect(data.user?.identities?.length).toBe(1)

    userId = data.user!.id

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    expect(profileErr).toBeNull()
    expect(profile?.role).toBe('collector')
  }, 30_000)
})
