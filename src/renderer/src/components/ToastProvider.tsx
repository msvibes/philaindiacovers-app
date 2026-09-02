import { useCallback, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ToastContext } from '../lib/ToastContext'

interface ToastEntry {
  id: string
  message: string
  visible: boolean
}

// Matches the reference prototype's showToast() exactly
// (docs/design/app-prototype-v3-full.html): 2200ms visible, then a
// 250ms fade-out before removal from the DOM. The two-step
// insert-invisible-then-flip-visible-next-frame dance (mirroring the
// prototype's own requestAnimationFrame call) is necessary, not
// decorative — setting the "final" visible state in the same
// synchronous update as the DOM insert gives the browser no prior state
// to transition from, so the fade-in simply wouldn't animate.
const VISIBLE_MS = 2200
const FADE_MS = 250

interface ToastProviderProps {
  children: ReactNode
}

export default function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  const showToast = useCallback((message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, visible: false }])

    requestAnimationFrame(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: true } : t)))
    })

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)))
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, FADE_MS)
    }, VISIBLE_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-5 right-5 z-[80] flex flex-col gap-2" aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              // bg-accent/text-white, not bg-ink — the prototype's own
              // toast used var(--ink), which predates T-30's ink/accent
              // split. Post-split, ink is text-only and inverts for dark
              // mode; a toast needs the same "stays a dark surface in
              // both themes" treatment as VerifiedBadge's tooltip, so it
              // uses the token built for exactly that (bg-accent), not
              // the one that would flip it light in dark mode.
              className={`rounded-lg bg-accent px-4 py-2.5 text-[12.5px] text-white shadow-[0_8px_20px_rgba(0,0,0,.2)] transition-[opacity,transform] duration-200 ease-out ${
                toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
