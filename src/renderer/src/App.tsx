import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import AppHeader from './components/AppHeader'
import Login from './pages/Login'
import Catalogue from './pages/Catalogue'
import Detail from './pages/Detail'

// Navigation is a small lifted-state value, not a router — proportionate
// to two screens, one level deep, with no URL bar or deep-linking need in
// this Electron shell. Revisit this decision (a lightweight router, e.g.
// react-router's MemoryRouter) once either becomes true: more than ~4
// screens exist, or any screen needs to preserve/restore scroll or
// selection state across navigation — neither applies yet.
function SignedIn(): React.JSX.Element {
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null)

  return (
    <>
      <AppHeader />
      {selectedCoverId ? (
        <Detail coverId={selectedCoverId} onBack={() => setSelectedCoverId(null)} />
      ) : (
        <Catalogue onSelectCover={setSelectedCoverId} />
      )}
    </>
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
