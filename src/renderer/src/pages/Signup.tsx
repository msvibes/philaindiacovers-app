import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import DisclaimerContent from '../components/DisclaimerContent'

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

  if (awaitingVerification) {
    return (
      <main className="mx-auto max-w-sm w-full p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-gray-500">
          If that address doesn&apos;t already have an account, we&apos;ve sent a link to verify it
          — click it, then come back here and sign in. (The page it opens may not look like much —
          that&apos;s expected, just return to the app afterward.)
        </p>
        <button type="button" onClick={onSwitchToSignIn} className="text-sm underline">
          Back to sign in
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-sm w-full p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Join the catalogue</h1>
        <p className="text-sm text-gray-500">
          Create an account to start browsing India&apos;s GI Tag Special Covers.
        </p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="signup-password">
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
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="signup-confirm-password">
            Confirm password
          </label>
          <input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
          {passwordsMismatch && (
            <p className="text-red-600 text-xs mt-1">Passwords don&apos;t match yet.</p>
          )}
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I have read and understand the{' '}
              <button type="button" onClick={() => setShowDisclaimer(true)} className="underline">
                Disclaimer
              </button>{' '}
              — including that this catalogue is independently maintained and not an official
              government source.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Creating your account…' : 'Create account'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button type="button" onClick={onSwitchToSignIn} className="text-sm underline">
        Already have an account? Sign in
      </button>

      {showDisclaimer && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50"
          onClick={() => setShowDisclaimer(false)}
        >
          <div
            className="bg-card max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <DisclaimerContent />
            <button
              type="button"
              onClick={() => setShowDisclaimer(false)}
              className="mt-4 rounded bg-black px-4 py-2 text-white text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
