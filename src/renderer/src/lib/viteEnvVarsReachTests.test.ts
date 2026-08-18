import { describe, expect, it } from 'vitest'

// Purpose: prove — not assume — that Vite actually populates
// import.meta.env.VITE_* from real process.env values set via CI's
// `env:` block (GitHub Actions), the same way it does from a local
// .env file. Vite's docs say existing process.env vars matching the
// VITE_ prefix take priority over .env, but this repo had never
// actually run that path in CI before — locally it's always been via
// .env. If this test ever fails in CI while passing locally, that's
// the CI env-var wiring breaking, not application logic — read it
// that way first, before assuming a random regression.
describe('Vite env vars reach import.meta.env in this environment', () => {
  it('VITE_SUPABASE_URL is present and looks like a Supabase project URL', () => {
    const value = import.meta.env.VITE_SUPABASE_URL
    expect(value).toBeTruthy()
    expect(value).toMatch(/^https:\/\/.+\.supabase\.co$/)
  })

  it('VITE_SUPABASE_ANON_KEY is present and non-trivial', () => {
    const value = import.meta.env.VITE_SUPABASE_ANON_KEY
    expect(value).toBeTruthy()
    expect(value.length).toBeGreaterThan(20)
  })
})
