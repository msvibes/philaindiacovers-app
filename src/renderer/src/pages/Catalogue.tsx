import { useEffect, useState } from 'react'
import {
  fetchCataloguePage,
  fetchCatalogueFacets,
  type CatalogueFacets,
  type VerifiedCover
} from '../lib/covers'
import { EMPTY_FILTERS, type CatalogueAction, type CatalogueQueryState } from '../lib/catalogueQuery'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { useToast } from '../lib/ToastContext'
import CatalogueCard from '../components/CatalogueCard'
import CatalogueToolbar from '../components/CatalogueToolbar'
import CatalogueGridSkeleton from '../components/CatalogueGridSkeleton'
import CatalogueEmptyState from '../components/CatalogueEmptyState'
import Pagination from '../components/Pagination'
import FilterPanel, { type AppliedFilters } from '../components/FilterPanel'
import Eyebrow from '../components/Eyebrow'

const PAGE_SIZE = 24

type LoadState = 'loading' | 'ready' | 'error'

interface CatalogueProps {
  query: CatalogueQueryState
  dispatch: (action: CatalogueAction) => void
  onSelectCover: (id: string) => void
}

// Filter/search/sort/page state is owned by App.tsx (T-25) — Detail view
// needs to know the same active query to support prev/next navigation
// within it (FR-12), which isn't possible while this state lived only
// here and unmounted along with this component whenever a cover was
// selected. Everything genuinely local to this screen (the fetch itself,
// loading/error, the filter panel's own open/pending-draft UI state)
// stays here — only the cross-page-relevant query moved up.
export default function Catalogue({ query, dispatch, onSelectCover }: CatalogueProps): React.JSX.Element {
  const { showToast } = useToast()
  const [state, setState] = useState<LoadState>('loading')
  const [covers, setCovers] = useState<VerifiedCover[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [facets, setFacets] = useState<CatalogueFacets>({
    productCategories: [],
    postalCircles: [],
    years: []
  })
  const [isFilterPanelOpen, setFilterPanelOpen] = useState(false)
  const [pendingFilters, setPendingFilters] = useState<AppliedFilters>(EMPTY_FILTERS)
  const [retryCount, setRetryCount] = useState(0)

  // Seeded here, in a real click handler, rather than via an effect on
  // FilterPanel's own isOpen prop — avoids resetting state synchronously
  // inside an effect (see the fetch effect's own comment below for the
  // same reasoning).
  function openFilterPanel(): void {
    setPendingFilters(query.appliedFilters)
    setFilterPanelOpen(true)
  }

  function togglePendingValue<T>(key: keyof AppliedFilters, value: T): void {
    setPendingFilters((prev) => {
      const current = prev[key] as unknown as T[]
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  const debouncedSearchTerm = useDebouncedValue(query.searchTerm, 300)

  useEffect(() => {
    let cancelled = false
    fetchCatalogueFacets()
      .then((result) => {
        if (!cancelled) setFacets(result)
      })
      .catch(() => {
        // Facets are supplementary (filter option lists/counts) — a
        // failure here shouldn't block the main grid from loading.
      })
    return () => {
      cancelled = true
    }
  }, [retryCount])

  // Deliberately never resets state to 'loading' synchronously here — same
  // precedent as this file's original version, which only ever transitions
  // state from within the async .then()/.catch() outcomes. In practice
  // this means a refetch (filter/sort/page/search change) keeps showing
  // the previous results until the new ones arrive rather than flashing
  // back to the skeleton — the skeleton only ever appears on the true
  // initial load, when covers.length is still 0.
  useEffect(() => {
    let cancelled = false

    fetchCataloguePage({
      postalCircleIds: query.appliedFilters.postalCircleIds,
      productCategories: query.appliedFilters.productCategories,
      years: query.appliedFilters.years,
      searchTerm: debouncedSearchTerm,
      giItemName: query.giItemNameFilter ?? undefined,
      sort: query.sort,
      page: query.page,
      pageSize: PAGE_SIZE
    })
      .then((result) => {
        if (cancelled) return
        setCovers(result.covers)
        setTotalCount(result.totalCount)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [
    query.appliedFilters,
    debouncedSearchTerm,
    query.giItemNameFilter,
    query.sort,
    query.page,
    retryCount
  ])

  const hasActiveFiltersOrSearch =
    query.appliedFilters.postalCircleIds.length > 0 ||
    query.appliedFilters.productCategories.length > 0 ||
    query.appliedFilters.years.length > 0 ||
    query.giItemNameFilter !== null ||
    debouncedSearchTerm.trim() !== ''

  const activeFilterCount =
    query.appliedFilters.postalCircleIds.length +
    query.appliedFilters.productCategories.length +
    query.appliedFilters.years.length

  if (state === 'loading' && covers.length === 0) {
    return (
      <main className="p-8">
        <Eyebrow>The Archive</Eyebrow>
        <h1 className="text-xl font-semibold mb-4 font-display text-ink">The Catalogue</h1>
        <CatalogueToolbar
          searchTerm={query.searchTerm}
          onSearchChange={(term) => dispatch({ type: 'SET_SEARCH', term })}
          onOpenFilters={openFilterPanel}
          activeFilterCount={activeFilterCount}
          sort={query.sort}
          onSortChange={(sort) => dispatch({ type: 'SET_SORT', sort })}
        />
        <CatalogueGridSkeleton />
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main className="p-8">
        <Eyebrow>The Archive</Eyebrow>
        <h1 className="text-xl font-semibold mb-2 font-display text-ink">
          Well, that didn&apos;t go to plan.
        </h1>
        <p className="text-ink-soft mb-4">Give it another go?</p>
        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="rounded bg-accent px-4 py-2 text-white hover:bg-accent-hover"
        >
          Try again
        </button>
      </main>
    )
  }

  if (totalCount === 0 && !hasActiveFiltersOrSearch) {
    return (
      <main className="p-8">
        <Eyebrow>The Archive</Eyebrow>
        <h1 className="text-xl font-semibold mb-2 font-display text-ink">
          The shelves are freshly dusted
        </h1>
        <p className="text-ink-soft">
          The catalogue&apos;s still getting started — nothing&apos;s been verified in yet. Check
          back soon as more covers get verified.
        </p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <Eyebrow>The Archive</Eyebrow>
      <h1 className="text-xl font-semibold mb-4 font-display text-ink">The Catalogue</h1>
      <CatalogueToolbar
        searchTerm={query.searchTerm}
        onSearchChange={(term) => dispatch({ type: 'SET_SEARCH', term })}
        onOpenFilters={openFilterPanel}
        activeFilterCount={activeFilterCount}
        sort={query.sort}
        onSortChange={(sort) => dispatch({ type: 'SET_SORT', sort })}
      />

      {query.giItemNameFilter !== null && (
        <div className="flex items-center gap-2 mb-4 text-sm text-ink-soft">
          <span>
            Showing covers tagged: <span className="font-semibold text-ink">{query.giItemNameFilter}</span>
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLEAR_GI_TAG_FILTER' })}
            className="text-ink-soft underline"
            aria-label="Clear GI tag filter"
          >
            ✕
          </button>
        </div>
      )}

      {totalCount === 0 ? (
        <CatalogueEmptyState
          quickCategories={facets.productCategories.slice(0, 2).map((f) => f.value)}
          onClearFilters={() => {
            // SET_FILTERS/SET_SEARCH each already clear giItemNameFilter
            // (see catalogueReducer's mutual-exclusivity comment) — no
            // separate CLEAR_GI_TAG_FILTER dispatch needed here.
            dispatch({ type: 'SET_FILTERS', filters: EMPTY_FILTERS })
            dispatch({ type: 'SET_SEARCH', term: '' })
          }}
          onTryCategory={(category) =>
            dispatch({
              type: 'SET_FILTERS',
              filters: { ...EMPTY_FILTERS, productCategories: [category] }
            })
          }
        />
      ) : (
        <>
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
            {covers.map((cover, index) => (
              <CatalogueCard
                key={cover.id}
                cover={cover}
                onSelect={() => onSelectCover(cover.id)}
                tourTarget={index === 0 ? 'catalogue-card' : undefined}
              />
            ))}
          </ul>
          <Pagination
            page={query.page}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={(page) => dispatch({ type: 'SET_PAGE', page })}
          />
        </>
      )}

      <FilterPanel
        isOpen={isFilterPanelOpen}
        facets={facets}
        pending={pendingFilters}
        onTogglePostalCircle={(id) => togglePendingValue('postalCircleIds', id)}
        onToggleCategory={(category) => togglePendingValue('productCategories', category)}
        onToggleYear={(year) => togglePendingValue('years', year)}
        onClear={() => setPendingFilters(EMPTY_FILTERS)}
        onApply={() => {
          dispatch({ type: 'SET_FILTERS', filters: pendingFilters })
          setFilterPanelOpen(false)
          // T-35 (KAN-67): the addendum's own required fit-criterion
          // firing site — "at least filter applied (Catalogue)."
          showToast('Filters applied')
        }}
        onClose={() => setFilterPanelOpen(false)}
      />
    </main>
  )
}
