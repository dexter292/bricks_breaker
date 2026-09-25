/**
 * expo-haptics HapticsService — soft native probe + strongest-wins coalesce (D-09…D-12).
 * Mirrors createDefaultAudioService: never throw into gameplay; no reduce-motion AND.
 */
import { coalesceHapticRank } from './mapping';
import { createMemoryHapticsService } from './memoryHapticsService';
import type { HapticsService } from './types';

/**
 * String values matching expo-haptics ImpactFeedbackStyle.Light / .Medium.
 * Kept local so Vitest can inject spies without loading the native module entry.
 * Const vs type names differ on purpose — same-name dual export trips no-redeclare.
 */
export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
} as const;

/** Local impact style id — not the expo-haptics enum (avoids value/type redeclare). */
export type ImpactStyle =
  (typeof ImpactFeedbackStyle)[keyof typeof ImpactFeedbackStyle];

export type ImpactFn = (style: ImpactStyle) => Promise<void>;

type ExpoHapticsModule = {
  impactAsync: (style: ImpactStyle) => Promise<void>;
  ImpactFeedbackStyle: {
    Light: ImpactStyle;
    Medium: ImpactStyle;
  };
};

/**
 * Probe for ExpoHaptics WITHOUT importing `expo-haptics` (same Fast Refresh /
 * stale-binary soft-fail rationale as ExpoAudio — T-D1-08).
 */
function isExpoHapticsNativeAvailable(): boolean {
  if (typeof process !== 'undefined' && process.env.VITEST) {
    return false;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native probe
    const { requireOptionalNativeModule } = require('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    return requireOptionalNativeModule('ExpoHaptics') != null;
  } catch {
    return false;
  }
}

function loadExpoHaptics(): ExpoHapticsModule | null {
  if (!isExpoHapticsNativeAvailable()) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native load
    return require('expo-haptics') as ExpoHapticsModule;
  } catch {
    return null;
  }
}

function defaultImpact(style: ImpactStyle): Promise<void> {
  const mod = loadExpoHaptics();
  if (!mod?.impactAsync) {
    return Promise.resolve();
  }
  const mapped =
    style === ImpactFeedbackStyle.Medium
      ? (mod.ImpactFeedbackStyle?.Medium ?? style)
      : (mod.ImpactFeedbackStyle?.Light ?? style);
  return mod.impactAsync(mapped);
}

/**
 * Injectable impact for Vitest; production default calls Haptics.impactAsync.
 * playFromBatch: coalesceHapticRank → ≤1 impact (Light break / Medium life).
 */
export function createExpoHapticsService(impact?: ImpactFn): HapticsService {
  const fire = impact ?? defaultImpact;
  let released = false;

  return {
    playFromBatch(codes: ArrayLike<number>, count: number): void {
      if (released) return;
      try {
        const rank = coalesceHapticRank(codes, count);
        if (rank === 0) return;
        const style: ImpactStyle =
          rank === 2 ? ImpactFeedbackStyle.Medium : ImpactFeedbackStyle.Light;
        void Promise.resolve(fire(style)).catch(() => {
          // Soft-fail impactAsync — never throw into gameplay (T-D1-08)
        });
      } catch {
        // Soft-fail play — never throw into gameplay
      }
    },
    release(): void {
      released = true;
    },
  };
}

/**
 * Prefer expo-haptics when linked; otherwise memory. Soft-fail never blocks play
 * (D-09 / T-D1-08). Missing native (stale binary) → memory + __DEV__ warn.
 *
 * FORBIDDEN: reduce-motion / a11y intensity hooks, battery APIs, OS System Haptics query (D-09/D-10).
 */
export function createDefaultHapticsService(): HapticsService {
  try {
    if (!isExpoHapticsNativeAvailable()) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(
          '[haptics] ExpoHaptics native module missing — using memory HapticsService (no Taptic). Rebuild with `npx expo run:ios` or `npx expo run:android` after adding expo-haptics.',
        );
      }
      return createMemoryHapticsService();
    }
    return createExpoHapticsService();
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[haptics] createDefaultHapticsService soft-fail', err);
    }
    return createMemoryHapticsService();
  }
}
