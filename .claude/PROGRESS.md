# Progress Snapshot — philaindiacovers-app

**Last updated:** 2026-08-11
**Last session worked on:** T-07.5 — this repo's first real product code: Electron+React scaffolding and a minimal Collector login

## Current state

This repo's first real feature work is code-complete and verified live, on branch `t07-5-electron-scaffold-collector-login` (not yet merged — see "In progress"). **Split out from T-08 on purpose**: an earlier pass bundled T-07.5 and T-08 into one branch/PR, which was an oversight, not a real dependency — T-07.5's own verification check never needed the catalogue view to exist. Split into two, matching the one-task-one-PR precedent T-06.5 already established in the Admin repo.

**T-07.5 (US-01, US-03) — Electron + React scaffolding + minimal Collector login:**
- Scaffolded via `electron-vite` (React + TypeScript template), Tailwind CSS added for styling (the scaffold has none by default).
- `src/renderer/src/lib/supabaseClient.ts` — anon-key browser client, mirrors the Admin repo's own pattern.
- `src/renderer/src/pages/Login.tsx` — email/password only. Google SSO is genuinely out of scope here, not just hidden behind a flag like Admin's: Electron can't do a simple `signInWithOAuth` + `redirectTo` the way a browser app can (Google's ToS blocks embedded-webview OAuth; a real implementation needs `shell.openExternal` + a custom protocol handler or loopback redirect capture).
- `src/renderer/src/App.tsx` — session-gated: signed-out shows Login, signed-in shows a placeholder ("You're in! The catalogue is on its way…") that T-08 replaces with the real Catalogue. Kept deliberately minimal so this branch doesn't presuppose T-08's own code.
- `scripts/provision-collector.mjs` — provisions a test Collector account. Its trigger-verification check (does Admin's `handle_new_user()` actually create the `profiles` row?) is factored into `scripts/checkCollectorProfile.mjs`, a pure function with its own Vitest test (`scripts/checkCollectorProfile.test.mjs`, 3 tests) — this is a real, re-runnable regression guard, not just a one-time CLI run that happened to pass. **Caught in review**: an earlier version of this claim overstated it — the check existed as a one-off script run with no automated test backing it. Fixed by extracting the logic before finalizing this branch.
- Ran for real: trigger fired correctly, `profiles.role = 'collector'` confirmed. Real account provisioned (`krutimlogic+collector@gmail.com` — credentials given directly to the user in-session, not recorded here), matching how Admin's own real Admin/Verifier accounts are handled.
- **Real infra gap found and fixed along the way**: the scaffold's default `index.html` Content Security Policy (`default-src 'self'`, no `connect-src`) silently blocked every Supabase request — sign-in failed with a CSP violation in the console, not a login error. Fixed by adding `connect-src 'self' https://*.supabase.co` (wildcarded, not one hardcoded project ID, since dev vs. prod are separate Supabase projects) and `blob:` to `img-src` (needed later for T-08's thumbnail object URLs, harmless to add now). Scoped narrowly — `default-src`/`script-src`/`style-src` untouched, not a blanket CSP weakening.

**Verified live, end-to-end, not mocked**: signed in as the real script-provisioned test Collector through the actual Login screen (`electron-vite dev`, renderer viewed via its Vite dev-server port in the Browser pane) and reached the signed-in placeholder screen — proves a real authenticated Collector session end-to-end without depending on T-08's Catalogue existing.

## In progress

Code-complete and verified live (3/3 Vitest tests, `npm run build`/`npm run lint` clean) but **not yet merged**, on branch `t07-5-electron-scaffold-collector-login`, no PR opened yet (`gh` not installed — PR to be opened via the GitHub web UI). **T-08 is stacked on top of this branch** (`t08-catalogue-list-view`, not yet opened either) — merge this one first, then T-08's branch either auto-retargets to `main` or needs a manual retarget on GitHub.

## Next up

1. **Open a PR for `t07-5-electron-scaffold-collector-login`** and merge it.
2. Then **T-08** (US-07, catalogue list view) — already built on the stacked branch, just waiting on this one to land first.

## Known gotchas from recent sessions

- **The Electron/Vite scaffold's default CSP blocks Supabase entirely unless `connect-src`/`img-src` are widened** (`src/renderer/index.html`) — see above. Anyone re-scaffolding or touching this file should know the default template is not Supabase-ready out of the box.
- **`covers` has zero `anon` grant, by design** — this app has a locked no-anonymous-browsing non-goal, so any table/Storage read needs a real authenticated Collector session. Don't add an `anon`-scoped policy anywhere in this app's data path without confirming that's actually intended first.
- **Test Collector provisioning**: `npm run provision:collector -- --email=... --password=...` needs `SUPABASE_SERVICE_ROLE_KEY` passed inline (not stored in this app's `.env` — the App only ever uses the anon key at runtime, per CLAUDE.md).
- This session's commit (`ae5c96a`, repo/tooling setup) was pushed directly to `main` with no branch/PR — an **intentional, accepted one-off** (scaffolding/tooling, not product code). The branch-per-story/PR convention applies strictly starting with T-07.5 (this session) onward — do not extend the "one-off" exception to real story work.
- `gh` CLI is not installed on this machine — `/standup` and `/wrapup`'s PR-check steps can't run automatically until it's installed, or PR status must be confirmed manually via GitHub's web UI.
