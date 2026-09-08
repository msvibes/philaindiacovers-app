import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IndiaMap from './IndiaMap'

// First SVG-interactive component in this codebase (no react-simple-maps
// precedent exists yet) -- mirrors YearTimeline.test.tsx's approach of
// querying by test-id/role rather than asserting on the mapping library's
// own internal SVG structure. PR 1 only renders shapes (no shading/click
// yet), so these tests only assert that every real region renders once,
// not any interaction.
describe('IndiaMap', () => {
  it('renders all 36 geoBoundaries regions as their own path, keyed by real shapeName', () => {
    render(<IndiaMap />)
    // A representative spread across direct-match, shared-circle, and
    // diacritic-bearing region names -- not all 36 (that's
    // postalCircleStates.test.ts's job), just confirming the real TopoJSON
    // data actually reaches the rendered SVG.
    expect(screen.getByTestId('india-map-region-Odisha')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Goa')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Ladākh')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Jammu and Kashmīr')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Sikkim')).toBeInTheDocument()
  })

  it('renders exactly 36 region paths -- every geoBoundaries ADM1 region, no more, no fewer', () => {
    render(<IndiaMap />)
    const regions = screen.getAllByTestId(/^india-map-region-/)
    expect(regions).toHaveLength(36)
  })

  it('exposes an accessible label for the whole map', () => {
    render(<IndiaMap />)
    expect(screen.getByRole('img', { name: /map of india/i })).toBeInTheDocument()
  })
})
