import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import DisclaimerModal from '../components/DisclaimerModal'

interface SignupProps {
  onSwitchToSignIn: () => void
}

// FR-26/US-01 (email/password only — Google SSO is a separate follow-up,
// see T-11a) + FR-27/US-02 (email verification). No name field — nothing
// in PRD-v1.0/the addendum requires one, and the schema has nowhere to put
// it. Minimum password length (6) confirmed live against the real hosted
// project (Step 0's own follow-up check), not guessed — Supabase's own
// "Password should be at least 6 characters." error message covers
// anything this client-side check doesn't.
export default function Signup({ onSwitchToSignIn }: SignupProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [awaitingVerification, setAwaitingVerification] = useState(false)

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit = email.length > 0 && password.length > 0 && !passwordsMismatch && acknowledged

  const handleSignUp = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setIsSubmitting(true)

    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    setIsSubmitting(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // Deliberately the same message whether this email is genuinely new or
    // already has an account — Supabase's signUp() itself returns the same
    // "success" shape either way (no session, empty identities on a
    // repeat), specifically to avoid letting the client leak which case it
    // is. Branching the copy on that would defeat the point.
    setAwaitingVerification(true)
  }

  // Styling below matches docs/design/app-prototype-v3-full.html's
  // .auth-card/.field/.btn-cta exactly (font-display headings, ink-soft
  // labels/subtitles, border-line-strong + bg-card inputs with a stamp
  // focus ring, bg-accent buttons — not pure black) rather than generic
  // Tailwind defaults, same fix applied to Login.tsx. (bg-accent, not
  // bg-ink, since T-30: ink now means text color only, split out once
  // dark mode required ink to invert while buttons needed to stay put.)
  if (awaitingVerification) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[380px] w-full flex-col justify-center p-8">
        <h1 className="font-display text-[20px] font-semibold text-center text-ink mb-1">
          Check your email
        </h1>
        <p className="text-[13px] text-ink-soft text-center mb-6">
          If that address doesn&apos;t already have an account, we&apos;ve sent a link to verify it
          — click it, then come back here and sign in. (The page it opens may not look like much —
          that&apos;s expected, just return to the app afterward.)
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
          Join the catalogue
        </h1>
        <p className="text-[13px] text-ink-soft text-center mb-6">
          Create an account to start browsing India&apos;s GI Tag Special Covers.
        </p>
      </div>

      <form onSubmit={handleSignUp}>
        <div className="mb-3.5">
          <label className="block text-[12.5px] text-ink-soft mb-1.5" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 rounded-lg border border-line-strong bg-card px-3 text-[13.5px] text-ink focus:outline-none focus:border-stamp focus:ring-[3px] focus:ring-stamp-ring"
          />
        </div>
        <div className="mb-3.5">
          <label className="block text-[12.5px] text-ink-soft mb-1.5" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-10 rounded-lg border border-line-strong bg-card px-3 text-[13.5px] text-ink focus:outline-none focus:border-stamp focus:ring-[3px] focus:ring-stamp-ring"
          />
        </div>
        <div className="mb-3.5">
          <label
            className="block text-[12.5px] text-ink-soft mb-1.5"
            htmlFor="signup-confirm-password"
          >
            Confirm password
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-10 rounded-lg border border-line-strong bg-card px-3 text-[13.5px] text-ink focus:outline-none focus:border-stamp focus:ring-[3px] focus:ring-stamp-ring"
          />
          {passwordsMismatch && (
            <p className="text-red-600 text-xs mt-1">Passwords don&apos;t match yet.</p>
          )}
        </div>

        <div className="mb-3.5">
          <label className="flex items-start gap-2 text-[12.5px] text-ink-soft">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I agree to the terms and acknowledge the catalogue{' '}
              <button
                type="button"
                onClick={() => setShowDisclaimer(true)}
                className="text-stamp underline"
              >
                disclaimer
              </button>
              .
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="mt-1 w-full h-[42px] rounded-[9px] bg-accent text-[13.5px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {isSubmitting ? 'Creating your account…' : 'Create account'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600 text-[13px]">{error}</p>}

      <button
        type="button"
        onClick={onSwitchToSignIn}
        className="mt-6 text-[13px] text-ink-soft text-center underline"
      >
        Already have an account? Sign in
      </button>

      <DisclaimerModal isOpen={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
    </main>
  )
}
