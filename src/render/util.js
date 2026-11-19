export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Keeps numbers whole when a line wraps: a plain space becomes U+00A0 (same width, never a break point)
 *  - inside digit groups ("6 000"),
 *  - between a number and the word/currency/percent sign after it ("6 000 SEK", "60 %", "25 FREE", "26 Dec", "23 h"),
 *  - between the French hour mark and the minutes ("23 h 59").
 * Rendering only: the sheet text and data JSON stay untouched.
 */
export const nb = (v, { breakBeforeCurrency = false } = {}) =>
  String(v ?? '')
    .replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u00a0')
    // opt-in (Turkish card headline only): the amount may drop to the next line before its currency code ("33.000 / TRY’YE KADAR"):
    // the space before a 3-letter capital code (+ optional suffix after ’) stays a plain, breakable space
    .replace(breakBeforeCurrency ? /(\d) (?=[%€$£₽]|(?![A-Z]{3}(?:[’']|\P{L}|$))\p{L})/gu : /(\d) (?=[%€$£₽]|\p{L})/gu, '$1\u00a0')
    .replace(/(\dh|\d\u00a0h) (?=\d)/g, '$1\u00a0')
    .replace(/(\d)([–-])(?=\d)/g, '$1\u2060$2\u2060'); // ranges "1–26": an en dash is a break point, the word joiners remove it

/** esc() + nb(): for every visible string that can contain an amount, date or time. */
export const escNb = (v, opts) => esc(nb(v, opts));

/** URL of a file in public/assets (works with the relative Vite base). */
export const asset = (name) => `${import.meta.env.BASE_URL}assets/${name}`;

export const flagUrl = (code) => asset(`flags/${code}.svg`);

export const ARROW_SVG =
  '<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" focusable="false"><path d="M3.5 9h10m-4-4.5L13.5 9l-4 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const CLOSE_SVG =
  '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false"><path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
export const CHEVRON_SVG =
  '<svg viewBox="0 0 8 4" width="8" height="4" aria-hidden="true" focusable="false"><path d="M.8.8L4 3.2 7.2.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
