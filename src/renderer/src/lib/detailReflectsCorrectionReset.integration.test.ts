import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fetchVerifiedCoverById } from './covers'

// Integration tier (live Supabase, not mocked) — same pattern as the Admin
// repo's *.integration.test.ts files. Requires SUPABASE_SERVICE_ROLE_KEY
// passed inline (never stored in .env — see CLAUDE.md), e.g.:
//   SUPABASE_SERVICE_ROLE_KEY=... npm test
//
// Proves fetchVerifiedCoverById's own `.eq('verification_status',
// 'verified')` filter — not RLS alone — is what makes a cover disappear
// from the detail view the moment it's genuinely no longer Verified. The
// scenario this test exercises is real, not hypothetical: the Admin repo's
// FR-24 correction-reset trigger (reset_reviewed_to_draft_on_admin_
// correction()) resets a Verified cover to 'draft' the instant an Admin
// makes a plain metadata correction to it — exactly what could happen
// while a Collector has that cover's detail view open.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasCredentials = Boolean(supabaseUrl && anonKey && serviceRoleKey)

if (!hasCredentials) {
  console.warn(
    '[detailReflectsCorrectionReset.integration.test] Skipped — SUPABASE_SERVICE_ROLE_KEY not set. ' +
      'Pass inline: SUPABASE_SERVICE_ROLE_KEY=... npm test. This test needs a live Supabase connection.'
  )
}

describe.skipIf(!hasCredentials)(
  'fetchVerifiedCoverById (T-09) reflects a real FR-24 correction-reset',
  () => {
    const runId = `t09-correction-${Date.now()}`
    const password = `T09-Test-${runId}`
    let admin: SupabaseClient
    let collectorClient: SupabaseClient
    let adminUserClient: SupabaseClient
    let collectorUserId: string
    let adminUserId: string
    let coverId: string

    beforeAll(async () => {
      admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } })

      const collectorEmail = `${runId}-collector@example.test`
      const { data: collectorUser, error: collectorCreateErr } = await admin.auth.admin.createUser({
        email: collectorEmail,
        password,
        email_confirm: true
      })
      if (collectorCreateErr || !collectorUser.user) {
        throw new Error(`Failed to create test collector: ${collectorCreateErr?.message}`)
      }
      collectorUserId = collectorUser.user.id
      // role defaults to 'collector' via handle_new_user() — no explicit write needed.

      collectorClient = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })
      const { error: collectorSignInErr } = await collectorClient.auth.signInWithPassword({
        email: collectorEmail,
        password
      })
      if (collectorSignInErr) {
        throw new Error(`Failed to sign in test collector: ${collectorSignInErr.message}`)
      }

      const adminEmail = `${runId}-admin@example.test`
      const { data: adminUser, error: adminCreateErr } = await admin.auth.admin.createUser({
        email: adminEmail,
        password,
        email_confirm: true
      })
      if (adminCreateErr || !adminUser.user) {
        throw new Error(`Failed to create test admin: ${adminCreateErr?.message}`)
      }
      adminUserId = adminUser.user.id
      const { error: profileErr } = await admin
        .from('profiles')
        .upsert({ id: adminUserId, role: 'admin' }, { onConflict: 'id' })
      if (profileErr) throw new Error(`Failed to set test admin role: ${profileErr.message}`)

      adminUserClient = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } })
      const { error: adminSignInErr } = await adminUserClient.auth.signInWithPassword({
        email: adminEmail,
        password
      })
      if (adminSignInErr) throw new Error(`Failed to sign in test admin: ${adminSignInErr.message}`)

      const { data: cover, error: coverErr } = await admin
        .from('covers')
        .insert({
          name_of_cover: `${runId} cover`,
          gi_item_name: `${runId} item`,
          verification_status: 'verified',
          place_of_issue: 'Original place of issue',
          image_file: `${runId}/test.jpg`
        })
        .select('id')
        .single()
      if (coverErr || !cover) throw new Error(`Failed to seed test cover: ${coverErr?.message}`)
      coverId = cover.id
    }, 30_000)

    afterAll(async () => {
      // Order matters, and errors are checked at each step, not assumed —
      // this exact cleanup silently left rows behind the first time this
      // test ran for real. verification_audit_log.cover_id references
      // covers(id), and the second test deliberately triggers the
      // correction-reset trigger, which inserts an audit-log row — the
      // covers delete fails on that FK unless the audit row goes first.
      // Separately, profiles.id references auth.users(id) with no cascade
      // (same shape as the Admin repo's own deleteTestUser helper already
      // has to account for) — deleting the auth user before its profiles
      // row fails the same way.
      const { error: auditErr } = await admin
        .from('verification_audit_log')
        .delete()
        .eq('cover_id', coverId)
      if (auditErr) throw new Error(`Cleanup failed (audit log): ${auditErr.message}`)

      const { error: coverErr } = await admin.from('covers').delete().eq('id', coverId)
      if (coverErr) throw new Error(`Cleanup failed (cover): ${coverErr.message}`)

      const { error: profilesErr } = await admin
        .from('profiles')
        .delete()
        .in('id', [collectorUserId, adminUserId])
      if (profilesErr) throw new Error(`Cleanup failed (profiles): ${profilesErr.message}`)

      const { error: collectorDeleteErr } = await admin.auth.admin.deleteUser(collectorUserId)
      if (collectorDeleteErr) {
        throw new Error(`Cleanup failed (collector user): ${collectorDeleteErr.message}`)
      }
      const { error: adminDeleteErr } = await admin.auth.admin.deleteUser(adminUserId)
      if (adminDeleteErr) throw new Error(`Cleanup failed (admin user): ${adminDeleteErr.message}`)
    }, 30_000)

    it('is visible to a real Collector session while genuinely Verified', async () => {
      const result = await fetchVerifiedCoverById(coverId, collectorClient)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(coverId)
      expect(result?.placeOfIssue).toBe('Original place of issue')
    })

    it('shows as not-found — not stale or leaked data — the moment a real Admin correction resets it to draft', async () => {
      // A plain metadata UPDATE by a real, authenticated Admin session,
      // verification_status untouched in the payload — the correction-reset
      // trigger (Admin repo) is what actually flips it to draft on commit,
      // not this UPDATE's own values.
      const { error: updateErr } = await adminUserClient
        .from('covers')
        .update({ place_of_issue: 'Corrected place of issue' })
        .eq('id', coverId)
      expect(updateErr).toBeNull()

      // Confirm the trigger really did fire, not just assume it — same
      // rigor as the rest of this session's live checks.
      const { data: afterCorrection } = await admin
        .from('covers')
        .select('verification_status')
        .eq('id', coverId)
        .single()
      expect(afterCorrection?.verification_status).toBe('draft')

      const result = await fetchVerifiedCoverById(coverId, collectorClient)
      expect(result).toBeNull()
    })
  }
)
