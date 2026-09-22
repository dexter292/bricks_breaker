import { noopAds } from './noopAds';
import { noopPurchases } from './noopPurchases';
import { noopAccounts } from './noopAccounts';
import type { AdService, PurchaseService, AccountService } from './types';

export type {
  RunEndedPayload,
  AdService,
  PurchaseService,
  AccountService,
} from './types';
export { noopAds, noopPurchases, noopAccounts };

export function defaultPlatformServices(): {
  ads: AdService;
  purchases: PurchaseService;
  accounts: AccountService;
} {
  return { ads: noopAds, purchases: noopPurchases, accounts: noopAccounts };
}
