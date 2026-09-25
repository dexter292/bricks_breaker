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
  loadLevelById,
  type CompiledLevel,
  type LevelId,
} from '../../src/runtime/loadLevel';
import {
  UiPhaseNum,
  useGameLoop,
  type ChromeMirror,
  type PlayBatchFn,
} from '../../src/runtime/useGameLoop';
import { useVfxIntensity } from '../../src/runtime/useVfxIntensity';
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
  defaultRunStatsInput,
  evaluatePersonalBest,
  isUnlocked,
  nextLevelId,
} from '../../src/services/storage';

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
  const [resultStars, setResultStars] = useState<1 | 2 | 3 | null>(null);
  const [nextGateId, setNextGateId] = useState<LevelId | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
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
  const runEndedRef = useRef(false);
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
  const levelError = loadResult.ok ? null : loadResult.issues;
  const levelReady = loadResult.ok;
  /**
   * NH-5: fx ready is derived — bake key must match current loadResult identity.
   * Changing level flips loadKey immediately so fxReady is false without setState-in-effect.
   */
  const loadKey = loadResult.ok
    ? `${levelId}:${loadResult.compiled.brickCount}:${loadResult.compiled.w[0]}x${loadResult.compiled.h[0]}`
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

  useEffect(() => {
    const mapped =
      uiPhase === 'playing'
        ? UiPhaseNum.PLAYING
        : uiPhase === 'paused'
          ? UiPhaseNum.PAUSED
          : UiPhaseNum.COUNTDOWN;
    uiPhaseSv.value = mapped;
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

  const { picture, surfaceSize, setActive, retry, injectCertWorstCase, certOut, certSeq } =
    useGameLoop({
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
    (runScore: number, outcome: 'win' | 'lose', livesRemaining: number) => {
      const previous = previousBestRef.current;
      const { best, isNewRecord: record } = evaluatePersonalBest(
        runScore,
        previous,
      );
      // Sync memory merge score/stars/unlock; void persist inside store (D-10).
      // `mode`/`stats` are required by the v4 store contract (Phase 9 Plan 02).
      // Campaign is the only mode this phase writes (D-04); the all-zero stats are
      // a placeholder Plan 04 replaces with the real per-run reducer output
      // (N-STAT-01) once PlayingHost drains run counters.
      const blob = store.recordRunEnd({
        levelId,
        mode: 'campaign',
        score: runScore,
        outcome,
        livesRemaining,
        stats: defaultRunStatsInput(),
      });
      setResultBest(best);
      setIsNewRecord(record);
      if (record) {
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
      const payload = { score: runScore, outcome, isNewRecord: record };
      platform.ads.onRunEnded(payload);
      platform.purchases.onRunEnded(payload);
      platform.accounts.onRunEnded(payload);
    },
    [platform, store, levelId],
  );

  const applyChrome = useCallback(
    (mirror: ChromeMirror) => {
      setSimPhaseNum(mirror.phase);
      setLives(mirror.lives);
      setScore(mirror.score);
      setCombo(mirror.combo);
      setStallTier(mirror.stallTier);
      if (mirror.phase === SIM.WON) {
        if (!runEndedRef.current) {
          runEndedRef.current = true;
          handleRunEnded(mirror.score, 'win', mirror.lives);
        }
        setResult('win');
        setActive(false);
      } else if (mirror.phase === SIM.LOST) {
        if (!runEndedRef.current) {
          runEndedRef.current = true;
          handleRunEnded(mirror.score, 'lose', mirror.lives);
        }
        setResult('lose');
        setActive(false);
      }
    },
    [handleRunEnded, setActive],
  );

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

  const onRetry = useCallback(() => {
    if (!levelReady || levelError != null || !fxReady) {
      return;
    }
    // Keep current levelId — never cycle 01↔02 (D-11).
    clearCountdown();
    setCountdownNumeral(null);
    setResult(null);
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    setResultBest(previousBestRef.current);
    runEndedRef.current = false;
    setLives(3);
    setScore(0);
    setCombo(1);
    setStallTier(0);
    setSimPhaseNum(SIM.DOCKED);
    setUiPhase('playing');
    retry();
    setActive(true);
  }, [clearCountdown, retry, setActive, levelReady, levelError, fxReady]);

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
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    runEndedRef.current = false;
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
        onMenu();
        return true;
      }
      if (uiPhase === 'playing' || uiPhase === 'countdown') {
        onPause();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [uiPhase, result, onMenu, onPause]);

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
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    runEndedRef.current = false;
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
    clearCountdown();
    setCountdownNumeral(null);
    setResult(null);
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    setResultBest(previousBestRef.current);
    runEndedRef.current = false;
    setLives(3);
    setScore(0);
    setCombo(1);
    setStallTier(0);
    setSimPhaseNum(SIM.DOCKED);
    setUiPhase('playing');
    retry();
    setActive(true);
  }, [clearCountdown, retry, setActive, levelReady, levelError, fxReady]);

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
        isNewRecord={isNewRecord}
        combo={combo}
        stallTier={stallTier}
        simPhaseNum={simPhaseNum}
        countdownNumeral={countdownNumeral}
        onPause={onPause}
        onResume={onResume}
        onRetry={onRetry}
        onMenu={onMenu}
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
