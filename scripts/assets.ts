/**
 * Generates the raster assets the HTML references.
 *
 * Social scrapers and iOS home screens do not accept SVG, so the share card and
 * the touch icon have to be real PNGs. They are drawn here from the same shapes
 * the interface uses and committed, rather than hand-exported from a design
 * tool where they would quietly drift from the product.
 *
 * Regenerate with: npm run assets
 */
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

/*
 * public/favicon.svg is the mark. The touch icon is rendered from that exact
 * file rather than redrawn here, so the two can never disagree. The share card
 * does redraw it, because at 1200x630 the mark is one element in a layout
 * rather than the whole canvas, but it uses the same construction and colours.
 */
const FAVICON = 'public/favicon.svg'

const INK = '#121319'
const SAND = '#f0b357'
const BONE = '#fafafa'
const MUTED = '#a1a1aa'

/** The mark: an amber disc with a bar struck through it. */
const mark = (size: number, cx: number, cy: number) => `
  <circle cx="${cx}" cy="${cy}" r="${size}" fill="${SAND}"/>
  <rect x="${cx - size * 1.75}" y="${cy - size * 0.24}" width="${size * 3.5}" height="${size * 0.48}"
        rx="${size * 0.24}" fill="${INK}" transform="rotate(-32 ${cx} ${cy})"/>
`

/** A ridge of sand, drawn as a filled wave. */
const ridge = (y: number, fill: string, opacity: number) => `
  <path d="M0 ${y} C220 ${y - 34} 380 ${y + 26} 620 ${y - 6}
           C860 ${y - 38} 1010 ${y + 22} 1200 ${y - 12} L1200 630 L0 630 Z"
        fill="${fill}" opacity="${opacity}"/>
`

const stars = Array.from({ length: 70 }, (_, i) => {
  // Deterministic scatter so the card is identical on every regeneration.
  const x = (i * 137.508) % 1200
  const y = ((i * 79.31) % 380) + 10
  const r = ((i % 3) + 1) * 0.55
  const o = 0.2 + ((i % 5) / 5) * 0.5
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#ffffff" opacity="${o.toFixed(2)}"/>`
}).join('')

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="32%" cy="104%" r="78%">
      <stop offset="0%" stop-color="${SAND}" stop-opacity="0.30"/>
      <stop offset="42%" stop-color="#b4712c" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="${INK}"/>
  ${stars}
  <rect width="1200" height="630" fill="url(#glow)"/>

  ${ridge(508, '#3a2716', 0.9)}
  ${ridge(556, '#1d150e', 1)}

  <g transform="translate(88, 92)">
    ${mark(26, 26, 26)}
    <text x="70" y="36" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="27"
          font-weight="500" fill="${BONE}" letter-spacing="-0.5">not-cal-hacks</text>
  </g>

  <text x="88" y="272" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="76"
        font-weight="500" fill="${BONE}" letter-spacing="-2.6">Apply in five minutes.</text>
  <text x="88" y="358" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="76"
        font-weight="500" fill="${MUTED}" letter-spacing="-2.6">Reviewed in thirty seconds.</text>

  <text x="88" y="424" font-family="DM Sans, Helvetica, Arial, sans-serif" font-size="25"
        fill="${MUTED}">A hackathon application portal with blind review.</text>

  <text x="88" y="586" font-family="JetBrains Mono, monospace" font-size="15"
        fill="#71717a" letter-spacing="1.6">LEGALLY DISTINCT</text>
</svg>
`

async function main() {
  const og1200 = await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toBuffer()
  writeFileSync('public/og.png', og1200)

  const icon = await sharp(readFileSync(FAVICON))
    .resize(180, 180)
    .png({ compressionLevel: 9 })
    .toBuffer()
  writeFileSync('public/apple-touch-icon.png', icon)

  console.log(`wrote public/og.png (${(og1200.length / 1024).toFixed(1)} kB)`)
  console.log(`wrote public/apple-touch-icon.png (${(icon.length / 1024).toFixed(1)} kB)`)
}

await main()
