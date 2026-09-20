// tests/platform.seams.test.ts — ARCH-02 / 06-W0-02
import { describe, it, expect } from 'vitest';
import { noopAds } from '../src/services/platform/noopAds';
import { noopPurchases } from '../src/services/platform/noopPurchases';
import { noopAccounts } from '../src/services/platform/noopAccounts';

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

  it.todo(
    'defaultPlatformServices returns ads/purchases/accounts with onRunEnded',
  );
});
