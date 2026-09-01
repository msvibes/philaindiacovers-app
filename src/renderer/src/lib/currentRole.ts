import type { SupabaseClient } from '@supabase/supabase-js'

export type ProfileRole = 'admin' | 'verifier' | 'collector'

// A role lookup can fail in two genuinely different ways, and callers must
// be able to tell them apart. Collapsing both into a bare `ProfileRole |
// null` caused a real bug (T-16/T-17 offline-cache investigation, 2026-09):
// current_profile_role() failing for ANY reason — a permission error, a
// transient network blip, a token-propagation timing gap — was silently
// swallowed to `null` here, and the caller (Login.tsx) treated that
// identically to "this account genuinely has no role," signing a valid,
// just-authenticated session back out. Only 'no-role' is a confirmed "this
// account isn't set up right" condition (the RPC succeeded and genuinely
// returned no role, e.g. no matching profiles row — see the Admin repo's
// 20260811182123_auto_create_profile_on_signup.sql for the historical case
// this covers). 'error' means the lookup itself failed and nothing about
// the account's actual role was learned — a caller must never sign a
// session out on this alone.
export type RoleLookup =
  | { status: 'ok'; role: ProfileRole }
  | { status: 'no-role' }
  | { status: 'error'; code: string; message: string }

// Looks up the signed-in caller's own role via current_profile_role() (the
// Admin repo's SECURITY DEFINER helper, callable via RPC by an authenticated
// client). Only 'collector' matters in this app today, but the shape is kept
// consistent with the Admin repo's fetchCurrentRole() for future-proofing —
// this app has no other role-facing destination yet, but won't always.
// UI-only: every real enforcement point (RLS, storage policies) re-derives
// the role server-side regardless, so a stale value here can misroute the
// UI but never grant real access.
export async function fetchCurrentRole(client: SupabaseClient): Promise<RoleLookup> {
  const { data, error } = await client.rpc('current_profile_role')
  if (error) return { status: 'error', code: error.code, message: error.message }
  if (!data) return { status: 'no-role' }
  return { status: 'ok', role: data as ProfileRole }
}
