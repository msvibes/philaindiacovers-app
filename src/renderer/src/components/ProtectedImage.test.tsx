import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ProtectedImage from './ProtectedImage'

// KAN-81: Tier 1 (deterrent-level) copy protection. Each assertion here
// checks the actual behavior a real user/browser would hit, not just that
// a prop was passed -- e.g. confirming preventDefault() was genuinely
// called on the event, not just that a handler function exists.
describe('ProtectedImage', () => {
  it('is not draggable', () => {
    render(<ProtectedImage src="blob:mock-url" alt="A cover" />)
    expect(screen.getByAltText('A cover')).toHaveAttribute('draggable', 'false')
  })

  it('prevents the default browser drag when dragstart fires anyway', () => {
    render(<ProtectedImage src="blob:mock-url" alt="A cover" />)
    const event = fireEvent.dragStart(screen.getByAltText('A cover'))
    // testing-library's fireEvent returns false when preventDefault() was
    // called on a cancelable event -- the real signal, not just "a handler
    // ran".
    expect(event).toBe(false)
  })

  it('prevents the default context menu on right-click', () => {
    render(<ProtectedImage src="blob:mock-url" alt="A cover" />)
    const event = fireEvent.contextMenu(screen.getByAltText('A cover'))
    expect(event).toBe(false)
  })

  it('applies select-none and blocks the native Chromium image-drag affordance', () => {
    render(<ProtectedImage src="blob:mock-url" alt="A cover" />)
    const img = screen.getByAltText('A cover')
    expect(img.className).toContain('select-none')
    expect(img.className).toContain('[-webkit-user-drag:none]')
  })

  it('still forwards a real onClick -- protection must not swallow legitimate interaction', async () => {
    const onClick = vi.fn()
    render(<ProtectedImage src="blob:mock-url" alt="A cover" onClick={onClick} />)
    fireEvent.click(screen.getByAltText('A cover'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
