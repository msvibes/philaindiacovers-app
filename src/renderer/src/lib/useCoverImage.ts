import { useEffect, useState } from 'react'
import { downloadCoverImageUrl } from './covers'

export type CoverImageState =
  | { status: 'loading' }
  | { status: 'loaded'; url: string }
  | { status: 'failed' }

// Shared by the catalogue list's thumbnails and the detail view's
// full-size image — same download()-then-object-URL mechanics either way,
// just displayed at different sizes. 'failed' is a real, reachable state
// (network error, a Storage object that's gone missing despite the DB row
// referencing it) — distinct from the now-impossible "no image_file at
// all" case, which the covers table's NOT NULL constraint rules out.
export function useCoverImage(imageFile: string): CoverImageState {
  // No setState('loading') inside the effect on re-run — imageFile is fixed
  // for the lifetime of every real caller (a Catalogue row, a Detail
  // screen), so the initial state below is the only 'loading' this hook
  // needs to produce in practice; resetting it synchronously inside the
  // effect body is exactly the anti-pattern React's own lint rule flags.
  const [state, setState] = useState<CoverImageState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | undefined

    downloadCoverImageUrl(imageFile)
      .then((url) => {
        if (cancelled) return
        objectUrl = url
        setState({ status: 'loaded', url })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'failed' })
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageFile])

  return state
}
