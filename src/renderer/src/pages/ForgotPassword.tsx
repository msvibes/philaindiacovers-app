import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'

interface ForgotPasswordProps {
  onSwitchToSignIn: () => void
}

// T-41 (KAN-15, US-04/FR-29). The GitHub Pages page that actually receives
// the recovery token and sets the new password lives outside this repo's
// build — see webpage/index.html and .github/workflows/deploy-pages.yml.
// This component's whole job, per the addendum's own resolved scope, is
// small: collect the email, call resetPasswordForEmail with that page as
// the redirect target, and show a "check your email" state.
//
// Hardcoded rather than an env var — this is a public URL (same
// visibility as the app's own bundled anon key), and unlike
// VITE_SUPABASE_URL it never differs between dev and production: the
// reset page only ever needs to work against real production accounts,
// same reasoning as webpage/index.html hardcoding the production
// Supabase client directly.
const RESET_PASSWORD_PAGE_URL = 'https://msvibes.github.io/philaindiacovers-app/'

export default function ForgotPassword({
  onSwitchToSignIn
}: ForgotPasswordProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  const handleRequestReset = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_PASSWORD_PAGE_URL
    })
    setIsSubmitting(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    // Same anti-enumeration principle as Signup's own awaitingVerification
    // state — resetPasswordForEmail() returns the same "success" shape
    // whether or not the address actually has an account, specifically so
    // the client can't be used to probe which emails are registered.
    // Copy stays generic on purpose, matching that.
    setRequestSent(true)
  }

  // Styling matches Login.tsx/Signup.tsx exactly (font-display headings,
  // ink-soft labels/subtitles, border-line-strong + bg-card inputs with a
  // stamp focus ring, bg-accent buttons) — same auth-card pattern, not a
  // new one.
  if (requestSent) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[380px] w-full flex-col justify-center p-8">
        <h1 className="font-display text-[20px] font-semibold text-center text-ink mb-1">
          Check your email
        </h1>
        <p className="text-[13px] text-ink-soft text-center mb-6">
          If that address has an account, we&apos;ve sent a link to reset your password — click it
          to choose a new one, then come back here and sign in.
        </p>
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-[13px] text-ink-soft text-center underline"
        >
          Back to sign in
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[380px] w-full flex-col justify-center p-8">
      <div>
        <h1 className="font-display text-[20px] font-semibold text-center text-ink mb-1">
          Forgot your password?
        </h1>
        <p className="text-[13px] text-ink-soft text-center mb-6">
          Enter the email on your account and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <form onSubmit={handleRequestReset}>
        <div className="mb-3.5">
          <label className="block text-[12.5px] text-ink-soft mb-1.5" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 rounded-lg border border-line-strong bg-card px-3 text-[13.5px] text-ink focus:outline-none focus:border-stamp focus:ring-[3px] focus:ring-stamp-ring"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 w-full h-[42px] rounded-[9px] bg-accent text-[13.5px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600 text-[13px]">{error}</p>}

      <button
        type="button"
        onClick={onSwitchToSignIn}
        className="mt-6 text-[13px] text-ink-soft text-center underline"
      >
        Back to sign in
      </button>
    </main>
  )
}
