# Handoff — Christmas Journey LP (2026-11-23)

This file replaces the 2026-11-20 handoff. Older history: `git log`, `docs/PLAN.md`, `data/ISSUES.md`.

## Where things stand
- Repo: https://github.com/mkt-sls/christmas_journey_lp, branch `main`. Every push to `main` deploys GitHub Pages
  (`.github/workflows/pages.yml`).
- Live: https://mkt-sls.github.io/christmas_journey_lp/
- Last pushed commit before this handoff: `7ae2ace`. The handoff file comes in the commit after it. Check that it is pushed and that the Pages run is green: `git log origin/main -1`, `gh run list -L 1`.
- Sources:
  - Copy sheet `1sepZEdNocfKZ6jvqroIgmZRAD2bxS3GSCdxIH89ynr0`. It is public; read each tab with `/export?format=csv&gid=<gid>`.
  - Links sheet `1qpxJhrKTPyaUyGmJRrwPQNbh4T8s7458HJCCi2QwiTo`, tab JP gid 0. It is **private on purpose** (owner 2026-11-23; the public 401 is intended, nobody re-shares it). Check it in the owner's logged-in Chrome (Claude in Chrome): fetch `gviz/tq?tqx=out:html&gid=0` in a docs.google.com tab, parse with a trustedTypes policy for DOMParser, hash each row and compare with `data/source/links-sheet.txt` (2026-11-23: identical). The Drive connector cannot see the file.
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
- Header Login button removed (owner 2026-11-23).
- `data/ISSUES.md` is the list of questions for the client.

## Open
Nothing open for the client.
- Known check limit: `check-label-centre --ended` does not position-check past slots 1-2.

## Rules for every check run (learned the hard way)
- After any route or Santa change, run `scripts/check-santa.mjs`. Eyeballing missed bugs three times.
- Before each browser run, check that free RAM is at least 2 GB. Run ONE width per process, never in parallel.
  Figma, After Effects and Edge in the background ate 4-9 GB and killed sweeps.
- Never re-run `scripts/import-sheet.mjs` without reading its header. Since 2026-11-20 it detects the French EN_CAD tab.
  Check `git diff data/` after any import: it must be empty unless the client changed something.
- Python never reads stdin from a terminal it does not have: use `</dev/null`.
- If Orca is not installed on this PC, work directly but keep the same start/push discipline.
