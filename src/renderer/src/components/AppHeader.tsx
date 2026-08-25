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
    <header className="flex items-center justify-between border-b px-8 py-4">
      <span className="font-semibold">PhilaIndiaCovers</span>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label="Account menu"
          className="rounded border px-3 py-1.5 text-sm"
        >
          Menu
        </button>

        {isOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] w-52 rounded-lg border bg-card shadow-lg overflow-hidden z-20">
            {WORKING_ENTRIES.map((entry) => (
              <button
                key={entry.screen}
                type="button"
                onClick={() => {
                  onNavigate(entry.screen)
                  setIsOpen(false)
                }}
                aria-current={currentScreen === entry.screen ? 'page' : undefined}
                className="w-full text-left px-4 py-2 text-sm hover:bg-paper"
              >
                {entry.label}
              </button>
            ))}

            <div className="border-t" />

            {DISABLED_ENTRIES.map((label) => (
              <button
                key={label}
                type="button"
                disabled
                className="w-full text-left px-4 py-2 text-sm text-ink-soft opacity-40 cursor-not-allowed"
              >
                {label} — Coming soon
              </button>
            ))}

            <div className="border-t" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm hover:bg-paper"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
