import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Catalogue from './Catalogue'
import { fetchVerifiedCovers } from '../lib/covers'

vi.mock('../lib/covers', async () => {
  const actual = await vi.importActual<typeof import('../lib/covers')>('../lib/covers')
  return {
    ...actual,
    fetchVerifiedCovers: vi.fn(),
    downloadCoverImageUrl: vi.fn()
  }
})

const mockedFetch = vi.mocked(fetchVerifiedCovers)

beforeEach(() => {
  mockedFetch.mockReset()
})

describe('Catalogue', () => {
  // Per docs/UX-Design-Reference.md: loading is seen on every single
  // session (unlike empty/error, seen rarely), so it stays clean and
  // simple, no jokes — restraint here specifically avoids a joke wearing
  // thin through repetition.
  it('shows a clean, simple loading state — no joke, unlike the rarely-seen states', () => {
    mockedFetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<Catalogue />)
    expect(screen.getByText(/loading the catalogue/i)).toBeInTheDocument()
  })

  // The genuinely-empty-catalogue case is a real, distinct first-run
  // experience — deliberately tested here rather than live, since the real
  // database currently has one real Verified cover and manufacturing a
  // true zero-covers state live would mean disrupting real data.
  it('shows courteous empty-catalogue copy that both explains why and sets an expectation — distinct from the error state', async () => {
    mockedFetch.mockResolvedValue([])
    render(<Catalogue />)
    await waitFor(() => expect(screen.getByText(/freshly dusted/i)).toBeInTheDocument())
    expect(screen.getByText(/check back soon/i)).toBeInTheDocument()
    expect(screen.queryByText(/didn't go to plan/i)).not.toBeInTheDocument()
  })

  it('shows a courteous, distinct error state with a real retry action — not confused with an empty catalogue', async () => {
    mockedFetch.mockRejectedValue(new Error('network error'))
    render(<Catalogue />)
    await waitFor(() => expect(screen.getByText(/didn't go to plan/i)).toBeInTheDocument())
    expect(screen.queryByText(/freshly dusted/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('retry button actually re-runs the query, not just cosmetic — recovers into the ready state on success', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network error'))
    mockedFetch.mockResolvedValueOnce([])
    render(<Catalogue />)
    await waitFor(() => expect(screen.getByText(/didn't go to plan/i)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() => expect(screen.getByText(/freshly dusted/i)).toBeInTheDocument())
    expect(mockedFetch).toHaveBeenCalledTimes(2)
  })
})
