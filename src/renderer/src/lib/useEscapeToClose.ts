import { useEffect } from 'react'

// Shared by every modal in the app (Signup's Disclaimer, the new
// ShortcutsModal, Sidebar's logout-confirm) — T-33 folded in making
// Escape-to-close actually true everywhere, since the Shortcuts modal's
// own help text claims it works on "any dialog," and that would otherwise
// be describing a capability that doesn't exist for two of the three.
export function useEscapeToClose(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
}
