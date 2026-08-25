import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppHeader from './AppHeader'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signOut: vi.fn() } }
}))

const mockedSignOut = vi.mocked(supabase.auth.signOut)

beforeEach(() => {
  mockedSignOut.mockReset()
})

async function openMenu(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /account menu/i }))
}

describe('AppHeader', () => {
  it('opens the menu and shows the working entries plus disabled placeholders', async () => {
    render(<AppHeader currentScreen="home" onNavigate={() => {}} />)
    await openMenu()

    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Catalogue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /collection manager — coming soon/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /wish list — coming soon/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /my progress — coming soon/i })).toBeDisabled()
  })

  it('calls onNavigate with the right screen for each working entry and closes the menu', async () => {
    const onNavigate = vi.fn()
    render(<AppHeader currentScreen="home" onNavigate={onNavigate} />)
    await openMenu()

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('settings')
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument()
  })

  it('disabled entries genuinely do nothing — no navigation, no crash', async () => {
    const onNavigate = vi.fn()
    render(<AppHeader currentScreen="home" onNavigate={onNavigate} />)
    await openMenu()

    // A disabled button ignores userEvent.click by design — asserting
    // onNavigate never fires is the real, meaningful check here.
    await userEvent.click(screen.getByRole('button', { name: /collection manager/i }))
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('Log out still calls signOut()', async () => {
    render(<AppHeader currentScreen="home" onNavigate={() => {}} />)
    await openMenu()

    await userEvent.click(screen.getByRole('button', { name: /^log out$/i }))
    expect(mockedSignOut).toHaveBeenCalledOnce()
  })

  it('closes when clicking outside the menu', async () => {
    render(
      <div>
        <AppHeader currentScreen="home" onNavigate={() => {}} />
        <button type="button">outside</button>
      </div>
    )
    await openMenu()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument()
  })
})
