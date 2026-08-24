import { describe, expect, it } from 'vitest'
import {
  catalogueReducer,
  initialCatalogueQueryState,
  EMPTY_FILTERS
} from './catalogueQuery'

describe('catalogueReducer', () => {
  it('SET_FILTERS applies the filters and resets to page 1', () => {
    const state = { ...initialCatalogueQueryState, page: 3 }
    const next = catalogueReducer(state, {
      type: 'SET_FILTERS',
      filters: { ...EMPTY_FILTERS, productCategories: ['Textile'] }
    })
    expect(next.appliedFilters.productCategories).toEqual(['Textile'])
    expect(next.page).toBe(1)
  })

  it('SET_SEARCH sets the term and resets to page 1', () => {
    const state = { ...initialCatalogueQueryState, page: 3 }
    const next = catalogueReducer(state, { type: 'SET_SEARCH', term: 'silk' })
    expect(next.searchTerm).toBe('silk')
    expect(next.page).toBe(1)
  })

  it('SET_SORT sets the sort and resets to page 1', () => {
    const state = { ...initialCatalogueQueryState, page: 3 }
    const next = catalogueReducer(state, { type: 'SET_SORT', sort: 'alphabetical' })
    expect(next.sort).toBe('alphabetical')
    expect(next.page).toBe(1)
  })

  it('SET_PAGE only changes the page, nothing else', () => {
    const next = catalogueReducer(initialCatalogueQueryState, { type: 'SET_PAGE', page: 4 })
    expect(next.page).toBe(4)
    expect(next.appliedFilters).toEqual(EMPTY_FILTERS)
  })

  // FR-14: tapping a GI Tag Name is a clean-slate switch, not a filter
  // layered on top of whatever was already applied.
  it('SET_GI_TAG_FILTER clears the checkbox filters and search term, sets the tag, resets to page 1', () => {
    const state = {
      ...initialCatalogueQueryState,
      appliedFilters: { ...EMPTY_FILTERS, productCategories: ['Textile'] },
      searchTerm: 'silk',
      page: 3
    }
    const next = catalogueReducer(state, { type: 'SET_GI_TAG_FILTER', giItemName: 'Kanchipuram Silk' })
    expect(next.giItemNameFilter).toBe('Kanchipuram Silk')
    expect(next.appliedFilters).toEqual(EMPTY_FILTERS)
    expect(next.searchTerm).toBe('')
    expect(next.page).toBe(1)
  })

  it('CLEAR_GI_TAG_FILTER resets just the tag filter', () => {
    const state = { ...initialCatalogueQueryState, giItemNameFilter: 'Kanchipuram Silk', page: 2 }
    const next = catalogueReducer(state, { type: 'CLEAR_GI_TAG_FILTER' })
    expect(next.giItemNameFilter).toBeNull()
  })

  // Mutual exclusivity holds both directions — choosing a checkbox filter
  // or typing a search term exits GI-tag mode, not just the other way
  // around.
  it('SET_FILTERS and SET_SEARCH each clear an active GI tag filter', () => {
    const state = { ...initialCatalogueQueryState, giItemNameFilter: 'Kanchipuram Silk' }
    expect(
      catalogueReducer(state, { type: 'SET_FILTERS', filters: EMPTY_FILTERS }).giItemNameFilter
    ).toBeNull()
    expect(catalogueReducer(state, { type: 'SET_SEARCH', term: 'x' }).giItemNameFilter).toBeNull()
  })

  it('SET_PAGE does not clear an active GI tag filter — paging within tag results stays in tag mode', () => {
    const state = { ...initialCatalogueQueryState, giItemNameFilter: 'Kanchipuram Silk' }
    const next = catalogueReducer(state, { type: 'SET_PAGE', page: 2 })
    expect(next.giItemNameFilter).toBe('Kanchipuram Silk')
  })
})
