import { useReducer } from 'react'
import Catalogue from './Catalogue'
import { catalogueReducer, initialCatalogueQueryState } from '../lib/catalogueQuery'
import ToastProvider from '../components/ToastProvider'

// T-25 lifted Catalogue's filter/search/sort/page state up into App.tsx,
// making Catalogue a controlled component. Every Catalogue test needs the
// same real useReducer wiring App.tsx actually uses (not a mock reducer)
// so these tests exercise real state transitions, not an approximation of
// them — this small harness is shared across all five Catalogue.*.test.tsx
// files rather than duplicated in each.
//
// T-35 (KAN-67): Catalogue now calls useToast(), which throws outside a
// ToastProvider — wrapped here once so none of the five test files
// needed individual updates, same sharing rationale as the reducer above.
export default function CatalogueTestHarness({
  onSelectCover
}: {
  onSelectCover: (id: string) => void
}): React.JSX.Element {
  const [query, dispatch] = useReducer(catalogueReducer, initialCatalogueQueryState)
  return (
    <ToastProvider>
      <Catalogue query={query} dispatch={dispatch} onSelectCover={onSelectCover} />
    </ToastProvider>
  )
}
