// FR-13: matches the design prototype's .verified-tip/.vt-pop pattern —
// pure CSS :hover reveal, no JS/ARIA tooltip library, consistent with this
// project's already-logged decision to defer broader accessibility work
// (PRD Addendum §3.2). One small, near-zero-cost improvement over the
// prototype: also reveals on :focus-visible, via Tailwind's peer/group
// utilities below, so a keyboard user tabbing to the badge isn't left with
// zero explanation for zero extra cost.
export default function VerifiedBadge(): React.JSX.Element {
  return (
    <span
      tabIndex={0}
      className="group relative inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-success-border bg-success-bg text-success-text cursor-help focus-visible:outline focus-visible:outline-2 focus-visible:outline-stamp"
    >
      Verified
      <span
        role="tooltip"
        className="hidden group-hover:block group-focus-visible:block absolute bottom-[calc(100%+6px)] left-0 w-52 text-left font-normal normal-case text-[11px] leading-relaxed bg-ink text-paper rounded-lg px-2.5 py-2 z-10"
      >
        Reviewed and confirmed accurate by a philately subject-matter-expert verifier before
        publishing to the catalogue.
      </span>
    </span>
  )
}
