import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileSection from './ProfileSection'
import { fetchDisplayName, updateDisplayName } from '../lib/profile'

vi.mock('../lib/profile', () => ({
  fetchDisplayName: vi.fn(),
  updateDisplayName: vi.fn()
}))

const mockedFetch = vi.mocked(fetchDisplayName)
const mockedUpdate = vi.mocked(updateDisplayName)

beforeEach(() => {
  mockedFetch.mockReset()
  mockedUpdate.mockReset()
})

describe('ProfileSection', () => {
  it('shows the real email immediately and the real name once it loads', async () => {
    mockedFetch.mockResolvedValue('Priya Sharma')
    render(<ProfileSection userId="collector-1" email="priya@example.test" />)

    expect(screen.getByText('priya@example.test')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Priya Sharma')).toBeInTheDocument())
    expect(mockedFetch).toHaveBeenCalledExactlyOnceWith('collector-1')
  })

  it("shows courteous fallback copy when no name has been set yet — not blank, not an error", async () => {
    mockedFetch.mockResolvedValue(null)
    render(<ProfileSection userId="collector-1" email="priya@example.test" />)

    await waitFor(() => expect(screen.getByText('Not set yet')).toBeInTheDocument())
  })

  it('falls back to the same courteous copy on a genuine fetch failure, rather than blocking the rest of Settings', async () => {
    mockedFetch.mockRejectedValue(new Error('network error'))
    render(<ProfileSection userId="collector-1" email="priya@example.test" />)

    await waitFor(() => expect(screen.getByText('Not set yet')).toBeInTheDocument())
  })

  it('editing pre-fills the current name, saves it, and returns to the view state', async () => {
    mockedFetch.mockResolvedValue('Priya Sharma')
    mockedUpdate.mockResolvedValue(undefined)
    render(<ProfileSection userId="collector-1" email="priya@example.test" />)
    await waitFor(() => expect(screen.getByText('Priya Sharma')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /edit name/i }))
    const input = screen.getByLabelText('Name')
    expect(input).toHaveValue('Priya Sharma')

    await userEvent.clear(input)
    await userEvent.type(input, 'Priya S.')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledExactlyOnceWith('collector-1', 'Priya S.')
    )
    expect(screen.getByText('Priya S.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })

  it('trims whitespace before saving', async () => {
    mockedFetch.mockResolvedValue(null)
    mockedUpdate.mockResolvedValue(undefined)
    render(<ProfileSection userId="collector-1" email="priya@example.test" />)
    await waitFor(() => expect(screen.getByText('Not set yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /edit name/i }))
    await userEvent.type(screen.getByLabelText('Name'), '  Priya Sharma  ')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledExactlyOnceWith('collector-1', 'Priya Sharma')
    )
  })

  it('clearing the name entirely saves and displays as unset, not an empty string', async () => {
    mockedFetch.mockResolvedValue('Priya Sharma')
    mockedUpdate.mockResolvedValue(undefined)
    render(<ProfileSection userId="collector-1" email="priya@example.test" />)
    await waitFor(() => expect(screen.getByText('Priya Sharma')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /edit name/i }))
    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalledExactlyOnceWith('collector-1', ''))
    expect(screen.getByText('Not set yet')).toBeInTheDocument()
  })

  it('shows a real error and stays in editing state on a genuine save failure', async () => {
    mockedFetch.mockResolvedValue(null)
    mockedUpdate.mockRejectedValue(new Error('permission denied'))
    render(<ProfileSection userId="collector-1" email="priya@example.test" />)
    await waitFor(() => expect(screen.getByText('Not set yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /edit name/i }))
    await userEvent.type(screen.getByLabelText('Name'), 'Priya Sharma')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() =>
      expect(screen.getByText(/didn't work — give it another try/i)).toBeInTheDocument()
    )
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('Cancel discards the draft without saving', async () => {
    mockedFetch.mockResolvedValue('Priya Sharma')
    render(<ProfileSection userId="collector-1" email="priya@example.test" />)
    await waitFor(() => expect(screen.getByText('Priya Sharma')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /edit name/i }))
    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.type(screen.getByLabelText('Name'), 'Someone Else')
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(mockedUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
  })

  it('the Edit name button is disabled while the name is still loading', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}))
    render(<ProfileSection userId="collector-1" email="priya@example.test" />)
    expect(screen.getByRole('button', { name: /edit name/i })).toBeDisabled()
  })
})
