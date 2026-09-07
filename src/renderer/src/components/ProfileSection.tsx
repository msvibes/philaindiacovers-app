import { useEffect, useState } from 'react'
import { fetchDisplayName, updateDisplayName } from '../lib/profile'

interface ProfileSectionProps {
  userId: string
  email: string | undefined
}

// KAN-41 (US-30/FR-33) -- closes the story for real. The earlier PR
// shipped view-only (email only, since no name field existed anywhere in
// this app at the time); this adds the actual name field, view and edit,
// now that the Admin-repo migration granting self-service access to
// profiles.display_name is live in both projects.
export default function ProfileSection({ userId, email }: ProfileSectionProps): React.JSX.Element {
  const [displayName, setDisplayName] = useState<string | null | 'loading'>('loading')
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchDisplayName(userId)
      .then((name) => {
        if (!cancelled) setDisplayName(name)
      })
      .catch(() => {
        // A failed read shouldn't block the rest of Settings from
        // rendering -- same "not available" fallback shape as the email
        // field's own defensive path.
        if (!cancelled) setDisplayName(null)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  function startEditing(): void {
    setDraftName(displayName === 'loading' || displayName === null ? '' : displayName)
    setError(null)
    setIsEditing(true)
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true)
    setError(null)
    const trimmed = draftName.trim()
    try {
      await updateDisplayName(userId, trimmed)
      // Empty string and null both mean "no name set" everywhere this is
      // displayed (Settings itself, Home's greeting) -- store null for an
      // intentionally-cleared name rather than an empty string that reads
      // as "the value" one place and "unset" another.
      setDisplayName(trimmed === '' ? null : trimmed)
      setIsEditing(false)
    } catch {
      setError("That didn't work — give it another try.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft mb-3">
        Profile
      </h2>
      <dl className="space-y-2 text-sm text-ink mb-3">
        <div className="flex gap-2">
          <dt className="text-ink-soft w-28 shrink-0">Email</dt>
          <dd>{email ?? 'Not available'}</dd>
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            <dt className="text-ink-soft w-28 shrink-0">Name</dt>
            <dd>{displayName === 'loading' ? 'Loading…' : (displayName ?? 'Not set yet')}</dd>
          </div>
        )}
      </dl>

      {!isEditing ? (
        <button
          type="button"
          onClick={startEditing}
          disabled={displayName === 'loading'}
          className="text-[13px] text-stamp underline disabled:opacity-50"
        >
          Edit name
        </button>
      ) : (
        <div className="max-w-xs">
          <label className="block text-[12.5px] text-ink-soft mb-1.5" htmlFor="display-name">
            Name
          </label>
          <input
            id="display-name"
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="w-full h-10 rounded-lg border border-line-strong bg-card px-3 text-[13.5px] text-ink focus:outline-none focus:border-stamp focus:ring-[3px] focus:ring-stamp-ring"
          />
          {error && <p className="text-red-600 text-[13px] mt-2">{error}</p>}
          <div className="flex gap-2 mt-2.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 rounded-lg bg-accent px-4 text-[13px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="h-9 rounded-lg border border-line-strong bg-card px-4 text-[13px] text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
