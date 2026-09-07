import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { countCatalogueMatches, fetchCoversByIds, type VerifiedCover } from '../lib/covers'
import { fetchDisplayName, resolveGreetingName } from '../lib/profile'
import { useRecentlyViewed } from '../lib/useRecentlyViewed'
import CatalogueCard from '../components/CatalogueCard'
import Eyebrow from '../components/Eyebrow'

interface HomeProps {
  session: Session
  // Computed once, at sign-in, by App.tsx's SignedIn -- see
  // lib/dailyPrompt.ts for why this lives there rather than being
  // recomputed here (the write that marks today as seen has to happen
  // exactly once per sign-in, not once per Home mount/remount).
  showDailyPrompt: boolean
  onEnterCatalogue: () => void
  onSelectCover: (id: string) => void
}

// FR-01: a distinct landing screen, separate from the catalogue grid. The
// count line is real, live data (countCatalogueMatches({}) — no filters,
// full verified count), not copy that could silently drift from what the
// grid actually shows.
//
// Recently viewed finally gets the rendering surface FR-28/T-25 always
// intended for it — T-25 built the tracking/persistence with nowhere to
// show it since this screen didn't exist yet.
//
// displayName is fetched independently here, the same way
// ProfileSection.tsx fetches it for Settings, rather than lifted into
// App.tsx and passed down -- this screen fully unmounts on navigation
// away (App.tsx's renderScreen is a plain switch, not a router keeping
// screens alive), so remounting here already picks up any edit made in
// Settings for free, with no extra plumbing needed to keep two copies in
// sync.
export default function Home({
  session,
  showDailyPrompt,
  onEnterCatalogue,
  onSelectCover
}: HomeProps): React.JSX.Element {
  const { recentIds } = useRecentlyViewed()
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [recentCovers, setRecentCovers] = useState<VerifiedCover[]>([])
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchDisplayName(session.user.id)
      .then((name) => {
        if (!cancelled) setDisplayName(name)
      })
      .catch(() => {
        // The greeting still has a real fallback (email local-part) --
        // a failed read just means that fallback is used instead of the
        // real name, not a broken screen.
      })
    return () => {
      cancelled = true
    }
  }, [session.user.id])

  useEffect(() => {
    let cancelled = false
    countCatalogueMatches({})
      .then((count) => {
        if (!cancelled) setTotalCount(count)
      })
      .catch(() => {
        // The count line is a nice-to-have — a failure here shouldn't
        // block the rest of Home from rendering.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // No sync setState when recentIds is empty (the same anti-pattern
  // already fixed twice elsewhere in this file's siblings, T-13+T-18) —
  // recentCovers only ever transitions via .then()/.catch(). The empty
  // state below is driven directly by recentIds.length, not recentCovers,
  // so there's nothing to reset here in the first place.
  useEffect(() => {
    if (recentIds.length === 0) return
    let cancelled = false
    fetchCoversByIds(recentIds)
      .then((covers) => {
        if (!cancelled) setRecentCovers(covers)
      })
      .catch(() => {
        if (!cancelled) setRecentCovers([])
      })
    return () => {
      cancelled = true
    }
  }, [recentIds])

  return (
    <main className="p-8 space-y-8">
      {/* T-33 consistency audit: left-alignment is the default everywhere
          else in the app — this hero is one of the two named, deliberate
          exceptions (the other is CatalogueEmptyState), not an
          inconsistency. */}
      <div className="space-y-3 text-center">
        <Eyebrow>Collector&apos;s Desk</Eyebrow>
        {/* One sign-in per day sees this instead of the normal greeting --
            computed once by App.tsx's SignedIn (see lib/dailyPrompt.ts),
            not recomputed on every Home mount. The second shortcut
            deliberately doesn't render with no recently-viewed history —
            "continue where you left off" has nothing real to continue
            with on a genuinely first-ever session. */}
        {showDailyPrompt ? (
          <h1 className="text-2xl font-semibold font-display text-ink">
            What would you like to do today?
          </h1>
        ) : (
          <h1 className="text-2xl font-semibold font-display text-ink">
            Hi, {resolveGreetingName(displayName, session.user.email)}!
          </h1>
        )}
        <p className="text-ink-soft">
          {totalCount === null
            ? 'Loading the catalogue…'
            : `${totalCount} verified cover${totalCount === 1 ? '' : 's'} ready to browse.`}
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onEnterCatalogue}
            data-tour="home-cta"
            className="rounded bg-accent px-6 py-2 text-white hover:bg-accent-hover"
          >
            Enter the catalogue
          </button>
          {showDailyPrompt && recentIds.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectCover(recentIds[0])}
              className="rounded border border-line-strong bg-card px-6 py-2 text-ink hover:bg-paper"
            >
              Continue where you left off
            </button>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft mb-3">
          Recently viewed
        </h2>
        {recentIds.length === 0 ? (
          <p className="text-sm text-ink-soft">Covers you view will show up here.</p>
        ) : (
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {recentCovers.map((cover) => (
              <CatalogueCard
                key={cover.id}
                cover={cover}
                onSelect={() => onSelectCover(cover.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
