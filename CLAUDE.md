# PhilaIndiaCovers — Consumer App

## Stack

Electron + React. Talks directly to Supabase (Postgres + Auth + Storage), no custom backend server.

## Environment

Requires a `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (never commit this file — see `.env.example`). Vite-prefixed, since the renderer reads them via `import.meta.env` — no other naming convention works here.
Supabase project region: AWS Mumbai (ap-south-1).
No self-service signup yet — sign in with a Collector account provisioned via `scripts/provision-collector.mjs` (needs `SUPABASE_SERVICE_ROLE_KEY` passed inline, not stored in this app's `.env` — the App only ever uses the anon key at runtime).

**Dev vs. production builds — `.env.production` (added 2026-09-03):** since T-39 split this project's Supabase into a dev/CI project and a production project, `.env` holds the **dev** project's credentials (used by `npm run dev` and CI). A separate `.env.production` (never committed — see `.env.production.example`) holds the **real production** credentials and is what `npm run build`/`build:win` picks up automatically. This isn't custom logic — it's electron-vite's standard passthrough to Vite's own mode-based env-file precedence: `dev`/`serve` resolves with `mode: 'development'` (loads `.env` + `.env.development`), `build` resolves with `mode: 'production'` (loads `.env` + `.env.production`, with the more-specific file overriding matching keys). Verified empirically, not just at the source level: a placeholder-credentialed `.env.production` produced a real installer whose compiled bundle and installed runtime genuinely used the placeholder host, with zero trace of the dev project ref — confirmed by installing it and watching sign-in fail against a deliberately non-resolving host (see KAN-72's closing comment and PROGRESS.md's 2026-09-03 entry for the full verification trail). **Practical implication: always confirm `.env.production` holds real production credentials before running a real release build** — a build without it silently falls back to `.env` (dev), which is exactly the gap that made every installer built between T-39 (2026-08-31) and this fix point at dev instead of production.

## Conventions

- Voice/tone: playful and courteous throughout (see §7 UX/Design) — this applies to UI copy, not code comments.
- Auth: email/password + Google SSO only for v1 (Apple SSO dropped — see PRD §5/§3.2 for why).
- Offline behavior: reads work from local cache when offline; writes are blocked with a clear message, not queued (see FR-16). Don't build offline write-sync — it's a deliberate scope decision, not an oversight.

## Decision-Making Autonomy

This section exists to reduce interruptions *without* losing the interruptions that actually mattered. Every rule below is grounded in a real incident from this project's history, not a hypothetical — where useful, the precedent is named so a future reader (human or Claude) can see why the rule exists, not just that it does.

**The governing principle:** autonomy scales with reversibility and precedent, not with how "small" a decision feels in the moment. A one-line CSS change with no security implication and a one-line schema change with a real security implication can look equally small in a diff — they are not equally safe to decide alone.

---

### Tier 1 — Proceed without asking. Note the decision in the PR description or commit message.

Use this tier when **all** of the following are true: the decision is reversible with a follow-up commit, there's a clear precedent already in this codebase to follow, and getting it wrong costs time, not damage.

- **Following an established pattern.** If the codebase already solved this exact shape of problem, apply the same solution rather than inventing a new one and asking which to use. *Precedent: `Catalogue.tsx` being lifted into a controlled component under `App.tsx` correctly cited `FilterPanel`'s prior controlled-component restructuring as the reason to do it the same way, without asking whether that was the right shape.*
- **File/component organization, naming, test-file splitting.** Follow whatever convention the surrounding code already uses (e.g., splitting test files by concern the way `Catalogue.*.test.tsx` already does).
- **Fixing a real lint/type error by restructuring code**, not by suppressing the rule. Suppressing a rule is a Tier 3 decision (see below); fixing the actual anti-pattern it caught is Tier 1.
- **Choosing between two technically-equivalent implementations** where neither has product-visible behavior differences (e.g., which of two internally-consistent state-management shapes to use, when both produce identical UI behavior).
- **Deferring genuinely low-stakes scope** that was never explicitly promised for the current task (e.g., image-loading throttling deferred as a non-urgent risk, explicitly reasoned and logged, not silently dropped).

---

### Tier 2 — Proceed, but flag prominently and explain the reasoning. Don't bury it in a diff.

Use this tier when the decision is technical, has a defensible right answer given enough investigation, but an *incorrect* answer would be genuinely costly to discover later — so the investigation and conclusion both need to be visible, even though a human doesn't need to bless it before code gets written.

- **Verify the actual behavior of a library/framework/DB feature before building on top of an assumption about it** — then proceed on what was verified, don't stop to ask permission to trust your own verification. *Precedent: reading `postgrest-js`'s actual source to confirm two `.or()` calls compose as independent AND'd filters, then building the UI on that confirmed behavior — right to verify, right to not also ask "is it OK that I verified this?"*
- **Read the actual security policy before relying on client-side logic for anything sensitive.** *Precedent: reading the real RLS policy SQL directly to confirm the database — not the client query — is the actual backstop, before shipping a feature whose correctness would otherwise depend on trusting client-side filter construction.*
- **Choose the more defensive/precise implementation when two options exist and one is strictly safer**, without needing sign-off on the safer choice itself. *Precedent: filtering by the direct `postal_circle_id` FK column instead of through a joined relation, because the joined-relation approach has known PostgREST fragility — a correct call to make and log, not to ask permission for.*
- **Catch and fix your own process mistake once discovered, and document it plainly.** *Precedent: a commit briefly landing on the wrong branch due to a shared working directory being switched mid-task — caught by checking the actual branch state after committing (not assuming), confirmed nothing had been pushed, moved to the correct branch, `main` reset to its exact prior pushed state, no force-push, no rewritten shared history. This did not need to become a stop-and-ask — it needed to be caught, fixed correctly, and disclosed clearly, all of which happened.*

---

### Tier 3 — Stop and ask before proceeding. Do not guess, and do not build UI or infrastructure around an unresolved version of the answer.

This is the tier that matters most, because every one of these categories has a real, named incident this session where guessing would have been genuinely wrong — not just imperfect.

#### A required data source, schema, or integration doesn't exist yet
Do not invent a placeholder, do not build UI that assumes data which isn't confirmed to exist, do not silently drop the requirement either.
*Precedent: FR-33 (GI registry outbound link) had zero resolved data source — no DB column, no lookup table, no confirmed URL structure from the actual government registry. The correct move was refusing to guess at a hardcoded URL map or a placeholder schema column, and instead splitting it into its own explicitly-unresolved task.*

#### Anything touching credentials, secrets, or account lifecycle
Never hold, request storage of, or attempt to reconstruct a real credential. When a task needs one, ask for a fresh, scoped, throwaway credential — and when a credential needs to stop existing, verify the deletion independently rather than trusting a single call's own success response.
*Precedent: this project's entire session-long pattern of provisioning fresh throwaway Collector accounts per task, and — critically — the `t14-verify` account being wrongly marked "deleted" in `PROGRESS.md` at one point when it wasn't; the eventual real deletion was only trusted once confirmed two independent ways (a fresh `listUsers` re-query, plus a separate sign-in-attempt check needing no service-role access at all).*

#### A decision carries real legal, political, financial, or safety weight
This includes anything touching intellectual property, government/political boundaries or names, money commitments, or content a non-lawyer shouldn't be drafting as if it were reviewed legal text.
*Precedents: refusing to hand-code India's state political boundaries and instead sourcing verified data with an explicit Ladakh/J&K currency check; the Apple Developer Program's $99/year enrollment being a real budget decision, not an engineering one; disclaimer/EULA content being explicitly flagged as "standard pattern, not lawyer-reviewed" rather than presented as authoritative.*

#### Two reasonable approaches produce genuinely different product behavior
Not different code shape — different behavior a user would actually notice or a business would actually care about.
*Precedents: signup being approval-gated vs. open-with-account-linking (a real access-control policy, not an implementation detail); Date of Issue as a date-range picker vs. a year-based multi-select (different interaction models, no existing precedent to inherit); whether prev/next navigation should respect the active filter set or always cycle the full catalogue.*

#### Expanding the scope of an already-approved, in-progress piece of work
Even a cheap, obviously-correct addition should become its own task if the work it would ride on top of has already been planned and approved — because "cheap addition" and "safe to bolt onto approved work" are different questions.
*Precedent: FR-11–14 (and later, the browse-by-year timeline) were correctly kept out of the in-flight T-13+T-18 PR and given their own sequenced task, even though they touched adjacent code, specifically because that PR was already approved and shouldn't be expanded mid-flight.*

#### A summary or status claim can't actually be reconciled against real evidence
If a written record (PROGRESS.md, a Jira status, a prior session's summary) disagrees with what git, the database, or the actual running app shows — stop and surface the disagreement rather than silently trusting either side.
*Precedents: multiple standup reconciliations this session existed specifically to catch stale board statuses, stale PROGRESS.md entries, and once, a genuinely stale claim that an account had been deleted when it hadn't.*

---

### Two standing rules that apply regardless of tier

**Audit before adding, not just before removing.** Before creating a new task, requirement, or tracked item, check whether something already covers it. *Precedent: two real duplicate task IDs were created this session (a menu-bar task and a timeline-view task, each independently recreated later without checking whether an earlier one already existed) — caught only because a later reconciliation pass happened to notice, not because anyone checked at creation time.*

**A decided requirement with no owner will quietly not happen.** When a requirement is agreed to in conversation, it needs to be attached to a concrete, trackable task in the same breath — not left to "obviously get built eventually" as part of a larger task's implied scope. *Precedent: three separate real gaps this session (a Date-of-Issue field, a Home screen, dark mode) were each genuinely decided at some point but never given a task ID, and each was later discovered missing from the actual running app.*

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
