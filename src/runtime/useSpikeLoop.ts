import { useEffect } from 'react';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import type { SkFont, SkPicture, SkSize } from '@shopify/react-native-skia';
import { Skia } from '@shopify/react-native-skia';
import { allocateWorld, stepWorld, type World } from '../core';
import { recordFrame } from '../render/recordSprites';
import {
  FIXED_DT,
  MAX_FRAME_TIME,
  MAX_SUBSTEPS,
  SELF_CHECK_FRAMES,
  SPRITE_CAP,
} from './constants';
import { createMetrics, pushSample, type SpikeMetrics } from './metrics';

/* World / metrics live in SharedValues and are mutated on the UI runtime
 * by design (useFrameCallback). React Compiler immutability does not apply (D-14). */
const WIN = Dimensions.get('window');

export type SpikeLoopHandle = {
  world: SharedValue<World | null>;
  picture: SharedValue<SkPicture>;
  metrics: SharedValue<SpikeMetrics | null>;
  /** Benign counter for overlay metrics (not sprite SoA). */
  spriteTarget: SharedValue<number>;
  surfaceSize: SharedValue<SkSize>;
};

function makeEmptyPicture(): SkPicture {
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return rec.finishRecordingAsPicture();
}

/**
 * UI-runtime fixed-timestep host (D-06 / D-13 / D-14).
 * World + metrics allocate on the first UI frame (no runOnUI) so typed arrays
 * never cross the RN→UI boundary. Blank playfield until Phase 3 owns visuals.
 */
export function useSpikeLoop(
  drawOverlayFlag: boolean,
  initialSprites: number = SPRITE_CAP,
  hudFont: SkFont | null = null,
): SpikeLoopHandle {
  const picture = useSharedValue<SkPicture>(makeEmptyPicture());
  const world = useSharedValue<World | null>(null);
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
  const fixedDt = FIXED_DT;
  const maxSubsteps = MAX_SUBSTEPS;
  const maxFrameTime = MAX_FRAME_TIME;
  const selfCheckFrames = SELF_CHECK_FRAMES;

  useFrameCallback((frame) => {
    'worklet';
    let w = world.value;
    let m = metrics.value;
    if (!w) {
      w = allocateWorld();
      world.value = w;
    }
    if (!m) {
      m = createMetrics();
      metrics.value = m;
    }

    let dt = (frame.timeSincePreviousFrame ?? 16.67) / 1000;
    if (dt > maxFrameTime) dt = maxFrameTime;

    w.accumulator += dt;
    let steps = 0;
    while (w.accumulator >= fixedDt && steps < maxSubsteps) {
      // Static Intent until Phase 3 gestures — paddle holds current SoA value.
      stepWorld(w, { paddleX: w.paddleX, launch: 0 }, fixedDt);
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
      spriteTarget.value,
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
