# Christmas Journey LP: implementation plan

## Context
The owner wants the "Christmas Journey" landing page for the Jackpot brand. It goes in repo
`mkt-sls/christmas_journey_lp`, which is public and cloned at `D:\.claude\JP\christmas_journey_lp`. Right now it holds
only a README (commit c2ad55b).
- Design: Figma file `2MyylxdZblfGnf05nQacUz`, page "Christmas Journey LP" (156:1930).
- Copy: Google Sheet `1sepZEdNocfKZ6jvqroIgmZRAD2bxS3GSCdxIH89ynr0` ("Перевод Лендинга JP"). It has 14 market tabs with
  26 daily cards each, plus "UI ELEMENT" with 13 languages.
- A full dump of the sheet is already on disk:
  (local copy of the sheet dump)

How the page works: there is one gift per day in December. A map shows a route with Santa, and every day is a location with a
bonus card.

## Owner decisions (2026-11-17)
| Topic | Decision |
|---|---|
| Platform | Standalone static page: Vite + vanilla JS, deployed to GitHub Pages via GitHub Actions |
| Day states | Only 3 states: **missed** (past), **active** (today), **locked** (future). There is no Collected, no "Bonus credited" and no "Processing", because we can't track who claimed what |
| Days | **26** (1–26 Dec 2026), from the sheet |
| Clock | The visitor's local time (browser). The day switches at local midnight and "Valid until 23:59" is local |
| Before 1 Dec | Everything locked, with a countdown to day 1 |
| After 26 Dec | Everything expired, plus a "campaign ended" message. This text is an EN placeholder in all languages until the client supplies translations |
| Markets | All 14 markets, plus FR_CA (15), with a market selector in the header. Update 2026-11-26: RO_MDL switched off, PL (PLN) added, 15 live markets. The dropdown list is designed by us: flag + language + currency |
| Market pick | Auto from the browser language plus region: en-AU→AUD, en-CA→CAD, en-US→USD, other en→GBP, fr-CA→FR_CA, de→DE, and so on. The selector overrides this choice and remembers it in localStorage |
| fr-CA | French UI from the sheet. The French cards are **translated by us** from EN_CAD (CAD amounts) and flagged "client to verify" |
| Copy source | The **sheet wins** over Figma for all text, location names and offers |
| Sheet errors | Fix the obvious ones: RO_MDL day 4 "22 GBP" becomes MDL, and DE "1. bis 25." becomes 26. Flag the RO_MDL amounts for the client but keep them |
| Data | One-time import script turns the sheet into JSON in the repo. Re-run it when the sheet changes |
| Links | One config file (`src/config.js`): deposit links per day from the links sheet (`data/links.json`), no Login button, T&C and campaign terms = https://jack-pot-uk.top/bonus-policy (BeGambleAware link removed, owner 2026-11-23) |
| Figma frame | **Main frames (A)**: header full width (logo at 200px), **no legend**. Fix the day-6 label bug |
| Route | A fixed window as in Figma: 5 days on desktop (−2…+2) and 3 on mobile (−1…+1), centred on today and clamped at the edges |
| Progress block | Not built. Only the "Unlocks in" countdown on tomorrow's gift |
| Clicks | Every visible day opens its card: missed shows the "Gift expired" card with the offer struck through, future shows "SURPRISE GIFT · Opens N December" |
| Legal | The full line everywhere, desktop and mobile: "18+ · Play responsibly · Full campaign terms apply" (BeGambleAware.org removed, owner 2026-11-23) |
| Images | The current Figma art is final. Export it as WebP @2x |
| Animations | All except Completed: snow + garland twinkle + parallax, pulse on today, gift opening, card in (modal on desktop / sheet on mobile), Santa moving to the new day, expired desaturation. `prefers-reduced-motion` reduces this to fades only |
| Responsive | We decide: below ~1024 use the mobile layout; 1024–1920 scales the desktop; above 1920 stays centred. Screenshots go to the owner |
| Tracking | None now. Only event hooks stubbed in the code |

## Repo layout (target)
```
index.html
src/main.js              boot: detect market, load data, render
src/date.js              today/state logic (local time, ?date= override for QA)
src/market.js            browser-language → market map, selector, localStorage
src/render/*.js          header, intro, route, howItWorks, legal, card, modal/sheet
src/anim/*.js            snow, pulse, open-gift, santa-move
src/styles/*.css         tokens.css (Figma tokens), layout, components
src/config.js            links (placeholder #), campaign start date 2026-12-01, days=26
data/ui/<lang>.json      UI ELEMENT strings (13 + fallback)
data/cards/<market>.json 26 days × {active, expired, locked} parsed into fields (offer, game, min deposit, wagering, valid)
scripts/import-sheet.mjs sheet dump → JSON, applies the known fixes, writes data/ISSUES.md
public/assets/*.webp     Figma exports
.github/workflows/pages.yml
```
Tokens (from Figma): Inter; BG #0F121D, Surface #151624 / #151F32, Primary #007AFF, Cyan #36BCFF, Gold #FFCC29 / #F6B532,
Muted #839CBF, Success #22C55E, Danger #EF4444; radii 15 / 24 / 100.

## Work order (each task runs as an Orca worker; each one needs its own "start")
1. **Scaffold + data import** (Sonnet). Set up Vite. Write `import-sheet.mjs` from the dump file, producing the JSON per market
   and language. Apply the fixes and write `data/ISSUES.md`. Translate the FR_CA cards from EN_CAD.
2. **Asset export** (Sonnet). In parallel with 1, because it touches different files. Export the landscape, the mobile
   background, the Santa hero (desktop and mobile), the 3 gift pedestals (locked, today, expired), the card illustration, the
   snow caps, the holly, the logo and the flags, all from Figma.
3. **Page build** (Sonnet with a detailed spec, Opus only if the date logic gets tricky). Covers the layout from Main frames
   156:2430 and 156:2782, the states, the card modal and bottom sheet (156:2583 and 156:2907), the selector, i18n and the
   countdown. Waits for tasks 1 and 2.
4. **Animations + responsive** (Sonnet). Follows Animations table 156:2381.
5. **QA in Chrome** (Sonnet). Use `?date=` to force: before campaign, 1 Dec, 7 Dec, 26 Dec, after campaign. Test every
   market at 390 / 768 / 1366 / 1920 and send screenshots to the owner.
6. **Deploy** (Haiku). Add the GitHub Pages workflow and push. Push and deploy each need a separate "go" from the owner.

## Verification
- `npm run build` passes, and `npm run dev` serves the page.
- With `?date=2026-12-07`: days 5–6 show missed, 7 is active (pulse plus the "OPEN GIFT" button), and 8 is locked with a
  countdown to local midnight. Day 9 is locked.
- Edge days: on 1 Dec the window starts at day 1, and on 26 Dec it ends at day 26. Before 1 Dec everything is locked with a
  countdown. After 26 Dec everything is expired and the message shows.
- Each market shows its own currency and amounts. For example EN_GBP day 1 reads "70% up to 350" with min 35, and EN_AUD shows
  its own values. fr-CA shows French UI and French cards.
- The browser-language mapping is checked by overriding `navigator.languages`, and the selector override persists.
- Reduced motion leaves only fades. Tap targets are at least 44px. A state never depends on colour alone.
- Visual check against the Figma screenshots at 390 and 1920.
