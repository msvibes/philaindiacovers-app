import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchCurrentRole } from '../lib/currentRole'
import Signup from './Signup'

export default function Login(): React.JSX.Element {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Distinct from `error` — this is the one failure case with a real,
  // actionable next step (resend), confirmed live (Step 0) to be a
  // specific, distinguishable Supabase error code, not something the
  // client has to guess at.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<string | null>(null)

  const handleSignIn = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setUnconfirmedEmail(null)
    setResendStatus(null)
    setIsSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setIsSubmitting(false)
      if (signInError.code === 'email_not_confirmed') {
        setUnconfirmedEmail(email)
      } else {
        setError("That didn't work — double-check your email and password and give it another go.")
      }
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

  const handleResend = async (): Promise<void> => {
    if (!unconfirmedEmail) return
    setResendStatus('Sending…')
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: unconfirmedEmail
    })
    setResendStatus(resendError ? resendError.message : 'Sent — check your email again.')
  }

  if (mode === 'sign-up') {
    return <Signup onSwitchToSignIn={() => setMode('sign-in')} />
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[380px] w-full flex-col justify-center p-8">
      <div>
        <h1 className="font-display text-[20px] font-semibold text-center text-ink mb-1">
          Welcome back, collector!
        </h1>
        <p className="text-[13px] text-ink-soft text-center mb-6">
          Sign in to browse the catalogue and pick up right where you left off.
        </p>
      </div>

      <form onSubmit={handleSignIn}>
        <div className="mb-3.5">
          <label className="block text-[12.5px] text-ink-soft mb-1.5" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 rounded-lg border border-line-strong bg-card px-3 text-[13.5px] text-ink focus:outline-none focus:border-stamp focus:ring-[3px] focus:ring-[rgba(178,58,72,0.12)]"
          />
        </div>
        <div className="mb-3.5">
          <label className="block text-[12.5px] text-ink-soft mb-1.5" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-10 rounded-lg border border-line-strong bg-card px-3 text-[13.5px] text-ink focus:outline-none focus:border-stamp focus:ring-[3px] focus:ring-[rgba(178,58,72,0.12)]"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 w-full h-[42px] rounded-[9px] bg-ink text-[13.5px] font-medium text-white hover:bg-[#132038] disabled:opacity-50"
        >
          {isSubmitting ? 'Letting you in…' : 'Sign in'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600 text-[13px]">{error}</p>}

      {unconfirmedEmail && (
        <div className="mt-4 text-[13px] space-y-2">
          <p className="text-red-600">
            That email hasn&apos;t been verified yet — check your inbox for the link, or send it
            again.
          </p>
          <button type="button" onClick={handleResend} className="text-stamp underline">
            Resend verification email
          </button>
          {resendStatus && <p className="text-ink-soft">{resendStatus}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={() => setMode('sign-up')}
        className="mt-6 text-[13px] text-ink-soft text-center underline"
      >
        Don&apos;t have an account? Sign up
      </button>
    </main>
  )
}
