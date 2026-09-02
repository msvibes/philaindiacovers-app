import { createContext, useContext } from 'react'

export interface ToastContextValue {
  showToast: (message: string) => void
}

// T-35 (KAN-67): a React Context, not prop-drilling — deliberately
// different from how session/themePreference are threaded through this
// app. Those each have exactly one deep consumer (SignedIn, Settings),
// so prop-drilling was the simpler, consistent choice. A toast needs to
// be callable from wherever a meaningful action happens, present and
// future, at any depth — the addendum's own instruction is explicit:
// "build the shared mechanism once, usable from anywhere," not scoped to
// one screen. Context is the right tool for that shape, not a deviation
// from this codebase's usual pattern without reason.
export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast() must be called from within a ToastProvider.')
  }
  return context
}
