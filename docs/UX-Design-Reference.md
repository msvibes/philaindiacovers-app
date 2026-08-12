# PhilaIndiaCovers — UX / Design Reference (Consumer App)

Extracted from the main PRD's §7, for direct reference during App-repo implementation.

**Design assets:** None exist yet — visual design is created directly during implementation rather than handed off from a separate design phase, appropriate for a solo build.

**Voice & Tone:** Playful and courteous throughout the entire consumer app — warm, a little fun, never flippant. The catalogue _data_ stays accurate and matter-of-fact; it's the app's surrounding voice that carries personality.

**Key states, with example copy setting the tone:**

| State                      | Example                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| Empty Collection           | "Your collection's empty for now — go find your first cover in the catalogue." |
| Empty Wish List            | "Nothing on your wish list yet. Every great collection starts with a want."    |
| Loading                    | Clean and simple, no jokes needed                                              |
| Error (e.g. sync failure)  | "Something didn't sync properly. Give it another go?"                          |
| Offline                    | "You're offline — browsing what's already saved. Reconnect to see the latest." |
| Success (e.g. cover added) | "Added! One step closer to a complete collection."                             |

**Copy requirement:** all consumer-facing UI text reads as if written by a fellow collector, not a corporate product team.

**Design review sign-off:** No separate design team — verification happens via manual human review, checked against this tone guidance.

---

## Gap found and filled: Empty Catalogue state

The original table has no entry for a genuinely empty catalogue (zero Verified covers) — the closest existing entry, "Empty Collection," is about a _user's own_ empty collection, a different context entirely from the shared catalogue having nothing in it yet.

**Proposed copy, matching the established voice** — confirm or adjust before T-08 locks this in:

> "The catalogue's just getting started — check back soon as more covers get verified."

Reasoning: doesn't apologize or sound broken (this is a real, expected state during early rollout, not an error), stays honest about _why_ it's empty (verification is ongoing, not "nothing exists"), and matches the collector-to-collector tone of the rest of the table.
