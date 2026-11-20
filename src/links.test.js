import { describe, expect, it } from 'vitest';
import links from '../data/links.json';
import { depositLinkFor, linksByMarket, loginLinkFor } from './config.js';

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
    expect(depositLinkFor(1, 'RO_MDL')).toBe(depositLinkFor(1, 'EN_GBP'));
    expect(depositLinkFor(1, 'DE').endsWith('promocode=FROST')).toBe(true);
  });
});

describe('header Login link = link of today', () => {
  it('day 1 -> FROST, a mid day -> that day, before campaign -> day 1, after -> day 26', () => {
    expect(loginLinkFor(1, 'NL')).toBe(links[0].deposit);
    expect(loginLinkFor(1, 'NL').endsWith('promocode=FROST')).toBe(true);
    expect(loginLinkFor(14, 'FR_CA')).toBe(links[13].deposit);
    expect(loginLinkFor(0, 'NL')).toBe(links[0].deposit);
    expect(loginLinkFor(-9, 'NL')).toBe(links[0].deposit);
    expect(loginLinkFor(27, 'NL')).toBe(links[25].deposit);
    expect(loginLinkFor(40, 'NL').endsWith('promocode=SNOWFLAKE')).toBe(true);
  });
  it('a per-market login override wins', () => {
    linksByMarket.NL = { login: 'https://example.test/login' };
    try {
      expect(loginLinkFor(5, 'NL')).toBe('https://example.test/login');
      expect(loginLinkFor(5, 'FR_CA')).toBe(links[4].deposit);
    } finally {
      delete linksByMarket.NL;
    }
  });
});
