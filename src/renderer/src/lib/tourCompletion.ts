import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

// T-34 (KAN-17): persists "has this account already seen the guided
// tour" via Supabase Auth's own user_metadata, not a new profiles column
// — this is a UI-only preference with no security relevance (worst case
// of a user resetting their own flag is seeing the tour again, harmless),
// so it doesn't need SECURITY DEFINER/RLS machinery or an Admin-repo
// migration. Genuinely per-account, not per-device: user_metadata lives
// on the session/user object itself, so it's already correct across a
// sign-in on a second device, unlike localStorage (see T-25's
// useRecentlyViewed for the deliberately-different, correctly
// per-device case).
//
// Skipping counts as completion, same as finishing all steps — the
// addendum's "does not reappear after completion" is read to cover a
// user's own choice to dismiss it, not just reaching the last step;
// nothing about a nagging repeat tour is desirable either way.
export function hasCompletedTour(session: Session): boolean {
  return session.user.user_metadata?.tour_completed === true
}

// A failed write here shouldn't block the tour from closing for the
// user in front of the app right now — worst case they see the tour
// again next sign-in, not a broken UI this session. The caller (see
// SignedIn) closes the tour immediately and lets this resolve in the
// background rather than awaiting it before dismissing.
export async function markTourCompleted(): Promise<void> {
  await supabase.auth.updateUser({ data: { tour_completed: true } })
}
