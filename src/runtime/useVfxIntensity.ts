import { useEffect } from 'react';
import {
  AccessibilityInfo,
  type EmitterSubscription,
} from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { intensityFromReduceMotion } from '../vfx';

/**
 * OS reduce-motion → global VFX intensity SharedValue (D-03).
 * AccessibilityInfo (not useReducedMotion alone) so live toggles update.
 * Defaults: off → 1.0, on → 0.2 (dampen, never binary off).
 */
export function useVfxIntensity(): SharedValue<number> {
  const vfxIntensity = useSharedValue(1.0);

  useEffect(() => {
    let sub: EmitterSubscription | { remove: () => void } | undefined;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        vfxIntensity.value = intensityFromReduceMotion(enabled);
      })
      .catch(() => {
        // Soft-fail: keep default full intensity
        vfxIntensity.value = 1.0;
      });

    sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        vfxIntensity.value = intensityFromReduceMotion(enabled);
      },
    );

    return () => {
      sub?.remove();
    };
  }, [vfxIntensity]);

  return vfxIntensity;
}
