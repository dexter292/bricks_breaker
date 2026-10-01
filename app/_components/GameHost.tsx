import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { CERT_HARNESS, LEVELGEN_PROBE, SOAK_HARNESS } from '../../src/devflags';
import { CORPUS_SEEDS, D_MAX, corpusFingerprint } from '../../src/levelgen';
import type { LevelId } from '../../src/runtime/loadLevel';
import {
  createDefaultProgressStore,
  currentDailyStreak,
} from '../../src/services/storage';
import { hasResultFor, localDateKey } from '../../src/services/daily';
import { AchievementsScreen } from './AchievementsScreen';
import { PlayingHost, type EntryMode } from './PlayingHost';
import { SelectScreen } from './SelectScreen';
import { StatisticsScreen } from './StatisticsScreen';
import { TitleScreen } from './TitleScreen';

type ShellPhase = 'title' | 'select' | 'playing' | 'stats' | 'achievements';

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
  // A1 probe (Phase 10 plan 05): compute the corpus fingerprint on THIS device's JS engine.
  // Hermes is the one execution environment no vitest run, CI runner or Node process reaches,
  // so byte-identity with Node is spec-based inference until this line prints a matching value.
  // Double-gated (EXPO_PUBLIC_LEVELGEN_PROBE=1 *and* __DEV__) because the corpus is
  // CORPUS_SEEDS x (D_MAX + 1) = 4 200 generated boards — ~140 ms on Node, more on Hermes.
  // Unarmed builds must not pay it, so nothing is computed before the early return.
  // Cold path: one-shot at shell mount, the same slot the CERT log uses. Never renders,
  // never sets state, never touches the game loop.
  useEffect(() => {
    if (!LEVELGEN_PROBE) return;
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    const startedAt = Date.now();
    const fingerprint = corpusFingerprint();
    const elapsedMs = Date.now() - startedAt;
    const hex = (fingerprint >>> 0).toString(16).padStart(8, '0');
    console.log(
      `[levelgen] corpus fingerprint u32=0x${hex} seeds=${CORPUS_SEEDS} boards=${
        CORPUS_SEEDS * (D_MAX + 1)
      } ms=${elapsedMs} (expected 0x2e8f6c23 — see docs/ops/BOARD-GENERATOR.md § Limits)`,
    );
  }, []);
  const [best, setBest] = useState(0);
  const [activeLevelId, setActiveLevelId] = useState<LevelId>('level-01');
  // D-04: which run Title dispatched into; reset to campaign on every onMenu so
  // no shell state survives a run.
  const [entryMode, setEntryMode] = useState<EntryMode>('campaign');
  // N-UI-01 (14-06) — Title's three read-once-per-entry values, populated beside `best`
  // from the SAME snapshot read below.
  const [dailyPlayedToday, setDailyPlayedToday] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);
  // F-26: same ProgressStore singleton as PlayingHost — Title rollup matches max.
  const store = useMemo(() => createDefaultProgressStore(), []);

  useEffect(() => {
    if (shellPhase !== 'title') return;
    let cancelled = false;
    // The clock is read ONCE, here, inside the effect body — never in the render body,
    // where react-hooks/purity is severity error. Today's date key is derived from it in
    // the next statement, matching the shipped daily path (PlayingHost's startDailyRun).
    const nowMs = Date.now();
    const todayKey = localDateKey(nowMs);
    void store
      .getSnapshot()
      .then((snap) => {
        if (cancelled) return;
        setBest(snap.bestScore);
        // The same predicate startDailyRun evaluates the open/closed decision with —
        // Title and the daily panel read one truth through one function.
        setDailyPlayedToday(
          hasResultFor(
            snap.telemetry.daily.history.map((e) => e.date),
            todayKey,
          ),
        );
        // currentDailyStreak is the same function publishDailyPanel calls — one
        // renderer for one truth between Title and the daily panel.
        setDailyStreak(currentDailyStreak(snap.telemetry.daily));
        setUnseenCount(snap.telemetry.achievements.unseen.length);
      })
      .catch(() => {
        if (!cancelled) {
          setBest(0);
          setDailyPlayedToday(false);
          setDailyStreak(0);
          setUnseenCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shellPhase, store]);

  // DEV soak: 100 Title↔Playing mounts then 15 min continuous (D-19…D-23).
  // Discrete setTimeout only — never useFrameCallback / per-frame work.
  // D-01: only 'title' | 'playing' — never 'select', 'stats' or 'achievements'. A meta
  // screen inside the soak loop would measure the wrong thing.
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
        <TitleScreen
          best={best}
          dailyPlayedToday={dailyPlayedToday}
          dailyStreak={dailyStreak}
          unseenCount={unseenCount}
          onCampaign={() => setShellPhase('select')}
          onEndless={() => {
            setEntryMode('endless');
            setShellPhase('playing');
          }}
          onDaily={() => {
            setEntryMode('daily');
            setShellPhase('playing');
          }}
          onStats={() => setShellPhase('stats')}
          onAchievements={() => setShellPhase('achievements')}
        />
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

  if (shellPhase === 'stats') {
    return (
      <View style={styles.root}>
        {harnessAwake}
        <StatisticsScreen onBack={() => setShellPhase('title')} />
      </View>
    );
  }

  if (shellPhase === 'achievements') {
    return (
      <View style={styles.root}>
        {harnessAwake}
        <AchievementsScreen onBack={() => setShellPhase('title')} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {harnessAwake}
      <PlayingHost
        levelId={CERT_HARNESS ? 'level-03' : activeLevelId}
        onLevelIdChange={setActiveLevelId}
        entryMode={CERT_HARNESS ? 'campaign' : entryMode}
        onMenu={() => {
          setEntryMode('campaign');
          setShellPhase('title');
        }}
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
