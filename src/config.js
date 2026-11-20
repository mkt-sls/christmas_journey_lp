import dayLinks from '../data/links.json';

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

// Deposit link of one campaign day (data/links.json, imported from the client links sheet). Same link for every market;
// a per-market override in linksByMarket wins, '#' placeholder is the last fallback.
export function depositLinkFor(day, marketId) {
  return linksByMarket[marketId]?.deposit ?? dayLinks.find((l) => l.day === day)?.deposit ?? links.deposit;
}

// Header "Login": goes to the link (promo code) of TODAY's campaign day. `today` is the page's campaign day number
// (campaignDay in date.js, incl. the ?date= QA clock). Before the campaign (<1) it uses day 1, after it (>days) the last day.
// Owner may change these two edge cases later: only the clamp below needs to change. A per-market linksByMarket[m].login wins.
export function loginLinkFor(today, marketId) {
  const override = linksByMarket[marketId]?.login;
  if (override) return override;
  const day = Math.min(Math.max(today, 1), CAMPAIGN.days);
  return depositLinkFor(day, marketId);
}
