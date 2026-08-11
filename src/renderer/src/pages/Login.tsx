import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchCurrentRole } from '../lib/currentRole'

export default function Login(): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSignIn = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setIsSubmitting(false)
      setError("That didn't work — double-check your email and password and give it another go.")
      return
    }

    // Every self-service signup defaults to 'collector' today, so this is
    // future-proofing rather than an expected path — but we still never
    // want to leave the browser signed in with a role this app can't serve.
    const role = await fetchCurrentRole(supabase)
    setIsSubmitting(false)

    if (role === 'collector') return // App.tsx's auth-state listener takes it from here

    await supabase.auth.signOut()
    setError("This account isn't set up as a Collector here yet — nothing more we can do for now.")
  }

  return (
    <main className="mx-auto max-w-sm w-full p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, collector!</h1>
        <p className="text-sm text-gray-500">
          Sign in to browse the catalogue and pick up right where you left off.
        </p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Letting you in…' : 'Sign in'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </main>
  )
}
