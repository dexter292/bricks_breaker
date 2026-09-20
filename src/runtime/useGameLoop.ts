import { useCallback, useEffect } from 'react';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import type { SkFont, SkPicture, SkSize } from '@shopify/react-native-skia';
import { Skia } from '@shopify/react-native-skia';
import {
  allocateWorld,
  applyCompiledLevel,
  dockBall,
  resetWorld,
  stepRun,
  SimPhase,
  type CompiledLevel,
  type World,
} from '../core';
import { recordFrame } from '../render/recordSprites';
import { subscribeAppStateAutoPause } from './appStatePause';
import {
  FIXED_DT,
  MAX_FRAME_TIME,
  MAX_SUBSTEPS,
  SELF_CHECK_FRAMES,
  SPRITE_CAP,
} from './constants';
import { createMetrics, pushSample, type SpikeMetrics } from './metrics';

/** Inline in this module so Babel workletizes with the frame callback (imported worklets can stay JS remotes). */
function clampFrameDtLocal(dtSec: number, maxFrameTime: number): number {
  'worklet';
  if (!Number.isFinite(dtSec)) {
    return 1 / 60;
  }
  return Math.min(dtSec, maxFrameTime);
}

function resetAccumulatorLocal(world: { accumulator: number }): void {
  'worklet';
  world.accumulator = 0;
}

/* World / metrics live in SharedValues and are mutated on the UI runtime
 * by design (useFrameCallback). React Compiler immutability does not apply (D-14). */
const WIN = Dimensions.get('window');

/** Default RNG seeds — match allocateWorld literals. */
const SEED_GAMEPLAY = 0xc0ffee01;
const SEED_COSMETIC = 0xbadc0de2;

/**
 * Numeric uiPhase map (mirrors gesture hook / Plan 05):
 * 0 = playing, 1 = paused, 2 = countdown
 */
export const UiPhaseNum = {
  PLAYING: 0,
  PAUSED: 1,
  COUNTDOWN: 2,
} as const;

export type GameLoopHandle = {
  world: SharedValue<World | null>;
  picture: SharedValue<SkPicture>;
  surfaceSize: SharedValue<SkSize>;
  setActive: (active: boolean) => void;
  retry: () => void;
};

export type UseGameLoopOptions = {
  paddleTarget: SharedValue<number>;
  launchFlag: SharedValue<number>;
  /** 0 playing, 1 paused, 2 countdown */
  uiPhase: SharedValue<number>;
  /** Host-owned mirrors written every frame (in-place World edits are silent). */
  livesOut: SharedValue<number>;
  simPhaseOut: SharedValue<number>;
  scoreOut: SharedValue<number>;
  comboOut: SharedValue<number>;
  stallTierOut: SharedValue<number>;
  /**
   * JS-thread validated/compiled level. Worklets only apply — never parse (D-04, D-14).
   * Null → skip apply (host shows LevelErrorOverlay / gate setActive).
   */
  compiled: SharedValue<CompiledLevel | null>;
  /** Invoked from AppState auto-pause path (Task 2); host sets React pause UI. */
  onOsPause?: () => void;
  drawOverlayFlag?: boolean;
  hudFont?: SkFont | null;
  /** PERF_OVERLAY / cliff harness sprite count (until Plan 05). */
  initialSprites?: number;
};

function makeEmptyPicture(): SkPicture {
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return rec.finishRecordingAsPicture();
}

/**
 * When frozen → setActive(false) (+ accumulator reset via setActive).
 * When unfrozen → setActive(true) only — caller owns Resume→countdown first.
 */
export function applyFreeze(
  _worldSv: SharedValue<World | null>,
  setActive: (active: boolean) => void,
  frozen: boolean,
): void {
  setActive(!frozen ? true : false);
}

/**
 * Playable fixed-timestep host: Intent SharedValues → stepRun → letterboxed recordFrame.
 * Freeze via setActive(false) + resetAccumulator; never auto-resume (PLT-01 / PHYS-05).
 */
export function useGameLoop(options: UseGameLoopOptions): GameLoopHandle & {
  metrics: SharedValue<SpikeMetrics | null>;
  spriteTarget: SharedValue<number>;
} {
  const {
    paddleTarget,
    launchFlag,
    uiPhase,
    livesOut,
    simPhaseOut,
    scoreOut,
    comboOut,
    stallTierOut,
    compiled,
    drawOverlayFlag = false,
    hudFont = null,
    initialSprites = SPRITE_CAP,
  } = options;

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

  /* eslint-disable react-hooks/immutability -- SharedValue Intent/world writes on UI runtime (D-14) */
  // autostart false: host gates setActive until JS-thread loadAndCompile succeeds (D-13, D-14)
  const frameCallback = useFrameCallback((frame) => {
    'worklet';
    let w = world.value;
    let m = metrics.value;
    if (!w) {
      w = allocateWorld();
      resetWorld(w, SEED_GAMEPLAY, SEED_COSMETIC);
      const level = compiled.value;
      if (level != null) {
        applyCompiledLevel(w, level);
      }
      paddleTarget.value = w.paddleX;
      world.value = w;
      livesOut.value = w.lives;
      simPhaseOut.value = w.simPhase;
      scoreOut.value = w.score;
      comboOut.value = w.combo;
      stallTierOut.value = w.stallTier;
    }
    if (!m) {
      m = createMetrics();
      metrics.value = m;
    }

    // First frame after reactivate: timeSincePreviousFrame is null → ~16.67ms
    const dt = clampFrameDtLocal(
      (frame.timeSincePreviousFrame ?? 16.67) / 1000,
      maxFrameTime,
    );

    const ui = uiPhase.value;
    const uiFrozen =
      ui === UiPhaseNum.PAUSED || ui === UiPhaseNum.COUNTDOWN;
    const simFrozen =
      w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST;

    // Belt: skip stepping when frozen, but still refresh picture if callback active
    if (!uiFrozen && !simFrozen) {
      w.accumulator += dt;
      let steps = 0;
      while (w.accumulator >= fixedDt && steps < maxSubsteps) {
        const intent = {
          paddleX: paddleTarget.value,
          launch: launchFlag.value,
        };
        stepRun(w, intent, fixedDt);
        // Edge-consume launch after the step that saw it
        if (launchFlag.value !== 0) {
          launchFlag.value = 0;
        }
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
    }

    // Publish chrome mirrors every frame (in-place World edits are invisible to reactions)
    livesOut.value = w.lives;
    simPhaseOut.value = w.simPhase;
    scoreOut.value = w.score;
    comboOut.value = w.combo;
    stallTierOut.value = w.stallTier;

    const size = surfaceSize.value;
    picture.value = recordFrame(
      w,
      m,
      size.width,
      size.height,
      overlayEnabled,
      hudFontSv.value,
    );
  }, false);
  /* eslint-enable react-hooks/immutability */

  const setActive = useCallback(
    (active: boolean) => {
      frameCallback.setActive(active);
      if (!active) {
        const w = world.value;
        if (w) {
          resetAccumulatorLocal(w);
        }
      }
    },
    [frameCallback, world],
  );

  const retry = useCallback(() => {
    // Discrete phase transition on JS thread (Plan 04 contract — app never imports core).
    // Reloads current compiled only — never cycles levels (D-11).
    const w = world.value;
    if (!w) {
      return;
    }
    resetWorld(w, SEED_GAMEPLAY, SEED_COSMETIC);
    const level = compiled.value;
    if (level != null) {
      applyCompiledLevel(w, level);
    }
    dockBall(w);
    /* eslint-disable react-hooks/immutability -- SharedValue writes (D-14) */
    launchFlag.value = 0;
    paddleTarget.value = w.paddleX;
    livesOut.value = w.lives;
    simPhaseOut.value = w.simPhase;
    scoreOut.value = w.score;
    comboOut.value = w.combo;
    stallTierOut.value = w.stallTier;
    /* eslint-enable react-hooks/immutability */
  }, [
    world,
    compiled,
    launchFlag,
    paddleTarget,
    livesOut,
    simPhaseOut,
    scoreOut,
    comboOut,
    stallTierOut,
  ]);

  // AppState auto-pause: freeze + resetAccumulator; never setActive(true) on foreground (D-15).
  // Returning to `active` stays frozen until Resume → countdown (Plan 05).
  const onOsPause = options.onOsPause;
  useEffect(() => {
    const sub = subscribeAppStateAutoPause({
      onAutoPause: () => {
        // setActive(false) also resets accumulator via handle contract
        setActive(false);
        uiPhase.value = UiPhaseNum.PAUSED;
        onOsPause?.();
      },
    });
    return () => {
      sub.remove();
    };
  }, [setActive, uiPhase, onOsPause]);

  return {
    world,
    picture,
    surfaceSize,
    setActive,
    retry,
    metrics,
    spriteTarget,
  };
}
