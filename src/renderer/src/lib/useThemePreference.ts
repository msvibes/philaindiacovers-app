import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'philaindiacovers:themePreference'

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function readStored(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return isThemePreference(raw) ? raw : 'system'
  } catch {
    return 'system'
  }
}

// T-30 (KAN-57): per-device, not per-account — deliberately not synced via
// Supabase Auth user_metadata the way T-34's tour_completed is. Appearance
// preferences are conventionally per-device in real apps (a shared/other
// machine reasonably wants its own choice), it works offline immediately,
// and there's no existing precedent here for syncing display prefs across
// devices.
//
// The 'system' case needs no matchMedia listener at all — the CSS itself
// (base.css's `@media (prefers-color-scheme: dark)` block) already
// re-applies live when the OS setting changes, with zero JS involvement.
// This hook's only job is applying/clearing the explicit override:
// document.documentElement's data-theme attribute is what
// `:root[data-theme="dark"]`/`:not([data-theme="light"])` in base.css
// actually key off of. 'system' means "no attribute at all" — clearing it
// lets the plain media query alone decide, rather than this hook trying
// to duplicate that decision in JS.
export function useThemePreference(): {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored)

  useEffect(() => {
    if (preference === 'system') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = preference
    }
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can genuinely fail (quota, private-mode restrictions) —
      // the choice still applies for this session via the state above,
      // it just won't survive a restart.
    }
  }, [])

  return { preference, setPreference }
}
