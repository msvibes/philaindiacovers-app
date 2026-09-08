import { describe, expect, it } from 'vitest'
import type { CatalogueFacets } from './covers'
import { getRegionCoverStats, getShadingLevel } from './regionCoverStats'

const facets: CatalogueFacets = {
  productCategories: [],
  years: [],
  postalCircles: [
    { value: { id: 'circle-ap', name: 'Andhra Pradesh' }, count: 12 },
    { value: { id: 'circle-ne', name: 'North Eastern' }, count: 8 },
    { value: { id: 'circle-mh', name: 'Maharashtra' }, count: 40 }
    // Deliberately no entry for e.g. "Punjab" -- a circle with zero
    // verified covers simply never appears in a real facets result
    // (fetchCatalogueFacets only returns circles that have at least one
    // matching row), exercising the "circle exists, no facet entry" path.
  ]
}

describe('getRegionCoverStats', () => {
  it('resolves a direct-match region to its own circle and count', () => {
    expect(getRegionCoverStats('Andhra Pradesh', facets)).toEqual({
      region: 'Andhra Pradesh',
      circleName: 'Andhra Pradesh',
      circleId: 'circle-ap',
      count: 12,
      siblingRegions: []
    })
  })

  it('gives every region in a shared circle the same honest full count, not a split', () => {
    const arunachal = getRegionCoverStats('Arunāchal Pradesh', facets)
    const manipur = getRegionCoverStats('Manipur', facets)
    expect(arunachal.count).toBe(8)
    expect(manipur.count).toBe(8)
    expect(arunachal.circleName).toBe('North Eastern')
    expect(arunachal.siblingRegions).toContain('Manipur')
  })

  it('reflects the real circle-facet id for Goa via its Maharashtra circle', () => {
    expect(getRegionCoverStats('Goa', facets)).toEqual({
      region: 'Goa',
      circleName: 'Maharashtra',
      circleId: 'circle-mh',
      count: 40,
      siblingRegions: ['Maharashtra']
    })
  })

  it('returns a real zero -- not undefined -- for a circle with no matching facet entry', () => {
    expect(getRegionCoverStats('Punjab', facets)).toEqual({
      region: 'Punjab',
      circleName: 'Punjab',
      circleId: null,
      count: 0,
      siblingRegions: ['Chandigarh']
    })
  })

  it('fails safe (zero, no circle) for a genuinely unresolvable region rather than throwing', () => {
    expect(getRegionCoverStats('Atlantis', facets)).toEqual({
      region: 'Atlantis',
      circleName: null,
      circleId: null,
      count: 0,
      siblingRegions: []
    })
  })
})

describe('getShadingLevel', () => {
  it('is always 0 for zero or negative counts, regardless of max', () => {
    expect(getShadingLevel(0, 40)).toBe(0)
    expect(getShadingLevel(-1, 40)).toBe(0)
  })

  it('is the max level (4) for the single most-covered region', () => {
    expect(getShadingLevel(40, 40)).toBe(4)
  })

  it('scales proportionally to the max, not an absolute threshold', () => {
    expect(getShadingLevel(10, 40)).toBe(1) // 25% -> ceil(1) = 1
    expect(getShadingLevel(20, 40)).toBe(2) // 50% -> ceil(2) = 2
    expect(getShadingLevel(30, 40)).toBe(3) // 75% -> ceil(3) = 3
  })

  it('never returns 0 for a genuinely positive count, even a very small one', () => {
    expect(getShadingLevel(1, 1000)).toBe(1)
  })

  it('is clamped to level 1 when maxCount is non-positive but count is positive (defensive)', () => {
    expect(getShadingLevel(5, 0)).toBe(1)
  })
})
