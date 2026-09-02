import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import YearTimeline from './YearTimeline'

const years = [
  { value: 2020, count: 3 },
  { value: 2022, count: 9 },
  { value: 2021, count: 1 }
]

describe('YearTimeline', () => {
  it('renders most-recent year first, regardless of input order', () => {
    render(<YearTimeline years={years} onSelectYear={() => {}} />)
    const rows = screen.getAllByRole('button')
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('2022'),
      expect.stringContaining('2021'),
      expect.stringContaining('2020')
    ])
  })

  it('pluralizes the count correctly, including the singular case', () => {
    render(<YearTimeline years={years} onSelectYear={() => {}} />)
    expect(screen.getByText('9 covers')).toBeInTheDocument()
    expect(screen.getByText('1 cover')).toBeInTheDocument()
    expect(screen.getByText('3 covers')).toBeInTheDocument()
  })

  it('sizes each bar relative to the single most-covered year, not an absolute scale', () => {
    render(<YearTimeline years={years} onSelectYear={() => {}} />)
    const bars = document.querySelectorAll('.bg-stamp')
    const widths = Array.from(bars).map((bar) => (bar as HTMLElement).style.width)
    // 2022 (max, 9) is first in sorted order, 100%; 2020 (3 of 9) ~33%.
    expect(widths[0]).toBe('100%')
    expect(widths[2]).toBe(`${((3 / 9) * 100).toFixed(0)}%`)
  })

  it('calls onSelectYear with the clicked year', async () => {
    const onSelectYear = vi.fn()
    render(<YearTimeline years={years} onSelectYear={onSelectYear} />)
    await userEvent.click(screen.getByText('2021'))
    expect(onSelectYear).toHaveBeenCalledExactlyOnceWith(2021)
  })

  it('does not throw on an empty years list', () => {
    render(<YearTimeline years={[]} onSelectYear={() => {}} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
