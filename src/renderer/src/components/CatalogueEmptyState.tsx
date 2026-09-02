interface CatalogueEmptyStateProps {
  quickCategories: string[]
  onClearFilters: () => void
  onTryCategory: (category: string) => void
}

// Only for the filtered-to-zero case (real filters/search active but
// nothing matches) — a genuinely empty catalogue keeps the existing
// "freshly dusted" copy instead (see Catalogue.tsx). Matches the richer of
// the two design prototypes' empty states (catalogue-prototype.html);
// app-prototype-v3-full.html's is a bare text fallback with no actions,
// confirmed less complete by reading both sources directly. Quick-category
// suggestions are derived from real facet data by the caller, not
// hardcoded — the prototype's own "Try: Textile" values may not exist in
// the real dataset.
export default function CatalogueEmptyState({
  quickCategories,
  onClearFilters,
  onTryCategory
}: CatalogueEmptyStateProps): React.JSX.Element {
  return (
    <div className="text-center py-16 px-6">
      <h2 className="text-lg font-semibold text-ink mb-1">No covers match these filters</h2>
      <p className="text-ink-soft mb-6">
        Try removing a filter, or search a different item name, category, or postal circle.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded bg-accent px-4 py-2 text-white text-sm hover:bg-accent-hover"
        >
          Clear all filters
        </button>
        {quickCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onTryCategory(category)}
            className="rounded border border-line px-4 py-2 text-sm text-ink-soft"
          >
            Try: {category}
          </button>
        ))}
      </div>
    </div>
  )
}
