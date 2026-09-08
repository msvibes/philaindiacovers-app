import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IndiaMapLegend from './IndiaMapLegend'

describe('IndiaMapLegend', () => {
  it('shows a "no covers yet" swatch and label, distinct from the shading ramp', () => {
    render(<IndiaMapLegend />)
    expect(screen.getByText('No covers yet')).toBeInTheDocument()
  })

  it('shows the relative "Fewer" -> "More" range, never a real number', () => {
    // Deliberate: shading is relative to the current max, so a printed
    // number here would be misleading -- real counts stay the tooltip's
    // job. This asserts the legend text contains no digit at all.
    render(<IndiaMapLegend />)
    expect(screen.getByText('Fewer')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
    const legend = screen.getByLabelText('Map shading legend')
    expect(legend.textContent).not.toMatch(/\d/)
  })

  it('renders exactly 5 swatches -- the zero-cover swatch plus the 4 ramp levels', () => {
    render(<IndiaMapLegend />)
    const legend = screen.getByLabelText('Map shading legend')
    const swatches = legend.querySelectorAll('span[style*="background-color"]')
    expect(swatches).toHaveLength(5)
  })
})
