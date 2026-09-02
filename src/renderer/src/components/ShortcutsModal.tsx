import { useEscapeToClose } from '../lib/useEscapeToClose'

interface ShortcutsModalProps {
  onClose: () => void
}

interface ShortcutRow {
  label: string
  keys: string
}

// US-55. Built from the design prototype's #shortcutsWrap markup, but
// trimmed to what's actually true in this app today — the prototype's own
// list includes a Ctrl/Cmd+K command-palette row, but no command palette
// exists here (that's T-23/US-52, unstarted). Listing it would make this
// help screen describe a feature that doesn't exist.
const SHORTCUTS: ShortcutRow[] = [
  { label: 'Next / previous cover (detail view)', keys: '→ / ←' },
  { label: 'Close any dialog', keys: 'Esc' },
  { label: 'Show shortcuts', keys: '?' }
]

export default function ShortcutsModal({ onClose }: ShortcutsModalProps): React.JSX.Element {
  useEscapeToClose(true, onClose)

  return (
    <div
      className="fixed inset-0 bg-scrim/40 flex items-center justify-center p-6 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card max-w-[360px] w-full rounded-[10px] border border-line p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-heading"
      >
        <h3
          id="shortcuts-modal-heading"
          className="font-display text-[16px] font-semibold text-ink mb-4"
        >
          Keyboard shortcuts
        </h3>
        <ul className="space-y-2.5">
          {SHORTCUTS.map((row) => (
            <li key={row.label} className="flex items-center justify-between text-[13px] text-ink">
              <span>{row.label}</span>
              <kbd className="font-mono text-[11px] bg-paper border border-line-strong rounded-[5px] px-[7px] py-[2px]">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <div className="mt-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg bg-accent px-4 text-[13px] font-medium text-white hover:bg-accent-hover"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
