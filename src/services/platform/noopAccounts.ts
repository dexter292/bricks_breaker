import type { AccountService } from './types';

export const noopAccounts: AccountService = {
  onRunEnded() {
    /* no-op — ARCH-02 */
  },
};
