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
import { Dimensions } from 'react-native';
import type { SkFont, SkPicture, SkSize } from '@shopify/react-native-skia';
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

const WIN = Dimensions.get('window');

export type SpikeLoopHandle = {
  world: SharedValue<SpikeWorld | null>;
  picture: SharedValue<SkPicture>;
  metrics: SharedValue<SpikeMetrics | null>;
  spriteTarget: SharedValue<number>;
  surfaceSize: SharedValue<SkSize>;
};

function applySpriteTarget(w: SpikeWorld, target: number): void {
  'worklet';
  if (target > 0 && target !== w.spriteCount) {
    const max = w.x.length;
    w.spriteCount = target < max ? target : max;
  }
}

function makeEmptyPicture(): SkPicture {
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return rec.finishRecordingAsPicture();
}

/**
 * UI-runtime fixed-timestep host (D-06 / D-13 / D-14).
 * World + metrics allocate on the first UI frame (no runOnUI) so typed arrays
 * never cross the RN→UI boundary.
 */
export function useSpikeLoop(
  drawOverlayFlag: boolean,
  initialSprites: number = SPRITE_CAP,
  hudFont: SkFont | null = null,
): SpikeLoopHandle {
  const picture = useSharedValue<SkPicture>(makeEmptyPicture());
  const world = useSharedValue<SpikeWorld | null>(null);
  const metrics = useSharedValue<SpikeMetrics | null>(null);
  const spriteTarget = useSharedValue(initialSprites);
  const surfaceSize = useSharedValue<SkSize>({
    width: WIN.width,
    height: WIN.height,
  });
  const hudFontSv = useSharedValue<SkFont | null>(null);

  useEffect(() => {
    hudFontSv.value = hudFont;
  }, [hudFont, hudFontSv]);

  const overlayEnabled = drawOverlayFlag;
  const capacity = Math.max(initialSprites, 300);
  const fixedDt = FIXED_DT;
  const maxSubsteps = MAX_SUBSTEPS;
  const maxFrameTime = MAX_FRAME_TIME;
  const selfCheckFrames = SELF_CHECK_FRAMES;

  useFrameCallback((frame) => {
    'worklet';
    let w = world.value;
    let m = metrics.value;
    if (!w) {
      w = allocateWorld(capacity);
      world.value = w;
    }
    if (!m) {
      m = createMetrics();
      metrics.value = m;
    }

    applySpriteTarget(w, spriteTarget.value);

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
      m,
      dt * 1000,
      steps,
      w.spriteCount,
      w.tick,
      selfCheckFrames,
    );

    const size = surfaceSize.value;
    picture.value = recordFrame(
      w,
      m,
      size.width,
      size.height,
      overlayEnabled,
      hudFontSv.value,
    );
  });

  return { world, picture, metrics, spriteTarget, surfaceSize };
}
