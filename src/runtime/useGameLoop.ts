import { useCallback, useEffect, useRef } from 'react';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import type { SkFont, SkPicture, SkSize } from '@shopify/react-native-skia';
import { Skia } from '@shopify/react-native-skia';
import {
  allocateWorld,
  EventCode,
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
  pushTrail,
  resetAudioBatch,
  stepVfx,
  trailLength,
  clearTrailsFromIndex,
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
import {
  applyCertWorstCaseInject,
  applyRetryWorldReset,
  clearCosmeticVfx,
} from './worldRequests';
import { remainderAfterSubstepCap } from './substepCap';

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

declare const global: typeof globalThis & {
  __gameIntent?: { paddleX: number; launch: number };
};

function intentScratch(): { paddleX: number; launch: number } {
  'worklet';
  let intent = global.__gameIntent;
  if (intent == null) {
    intent = { paddleX: 0, launch: 0 };
    global.__gameIntent = intent;
  }
  return intent;
}

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
    width: 0,
    height: 0,
  });
  const hudFontSv = useSharedValue<SkFont | null>(null);

  // RN→UI request counters (F-01): JS only bumps; frame callback applies on live World.
  const resetRequest = useSharedValue(0);
  const resetApplied = useSharedValue(0);
  const certRequest = useSharedValue(0);
  const certApplied = useSharedValue(0);
  const accumResetRequest = useSharedValue(0);
  const accumResetApplied = useSharedValue(0);
  /** Prior-frame live ball count — clear trails when count drops (F-16). */
  const lastTrailBallCount = useSharedValue(-1);

  useEffect(() => {
    hudFontSv.value = hudFont;
  }, [hudFont, hudFontSv]);

  const overlayEnabled = drawOverlayFlag;
  const fixedDt = FIXED_DT;
  const maxSubsteps = MAX_SUBSTEPS;
  const maxFrameTime = MAX_FRAME_TIME;
  const selfCheckFrames = SELF_CHECK_FRAMES;

  /* eslint-disable react-hooks/immutability -- SharedValue Intent/world writes on UI runtime (D-14) */
  // Stable callback identity (F-10): SharedValues are stable; avoid re-registering every React render.
  const onFrame = useCallback((frame: { timeSincePreviousFrame: number | null }) => {
    'worklet';
    let w = world.value;
    let m = metrics.value;
    let vfx = vfxSv.value;
    let batch = audioBatchSv.value;
    if (!w) {
      w = allocateWorld();
      applyRetryWorldReset(w, compiled.value);
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

    // Apply discrete RN requests on the live World (never mutate SharedValue clones on JS).
    if (resetRequest.value !== resetApplied.value) {
      resetApplied.value = resetRequest.value;
      applyRetryWorldReset(w, compiled.value);
      clearCosmeticVfx(vfx);
      const flash = flashSv.value;
      flash.x = 0;
      flash.y = 0;
      flash.life = 0;
      flash.lifeMax = 0.1;
      resetAudioBatch(batch);
      launchFlag.value = 0;
      paddleTarget.value = w.paddleX;
      w.accumulator = 0;
    }
    if (certRequest.value !== certApplied.value) {
      certApplied.value = certRequest.value;
      applyCertWorstCaseInject(w, vfx, compiled.value);
      launchFlag.value = 0;
      paddleTarget.value = w.paddleX;
    }
    if (accumResetRequest.value !== accumResetApplied.value) {
      accumResetApplied.value = accumResetRequest.value;
      resetAccumulatorLocal(w);
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
        const intent = intentScratch();
        intent.paddleX = paddleTarget.value;
        intent.launch = launchFlag.value;
        stepRun(w, intent, fixedDt);
        // Per-substep drain BEFORE next clearEvents (Pitfall 1 / FX-03)
        consumeEventsForVfx(w, vfx, intensity);
        appendEventsForAudio(w, batch);
        updateFlashFromEvents(w, flash);
        // F-16: ball death / compact remaps slots — wipe all rings so ghosts
        // cannot stick to a surviving ball that moved into a dead slot.
        const ballCount = w.activeBallCount;
        if (
          lastTrailBallCount.value >= 0 &&
          ballCount < lastTrailBallCount.value
        ) {
          clearTrailsFromIndex(vfx, 0);
        }
        lastTrailBallCount.value = ballCount;
        pushActiveBallTrails(w, vfx, intensity);
        // Edge-consume launch after the step that saw it
        if (launchFlag.value !== 0) {
          launchFlag.value = 0;
        }
        w.accumulator -= fixedDt;
        steps += 1;
      }
      if (steps === maxSubsteps) {
        w.accumulator = remainderAfterSubstepCap(
          w.accumulator,
          steps,
          maxSubsteps,
          fixedDt,
        );
      }

      pushSample(
        m,
        dt * 1000,
        steps,
        spriteTarget.value,
        w.tick,
        selfCheckFrames,
        overlayEnabled,
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
  }, [
    world,
    metrics,
    vfxSv,
    audioBatchSv,
    compiled,
    paddleTarget,
    launchFlag,
    livesOut,
    simPhaseOut,
    scoreOut,
    comboOut,
    stallTierOut,
    flashSv,
    resetRequest,
    resetApplied,
    certRequest,
    certApplied,
    accumResetRequest,
    accumResetApplied,
    lastTrailBallCount,
    budgetParticleCap,
    budgetTrailMax,
    budgetGlowScale,
    fixedDt,
    maxSubsteps,
    maxFrameTime,
    selfCheckFrames,
    vfxIntensity,
    uiPhase,
    spriteTarget,
    playBatchFn,
    overlayEnabled,
    hudFontSv,
    glowAtlas,
    picture,
    surfaceSize,
  ]);

  // autostart false: host gates setActive until JS-thread loadAndCompile succeeds (D-13, D-14)
  const frameCallback = useFrameCallback(onFrame, false);
  /* eslint-enable react-hooks/immutability */

  const setActive = useCallback(
    (active: boolean) => {
      frameCallback.setActive(active);
      if (!active) {
        // Request UI-runtime accumulator reset (F-01) — do not mutate world.value clone.
        /* eslint-disable react-hooks/immutability -- SharedValue write (D-14) */
        accumResetRequest.value = accumResetRequest.value + 1;
        /* eslint-enable react-hooks/immutability */
      }
    },
    [frameCallback, accumResetRequest],
  );

  const retry = useCallback(() => {
    // Discrete request only — UI frame applies applyRetryWorldReset on live World (F-01 / D-11).
    /* eslint-disable react-hooks/immutability -- SharedValue write (D-14) */
    resetRequest.value = resetRequest.value + 1;
    /* eslint-enable react-hooks/immutability */
  }, [resetRequest]);

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
    /* eslint-disable react-hooks/immutability -- SharedValue write (D-14) */
    vfxSv.value = null;
    /* eslint-enable react-hooks/immutability */
    retry();
  }, [budgetParticleCap, budgetTrailMax, budgetGlowScale, vfxSv, retry]);

  // AppState auto-pause: freeze + resetAccumulator; never setActive(true) on foreground (D-15).
  // Returning to `active` stays frozen until Resume → countdown (Plan 05).
  const onOsPause = options.onOsPause;
  useEffect(() => {
    const sub = subscribeAppStateAutoPause({
      onAutoPause: () => {
        // setActive(false) also requests accumulator reset via handle contract
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
   * DEV cert worst-case (D-14): bump request — UI frame injects on live World.
   * No-ops outside __DEV__; adds zero per-frame work when unused.
   */
  const injectCertWorstCase = useCallback(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) {
      return;
    }
    /* eslint-disable react-hooks/immutability -- SharedValue write (D-14) */
    certRequest.value = certRequest.value + 1;
    /* eslint-enable react-hooks/immutability */
  }, [certRequest]);

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
