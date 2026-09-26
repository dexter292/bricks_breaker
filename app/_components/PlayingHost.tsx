import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { useFont } from '@shopify/react-native-skia';
import {
  runOnJS,
  runOnUI,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { usePaddleGesture } from '../../src/input';
import type { GlowAtlas } from '../../src/render/textures/bakeGlowSprites';
import { bakeGlowSprites } from '../../src/render/textures/bakeGlowSprites';
import {
  GameScreen,
  type GameScreenUiPhase,
} from '../../src/runtime/GameScreen';
import {
  LOGICAL_H,
  LOGICAL_W,
} from '../../src/render/recordSprites';
import {
  compileGeneratedLevel,
  loadLevelById,
  type CompiledLevel,
  type LevelId,
} from '../../src/runtime/loadLevel';
import { generate } from '../../src/levelgen';
import {
  difficultyForWave,
  seedForWave,
} from '../../src/services/endless';
import {
  UiPhaseNum,
  useGameLoop,
  type ChromeMirror,
  type PlayBatchFn,
} from '../../src/runtime/useGameLoop';
import { useVfxIntensity } from '../../src/runtime/useVfxIntensity';
import {
  createRunStatsMirror,
  type RunStatsMirror,
} from '../../src/runtime/publishRunStatsMirror';
import {
  readDeviceMemory,
  resolveQualityTier,
  type QualityTier,
} from '../../src/runtime/resolveQualityTier';
import { createDefaultAudioService, createMemoryAudioService } from '../../src/services/audio';
import {
  createDefaultHapticsService,
  createMemoryHapticsService,
} from '../../src/services/haptics';
import { defaultPlatformServices } from '../../src/services/platform';
import { CERT_HARNESS, PERF_OVERLAY } from '../../src/devflags';
import { triggerTestCrash } from '../../src/services/crashReporting';
import {
  PLAYABLE_LEVEL_ORDER,
  createDefaultProgressStore,
  evaluatePersonalBest,
  isUnlocked,
  nextLevelId,
  type RunStatsInput,
} from '../../src/services/storage';

/**
 * Map the runtime reducer's `RunStats` onto the storage layer's `RunStatsInput`
 * (N-STAT-01 -> N-STAT-02). Field-by-field on purpose, never a spread:
 *   - `rallyCurrent` is runtime-internal live bookkeeping and must not leak into the
 *     persisted shape;
 *   - `longestRally` (survival streak) and `bestCombo` (aggression streak) stay
 *     DISTINCT — D-10 forbids collapsing them;
 *   - `ticksPlayed` rides the mirror (it is a UI-thread `world.tick` read); `wallClockMs`
 *     stays an app-layer ref read, because pause-exclusion is a React concern (D-09).
 */
function buildRunStatsInput(
  raw: RunStatsMirror,
  wallClockMs: number,
): RunStatsInput {
  return {
    bricksBroken: raw.bricksBroken,
    bestCombo: raw.bestCombo,
    pickupMultiball: raw.pickupMultiball,
    pickupExpand: raw.pickupExpand,
    pickupExtraLife: raw.pickupExtraLife,
    pickupSlow: raw.pickupSlow,
    pickupFireball: raw.pickupFireball,
    livesLost: raw.livesLost,
    longestRally: raw.longestRally,
    largestCascade: raw.largestCascade,
    ticksPlayed: raw.ticksPlayed,
    wallClockMs,
  };
}

/**
 * Degrade an endless watermark read back from storage to a non-negative integer.
 *
 * Mirrors the storage layer's own `safeCounter` (`parseBlob.ts` `sanitizeTelemetry`)
 * rather than trusting it: this value is read from on-device AsyncStorage, crosses
 * the persisted-blob → UI trust boundary, and is rendered straight to the player
 * (T-11-08-03). A hand-edited `telemetry.endless` cannot make the overlay render
 * `Best · NaN`, and cannot reach campaign state at all — nothing downstream of here
 * writes `previousBestRef`.
 */
function safeWatermark(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
    ? Math.floor(n)
    : 0;
}

/** F-18 — release baked SkImages so remount / level change does not leak GPU memory. */
function disposeGlowAtlas(atlas: GlowAtlas | null | undefined): void {
  if (atlas == null) {
    return;
  }
  for (const key of Object.keys(atlas)) {
    const variant = atlas[key as keyof GlowAtlas];
    if (variant?.soft != null) {
      try {
        variant.soft.dispose();
      } catch {
        // Soft-fail: already disposed or native teardown raced.
      }
    }
  }
}

/**
 * NL-2 — dispose only after the UI runtime has observed `glowAtlasSv` (null or next).
 * Sync dispose from effect cleanup races an in-flight `recordFrame` →
 * `drawImageRect` on a freed SkImage ("Attempted to access a disposed object").
 */
function scheduleDisposeGlowAtlas(
  atlas: GlowAtlas | null | undefined,
  glowAtlasSv: { value: GlowAtlas | null },
): void {
  if (atlas == null) {
    return;
  }
  runOnUI(() => {
    'worklet';
    void glowAtlasSv.value;
    runOnJS(disposeGlowAtlas)(atlas);
  })();
}

/** Mirror SimPhase numeric — app must not import src/core (LC-05). */
const SIM = {
  DOCKED: 0,
  PLAYING: 1,
  WON: 2,
  LOST: 3,
} as const;

type Props = {
  onMenu: () => void;
  /** Required — GameHost owns Select / Next / CERT levelId (D-14 / D-15). */
  levelId: LevelId;
  /** Next + DEV + cert force when controlled from GameHost. */
  onLevelIdChange?: (id: LevelId) => void;
};

/** NG-14 — isolated keep-awake so unmount releases the lock; tag is component-local. */
function KeepAwakeOn() {
  useKeepAwake('NeonBrickPlaying');
  return null;
}

/**
 * Playing session host: gestures + game loop + pause FSM.
 * Unmount on Menu tears down worklets (D-01 shell Pattern 1).
 * Resume → 3·2·1 countdown → setActive(true). OS return never auto-unfreezes.
 *
 * Level cold path (D-11…D-15): loadLevelById on JS → compiled SharedValue →
 * useGameLoop applyCompiledLevel only. Fail loudly; never play invalid.
 */
export function PlayingHost({
  onMenu,
  levelId: levelIdProp,
  onLevelIdChange,
}: Props) {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });
  // NG-13 / F-29 — SkFont for in-canvas PERF_OVERLAY (matchFont unreliable on sim).
  const hudFont = useFont(
    require('../../assets/fonts/SpaceMono-Regular.ttf'),
    11,
  );

  const [uiPhase, setUiPhase] = useState<GameScreenUiPhase>('playing');
  const [countdownNumeral, setCountdownNumeral] = useState<number | null>(
    null,
  );
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState(1);
  const [stallTier, setStallTier] = useState<number>(0);
  const [result, setResult] = useState<null | 'win' | 'lose'>(null);
  const [resultBest, setResultBest] = useState(0);
  /**
   * The two endless-only Results metric values (11-08, 11-UI-SPEC § Endless copy
   * lines 1 and 4). `resultBest` above is shared — it carries the campaign level PB
   * in campaign and `telemetry.endless.bestScore` in endless — because `Best · {n}`
   * is one line whose SOURCE is per mode, which is exactly what the Record Display
   * Contract table says. `resultBestWave` has no campaign counterpart and stays 0
   * there; the overlay does not render the line outside endless.
   */
  const [resultWave, setResultWave] = useState(0);
  const [resultBestWave, setResultBestWave] = useState(0);
  const [resultStars, setResultStars] = useState<1 | 2 | 3 | null>(null);
  const [nextGateId, setNextGateId] = useState<LevelId | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  /**
   * The wave that could NOT be built, or `null`. 11-07 Task 4.
   *
   * Stores the FAILED wave, not the last good one, so the copy that consumes it
   * (11-08) needs no arithmetic: mid-run that is `waveRef.current + 1`, and at
   * Retry time it is always `1` — a Retry-time failure is by construction a
   * wave-1 failure (11-07 A-01, decided `retry-in-place` 2026-09-26).
   *
   * This is what REPLACES the old `genIssues` route into `LevelErrorOverlay`.
   * 11-UI-SPEC § Copywriting → `Error state (board)` forbids that overlay here: it
   * has no controls, so it trapped the player in front of a live sim with two dead
   * buttons (`onResume` and `onRetry` both returned early on `levelError != null`).
   */
  // WRITTEN here (11-07 Task 4), READ in 11-08, which renders the wave-build-failure
  // body from it. The writer has to land first: the value is produced by the
  // run-ending branch in `applyChrome`, and that branch is the SC-1 fix. Delete the
  // disable below in 11-08 once the reader is wired — if it is still here after
  // 11-08, the copy row never shipped.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reader lands in 11-08
  const [waveBuildFailedWave, setWaveBuildFailedWave] = useState<number | null>(
    null,
  );
  const [simPhaseNum, setSimPhaseNum] = useState<number>(SIM.DOCKED);
  // Controlled when onLevelIdChange provided; else local fallback (prefer GameHost-controlled).
  const [uncontrolledLevelId, setUncontrolledLevelId] =
    useState<LevelId>(levelIdProp);
  const levelId =
    onLevelIdChange != null ? levelIdProp : uncontrolledLevelId;
  const setLevelId = useCallback(
    (next: LevelId | ((prev: LevelId) => LevelId)) => {
      const resolved =
        typeof next === 'function' ? next(levelId) : next;
      if (onLevelIdChange != null) {
        onLevelIdChange(resolved);
      } else {
        setUncontrolledLevelId(resolved);
      }
    },
    [levelId, onLevelIdChange],
  );
  /** DEV-only force; null = auto from device (D-11). */
  const [tierOverride, setTierOverride] = useState<QualityTier | null>(null);

  /**
   * Endless mode (N-END-01 / D-10) is HOST-LOCAL state: entered by the `__DEV__`
   * entry on the dev row, never threaded down from `GameHost`. D-05 makes the
   * entry temporary and Phase 14 replaces it with the real Title route, so the
   * shell plumbing that a `mode` prop would build is plumbing Phase 14 would
   * immediately have to unpick.
   *
   * Every callback-visible piece of this is mirrored into a `useRef`. That is not
   * belt-and-braces: `applyChrome` is memoised and the chrome reaction holds the
   * memoised identity, so a `useState` read inside it is the value from whenever
   * the callback was last built — the exact staleness `runEndedRef` already exists
   * to avoid (11-RESEARCH § Pitfall 5).
   */
  const [mode, setMode] = useState<'campaign' | 'endless'>('campaign');
  const modeRef = useRef<'campaign' | 'endless'>('campaign');
  const [wave, setWave] = useState(1);
  const waveRef = useRef(1);
  /** Minted per run in the APP tier — src/levelgen bans wall-clock reads (Pitfall 7). */
  const runSeedRef = useRef(0);
  /** Pitfall 5 idempotency guard: the WON mirror can arrive twice before the advance lands. */
  const waveAdvanceInFlightRef = useRef(false);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Keep awake only while actively playing (NG-14 — useKeepAwake owns activate/deactivate).
  const keepAwake =
    uiPhase === 'playing' && result == null ? <KeepAwakeOn /> : null;

  const store = useMemo(() => createDefaultProgressStore(), []);
  // F-26: pending progress write flushed on AppState background via onOsPause path.
  const platform = useMemo(() => defaultPlatformServices(), []);
  // Soft-fail: stale native binary without ExpoAudio must not crash play (D-24).
  // CERT: memory service only — expo-audio createAudioPlayer can block the JS
  // thread after a soft-failed native preload and starve runOnJS metrics logs.
  const audio = useMemo(() => {
    if (CERT_HARNESS) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[cert] memory AudioService (native pool build skipped)');
      }
      return createMemoryAudioService();
    }
    try {
      return createDefaultAudioService();
    } catch (err) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[audio] PlayingHost createDefaultAudioService soft-fail', err);
      }
      return createMemoryAudioService();
    }
  }, []);
  // Soft-fail: stale binary without ExpoHaptics → memory (D-08 / T-D1-12).
  // Never gated by useVfxIntensity / reduce-motion (D-10).
  const haptics = useMemo(() => {
    try {
      return createDefaultHapticsService();
    } catch (err) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[haptics] PlayingHost createDefaultHapticsService soft-fail', err);
      }
      return createMemoryHapticsService();
    }
  }, []);
  const previousBestRef = useRef(0);
  /**
   * The ENDLESS watermarks — the display half of the mode firewall (11-08, gap 2).
   *
   * Deliberately a SEPARATE pair from `previousBestRef`, which holds
   * `store.getBestForLevel(levelId)` — a campaign level best. Before 11-08,
   * `handleRunEnded` compared an endless run against that campaign number and then
   * branched on mode, so the endless Results overlay showed a campaign PB as `Best`
   * and fired `New Record` against an unrelated score. 11-UI-SPEC § Record Display
   * Contract makes the branch-before-compare the contract, and these refs are the
   * endless side of the table.
   *
   * Refs, not state, for the same reason `waveRef` is: `handleRunEnded` is memoised
   * and reached from the memoised chrome reaction, so a `useState` read inside it is
   * whatever the value was when the callback was last built (11-RESEARCH § Pitfall 5).
   */
  const endlessBestScoreRef = useRef(0);
  const endlessBestWaveRef = useRef(0);
  const runEndedRef = useRef(false);
  /**
   * D-09 wall clock — PLAY time, not elapsed time. `runStartedAtRef` marks the start
   * of the current play segment; `runWallClockMsRef` banks segments already closed.
   * Leaving 'playing' (Pause button, or the AppState background transition routed
   * through `onOsPause`) closes a segment, so paused time never enters the total.
   * Ticks remain the separate simulated-time answer — D-09 stores both.
   *
   * Seeded 0, not `Date.now()`: `react-hooks/purity` forbids an impure call during
   * render, and the seed is never read — `wallClockActiveRef` starts false, and the
   * uiPhase effect stamps a real start the moment a segment opens.
   */
  const runStartedAtRef = useRef(0);
  const runWallClockMsRef = useRef(0);
  const wallClockActiveRef = useRef(false);
  /** This run's play-only wall clock, including the live segment if one is open. */
  const readRunWallClockMs = useCallback(() => {
    const live = wallClockActiveRef.current
      ? Date.now() - runStartedAtRef.current
      : 0;
    return runWallClockMsRef.current + live;
  }, []);
  /** Cold-path: SFX + glow bake key — see loadKey / bakedKey below (NH-5). */
  const [bakedKey, setBakedKey] = useState('');

  // Resolve tier once per mount (+ when DEV override changes). Device read is cold-path.
  const deviceInfo = useMemo(() => readDeviceMemory(), []);
  const { tier: qualityTier, budget: vfxBudget } = useMemo(
    () =>
      resolveQualityTier({
        override: tierOverride,
        totalMemory: deviceInfo.totalMemory,
        modelName: deviceInfo.modelName,
      }),
    [tierOverride, deviceInfo],
  );

  // Sync validate+compile on JS when levelId changes (D-12, D-14) — derive UI from Result.
  const loadResult = useMemo(() => loadLevelById(levelId), [levelId]);
  /**
   * CATALOG load failures only (11-07 Task 4). 11-RESEARCH's Pitfall 6 originally
   * routed a failed GENERATED board here too, via `genIssues`, so one overlay could
   * serve both sources. 11-UI-SPEC § Copywriting → `Error state (board)` supersedes
   * that: `LevelErrorOverlay` has no controls, and `GameScreen` suppresses
   * `showResult` whenever `levelError` is non-null, so the generated-board route
   * left a live sim behind a modal the player could not dismiss — and, because
   * `onResume` and `onRetry` both early-return on `levelError != null`, with two
   * dead buttons as well. A generated board that fails to compile now ENDS the run
   * (see `applyChrome`) and reports through `waveBuildFailedWave`.
   */
  const levelError = loadResult.ok ? null : loadResult.issues;
  const levelReady = loadResult.ok;
  /**
   * NH-5 / D-14: fx ready is derived — the bake key is the ATLAS identity, and the
   * atlas identity is the brick dimensions, nothing else. `bakeGlowSprites(brickW,
   * brickH)` reads only those two numbers (src/render/textures/bakeGlowSprites.ts:95-108),
   * so a key that also embedded the level id or `compiled.brickCount` claimed an
   * identity the atlas does not have.
   *
   * That over-keying is the real SC-5 risk for endless (11-RESEARCH § Pitfall 2):
   * `brickCount` moves every wave as difficulty ramps (32 bricks at d=0 to 128 at
   * d=20), so every board swap would flip `fxReady` false and re-enter the cold path
   * below — `setActive(false)` -> re-bake -> an awaited audio preload with a 2500 ms
   * race. Keyed on dimensions, and with every generated board on the one fixed
   * lattice (src/levelgen/grid.ts:32-41), the bake fires exactly once per endless run.
   *
   * Campaign behaviour is unchanged where it matters: the bake effect still depends on
   * `loadResult`, so a level switch re-bakes; what stops is only a re-bake of an
   * identical atlas. The error branch keeps the level id — an unloadable level still
   * needs a key distinct from every other state.
   */
  const loadKey = loadResult.ok
    ? `${loadResult.compiled.w[0]}x${loadResult.compiled.h[0]}`
    : `err:${levelId}`;
  const fxReady = loadResult.ok && bakedKey === loadKey;

  const uiPhaseSv = useSharedValue<number>(UiPhaseNum.PLAYING);
  const chromeSv = useSharedValue<ChromeMirror>({
    phase: SIM.DOCKED,
    lives: 3,
    score: 0,
    combo: 1,
    stallTier: 0,
  });
  /** NF-8 / NG-15 — scalar bump when chrome fields change (reaction input). */
  const chromeSeq = useSharedValue(0);
  const camScale = useSharedValue(1);
  const compiledSv = useSharedValue<CompiledLevel | null>(null);
  const glowAtlasSv = useSharedValue<GlowAtlas | null>(null);
  const vfxIntensity = useVfxIntensity();
  /**
   * Audio playBatch must stay on the RN runtime (ref + stable callback).
   * Assigning a function into a SharedValue throws
   * "Tried to synchronously call a Remote Function" under Worklets 0.10.
   */
  const playBatchRef = useRef<PlayBatchFn | null>(null);
  const playBatchOnJS = useCallback<PlayBatchFn>((codes, count) => {
    playBatchRef.current?.(codes, count);
  }, []);

  const countdownTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearCountdown = useCallback(() => {
    for (const t of countdownTimers.current) {
      clearTimeout(t);
    }
    countdownTimers.current = [];
  }, []);

  useEffect(() => () => clearCountdown(), [clearCountdown]);

  // Preload per-level previousBest for Results (D-05 / D-10). Refresh on levelId change.
  useEffect(() => {
    let cancelled = false;
    void store
      .getBestForLevel(levelId)
      .then((b) => {
        if (cancelled) return;
        previousBestRef.current = b;
        setResultBest(b);
      })
      .catch(() => {
        if (cancelled) return;
        previousBestRef.current = 0;
        setResultBest(0);
      });
    return () => {
      cancelled = true;
    };
  }, [store, levelId]);

  /**
   * Seed the endless watermarks once at mount (11-UI-SPEC E1 `loading` / `error`).
   *
   * Depends on `store` ALONE, never on `levelId`: the endless record is a single
   * global pair, not a per-level entry — that is the whole reason it lives in
   * `telemetry.endless` rather than in `bestByLevel` (SC-3 / D-12). Adding `levelId`
   * would re-read it on every campaign level switch for no gain.
   *
   * Fail-soft to 0 and never block: E1 `error` requires a storage failure to fall back
   * to the last known values with the overlay still fully playable and NO error modal.
   * The refs already hold 0 at mount, so the overlay renders `Best · 0` /
   * `Best wave · 0` immediately (E1 `empty`) and simply improves when the read lands.
   */
  useEffect(() => {
    let cancelled = false;
    void store
      .getSnapshot()
      .then((blob) => {
        if (cancelled) return;
        const record = blob.telemetry?.endless;
        endlessBestScoreRef.current = safeWatermark(record?.bestScore);
        endlessBestWaveRef.current = safeWatermark(record?.bestWave);
      })
      .catch(() => {
        if (cancelled) return;
        endlessBestScoreRef.current = 0;
        endlessBestWaveRef.current = 0;
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(() => {
    const mapped =
      uiPhase === 'playing'
        ? UiPhaseNum.PLAYING
        : uiPhase === 'paused'
          ? UiPhaseNum.PAUSED
          : UiPhaseNum.COUNTDOWN;
    uiPhaseSv.value = mapped;
    // D-09: the wall clock runs only while the sim does. Entering 'playing' opens a
    // segment; anything else (pause, OS background via onOsPause, resume countdown)
    // banks it — so a 30s pause adds 0ms, not 30000ms.
    if (uiPhase === 'playing') {
      if (!wallClockActiveRef.current) {
        wallClockActiveRef.current = true;
        runStartedAtRef.current = Date.now();
      }
    } else if (wallClockActiveRef.current) {
      wallClockActiveRef.current = false;
      runWallClockMsRef.current += Date.now() - runStartedAtRef.current;
    }
  }, [uiPhase, uiPhaseSv]);

  const onOsPause = useCallback(() => {
    clearCountdown();
    setCountdownNumeral(null);
    setUiPhase('paused');
    // F-26: re-attempt pending progress write on background/OS pause.
    void store.flush?.().catch(() => {});
  }, [clearCountdown, store]);

  const { paddleTarget, launchFlag, gesture } = usePaddleGesture({
    chrome: chromeSv,
    uiPhase: uiPhaseSv,
    camScale,
  });

  const {
    picture,
    surfaceSize,
    setActive,
    retry,
    advanceWave,
    injectCertWorstCase,
    certOut,
    certSeq,
    runStatsOut,
    runStatsSeq,
  } = useGameLoop({
    paddleTarget,
    launchFlag,
    uiPhase: uiPhaseSv,
    chromeOut: chromeSv,
    chromeSeq,
    compiled: compiledSv,
    onOsPause,
    vfxIntensity,
    playBatch: playBatchOnJS,
    glowAtlas: glowAtlasSv,
    vfxBudget,
    drawOverlayFlag: PERF_OVERLAY || CERT_HARNESS,
    hudFont: hudFont ?? null,
    certMetricsLog: CERT_HARNESS,
  });
  const setActiveRef = useRef(setActive);
  useEffect(() => {
    setActiveRef.current = setActive;
  }, [setActive]);

  // SFX preload + glow bake before play (FX-03 / D-05); soft-fail never blocks with Alert.
  // F-14: bake at active level brick size.
  // NF-6 / NG-11 / NH-4 / NH-5 / NL-2: assign new atlas, then dispose previous from a
  // UI-thread work item (causal vs timer) so recordFrame never draws a freed SkImage.
  //
  // R-24: never defer setActive(false) via setTimeout after bake. Once setBakedKey
  // flips fxReady, the gate effect calls setActive(true); a deferred pause can win
  // the race and leave the frame loop off forever (blank playfield + live HUD).
  useEffect(() => {
    let cancelled = false;
    const bakeForKey = loadKey;
    const brickW =
      loadResult.ok && loadResult.compiled.brickCount > 0
        ? loadResult.compiled.w[0]
        : 32;
    const brickH =
      loadResult.ok && loadResult.compiled.brickCount > 0
        ? loadResult.compiled.h[0]
        : 14;
    void (async () => {
      // Pause sync via ref (not React setState) before bake — safe in effect (NG-10).
      // Glow first — never block fxReady on simulator audio (FigFilePlayer noise).
      try {
        setActiveRef.current(false);
        const next = bakeGlowSprites(brickW, brickH);
        if (cancelled) {
          disposeGlowAtlas(next);
          return;
        }
        const prev = glowAtlasSv.value;
        glowAtlasSv.value = next;
        scheduleDisposeGlowAtlas(prev, glowAtlasSv);
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[glow] bake soft-fail', err);
        }
        if (!cancelled) {
          glowAtlasSv.value = null;
        }
      }
      if (cancelled) {
        return;
      }
      // Flip ready before audio so playfield can paint even if preload hangs.
      // D-12: haptics piggyback on the same JS hop — keep sole LC-07 scheduleOnRN site in eventBridge.
      playBatchRef.current = (codes, count) => {
        audio.playBatch(codes, count);
        haptics.playFromBatch(codes, count);
      };
      setBakedKey(bakeForKey);

      try {
        await Promise.race([
          audio.preload(),
          new Promise<void>((_resolve, reject) => {
            setTimeout(() => reject(new Error('audio preload timeout')), 2500);
          }),
        ]);
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[audio] preload soft-fail', err);
        }
      }
    })();
    return () => {
      cancelled = true;
      setActiveRef.current(false);
      playBatchRef.current = null;
      // Null SV first so any remaining frame skips the glow blit, then dispose
      // only after the UI runtime has observed null (same handshake as bake).
      const atlas = glowAtlasSv.value;
      glowAtlasSv.value = null;
      scheduleDisposeGlowAtlas(atlas, glowAtlasSv);
      audio.release();
      haptics.release();
    };
  }, [audio, haptics, glowAtlasSv, loadResult, loadKey]);

  // Push compiled into SharedValue + gate setActive (external systems — D-13, D-14).
  // Frame callback autostarts false; only setActive(true) after load ok AND fx cold path.
  useEffect(() => {
    // SC-5 / N-END-01: during an endless run the level LOAD RESULT is not the source
    // of the board — `advanceToWave` writes generated boards straight into
    // `compiledSv`. Letting this effect run would overwrite the live generated board
    // with the campaign level and call `retry()`, destroying the lives, score and
    // combo the run carries. Read through the REF on purpose: adding `mode` to the
    // dependency array would make the effect re-run on the mode flip, which is
    // precisely the run being prevented.
    if (modeRef.current === 'endless') {
      return;
    }
    if (!loadResult.ok) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error('[level]', loadResult.issues);
      }
      compiledSv.value = null;
      setActive(false);
      return;
    }
    if (!fxReady) {
      setActive(false);
      return;
    }
    compiledSv.value = loadResult.compiled;
    // Apply to existing world if already allocated; first frame handles cold start.
    retry();
    setActive(true);
  }, [loadResult, fxReady, compiledSv, setActive, retry]);

  useAnimatedReaction(
    () => {
      const s = surfaceSize.value;
      const w = s.width;
      const h = s.height;
      if (!(w > 1) || !(h > 1)) {
        return 1;
      }
      return Math.min(w / LOGICAL_W, h / LOGICAL_H);
    },
    (scale) => {
      camScale.value = scale;
    },
  );

  // Cold path only — never await inside useAnimatedReaction / frame callback.
  const handleRunEnded = useCallback(
    (
      runScore: number,
      outcome: 'win' | 'lose' | 'abandoned',
      livesRemaining: number,
      stats: RunStatsInput,
    ) => {
      // 11-UI-SPEC § Record Display Contract: **the mode branch happens FIRST**.
      //
      // Gap 2 was precisely the opposite order — `evaluatePersonalBest(runScore,
      // previousBestRef.current)` ran above this line and the mode branch came after,
      // so an endless run was compared against a CAMPAIGN level best. That single
      // ordering produced all three symptoms at once: the campaign PB shown as the
      // endless `Best`, `New Record` firing against an unrelated campaign score, and
      // the endless score written back into `previousBestRef` for the rest of the
      // mount. The two arms below never share a comparison basis again.
      //
      // Sync memory merge score/stars/unlock; void persist inside store (D-10).
      // `mode`/`stats` are required by the v4 store contract (Phase 9 Plan 02).
      // BOTH modes land here (N-END-02): `RecordRunEndArgs` is a discriminated union
      // (D-11) whose endless arm has no `levelId`, so the campaign write is not merely
      // skipped for an endless run — it is unreachable, and `tsc` is the gate that
      // says so (SC-3). `stats` carries the real per-run reducer output (N-STAT-01),
      // snapshotted by the caller at the run boundary — win, lose and abandon all land
      // on this single call site (C2).
      let record: boolean;
      if (modeRef.current === 'endless') {
        const runWave = waveRef.current;
        // N-END-02 / D-11: strict in BOTH watermarks, and either one is enough. A
        // deeper run at a lower score is unambiguously a new record; firing on only
        // one of them would silently elect a primary record, which 11-UI-SPEC defers
        // to Phase 14. Equality keeps the previous record.
        record =
          runScore > endlessBestScoreRef.current ||
          runWave > endlessBestWaveRef.current;
        const blob = store.recordRunEnd({
          mode: 'endless',
          wave: runWave,
          score: runScore,
          outcome,
          livesRemaining,
          stats,
        });
        // "Displayed values are post-merge" (11-UI-SPEC): `recordRunEnd` returns the
        // blob SYNCHRONOUSLY and that blob already carries the merged
        // `telemetry.endless` (`memoryStore.ts` `mergeEndlessRecord`), so this is a
        // read of the value the merge just produced — not a second, racing
        // `getSnapshot()`. Fail soft to the pre-run watermarks if the field is absent.
        const merged = blob.telemetry?.endless;
        const mergedScore =
          merged == null
            ? endlessBestScoreRef.current
            : safeWatermark(merged.bestScore);
        const mergedWave =
          merged == null
            ? endlessBestWaveRef.current
            : safeWatermark(merged.bestWave);
        endlessBestScoreRef.current = mergedScore;
        endlessBestWaveRef.current = mergedWave;
        setResultWave(runWave);
        setResultBest(mergedScore);
        setResultBestWave(mergedWave);
        setIsNewRecord(record);
        // `previousBestRef` is NOT assigned here, and that omission is the fix. It is
        // the campaign personal best; an endless run may not move it (Record Display
        // Contract, "Post-run write-back"). `startEndlessRun` and `onRetry` both
        // republish `previousBestRef.current` into the host's `best` prop, so a write
        // here would resurface as the campaign best for the life of the mount.
        //
        // SC-3: an endless run has no catalog level, so there is no `bestByLevel`
        // entry to read stars from and no next level to unlock. Skipping the whole
        // campaign follow-up is what keeps campaign state untouched by endless play.
        setResultStars(null);
        setNextGateId(null);
      } else {
        const { best, isNewRecord: campaignRecord } = evaluatePersonalBest(
          runScore,
          previousBestRef.current,
        );
        record = campaignRecord;
        const blob = store.recordRunEnd({
          levelId,
          mode: 'campaign',
          score: runScore,
          outcome,
          livesRemaining,
          stats,
        });
        setResultBest(best);
        setIsNewRecord(campaignRecord);
        if (campaignRecord) {
          previousBestRef.current = best;
        }
        const entry = blob.bestByLevel[levelId];
        const stars = entry?.stars;
        if (outcome === 'win' && (stars === 1 || stars === 2 || stars === 3)) {
          setResultStars(stars);
        } else {
          setResultStars(null);
        }
        const next = nextLevelId(levelId);
        if (
          outcome === 'win' &&
          next != null &&
          isUnlocked(blob.unlocked, next)
        ) {
          setNextGateId(next);
        } else {
          setNextGateId(null);
        }
      }
      // RunEndedPayload is deliberately a win/lose concept: abandoning to the Menu is
      // telemetry, not a monetization beat. Narrowing here keeps the existing platform
      // contract untouched and stops an interstitial firing on a Menu tap.
      if (outcome !== 'abandoned') {
        const payload = { score: runScore, outcome, isNewRecord: record };
        platform.ads.onRunEnded(payload);
        platform.purchases.onRunEnded(payload);
        platform.accounts.onRunEnded(payload);
      }
    },
    [platform, store, levelId],
  );

  /**
   * JS-side copy of the UI-thread counters (N-STAT-01).
   *
   * `runStats` is mutated in place on the UI runtime and Reanimated does not propagate
   * in-place mutation across the bridge — reading `runStats.value` here returned the
   * object's crossing-time values, which is why device UAT saw `bricksBroken: 0` after a
   * run that visibly destroyed bricks. The reaction below is the same mirror+seq route
   * chrome and CERT metrics already use.
   */
  const runStatsMirrorRef = useRef<RunStatsMirror>(createRunStatsMirror());
  const applyRunStatsMirror = useCallback((m: RunStatsMirror) => {
    runStatsMirrorRef.current = m;
  }, []);
  useAnimatedReaction(
    () => runStatsSeq.value,
    (seq, prev) => {
      if (prev === null || seq !== prev) {
        const m = runStatsOut.value;
        runOnJS(applyRunStatsMirror)({
          bricksBroken: m.bricksBroken,
          bestCombo: m.bestCombo,
          pickupMultiball: m.pickupMultiball,
          pickupExpand: m.pickupExpand,
          pickupExtraLife: m.pickupExtraLife,
          pickupSlow: m.pickupSlow,
          pickupFireball: m.pickupFireball,
          livesLost: m.livesLost,
          longestRally: m.longestRally,
          largestCascade: m.largestCascade,
          ticksPlayed: m.ticksPlayed,
        });
      }
    },
  );

  /**
   * Snapshot this run's counters at the run boundary. One helper, three outcomes.
   * Counters and ticks come from the JS-side mirror the seq reaction keeps fresh — the
   * UI-thread object itself is unreadable from here (see the mirror ref above). The
   * mirror is republished zeroed on reset, so D-01 (every retry is a new run) holds.
   * `readRunWallClockMs()` stays the play-only wall clock (D-09).
   */
  const snapshotRunStats = useCallback((): RunStatsInput => {
    return buildRunStatsInput(runStatsMirrorRef.current, readRunWallClockMs());
  }, [readRunWallClockMs]);

  /**
   * Generate, compile and swap in the board for `nextWave`. One helper for both the
   * run start and the WON intercept, so "which board is wave N" has exactly one
   * answer in this file.
   *
   * D-08 makes generation LAZY, at the transition: `generate` plus
   * `compileGeneratedLevel` measured 0.0362 ms in Node, roughly 0.56 ms
   * Hermes-scaled — about 3 % of a 60 Hz frame — and it runs here on the RN JS
   * thread inside a `runOnJS`'d callback, where it cannot preempt the UI runtime's
   * frame callback at all. Pre-generating during wave N would buy nothing
   * measurable and would add a cache to invalidate.
   *
   * Returns whether the swap happened. The failure path is loud (a `__DEV__`
   * `console.error`) and terminal for this transition: it never itself reaches a
   * run-end branch — deciding what a failure MEANS belongs to the caller, which is
   * why `applyChrome` ends the run and `startEndlessRun` keeps the overlay up.
   */
  const advanceToWave = useCallback(
    (nextWave: number): boolean => {
      const raw = generate(
        seedForWave(runSeedRef.current, nextWave),
        difficultyForWave(nextWave),
      );
      const compiled = compileGeneratedLevel(raw);
      if (!compiled.ok) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.error('[endless] generated board failed to compile', compiled.issues);
        }
        return false;
      }
      // 11-03's contract: the next compiled board must be in `compiled` BEFORE
      // `advanceWave()` bumps the request — the frame callback applies whatever
      // `compiledSv.value` holds when it notices the bump.
      /* eslint-disable react-hooks/immutability -- SharedValue write (D-14) */
      compiledSv.value = compiled.compiled;
      /* eslint-enable react-hooks/immutability */
      waveRef.current = nextWave;
      setWave(nextWave);
      return true;
    },
    [compiledSv],
  );

  const applyChrome = useCallback(
    (mirror: ChromeMirror) => {
      setSimPhaseNum(mirror.phase);
      setLives(mirror.lives);
      setScore(mirror.score);
      setCombo(mirror.combo);
      setStallTier(mirror.stallTier);
      // SC-1 — "the run ends only when lives reach zero". In endless there is no
      // run-ending WON: a cleared board is a WAVE boundary, so this branch goes
      // ahead of the campaign WON branch and returns in every path, which is what
      // keeps `handleRunEnded` and `setActive(false)` below unreachable on a win.
      if (modeRef.current === 'endless' && mirror.phase === SIM.WON) {
        if (!waveAdvanceInFlightRef.current) {
          waveAdvanceInFlightRef.current = true;
          if (advanceToWave(waveRef.current + 1)) {
            advanceWave();
          } else {
            // WR-04 / 11-UI-SPEC § Run boundaries, the `advanceToWave(n) returns
            // false` row. Releasing the guard is the SC-1 half: a latched
            // `waveAdvanceInFlightRef` makes this branch a no-op forever, so every
            // later WON is swallowed and the run can never advance or end again.
            waveAdvanceInFlightRef.current = false;
            // `waveRef.current` is still the last SUCCESSFUL wave — `advanceToWave`
            // assigns it only after a successful compile — so the record below is
            // wave n-1 with no adjustment, and the failed wave is n.
            setWaveBuildFailedWave(waveRef.current + 1);
            if (!runEndedRef.current) {
              runEndedRef.current = true;
              handleRunEnded(
                mirror.score,
                'abandoned',
                mirror.lives,
                snapshotRunStats(),
              );
            }
            setResult('lose');
            setActive(false);
          }
        }
        return;
      }
      if (mirror.phase !== SIM.WON && mirror.phase !== SIM.LOST) {
        // Pitfall 5: release the guard only once the mirror reports a phase that is
        // neither — i.e. the advance has landed and the new board is in play.
        waveAdvanceInFlightRef.current = false;
      }
      if (mirror.phase === SIM.WON) {
        if (!runEndedRef.current) {
          runEndedRef.current = true;
          handleRunEnded(mirror.score, 'win', mirror.lives, snapshotRunStats());
        }
        setResult('win');
        setActive(false);
      } else if (mirror.phase === SIM.LOST) {
        if (!runEndedRef.current) {
          runEndedRef.current = true;
          handleRunEnded(mirror.score, 'lose', mirror.lives, snapshotRunStats());
        }
        setResult('lose');
        setActive(false);
      }
    },
    [advanceToWave, advanceWave, handleRunEnded, setActive, snapshotRunStats],
  );

  /**
   * THE single abandon funnel (T-09-10). Both existing exit-to-Menu paths — the Android
   * hardware-back handler and the GameScreen `onMenu` prop — route through here, so no
   * third detection site exists. Reuses the SAME `runEndedRef` the WON/LOST branches
   * set, which is what makes a run impossible to record twice: whichever boundary
   * fires first wins, and a finished run leaving to Menu records nothing extra.
   */
  const handleMenuPress = useCallback(() => {
    if (!runEndedRef.current) {
      runEndedRef.current = true;
      handleRunEnded(score, 'abandoned', lives, snapshotRunStats());
    }
    onMenu();
  }, [score, lives, handleRunEnded, snapshotRunStats, onMenu]);

  /**
   * The single IN-FLIGHT endless abandon funnel (11-07 gap 1), modelled on
   * `handleMenuPress` above and sharing the very same `runEndedRef` gate.
   *
   * Every endless run-boundary RESET — the Results `Retry`, the Pause `Retry`, a
   * `__DEV__` tier change — calls this before resetting. 11-UI-SPEC § Run boundaries
   * is explicit that the safeguard against silently dropping a run is not a
   * confirmation dialog but this record-first rule.
   *
   * Two no-ops, both deliberate: campaign mode (the campaign resets keep their
   * existing behaviour byte for byte) and a run that already ended (reached from the
   * lose overlay, `runEndedRef.current` is true, so a Retry cannot double-record).
   */
  const recordInFlightEndlessRun = useCallback(() => {
    if (modeRef.current !== 'endless') {
      return;
    }
    if (runEndedRef.current) {
      return;
    }
    runEndedRef.current = true;
    handleRunEnded(score, 'abandoned', lives, snapshotRunStats());
  }, [score, lives, handleRunEnded, snapshotRunStats]);

  // Single chrome bridge (F-25 / NF-8): react to chromeSeq scalar only — no per-frame tuple alloc.
  useAnimatedReaction(
    () => chromeSeq.value,
    (seq, prev) => {
      if (prev === null || seq !== prev) {
        const c = chromeSv.value;
        runOnJS(applyChrome)({
          phase: c.phase,
          lives: c.lives,
          score: c.score,
          combo: c.combo,
          stallTier: c.stallTier,
        });
      }
    },
  );

  // R-20 / LC-07: CERT metrics via mirror+seq (same pattern as chrome) — not runOnJS in onFrame.
  const logCertMetricsLine = useCallback(
    (
      p50: number,
      p95: number,
      mean: number,
      fps: number,
      n: number,
      over: number,
    ) => {
      console.log(
        `[cert-metrics] p50=${p50.toFixed(2)} p95=${p95.toFixed(2)} mean=${mean.toFixed(2)} fps=${fps.toFixed(1)} n=${n} over16.7=${over}`,
      );
    },
    [],
  );
  useAnimatedReaction(
    () => certSeq.value,
    (seq, prev) => {
      if (prev === null || seq === prev) {
        return;
      }
      const c = certOut.value;
      runOnJS(logCertMetricsLine)(c.p50, c.p95, c.mean, c.fps, c.n, c.over);
    },
  );

  const onPause = useCallback(() => {
    clearCountdown();
    setCountdownNumeral(null);
    setUiPhase('paused');
    setActive(false);
  }, [clearCountdown, setActive]);

  const onResume = useCallback(() => {
    if (!levelReady || levelError != null || !fxReady) {
      return;
    }
    clearCountdown();
    setUiPhase('countdown');
    setCountdownNumeral(3);
    const t1 = setTimeout(() => setCountdownNumeral(2), 1000);
    const t2 = setTimeout(() => setCountdownNumeral(1), 2000);
    const t3 = setTimeout(() => {
      setCountdownNumeral(null);
      setUiPhase('playing');
      setActive(true);
    }, 3000);
    countdownTimers.current = [t1, t2, t3];
  }, [clearCountdown, setActive, levelReady, levelError, fxReady]);

  /**
   * Start an endless run (N-END-01 / D-05 / D-10).
   *
   * `retry()` is correct HERE and only here: it resets lives, score and combo onto
   * the already-pushed generated board, which is exactly what a new run is. Every
   * SUBSEQUENT transition uses `advanceWave()` instead — calling `retry()` at a wave
   * boundary would destroy the three fields SC-1 exists to carry.
   *
   * 11-07 gap 1: declared HERE, above `onRetry` and `remountDevSession`, because both
   * now list it in their dependency arrays. A `useCallback` dependency array is
   * evaluated during render, so a later `const` would sit in the temporal dead zone
   * and throw `ReferenceError` on the first render — the position is load-bearing,
   * not cosmetic.
   */
  const startEndlessRun = useCallback(() => {
    // A-01, decided `retry-in-place` by the owner on 2026-09-26. Both early returns
    // below leave the Results overlay exactly where it is, with `Retry` still live —
    // the overlay's `setResult(null)` is further down and never runs. What they add is
    // the body copy, contract-fixed as:
    //
    //     Wave 1 could not be built — tap Retry
    //
    // (11-UI-SPEC § Endless copy, rendered by 11-08). `Wave 1` is a LITERAL, never
    // templated: a Retry-time failure is by construction a wave-1 failure. The mid-run
    // body `Wave {n} could not be built — run saved` is deliberately NOT reused here —
    // there is no in-flight run to save, so it would state something untrue. Leaving
    // the old silent return was rejected too: it presents a dead-looking Retry button.
    if (!levelReady || levelError != null || !fxReady) {
      setWaveBuildFailedWave(1);
      return;
    }
    // Pitfall 7: minted in the APP tier. `src/levelgen/**` bans `Date.now()` by
    // eslint rule — a board must depend on (seed, difficulty) alone — so the wall
    // clock is read here and passed in. A fixed seed would make every endless run
    // the identical board sequence.
    runSeedRef.current = Date.now() >>> 0;
    waveRef.current = 1;
    if (!advanceToWave(1)) {
      // Pressing Retry again re-mints a different seed (`Date.now()` above), which is
      // why the live button is a real remedy and not just a nicer-looking dead end.
      setWaveBuildFailedWave(1);
      return;
    }
    modeRef.current = 'endless';
    setMode('endless');
    clearCountdown();
    setCountdownNumeral(null);
    setResult(null);
    setWaveBuildFailedWave(null);
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    setResultBest(previousBestRef.current);
    runEndedRef.current = false;
    waveAdvanceInFlightRef.current = false;
    // D-01: every run start is a NEW run — counters and wall clock both start at zero.
    runStartedAtRef.current = Date.now();
    runWallClockMsRef.current = 0;
    wallClockActiveRef.current = true;
    setLives(3);
    setScore(0);
    setCombo(1);
    setStallTier(0);
    setSimPhaseNum(SIM.DOCKED);
    setUiPhase('playing');
    retry();
    setActive(true);
  }, [
    advanceToWave,
    clearCountdown,
    retry,
    setActive,
    levelReady,
    levelError,
    fxReady,
  ]);

  const onRetry = useCallback(() => {
    if (!levelReady || levelError != null || !fxReady) {
      return;
    }
    // 11-07 gap 1 — the run boundary is MODE-AWARE. In endless a run owns a seed, a
    // wave number, a mode and an in-flight advance guard; the campaign reset below
    // touches none of them, so falling through would refill lives against the wave-N
    // generated board still sitting in `compiledSv` and let the next loss record
    // wave N+1. `startEndlessRun` is the only site that resets all four, which is why
    // routing here beats duplicating a reset.
    //
    // The funnel placement makes ONE branch satisfy TWO contract rows: reached from
    // the lose overlay `runEndedRef.current` is already true (the LOST branch set it)
    // so the funnel no-ops; reached from Pause mid-run it is false, so the in-flight
    // wave is recorded `abandoned` before the reset discards it.
    if (modeRef.current === 'endless') {
      recordInFlightEndlessRun();
      startEndlessRun();
      return;
    }
    // Keep current levelId — never cycle 01↔02 (D-11).
    clearCountdown();
    setCountdownNumeral(null);
    setResult(null);
    setWaveBuildFailedWave(null);
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    setResultBest(previousBestRef.current);
    runEndedRef.current = false;
    // D-01: every retry is a NEW run — counters and wall clock both start at zero.
    runStartedAtRef.current = Date.now();
    runWallClockMsRef.current = 0;
    wallClockActiveRef.current = true;
    setLives(3);
    setScore(0);
    setCombo(1);
    setStallTier(0);
    setSimPhaseNum(SIM.DOCKED);
    setUiPhase('playing');
    retry();
    setActive(true);
  }, [
    clearCountdown,
    retry,
    setActive,
    levelReady,
    levelError,
    fxReady,
    recordInFlightEndlessRun,
    startEndlessRun,
  ]);

  /**
   * Next = exact toggleDevLevel checklist (D-13). Change levelId only —
   * gate effect owns setActive(true). NEVER setActive(true) here (R-24).
   */
  const goNext = useCallback(() => {
    const next = nextGateId;
    if (next == null) {
      return;
    }
    setLevelId(next);
    // Clear end-of-run chrome so the new layout is visible immediately.
    // Loop re-arm: levelId → loadKey flip → bake → fxReady → gate effect
    // (retry + setActive(true)). Do not setActive(true) here — fxReady is false
    // until bake finishes (R-26 / R-24).
    clearCountdown();
    setCountdownNumeral(null);
    setResult(null);
    setWaveBuildFailedWave(null);
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    runEndedRef.current = false;
    // D-01: every retry is a NEW run — counters and wall clock both start at zero.
    runStartedAtRef.current = Date.now();
    runWallClockMsRef.current = 0;
    wallClockActiveRef.current = true;
    setLives(3);
    setScore(0);
    setCombo(1);
    setStallTier(0);
    setSimPhaseNum(SIM.DOCKED);
    setUiPhase('playing');
  }, [clearCountdown, nextGateId, setLevelId]);

  // F-30: Android hardware Back — pause mid-run; Menu from Pause/Result.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (result != null || uiPhase === 'paused') {
        handleMenuPress();
        return true;
      }
      if (uiPhase === 'playing' || uiPhase === 'countdown') {
        onPause();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [uiPhase, result, handleMenuPress, onPause]);

  const toggleDevLevel = useCallback(() => {
    const order = PLAYABLE_LEVEL_ORDER;
    setLevelId((prev) => {
      const i = order.indexOf(prev);
      const next = order[i < 0 ? 0 : (i + 1) % order.length]!;
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log(`[dev] level ${prev} → ${next}`);
      }
      return next;
    });
    // Clear end-of-run chrome so the new layout is visible immediately.
    // Loop re-arm: levelId → loadKey flip → bake → fxReady → gate effect
    // (retry + setActive(true)). Do not setActive(true) here — fxReady is false
    // until bake finishes (R-26 / R-24).
    clearCountdown();
    setCountdownNumeral(null);
    setResult(null);
    setWaveBuildFailedWave(null);
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    runEndedRef.current = false;
    // D-01: every retry is a NEW run — counters and wall clock both start at zero.
    runStartedAtRef.current = Date.now();
    runWallClockMsRef.current = 0;
    wallClockActiveRef.current = true;
    setLives(3);
    setScore(0);
    setCombo(1);
    setStallTier(0);
    setSimPhaseNum(SIM.DOCKED);
    setUiPhase('playing');
  }, [clearCountdown, setLevelId]);

  /** DEV force Low→Mid→High→auto; session remount via budget change + retry (Pitfall 5). */
  const cycleDevTier = useCallback(() => {
    setTierOverride((prev) => {
      if (prev == null) return 'low';
      if (prev === 'low') return 'mid';
      if (prev === 'mid') return 'high';
      return null;
    });
  }, []);

  const remountDevSession = useCallback(() => {
    if (!levelReady || levelError != null || !fxReady) {
      return;
    }
    // 11-07 gap 1, second half. A DEV tier change during a live endless run used to
    // reset lives/score/combo while leaving `waveRef`, `runSeedRef` and
    // `waveAdvanceInFlightRef` untouched — silently discarding the in-flight run and
    // carrying its wave into the next loss. Same funnel, same route as `onRetry`.
    if (modeRef.current === 'endless') {
      recordInFlightEndlessRun();
      startEndlessRun();
      return;
    }
    clearCountdown();
    setCountdownNumeral(null);
    setResult(null);
    setWaveBuildFailedWave(null);
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    setResultBest(previousBestRef.current);
    runEndedRef.current = false;
    // D-01: every retry is a NEW run — counters and wall clock both start at zero.
    runStartedAtRef.current = Date.now();
    runWallClockMsRef.current = 0;
    wallClockActiveRef.current = true;
    setLives(3);
    setScore(0);
    setCombo(1);
    setStallTier(0);
    setSimPhaseNum(SIM.DOCKED);
    setUiPhase('playing');
    retry();
    setActive(true);
  }, [
    clearCountdown,
    retry,
    setActive,
    levelReady,
    levelError,
    fxReady,
    recordInFlightEndlessRun,
    startEndlessRun,
  ]);

  // When DEV tier override changes, remount play session (pools reallocated via useGameLoop).
  const tierOverrideRef = useRef(tierOverride);
  useEffect(() => {
    if (tierOverrideRef.current === tierOverride) {
      return;
    }
    tierOverrideRef.current = tierOverride;
    remountDevSession();
  }, [tierOverride, remountDevSession]);

  /** Pending one-shot cert inject after level-03 + Mid remount settles. */
  const certPendingRef = useRef(false);
  const certArmedRef = useRef(false);

  const runCertWorstCase = useCallback(() => {
    // Profiling IPA: CERT_HARNESS with __DEV__ false must still arm (A1).
    if (
      !CERT_HARNESS &&
      (typeof __DEV__ === 'undefined' || !__DEV__)
    ) {
      return;
    }
    let defer = false;
    if (levelId !== 'level-03') {
      setLevelId('level-03');
      defer = true;
    }
    if (tierOverride !== 'mid') {
      setTierOverride('mid');
      defer = true;
    }
    if (defer) {
      certPendingRef.current = true;
      return;
    }
    injectCertWorstCase();
    // setLevelId / setTierOverride are stable useState setters — listed so R-24
    // deps at this cert-arm site stay explicit (exhaustive-deps must not be ignored here).
  }, [levelId, tierOverride, injectCertWorstCase, setLevelId, setTierOverride]);

  // After remount to level-03 + Mid, fire deferred cert inject once (not per-frame).
  useEffect(() => {
    if (!certPendingRef.current) {
      return;
    }
    if (
      !levelReady ||
      levelError != null ||
      !fxReady ||
      levelId !== 'level-03' ||
      tierOverride !== 'mid'
    ) {
      return;
    }
    certPendingRef.current = false;
    const t = setTimeout(() => {
      injectCertWorstCase();
    }, 50);
    return () => clearTimeout(t);
  }, [
    levelReady,
    levelError,
    fxReady,
    levelId,
    tierOverride,
    injectCertWorstCase,
  ]);

  // Optional auto-arm: CERT_HARNESS (profiling or __DEV__). Never set on production EAS.
  // Defer via timeout so we do not setState synchronously inside the effect body.
  useEffect(() => {
    if (!CERT_HARNESS || certArmedRef.current) {
      return;
    }
    if (!levelReady || levelError != null || !fxReady) {
      return;
    }
    certArmedRef.current = true;
    const t = setTimeout(() => {
      runCertWorstCase();
    }, 0);
    return () => clearTimeout(t);
  }, [levelReady, levelError, fxReady, runCertWorstCase]);

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  const showServeHint =
    levelError == null &&
    result == null &&
    uiPhase === 'playing' &&
    simPhaseNum === SIM.DOCKED;

  const tierLabel =
    tierOverride == null
      ? `Auto ${qualityTier}`
      : tierOverride === 'low'
        ? 'Low'
        : tierOverride === 'mid'
          ? 'Mid'
          : 'High';

  const devLevelSwitch =
    typeof __DEV__ !== 'undefined' && __DEV__ ? (
      <View style={styles.devRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch level, current ${levelId}`}
          onPress={toggleDevLevel}
          hitSlop={8}
          style={styles.devSwitch}
        >
          <Text style={styles.devSwitchLabel}>
            {`Lv ${levelId.slice(-2)}`}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Force quality tier, current ${tierLabel}`}
          onPress={cycleDevTier}
          hitSlop={8}
          style={styles.devSwitch}
        >
          <Text style={styles.devSwitchLabel}>{tierLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cert worst-case: level-03 Mid multi-ball particles shake"
          onPress={runCertWorstCase}
          hitSlop={8}
          style={styles.devSwitch}
        >
          <Text style={styles.devSwitchLabel}>Cert WC</Text>
        </Pressable>
        {/*
          D-05: TEMPORARY. Endless has no production entry this phase — Phase 14
          ships the real Title route and DELETES this Pressable and the wave
          readout beside it. Nothing else should grow a dependency on them.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start an endless run"
          onPress={startEndlessRun}
          hitSlop={8}
          style={styles.devSwitch}
        >
          <Text style={styles.devSwitchLabel}>Endless</Text>
        </Pressable>
        {/*
          11-UI-SPEC § Copywriting → Accessibility labels: a bare `W17` reads as
          nonsense to a screen reader. Visible text, style and the `mode` gate are
          deliberately unchanged — only the label is added.
        */}
        {mode === 'endless' ? (
          <Text
            accessibilityLabel={`Wave ${wave}`}
            style={styles.devSwitchLabel}
          >{`W${wave}`}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trigger test crash for Sentry N-OPS-01 verification"
          onPress={() => {
            try {
              triggerTestCrash('N-OPS-01 DEV verification crash');
            } catch {
              // Expected throw — Sentry should have captured when DSN set.
            }
          }}
          hitSlop={8}
          style={styles.devSwitch}
        >
          <Text style={styles.devSwitchLabel}>Crash</Text>
        </Pressable>
      </View>
    ) : null;

  return (
    <>
      {keepAwake}
      <GameScreen
        picture={picture}
        surfaceSize={surfaceSize}
        playfieldGesture={gesture}
        uiPhase={uiPhase}
        result={result}
        lives={lives}
        score={score}
        best={resultBest}
        // The `mode` STATE, not `modeRef` — the overlay has to re-render on the flip,
        // and a ref read during render would hand it the pre-flip value.
        mode={mode}
        wave={resultWave}
        bestWave={resultBestWave}
        isNewRecord={isNewRecord}
        combo={combo}
        stallTier={stallTier}
        simPhaseNum={simPhaseNum}
        countdownNumeral={countdownNumeral}
        onPause={onPause}
        onResume={onResume}
        onRetry={onRetry}
        onMenu={handleMenuPress}
        stars={result === 'win' ? resultStars : null}
        onNext={
          result === 'win' && nextGateId != null ? goNext : null
        }
        showServeHint={showServeHint}
        levelError={levelError}
        devLevelSwitch={devLevelSwitch}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  devSwitch: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12121f',
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  devRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  devSwitchLabel: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
});
