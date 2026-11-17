// Campaign settings and every outgoing link in one place.
// Replace the "#" placeholders before launch. Per-market overrides go in linksByMarket
// (market id from data/markets.json, e.g. DE, EN_GBP).
export const CAMPAIGN = {
  year: 2026,
  month: 12, // December
  days: 26, // 1-26 December
};

export const links = {
  login: '#',
  deposit: '#',
  terms: '#', // "Full terms & conditions" on the card
  campaignTerms: '#', // "Full campaign terms apply" in the legal line
  beGambleAware: 'https://www.begambleaware.org',
};

// Optional per-market overrides, e.g. { DE: { deposit: 'https://...', terms: 'https://...' } }
export const linksByMarket = {};

export function linkFor(name, marketId) {
  return linksByMarket[marketId]?.[name] ?? links[name] ?? '#';
}
