import type { CatalogueFacetOption } from '../lib/covers'

interface YearTimelineProps {
  years: CatalogueFacetOption<number>[]
  onSelectYear: (year: number) => void
}

// T-26 (KAN-62): reuses fetchCatalogueFacets' already-computed years facet
// (T-13+T-18) — no new query, matching the addendum's own fit criterion
// exactly. Layout/interaction copied from the reference prototype
// (docs/design/app-prototype-v3-full.html's .timeline/.year-row rules and
// renderTimelineView()): most-recent-year first, each row a proportional
// bar (width relative to the single most-covered year), click applies that
// year as the only active filter and returns to the grid. The prototype's
// sibling "By region" tab is a separate, not-yet-built task (US-50/KAN-61)
// — deliberately not built here alongside this one.
export default function YearTimeline({ years, onSelectYear }: YearTimelineProps): React.JSX.Element {
  const sorted = [...years].sort((a, b) => b.value - a.value)
  const max = Math.max(...sorted.map((y) => y.count), 1)

  return (
    <div className="flex flex-col gap-2.5 py-2.5">
      {sorted.map((year) => (
        <button
          key={year.value}
          type="button"
          onClick={() => onSelectYear(year.value)}
          className="flex items-center gap-3.5 rounded-[10px] border border-line bg-card px-3.5 py-2.5 text-left"
        >
          <span className="font-display font-semibold text-[16px] w-[52px] shrink-0">
            {year.value}
          </span>
          <span className="flex-1 h-2 rounded bg-paper overflow-hidden">
            <span
              className="block h-full rounded bg-stamp"
              style={{ width: `${((year.count / max) * 100).toFixed(0)}%` }}
            />
          </span>
          <span className="text-[11.5px] text-ink-soft font-mono w-[60px] text-right shrink-0">
            {year.count} cover{year.count === 1 ? '' : 's'}
          </span>
        </button>
      ))}
    </div>
  )
}
