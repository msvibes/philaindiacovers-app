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

    // Real bug, caught by a live test: the sidebar step's target spans
    // the full viewport height, so "flip above if no room below" still
    // lands off the top of the screen — there's no meaningful above or
    // below for something that tall. Confirms the fix stays within the
    // viewport on both axes for exactly this shape of target.
    it('positions beside (not above/below) a target as tall as the viewport, e.g. the sidebar', () => {
      const sidebar = { top: 0, left: 0, width: 220, height: 768 }
      const result = computeTooltipPosition(sidebar, viewport)

      expect(result.left).toBe(220 + 14) // to the right of the sidebar, not clipped at 0
      expect(result.top).toBeGreaterThanOrEqual(0)
      expect(result.top + 150).toBeLessThanOrEqual(viewport.height)
    })

    it('flips to the left of a tall target when there is no room to its right', () => {
      const tallTargetOnRightEdge = { top: 0, left: 900, width: 100, height: 768 }
      const result = computeTooltipPosition(tallTargetOnRightEdge, viewport)

      expect(result.left).toBe(900 - 280 - 14)
    })
  })
})
