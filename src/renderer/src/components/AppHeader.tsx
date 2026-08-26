import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Screen } from '../App'

interface AppHeaderProps {
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
}

interface NavEntry {
  label: string
  screen: Screen
}

const WORKING_ENTRIES: NavEntry[] = [
  { label: 'Home', screen: 'home' },
  { label: 'Catalogue', screen: 'catalogue' },
  { label: 'Settings', screen: 'settings' }
]

// T-29: visible, greyed, genuinely non-interactive — confirmed explicitly
// with the product owner after a full PRD-v1.0 scope audit (KAN-5 for My
// Progress). No handler, no navigation — these exist only to set
// expectations that the features are on the roadmap, not to be a backdoor
// into building any of their actual functionality.
const DISABLED_ENTRIES = ['Collection Manager', 'Wish List', 'My Progress']

// Shared across every signed-in screen (see SignedIn in App.tsx) so there's
// one nav/logout path, not one per page. Reuses the account-menu dropdown
// pattern already approved in the v3 design prototype (icon button, click
// toggles a dropdown, click-outside closes it) rather than inventing a new
// nav paradigm.
export default function AppHeader({
  currentScreen,
  onNavigate
}: AppHeaderProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut()
  }

  return (
    <header className="flex items-center justify-between border-b border-line bg-paper px-8 py-4">
      <span className="font-display font-semibold text-ink">PhilaIndiaCovers</span>

      <div className="relative" ref={menuRef}>
        {/* Exact match to the v3 prototype's .icon-only trigger button —
            36x36, border-line-strong, bg-card — not a plain text button. */}
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label="Account menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-card text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </button>

        {isOpen && (
          // Exact match to the v3 prototype's .account-menu: border-radius
          // 10px, border-line (not a default border), and its precise
          // box-shadow (0 10px 24px rgba(0,0,0,.12)) — Tailwind's own
          // shadow-lg has a different shape, not an equivalent.
          <div className="absolute right-0 top-[calc(100%+6px)] w-[190px] rounded-[10px] border border-line bg-card shadow-[0_10px_24px_rgba(0,0,0,0.12)] overflow-hidden z-20">
            {WORKING_ENTRIES.map((entry) => (
              <button
                key={entry.screen}
                type="button"
                onClick={() => {
                  onNavigate(entry.screen)
                  setIsOpen(false)
                }}
                aria-current={currentScreen === entry.screen ? 'page' : undefined}
                className="w-full text-left px-[14px] py-2.5 text-[12.5px] text-ink hover:bg-paper"
              >
                {entry.label}
              </button>
            ))}

            <div className="border-t border-line" />

            {DISABLED_ENTRIES.map((label) => (
              <button
                key={label}
                type="button"
                disabled
                className="w-full text-left px-[14px] py-2.5 text-[12.5px] text-ink-soft opacity-40 cursor-not-allowed"
              >
                {label} — Coming soon
              </button>
            ))}

            <div className="border-t border-line" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-[14px] py-2.5 text-[12.5px] text-ink hover:bg-paper"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
