#!/usr/bin/env node
// T-38: generates build/icon.{ico,icns,png} and resources/icon.png from a
// single source image. Kept as a real, reusable script (not a one-off) —
// this app's icon is an explicitly-labeled placeholder (INDPHILA, a
// different name from the app itself; see the T-38 row in
// docs/PRD-Addendum-App-Catalogue-UX.md) and will need regenerating again
// once real branding exists.
//
// The source is a plain JPEG, which has no alpha channel by spec — its
// white background is unambiguously baked in, not transparency (confirmed
// directly from the file's own JFIF header, not assumed from how it looks).
// This script approximates a transparent background with a soft
// near-white-to-transparent threshold so the icon doesn't render as a
// visible white box in dark-mode taskbars/Explorer. This is a real
// approximation, not a perfect cutout — acceptable for a known placeholder,
// worth redoing properly (or skipping entirely) once real branding with an
// actual transparent source arrives.
//
// Usage:
//   node scripts/generate-icons.mjs <path-to-source-image>
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import sharp from 'sharp'
import png2icons from 'png2icons'

const sourcePath = process.argv[2]
if (!sourcePath) {
  console.error('Usage: node scripts/generate-icons.mjs <path-to-source-image>')
  process.exit(1)
}

const WHITE_FLOOR = 225 // below this, a pixel is never touched (fully opaque)
const WHITE_CEIL = 250 // at/above this (and low saturation), fully transparent

function isLowSaturation(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max - min < 18 // roughly grey/white, not a saturated red/blue pixel
}

async function main() {
  const input = readFileSync(resolve(sourcePath))

  const image = sharp(input).ensureAlpha()
  const { width, height } = await image.metadata()
  const { data } = await image.raw().toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (isLowSaturation(r, g, b)) {
      const minChannel = Math.min(r, g, b)
      if (minChannel >= WHITE_CEIL) {
        data[i + 3] = 0
      } else if (minChannel > WHITE_FLOOR) {
        // Linear falloff between FLOOR and CEIL for a softer, less jagged
        // edge around the mark's own anti-aliasing.
        const t = (minChannel - WHITE_FLOOR) / (WHITE_CEIL - WHITE_FLOOR)
        data[i + 3] = Math.round(255 * (1 - t))
      }
    }
  }

  const transparentPng = await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer()

  writeFileSync(resolve('build/icon.png'), transparentPng)
  writeFileSync(resolve('resources/icon.png'), transparentPng)
  console.log(`build/icon.png + resources/icon.png written (${width}x${height})`)

  // BICUBIC: best quality available given the source is smaller than
  // png2icons' ideal 1024x1024 input.
  const ico = png2icons.createICO(transparentPng, png2icons.BICUBIC, 0, false, true)
  if (!ico) throw new Error('createICO failed')
  writeFileSync(resolve('build/icon.ico'), ico)
  console.log('build/icon.ico written')

  const icns = png2icons.createICNS(transparentPng, png2icons.BICUBIC, 0)
  if (!icns) throw new Error('createICNS failed')
  writeFileSync(resolve('build/icon.icns'), icns)
  console.log('build/icon.icns written')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
