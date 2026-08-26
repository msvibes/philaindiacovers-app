import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ShortcutsModal from './ShortcutsModal'

describe('ShortcutsModal', () => {
  it('lists only the real, currently-true shortcuts — no Cmd/Ctrl+K row', () => {
    render(<ShortcutsModal onClose={() => {}} />)

    expect(screen.getByText('Next / previous cover (detail view)')).toBeInTheDocument()
    expect(screen.getByText('Close any dialog')).toBeInTheDocument()
    expect(screen.getByText('Show shortcuts')).toBeInTheDocument()
    // No command palette exists in this app (T-23/US-52, unstarted) — the
    // prototype's own reference list includes this row, deliberately
    // dropped here since listing it would describe a feature that isn't
    // built.
    expect(screen.queryByText(/command palette/i)).not.toBeInTheDocument()
  })

  it('closes via the "Got it" button', async () => {
    const onClose = vi.fn()
    render(<ShortcutsModal onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: /got it/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<ShortcutsModal onClose={onClose} />)

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
