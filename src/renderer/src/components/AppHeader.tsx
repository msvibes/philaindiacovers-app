import { supabase } from '../lib/supabaseClient'

// Shared across every signed-in screen (see SignedIn in App.tsx) so there's
// one logout path, not one per page. signOut() calls Supabase Auth's own
// /auth/v1/logout endpoint — a real server-side session revocation, not
// just a client-side localStorage clear (see logout.integration.test.ts).
// No redirect call needed afterward: App.tsx's onAuthStateChange listener
// already flips the signed-in session to Login the moment signOut() fires.
export default function AppHeader(): React.JSX.Element {
  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut()
  }

  return (
    <header className="flex items-center justify-between border-b px-8 py-4">
      <span className="font-semibold">PhilaIndiaCovers</span>
      <button type="button" onClick={handleLogout} className="rounded border px-3 py-1.5 text-sm">
        Log out
      </button>
    </header>
  )
}
