import type { VerifiedCover } from '../lib/covers'
import { formatDateOfIssue, withFallback } from '../lib/covers'
import CoverThumbnail from './CoverThumbnail'

interface CatalogueCardProps {
  cover: VerifiedCover
  onSelect: () => void
}

// Every card shown here is already verification_status='verified' (the
// query itself filters that), so the Verified badge is unconditional —
// unlike the design prototype, which mixes verified/unverified mock rows.
export default function CatalogueCard({ cover, onSelect }: CatalogueCardProps): React.JSX.Element {
  const title = withFallback(cover.nameOfCover, 'Name not recorded yet')
  const subtitle = cover.giItemName ?? 'Item name not recorded yet'
  const category = cover.productCategory ?? 'Category not recorded yet'
  const circle = cover.postalCircleName ?? 'Postal circle not recorded yet'

  return (
    <li className="border border-line rounded-xl bg-card overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition text-left">
      <button type="button" onClick={onSelect} className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-stamp">
        <CoverThumbnail imageFile={cover.imageFile} alt={title} />
        <div className="p-3">
          <p className="font-display font-semibold text-ink text-[14.5px] leading-snug mb-0.5">
            {title}
          </p>
          <p className="text-xs text-ink-soft mb-2">{subtitle}</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10.5px] px-1.5 py-0.5 rounded border border-line bg-paper text-ink-soft">
              {category}
            </span>
            <span className="text-[10.5px] px-1.5 py-0.5 rounded border border-line bg-paper text-ink-soft">
              {circle}
            </span>
            <span className="text-[10.5px] px-1.5 py-0.5 rounded border border-success-border bg-success-bg text-success-text ml-auto">
              Verified
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-2">{formatDateOfIssue(cover.dateOfIssue)}</p>
        </div>
      </button>
    </li>
  )
}
