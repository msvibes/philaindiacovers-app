interface EyebrowProps {
  children: string
}

// T-33 (2026-08-26 Lovable-comparison finding): a small uppercase label
// above each screen's main heading. Same exact styling everywhere
// (var(--stamp), ~11px, ~0.05em letter-spacing), so it's one shared
// component rather than four copies of the same className string.
export default function Eyebrow({ children }: EyebrowProps): React.JSX.Element {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-stamp mb-1.5">
      {children}
    </p>
  )
}
