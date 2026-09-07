import { useEscapeToClose } from '../lib/useEscapeToClose'
import ProtectedImage from './ProtectedImage'

interface ImageLightboxProps {
  isOpen: boolean
  imageUrl: string
  alt: string
  onClose: () => void
}

// KAN-78: reuses the same modal shell as DisclaimerModal/Sidebar's
// logout-confirm (scrim, click-outside-to-close, useEscapeToClose) rather
// than inventing new overlay mechanics for this one screen.
export default function ImageLightbox({
  isOpen,
  imageUrl,
  alt,
  onClose
}: ImageLightboxProps): React.JSX.Element | null {
  useEscapeToClose(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-scrim/80 flex items-center justify-center p-6 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      {/* Not wrapped in a stopPropagation() inner box like the other
          modals -- for a lightbox, clicking anywhere that isn't the image
          itself should close it, same as most photo-viewer conventions
          (the image is the "content", the rest of the screen is
          "outside"). The close button is redundant with click-outside/
          Escape but kept visible for discoverability -- nothing here
          hints a click closes it otherwise. */}
      <ProtectedImage
        src={imageUrl}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] rounded object-contain cursor-default"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-6 right-6 h-9 w-9 rounded-full bg-card text-ink flex items-center justify-center text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
