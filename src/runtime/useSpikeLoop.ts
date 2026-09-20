/* eslint-disable react-hooks/immutability --
 * SpikeWorld lives in a SharedValue and is mutated on the UI runtime by design
 * (allocate via runOnUI, step via useFrameCallback). React Compiler's immutability
 * rule does not understand Reanimated shared-value mutation (D-14 / Pattern A).
 */
import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { runOnUI } from 'react-native-worklets';
import type { SkPicture, SkSize } from '@shopify/react-native-skia';
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

/** Empty picture placeholder until the first frame records (avoids null AnimatedProp). */
const EMPTY_PICTURE: SkPicture = (() => {
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return rec.finishRecordingAsPicture();
})();

const WIN = Dimensions.get('window');

export type SpikeLoopHandle = {
  world: SharedValue<SpikeWorld | null>;
  picture: SharedValue<SkPicture>;
  metrics: SharedValue<SpikeMetrics>;
  /** Discrete cliff-ramp target (D-07); applied on UI thread inside the frame callback. */
  spriteTarget: SharedValue<number>;
  /** Canvas surface size in points (seeded from window, refined by onSize). */
  surfaceSize: SharedValue<SkSize>;
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
  const picture = useSharedValue<SkPicture>(EMPTY_PICTURE);
  const metrics = useSharedValue<SpikeMetrics>(createMetrics());
  const spriteTarget = useSharedValue(initialSprites);
  const surfaceSize = useSharedValue<SkSize>({
    width: WIN.width,
    height: WIN.height,
  });

  // Freeze overlay flag into the worklet closure once at mount (D-08 / D-14).
  const overlayEnabled = drawOverlayFlag;

  // Capture numeric consts into locals so UI worklets do not depend on
  // cross-module import bindings (same class of bug as METRICS_WINDOW default).
  const fixedDt = FIXED_DT;
  const maxSubsteps = MAX_SUBSTEPS;
  const maxFrameTime = MAX_FRAME_TIME;
  const selfCheckFrames = SELF_CHECK_FRAMES;

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
    if (dt > maxFrameTime) dt = maxFrameTime;

    w.accumulator += dt;
    let steps = 0;
    while (w.accumulator >= fixedDt && steps < maxSubsteps) {
      stepStub(w, fixedDt);
      w.accumulator -= fixedDt;
      steps += 1;
    }
    if (steps === maxSubsteps) {
      w.accumulator = 0;
    }

    pushSample(
      metrics.value,
      dt * 1000,
      steps,
      w.spriteCount,
      w.tick,
      selfCheckFrames,
    );

    const size = surfaceSize.value;
    picture.value = recordFrame(
      w,
      metrics.value,
      size.width,
      size.height,
      overlayEnabled,
    );
  });

  return { world, picture, metrics, spriteTarget, surfaceSize };
}
