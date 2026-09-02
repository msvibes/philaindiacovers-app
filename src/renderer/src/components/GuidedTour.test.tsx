import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GuidedTour from './GuidedTour'

// A real target element for each step this suite exercises — the
// component locates it via document.querySelector(step.target), same
// as the real app's data-tour-attributed elements. Tracked and removed
// individually in afterEach, not via document.body.innerHTML = '' —
// GuidedTour portals into document.body itself, and wiping the whole
// body out from under React before its own cleanup() runs throws
// ("not a child of this node") when React then tries to remove nodes
// that raw DOM manipulation already destroyed.
const mountedTargets: HTMLElement[] = []
function mountTarget(dataTour: string): void {
  const el = document.createElement('button')
  el.setAttribute('data-tour', dataTour)
  document.body.appendChild(el)
  mountedTargets.push(el)
}

afterEach(() => {
  mountedTargets.splice(0).forEach((el) => el.remove())
})

describe('GuidedTour', () => {
  beforeEach(() => {
    mountTarget('home-cta')
    mountTarget('catalogue-search')
  })

  it('shows the first step\'s title/text and step count once its target is found', async () => {
    render(<GuidedTour stepIndex={0} onNext={() => {}} onSkip={() => {}} />)

    await waitFor(() => expect(screen.getByText('Start with the catalogue')).toBeInTheDocument())
    expect(screen.getByText('1 of 5')).toBeInTheDocument()
  })

  it('the Home-CTA step has no Next button — only Skip', async () => {
    render(<GuidedTour stepIndex={0} onNext={() => {}} onSkip={() => {}} />)

    await waitFor(() => expect(screen.getByText('Start with the catalogue')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /skip tour/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^next$/i })).not.toBeInTheDocument()
  })

  it('every other step shows a real Next button that calls onNext', async () => {
    const onNext = vi.fn()
    render(<GuidedTour stepIndex={1} onNext={onNext} onSkip={() => {}} />)

    await waitFor(() => expect(screen.getByText('Search the catalogue')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /^next$/i }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('the last step\'s button reads "Done", not "Next"', async () => {
    mountTarget('sidebar')
    render(<GuidedTour stepIndex={4} onNext={() => {}} onSkip={() => {}} />)

    await waitFor(() => expect(screen.getByText('5 of 5')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /^done$/i })).toBeInTheDocument()
  })

  it('Skip tour calls onSkip regardless of step', async () => {
    const onSkip = vi.fn()
    render(<GuidedTour stepIndex={0} onNext={() => {}} onSkip={onSkip} />)

    await waitFor(() => expect(screen.getByText('Start with the catalogue')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /skip tour/i }))
    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('renders nothing while its target is missing, and does not throw', () => {
    const { container } = render(
      <GuidedTour stepIndex={2} onNext={() => {}} onSkip={() => {}} />
    )
    // catalogue-filters was never mounted by this test's beforeEach.
    expect(container).toBeEmptyDOMElement()
  })
})
