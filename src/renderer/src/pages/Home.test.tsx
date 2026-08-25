import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'
import { countCatalogueMatches, downloadCoverImageUrl, fetchCoversByIds } from '../lib/covers'
import { useRecentlyViewed } from '../lib/useRecentlyViewed'

vi.mock('../lib/covers', async () => {
  const actual = await vi.importActual<typeof import('../lib/covers')>('../lib/covers')
  return {
    ...actual,
    countCatalogueMatches: vi.fn(),
    fetchCoversByIds: vi.fn(),
    downloadCoverImageUrl: vi.fn()
  }
})

vi.mock('../lib/useRecentlyViewed', () => ({
  useRecentlyViewed: vi.fn()
}))

const mockedCount = vi.mocked(countCatalogueMatches)
const mockedFetchByIds = vi.mocked(fetchCoversByIds)
const mockedDownload = vi.mocked(downloadCoverImageUrl)
const mockedUseRecentlyViewed = vi.mocked(useRecentlyViewed)

beforeEach(() => {
  mockedCount.mockReset()
  mockedFetchByIds.mockReset()
  mockedDownload.mockReset()
  mockedUseRecentlyViewed.mockReset()
  mockedDownload.mockResolvedValue('blob:mock-url')
  mockedCount.mockResolvedValue(286)
})

describe('Home', () => {
  it('shows the real live verified count, not hardcoded copy — FR-01', async () => {
    mockedUseRecentlyViewed.mockReturnValue({ recentIds: [], recordView: vi.fn() })
    render(<Home onEnterCatalogue={() => {}} onSelectCover={() => {}} />)

    await waitFor(() => expect(mockedCount).toHaveBeenCalledExactlyOnceWith({}))
    expect(screen.getByText('286 verified covers ready to browse.')).toBeInTheDocument()
  })

  it('shows the courteous empty state when nothing has been viewed yet', async () => {
    mockedUseRecentlyViewed.mockReturnValue({ recentIds: [], recordView: vi.fn() })
    render(<Home onEnterCatalogue={() => {}} onSelectCover={() => {}} />)

    await waitFor(() =>
      expect(screen.getByText('Covers you view will show up here.')).toBeInTheDocument()
    )
    expect(mockedFetchByIds).not.toHaveBeenCalled()
  })

  it('hydrates recentIds into real cards via fetchCoversByIds', async () => {
    mockedUseRecentlyViewed.mockReturnValue({
      recentIds: ['cover-1'],
      recordView: vi.fn()
    })
    mockedFetchByIds.mockResolvedValue([
      {
        id: 'cover-1',
        giItemName: 'Test GI',
        nameOfCover: 'Test Cover',
        productCategory: null,
        dateOfIssue: null,
        imageFile: 'x.jpg',
        postalCircleId: null,
        postalCircleName: null
      }
    ])
    render(<Home onEnterCatalogue={() => {}} onSelectCover={() => {}} />)

    await waitFor(() => expect(screen.getByText('Test Cover')).toBeInTheDocument())
    expect(mockedFetchByIds).toHaveBeenCalledExactlyOnceWith(['cover-1'])
  })

  it('clicking a recently-viewed card calls onSelectCover with the real id', async () => {
    mockedUseRecentlyViewed.mockReturnValue({ recentIds: ['cover-1'], recordView: vi.fn() })
    mockedFetchByIds.mockResolvedValue([
      {
        id: 'cover-1',
        giItemName: 'Test GI',
        nameOfCover: 'Test Cover',
        productCategory: null,
        dateOfIssue: null,
        imageFile: 'x.jpg',
        postalCircleId: null,
        postalCircleName: null
      }
    ])
    const onSelectCover = vi.fn()
    render(<Home onEnterCatalogue={() => {}} onSelectCover={onSelectCover} />)

    await waitFor(() => expect(screen.getByText('Test Cover')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /test cover/i }))

    expect(onSelectCover).toHaveBeenCalledExactlyOnceWith('cover-1')
  })

  it('the CTA calls onEnterCatalogue', async () => {
    mockedUseRecentlyViewed.mockReturnValue({ recentIds: [], recordView: vi.fn() })
    const onEnterCatalogue = vi.fn()
    render(<Home onEnterCatalogue={onEnterCatalogue} onSelectCover={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: /enter the catalogue/i }))
    expect(onEnterCatalogue).toHaveBeenCalledOnce()
  })
})
