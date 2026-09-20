import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { usePaddleGesture } from '../../src/input';
import { GameScreen, type GameScreenUiPhase } from '../../src/runtime/GameScreen';
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

/**
 * LC-05 composition host: gestures + game loop + pause FSM.
 * Resume → 3·2·1 countdown → setActive(true). OS return never auto-unfreezes.
 */
export function GameHost() {
  useKeepAwake();

  const [fontsLoaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [uiPhase, setUiPhase] = useState<GameScreenUiPhase>('playing');
  const [countdownNumeral, setCountdownNumeral] = useState<number | null>(
    null,
  );
  const [lives, setLives] = useState(3);
  const [result, setResult] = useState<null | 'win' | 'lose'>(null);
  const [simPhaseNum, setSimPhaseNum] = useState(SIM.DOCKED);

  const uiPhaseSv = useSharedValue(UiPhaseNum.PLAYING);
  const simPhase = useSharedValue(SIM.DOCKED);
  const camScale = useSharedValue(1);

  const countdownTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearCountdown = useCallback(() => {
    for (const t of countdownTimers.current) {
      clearTimeout(t);
    }
    countdownTimers.current = [];
  }, []);

  useEffect(() => () => clearCountdown(), [clearCountdown]);

  // Mirror React ui shell → SharedValue (discrete — not per physics frame)
  useEffect(() => {
    const mapped =
      uiPhase === 'playing'
        ? UiPhaseNum.PLAYING
        : uiPhase === 'paused'
          ? UiPhaseNum.PAUSED
          : UiPhaseNum.COUNTDOWN;
    uiPhaseSv.value = mapped;
  }, [uiPhase, uiPhaseSv]);

  const { paddleTarget, launchFlag, gesture } = usePaddleGesture({
    simPhase,
    uiPhase: uiPhaseSv,
    camScale,
  });

  const onOsPause = useCallback(() => {
    clearCountdown();
    setCountdownNumeral(null);
    setUiPhase('paused');
  }, [clearCountdown]);

  const { world, picture, surfaceSize, setActive, retry } = useGameLoop({
    paddleTarget,
    launchFlag,
    uiPhase: uiPhaseSv,
    onOsPause,
  });

  // Keep camScale in sync with letterboxed surface (same as makeCamera)
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

  // Discrete phase/lives edges only (LC-07 exception lives in app/, not runtime)
  useAnimatedReaction(
    () => {
      const w = world.value;
      if (!w) {
        return -1;
      }
      return (w.simPhase << 8) | (w.lives & 0xff);
    },
    (packed, prev) => {
      if (packed < 0) {
        return;
      }
      const phase = packed >> 8;
      const livesCount = packed & 0xff;
      simPhase.value = phase;
      if (prev === null || packed !== prev) {
        runOnJS(applyWorldChrome)(phase, livesCount);
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
    clearCountdown();
    setUiPhase('countdown');
    setCountdownNumeral(3);
    // Keep frozen through countdown — do not setActive(true) yet
    const t1 = setTimeout(() => setCountdownNumeral(2), 1000);
    const t2 = setTimeout(() => setCountdownNumeral(1), 2000);
    const t3 = setTimeout(() => {
      setCountdownNumeral(null);
      setUiPhase('playing');
      setActive(true);
    }, 3000);
    countdownTimers.current = [t1, t2, t3];
  }, [clearCountdown, setActive]);

  const onRetry = useCallback(() => {
    clearCountdown();
    setCountdownNumeral(null);
    setResult(null);
    setLives(3);
    setSimPhaseNum(SIM.DOCKED);
    setUiPhase('playing');
    retry();
    setActive(true);
  }, [clearCountdown, retry, setActive]);

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  const showServeHint =
    result == null && uiPhase === 'playing' && simPhaseNum === SIM.DOCKED;

  return (
    <GameScreen
      picture={picture}
      surfaceSize={surfaceSize}
      playfieldGesture={gesture}
      uiPhase={uiPhase}
      result={result}
      lives={lives}
      countdownNumeral={countdownNumeral}
      onPause={onPause}
      onResume={onResume}
      onRetry={onRetry}
      showServeHint={showServeHint}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
});
