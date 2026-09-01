import { useEscapeToClose } from '../lib/useEscapeToClose'
import DisclaimerContent from './DisclaimerContent'

interface DisclaimerModalProps {
  isOpen: boolean
  onClose: () => void
}

// T-27: extracted from Signup.tsx's own inline modal (previously the only
// place DisclaimerContent was shown) so Settings can reuse the identical
// shell instead of a second copy of the same overlay/close-button markup.
export default function DisclaimerModal({
  isOpen,
  onClose
}: DisclaimerModalProps): React.JSX.Element | null {
  useEscapeToClose(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-6 z-50" onClick={onClose}>
      <div
        className="bg-card max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-[10px] border border-line p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <DisclaimerContent />
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-9 rounded-lg bg-ink px-4 text-[13px] font-medium text-white hover:bg-[#132038]"
        >
          Close
        </button>
      </div>
    </div>
  )
}
