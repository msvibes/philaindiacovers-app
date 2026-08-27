import { useEffect, useState } from 'react'
import { countCatalogueMatches, fetchCoversByIds, type VerifiedCover } from '../lib/covers'
import { useRecentlyViewed } from '../lib/useRecentlyViewed'
import CatalogueCard from '../components/CatalogueCard'
import Eyebrow from '../components/Eyebrow'

interface HomeProps {
  onEnterCatalogue: () => void
  onSelectCover: (id: string) => void
}

// FR-01: a distinct landing screen, separate from the catalogue grid. No
// name field exists anywhere in this app (confirmed during US-01
// planning), so the hero stays generic rather than inventing a
// personalization the schema has nowhere to back. The count line is real,
// live data (countCatalogueMatches({}) — no filters, full verified count),
// not copy that could silently drift from what the grid actually shows.
//
// Recently viewed finally gets the rendering surface FR-28/T-25 always
// intended for it — T-25 built the tracking/persistence with nowhere to
// show it since this screen didn't exist yet.
export default function Home({ onEnterCatalogue, onSelectCover }: HomeProps): React.JSX.Element {
  const { recentIds } = useRecentlyViewed()
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [recentCovers, setRecentCovers] = useState<VerifiedCover[]>([])

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
        <h1 className="text-2xl font-semibold font-display text-ink">Welcome back!</h1>
        <p className="text-ink-soft">
          {totalCount === null
            ? 'Loading the catalogue…'
            : `${totalCount} verified cover${totalCount === 1 ? '' : 's'} ready to browse.`}
        </p>
        <button
          type="button"
          onClick={onEnterCatalogue}
          className="rounded bg-ink px-6 py-2 text-white hover:bg-[#132038]"
        >
          Enter the catalogue
        </button>
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
