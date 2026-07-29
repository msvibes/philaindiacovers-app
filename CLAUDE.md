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

## Testing
[Fill in once a test runner is chosen during initial setup]

## Branch/PR conventions
Branch per story: `us-##-short-description`. PR to `main`, self-reviewed before merge.
