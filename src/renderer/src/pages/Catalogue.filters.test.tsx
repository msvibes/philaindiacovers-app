import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Catalogue from './Catalogue'
import {
  countCatalogueMatches,
  downloadCoverImageUrl,
  fetchCataloguePage,
  fetchCatalogueFacets
} from '../lib/covers'

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
  productCategories: [
    { value: 'Textile', count: 7 },
    { value: 'Food & Agriculture', count: 9 }
  ],
  postalCircles: [{ value: { id: 'circle-up', name: 'Uttar Pradesh' }, count: 5 }],
  years: [{ value: 2021, count: 3 }]
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

describe('Catalogue filters', () => {
  it('opens the filter panel and shows facet options with their counts', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^filters$/i }))

    expect(screen.getByRole('checkbox', { name: /uttar pradesh/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /textile/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '2021 (3)' })).toBeInTheDocument()
  })

  it('checking a filter updates the Apply button with a live count from countCatalogueMatches', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^filters$/i }))
    await user.click(screen.getByRole('checkbox', { name: /uttar pradesh/i }))

    // countCatalogueMatches is mocked to resolve to 5 regardless of args, so
    // waiting on the "Show 5 covers" text alone would race with the panel's
    // own initial (empty-filter) count call — wait for the specific
    // checkbox-triggered call directly instead.
    await waitFor(() => {
      expect(mockedCountMatches).toHaveBeenCalledWith(
        expect.objectContaining({ postalCircleIds: ['circle-up'] })
      )
    })
    expect(screen.getByRole('button', { name: /show 5 covers/i })).toBeInTheDocument()
  })

  it('applying a filter calls fetchCataloguePage with the right postalCircleIds/productCategories/years and resets to page 1', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '2' }))
    await waitFor(() => expect(mockedFetchPage.mock.calls.at(-1)?.[0]?.page).toBe(2))

    await user.click(screen.getByRole('button', { name: /^filters$/i }))
    await user.click(screen.getByRole('checkbox', { name: /uttar pradesh/i }))
    await user.click(screen.getByRole('checkbox', { name: /textile/i }))
    await user.click(screen.getByRole('checkbox', { name: '2021 (3)' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /show \d+ cover/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /show \d+ cover/i }))

    await waitFor(() => {
      const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
      expect(lastCall?.postalCircleIds).toEqual(['circle-up'])
      expect(lastCall?.productCategories).toEqual(['Textile'])
      expect(lastCall?.years).toEqual([2021])
      expect(lastCall?.page).toBe(1)
    })
  })

  it('Clear all resets the pending draft without closing the panel', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^filters$/i }))
    await user.click(screen.getByRole('checkbox', { name: /uttar pradesh/i }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /uttar pradesh/i })).toBeChecked())

    await user.click(screen.getByRole('button', { name: /clear all/i }))

    expect(screen.getByRole('checkbox', { name: /uttar pradesh/i })).not.toBeChecked()
    // Panel is still open — Clear doesn't close it, only Apply/scrim/✕ does.
    expect(screen.getByRole('checkbox', { name: /textile/i })).toBeVisible()
  })

  it('a filtered-to-zero result shows the rich empty state with working Clear/Try actions, not the "freshly dusted" copy', async () => {
    mockedFetchPage.mockResolvedValueOnce({ covers: manyCovers, totalCount: 48 })
    mockedFetchPage.mockResolvedValue({ covers: [], totalCount: 0 })
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^filters$/i }))
    await user.click(screen.getByRole('checkbox', { name: /uttar pradesh/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /show \d+ cover/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /show \d+ cover/i }))

    await waitFor(() => expect(screen.getByText(/no covers match these filters/i)).toBeInTheDocument())
    expect(screen.queryByText(/freshly dusted/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try: textile/i })).toBeInTheDocument()

    mockedFetchPage.mockResolvedValue({ covers: manyCovers, totalCount: 48 })
    await user.click(screen.getByRole('button', { name: /clear all filters/i }))

    await waitFor(() => {
      const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
      expect(lastCall?.postalCircleIds).toEqual([])
    })
  })
})
