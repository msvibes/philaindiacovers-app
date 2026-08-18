#!/usr/bin/env node
// Fails (non-zero exit) if the Supabase service-role key pattern appears in
// any git-tracked file, or in the built app output (out/).
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
// Admin repo's scripts/check-no-secret-leak.mjs — same key pattern, same
// two-layer approach, output directory swapped (out/ instead of
// .next/static, since an Electron app's shipped output is the whole
// packaged app, not just client-served static assets).
//
// Run via `npm run check:secrets`, wired into `npm run build`.
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Supabase's newer secret-key format (this project's keys use the
// sb_publishable_/sb_secret_ prefixes rather than the older JWT format).
// Update this if the project's key format ever changes.
const SECRET_KEY_PATTERN = /sb_secret_[A-Za-z0-9_-]+/

const repoRoot = process.cwd()
const selfPath = path.relative(repoRoot, fileURLToPath(import.meta.url)).split(path.sep).join('/')

let failed = false

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

    if (SECRET_KEY_PATTERN.test(content)) {
      console.error(`Service-role key pattern found in tracked file: ${file}`)
      failed = true
    }
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
        if (SECRET_KEY_PATTERN.test(content)) {
          console.error(`Service-role key pattern found in build output: ${full}`)
          failed = true
        }
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
