import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { countCatalogueMatches, fetchCoversByIds, type VerifiedCover } from '../lib/covers'
import { fetchDisplayName, resolveGreetingName } from '../lib/profile'
import { useRecentlyViewed } from '../lib/useRecentlyViewed'
import CatalogueCard from '../components/CatalogueCard'
import Eyebrow from '../components/Eyebrow'
import HomeTile from '../components/HomeTile'

interface HomeProps {
  session: Session
  // Computed once, at sign-in, by App.tsx's SignedIn -- see
  // lib/dailyPrompt.ts for why this lives there rather than being
  // recomputed here (the write that marks today as seen has to happen
  // exactly once per sign-in, not once per Home mount/remount).
  showDailyPrompt: boolean
  // Same "captured once at sign-in" constraint as showDailyPrompt, same
  // reason -- see lib/dailyPrompt.ts's daysSinceLastVisit. null means no
  // prior visit is on record (a genuinely new account), not "0 days ago".
  daysSinceLastVisit: number | null
  // Distinct covers opened so far today -- lib/useViewedToday.ts, owned
  // by App.tsx since the underlying record needs to survive Home
  // unmounting/remounting as the user navigates away and back.
  viewedTodayCount: number
  onEnterCatalogue: () => void
  // Home redesign PR 3/3 (2026-09-15): land directly on Catalogue's
  // region/year view, not the default grid -- see App.tsx's navigateTo
  // and Catalogue.tsx's initialViewMode for how that's actually wired.
  onBrowseByRegion: () => void
  onBrowseByYear: () => void
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
  daysSinceLastVisit,
  viewedTodayCount,
  onEnterCatalogue,
  onBrowseByRegion,
  onBrowseByYear,
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

  // Stat strip (2026-09-15): distinct circles/years, derived client-side
  // from recentCovers -- the exact same data already fetched above for
  // the Recently Viewed grid, zero new queries. Deliberately scoped to
  // the last-8-viewed cap (useRecentlyViewed's own MAX_RECENT), not full
  // collection history -- no such history exists anywhere in this app
  // (confirmed directly before proposing this), and the "recently"
  // wording below is chosen specifically to not overclaim what this
  // number actually covers, same "accurate over falsely blended"
  // principle as FR-15/KAN-37 and KAN-61's honest shared-circle counts.
  const circlesExplored = new Set(
    recentCovers.map((cover) => cover.postalCircleId).filter((id): id is string => id !== null)
  ).size
  const yearsExplored = new Set(
    recentCovers
      .map((cover) => (cover.dateOfIssue ? new Date(cover.dateOfIssue).getFullYear() : null))
      .filter((year): year is number => year !== null && !Number.isNaN(year))
  ).size

  const lastVisitText =
    daysSinceLastVisit === null || daysSinceLastVisit <= 0
      ? null
      : daysSinceLastVisit === 1
        ? 'Last visit: yesterday'
        : `Last visit: ${daysSinceLastVisit} days ago`

  const statItems = [
    lastVisitText,
    viewedTodayCount > 0
      ? `${viewedTodayCount} cover${viewedTodayCount === 1 ? '' : 's'} viewed today`
      : null,
    circlesExplored > 0 ? `${circlesExplored} circle${circlesExplored === 1 ? '' : 's'} explored recently` : null,
    yearsExplored > 0 ? `${yearsExplored} year${yearsExplored === 1 ? '' : 's'} explored recently` : null
  ].filter((item): item is string => item !== null)

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
            not recomputed on every Home mount. */}
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
        {/* Stat strip (2026-09-15): quiet, understated -- Open's stat-row
            reference, not a gamified streak/points display, which
            wouldn't fit a serious philately audience. Plain text items,
            no badges/boxes; renders nothing at all (not an empty row)
            when every stat is genuinely empty, e.g. a brand-new account
            with no prior visit and nothing viewed yet. */}
        {statItems.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11.5px] text-ink-soft">
            {statItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        )}
        {/* Home redesign (2026-09-15): entry-point tiles, Duolingo's
            "Your collections" layout pattern -- a small set of distinct
            tiles rather than one plain CTA. "Enter the catalogue" keeps
            its exact original text (the guided tour's data-tour="home-cta"
            target, and Home.test.tsx's own assertion, both depend on it)
            -- only its visual treatment changed, from a pill button to a
            tile. The Jump back in tile replaces the old "Continue where
            you left off" button: same destination (recentIds[0]), but now
            always visible whenever real history exists, not gated to
            first-login-of-day -- the daily prompt and "is there anything
            to jump back into" are genuinely independent questions, and
            gating the shortcut to one login a day undersold it. By
            region/By year (PR 3/3) land directly on Catalogue's
            corresponding view via onBrowseByRegion/onBrowseByYear --
            held back from PR 1/3 until Catalogue.tsx's initialViewMode
            plumbing existed, so neither tile ever shipped pointing at
            the wrong view. */}
        <div className="flex flex-wrap justify-center gap-3">
          <HomeTile
            label="Enter the catalogue"
            accent="accent"
            onClick={onEnterCatalogue}
            dataTour="home-cta"
          />
          {recentIds.length > 0 && (
            <HomeTile label="Jump back in" accent="stamp" onClick={() => onSelectCover(recentIds[0])} />
          )}
          <HomeTile label="By region" accent="success" onClick={onBrowseByRegion} />
          <HomeTile label="By year" accent="choropleth-3" onClick={onBrowseByYear} />
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
