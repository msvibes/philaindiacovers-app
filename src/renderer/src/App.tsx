import { useEffect, useReducer, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabaseClient'
import { fetchCatalogueOrderedIds } from './lib/covers'
import {
  catalogueReducer,
  initialCatalogueQueryState,
  type CatalogueQueryState
} from './lib/catalogueQuery'
import { useRecentlyViewed } from './lib/useRecentlyViewed'
import AppHeader from './components/AppHeader'
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
function SignedIn(): React.JSX.Element {
  // FR-01: lands on Home, not the grid, on every sign-in/launch.
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null)
  const [query, dispatch] = useReducer(catalogueReducer, initialCatalogueQueryState)
  const { recordView } = useRecentlyViewed()

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
    navIds && currentIndex >= 0 && currentIndex < navIds.length - 1 ? navIds[currentIndex + 1] : null

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
        return <Settings />
    }
  }

  return (
    <>
      <AppHeader currentScreen={screen} onNavigate={navigateTo} />
      {renderScreen()}
    </>
  )
}

function App(): React.JSX.Element | null {
  // 'loading' until the initial session check resolves, so we never flash
  // the Login screen before redirecting an already-signed-in Collector —
  // same gated-render principle as the Admin repo's per-page session guards.
  const [session, setSession] = useState<Session | null | 'loading'>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))

    return () => subscription.unsubscribe()
  }, [])

  if (session === 'loading') return null
  return session ? <SignedIn /> : <Login />
}

export default App
