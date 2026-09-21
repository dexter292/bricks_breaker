import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import {
  runOnJS,
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
  loadLevelById,
  type CompiledLevel,
  type LevelId,
} from '../../src/runtime/loadLevel';
import {
  UiPhaseNum,
  useGameLoop,
  type PlayBatchFn,
} from '../../src/runtime/useGameLoop';
import { useVfxIntensity } from '../../src/runtime/useVfxIntensity';
import {
  readDeviceMemory,
  resolveQualityTier,
  type QualityTier,
} from '../../src/runtime/resolveQualityTier';
import { createDefaultAudioService, createMemoryAudioService } from '../../src/services/audio';
import { defaultPlatformServices } from '../../src/services/platform';
import {
  createDefaultPersonalBestStore,
  evaluatePersonalBest,
} from '../../src/services/storage';
import { CERT_HARNESS } from '../../src/devflags';

const LOGICAL_W = 360;
const LOGICAL_H = 640;

/** Mirror SimPhase numeric — app must not import src/core (LC-05). */
const SIM = {
  DOCKED: 0,
  PLAYING: 1,
  WON: 2,
  LOST: 3,
} as const;

type Props = {
  onMenu: () => void;
};

/**
 * Playing session host: gestures + game loop + pause FSM.
 * Unmount on Menu tears down worklets (D-01 shell Pattern 1).
 * Resume → 3·2·1 countdown → setActive(true). OS return never auto-unfreezes.
 *
 * Level cold path (D-11…D-15): loadLevelById on JS → compiled SharedValue →
 * useGameLoop applyCompiledLevel only. Fail loudly; never play invalid.
 */
export function PlayingHost({ onMenu }: Props) {
  useKeepAwake();

  const [fontsLoaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });

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
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [simPhaseNum, setSimPhaseNum] = useState<number>(SIM.DOCKED);
  const [levelId, setLevelId] = useState<LevelId>('level-03');
  /** DEV-only force; null = auto from device (D-11). */
  const [tierOverride, setTierOverride] = useState<QualityTier | null>(null);

  const store = useMemo(() => createDefaultPersonalBestStore(), []);
  const platform = useMemo(() => defaultPlatformServices(), []);
  // Soft-fail: stale native binary without ExpoAudio must not crash play (D-24).
  const audio = useMemo(() => {
    try {
      return createDefaultAudioService();
    } catch (err) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[audio] PlayingHost createDefaultAudioService soft-fail', err);
      }
      return createMemoryAudioService();
    }
  }, []);
  const previousBestRef = useRef(0);
  const runEndedRef = useRef(false);
  /** Cold-path gate: SFX preload + glow bake settled (success or soft-fail). */
  const [fxReady, setFxReady] = useState(false);

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

  const uiPhaseSv = useSharedValue<number>(UiPhaseNum.PLAYING);
  const simPhaseSv = useSharedValue<number>(SIM.DOCKED);
  const livesSv = useSharedValue<number>(3);
  const scoreSv = useSharedValue<number>(0);
  const comboSv = useSharedValue<number>(1);
  const stallTierSv = useSharedValue<number>(0);
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

  // Preload previousBest for optimistic Results (D-10 / research lock).
  useEffect(() => {
    void store
      .getBest()
      .then((b) => {
        previousBestRef.current = b;
        setResultBest(b);
      })
      .catch(() => {
        previousBestRef.current = 0;
        setResultBest(0);
      });
  }, [store]);

  // SFX preload + glow bake before play (FX-03 / D-05); soft-fail never blocks with Alert.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await audio.preload();
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[audio] preload soft-fail', err);
        }
      }
      if (cancelled) {
        return;
      }
      try {
        glowAtlasSv.value = bakeGlowSprites();
      } catch (err) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[glow] bake soft-fail', err);
        }
        glowAtlasSv.value = null;
      }
      if (cancelled) {
        return;
      }
      // Bind RN-scoped callback via ref — never assign a function into a SharedValue.
      playBatchRef.current = (codes, count) => {
        audio.playBatch(codes, count);
      };
      setFxReady(true);
    })();
    return () => {
      cancelled = true;
      playBatchRef.current = null;
      audio.release();
    };
  }, [audio, glowAtlasSv]);

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
  }, [clearCountdown]);

  const { paddleTarget, launchFlag, gesture } = usePaddleGesture({
    simPhase: simPhaseSv,
    uiPhase: uiPhaseSv,
    camScale,
  });

  const { picture, surfaceSize, setActive, retry, injectCertWorstCase } =
    useGameLoop({
      paddleTarget,
      launchFlag,
      uiPhase: uiPhaseSv,
      livesOut: livesSv,
      simPhaseOut: simPhaseSv,
      scoreOut: scoreSv,
      comboOut: comboSv,
      stallTierOut: stallTierSv,
      compiled: compiledSv,
      onOsPause,
      vfxIntensity,
      playBatch: playBatchOnJS,
      glowAtlas: glowAtlasSv,
      vfxBudget,
    });

  // Push compiled into SharedValue + gate setActive (external systems — D-13, D-14).
  // Frame callback autostarts false; only setActive(true) after load ok AND fx cold path.
  useEffect(() => {
    if (!loadResult.ok) {
      console.error('[level]', loadResult.issues);
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
    (runScore: number, outcome: 'win' | 'lose') => {
      const previous = previousBestRef.current;
      const { best, isNewRecord: record } = evaluatePersonalBest(
        runScore,
        previous,
      );
      setResultBest(best);
      setIsNewRecord(record);
      if (record) {
        previousBestRef.current = best;
        void store.setBest(best).catch(() => {});
      }
      const payload = { score: runScore, outcome, isNewRecord: record };
      platform.ads.onRunEnded(payload);
      platform.purchases.onRunEnded(payload);
      platform.accounts.onRunEnded(payload);
    },
    [platform, store],
  );

  const applyWorldChrome = useCallback(
    (phase: number, livesCount: number, runScore: number) => {
      setSimPhaseNum(phase);
      setLives(livesCount);
      if (phase === SIM.WON) {
        if (!runEndedRef.current) {
          runEndedRef.current = true;
          handleRunEnded(runScore, 'win');
        }
        setResult('win');
        setActive(false);
      } else if (phase === SIM.LOST) {
        if (!runEndedRef.current) {
          runEndedRef.current = true;
          handleRunEnded(runScore, 'lose');
        }
        setResult('lose');
        setActive(false);
      }
    },
    [handleRunEnded, setActive],
  );

  // Dedicated SharedValue writes from the loop trigger this; World field
  // mutation alone would not (LC-07 chrome bridge).
  // Lives/phase stay packed (8-bit safe). Score/combo/stall use separate
  // reactions — scores exceed 8 bits and must not share the pack.
  // Read scoreSv live at fire time so WON/LOST cold path gets current run score.
  useAnimatedReaction(
    () => (simPhaseSv.value << 8) | (livesSv.value & 0xff),
    (packed, prev) => {
      const phase = packed >> 8;
      const livesCount = packed & 0xff;
      if (prev === null || packed !== prev) {
        runOnJS(applyWorldChrome)(phase, livesCount, scoreSv.value);
      }
    },
  );

  useAnimatedReaction(
    () => scoreSv.value,
    (next, prev) => {
      if (prev === null || next !== prev) {
        runOnJS(setScore)(next);
      }
    },
  );

  useAnimatedReaction(
    () => comboSv.value,
    (next, prev) => {
      if (prev === null || next !== prev) {
        runOnJS(setCombo)(next);
      }
    },
  );

  useAnimatedReaction(
    () => stallTierSv.value,
    (next, prev) => {
      if (prev === null || next !== prev) {
        runOnJS(setStallTier)(next);
      }
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

  const toggleDevLevel = useCallback(() => {
    setLevelId((prev) => {
      if (prev === 'level-01') return 'level-02';
      if (prev === 'level-02') return 'level-03';
      return 'level-01';
    });
  }, []);

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
    if (typeof __DEV__ === 'undefined' || !__DEV__) {
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
  }, [levelId, tierOverride, injectCertWorstCase]);

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

  // Optional auto-arm: __DEV__ && CERT_HARNESS only (never production).
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) {
      return;
    }
    if (!CERT_HARNESS || certArmedRef.current) {
      return;
    }
    if (!levelReady || levelError != null || !fxReady) {
      return;
    }
    certArmedRef.current = true;
    runCertWorstCase();
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
            {levelId === 'level-01'
              ? 'Lv 01'
              : levelId === 'level-02'
                ? 'Lv 02'
                : 'Lv 03'}
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
      </View>
    ) : null;

  return (
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
      showServeHint={showServeHint}
      levelError={levelError}
      devLevelSwitch={devLevelSwitch}
    />
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
