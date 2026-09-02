import type { CatalogueQueryParams } from '../lib/covers'

type SortMode = CatalogueQueryParams['sort']

interface SortControlProps {
  sort: SortMode
  onChange: (sort: SortMode) => void
}

// A two-button toggle — US-10's own AC uses the word "toggle" literally,
// and no design prototype implements a sort control at all (confirmed by
// reading both prototypes' source directly), so there's no visual
// reference to match; this is the simplest widget that satisfies the
// wording without inventing an unreferenced dropdown.
export default function SortControl({ sort, onChange }: SortControlProps): React.JSX.Element {
  return (
    <div className="inline-flex rounded-lg border border-line overflow-hidden text-sm">
      <button
        type="button"
        onClick={() => onChange('newest')}
        aria-pressed={sort === 'newest'}
        className={`px-3 py-1.5 ${sort === 'newest' ? 'bg-accent text-white' : 'bg-card text-ink-soft'}`}
      >
        Newest first
      </button>
      <button
        type="button"
        onClick={() => onChange('alphabetical')}
        aria-pressed={sort === 'alphabetical'}
        className={`px-3 py-1.5 border-l border-line ${sort === 'alphabetical' ? 'bg-accent text-white' : 'bg-card text-ink-soft'}`}
      >
        A–Z
      </button>
    </div>
  )
}
