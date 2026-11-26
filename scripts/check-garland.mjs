// Numeric check: today's light garland always fits its label card, also after the window changes size.
//
//   node scripts/check-garland.mjs
//   node scripts/check-garland.mjs --dates 2026-12-07 --steps 60x900:565x1000,1440x900:390x844
//
// Why: the garland is an SVG sized from the card's box. It was drawn once, so a page loaded in a narrow window (tall card,
// the text wraps) and then widened kept a garland taller than the card: two long green wires below it (owner 2026-11-26).
// drawGarlands (src/render/route.js) now redraws it whenever the card changes size.
//
// Starts its own Vite dev server. For each date and each step "<w0>x<h0>:<w1>x<h1>" it loads the page at the first size,
// resizes to the second, waits, and compares the garland SVG with the card: width and height must equal the card's
// offsetWidth / offsetHeight + 2 * pad (pad = the --gp the garland was drawn with). One row per case, PASS or FAIL.
// Playwright is not a project dependency: PLAYWRIGHT_MODULE / CHROME as in scripts/check-santa.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const PW =
  process.env.PLAYWRIGHT_MODULE ||
  path.join(process.env.LOCALAPPDATA || '', 'npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs');
const CHROME =
  process.env.CHROME ||
  [
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1248/chrome-win64/chrome.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].find((p) => fs.existsSync(p));

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import(pathToFileURL(PW).href));
}

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const DATES = arg('--dates', '2026-12-01,2026-12-07,2026-12-26').split(',');
// narrow load then widen (the reported bug), wide load then narrow, desktop <-> mobile, and plain loads (same size twice)
const STEPS = arg('--steps', '60x900:565x1000,200x600:390x844,390x844:1440x900,1440x900:390x844,1440x900:1024x768,390x844:390x844,1440x900:1440x900')
  .split(',')
  .map((s) => s.split(':').map((p) => p.split('x').map(Number)));

const measure = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-garland]')].map((el) => {
      const card = el.parentElement;
      const svg = el.querySelector('svg');
      const pad = parseFloat(el.style.getPropertyValue('--gp')) || 0;
      return {
        want: [card.offsetWidth + pad * 2, card.offsetHeight + pad * 2],
        got: svg ? [Number(svg.getAttribute('width')), Number(svg.getAttribute('height'))] : null,
      };
    }),
  );

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ executablePath: CHROME });
let fails = 0;
try {
  for (const date of DATES) {
    for (const [[w0, h0], [w1, h1]] of STEPS) {
      const ctx = await browser.newContext({ viewport: { width: w0, height: h0 } });
      const page = await ctx.newPage();
      await page.goto(`${base}/?date=${date}&market=EN_GBP`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.setViewportSize({ width: w1, height: h1 });
      await page.waitForTimeout(600);
      const rows = await measure(page);
      const bad = rows.filter((r) => !r.got || r.got[0] !== r.want[0] || r.got[1] !== r.want[1]);
      const ok = rows.length > 0 && bad.length === 0;
      if (!ok) fails++;
      const detail = rows.length ? rows.map((r) => `svg ${r.got?.join('x')} card+pad ${r.want.join('x')}`).join('; ') : 'no garland on the page';
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${date}  ${w0}x${h0} -> ${w1}x${h1}  ${detail}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(fails ? `${fails} FAIL` : 'all PASS');
process.exit(fails ? 1 : 0);
