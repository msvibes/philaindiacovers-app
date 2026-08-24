import type { CatalogueQueryParams } from './covers'
import type { AppliedFilters } from '../components/FilterPanel'

export const EMPTY_FILTERS: AppliedFilters = {
  postalCircleIds: [],
  productCategories: [],
  years: []
}

export interface CatalogueQueryState {
  appliedFilters: AppliedFilters
  searchTerm: string
  sort: CatalogueQueryParams['sort']
  page: number
  // Set only via tapping a GI Tag Name in Detail view (FR-14) — a single
  // exact-match filter, not part of AppliedFilters' checkbox groups, since
  // gi_item_name isn't a bounded facet FilterPanel can enumerate.
  giItemNameFilter: string | null
}

export const initialCatalogueQueryState: CatalogueQueryState = {
  appliedFilters: EMPTY_FILTERS,
  searchTerm: '',
  sort: 'newest',
  page: 1,
  giItemNameFilter: null
}

export type CatalogueAction =
  | { type: 'SET_FILTERS'; filters: AppliedFilters }
  | { type: 'SET_SEARCH'; term: string }
  | { type: 'SET_SORT'; sort: CatalogueQueryParams['sort'] }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_GI_TAG_FILTER'; giItemName: string }
  | { type: 'CLEAR_GI_TAG_FILTER' }

// Changing a filter, the search term, the sort mode, or the GI tag filter
// all reset to page 1 — staying on page 6 of a now-3-page result set would
// be nonsensical. Centralized here so every setter gets this for free,
// rather than each handler needing to remember it.
//
// The GI tag filter (FR-14) is mutually exclusive with the checkbox
// filters/search: choosing either mode clears the other, since they
// represent two different ways of narrowing the same grid, not
// combinable layers — matches the "show me everything with this tag"
// clean-slate mental model a tester would expect when tapping a tag.
export function catalogueReducer(
  state: CatalogueQueryState,
  action: CatalogueAction
): CatalogueQueryState {
  switch (action.type) {
    case 'SET_FILTERS':
      return { ...state, appliedFilters: action.filters, giItemNameFilter: null, page: 1 }
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.term, giItemNameFilter: null, page: 1 }
    case 'SET_SORT':
      return { ...state, sort: action.sort, page: 1 }
    case 'SET_PAGE':
      return { ...state, page: action.page }
    case 'SET_GI_TAG_FILTER':
      return {
        ...state,
        appliedFilters: EMPTY_FILTERS,
        searchTerm: '',
        giItemNameFilter: action.giItemName,
        page: 1
      }
    case 'CLEAR_GI_TAG_FILTER':
      return { ...state, giItemNameFilter: null, page: 1 }
  }
}
