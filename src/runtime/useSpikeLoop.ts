/**
 * @deprecated Prefer `useGameLoop`. Thin spike wrapper until Plan 05 removes the cliff harness.
 * Creates blank Intent SharedValues (paddle hold / no launch) so SpikeScreen still typechecks.
 */
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import type { SkFont, SkPicture, SkSize } from '@shopify/react-native-skia';
import type { World, CompiledLevel } from '../core';
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
  const uiPhase = useSharedValue<number>(UiPhaseNum.PLAYING);
  const livesOut = useSharedValue(3);
  const simPhaseOut = useSharedValue(0);
  const scoreOut = useSharedValue<number>(0);
  const comboOut = useSharedValue(1);
  const stallTierOut = useSharedValue<number>(0);
  const compiled = useSharedValue<CompiledLevel | null>(null);

  const loop = useGameLoop({
    paddleTarget,
    launchFlag,
    uiPhase,
    livesOut,
    simPhaseOut,
    scoreOut,
    comboOut,
    stallTierOut,
    compiled,
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
