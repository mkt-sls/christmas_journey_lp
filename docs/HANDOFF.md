# Handoff — Christmas Journey LP (2026-11-20)

This file replaces the 2026-11-17 handoff. Older history: `git log`, `docs/PLAN.md`, `data/ISSUES.md`.

## Where things stand
- Repo: https://github.com/mkt-sls/christmas_journey_lp, branch `main`. Every push to `main` deploys GitHub Pages
  (`.github/workflows/pages.yml`).
- Live: https://mkt-sls.github.io/christmas_journey_lp/
- Last code commit: `fec58a7` (Pages run 44766999480 green). This handoff file comes in the commit after it. Check that it is pushed and that the Pages run is green: `git log origin/main -1`, `gh run list -L 1`.
- Sources:
  - Copy sheet `1sepZEdNocfKZ6jvqroIgmZRAD2bxS3GSCdxIH89ynr0`. It is public; read each tab with `/export?format=csv&gid=<gid>`.
  - Links sheet `1qpxJhrKTPyaUyGmJRrwPQNbh4T8s7458HJCCi2QwiTo`, tab JP gid 0. It returns **401 since 2026-11-20**, so the client must re-share it.
  - Figma `2MyylxdZblfGnf05nQacUz`, node 156:1930. The sheet wins over Figma for text.
- QA: `?date=2026-12-07&market=DE` forces the date and the market. Tests: `npm test`, `npm run build`.

## Working with the owner
- Reply in Romanian, short and explicit. Explain in plain words with a concrete example from this page, and say what was
  measured and what was reasoned.
- Never assume. Ask, or verify by reading the code or the data.
- Every change waits for the owner's "start". Push needs its own word ("start cu push" = start and push).
- Show before/after screenshots when a visual choice is needed. The owner decides from pictures.
- Responsive means fill: layouts scale up to fill the width and height, never leaving empty bands.
- The owner is impatient with long option lists. Recommend one option and say why.

## Shipped 2026-11-19 / 11-20 (all live)
| Commit | What |
|---|---|
| `a14ec67`, `1a97c1f` | Card headline fits on at most 2 balanced lines; minimum 26px in every market; TR may break before the currency |
| `c42d464` | `scripts/check-texts.mjs` checks every visible text (flags: `--mobile` phone emulation, `--ended`) |
| `38af0f5` | Mobile: today's label centred vertically on today's gift (`scripts/check-label-centre.mjs`) |
| `ee9033f` | The page no longer jumps when the card overlay opens or closes (`scrollbar-gutter: stable`, `scripts/check-overlay-jump.mjs`) |
| `5ec1c40` | Mobile: the other route labels are centred on their gifts too. Owner decisions for Santa clearance: the past slot-0 label is raised 4 stage px; the past slot-1 label (when today is in slot 2) and the past slot-2 label (after the campaign) stay at the old top-pinned position |
| `c73ad50` | The header Login goes to TODAY's day link with the day's promo code (`loginLinkFor` in `src/config.js`). Before 1 Dec it uses day 1, after 26 Dec it uses day 26 |
| `6b5db5c` | FR_CA agency wording (since superseded by the commit below) |
| `01b9eab` | `campaign_ended` translated by the agency into the 11 non-EN languages (`CAMPAIGN_ENDED` in `scripts/import-sheet.mjs`); "Sweet Bonanza Xmas" in every market (owner: Xmas is correct) |
| `fec58a7` | FR_CA = the client French from the EN_CAD tab. EN_CAD English is frozen in `data/source/en-cad-english.json`. The import detects the French tab, and re-import is proven idempotent. `data/ISSUES.md` updated (20 open points) |

## Owner decisions to remember
- Minimum headline font is 26px in all markets. The TR currency split is OK.
- FR_CA uses the CLIENT's French. The client put it in the **EN_CAD tab**, with "vous" and no FR_CA tab. EN_CAD stays English
  from a frozen snapshot. Agency fixes on FR_CA only:
  - the deadline row "Valide jusqu’au : 23 h 59, 1er déc.", laid out label|value like EN_CAD;
  - Xmas; "1 000 CAD"; "1er"; the route tag "1ER DÉC.".
- RO_MDL: the page uses the MDL amounts from the links sheet (for example day 1 max 7000 / min 500). The RO_MDL tab still has GBP-sized
  max numbers labelled MDL, which were reported to the client.
- T&C links (`terms`, `campaignTerms` in `src/config.js`) stay `#`. The owner said "later", so do not raise them until the owner does.
- `data/ISSUES.md` is the list of questions for the client.

## Open
1. **Client:** re-share the links sheet; T&C URLs (later); confirm the RO_MDL max values; the duplicate
   UI strings (NL, IT, TR, RU, BG); the empty timer row; checking the step-3 agency texts.
2. Resolved 2026-11-23 by the check-texts exemption, commit 1085537: today's label card over today's invisible gift hit-area; nothing visible; the investigation found 90 hits at 1366 (not 30) and 7 for NL at 360.
3. `check-label-centre` covers the campaign-ended state: covered since 2026-11-23 (`--ended`), this commit. The owner-pinned labels (past slot 1 and 2 top-pinned, past slot 0 raised 4 stage px, commit 5ec1c40) are reported as expected, not failures. The Santa check for Dec 28 covers Santa.
4. Owner decision 2026-11-23, this commit: the Google Sheet is NOT changed. FR_CA always keeps the client's French: source order FR_CA tab (optional) > French EN_CAD tab > frozen copy `data/source/fr-ca-french.json`; `buildFrCa` (agency tu-form) is removed. The frozen file is refreshed by hand when the import logs "IT DIFFERS".

## Rules for every check run (learned the hard way)
- After any route or Santa change, run `scripts/check-santa.mjs`. Eyeballing missed bugs three times.
- Before each browser run, check that free RAM is at least 2 GB. Run ONE width per process, never in parallel.
  Figma, After Effects and Edge in the background ate 4-9 GB and killed sweeps.
- Never re-run `scripts/import-sheet.mjs` without reading its header. Since 2026-11-20 it detects the French EN_CAD tab.
  Check `git diff data/` after any import: it must be empty unless the client changed something.
- Python never reads stdin from a terminal it does not have: use `</dev/null`.
- If Orca is not installed on this PC, work directly but keep the same start/push discipline.
