import { useEffect, useState } from 'react'
import {
  downloadCoverImageUrl,
  fetchVerifiedCovers,
  formatDateOfIssue,
  type VerifiedCover
} from '../lib/covers'

type LoadState = 'loading' | 'ready' | 'empty' | 'error'

export default function Catalogue(): React.JSX.Element {
  const [state, setState] = useState<LoadState>('loading')
  const [covers, setCovers] = useState<VerifiedCover[]>([])
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

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
  }, [])

  useEffect(() => {
    let cancelled = false
    const objectUrls: string[] = []

    covers.forEach((cover) => {
      if (!cover.imageFile) return
      downloadCoverImageUrl(cover.imageFile)
        .then((url) => {
          if (cancelled) return
          objectUrls.push(url)
          setThumbnails((prev) => ({ ...prev, [cover.id]: url }))
        })
        .catch(() => {
          // A missing/failed thumbnail shouldn't take down the whole list —
          // that row just falls back to the placeholder below.
        })
    })

    return () => {
      cancelled = true
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [covers])

  if (state === 'loading') {
    return (
      <main className="p-8">
        <p className="text-gray-500">Dusting off the covers for you…</p>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold mb-2">Well, that didn&apos;t go to plan.</h1>
        <p className="text-gray-500">
          We hit a snag loading the catalogue. Please try again in a moment.
        </p>
      </main>
    )
  }

  if (state === 'empty') {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold mb-2">The shelves are freshly dusted!</h1>
        <p className="text-gray-500">
          Nothing&apos;s been verified into the catalogue just yet — check back soon, new covers
          show up here the moment they&apos;re verified.
        </p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold mb-6">The Catalogue</h1>
      <ul className="space-y-4">
        {covers.map((cover) => (
          <li key={cover.id} className="flex gap-4 border rounded p-4">
            {thumbnails[cover.id] ? (
              <img
                src={thumbnails[cover.id]}
                alt={cover.giItemName ?? 'Cover'}
                className="w-24 h-24 object-cover rounded"
              />
            ) : (
              <div className="w-24 h-24 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                Loading…
              </div>
            )}
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
          </li>
        ))}
      </ul>
    </main>
  )
}
