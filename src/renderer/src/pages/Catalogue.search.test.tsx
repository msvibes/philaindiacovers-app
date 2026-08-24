import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Catalogue from './CatalogueTestHarness'
import { downloadCoverImageUrl, fetchCataloguePage, fetchCatalogueFacets } from '../lib/covers'

vi.mock('../lib/covers', async () => {
  const actual = await vi.importActual<typeof import('../lib/covers')>('../lib/covers')
  return {
    ...actual,
    fetchCataloguePage: vi.fn(),
    fetchCatalogueFacets: vi.fn(),
    downloadCoverImageUrl: vi.fn()
  }
})

const mockedFetchPage = vi.mocked(fetchCataloguePage)
const mockedFetchFacets = vi.mocked(fetchCatalogueFacets)
const mockedDownload = vi.mocked(downloadCoverImageUrl)
const noop = (): void => {}

// A genuinely empty ({ covers: [], totalCount: 0 }) result with no active
// filters/search hits the "freshly dusted" branch, which doesn't render
// the toolbar/search input at all — these tests need the ready-with-
// results branch instead, since that's what has a search box to type into.
const oneCover = [
  {
    id: 'cover-1',
    giItemName: 'Test Item GI Name',
    nameOfCover: 'Test Item',
    productCategory: null,
    dateOfIssue: null,
    imageFile: 'x.jpg',
    postalCircleId: null,
    postalCircleName: null
  }
]

beforeEach(() => {
  mockedFetchPage.mockReset()
  mockedFetchFacets.mockReset()
  mockedDownload.mockReset()
  mockedDownload.mockResolvedValue('blob:mock-url')
  mockedFetchFacets.mockResolvedValue({ productCategories: [], postalCircles: [], years: [] })
  mockedFetchPage.mockResolvedValue({ covers: oneCover, totalCount: 1 })
})

describe('Catalogue search', () => {
  it('debounces search input — does not call fetchCataloguePage on every keystroke', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(mockedFetchPage).toHaveBeenCalledTimes(1)) // initial fetch on mount

    const input = screen.getByPlaceholderText(/search by item name/i)
    await user.type(input, 'silk')

    // Still just the one initial call — the debounced search hasn't fired
    // for any of the 4 keystrokes yet (each well under the 300ms window).
    expect(mockedFetchPage).toHaveBeenCalledTimes(1)

    await waitFor(
      () => {
        const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
        expect(lastCall?.searchTerm).toBe('silk')
      },
      { timeout: 1000 }
    )
    // Exactly one additional call once the debounce window elapses — not
    // one per keystroke.
    expect(mockedFetchPage).toHaveBeenCalledTimes(2)
  })

  // The raw term is passed through unmodified to fetchCataloguePage — the
  // actual comma/paren/percent/asterisk sanitization happens inside that
  // function's own .or() string construction (see sanitizeSearchTerm()'s
  // dedicated unit tests in covers.test.ts), not here. This test only
  // confirms Catalogue.tsx itself doesn't pre-mangle the input.
  it('passes the raw search term through to the query unmodified — sanitization happens inside fetchCataloguePage, tested separately', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(mockedFetchPage).toHaveBeenCalledTimes(1))

    const input = screen.getByPlaceholderText(/search by item name/i)
    await user.type(input, 'silk,(100%)*')

    await waitFor(() => {
      const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
      expect(lastCall?.searchTerm).toBe('silk,(100%)*')
    })
  })

  it('resets to page 1 when the search term changes', async () => {
    mockedFetchPage.mockResolvedValue({
      covers: Array.from({ length: 24 }, (_, i) => ({
        id: `cover-${i}`,
        giItemName: `Item ${i} GI Name`,
        nameOfCover: `Item ${i}`,
        productCategory: null,
        dateOfIssue: null,
        imageFile: 'x.jpg',
        postalCircleId: null,
        postalCircleName: null
      })),
      totalCount: 48
    })
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '2' }))
    await waitFor(() => {
      const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
      expect(lastCall?.page).toBe(2)
    })

    const input = screen.getByPlaceholderText(/search by item name/i)
    await user.type(input, 'x')

    await waitFor(() => {
      const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
      expect(lastCall?.searchTerm).toBe('x')
      expect(lastCall?.page).toBe(1)
    })
  })
})
