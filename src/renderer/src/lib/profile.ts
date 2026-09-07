import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

// KAN-41 (US-30/FR-33). profiles.display_name has existed in the schema
// since profiles was created, but nothing had ever granted client-side
// access to it -- a new Admin-repo migration (2026-09-07) added a
// self-only RLS policy plus a column-scoped grant (display_name only,
// never role, even on the caller's own row) before this could exist.
// Injectable client param matches this file's own established convention
// (see fetchVerifiedCoverById) for live-integration testability.
export async function fetchDisplayName(
  userId: string,
  client: SupabaseClient = supabase
): Promise<string | null> {
  const { data, error } = await client
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data.display_name
}

export async function updateDisplayName(
  userId: string,
  displayName: string,
  client: SupabaseClient = supabase
): Promise<void> {
  const { error } = await client.from('profiles').update({ display_name: displayName }).eq('id', userId)
  if (error) throw error
}

// Home's greeting: "Hi, [Name]!" using the real display_name, falling
// back to the email's local part (everything before the @) if no name
// has been set yet -- never blank, never an error. The final 'there'
// fallback is defensive only: every real account in this app has an
// email (email/password is the only auth method that exists today), so
// email being genuinely undefined isn't an expected path, same reasoning
// Settings.tsx's own email fallback already documents.
export function resolveGreetingName(
  displayName: string | null,
  email: string | undefined
): string {
  if (displayName && displayName.trim() !== '') return displayName
  if (email) return email.split('@')[0]
  return 'there'
}
