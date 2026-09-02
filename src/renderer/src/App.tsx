import { useEffect, useReducer, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import { fetchCatalogueOrderedIds, syncCacheFromSupabase } from './lib/covers'
import {
  catalogueReducer,
  initialCatalogueQueryState,
  type CatalogueQueryState
} from './lib/catalogueQuery'
import { useRecentlyViewed } from './lib/useRecentlyViewed'
import { useOnlineStatus } from './lib/useOnlineStatus'
import { hasCompletedTour, markTourCompleted } from './lib/tourCompletion'
import { TOUR_STEPS } from './lib/tourSteps'
import { useThemePreference, type ThemePreference } from './lib/useThemePreference'
import { useToast } from './lib/ToastContext'
import Sidebar from './components/Sidebar'
import ShortcutsModal from './components/ShortcutsModal'
import OfflineBanner from './components/OfflineBanner'
import SplashScreen from './components/SplashScreen'
import GuidedTour from './components/GuidedTour'
import Login from './pages/Login'
import Home from './pages/Home'
import Catalogue from './pages/Catalogue'
import Settings from './pages/Settings'
import Detail, { type DetailNavPosition } from './pages/Detail'

// T-29: the three real, navigable screens once signed in. Detail is
// deliberately not part of this union — it's an overlay-like state
// (selectedCoverId) independent of which of these three is active, so
// returning from it lands back on whichever one was showing, with zero
// extra state to track that.
export type Screen = 'home' | 'catalogue' | 'settings'

// A stable string key for "what query is currently active" — used to
// decide whether a cached ordered-id list (below) is still valid, or
// needs refetching. Deliberately excludes `page`: the ordered list spans
// every page of the active query, not just the one currently shown.
function queryCacheKey(query: CatalogueQueryState): string {
  return JSON.stringify({
    postalCircleIds: query.appliedFilters.postalCircleIds,
    productCategories: query.appliedFilters.productCategories,
    years: query.appliedFilters.years,
    giItemNameFilter: query.giItemNameFilter,
    searchTerm: query.searchTerm,
    sort: query.sort
  })
}

// Navigation is a small lifted-state value, not a router — proportionate
// to two screens, one level deep, with no URL bar or deep-linking need in
// this Electron shell. Revisit this decision (a lightweight router, e.g.
// react-router's MemoryRouter) once either becomes true: more than ~4
// screens exist, or any screen needs to preserve/restore scroll or
// selection state across navigation — neither applies yet.
//
// T-25: filter/search/sort/page state moved up here from Catalogue.tsx
// (which is now a controlled component) — Detail view needs the same
// active query to support prev/next navigation within it (FR-12), which
// wasn't possible while Catalogue owned that state privately and unmounted
// it whenever a cover was selected.
interface SignedInProps {
  session: Session
  themePreference: ThemePreference
  onThemePreferenceChange: (preference: ThemePreference) => void
}

function SignedIn({
  session,
  themePreference,
  onThemePreferenceChange
}: SignedInProps): React.JSX.Element {
  // FR-01: lands on Home, not the grid, on every sign-in/launch.
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null)
  const [query, dispatch] = useReducer(catalogueReducer, initialCatalogueQueryState)
  const { recordView } = useRecentlyViewed()
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const isOnline = useOnlineStatus()
  const { showToast } = useToast()
  // T-35 (KAN-67): tracks the previous isOnline value so the sync
  // effect below can tell "just came back online" apart from "the
  // very first sync right after sign-in" — both re-run this same
  // effect (isOnline is its only dependency), but only the former is a
  // genuine reconnect worth a toast. Starting the ref at the current
  // value means the very first effect run always sees no change.
  const previousIsOnlineRef = useRef(isOnline)

  // T-34 (KAN-17): starts once, on mount, only for an account that
  // hasn't completed (or skipped) the tour before — see
  // lib/tourCompletion.ts for why user_metadata, not localStorage or a
  // new profiles column. -1 means inactive; a real index means active.
  const [tourStepIndex, setTourStepIndex] = useState(() => (hasCompletedTour(session) ? -1 : 0))
  const isTourActive = tourStepIndex >= 0

  function endTour(): void {
    setTourStepIndex(-1)
    markTourCompleted().catch(() => {
      // Swallowed deliberately, same reasoning as sync above — worst
      // case this account sees the tour again next sign-in, not a
      // broken UI this one.
    })
  }

  function advanceTour(): void {
    setTourStepIndex((current) => (current + 1 >= TOUR_STEPS.length ? -1 : current + 1))
    if (tourStepIndex + 1 >= TOUR_STEPS.length) {
      markTourCompleted().catch(() => {})
    }
  }

  // T-16: "synced from Supabase on successful connection" — once right
  // after sign-in (this effect's first run, since this component only
  // mounts once signed in) and again on every real reconnect (isOnline
  // flipping back to true). Deliberately not guarded on isOnline being
  // true before attempting — a doomed attempt while genuinely offline
  // just fails and is swallowed below, same cost as not trying. Errors
  // are swallowed deliberately: a failed sync just means the cache stays
  // at whatever it last held (or empty, on a genuinely first run) — it
  // must never block the app from using the real, direct online queries
  // that already work.
  useEffect(() => {
    // T-35 (KAN-67): the second real firing site — genuinely silent
    // before this, unlike filter-applied (Catalogue.tsx), which at
    // least changed the visible grid. Only fires on an actual
    // offline→online transition, not the initial post-sign-in sync.
    const isReconnect = !previousIsOnlineRef.current && isOnline
    syncCacheFromSupabase()
      .then(() => {
        if (isReconnect) showToast('Back online — catalogue synced')
      })
      .catch(() => {
        // Swallowed deliberately — see the comment above this effect.
      })
    previousIsOnlineRef.current = isOnline
  }, [isOnline, showToast])

  // US-55: global "?" opens the shortcuts modal — guarded so typing a
  // literal "?" into a form field (e.g. a password) doesn't pop it open.
  // Escape-to-close is handled by ShortcutsModal itself via
  // useEscapeToClose, not duplicated here.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== '?') return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      setIsShortcutsOpen(true)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Ordered id list for the currently active query, cached against the
  // query it was fetched for — refetched only when that query actually
  // changes, not on every navigation step within it. Fetched lazily, only
  // once a cover is actually opened, so browsing the grid alone never
  // triggers this extra query.
  const navCache = useRef<{ key: string; ids: string[] } | null>(null)
  const [navIds, setNavIds] = useState<string[] | null>(null)

  function selectCover(id: string): void {
    recordView(id)
    setSelectedCoverId(id)

    const key = queryCacheKey(query)
    if (navCache.current?.key === key) {
      setNavIds(navCache.current.ids)
      return
    }

    setNavIds(null)
    fetchCatalogueOrderedIds({
      postalCircleIds: query.appliedFilters.postalCircleIds,
      productCategories: query.appliedFilters.productCategories,
      years: query.appliedFilters.years,
      giItemName: query.giItemNameFilter ?? undefined,
      searchTerm: query.searchTerm,
      sort: query.sort
    })
      .then((ids) => {
        navCache.current = { key, ids }
        setNavIds(ids)
      })
      .catch(() => {
        // Prev/next is a nice-to-have on top of an already-loaded Detail
        // view — a failure here shouldn't block the cover itself from
        // showing, it just means no nav controls render (position stays
        // null).
      })
  }

  function filterByGiTag(giItemName: string): void {
    dispatch({ type: 'SET_GI_TAG_FILTER', giItemName })
    // Always lands on the grid to see the filtered result, regardless of
    // which screen Detail was opened from (e.g. a Home recently-viewed
    // card) — the whole point of tapping a tag is to see the filtered
    // Catalogue, not to stay wherever the cover happened to be opened.
    navigateTo('catalogue')
  }

  const currentIndex = navIds && selectedCoverId ? navIds.indexOf(selectedCoverId) : -1
  const position: DetailNavPosition | null =
    navIds && currentIndex >= 0 ? { index: currentIndex, total: navIds.length } : null
  const previousCoverId = navIds && currentIndex > 0 ? navIds[currentIndex - 1] : null
  const nextCoverId =
    navIds && currentIndex >= 0 && currentIndex < navIds.length - 1
      ? navIds[currentIndex + 1]
      : null

  // A real navigation action, not just a background state change — closes
  // Detail if it's open, matching what "navigate to X" actually means to
  // a user. Found live: navigating via the menu while Detail was open
  // silently changed `screen` underneath it, so Detail's own "Back to
  // catalogue" button (unaffected, unaware `screen` had changed) landed
  // on Home instead of Catalogue — a real, confusing bug, not a
  // hypothetical one.
  function navigateTo(target: Screen): void {
    setSelectedCoverId(null)
    setScreen(target)
    // T-34 (KAN-17): the tour's one step that advances via a real
    // interaction rather than its own Next button (see tourSteps.ts) —
    // Home's actual CTA already routes through here, and so does every
    // other way of reaching Catalogue (e.g. the sidebar), so this covers
    // "however the user got there" without watching `screen` in an
    // effect just to notice a change this same function just made.
    if (isTourActive && TOUR_STEPS[tourStepIndex]?.advancesViaRealInteraction && target === 'catalogue') {
      advanceTour()
    }
  }

  function renderScreen(): React.JSX.Element {
    if (selectedCoverId) {
      return (
        <Detail
          coverId={selectedCoverId}
          onBack={() => setSelectedCoverId(null)}
          onSelectCover={selectCover}
          previousCoverId={previousCoverId}
          nextCoverId={nextCoverId}
          position={position}
          onFilterByGiTag={filterByGiTag}
        />
      )
    }
    switch (screen) {
      case 'home':
        return <Home onEnterCatalogue={() => navigateTo('catalogue')} onSelectCover={selectCover} />
      case 'catalogue':
        return <Catalogue query={query} dispatch={dispatch} onSelectCover={selectCover} />
      case 'settings':
        return (
          <Settings
            themePreference={themePreference}
            onThemePreferenceChange={onThemePreferenceChange}
          />
        )
    }
  }

  return (
    <>
      <Sidebar
        currentScreen={screen}
        onNavigate={navigateTo}
        isShortcutsOpen={isShortcutsOpen}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />
      <div className="ml-[220px] flex-1">
        {!isOnline && <OfflineBanner />}
        {renderScreen()}
      </div>
      {isShortcutsOpen && <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} />}
      {isTourActive && (
        <GuidedTour
          key={tourStepIndex}
          stepIndex={tourStepIndex}
          onNext={advanceTour}
          onSkip={endTour}
        />
      )}
    </>
  )
}

function App(): React.JSX.Element {
  // 'loading' until the initial session check resolves, so we never flash
  // the Login screen before redirecting an already-signed-in Collector —
  // same gated-render principle as the Admin repo's per-page session guards.
  const [session, setSession] = useState<Session | null | 'loading'>('loading')
  // T-30 (KAN-57): called at the true top level, not inside SignedIn — the
  // theme must apply to Login/SplashScreen too, not just once signed in.
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === 'loading') return <SplashScreen />
  return session ? (
    <SignedIn
      session={session}
      themePreference={themePreference}
      onThemePreferenceChange={setThemePreference}
    />
  ) : (
    <Login />
  )
}

export default App
