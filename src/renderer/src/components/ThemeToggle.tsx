import type { ThemePreference } from '../lib/useThemePreference'

interface ThemeToggleProps {
  preference: ThemePreference
  onChange: (preference: ThemePreference) => void
}

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

// T-30 (KAN-57): three-way, not a plain on/off — "follows my system
// setting by default, with a manual override" (US-46) needs a way back to
// "system" too, not just a fixed light/dark choice once toggled. Same
// segmented-control shape as SortControl.tsx (this app's only other
// multi-option toggle, no design prototype covers this control either).
export default function ThemeToggle({ preference, onChange }: ThemeToggleProps): React.JSX.Element {
  return (
    <div className="inline-flex rounded-lg border border-line overflow-hidden text-sm">
      {OPTIONS.map((option, index) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={preference === option.value}
          className={`px-3 py-1.5 ${index > 0 ? 'border-l border-line' : ''} ${
            preference === option.value ? 'bg-accent text-white' : 'bg-card text-ink-soft'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
