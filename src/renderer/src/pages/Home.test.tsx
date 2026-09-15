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
    daysSinceLastVisit: number | null
    viewedTodayCount: number
    onEnterCatalogue: () => void
    onBrowseByRegion: () => void
    onBrowseByYear: () => void
    onSelectCover: (id: string) => void
  }> = {}
): void {
  render(
    <Home
      session={overrides.session ?? fakeSession()}
      showDailyPrompt={overrides.showDailyPrompt ?? false}
      daysSinceLastVisit={overrides.daysSinceLastVisit ?? null}
      viewedTodayCount={overrides.viewedTodayCount ?? 0}
      onEnterCatalogue={overrides.onEnterCatalogue ?? vi.fn()}
      onBrowseByRegion={overrides.onBrowseByRegion ?? vi.fn()}
      onBrowseByYear={overrides.onBrowseByYear ?? vi.fn()}
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

  // Home redesign, 2026-09-15: replaces the old "Continue where you left
  // off" button (gated to showDailyPrompt only) with an always-visible
  // "Jump back in" tile — same destination (recentIds[0]), but now shown
  // whenever real history exists, regardless of the daily prompt. This
  // deliberately supersedes the old "first-login-of-day prompt" describe
  // block's gating assertions, not an oversight.
  describe('"Jump back in" tile', () => {
    it('shows whenever there is recent history, regardless of the daily prompt', () => {
      mockedUseRecentlyViewed.mockReturnValue({ recentIds: ['cover-5'], recordView: vi.fn() })
      renderHome({ showDailyPrompt: false })
      expect(screen.getByRole('button', { name: /jump back in/i })).toBeInTheDocument()
    })

    it('also shows on the daily-prompt visit when there is recent history', () => {
      mockedUseRecentlyViewed.mockReturnValue({ recentIds: ['cover-5'], recordView: vi.fn() })
      renderHome({ showDailyPrompt: true })
      expect(screen.getByRole('button', { name: /jump back in/i })).toBeInTheDocument()
    })

    it('does not show with no recent history — nothing real to jump back into', () => {
      renderHome()
      expect(screen.queryByRole('button', { name: /jump back in/i })).not.toBeInTheDocument()
    })

    it('calls onSelectCover with the most-recent id when clicked', async () => {
      mockedUseRecentlyViewed.mockReturnValue({
        recentIds: ['cover-5', 'cover-3'],
        recordView: vi.fn()
      })
      const onSelectCover = vi.fn()
      renderHome({ onSelectCover })

      await userEvent.click(screen.getByRole('button', { name: /jump back in/i }))
      expect(onSelectCover).toHaveBeenCalledExactlyOnceWith('cover-5')
    })
  })

  // Home redesign PR 3/3, 2026-09-15: unlike Catalogue/Jump-back-in,
  // these two are always shown regardless of recent-history state -- a
  // brand-new account with nothing viewed yet can still browse by
  // region or year.
  describe('"By region" and "By year" tiles', () => {
    it('always render, even with no recent history', () => {
      renderHome()
      expect(screen.getByRole('button', { name: 'By region' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'By year' })).toBeInTheDocument()
    })

    it('"By region" calls onBrowseByRegion', async () => {
      const onBrowseByRegion = vi.fn()
      renderHome({ onBrowseByRegion })
      await userEvent.click(screen.getByRole('button', { name: 'By region' }))
      expect(onBrowseByRegion).toHaveBeenCalledOnce()
    })

    it('"By year" calls onBrowseByYear', async () => {
      const onBrowseByYear = vi.fn()
      renderHome({ onBrowseByYear })
      await userEvent.click(screen.getByRole('button', { name: 'By year' }))
      expect(onBrowseByYear).toHaveBeenCalledOnce()
    })
  })

  // Stat strip, 2026-09-15: quiet stat row under the greeting. Each stat
  // renders independently -- verified individually and in combination --
  // and the whole strip renders nothing (not an empty row) when every
  // stat is genuinely empty.
  describe('stat strip', () => {
    it('renders nothing at all when every stat is empty — a genuinely new account', () => {
      renderHome({ daysSinceLastVisit: null, viewedTodayCount: 0 })
      expect(screen.queryByText(/last visit/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/viewed today/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/explored/i)).not.toBeInTheDocument()
    })

    it('does not show "Last visit" when daysSinceLastVisit is null or 0', () => {
      renderHome({ daysSinceLastVisit: null })
      expect(screen.queryByText(/last visit/i)).not.toBeInTheDocument()

      renderHome({ daysSinceLastVisit: 0 })
      expect(screen.queryByText(/last visit/i)).not.toBeInTheDocument()
    })

    it('shows "Last visit: yesterday" for 1 day, "N days ago" otherwise', () => {
      renderHome({ daysSinceLastVisit: 1 })
      expect(screen.getByText('Last visit: yesterday')).toBeInTheDocument()

      renderHome({ daysSinceLastVisit: 5 })
      expect(screen.getByText('Last visit: 5 days ago')).toBeInTheDocument()
    })

    it('shows the covers-viewed-today count with correct singular/plural, and nothing at 0', () => {
      renderHome({ viewedTodayCount: 0 })
      expect(screen.queryByText(/viewed today/i)).not.toBeInTheDocument()

      renderHome({ viewedTodayCount: 1 })
      expect(screen.getByText('1 cover viewed today')).toBeInTheDocument()

      renderHome({ viewedTodayCount: 3 })
      expect(screen.getByText('3 covers viewed today')).toBeInTheDocument()
    })

    it('derives distinct circles/years explored from recently-viewed covers, deduped — zero new queries', async () => {
      mockedUseRecentlyViewed.mockReturnValue({
        recentIds: ['cover-1', 'cover-2', 'cover-3'],
        recordView: vi.fn()
      })
      mockedFetchByIds.mockResolvedValue([
        {
          id: 'cover-1',
          giItemName: 'GI 1',
          nameOfCover: 'Cover 1',
          productCategory: null,
          dateOfIssue: '2020-01-01',
          imageFile: 'a.jpg',
          postalCircleId: 'circle-tn',
          postalCircleName: 'Tamil Nadu'
        },
        {
          id: 'cover-2',
          giItemName: 'GI 2',
          nameOfCover: 'Cover 2',
          productCategory: null,
          // Same circle as cover-1, different year -- circle count must
          // dedupe to 1, year count must still be 2.
          dateOfIssue: '2021-06-15',
          imageFile: 'b.jpg',
          postalCircleId: 'circle-tn',
          postalCircleName: 'Tamil Nadu'
        },
        {
          id: 'cover-3',
          giItemName: 'GI 3',
          nameOfCover: 'Cover 3',
          productCategory: null,
          // Same year as cover-1, different circle.
          dateOfIssue: '2020-11-02',
          imageFile: 'c.jpg',
          postalCircleId: 'circle-ka',
          postalCircleName: 'Karnataka'
        }
      ])
      renderHome()

      await waitFor(() => expect(screen.getByText('2 circles explored recently')).toBeInTheDocument())
      expect(screen.getByText('2 years explored recently')).toBeInTheDocument()
    })

    it('shows all four stats together when all are present', async () => {
      mockedUseRecentlyViewed.mockReturnValue({ recentIds: ['cover-1'], recordView: vi.fn() })
      mockedFetchByIds.mockResolvedValue([
        {
          id: 'cover-1',
          giItemName: 'GI 1',
          nameOfCover: 'Cover 1',
          productCategory: null,
          dateOfIssue: '2020-01-01',
          imageFile: 'a.jpg',
          postalCircleId: 'circle-tn',
          postalCircleName: 'Tamil Nadu'
        }
      ])
      renderHome({ daysSinceLastVisit: 2, viewedTodayCount: 1 })

      expect(screen.getByText('Last visit: 2 days ago')).toBeInTheDocument()
      expect(screen.getByText('1 cover viewed today')).toBeInTheDocument()
      await waitFor(() => expect(screen.getByText('1 circle explored recently')).toBeInTheDocument())
      expect(screen.getByText('1 year explored recently')).toBeInTheDocument()
    })
  })
})
