import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Sidebar from './Sidebar'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signOut: vi.fn() } }
}))

const mockedSignOut = vi.mocked(supabase.auth.signOut)

beforeEach(() => {
  mockedSignOut.mockReset()
})

function renderSidebar(
  overrides: Partial<{
    currentScreen: 'home' | 'catalogue' | 'settings'
    onNavigate: (screen: 'home' | 'catalogue' | 'settings') => void
    isShortcutsOpen: boolean
    onOpenShortcuts: () => void
  }> = {}
): void {
  render(
    <Sidebar
      currentScreen={overrides.currentScreen ?? 'home'}
      onNavigate={overrides.onNavigate ?? vi.fn()}
      isShortcutsOpen={overrides.isShortcutsOpen ?? false}
      onOpenShortcuts={overrides.onOpenShortcuts ?? vi.fn()}
    />
  )
}

describe('Sidebar', () => {
  it('renders the working nav entries, Keyboard Shortcuts, and the coming-soon placeholders', () => {
    renderSidebar()

    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Catalogue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keyboard Shortcuts' })).toBeInTheDocument()
    expect(screen.getByText('Collection Manager — Coming soon')).toBeInTheDocument()
    expect(screen.getByText('Wish List — Coming soon')).toBeInTheDocument()
    expect(screen.getByText('My Progress — Coming soon')).toBeInTheDocument()
  })

  it('calls onNavigate with the right screen for a working entry', async () => {
    const onNavigate = vi.fn()
    renderSidebar({ onNavigate })

    await userEvent.click(screen.getByRole('button', { name: 'Catalogue' }))
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('catalogue')
  })

  it('coming-soon placeholders are genuinely inert — plain text, not clickable elements', () => {
    renderSidebar()
    // T-33: zero interactivity, not just visually greyed — these are
    // spans, not buttons, so there's no click target to even test against.
    expect(screen.queryByRole('button', { name: /collection manager/i })).not.toBeInTheDocument()
  })

  it('highlights the current screen via aria-current', () => {
    renderSidebar({ currentScreen: 'catalogue' })

    expect(screen.getByRole('button', { name: 'Catalogue' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('the Keyboard Shortcuts row highlights instead of the real screen when the modal is open', () => {
    renderSidebar({ currentScreen: 'catalogue', isShortcutsOpen: true })

    expect(screen.getByRole('button', { name: 'Keyboard Shortcuts' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('button', { name: 'Catalogue' })).not.toHaveAttribute('aria-current')
  })

  it('calls onOpenShortcuts when the Keyboard Shortcuts row is clicked', async () => {
    const onOpenShortcuts = vi.fn()
    renderSidebar({ onOpenShortcuts })

    await userEvent.click(screen.getByRole('button', { name: 'Keyboard Shortcuts' }))
    expect(onOpenShortcuts).toHaveBeenCalledOnce()
  })

  // FR-25: Log out now requires confirmation — it must NOT end the session
  // on the first click, only after confirming. This replaces the old
  // AppHeader.test.tsx assumption that a single click called signOut().
  it('Log out requires confirmation before actually signing out', async () => {
    renderSidebar()

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(mockedSignOut).not.toHaveBeenCalled()

    const dialog = screen.getByRole('dialog', { name: 'Log out?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Log out' }))
    expect(mockedSignOut).toHaveBeenCalledOnce()
  })

  it('Cancel on the logout-confirm dialog leaves the session untouched', async () => {
    renderSidebar()

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    const dialog = screen.getByRole('dialog', { name: 'Log out?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(mockedSignOut).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Escape closes the logout-confirm dialog without signing out', async () => {
    renderSidebar()

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(mockedSignOut).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
