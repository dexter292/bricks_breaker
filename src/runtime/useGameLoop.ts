import { useCallback, useEffect, useRef } from 'react';
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
  applyServe,
  dockBall,
  EventCode,
  resetWorld,
  spawnMultiballFromPaddle,
  stepRun,
  SimPhase,
  type CompiledLevel,
  type World,
} from '../core';
import {
  recordFrame,
  type DestroyFlashState,
} from '../render/recordSprites';
import type { GlowAtlas } from '../render/textures/bakeGlowSprites';
import {
  allocateVfx,
  appendEventsForAudio,
  consumeEventsForVfx,
  createAudioBatch,
  IMPULSE_LIFE_LOST,
  punchShake,
  pushTrail,
  resetAudioBatch,
  spawnBurst,
  stepVfx,
  trailLength,
  type AudioBatchSoA,
  type VfxState,
} from '../vfx';

import { subscribeAppStateAutoPause } from './appStatePause';
import {
  FIXED_DT,
  MAX_FRAME_TIME,
  MAX_SUBSTEPS,
  SELF_CHECK_FRAMES,
  SPRITE_CAP,
} from './constants';
import { flushAudioBatchOnJS } from './eventBridge';
import { createMetrics, pushSample, type SpikeMetrics } from './metrics';
import type { VfxBudget } from './resolveQualityTier';
import { BUDGETS } from './resolveQualityTier';

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

/** Brief destroy flash ≤100ms — Plan 04 draw path; life owned here (Plan 05). */
function punchDestroyFlash(
  flash: DestroyFlashState,
  x: number,
  y: number,
): void {
  'worklet';
  flash.x = x;
  flash.y = y;
  flash.life = 0.1;
  flash.lifeMax = 0.1;
}

/** Scan ring for BRICK_BREAK after consume (ring still live until next stepRun clear). */
function updateFlashFromEvents(world: World, flash: DestroyFlashState): void {
  'worklet';
  const n = world.evCount;
  if (n <= 0) {
    return;
  }
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    if (world.evCode[idx] === EventCode.BRICK_BREAK) {
      punchDestroyFlash(flash, world.evX[idx], world.evY[idx]);
    }
  }
}

function decayFlash(flash: DestroyFlashState, dt: number): void {
  'worklet';
  if (flash.life <= 0) {
    return;
  }
  flash.life -= dt;
  if (flash.life < 0) {
    flash.life = 0;
  }
}

function pushActiveBallTrails(
  world: World,
  vfx: VfxState,
  intensity: number,
): void {
  'worklet';
  // Tier trailMax is hard ceiling; intensity dampens within (D-09).
  const len = Math.min(trailLength(intensity), vfx.trailMax);
  const limit = world.activeBallCount;
  for (let i = 0; i < limit; i++) {
    if (world.ballActive[i] !== 1) {
      continue;
    }
    pushTrail(vfx, i, world.ballX[i], world.ballY[i], len);
  }
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

export type PlayBatchFn = (
  codes: ArrayLike<number>,
  count: number,
) => void;

export type GameLoopHandle = {
  world: SharedValue<World | null>;
  picture: SharedValue<SkPicture>;
  surfaceSize: SharedValue<SkSize>;
  setActive: (active: boolean) => void;
  retry: () => void;
  /**
   * DEV-only one-shot worst-case inject (PLT-03 / D-14): ≥3 balls, particles
   * near Mid cap, shake punched. Discrete cold path — never per-frame.
   */
  injectCertWorstCase: () => void;
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
  /** Global VFX intensity from useVfxIntensity (D-03). Defaults to 1.0 when omitted. */
  vfxIntensity?: SharedValue<number>;
  /**
   * RN-scoped playBatch for scheduleOnRN (must NOT live in a SharedValue —
   * Worklets rejects assigning JS functions into SVs). Host passes a stable
   * useCallback that reads a ref; soft-fail no-ops until preload binds it.
   * Never import services/ here.
   */
  playBatch?: PlayBatchFn;
  /** Baked glow atlas from PlayingHost cold path; null until bake completes. */
  glowAtlas?: SharedValue<GlowAtlas | null>;
  /**
   * Numeric VFX budget from resolveQualityTier (plain numbers — not SharedValue).
   * Applied once at allocateVfx; host remounts/clears VFX when budget changes.
   */
  vfxBudget?: VfxBudget;
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
 * Phase 7: per-substep VFX/audio drain + one batched audio hop via eventBridge.
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
  const vfxSv = useSharedValue<VfxState | null>(null);
  const audioBatchSv = useSharedValue<AudioBatchSoA | null>(null);
  const flashSv = useSharedValue<DestroyFlashState>({
    x: 0,
    y: 0,
    life: 0,
    lifeMax: 0.1,
  });
  const defaultIntensity = useSharedValue(1.0);
  const defaultGlowAtlas = useSharedValue<GlowAtlas | null>(null);
  const vfxIntensity = options.vfxIntensity ?? defaultIntensity;
  /** Captured from RN scope into the frame worklet for scheduleOnRN. */
  const playBatchFn = options.playBatch;
  const glowAtlas = options.glowAtlas ?? defaultGlowAtlas;
  const vfxBudget = options.vfxBudget ?? BUDGETS.mid;
  const budgetParticleCap = vfxBudget.particleCap;
  const budgetTrailMax = vfxBudget.trailMax;
  const budgetGlowScale = vfxBudget.glowScale;
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
    let vfx = vfxSv.value;
    let batch = audioBatchSv.value;
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
    if (!vfx) {
      vfx = allocateVfx({
        maxBalls: w.maxBalls,
        particleCap: budgetParticleCap,
        trailMax: budgetTrailMax,
        glowScale: budgetGlowScale,
      });
      vfxSv.value = vfx;
    }
    if (!batch) {
      batch = createAudioBatch();
      audioBatchSv.value = batch;
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

    const intensity = vfxIntensity.value;
    const flash = flashSv.value;

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
        // Per-substep drain BEFORE next clearEvents (Pitfall 1 / FX-03)
        consumeEventsForVfx(w, vfx, intensity);
        appendEventsForAudio(w, batch);
        updateFlashFromEvents(w, flash);
        pushActiveBallTrails(w, vfx, intensity);
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

    // Cosmetic decay even while frozen (pause / won / lost) — no new audio from idle ring.
    // Use wall-clock dt (same as decayFlash) so sparks/shake match flash under dropped FPS.
    stepVfx(vfx, dt, intensity);
    decayFlash(flash, dt);

    // Exactly one audio hop / frame from eventBridge (LC-07).
    // playBatchFn is RN-scoped (host useCallback) — never read from a SharedValue.
    if (playBatchFn != null && batch.count > 0) {
      flushAudioBatchOnJS(playBatchFn, batch.codes, batch.count);
      resetAudioBatch(batch);
    } else if (batch.count > 0) {
      // Soft-fail: drop batch rather than leak across frames without a player
      resetAudioBatch(batch);
    }

    // Publish chrome mirrors every frame (in-place World edits are invisible to reactions)
    livesOut.value = w.lives;
    simPhaseOut.value = w.simPhase;
    scoreOut.value = w.score;
    comboOut.value = w.combo;
    stallTierOut.value = w.stallTier;

    const size = surfaceSize.value;
    const flashArg: DestroyFlashState | null =
      flash.life > 0 ? flash : null;
    picture.value = recordFrame(
      w,
      m,
      size.width,
      size.height,
      overlayEnabled,
      hudFontSv.value,
      vfx,
      intensity,
      glowAtlas.value,
      flashArg,
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
    // Reset cosmetic flash; keep Vfx pools (particles decay via stepVfx)
    flashSv.value = { x: 0, y: 0, life: 0, lifeMax: 0.1 };
    const batch = audioBatchSv.value;
    if (batch) {
      resetAudioBatch(batch);
    }
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
    flashSv,
    audioBatchSv,
  ]);

  // Tier budget change (DEV override): drop VFX pools so next frame reallocates
  // with new caps — never mutate typed-array sizes mid-frame (Pitfall 5).
  const prevBudgetRef = useRef({
    particleCap: budgetParticleCap,
    trailMax: budgetTrailMax,
    glowScale: budgetGlowScale,
  });
  useEffect(() => {
    const prev = prevBudgetRef.current;
    if (
      prev.particleCap === budgetParticleCap &&
      prev.trailMax === budgetTrailMax &&
      prev.glowScale === budgetGlowScale
    ) {
      return;
    }
    prevBudgetRef.current = {
      particleCap: budgetParticleCap,
      trailMax: budgetTrailMax,
      glowScale: budgetGlowScale,
    };
    vfxSv.value = null;
    retry();
  }, [budgetParticleCap, budgetTrailMax, budgetGlowScale, vfxSv, retry]);

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

  /**
   * DEV cert worst-case (D-14): one-shot runtime inject — not DROP_CHANCE / core RNG.
   * No-ops outside __DEV__; adds zero per-frame work when unused.
   */
  const injectCertWorstCase = useCallback(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) {
      return;
    }
    let w = world.value;
    if (!w) {
      w = allocateWorld();
      resetWorld(w, SEED_GAMEPLAY, SEED_COSMETIC);
      const level = compiled.value;
      if (level != null) {
        applyCompiledLevel(w, level);
      }
      world.value = w;
    }

    // Leave DOCKED so processDocked cannot wipe extra balls next step.
    if (w.simPhase === SimPhase.DOCKED) {
      applyServe(w, 360);
      w.simPhase = SimPhase.PLAYING;
    } else if (
      w.simPhase === SimPhase.WON ||
      w.simPhase === SimPhase.LOST
    ) {
      // Re-enter playable state for measurement window
      resetWorld(w, SEED_GAMEPLAY, SEED_COSMETIC);
      const level = compiled.value;
      if (level != null) {
        applyCompiledLevel(w, level);
      }
      applyServe(w, 360);
      w.simPhase = SimPhase.PLAYING;
    }

    // ≥3 active balls via multiball helper (no DROP_CHANCE change).
    let guard = 0;
    while (w.activeBallCount < 3 && w.activeBallCount < w.maxBalls && guard < 4) {
      const before = w.activeBallCount;
      spawnMultiballFromPaddle(w);
      if (w.activeBallCount <= before) {
        break;
      }
      guard += 1;
    }

    let vfx = vfxSv.value;
    if (!vfx) {
      vfx = allocateVfx({
        maxBalls: w.maxBalls,
        particleCap: budgetParticleCap,
        trailMax: budgetTrailMax,
        glowScale: budgetGlowScale,
      });
      vfxSv.value = vfx;
    }

    // Flood particles near Mid particleCap (cosmetic only).
    let seed = 0.314159;
    const rng = () => {
      seed = (seed * 1.6180339887) % 1;
      return seed;
    };
    const nearCap = Math.max(0, vfx.particleCap - 4);
    let bursts = 0;
    while (vfx.particleCount < nearCap && bursts < 64) {
      spawnBurst(vfx, {
        kind: 'destroy',
        x: 120 + (bursts % 8) * 24,
        y: 160 + (bursts % 6) * 28,
        rgb: { r: 0.2, g: 0.85, b: 1 },
        intensity: 1,
        rng,
      });
      bursts += 1;
    }

    // Punch shake so amp is decaying during the measurement window.
    punchShake(vfx, IMPULSE_LIFE_LOST, 1);

    /* eslint-disable react-hooks/immutability -- SharedValue chrome mirrors (D-14) */
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
    vfxSv,
    budgetParticleCap,
    budgetTrailMax,
    budgetGlowScale,
    launchFlag,
    paddleTarget,
    livesOut,
    simPhaseOut,
    scoreOut,
    comboOut,
    stallTierOut,
  ]);

  return {
    world,
    picture,
    surfaceSize,
    setActive,
    retry,
    injectCertWorstCase,
    metrics,
    spriteTarget,
  };
}
