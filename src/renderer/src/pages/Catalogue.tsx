import { useEffect, useReducer, useState } from 'react'
import {
  fetchCataloguePage,
  fetchCatalogueFacets,
  type CatalogueFacets,
  type CatalogueQueryParams,
  type VerifiedCover
} from '../lib/covers'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import CatalogueCard from '../components/CatalogueCard'
import CatalogueToolbar from '../components/CatalogueToolbar'
import CatalogueGridSkeleton from '../components/CatalogueGridSkeleton'
import CatalogueEmptyState from '../components/CatalogueEmptyState'
import Pagination from '../components/Pagination'
import FilterPanel, { type AppliedFilters } from '../components/FilterPanel'

const EMPTY_FILTERS: AppliedFilters = { postalCircleIds: [], productCategories: [], years: [] }
const PAGE_SIZE = 24

interface CatalogueQueryState {
  appliedFilters: AppliedFilters
  searchTerm: string
  sort: CatalogueQueryParams['sort']
  page: number
}

type CatalogueAction =
  | { type: 'SET_FILTERS'; filters: AppliedFilters }
  | { type: 'SET_SEARCH'; term: string }
  | { type: 'SET_SORT'; sort: CatalogueQueryParams['sort'] }
  | { type: 'SET_PAGE'; page: number }

// Changing a filter, the search term, or the sort mode all reset to page
// 1 — staying on page 6 of a now-3-page result set would be nonsensical.
// Centralized here so every setter gets this for free, rather than each
// handler needing to remember it.
function catalogueReducer(state: CatalogueQueryState, action: CatalogueAction): CatalogueQueryState {
  switch (action.type) {
    case 'SET_FILTERS':
      return { ...state, appliedFilters: action.filters, page: 1 }
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.term, page: 1 }
    case 'SET_SORT':
      return { ...state, sort: action.sort, page: 1 }
    case 'SET_PAGE':
      return { ...state, page: action.page }
  }
}

type LoadState = 'loading' | 'ready' | 'error'

interface CatalogueProps {
  onSelectCover: (id: string) => void
}

export default function Catalogue({ onSelectCover }: CatalogueProps): React.JSX.Element {
  const [query, dispatch] = useReducer(catalogueReducer, {
    appliedFilters: EMPTY_FILTERS,
    searchTerm: '',
    sort: 'newest',
    page: 1
  })
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
    query.sort,
    query.page,
    retryCount
  ])

  const hasActiveFiltersOrSearch =
    query.appliedFilters.postalCircleIds.length > 0 ||
    query.appliedFilters.productCategories.length > 0 ||
    query.appliedFilters.years.length > 0 ||
    debouncedSearchTerm.trim() !== ''

  const activeFilterCount =
    query.appliedFilters.postalCircleIds.length +
    query.appliedFilters.productCategories.length +
    query.appliedFilters.years.length

  if (state === 'loading' && covers.length === 0) {
    return (
      <main className="p-8">
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
        <h1 className="text-xl font-semibold mb-2">Well, that didn&apos;t go to plan.</h1>
        <p className="text-gray-500 mb-4">Give it another go?</p>
        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Try again
        </button>
      </main>
    )
  }

  if (totalCount === 0 && !hasActiveFiltersOrSearch) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold mb-2">The shelves are freshly dusted</h1>
        <p className="text-gray-500">
          The catalogue&apos;s still getting started — nothing&apos;s been verified in yet. Check
          back soon as more covers get verified.
        </p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold mb-4 font-display">The Catalogue</h1>
      <CatalogueToolbar
        searchTerm={query.searchTerm}
        onSearchChange={(term) => dispatch({ type: 'SET_SEARCH', term })}
        onOpenFilters={openFilterPanel}
        activeFilterCount={activeFilterCount}
        sort={query.sort}
        onSortChange={(sort) => dispatch({ type: 'SET_SORT', sort })}
      />

      {totalCount === 0 ? (
        <CatalogueEmptyState
          quickCategories={facets.productCategories.slice(0, 2).map((f) => f.value)}
          onClearFilters={() => {
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
            {covers.map((cover) => (
              <CatalogueCard key={cover.id} cover={cover} onSelect={() => onSelectCover(cover.id)} />
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
        }}
        onClose={() => setFilterPanelOpen(false)}
      />
    </main>
  )
}
