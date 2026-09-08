import { SHADING_FILLS } from '../lib/regionCoverStats'

// KAN-85. Draws from the exact same SHADING_FILLS the map itself uses
// (regionCoverStats.ts), so this can never silently drift out of sync
// with what's actually shaded on the map.
//
// Labels are deliberately relative ("Fewer" -> "More"), not numeric --
// getShadingLevel scales each level to the CURRENT max count on the map,
// so the same shade means a different real count depending on what's
// currently shown. Printing a number here would be actively misleading.
// Real per-region counts stay the hover tooltip's job, same division of
// labor this feature already has today.
const RAMP_LEVELS: (0 | 1 | 2 | 3 | 4)[] = [1, 2, 3, 4]

export default function IndiaMapLegend(): React.JSX.Element {
  return (
    <div
      className="absolute bottom-2 left-2 rounded-lg border border-line bg-card px-2.5 py-2 text-[10.5px] text-ink-soft shadow-sm"
      aria-label="Map shading legend"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="inline-block w-3 h-3 rounded-sm border border-line-strong"
          style={{ backgroundColor: SHADING_FILLS[0] }}
        />
        <span>No covers yet</span>
      </div>
      <div className="flex items-center gap-1">
        <span>Fewer</span>
        <span className="flex gap-0.5">
          {RAMP_LEVELS.map((level) => (
            <span
              key={level}
              className="inline-block w-3 h-3 rounded-sm border border-line-strong"
              style={{ backgroundColor: SHADING_FILLS[level] }}
            />
          ))}
        </span>
        <span>More</span>
      </div>
    </div>
  )
}
