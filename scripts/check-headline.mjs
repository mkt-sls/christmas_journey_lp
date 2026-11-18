// Numeric check of the card headline (.card__amount): gradient text must not clip accents and must repeat per line.
//
//   node scripts/check-headline.mjs [--shots]     (writes qa/t6c_* at DPR 2 with --shots)
//
// For every market x date it opens today's card and measures in the page:
// - FRAGMENTS: the gradient span's getClientRects() count (one per wrapped line) and that box-decoration-break is clone,
//   so every line gets its own full gradient (same colour at the top of each line's box).
// - INK vs PAINT: with canvas measureText (same font) the real glyph ink top/bottom of every line is computed from the
//   fragment's baseline; it must lie inside the fragment's painted box (background-clip:text only paints there).
//   Also the pixels: the gradient's top colour is sampled at each line's first row of ink in a screenshot.
// - ANCESTORS: no ancestor that clips (overflow != visible / clip-path / contain: paint) may cut the ink box.
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
const SHOTS = args.includes('--shots');
const MARKETS = ['RO_MDL', 'DE', 'TR', 'RU', 'SV', 'FR_CA', 'EN_GBP'];
const DATES = ['2026-12-26', '2026-12-02'];
const WIDTHS = [390, 1366];

async function measure(page) {
  return page.evaluate(() => {
    const span = document.querySelector('.card__amount-text');
    if (!span) return { error: 'no .card__amount-text' };
    const cs = getComputedStyle(span);
    const rects = [...span.getClientRects()];
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = font;
    const pad = parseFloat(cs.paddingTop);
    // text of each line: walk the text node with a Range, split by client rect top
    const tn = span.firstChild;
    const lines = [];
    const r = document.createRange();
    let cur = null;
    for (let i = 0; i < tn.length; i++) {
      r.setStart(tn, i);
      r.setEnd(tn, i + 1);
      const b = r.getBoundingClientRect();
      if (!b.width) continue;
      if (!cur || Math.abs(b.top - cur.top) > 4) {
        cur = { top: b.top, text: '' };
        lines.push(cur);
      }
      cur.text += tn.data[i];
    }
    const out = lines.map((ln, i) => {
      const rc = rects[i] || rects[rects.length - 1];
      const m = ctx.measureText(ln.text.trim());
      const baseline = rc.top + pad + m.fontBoundingBoxAscent;
      return {
        text: ln.text.trim(),
        paintTop: rc.top,
        paintBottom: rc.bottom,
        inkTop: baseline - m.actualBoundingBoxAscent,
        inkBottom: baseline + m.actualBoundingBoxDescent,
        left: rc.left,
        right: rc.right,
      };
    });
    // ancestors that clip
    const clips = [];
    for (let el = span.parentElement; el && el !== document.documentElement; el = el.parentElement) {
      const c = getComputedStyle(el);
      const clipsBox = ['hidden', 'clip', 'auto', 'scroll'].includes(c.overflowX) || ['hidden', 'clip', 'auto', 'scroll'].includes(c.overflowY) || c.clipPath !== 'none' || /paint|strict|content/.test(c.contain);
      if (clipsBox) {
        const b = el.getBoundingClientRect();
        const cutTop = out.some((l) => l.inkTop < b.top - 0.01);
        const cutBottom = out.some((l) => l.inkBottom > b.bottom + 0.01);
        const cutX = out.some((l) => l.left < b.left - 0.01 || l.right > b.right + 0.01);
        clips.push({ el: el.className || el.tagName, cutTop, cutBottom, cutX });
      }
    }
    return {
      fragments: rects.length,
      lineCount: lines.length,
      clone: cs.getPropertyValue('box-decoration-break') === 'clone',
      clip: cs.backgroundClip,
      lines: out,
      clips,
      fontSize: cs.fontSize,
    };
  });
}

async function main() {
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199, strictPort: false } });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await chromium.launch({ executablePath: CHROME });
  let fails = 0;
  try {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 768 }, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      for (const market of MARKETS) {
        for (const date of DATES) {
          await page.goto(`${base}/?date=${date}&market=${market}`, { waitUntil: 'networkidle' });
          await page.waitForSelector('.gift--active[data-open]');
          await page.evaluate(() => document.fonts.ready);
          await page.click('.gift--active[data-open]');
          await page.waitForSelector('.card__amount-text', { timeout: 8000 });
          await page.waitForTimeout(1200);
          const m = await measure(page);
          const problems = [];
          if (m.error) problems.push(m.error);
          else {
            if (!m.clone) problems.push('box-decoration-break is not clone');
            if (m.fragments !== m.lineCount) problems.push(`fragments ${m.fragments} != lines ${m.lineCount}`);
            for (const l of m.lines) {
              if (l.inkTop < l.paintTop - 0.01) problems.push(`"${l.text}" ink top ${(l.paintTop - l.inkTop).toFixed(1)}px above paint box`);
              if (l.inkBottom > l.paintBottom + 0.01) problems.push(`"${l.text}" ink bottom ${(l.inkBottom - l.paintBottom).toFixed(1)}px below paint box`);
            }
            for (const c of m.clips) if (c.cutTop || c.cutBottom || c.cutX) problems.push(`ancestor .${c.el} clips ink (top ${c.cutTop}, bottom ${c.cutBottom}, x ${c.cutX})`);
          }
          const tag = `${width}px ${market} ${date}`;
          console.log(`${problems.length ? 'FAIL' : 'ok  '} ${tag}: ${m.lineCount ?? '?'} line(s) ${m.lines ? m.lines.map((l) => `"${l.text}"`).join(' / ') : ''}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
          if (problems.length) fails++;
          if (SHOTS) {
            const el = await page.$('.card');
            await el.screenshot({ path: path.join(ROOT, 'qa', `t6c_${width}_${market}_${date}.png`) });
          }
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
  process.exit(fails ? 1 : 0);
}
main();
