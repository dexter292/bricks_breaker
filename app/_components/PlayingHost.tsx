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
} from '../../src/runtime/useGameLoop';

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
  const [simPhaseNum, setSimPhaseNum] = useState<number>(SIM.DOCKED);
  const [levelId, setLevelId] = useState<LevelId>('level-01');

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

  const countdownTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearCountdown = useCallback(() => {
    for (const t of countdownTimers.current) {
      clearTimeout(t);
    }
    countdownTimers.current = [];
  }, []);

  useEffect(() => () => clearCountdown(), [clearCountdown]);

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

  const { picture, surfaceSize, setActive, retry } = useGameLoop({
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
  });

  // Push compiled into SharedValue + gate setActive (external systems — D-13, D-14).
  // Frame callback autostarts false; only setActive(true) after load ok.
  useEffect(() => {
    if (!loadResult.ok) {
      console.error('[level]', loadResult.issues);
      compiledSv.value = null;
      setActive(false);
      return;
    }
    compiledSv.value = loadResult.compiled;
    // Apply to existing world if already allocated; first frame handles cold start.
    retry();
    setActive(true);
  }, [loadResult, compiledSv, setActive, retry]);

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

  const applyWorldChrome = useCallback(
    (phase: number, livesCount: number) => {
      setSimPhaseNum(phase);
      setLives(livesCount);
      if (phase === SIM.WON) {
        setResult('win');
        setActive(false);
      } else if (phase === SIM.LOST) {
        setResult('lose');
        setActive(false);
      }
    },
    [setActive],
  );

  // Dedicated SharedValue writes from the loop trigger this; World field
  // mutation alone would not (LC-07 chrome bridge).
  // Lives/phase stay packed (8-bit safe). Score/combo/stall use separate
  // reactions — scores exceed 8 bits and must not share the pack.
  useAnimatedReaction(
    () => (simPhaseSv.value << 8) | (livesSv.value & 0xff),
    (packed, prev) => {
      const phase = packed >> 8;
      const livesCount = packed & 0xff;
      if (prev === null || packed !== prev) {
        runOnJS(applyWorldChrome)(phase, livesCount);
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
    if (!levelReady || levelError != null) {
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
  }, [clearCountdown, setActive, levelReady, levelError]);

  const onRetry = useCallback(() => {
    if (!levelReady || levelError != null) {
      return;
    }
    // Keep current levelId — never cycle 01↔02 (D-11).
    clearCountdown();
    setCountdownNumeral(null);
    setResult(null);
    setLives(3);
    setScore(0);
    setCombo(1);
    setStallTier(0);
    setSimPhaseNum(SIM.DOCKED);
    setUiPhase('playing');
    retry();
    setActive(true);
  }, [clearCountdown, retry, setActive, levelReady, levelError]);

  const toggleDevLevel = useCallback(() => {
    setLevelId((prev) => (prev === 'level-01' ? 'level-02' : 'level-01'));
  }, []);

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  const showServeHint =
    levelError == null &&
    result == null &&
    uiPhase === 'playing' &&
    simPhaseNum === SIM.DOCKED;

  const devLevelSwitch =
    typeof __DEV__ !== 'undefined' && __DEV__ ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Switch level, current ${levelId}`}
        onPress={toggleDevLevel}
        hitSlop={8}
        style={styles.devSwitch}
      >
        <Text style={styles.devSwitchLabel}>
          {levelId === 'level-01' ? 'Lv 01' : 'Lv 02'}
        </Text>
      </Pressable>
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
  devSwitchLabel: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
});
