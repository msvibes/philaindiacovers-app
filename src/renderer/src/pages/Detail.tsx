import { useEffect, useState } from 'react'
import {
  buildWhatsAppShareText,
  fetchVerifiedCoverById,
  formatDateOfIssue,
  withFallback,
  type CoverDetail
} from '../lib/covers'
import { useCoverImage } from '../lib/useCoverImage'
import VerifiedBadge from '../components/VerifiedBadge'
import Eyebrow from '../components/Eyebrow'
import ImageLightbox from '../components/ImageLightbox'

type LoadState = 'loading' | 'ready' | 'not-found' | 'error'

export interface DetailNavPosition {
  index: number
  total: number
}

interface DetailProps {
  coverId: string
  onBack: () => void
  // FR-12: prev/next within the currently active catalogue query (App.tsx
  // owns and computes these — see its own comment for how the ordered id
  // list is cached). All three are null until that list has loaded, so
  // this screen can render without nav controls briefly rather than block
  // on it.
  onSelectCover: (id: string) => void
  previousCoverId: string | null
  nextCoverId: string | null
  position: DetailNavPosition | null
  // FR-14: tapping GI Item Name filters the catalogue to every cover
  // sharing it, then returns to the grid to show that result.
  onFilterByGiTag: (giItemName: string) => void
}

// FR-11: takes an array, not a single file, so the component boundary is
// already gallery-shaped even though exactly one image exists per cover
// today (the covers schema has a single image_file column, nothing to
// navigate yet) — satisfies "supports >1 image without rework" without
// building thumbnail-strip/multi-image UI against data that doesn't exist.
function FullSizeImage({
  images,
  alt,
  onZoom
}: {
  images: string[]
  alt: string
  onZoom: (url: string) => void
}): React.JSX.Element {
  const image = useCoverImage(images[0])

  if (image.status === 'loaded') {
    // KAN-78: the whole image is the zoom trigger, not a separate
    // overlaid button -- matches how photo-viewer affordances usually
    // work (click the photo itself), and cursor-zoom-in is the one visual
    // hint needed to signal it's interactive.
    return (
      <button type="button" onClick={() => onZoom(image.url)} className="cursor-zoom-in">
        <img src={image.url} alt={alt} className="w-full max-w-md rounded" />
      </button>
    )
  }

  if (image.status === 'failed') {
    return (
      <div className="w-full max-w-md aspect-square rounded bg-paper flex items-center justify-center text-sm text-ink-soft">
        Couldn&apos;t load this photo
      </div>
    )
  }

  return (
    <div className="w-full max-w-md aspect-square rounded bg-paper flex items-center justify-center text-sm text-ink-soft">
      Loading…
    </div>
  )
}

function Field({
  label,
  value,
  onValueClick
}: {
  label: string
  value: string
  onValueClick?: () => void
}): React.JSX.Element {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd>
        {onValueClick ? (
          <button
            type="button"
            onClick={onValueClick}
            className="text-stamp underline underline-offset-2 text-left"
          >
            {value}
          </button>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

export default function Detail({
  coverId,
  onBack,
  onSelectCover,
  previousCoverId,
  nextCoverId,
  position,
  onFilterByGiTag
}: DetailProps): React.JSX.Element {
  const [state, setState] = useState<LoadState>('loading')
  const [cover, setCover] = useState<CoverDetail | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null)

  // FR-12 keyboard nav — no text inputs exist on this screen today, so no
  // focused-element guard is needed to avoid hijacking typing elsewhere.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'ArrowLeft' && previousCoverId) onSelectCover(previousCoverId)
      if (event.key === 'ArrowRight' && nextCoverId) onSelectCover(nextCoverId)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previousCoverId, nextCoverId, onSelectCover])

  useEffect(() => {
    let cancelled = false

    fetchVerifiedCoverById(coverId)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setState('not-found')
          return
        }
        setCover(result)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [coverId, retryCount])

  return (
    <main className="p-8">
      <button type="button" onClick={onBack} className="text-sm text-ink-soft mb-6">
        ← Back to catalogue
      </button>

      {state === 'loading' && <p className="text-ink-soft">Loading this cover…</p>}

      {state === 'error' && (
        <div>
          <h1 className="text-xl font-semibold mb-2 font-display text-ink">
            Well, that didn&apos;t go to plan.
          </h1>
          <p className="text-ink-soft mb-4">Give it another go?</p>
          <button
            type="button"
            onClick={() => {
              setState('loading')
              setRetryCount((count) => count + 1)
            }}
            className="rounded bg-accent px-4 py-2 text-white hover:bg-accent-hover"
          >
            Try again
          </button>
        </div>
      )}

      {state === 'not-found' && (
        <div>
          <h1 className="text-xl font-semibold mb-2 font-display text-ink">
            We couldn&apos;t find that cover.
          </h1>
          <p className="text-ink-soft">
            It may not be verified anymore — head back to the catalogue to keep browsing.
          </p>
        </div>
      )}

      {state === 'ready' && cover && (
        <div className="max-w-2xl space-y-6">
          {position && (
            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                disabled={!previousCoverId}
                onClick={() => previousCoverId && onSelectCover(previousCoverId)}
                className="rounded border border-line px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-mono text-ink-soft">
                {position.index + 1} of {position.total}
              </span>
              <button
                type="button"
                disabled={!nextCoverId}
                onClick={() => nextCoverId && onSelectCover(nextCoverId)}
                className="rounded border border-line px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
          <FullSizeImage
            images={[cover.imageFile]}
            alt={withFallback(cover.nameOfCover, 'Cover')}
            onZoom={setZoomedImageUrl}
          />
          <div>
            <Eyebrow>Special Cover</Eyebrow>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold font-display text-ink">
                {withFallback(cover.nameOfCover, 'Name not recorded yet')}
              </h1>
              <VerifiedBadge />
            </div>
            {/* KAN-79: text-only -- this app has no per-cover public URL to
                share, confirmed before scoping this at all (see that
                ticket). wa.me/?text= with no phone number opens WhatsApp's
                own contact picker; the actual open happens via
                window.open, which src/main/index.ts's existing
                setWindowOpenHandler already routes to shell.openExternal
                -- the same mechanism Settings.tsx's GitHub links already
                rely on, no new IPC needed. */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(buildWhatsAppShareText(cover))}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-[13px] text-stamp underline"
            >
              Share to WhatsApp
            </a>
          </div>
          <dl className="space-y-4">
            <Field
              label="GI Item Name"
              value={cover.giItemName ?? 'Item name not recorded yet'}
              onValueClick={cover.giItemName ? () => onFilterByGiTag(cover.giItemName!) : undefined}
            />
            <Field
              label="Product Category"
              value={cover.productCategory ?? 'Category not recorded yet'}
            />
            <Field label="Date of Issue" value={formatDateOfIssue(cover.dateOfIssue)} />
            <Field
              label="GI Registration Number"
              value={withFallback(cover.giRegistrationNumber, 'Registration number not recorded yet')}
            />
            <Field
              label="Description of Cancellation"
              value={withFallback(
                cover.cancellationDescription,
                'Cancellation details not recorded yet'
              )}
            />
            <Field
              label="Description of Cachet"
              value={withFallback(cover.cachetDescription, 'Cachet details not recorded yet')}
            />
            <Field
              label="Overall Description"
              value={withFallback(cover.overallDescription, 'No overall description recorded yet')}
            />
            <Field
              label="Place of Issue"
              value={withFallback(cover.placeOfIssue, 'Place of issue not recorded yet')}
            />
          </dl>
        </div>
      )}

      <ImageLightbox
        isOpen={zoomedImageUrl !== null}
        imageUrl={zoomedImageUrl ?? ''}
        alt={withFallback(cover?.nameOfCover, 'Cover')}
        onClose={() => setZoomedImageUrl(null)}
      />
    </main>
  )
}
