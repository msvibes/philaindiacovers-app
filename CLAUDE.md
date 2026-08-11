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

## Testing

Vitest (`npm test`), same as the Admin repo — chosen per `docs/Test-Strategy.md`'s stated plan, since it works identically for both the Next.js admin app and Electron's renderer code. Pure logic gets unit tests (e.g. `scripts/checkCollectorProfile.mjs`, which `scripts/provision-collector.mjs` uses to check that Admin's `handle_new_user()` trigger actually created a `profiles` row — extracted specifically so a future regression there is caught automatically, not just by a one-time manual script run; similarly `src/renderer/src/lib/covers.ts`'s pure formatting/resolution helpers). UI states that are impractical to exercise against live data (e.g. an empty catalogue when a real Verified cover already exists) get component tests with a mocked Supabase client instead — see `Catalogue.test.tsx`.

## Branch/PR conventions

Branch per story: `us-##-short-description`. PR to `main`, self-reviewed before merge.
