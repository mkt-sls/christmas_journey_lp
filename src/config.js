import dayLinks from 'virtual:links-enc'; // data/links.json, encoded at build time (vite.config.js, src/obfuscate.js)
import { decodeLink } from './obfuscate.js';

// Campaign settings and every outgoing link in one place.
// Per-market overrides go in linksByMarket
// (market id from data/markets.json, e.g. DE, EN_GBP).
export const CAMPAIGN = {
  year: 2026,
  month: 12, // December
  days: 26, // 1-26 December
};

export const links = {
  deposit: '#',
  terms: 'https://jack-pot-uk.top/bonus-policy', // "Full terms & conditions" on the card
  campaignTerms: 'https://jack-pot-uk.top/bonus-policy', // "Full campaign terms apply" in the legal line
  beGambleAware: 'https://www.begambleaware.org',
};

// Optional per-market overrides, e.g. { DE: { deposit: 'https://...', terms: 'https://...' } }
export const linksByMarket = {};

export function linkFor(name, marketId) {
  return linksByMarket[marketId]?.[name] ?? links[name] ?? '#';
}

// Deposit link of one campaign day (data/links.json, imported from the client links sheet). Same link for every market;
// a per-market override in linksByMarket wins, '#' placeholder is the last fallback.
function decodeDay(day) {
  const row = dayLinks.find((l) => l.day === day);
  return row ? decodeLink(day, row.d) : undefined;
}

export function depositLinkFor(day, marketId) {
  return linksByMarket[marketId]?.deposit ?? decodeDay(day) ?? links.deposit;
}
