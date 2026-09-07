import { useEffect } from 'react'

// KAN-81: Tier 1 (deterrent-level) copy protection, not true protection.
// Blocks the Ctrl/Cmd+S keydown itself while a cover image is on screen
// (the Detail view's inline image, and the lightbox rendered above it —
// both live under Detail.tsx's own "ready" state). Same shape as
// useEscapeToClose. In practice this is a safety net, not a fix for
// existing behavior — confirmed before building that nothing in this app
// (src/main/menu.ts has no File > Save item or accelerator) currently
// does anything on Ctrl+S at all.
export function useBlockSaveShortcut(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive])
}
