interface HomeTileProps {
  label: string
  // One of the existing design-system tokens, not a new hue -- the Home
  // redesign's own scope boundary (2026-09-15): "colorful tiles" means each
  // tile gets a distinct, purposeful accent from tokens already in
  // base.css's @theme block (each with a checked dark-mode pair), not a
  // new palette. Extend this union, not raw color values, if a future
  // tile needs a token not listed here yet.
  accent: 'accent' | 'stamp' | 'success' | 'choropleth-3'
  onClick: () => void
  dataTour?: string
}

const ACCENT_BORDER_CLASSES: Record<HomeTileProps['accent'], string> = {
  accent: 'border-l-accent',
  stamp: 'border-l-stamp',
  success: 'border-l-success-text',
  'choropleth-3': 'border-l-choropleth-3'
}

// Home redesign (2026-09-15): a small set of distinct entry-point tiles,
// replacing the single plain CTA -- same structural idea as Duolingo's
// "Your collections" tile row, not its visual style (this project's own
// serif/muted palette stays exactly as-is, only the layout pattern is
// borrowed). Deliberately a plain <button>, not a link/card-with-icon --
// no icon set exists in this codebase yet, and inventing one is out of
// scope for this pass; the colored left border (the same treatment
// Sidebar's active-nav-row already uses) carries the "distinct tile"
// feeling without it. Label-only, deliberately -- an earlier draft added
// a cover-name hint under the Jump-back-in tile, but that duplicated text
// already visible one section down in Recently Viewed, breaking two
// existing Home tests on ambiguous getByText/getByRole matches. Caught by
// the new no-regression standing rule's own test-suite check, not shipped.
export default function HomeTile({
  label,
  accent,
  onClick,
  dataTour
}: HomeTileProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={dataTour}
      className={`flex-1 min-w-[160px] rounded-lg border border-line bg-card px-5 py-4 text-left border-l-[3px] hover:bg-paper transition-colors ${ACCENT_BORDER_CLASSES[accent]}`}
    >
      <span className="block font-display font-semibold text-ink">{label}</span>
    </button>
  )
}
