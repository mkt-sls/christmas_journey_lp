import { describe, it, expect } from 'vitest';
import { MARKETS, marketFromLanguages, normaliseMarketId, resolveMarket } from './market.js';

// Moldova (RO_MDL) is switched off (owner 2026-11-26): DISABLED_MARKETS in scripts/import-sheet.mjs.
describe('disabled market RO_MDL', () => {
  const store = (v) => ({ getItem: () => v });

  it('is not in the market list (selector)', () => {
    expect(MARKETS.map((m) => m.id)).not.toContain('RO_MDL');
    expect(MARKETS).toHaveLength(15);
  });
  it('a Romanian browser falls back to EN_GBP, like any language without a market', () => {
    expect(marketFromLanguages(['ro-MD'])).toBe('EN_GBP');
    expect(marketFromLanguages(['ro', 'de'])).toBe('DE');
    expect(marketFromLanguages(['fi'])).toBe('EN_GBP');
  });
  it('a Polish browser gets PL (added 2026-11-26)', () => {
    expect(marketFromLanguages(['pl-PL'])).toBe('PL');
    expect(normaliseMarketId('pl')).toBe('PL');
  });
  it('?market=RO_MDL and a saved RO_MDL choice are ignored', () => {
    expect(normaliseMarketId('RO_MDL')).toBeNull();
    expect(resolveMarket({ search: '?market=RO_MDL', languages: ['ro'], storage: store(null) })).toBe('EN_GBP');
    expect(resolveMarket({ search: '', languages: ['en-US'], storage: store('RO_MDL') })).toBe('EN_USD');
  });
});
