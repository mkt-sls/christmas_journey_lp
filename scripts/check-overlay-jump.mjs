// Numeric check: the page behind the card overlay must not move when the overlay opens or closes (owner 2026-11-19, desktop jump).
//
//   node scripts/check-overlay-jump.mjs --width=1440 [--markets=EN_GBP,FR_CA] [--days=1,14] [--scrolls=top,mid] [--methods=x,backdrop,esc]
//                                       [--height=720] [--out=FILE.json] [--overlay-scrollbars]
//
// ONE width per process (small machine), one browser, sequential. For every market x day x scroll position it loads
// ?date=2026-12-DD&market=XX, then measures (getBoundingClientRect, CSS px) the page title, every gift, every route label, Santa
// and window.scrollY:
//   before = page as loaded (and scrolled), overlay shut
//   open   = today's gift clicked, overlay open
//   after  = overlay closed by X button / click on the backdrop / Esc (each method starts again from "before" geometry)
// and prints the max |difference| (px) of "open" and of each "after" against "before", per element type.
//
// The browser MUST show a classic (non-overlay) scrollbar like Chrome on Windows, otherwise the bug cannot show. Playwright's
// headless Chromium hides scrollbars (--hide-scrollbars) and Chrome has overlay scrollbars: both are switched off here and the
// scrollbar width is measured and printed (window.innerWidth - documentElement.clientWidth); the run aborts if it is 0 unless
// --overlay-scrollbars is given. Infinite animations (snow, breathing) are paused at t=0 for each measurement and resumed.
// Playwright is not a project dependency: PLAYWRIGHT_MODULE / CHROME as in check-santa.mjs.
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
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const WIDTH = Number(arg('width') || 1440);
const HEIGHT = Number(arg('height') || (WIDTH <= 500 ? 844 : 720));
const MARKETS = (arg('markets') || 'EN_GBP,FR_CA').split(',');
const DAYS = (arg('days') || '1,14').split(',').map(Number);
const SCROLLS = (arg('scrolls') || 'top,mid').split(',');
const METHODS = (arg('methods') || 'x,backdrop,esc').split(',');
const OUT = arg('out');
const OVERLAY_SB = args.includes('--overlay-scrollbars');

/** In the page: positions of everything that must stay put. */
function measure() {
  const paused = [];
  for (const a of document.getAnimations()) {
    if (a.effect?.getComputedTiming().iterations === Infinity && document.getElementById('app').contains(a.effect.target)) {
      a.pause();
      a.currentTime = 0;
      paused.push(a);
    }
  }
  const R = (el) => {
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height];
  };
  const out = { scrollY: [window.scrollY, 0, 0, 0], title: R(document.querySelector('.intro__title')) };
  for (const g of document.querySelectorAll('.gift')) out[`gift${g.dataset.open}`] = R(g);
  for (const l of document.querySelectorAll('.label')) out[`label${l.dataset.open}`] = R(l);
  const s = document.querySelector('.santa');
  if (s) out.santa = R(s);
  const sb = window.innerWidth - document.documentElement.clientWidth;
  const stage = document.querySelector('.page');
  const info = {
    sb,
    clientW: document.documentElement.clientWidth,
    appW: document.getElementById('app').clientWidth,
    scrollW: document.documentElement.scrollWidth,
    hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollH: document.documentElement.scrollHeight,
    layout: stage?.dataset.layout,
  };
  paused.forEach((a) => a.play());
  return { out, info };
}

const kind = (k) => k.replace(/\d+$/, '');
/** max |delta| per element type between two measurements */
function diff(a, b) {
  const res = {};
  for (const k of Object.keys(a)) {
    const t = kind(k);
    const bb = b[k];
    const d = bb ? Math.max(...a[k].map((v, i) => Math.abs(v - bb[i]))) : Infinity;
    if (!res[t] || d > res[t].d) res[t] = { d, el: k };
  }
  return res;
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : i.decode().catch(() => 0))));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    // one-off animations (the new-day unlock flight of Santa on the first load) must be over before "before" is measured
    const fin = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.race([Promise.allSettled(fin.map((a) => a.finished)), new Promise((r) => setTimeout(r, 6000))]);
  });
}

async function main() {
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199, strictPort: false } });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const launchArgs = OVERLAY_SB ? [] : ['--disable-features=OverlayScrollbar'];
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: launchArgs,
    ignoreDefaultArgs: OVERLAY_SB ? [] : ['--hide-scrollbars'],
  });
  const rows = []; // { market, day, scroll, method, phase, type, d, el }
  const infos = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
    const page = await ctx.newPage();
    for (const market of MARKETS)
      for (const day of DAYS)
        for (const scroll of SCROLLS)
          for (const method of METHODS) {
            const date = `2026-12-${String(day).padStart(2, '0')}`;
            await page.goto(`${base}/?date=${date}&market=${market}`, { waitUntil: 'networkidle' });
            await page.waitForSelector('.gift--active');
            await settle(page);
            await page.evaluate((s) => {
              const max = document.documentElement.scrollHeight - window.innerHeight;
              window.scrollTo(0, s === 'mid' ? Math.round(max / 2) : 0);
            }, scroll);
            await page.waitForTimeout(150);
            const before = await page.evaluate(measure);
            // click today's gift in the page (no scrolling to it): the overlay's focus return must not scroll either
            await page.evaluate(() => document.querySelector('.gift--active').click());
            await page.waitForSelector('.overlay.is-open', { timeout: 15000 });
            await page.waitForTimeout(400);
            const open = await page.evaluate(measure);
            if (method === 'x') await page.click('.card__close');
            else if (method === 'esc') await page.keyboard.press('Escape');
            else await page.mouse.click(4, 4); // backdrop (outside panel / sheet)
            await page.waitForSelector('.overlay', { state: 'detached', timeout: 5000 });
            await page.waitForTimeout(400);
            const after = await page.evaluate(measure);
            infos.push({ market, day, scroll, method, before: before.info, open: open.info, after: after.info });
            for (const [phase, m] of [['open', open], ['after', after]])
              for (const [type, v] of Object.entries(diff(before.out, m.out)))
                rows.push({ market, day, scroll, method, phase, type, d: v.d, el: v.el });
          }
    await ctx.close();
  } finally {
    await browser.close();
    await server.close();
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ width: WIDTH, infos, rows }));

  const sbs = [...new Set(infos.map((i) => i.before.sb))];
  const sbOpen = [...new Set(infos.map((i) => i.open.sb))];
  const hOver = infos.filter((i) => i.before.hOverflow || i.open.hOverflow || i.after.hOverflow).length;
  console.log(`width ${WIDTH}x${HEIGHT} layout ${infos[0].before.layout}; cases ${infos.length}`);
  console.log(`scrollbar width (innerWidth - clientWidth): before ${sbs.join('/')} px, overlay open ${sbOpen.join('/')} px; clientWidth before ${[...new Set(infos.map((i) => i.before.clientW))].join('/')} open ${[...new Set(infos.map((i) => i.open.clientW))].join('/')}; layout width (#app) before ${[...new Set(infos.map((i) => i.before.appW))].join('/')} open ${[...new Set(infos.map((i) => i.open.appW))].join('/')} after ${[...new Set(infos.map((i) => i.after.appW))].join('/')}; horizontal overflow in ${hOver} cases`);
  if (!OVERLAY_SB && !sbs.some((v) => v > 0)) {
    console.log('ABORT: no classic scrollbar in this run (innerWidth - clientWidth = 0): the check proves nothing.');
    process.exitCode = 2;
    return;
  }
  const f = (v) => (Number.isFinite(v) ? v.toFixed(2) : 'MISSING');
  const types = ['scrollY', 'title', 'gift', 'label', 'santa'];
  let worst = 0;
  const line = (name, sel) => {
    const cells = types.map((t) => {
      const v = rows.filter((r) => sel(r) && r.type === t).map((r) => r.d);
      const m = v.length ? Math.max(...v) : 0;
      worst = Math.max(worst, m);
      return `${t} ${f(m)}`;
    });
    console.log(`${name.padEnd(16)} ${cells.join('   ')}`);
  };
  line('open (overlay)', (r) => r.phase === 'open');
  for (const m of METHODS) line(`closed by ${m}`, (r) => r.phase === 'after' && r.method === m);
  const bad = rows.filter((r) => !(r.d <= 0.5));
  console.log(`max |diff| ${f(worst)} px; entries > 0.5 px: ${bad.length}`);
  for (const r of bad.slice(0, 12)) console.log(`  ${r.market} day ${r.day} ${r.scroll} ${r.method} ${r.phase} ${r.type} (${r.el}) ${f(r.d)}`);
  if (bad.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
