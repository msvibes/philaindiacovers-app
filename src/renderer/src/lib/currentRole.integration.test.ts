import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fetchCurrentRole } from './currentRole'

// Integration tier (live Supabase, not mocked) — same pattern as
// logout.integration.test.ts. Requires SUPABASE_SERVICE_ROLE_KEY passed
// inline (never stored in .env — see CLAUDE.md), e.g.:
// SUPABASE_SERVICE_ROLE_KEY=... npm test
//
// Real regression test, T-16/T-17 offline-cache investigation (2026-09):
// current_profile_role() failed for a real, valid, just-signed-in
// Collector session on the dev/CI project, and the failure was silently
// swallowed into a false "not a Collector" sign-out (fixed separately in
// currentRole.ts/Login.tsx). The leading hypothesis, traced directly
// against the Admin repo's migrations, was a missing EXECUTE grant on the
// function specifically (grant_execute_current_profile_role.sql, a
// separate migration from the one that created the function and granted
// covers table access) — this test proves or disproves that against the
// real, live dev project, not just by reading migration files. It also
// doubles as the ongoing regression guard: if the RPC call ever throws
// for a legitimately-provisioned Collector session again, this fails loud
// in CI instead of silently degrading into a false sign-out.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey)

if (!hasCredentials) {
  console.warn(
    '[currentRole.integration.test] Skipped — SUPABASE_SERVICE_ROLE_KEY not set. ' +
      'Pass inline: SUPABASE_SERVICE_ROLE_KEY=... npm test. This test needs a live Supabase connection.'
  )
}

describe.skipIf(!hasCredentials)(
  'current_profile_role() RPC (T-16/T-17 offline-cache investigation)',
  () => {
    const runId = `current-role-${Date.now()}`
    const email = `${runId}-collector@example.test`
    const password = `CurrentRole-Test-${runId}`
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

      // Confirm the trigger actually created the profiles row before
      // testing the RPC — a failure here would be a different bug
      // (the one 20260811182123_auto_create_profile_on_signup.sql
      // already fixed once), not the one this test targets.
      const { data: profile, error: profileErr } = await admin
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle()
      if (profileErr || !profile) {
        throw new Error(
          `Test setup invalid — handle_new_user() did not create a profiles row: ${profileErr?.message ?? 'no row'}`
        )
      }

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

    it('succeeds for a real, valid, just-signed-in Collector session — the exact shape of call Login.tsx makes', async () => {
      const result = await fetchCurrentRole(userClient)

      // A failure here (status: 'error') means the RPC itself is broken
      // for this project — most likely the missing EXECUTE grant. Surface
      // the real code/message in the assertion failure rather than just
      // "expected ok, got error", so a CI failure here points straight at
      // the cause instead of needing a re-investigation.
      if (result.status === 'error') {
        throw new Error(
          `current_profile_role() RPC failed for a valid session — code=${result.code} message=${result.message}. ` +
            'Check EXECUTE grant: grant execute on function current_profile_role() to authenticated;'
        )
      }

      expect(result).toEqual({ status: 'ok', role: 'collector' })
    })
  }
)
