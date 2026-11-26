import { describe, expect, it } from 'vitest';
import links from '../data/links.json';
import { depositLinkFor, linkFor, links as cfgLinks } from './config.js';
import enc from 'virtual:links-enc';
import { decodeLink, encodeLink } from './obfuscate.js';

describe('per-day deposit links', () => {
  it('has 26 days', () => {
    expect(links).toHaveLength(26);
    expect(links.map((l) => l.day)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
  });
  it('each link ends with promocode=<that day promo code>, no whitespace', () => {
    for (const l of links) {
      expect(l.promo).toMatch(/^[A-Z0-9]+$/);
      expect(l.deposit.endsWith('promocode=' + l.promo), `day ${l.day}`).toBe(true);
      expect(l.deposit).not.toMatch(/\s/);
      expect(l.deposit.startsWith('https://track.jack-pot.io/?modal=signIn&back=/%3Fmodal=deposit%26promocode=')).toBe(true);
    }
  });
  it('promo codes are unique and depositLinkFor returns the day link for every market', () => {
    expect(new Set(links.map((l) => l.promo)).size).toBe(26);
    expect(depositLinkFor(1, 'DE')).toBe(links[0].deposit);
    expect(depositLinkFor(1, 'TR')).toBe(depositLinkFor(1, 'EN_GBP'));
    expect(depositLinkFor(1, 'DE').endsWith('promocode=FROST')).toBe(true);
  });
});

describe('obfuscated deposit links', () => {
  const MARKETS = ['DE', 'EN_GBP', 'EN_USD', 'EN_AUD', 'EN_CAD', 'FR_CA', 'NL', 'BG', 'IT', 'NO', 'RU', 'SV', 'TR', 'DA'];
  it('encode/decode round-trips for all 26 days', () => {
    for (const l of links) expect(decodeLink(l.day, encodeLink(l.day, l.deposit)), `day ${l.day}`).toBe(l.deposit);
  });
  it('the encoded table holds no plaintext', () => {
    const blob = JSON.stringify(enc);
    expect(blob).not.toMatch(/promocode|track.jack-pot|https?:/i);
    for (const l of links) expect(blob.toLowerCase()).not.toContain(l.promo.toLowerCase());
  });
  it('depositLinkFor returns the exact data/links.json URL for every day x market', () => {
    for (const l of links) for (const m of MARKETS) expect(depositLinkFor(l.day, m), `${l.day} ${m}`).toBe(l.deposit);
  });
});

describe('T&C links', () => {
  const TC = 'https://jack-pot-uk.top/bonus-policy';
  it('terms and campaignTerms are the bonus-policy URL', () => {
    expect(cfgLinks.terms).toBe(TC);
    expect(cfgLinks.campaignTerms).toBe(TC);
  });
  it('every market gets the same URL (no override)', () => {
    for (const m of ['DE', 'EN_GBP', 'EN_CAD', 'FR_CA', 'NL']) {
      expect(linkFor('terms', m)).toBe(TC);
      expect(linkFor('campaignTerms', m)).toBe(TC);
    }
  });
});
