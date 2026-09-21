/**
 * Device quality tiers → VFX budgets (PLT-03 / D-09…D-13).
 * Pure heuristic is testable without RN; expo-device only in readDeviceMemory.
 */

export type QualityTier = 'low' | 'mid' | 'high';

export type VfxBudget = {
  particleCap: number;
  /** Hard ceiling for trail ghosts; never < 2 (FX-01). */
  trailMax: number;
  /** 0 = skip glow blit; 1 = full. */
  glowScale: number;
};

/** Mid = Pixel 6a cert baseline; High bounded at PARTICLE_POOL_HARD_MAX. */
export const BUDGETS: Record<QualityTier, VfxBudget> = {
  low: { particleCap: 48, trailMax: 2, glowScale: 0 },
  mid: { particleCap: 128, trailMax: 5, glowScale: 1 },
  high: { particleCap: 192, trailMax: 5, glowScale: 1 },
};

const GB = 1024 ** 3;

/**
 * Map total RAM (bytes) to a tier. Returns null when info is insufficient
 * so the caller can default conservatively to `'low'` (D-10).
 */
export function tierFromMemory(totalMemory: number | null): QualityTier | null {
  if (totalMemory == null || !Number.isFinite(totalMemory) || totalMemory <= 0) {
    return null;
  }
  if (totalMemory < 4 * GB) return 'low';
  if (totalMemory < 8 * GB) return 'mid'; // includes ~6 GB Pixel 6a
  return 'high';
}

export type ResolveQualityTierOpts = {
  /** DEV force override; production always omits. */
  override?: QualityTier | null;
  totalMemory?: number | null;
  modelName?: string | null;
};

/**
 * Resolve Low/Mid/High + numeric budget outside core/ (D-12).
 * Override → Pixel 6a model force mid → memory heuristic → low default.
 */
export function resolveQualityTier(
  opts: ResolveQualityTierOpts = {},
): { tier: QualityTier; budget: VfxBudget } {
  const { override = null, totalMemory = null, modelName = null } = opts;

  let tier: QualityTier;
  if (override === 'low' || override === 'mid' || override === 'high') {
    tier = override;
  } else if (modelName != null && /Pixel 6a/i.test(modelName)) {
    tier = 'mid'; // D-13: never silent-map reference device to Low
  } else {
    tier = tierFromMemory(totalMemory ?? null) ?? 'low';
  }

  return { tier, budget: BUDGETS[tier] };
}

/**
 * Thin expo-device reader for PlayingHost only.
 * Soft-fail → null memory/model → conservative Low (D-10).
 * Kept separate so Vitest never loads the native module for unit tests.
 */
export function readDeviceMemory(): {
  totalMemory: number | null;
  modelName: string | null;
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- cold-path optional native
    const Device = require('expo-device') as {
      totalMemory: number | null;
      modelName: string | null;
    };
    return {
      totalMemory: Device.totalMemory ?? null,
      modelName: Device.modelName ?? null,
    };
  } catch {
    return { totalMemory: null, modelName: null };
  }
}
