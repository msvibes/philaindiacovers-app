import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings'
import { version } from '../../../../package.json'
import { fetchDisplayName } from '../lib/profile'

// ProfileSection (rendered by Settings) calls these for real otherwise --
// mocked the same way every other Supabase-backed page/component in this
// suite is, not because Settings.test.tsx itself is testing profile
// fetch/save behavior (that's ProfileSection.test.tsx's job).
vi.mock('../lib/profile', () => ({
  fetchDisplayName: vi.fn(),
  updateDisplayName: vi.fn()
}))

const mockedFetchDisplayName = vi.mocked(fetchDisplayName)

beforeEach(() => {
  mockedFetchDisplayName.mockReset()
  mockedFetchDisplayName.mockResolvedValue(null)
})

function renderSettings(
  themePreference: 'system' | 'light' | 'dark' = 'system',
  email: string | undefined = 'signed-in-collector@example.test'
): { onThemePreferenceChange: ReturnType<typeof vi.fn> } {
  const onThemePreferenceChange = vi.fn()
  render(
    <Settings
      userId="collector-1"
      email={email}
      themePreference={themePreference}
      onThemePreferenceChange={onThemePreferenceChange}
    />
  )
  return { onThemePreferenceChange }
}

// T-27: real content, replacing T-29's placeholder — this is the first
// real coverage for this screen.
describe('Settings', () => {
  it('renders the real About content, including the live package.json version', () => {
    renderSettings()
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByText(version)).toBeInTheDocument()
    expect(screen.getByText('Manjunath Shanmugam')).toBeInTheDocument()
    expect(screen.getByText('Krutim Logic, Bangalore, India')).toBeInTheDocument()
    expect(screen.getByText('krutimlogic@gmail.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /github\.com\/msvibes\/philaindiacovers-app/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /report an issue/i })).toBeInTheDocument()
  })

  // KAN-41 (US-30/FR-33), view-only slice.
  it('shows a Profile section with the signed-in user’s real email, distinct from the About section’s own contact email', () => {
    renderSettings('system', 'signed-in-collector@example.test')
    expect(screen.getByRole('heading', { name: /^profile$/i })).toBeInTheDocument()
    expect(screen.getByText('signed-in-collector@example.test')).toBeInTheDocument()
    // Both the real developer-contact email and the signed-in user's own
    // email are on screen at once — asserting both stay distinct, not
    // colliding into one node or overwriting each other.
    expect(screen.getByText('krutimlogic@gmail.com')).toBeInTheDocument()
  })

  it('falls back to a defensive label when email is somehow undefined', () => {
    // Deliberately not routed through renderSettings() -- its own
    // `email` parameter defaults on exactly `undefined`, which would
    // silently swallow this test's whole point (JS default-parameter
    // semantics, not a Settings.tsx bug).
    render(
      <Settings
        userId="collector-1"
        email={undefined}
        themePreference="system"
        onThemePreferenceChange={vi.fn()}
      />
    )
    expect(screen.getByText('Not available')).toBeInTheDocument()
  })

  it('opens and closes the Disclaimer from the View Disclaimer link', async () => {
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: /view disclaimer/i }))
    expect(screen.getByText(/data accuracy & independence disclaimer/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^close$/i }))
    expect(screen.queryByText(/data accuracy & independence disclaimer/i)).not.toBeInTheDocument()
  })

  // T-30 (KAN-57): the Appearance section previous T-27 comments left a
  // deliberate placeholder for.
  it('shows an Appearance section with the current preference pressed', () => {
    renderSettings('dark')
    expect(screen.getByRole('heading', { name: /appearance/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onThemePreferenceChange when a different option is clicked', async () => {
    const { onThemePreferenceChange } = renderSettings('system')
    await userEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(onThemePreferenceChange).toHaveBeenCalledExactlyOnceWith('light')
  })
})
