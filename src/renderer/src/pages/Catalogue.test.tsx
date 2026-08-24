import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Catalogue from './Catalogue'
import {
  downloadCoverImageUrl,
  fetchCataloguePage,
  fetchCatalogueFacets,
  type VerifiedCover
} from '../lib/covers'

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

const emptyFacets = { productCategories: [], postalCircles: [], years: [] }

beforeEach(() => {
  mockedFetchPage.mockReset()
  mockedFetchFacets.mockReset()
  mockedDownload.mockReset()
  mockedDownload.mockResolvedValue('blob:mock-url')
  mockedFetchFacets.mockResolvedValue(emptyFacets)
})

function cover(overrides: Partial<VerifiedCover> = {}): VerifiedCover {
  return {
    id: 'cover-123',
    giItemName: 'Test Item GI Name',
    nameOfCover: 'Test Item',
    productCategory: null,
    dateOfIssue: null,
    imageFile: 'some/path.jpg',
    postalCircleId: null,
    postalCircleName: null,
    ...overrides
  }
}

describe('Catalogue', () => {
  // Per docs/UX-Design-Reference.md: loading is seen on every single
  // session (unlike empty/error, seen rarely) — the shimmer skeleton
  // (T-13) replaces the old plain "Loading…" text with the design
  // reference's own dedicated Loading-State-Grid pattern (Midday
  // skeleton), still deliberately restrained, no joke.
  it('shows a skeleton grid while loading — no joke, unlike the rarely-seen states', () => {
    mockedFetchPage.mockReturnValue(new Promise(() => {})) // never resolves
    render(<Catalogue onSelectCover={noop} />)
    expect(screen.getByRole('status', { name: /loading the catalogue/i })).toBeInTheDocument()
  })

  // The genuinely-empty-catalogue case is a real, distinct first-run
  // experience, deliberately tested here rather than live, since the real
  // database has real Verified covers today.
  it('shows courteous empty-catalogue copy that both explains why and sets an expectation — distinct from the error state', async () => {
    mockedFetchPage.mockResolvedValue({ covers: [], totalCount: 0 })
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText(/freshly dusted/i)).toBeInTheDocument())
    expect(screen.getByText(/check back soon/i)).toBeInTheDocument()
    expect(screen.queryByText(/didn't go to plan/i)).not.toBeInTheDocument()
  })

  it('shows a courteous, distinct error state with a real retry action — not confused with an empty catalogue', async () => {
    mockedFetchPage.mockRejectedValue(new Error('network error'))
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText(/didn't go to plan/i)).toBeInTheDocument())
    expect(screen.queryByText(/freshly dusted/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('retry button actually re-runs the query, not just cosmetic — recovers into the ready state on success', async () => {
    mockedFetchPage.mockRejectedValueOnce(new Error('network error'))
    mockedFetchPage.mockResolvedValueOnce({ covers: [], totalCount: 0 })
    render(<Catalogue onSelectCover={noop} />)
    await waitFor(() => expect(screen.getByText(/didn't go to plan/i)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() => expect(screen.getByText(/freshly dusted/i)).toBeInTheDocument())
    expect(mockedFetchPage).toHaveBeenCalledTimes(2)
  })

  it("clicking a card calls onSelectCover with that cover's real id — not just decorative", async () => {
    mockedFetchPage.mockResolvedValue({ covers: [cover()], totalCount: 1 })
    const onSelectCover = vi.fn()
    render(<Catalogue onSelectCover={onSelectCover} />)

    await waitFor(() => expect(screen.getByText('Test Item')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /test item/i }))

    expect(onSelectCover).toHaveBeenCalledExactlyOnceWith('cover-123')
  })

  it('shows a courteous fallback, not a stuck "Loading…" forever, when a thumbnail download genuinely fails', async () => {
    mockedFetchPage.mockResolvedValue({ covers: [cover()], totalCount: 1 })
    mockedDownload.mockRejectedValue(new Error('storage error'))
    render(<Catalogue onSelectCover={noop} />)

    await waitFor(() => expect(screen.getByText(/couldn't load this photo/i)).toBeInTheDocument())
  })
})
