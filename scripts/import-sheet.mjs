#!/usr/bin/env node
// Turns data/source/sheet.json into the JSON the page uses:
//   data/ui/<lang>.json       UI strings + 26 location names per language
//   data/cards/<MARKET>.json  26 daily cards per market (FR_CA: see "EN_CAD tab language" below)
//   data/markets.json         list of markets
//   data/browser-map.json     browser language -> market rules
//   data/ISSUES.md            plain-English list of fixes and open questions for the client
// Re-run it whenever the sheet changes: node scripts/extract-sheet.mjs <dump> && node scripts/import-sheet.mjs
//
// FR_CA card text = the client's French (since 2026-11-20). The agency translation (buildFrCa, tu-form) is gone: FR_CA cards always
// come from the client's French, in this order (a French tab = all 26 day headers start with "JOUR <n> · "):
//   a) a sheet tab named "FR_CA", if the client ever adds one. If it exists but is not French like that, the script stops (no guessing).
//   b) else the EN_CAD tab, if it is French (the case since 2026-11-20: "JOUR 1 · 1 DÉCEMBRE ... Déposez et réclamez").
//   c) else the frozen copy data/source/fr-ca-french.json (EN_CAD is English again and there is no FR_CA tab).
// Then only the technical fixes of frCaClientFixes() are applied: deadline row split "label : value", "1er" on 1 December,
// "1 000" thousands, "Xmas". Like en-cad-english.json, the frozen copy is NEVER overwritten by the script: when a) or b) differs
// from it the script prints "[tab] ... IT DIFFERS from data/source/fr-ca-french.json" and the file is refreshed by hand.
// EN_CAD (the English page): an English EN_CAD tab is used as is; if the tab is French, the English text comes from the frozen
// data/source/en-cad-english.json (it exists nowhere else any more). The script stops if that file is missing or not English.
// Neither tab French nor English: the script stops.
//
// PL (Poland, PLN; owner 2026-11-26 "adaugam polonia"): cards = the client's PL tab (3 columns: active, expired, locked; no "bonus
// credited" column) with the agency fixes of plClientFixes(). The UI ELEMENT tab has no PL column, so the PL interface texts and
// the 26 location names are agency translations (PL_UI below). The PLN amounts come from the PL tab only: the links sheet has no
// PLN column (copy of 2026-11-23), so scripts/import-links.mjs cannot compare them.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const sheet = JSON.parse(fs.readFileSync(path.join(dataDir, 'source', 'sheet.json'), 'utf8')).tabs;

const DAYS = 26;

// ---- EN_CAD tab language -------------------------------------------------------
/** True when every day's first line of the tab is "<prefix> <n> · ...". */
function hasDayHeaders(tab, prefix) {
  return Boolean(tab) && tab.rows.length === DAYS && tab.rows.every((r, i) => new RegExp('^' + prefix + ' ' + (i + 1) + ' · ').test(String(r[0]).split('\n')[0]));
}
let frCaClientTab = null; // the client's French card tab (source a, b or c)
let frCaSource = '';
const sameTab = (a, b) => JSON.stringify([a.columns, a.rows]) === JSON.stringify([b.columns, b.rows]);
const frozenFrPath = path.join(dataDir, 'source', 'fr-ca-french.json');
const readFrozenFr = () => {
  if (!fs.existsSync(frozenFrPath)) throw new Error('No French card tab in the sheet and data/source/fr-ca-french.json (frozen French FR_CA) is missing.');
  const t = JSON.parse(fs.readFileSync(frozenFrPath, 'utf8')).tab;
  if (!hasDayHeaders(t, 'JOUR')) throw new Error('data/source/fr-ca-french.json is not a French card tab ("JOUR <n> · " headers expected).');
  return t;
};
if (hasDayHeaders(sheet.EN_CAD, 'JOUR')) {
  const frozenPath = path.join(dataDir, 'source', 'en-cad-english.json');
  if (!fs.existsSync(frozenPath)) throw new Error('The EN_CAD tab is French but data/source/en-cad-english.json (frozen English EN_CAD) is missing.');
  const frozen = JSON.parse(fs.readFileSync(frozenPath, 'utf8')).tab;
  if (!hasDayHeaders(frozen, 'DAY')) throw new Error('data/source/en-cad-english.json is not an English EN_CAD tab ("DAY <n> · " headers expected).');
  frCaClientTab = sheet.EN_CAD; // used only if there is no FR_CA tab (decided below)
  frCaSource = 'the French EN_CAD tab';
  sheet.EN_CAD = frozen;
  console.log('[tab] EN_CAD tab in the sheet is FRENCH: EN_CAD English comes from data/source/en-cad-english.json');
} else if (hasDayHeaders(sheet.EN_CAD, 'DAY')) {
  console.log('[tab] EN_CAD tab is English');
} else {
  throw new Error('The EN_CAD tab is neither English ("DAY <n> · ") nor French ("JOUR <n> · "); check the sheet before importing.');
}
if (sheet.FR_CA) {
  if (!hasDayHeaders(sheet.FR_CA, 'JOUR')) throw new Error('The sheet has a FR_CA tab but it is not a French card tab (26 rows with "JOUR <n> · " headers expected); check the sheet before importing.');
  frCaClientTab = sheet.FR_CA;
  frCaSource = 'the FR_CA tab';
}
if (frCaClientTab) {
  const frozenFr = readFrozenFr();
  console.log(`[tab] FR_CA cards come from ${frCaSource}` + (sameTab(frCaClientTab, frozenFr) ? ' (same as data/source/fr-ca-french.json)' : ': IT DIFFERS from data/source/fr-ca-french.json (the client changed the French); the frozen file is not overwritten, refresh it by hand if the new French is final'));
} else {
  frCaClientTab = readFrozenFr();
  frCaSource = 'the frozen copy data/source/fr-ca-french.json';
  console.log('[tab] no French tab in the sheet: FR_CA cards come from data/source/fr-ca-french.json');
}
const NBSP = ' ';
const SHEET_UI_LANGS = ['EN', 'RU', 'FR_CA', 'DE', 'BG', 'NL', 'RO_MD', 'TR', 'NO', 'IT', 'DA', 'SV']; // columns of the UI ELEMENT tab
const UI_LANGS = [...SHEET_UI_LANGS, 'PL']; // PL: agency translation (PL_UI), the sheet has no PL column

// ---- market table ------------------------------------------------------------
// flag = lowercase ISO country code (also used for the flag image name); flagEmoji for text-only use.
const MARKETS = [
  { id: 'DE', uiLang: 'DE', currency: 'EUR', flag: 'de', flagEmoji: '🇩🇪', label: 'Deutsch' },
  { id: 'BG', uiLang: 'BG', currency: 'EUR', flag: 'bg', flagEmoji: '🇧🇬', label: 'Български' },
  { id: 'NL', uiLang: 'NL', currency: 'EUR', flag: 'nl', flagEmoji: '🇳🇱', label: 'Nederlands' },
  { id: 'IT', uiLang: 'IT', currency: 'EUR', flag: 'it', flagEmoji: '🇮🇹', label: 'Italiano' },
  { id: 'RU', uiLang: 'RU', currency: 'EUR', flag: 'ru', flagEmoji: '🇷🇺', label: 'Русский' },
  { id: 'TR', uiLang: 'TR', currency: 'TRY', flag: 'tr', flagEmoji: '🇹🇷', label: 'Türkçe' },
  { id: 'DA', uiLang: 'DA', currency: 'DKK', flag: 'dk', flagEmoji: '🇩🇰', label: 'Dansk' },
  { id: 'SV', uiLang: 'SV', currency: 'SEK', flag: 'se', flagEmoji: '🇸🇪', label: 'Svenska' },
  { id: 'NO', uiLang: 'NO', currency: 'NOK', flag: 'no', flagEmoji: '🇳🇴', label: 'Norsk' },
  { id: 'PL', uiLang: 'PL', currency: 'PLN', flag: 'pl', flagEmoji: '🇵🇱', label: 'Polski' },
  { id: 'EN_AUD', uiLang: 'EN', currency: 'AUD', flag: 'au', flagEmoji: '🇦🇺', label: 'English (Australia)' },
  { id: 'EN_GBP', uiLang: 'EN', currency: 'GBP', flag: 'gb', flagEmoji: '🇬🇧', label: 'English (UK)' },
  { id: 'EN_USD', uiLang: 'EN', currency: 'USD', flag: 'us', flagEmoji: '🇺🇸', label: 'English (US)' },
  { id: 'EN_CAD', uiLang: 'EN', currency: 'CAD', flag: 'ca', flagEmoji: '🇨🇦', label: 'English (Canada)' },
  { id: 'FR_CA', uiLang: 'FR_CA', currency: 'CAD', flag: 'ca', flagEmoji: '🇨🇦', label: 'Français (Canada)' },
  { id: 'RO_MDL', uiLang: 'RO_MD', currency: 'MDL', flag: 'md', flagEmoji: '🇲🇩', label: 'Română (Moldova)' },
].map((m) => ({ ...m, cardsFile: `data/cards/${m.id}.json` }));

const BROWSER_MAP = {
  note: 'Match the full tag first (case-insensitive, e.g. "en-AU"), then the primary language ("de"), then fallback.',
  exact: { 'en-AU': 'EN_AUD', 'en-CA': 'EN_CAD', 'en-US': 'EN_USD', 'fr-CA': 'FR_CA' },
  language: {
    en: 'EN_GBP', de: 'DE', bg: 'BG', nl: 'NL', it: 'IT', ru: 'RU', tr: 'TR',
    da: 'DA', sv: 'SV', nb: 'NO', no: 'NO', nn: 'NO', pl: 'PL', ro: 'RO_MDL',
  },
  fallback: 'EN_GBP',
};

// Markets switched off on the page (owner 2026-11-26: Moldova off, and not in the client zip). Their cards and UI files are
// still written below, so the data stays ready, but they are left out of markets.json (selector, ?market=, saved choice)
// and out of browser-map.json (a "ro" browser then falls back like any language without a market). To switch RO_MDL back
// on: remove it here, re-add 'ro-MD' in src/market.js HTML_LANG and src/i18n.js DATE_LOCALE (and the date.test.js row),
// drop the '!' globs in src/i18n.js, move data/disabled/flags/md.svg back to public/assets/flags/, and drop the MDL
// check in scripts/package.mjs.
const DISABLED_MARKETS = ['RO_MDL'];
const LIVE_MARKETS = MARKETS.filter((m) => !DISABLED_MARKETS.includes(m.id));
for (const [lang, id] of Object.entries(BROWSER_MAP.language)) if (DISABLED_MARKETS.includes(id)) delete BROWSER_MAP.language[lang];
for (const [tag, id] of Object.entries(BROWSER_MAP.exact)) if (DISABLED_MARKETS.includes(id)) delete BROWSER_MAP.exact[tag];

// ---- logs --------------------------------------------------------------------
const fixes = []; // applied fixes
const issues = []; // { title, lines[] } numbered open points for the client
const notes = []; // informational, not counted
const unparsed = []; // cells that did not parse
const log = (msg) => console.log('[fix] ' + msg);

function addFix(msg) {
  fixes.push(msg);
  log(msg);
}

// ---- UI strings --------------------------------------------------------------
function buildUi() {
  const ui = sheet['UI ELEMENT'];
  const mainCols = ui.main.columns; // GROUP, KEY / DAY, EN SOURCE, EN, RU, ...
  const langIdx = {};
  SHEET_UI_LANGS.forEach((l) => {
    const i = mainCols.indexOf(l);
    if (i < 0) throw new Error('UI column missing: ' + l);
    langIdx[l] = i;
  });
  const out = {};
  for (const l of SHEET_UI_LANGS) out[l] = { lang: l, strings: {}, extras: {}, locations: {} };

  const seenKeys = new Map();
  for (const row of ui.main.rows) {
    const [group, key] = row;
    if (group === 'UI') {
      if (seenKeys.has(key)) issueDupKey(key);
      seenKeys.set(key, true);
      for (const l of SHEET_UI_LANGS) out[l].strings[key] = row[langIdx[l]];
    } else if (group === 'LOCATION') {
      for (const l of SHEET_UI_LANGS) out[l].locations[key] = row[langIdx[l]];
    } else {
      unparsed.push(`UI ELEMENT row with unknown group "${group}"`);
    }
    if (row[2] !== row[3]) {
      unparsed.push(`UI key "${key}": "EN SOURCE" column differs from "EN" column ("${row[2]}" vs "${row[3]}")`);
    }
  }

  // Extra blocks below the main table.
  const ctaCols = ui.cta.columns; // UI element, EN SOURCE, EN, RU, FR_CA, ...
  const ctaKeys = { 'CTA 1': 'cta_primary', 'CTA 2': 'cta_processing', 'CTA 3': 'cta_terms' };
  for (const row of ui.cta.rows) {
    const k = Object.keys(ctaKeys).find((p) => row[0].startsWith(p));
    if (!k) {
      unparsed.push(`UI extra row not recognised: ${row[0]}`);
      continue;
    }
    for (const l of SHEET_UI_LANGS) out[l].extras[ctaKeys[k]] = row[ctaCols.indexOf(l)];
  }
  // Second block: columns are EN SOURCE, EN, RU, FR_CA, DE, BG, NL, RO_MD, TR, NO, IT, DA, SV.
  const extraLangs = ['EN', 'RU', 'FR_CA', 'DE', 'BG', 'NL', 'RO_MD', 'TR', 'NO', 'IT', 'DA', 'SV'];
  const extraKeys = {
    'Day 7': 'day_7',
    'of 26': 'of_26',
    '4 gifts collected': 'gifts_collected_4',
    'Next gift in': 'next_gift_in',
  };
  let timerRowSeen = false;
  for (const row of ui.extra.rows) {
    if (row.length === 1) {
      if (row[0] === 'Timer') timerRowSeen = true;
      continue;
    }
    const key = extraKeys[row[0]];
    if (!key) {
      unparsed.push(`UI extra row not recognised: ${row[0]}`);
      continue;
    }
    extraLangs.forEach((l, i) => {
      out[l].extras[key] = row[1 + i];
    });
  }
  return { out, timerRowSeen };
}

const dupKeyHits = [];
function issueDupKey(key) {
  dupKeyHits.push(key);
}

// ---- number / line parsing ---------------------------------------------------
// Numbers with thousand separators: "1,000" "1 000" "20.000" "2 600"
const NUM_RE = /\d{1,3}(?:[   .,]\d{3})+(?!\d)|\d+/g;
const toInt = (s) => parseInt(s.replace(/[   .,]/g, ''), 10);
const numbersIn = (s) => (s.match(NUM_RE) || []).map(toInt);
const CURRENCY_TOKENS = ['EUR', '€', 'GBP', 'USD', 'CAD', 'AUD', 'TRY', 'DKK', 'SEK', 'NOK', 'MDL', 'PLN', '£', '$', '₺'];

function currencyIn(s) {
  const found = CURRENCY_TOKENS.filter((t) => s.includes(t));
  if (found.length === 0) return null;
  const norm = { '€': 'EUR', '£': 'GBP', '$': 'USD', '₺': 'TRY' };
  return found.map((t) => norm[t] || t);
}

function dayNumbersIn(line) {
  // remove clock times first so "23:59" / "23 h 59" are not read as days
  const noTime = line.replace(/\b\d{1,2}\s*[:h]\s*\d{2}\b/g, ' ');
  return (noTime.match(/\d{1,2}/g) || []).map(Number);
}

/** Parses one non-locked card (lines[]) into fields. Returns { fields, problems[] }. */
function parseOpenCard(lines, market, day) {
  const problems = [];
  const n = lines.length;
  if (n !== 8 && n !== 9) {
    return { fields: null, problems: [`unexpected number of lines (${n})`] };
  }
  const isFs = n === 9;
  const header = lines[0];
  const typeLine = lines[1];
  const amountLine = lines[2];
  const gameLine = isFs ? lines[3] : null;
  const [minLine, wagLine, validLine, ctaLine] = lines.slice(isFs ? 4 : 3, isFs ? 8 : 7);

  const hd = dayNumbersIn(header);
  if (!hd.includes(day)) problems.push(`header "${header}" does not contain day ${day}`);

  const fields = { type: isFs ? 'freespins' : 'bonus', typeLabel: typeLine };

  const nums = numbersIn(amountLine);
  if (isFs) {
    if (nums.length < 1) problems.push(`no spin count in "${amountLine}"`);
    fields.amount = { spins: nums[0] ?? null, text: amountLine };
  } else {
    const pm = amountLine.match(/(\d+)\s*%|%\s*(\d+)/);
    const percent = pm ? parseInt(pm[1] ?? pm[2], 10) : null;
    const rest = amountLine.replace(/(\d+)\s*%|%\s*(\d+)/, ' ');
    const maxNums = numbersIn(rest);
    if (percent === null || maxNums.length < 1) problems.push(`cannot read percent/max in "${amountLine}"`);
    fields.amount = { percent, max: maxNums[0] ?? null, currency: market.currency, text: amountLine };
    const cur = currencyIn(amountLine);
    if (cur && !cur.includes(market.currency)) problems.push(`currency ${cur.join('/')} in "${amountLine}" (market is ${market.currency})`);
  }

  if (isFs) {
    const stripped = gameLine.replace(/^\S+\s+/, '');
    fields.game = stripped;
    fields.gameLine = gameLine;
  } else {
    fields.game = null;
  }

  const minAfter = minLine.includes(':') ? minLine.slice(minLine.indexOf(':') + 1) : minLine;
  const minNums = numbersIn(minAfter);
  if (minNums.length < 1) problems.push(`no min deposit in "${minLine}"`);
  fields.minDeposit = { value: minNums[0] ?? null, currency: market.currency, text: minLine };
  const curMin = currencyIn(minAfter);
  if (curMin && !curMin.includes(market.currency)) problems.push(`currency ${curMin.join('/')} in "${minLine}" (market is ${market.currency})`);

  const wm = wagLine.match(/x\s*(\d+)/i);
  if (!wm) problems.push(`no wagering multiplier in "${wagLine}"`);
  fields.wagering = { multiplier: wm ? parseInt(wm[1], 10) : null, text: wagLine };

  const tm = validLine.match(/(\d{1,2})\s*[:h]\s*(\d{2})/);
  if (!tm) problems.push(`no valid-until time in "${validLine}"`);
  const vd = dayNumbersIn(validLine);
  if (!vd.includes(day)) problems.push(`valid-until "${validLine}" does not mention day ${day}`);
  fields.validUntil = { time: tm ? `${tm[1].padStart(2, '0')}:${tm[2]}` : null, text: validLine };

  fields.stateLine = ctaLine;
  return { fields, problems };
}

function parseLockedCard(lines, day) {
  const problems = [];
  if (lines.length !== 6) return { problems: [`locked card has ${lines.length} lines, expected 6`] };
  const hd = dayNumbersIn(lines[0]);
  if (!hd.includes(day)) problems.push(`locked header "${lines[0]}" does not contain day ${day}`);
  const od = dayNumbersIn(lines[2]);
  const ld = dayNumbersIn(lines[4]);
  if (!od.includes(day)) problems.push(`locked line "${lines[2]}" does not mention day ${day}`);
  if (!ld.includes(day)) problems.push(`locked line "${lines[4]}" does not mention day ${day}`);
  return { problems };
}

// ---- build card files --------------------------------------------------------
const cardIssues = []; // strings
const STATES = [['active', 0], ['expired', 2], ['locked', 3]]; // columns in sheet.json rows (1 = credited, unused)

function buildMarketCards(market, uiByLang, tabOverride) {
  const tab = tabOverride || sheet[market.id];
  if (!tab) throw new Error('Missing tab for market ' + market.id);
  if (tab.rows.length !== DAYS) throw new Error(`${market.id}: ${tab.rows.length} rows, expected ${DAYS}`);
  // 4 columns (active, credited, expired, locked) in every tab except PL, which has no "credited" column (active, expired, locked)
  const col = tab.columns.length === 3 ? { active: 0, expired: 1, locked: 2 } : tab.columns.length === 4 ? { active: 0, expired: 2, locked: 3 } : null;
  if (!col) throw new Error(`${market.id}: ${tab.columns.length} columns, expected 3 or 4`);
  const days = [];
  for (let d = 1; d <= DAYS; d++) {
    const row = tab.rows[d - 1];
    const raw = {
      active: row[col.active].split('\n'),
      expired: row[col.expired].split('\n'),
      locked: row[col.locked].split('\n'),
    };
    days.push({ day: d, raw });
  }
  return days;
}

// "Xmas" spelling (owner decision 2026-11-20: "Xmas" is correct). The sheet spells the day-20 game "Sweet Bonanza XMas" in
// EN_GBP, EN_USD, EN_CAD and RO_MDL and "Sweet Bonanza Xmas" in every other market; every "XMas" in the card text becomes
// "Xmas" on each import (FR_CA follows, it is built from EN_CAD). Case-sensitive: the promo code "XMASLUCK" is not touched.
const xmasFixed = new Map(); // market -> days where "XMas" was replaced

/** Applies explicit known fixes to raw lines before parsing. */
function applyCardFixes(market, days) {
  for (const d of days) {
    for (const state of ['active', 'expired', 'locked']) {
      d.raw[state] = d.raw[state].map((l) => {
        if (!l.includes('XMas')) return l;
        if (!xmasFixed.has(market.id)) xmasFixed.set(market.id, new Set());
        xmasFixed.get(market.id).add(d.day);
        return l.replaceAll('XMas', 'Xmas');
      });
    }
  }

  if (market.id === 'RO_MDL') {
    const day4 = days[3];
    let count = 0;

    for (const state of ['active', 'expired', 'locked']) {
      day4.raw[state] = day4.raw[state].map((l) => {
        if (/\bGBP\b/.test(l)) {
          count++;
          return l.replace(/\bGBP\b/g, 'MDL');
        }
        return l;
      });
    }
    // The "Bonus credited" column is not imported at all.
    if (count === 0) {
      notes.push('RO_MDL day 4: resolved. The sheet said "22 GBP" for the minimum deposit; the client fixed it (now "300 MDL"), so the GBP -> MDL fix no longer fires.');
    } else {
      addFix(`RO_MDL day 4: "GBP" replaced by "MDL" in ${count} line(s) (min deposit is now "22 MDL" in the active and expired cards; the locked card has no amount).`);
    }
  }
}

function finishMarket(market, days, ui) {
  const gbpDays = market.id === 'EN_GBP' ? null : gbpReference;
  const out = [];
  for (const entry of days) {
    const { day, raw } = entry;
    const parsedActive = parseOpenCard(raw.active, market, day);
    const parsedExpired = parseOpenCard(raw.expired, market, day);
    const parsedLocked = parseLockedCard(raw.locked, day);
    for (const [label, p] of [['active', parsedActive], ['expired', parsedExpired], ['locked', parsedLocked]]) {
      for (const msg of p.problems) unparsed.push(`${market.id} day ${day} (${label} card): ${msg}`);
    }
    const f = parsedActive.fields;
    if (!f) continue;
    // the expired card must show the same offer as the active card
    const fe = parsedExpired.fields;
    if (fe) {
      const same =
        JSON.stringify([fe.type, fe.amount, fe.game, fe.minDeposit, fe.wagering]) ===
        JSON.stringify([f.type, f.amount, f.game, f.minDeposit, f.wagering]);
      if (!same) unparsed.push(`${market.id} day ${day}: the "Gift expired" card shows a different offer than the "Deposit & Claim" card`);
    }
    // compare with the GBP tab for structure that must be identical in every market
    if (gbpDays) {
      const g = gbpDays[day - 1];
      const diffs = [];
      if (g.type !== f.type) diffs.push(`offer type (${f.type} vs ${g.type})`);
      if (g.type === f.type) {
        if (f.type === 'bonus' && g.amount.percent !== f.amount.percent) diffs.push(`percent (${f.amount.percent}% vs ${g.amount.percent}%)`);
        if (f.type === 'freespins' && g.amount.spins !== f.amount.spins) diffs.push(`spin count (${f.amount.spins} vs ${g.amount.spins})`);
        if (f.type === 'freespins' && g.game && f.game && g.game.toLowerCase() !== f.game.toLowerCase()) diffs.push(`game ("${f.game}" vs "${g.game}")`);
      }
      if (g.wagering.multiplier !== f.wagering.multiplier) diffs.push(`wagering (x${f.wagering.multiplier} vs x${g.wagering.multiplier})`);
      if (diffs.length) crossDiffs.push(`${market.id} day ${day}: differs from the EN_GBP tab in ${diffs.join(', ')}`);
    }
    out.push({
      day,
      date: `2026-12-${String(day).padStart(2, '0')}`,
      location: ui.locations[String(day)] ?? null,
      type: f.type,
      amount: f.amount,
      game: f.game,
      minDeposit: f.minDeposit,
      wagering: f.wagering,
      validUntil: f.validUntil,
      raw,
    });
  }
  return out;
}

const crossDiffs = [];
let gbpReference = null;

// ---- FR_CA cards, client's French (FR_CA tab, French EN_CAD tab or frozen copy) --------------------------------
// Owner decision 2026-11-20: FR_CA = the client's French (see the header for the source order), verbatim ("vous" form), with ONLY these technical fixes:
//   a. deadline row "Valide jusqu’au 1 déc. à 23 h 59" -> "Valide jusqu’au : 23 h 59, 1er déc." (non-breaking space before ":"). The card shows
//      the three term rows as "label | value" split at the colon (splitTerm in src/render/card.js), exactly like EN_CAD
//      ("Valid until | 23:59, 1 Dec"): grey label, white value.
//   b. "1er" (+ non-breaking space) for 1 December wherever the date is written; "1 000 CAD" (non-breaking space) instead of "1,000 CAD";
//      "XMas" -> "Xmas" (applyCardFixes, same as every market).
//   c. the route tag "1ER DÉC." comes from src/i18n.js.
const FR_DEADLINE = /^Valide jusqu’au (.+?) à (\d{1,2} h \d{2})$/;
function frCaClientFixes(days) {
  for (const d of days) {
    for (const state of ['active', 'expired']) {
      const lines = d.raw[state];
      const i = lines.length - 3; // deadline row: 3rd from the end (then button/state line, terms link)
      const m = lines[i].match(FR_DEADLINE);
      if (m) lines[i] = `Valide jusqu’au${NBSP}: ${m[2]}, ${m[1]}`;
      else unparsed.push(`FR_CA day ${d.day} (${state} card): deadline row "${lines[i]}" is not "Valide jusqu’au <date> à <h min>", left as in the sheet`);
    }
    for (const state of ['active', 'expired', 'locked']) {
      d.raw[state] = d.raw[state].map((l) => {
        if (/ CAD\b/.test(l)) l = l.replace(/(\d),(\d{3})(?!\d)/g, `$1${NBSP}$2`);
        if (d.day === 1) l = l.replace(/(?<!\d)1 (?=D[ÉE]C)/g, `1ER${NBSP}`).replace(/(?<!\d)1 (?=d[ée]c)/g, `1er${NBSP}`);
        return l;
      });
    }
  }
}

// ---- PL cards, the client's PL tab ------------------------------------------------------------------------
// Owner 2026-11-26 ("ai grija la traducere si la amplasare"): the client's Polish, with ONLY these fixes (the sheet is untouched):
//   a. free-spin days: the PL tab has no game line (every other market has one). "na <game>" is added under the amount, with the
//      game name of the EN_GBP tab ("82 darmowe spiny na Thunder Coins: Hold and Win" is the usual Polish casino wording).
//   b. "DARMOWYCH SPINÓW" after 2, 3, 4 (not 12-14) is a grammar error: Polish says "82 DARMOWE SPINY", "65 DARMOWYCH SPINÓW".
//   c. term rows get the colon the card splits on ("Min. depozyt: 155 PLN", "Wymagany obrót: x25", "Ważne do: 23:59, 1 gru."),
//      so they show label | value like every market. "gru." takes the abbreviation dot, like the route tags ("7 GRU.").
//   d. locked card: the PL tab writes the NEXT day ("DZIEŃ 1 ... OTWARCIE 2 GRUDNIA ... ZABLOKOWANE · 2 GRU", day 26 "27 GRUDNIA");
//      every other market writes the card's own day ("Opens 1 December", "Locked · 1 Dec"), so it becomes the card's day.
// A line that does not look as expected is left as in the sheet and listed under "Cells that could not be read cleanly".
const plFixCounts = { game: 0, plural: 0, colon: 0, lockedDay: 0 };
const plSpinsPlural = (n) => n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
function plClientFixes(days, gbpRef) {
  for (const d of days) {
    const g = gbpRef[d.day - 1];
    for (const state of ['active', 'expired']) {
      const lines = d.raw[state];
      const where = `PL day ${d.day} (${state} card)`;
      if (lines.length !== 8) {
        unparsed.push(`${where}: ${lines.length} lines, expected 8; PL fixes not applied`);
        continue;
      }
      const sm = lines[2].match(/^(\d+) DARMOWYCH SPINÓW$/);
      if (sm && plSpinsPlural(Number(sm[1]))) {
        lines[2] = `${sm[1]} DARMOWE SPINY`;
        plFixCounts.plural++;
      }
      const term = [
        [3, /^Min\. depozyt (\d[\d  ]* PLN)$/, (m) => `Min. depozyt: ${m[1]}`],
        [4, /^Wymagany obrót (x\d+)$/, (m) => `Wymagany obrót: ${m[1]}`],
        [5, /^Ważne do (\d{1,2}:\d{2}, \d{1,2} gru)\.?$/, (m) => `Ważne do: ${m[1]}.`],
      ];
      for (const [i, re, to] of term) {
        const m = lines[i].match(re);
        if (m) {
          lines[i] = to(m);
          plFixCounts.colon++;
        } else unparsed.push(`${where}: term row "${lines[i]}" is not in the expected form, left as in the sheet`);
      }
      if (g.type === 'freespins') {
        if (/SPIN/.test(lines[2]) && g.game) {
          lines.splice(3, 0, `na ${g.game}`);
          plFixCounts.game++;
        } else unparsed.push(`${where}: EN_GBP has free spins on "${g.game}" but the PL amount is "${lines[2]}"; no game line added`);
      }
    }
    const lk = d.raw.locked;
    if (lk.length !== 6) {
      unparsed.push(`PL day ${d.day} (locked card): ${lk.length} lines, expected 6; PL fixes not applied`);
      continue;
    }
    const om = lk[2].match(/^OTWARCIE (\d{1,2}) GRUDNIA$/);
    const zm = lk[4].match(/^ZABLOKOWANE · (\d{1,2}) GRU\.?$/);
    if (om && zm && Number(om[1]) === Number(zm[1]) && [d.day, d.day + 1].includes(Number(om[1]))) {
      if (Number(om[1]) === d.day + 1) plFixCounts.lockedDay++;
      lk[2] = `OTWARCIE ${d.day} GRUDNIA`;
      lk[4] = `ZABLOKOWANE · ${d.day} GRU.`;
    } else unparsed.push(`PL day ${d.day} (locked card): "${lk[2]}" / "${lk[4]}" not in the expected form, left as in the sheet`);
  }
}

// ---- main --------------------------------------------------------------------
const { out: uiAll, timerRowSeen } = buildUi();

// PL interface (owner 2026-11-26: "tradu tu", the agency translates it; the UI ELEMENT tab has no PL column). Informal "ty", like
// the client's PL card text ("Wróć jutro", "WPŁAĆ I ODBIERZ"); the card words are reused where the UI repeats them (step 3 =
// card button, "Pełny regulamin", "NIESPODZIANKA", "Prezent wygasł"). Sample dates/time follow the sheet's Dec-7 samples so the
// template step below turns them into {date} / {time} like every other language. Plural-free label forms where a number changes
// ("Zebrane prezenty: 4"). "campaign_ended" and "step3_body" come from CAMPAIGN_ENDED / STEP3_BODY like every language.
const PL_UI = {
  strings: {
    brand: 'Jackpot',
    login: 'Zaloguj się',
    campaign_dates: '1–26 GRUDNIA · 26 PREZENTÓW',
    campaign_title: 'Świąteczna podróż',
    subtitle: 'Podążaj za Świętym Mikołajem przez zaśnieżoną angielską wioskę. Każdego dnia odblokowuje się nowy prezent: otwórz go i odbierz swój bonus.',
    today: 'DZIŚ',
    '26 DAYS': '26 DNI',
    yesterday: 'WCZORAJ · 6 GRU.',
    todays_stop: 'DZISIEJSZY POSTÓJ · 7 GRU.',
    tomorrow: 'JUTRO · 8 GRU.',
    in_two_days: 'ZA 2 DNI · 9 GRU.',
    missed: 'PRZEGAPIONY · 6 GRU.',
    open_gift: 'OTWÓRZ PREZENT',
    unlocks_in: 'Otwarcie za 14:32:08',
    how_it_works: 'Jak to działa',
    step1_title: 'Wracaj codziennie',
    step1_body: 'Od 1 do 26 grudnia każdego dnia odblokowuje się nowe miejsce.',
    step2_title: 'Otwórz prezent',
    step2_body: 'Kliknij dzisiejszy świecący prezent, aby odkryć swój bonus.',
    step3_title: 'Wpłać i odbierz',
    step3_body: '',
    responsible: '18+ · Graj odpowiedzialnie',
    campaign_terms: 'Obowiązuje pełny regulamin promocji',
    day_of: 'Dzień 7 z 26',
    gifts_collected: 'Zebrane prezenty: 4',
    next_gift: 'Następny prezent za',
    gift_timer: '14:32:08',
    bonus_credited: 'Bonus przyznany',
    gift_expired: 'Prezent wygasł',
    locked: 'Zablokowane',
    processing: 'Przetwarzanie...',
    terms_conditions: 'Regulamin',
    full_terms: 'Pełny regulamin',
    surprise_gift: 'NIESPODZIANKA',
    opens_dec8: 'Otwarcie 8 grudnia',
    come_back_tomorrow: 'Wróć jutro, aby odblokować ten prezent',
  },
  extras: {
    cta_primary: 'Wpłać i odbierz',
    cta_processing: 'Przetwarzanie...',
    cta_terms: 'Regulamin',
    day_7: 'Dzień 7',
    of_26: 'z 26',
    gifts_collected_4: 'Zebrane prezenty: 4',
    next_gift_in: 'Następny prezent za',
  },
  locations: {
    1: 'Sekrety Mikołaja',
    2: 'Jackpot pod choinką',
    3: 'Piernikowy domek',
    4: 'Fabryka prezentów Mikołaja',
    5: 'Zaśnieżony park',
    6: 'Sklep z zabawkami',
    7: 'Plac Mikołaja',
    8: 'Kaplica życzeń',
    9: 'Magiczna karuzela',
    10: 'Szczęśliwa uliczka',
    11: 'Skarb bałwana',
    12: 'Poczta Mikołaja',
    13: 'Lodowy pałac',
    14: 'Sklep cudów',
    15: 'Jarmark świąteczny',
    16: 'Zimowy ogród',
    17: 'Zaczarowany las',
    18: 'Śnieżna jaskinia',
    19: 'Lodowisko pod gwiazdami',
    20: 'Zorza polarna',
    21: 'Nocny ekspres',
    22: 'Zaśnieżona chatka',
    23: 'Sejf Mikołaja',
    24: 'Tajny pokój',
    25: 'Worek z prezentami',
    26: 'Skrzynia z jackpotem',
  },
};
{
  // same keys as the sheet's English (a key the sheet adds later must get a PL text here; be_gamble_aware is dropped below anyway)
  const en = uiAll.EN;
  const keys = (o) => Object.keys(o).sort().join('|');
  const enStrings = Object.fromEntries(Object.entries(en.strings).filter(([k]) => k !== 'be_gamble_aware'));
  for (const part of ['strings', 'extras', 'locations']) {
    const ref = part === 'strings' ? enStrings : en[part];
    if (keys(PL_UI[part]) !== keys(ref)) throw new Error(`PL_UI.${part}: keys differ from the sheet's EN keys; add or remove PL texts in scripts/import-sheet.mjs`);
  }
  uiAll.PL = { lang: 'PL', strings: { ...PL_UI.strings }, extras: { ...PL_UI.extras }, locations: Object.fromEntries(Object.entries(PL_UI.locations).map(([k, v]) => [String(k), v])) };
  log('PL interface: agency translation (PL_UI), the sheet has no PL column');
}

// Known fix 2 + 3 on UI strings
{
  const de = uiAll.DE.strings;
  if (de.step1_body && de.step1_body.includes('1. bis 25.')) {
    de.step1_body = de.step1_body.replace('1. bis 25.', '1. bis 26.');
    addFix('DE step1_body: "1. bis 25." changed to "1. bis 26." (the campaign has 26 days).');
  } else {
    notes.push('Expected "1. bis 25." in DE step1_body was not found any more (maybe already fixed in the sheet).');
  }
  let n = 0;
  const langsFixed = [];
  for (const l of UI_LANGS) {
    const v = uiAll[l].strings.day_of;
    if (typeof v === 'string' && /\b25\b/.test(v)) {
      uiAll[l].strings.day_of = v.replace(/\b25\b/, '26');
      n++;
      langsFixed.push(l);
    }
  }
  if (n) addFix(`"Day 7 of 25" type text (key day_of): 25 changed to 26 in ${n} language(s): ${langsFixed.join(', ')}.`);
  else notes.push('No "of 25" found in key day_of any more.');

  // Report other places where a lone 25 appears in UI text (not changed)
  const other25 = [];
  for (const l of UI_LANGS) {
    for (const [k, v] of Object.entries(uiAll[l].strings)) {
      if (/\b25\b/.test(v)) other25.push(`${l}.${k}: "${v}"`);
    }
  }
  if (other25.length) notes.push('Other UI strings still containing "25" (checked, not changed): ' + other25.join('; '));
}

// Step 3 body: explicit owner override (task 4). The sheet text describes a green "credited" gift that
// does not exist on the page. These 12 strings are agency-made; the client must verify them.
const STEP3_BODY = {
  EN: 'Deposit before 23:59 to claim the day’s bonus.',
  RU: 'Пополни счёт до 23:59, чтобы забрать бонус дня.',
  FR_CA: 'Dépose avant 23 h 59 pour réclamer le bonus du jour.',
  DE: 'Zahle bis 23:59 Uhr ein, um den Tagesbonus zu sichern.',
  BG: 'Депозирай до 23:59 ч., за да вземеш бонуса за деня.',
  NL: 'Stort vóór 23:59 uur om de bonus van de dag te claimen.',
  RO_MD: 'Depune până la 23:59 pentru a revendica bonusul zilei.',
  TR: 'Günün bonusunu almak için 23:59’a kadar yatırım yap.',
  NO: 'Sett inn før kl. 23:59 for å hente dagens bonus.',
  IT: 'Deposita entro le 23:59 per riscuotere il bonus del giorno.',
  DA: 'Indbetal inden kl. 23:59 for at hente dagens bonus.',
  SV: 'Sätt in före kl. 23:59 för att hämta dagens bonus.',
  PL: 'Wpłać do 23:59, aby odebrać dzisiejszy bonus.',
};
for (const l of UI_LANGS) {
  if (!STEP3_BODY[l]) throw new Error('STEP3_BODY missing for ' + l);
  uiAll[l].strings.step3_body = STEP3_BODY[l];
}
log('OVERRIDE step3_body replaced in ' + UI_LANGS.length + ' languages (owner decision, agency translations).');

// FR_CA interface: the client's FR_CA column as is (owner, 2026-11-20). The agency-only wording of commit 6b5db5c (footer "Joue")
// was reverted; only typography stays (no word changes). Each entry: key, sheet text expected, text used. A sheet text that changed
// is kept and reported under "Good to know".
const FR_CA_UI = [
  // OQLF: non-breaking space before ":" (a plain space lets the colon start a new line); same words as the sheet
  ['subtitle', 'Suis le père Noël dans un village anglais enneigé. Un nouveau cadeau se débloque chaque jour : ouvre-le et réclame ton bonus.',
    `Suis le père Noël dans un village anglais enneigé. Un nouveau cadeau se débloque chaque jour${NBSP}: ouvre-le et réclame ton bonus.`],
];
for (const [k, from, to] of FR_CA_UI) {
  if (uiAll.FR_CA.strings[k] === from) {
    uiAll.FR_CA.strings[k] = to;
    log(`FR_CA ${k}: non-breaking space before ":" (typography only)`);
  } else {
    notes.push(`FR_CA ${k}: the sheet text is no longer "${from}", so the typography fix "${to}" was not applied (sheet text kept: "${uiAll.FR_CA.strings[k]}").`);
  }
}

// Hero eyebrow typo: the sheet has "·26" with no space after the middle dot in DE and RO_MD (every other language has "A · B").
// Typography only; a sheet text that changed is kept and reported under "Good to know".
const DOT_SPACE = [
  ['DE', '1.–26. DEZEMBER ·26 GESCHENKE', '1.–26. DEZEMBER · 26 GESCHENKE'],
  ['RO_MD', '1–26 DECEMBRIE ·26 CADOURI', '1–26 DECEMBRIE · 26 CADOURI'],
];
for (const [l, from, to] of DOT_SPACE) {
  if (uiAll[l].strings.campaign_dates === from) {
    uiAll[l].strings.campaign_dates = to;
    log(`OVERRIDE ${l} campaign_dates: space after "·" (typo in the sheet, typography only)`);
  } else {
    notes.push(`${l} campaign_dates: the sheet text is no longer "${from}", so the "·" spacing fix was not applied (sheet text kept: "${uiAll[l].strings.campaign_dates}").`);
  }
}

// BeGambleAware removed everywhere (owner 2026-11-23): the page has no such link, so the sheet row is not carried into the page data.
for (const l of UI_LANGS) delete uiAll[l].strings.be_gamble_aware;
log('OVERRIDE be_gamble_aware dropped from the ui data in ' + UI_LANGS.length + ' languages (owner 2026-11-23)');

// UI ELEMENT duplicates: the agency picks ONE translation per text (owner, 2026-11-23: "choose the best one"). The sheet is untouched;
// the main-table value is overwritten here. Each entry: key, language, sheet text expected, text used. A sheet text that changed is
// kept and reported under "Good to know" (and the duplicate stays open for that language). Number/time placeholders are unchanged:
// the "4" in gifts_collected is part of the sheet text (the page does not render these three keys today; step3_title is rendered).
const UI_DUP_PICKS = [
  ['processing', 'NL', 'Bezig met verwerken...', 'Bezig met verwerken...'], // standard Dutch UI status wording
  ['processing', 'IT', 'Elaborazione...', 'Elaborazione in corso...'], // "Elaborazione..." alone reads as a noun
  ['step3_title', 'TR', 'Yatır ve al', 'Yatır ve al'], // Turkish UI writes "ve", not "&"
  ['gifts_collected', 'RU', 'Собрано подарков: 4', 'Собрано подарков: 4'], // label form avoids plural agreement when the number changes
  ['gifts_collected', 'BG', 'Събрани подаръци: 4', 'Събрани подаръци: 4'], // same reason
  ['next_gift', 'TR', 'Sonraki hediye', 'Sonraki hediyeye kalan'], // it precedes the countdown: "time left to the next gift"
];
const dupPicked = new Map(); // `${key}:${lang}` -> { from: sheet main text, to: text used }
for (const [k, l, from, to] of UI_DUP_PICKS) {
  const cur = uiAll[l].strings[k];
  if (cur === from) {
    if (from !== to) {
      uiAll[l].strings[k] = to;
      log(`OVERRIDE ${l} ${k}: "${from}" -> "${to}" (agency pick between two sheet translations, owner 2026-11-23)`);
    } else {
      log(`OVERRIDE ${l} ${k}: sheet text "${to}" kept (agency pick between two sheet translations, owner 2026-11-23)`);
    }
    dupPicked.set(`${k}:${l}`, { from, to });
  } else {
    notes.push(`${l} ${k}: the sheet text is no longer "${from}", so the agency pick "${to}" was not applied (sheet text kept: "${cur}").`);
  }
}

// "Campaign ended" message (key campaign_ended, shown under the intro title after 26 December). The sheet has no such row.
// Translated by the agency on 2026-11-20 (owner: "tradu tu", we translate it ourselves). Each language uses the campaign
// name of its own campaign_title and the same informal "you" as the rest of its page. RU avoids a past-tense verb after
// "ты" (it would force a gender: "путешествовал/а"), hence "Спасибо за компанию в пути!". FR_CA: OQLF, no space before "!".
// Length matters on phones: the dotted route (.route-wrap, margin-top -20px) is painted over the bottom 20 px of the message
// box, so the LAST line must be short and centred. A text that fits on one line, or whose last line is long, gets a route dot
// on its first letters (measured 2026-11-20: "Julresan är slut. Tack för att du reste med oss!" on one line from 365 px,
// -2.4 px). Check any new wording with: node scripts/check-texts.mjs --widths=<w> --mobile --ended (rule route-over-text).
const CAMPAIGN_ENDED = {
  EN: 'The Christmas Journey has ended. Thank you for travelling with us!',
  RU: 'Рождественское путешествие завершено. Спасибо за компанию в пути!',
  FR_CA: 'Le Voyage de Noël est terminé. Merci d’avoir voyagé avec nous!',
  DE: 'Die Weihnachtsreise ist zu Ende. Danke, dass du mit uns gereist bist!',
  BG: 'Коледното пътешествие приключи. Благодарим ти, че беше с нас!',
  NL: 'Het Kerstavontuur is afgelopen. Bedankt dat je met ons meereisde!',
  RO_MD: 'Călătoria de Crăciun s-a încheiat. Îți mulțumim că ai călătorit cu noi!',
  TR: 'Noel Yolculuğu sona erdi. Bizimle yolculuk ettiğin için teşekkürler!',
  NO: 'Julereisen er over. Takk for at du ble med på reisen!',
  IT: 'Il Viaggio di Natale è terminato. Grazie per aver viaggiato con noi!',
  DA: 'Juleeventyret er slut. Tak, fordi du var med på rejsen!',
  SV: 'Julresan är slut. Tack för att du följde med på resan!',
  // PL: no past-tense verb after "ty" (it would force a gender: "podróżowałeś/aś"), same reason as RU
  PL: 'Świąteczna podróż dobiegła końca. Dziękujemy za wspólną podróż!',
};
for (const l of UI_LANGS) {
  if (!CAMPAIGN_ENDED[l]) throw new Error('CAMPAIGN_ENDED missing for ' + l);
  const sheetText = uiAll[l].strings.campaign_ended;
  if (sheetText && sheetText !== CAMPAIGN_ENDED[l]) notes.push(`${l} campaign_ended: the sheet now has "${sheetText}"; the agency text "${CAMPAIGN_ENDED[l]}" is still used (change CAMPAIGN_ENDED in scripts/import-sheet.mjs to take the sheet text).`);
  uiAll[l].strings.campaign_ended = CAMPAIGN_ENDED[l];
}
log('OVERRIDE campaign_ended written in ' + UI_LANGS.length + ' languages (agency translation, 2026-11-20).');

// Cards: parse EN_GBP first (reference), then everything else
const rawByMarket = {};
for (const m of MARKETS) {
  if (m.id === 'FR_CA') continue;
  const days = buildMarketCards(m, uiAll);
  applyCardFixes(m, days);
  rawByMarket[m.id] = days;
}

// Pre-parse GBP as the structural reference
{
  const gbp = MARKETS.find((m) => m.id === 'EN_GBP');
  gbpReference = rawByMarket.EN_GBP.map((e) => ({
    ...parseOpenCard(e.raw.active, gbp, e.day).fields,
    day: e.day,
  }));
}

// PL: the client's PL tab + plClientFixes (needs the EN_GBP game names)
plClientFixes(rawByMarket.PL, gbpReference);
addFix(`PL cards (client's PL tab): game line "na <game>" added on ${plFixCounts.game / 2} free-spin days; "DARMOWE SPINY" after 2/3/4 on ${plFixCounts.plural / 2} days; colon added in ${plFixCounts.colon} term rows (label | value layout, "gru."); locked card date set to the card's own day on ${plFixCounts.lockedDay} days (the tab wrote the next day).`);

const cardsOut = {};
for (const m of MARKETS) {
  if (m.id === 'FR_CA') continue;
  const uiLang = uiAll[m.uiLang];
  cardsOut[m.id] = finishMarket(m, rawByMarket[m.id], uiLang);
}

// FR_CA: the client's French (FR_CA tab, French EN_CAD tab or frozen copy)
{
  const m = MARKETS.find((x) => x.id === 'FR_CA');
  const frRaw = buildMarketCards(m, uiAll.FR_CA, frCaClientTab);
  applyCardFixes(m, frRaw);
  frCaClientFixes(frRaw);
  cardsOut.FR_CA = finishMarket(m, frRaw, uiAll.FR_CA);
}

// Game spelling: collect variants per day
const gameVariants = new Map(); // day -> Map(spelling -> [markets])
for (const m of MARKETS) {
  for (const d of cardsOut[m.id]) {
    if (!d.game) continue;
    if (!gameVariants.has(d.day)) gameVariants.set(d.day, new Map());
    const mm = gameVariants.get(d.day);
    if (!mm.has(d.game)) mm.set(d.game, []);
    mm.get(d.game).push(m.id);
  }
}

// ---- turn sample dates / time in UI strings into templates --------------------
// The sheet hardcodes the Dec-7 sample ("TODAY’S STOP · DEC 7", "Opens 8 December", "Unlocks in 14:32:08").
// The page needs {date} / {time} placeholders. Every language is checked; a sample that cannot be found is
// kept as raw text and listed in ISSUES.md.
{
  const unresolved = [];
  const tagKeys = ['yesterday', 'todays_stop', 'tomorrow', 'in_two_days', 'missed'];
  for (const l of UI_LANGS) {
    const s = uiAll[l].strings;
    for (const k of tagKeys) {
      const v = s[k];
      // every sample is "<WORD> · <date>"; the date is whatever follows the last " · "
      const i = typeof v === 'string' ? v.lastIndexOf(' · ') : -1;
      if (i > 0 && /\d/.test(v.slice(i + 3))) s[k] = v.slice(0, i) + ' · {date}';
      else unresolved.push(`${l}.${k}: "${v}"`);
    }
    // countdown sample 14:32:08 (in "Unlocks in 14:32:08" and in the bare gift_timer)
    if (typeof s.unlocks_in === 'string' && s.unlocks_in.includes('14:32:08')) s.unlocks_in = s.unlocks_in.replace('14:32:08', '{time}');
    else unresolved.push(`${l}.unlocks_in: "${s.unlocks_in}"`);
    if (s.gift_timer === '14:32:08') s.gift_timer = '{time}';
    // "Opens 8 December": day 8 + month word (a Turkish suffix after the month, e.g. "8 Aralık’ta", stays outside {date})
    if (typeof s.opens_dec8 === 'string' && /\b8\.?\s+[^\s’]+/.test(s.opens_dec8)) s.opens_dec8 = s.opens_dec8.replace(/\b8\.?\s+[^\s’]+/, '{date}');
    else unresolved.push(`${l}.opens_dec8: "${s.opens_dec8}"`);
  }
  if (unresolved.length) notes.push('Sample dates/time not turned into templates (kept as sheet text): ' + unresolved.join('; '));
  notes.push('IT opens_dec8 template is "Si apre l’{date}": Italian writes "l’8 / l’11" but "il 12", so the elided article is only right for some days. The page does not use this key for the locked card (it shows the sheet’s own card line).');
}

// ---- write JSON --------------------------------------------------------------
function writeJson(rel, obj) {
  const f = path.join(root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

for (const l of UI_LANGS) writeJson(`data/ui/${l}.json`, uiAll[l]);
for (const m of MARKETS) {
  const body = {
    market: m.id,
    uiLang: m.uiLang,
    currency: m.currency,
    days: cardsOut[m.id],
  };
  if (m.id === 'FR_CA') {
    body.translatedBy = 'client (French in EN_CAD tab, 2026-11-20); agency fixes: deadline row layout, Xmas, 1 000, 1er';
    body.sourceMarket = 'EN_CAD';
  }
  if (m.id === 'PL') body.translatedBy = 'client (PL tab, 2026-11-26); agency fixes: game line, DARMOWE SPINY after 2-4, term-row colons and "gru.", locked card day';
  writeJson(`data/cards/${m.id}.json`, body);
}
writeJson('data/markets.json', LIVE_MARKETS);
writeJson('data/browser-map.json', BROWSER_MAP);

// ---- ISSUES.md ---------------------------------------------------------------
// 1. RO_MDL suspicious amounts
const gbpNums = cardsOut.EN_GBP;
const roLines = [];
for (const d of cardsOut.RO_MDL) {
  const g = gbpNums[d.day - 1];
  const reasons = [];
  if (d.type === 'bonus') {
    if (d.minDeposit.value >= d.amount.max) reasons.push(`the minimum deposit (${d.minDeposit.value} MDL) is equal to or higher than the maximum bonus (${d.amount.max} MDL)`);
    if (d.amount.max === g.amount.max && d.minDeposit.value === g.minDeposit.value) reasons.push(`both numbers are identical to the GBP tab (max ${g.amount.max}, min ${g.minDeposit.value})`);
    else if (d.amount.max === g.amount.max) reasons.push(`the maximum bonus is identical to the GBP tab (${g.amount.max})`);
    else if (d.minDeposit.value === g.minDeposit.value) reasons.push(`the minimum deposit is identical to the GBP tab (${g.minDeposit.value})`);
  } else if (d.minDeposit.value === g.minDeposit.value) {
    reasons.push(`the minimum deposit is identical to the GBP tab (${g.minDeposit.value})`);
  }
  if (reasons.length) {
    const what = d.type === 'bonus' ? `${d.amount.percent}% up to ${d.amount.max} MDL, min deposit ${d.minDeposit.value} MDL` : `${d.amount.spins} free spins, min deposit ${d.minDeposit.value} MDL`;
    roLines.push(`Day ${d.day} (${what}): ${reasons.join('; ')}.`);
  }
}

let n = 0;
const sections = [];
// items: strings (open points, counted) or { text, decided: true } (settled, listed but not counted)
function section(title, intro, items) {
  if (!items || items.length === 0) return;
  n += items.filter((it) => !it.decided).length;
  sections.push({ title, intro, items: items.map((it) => (typeof it === 'string' ? it : it.text)) });
}
// FR_CA: the client's own French is used as is (owner, 2026-11-20); the client's UI column is not changed.
const FR_CA_DECIDED = 'FR_CA decided by the owner on 2026-11-20 (the page uses the client’s French)';
const FR_CA_DUP_DECISION = {
  terms_conditions: 'the page keeps "Modalités et conditions" (the card link reads "Modalités et conditions complètes"), "Conditions générales" is not used',
  step3_title: 'step 3 keeps "Dépose et réclame" (the client’s UI column) while the card button shows the client’s card text "Déposez et réclamez" (EN_CAD tab, vous form)',
};

// RO_MDL amounts: resolved. The client corrected the MDL column in the links sheet; scripts/import-links.mjs applies it (runs at the end of this script).

// Game spelling
const spellItems = [];
for (const [day, mm] of gameVariants) {
  const lowerSet = new Set([...mm.keys()].map((k) => k.toLowerCase()));
  if (mm.size > 1 && lowerSet.size === 1) {
    const parts = [...mm.entries()].map(([sp, ms]) => `"${sp}" in ${ms.join(', ')}`);
    spellItems.push(`Day ${day}: the same game is spelled in two ways - ${parts.join(' and ')}. Please tell us the correct spelling (it is shown as written in each market for now).`);
  } else if (mm.size > 1) {
    const parts = [...mm.entries()].map(([sp, ms]) => `"${sp}" in ${ms.join(', ')}`);
    spellItems.push(`Day ${day}: different game names across markets - ${parts.join(' and ')}.`);
  }
}
if (xmasFixed.size) {
  const where = [...xmasFixed].map(([m, ds]) => `${m} (day ${[...ds].join(', ')})`);
  const text = `Settled, not an open point (owner decision 2026-11-20: "Xmas" is correct): the sheet spells the game "Sweet Bonanza XMas" in ${where.join(', ')}. The script writes "Sweet Bonanza Xmas" there on every import, like every other market; the sheet is untouched.`;
  spellItems.unshift({ text, decided: true });
  log(`"XMas" -> "Xmas" in ${where.join(', ')} (owner decision 2026-11-20)`);
}
const spellOpen = spellItems.some((it) => typeof it === 'string');
section(`Game name spelling differs between markets ("Sweet Bonanza XMas" vs "Xmas")${spellOpen ? '' : ' - decided by the owner on 2026-11-20'}`, '', spellItems);

// Duplicate keys with different translations
const dupItems = [];
{
  const pairs = [
    ['processing', 'cta_processing', 'Processing...'],
    ['terms_conditions', 'cta_terms', 'Terms & Conditions'],
    ['step3_title', 'cta_primary', 'Deposit & Claim'],
    ['gifts_collected', 'gifts_collected_4', '4 gifts collected'],
    ['next_gift', 'next_gift_in', 'Next gift in'],
  ];
  for (const [a, b, label] of pairs) {
    const diffs = [];
    const langs = [];
    for (const l of UI_LANGS) {
      const pick = dupPicked.get(`${a}:${l}`);
      const va = pick ? pick.from : uiAll[l].strings[a]; // the sheet's main-table text (a pick may have replaced it in strings)
      const vb = uiAll[l].extras[b];
      if (va === undefined || vb === undefined) continue;
      if (va.trim().toLowerCase() !== vb.trim().toLowerCase()) {
        const decision = l === 'FR_CA' && FR_CA_DUP_DECISION[a] ? ` [${FR_CA_DECIDED}: ${FR_CA_DUP_DECISION[a]}]` : pick ? ` [agency choice 2026-11-23: "${pick.to}"]` : '';
        diffs.push(`${l}: "${va}" vs "${vb}"${decision}`);
        langs.push(l);
      }
    }
    if (!diffs.length) continue;
    const text = `"${label}" appears twice in the UI ELEMENT tab with different translations (${diffs.length} language${diffs.length > 1 ? 's' : ''}): ${diffs.join('; ')}. The page uses the main table value ("${a}") unless told otherwise.`;
    // a line is settled when every language on it is decided (FR_CA by the owner, others by an agency pick); one undecided language keeps it open
    const settled = langs.every((l) => (l === 'FR_CA' && FR_CA_DUP_DECISION[a]) || dupPicked.has(`${a}:${l}`));
    dupItems.push(settled ? { text: `Settled, not an open point: ${text}`, decided: true } : text);
  }
}
for (const k of new Set(dupKeyHits)) dupItems.push(`The key "${k}" appears more than once in the main UI table; the last row wins.`);
section('Same text translated differently in two places of the UI ELEMENT tab', '', dupItems);

// Missing pieces
const missing = [];
if (timerRowSeen) missing.push({ decided: true, text: 'Settled, not an open point (owner 2026-11-23): the page has one timer, the countdown chip "Unlocks in 14:32:08" on tomorrow’s gift, translated via the "Unlocks in" row; the empty Timer row needs nothing.' });
else missing.push('The "Timer" row was not found in the UI ELEMENT tab.');
missing.push({
  text: `Settled, not an open point: there is no "campaign ended" message in the sheet. After 26 December the page shows one under the intro title (key campaign_ended). The agency translated it on 2026-11-20 (owner decision: we translate it ourselves); the script writes these texts on every import, the sheet is untouched: ${UI_LANGS.map((l) => `${l}: "${CAMPAIGN_ENDED[l]}"`).join('; ')}. If you want a different wording in any language, tell us.`,
  decided: true,
});
missing.push({ decided: true, text: 'Settled, not an open point (owner 2026-11-23): the header Login button was removed.' });
missing.push({ decided: true, text: 'Settled, not an open point (owner 2026-11-23): both T&C links (card "Full terms & conditions" and legal line "Full campaign terms apply") open https://jack-pot-uk.top/bonus-policy on every market; the site picks the language itself.' });
section('Missing in the sheet', '', missing);

section(
  'Step 3 text replaced - decided by the owner (no tracker on the page, 2026-11-23): the agency text is final, nothing to verify',
  'The sheet text of step 3 (key step3_body, EN "The gift turns green when the bonus is credited.") described a green "credited" gift. The page has no such state (only missed / active / locked) and no tracking, so the owner replaced it with "Deposit before 23:59 to claim the day’s bonus." The owner decided on 2026-11-23 that the page will not have a tracker, so this text is final; it is not a question for the client. The script applies this override on every import, the sheet is untouched. The heading ("Deposit & claim") stays as in the sheet. For information, the agency wrote these strings (they are not taken from the sheet):',
  UI_LANGS.map((l) => ({ text: l === 'FR_CA' ? `${l}: "${STEP3_BODY[l]}" - ${FR_CA_DECIDED}; kept as is.` : `${l}: "${STEP3_BODY[l]}"`, decided: true })),
);

section(
  'FR_CA (French Canada) - the client’s French, used as is',
  `The page always uses the client’s French for the FR_CA cards, word for word (vous form, e.g. "Déposez et réclamez", "Revenez demain"). This import took it from ${frCaSource}. The client put it into the EN_CAD tab on 2026-11-20; a copy is frozen in data/source/fr-ca-french.json, so the French stays on the page even if the EN_CAD tab becomes English again. A separate FR_CA tab is optional: if the client adds one (26 days, headers "JOUR <n> · "), the page uses it first. The English EN_CAD page keeps the English text of the earlier sheet version (data/source/en-cad-english.json). The FR_CA interface texts are the client’s FR_CA column as is. data/cards/FR_CA.json is marked translatedBy "client (French in EN_CAD tab, 2026-11-20); agency fixes: deadline row layout, Xmas, 1 000, 1er". Only these technical fixes are applied on every import:`,
  [
    'Card deadline row: the client wrote "Valide jusqu’au 1 déc. à 23 h 59". The card shows this row as label | value, split at the colon, like every other market ("Valid until: 23:59, 1 Dec"), so it is stored as "Valide jusqu’au : 23 h 59, 1er déc." (grey label, white value). Same words, different order.',
    '"1er" with a non-breaking space for 1 December in every card line ("1ER DÉCEMBRE", "1er déc."); the route tag of 1 December reads "1ER DÉC." (src/i18n.js, FR_CA only).',
    '"1,000 CAD" -> "1 000 CAD" (French thousands separator, days 8 and 10); "Sweet Bonanza XMas" -> "Xmas" (day 20, owner decision).',
    'Non-breaking space before ":" in the intro text ("chaque jour : ouvre-le"), same words as the sheet.',
    'Not changed, for information: the client’s card text uses "vous" ("Déposez et réclamez", "Revenez demain") while the client’s interface column uses "tu" ("Dépose et réclame", "Reviens demain"). Both are shown as the client wrote them.',
  ].map((text) => ({ text, decided: true })),
);

section(
  'PL (Poland, PLN) - the client’s PL tab, with fixes - please check',
  'The page uses the client’s PL tab for the cards (added to the sheet by 2026-11-26) and these fixes, applied on every import (the sheet is untouched). The UI ELEMENT tab has no PL column: the agency translated the PL interface texts and the 26 location names (scripts/import-sheet.mjs, PL_UI).',
  [
    { decided: true, text: 'Settled, not an open point (owner 2026-11-26): the PL interface texts and the 26 location names are the agency’s translation (PL_UI); they are not asked of the client.' },
    { decided: true, text: 'Settled, not an open point (owner 2026-11-26): PL uses the same 26 deposit links and promo codes as every other market.' },
    { decided: true, text: 'Settled, not an open point (owner 2026-11-26: the games are the same in every market): the PL tab has no game name on the free-spin days (2, 4, 5, 6, 7, 9, 11, 12, 13, 14, 16, 18, 19, 20, 22, 23, 25). The page adds "na <game>" under the amount with the game of the EN_GBP tab (for example day 2 "82 DARMOWE SPINY / na Thunder Coins: Hold and Win").' },
    'Locked card: the PL tab writes the next day (day 1 "OTWARCIE 2 GRUDNIA", "ZABLOKOWANE · 2 GRU"; day 26 "27 GRUDNIA"). Every other market writes the card’s own day ("Opens 1 December"), so the page shows "OTWARCIE 1 GRUDNIA", "ZABLOKOWANE · 1 GRU.".',
    'Grammar: after 2, 3 or 4 (not 12-14) Polish says "DARMOWE SPINY", not "DARMOWYCH SPINÓW" (days 2, 9, 16, 18, 20, 22: 82, 74, 82, 63, 82, 62 spins). The page uses "DARMOWE SPINY" there.',
    'Term rows: the page adds a colon ("Min. depozyt: 155 PLN", "Wymagany obrót: x25", "Ważne do: 23:59, 1 gru.") so the card shows them as label | value like every market; "gru." takes the abbreviation dot.',
    'PLN amounts: the links sheet has no PLN column, so the PL amounts (for example day 1 "70% DO 1 500 PLN", min. deposit 155 PLN) come only from the PL tab and could not be cross-checked. Please confirm them, or add a PLN column to the links sheet.',
  ],
);

// New for the client, 2026-11-20
section(
  'New since 2026-11-20 - please check',
  '',
  [
    { decided: true, text: 'Settled, not an open point (information only): the RO_MDL tab still has GBP-sized maximum bonus numbers labelled MDL (day 1 "350 MDL", day 3 maximum 500 MDL is lower than the minimum deposit 450 MDL, day 8 "650 MDL", ...) and the day 1 minimum deposit says "35 MDL". The page does not use them: it shows the MDL values of the links sheet, which the client confirmed there (maximum bonus 20 times the tab number, e.g. day 1 maximum 7 000 MDL, minimum 500 MDL). Fixing the RO_MDL tab to match is optional.' },
    { decided: true, text: 'Settled, not an open point (owner 2026-11-23): the links sheet stays private on purpose; we check it in the owner’s browser (2026-11-23: unchanged).' },
  ],
);

section('Cells that could not be read cleanly', 'The import kept the raw sheet text for these, but the structured values (amount, min deposit, ...) may be missing or wrong:', unparsed.filter((u) => !/EN SOURCE/.test(u)));
section('Other differences between markets', 'These values should normally be the same in every market:', crossDiffs);
section('EN SOURCE column does not match the EN column', '', unparsed.filter((u) => /EN SOURCE/.test(u)));

const md = [];
md.push('# Christmas Journey - open points from the sheet import');
md.push('');
md.push('Generated by `scripts/import-sheet.mjs` from the Google Sheet "Перевод Лендинга JP". Re-run the script after the sheet changes and this file is rewritten.');
md.push('');
md.push(`**Open points for the client: ${n}**`);
md.push('');
md.push('## Fixes applied automatically');
md.push('');
md.push('These were obvious sheet errors. The script corrects them on every import; the sheet itself is untouched.');
md.push('');
if (fixes.length === 0) md.push('- (none)');
for (const f of fixes) md.push(`- ${f}`);
md.push('');
let sn = 0;
for (const s of sections) {
  sn++;
  md.push(`## ${sn}. ${s.title}`);
  md.push('');
  if (s.intro) {
    md.push(s.intro);
    md.push('');
  }
  for (const it of s.items) md.push(`- ${it}`);
  md.push('');
}
md.push('## Good to know');
md.push('');
md.push('- The "Bonus credited" column of the market tabs is not used. The page has only three states: missed (Gift expired), active (Deposit & Claim) and locked (Surprise gift).');
md.push('- Some UI texts contain sample values that the page replaces with live ones: dates ("YESTERDAY · DEC 6", "TODAY’S STOP · DEC 7", "Opens 8 December", ...) and the countdown "14:32:08".');
for (const nt of notes) md.push(`- ${nt}`);
md.push('');
fs.writeFileSync(path.join(dataDir, 'ISSUES.md'), md.join('\n'), 'utf8');

console.log(`Wrote ${UI_LANGS.length} ui files, ${MARKETS.length} cards files, markets.json, browser-map.json, ISSUES.md`);
console.log(`Fixes applied: ${fixes.length}; open points listed: ${n} (sections: ${sections.length})`);

// ---- links sheet: per-day deposit links, MDL amounts, diff report ----------------
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, [path.join(root, 'scripts/import-links.mjs')], { stdio: 'inherit' });
