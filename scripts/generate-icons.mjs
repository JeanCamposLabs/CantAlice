// One-off icon generator: renders the app icon SVG to the PNG sizes that
// browsers and iOS need for "Add to Home Screen". Run with:  node scripts/generate-icons.mjs
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')

// Full-bleed icon (safe for iOS rounding and Android maskable): the brand
// gradient fills the canvas; the note sits well inside the safe zone.
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a1450"/>
      <stop offset="0.55" stop-color="#1a0b2e"/>
      <stop offset="1" stop-color="#120726"/>
    </linearGradient>
    <linearGradient id="note" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffd9a3"/>
      <stop offset="0.45" stop-color="#ff8fb1"/>
      <stop offset="1" stop-color="#b478ff"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
      <stop offset="0" stop-color="#ff8fb1" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#ff8fb1" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="215" r="180" fill="url(#glow)"/>

  <!-- tiny ambient notes -->
  <text x="120" y="150" font-family="Georgia, serif" font-size="46" fill="#ffffff" opacity="0.16">♪</text>
  <text x="372" y="370" font-family="Georgia, serif" font-size="40" fill="#ffffff" opacity="0.16">♫</text>

  <!-- main eighth note, centered in the safe zone -->
  <g fill="url(#note)">
    <path d="M330 116
             c0 0 -16 13 -56 25
             c-50 15 -72 35 -72 77
             v138
             a64 64 0 1 0 32 55
             V268
             c0 -19 10 -27 46 -38
             c38 -12 50 -24 50 -51
             z"/>
  </g>
</svg>`

const targets = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-512.png', size: 512 },
  { file: 'og-image.png', size: 512 },
]

for (const { file, size } of targets) {
  const png = await sharp(Buffer.from(svg(size))).resize(size, size).png().toBuffer()
  writeFileSync(join(publicDir, file), png)
  console.log('wrote', file, `(${size}px)`)
}

console.log('done')
