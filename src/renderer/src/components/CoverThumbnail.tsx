import { useCoverImage } from '../lib/useCoverImage'

interface CoverThumbnailProps {
  imageFile: string
  alt: string
}

export default function CoverThumbnail({ imageFile, alt }: CoverThumbnailProps): React.JSX.Element {
  const image = useCoverImage(imageFile)

  if (image.status === 'loaded') {
    return <img src={image.url} alt={alt} className="w-24 h-24 object-cover rounded" />
  }

  if (image.status === 'failed') {
    return (
      <div className="w-24 h-24 rounded bg-gray-100 flex items-center justify-center text-center px-1 text-xs text-gray-400">
        Couldn&apos;t load this photo
      </div>
    )
  }

  return (
    <div className="w-24 h-24 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
      Loading…
    </div>
  )
}
