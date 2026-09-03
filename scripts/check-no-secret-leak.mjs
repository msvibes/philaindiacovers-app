#!/usr/bin/env node
// Fails (non-zero exit) if a Supabase service-role credential appears in any
// git-tracked file, or in the built app output (out/).
//
// Why this exists: this app's own architecture already keeps the
// service-role key out of anything that ships — only scripts/ (this
// script, provision-collector.mjs) and *.integration.test.ts files ever
// reference it, and electron-vite's build only bundles src/main,
// src/preload, and src/renderer into out/, never scripts/ or tests. That's
// a real, currently-true structural fact, not a guess — but it's exactly
// the shape of "safe by accident, not by explicit check" that's bitten
// this project twice already (the NULL-role guard's incidental FK
// protection; branch protection's default admin-bypass): a future
// refactor could silently change what gets bundled without anyone
// noticing this assumption broke. This script is the explicit check that
// doesn't depend on today's structure holding. Adapted directly from the
// Admin repo's scripts/check-no-secret-leak.mjs — same two-layer
// approach, output directory swapped (out/ instead of .next/static, since
// an Electron app's shipped output is the whole packaged app, not just
// client-served static assets).
//
// Run via `npm run check:secrets`, wired into `npm run build`.
//
// 2026-09-03 incident, why this now checks TWO key formats, not one: a
// real production service-role key — the legacy JWT format this project's
// actual Supabase keys use — was mistakenly written into .env.production
// under the VITE_SUPABASE_ANON_KEY name during a key rotation, built into
// a real installer, and delivered to the project owner before being
// caught (by manually decoding the JWT, not by this script — its
// then-only pattern, sb_secret_..., cannot match a JWT-format key at
// all). This script's own header comment claimed "this project's keys
// use the sb_publishable_/sb_secret_ prefixes" — false for this
// project's actual keys, the exact kind of unverified assumption
// CLAUDE.md's new credential-verification rule exists to prevent. Fixed
// by decoding any JWT-shaped string found and checking its own `role`
// claim directly, the same way the incident was actually caught, rather
// than trusting a prefix or a variable name.
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Supabase's newer secret-key format (some Supabase projects use the
// sb_publishable_/sb_secret_ prefixes rather than the older JWT format).
// Kept as a real, additional check — not this project's actual key
// format today, but cheap to also guard against if that ever changes.
const NEW_FORMAT_SECRET_PATTERN = /sb_secret_[A-Za-z0-9_-]+/

// Legacy Supabase JWT keys: three dot-separated base64url segments, the
// first two of which are themselves base64url JSON objects (so both
// start with "eyJ" — base64url of '{"'). This matches the *shape* of any
// JWT, not just Supabase's — deliberately broad, since the whole point is
// to decode and check the real role claim rather than pattern-match a
// prefix that can be mislabeled or wrong.
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g

function base64UrlDecode(segment) {
  const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4)
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

// Decodes every JWT-shaped substring found in `content` and returns true
// if any of them actually decodes to role: "service_role" — the real
// check, not a guess from formatting. A string that merely looks
// JWT-shaped but isn't valid base64/JSON is skipped, not treated as a
// match (avoids false-failing the build on an unrelated eyJ-prefixed
// string that happens to appear in a minified bundle).
function containsServiceRoleJwt(content) {
  const matches = content.match(JWT_PATTERN)
  if (!matches) return false

  for (const jwt of matches) {
    const payloadSegment = jwt.split('.')[1]
    try {
      const payload = JSON.parse(base64UrlDecode(payloadSegment))
      if (payload && payload.role === 'service_role') return true
    } catch {
      // Not actually a valid JWT payload — coincidental eyJ...eyJ... text
      // (e.g. inside a minified bundle), not a real key. Skip it.
    }
  }
  return false
}

const repoRoot = process.cwd()
const selfPath = path.relative(repoRoot, fileURLToPath(import.meta.url)).split(path.sep).join('/')

let failed = false

function checkContent(content, label) {
  if (NEW_FORMAT_SECRET_PATTERN.test(content)) {
    console.error(`Service-role key pattern (sb_secret_...) found in: ${label}`)
    failed = true
  }
  if (containsServiceRoleJwt(content)) {
    console.error(`Service-role JWT (role: "service_role") found in: ${label}`)
    failed = true
  }
}

function checkTrackedFiles() {
  const files = execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((f) => f !== selfPath)

  for (const file of files) {
    const full = path.join(repoRoot, file)
    if (!existsSync(full) || statSync(full).isDirectory()) continue

    let content
    try {
      content = readFileSync(full, 'utf8')
    } catch {
      continue // binary file, skip
    }

    checkContent(content, `tracked file: ${file}`)
  }
}

function checkBuildOutput() {
  const outDir = path.join(repoRoot, 'out')
  if (!existsSync(outDir)) {
    console.log('No out/ build output found — skipping bundle check (run after `electron-vite build`).')
    return
  }

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (/\.(js|json|map)$/.test(entry.name)) {
        const content = readFileSync(full, 'utf8')
        checkContent(content, `build output: ${full}`)
      }
    }
  }

  walk(outDir)
}

checkTrackedFiles()
checkBuildOutput()

if (failed) {
  console.error('\nservice-role key leak check FAILED.')
  process.exit(1)
}

console.log('No service-role key pattern found in tracked files or build output.')
