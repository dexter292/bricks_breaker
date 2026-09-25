import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { CERT_HARNESS, SOAK_HARNESS } from '../../src/devflags';
import type { LevelId } from '../../src/runtime/loadLevel';
import { createDefaultProgressStore } from '../../src/services/storage';
import { PlayingHost } from './PlayingHost';
import { SelectScreen } from './SelectScreen';
import { TitleScreen } from './TitleScreen';

type ShellPhase = 'title' | 'select' | 'playing';

/** Dwell between Title↔Playing edges during soak cycles (D-19). Not on the frame path. */
const SOAK_CYCLE_DWELL_MS = 750;
const SOAK_CYCLE_COUNT = 100;
const SOAK_CONTINUOUS_MS = 15 * 60 * 1000;

/** Keep screen on for soak / CERT (Title would otherwise allow sleep). */
function HarnessKeepAwake() {
  useKeepAwake('NeonBrickHarness');
  return null;
}

/**
 * App shell: Title → Select → Playing (D-01, D-14, D-17, D-22).
 * CERT/SOAK stay Title↔Playing only — never insert Select (D-01).
 * PlayingHost mounts while playing so Menu unmount tears down worklets.
 */
export function GameHost() {
  // Intentional second useFonts site (PlayingHost also loads SpaceMono for HUD).
  // expo-font caches by URI — duplicate call is cheap, keeps Title self-contained when Playing unmounts.
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });
  // Cert WC: skip Title+Select so Instruments can attach to an active playfield immediately.
  // Allowed when EXPO_PUBLIC_CERT=1 even if __DEV__ is false (profiling IPA).
  const [shellPhase, setShellPhase] = useState<ShellPhase>(() =>
    CERT_HARNESS && !SOAK_HARNESS ? 'playing' : 'title',
  );
  useEffect(() => {
    if (!CERT_HARNESS) return;
    console.log('[cert] GameHost CERT=1 phase=playing (skip Title)');
  }, []);
  const [best, setBest] = useState(0);
  const [activeLevelId, setActiveLevelId] = useState<LevelId>('level-01');
  // F-26: same ProgressStore singleton as PlayingHost — Title rollup matches max.
  const store = useMemo(() => createDefaultProgressStore(), []);

  useEffect(() => {
    if (shellPhase !== 'title') return;
    let cancelled = false;
    void store
      .getBest()
      .then((b) => {
        if (!cancelled) setBest(b);
      })
      .catch(() => {
        if (!cancelled) setBest(0);
      });
    return () => {
      cancelled = true;
    };
  }, [shellPhase, store]);

  // DEV soak: 100 Title↔Playing mounts then 15 min continuous (D-19…D-23).
  // Discrete setTimeout only — never useFrameCallback / per-frame work.
  // D-01: only 'title' | 'playing' — never 'select'.
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__ || !SOAK_HARNESS) {
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      if (cancelled) return;
      const id = setTimeout(() => {
        if (cancelled) return;
        fn();
      }, ms);
      timers.push(id);
    };

    /** Operator checklist — adb cannot run from JS; paste dumpsys into Results. */
    const logAdbChecklist = (phase: 'start' | 'end') => {
      const ts = new Date().toISOString();
      console.log(`[soak] meminfo REQUEST phase=${phase} ts=${ts}`);
      console.log(
        `[soak] meminfo CMD: adb shell dumpsys meminfo com.dexter292.bricksbreaker`,
      );
      console.log(`[soak] gfxinfo REQUEST phase=${phase} ts=${ts}`);
      console.log(
        `[soak] gfxinfo CMD: adb shell dumpsys gfxinfo com.dexter292.bricksbreaker`,
      );
    };

    const runCycle = (index: number) => {
      if (cancelled) return;
      if (index >= SOAK_CYCLE_COUNT) {
        setShellPhase('playing');
        console.log(
          `[soak] cycles done (${SOAK_CYCLE_COUNT}); continuous play ${SOAK_CONTINUOUS_MS}ms`,
        );
        schedule(() => {
          setShellPhase('title');
          logAdbChecklist('end');
          console.log(
            `[soak] complete: ${SOAK_CYCLE_COUNT} Title↔Playing cycles + ${SOAK_CONTINUOUS_MS}ms continuous`,
          );
        }, SOAK_CONTINUOUS_MS);
        return;
      }

      setShellPhase('playing');
      schedule(() => {
        setShellPhase('title');
        schedule(() => runCycle(index + 1), SOAK_CYCLE_DWELL_MS);
      }, SOAK_CYCLE_DWELL_MS);
    };

    console.log(
      `[soak] arming: ${SOAK_CYCLE_COUNT} cycles @ ${SOAK_CYCLE_DWELL_MS}ms then ${SOAK_CONTINUOUS_MS}ms continuous`,
    );
    logAdbChecklist('start');
    schedule(() => runCycle(0), SOAK_CYCLE_DWELL_MS);

    return () => {
      cancelled = true;
      for (const id of timers) {
        clearTimeout(id);
      }
    };
  }, []);

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  const harnessAwake =
    CERT_HARNESS ||
    (typeof __DEV__ !== 'undefined' && __DEV__ && SOAK_HARNESS) ? (
      <HarnessKeepAwake />
    ) : null;

  if (shellPhase === 'title') {
    return (
      <View style={styles.root}>
        {harnessAwake}
        <TitleScreen best={best} onPlay={() => setShellPhase('select')} />
      </View>
    );
  }

  if (shellPhase === 'select') {
    return (
      <View style={styles.root}>
        {harnessAwake}
        <SelectScreen
          onBack={() => setShellPhase('title')}
          onChoose={(id) => {
            setActiveLevelId(id);
            setShellPhase('playing');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {harnessAwake}
      <PlayingHost
        levelId={CERT_HARNESS ? 'level-03' : activeLevelId}
        onMenu={() => setShellPhase('title')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
