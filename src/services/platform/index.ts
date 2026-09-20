export type {
  RunEndedPayload,
  AdService,
  PurchaseService,
  AccountService,
} from './types';
export { noopAds } from './noopAds';
export { noopPurchases } from './noopPurchases';
export { noopAccounts } from './noopAccounts';

import { noopAds } from './noopAds';
import { noopPurchases } from './noopPurchases';
import { noopAccounts } from './noopAccounts';
import type { AdService, PurchaseService, AccountService } from './types';

export function defaultPlatformServices(): {
  ads: AdService;
  purchases: PurchaseService;
  accounts: AccountService;
} {
  return { ads: noopAds, purchases: noopPurchases, accounts: noopAccounts };
}
