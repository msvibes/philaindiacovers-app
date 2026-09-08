import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
    // exactly the case PR 2's zero-cover styling and PR 3's
    // stays-non-clickable behavior both need to cover.
  ]
}

function renderMap(
  overrides: Partial<{ facets: CatalogueFacets; onSelectRegion: (id: string) => void }> = {}
): { onSelectRegion: (id: string) => void } {
  const onSelectRegion = overrides.onSelectRegion ?? vi.fn()
  render(<IndiaMap facets={overrides.facets ?? facets} onSelectRegion={onSelectRegion} />)
  return { onSelectRegion }
}

// First SVG-interactive component in this codebase (no react-simple-maps
// precedent exists yet) -- mirrors YearTimeline.test.tsx's approach of
// querying by test-id/role rather than asserting on the mapping
// library's own internal SVG structure.
describe('IndiaMap', () => {
  it('renders all 36 geoBoundaries regions as their own path, keyed by real shapeName', () => {
    renderMap()
    expect(screen.getByTestId('india-map-region-Odisha')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Goa')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Ladākh')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Jammu and Kashmīr')).toBeInTheDocument()
    expect(screen.getByTestId('india-map-region-Sikkim')).toBeInTheDocument()
  })

  it('renders exactly 36 region paths -- every geoBoundaries ADM1 region, no more, no fewer', () => {
    renderMap()
    const regions = screen.getAllByTestId(/^india-map-region-/)
    expect(regions).toHaveLength(36)
  })

  it('exposes an accessible label for the whole map', () => {
    renderMap()
    expect(screen.getByRole('img', { name: /map of india/i })).toBeInTheDocument()
  })

  describe('hover tooltip', () => {
    it('shows the region name and real count on hover, hides on mouseleave', async () => {
      renderMap()
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
      renderMap()
      await userEvent.hover(screen.getByTestId('india-map-region-Arunāchal Pradesh'))

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveTextContent('8 covers')
      expect(tooltip).toHaveTextContent('North Eastern circle')
      expect(tooltip).toHaveTextContent('Manipur')
    })

    it('does not show the shared-circle line for a region whose circle covers only itself', async () => {
      renderMap()
      await userEvent.hover(screen.getByTestId('india-map-region-Delhi'))

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).not.toHaveTextContent('circle')
    })

    it('shows a real "0 covers" for a region whose circle has no facet entry -- not broken, not hidden', async () => {
      renderMap()
      await userEvent.hover(screen.getByTestId('india-map-region-Odisha'))

      expect(screen.getByRole('tooltip')).toHaveTextContent('0 covers')
    })

    it('uses singular "cover" for a count of exactly one', async () => {
      const singularFacets: CatalogueFacets = {
        ...facets,
        postalCircles: [{ value: { id: 'circle-ap', name: 'Andhra Pradesh' }, count: 1 }]
      }
      renderMap({ facets: singularFacets })
      await userEvent.hover(screen.getByTestId('india-map-region-Andhra Pradesh'))

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveTextContent('1 cover')
      expect(tooltip).not.toHaveTextContent('1 covers')
    })
  })

  describe('click-to-filter (PR 3)', () => {
    // KAN-85: fireEvent.click, not userEvent.click, deliberately -- since
    // PR 3 (zoom/pan) wraps Geographies in react-simple-maps'
    // ZoomableGroup, every real click now also runs through d3-zoom's own
    // native mousedown listener (bound directly via d3-selection, outside
    // React's synthetic event system) to tell a click apart from a
    // drag-to-pan gesture. That listener calls nodrag(event.view), and
    // jsdom's MouseEvent constructor -- confirmed directly, not assumed
    // -- defaults `view` to null unless explicitly supplied, same as any
    // spec-compliant browser would for a JS-constructed event (a real
    // native click always has `view` populated by the OS/browser itself,
    // so this never happens for a genuine user click in the packaged
    // app). userEvent.click's full pointerdown/mousedown/mouseup sequence
    // triggers that crash; fireEvent.click dispatches a single 'click'
    // event with no preceding 'mousedown', so d3-zoom's listener never
    // runs, while React's own onClick (bound to the real 'click' event)
    // still fires normally -- same click-handling code path, just
    // reached without the synthetic gesture sequence that isn't
    // meaningfully replicable in jsdom anyway.
    it('calls onSelectRegion with the real circle id when clicking a covered region', () => {
      const { onSelectRegion } = renderMap()
      fireEvent.click(screen.getByTestId('india-map-region-Goa'))
      expect(onSelectRegion).toHaveBeenCalledExactlyOnceWith('circle-mh')
    })

    it('a shared-circle region resolves to the same circle id as its namesake', () => {
      const { onSelectRegion } = renderMap()
      fireEvent.click(screen.getByTestId('india-map-region-Arunāchal Pradesh'))
      expect(onSelectRegion).toHaveBeenCalledExactlyOnceWith('circle-ne')
    })

    it('does nothing when clicking a region whose circle has no known id (zero covers)', () => {
      const { onSelectRegion } = renderMap()
      fireEvent.click(screen.getByTestId('india-map-region-Odisha'))
      expect(onSelectRegion).not.toHaveBeenCalled()
    })
  })

  // KAN-85 PR 3. What's genuinely testable here: the buttons exist, are
  // enabled/disabled correctly at the zoom limits, and clicking one
  // changes the real transform react-simple-maps applies to its own
  // .rsm-zoomable-group element -- confirms the state genuinely reaches
  // the DOM, not just a React state variable in isolation. What's
  // deliberately NOT tested here, per the approved plan: the actual
  // scroll-to-zoom/drag-to-pan gesture and whether a drag correctly
  // doesn't fire a region's onClick -- not meaningfully replicable in
  // jsdom (no real pointer-capture/drag-threshold physics), verified
  // live instead.
  describe('zoom/pan controls (PR 3)', () => {
    it('zoom out and reset are disabled at the default view; zoom in is enabled', () => {
      renderMap()
      expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled()
      expect(screen.getByTestId('india-map-reset-view')).toBeDisabled()
    })

    it('clicking Zoom in changes the real transform applied to the map group, and enables Zoom out/Reset', async () => {
      const { container } = render(<IndiaMap facets={facets} onSelectRegion={vi.fn()} />)
      const group = container.querySelector('.rsm-zoomable-group')
      const before = group?.getAttribute('transform')

      await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }))

      expect(group?.getAttribute('transform')).not.toBe(before)
      expect(screen.getByRole('button', { name: 'Zoom out' })).toBeEnabled()
      expect(screen.getByTestId('india-map-reset-view')).toBeEnabled()
    })

    it('Reset returns to the default view (Zoom out/Reset disabled again)', async () => {
      renderMap()
      await userEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
      expect(screen.getByTestId('india-map-reset-view')).toBeEnabled()

      await userEvent.click(screen.getByTestId('india-map-reset-view'))

      expect(screen.getByTestId('india-map-reset-view')).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
    })

    it('Zoom in becomes disabled once the max zoom level is reached', async () => {
      renderMap()
      const zoomInButton = screen.getByRole('button', { name: 'Zoom in' })
      // MAX_ZOOM=8, ZOOM_STEP=1.5 -- a handful of clicks is enough to
      // saturate; clicking well past that point confirms it clamps
      // rather than erroring.
      for (let i = 0; i < 10 && zoomInButton.getAttribute('disabled') === null; i++) {
        await userEvent.click(zoomInButton)
      }
      expect(zoomInButton).toBeDisabled()
    })
  })
})
