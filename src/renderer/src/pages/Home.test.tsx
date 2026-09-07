import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'
import { countCatalogueMatches, downloadCoverImageUrl, fetchCoversByIds } from '../lib/covers'
import { fetchDisplayName } from '../lib/profile'
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

vi.mock('../lib/profile', async () => {
  const actual = await vi.importActual<typeof import('../lib/profile')>('../lib/profile')
  return {
    ...actual,
    fetchDisplayName: vi.fn()
  }
})

vi.mock('../lib/useRecentlyViewed', () => ({
  useRecentlyViewed: vi.fn()
}))

const mockedCount = vi.mocked(countCatalogueMatches)
const mockedFetchByIds = vi.mocked(fetchCoversByIds)
const mockedDownload = vi.mocked(downloadCoverImageUrl)
const mockedFetchDisplayName = vi.mocked(fetchDisplayName)
const mockedUseRecentlyViewed = vi.mocked(useRecentlyViewed)

function fakeSession(email = 'priya@example.test'): Session {
  return {
    user: { id: 'collector-1', email, user_metadata: {} }
  } as unknown as Session
}

beforeEach(() => {
  mockedCount.mockReset()
  mockedFetchByIds.mockReset()
  mockedDownload.mockReset()
  mockedFetchDisplayName.mockReset()
  mockedUseRecentlyViewed.mockReset()
  mockedDownload.mockResolvedValue('blob:mock-url')
  mockedCount.mockResolvedValue(286)
  mockedFetchDisplayName.mockResolvedValue(null)
  // A sensible default so any test that sets a non-empty recentIds
  // without caring about the hydrated cards themselves (e.g. the
  // "Continue where you left off" tests below, which only care about
  // recentIds[0] existing) doesn't crash on an unresolved mock.
  mockedFetchByIds.mockResolvedValue([])
  mockedUseRecentlyViewed.mockReturnValue({ recentIds: [], recordView: vi.fn() })
})

function renderHome(
  overrides: Partial<{
    session: Session
    showDailyPrompt: boolean
    onEnterCatalogue: () => void
    onSelectCover: (id: string) => void
  }> = {}
): void {
  render(
    <Home
      session={overrides.session ?? fakeSession()}
      showDailyPrompt={overrides.showDailyPrompt ?? false}
      onEnterCatalogue={overrides.onEnterCatalogue ?? vi.fn()}
      onSelectCover={overrides.onSelectCover ?? vi.fn()}
    />
  )
}

describe('Home', () => {
  it('shows the real live verified count, not hardcoded copy — FR-01', async () => {
    renderHome()
    await waitFor(() => expect(mockedCount).toHaveBeenCalledExactlyOnceWith({}))
    expect(screen.getByText('286 verified covers ready to browse.')).toBeInTheDocument()
  })

  it('shows the courteous empty state when nothing has been viewed yet', async () => {
    renderHome()
    await waitFor(() =>
      expect(screen.getByText('Covers you view will show up here.')).toBeInTheDocument()
    )
    expect(mockedFetchByIds).not.toHaveBeenCalled()
  })

  it('hydrates recentIds into real cards via fetchCoversByIds', async () => {
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
    renderHome()

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
    renderHome({ onSelectCover })

    await waitFor(() => expect(screen.getByText('Test Cover')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /test cover/i }))

    expect(onSelectCover).toHaveBeenCalledExactlyOnceWith('cover-1')
  })

  it('the CTA calls onEnterCatalogue', async () => {
    const onEnterCatalogue = vi.fn()
    renderHome({ onEnterCatalogue })

    await userEvent.click(screen.getByRole('button', { name: /enter the catalogue/i }))
    expect(onEnterCatalogue).toHaveBeenCalledOnce()
  })

  describe('greeting (Home screen personalization)', () => {
    it('shows "Hi, [Name]!" using the real display_name once it loads', async () => {
      mockedFetchDisplayName.mockResolvedValue('Priya Sharma')
      renderHome()
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Hi, Priya Sharma!' })).toBeInTheDocument()
      )
    })

    it("falls back to the email's local part when no name has been set yet", async () => {
      mockedFetchDisplayName.mockResolvedValue(null)
      renderHome({ session: fakeSession('priya.sharma@example.test') })
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Hi, priya.sharma!' })).toBeInTheDocument()
      )
    })

    it('shows the daily prompt heading instead of the greeting when showDailyPrompt is true', async () => {
      mockedFetchDisplayName.mockResolvedValue('Priya Sharma')
      renderHome({ showDailyPrompt: true })
      await waitFor(() =>
        expect(
          screen.getByRole('heading', { name: 'What would you like to do today?' })
        ).toBeInTheDocument()
      )
      expect(screen.queryByRole('heading', { name: /^hi,/i })).not.toBeInTheDocument()
    })
  })

  describe('first-login-of-day prompt', () => {
    it('shows "Continue where you left off" alongside the prompt when there is recent history', () => {
      mockedUseRecentlyViewed.mockReturnValue({ recentIds: ['cover-5'], recordView: vi.fn() })
      renderHome({ showDailyPrompt: true })
      expect(
        screen.getByRole('button', { name: /continue where you left off/i })
      ).toBeInTheDocument()
    })

    it('does not show "Continue where you left off" with no recent history — nothing real to continue with', () => {
      renderHome({ showDailyPrompt: true })
      expect(
        screen.queryByRole('button', { name: /continue where you left off/i })
      ).not.toBeInTheDocument()
    })

    it('does not show the shortcut on a normal (non-first-of-day) visit even with history', () => {
      mockedUseRecentlyViewed.mockReturnValue({ recentIds: ['cover-5'], recordView: vi.fn() })
      renderHome({ showDailyPrompt: false })
      expect(
        screen.queryByRole('button', { name: /continue where you left off/i })
      ).not.toBeInTheDocument()
    })

    it('"Continue where you left off" calls onSelectCover with the most-recent id', async () => {
      mockedUseRecentlyViewed.mockReturnValue({
        recentIds: ['cover-5', 'cover-3'],
        recordView: vi.fn()
      })
      const onSelectCover = vi.fn()
      renderHome({ showDailyPrompt: true, onSelectCover })

      await userEvent.click(screen.getByRole('button', { name: /continue where you left off/i }))
      expect(onSelectCover).toHaveBeenCalledExactlyOnceWith('cover-5')
    })
  })
})
