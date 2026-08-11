import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'

// The catalogue list view (T-08) replaces this placeholder once it lands —
// T-07.5's own scope is just getting a real authenticated Collector session,
// which this proves without depending on any later screen existing yet.
function SignedIn(): React.JSX.Element {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold mb-2">You&apos;re in!</h1>
      <p className="text-gray-500">The catalogue is on its way — check back soon.</p>
    </main>
  )
}

function App(): React.JSX.Element | null {
  // 'loading' until the initial session check resolves, so we never flash
  // the Login screen before redirecting an already-signed-in Collector —
  // same gated-render principle as the Admin repo's per-page session guards.
  const [session, setSession] = useState<Session | null | 'loading'>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))

    return () => subscription.unsubscribe()
  }, [])

  if (session === 'loading') return null
  return session ? <SignedIn /> : <Login />
}

export default App
