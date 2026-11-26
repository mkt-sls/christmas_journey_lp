# Handoff — Christmas Journey LP (2026-11-23, updated 2026-11-26)

This file replaces the 2026-11-20 handoff. Older history: `git log`, `docs/PLAN.md`, `data/ISSUES.md`.

## Where things stand
- Repo: https://github.com/mkt-sls/christmas_journey_lp, branch `main`. Every push to `main` deploys GitHub Pages
  (`.github/workflows/pages.yml`).
- Live: https://mkt-sls.github.io/christmas_journey_lp/
- Last code commit covered by this handoff: `cf25fb1` (2026-11-26, Poland + PLN compare). This update comes in the commit after it. Check that it is pushed and that the Pages run is green: `git log origin/main -1`, `gh run list -L 1`.
- Sources:
  - Copy sheet `1sepZEdNocfKZ6jvqroIgmZRAD2bxS3GSCdxIH89ynr0`. It is public; read each tab with `/export?format=csv&gid=<gid>`.
  - Links sheet `1qpxJhrKTPyaUyGmJRrwPQNbh4T8s7458HJCCi2QwiTo`, tab JP gid 0. It is **private on purpose** (owner 2026-11-23; the public 401 is intended, nobody re-shares it). Check it in the owner's logged-in Chrome (Claude in Chrome): fetch `gviz/tq?tqx=out:html&gid=0` in a docs.google.com tab, parse with a trustedTypes policy for DOMParser, hash each row and compare with `data/source/links-sheet.txt` (2026-11-23: identical). The Drive connector cannot see the file.
  - Figma `2MyylxdZblfGnf05nQacUz`, node 156:1930. The sheet wins over Figma for text.
  - Copy sheet tab PL = gid 1526370949 (added by the client by 2026-11-26). The links sheet has a PLN column (R) since then.
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
| 2026-11-26 | Resize fix: `fitStage` fits the layout the page was rendered with (`.page[data-layout]`), not the current media query. Crossing 1024px fires `resize` before the re-render, and on Dec 25-26 the desktop Santa slot (3-4) was looked up in the mobile table (0-2): `TypeError ... is not iterable` in `santaAngle`. `check-garland.mjs` now FAILs on any page error and takes `--dates all` (old code: 2 FAIL, new: 87/87 PASS) |
| `4703050` | Poland (PL, PLN) added: client's PL tab + `plClientFixes()`, agency `PL_UI`, pl-PL dates, `pl.svg`, "pl" browsers -> PL. Checks on PL: `check-texts` 320/390/1366 0 failures, `check-headline` ALL PASS, `check-label-centre` 360 = EN_GBP |
| `b8eb5c2` | Owner decisions on PL: same games as every market, the PL interface is ours, same links as every geo |
| `cf25fb1` | `import-links.mjs` parses the links sheet's PLN column (1560 values, 0 differences); PLN point closed; links-diff header fixed (it printed the template text) |

## Owner decisions to remember
- **Poland (PL, PLN) added (owner 2026-11-26: "adaugam polonia limba si currency, tradu tu").** Cards = the client's PL tab (gid
  1526370949, added to `data/source/sheet.json` by hand from the public CSV export; 3 columns, no "credited" column) plus the
  fixes of `plClientFixes()` in `scripts/import-sheet.mjs`: game line "na <game>" from EN_GBP (the tab has none), "DARMOWE SPINY"
  after 2/3/4, colons in the term rows (label | value layout) and "gru.", locked-card day (the tab wrote the next day). The UI
  ELEMENT tab has no PL column: interface + 26 location names are the agency's (`PL_UI`; "DZISIEJSZY POSTÓJ", not "PRZYSTANEK",
  which filled the label edge to edge at 390/320). PLN amounts: the links sheet got a PLN column (R) by 2026-11-26; read live
  that day, all 26 days match the PL tab, and `import-links.mjs` now compares PLN like every other currency. A "pl" browser gets PL.
  Owner 2026-11-26, settled: the PL games are the same as every market (the EN_GBP game line stays); the PL interface is ours
  (not asked of the client); PL uses the same deposit links and promo codes as every geo. Still open in `data/ISSUES.md` (3):
  locked-card day, spins grammar, term-row colons (all three already fixed on the page by the import).
- Minimum headline font is 26px in all markets. The TR currency split is OK.
- FR_CA uses the CLIENT's French (EN_CAD tab, "vous", no FR_CA tab). EN_CAD stays English from a frozen snapshot
  (`data/source/en-cad-english.json`). Agency fixes on FR_CA only: the deadline row "Valide jusqu’au : 23 h 59, 1er déc."
  laid out label|value; Xmas; "1 000 CAD"; "1er"; the route tag "1ER DÉC.".
- **Moldova (RO_MDL) is switched off (owner 2026-11-26), and it is not in the client zip.** It is gone from the selector, and
  `?market=RO_MDL` or a saved RO_MDL choice is ignored. A "ro" browser falls back to EN_GBP, like any language without a
  market. The data stays in the repo (`data/cards/RO_MDL.json`, `data/ui/RO_MD.json`, `data/disabled/flags/md.svg`).
  `package.mjs` fails if MDL, Moldova or the md flag reach the build. To switch it back on, follow the comment at
  `DISABLED_MARKETS` in `scripts/import-sheet.mjs`.
- RO_MDL (while it was on): the page used the MDL amounts from the links sheet (for example day 1 max 7000 / min 500). The RO_MDL tab numbers are unused.
- NO TRACKER on the page (owner 2026-11-23): no credited state. The step-3 agency text is final. Never ask the client about it again.
- The links sheet is private on purpose (owner 2026-11-23).
- The Google Sheet is never edited by us. Fixes are import overrides in `scripts/import-sheet.mjs`.
- T&C links: both `terms` and `campaignTerms` = https://jack-pot-uk.top/bonus-policy on every market (owner 2026-11-23; the site picks the language).
- T&C opens in a new tab (owner 2026-11-23); the deposit button stays in the same tab. BeGambleAware removed everywhere, owner 2026-11-23 (link, text and the `be_gamble_aware` key; import-sheet drops it).
- Header Login button removed (owner 2026-11-23).
- Delivery to the client = `ChristmasJourney.zip` in the layout of `JacPot_TEMPLATE.zip` (repo root, untracked, never commit it): files at the zip root, `status.json` = `{ "available": "true" }`, `image.jpg` = 1920x930 desktop screenshot of EN_GBP on 5 December (not referenced by the page; preview image for the client's platform - our reading, not confirmed by the client). The owner approved the 2026-11-23 image.jpg as is (a ~15px scrollbar strip on the right and the step cards cut at the bottom are accepted). Rebuild with `node scripts/package.mjs` after any page change and hand the new zip over.
- `data/ISSUES.md` is the list of questions for the client.

## Open
- For the client: the 3 open PL points in `data/ISSUES.md` (locked-card day, spins grammar, term-row colons; fixed on the page already).
- `data/source/links-sheet.txt` (2026-11-26) = the 2026-11-23 copy plus the PLN column read live; every column the import uses was
  compared live that day (amounts of all currencies, promo codes, deposit links, games, wager): identical, and a SHA-256 hash of
  every row (header + 26 days) equals the live sheet. Below the table the sheet has a min-deposit conversion helper (EUR 22/25/28/
  30/35 per currency, PLN 100/110/125/135/155); the import ignores it (it reads only "<n> December" rows).
- Known, not PL-specific: `check-texts --mobile --ended` at 320px flags the route dot 2.1px over the campaign-ended text in every market (EN_GBP, DE, PL alike); 360 and 390 pass.
- Known check limit: `check-label-centre --ended` does not position-check past slots 1-2.
- Nothing open for the owner. Next step: hand `ChristmasJourney.zip` to the client with the 3 PL points of `data/ISSUES.md` (owner does it).
- 2026-11-26: zip rebuilt with Poland (915895 bytes, 15 markets; `npm test` 72/72; `?date=` and MDL checks ok). Root layout matches
  the template (index.html, status.json, image.jpg + favicons and assets). image.jpg is still EN_GBP on 5 December.
- Lesson 2026-11-26: the links sheet changed (PLN column) after our 2026-11-23 copy, and the owner was told "no PLN column" from the
  old copy. Before stating what a sheet has or lacks, read it LIVE (copy sheet: public CSV; links sheet: owner's Chrome/Edge).
- Hero subtitle stays exactly as the client wrote it in the sheet, in every language, with no override (owner 2026-11-26).
  EN and RU use an em dash, DE and BG an en dash, the others a colon or a full stop. Never ask about it again.

## Rules for every check run (learned the hard way)
- After any route or Santa change, run `scripts/check-santa.mjs`. Eyeballing missed bugs three times.
- After any change to today's label card, its garland or the resize path (`fitStage`), run `scripts/check-garland.mjs --dates all`.
- Before each browser run, check that free RAM is at least 2 GB. Run ONE width per process, never in parallel.
  Figma, After Effects and Edge in the background ate 4-9 GB and killed sweeps.
- Never re-run `scripts/import-sheet.mjs` without reading its header. Since 2026-11-20 it detects the French EN_CAD tab.
  Check `git diff data/` after any import: it must be empty unless the client changed something.
- Python never reads stdin from a terminal it does not have: use `</dev/null`.
- If Orca is not installed on this PC, work directly but keep the same start/push discipline.
- `package.mjs` on macOS: Playwright is not a project dependency. Install it outside the repo (for example in a scratch
  folder) and run `PLAYWRIGHT_MODULE=<dir>/node_modules/playwright/index.mjs CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/package.mjs`.
