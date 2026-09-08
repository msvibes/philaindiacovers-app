import type { CatalogueFacets } from './covers'
import { getSiblingRegionsInCircle, resolveCircleForRegion } from './postalCircleStates'

// T-21 (KAN-61) PR 2. Builds on fetchCatalogueFacets()'s already-computed
// per-circle counts (facets.postalCircles) rather than a new query --
// same reuse principle T-26's YearTimeline already established for the
// years facet. A region's count is always its circle's count in full,
// deliberately -- covers are only ever tagged by circle, never by state,
// so there is no finer-grained number to show. Confirmed with the user
// before building: showing the same honest circle-level count on every
// region a shared circle spans (rather than a false per-region split) is
// the right call, matching PRD-v1.0 FR-15/KAN-37's "accurate over falsely
// blended" principle.
export interface RegionCoverStats {
  region: string
  circleName: string | null
  circleId: string | null
  count: number
  // Other region display names sharing this region's circle, excluding
  // itself -- empty for a region whose circle covers only itself. Used
  // for the hover tooltip's "also covers: ..." copy.
  siblingRegions: string[]
}

export function getRegionCoverStats(regionName: string, facets: CatalogueFacets): RegionCoverStats {
  const circleName = resolveCircleForRegion(regionName)
  if (!circleName) {
    // A region geoBoundaries has that isn't resolvable to any of the 23
    // circles would be a real data problem, not expected given
    // postalCircleStates.ts's own test coverage of all 36 real regions --
    // but this function still fails safe (zero count, no circle) rather
    // than throwing, since a rendering component is not the right place
    // to surface that kind of error.
    return { region: regionName, circleName: null, circleId: null, count: 0, siblingRegions: [] }
  }
  const facetEntry = facets.postalCircles.find((f) => f.value.name === circleName)
  return {
    region: regionName,
    circleName,
    circleId: facetEntry?.value.id ?? null,
    count: facetEntry?.count ?? 0,
    siblingRegions: getSiblingRegionsInCircle(regionName)
  }
}

// 0 is reserved for "no covers yet" (renders as --color-line, a
// deliberately neutral fill distinct from the shading ramp -- see
// base.css's own comment). 1-4 are relative to the single most-covered
// region on the map, same "proportional to the max, not an absolute
// threshold" logic YearTimeline's bar-width already uses -- so the ramp
// stays meaningful whether the catalogue has 30 covers or 3,000.
export function getShadingLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (maxCount <= 0) return 1
  const level = Math.ceil((count / maxCount) * 4)
  return Math.min(4, Math.max(1, level)) as 1 | 2 | 3 | 4
}

// Moved here from IndiaMap.tsx (KAN-85) so IndiaMapLegend.tsx draws from
// the exact same source of truth as the map itself -- the two must never
// silently drift apart if the ramp's colors ever change. See base.css's
// own comment on --color-choropleth-1..4 for why level 0 reuses
// --color-line rather than getting a dedicated token.
export const SHADING_FILLS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'var(--color-line)',
  1: 'var(--color-choropleth-1)',
  2: 'var(--color-choropleth-2)',
  3: 'var(--color-choropleth-3)',
  4: 'var(--color-choropleth-4)'
}
