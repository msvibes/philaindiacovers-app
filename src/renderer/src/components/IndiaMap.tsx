import { useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import indiaTopoJson from '../assets/data/india-states.json'
import type { CatalogueFacets } from '../lib/covers'
import { getRegionCoverStats, getShadingLevel } from '../lib/regionCoverStats'

interface IndiaMapProps {
  facets: CatalogueFacets
  onSelectRegion: (circleId: string) => void
}

interface HoveredRegion {
  region: string
  count: number
  circleName: string | null
  siblingRegions: string[]
  // Fixed-position coordinates, captured off the hovered path's own
  // getBoundingClientRect() -- same technique GuidedTour.tsx already
  // uses for its own JS-computed tooltip positioning, not a new pattern.
  top: number
  left: number
}

const SHADING_FILLS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'var(--color-line)',
  1: 'var(--color-choropleth-1)',
  2: 'var(--color-choropleth-2)',
  3: 'var(--color-choropleth-3)',
  4: 'var(--color-choropleth-4)'
}

// T-21 (US-50/KAN-61), PR 2 of 3: choropleth shading + hover tooltips on
// top of PR 1's static render. No click-to-filter yet (PR 3).
//
// facets is the SAME CatalogueFacets object Catalogue.tsx already fetches
// for FilterPanel/YearTimeline -- no new query, matching this feature's
// own fit criterion and T-26's established reuse precedent. Region-level
// stats are computed per-render via regionCoverStats.ts (a cheap
// client-side lookup over facets.postalCircles, not a network call), so
// this component stays a plain function of its props, no internal
// fetching.
//
// PR 3: a region only becomes clickable once its circle has a real,
// known id -- which only exists in facets.postalCircles for a circle
// with at least one verified cover (same reason FilterPanel's own
// checkboxes only ever show circles with coverage). A genuinely
// zero-cover region deliberately stays non-interactive rather than
// firing a live fallback query just to filter into a guaranteed-empty
// grid -- its neutral (unshaded) fill and "0 covers" tooltip already
// tell the user there's nothing to click into, and this keeps the whole
// component a pure, offline-friendly function of its props rather than
// introducing a second, inconsistent async data path alongside the
// offline-cache-aware facets it already receives.
export default function IndiaMap({ facets, onSelectRegion }: IndiaMapProps): React.JSX.Element {
  const [hovered, setHovered] = useState<HoveredRegion | null>(null)

  // Relative to the single most-covered circle currently on the map, not
  // an absolute threshold -- same "scale to the max" logic YearTimeline's
  // bar widths already use, so the ramp stays meaningful regardless of
  // how large the catalogue grows.
  const maxCount = Math.max(...facets.postalCircles.map((f) => f.count), 1)

  return (
    <div className="relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [83, 23], scale: 1000 }}
        role="img"
        aria-label="Map of India by state, for browsing the catalogue by region"
        className="w-full h-auto"
      >
        <Geographies geography={indiaTopoJson}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stats = getRegionCoverStats(geo.properties.shapeName, facets)
              const level = getShadingLevel(stats.count, maxCount)
              const fill = SHADING_FILLS[level]
              const isClickable = stats.circleId !== null
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  data-testid={`india-map-region-${geo.properties.shapeName}`}
                  onMouseEnter={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect()
                    setHovered({
                      region: stats.region,
                      count: stats.count,
                      circleName: stats.circleName,
                      siblingRegions: stats.siblingRegions,
                      top: rect.top,
                      left: rect.left + rect.width / 2
                    })
                  }}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    if (stats.circleId) onSelectRegion(stats.circleId)
                  }}
                  style={{
                    default: {
                      fill,
                      stroke: 'var(--color-line-strong)',
                      strokeWidth: 0.5,
                      outline: 'none',
                      cursor: isClickable ? 'pointer' : 'default'
                    },
                    hover: {
                      fill,
                      stroke: 'var(--color-ink)',
                      strokeWidth: 1,
                      outline: 'none',
                      cursor: isClickable ? 'pointer' : 'default'
                    },
                    pressed: {
                      fill,
                      stroke: 'var(--color-ink)',
                      strokeWidth: 1,
                      outline: 'none',
                      cursor: isClickable ? 'pointer' : 'default'
                    }
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Fixed-position tooltip, positioned via the hovered path's own
          bounding rect rather than raw mouse coordinates -- matches
          GuidedTour.tsx's existing JS-computed-position pattern, not a
          new one. pointer-events-none so it never itself becomes the
          thing a mouseleave fires on. */}
      {hovered && (
        <div
          role="tooltip"
          className="fixed z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg bg-accent px-3 py-2 text-xs text-white pointer-events-none max-w-[220px]"
          style={{ top: hovered.top, left: hovered.left }}
        >
          <p className="font-semibold">{hovered.region}</p>
          <p>
            {hovered.count} cover{hovered.count === 1 ? '' : 's'}
          </p>
          {/* Honest circle-level framing for the 9 regions that share a
              circle with others -- confirmed with the user before
              building: the count shown is the whole circle's, not a
              false per-region split, so the tooltip says so explicitly
              rather than implying more precision than the data has. */}
          {hovered.siblingRegions.length > 0 && (
            <p className="text-white/80 mt-1">
              {hovered.circleName} circle — also covers: {hovered.siblingRegions.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
