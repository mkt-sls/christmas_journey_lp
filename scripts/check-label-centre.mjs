// Numeric check (mobile): the vertical MIDDLE of every route label equals the vertical MIDDLE of its gift (owner 2026-11-19).
//
//   node scripts/check-label-centre.mjs --width=360 [--markets=NL,TR] [--days=1-26] [--active-only] [--out=FILE.json] [--shots=DIR] [--ended]
//
// ONE width per process (small machine). For every market x day it opens ?date=2026-12-DD&market=XX (mobile layout), pauses every
// animation at t = 0 and measures, from the rendered page:
//   label middle  = middle of the label box (getBoundingClientRect: stage scale, zoom and the breathing scale at t=0 included)
//   gift middle   = middle of the OPAQUE art of the gift (gift + podium, alpha > 128 in the gift image's own pixels, mapped to the
//                   screen through the <img> box). The VANDAAG / TODAY pill is a separate element and is NOT part of it.
//   delta         = label middle - gift middle (positive = label sits lower than the gift)
// For today's (active) label it also reports what the label covers: opaque gift art pixels, the TODAY pill, Santa's image box
// and every other label (rectangle intersections, CSS px).
// --ended: the campaign-ended page (mirrors check-texts --ended): ONE load per market at ?date=2026-12-28 (no active gift, all three
//   labels are past). --days is ignored. Owner decisions (commit 5ec1c40), keyed on what src/render/route.js does (state 'missed' +
//   slot): the past label of slot > 0 stays TOP-pinned (not centred) -> reported "expected (owner decision 5ec1c40)", not a failure;
//   the past label of slot 0 is centred then raised by MOBILE.pastSlot0Raise stage px -> expected delta = -raise x stage scale (the
//   raise is read from route.js, not a pixel constant here). Any other label must be centred within TOL (1 px). Exit code 1 on a FAIL.
// Prints max / mean |delta| per state and slot, and the overlap cases. Playwright is not a project dependency: PLAYWRIGHT_MODULE /
// CHROME as in check-santa.mjs.
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
const WIDTH = Number(arg('width') || 390);
const ONLY = arg('markets')?.split(',');
const [D0, D1] = (arg('days') || '1-26').split('-').map(Number);
const ACTIVE_ONLY = args.includes('--active-only');
const OUT = arg('out');
const SHOTS = arg('shots');
const ENDED = args.includes('--ended');
const ENDED_DATE = '2026-12-28'; // same date as check-texts --ended
const TOL = 1; // px, as the existing '>1px' counts
// --mobile: phone emulation (touch, overlay scrollbars => stage = full viewport width like a real phone, no 15px gutter)
const MOBILE_EMU = args.includes('--mobile');
const SHIFT = arg('shift'); // QA only: a = today label +14 stage px right in slot 0/2, b = only as far as the pill needs (per market)
const MARKETS = fs
  .readdirSync(path.join(ROOT, 'data', 'cards'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''))
  .filter((m) => !ONLY || ONLY.includes(m));

/** In the page: every label with its gift. */
async function measure() {
  document.getAnimations().forEach((a) => {
    a.pause();
    a.currentTime = 0;
  });
  const maskCache = new Map();
  const maskOf = async (img) => {
    const src = img.currentSrc || img.src;
    if (maskCache.has(src)) return maskCache.get(src);
    await img.decode().catch(() => 0);
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const c = new OffscreenCanvas(W, H);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H).data;
    let x0 = W;
    let y0 = H;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (d[(y * W + x) * 4 + 3] > 128) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    const m = { W, H, d, x0, y0, x1, y1 };
    maskCache.set(src, m);
    return m;
  };
  const R = (el) => {
    const r = el.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom };
  };
  const inter = (a, b) => {
    const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
    const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    return w > 0 && h > 0 ? { w, h, a: w * h } : null;
  };
  const labels = [...document.querySelectorAll('.label')];
  const extOf = (lab) => {
    const e = R(lab);
    for (const d of lab.querySelectorAll('*')) {
      const q = R(d);
      e.l = Math.min(e.l, q.l);
      e.t = Math.min(e.t, q.t);
      e.r = Math.max(e.r, q.r);
      e.b = Math.max(e.b, q.b);
    }
    return e;
  };
  const gifts = [];
  for (const g of document.querySelectorAll('.gift')) {
    const im = g.querySelector('.gift__img');
    const m = await maskOf(im);
    const ib = im.getBoundingClientRect();
    gifts.push({ day: Number(g.dataset.open), m, ib, sx: ib.width / m.W, sy: ib.height / m.H });
  }
  const santa = document.querySelector('.santa img');
  const santaBox = santa ? R(santa) : null;
  const out = [];
  let slot = -1;
  for (const lab of labels) {
    slot++;
    const day = Number(lab.dataset.open);
    const gift = document.querySelector(`.gift[data-open="${day}"]`);
    const img = gift.querySelector('.gift__img');
    const state = lab.classList.contains('label--active') ? 'active' : lab.classList.contains('label--missed') ? 'past' : 'future';
    const m = await maskOf(img);
    const ib = img.getBoundingClientRect();
    const sx = ib.width / m.W;
    const sy = ib.height / m.H;
    const art = { l: ib.left + m.x0 * sx, r: ib.left + (m.x1 + 1) * sx, t: ib.top + m.y0 * sy, b: ib.top + (m.y1 + 1) * sy };
    const lb = R(lab);
    const rec = {
      day,
      slot,
      state,
      labelMid: (lb.t + lb.b) / 2,
      giftMid: (art.t + art.b) / 2,
      labelH: lb.b - lb.t,
      labelBox: lb,
      art,
    };
    rec.delta = rec.labelMid - rec.giftMid;
    {
      // gift art middle in STAGE units from the pedestal centre py (py = gift box top + 80 k)
      const k = Number(gift.style.getPropertyValue('--k'));
      const gb = gift.getBoundingClientRect();
      const st = gb.width / (120 * k);
      rec.giftMidRel = (rec.giftMid - gb.top) / st - 80 * k;
      rec.st = st; // CSS px per stage px
    }
    {
      // what the label covers (every state): opaque art pixels of ANY gift, the TODAY pill, Santa's image box, every other label.
      // gift art: tested against the label BOX (its decorations are bounding boxes of mostly transparent SVGs); pill / Santa / other labels: against the union of all its parts (snow cap, holly, garland bulbs stick out of the box)
      const ext = extOf(lab);
      rec.extBox = ext;
      let px = 0;
      const perGift = [];
      for (const g of gifts) {
        let n = 0;
        const gm = g.m;
        const gb = g.ib;
        if (inter(lb, { l: gb.left, t: gb.top, r: gb.right, b: gb.bottom })) {
          const L = Math.max(lb.l, gb.left);
          const T = Math.max(lb.t, gb.top);
          for (let y = T; y < Math.min(lb.b, gb.bottom); y += 0.5)
            for (let x = L; x < Math.min(lb.r, gb.right); x += 0.5) {
              const ux = Math.floor((x - gb.left) / g.sx);
              const uy = Math.floor((y - gb.top) / g.sy);
              if (ux >= 0 && uy >= 0 && ux < gm.W && uy < gm.H && gm.d[(uy * gm.W + ux) * 4 + 3] > 128) n += 0.25;
            }
        }
        if (n > 0) perGift.push({ day: g.day, px: n });
        px += n;
      }
      rec.cover = { giftArtPx: px, giftArt: perGift };
      const pill = document.querySelector('.gift--active .today-pill');
      const pi = pill ? inter(ext, R(pill)) : null;
      rec.cover.pill = pi ? pi.a : 0;
      const si = santaBox ? inter(ext, santaBox) : null;
      rec.cover.santaBox = si ? si.a : 0;
      rec.cover.other = labels
        .filter((o) => o !== lab)
        .map((o) => ({ day: Number(o.dataset.open), a: inter(ext, extOf(o))?.a || 0 }))
        .filter((o) => o.a > 0);
      rec.pillBox = pill ? R(pill) : null;
    }
    out.push(rec);
  }
  return out;
}

/** QA variants (in the page only): move today's label right in slot 0/2. a: +14 stage px; b: just enough to clear the pill + 3px. */
function applyShift(mode) {
  const lab = document.querySelector('.label--active');
  const gift = document.querySelector('.gift--active');
  const k = Number(gift.style.getPropertyValue('--k'));
  const gb = gift.getBoundingClientRect();
  const st = gb.width / (120 * k);
  const slot = [...document.querySelectorAll('.label')].indexOf(lab);
  if (slot === 1) return;
  let stage = 14;
  if (mode === 'b') {
    const pill = gift.querySelector('.today-pill').getBoundingClientRect();
    stage = Math.max(0, (pill.right + 3 - lab.getBoundingClientRect().left) / st);
  }
  lab.style.left = Number.parseFloat(lab.style.left) + stage + 'px';
}

async function main() {
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5197, strictPort: false } });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await chromium.launch({ executablePath: CHROME });
  const rows = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 844 }, deviceScaleFactor: SHOTS ? 2 : MOBILE_EMU ? 3 : 1, ...(MOBILE_EMU ? { isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    for (const market of MARKETS)
      for (let day = ENDED ? 28 : D0; day <= (ENDED ? 28 : D1); day++) {
        const date = ENDED ? ENDED_DATE : `2026-12-${String(day).padStart(2, '0')}`;
        await page.goto(`${base}/?date=${date}&market=${market}`, { waitUntil: 'networkidle' });
        await page.waitForSelector(ENDED ? '.label' : '.label--active');
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map((i) => (i.complete ? 0 : i.decode().catch(() => 0))));
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        });
        const layout = await page.$eval('.page', (p) => p.dataset.layout);
        if (layout !== 'mobile') throw new Error(`${market} ${date} ${WIDTH}: layout ${layout}`);
        if (SHIFT) await page.evaluate(applyShift, SHIFT);
        if (SHOTS) {
          fs.mkdirSync(SHOTS, { recursive: true });
          await page.locator('.route-wrap').screenshot({ path: path.join(SHOTS, `${market}_d${day}_${WIDTH}.png`) });
        }
        const res = await page.evaluate(measure);
        // pixel truth for the pill: the label box is a rounded rectangle and the pill a capsule, so a rectangle touch can be empty.
        // Screenshot the pill rect with the label hidden / shown (animations paused, snow hidden), count pixels that change by > 60.
        const act = res.find((r) => r.state === 'active');
        if (act && act.cover.pill > 0) {
          const pb = act.pillBox;
          const clip = { x: Math.max(0, pb.l), y: Math.max(0, pb.t), width: pb.r - pb.l, height: pb.b - pb.t };
          await page.addStyleTag({ content: '.snow{display:none!important}.label--active{box-shadow:none!important}.label--active{filter:none!important}' });
          const shotA = await page.screenshot({ clip });
          await page.addStyleTag({ content: '.label--active{visibility:hidden!important}' });
          const shotB = await page.screenshot({ clip });
          act.cover.pillPx = await page.evaluate(async ([a, b]) => {
            const ld = async (s) => {
              const i = new Image();
              i.src = 'data:image/png;base64,' + s;
              await i.decode();
              const c = new OffscreenCanvas(i.width, i.height);
              const g = c.getContext('2d');
              g.drawImage(i, 0, 0);
              return g.getImageData(0, 0, i.width, i.height).data;
            };
            const [p, q] = await Promise.all([ld(a), ld(b)]);
            let n = 0;
            for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 60) n++;
            return n;
          }, [shotA.toString('base64'), shotB.toString('base64')]);
        } else if (act) act.cover.pillPx = 0;
        for (const r of res) if (!ACTIVE_ONLY || r.state === 'active') rows.push({ market, today: day, ...r });
      }
    await ctx.close();
  } finally {
    await browser.close();
    await server.close();
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ width: WIDTH, rows }));
  const f = (v) => v.toFixed(2);
  console.log(`width ${WIDTH}: ${rows.length} labels measured`);
  if (ENDED) {
    const raise = (/pastSlot0Raise:\s*([\d.]+)/.exec(fs.readFileSync(path.join(ROOT, 'src/render/route.js'), 'utf8')) || [])[1];
    if (raise === undefined) throw new Error('pastSlot0Raise not found in src/render/route.js');
    let fails = 0;
    let expected = 0;
    let maxAbs = 0;
    for (const r of rows) {
      let verdict;
      if (r.state === 'past' && r.slot > 0) verdict = 'expected (owner decision 5ec1c40: top-pinned)';
      else if (r.state === 'past' && r.slot === 0) {
        const want = -Number(raise) * r.st;
        verdict = Math.abs(r.delta - want) <= TOL ? `expected (owner decision 5ec1c40: raised ${raise} stage px = ${f(want)} px)` : `FAIL (raised label should sit ${f(want)} px, sits ${f(r.delta)})`;
      } else verdict = Math.abs(r.delta) <= TOL ? 'ok (centred)' : 'FAIL (not centred)';
      if (verdict.startsWith('FAIL')) fails++;
      else if (verdict.startsWith('expected')) expected++;
      maxAbs = Math.max(maxAbs, Math.abs(r.delta));
      console.log(`  ${r.market.padEnd(7)} ${r.state} slot ${r.slot} (day ${r.day}) delta ${f(r.delta)} px: ${verdict}`);
    }
    console.log(`ENDED width ${WIDTH}: ${rows.length} labels, expected ${expected}, centred-ok ${rows.length - expected - fails}, FAIL ${fails}, max |delta| ${f(maxAbs)}`);
    process.exitCode = fails ? 1 : 0;
    return;
  }
  // owner decision 2026-11-20 (Santa clearance): the PAST labels of slot 1 / slot 2 stay top-pinned (not centred), the past label of slot 0 is centred then raised
  // by MOBILE.pastSlot0Raise. They are reported, not counted as centring failures.
  const pinned = (r) => r.state === 'past' && r.slot > 0;
  const groups = new Map();
  for (const r of rows) {
    const k = `${r.state} slot ${r.slot}${pinned(r) ? ' [top-pinned by owner decision]' : r.state === 'past' && r.slot === 0 ? ' [raised 4 by owner decision]' : ''}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(Math.abs(r.delta));
  }
  const all = [];
  for (const [k, v] of [...groups].sort()) {
    all.push(...v);
    console.log(`${k.padEnd(16)} n=${String(v.length).padEnd(4)} max |d| ${f(Math.max(...v))}  mean |d| ${f(v.reduce((a, b) => a + b, 0) / v.length)}`);
  }
  const act = rows.filter((r) => r.state === 'active');
  if (act.length) {
    const v = act.map((r) => Math.abs(r.delta));
    console.log(`ACTIVE total  n=${v.length} max |d| ${f(Math.max(...v))} mean |d| ${f(v.reduce((a, b) => a + b, 0) / v.length)} (>1px: ${v.filter((x) => x > 1).length})`);
  }
  const nonAct = rows.filter((r) => r.state !== 'active' && !pinned(r) && !(r.state === 'past' && r.slot === 0));
  if (nonAct.length) {
    const v = nonAct.map((r) => Math.abs(r.delta));
    console.log(`NON-ACTIVE centred (future + nothing pinned/raised) total  n=${v.length} max |d| ${f(Math.max(...v))} mean |d| ${f(v.reduce((a, b) => a + b, 0) / v.length)} (>1px: ${v.filter((x) => x > 1).length})`);
  }
  // overlaps, every state: gift art px (any gift) > 0.5 | TODAY pill (pixel truth for the active label, rectangles for the others) | Santa image box | another label
  const bad = rows.filter((r) => r.cover.giftArtPx > 0.5 || (r.state === 'active' ? (r.cover.pillPx ?? 0) > 0 : r.cover.pill > 0) || r.cover.santaBox > 0 || r.cover.other.length);
  console.log(`OVERLAPS (gift art px>0.5 | pill | santa img box | other label): ${bad.length} (active ${bad.filter((r) => r.state === 'active').length}, past ${bad.filter((r) => r.state === 'past').length}, future ${bad.filter((r) => r.state === 'future').length})`);
  for (const r of bad.slice(0, 60))
    console.log(`  ${r.market} day ${r.today} ${r.state} slot ${r.slot} (label day ${r.day}): art ${f(r.cover.giftArtPx)}px2 ${JSON.stringify(r.cover.giftArt)}, pill ${f(r.cover.pill)}, santaBox ${f(r.cover.santaBox)}, other ${JSON.stringify(r.cover.other)}`);
}

await main();
