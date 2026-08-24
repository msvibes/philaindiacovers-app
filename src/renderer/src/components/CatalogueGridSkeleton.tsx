// 8-card shimmer grid, matching the prototype's own skeleton shape — but
// shown only while the real fetch is in flight, not for a fixed delay.
// The prototype's ~850ms fixed timeout is a demo artifact, not a real
// requirement, confirmed by reading its source directly.
export default function CatalogueGridSkeleton(): React.JSX.Element {
  return (
    <ul
      role="status"
      aria-label="Loading the catalogue…"
      className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <li key={index} className="border border-line rounded-xl bg-card overflow-hidden">
          <div className="w-full aspect-square bg-line/40 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3.5 w-4/5 rounded bg-line/40 animate-pulse" />
            <div className="h-3 w-3/5 rounded bg-line/40 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  )
}
