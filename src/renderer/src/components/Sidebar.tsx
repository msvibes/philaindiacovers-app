import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useEscapeToClose } from '../lib/useEscapeToClose'
import type { Screen } from '../App'

interface SidebarProps {
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
  isShortcutsOpen: boolean
  onOpenShortcuts: () => void
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

// T-33: visible, greyed, genuinely non-interactive — confirmed explicitly
// with the product owner after a full PRD-v1.0 scope audit (KAN-5 for My
// Progress). No handler, no navigation.
const DISABLED_ENTRIES = ['Collection Manager', 'Wish List', 'My Progress']

// Active state (both the real screens and the Shortcuts row) shares this
// exact spec, so it's centralized rather than repeated per row: bg-paper +
// text-ink + font-medium + a 3px stamp-colored left border. Every row
// (active or not) reserves that 3px with a transparent border when
// inactive, so switching active state never shifts layout by 3px.
function rowClasses(isActive: boolean): string {
  return `w-full text-left py-2.5 px-5 pl-[17px] text-[13.5px] border-l-[3px] ${
    isActive
      ? 'bg-paper text-ink font-medium border-l-stamp'
      : 'text-ink-soft border-l-transparent hover:text-ink'
  }`
}

// T-33 (EPIC-11): replaces AppHeader.tsx's account-menu dropdown with a
// persistent left sidebar — the product owner's call after live use
// showed hiding primary nav behind a click-to-reveal icon was the wrong
// pattern for this small a destination set. Every value below is the
// addendum's own literal spec (docs/PRD-Addendum-App-Catalogue-UX.md,
// T-33), not a paraphrase or a prototype file — no prototype has a
// sidebar at all, confirmed directly; this is a fresh design decision
// written straight into the addendum text.
export default function Sidebar({
  currentScreen,
  onNavigate,
  isShortcutsOpen,
  onOpenShortcuts
}: SidebarProps): React.JSX.Element {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)

  useEscapeToClose(isLogoutConfirmOpen, () => setIsLogoutConfirmOpen(false))

  const handleConfirmLogout = async (): Promise<void> => {
    setIsLogoutConfirmOpen(false)
    await supabase.auth.signOut()
  }

  return (
    <>
      <aside
        data-tour="sidebar"
        className="fixed left-0 top-0 h-full w-[220px] bg-card border-r border-line flex flex-col"
      >
        <div className="pt-5 px-5 pb-6 border-b border-line">
          <span className="font-display font-semibold text-[18px] text-ink">PhilaIndiaCovers</span>
        </div>

        <nav className="flex flex-col">
          {WORKING_ENTRIES.map((entry) => {
            // Guards both the visual state and aria-current identically —
            // a real bug (caught by a test, not by inspection) had these
            // two checks drift out of sync: the row correctly stopped
            // *looking* active while the Shortcuts modal was open, but
            // aria-current stayed set to 'page' regardless, which a
            // screen reader would have announced as the current page even
            // though Shortcuts was the one actually highlighted.
            const isActive = !isShortcutsOpen && currentScreen === entry.screen
            return (
              <button
                key={entry.screen}
                type="button"
                onClick={() => onNavigate(entry.screen)}
                aria-current={isActive ? 'page' : undefined}
                className={rowClasses(isActive)}
              >
                {entry.label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-current={isShortcutsOpen ? 'page' : undefined}
            className={rowClasses(isShortcutsOpen)}
          >
            Keyboard Shortcuts
          </button>
        </nav>

        <div className="border-t border-line my-3 mx-5" />

        <div className="flex flex-col">
          {DISABLED_ENTRIES.map((label) => (
            <span
              key={label}
              className="w-full text-left py-2.5 px-5 pl-[17px] text-[13.5px] text-ink-soft opacity-50 cursor-default border-l-[3px] border-l-transparent"
            >
              {label} — Coming soon
            </span>
          ))}
        </div>

        <div className="border-t border-line my-3 mx-5" />

        <button
          type="button"
          onClick={() => setIsLogoutConfirmOpen(true)}
          className="mt-auto border-t border-line py-3.5 px-5 text-left text-[13.5px] text-ink"
        >
          Log out
        </button>
      </aside>

      {isLogoutConfirmOpen && (
        <div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center p-6 z-50"
          onClick={() => setIsLogoutConfirmOpen(false)}
        >
          <div
            className="bg-card max-w-[340px] w-full rounded-[10px] border border-line p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-heading"
          >
            <h3
              id="logout-confirm-heading"
              className="font-display text-[16px] font-semibold text-ink mb-1.5"
            >
              Log out?
            </h3>
            <p className="text-[13px] text-ink-soft mb-4">
              You&apos;ll need to log in again to browse the catalogue.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 h-[38px] rounded-lg border border-line-strong bg-card text-[13px] text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 h-[38px] rounded-lg bg-stamp text-[13px] font-medium text-white"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
