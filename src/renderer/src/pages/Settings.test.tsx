import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Settings from './Settings'
import { version } from '../../../../package.json'

function renderSettings(
  themePreference: 'system' | 'light' | 'dark' = 'system'
): { onThemePreferenceChange: ReturnType<typeof vi.fn> } {
  const onThemePreferenceChange = vi.fn()
  render(<Settings themePreference={themePreference} onThemePreferenceChange={onThemePreferenceChange} />)
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
