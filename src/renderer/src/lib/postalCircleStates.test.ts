import { describe, expect, it } from 'vitest'
import {
  getSiblingRegionsInCircle,
  normalizeRegionName,
  resolveCircleForRegion
} from './postalCircleStates'

// The real diacritic-marked shapeName strings from the actual downloaded
// geoBoundaries file (src/renderer/src/assets/data/india-states.topojson)
// -- copied directly from that file's own properties, not typed from
// memory, so this test genuinely exercises the diacritic-stripping this
// module exists for against real-world input, not a hypothetical.
const REAL_SHAPE_NAME_PAIRS: [shapeName: string, expectedCircle: string][] = [
  ['Andaman and Nicobar Islands', 'West Bengal'],
  ['Andhra Pradesh', 'Andhra Pradesh'],
  ['Arunāchal Pradesh', 'North Eastern'],
  ['Assam', 'Assam'],
  ['Bihār', 'Bihar'],
  ['Chandīgarh', 'Punjab'],
  ['Chhattīsgarh', 'Chhattisgarh'],
  ['Delhi', 'Delhi'],
  ['Dādra and Nagar Haveli and Damān and Diu', 'Gujarat'],
  ['Goa', 'Maharashtra'],
  ['Gujarāt', 'Gujarat'],
  ['Haryāna', 'Haryana'],
  ['Himāchal Pradesh', 'Himachal Pradesh'],
  ['Jammu and Kashmīr', 'Jammu and Kashmir'],
  ['Jhārkhand', 'Jharkhand'],
  ['Karnātaka', 'Karnataka'],
  ['Kerala', 'Kerala'],
  ['Ladākh', 'Jammu and Kashmir'],
  ['Lakshadweep', 'Kerala'],
  ['Madhya Pradesh', 'Madhya Pradesh'],
  ['Mahārāshtra', 'Maharashtra'],
  ['Manipur', 'North Eastern'],
  ['Meghālaya', 'North Eastern'],
  ['Mizoram', 'North Eastern'],
  ['Nāgāland', 'North Eastern'],
  ['Odisha', 'Orissa'],
  ['Puducherry', 'Tamil Nadu'],
  ['Punjab', 'Punjab'],
  ['Rājasthān', 'Rajasthan'],
  ['Sikkim', 'West Bengal'],
  ['Tamil Nādu', 'Tamil Nadu'],
  ['Telangāna', 'Telangana'],
  ['Tripura', 'North Eastern'],
  ['Uttar Pradesh', 'Uttar Pradesh'],
  ['Uttarākhand', 'Uttarakhand'],
  ['West Bengal', 'West Bengal']
]

describe('postalCircleStates', () => {
  it('has exactly 36 entries -- every geoBoundaries ADM1 region, no more, no fewer', () => {
    expect(REAL_SHAPE_NAME_PAIRS).toHaveLength(36)
  })

  it.each(REAL_SHAPE_NAME_PAIRS)(
    'resolves the real geoBoundaries shapeName %s to circle %s',
    (shapeName, expectedCircle) => {
      expect(resolveCircleForRegion(shapeName)).toBe(expectedCircle)
    }
  )

  it('confirms North Eastern circle covers exactly six states, not Sikkim', () => {
    const northEasternStates = REAL_SHAPE_NAME_PAIRS.filter(([, circle]) => circle === 'North Eastern').map(
      ([region]) => region
    )
    expect(northEasternStates).toHaveLength(6)
    expect(northEasternStates.map(normalizeRegionName)).not.toContain('sikkim')
  })

  it('confirms Sikkim resolves to West Bengal, not North Eastern -- the real trap', () => {
    expect(resolveCircleForRegion('Sikkim')).toBe('West Bengal')
  })

  it('confirms Ladakh resolves to Jammu and Kashmir (inference by elimination, see the module comment)', () => {
    expect(resolveCircleForRegion('Ladākh')).toBe('Jammu and Kashmir')
  })

  it('returns null for a genuinely unrecognized region, rather than guessing', () => {
    expect(resolveCircleForRegion('Atlantis')).toBeNull()
  })

  it('is case- and whitespace-insensitive', () => {
    expect(resolveCircleForRegion('  ODISHA  ')).toBe('Orissa')
  })

  describe('getSiblingRegionsInCircle', () => {
    it('returns the other five states for a North Eastern state', () => {
      const siblings = getSiblingRegionsInCircle('Arunāchal Pradesh')
      expect(siblings.sort()).toEqual(
        ['Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Tripura'].sort()
      )
    })

    it('returns an empty array for a region whose circle covers only itself', () => {
      expect(getSiblingRegionsInCircle('Andhra Pradesh')).toEqual([])
    })

    it('returns an empty array for an unrecognized region', () => {
      expect(getSiblingRegionsInCircle('Atlantis')).toEqual([])
    })

    it('never includes the queried region itself, but does include the circle\'s own namesake state', () => {
      // Maharashtra (the state) and Goa share the Maharashtra circle, so
      // from Goa's perspective Maharashtra genuinely is a sibling region --
      // this isn't a self-reference to exclude, it's real shared data.
      const siblings = getSiblingRegionsInCircle('Goa')
      expect(siblings).not.toContain('Goa')
      expect(siblings).toContain('Maharashtra')
    })
  })
})
