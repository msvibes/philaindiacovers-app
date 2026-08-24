import { useCoverImage } from '../lib/useCoverImage'

interface CoverThumbnailProps {
  imageFile: string
  alt: string
}

// Fluid, fills the card's full width at a 1:1 aspect ratio — deliberately
// larger than a Midday-reference thumbnail (T-13's own resolved decision:
// Midday is a structure reference only, not an image-proportion one). Only
// caller is CatalogueCard; Detail.tsx has its own separate FullSizeImage.
export default function CoverThumbnail({ imageFile, alt }: CoverThumbnailProps): React.JSX.Element {
  const image = useCoverImage(imageFile)

  if (image.status === 'loaded') {
    return (
      <img
        src={image.url}
        alt={alt}
        className="w-full aspect-square object-cover rounded-t-xl"
      />
    )
  }

  if (image.status === 'failed') {
    return (
      <div className="w-full aspect-square rounded-t-xl bg-line/40 flex items-center justify-center text-center px-2 text-xs text-ink-soft">
        Couldn&apos;t load this photo
      </div>
    )
  }

  return (
    <div className="w-full aspect-square rounded-t-xl bg-line/40 flex items-center justify-center text-xs text-ink-soft">
      Loading…
    </div>
  )
}
