export type CatalogueViewMode = 'grid' | 'year' | 'region'

interface CatalogueViewToggleProps {
  viewMode: CatalogueViewMode
  onChange: (mode: CatalogueViewMode) => void
}

// T-26 (KAN-62) added Grid/By year as a two-button segmented pattern
// (same as SortControl.tsx, this app's other small view toggle), noting
// the prototype's own .view-tabs already reserved a third "By region" tab
// for the not-yet-built US-50/KAN-61. T-21 (KAN-61) now adds that third
// tab for real.
export default function CatalogueViewToggle({
  viewMode,
  onChange
}: CatalogueViewToggleProps): React.JSX.Element {
  return (
    <div className="inline-flex rounded-lg border border-line overflow-hidden text-sm">
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-pressed={viewMode === 'grid'}
        className={`px-3 py-1.5 ${viewMode === 'grid' ? 'bg-accent text-white' : 'bg-card text-ink-soft'}`}
      >
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange('year')}
        aria-pressed={viewMode === 'year'}
        className={`px-3 py-1.5 border-l border-line ${
          viewMode === 'year' ? 'bg-accent text-white' : 'bg-card text-ink-soft'
        }`}
      >
        By year
      </button>
      <button
        type="button"
        onClick={() => onChange('region')}
        aria-pressed={viewMode === 'region'}
        className={`px-3 py-1.5 border-l border-line ${
          viewMode === 'region' ? 'bg-accent text-white' : 'bg-card text-ink-soft'
        }`}
      >
        By region
      </button>
    </div>
  )
}
