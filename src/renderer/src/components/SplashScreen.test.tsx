import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SplashScreen from './SplashScreen'

describe('SplashScreen', () => {
  it('shows the real title and the prototype-sourced subtext', () => {
    render(<SplashScreen />)

    expect(screen.getByRole('heading', { name: 'PhilaIndiaCovers' })).toBeInTheDocument()
    // The literal prototype copy (app-prototype-v3-full.html), not the
    // addendum's own shortened paraphrase ("Connecting...") of the same
    // text — the prototype is the authoritative source here.
    expect(screen.getByText('Connecting to the catalogue…')).toBeInTheDocument()
  })

  it('renders exactly three staggered bouncing dots', () => {
    const { container } = render(<SplashScreen />)

    const dots = container.querySelectorAll('.animate-bounce-dot')
    expect(dots).toHaveLength(3)
    expect(dots[0]).not.toHaveAttribute('style')
    expect(dots[1]).toHaveStyle({ animationDelay: '0.15s' })
    expect(dots[2]).toHaveStyle({ animationDelay: '0.3s' })
  })
})
