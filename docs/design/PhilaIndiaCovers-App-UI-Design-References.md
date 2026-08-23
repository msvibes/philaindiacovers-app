# PhilaIndiaCovers — App UI Design References

**Purpose:** Source-of-truth mapping between the App's (Electron/Vite consumer catalogue) known UI gaps and the specific external screens being used as design references, before any UI rebuild work starts.

**Status:** Reference gathering — no rebuild started yet. This is Mobbin-derived visual/interaction reference, not a finished spec. Update this table as more screens are reviewed or as decisions are locked.

**Scope note:** Only the App's currently built or currently gapped screens are covered below. Admin (Next.js) UI is out of scope for this doc.

---

## Reference Table

| App Feature / Screen | Current State (T-08/T-09 skeleton) | Known Gap | Reference App (Mobbin) | Reference Screen | What We're Taking From It |
|---|---|---|---|---|---|
| **Catalogue List / Grid View** | Functional list, all 286 covers render in one pass | No pagination/virtualization; plain thumbnails, not the visual centerpiece | **Midday** (web) | [Uniform grid, image/avatar top-left of card, stacked text lines below](https://mobbin.com/screens/2eb9ba1f-d0e6-44c9-a6b9-c5b498a4e625) | Clean, minimal card structure — small image anchor plus 2–3 stacked text lines per card, consistent card sizing (not masonry). Selected over Pinterest's masonry/hover-overlay approach, which was rejected. Also doubles as the Loading-State reference below — same card shape, skeleton vs. populated |
| **Filter Panel** | Single-select dropdowns, no result counts | No counts shown; can't multi-select; flat dropdown UX | **Airbnb** (web) | [Filter panel with categorized sections + live count](https://mobbin.com/screens/dad4c99d-a212-419f-a44f-2f373d2f83db) | Grouped filter sections (not one flat list), chip/checkbox multi-select, and a persistent "Show N results" action button that updates as filters change |
| **Detail View — Metadata Layout** | Cover Name and GI Tag/Item Name were initially merged into one title (corrected); Product Category was initially missed | Field hierarchy not yet redesigned since the correction | **Literal** (web, Goodreads-style) | [Book detail page](https://mobbin.com/screens/e3239812-4da8-44a2-b61c-f2f1285ed3c7) | Image left, title + secondary line stacked but visually distinct (not merged), then a clean two-column key/value metadata table below — maps directly onto Cover Name / GI Item Name / Product Category / etc. as separate labeled rows |
| **Detail View — Navigation** | No next/previous; user must return to list to view another cover | No way to move sequentially through the catalogue from detail view | **Turo** (web) | [Photo viewer with prev/next arrows](https://mobbin.com/screens/3c25f038-7b1c-4b03-8ff4-e75fe4e77c0e) | Left/right arrow controls plus a "2 of 6" position counter — same pattern applies to moving between covers, not just photos within one cover |
| **Detail View — Navigation (alt reference)** | — | — | **Tripadvisor** (web) | [Photo lightbox with prev/next + counter](https://mobbin.com/screens/91000b10-4a85-4ce2-a319-6325352b8da4) | Same pattern as Turo, cleaner large-image treatment — useful second reference if the cover image itself should be the dominant element in detail view |
| **Empty State — No Results** | Not designed yet (undiagnosed until now) | No defined behavior when a filter combination returns zero covers | **Codecademy** (web) | [No match found, with fallback suggestions](https://mobbin.com/screens/a70323a2-0f2f-4248-8fb4-92e3a3190967) | Instead of a dead end, surfaces alternative content ("what our members are learning") — maps to suggesting popular categories or an easy "clear filters" action rather than a blank screen |
| **Empty State — No Results (alt reference)** | — | — | **Uxcel** (web) | [No matches found, with suggested searches](https://mobbin.com/screens/e7ae3281-0fdc-4936-98e2-16ccb49d2df9) | Simpler variant — plain message plus a row of suggested alternative searches; lighter-weight option if the Codecademy pattern is too heavy for this catalogue's scale |
| **Loading State — Grid** | Not designed yet (undiagnosed until now) | No skeleton/placeholder state while covers load | **Midday** (web) | [Skeleton grid with avatar + text lines](https://mobbin.com/screens/2eb9ba1f-d0e6-44c9-a6b9-c5b498a4e625) | Same reference as the Grid View row above — skeleton version of the same card shape, so the loading state and populated state share one consistent structure. Selected over Klook's denser skeleton grid. |

---

## Explicitly Not Covered by Mobbin (Not Visual References)

These are real, diagnosed gaps but are technical/state-management decisions, not UI patterns — they won't get a Mobbin reference and need to be decided separately:

| Gap | Why It's Not a Mobbin Item |
|---|---|
| No pagination/virtualization (286 covers render in one pass) | Implementation strategy (windowing library, page size, infinite scroll vs. paged), not a visual pattern |
| No persisted scroll/filter state | State management decision (where state lives, what triggers a reset), not a visual pattern |

---

## Apps Searched But Not Indexed on Mobbin

- **Letterboxd** — not indexed
- **Goodreads** — not indexed; Literal used as the closest available analog for book/collectible-style detail pages
- **Discogs** — not indexed (search returned unrelated music-streaming apps)

---

## Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Should filters be multi-select (Airbnb-style) or stay single-select but gain counts? | Manjunath | Open |
| 2 | Does next/previous navigation respect the active filter set (i.e., "next" = next *filtered* result), or always the full catalogue order? | Manjunath | Open |
| 3 | Is a full grid rebuild (Midday-style uniform card grid) in scope for the next UI pass, or is a more modest thumbnail-size increase sufficient for the friends/family trial? | Manjunath | Open |
| 4 | Empty-state and loading-state behavior weren't part of the original diagnosed gap list — should these be added formally to the known-gaps list (e.g. in Jira) alongside the four original ones? | Manjunath | Open |
| 5 | Midday's card is small-image/avatar-first (image is a corner accent, not the dominant element) — does this still satisfy the original "thumbnails not treated as visual centerpiece" gap, or does the card need a larger image treatment than Midday's own screens show? | Manjunath | Open |

---

*Last updated: 2026-08-23 — initial reference pass, pre-rebuild. No design decisions locked yet.*
