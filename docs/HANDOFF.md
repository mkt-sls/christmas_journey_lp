# Handoff — Christmas Journey LP (2026-11-23, updated 2026-11-26)

This file replaces the 2026-11-20 handoff. Older history: `git log`, `docs/PLAN.md`, `data/ISSUES.md`.

## Where things stand
- Repo: https://github.com/mkt-sls/christmas_journey_lp, branch `main`. Every push to `main` deploys GitHub Pages
  (`.github/workflows/pages.yml`).
- Live: https://mkt-sls.github.io/christmas_journey_lp/
- Last code commit covered by this handoff: `6fe54f0` (2026-11-23). This update comes in the commit after it. Check that it is pushed and that the Pages run is green: `git log origin/main -1`, `gh run list -L 1`.
- Sources:
  - Copy sheet `1sepZEdNocfKZ6jvqroIgmZRAD2bxS3GSCdxIH89ynr0`. It is public; read each tab with `/export?format=csv&gid=<gid>`.
  - Links sheet `1qpxJhrKTPyaUyGmJRrwPQNbh4T8s7458HJCCi2QwiTo`, tab JP gid 0. It is **private on purpose** (owner 2026-11-23; the public 401 is intended, nobody re-shares it). Check it in the owner's logged-in Chrome (Claude in Chrome): fetch `gviz/tq?tqx=out:html&gid=0` in a docs.google.com tab, parse with a trustedTypes policy for DOMParser, hash each row and compare with `data/source/links-sheet.txt` (2026-11-23: identical). The Drive connector cannot see the file.
  - Figma `2MyylxdZblfGnf05nQacUz`, node 156:1930. The sheet wins over Figma for text.
- QA: `?date=2026-12-07&market=DE` forces the date and the market. Tests: `npm test`, `npm run build`. `?date=` works in dev/Pages only, never in ChristmasJourney.zip (built with VITE_CLIENT=1).

## Working with the owner
- Reply in Romanian, short and explicit. Explain in plain words with a concrete example from this page, and say what was
  measured and what was reasoned.
- Never assume. Ask, or verify by reading the code or the data.
- Every change waits for the owner's "start". Push needs its own word ("start cu push" = start and push).
- Show before/after screenshots when a visual choice is needed. The owner decides from pictures.
- Responsive means fill: layouts scale up to fill the width and height, never leaving empty bands.
- The owner is impatient with long option lists. Recommend one option and say why.

## Shipped 2026-11-23 (all live)
The 2026-11-19 / 11-20 table is in git history: `git show 93dd51c:docs/HANDOFF.md`.

| Commit | What |
|---|---|
| `1085537`, `196dc09` | `check-texts` ignores today's label card over today's invisible gift hit-area (1366: 90 -> 0, NL 360: 7 -> 0); nothing visible |
| `b25df2a` | `check-label-centre --ended` covers the campaign-ended state (Dec 28). Owner-pinned labels are reported as expected. Slots 1-2 are not position-checked; `check-santa` covers Santa |
| `4fa4030` | FR_CA keeps the client's French: FR_CA tab > French EN_CAD tab > `data/source/fr-ca-french.json`. `buildFrCa` removed. Refresh the frozen file by hand when the import logs "IT DIFFERS" |
| `651c402` | RO_MDL tab numbers are information only (the page uses the links-sheet MDL values) |
| `c8815c1` | One translation per duplicated UI text (`UI_DUP_PICKS`); `processing`, `gifts_collected`, `next_gift` are not rendered by the page |
| `fd44322` | Links sheet stays private on purpose |
| `86d5ccf` | Timer row settled: the page's only timer is the "Unlocks in" chip on tomorrow's gift |
| `7ae2ace` | Step 3 text final (no tracker); handoff uses real commit hashes |
| `33e413b` | Login target confirmed (later superseded by `8811313`) |
| `8811313` | Header Login button removed on every market (owner 2026-11-23); `loginLinkFor`, its test and `.btn-outline` CSS gone; the `login` keys in `data/ui/*.json` stay unused |
| `c45c694` | T&C: card "Full terms & conditions" and legal line "Full campaign terms apply" both open https://jack-pot-uk.top/bonus-policy in a new tab on every market; `data/ISSUES.md` open count 0 |
| `10fd2c1` | `scripts/package.mjs` builds the client delivery `ChristmasJourney.zip` (gitignored) in the `JacPot_TEMPLATE.zip` layout |
| `39cd462`, `c83910b` | Client zip ignores `?date=` (VITE_CLIENT build, the reader is compiled out); `package.mjs` fails if it comes back; image.jpg uses the Playwright clock |
| `cf4d094` | Internal notes stay out of the client zip; `package.mjs` fails on any unexpected file type |
| `6012269` | Per-day deposit links and promo codes are obfuscated in the bundle (`src/obfuscate.js`); `package.mjs` fails on plaintext |
| `6b5b580` | DE: space after `·` in the hero eyebrow (import override) |
| `1ae0a47` | BeGambleAware removed everywhere (owner 2026-11-23) |
| `777a0e5` | Mobile: logo centred in the header (owner 2026-11-23) |
| `6fe54f0` | Smaller market selector button; styled scrollbars (owner 2026-11-23) |
| 2026-11-26 | Garland fix: today's light garland redraws whenever its card changes size (`drawGarlands`, ResizeObserver). Before, a page loaded in a narrow window and then widened kept two long green wires below the card (owner report). New check `scripts/check-garland.mjs` (narrow load then widen, desktop <-> mobile; old code: 3 FAIL, new: 21/21 PASS) |

## Owner decisions to remember
- Minimum headline font is 26px in all markets. The TR currency split is OK.
- FR_CA uses the CLIENT's French (EN_CAD tab, "vous", no FR_CA tab). EN_CAD stays English from a frozen snapshot
  (`data/source/en-cad-english.json`). Agency fixes on FR_CA only: the deadline row "Valide jusqu’au : 23 h 59, 1er déc."
  laid out label|value; Xmas; "1 000 CAD"; "1er"; the route tag "1ER DÉC.".
- RO_MDL: the page uses the MDL amounts from the links sheet (for example day 1 max 7000 / min 500). The RO_MDL tab numbers are unused.
- NO TRACKER on the page (owner 2026-11-23): no credited state. The step-3 agency text is final. Never ask the client about it again.
- The links sheet is private on purpose (owner 2026-11-23).
- The Google Sheet is never edited by us. Fixes are import overrides in `scripts/import-sheet.mjs`.
- T&C links: both `terms` and `campaignTerms` = https://jack-pot-uk.top/bonus-policy on every market (owner 2026-11-23; the site picks the language).
- T&C opens in a new tab (owner 2026-11-23); the deposit button stays in the same tab. BeGambleAware removed everywhere, owner 2026-11-23 (link, text and the `be_gamble_aware` key; import-sheet drops it).
- Header Login button removed (owner 2026-11-23).
- Delivery to the client = `ChristmasJourney.zip` in the layout of `JacPot_TEMPLATE.zip` (repo root, untracked, never commit it): files at the zip root, `status.json` = `{ "available": "true" }`, `image.jpg` = 1920x930 desktop screenshot of EN_GBP on 5 December (not referenced by the page; preview image for the client's platform - our reading, not confirmed by the client). The owner approved the 2026-11-23 image.jpg as is (a ~15px scrollbar strip on the right and the step cards cut at the bottom are accepted). Rebuild with `node scripts/package.mjs` after any page change and hand the new zip over.
- `data/ISSUES.md` is the list of questions for the client.

## Open
Nothing open for the client.
- Known check limit: `check-label-centre --ended` does not position-check past slots 1-2.
- Found 2026-11-26, not fixed (owner not asked yet): on 26 December, resizing from desktop to mobile width throws
  `TypeError ... is not iterable` in `spot` (`src/render/route.js`, via `santaAngle` in `fitStage`). The resize handler runs
  `fitStage` with the old desktop Santa slot before the media-query change re-renders the page. It already happened before
  the garland fix. The page re-renders right after, so the visible effect is probably nil; not measured.
- Nothing open for the owner either. Next likely step: hand `ChristmasJourney.zip` to the client (owner does it).
- 2026-11-26: zip rebuilt from `6fe54f0` on macOS (918388 bytes; `npm test` 68/68; `?date=` check ok). Root layout matches
  the template (index.html, status.json, image.jpg + favicons and assets). The new image.jpg has no scrollbar strip.
- Hero subtitle stays exactly as the client wrote it in the sheet, in every language, with no override (owner 2026-11-26).
  EN and RU use an em dash, DE and BG an en dash, the others a colon or a full stop. Never ask about it again.

## Rules for every check run (learned the hard way)
- After any route or Santa change, run `scripts/check-santa.mjs`. Eyeballing missed bugs three times.
- After any change to today's label card or its garland, run `scripts/check-garland.mjs`.
- Before each browser run, check that free RAM is at least 2 GB. Run ONE width per process, never in parallel.
  Figma, After Effects and Edge in the background ate 4-9 GB and killed sweeps.
- Never re-run `scripts/import-sheet.mjs` without reading its header. Since 2026-11-20 it detects the French EN_CAD tab.
  Check `git diff data/` after any import: it must be empty unless the client changed something.
- Python never reads stdin from a terminal it does not have: use `</dev/null`.
- If Orca is not installed on this PC, work directly but keep the same start/push discipline.
- `package.mjs` on macOS: Playwright is not a project dependency. Install it outside the repo (for example in a scratch
  folder) and run `PLAYWRIGHT_MODULE=<dir>/node_modules/playwright/index.mjs CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/package.mjs`.
