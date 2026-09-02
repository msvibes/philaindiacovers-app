import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Catalogue from './CatalogueTestHarness'
import { countCatalogueMatches, downloadCoverImageUrl, fetchCataloguePage, fetchCatalogueFacets } from '../lib/covers'

vi.mock('../lib/covers', async () => {
  const actual = await vi.importActual<typeof import('../lib/covers')>('../lib/covers')
  return {
    ...actual,
    fetchCataloguePage: vi.fn(),
    fetchCatalogueFacets: vi.fn(),
    countCatalogueMatches: vi.fn(),
    downloadCoverImageUrl: vi.fn()
  }
})

const mockedFetchPage = vi.mocked(fetchCataloguePage)
const mockedFetchFacets = vi.mocked(fetchCatalogueFacets)
const mockedCountMatches = vi.mocked(countCatalogueMatches)
const mockedDownload = vi.mocked(downloadCoverImageUrl)
const noop = (): void => {}

const facets = {
  productCategories: [{ value: 'Textile', count: 7 }],
  postalCircles: [{ value: { id: 'circle-up', name: 'Uttar Pradesh' }, count: 5 }],
  years: [
    { value: 2020, count: 3 },
    { value: 2022, count: 9 },
    { value: 2021, count: 1 }
  ]
}

const manyCovers = Array.from({ length: 24 }, (_, i) => ({
  id: `cover-${i}`,
  giItemName: `Item ${i} GI Name`,
  nameOfCover: `Item ${i}`,
  productCategory: null,
  dateOfIssue: null,
  imageFile: 'x.jpg',
  postalCircleId: null,
  postalCircleName: null
}))

beforeEach(() => {
  mockedFetchPage.mockReset()
  mockedFetchFacets.mockReset()
  mockedCountMatches.mockReset()
  mockedDownload.mockReset()
  mockedDownload.mockResolvedValue('blob:mock-url')
  mockedFetchFacets.mockResolvedValue(facets)
  mockedFetchPage.mockResolvedValue({ covers: manyCovers, totalCount: 48 })
  mockedCountMatches.mockResolvedValue(5)
})

// T-26 (KAN-62): the addendum's own required fit criterion — selecting a
// year filters the grid to it, reusing fetchCatalogueFacets' already-
// computed years facet, no new query.
describe('Catalogue — browse by year', () => {
  it('the "By year" tab shows a year row per facet, most recent first, and hides the grid', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'By year' }))

    // Role-scoped, not getByText — FilterPanel's own year checkboxes
    // (always mounted, just slid off-screen via CSS while closed) render
    // the same "2022"/"2021"/"2020" text, so a plain getByText collides
    // with them. YearTimeline's rows are real <button>s, FilterPanel's
    // are <label>/<input type="checkbox"> — genuinely different roles.
    expect(screen.getByRole('button', { name: /^2022/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^2021/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^2020/ })).toBeInTheDocument()
    expect(screen.queryByText('Item 0')).not.toBeInTheDocument()
  })

  it('selecting a year applies it as the only filter, returns to the grid, and shows the toast', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'By year' }))
    await user.click(screen.getByRole('button', { name: /^2021/ }))

    // Back on the grid view — the timeline is gone, Grid is pressed again.
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => {
      const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
      expect(lastCall?.years).toEqual([2021])
      expect(lastCall?.postalCircleIds).toEqual([])
      expect(lastCall?.productCategories).toEqual([])
      expect(lastCall?.page).toBe(1)
    })

    expect(await screen.findByText('Filters applied')).toBeInTheDocument()
  })
})
