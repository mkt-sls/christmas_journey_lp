# Handoff — Christmas Journey LP (2026-11-17)

## Where things stand
- Repo: https://github.com/mkt-sls/christmas_journey_lp, public, branch `main`.
- Live: https://mkt-sls.github.io/christmas_journey_lp/
  - Every push to `main` republishes the site through `.github/workflows/pages.yml`.
- Last commit before this handoff: `f71db4b`. Everything was pushed and nothing is open locally.
- Sources:
  - Figma file `2MyylxdZblfGnf05nQacUz`, page "Christmas Journey LP" (node 156:1930).
  - Google Sheet `1sepZEdNocfKZ6jvqroIgmZRAD2bxS3GSCdxIH89ynr0`.
- The full plan with every owner decision is in `docs/PLAN.md`.

## Working with the owner
- Reply in Romanian, short and explicit, always.
- The master session does nothing itself. It delegates to Orca workers.
- Every write task waits for "start" from the owner. Push and deploy each need their own word.

## Done
| Commit | What |
|---|---|
| `7eb9729` | Assets exported from Figma (`public/assets/`, manifest in `public/assets/README.md`) |
| `46cb83e` | Vite + import from the sheet. `scripts/extract-sheet.mjs <dump>`, then `scripts/import-sheet.mjs`, which writes `data/` |
| `444926b` | Page: 3 states (missed / active / locked), card modal (desktop) / bottom sheet (mobile), 15 markets with auto-detection from the browser language, "TODAY" pill as translated text |
| `0a1eeaa` | Animations, first responsive pass, new step-3 text: "Deposit before 23:59 to claim the day's bonus.", in 12 languages |
| `f71db4b` | GitHub Pages deploy |

QA: `?date=2026-12-07&market=DE` forces the date and the market.
Tests: `npm test` (52 pass) and `npm run build`.

## NEXT: task 5. Waiting on 2 owner answers, then "start 5"
The owner's notes on the live site, from a screenshot of a ~2576px wide monitor taken before the campaign:

1. **Santa must always sit on the dotted line.** Right now he floats top-left, above the route.
   Proposal, still to be confirmed by the owner:
   - during the campaign: on the line just before today's gift;
   - before 1 Dec: at the start of the line;
   - after 26 Dec: at the end of the line.
2. **The page must adapt to every width.**
   - Problems at 2576px: the route stretches across the full width, and the logo crown is cut off at the top.
   - Widths to check: 320, 360, 390, 430, 768, 1024, 1280, 1366, 1440, 1680, 1920, 2560, 3440.
   - Above 1920 the content stays centred at 1920. Only the background extends.
3. **Countdown.** Before the campaign it reads "Unlocks in 317:52:20" (317 hours). Owner options:
   - (a) more than 24h left: show "Opens 1 December", and HH:MM:SS only in the last 24h. **This is the recommended option.**
   - (b) "13d 05:52:20".
4. **Earlier note.** On mobile after the campaign, Santa sits between days 25 and 26 instead of at the end. Point 1 covers this.

Questions for the owner: is the Santa placement right? Countdown (a) or (b)? Then "start 5".

## Open with the client (all in `data/ISSUES.md`)
- Real URLs for deposit, login and T&C. They are placeholder `#` in `src/config.js` for now. **Do not send the link to players until these are in.**
- RO_MDL amounts look copied from GBP (10 days).
- Verification of the FR_CA cards (our translation from EN_CAD) and of the 12 step-3 translations.
- `campaign_ended` text: an EN placeholder in every language.
- "XMas" vs "Xmas" spelling.

## Traps
- A Bash heredoc broke once on a long spec. Write spec files with the Write tool.
- The sheet changes on the client's side. To refresh the data: download the sheet again (Google Drive MCP), run `extract-sheet`, then `import-sheet`. The text overrides (step 3, fixes) live in `import-sheet.mjs`.
- The data JSON is bundled into the JS by Vite. There are no separate data files in `dist/`.
- The preview browser renders animations at 1–2 fps. Smooth motion has to be checked by a human on the live site.
