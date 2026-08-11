#!/usr/bin/env node
// Test Collector account provisioning (T-07.5, US-01/US-03). There is no
// self-service signup in this app yet, so a real authenticated Collector
// session for verification has to come from somewhere — this mirrors the
// Admin repo's provision-user.mjs, but simpler: 'collector' is already the
// default role via handle_new_user() (Admin repo,
// 20260811182123_auto_create_profile_on_signup.sql), so there's no
// --role flag or profiles.role write to make.
//
// Explicitly VERIFIES the trigger actually fired and created a real
// profiles row, rather than assuming it — the whole reason that trigger
// exists is a real orphaned-account bug found via a genuine Google sign-in
// (see the Admin repo's PROGRESS.md, 2026-08-11). Provisioning a Collector
// this same way, right after that incident, without checking for the exact
// same failure mode would be a real gap, not just extra caution. The
// classification logic itself lives in checkCollectorProfile.mjs, unit
// tested there — this file is just the CLI/IO wrapper around it.
//
// Usage:
//   node --env-file=.env scripts/provision-collector.mjs --email=... --password=...
import { createClient } from '@supabase/supabase-js'
import { classifyProfileCheck } from './checkCollectorProfile.mjs'

function parseArgs() {
  const args = {}
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([a-z]+)=(.*)$/)
    if (match) args[match[1]] = match[2]
  }
  return args
}

const { email, password } = parseArgs()

if (!email || !password) {
  console.error(
    'Usage: node --env-file=.env scripts/provision-collector.mjs --email=... --password=...'
  )
  process.exit(1)
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      "This script needs the service-role key, which is deliberately NOT in this app's .env\n" +
      '(the App only ever uses the anon key — see CLAUDE.md). Pass it inline instead, e.g.:\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env scripts/provision-collector.mjs --email=... --password=...'
  )
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
})

const { data: listData, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000
})
if (listError) {
  console.error(`Failed to list users: ${listError.message}`)
  process.exit(1)
}
const existing = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

let userId
if (existing) {
  console.log(`Account already exists: ${email} (${existing.id}) — reusing it.`)
  userId = existing.id
} else {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  if (createError || !created.user) {
    console.error(`Failed to create user: ${createError?.message}`)
    process.exit(1)
  }
  userId = created.user.id
  console.log(`Created account: ${email} (${userId})`)
}

const { data: profile, error: profileError } = await admin
  .from('profiles')
  .select('id, role')
  .eq('id', userId)
  .maybeSingle()

if (profileError) {
  console.error(`Failed to check profiles row: ${profileError.message}`)
  process.exit(1)
}

const result = classifyProfileCheck(profile)

if (result.status === 'fired-correctly') {
  console.log(`✓ handle_new_user() trigger fired correctly — profiles.role = 'collector'.`)
  process.exit(0)
}

if (result.status === 'wrong-role') {
  console.warn(
    `⚠ profiles row exists but role is "${result.role}", not "collector" — ` +
      'not touching it automatically. Investigate before relying on this account as a test Collector.'
  )
  process.exit(1)
}

console.warn(
  '⚠ REGRESSION: no profiles row was created for this account at all — ' +
    'handle_new_user() did not fire as expected. This is the same failure mode documented in the ' +
    "Admin repo's PROGRESS.md (2026-08-11). Creating a fallback profiles row now so this account is " +
    'still usable, but this needs investigating, not just working around.'
)
const { error: upsertError } = await admin
  .from('profiles')
  .upsert({ id: userId, role: 'collector' }, { onConflict: 'id' })

if (upsertError) {
  console.error(`Fallback profiles insert also failed: ${upsertError.message}`)
  process.exit(1)
}

console.log(`Fallback profiles row created for ${email} — but investigate the trigger regression.`)
process.exit(1)
