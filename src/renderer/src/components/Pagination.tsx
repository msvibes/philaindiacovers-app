interface PaginationProps {
  page: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
}

// No design prototype implements pagination at all (confirmed by reading
// both prototypes' source directly — both render their full filtered set
// in one pass), so there's no visual reference here either. Plain
// sequential numbered buttons, windowed around the current page once the
// page count grows past what's comfortable to show in full.
export default function Pagination({
  page,
  totalCount,
  pageSize,
  onPageChange
}: PaginationProps): React.JSX.Element | null {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalPages <= 1) return null

  const windowSize = 2
  const pages = new Set<number>([1, totalPages])
  for (let p = page - windowSize; p <= page + windowSize; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p)
  }
  const sorted = [...pages].sort((a, b) => a - b)

  const items: Array<number | 'ellipsis'> = []
  let previous: number | null = null
  for (const p of sorted) {
    if (previous !== null && p - previous > 1) items.push('ellipsis')
    items.push(p)
    previous = p
  }

  return (
    <nav aria-label="Catalogue pages" className="flex items-center justify-center gap-1 mt-8">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded border border-line text-sm text-ink-soft disabled:opacity-40"
      >
        Previous
      </button>
      {items.map((item, index) =>
        item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-ink-soft">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`px-3 py-1.5 rounded border font-mono text-sm ${
              item === page ? 'bg-accent text-white border-accent' : 'border-line text-ink-soft'
            }`}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded border border-line text-sm text-ink-soft disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  )
}
