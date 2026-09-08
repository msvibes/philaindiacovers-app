import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  // Uttar Pradesh: a direct 1:1 region<->circle name, the simplest real
  // case to click reliably by test-id. Deliberately no entry for most
  // other circles, so most of the map's 36 regions stay non-clickable --
  // exercising that boundary too, not just the happy path.
  postalCircles: [{ value: { id: 'circle-up', name: 'Uttar Pradesh' }, count: 5 }],
  years: []
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

// T-21 (KAN-61) PR 3: the addendum's own required fit criterion --
// clicking a state filters the grid to it, reusing the exact
// selectYear/selectRegion 3-step pattern T-26 already established.
describe('Catalogue — browse by region', () => {
  it('the "By region" tab shows the map and hides the grid', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'By region' }))

    expect(screen.getByRole('img', { name: /map of india/i })).toBeInTheDocument()
    expect(screen.queryByText('Item 0')).not.toBeInTheDocument()
  })

  it('clicking a covered region applies it as the only filter, returns to the grid, and shows the toast', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'By region' }))
    // fireEvent, not userEvent, deliberately -- see IndiaMap.test.tsx's
    // own comment on why a real click's full pointerdown/mousedown/mouseup
    // sequence crashes d3-zoom's native mousedown listener in jsdom once
    // KAN-85 (PR 3) wraps Geographies in ZoomableGroup.
    fireEvent.click(screen.getByTestId('india-map-region-Uttar Pradesh'))

    // Back on the grid view — the map is gone, Grid is pressed again.
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => {
      const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
      expect(lastCall?.postalCircleIds).toEqual(['circle-up'])
      expect(lastCall?.years).toEqual([])
      expect(lastCall?.productCategories).toEqual([])
      expect(lastCall?.page).toBe(1)
    })

    expect(await screen.findByText('Filters applied')).toBeInTheDocument()
  })

  it('clicking a zero-cover region does nothing -- stays on the map, no filter change', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'By region' }))
    mockedFetchPage.mockClear()
    fireEvent.click(screen.getByTestId('india-map-region-Odisha'))

    expect(screen.getByRole('img', { name: /map of india/i })).toBeInTheDocument()
    expect(mockedFetchPage).not.toHaveBeenCalled()
  })
})
