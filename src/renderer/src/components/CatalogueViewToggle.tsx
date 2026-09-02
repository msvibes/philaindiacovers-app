export type CatalogueViewMode = 'grid' | 'year'

interface CatalogueViewToggleProps {
  viewMode: CatalogueViewMode
  onChange: (mode: CatalogueViewMode) => void
}

// T-26 (KAN-62): same two-button segmented pattern as SortControl.tsx
// (this app's other small view toggle) — the prototype's own .view-tabs
// has a third "By region" tab, but that's a separate, not-yet-built task
// (US-50/KAN-61), so only Grid/By year exist here.
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
    </div>
  )
}
