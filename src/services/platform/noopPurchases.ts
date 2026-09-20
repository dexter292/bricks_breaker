import type { PurchaseService } from './types';

export const noopPurchases: PurchaseService = {
  onRunEnded() {
    /* no-op — ARCH-02 */
  },
};
