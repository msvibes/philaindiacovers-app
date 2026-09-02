import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// T-37: a safety net for genuine unexpected render crashes, not a
// replacement for this app's own real error handling elsewhere (offline
// banners, form validation, Catalogue/Detail's own error states all stay
// as their own thing). React error boundaries have no hook equivalent —
// this is the one deliberate class-component exception in an otherwise
// all-function-component codebase, not a stylistic drift.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error caught by ErrorBoundary:', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-paper">
        <h1 className="font-display text-xl font-semibold text-ink mb-2">
          Something went wrong.
        </h1>
        <p className="text-ink-soft mb-6 max-w-sm">
          PhilaIndiaCovers hit an unexpected problem. Reloading usually fixes it — your account
          and any in-progress signup or filters aren&apos;t affected.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-10 rounded-lg bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Reload
        </button>
      </main>
    )
  }
}
