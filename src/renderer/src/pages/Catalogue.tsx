import { useEffect, useState } from 'react'
import { fetchVerifiedCovers, formatDateOfIssue, type VerifiedCover } from '../lib/covers'
import CoverThumbnail from '../components/CoverThumbnail'

type LoadState = 'loading' | 'ready' | 'empty' | 'error'

interface CatalogueProps {
  onSelectCover: (id: string) => void
}

export default function Catalogue({ onSelectCover }: CatalogueProps): React.JSX.Element {
  const [state, setState] = useState<LoadState>('loading')
  const [covers, setCovers] = useState<VerifiedCover[]>([])
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetchVerifiedCovers()
      .then((results) => {
        if (cancelled) return
        setCovers(results)
        setState(results.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [retryCount])

  if (state === 'loading') {
    return (
      <main className="p-8">
        <p className="text-gray-500">Loading the catalogue…</p>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main className="p-8">
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
      </main>
    )
  }

  if (state === 'empty') {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold mb-2">The shelves are freshly dusted</h1>
        <p className="text-gray-500">
          The catalogue&apos;s still getting started — nothing&apos;s been verified in yet. Check
          back soon as more covers get verified.
        </p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold mb-6">The Catalogue</h1>
      <ul className="space-y-4">
        {covers.map((cover) => (
          <li key={cover.id} className="border rounded">
            <button
              type="button"
              onClick={() => onSelectCover(cover.id)}
              className="flex gap-4 p-4 w-full text-left"
            >
              <CoverThumbnail imageFile={cover.imageFile} alt={cover.giItemName ?? 'Cover'} />
              <div>
                <p className="font-medium">{cover.giItemName ?? 'Name not recorded yet'}</p>
                <p className="text-sm text-gray-500">
                  {cover.productCategory ?? 'Category not recorded yet'}
                </p>
                <p className="text-sm text-gray-500">
                  {cover.postalCircleName ?? 'Postal circle not recorded yet'}
                </p>
                <p className="text-sm text-gray-500">{formatDateOfIssue(cover.dateOfIssue)}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
