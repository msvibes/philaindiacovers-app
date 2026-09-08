import { useState } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import indiaTopoJson from '../assets/data/india-states.json'
import type { CatalogueFacets } from '../lib/covers'
import { getRegionCoverStats, getShadingLevel, SHADING_FILLS } from '../lib/regionCoverStats'
import IndiaMapLegend from './IndiaMapLegend'
import IndiaMapSearch from './IndiaMapSearch'

interface IndiaMapProps {
  facets: CatalogueFacets
  onSelectRegion: (circleId: string) => void
}

const DEFAULT_CENTER: [number, number] = [83, 23]
const MIN_ZOOM = 1
const MAX_ZOOM = 8
const ZOOM_STEP = 1.5

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

  // KAN-85: the real problem this solves -- several regions (the North
  // Eastern cluster, small standalone UTs like Lakshadweep/Andaman &
  // Nicobar/Chandigarh) are genuinely hard to click precisely at
  // full-India zoom. ZoomableGroup's native scroll-to-zoom (toward the
  // cursor) and drag-to-pan are the actual load-bearing mechanism here --
  // the buttons below are a discoverability layer on top for anyone who
  // doesn't know about scroll-zoom or is on a device without a wheel,
  // not the primary way this gets solved.
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const isDefaultView = zoom === MIN_ZOOM && center[0] === DEFAULT_CENTER[0] && center[1] === DEFAULT_CENTER[1]

  function zoomIn(): void {
    setZoom((current) => Math.min(MAX_ZOOM, current * ZOOM_STEP))
  }
  function zoomOut(): void {
    setZoom((current) => Math.max(MIN_ZOOM, current / ZOOM_STEP))
  }
  function resetView(): void {
    setZoom(MIN_ZOOM)
    setCenter(DEFAULT_CENTER)
  }

  // Relative to the single most-covered circle currently on the map, not
  // an absolute threshold -- same "scale to the max" logic YearTimeline's
  // bar widths already use, so the ramp stays meaningful regardless of
  // how large the catalogue grows.
  const maxCount = Math.max(...facets.postalCircles.map((f) => f.count), 1)

  return (
    <div className="relative">
      {/* KAN-85: top-left, over blank space above the landmass at this
          projection/scale -- confirmed visually, doesn't obscure any
          region. Complementary to clicking the map directly, not a
          replacement for it -- selecting a suggestion calls the exact
          same onSelectRegion callback a click would. */}
      <IndiaMapSearch facets={facets} onSelectRegion={onSelectRegion} />

      {/* KAN-85: top-right, mirroring the search box's top-left placement
          -- both sit over the same blank space above the landmass.
          Reset always renders (not conditionally) to avoid layout shift;
          disabled/dimmed when already at the default view. */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={resetView}
          disabled={isDefaultView}
          data-testid="india-map-reset-view"
          className="rounded-lg border border-line bg-card px-2 py-1 text-xs text-ink-soft shadow-sm hover:bg-paper disabled:opacity-40 disabled:hover:bg-card"
        >
          Reset view
        </button>
        <div className="flex flex-col rounded-lg border border-line bg-card overflow-hidden shadow-sm">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="w-7 h-7 flex items-center justify-center text-ink border-b border-line hover:bg-paper disabled:opacity-40 disabled:hover:bg-card"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="w-7 h-7 flex items-center justify-center text-ink hover:bg-paper disabled:opacity-40 disabled:hover:bg-card"
          >
            −
          </button>
        </div>
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: DEFAULT_CENTER, scale: 1000 }}
        role="img"
        aria-label="Map of India by state, for browsing the catalogue by region"
        className="w-full h-auto"
      >
        <ZoomableGroup
          center={center}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={(position) => {
            setCenter(position.coordinates)
            setZoom(position.zoom)
          }}
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
        </ZoomableGroup>
      </ComposableMap>

      {/* KAN-85: bottom-left corner, deliberately -- leaves top-right free
          for the future zoom control buttons and stays clear of the
          cursor-anchored tooltip. */}
      <IndiaMapLegend />

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
