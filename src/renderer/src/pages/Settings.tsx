import { useState } from 'react'
import { version } from '../../../../package.json'
import Eyebrow from '../components/Eyebrow'
import DisclaimerModal from '../components/DisclaimerModal'

// T-27: real content, replacing T-29's placeholder. Values verbatim from
// docs/legal/DISCLAIMER-and-Developer-Details.md §5a — version is read
// live from package.json, not hardcoded, so it can't silently drift from
// a real release. Dark mode (T-30) isn't built here — this layout leaves
// a sensible place for it to land later, per that task's own boundary.
export default function Settings(): React.JSX.Element {
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  return (
    <main className="p-8 max-w-xl">
      <Eyebrow>Preferences</Eyebrow>
      <h1 className="text-2xl font-semibold font-display text-ink mb-6">Settings</h1>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft mb-3">
          About PhilaIndiaCovers
        </h2>
        <dl className="space-y-2 text-sm text-ink">
          <div className="flex gap-2">
            <dt className="text-ink-soft w-28 shrink-0">Version</dt>
            <dd>{version}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft w-28 shrink-0">Developer</dt>
            <dd>Manjunath Shanmugam</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft w-28 shrink-0">Published by</dt>
            <dd>Krutim Logic, Bangalore, India</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft w-28 shrink-0">Contact</dt>
            <dd>krutimlogic@gmail.com</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft w-28 shrink-0">Source code</dt>
            <dd>
              <a
                href="https://github.com/msvibes/philaindiacovers-app"
                target="_blank"
                rel="noreferrer"
                className="text-stamp underline"
              >
                github.com/msvibes/philaindiacovers-app
              </a>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft w-28 shrink-0">Catalogue verification</dt>
            <dd>Reviewed by a volunteer philately SME</dd>
          </div>
        </dl>

        <div className="mt-5 flex gap-4 text-[13px]">
          <button
            type="button"
            onClick={() => setShowDisclaimer(true)}
            className="text-stamp underline"
          >
            View Disclaimer
          </button>
          <a
            href="https://github.com/msvibes/philaindiacovers-app/issues"
            target="_blank"
            rel="noreferrer"
            className="text-stamp underline"
          >
            Report an Issue
          </a>
        </div>
      </section>

      <DisclaimerModal isOpen={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
    </main>
  )
}
