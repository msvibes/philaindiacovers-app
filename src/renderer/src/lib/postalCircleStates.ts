// T-21/US-50/KAN-61: the India map needs to resolve each of the 36
// geoBoundaries ADM1 regions (India's states + UTs -- see
// src/renderer/src/assets/data/india-states.topojson) to the India Post
// circle that administers it, since covers.issuing_postal_circle is
// recorded by circle (docs/Postal-Circles-Reference.md's 23 official
// names), not by state -- and the two are not 1:1.
//
// Researched directly against India Post's own org page
// (indiapost.gov.in/ministry/ourorganisation), cross-validated against an
// independent source (potoolsblog.in), both agreeing on the same 7 named
// exceptions below. An 8th case -- Ladakh -- isn't listed as an
// India-Post-named exception at all; since no separate "Ladakh circle"
// exists among the 23, and every region of India is administered by some
// circle, Ladakh falling under Jammu and Kashmir is an inference by
// elimination, not a directly-stated fact in either source. Cross-checked
// against independent secondary sources (postal-history references), but
// if this table is ever found wrong, this is the one row to re-check
// first -- starting with jkpost.gov.in's own "About us"/jurisdiction page,
// which was unreachable (DNS failure) from this project's research
// environment at the time this was written. That's a genuine research
// gap, not a skipped step -- flagged here so it's easy to find.
const REGION_CIRCLE_TABLE: { region: string; circle: string }[] = [
  // 22 circles that are themselves a state/UT name, administering just
  // that one region (Orissa is the one exception among these 22 -- its
  // circle name is the pre-Odisha legacy spelling, deliberately preserved
  // exactly as India Post lists it, same as docs/Postal-Circles-Reference.md).
  { region: 'Andhra Pradesh', circle: 'Andhra Pradesh' },
  { region: 'Assam', circle: 'Assam' },
  { region: 'Bihar', circle: 'Bihar' },
  { region: 'Chhattisgarh', circle: 'Chhattisgarh' },
  { region: 'Delhi', circle: 'Delhi' },
  { region: 'Gujarat', circle: 'Gujarat' },
  { region: 'Haryana', circle: 'Haryana' },
  { region: 'Himachal Pradesh', circle: 'Himachal Pradesh' },
  { region: 'Jammu and Kashmir', circle: 'Jammu and Kashmir' },
  { region: 'Jharkhand', circle: 'Jharkhand' },
  { region: 'Karnataka', circle: 'Karnataka' },
  { region: 'Kerala', circle: 'Kerala' },
  { region: 'Madhya Pradesh', circle: 'Madhya Pradesh' },
  { region: 'Maharashtra', circle: 'Maharashtra' },
  { region: 'Odisha', circle: 'Orissa' },
  { region: 'Punjab', circle: 'Punjab' },
  { region: 'Rajasthan', circle: 'Rajasthan' },
  { region: 'Tamil Nadu', circle: 'Tamil Nadu' },
  { region: 'Telangana', circle: 'Telangana' },
  { region: 'Uttar Pradesh', circle: 'Uttar Pradesh' },
  { region: 'Uttarakhand', circle: 'Uttarakhand' },
  { region: 'West Bengal', circle: 'West Bengal' },

  // 14 regions administered by a circle named after a different state --
  // the actual trickiest part of this whole feature.
  { region: 'Goa', circle: 'Maharashtra' },
  { region: 'Lakshadweep', circle: 'Kerala' },
  { region: 'Chandigarh', circle: 'Punjab' },
  { region: 'Puducherry', circle: 'Tamil Nadu' },
  { region: 'Andaman and Nicobar Islands', circle: 'West Bengal' },
  { region: 'Sikkim', circle: 'West Bengal' },
  // Daman & Diu and Dadra & Nagar Haveli merged into one UT in 2020 --
  // both were already under the Gujarat circle beforehand, so this stays
  // a single row, matching the merged region the actual downloaded
  // geoBoundaries file represents (verified directly, not assumed).
  { region: 'Dadra and Nagar Haveli and Daman and Diu', circle: 'Gujarat' },
  { region: 'Ladakh', circle: 'Jammu and Kashmir' }, // see the caveat above
  // "North Eastern" is the one circle that isn't itself a state/UT name --
  // exactly six states, confirmed NOT including Sikkim (a real, easy trap:
  // the circle name plus Sikkim's geography make it easy to guess wrong).
  { region: 'Arunachal Pradesh', circle: 'North Eastern' },
  { region: 'Manipur', circle: 'North Eastern' },
  { region: 'Meghalaya', circle: 'North Eastern' },
  { region: 'Mizoram', circle: 'North Eastern' },
  { region: 'Nagaland', circle: 'North Eastern' },
  { region: 'Tripura', circle: 'North Eastern' }
]

// The actual downloaded geoBoundaries file uses diacritic marks on many
// region names ("Bihār", "Gujarāt", "Jammu and Kashmīr", "Ladākh", etc.)
// -- found only once the real file was inspected (the addendum had
// explicitly deferred this exact check). This is a different problem than
// the NFC/NFD encoding mismatch normalizeFileName.ts (Admin repo) already
// fixed for visually-identical characters -- here the diacritics are
// visually different marks that still need to resolve to the same plain
// name, so this strips combining marks entirely rather than just
// standardizing composition form.
function stripDiacritics(value: string): string {
  // Combining Diacritical Marks block (U+0300-U+036F) -- written as an
  // explicit escape range rather than literal characters so this stays
  // legible and encoding-safe in source.
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function normalizeRegionName(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim()
}

const REGION_TO_CIRCLE = new Map<string, string>(
  REGION_CIRCLE_TABLE.map((entry) => [normalizeRegionName(entry.region), entry.circle])
)

const CIRCLE_TO_REGIONS = new Map<string, string[]>()
for (const entry of REGION_CIRCLE_TABLE) {
  const regions = CIRCLE_TO_REGIONS.get(entry.circle) ?? []
  regions.push(entry.region)
  CIRCLE_TO_REGIONS.set(entry.circle, regions)
}

// Resolves a geoBoundaries `shapeName` (or any other spelling/diacritic
// variant of a region name) to the official postal_circles.name it's
// administered by. Returns null for a genuinely unrecognized region --
// callers decide how to handle a non-match, same convention as
// normalizePostalCircleName (Admin repo) not guessing on the caller's
// behalf.
export function resolveCircleForRegion(regionName: string): string | null {
  return REGION_TO_CIRCLE.get(normalizeRegionName(regionName)) ?? null
}

// The other region display names sharing regionName's circle, excluding
// regionName itself -- empty for a region whose circle administers only
// itself. Used for the shared-circle tooltip copy (KAN-61 PR 2) so it can
// honestly name every region a shown count actually covers, e.g. "North
// Eastern circle -- also covers: Manipur, Meghalaya, Mizoram, Nagaland,
// Tripura" when hovering Arunachal Pradesh.
export function getSiblingRegionsInCircle(regionName: string): string[] {
  const circle = resolveCircleForRegion(regionName)
  if (!circle) return []
  const normalizedSelf = normalizeRegionName(regionName)
  return (CIRCLE_TO_REGIONS.get(circle) ?? []).filter(
    (region) => normalizeRegionName(region) !== normalizedSelf
  )
}

// KAN-85: the 36 canonical region display names, for the jump-to-state
// search's suggestion list -- no new data, just exposing what
// REGION_CIRCLE_TABLE already has. Not exported as the raw table itself
// (which also carries each region's circle, an internal implementation
// detail callers outside this module shouldn't need to know the shape of).
export const ALL_REGION_NAMES: string[] = REGION_CIRCLE_TABLE.map((entry) => entry.region)
