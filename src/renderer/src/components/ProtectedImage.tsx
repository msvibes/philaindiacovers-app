interface ProtectedImageProps {
  src: string
  alt: string
  className?: string
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void
}

// KAN-81: Tier 1 (deterrent-level) copy protection, not true protection —
// a determined user can still get around all of this via DevTools,
// screenshots, etc. Applied uniformly everywhere a real cover image
// renders (CoverThumbnail, Detail's FullSizeImage, ImageLightbox), so
// there's exactly one place to get this right rather than three.
//
// draggable={false} + onDragStart preventDefault block React/HTML5-level
// drag; -webkit-user-drag:none additionally blocks Chromium's own native
// "drag this image out to the desktop" affordance, which isn't gated by
// the draggable attribute alone. select-none covers the CSS text/element
// selection vector. onContextMenu preventDefault removes Chromium's
// default image context menu (Save image as…/Copy image) entirely,
// rather than trying to strip individual entries from it.
export default function ProtectedImage({
  src,
  alt,
  className,
  onClick
}: ProtectedImageProps): React.JSX.Element {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onClick={onClick}
      className={`select-none [-webkit-user-drag:none] ${className ?? ''}`}
    />
  )
}
