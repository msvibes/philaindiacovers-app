// T-34 (KAN-17, FR-04/US-06): the guided tour's step data and pure
// positioning math — kept separate from GuidedTour.tsx so both are
// testable without rendering anything.
//
// Step targets and copy are adapted from the addendum's decided T-34
// scope (docs/PRD-Addendum-App-Catalogue-UX.md), NOT copied wholesale
// from the reference prototype (docs/design/app-prototype-v2-auth-tour.html)
// — that prototype predates T-33's sidebar (its final step highlights a
// standalone settings button that no longer exists) and predates Home
// existing as its own screen with a CTA (its tour starts directly on
// Catalogue). The addendum's own T-34 row is explicit that this task
// must point at "real live elements matching whatever T-33 ships," not
// the prototype's now-stale ones — so the *mechanics* here (highlight +
// tooltip + skip/next, the exact positioning formula, the spotlight
// box-shadow trick) are reused verbatim from the prototype, but the step
// list itself is rebuilt against this app's real, current UI.
//
// Five steps, not four: the addendum's own phrasing groups "Catalogue's
// search/filters" as one item, but the prototype it explicitly says to
// reuse the pattern of treats search and filters as two separate steps
// with two separate explanations — followed that finer granularity here
// since it gives each control its own real explanation, matching the
// prototype's own actual granularity rather than its summarized
// description.
export interface TourStep {
  /** CSS selector for the real element this step highlights. */
  target: string
  title: string
  text: string
  /**
   * True only for the one step whose "next" action is a real navigation
   * the user must perform themselves (clicking Home's actual CTA), not a
   * scripted button click — the addendum quotes the product owner's own
   * "interactive walkthrough, not static slides" decision, and this is
   * the one step where that distinction is observable: advancing here
   * means the user genuinely used the highlighted control, not that they
   * dismissed a tooltip. Every other step lives on one already-visible
   * screen, so a real Next button is the right interaction there.
   */
  advancesViaRealInteraction?: boolean
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="home-cta"]',
    title: 'Start with the catalogue',
    text: 'Tap "Enter the catalogue" to see every verified cover.',
    advancesViaRealInteraction: true
  },
  {
    target: '[data-tour="catalogue-search"]',
    title: 'Search the catalogue',
    text: 'Search by item name, cover name, or description — results narrow as you type.'
  },
  {
    target: '[data-tour="catalogue-filters"]',
    title: 'Filter with live counts',
    text: 'Filter by postal circle, product category, or year. Each option shows how many covers match before you apply it.'
  },
  {
    target: '[data-tour="catalogue-card"]',
    title: 'Open any cover',
    text: 'Tap a cover to see the full detail view, and move to the next or previous one from there.'
  },
  {
    target: '[data-tour="sidebar"]',
    title: 'Everything else, one click away',
    text: 'Home, Catalogue, and Settings all live here — plus keyboard shortcuts and logging out.'
  }
]

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export interface Viewport {
  width: number
  height: number
}

// 6px padding around the real element, matching the prototype's own
// .tour-highlight positioning exactly (r.top-6, r.left-6, r.width+12,
// r.height+12).
export function computeHighlightBox(target: Rect): Rect {
  return {
    top: target.top - 6,
    left: target.left - 6,
    width: target.width + 12,
    height: target.height + 12
  }
}

const TOOLTIP_WIDTH = 280
const TOOLTIP_ESTIMATED_HEIGHT = 150
const TOOLTIP_GAP = 14

// A target at least as tall as the viewport itself (the sidebar step —
// a fixed, full-height <aside>) has no meaningful "above" or "below": a
// real live test caught this exactly — flipping "above" a full-height
// element still lands the tooltip off the top of the screen, clipped to
// a sliver. Position beside it instead, on whichever side has room.
function computeTooltipPositionBesideTallTarget(
  target: Rect,
  viewport: Viewport
): { top: number; left: number } {
  let left = target.left + target.width + TOOLTIP_GAP
  if (left + TOOLTIP_WIDTH > viewport.width) {
    left = target.left - TOOLTIP_WIDTH - TOOLTIP_GAP
  }
  const top = Math.min(
    Math.max(16, (viewport.height - TOOLTIP_ESTIMATED_HEIGHT) / 2),
    viewport.height - TOOLTIP_ESTIMATED_HEIGHT - 16
  )
  return { top, left }
}

// Positions the tooltip below the highlighted element, flipping above it
// if there isn't room, and clamping horizontally to the viewport — same
// formula as the prototype's renderTourStep, extracted here as a pure
// function so the flip/clamp logic is unit-testable without a real DOM.
// Every real step target is small relative to the viewport except the
// sidebar, which gets its own positioning above — this below/above
// logic assumes room to flip into exists, which isn't true for
// something that spans the whole window height.
export function computeTooltipPosition(
  target: Rect,
  viewport: Viewport
): { top: number; left: number } {
  if (target.height >= viewport.height * 0.8) {
    return computeTooltipPositionBesideTallTarget(target, viewport)
  }

  let top = target.top + target.height + TOOLTIP_GAP
  if (top + TOOLTIP_ESTIMATED_HEIGHT > viewport.height) {
    top = target.top - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_GAP
  }
  let left = target.left
  if (left + TOOLTIP_WIDTH > viewport.width) {
    left = viewport.width - TOOLTIP_WIDTH - 16
  }
  return { top, left }
}
