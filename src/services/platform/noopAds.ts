import type { AdService } from './types';

export const noopAds: AdService = {
  onRunEnded() {
    /* no-op — ARCH-02 */
  },
};
