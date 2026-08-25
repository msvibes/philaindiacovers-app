import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Settings from './Settings'

// Deliberately minimal — T-29 only needs Settings to exist and be
// reachable. Its real content belongs to T-27/T-30, not tested here since
// it isn't built here.
describe('Settings', () => {
  it('renders the placeholder screen', () => {
    render(<Settings />)
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByText(/more settings coming soon/i)).toBeInTheDocument()
  })
})
