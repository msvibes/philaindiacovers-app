import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ThemeToggle from './ThemeToggle'

describe('ThemeToggle', () => {
  it('renders all three options, with only the current preference pressed', () => {
    render(<ThemeToggle preference="light" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with the clicked option', async () => {
    const onChange = vi.fn()
    render(<ThemeToggle preference="system" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith('dark')
  })
})
