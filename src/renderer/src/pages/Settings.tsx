import Eyebrow from '../components/Eyebrow'

// T-29 only needs Settings to exist and be reachable — its real content
// (disclaimer/EULA/developer details, dark mode toggle) belongs to T-27
// and T-30, both separately tracked. Building that content here would be
// scope creep into tasks that haven't started yet.
export default function Settings(): React.JSX.Element {
  return (
    <main className="p-8">
      <Eyebrow>Preferences</Eyebrow>
      <h1 className="text-2xl font-semibold font-display text-ink mb-2">Settings</h1>
      <p className="text-ink-soft">More settings coming soon.</p>
    </main>
  )
}
