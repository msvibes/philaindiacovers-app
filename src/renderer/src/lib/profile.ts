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

// Strips a '+alias' suffix from an email local part for display, e.g.
// 'krutimlogic+collector' -> 'krutimlogic' -- found live (2026-09-15
// install test) when a +collector-tagged test account showed "Hi,
// krutimlogic+collector!" as its fallback greeting. Guards against
// emptying the string when '+' is the very first character (a genuinely
// unusual but technically valid local part, e.g. '+foo@example.com') --
// slicing to '' there would show "Hi, !", worse than leaving it alone.
function stripPlusAlias(localPart: string): string {
  const plusIndex = localPart.indexOf('+')
  return plusIndex > 0 ? localPart.slice(0, plusIndex) : localPart
}

// Home's greeting: "Hi, [Name]!" using the real display_name, falling
// back to the email's local part (everything before the @, plus-alias
// suffix stripped) if no name has been set yet -- never blank, never an
// error. The final 'there' fallback is defensive only: every real
// account in this app has an email (email/password is the only auth
// method that exists today), so email being genuinely undefined isn't an
// expected path, same reasoning Settings.tsx's own email fallback
// already documents.
export function resolveGreetingName(
  displayName: string | null,
  email: string | undefined
): string {
  if (displayName && displayName.trim() !== '') return displayName
  if (email) return stripPlusAlias(email.split('@')[0])
  return 'there'
}
