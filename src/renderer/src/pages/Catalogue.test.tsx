import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

describe('Catalogue', () => {
  it('shows a courteous loading state before the query resolves', () => {
    mockedFetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<Catalogue />)
    expect(screen.getByText(/dusting off the covers/i)).toBeInTheDocument()
  })

  // The genuinely-empty-catalogue case is a real, distinct first-run
  // experience — deliberately tested here rather than live, since the real
  // database currently has one real Verified cover and manufacturing a
  // true zero-covers state live would mean disrupting real data.
  it('shows courteous empty-catalogue copy — distinct from the error state — when zero covers are verified', async () => {
    mockedFetch.mockResolvedValue([])
    render(<Catalogue />)
    await waitFor(() => expect(screen.getByText(/freshly dusted/i)).toBeInTheDocument())
    expect(screen.queryByText(/didn't go to plan/i)).not.toBeInTheDocument()
  })

  it('shows a courteous, distinct error state when the query fails — not confused with an empty catalogue', async () => {
    mockedFetch.mockRejectedValue(new Error('network error'))
    render(<Catalogue />)
    await waitFor(() => expect(screen.getByText(/didn't go to plan/i)).toBeInTheDocument())
    expect(screen.queryByText(/freshly dusted/i)).not.toBeInTheDocument()
  })
})
