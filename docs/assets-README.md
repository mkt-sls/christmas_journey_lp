# LP assets (exported from Figma)

Source: Figma file `2MyylxdZblfGnf05nQacUz` (UK Desktop 1920 / Mobile 390 + UI kit). Exported read-only; the owner confirmed the art is final.
Raster = WebP @2x (lossy, with alpha where noted). Vectors = SVG.

| file | figma node id | size px | format | notes |
|---|---|---|---|---|
| landscape-desktop@2x.webp | 156:2313 (Placeholder · Landscape) | 3840x1080 (1920x540 @2x) | WebP q72, opaque | Village art, already blurred/darkened in Figma. In the Main frame the instance is 1920x564 (156:2456); the symbol is 540 high, so scale/cover to 564. ~33 KB |
| landscape-mobile@2x.webp | 156:2371 (UK · image) | 780x1526 (390x763 @2x) | WebP q74, opaque | Mobile village background incl. the baked "Bottom fade". ~8 KB |
| hero-santa-desktop@2x.webp | 156:2376 (Desk 220) | 440x327 | WebP q88, alpha | Santa cut-out from the Figma source image (4096px PNG with alpha), resized. Node is a 220x220 box; image is 220 wide, aspect 4096:3044 |
| hero-santa-mobile@2x.webp | 156:2378 (Mob 163) | 326x242 | WebP q88, alpha | Same source, 163 wide |
| gift-locked@2x.webp | 156:2008 | 268x274 (120x126 @2x + glow bleed) | WebP q90, alpha | Navy pedestal + lock badge |
| gift-today@2x.webp | 156:2035 minus layer 156:2060 | 629x659 (170x178 box, see below) | WebP q90, alpha | Gold pedestal + red gift + pulse ring + beam, **without** the TODAY tag (the page draws it as HTML text, UI key `today`). Rebuilt from the clean per-layer Figma SVGs (pulse ring 156:2036, podium 156:2037, beam 156:2042 as a blurred gradient, gift icon 156:2043), rasterised and composited with sharp at 3.7x (= 2x of the 1.85x desktop display size), true alpha. Box in the 120x126 gift node coordinates: left -25, top -40, 170x178. T5h: the wide static ring that layer 156:2036 had baked in around the podium base was removed (harmonic fill of a 32px band around its fitted ellipse, centre 314,473 rx 274 ry 129): the animated CSS ring (anim.css .gift--active::before) is the pulse now, starting on the top-face ellipse |
| gift-today-present@2x.webp | cut from gift-today@2x.webp | 236x213 | WebP lossless, alpha | Only the opaque pixels of the red present (convex hull of its red + white pixels, grown 2px), cropped at (197,198) of the 629x659 art. Drawn over the art above the pulse ring so the ring passes behind the present (components.css .gift__front) |
| gift-expired@2x.webp | 156:2062 | 268x274 | WebP q90, alpha | Grey pedestal + ✕ badge |
| card-illustration@2x.webp | 156:2160 (image in "Art · gift opening" 156:2108) | 840x624 (420x313 @2x) | WebP q88, alpha (keyed) | Gift + orbit ring + crystal + ornament + chest + candy. Source art is opaque on dark purple; backdrop was keyed to alpha by luminance. Placed in Figma at x=-2,y=-15, 420x313, cropped by the 416x190 header |
| logo-jackpot.svg | 156:2432 (logo jp) | 106x52 | SVG | Crown (Group 107) + JACKPOT wordmark, both vector, composed at their Figma offsets |
| route-desktop.svg | 156:2461 | 2110x140 | SVG | Full route, 2080x110 + shadow bleed. Figma position x=-80,y=361 in Route map frame |
| route-desktop-travelled.svg | 156:2462 | see file | SVG | "Route · travelled" overlay (first half, 1040 wide) |
| route-mobile.svg | 156:2809 | 181x630 | SVG | Figma position x=90,y=-21 in Route map frame |
| route-mobile-travelled.svg | 156:2810 | see file | SVG | Travelled overlay |
| route-desktop-gold.svg / route-mobile-gold.svg | derived from route-desktop.svg / route-mobile.svg (task 3) | same as source | SVG | Full route with the travelled colour (#FFD14D, stroke 7 / 6). The page clips it up to the today slot, so the travelled part can end at any slot (the Figma travelled overlays only cover the first half). The gold glow is added in CSS |
| snow-cap.svg | 156:2536 (desktop today card, 253x29) | 259x29 | SVG | Stretchable; smaller variants exist at 156:2474 (126x20), 156:2815 (mobile 132x20), 156:2858 (139x20), bonus card 156:2185 (420x22) |
| holly.svg | 156:2538 (desktop today card, 52x39) | 52x39 | SVG | Smaller variants 156:2476 (32x24), 156:2817 (28x21) – scale this one |
| flags/*.svg | not in Figma (only an AU flag, 156:2435) | 4:3 | SVG | gb au us ca de bg nl it ru tr dk se no pl (md moved to `data/disabled/flags/` 2026-11-26, pl added 2026-11-26). FR-CA uses `ca.svg`. See license |

## Garland (CSS, not exported)
Node 156:2508 (desktop) / 156:2834 (mobile). 269x175 rounded wire (stroke #14301F), 26 bulbs of 9px (4.5 radius, white 60% ring), repeating order red, gold, green, blue:
- #FF4D5E (red), #FFD66B (gold), #4ADE80 (green), #5EC4FF (blue). Bulb list starts at the left edge top: red, gold, green, blue.

## Flags license
`flags/` come from the npm package **flag-icons 7.6.0**, MIT license (copy in `flags/LICENSE-flag-icons.txt`). Figma holds only a tiny AU flag (22x11), so flags/au.svg is also from flag-icons.

## Problems / flags
- **No true placeholders:** the nodes are named "Placeholder · Landscape/Hero" and "UK · image" but contain real art (village photo, Santa). Exported as final per owner.
- **gift-today no longer has the TODAY tag** (re-exported in task 3, see table). The other two gifts are still the pseudo-2x versions described below.
- **Gifts: pseudo-2x.** The Figma tool returns an opaque (background-baked) @2x and a transparent @1x only. Colours come from the @2x, alpha from the @1x upscaled; soft glows are slightly weaker and edges slightly soft. Re-export from Figma desktop (transparent @2x) if sharper edges are needed.
- **card-illustration:** transparency is keyed from a dark background, so very dark glow fringes are slightly lost; looks right on dark card backgrounds only.
- Landscape/mobile backgrounds are opaque.
- Full-node SVG exports include a dark canvas rect; the files here use the clean per-layer vectors instead.
