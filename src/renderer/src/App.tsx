import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Catalogue from './pages/Catalogue'

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
  return session ? <Catalogue /> : <Login />
}

export default App
