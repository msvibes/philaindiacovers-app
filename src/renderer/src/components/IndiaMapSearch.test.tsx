import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CatalogueFacets } from '../lib/covers'
import IndiaMapSearch from './IndiaMapSearch'

const facets: CatalogueFacets = {
  productCategories: [],
  years: [],
  postalCircles: [
    { value: { id: 'circle-mh', name: 'Maharashtra' }, count: 40 },
    { value: { id: 'circle-ne', name: 'North Eastern' }, count: 8 },
    { value: { id: 'circle-orissa', name: 'Orissa' }, count: 3 },
    { value: { id: 'circle-jk', name: 'Jammu and Kashmir' }, count: 5 }
    // Deliberately no entry for Punjab -- exercises the zero-cover
    // exclusion below.
  ]
}

function renderSearch(onSelectRegion = vi.fn()): { onSelectRegion: ReturnType<typeof vi.fn> } {
  render(<IndiaMapSearch facets={facets} onSelectRegion={onSelectRegion} />)
  return { onSelectRegion }
}

describe('IndiaMapSearch', () => {
  it('shows no suggestions until something is typed', () => {
    renderSearch()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('suggests a matching region by its own name', async () => {
    renderSearch()
    await userEvent.type(screen.getByRole('combobox'), 'goa')
    expect(screen.getByRole('option', { name: 'Goa' })).toBeInTheDocument()
  })

  it('matches case-insensitively against the canonical (non-diacritic) region name', async () => {
    // ALL_REGION_NAMES comes from postalCircleStates.ts's own canonical
    // table, not the raw geoBoundaries shapeName -- "Jammu and Kashmir"
    // here, not "Jammu and Kashmīr" with a macron. That's deliberate: a
    // real person types the plain spelling, not a diacritic-bearing one.
    renderSearch()
    await userEvent.type(screen.getByRole('combobox'), 'JAMMU')
    expect(screen.getByRole('option', { name: 'Jammu and Kashmir' })).toBeInTheDocument()
  })

  it('also matches by the region’s circle name -- "Orissa" surfaces "Odisha"', async () => {
    renderSearch()
    await userEvent.type(screen.getByRole('combobox'), 'orissa')
    expect(screen.getByRole('option', { name: 'Odisha' })).toBeInTheDocument()
  })

  it('matching a shared circle name surfaces every region it spans', async () => {
    renderSearch()
    await userEvent.type(screen.getByRole('combobox'), 'north eastern')
    expect(screen.getByRole('option', { name: 'Manipur' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Tripura' })).toBeInTheDocument()
  })

  it('excludes a region whose circle has zero covers -- consistent with the map’s own non-clickability', async () => {
    renderSearch()
    await userEvent.type(screen.getByRole('combobox'), 'punjab')
    expect(screen.queryByRole('option', { name: 'Punjab' })).not.toBeInTheDocument()
  })

  it('clicking a suggestion calls onSelectRegion with the real circle id and clears the input', async () => {
    const { onSelectRegion } = renderSearch()
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'goa')
    await userEvent.click(screen.getByRole('option', { name: 'Goa' }))

    expect(onSelectRegion).toHaveBeenCalledExactlyOnceWith('circle-mh')
    expect(input).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('pressing Enter selects the first suggestion', async () => {
    const { onSelectRegion } = renderSearch()
    await userEvent.type(screen.getByRole('combobox'), 'goa{Enter}')

    expect(onSelectRegion).toHaveBeenCalledExactlyOnceWith('circle-mh')
  })

  it('pressing Escape closes the suggestion list without selecting anything', async () => {
    const { onSelectRegion } = renderSearch()
    await userEvent.type(screen.getByRole('combobox'), 'goa')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onSelectRegion).not.toHaveBeenCalled()
  })
})
