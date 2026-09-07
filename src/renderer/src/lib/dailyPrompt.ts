import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

// Home screen personalization: shows a distinct "what would you like to
// do today?" prompt on the FIRST sign-in of each calendar day, the normal
// "Hi, [Name]!" greeting on any later sign-in the same day. Same
// user_metadata approach as tourCompletion.ts (UI-only preference, no
// security relevance, no Admin-repo migration needed).
//
// Deliberately not using Supabase's own built-in last_sign_in_at: by the
// time client code reads it right after a sign-in, it already reflects
// THAT sign-in, not the previous one, so it can't be compared against
// "today" the way this needs without capturing it at exactly the wrong
// moment. Rolling our own field sidesteps that timing question entirely.
//
// Local calendar date, not UTC -- a real bug this would otherwise ship
// for anyone in IST (UTC+5:30): toISOString() reports the previous day
// until 5:30am local time, which would show yesterday's date to a user
// genuinely opening the app for the first time today.
function todayLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isFirstLoginToday(session: Session): boolean {
  return session.user.user_metadata?.last_active_date !== todayLocalDateString()
}

// A failed write here shouldn't block anything -- worst case the prompt
// shows again next sign-in today instead of the normal greeting, same
// "harmless worst case" reasoning as markTourCompleted().
export async function markActiveToday(): Promise<void> {
  await supabase.auth.updateUser({ data: { last_active_date: todayLocalDateString() } })
}
