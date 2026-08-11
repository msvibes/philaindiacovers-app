import type { SupabaseClient } from '@supabase/supabase-js'

export type ProfileRole = 'admin' | 'verifier' | 'collector'

// Looks up the signed-in caller's own role via current_profile_role() (the
// Admin repo's SECURITY DEFINER helper, callable via RPC by an authenticated
// client). Only 'collector' matters in this app today, but the shape is kept
// consistent with the Admin repo's fetchCurrentRole() for future-proofing —
// this app has no other role-facing destination yet, but won't always.
// UI-only: every real enforcement point (RLS, storage policies) re-derives
// the role server-side regardless, so a stale value here can misroute the
// UI but never grant real access.
export async function fetchCurrentRole(client: SupabaseClient): Promise<ProfileRole | null> {
  const { data, error } = await client.rpc('current_profile_role')
  if (error || !data) return null
  return data as ProfileRole
}
