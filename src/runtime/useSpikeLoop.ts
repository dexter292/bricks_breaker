/**
 * @deprecated Prefer `useGameLoop`. Thin spike wrapper until Plan 05 removes the cliff harness.
 * Creates blank Intent SharedValues (paddle hold / no launch) so SpikeScreen still typechecks.
 */
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import type { SkFont, SkPicture, SkSize } from '@shopify/react-native-skia';
import type { World } from '../core';
import { SPRITE_CAP } from './constants';
import type { SpikeMetrics } from './metrics';
import { useGameLoop, UiPhaseNum } from './useGameLoop';

export type SpikeLoopHandle = {
  world: SharedValue<World | null>;
  picture: SharedValue<SkPicture>;
  metrics: SharedValue<SpikeMetrics | null>;
  /** Benign counter for overlay metrics (not sprite SoA). */
  spriteTarget: SharedValue<number>;
  surfaceSize: SharedValue<SkSize>;
};

export function useSpikeLoop(
  drawOverlayFlag: boolean,
  initialSprites: number = SPRITE_CAP,
  hudFont: SkFont | null = null,
): SpikeLoopHandle {
  // Blank Intent hold until Plan 05 GameHost owns gestures.
  const paddleTarget = useSharedValue(180);
  const launchFlag = useSharedValue(0);
  const uiPhase = useSharedValue(UiPhaseNum.PLAYING);

  const loop = useGameLoop({
    paddleTarget,
    launchFlag,
    uiPhase,
    drawOverlayFlag,
    hudFont,
    initialSprites,
  });

  return {
    world: loop.world,
    picture: loop.picture,
    metrics: loop.metrics,
    spriteTarget: loop.spriteTarget,
    surfaceSize: loop.surfaceSize,
  };
}
