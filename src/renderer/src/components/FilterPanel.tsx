import { useEffect, useState } from 'react'
import type { CatalogueFacets } from '../lib/covers'
import { countCatalogueMatches } from '../lib/covers'
import { useDebouncedValue } from '../lib/useDebouncedValue'

export interface AppliedFilters {
  postalCircleIds: string[]
  productCategories: string[]
  years: number[]
}

interface FilterPanelProps {
  isOpen: boolean
  facets: CatalogueFacets
  pending: AppliedFilters
  onTogglePostalCircle: (id: string) => void
  onToggleCategory: (category: string) => void
  onToggleYear: (year: number) => void
  onClear: () => void
  onApply: () => void
  onClose: () => void
}

function FilterGroup<T extends string | number>({
  title,
  options,
  selected,
  onToggle
}: {
  title: string
  options: Array<{ value: T; label: string; count: number }>
  selected: T[]
  onToggle: (value: T) => void
}): React.JSX.Element {
  return (
    <fieldset className="mb-6">
      <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-2">
        {title}
      </legend>
      <div className="space-y-1.5">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
            />
            <span className="flex-1">
              {option.label} <span className="font-mono text-ink-soft text-xs">({option.count})</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Slide-over from the right (matching both design prototypes exactly, read
// directly from their source), not a centered modal. Fully controlled —
// the pending draft is owned and reset by Catalogue.tsx's own "open
// filters" click handler (a real event handler, not an effect), avoiding
// any effect-based state-sync here. Per-option counts (the numbers next
// to each checkbox) are static totals from the full dataset, not
// cross-filtered live against other active selections — confirmed this is
// what the approved prototype actually implements, not an oversight. Only
// the Apply button's "Show N covers" count updates live, via a debounced
// countCatalogueMatches call against the pending draft.
export default function FilterPanel({
  isOpen,
  facets,
  pending,
  onTogglePostalCircle,
  onToggleCategory,
  onToggleYear,
  onClear,
  onApply,
  onClose
}: FilterPanelProps): React.JSX.Element {
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const debouncedPending = useDebouncedValue(pending, 200)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    countCatalogueMatches({
      postalCircleIds: debouncedPending.postalCircleIds,
      productCategories: debouncedPending.productCategories,
      years: debouncedPending.years
    })
      .then((count) => {
        if (!cancelled) setPendingCount(count)
      })
      .catch(() => {
        if (!cancelled) setPendingCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, debouncedPending])

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-scrim/40 z-40" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-[360px] max-w-[88vw] bg-card z-50 shadow-xl transition-transform duration-200 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-semibold text-ink">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close filters" className="text-ink-soft">
            ✕
          </button>
        </div>
        <div className="p-4">
          <FilterGroup
            title="Postal Circle"
            options={facets.postalCircles.map((f) => ({
              value: f.value.id,
              label: f.value.name,
              count: f.count
            }))}
            selected={pending.postalCircleIds}
            onToggle={onTogglePostalCircle}
          />
          <FilterGroup
            title="Product Category"
            options={facets.productCategories.map((f) => ({
              value: f.value,
              label: f.value,
              count: f.count
            }))}
            selected={pending.productCategories}
            onToggle={onToggleCategory}
          />
          <FilterGroup
            title="Year"
            options={facets.years.map((f) => ({
              value: f.value,
              label: String(f.value),
              count: f.count
            }))}
            selected={pending.years}
            onToggle={onToggleYear}
          />
        </div>
        <div className="sticky bottom-0 p-4 bg-card border-t border-line flex gap-2">
          <button
            type="button"
            onClick={onClear}
            className="flex-1 rounded border border-line px-4 py-2 text-sm text-ink-soft"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
          >
            {pendingCount === null ? 'Show results' : `Show ${pendingCount} cover${pendingCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </aside>
    </>
  )
}
