import { useState } from 'react'
import type { CatalogueFacets } from '../lib/covers'
import { getRegionCoverStats } from '../lib/regionCoverStats'
import { ALL_REGION_NAMES, normalizeRegionName } from '../lib/postalCircleStates'

interface IndiaMapSearchProps {
  facets: CatalogueFacets
  onSelectRegion: (circleId: string) => void
}

const MAX_SUGGESTIONS = 6

// KAN-85: the first combobox-style component in this codebase (checked --
// no existing dropdown/autocomplete precedent to follow). Deliberately
// self-contained inside the India-map area, matching how the legend is
// also owned entirely by IndiaMap.tsx rather than Catalogue.tsx -- this
// screen owns everything about the region-browsing experience.
//
// Selecting a suggestion calls the EXACT SAME onSelectRegion callback a
// map click already uses -- genuinely no map interaction needed, matching
// the request precisely. Suggestions are filtered to regions with a real
// circleId, deliberately consistent with the map's own PR 3 decision that
// a zero-cover region stays non-interactive rather than navigating into a
// guaranteed-empty grid -- this doesn't reopen that question, it inherits
// it.
//
// Matches against both a region's own name AND its circle's name (via
// normalizeRegionName, same diacritic/case-insensitive comparison used
// everywhere else region names get compared) -- typing "Orissa" (the
// circle's real name) surfaces "Odisha" (the region), typing "North
// Eastern" surfaces all six regions that circle spans. A small, real
// usability win given this project's own domain quirks, not scope creep.
export default function IndiaMapSearch({
  facets,
  onSelectRegion
}: IndiaMapSearchProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const normalizedQuery = normalizeRegionName(query)
  const suggestions =
    normalizedQuery === ''
      ? []
      : ALL_REGION_NAMES.filter((region) => {
          const stats = getRegionCoverStats(region, facets)
          if (stats.circleId === null) return false
          const matchesRegion = normalizeRegionName(region).includes(normalizedQuery)
          const matchesCircle = stats.circleName
            ? normalizeRegionName(stats.circleName).includes(normalizedQuery)
            : false
          return matchesRegion || matchesCircle
        }).slice(0, MAX_SUGGESTIONS)

  function selectSuggestion(region: string): void {
    const stats = getRegionCoverStats(region, facets)
    if (!stats.circleId) return
    onSelectRegion(stats.circleId)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className="absolute top-2 left-2 w-56 z-10">
      <input
        type="text"
        role="combobox"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-autocomplete="list"
        aria-controls="india-map-search-listbox"
        aria-label="Jump to a state or region"
        placeholder="Jump to a state…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && suggestions.length > 0) {
            event.preventDefault()
            selectSuggestion(suggestions[0])
          } else if (event.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-card text-ink"
      />
      {isOpen && suggestions.length > 0 && (
        <ul
          id="india-map-search-listbox"
          role="listbox"
          className="mt-1 rounded-lg border border-line bg-card shadow-sm overflow-hidden"
        >
          {suggestions.map((region) => (
            <li key={region}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                // mousedown, not just relying on click, so this fires
                // before the input's own blur -- avoids needing a
                // setTimeout-based blur-delay hack to keep the list open
                // long enough for a click to register.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(region)}
                className="block w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-paper"
              >
                {region}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
