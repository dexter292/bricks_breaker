import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { SOAK_HARNESS } from '../../src/devflags';
import { createDefaultPersonalBestStore } from '../../src/services/storage';
import { PlayingHost } from './PlayingHost';
import { TitleScreen } from './TitleScreen';

type ShellPhase = 'title' | 'playing';

/** Dwell between Title↔Playing edges during soak cycles (D-19). Not on the frame path. */
const SOAK_CYCLE_DWELL_MS = 750;
const SOAK_CYCLE_COUNT = 100;
const SOAK_CONTINUOUS_MS = 15 * 60 * 1000;

/**
 * App shell: Title ↔ Playing (D-01, D-02, D-05).
 * Shell only — PlayingHost mounts while playing so Menu unmount
 * tears down the game loop worklets (RESEARCH Pattern 1 / Pitfall 1).
 */
export function GameHost() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [shellPhase, setShellPhase] = useState<ShellPhase>('title');
  const [best, setBest] = useState(0);
  // F-26: same singleton as PlayingHost — Title best matches Playing.
  const store = useMemo(() => createDefaultPersonalBestStore(), []);

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

    const runCycle = (index: number) => {
      if (cancelled) return;
      if (index >= SOAK_CYCLE_COUNT) {
        setShellPhase('playing');
        console.log(
          `[soak] cycles done (${SOAK_CYCLE_COUNT}); continuous play ${SOAK_CONTINUOUS_MS}ms`,
        );
        schedule(() => {
          setShellPhase('title');
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

  if (shellPhase === 'title') {
    return (
      <TitleScreen best={best} onPlay={() => setShellPhase('playing')} />
    );
  }

  return <PlayingHost onMenu={() => setShellPhase('title')} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
