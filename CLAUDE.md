# PhilaIndiaCovers — Consumer App

## Stack

Electron + React. Talks directly to Supabase (Postgres + Auth + Storage), no custom backend server.

## Environment

Requires a `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (never commit this file — see `.env.example`). Vite-prefixed, since the renderer reads them via `import.meta.env` — no other naming convention works here.
Supabase project region: AWS Mumbai (ap-south-1).
No self-service signup yet — sign in with a Collector account provisioned via `scripts/provision-collector.mjs` (needs `SUPABASE_SERVICE_ROLE_KEY` passed inline, not stored in this app's `.env` — the App only ever uses the anon key at runtime).

## Conventions

- Voice/tone: playful and courteous throughout (see §7 UX/Design) — this applies to UI copy, not code comments.
- Auth: email/password + Google SSO only for v1 (Apple SSO dropped — see PRD §5/§3.2 for why).
- Offline behavior: reads work from local cache when offline; writes are blocked with a clear message, not queued (see FR-16). Don't build offline write-sync — it's a deliberate scope decision, not an oversight.

## Known gotchas

- Supabase RLS blocks a Verifier role from writing directly to `covers` metadata — that's intentional (see the `verify_cover()` function in the admin repo's schema notes). Don't work around it from this app.
- Postal Circle and Product Category values: Postal Circle is a constrained lookup (23 official India Post circles); Product Category is free text, not constrained — don't add validation that doesn't exist in the schema.
- **Temporary shortcuts need an explicit, logged trigger condition, not just a "temporary" label.** If something is simplified because an alternative doesn't exist yet (e.g., a hard-coded redirect or destination because there's currently only one), document the specific condition under which it must be revisited — in a code comment AND the relevant PROGRESS.md entry. Learned from a real bug in the admin repo: its login redirect was hard-coded to the one page that existed at the time, and nothing flagged that it needed revisiting once a second, role-specific page shipped — it silently sent the wrong role to the wrong screen until caught in manual testing. This app only has one role-facing destination today (Collector), but won't always — don't let the same class of bug wait to be found by a user here too.
- **Whenever a new role-differentiated page or route is added, that task's live verification must include every existing role signing in through the actual shared entry point, not just confirming the new page works for its own intended user.** Log in as each role, observe where they land, confirm what they can and can't do. Not yet applicable (Collector is the only role today) — this rule should already be in place before a second role-facing destination exists, not added reactively after the same bug repeats here.

## Reference docs

Start at `docs/README.md` — it indexes the full documentation set and tells you which document covers what (schema, architecture decisions, threat model, test strategy, UX/tone guidance, etc.), including which ones actually live in this repo's `docs/` versus the broader package. As of 2026-08-16, this repo's `docs/` has full file-level parity with the Admin repo's own `docs/` (`Architecture-Decision-Records.md`, `Threat-Model.md`, and `Test-Strategy.md` were copied over) — see `docs/README.md`'s own closing note for which shared files are current versus known-stale.

## Testing

Vitest (`npm test`), same as the Admin repo — chosen per `docs/Test-Strategy.md`'s stated plan, since it works identically for both the Next.js admin app and Electron's renderer code. Pure logic gets unit tests (e.g. `scripts/checkCollectorProfile.mjs`, which `scripts/provision-collector.mjs` uses to check that Admin's `handle_new_user()` trigger actually created a `profiles` row — extracted specifically so a future regression there is caught automatically, not just by a one-time manual script run; similarly `src/renderer/src/lib/covers.ts`'s pure formatting/resolution helpers). UI states that are impractical to exercise against live data (e.g. an empty catalogue when a real Verified cover already exists) get component tests with a mocked Supabase client instead — see `Catalogue.test.tsx`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR to `main`: lint, typecheck, the full Vitest suite (unit + live integration), then a build (which also runs the secret-leak guardrail, `scripts/check-no-secret-leak.mjs`, scanning tracked files and `out/` for the `sb_secret_...` key pattern). Mirrors the Admin repo's own CI gate (`docs/Test-Strategy.md`'s "CI Gate" section is shared across both repos).

**One-time manual setup required (cannot be done from Claude Code):** a GitHub Environment named `ci-dev-supabase` (repo Settings > Environments) holding three secrets — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — pointed at the DEV Supabase project only, never production. Until this exists, CI's "Verify integration test credentials" step fails every run, on purpose.

Env var names are `VITE_`-prefixed here (not `NEXT_PUBLIC_`-prefixed like Admin), since electron-vite's renderer only exposes `VITE_`-prefixed vars via `import.meta.env`. This was deliberately verified empirically, not assumed from Vite's docs — `src/renderer/src/lib/viteEnvVarsReachTests.test.ts` runs as part of the normal `npm test` and asserts both vars actually populate `import.meta.env` in whatever environment the suite runs in, CI included.

**Known accepted risk, logged rather than silently accepted:** this repo and the Admin repo share one dev Supabase project, and each has its own independent per-repo CI concurrency group — a PR pushed to both repos at once could run live integration tests against that shared project concurrently. Accepted for now given this app's genuinely small live-data footprint. **Trigger condition for revisiting:** if Supabase Auth rate-limit errors are ever actually observed in either repo's CI logs, build real cross-repo coordination then, not before.

## Branch/PR conventions

Branch per story: `us-##-short-description`. PR to `main`, self-reviewed before merge.

**Direct-to-main exception for docs-only changes (explicit policy as of 2026-08-17, originally adopted for consistency with the Admin repo before this repo's own branch protection existed — see the 2026-08-18 update just below for why it's now enforced here too, not just written convention):** `PROGRESS.md`, `CLAUDE.md`, `docs/**`, and `README.md` — pure documentation/process, never executed — may be pushed straight to `main`, no branch/PR required. Nothing else qualifies, even for a "tiny" change: `src/**`, `package.json`/`package-lock.json`, and `.github/workflows/**` always require a real branch + PR + passing CI. (No `supabase/migrations/**` here — schema lives only in the Admin repo.)

**Update (2026-08-18): this repo is now public, with two active rulesets on `main`** — `main-1` (deletion/force-push protection) and `main-2` (deletion/force-push protection + requires the `ci` status check to pass), both confirmed `enforcement: "active"` via the GitHub API, matching Admin's own setup. Made public only after a full git-history secret scan (28 commits, 121 blobs — Gitleaks + targeted pattern checks, all clean) confirmed nothing sensitive was ever committed; see `.claude/PROGRESS.md`'s 2026-08-18 entry for the full record.

**Now the same as Admin, for the same reason**: `main-2`'s required-status-check rule genuinely blocks a direct push to `main` — confirmed live, not assumed, when this exact docs update was rejected by GitHub before this fix. `main-2` has a `RepositoryRole` bypass actor (`bypass_mode: "always"`), matching Admin's setup exactly. **Repo-owner bypass on a GitHub ruleset applies universally, with no way to scope it by file path** — so the docs-only exception above is a deliberate, scoped exception to that enforcement, honored by convention rather than by GitHub technically restricting the bypass to docs paths, written down so it stays a decision, not a gap nobody chose. Same wording, same mechanism as Admin's own `CLAUDE.md`.
