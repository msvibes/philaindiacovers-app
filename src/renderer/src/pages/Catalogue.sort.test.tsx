import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Catalogue from './Catalogue'
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
  mockedDownload.mockReset()
  mockedDownload.mockResolvedValue('blob:mock-url')
  mockedFetchFacets.mockResolvedValue({ productCategories: [], postalCircles: [], years: [] })
  mockedFetchPage.mockResolvedValue({ covers: manyCovers, totalCount: 48 })
})

describe('Catalogue sort', () => {
  it('defaults to "newest" on first load', async () => {
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => {
      const firstCall = mockedFetchPage.mock.calls[0]?.[0]
      expect(firstCall?.sort).toBe('newest')
    })
    expect(screen.getByRole('button', { name: /newest first/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('toggling to A–Z passes sort: "alphabetical" to the query', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'A–Z' }))

    await waitFor(() => {
      const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
      expect(lastCall?.sort).toBe('alphabetical')
    })
    expect(screen.getByRole('button', { name: 'A–Z' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('resets to page 1 when sort changes', async () => {
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '2' }))
    await waitFor(() => {
      expect(mockedFetchPage.mock.calls.at(-1)?.[0]?.page).toBe(2)
    })

    await user.click(screen.getByRole('button', { name: 'A–Z' }))

    await waitFor(() => {
      const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
      expect(lastCall?.sort).toBe('alphabetical')
      expect(lastCall?.page).toBe(1)
    })
  })
})
