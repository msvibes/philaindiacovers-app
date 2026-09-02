import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ToastProvider from './ToastProvider'
import { useToast } from '../lib/ToastContext'

function TriggerButton({ message }: { message: string }): React.JSX.Element {
  const { showToast } = useToast()
  return (
    <button type="button" onClick={() => showToast(message)}>
      Trigger
    </button>
  )
}

describe('ToastProvider / useToast', () => {
  it('useToast() throws when called outside a ToastProvider — a real, catchable programmer error, not a silent no-op', () => {
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/)
  })

  it('shows a toast with the given message when showToast is called', async () => {
    render(
      <ToastProvider>
        <TriggerButton message="Filters applied" />
      </ToastProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    expect(await screen.findByText('Filters applied')).toBeInTheDocument()
  })

  it('stacks multiple toasts rather than replacing the previous one', async () => {
    function TwoTriggers(): React.JSX.Element {
      const { showToast } = useToast()
      return (
        <>
          <button type="button" onClick={() => showToast('First')}>
            One
          </button>
          <button type="button" onClick={() => showToast('Second')}>
            Two
          </button>
        </>
      )
    }
    render(
      <ToastProvider>
        <TwoTriggers />
      </ToastProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: 'One' }))
    await userEvent.click(screen.getByRole('button', { name: 'Two' }))
    expect(await screen.findByText('First')).toBeInTheDocument()
    expect(await screen.findByText('Second')).toBeInTheDocument()
  })

  // Real timing (2200ms visible + 250ms fade), matching the reference
  // prototype exactly (docs/design/app-prototype-v3-full.html's own
  // showToast) — not faked, so this genuinely proves the toast removes
  // itself, not just that the timers were told to fire.
  it(
    'auto-dismisses and removes itself from the DOM without user action',
    async () => {
      render(
        <ToastProvider>
          <TriggerButton message="Back online — catalogue synced" />
        </ToastProvider>
      )
      await userEvent.click(screen.getByRole('button', { name: 'Trigger' }))
      const toast = await screen.findByText('Back online — catalogue synced')

      await waitForElementToBeRemoved(toast, { timeout: 3000 })
      expect(screen.queryByText('Back online — catalogue synced')).not.toBeInTheDocument()
    },
    5000
  )

  it('flips to its visible state on the next frame, for the CSS transition to actually animate', async () => {
    render(
      <ToastProvider>
        <TriggerButton message="Filters applied" />
      </ToastProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    const toast = await screen.findByText('Filters applied')
    await waitFor(() => expect(toast.className).toContain('opacity-100'))
  })
})
