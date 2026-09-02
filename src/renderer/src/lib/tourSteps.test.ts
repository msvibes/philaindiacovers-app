import { describe, expect, it } from 'vitest'
import { TOUR_STEPS, computeHighlightBox, computeTooltipPosition } from './tourSteps'

describe('tourSteps', () => {
  it('has five steps, each with a real target selector, title, and text', () => {
    expect(TOUR_STEPS).toHaveLength(5)
    for (const step of TOUR_STEPS) {
      expect(step.target).toMatch(/^\[data-tour="[a-z-]+"\]$/)
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.text.length).toBeGreaterThan(0)
    }
  })

  it('only the first step (Home CTA) advances via a real interaction, not a Next button', () => {
    expect(TOUR_STEPS[0].advancesViaRealInteraction).toBe(true)
    expect(TOUR_STEPS.slice(1).every((step) => !step.advancesViaRealInteraction)).toBe(true)
  })

  describe('computeHighlightBox', () => {
    it('pads 6px on every side, matching the prototype exactly', () => {
      expect(computeHighlightBox({ top: 100, left: 50, width: 200, height: 40 })).toEqual({
        top: 94,
        left: 44,
        width: 212,
        height: 52
      })
    })
  })

  describe('computeTooltipPosition', () => {
    const viewport = { width: 1024, height: 768 }

    it('positions below the target with a 14px gap when there is room', () => {
      const target = { top: 100, left: 50, width: 200, height: 40 }
      expect(computeTooltipPosition(target, viewport)).toEqual({ top: 154, left: 50 })
    })

    it('flips above the target when there is no room below', () => {
      const target = { top: 700, left: 50, width: 200, height: 40 }
      const result = computeTooltipPosition(target, viewport)
      expect(result.top).toBe(700 - 150 - 14)
    })

    it('clamps to the right edge when the target is near the right of the viewport', () => {
      const target = { top: 100, left: 900, width: 60, height: 40 }
      const result = computeTooltipPosition(target, viewport)
      expect(result.left).toBe(1024 - 280 - 16)
    })
  })
})
