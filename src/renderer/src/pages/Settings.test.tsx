import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Settings from './Settings'
import { version } from '../../../../package.json'

// T-27: real content, replacing T-29's placeholder — this is the first
// real coverage for this screen.
describe('Settings', () => {
  it('renders the real About content, including the live package.json version', () => {
    render(<Settings />)
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByText(version)).toBeInTheDocument()
    expect(screen.getByText('Manjunath Shanmugam')).toBeInTheDocument()
    expect(screen.getByText('Krutim Logic, Bangalore, India')).toBeInTheDocument()
    expect(screen.getByText('krutimlogic@gmail.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /github\.com\/msvibes\/philaindiacovers-app/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /report an issue/i })).toBeInTheDocument()
  })

  it('opens and closes the Disclaimer from the View Disclaimer link', async () => {
    render(<Settings />)
    await userEvent.click(screen.getByRole('button', { name: /view disclaimer/i }))
    expect(screen.getByText(/data accuracy & independence disclaimer/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^close$/i }))
    expect(screen.queryByText(/data accuracy & independence disclaimer/i)).not.toBeInTheDocument()
  })
})
