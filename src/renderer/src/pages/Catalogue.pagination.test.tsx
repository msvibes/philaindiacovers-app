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
})

describe('Catalogue pagination', () => {
  it('does not render pagination controls when everything fits on one page', async () => {
    mockedFetchPage.mockResolvedValue({ covers: manyCovers.slice(0, 5), totalCount: 5 })
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())
    expect(screen.queryByRole('navigation', { name: /catalogue pages/i })).not.toBeInTheDocument()
  })

  it('clicking page 2 calls fetchCataloguePage with page: 2', async () => {
    mockedFetchPage.mockResolvedValue({ covers: manyCovers, totalCount: 48 })
    const user = userEvent.setup()
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => {
      const lastCall = mockedFetchPage.mock.calls.at(-1)?.[0]
      expect(lastCall?.page).toBe(2)
    })
  })

  it('Previous is disabled on page 1, Next is disabled on the last page', async () => {
    mockedFetchPage.mockResolvedValue({ covers: manyCovers, totalCount: 48 })
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText('Item 0')).toBeInTheDocument())

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
  })
})
