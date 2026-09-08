import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { CatalogueFacets } from '../lib/covers'
import IndiaMap from './IndiaMap'

const facets: CatalogueFacets = {
  productCategories: [],
  years: [],
  postalCircles: [
    { value: { id: 'circle-mh', name: 'Maharashtra' }, count: 40 },
    { value: { id: 'circle-ne', name: 'North Eastern' }, count: 8 }
    // Deliberately no entry for most circles -- a zero-cover region
    // (e.g. Odisha, whose "Orissa" circle has no facet entry here) is
    // exactly the case PR 2's zero-cover styling needs to cover.
  ]
}

// First SVG-interactive component in this codebase (no react-simple-maps
// precedent exists yet) -- mirrors YearTimeline.test.tsx's approach of
// querying by test-id/role rather than asserting on the mapping
// library's own internal SVG structure.
describe('IndiaMap', () => {
  it('renders all 36 geoBoundaries regions as their own path, keyed by real shapeName', () => {
    render(<IndiaMap facets={facets} />)
    expect(screen.getByTestId('india-map-region-Odisha')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Goa')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Ladākh')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Jammu and Kashmīr')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Sikkim')).toBeInTheDocument()
  })

  it('renders exactly 36 region paths -- every geoBoundaries ADM1 region, no more, no fewer', () => {
    render(<IndiaMap facets={facets} />)
    const regions = screen.getAllByTestId(/^india-map-region-/)
    expect(regions).toHaveLength(36)
  })

  it('exposes an accessible label for the whole map', () => {
    render(<IndiaMap facets={facets} />)
    expect(screen.getByRole('img', { name: /map of india/i })).toBeInTheDocument()
  })

  describe('hover tooltip', () => {
    it('shows the region name and real count on hover, hides on mouseleave', async () => {
      render(<IndiaMap facets={facets} />)
      const goa = screen.getByTestId('india-map-region-Goa')

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

      await userEvent.hover(goa)
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveTextContent('Goa')
      expect(tooltip).toHaveTextContent('40 covers')

      await userEvent.unhover(goa)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('names the whole circle and its other regions for a shared-circle region -- honest, not a false split', async () => {
      render(<IndiaMap facets={facets} />)
      await userEvent.hover(screen.getByTestId('india-map-region-Arunāchal Pradesh'))

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveTextContent('8 covers')
      expect(tooltip).toHaveTextContent('North Eastern circle')
      expect(tooltip).toHaveTextContent('Manipur')
    })

    it('does not show the shared-circle line for a region whose circle covers only itself', async () => {
      render(<IndiaMap facets={facets} />)
      await userEvent.hover(screen.getByTestId('india-map-region-Delhi'))

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).not.toHaveTextContent('circle')
    })

    it('shows a real "0 covers" for a region whose circle has no facet entry -- not broken, not hidden', async () => {
      render(<IndiaMap facets={facets} />)
      await userEvent.hover(screen.getByTestId('india-map-region-Odisha'))

      expect(screen.getByRole('tooltip')).toHaveTextContent('0 covers')
    })

    it('uses singular "cover" for a count of exactly one', async () => {
      const singularFacets: CatalogueFacets = {
        ...facets,
        postalCircles: [{ value: { id: 'circle-ap', name: 'Andhra Pradesh' }, count: 1 }]
      }
      render(<IndiaMap facets={singularFacets} />)
      await userEvent.hover(screen.getByTestId('india-map-region-Andhra Pradesh'))

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveTextContent('1 cover')
      expect(tooltip).not.toHaveTextContent('1 covers')
    })
  })
})
