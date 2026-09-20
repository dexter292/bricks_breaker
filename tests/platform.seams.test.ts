// tests/platform.seams.test.ts — ARCH-02 / 06-W0-02
import { describe, it, expect } from 'vitest';
import {
  noopAds,
  noopPurchases,
  noopAccounts,
  defaultPlatformServices,
} from '../src/services/platform';

describe('platform seams', () => {
  it('noopAds.onRunEnded does not throw', () => {
    expect(() =>
      noopAds.onRunEnded({ score: 10, outcome: 'win', isNewRecord: true }),
    ).not.toThrow();
  });

  it('noopPurchases.onRunEnded does not throw', () => {
    expect(() =>
      noopPurchases.onRunEnded({ score: 0, outcome: 'lose' }),
    ).not.toThrow();
  });

  it('noopAccounts.onRunEnded does not throw', () => {
    expect(() =>
      noopAccounts.onRunEnded({ score: 1, outcome: 'win' }),
    ).not.toThrow();
  });

  it('defaultPlatformServices returns ads/purchases/accounts with onRunEnded', () => {
    const platform = defaultPlatformServices();
    expect(platform).toHaveProperty('ads');
    expect(platform).toHaveProperty('purchases');
    expect(platform).toHaveProperty('accounts');
    expect(() =>
      platform.ads.onRunEnded({ score: 5, outcome: 'win' }),
    ).not.toThrow();
    expect(() =>
      platform.purchases.onRunEnded({ score: 5, outcome: 'lose' }),
    ).not.toThrow();
    expect(() =>
      platform.accounts.onRunEnded({ score: 5, outcome: 'win' }),
    ).not.toThrow();
  });
});
