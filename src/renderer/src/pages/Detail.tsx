import { useEffect, useState } from 'react'
import {
  fetchVerifiedCoverById,
  formatDateOfIssue,
  withFallback,
  type CoverDetail
} from '../lib/covers'
import { useCoverImage } from '../lib/useCoverImage'

type LoadState = 'loading' | 'ready' | 'not-found' | 'error'

interface DetailProps {
  coverId: string
  onBack: () => void
}

function FullSizeImage({ imageFile, alt }: { imageFile: string; alt: string }): React.JSX.Element {
  const image = useCoverImage(imageFile)

  if (image.status === 'loaded') {
    return <img src={image.url} alt={alt} className="w-full max-w-md rounded" />
  }

  if (image.status === 'failed') {
    return (
      <div className="w-full max-w-md aspect-square rounded bg-gray-100 flex items-center justify-center text-sm text-gray-400">
        Couldn&apos;t load this photo
      </div>
    )
  }

  return (
    <div className="w-full max-w-md aspect-square rounded bg-gray-100 flex items-center justify-center text-sm text-gray-400">
      Loading…
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export default function Detail({ coverId, onBack }: DetailProps): React.JSX.Element {
  const [state, setState] = useState<LoadState>('loading')
  const [cover, setCover] = useState<CoverDetail | null>(null)
  const [retryCount, setRetryCount] = useState(0)

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
      <button type="button" onClick={onBack} className="text-sm text-gray-500 mb-6">
        ← Back to catalogue
      </button>

      {state === 'loading' && <p className="text-gray-500">Loading this cover…</p>}

      {state === 'error' && (
        <div>
          <h1 className="text-xl font-semibold mb-2">Well, that didn&apos;t go to plan.</h1>
          <p className="text-gray-500 mb-4">Give it another go?</p>
          <button
            type="button"
            onClick={() => {
              setState('loading')
              setRetryCount((count) => count + 1)
            }}
            className="rounded bg-black px-4 py-2 text-white"
          >
            Try again
          </button>
        </div>
      )}

      {state === 'not-found' && (
        <div>
          <h1 className="text-xl font-semibold mb-2">We couldn&apos;t find that cover.</h1>
          <p className="text-gray-500">
            It may not be verified anymore — head back to the catalogue to keep browsing.
          </p>
        </div>
      )}

      {state === 'ready' && cover && (
        <div className="max-w-2xl space-y-6">
          <FullSizeImage
            imageFile={cover.imageFile}
            alt={withFallback(cover.nameOfCover, 'Cover')}
          />
          <h1 className="text-xl font-semibold">
            {withFallback(cover.nameOfCover, 'Name not recorded yet')}
          </h1>
          <dl className="space-y-4">
            <Field label="GI Item Name" value={cover.giItemName ?? 'Item name not recorded yet'} />
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
    </main>
  )
}
