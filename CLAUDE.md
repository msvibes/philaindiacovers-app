# PhilaIndiaCovers — Consumer App

## Stack
Electron + React. Talks directly to Supabase (Postgres + Auth + Storage), no custom backend server.

## Environment
Requires a `.env` with Supabase URL and anon key (never commit this file — see `.env.example`).
Supabase project region: AWS Mumbai (ap-south-1).

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
[Fill in once a test runner is chosen during initial setup]

## Branch/PR conventions
Branch per story: `us-##-short-description`. PR to `main`, self-reviewed before merge.
