import type { CatalogueQueryParams } from '../lib/covers'
import SortControl from './SortControl'

interface CatalogueToolbarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  onOpenFilters: () => void
  activeFilterCount: number
  sort: CatalogueQueryParams['sort']
  onSortChange: (sort: CatalogueQueryParams['sort']) => void
}

export default function CatalogueToolbar({
  searchTerm,
  onSearchChange,
  onOpenFilters,
  activeFilterCount,
  sort,
  onSortChange
}: CatalogueToolbarProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 sticky top-0 bg-paper py-3 z-10">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by item name, cover name, or description"
        aria-label="Search the catalogue"
        className="flex-1 min-w-[220px] rounded-lg border border-line px-3 py-2 text-sm bg-card"
      />
      <button
        type="button"
        onClick={onOpenFilters}
        className="relative rounded-lg border border-line px-3 py-2 text-sm bg-card text-ink"
      >
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-stamp font-mono text-white text-[10px] w-4 h-4">
            {activeFilterCount}
          </span>
        )}
      </button>
      <SortControl sort={sort} onChange={onSortChange} />
    </div>
  )
}
