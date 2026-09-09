# PhilaIndiaCovers — Low-Level Design

**Original scoping note (2026-08, superseded below):** this LLD originally covered only the Walking Skeleton (T-01–T-09) — the part of the system being built at the time. Writing detailed low-level design for all 42 stories before any of their code existed would have gone stale before it was ever used, for the same reason full task-decomposition wasn't done upfront in the AI-Agent Implementation Brief.

**Extended 2026-09-09:** that just-in-time premise stopped applying once the relevant work was already built — documenting shipped code retroactively is a different exercise than designing ahead of it, and by this point the gap between "what's built" and "what this doc describes" had grown to cover the entire post-Walking-Skeleton feature set. §§7–10 below are the result: a **deliberately curated** extension, not an exhaustive one — only for subsystems with a genuinely non-obvious algorithm, schema, or security design, the same bar §§1–6 already use. Most of what shipped since T-09 (dark mode, toasts, the splash screen, browse-by-year, the sidebar nav, image copy-protection, and the various small KAN-76–86 value-adds) is UI wiring, not novel design, and is deliberately left out — see `docs/PRD-Addendum-App-Catalogue-UX.md` for the full task list and `.claude/PROGRESS.md` for what actually shipped when. The T-39 dev/CI-vs-production Supabase split belongs in `docs/Architecture-Decision-Records.md`, not here — a decision-with-tradeoffs is what ADRs are for — and is already fully documented in `CLAUDE.md`'s own Environment section; it is **not** currently duplicated into a numbered ADR entry (checked directly: ADR-008 is "Bearer-Token Session Verification for Route Handlers," unrelated — flagged back to the user rather than assumed).

---

## 1. Database Layer (T-01 — complete)

Already implemented and verified: `profiles`, `postal_circles` (seeded, 23 rows), `covers` (no RLS yet). Full column-level spec: `docs/API-Integration-Contracts.md`.

## 2. Bulk Import — Detailed Design (T-02 complete, T-03 next)

**As actually built (T-02) — corrected from this document's original speculative design, which described a server endpoint that was never the real architecture:**

The validation/preview stage runs entirely **client-side**, in the Next.js admin app's `/import` route — there is no `POST /bulk-import` server endpoint for this stage. CSV parsing uses Papa Parse with a `transform` option that runs `sanitizeCsvCell()` (see below) on every field of every row as it's parsed.

**CSV headers — the real, human-readable ones from the actual source spreadsheet, not database column names:**
`Image File Name`, `Name of the Cover`, `Name of the GI Tag / Item`, `Product Category`, `Description of Cancellation`, `Description of Cachet`, `Overall Description`, `Issuing Postal Circle`, `Place of Issue`, `Date of Issue`.

**`sanitizeCsvCell()` — `src/lib/sanitizeCsvCell.ts` (Admin repo):**

```
sanitizeCsvCell(value: string | null | undefined): string
```

Strips leading whitespace (including tab/CR, covered by `\s`) and leading `=`/`+`/`-`/`@` characters in a loop until stable, so nested/repeated evasion (e.g. `" = =cmd"`) is fully neutralized, not just the single-character case. `null`/`undefined` input returns `""` rather than throwing — a real crash risk caught during review, since Papa Parse's `transform` runs this on every cell regardless of whether it's populated (confirmed against real data: `Product Category` is blank in the actual source spreadsheet). Covered by 8 Vitest unit tests in `sanitizeCsvCell.test.ts`.

**Validation algorithm (preview stage, no DB writes):**

1. Parse CSV via Papa Parse, `sanitizeCsvCell` applied per-cell via `transform`.
2. For each row, check the `Image File Name` value exists among the uploaded image files by name; rows without a match are flagged in the preview.
3. _(T-03, next)_ For each row that passes filename validation, check for a duplicate against existing `covers` — see below.

## 3. Duplicate Detection — Detailed Design (T-03, not yet built — this is forward design for the upcoming task)

**Algorithm:**

1. For each row passing filename validation, query `covers` (any `verification_status` — draft, verified, or flagged) for a row matching both `Name of the GI Tag / Item` and `Date of Issue` exactly.
2. Rows with a match are added to the preview as a **distinct category from missing-image failures** — a duplicate isn't the same kind of problem as a missing file, and the UI should let the Admin visually tell them apart at a glance.
3. Duplicates don't block the row from being imported if the Admin explicitly overrides — per FR-17, this is a flag for manual confirmation, not an automatic hard rejection (a legitimate re-issue or correction scenario could look like a duplicate but not be one).

**Open question worth confirming before building:** should this query run one-by-one per row (simple, N queries for N rows) or as a single batched query (fetch all existing `gi_item_name`+`date_of_issue` pairs once, compare in-memory)? For a backlog import of 288 rows, batching is meaningfully faster and is the right call — worth stating explicitly here rather than leaving it to be decided ad-hoc during implementation.

## 4. `verify_cover()` — Detailed Design (T-04, T-06 — not yet built)

**Signature (Postgres function, `SECURITY DEFINER`):**

```sql
verify_cover(p_cover_id uuid, p_new_status text, p_reason text DEFAULT NULL)
RETURNS void
```

**Algorithm:**

1. Check `auth.uid()`'s role in `profiles` is `verifier`; raise an exception otherwise (defense in depth — RLS should already block non-verifiers from calling this at all).
2. Validate `p_new_status` is exactly `'verified'` or `'flagged'`; raise an exception otherwise.
3. If `p_new_status = 'flagged'`, require `p_reason` is non-null and non-empty; raise an exception otherwise.
4. Update `covers` row: set `verification_status`, `verified_by = auth.uid()`, `verified_at = now()`.
5. Insert into `verification_audit_log`: `cover_id`, `action`, `performed_by = auth.uid()`, `reason`, `performed_at = now()`.
6. Steps 4–5 happen in the same transaction — either both succeed or neither does.

**Correction loop (T-24's invariant, enforced here not in the UI):** when the Admin corrects a `flagged` cover's metadata directly (a plain table UPDATE, not via this function), a database trigger resets `verification_status` back to `'draft'` automatically — this is what actually makes it impossible for the Admin to accidentally leave a corrected entry in `verified` state without a fresh Verifier pass. _(Trigger to be written alongside T-06 — flagged here as the mechanism, not yet implemented.)_

## 5. RLS Policies — Detailed Design (T-04)

```sql
-- covers: Collector read
CREATE POLICY collector_read_verified ON covers FOR SELECT
  USING (verification_status = 'verified');

-- covers: Admin full access
CREATE POLICY admin_full_access ON covers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- covers: Verifier read-only on draft/flagged, NO write policy at all
CREATE POLICY verifier_read_draft_flagged ON covers FOR SELECT
  USING (
    verification_status IN ('draft', 'flagged')
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'verifier')
  );

-- collection_items / wishlist_items: owner-only, both tables identical pattern
CREATE POLICY own_rows_only ON collection_items FOR ALL
  USING (user_id = auth.uid());
```

## 6. Catalogue List/Detail — Detailed Design (T-08, T-09)

**Query (list view, FR-01):**

```sql
SELECT id, image_file, gi_item_name, product_category, postal_circle_id, date_of_issue
FROM covers
WHERE verification_status = 'verified'
ORDER BY date_of_issue DESC; -- FR-04 default
```

Postal circle name resolved via a join or a client-side lookup against the small, cached `postal_circles` table (only 23 rows — safe to fetch once and hold in memory rather than re-joining every query).

**Detail view (FR-05):** single-row fetch by `id`, all columns, no additional logic — the entire point of this task is confirming the pipeline surfaces one real record correctly end-to-end.

---

## 7. India Map — Region Resolution, Shading, and Zoom/Pan (KAN-61, KAN-85)

### 7.1 Circle→region resolution (`src/renderer/src/lib/postalCircleStates.ts`)

`covers.issuing_postal_circle` is recorded by India Post circle (23 official names), but the map renders 36 geoBoundaries ADM1 regions (India's states/UTs) — the two are **not 1:1**. `REGION_CIRCLE_TABLE` hand-maps every region to the circle that administers it: 22 regions are 1:1 with a same-named circle (Odisha's circle is the legacy "Orissa" spelling, preserved deliberately); 14 are administered by a differently-named circle (e.g. Goa→Maharashtra, Lakshadweep→Kerala, the six North Eastern states→"North Eastern," which is the one circle name that isn't itself a state/UT name and deliberately excludes Sikkim). Sourced directly against India Post's own org page and cross-validated against an independent source, both agreeing on the same 7 named exceptions; an 8th (Ladakh→Jammu and Kashmir) is **inference by elimination**, not a directly-stated fact in either source — flagged in the table's own comment as the one row to re-check first if it's ever found wrong.

`normalizeRegionName()` strips Unicode combining diacritical marks (`̀`–`ͯ`, via NFD normalization) before lowercasing/trimming — needed because the real downloaded geoBoundaries file uses diacritics on many region names ("Bihār," "Jammu and Kashmīr") that the plain-ASCII circle table doesn't. `resolveCircleForRegion()` looks up a region's circle through this normalized map, returning `null` (not throwing) for anything unrecognized. `getSiblingRegionsInCircle()` returns the other region names sharing a circle, used for the "also covers: …" tooltip copy on shared-circle regions.

### 7.2 Shading algorithm (`src/renderer/src/lib/regionCoverStats.ts`)

`getRegionCoverStats()` reuses `Catalogue.tsx`'s already-fetched `facets.postalCircles` counts — no new query. A region's count is always its whole circle's count (covers are only ever tagged by circle, never by state), so shared-circle regions honestly show the same full count rather than a false per-region split.

`getShadingLevel(count, maxCount)` is **relative to the single most-covered circle currently on the map, not an absolute threshold** — `0` is reserved for zero covers; `1`–`4` are `Math.ceil((count / maxCount) * 4)`, clamped to `[1, 4]`. Same "scale to the max" logic `YearTimeline`'s bar widths already use, so the ramp stays meaningful as the catalogue grows. `SHADING_FILLS` (level→CSS-variable map) is the single source of truth both the map and `IndiaMapLegend.tsx` render from, so the two can't silently drift apart if the ramp's colors change.

### 7.3 Zoom/pan (`src/renderer/src/components/IndiaMap.tsx`)

Solves a real precision problem: several regions (the North Eastern cluster, small standalone UTs like Lakshadweep) are genuinely hard to click at full-India zoom. `ZoomableGroup` (from `react-simple-maps`) wraps the `<Geographies>` tree; `center`/`zoom` are local state (`[83, 23]` / zoom `1`, `MIN_ZOOM=1`/`MAX_ZOOM=8`/`ZOOM_STEP=1.5`), synced from `onMoveEnd` on every scroll/drag gesture. **Native scroll-to-zoom and drag-to-pan are the load-bearing mechanism** — the on-screen +/−/reset buttons are a discoverability layer on top for anyone without a wheel, not the primary fix. A region is clickable only once `getRegionCoverStats(...).circleId` is non-null (i.e. its circle has at least one verified cover) — a genuinely zero-cover region stays inert rather than firing a live fallback query into a guaranteed-empty grid. `IndiaMapSearch` (jump-to-state) is a parallel, map-interaction-free path to the same result: it filters `ALL_REGION_NAMES` via the same `normalizeRegionName()` matching, restricted to regions with a resolvable `circleId`, and calls the identical `onSelectRegion(circleId)` callback a map click uses.

## 8. Offline SQLite Cache — Schema and Sync Algorithm (T-16, T-17)

`node:sqlite` has no renderer-side equivalent, so the cache lives entirely in the main process (`src/main/localCache.ts`), exposed to the renderer via `ipcMain.handle('cache:*', …)` (`src/main/index.ts`) + the preload bridge. One `DatabaseSync` instance is opened once at `app.whenReady()`, at `join(app.getPath('userData'), 'cache.db')`.

**Schema:** a flat `covers` table mirroring `CoverDetail`'s fields (so Detail view also works offline, not just the grid) plus a `meta` key/value table holding `last_synced_at` and a JSON-serialized copy of the catalogue `facets` object — facets are **not** recomputed from cached rows on read; the already-tested `fetchCatalogueFacets()` aggregation is cached verbatim at sync time instead, since reimplementing that aggregation in SQL would risk it quietly drifting from the online version.

**Sync (`syncCacheFromSupabase()`, `src/renderer/src/lib/covers.ts`):** a full replace, not incremental — the verified set (~286 rows) is cheap enough to refetch wholesale, so there's no delta-sync machinery. Fetches every detail column plus fresh facets in parallel, then `replaceCache()` wraps `DELETE FROM covers` + the full re-`INSERT` + both `meta` writes in one transaction (`BEGIN`/`COMMIT`, `ROLLBACK` on any error). Triggered on sign-in, on every reconnect (`useOnlineStatus`), and by T-17's manual refresh button — the sync function itself doesn't decide when to run.

**Read path:** `fetchCataloguePage()`, `countCatalogueMatches()`, `queryOrderedIds()`, `fetchCoversByIds()`, `fetchCatalogueFacets()`, and the single-cover fetch each try the online Supabase query first (skipped entirely if `isOffline()`), and fall through to the matching `window.api.cache.query*()` call on any failure or while offline. The cache's `buildWhereClause()`/`buildOrderClause()` hand-translate the exact same filters and precedence as the online path's `applyCatalogueFilters()` into raw SQL (postal circle, product category, year-range, search term, exact GI name) — a real duplicate-logic risk flagged directly in the source, not hidden: if the online filters ever change, this SQL needs a matching update, or the two engines will quietly disagree on what counts as a match.

## 9. Password Reset & Signup Confirmation — Cross-Hosting Architecture (T-41/KAN-15, KAN-83)

**The problem:** the Electron app has no web presence to land a Supabase auth link on — both a password-recovery token and a signup-confirmation link need to resolve to a real, reachable web page, which an Electron app alone can't provide without disproportionate deep-linking/protocol-handler work (the same complexity already flagged and deferred for Google SSO, T-11a).

**The fix:** two static pages under `webpage/` (`index.html`, `confirmed.html`), deployed via GitHub Pages from this same public repo (`.github/workflows/deploy-pages.yml`), reachable at `https://msvibes.github.io/philaindiacovers-app/` and `/confirmed.html`. Both load `@supabase/supabase-js` from a CDN directly in the page (no build step) and construct a client **hardcoded to the production project** — this app's usual dev/CI-vs-production `.env`/`.env.production` split doesn't apply here, since these pages only ever need to work against real production accounts. The anon key embedded in the page is the real production anon key — safe to expose by the same convention as the Electron bundle's own key, decoded and role-verified before being placed here.

- **`index.html` (password reset):** shows a "checking your link" state on load while Supabase's client parses the recovery token from the URL fragment (`detectSessionInUrl: true`); if a `PASSWORD_RECOVERY` auth event fires, shows a new-password form and calls `client.auth.updateUser({ password })` on submit; if no such event fires within 4 seconds, fails honestly to an "this link isn't valid" state rather than waiting forever. `ForgotPassword.tsx` (App repo) drives this from the app side: `supabase.auth.resetPasswordForEmail(email, { redirectTo: RESET_PASSWORD_PAGE_URL })`, with that URL hardcoded (not an env var, deliberately — same reasoning as the page itself always targeting production). Shows the same "check your email" success state regardless of whether the address actually has an account — matches `resetPasswordForEmail()`'s own anti-enumeration response shape, not distinguished client-side.
- **`confirmed.html` (signup confirmation, KAN-83):** added after discovering Supabase's Site URL fallback (an inert `localhost` placeholder set during KAN-75) would otherwise leave a real signup-confirmation link resolving to a broken page. `Signup.tsx` now passes its own explicit `emailRedirectTo` pointing here rather than depending on that fallback, fully decoupling signup confirmation from Site URL.

Both `webpage/` and the deploy workflow are excluded from `electron-builder.yml`'s files list — a real near-miss caught before T-41's first PR merged (the same class of packaging gap KAN-74 fixed for `.claude/`/`docs/`), now a standing check for any new top-level folder.

## 10. Collector Self-Service `display_name` — RLS + Column-Scoped Grant (KAN-41)

`profiles.display_name` has existed since the Walking Skeleton but had zero client-side access — `profiles` carried no RLS policies at all before this, and `current_profile_role()` is `SECURITY DEFINER` specifically because an authenticated caller has no direct read access to the table otherwise.

**Design decision (2026-09-07):** a plain RLS policy + column-scoped `GRANT`, not a `SECURITY DEFINER` function pair like `verify_cover()`/`current_profile_role()`. This is a same-row, single-column, non-atomic read/write with no cross-row or multi-step logic — the shape RLS already fits directly. `SECURITY DEFINER` earns its complexity only when a function needs elevated privilege beyond what the caller's own row should allow (`verify_cover()` writes `covers`, not `profiles`; `current_profile_role()` must work for a caller with no `profiles` grant at all) — neither reason applies here.

```sql
create policy "Collectors can view their own profile"
on profiles for select to authenticated using (id = auth.uid());

create policy "Collectors can update their own profile"
on profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

grant select (id, role, display_name, created_at) on profiles to authenticated;
grant update (display_name) on profiles to authenticated;
```

(`Admin/supabase/migrations/20260907120000_profiles_self_service_display_name.sql`)

**The real enforcement point is the column-scoped `GRANT`, not the RLS policy alone** — the policy alone would let an `UPDATE` reach the row regardless of column, so without the `grant update (display_name)` restriction, `role` would be reachable by a Collector on their own row too. Column-level privileges and RLS combine with **AND** semantics in Postgres (both must permit an operation) — confirmed this is real layered enforcement, not two independently-permissive checks that happen to look safe together.

---

_This document is now extended for every subsystem judged to warrant real low-level design (§§1–10). Add a new section here, same bar as above, the next time a genuinely non-obvious algorithm/schema/security design ships — not for routine UI wiring, which stays documented in `docs/PRD-Addendum-App-Catalogue-UX.md`'s task table and `.claude/PROGRESS.md` instead._
