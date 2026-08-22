import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Integration tier (live Supabase, not mocked) — same pattern as
// detailReflectsCorrectionReset.integration.test.ts, and the same proof
// shape as the Admin repo's logout.integration.test.ts. Requires
// SUPABASE_SERVICE_ROLE_KEY passed inline (never stored in .env — see
// CLAUDE.md), e.g.: SUPABASE_SERVICE_ROLE_KEY=... npm test
//
// Proves signOut() is a real server-side session revocation, not just a
// client-side localStorage clear: a stale access token captured before
// signOut() must be rejected by getUser() afterward. This app has no API
// route layer to replay against (unlike Admin) — Supabase Auth's own
// per-request session check, exercised here via getUser(), is the actual
// boundary every direct-to-Supabase query in this app relies on.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey)

if (!hasCredentials) {
  console.warn(
    '[logout.integration.test] Skipped — SUPABASE_SERVICE_ROLE_KEY not set. ' +
      'Pass inline: SUPABASE_SERVICE_ROLE_KEY=... npm test. This test needs a live Supabase connection.'
  )
}

describe.skipIf(!hasCredentials)(
  'signOut() (logout, FR-30/US-05 — written for the Collector persona directly)',
  () => {
    const runId = `logout-${Date.now()}`
    const email = `${runId}-collector@example.test`
    const password = `Logout-Test-${runId}`
    let admin: SupabaseClient
    let userId: string
    let userClient: SupabaseClient

    beforeAll(async () => {
      admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } })

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })
      if (createErr || !created.user) {
        throw new Error(`Failed to create test collector: ${createErr?.message}`)
      }
      userId = created.user.id
      // role defaults to 'collector' via handle_new_user() — no explicit write needed.

      userClient = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })
      const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password })
      if (signInErr) throw new Error(`Failed to sign in test collector: ${signInErr.message}`)
    }, 30_000)

    afterAll(async () => {
      const { error: profileErr } = await admin.from('profiles').delete().eq('id', userId)
      if (profileErr) throw new Error(`Cleanup failed (profile): ${profileErr.message}`)

      const { error: deleteErr } = await admin.auth.admin.deleteUser(userId)
      if (deleteErr) throw new Error(`Cleanup failed (user): ${deleteErr.message}`)
    }, 30_000)

    it('revokes the session server-side — a stale access token is rejected afterward, not just cleared client-side', async () => {
      const { data: sessionData } = await userClient.auth.getSession()
      const staleToken = sessionData.session?.access_token
      if (!staleToken) throw new Error('Test collector has no access token to capture')

      // Sanity check: the token is genuinely valid before signOut().
      const preCheck = await userClient.auth.getUser(staleToken)
      expect(preCheck.error).toBeNull()
      expect(preCheck.data.user?.id).toBe(userId)

      const { error: signOutError } = await userClient.auth.signOut()
      expect(signOutError).toBeNull()

      // A different client instance, holding only the now-stale token — the
      // same shape as any direct Supabase query in this app authenticating
      // via a bearer session — must be rejected by the real Supabase Auth
      // server, not a local check.
      const freshClient = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })
      const { data, error } = await freshClient.auth.getUser(staleToken)

      expect(error).not.toBeNull()
      expect(data.user).toBeNull()
    })
  }
)
