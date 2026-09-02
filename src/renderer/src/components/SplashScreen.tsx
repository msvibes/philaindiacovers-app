// T-36 (KAN-73): shown while App.tsx's `session === 'loading'` state is
// active — the real Supabase session check resolving on launch. Previously
// an unstyled `return null`, likely a blank flash. Exact layout/copy
// sourced directly from the approved prototype
// (docs/design/app-prototype-v3-full.html's `.splash`/`.dots` rules and
// its literal screen markup), not the addendum's own shortened paraphrase
// of the same copy ("Connecting..." there vs. the prototype's actual
// "Connecting to the catalogue…") — the prototype is the same
// authoritative source this app's other screens were built against.
//
// Deliberately has no timing/delay logic of its own — how long this stays
// mounted is entirely up to how long the real session check in App.tsx
// takes. A near-instant check is correct to barely show this at all, not
// a bug to paper over with an artificial minimum display time.
export default function SplashScreen(): React.JSX.Element {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
      <h1 className="font-display text-[22px] font-semibold mb-1.5">PhilaIndiaCovers</h1>
      <p className="text-[13px] text-ink-soft mb-[22px]">Connecting to the catalogue…</p>
      <div className="flex gap-1.5 justify-center">
        {[0, 0.15, 0.3].map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-stamp animate-bounce-dot"
            style={delay ? { animationDelay: `${delay}s` } : undefined}
          />
        ))}
      </div>
    </div>
  )
}
