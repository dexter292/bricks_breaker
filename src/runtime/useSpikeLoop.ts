/* eslint-disable react-hooks/immutability --
 * SpikeWorld lives in a SharedValue and is mutated on the UI runtime by design
 * (allocate via runOnUI, step via useFrameCallback). React Compiler's immutability
 * rule does not understand Reanimated shared-value mutation (D-14 / Pattern A).
 */
import { useEffect } from 'react';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { runOnUI } from 'react-native-worklets';
import type { SkPicture, SkRect } from '@shopify/react-native-skia';
import { Skia } from '@shopify/react-native-skia';
import { allocateWorld, stepStub, type SpikeWorld } from '../core';
import { recordFrame } from '../render/recordSprites';
import {
  FIXED_DT,
  MAX_FRAME_TIME,
  MAX_SUBSTEPS,
  SELF_CHECK_FRAMES,
  SPRITE_CAP,
} from './constants';
import { createMetrics, pushSample, type SpikeMetrics } from './metrics';

export type SpikeLoopHandle = {
  world: SharedValue<SpikeWorld | null>;
  picture: SharedValue<SkPicture | null>;
  metrics: SharedValue<SpikeMetrics>;
  /** Discrete cliff-ramp target (D-07); applied on UI thread inside the frame callback. */
  spriteTarget: SharedValue<number>;
  bounds: SkRect;
};

function applySpriteTarget(w: SpikeWorld, target: number): void {
  'worklet';
  if (target > 0 && target !== w.spriteCount) {
    const max = w.x.length;
    w.spriteCount = target < max ? target : max;
  }
}

/**
 * UI-runtime fixed-timestep host (D-06 / D-13 / D-14).
 * World is allocated via runOnUI — never on the JS thread (Pattern A).
 */
export function useSpikeLoop(
  drawOverlayFlag: boolean,
  initialSprites: number = SPRITE_CAP,
): SpikeLoopHandle {
  const world = useSharedValue<SpikeWorld | null>(null);
  const picture = useSharedValue<SkPicture | null>(null);
  const metrics = useSharedValue<SpikeMetrics>(createMetrics());
  const spriteTarget = useSharedValue(initialSprites);
  // Logical play-field bounds in core units (host maps via canvas flex).
  const bounds = Skia.XYWHRect(0, 0, 360, 640);

  // Freeze overlay flag into the worklet closure once at mount (D-08 / D-14).
  const overlayEnabled = drawOverlayFlag;

  useEffect(() => {
    const capacity = Math.max(initialSprites, 300);
    runOnUI((cap: number) => {
      'worklet';
      world.value = allocateWorld(cap);
      metrics.value = createMetrics();
    })(capacity);
    // SharedValue identities are stable; allocate once on mount / sprite-cap change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- world/metrics refs must not retrigger
  }, [initialSprites]);

  useFrameCallback((frame) => {
    'worklet';
    const w = world.value;
    if (!w) return;

    // Apply discrete sprite-count target (cliff ramp) without JS hops.
    applySpriteTarget(w, spriteTarget.value);

    // timeSincePreviousFrame is ms; null on the first frame.
    let dt = (frame.timeSincePreviousFrame ?? 16.67) / 1000;
    if (dt > MAX_FRAME_TIME) dt = MAX_FRAME_TIME;

    w.accumulator += dt;
    let steps = 0;
    while (w.accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
      stepStub(w, FIXED_DT);
      w.accumulator -= FIXED_DT;
      steps += 1;
    }
    if (steps === MAX_SUBSTEPS) {
      w.accumulator = 0;
    }

    pushSample(
      metrics.value,
      dt * 1000,
      steps,
      w.spriteCount,
      w.tick,
      SELF_CHECK_FRAMES,
    );

    picture.value = recordFrame(w, metrics.value, bounds, overlayEnabled);
  });

  return { world, picture, metrics, spriteTarget, bounds };
}
