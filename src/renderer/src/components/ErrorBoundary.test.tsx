import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

function ThrowingChild(): React.JSX.Element {
  throw new Error('deliberate test crash')
}

describe('ErrorBoundary', () => {
  it('renders the real fallback UI instead of the crashed child, not a blank screen', () => {
    // React logs the caught error to the console by design — suppress it
    // here so the test output stays clean; componentDidCatch's own
    // console.error is deliberate production behavior, not a bug to fix.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('Reload calls window.location.reload', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reloadSpy = vi.fn()
    // jsdom's window.location isn't directly spy-able — replace it with a
    // minimal mock object for this one assertion.
    const originalLocation = window.location
    Object.defineProperty(window, 'location', { value: { reload: reloadSpy }, writable: true })

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )
    await userEvent.click(screen.getByRole('button', { name: /reload/i }))
    expect(reloadSpy).toHaveBeenCalledOnce()

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
    consoleSpy.mockRestore()
  })

  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
  })
})
