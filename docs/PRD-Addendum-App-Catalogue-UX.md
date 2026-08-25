# PRD Addendum — PhilaIndiaCovers App: Catalogue UX & Discovery Features
### Addendum to PRD-v1.0 — not a standalone or competing PRD

## 0. Document Control

| Field | Value |
|---|---|
| Document Type | **Addendum to PRD-v1.0** (Confluence) — not a new PRD version, not independently numbered against the main PRD's versioning line |
| Parent Document | PRD-v1.0 (Confluence, `krutimlogic.atlassian.net`) — authoritative for product vision, all 43 FRs / 42 core User Stories, Collection Manager, Wish List, auth |
| Scope of This Addendum | (a) App-specific UI/UX implementation detail for already-approved catalogue browsing (grid/filters/detail view, using PRD-v1.0's real field names) — no new FRs of its own for this part; (b) genuinely new discovery/polish scope not in PRD-v1.0, tracked as its own stories US-43–56 |
| Addendum Owner (Product/PM) | Manjunath |
| Engineering Lead | Claude Code (primary implementation agent) |
| Status | Reconciled against PRD-v1.0 / Jira project KAN as of 2026-08-23 |
| Addendum Version | v1.0 |
| Last Updated | 2026-08-23 |
| Target Release | Friends/family trial (GitHub Releases installer, per today's distribution decision) |
| Linked Docs | PRD-v1.0 (Confluence, parent document), `PhilaIndiaCovers-App-UI-Design-References.md`, `catalogue-prototype.html` / `app-prototype-all-screens.html` / `app-prototype-v3-full.html` (interactive prototypes), `philaindiacovers-app` repo, Jira US-43–56 (KAN-54–67) |

**Reconciliation note (2026-08-23):** This document was originally drafted as an independent PRD, without visibility into PRD-v1.0 (FR-01–43, 42 User Stories, already in Jira project KAN). PRD-v1.0 is authoritative for auth (US-01–05, FR-26–30), Collection Manager (US-13–18), and Wish List (US-19–23) — **this addendum no longer duplicates those.** What remains here is scoped to: (a) the App-specific UI/UX implementation of already-approved catalogue browsing (grid, filters, detail view redesign, matching PRD-v1.0's real field names), and (b) genuinely new discovery/delight/polish features, now tracked as real Jira stories US-43–56 rather than living only in this file. Conflicts found and resolved during reconciliation are logged in §12.

**Change Log**

| Version | Date | Summary |
|---|---|---|
| v0.1 (draft, pre-reconciliation) | 2026-08-23 | Initial draft, compiled from UI reference session + 17-item clarification interview — drafted without knowledge of PRD-v1.0, contained real conflicts (approval-gated signup, wrong field names, duplicated Collection Manager) |
| Addendum v1.0 | 2026-08-23 | Reconciled against PRD-v1.0/Jira backlog and reframed as an addendum rather than a competing PRD — removed duplicated/conflicting auth and Collection Manager scope, corrected field names, logged conflicts, created 14 real Jira stories (US-43–56) for net-new scope |

---

## 1. Executive Summary

- **What:** Extends the App's existing catalogue list/detail views (built during the Walking Skeleton) into a full browsing experience with a distinct home screen, collector accounts with personalization, richer detail-view interactions, offline resilience, and export/print support.
- **For whom:** Individual philately collectors browsing India's GI Tag Special Covers catalogue on Windows desktop.
- **Why now:** The Walking Skeleton proved the pipeline (286 real covers imported and verified); this pass turns the bare-bones list/detail screens into something a real collector would want to use daily, ahead of the friends/family trial.
- **Expected impact:** A trial-ready App that friends/family testers can install, sign in to, and actually enjoy browsing — surfacing real usability feedback before public launch.

---

## 2. Problem Statement & Background

### 2.1 Problem
The Walking Skeleton's catalogue list and detail views were built to prove the data pipeline works (T-08/T-09), not as real UI. They currently have no pagination, plain unstyled thumbnails, single-select filters with no counts, no next/previous navigation in detail view, and no way for a collector to have a personal account or save favorites. Before the friends/family trial, the App needs to feel like a real product, not a pipeline proof.

### 2.2 Evidence
- Direct product-owner review of the T-08/T-09 screens identified the specific gaps above (see §12 of prior working notes / the design-references doc).
- A field-correction during review caught that Cover Name and GI Tag/Item Name had been merged into one title, and that Product Category was missing from the detail view entirely — both now corrected in the data model understanding.

### 2.3 Why Now
The friends/family trial is the next milestone, and distribution is already decided (direct GitHub Releases installer). The UI needs to be trial-ready before that installer goes out.

---

## 3. Goals, Non-Goals & Success Metrics

### 3.1 Goals
1. Give the App a distinct, welcoming entry point (home/landing + guided first-run tour) instead of dropping collectors straight into a bare grid.
2. Let collectors create their own account and personalize their experience (favorites/collection).
3. Bring the catalogue grid, filters, and detail view up to a real product's polish level, using the agreed design references.
4. Make the App resilient to intermittent connectivity (cached browsing with a clear offline indicator).
5. Support the friends/family trial's practical needs: update notifications (since there's no app-store auto-update), and export/print for collectors who want records.

### 3.2 Non-Goals
- We are **not** building Microsoft Store distribution or its update mechanism (deferred to public launch, per today's distribution decision).
- We are **not** building Admin-side features in this addendum — this covers the consumer App only.
- We are **not** implementing real email-sending infrastructure for verification/password-reset unless Supabase Auth's built-in flows cover it — a custom email service is out of scope unless a gap is found.
- We are **not** addressing accessibility (screen reader, keyboard-only navigation) in this pass — explicitly deferred to a later pass.
- We are **not** building a multi-account switcher — one collector account active per device at a time.
- We are **not** re-scoping signup/auth (US-01–05) or building Collection Manager (US-13–18) / Wish List (US-19–23) in this addendum — those are already fully specified as their own Jira epics/stories and should be implemented against those, not against this document.

### 3.3 Success Metrics

| Metric | Type | Target | Measurement |
|---|---|---|---|
| Friends/family testers can sign up and log in without support intervention | Guardrail | 100% of testers | Manual observation during trial |
| Testers can find a specific cover via filters or search within ~30 seconds | Leading indicator | Qualitative pass/fail per tester | Informal usability check during trial |
| No blocking errors when offline | Guardrail | Zero hard-fail states reported | Trial bug reports |

### 3.5 Trial Readiness Definition (decided 2026-08-23, revised 2026-08-24 — supersedes the earlier informal Success Criteria below)

**Scope decision:** Trial #1 is browse-only. Collection Manager (US-13–18) and Wish List (US-19–23) are explicitly not part of it — separate, later scope. Within browse-only, the bar is genuinely high ("perfect, reliable, no gaps" per product owner). Translated below into one unified, verifiable checklist — no should-have tier, since every item here is already a committed FR in this addendum's own Scope section, not an optional extra to soften. "No gaps" is defined as *no gaps against this list*, not an unbounded standard (no software ships with literally zero known issues).

**Required — everything here ships, no tiering:**
- [ ] US-01–04 (real signup/login) — currently doesn't exist at all; every account so far has been manually provisioned via script, not real user-facing signup
- [ ] T-13+T-18 (catalogue grid, filters, search, sort, pagination against real fields) — in progress
- [ ] T-25 (prev/next navigation, Verified-badge tooltip, tappable GI Tag link, **plus recently-viewed tracking and the GI registry outbound link — added 2026-08-24**, since T-25 already touches Detail view and lifts state to `App.tsx`) — browsing without a way to move between covers, or an unexplained badge, is a gap a tester will notice immediately
- [ ] T-26 (browse-by-year timeline — added 2026-08-24) — sequenced *after* T-13+T-18 merges, reusing that PR's facet-computation work rather than folding into its already-approved, in-progress scope
- [ ] FR-16/17 (offline caching + banner, last-synced indicator) — "reliable" requires a network blip not breaking the session mid-browse
- [ ] FR-04 (guided tour, catalogue portion)
- [ ] Standard polish: password visibility toggle, toast feedback, dark mode, native menu bar, keyboard-shortcuts help (FR-22–27 subset)
- [ ] US-47 (update-available prompt) — necessary given GitHub Releases has no auto-update mechanism
- [ ] FR-57 (data-accuracy/no-affiliation disclaimer + developer details, added 2026-08-24) — real IP/trademark exposure given the app catalogues legally protected GI marks; not optional polish
- [ ] Installer packaging (electron-builder config, real install test on a Windows machine) — untouched so far; not started
- [ ] **Separate dev/prod Supabase projects (added 2026-08-24)** — currently a single project (`hcaivtygzwjemjngcmji`) serves the real app AND every CI run's live integration tests (which execute real `createUser`/`deleteUser` calls). Already logged as a known condition since PR #5, with a planned split noted in `docs/AI-Agent-Implementation-Brief.md` §10 — but not yet done. Must happen before real trial accounts exist in the same project CI keeps writing test data into. Once split, all `ci-dev-supabase` secrets need manual re-verification that they point at dev, not prod — nothing in the workflow itself would catch a misconfiguration

**Accepted known limitations — explicit sign-off, not silent gaps:**
- Product Category is null on all 286 covers (product owner's own placeholder decision) — an empty result on that filter is expected, not a bug
- Detail view shows one image only (gallery-ready structurally, not populated)
- No image-loading throttling (T-13's plan deferred this as low-risk — paginated to 24/page, browser connection limits already bound it)
- Alphabetical sort: covers with a null name sort last (documented in T-13's plan)

**Explicitly deferred from Trial #1 — not dropped, just not blocking:**
- **Browse-by-region map (US-50/FR-29/T-21)** — deferred 2026-08-23. Sourcing investigation is done, but shapefile conversion and Ladakh/J&K boundary verification remain, and that verification step is not something to rush under trial deadline pressure given the sensitivity of India's political map. See comment on KAN-61.
- Export/print (US-48/49) — not needed for a first browse
- Command palette (US-52) — reuses T-13+T-18's search logic but needs its own overlay/focus-management work, genuinely medium cost rather than a free ride-along like the three items added above
- Accessibility — already consciously deferred earlier in this addendum (§3.2), not re-litigated here

---

### 3.6 Legal & Compliance (added 2026-08-24)

**Requirement:** the app catalogues officially registered Geographical Indication marks and India Post cover imagery — real IP and trademark territory, not generic content. Before any trial, the app needs: (a) a clear data-accuracy and no-official-affiliation disclaimer, shown in-app and acknowledged at signup; (b) the same disclaimer in the public repo's README, since both repos are public; (c) an installer-level EULA/license page (Windows NSIS installers support this natively); (d) visible developer/publisher details, both user-facing (Settings/About) and technical (installer publisher name, shown in the Windows UAC prompt).

Master content and all four derivative versions: `docs/legal/DISCLAIMER-and-Developer-Details.md`. **Publisher confirmed 2026-08-24:** Krutim Logic, Bangalore, India — this is what shows in the Windows installer's UAC security prompt.

**Not a substitute for real legal review.** This content follows common, standard patterns for hobbyist/community catalogue apps (data-accuracy disclaimers, no-affiliation statements, "as-is" liability limitation) but was not drafted or reviewed by a lawyer. Reasonable as a trial starting point; worth actual legal review before any public launch beyond a small friends/family trial.

---

## 4. Users, Personas & Jobs-to-Be-Done

| Persona | Context | Goal | Current Pain | Technical Sophistication |
|---|---|---|---|---|
| Individual collector | Windows desktop, browse-only friends/family trial (Trial #1) | Browse and search India's GI Tag Special Covers catalogue | Current build is a bare, unstyled proof-of-pipeline | Mixed — trial group isn't necessarily technical |

### 4.2 User Segments Explicitly Out of Scope
Admin and Verifier users are out of scope for this addendum — they're covered by the existing Admin repo's login/Google SSO, already built.

---

## 5. Scope

### 5.1 In Scope
- Home/landing screen, distinct from the catalogue grid
- Interactive guided tour on first login, highlighting real UI elements (not static slides) — note: real US-06 scopes this to cover Catalogue, Collection, and Wish List; this pass covers Catalogue only, tour needs a follow-up pass once Collection/Wish List UI exists
- Catalogue grid: Midday-referenced card layout, larger image treatment, numbered-page pagination, default sort by date added (most recent first, default) or alphabetically — matching real US-10, not year
- Filters: Airbnb-referenced grouped panel with live result counts, filtering by **Postal Circle, Product Category, and Date of Issue** (real field names per US-08 — not the Category/Region/Year used in earlier mock prototypes)
- Search across **item name, cover name, and description** (real field names per US-09 — not GI tag name/region as earlier prototyped)
- Detail view: Literal-referenced layout, gallery-ready image area (single front image populated for now), Turo/Tripadvisor-referenced prev/next navigation respecting the active filtered set, tappable GI Tag Name linking to all covers under that tag, tooltip explaining the "Verified" badge
- Offline handling: cached last-synced data with a warning banner; "last synced" timestamp and manual refresh visible during normal online use too
- Dark mode (system-default, manually overridable)
- In-app "update available" prompt against GitHub Releases
- Export/print: a single cover's detail, and the whole catalogue or current filtered list
- Standard UX polish: show/hide password toggle, terms acknowledgment at signup, toast confirmation feedback for actions, logout confirmation, native Electron menu bar (File/Edit/View/Help), keyboard-shortcuts help screen, recently viewed covers
- Discovery features: browse-by-region view (state tiles shaded by cover count, click to filter), browse-by-year timeline view, command palette (Ctrl/Cmd+K) for instant search, external link to the official GI registry entry per cover

**Explicitly NOT in this addendum's scope (owned by the real backlog instead):**
- Signup, login, email verification, password reset (US-01–04, FR-26–29) — build against those Jira stories directly
- Logout (US-05, FR-30) — already Done, PR #6 merged
- Collection Manager: add/view/edit/remove/search collection entries (US-13–18, FR-06–10)
- Wish List: add/view/edit/remove/search wish list entries (US-19–23, FR-11–16)

### 5.2 Out of Scope
- Microsoft Store packaging/update flow
- Admin-side features
- Any social/sharing features beyond export/print
- Multi-language / localization

### 5.3 Assumptions & Constraints
- Collector auth reuses the existing Supabase Cloud project (Mumbai region) as a new role. **Confirmed.**
- Signup model per real US-01/US-03/FR-26/FR-28: **open registration** via email/password, Google, or Apple, with **automatic account-linking** across methods (no approval step). This **supersedes** this addendum's earlier "approval-gated" assumption, which conflicted with the locked backlog.
- **Unresolved conflict:** US-01 requires Apple SSO as a signup option, but separate project memory notes Apple SSO was deferred due to the $99/year Apple Developer Program fee. This is a real decision the product owner needs to make explicitly — not assumed either way here. See §12.
- One collector account can be logged in per device at a time; switching accounts means signing out and back in — no multi-account switcher. **Confirmed.**
- Offline caching uses a local SQLite cache inside the Electron app, so filtering/search still work while offline rather than only displaying a frozen list. **Confirmed.**

### 5.4 Dependencies

| Dependency | Type | Owner | Status | Risk if Delayed |
|---|---|---|---|---|
| Supabase collector role + RLS policies (needed for catalogue browsing features in this addendum, distinct from auth itself which is US-01–05's concern) | Service | Manjunath / Claude Code | Not started | Blocks all collector-gated work |
| GitHub Releases feed for update-check | Third-party | Manjunath | Distribution plan decided today; feed not yet built | Blocks update-prompt feature |
| Real India state boundary data (see T-21 investigation notes in §10.3) | Data | Claude Code | Lead identified, conversion/verification pending | Blocks browse-by-region feature |

---

## 6. Requirements

*Priorities below are a proposed starting point based on what's needed for a usable trial vs. what's polish — confirm before this goes to Claude Code.*

### 6.1 Functional Requirements

| ID | Requirement | Rationale | Priority | Rank | Fit Criterion |
|---|---|---|---|---|---|
| FR-01 | The App shall present a distinct home/landing screen on launch, separate from the catalogue grid | Collector should land somewhere intentional, not a bare data grid | P0 | 1 | Home screen exists and is visually distinct from the grid |
| ~~FR-02, FR-02a, FR-02b, FR-02c~~ | ~~Signup/approval/verification/reset~~ | **Removed during reconciliation** — this is the real backlog's US-01–04 (FR-26–29 in the PRD-v1.0), which already fully specifies open registration with account-linking, email verification, and password reset. Build against those Jira stories directly; do not re-derive requirements from this addendum. Google SSO's Electron-specific complexity (documented in the removed FR-02's rationale) is still real and worth keeping in mind when US-01 is implemented — see T-11a. | — | — | — |
| ~~FR-03~~ | ~~Login gating~~ | **Removed** — covered by real US-03 (FR-28) | — | — | — |
| FR-04 | On first login, the App shall present an interactive guided tour highlighting real UI elements | Firm requirement per product owner; real US-06 scopes this to cover Catalogue, Collection, and Wish List — this pass covers Catalogue only since Collection/Wish List UI doesn't exist yet | P1 | 1 | Tour appears once per new account, is skippable, does not reappear after completion, points at actual live UI; flagged for a follow-up pass once Collection/Wish List exist |
| FR-05 | The catalogue grid shall use the Midday-referenced card layout with an enlarged image area | Per design-references doc; resolves "thumbnails not centerpiece" gap | P0 | 4 | Grid matches the reviewed prototype's card structure |
| FR-06 | The catalogue shall paginate using numbered pages at 24 covers per page | Product owner decision | P0 | 5 | Page controls present; each page shows 24 covers (last page may show fewer) |
| FR-07 | The catalogue shall default to sorting by date added, most recent first, with an option to sort alphabetically | Corrected to match real US-10 — earlier draft said "by year," which isn't one of the two options US-10 actually specifies | P1 | 2 | Default sort verified on fresh load; sort control toggles between the two real options |
| FR-08 | Filters shall use the Airbnb-referenced grouped panel with live result counts, filtering by Postal Circle, Product Category, and Date of Issue | Corrected to match real US-08's actual field names — earlier draft used Category/Region/Year, which don't match the real data model | P0 | 6 | Counts update as filters are toggled; filter fields match US-08 exactly |
| FR-09 | The App shall support search across item name, cover name, and description | Corrected to match real US-09's actual field names — earlier draft searched GI tag name/region instead | P0 | 7 | Typing a matching term narrows results live against the correct fields |
| FR-10 | Detail view shall use the Literal-referenced layout with Cover Name and GI Tag Name as distinct fields, plus Product Category | Corrects the earlier field-merge bug | P0 | 8 | Fields render as separate, labeled elements |
| FR-11 | Detail view shall be built with a gallery-capable image area, populated with a single front image for now | Product owner decision — multiple images planned later | P1 | 3 | Image area's markup/component supports >1 image without rework when more are added |
| FR-12 | Detail view shall support prev/next navigation with a position counter, respecting the currently active filtered set | Per design-references doc and product owner decision | P0 | 9 | Navigating "next" moves within the filtered list, not the full catalogue, when filters are active |
| FR-13 | The "Verified" badge shall show a tooltip explaining what verification means and who performed it | Product owner decision | P1 | 4 | Tooltip appears on hover/focus with accurate copy |
| FR-14 | GI Tag Name in detail view shall be tappable, navigating to all covers sharing that GI tag | Product owner decision | P1 | 5 | Tap filters the grid to the same GI tag |
| ~~FR-15~~ | ~~Favorites / "My Collection"~~ | **Removed during reconciliation** — this duplicated a much richer, already-locked Collection Manager (US-13–18, FR-06–10 in the PRD-v1.0): acquisition date, condition, postal usage, acquisition method, price paid, notes, plus offline-write blocking. Do not build the lightweight version from this addendum; implement against US-13–18 directly. | — | — | — |
| FR-16 | When the catalogue database is unreachable, the App shall show the last-synced cached data with a visible warning banner, not a hard error | Product owner decision | P0 | 10 | Simulated offline shows cached data + banner, not a blank/error screen |
| FR-17 | The App shall display a "last synced" timestamp and manual refresh control during normal online use | Product owner decision | P2 | 1 | Timestamp visible in the header at all times; refresh triggers a re-fetch |
| FR-18 | The App shall support a dark mode, defaulting to system preference with manual override | Product owner decision | P1 | 7 | Toggling system theme or the in-app control changes the App's appearance correctly |
| FR-19 | The App shall check GitHub Releases for a newer version and prompt the collector when one is available | Needed for the trial given no app-store auto-update | P1 | 8 | Prompt appears when a newer tagged release exists |
| FR-20 | The App shall support exporting a single cover's detail as a printable PDF, mirroring the detail view (image + full metadata) | Product owner decision | P2 | 2 | Generated PDF shows the cover's image and all detail-view fields, matches the on-screen data |
| FR-21 | The App shall support exporting the full catalogue or the current filtered/searched list as CSV, with columns: Cover ID, Cover Name, GI Tag Name, Product Category, Region, Year, Verification Status | Product owner decision | P2 | 3 | Generated CSV includes exactly the covers matching the active filter/search state, with all six specified columns |
| FR-22 | Password fields (login, signup) shall include a show/hide toggle | Standard modern-app convention; its absence reads as unfinished | P2 | 4 | Toggle switches field between masked and plain text |
| FR-23 | Signup shall require acknowledgment of terms/privacy before account creation | Standard practice | P2 | 5 | Submit is blocked until the acknowledgment checkbox is checked |
| FR-24 | The App shall show toast/confirmation feedback for user actions (export complete, filter applied, etc.) | Silent success reads as broken | P1 | 9 | Each listed action produces a visible, auto-dismissing confirmation |
| FR-25 | Logging out shall require confirmation before ending the session | Prevents accidental one-click logout | P2 | 6 | A confirm step appears; canceling keeps the session active |
| FR-26 | The App shall have a native Electron menu bar (File/Edit/View/Help) | Standard desktop-app convention; distinguishes the App from "a website in a window" | P2 | 7 | Menu bar present via Electron's native Menu API, not in-page HTML |
| FR-27 | The App shall provide a keyboard-shortcuts help view listing existing shortcuts (Escape, arrow-key navigation, Ctrl/Cmd+K) | These already exist in the UI but are currently undiscoverable | P2 | 8 | Help view accessible from settings/menu; lists all active shortcuts accurately |
| FR-28 | The App shall track and display recently viewed covers on the Home screen | Standard content-browsing app pattern | P2 | 9 | Last N viewed covers appear on Home in view order, most recent first |
| FR-29 | The App shall provide a "browse by region" view: state-level tiles shaded/ranked by cover count, clicking a state filters the grid to that region | Product owner's requested signature feature | P1 | 10 | Selecting a state filters the grid correctly; tile visually reflects relative cover count |
| FR-30 | The App shall provide a "browse by year" timeline view: covers grouped by year, clicking a year filters the grid | Second lens on the same data, low incremental cost | P2 | 11 | Selecting a year filters the grid correctly |
| FR-31 | The App shall provide a command palette (Ctrl/Cmd+K) for instant search from anywhere in the catalogue screen | Modern-app convention (VS Code, Linear, Notion pattern) | P2 | 12 | Shortcut opens a search overlay; selecting a result opens that cover's detail view |
| ~~FR-32~~ | ~~My Collection stats~~ | **Removed** — was scoped against the removed FR-15 favorites system. Real Collection Manager (US-13–18) may warrant its own stats feature, but that's a decision for whoever implements US-13–18, not this addendum. | — | — | — |
| FR-33 | Detail view shall include an outbound link to the official GI registry entry for that cover's GI tag | Adds credibility at near-zero cost | P2 | 14 | Link opens the correct external registry page for that GI tag (data/URL mapping TBD) |
| FR-57 | The App shall display a data-accuracy and no-official-affiliation disclaimer, acknowledged at signup and reachable from Settings, plus visible developer/publisher details | Added 2026-08-24 — the app catalogues legally protected GI marks and India Post imagery; real IP/trademark territory needs a clear disclaimer, not an assumption it's obviously fine | P0 | 15 | Disclaimer text matches `docs/legal/DISCLAIMER-and-Developer-Details.md`; signup requires acknowledgment before account creation completes; Settings shows developer name, contact, and a link to the full disclaimer |

### 6.2 Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | Grid should remain responsive with 286+ covers | No target threshold set yet — flag if trial performance feels slow |
| Reliability | Offline fallback (FR-16) must never crash the app | Zero hard crashes on connection loss, verified manually |
| Accessibility | Explicitly deferred — not in scope for this pass | Screen-reader support and keyboard-only navigation to be scoped in a later pass |

---

## 7. UX / Design
- Design references: `PhilaIndiaCovers-App-UI-Design-References.md` (Midday grid/loading, Airbnb filters, Literal detail layout, Turo/Tripadvisor navigation, Codecademy/Uxcel empty states)
- Interactive prototypes reviewed and approved in direction: `catalogue-prototype.html`, `app-prototype-all-screens.html`
- Key states still needing design before build: sign-up/login screens (belongs to US-01–04's implementation, not this addendum), guided tour steps, export/print output format — none of these were prototyped yet

---

## 8. Technical Considerations

### 8.1 Proposed Approach
- Collector auth (roles, RLS, account-linking, Collection/Wish List tables) is owned by the real backlog's US-01–05 and US-13–23 implementation — not re-derived here.
- Offline caching uses a local SQLite database inside the Electron app (e.g. via `better-sqlite3`), synced from Supabase on successful connection, so filtering/search work against cached data while offline rather than only rendering a frozen snapshot.

### 8.3 Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Building against this addendum's earlier field names (Category/Region/Year) instead of the real ones (Postal Circle/Product Category/Date of Issue) if Claude Code works from a stale copy | Medium | High | This Addendum v1.0 is the authoritative version — confirm Claude Code is working from the updated file, not a cached earlier draft | Manjunath |
| Offline caching mechanism choice affects several other features (FR-16, FR-17) | Medium | Medium | Decide the caching approach explicitly before implementation starts, not mid-build | Claude Code / Manjunath |

---

## 9. Agile / Scrum Execution Plan

### 9.1 Epic Breakdown

| Epic ID | Epic Name | Goal | Related FRs |
|---|---|---|---|
| EPIC-11 | Home & onboarding | Landing screen, guided tour (Catalogue portion) | FR-01, FR-04 |
| EPIC-12 | Catalogue browsing v2 | Grid, filters, search, pagination, sort — using real field names | FR-05–FR-09 |
| EPIC-13 | Detail view v2 | Layout fix, navigation, gallery-readiness, verified tooltip, GI tag link | FR-10–FR-14 |
| EPIC-15 | Resilience & maintenance | Offline caching, sync indicator, update prompt | FR-16–FR-19 |
| EPIC-16 | Export & print | Single cover and catalogue/list export | FR-20, FR-21 |
| EPIC-17 | Discovery & delight | Browse by region, browse by year, command palette, recently viewed | FR-28–FR-31 |
| EPIC-18 | Standard UX polish | Password visibility, terms, toasts, logout confirm, menu bar, shortcuts help, GI registry link | FR-22–FR-27, FR-33 |

*EPIC-10 (Collector accounts) and EPIC-14 (Personalization) were removed during reconciliation — that work belongs to the real backlog's existing epics for auth (behind US-01–05) and Collection Manager (behind US-13–18), not to this addendum.*

*User stories, acceptance criteria (Given/When/Then), and sprint assignment are not broken out yet — recommend doing this once the Open Questions in §12 are resolved, since several (page size, caching mechanism, tour content) would change how stories are sliced.*

---

## 10. AI-Agent Implementation Brief

### 10.1 Repo & Environment Context
- Repo: `philaindiacovers-app` (Electron/Vite)
- Branch strategy: real branch + PR + passing CI for every task, per standing project rule — no direct commits to main
- Backend: Supabase Cloud, Mumbai region, project ID `hcaivtygzwjemjngcmji`

### 10.3 Task Decomposition (starter set — expand once Open Questions are resolved)

| Task ID | Linked Epic | Description | Non-Goals for This Task | Verification Check |
|---|---|---|---|---|
| T-13 | EPIC-12 | Rebuild catalogue grid per Midday reference with numbered pagination | Do not implement virtualization/infinite-scroll — pagination only | Grid matches `catalogue-prototype.html` visually; page controls navigate correctly at 286+ mock records |
| T-14 | EPIC-13 | Fix detail view field layout (separate Cover Name / GI Tag Name / Product Category) | Do not build multi-image gallery UI yet — single image only | Manually verify against 3 real covers that fields display separately and correctly |
| T-16 | EPIC-15 | Build local SQLite cache layer, synced from Supabase on successful connection | Do not build the offline banner UI yet — this task is the data layer only | Disconnect network after a sync; confirm cached covers are still queryable (filter/search) against SQLite |
| T-17 | EPIC-15 | Build offline banner + "last synced" timestamp/manual refresh in the catalogue header | Depends on T-16 being complete | Simulate offline; banner appears with correct last-synced time; refresh re-attempts sync when back online |
| T-18 | EPIC-12 | Implement numbered pagination at 24 covers/page against the 286-cover live dataset, filtering by real fields (Postal Circle, Product Category, Date of Issue) and searching by real fields (item name, cover name, description) | Do not use the earlier mock field names (Category/Region/Year, GI tag name/region) — those were corrected during reconciliation | Page controls correctly split 286 covers into 12 pages; filters and search operate on the real field names, verified against actual data |
| T-25 | EPIC-13 | Lift filter/search/sort/page state from `Catalogue.tsx` up into `App.tsx` (making Catalogue a controlled component), then implement FR-11 (gallery-ready image area), FR-12 (prev/next nav respecting the active filtered set — this is what actually requires the state lift), FR-13 (Verified badge tooltip), FR-14 (tappable GI Tag Name), FR-28/US-53 (recently-viewed tracking, added 2026-08-24) | Do not start this before T-13+T-18 lands — build against the new grid's actual shape, not against code about to be rewritten. Do not fold into T-13+T-18 — this is a real architectural expansion (cross-component state, controlled-component pattern), not a same-screen tweak, and deserves its own reviewable PR. **FR-33 removed from this task's scope 2026-08-24** — see T-32; no DB column, lookup table, or confirmed registry URL structure exists, and Claude Code correctly refused to guess one mid-task | Detail view shows FR-11–14's behavior correctly; prev/next specifically verified to move within the active filtered set, not the full catalogue, when a filter is applied; recently-viewed list updates on each Detail view open |
| T-32 | EPIC-13 | FR-33 (outbound GI registry link) — **not started, data source unresolved.** India's GI registry is maintained by CGPDTM (ipindia.gov.in); unconfirmed whether it has stable per-item permalinks at all, or only a session-based search interface with no clean deep links. Needs a real investigation (same rigor as T-21's map-data sourcing) before any implementation decision — hardcoded lookup, new DB column, or dropping the requirement entirely if no stable URL source exists | Do not build a hardcoded JS lookup map or add a placeholder DB column before the URL-source question is answered — both were considered and explicitly rejected during T-25 planning (2026-08-24) as premature given the underlying data source isn't confirmed to exist in a linkable form | Either a real, verified registry URL structure is found and FR-33 gets a proper follow-up task, or the investigation concludes no stable per-item link exists and FR-33 is formally dropped/redefined — not left silently unbuilt with no explanation |
| T-26 | EPIC-17 | Browse-by-year timeline view (US-51) — reuses the year-grouping facet computation already built in T-13+T-18's `fetchCatalogueFacets`, rendering it as a second view mode rather than a new query | **Do not fold into T-13+T-18** — that PR is already approved and in progress; adding scope to live work risks disturbing an already-verified plan. Sequence this as its own PR, after T-13+T-18 merges | Selecting a year in the timeline view filters the grid to that year, reusing the same facet data T-13+T-18 computes — no new backend query needed |
| T-27 | EPIC-18 | Build the disclaimer screen (`DisclaimerContent.tsx`, shown at signup acknowledgment + Settings), populate Settings' developer/about section, add the installer EULA (`LEGAL/EULA.txt`, referenced from electron-builder's `nsis.license`), update `package.json` author and `build.publisherName`. Content from `docs/legal/DISCLAIMER-and-Developer-Details.md` — hardcode as a static component, do not fetch remotely | Do not write new disclaimer content — use the drafted content verbatim once the publisher-name question (Krutim Logic vs. personal name) is confirmed. Do not skip the signup-acknowledgment gate — FR-57's fit criterion requires it block account creation, not just be optionally viewable | Disclaimer text displays correctly in both locations from one shared component; signup blocks without acknowledgment; installer shows the EULA page before allowing install to proceed; Settings shows correct developer/publisher details |
| T-28 | EPIC-13 | Render Date of Issue in Detail view's `<dl>` — the full date, not a year. `cover.dateOfIssue` is already fetched (part of `CoverDetail`/`VerifiedCover` since before T-13+T-18), and `formatDateOfIssue()` already exists in `covers.ts` and is used elsewhere — this is a pure rendering omission, not a data or query gap. Same shape as T-14. Added 2026-08-24, after being confirmed missing via live screenshot review of the merged T-13+T-18 build | Process note, not a scope note: this requirement was decided during T-13+T-18 planning (in the context of the year-derivation reasoning for the filter panel) but never attached to a task ID for Detail.tsx itself, since T-13+T-18's own scope was the Catalogue grid. That's why it fell through — logged here so the pattern (a decided requirement with no task ID) doesn't repeat | Detail view shows the full Date of Issue for a real cover, verified live, same standard as T-14 |
| T-29 | EPIC-11 | Build the Home/landing screen (FR-01/US-43) — welcome content, "Enter the catalogue" CTA, per the approved prototype direction. **Expanded 2026-08-25:** also decide and build cross-screen navigation — `App.tsx` currently only supports Catalogue/Detail as mutually exclusive siblings with no router; adding Home (and eventually Settings, T-27) means a real decision on how a user moves between them. Default direction: extend the account-menu dropdown pattern already in the v3 prototype (the header icon with My Collection/Shortcuts/Log out) with Home and Settings entries, rather than inventing a new nav paradigm — reuses an already-approved pattern instead of new design work. **Confirmed 2026-08-25:** menu also includes Collection Manager, Wish List, and **My Progress** (KAN-5 — % of catalogue owned, missing-covers list, spend tracking; found during a full-scope audit, not previously accounted for anywhere) as visible but disabled/greyed-out entries (e.g. "Collection — Coming Soon"), non-clickable — sets expectations that these features exist on the roadmap without building any of their actual functionality, which remains genuinely out of scope for Trial #1. Audited the rest of PRD-v1.0's scope (Manage My Account's sub-items, Get Help When Stuck) and confirmed neither needs its own placeholder — the former is Settings-screen content, the latter is either already covered (shortcuts help) or too minor to warrant a dedicated nav entry. **Also checked "Reports"/Monitor Product Progress (KAN-11)** — this is not App scope at all: its one story, US-42, is explicitly an Admin-only back-office dashboard ("As the PRD owner (Admin), I want the back-office Dashboard to show..."), not a Collector-facing feature. No placeholder — it belongs to a different application entirely, not deferred App scope | Added 2026-08-24 — **process gap identified**: FR-01 is `Required` in Trial Readiness and P0 in §6.1, but was never given a task ID in the original T-10.3 decomposition, despite T-10/T-11/T-12 (which would have naturally included it) being removed during the PRD-v1.0 reconciliation. Same root cause as T-28's gap: a requirement surviving a scope change without anyone re-checking it still has an owner. **2026-08-25 addition:** cross-screen navigation was never decided anywhere either — same failure pattern, caught only because the product owner noticed it missing after actually using the app, not because it was tracked. Do not build any Collection Manager/Wish List/Progress functionality behind these placeholder entries — they are visual only, confirmed explicitly, not a backdoor scope expansion | Home screen renders on launch, distinct from the catalogue grid, with a working entry point into it; a logged-in collector can navigate Catalogue → Home and Catalogue → Settings (once Settings exists) via the extended account menu; Collection, Wish List, and My Progress all appear in the same menu, visibly disabled, not clickable, not wired to anything |
| T-30 | EPIC-18 | Build dark mode (FR-18/US-46) — system-preference detection by default, manual override in Settings. Real theming infrastructure (CSS variable/token swap), not just a Settings toggle — given its own task rather than folded into T-27, since it's cross-cutting across every screen, not a same-screen addition | Added 2026-08-24, same process-gap category as T-29 — `Required`, P1, no task ID existed until now | Toggling system theme or the in-app override correctly re-themes every screen, not just Settings |

| T-21 | EPIC-17 | Build "browse by region" view using a verified India states TopoJSON/GeoJSON dataset and a real mapping library (e.g. react-simple-maps) — do not hand-code state boundary SVG paths. **Sourcing investigation already done (2026-08-23) — see notes below.** Recommended starting point: India Geodata's DataMeet-sourced `Admin2.shp` (github.com/yashveeeeeeer/india-geodata, "administrative/states" section) — convert to GeoJSON via `ogr2ogr`, then simplify to TopoJSON via mapshaper.org, targeting ~100–300 KB. **Before use, verify the converted file's state-name properties list Ladakh separately from Jammu and Kashmir** — this specific check was not yet completed (shapefile conversion requires GDAL tooling not run during this investigation). Bundle as a static asset in the repo — do not fetch it at runtime.<br><br>**Sources already ruled out, do not re-investigate:** (1) `udit-001/india-maps-data`'s all-India file — confirmed to be district-level, not state-level, wrong granularity entirely. (2) `geohacker/india`'s `state/india_state.geojson` — confirmed 21.9 MB unsimplified AND confirmed outdated on inspection: shows undivided "Jammu and Kashmir" with no separate Ladakh, "Orissa" instead of "Odisha," "Uttaranchal" instead of "Uttarakhand," and is missing Telangana entirely (35 regions instead of the current 36). Do not use this file. | State boundary accuracy is non-negotiable given the sensitivity of India's political map; do not add district-level or higher-precision data than the state-level view needs | Every state renders correctly and matches an authoritative reference map, including the current J&K/Ladakh split (verified in the actual GeoJSON properties, not just assumed from a source's description); clicking a state filters the grid to that region; the bundled asset is confirmed present in the built installer and the view works fully offline |
| T-23 | EPIC-17 | Build command palette (Ctrl/Cmd+K) overlay for instant cover search | — | Shortcut opens the palette from any catalogue state; selecting a result opens that cover's detail view |
| T-24 | EPIC-18 | Build native Electron menu bar (File/Edit/View/Help) via Electron's Menu API (FR-26/US-54) | Do not build this as in-page HTML — must be a real native menu | Menu bar renders natively on the app window, not inside the web content area |

*Removed during reconciliation: T-10 (collector role/RLS), T-11/T-11a (signup + Google SSO), T-12 (login screen), T-15 (email verification/password reset) — all belong to the real backlog's US-01–05 implementation, not this addendum. The Google SSO Electron finding (shell.openExternal + protocol handler required, standard OAuth won't work) is preserved in FR-02's strikethrough note so it isn't lost when whoever implements US-01 gets there.*

*Still intentionally undecomposed: the interactive guided tour (needs the rest of the UI stable first, since it points at real elements), export/print (straightforward once the rest lands — low risk to leave for a later pass since it's outside Trial #1's Required list). Toasts, password-visibility toggle, terms checkbox, logout confirmation, and shortcuts help (FR-22–27 subset) are still small enough to fold into whichever task touches that screen. **Correction (2026-08-23):** FR-11–14 were originally assumed to fall into this same "fold into whichever task touches the screen" category, but Claude Code correctly identified during T-13+T-18 planning that FR-12 specifically requires lifting state out of `Catalogue.tsx` into `App.tsx` — a real architectural change, not a same-screen tweak. Given its own task, T-25, sequenced after T-13+T-18. **Update (2026-08-24):** FR-33 and US-53 folded into T-25 (same screen, same state lift, genuinely free ride-along); US-51 given its own task, T-26, sequenced after T-13+T-18 rather than folded into its in-progress scope, since that PR is already approved and shouldn't be expanded mid-flight even for a cheap addition. The update-available prompt (US-47) is no longer undecomposed — it's in Trial #1's Required list and needs its own task once the GitHub Releases feed dependency (§5.4) is resolved. **Dedup correction (2026-08-24):** T-29/T-30/T-31 were added without checking whether the original Discovery-epic tasks (T-21–24, created earlier in this addendum's history) already covered the same work — they did. T-22 (original, generic "browse by year") was superseded by T-26 (later, more precise, correctly references the now-merged T-13+T-18 facet infrastructure) — T-22 removed, T-26 kept. T-24 (original, native menu bar) and T-31 (later, identical scope) were near-duplicates — merged into T-24 (added the FR-26/US-54 reference from T-31), T-31 removed. Caught by Claude Code during the T-25 standup, not by re-auditing the full task list before adding new ones — a real process gap, logged so it's not repeated a third time.*

---

## 12. Open Questions

All 11 questions from the original v0.1 draft were resolved on 2026-08-23 — summary preserved below. **Reconciliation against PRD-v1.0/Jira backlog (also 2026-08-23) then superseded two of those resolutions** — see the reconciliation findings first.

### Reconciliation findings (supersede earlier resolutions)

| # | Finding | Resolution |
|---|---|---|
| A | Signup was resolved as "approval-gated" in v0.1 — **conflicts with real US-01/US-03 (FR-26/28), which specify open registration with account-linking, no approval step** | v0.1's resolution is wrong; corrected to match the real backlog (§5.3) |
| B | Real US-01 requires Apple SSO as a signup option; separate project memory says Apple SSO was deferred due to the $99/year Apple Developer Program fee | **Decided (2026-08-23):** deferred. Documented as a comment on KAN-12 (US-01) rather than silently editing the story's scope — the "or Apple" requirement stays visible in the story text, with the phased approach (email/password + Google now, Apple once enrollment is funded) recorded as the traceable decision. |
| C | Filter fields (v0.1: Category/Region/Year) don't match real US-08 (Postal Circle/Product Category/Date of Issue) | Corrected in FR-08 |
| D | Search fields (v0.1: cover name/GI tag/region) don't match real US-09 (item name/cover name/description) | Corrected in FR-09 |
| E | Sort default (v0.1: "by year") doesn't match real US-10 (most recent first, or alphabetically) | Corrected in FR-07 |
| F | "Favorites"/"My Collection" (v0.1 FR-15) duplicated the much richer, already-locked Collection Manager (US-13–18) | Removed from this addendum entirely; build against US-13–18 instead |
| G | Genuinely new features from this addendum (browse-by-region, browse-by-year, command palette, dark mode, export/print, standard UX polish items) aren't in the real 43-FR backlog at all | **Done (2026-08-23)** — created as 14 real Jira stories (US-43–56, KAN-54 through KAN-67), matching the project's exact conventions (Story type, Given/When/Then description, FR-XX label, linked to the best-fit existing epic). Verified FR-43 through FR-56 don't collide with any existing labels before creating. Mapping: US-43 Home screen (KAN-54, FR-43) · US-44 offline caching (KAN-55, FR-44) · US-45 last-synced indicator (KAN-56, FR-45) · US-46 dark mode (KAN-57, FR-46) · US-47 update prompt (KAN-58, FR-47) · US-48 export PDF (KAN-59, FR-48) · US-49 export CSV (KAN-60, FR-49) · US-50 browse by region (KAN-61, FR-50, includes the full map-sourcing investigation notes) · US-51 browse by year (KAN-62, FR-51) · US-52 command palette (KAN-63, FR-52) · US-53 recently viewed (KAN-64, FR-53) · US-54 menu bar (KAN-65, FR-54) · US-55 shortcuts help (KAN-66, FR-55) · US-56 toast feedback (KAN-67, FR-56). Small items (password toggle, terms checkbox) were added as a comment on US-01 (KAN-12) instead of separate stories, since they're natural acceptance-criteria additions to an existing story, not standalone features. |

### Original 11 resolutions (2026-08-23, still valid except where superseded above)

| # | Question | Resolution |
|---|---|---|
| 1 | Collector role location | New role, same Supabase project |
| 2 | Signup gating | ~~Approval-gated by Admin~~ — **superseded by finding A above** |
| 3 | Email verification | Required before login (matches real FR-27) |
| 4 | Password reset | Needed (matches real FR-29) |
| 5 | Multi-account per device | No — one account at a time, sign out to switch |
| 6 | Guided tour format | Interactive walkthrough highlighting real UI, not static slides |
| 7 | Pagination page size | 24 per page |
| 8 | Offline caching mechanism | Local SQLite |
| 9 | Export/print format | Single cover → PDF; catalogue/list → CSV (6 specified columns) |
| 10 | Accessibility scope | Deferred to a later pass |
| 11 | My Collection filters | ~~Same filters/sort as main catalogue~~ — **moot, superseded by finding F above** |
