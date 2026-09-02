import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CatalogueViewToggle from './CatalogueViewToggle'

describe('CatalogueViewToggle', () => {
  it('marks only the current view mode as pressed', () => {
    render(<CatalogueViewToggle viewMode="year" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'By year' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with the clicked mode', async () => {
    const onChange = vi.fn()
    render(<CatalogueViewToggle viewMode="grid" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'By year' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith('year')
  })
})
