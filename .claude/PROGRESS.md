# Progress Snapshot — philaindiacovers-app

**Last updated:** 2026-08-11
**Last session worked on:** T-07.5 + T-08 — this repo's first real product code, now merged into `main`

## Current state

`main` is at `51c7877` (PR #2, `t08-catalogue-list-view`, merged; PR #1, `t07-5-electron-scaffold-collector-login`, merged just before it). This repo's first real feature work is done, merged, and verified live. **Split into two on purpose**: an earlier pass bundled T-07.5 and T-08 into one branch/PR, which was an oversight, not a real dependency — T-07.5's own verification check never needed the catalogue view to exist. Matches the one-task-one-PR precedent T-06.5 already established in the Admin repo. Both branches were auto-deleted on merge (same GitHub setting as the Admin repo); local copies cleaned up too.

**T-07.5 (US-01, US-03) — Electron + React scaffolding + minimal Collector login:**

- Scaffolded via `electron-vite` (React + TypeScript template), Tailwind CSS added for styling (the scaffold has none by default).
- `src/renderer/src/lib/supabaseClient.ts` — anon-key browser client, mirrors the Admin repo's own pattern.
- `src/renderer/src/pages/Login.tsx` — email/password only. Google SSO is genuinely out of scope here, not just hidden behind a flag like Admin's: Electron can't do a simple `signInWithOAuth` + `redirectTo` the way a browser app can (Google's ToS blocks embedded-webview OAuth; a real implementation needs `shell.openExternal` + a custom protocol handler or loopback redirect capture).
- `src/renderer/src/App.tsx` — session-gated: signed-out shows Login, signed-in shows a placeholder ("You're in! The catalogue is on its way…") that T-08 replaces with the real Catalogue. Kept deliberately minimal so this branch doesn't presuppose T-08's own code.
- `scripts/provision-collector.mjs` — provisions a test Collector account. Its trigger-verification check (does Admin's `handle_new_user()` actually create the `profiles` row?) is factored into `scripts/checkCollectorProfile.mjs`, a pure function with its own Vitest test (`scripts/checkCollectorProfile.test.mjs`, 3 tests) — this is a real, re-runnable regression guard, not just a one-time CLI run that happened to pass. **Caught in review**: an earlier version of this claim overstated it — the check existed as a one-off script run with no automated test backing it. Fixed by extracting the logic before finalizing this branch.
- Ran for real: trigger fired correctly, `profiles.role = 'collector'` confirmed. Real account provisioned (`krutimlogic+collector@gmail.com` — credentials given directly to the user in-session, not recorded here), matching how Admin's own real Admin/Verifier accounts are handled.
- **Real infra gap found and fixed along the way**: the scaffold's default `index.html` Content Security Policy (`default-src 'self'`, no `connect-src`) silently blocked every Supabase request — sign-in failed with a CSP violation in the console, not a login error. Fixed by adding `connect-src 'self' https://*.supabase.co` (wildcarded, not one hardcoded project ID, since dev vs. prod are separate Supabase projects) and `blob:` to `img-src` (needed later for T-08's thumbnail object URLs, harmless to add now). Scoped narrowly — `default-src`/`script-src`/`style-src` untouched, not a blanket CSP weakening.

**Verified live, end-to-end, not mocked**: signed in as the real script-provisioned test Collector through the actual Login screen (`electron-vite dev`, renderer viewed via its Vite dev-server port in the Browser pane), with a genuine sign-out/sign-in cycle, not a leftover session — reached the signed-in placeholder screen, proving a real authenticated Collector session end-to-end without depending on T-08's Catalogue existing.

**T-08 (US-07) — consumer catalogue list view:**

- `src/renderer/src/pages/Catalogue.tsx` + `src/renderer/src/lib/covers.ts` — queries `covers` joined to `postal_circles(name)` where `verification_status = 'verified'`; thumbnail via `.storage.from('cover-images').download(image_file)` → `URL.createObjectURL(...)`, the same pattern Admin's T-07 review queue already proved (a plain `<img src>` can't work — the bucket stays private, access is RLS-policy-gated).
- `src/renderer/src/App.tsx` updated: T-07.5's placeholder is replaced with the real Catalogue on a signed-in session.
- Three distinct states with real playful/courteous copy: loading ("Dusting off the covers for you…"), empty-catalogue ("The shelves are freshly dusted!" — this app's actual first-run experience, not yet reachable live since one real Verified cover already exists), and error ("Well, that didn't go to plan.").
- **Cross-repo dependency (Admin repo)**: new migration `20260811190000_cover_images_verified_read_policy.sql` — a Collector can now download a _verified_ cover's image via Storage, scoped to `authenticated` only (not `anon`, per this app's locked no-anonymous-browsing non-goal — corrected stale "public read" wording in `API-Integration-Contracts.md` §4 at the source). Applied to the live dev project, verified via `coverImageAccess.integration.test.ts` (2 new/updated cases) and a real curl round-trip (anon → 400, real Collector session → 200). Merged into the Admin repo's `main` via PR #12.

**Verified live, end-to-end, not mocked**: signed in as the real test Collector, landed on the Catalogue, and confirmed the one real Verified cover — "Adamchini Chawal (Rice)," Uttar Pradesh, 19 May 2023, "Category not recorded yet" (courteous fallback for the genuinely-null `product_category`) — renders correctly with a real, non-broken thumbnail (confirmed via `naturalWidth`/`naturalHeight`, not just "no error thrown"). The empty-catalogue and error states were deliberately verified separately, via Vitest component tests with a mocked Supabase client, not live — the real database currently has exactly one Verified cover, so there's no real zero-covers moment to test against without disrupting actual data.

## In progress

Nothing in progress. Both branches merged (PR #1 `t07-5-electron-scaffold-collector-login`, PR #2 `t08-catalogue-list-view`, in that order), auto-deleted on GitHub, local copies cleaned up. Confirmed via a fresh `git fetch origin` at session wrap-up — the merges happened via the GitHub web UI mid-session and weren't otherwise visible in conversation until this fetch caught them, same class of drift `/standup`'s fetch-first step exists to catch. The Admin repo's companion migration (PR #12) is merged too.

**Not yet confirmed**: whether Jira has been updated to reflect this (US-07, and possibly US-01/US-03) — reminder given to the user this session, not something this tool can verify or do itself.

## Next up

**T-09** (US-11, cover detail view) — the next Walking Skeleton task, builds directly on T-08's query/auth foundation (`covers`/`postal_circles` query pattern, Storage image-download pattern, and the authenticated Collector session already established).

## Known gotchas from recent sessions

- **The Electron/Vite scaffold's default CSP blocks Supabase entirely unless `connect-src`/`img-src` are widened** (`src/renderer/index.html`) — see above. Anyone re-scaffolding or touching this file should know the default template is not Supabase-ready out of the box.
- **`covers` (and now `cover-images` Storage reads) have zero `anon` grant, by design** — this app has a locked no-anonymous-browsing non-goal, so any table/Storage read needs a real authenticated Collector session. Don't add an `anon`-scoped policy anywhere in this app's data path without confirming that's actually intended first (see the API-Integration-Contracts.md §4 correction this session, which fixed exactly this kind of stale "public" assumption).
- **Test Collector provisioning**: `npm run provision:collector -- --email=... --password=...` needs `SUPABASE_SERVICE_ROLE_KEY` passed inline (not stored in this app's `.env` — the App only ever uses the anon key at runtime, per CLAUDE.md).
- This session's commit (`ae5c96a`, repo/tooling setup) was pushed directly to `main` with no branch/PR — an **intentional, accepted one-off** (scaffolding/tooling, not product code). The branch-per-story/PR convention applies strictly starting with T-07.5 (this session) onward — do not extend the "one-off" exception to real story work.
- `gh` CLI is not installed on this machine — `/standup` and `/wrapup`'s PR-check steps can't run automatically until it's installed, or PR status must be confirmed manually via GitHub's web UI.
