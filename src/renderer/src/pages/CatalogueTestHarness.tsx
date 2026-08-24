import { useReducer } from 'react'
import Catalogue from './Catalogue'
import { catalogueReducer, initialCatalogueQueryState } from '../lib/catalogueQuery'

// T-25 lifted Catalogue's filter/search/sort/page state up into App.tsx,
// making Catalogue a controlled component. Every Catalogue test needs the
// same real useReducer wiring App.tsx actually uses (not a mock reducer)
// so these tests exercise real state transitions, not an approximation of
// them — this small harness is shared across all five Catalogue.*.test.tsx
// files rather than duplicated in each.
export default function CatalogueTestHarness({
  onSelectCover
}: {
  onSelectCover: (id: string) => void
}): React.JSX.Element {
  const [query, dispatch] = useReducer(catalogueReducer, initialCatalogueQueryState)
  return <Catalogue query={query} dispatch={dispatch} onSelectCover={onSelectCover} />
}
