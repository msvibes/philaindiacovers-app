import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TOUR_STEPS, computeHighlightBox, computeTooltipPosition } from '../lib/tourSteps'

interface GuidedTourProps {
  stepIndex: number
  onNext: () => void
  onSkip: () => void
}

// T-34 (KAN-17): the actual highlight + tooltip overlay, portal-rendered
// to document.body so it sits above the sidebar/screen content
// regardless of their own stacking contexts. Positioning/spotlight
// mechanics copied from the reference prototype
// (docs/design/app-prototype-v2-auth-tour.html) — the huge
// `0 0 0 9999px` box-shadow is the same "spotlight via an oversized
// shadow" trick, not a new technique.
//
// Waits (briefly, via rAF polling) for the target element to exist
// before rendering — real data (e.g. the catalogue grid's first card)
// can still be loading when a step becomes active. Unlike the
// prototype's own renderTourStep (which ends the *entire* tour the
// instant one target is momentarily missing), this only skips the one
// step whose target never appears in time, so a slow-loading grid on
// one screen doesn't take out the rest of the tour.
const TARGET_WAIT_MS = 2000
const TARGET_POLL_INTERVAL_MS = 50

// The caller (SignedIn) renders this with `key={stepIndex}` — a full
// remount on every step change, not a synchronous setRect(null) inside
// this effect, is what resets `rect` between steps. Deliberate: resetting
// state synchronously inside an effect body is a real anti-pattern this
// codebase already fixed once before (T-13+T-18's own set-state-in-effect
// fix); the key-remount approach avoids it entirely rather than
// suppressing the lint rule that catches it.
export default function GuidedTour({
  stepIndex,
  onNext,
  onSkip
}: GuidedTourProps): React.JSX.Element | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = TOUR_STEPS[stepIndex]

  useEffect(() => {
    if (!step) return

    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout>
    const deadline = Date.now() + TARGET_WAIT_MS

    function poll(): void {
      if (cancelled) return
      const el = document.querySelector(step.target)
      if (el) {
        setRect(el.getBoundingClientRect())
        return
      }
      if (Date.now() >= deadline) {
        // Target never appeared — skip this one step rather than
        // aborting the whole tour.
        onNext()
        return
      }
      pollTimer = setTimeout(poll, TARGET_POLL_INTERVAL_MS)
    }
    poll()

    function handleReposition(): void {
      const el = document.querySelector(step.target)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', handleReposition)

    return () => {
      cancelled = true
      clearTimeout(pollTimer)
      window.removeEventListener('resize', handleReposition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onNext is
    // stable for the lifetime of one tour (see SignedIn); including it
    // would re-run this effect on every render for no reason.
  }, [stepIndex, step])

  if (!step || !rect) return null

  const highlight = computeHighlightBox(rect)
  const tooltip = computeTooltipPosition(rect, { width: window.innerWidth, height: window.innerHeight })
  const isLast = stepIndex === TOUR_STEPS.length - 1

  return createPortal(
    <>
      <div
        className="fixed z-[60] rounded-[10px] border-2 border-stamp pointer-events-none transition-[top,left,width,height] duration-200 ease-in-out"
        style={{
          top: highlight.top,
          left: highlight.left,
          width: highlight.width,
          height: highlight.height,
          boxShadow: '0 0 0 9999px rgba(19,32,56,.6)'
        }}
      />
      <div
        className="fixed z-[61] w-[280px] rounded-xl bg-card p-4 shadow-[0_12px_28px_rgba(0,0,0,.22)] transition-[top,left] duration-200 ease-in-out"
        style={{ top: tooltip.top, left: tooltip.left }}
        role="dialog"
        aria-labelledby="tour-step-title"
      >
        <div className="text-[11px] text-ink-soft font-mono mb-1.5">
          {stepIndex + 1} of {TOUR_STEPS.length}
        </div>
        <h4 id="tour-step-title" className="font-display text-[15px] font-semibold mb-1.5">
          {step.title}
        </h4>
        <p className="text-[12.5px] text-ink-soft leading-relaxed mb-3.5">{step.text}</p>
        <div className="flex justify-between items-center">
          <button type="button" onClick={onSkip} className="text-[12px] text-ink-soft">
            Skip tour
          </button>
          {!step.advancesViaRealInteraction && (
            <button
              type="button"
              onClick={onNext}
              className="rounded-[7px] bg-accent px-3.5 py-1.5 text-[12.5px] text-white"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
