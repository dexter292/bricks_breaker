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
import { ACHIEVEMENT_CATALOG } from '../../src/services/achievements';
import {
  DAILY_DIFFICULTY,
  endedStreakLength,
  hasResultFor,
  isValidDateKey,
  localDateKey,
  localMidnightEndingMs,
  nextLocalMidnightMs,
} from '../../src/services/daily';
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
import { MAX_FONT_SCALE } from '../../src/runtime/textScale';
import {
  PLAYABLE_LEVEL_ORDER,
  createDefaultProgressStore,
  currentDailyStreak,
  defaultDailyRecord,
  evaluatePersonalBest,
  isUnlocked,
  nextLevelId,
  type DailyRecord,
  type RunStatsInput,
} from '../../src/services/storage';
import {
  certLevelPlanFor,
  type CertLevelPlan,
} from './certLevelPlan';

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

/**
 * The lowest wave an endless run can be at (D-01/D-02 numbering is 1-based).
 *
 * 11-09 Task 3: named only so the `__DEV__` tripwire at the mid-run
 * `setWaveBuildFailedWave` writer can state what it is checking. It is NOT a resolved
 * boundary contract — the N-END-01 boundary probe row stays flagged and unresolved,
 * because no source artifact states it (11-09 `must_haves.assumptions`).
 */
const ENDLESS_WAVE_FLOOR = 1;

/** The run kind a Title entry dispatches into (N-UI-01, 14-01). */
export type EntryMode = 'campaign' | 'endless' | 'daily';

type Props = {
  onMenu: () => void;
  /** Required — GameHost owns Select / Next / CERT levelId (D-14 / D-15). */
  levelId: LevelId;
  /** Next + DEV + cert force when controlled from GameHost. */
  onLevelIdChange?: (id: LevelId) => void;
  /** Which run Title dispatched into; drives the deferred entry effect below. */
  entryMode: EntryMode;
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
  entryMode,
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
  // 11-08 wired the READER: this value is passed to `GameScreen` below and becomes
  // the Results body copy. 11-07's scoped `eslint-disable` for
  // `@typescript-eslint/no-unused-vars` is deleted with this change — it existed only
  // for the one-plan window in which the value was written and never read.
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
  const [mode, setMode] = useState<'campaign' | 'endless' | 'daily'>('campaign');
  const modeRef = useRef<'campaign' | 'endless' | 'daily'>('campaign');
  // 14-06: the only reader of this value was the deleted `W{n}` dev readout.
  // `waveRef` below remains the source of truth for every callback; the setter is
  // kept because every wave-advance call site still needs to trigger a re-render.
  const [, setWave] = useState(1);
  const waveRef = useRef(1);
  /**
   * The local calendar date key of the daily run in flight (N-DAILY-01 / D-01).
   *
   * A ref for the reason stated above: `applyChrome` and `handleRunEnded` are memoised
   * and reached from the memoised chrome reaction, so a `useState` read inside either
   * is the value from whenever the callback was last built. It is written exactly once
   * per daily start, in the press callback — never during render, because the clock
   * read that produces it is impure and `react-hooks/purity` fails the build on one
   * (the same constraint documented below at the wall-clock refs).
   *
   * Mirrored into state for the RENDER side (`dailyDateKey` on `GameScreen`): the panel
   * has to re-render on the flip, and a ref read during render returns the pre-flip
   * value.
   */
  const dailyDateRef = useRef('');
  const [dailyDateKey, setDailyDateKey] = useState('');
  /*
   * There is deliberately NO `localTodayRef` here any more.
   *
   * One existed through 12-05 with three write sites and zero reads, and its declaration
   * claimed to be "the sole input to D-01". It was not: D-01 is evaluated in
   * `startDailyRun` against a `const dateKey` computed there from that function's own
   * single clock read, which is the right shape — the decision and the clock read that
   * justifies it are one statement apart and cannot drift. The ref carried no decision,
   * so it was dead state that `no-unused-vars` could not see because it WAS used, as an
   * assignment target.
   *
   * What that leaves unimplemented is the re-derivation half of `12-UI-SPEC.md` § Clock
   * policy rule 5: when the local date rolls over with the Daily Result panel open, the
   * countdown correctly omits itself (the boundary is pinned at publish, see
   * `publishDailyPanel`), but nothing re-derives the date or swaps the read-only panel
   * for the now-playable entry state. A player recovers by pressing Menu and re-entering,
   * so it degrades rather than traps. Recorded rather than silently carried: the honest
   * statement is that the phase shipped the omission half of rule 5 and not the
   * re-derivation half, and Phase 14 owns the Title entry surface where the stale panel
   * would mislead (N-UI-01).
   */
  /**
   * The STORED daily record, as last read or last written (12-05).
   *
   * A ref and not state: nothing renders it directly — the panel renders the SCALARS
   * derived from it — and it is read inside the memoised daily entry callback, where a
   * `useState` value would be whatever it was when that callback was last built.
   *
   * Seeded once at mount from the snapshot and refreshed from the blob every write
   * returns, so D-01 is evaluated against the record the store actually holds.
   *
   * Fail-soft to an EMPTY record, which is the playable direction. 12-UI-SPEC
   * § Storage-failure policy: an unreadable record is treated as "no stored result", so
   * a transient fault hands a player a second attempt at the day rather than locking
   * them out of it. That cost is named and accepted there; the reverse failure is
   * strictly worse.
   */
  const dailyRecordRef = useRef<DailyRecord>(defaultDailyRecord());
  /**
   * Today's board could not be generated (12-05). The date stays OPEN — nothing was
   * played, so nothing is written and nothing closes it.
   */
  const [dailyBoardFailed, setDailyBoardFailed] = useState(false);
  /**
   * The Daily Result panel's scalars (12-05).
   *
   * Derived HERE, in the `app` tier, and threaded down as plain numbers, because the
   * overlay cannot import the storage layer at all — that prohibition is what makes
   * SC-5 checkable at the panel's prop signature rather than by tracing a branch.
   *
   * They are set from the STORED record on both paths that can raise the panel: the
   * one that has just closed the date, and (12-05 Task 3) the one that re-opens a date
   * already closed. One derivation site, one renderer, so the two cannot disagree.
   */
  const [dailyStreak, setDailyStreak] = useState(0);
  const [dailyLongestStreak, setDailyLongestStreak] = useState(0);
  const [dailyTotalDaysPlayed, setDailyTotalDaysPlayed] = useState(0);
  const [dailyEndedStreakLength, setDailyEndedStreakLength] = useState<
    number | null
  >(null);
  /**
   * The result panel's unlock block, as DISPLAY NAMES (13-01 / N-ACH-03 / D-08).
   *
   * Derived HERE, in the `app` tier, and threaded down as plain strings, for the reason
   * the daily scalars above are: the overlay cannot import the storage layer at all, and
   * that prohibition is what makes D-08 checkable at the panel's prop signature rather
   * than by tracing a branch. `eslint.config.js` permits `app -> services` and forbids
   * `runtime -> services`.
   *
   * Set from the ids `recordRunEnd` RETURNS (D-19), on every run end, from one site —
   * `publishUnlockedAchievements` below.
   */
  const [unlockedAchievementNames, setUnlockedAchievementNames] = useState<
    readonly string[]
  >([]);
  /**
   * The instant the countdown is computed against, and the local midnight it counts to.
   *
   * Derived, NEVER accumulated: the remainder is `boundary - now` computed from a
   * single clock read each time the value is refreshed, with no stored deadline, no
   * elapsed-time accumulator and no ticking counter to decrement. A clock jump
   * therefore changes only the next computed value and can make nothing else go stale,
   * because there is no second piece of state to disagree with it.
   */
  const [dailyNowMs, setDailyNowMs] = useState(0);
  const [dailyNextBoundaryMs, setDailyNextBoundaryMs] = useState(0);
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
  /** Once-only latch for the entry-mode dispatch effect below (14-01). */
  const entryDispatchedRef = useRef(false);
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
        // The ASSIGNMENT is the campaign PB cache and is unconditional by design: it
        // must stay warm while endless is live so the campaign Best is correct the
        // moment the player exits, with no storage round trip.
        previousBestRef.current = b;
        // The PUBLICATION is the player-visible record and belongs to the mode the
        // player is actually in. 11-VERIFICATION.md gap 1: unguarded, this line
        // repainted a MOUNTED endless Results overlay's `Best ·` with a campaign
        // per-level best (measured 4200 -> 7777) whenever the read landed late.
        // The endless exit republishes the cached value synchronously — see
        // `toggleDevLevel`.
        if (modeRef.current !== 'endless') {
          setResultBest(b);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Same split on the fail-soft arm: the cache zeroes unconditionally, the
        // publication is mode-gated. An endless player must not have their `Best ·`
        // reset to 0 by a CAMPAIGN read failing.
        previousBestRef.current = 0;
        if (modeRef.current !== 'endless') {
          setResultBest(0);
        }
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
        // 12-05 / D-01: the stored daily record, on the same single read. It is the
        // sole input to "is this local date playable", and it rides this effect rather
        // than a second one because it is the same global sub-object read at the same
        // moment — a second `getSnapshot()` would be a second answer to one question.
        const daily = blob.telemetry?.daily;
        dailyRecordRef.current = Array.isArray(daily?.history)
          ? daily
          : defaultDailyRecord();
      })
      .catch(() => {
        if (cancelled) return;
        endlessBestScoreRef.current = 0;
        endlessBestWaveRef.current = 0;
        // Treat an unreadable record as NO stored result, which leaves every date
        // playable. The named cost (12-UI-SPEC § Storage-failure) is that a transient
        // fault can hand a player a second attempt at the day; the alternative locks
        // them out of it on the same fault, which is strictly worse.
        dailyRecordRef.current = defaultDailyRecord();
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

  /**
   * The app returned to the foreground (12-05; 12-UI-SPEC § Clock policy rules 1-2).
   *
   * Threaded into the app's ONE `AppState` subscription via `useGameLoop`'s
   * `onOsForeground`, rather than added as a second subscription. It resumes nothing:
   * see `appStatePause.ts`'s never-resume paragraph (PLT-01 / T-03-03).
   *
   * A CALLBACK and not render work, because it reads the clock — `reactCompiler` is on
   * and `react-hooks/purity` fails the build on an impure call during render, which
   * this file already documents at the wall-clock refs.
   *
   * ONE thing, read-only with respect to stored state: bump the injected instant the
   * panel computes its countdown against. DERIVED, never accumulated — one clock read,
   * no stored deadline, no elapsed-time accumulator, no counter to decrement, so a clock
   * jump changes only the next computed value and there is no second piece of state to
   * disagree with it.
   *
   * It does NOT re-derive the local date. It used to write one into a ref nothing read;
   * see the note where that ref was declared for what rule 5 therefore does not do on a
   * foreground. `dailyDateRef` is untouched here either way, for the SC-1 reason stated
   * at its declaration: the run's own date must never move under a later clock read.
   *
   * `dailyNextBoundaryMs` is deliberately NOT re-derived here. It is pinned to the
   * local midnight that ends the date the PANEL is showing, set once when the panel is
   * published. Re-deriving it from `now` would make the remainder permanently positive
   * and the countdown could never expire; leaving it pinned is what makes rule 5 fall
   * out for free — once the date rolls, the remainder goes non-positive and the line
   * omits itself rather than counting down to a second tomorrow.
   */
  const onOsForeground = useCallback(() => {
    setDailyNowMs(Date.now());
  }, []);

  /**
   * The 60-second countdown refresh (12-UI-SPEC § Clock policy rule 4).
   *
   * **Scoped to the Daily Result panel being open, and that is a MEASURED requirement
   * rather than a style choice.** Induced unconditionally on a clean tree, this
   * interval reds `PlayingHost.endless-run`, `PlayingHost.endless-record`,
   * `PlayingHost.endless-retry` and `PlayingHost.next-bake` with
   * `Aborting after running 10000 timers, assuming an infinite loop!` — those four call
   * `vi.runAllTimers()` against a mounted host, which a live recurring timer makes
   * non-terminating by construction. No plan in this phase owns those four files, so
   * an unconditional interval would be a defect with no owner. Scoped: 158 passed.
   * Unconditional: 67 failed across four files.
   *
   * It is not a scope reduction either. The countdown renders on exactly one surface,
   * and the HUD strip is contractually forbidden from carrying it, so an interval
   * running while the panel is closed would refresh nothing a player can see. Minute
   * granularity is the whole reason 60 seconds suffices — a per-second timer would buy
   * a digit nobody reads and keep a timer alive behind a result panel (T-12-23).
   */
  const dailyPanelOpen = mode === 'daily' && result != null;
  useEffect(() => {
    if (!dailyPanelOpen) {
      return;
    }
    const id = setInterval(() => {
      setDailyNowMs(Date.now());
    }, 60_000);
    return () => {
      clearInterval(id);
    };
  }, [dailyPanelOpen]);

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
    onOsForeground,
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
    // 12-01 / N-DAILY-01: the same prohibition, for the same reason, as its own
    // statement. A daily board is generated from the date key and written straight into
    // `compiledSv` by `startDailyRun`, so the level LOAD RESULT is not its source
    // either — letting this effect run on an `fxReady` or `loadResult` change mid-run
    // would overwrite the live daily board with the campaign level and call `retry()`.
    //
    // Deliberately NOT folded into the line above as `!== 'campaign'`: the endless
    // guard's exact text is a SOURCE CONTRACT pinned by
    // `tests/ui/PlayingHost.endless-host.test.ts` ("the compiled-push effect is a
    // no-op during an endless run, gated by ref"), and collapsing the two would delete
    // the anchor that test reads. One mode, one guard, each falsifiable on its own.
    if (modeRef.current === 'daily') {
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

  /**
   * Publish the Daily Result panel's scalars from a STORED daily record (12-05).
   *
   * **The single derivation site**, and that is the point. `12-UI-SPEC.md` § The panel
   * is a pure function of the stored daily record requires the just-finished path and
   * the re-opened-today path to be ONE render path; the way to make that true rather
   * than merely intended is to have one function compute the numbers for both. A
   * separate "just finished" publication reading in-memory run state would be a second
   * renderer for one truth, and if two can disagree, one is wrong and no test says
   * which.
   *
   * `currentDailyStreak` rather than `streakFrom` over the stored keys — see that
   * function's own header for the measurement. The short version: `streakFrom` walks
   * the TRIMMED window and saturates at the bound, so past 400 consecutive closes it
   * reports a streak the player does not have and silently stops the record badge
   * firing for someone on their best-ever run.
   *
   * Defensive over a degraded record rather than trusting the shape: the storage rule
   * for this phase is that a read failure or a sanitiser degrade renders zeros, never
   * an error modal. There is no error modal anywhere in this phase.
   *
   * The clock is read ONCE here, in a callback — never during render, which
   * `react-hooks/purity` fails the build on. The countdown is DERIVED from that single
   * read and never accumulated.
   *
   * **The boundary comes from `date`, not from that clock read**, which is the whole of
   * `12-UI-SPEC.md` § Clock policy rule 5 and what the two comments below and
   * `docs/ops/DAILY-CHALLENGE.md` already said the code did. On the just-finished path
   * this function is called with `runDate = dailyDateRef.current` — the date the run
   * STARTED on, which must never move (D-08) — so a run begun at 23:58 and finished at
   * 00:01 shows `Daily · <yesterday>`. Deriving the boundary from the clock would then
   * advertise `New board in 23h 59m` beside it while the new date is already playable.
   * Deriving it from the shown date gives a remainder that is already zero, so the line
   * omits itself: the silent direction the UI-SPEC asks for.
   */
  const publishDailyPanel = useCallback(
    (record: DailyRecord | null | undefined, date: string) => {
      const history = Array.isArray(record?.history) ? record.history : null;
      const keys = history != null ? history.map((e) => e.date) : [];
      setDailyStreak(
        history != null && record != null ? currentDailyStreak(record) : 0,
      );
      setDailyLongestStreak(
        typeof record?.longestStreak === 'number' ? record.longestStreak : 0,
      );
      setDailyTotalDaysPlayed(
        typeof record?.totalDaysPlayed === 'number' ? record.totalDaysPlayed : 0,
      );
      setDailyEndedStreakLength(endedStreakLength(keys, date));
      const at = Date.now();
      setDailyNowMs(at);
      // A degraded date keeps a clock-derived countdown rather than losing one — showing
      // the wrong panel date with no countdown is a second failure on top of the first.
      setDailyNextBoundaryMs(
        isValidDateKey(date) ? localMidnightEndingMs(date) : nextLocalMidnightMs(at),
      );
    },
    [],
  );

  /**
   * Publish the unlock block's display names from the ids this run's write returned
   * (13-01 / N-ACH-03 / D-08 / T-13-01).
   *
   * **The single derivation site, and the only thing standing between a stored string and
   * a `Text` inside a 320px panel.** Each id is mapped to its `ACHIEVEMENT_CATALOG`
   * entry's `name`, and an id with no catalog entry is DROPPED — so the panel never
   * receives the stored string, only a catalog-authored name bounded at
   * `ACHIEVEMENT_NAME_MAX`. That is T-13-01's mitigation; `numberOfLines={1}` on the panel
   * is the second, weaker control and is named as a backstop, not as the gate.
   *
   * Catalog declaration order, not the order the ids arrived in: the catalog is walked and
   * the returned set is tested for membership, so the display order is authored rather
   * than incidental (`13-UI-SPEC.md` § Ordering is contract).
   *
   * Defensive on every read, the way `publishDailyPanel`'s are: the storage rule for this
   * phase is that a read failure or a sanitizer degrade renders NO BLOCK, never an error
   * surface. There is no error copy anywhere in this phase.
   *
   * **Called unconditionally on every run end, which is why there is ONE reset elsewhere
   * and not three.** A reset in `startEndlessRun`, on the campaign start path and at
   * every daily entry would be one rule in four places, and it is unnecessary wherever a
   * run records, because a run that records always republishes — with an empty array when
   * nothing fired.
   *
   * The states where NO run records are therefore the whole of the risk, and there are
   * three of them. Two need nothing: the endless Retry-time wave-build failure and a
   * daily board failure are both suppressed structurally by the panels' existing
   * `showRunLines` / `isClosed` gates. The THIRD is `startDailyRun`'s read-only
   * closed-date branch, where `isClosed` is true and no run happens — so the gate is
   * satisfied with nothing to show, and the previous run's names would render on the
   * daily panel. That branch resets this state explicitly and the reason is written at
   * the call site. This enumeration was incomplete when first written (13 code review
   * WR-01); it is stated as three-of-which-one-acts so a fourth run-absent state is
   * checked against it rather than assumed covered.
   */
  const publishUnlockedAchievements = useCallback((ids: unknown) => {
    const returned = Array.isArray(ids) ? ids : [];
    const wanted = new Set(
      returned.filter((id): id is string => typeof id === 'string'),
    );
    setUnlockedAchievementNames(
      ACHIEVEMENT_CATALOG.filter((a) => wanted.has(a.id)).map((a) => a.name),
    );
  }, []);

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
      /**
       * This write's newly-unlocked ids (D-19), captured from whichever arm ran.
       *
       * THREE value captures, ONE derivation — the mapping happens once after the chain
       * closes, never inside an arm. The anti-pattern is one function away: the comment
       * above is `handleRunEnded`'s own phase-11 post-mortem about the mode branch
       * happening first, and putting the evaluation or the mapping into each arm "so each
       * mode gets it" is D-01's rejected alternative wearing a third hat.
       *
       * Typed `unknown` and read defensively below. That is not belt-and-braces, it is
       * MEASURED: widening `recordRunEnd`'s return reds only the two real stores, and the
       * four mocked-store harnesses are bare object literals inside `vi.mock` factories
       * that do not break at compile time — so three of them hand this code `undefined`
       * at runtime. That is deliberate and is left that way; it keeps the fail-soft branch
       * exercised by the existing suite.
       */
      let newlyUnlocked: unknown;
      if (modeRef.current === 'daily') {
        // 12-UI-SPEC § The panel is a pure function of the stored daily record: WRITE
        // FIRST, then render the panel FROM THE STORED RECORD — the same render path a
        // re-open of the same date takes (that read path is plan 12-05's). A
        // "just-finished" view reading in-memory run state would be a second renderer
        // for one truth, and if the two can disagree, one of them is wrong and no test
        // says which.
        const runDate = dailyDateRef.current;
        // No badge fires on a daily panel and none can: D-06 gives one attempt per
        // date, so there is no per-date score to beat, and the lifetime scalars D-16
        // reserves (longest streak, days played) are plan 12-03's. `record` exists only
        // for the platform payload below.
        record = false;
        const blob = store.recordRunEnd({
          mode: 'daily',
          date: runDate,
          score: runScore,
          outcome,
          livesRemaining,
          stats,
        });
        newlyUnlocked = blob.newlyUnlocked;
        // The same synchronous post-merge read the endless arm does below — the blob
        // `recordRunEnd` RETURNS already carries the merged `telemetry.daily`, so this
        // reads the value the merge just produced rather than racing a second
        // `getSnapshot()`. Fail soft to the run's own values when the entry is absent:
        // an `abandoned` daily run does not close the date (D-07), so it legitimately
        // has no stored entry, and a storage failure renders the in-memory result
        // rather than an error modal — there is no error modal anywhere in this phase.
        const stored = blob.telemetry?.daily?.history?.find(
          (e) => e.date === runDate,
        );
        setDailyDateKey(stored?.date ?? runDate);
        setScore(stored?.score ?? runScore);
        // 12-05: the panel's streak block and countdown, derived HERE from the SAME
        // returned blob and threaded down as scalars, because the overlay cannot reach
        // storage. `publishDailyPanel` is the single derivation site — the closed-date
        // re-open path calls it too, which is what makes the two paths one renderer
        // rather than two that can disagree.
        // Refresh the D-01 input from the record the write just produced, so a second
        // entry on this date sees it as closed without a storage round trip.
        const merged = blob.telemetry?.daily;
        if (Array.isArray(merged?.history)) {
          dailyRecordRef.current = merged;
        }
        publishDailyPanel(merged, runDate);
        setIsNewRecord(false);
        // `previousBestRef` is NOT assigned, for the reason the endless arm states
        // below: it is the CAMPAIGN personal best and a daily run may not move it.
        //
        // N-DAILY-03 / SC-5: a daily run has no catalog level, so there is no
        // `bestByLevel` entry to read stars from (D-12 bans them anyway) and no next
        // level to unlock. Skipping the whole campaign follow-up is what keeps campaign
        // state untouched by daily play — and the `daily` arm carries no `levelId`, so
        // none of it is even reachable.
        setResultStars(null);
        setNextGateId(null);
      } else if (modeRef.current === 'endless') {
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
        newlyUnlocked = blob.newlyUnlocked;
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
        newlyUnlocked = blob.newlyUnlocked;
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
      // The unlock block, derived ONCE for all three modes, after the chain closes and
      // before the platform payload (13-01 / D-01 / D-19). `Array.isArray` is the fail-soft
      // guard the three mocked stores make necessary — see `newlyUnlocked`'s declaration.
      publishUnlockedAchievements(
        Array.isArray(newlyUnlocked) ? newlyUnlocked : [],
      );
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
    // Kept on ONE line, and the first three kept in order: the source-contract extractor
    // in `tests/ui/PlayingHost.endless-host.test.ts` anchors on `\n    [platform, store,
    // levelId[^\]]*\],` to slice this callback's body out. It tolerates ADDITIVE growth
    // by design; breaking the literal across lines reds five of its cases at once, none
    // of which is about dependencies.
    [platform, store, levelId, publishDailyPanel, publishUnlockedAchievements],
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
      // 11-15 — `11-VERIFICATION.md` round-3 gap 1. THE latch, and it is FIRST.
      //
      // `//` LINE COMMENTS ONLY at this site. `codeOnly()` in
      // `tests/ui/PlayingHost.endless-host.test.ts` strips `//` and leaves `/** */`
      // standing, so a block comment here could satisfy or falsify that file's
      // ordering contract on prose alone.
      //
      // 11-13 wrote this test as the first statement of the endless WON BRANCH. The
      // five writes below — sim phase, lives, score, combo, stall tier, every one of
      // them taken from the mirror — opened the function ABOVE that branch and above
      // every mode test, so the latch owned the wave and owned no number the player
      // was actually reading. 11-13's own stated design is ONE latch, EVERY boundary;
      // this is that design at the tier where it is true. The four branches below are
      // not the only consequences of a run boundary — the five writes are too.
      //
      // MEASURED PRE-FIX, on this repo's own harness with the real `ResultOverlay`
      // mounted: a run banked `{mode:'endless', wave:2, score:2400, outcome:'lose'}`
      // opens at `Score · 2400 / Best · 2400 / New Record`, and ONE straggler `WON`
      // mirror at `{lives:3, score:9999}` repaints the mounted slot to `Score · 9999`
      // above the SAME `Best · 2400` and the SAME `New Record`, under an `Out of
      // lives` heading, with host props back at score 9999 and lives 3. The CAMPAIGN
      // panel was worse: `setResult(...)` sits outside each campaign branch's own
      // `if (!runEndedRef.current)` gate, so the same straggler flipped a lost run's
      // heading from lose to win as well as its score. One statement closes both,
      // because the five writes precede both campaign branches too.
      //
      // THE BOUNDARY MIRROR ITSELF IS UNAFFECTED, which is the half that makes this a
      // latch and not a freeze: `runEndedRef` is still false when the LOST (or WON)
      // mirror arrives, so that mirror writes the run's real final score and its real
      // zero lives, and the branch it triggers is what sets the latch. The panel can
      // only open at 2400/0 because this guard let that mirror through.
      //
      // NO RESUME PATH IS LOCKED OUT. Every one of the five sites that clears this
      // latch writes its own chrome immediately afterwards, clear BEFORE write, each
      // checked at source: `startEndlessRun`, `onRetry`'s campaign branch, `goNext`'s
      // next-level reset, `toggleDevLevel`'s endless exit, and `remountDevSession`'s
      // campaign branch. A reset that ever cleared the latch WITHOUT writing chrome,
      // or wrote chrome BEFORE clearing, would strand a new run on the previous run's
      // numbers — that pairing is the safety argument, so keep it if you add a sixth.
      //
      // THIS CANNOT CHANGE WHAT REACHES TELEMETRY, and the scope is the verifier's,
      // not the review's: `recordRunEnd` stays at exactly one call across a straggler,
      // `advanceWave` never fires, no board is rebuilt, and `best` / `bestWave` /
      // `isNewRecord` are written at `handleRunEnded` and never here. The RECORD was
      // always right; the run's own score above it was not.
      //
      // REJECTED ALTERNATIVE, recorded so the choice is auditable. The verifier
      // offered a second shape: snapshot `resultScore` / `resultLives` at the run
      // boundary and hand those to `ResultOverlay` instead of the live chrome. Not
      // taken. This hoist is ONE statement and closes the campaign panel by the same
      // edit, because the same five writes precede the campaign WON and LOST branches;
      // the snapshot shape adds two more pieces of state that all five reset paths
      // would then also have to maintain, and it leaves the HUD BEHIND the overlay
      // still repainting from a finished run. Pick one and do not leave the overlay
      // reading mutable state — this picks the hoist.
      if (runEndedRef.current) {
        return;
      }
      setSimPhaseNum(mirror.phase);
      setLives(mirror.lives);
      setScore(mirror.score);
      setCombo(mirror.combo);
      setStallTier(mirror.stallTier);
      // SC-1 — "the run ends only when lives reach zero". In endless there is no
      // run-ending WON: a cleared board is a WAVE boundary, so this branch goes
      // ahead of the campaign WON branch and returns in every path, which is what
      // keeps `handleRunEnded` and `setActive(false)` below unreachable on a win.
      //
      // 12-01 / D-10: the condition stays PINNED to endless, and that pin is the
      // whole daily contract at this site. A cleared daily board ENDS the run — it is
      // one board, not a wave sequence — so daily must fall through to the ordinary
      // WON branch below. Reaching this intercept from daily would silently advance
      // the board and leave the date open forever, which is the one way a date can
      // never close.
      if (modeRef.current === 'endless' && mirror.phase === SIM.WON) {
        // 11-13 — `11-VERIFICATION.md` gap 3. THE missing term, and it is first.
        //
        // `applyChrome`'s whole design is ONE latch, EVERY boundary: the campaign
        // WON, the campaign LOST and the mid-run wave-build failure below all gate
        // on `runEndedRef`. This branch was the single asymmetry — it gated on
        // `modeRef` and `waveAdvanceInFlightRef` only, and the inner
        // `if (!waveAdvanceInFlightRef.current)` guards CONCURRENCY, not run
        // lifetime. So once the run had ended, a further WON mirror still generated,
        // compiled and swapped in a board and still bumped the wave. Measured: LOST
        // at W2, then ONE WON mirror gave W3 with `advanceWave` called once and the
        // compiled board changed; four more WON/DOCKED pairs reached W6 with the
        // lose overlay still on screen.
        //
        // It RETURNS, and the return is not interchangeable with a fall-through. An
        // endless WON that fell through would reach the campaign WON branch below,
        // which calls `handleRunEnded` with a `win` outcome and `setResult('win')` on
        // a cleared board — ending an endless run on a wave boundary, which is the
        // SC-1 violation this branch exists to prevent.
        //
        // Gating here is SAFE because a new run un-latches before its first mirror:
        // `startEndlessRun`'s success path clears both `runEndedRef.current` and
        // `waveAdvanceInFlightRef.current`.
        //
        // Severity, honestly, because `11-REVIEW.md` CR-01 called this CRITICAL and
        // the verifier downgraded it on proof: no walked wave can reach
        // `telemetry.endless.bestWave`. Every path that clears `runEndedRef` either
        // routes through a wave-1 restart or exits to campaign, and from an ended run
        // `Menu` records nothing because the latch already holds. This was an
        // incoherent ENDED state, a burned seed walk and a self-contradicting
        // overlay — not a false record.
        //
        // 11-15 — the guard this comment describes now lives at the TOP of
        // `applyChrome`, above the five mirror-sourced writes, and the copy that used
        // to sit here has been REMOVED rather than left standing as a second, dead
        // test of the same ref. Control cannot reach this line with
        // `runEndedRef.current` true, so an inner copy could not be killed by any
        // mutation and would contradict the "ONE latch, EVERY boundary" design in the
        // paragraphs above. The ordering assertions 11-13 wrote against this branch
        // are re-pointed at the function preamble in
        // `tests/ui/PlayingHost.endless-host.test.ts`; the concurrency guard below is
        // a DIFFERENT obligation and stays exactly where it is.
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
            // 11-09 Task 3 (IN-01) — the MID-RUN writer's floor tripwire.
            //
            // `waveBuildFailureKind` in `ResultOverlay.tsx` classifies `>= 2` as
            // mid-run and everything below as Retry-time. That holds only while
            // `waveRef.current` is at or above the wave floor of 1. Nothing in the
            // shipped code writes `waveRef` below it, so NO test in this repo can
            // drive this red — it is a runtime tripwire aimed at a future writer (a
            // Phase-14 resume-at-wave-N change), not coverage, and it does NOT
            // resolve the flagged N-END-01 boundary assumption: no source artifact
            // states the contract it is guessing at. The full `typeof` idiom is
            // required — a bare `__DEV__` throws on a runtime that does not define it.
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              if (waveRef.current < ENDLESS_WAVE_FLOOR) {
                console.error(
                  `[endless] mid-run wave-build failure reported below the wave floor (waveRef=${waveRef.current}, floor=${ENDLESS_WAVE_FLOOR}): the Results overlay will classify it as Retry-time and suppress the Wave and Score lines for a run that exists`,
                );
              }
            }
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
   *
   * 12-05 admits DAILY to the same funnel rather than building a second one, because a
   * daily run has the identical obligation: D-07 and D-09 say an interrupted daily run
   * is recorded as `abandoned` and that abandoning does NOT close the date. Widening
   * the one funnel is what wires all four daily exits at once — pause Menu, pause
   * Retry, a dev-row control and a dev session remount — and it is why none of them
   * needed its own detection site. The name is kept: renaming it would rewrite four
   * shipped source contracts for a word.
   *
   * Note what daily does NOT inherit: the campaign treatment of an abandoned outcome.
   * The run is recorded in telemetry, and the date stays open — a real interruption
   * must not cost the player their day.
   */
  const recordInFlightEndlessRun = useCallback(() => {
    if (modeRef.current !== 'endless' && modeRef.current !== 'daily') {
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
   * End a start that could not BEGIN, and put it on screen (11-09 Task 1;
   * `11-VERIFICATION.md` gap 3, and the half of gap 2 that asks what "the run ended
   * but did not restart" means).
   *
   * Before this helper, both `startEndlessRun` failure returns set the failure copy
   * while `modeRef` / `mode` were still `'campaign'` and `result` was still `null`.
   * `ResultOverlay.tsx` nulls `waveBuildFailedWave` outside endless and `GameScreen`
   * mounts the overlay only when `result != null`, so the owner-decided A-01 copy was
   * unreachable from two of the three call sites: pressing the ONLY control that
   * enters endless did nothing and said nothing — verbatim the `silent-noop` the owner
   * REJECTED on 2026-09-26. Flipping the mode and raising the surface here, above the
   * readiness and build gates, gives the failure somewhere to render regardless of
   * entry point.
   *
   * Four of the statements below are load-bearing and must not be trimmed as
   * redundant:
   *  - `modeRef.current = 'endless'` WITH `setMode('endless')`, first: the overlay
   *    re-renders on the `mode` STATE, and the ref is what `applyChrome` and the
   *    compiled-push gate read.
   *  - `setResult('lose')`: `GameScreen` mounts the Results overlay on `result != null`
   *    and on nothing else.
   *  - `setResultBest` / `setResultBestWave` from the ENDLESS watermark refs: on a
   *    fresh mount `resultBest` still holds the CAMPAIGN level best written by the
   *    `getBestForLevel` effect above. Raising the endless overlay without
   *    republishing would render a campaign number as the endless `Best` — the exact
   *    prohibition 11-08 shipped (11-UI-SPEC § Record Display Contract).
   *  - `runEndedRef.current = true`: 11-10 moves `recordInFlightEndlessRun()` INSIDE
   *    `startEndlessRun`. Without this latch a `Retry` press after a failed first
   *    entry would find `modeRef.current === 'endless'` and `runEndedRef.current ===
   *    false` and record a phantom `{ mode: 'endless', wave: 1, score: 0, outcome:
   *    'abandoned' }` for a run that never began. Do not delete the line.
   *
   * A-02, disclosed and accepted: a READINESS-gate failure now latches `modeRef` to
   * endless for a run that never started, so the compiled-push gate effect
   * early-returns from then on. That is the verifier's prescribed shape, and the exit
   * route lands in 11-10. A second, mode-preserving failure path is deliberately NOT
   * added — two failure shapes is how this copy became unreachable from two thirds of
   * its call sites in the first place.
   *
   * Declared ABOVE `startEndlessRun` for the same temporal-dead-zone reason its own
   * note gives: a `useCallback` dependency array is evaluated during render.
   */
  const failEndlessStart = useCallback(() => {
    modeRef.current = 'endless';
    setMode('endless');
    clearCountdown();
    setCountdownNumeral(null);
    setWaveBuildFailedWave(1);
    setResultBest(endlessBestScoreRef.current);
    setResultBestWave(endlessBestWaveRef.current);
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    runEndedRef.current = true;
    // 11-13 Task 2 — the third ended-run state gets the same shape as the other two.
    //
    // DEFENCE IN DEPTH, not a live defect fix, and the distinction matters: as of
    // 11-13 Task 1 the endless WON branch returns on `runEndedRef` regardless of what
    // this guard holds, so nothing reads a stale value today. What this removes is the
    // asymmetry itself — a failed START previously INHERITED whatever
    // `waveAdvanceInFlightRef` the PREVIOUS run left behind (`11-REVIEW.md` IN-02),
    // which made it the one ended-run state whose post-condition differed from LOST
    // and from the mid-run wave-build failure for no stated reason. Every path that
    // begins a run (`startEndlessRun`'s success tail) already clears both refs; this
    // is the matching clear on the path that ENDS one.
    waveAdvanceInFlightRef.current = false;
    setUiPhase('playing');
    setResult('lose');
    setActive(false);
  }, [clearCountdown, setActive]);

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
    // 11-VERIFICATION.md gap 1 — THE invariant, and it lives HERE because this
    // function is what "a new run starts" means. Round 1 wired the funnel at two of
    // the five callers instead, and the three it missed included the `__DEV__`
    // `Endless` button itself: driving a live run to wave 2 and pressing it returned
    // the readout to `W1` with `recordRunEnd` called ZERO times, while
    // `docs/ops/ENDLESS-MODE.md` asserted in bold that no such path existed.
    //
    // FIRST statement, above the readiness gate and above every write, because the
    // funnel reads `waveRef.current` to decide the wave it records — anything that
    // can move the wave must come after it.
    //
    // Safe from all five callers on two deliberate no-ops inside the funnel: it
    // returns immediately when `modeRef.current !== 'endless'` (a first entry from
    // campaign records nothing) and again when `runEndedRef.current` is already true
    // (a Retry from the lose overlay cannot double-record, and — since 11-09's
    // `failEndlessStart` latch — a Retry after a failed START cannot manufacture a
    // phantom `{ wave: 1, score: 0, abandoned }` run for a run that never began).
    recordInFlightEndlessRun();
    // A-01, decided `retry-in-place` by the owner on 2026-09-26. Both early returns
    // below route through `failEndlessStart`, which OWNS the failure post-condition:
    // the mode flip, the Results overlay, the endless watermarks and the body copy,
    // contract-fixed as:
    //
    //     Wave 1 could not be built — tap Retry
    //
    // (11-UI-SPEC § Endless copy, rendered by 11-08). `Wave 1` is a LITERAL, never
    // templated: a Retry-time failure is by construction a wave-1 failure. The mid-run
    // body `Wave {n} could not be built — run saved` is deliberately NOT reused here —
    // there is no in-flight run to save, so it would state something untrue. Leaving
    // the old silent return was rejected too: it presents a dead-looking Retry button.
    // 11-09 gap 3: the copy alone was not enough — from a fresh campaign mount neither
    // gate the overlay needs was satisfied, so the decided remedy never reached a
    // screen. `failEndlessStart` is what makes it reachable from EVERY entry path.
    if (!levelReady || levelError != null || !fxReady) {
      failEndlessStart();
      return;
    }
    // Pitfall 7: minted in the APP tier. `src/levelgen/**` bans `Date.now()` by
    // eslint rule — a board must depend on (seed, difficulty) alone — so the wall
    // clock is read here and passed in. A fixed seed would make every endless run
    // the identical board sequence.
    //
    // 11-09 Task 2, `11-VERIFICATION.md` gap 2 — the build attempt is ATOMIC. The
    // seed is snapshotted before the mint and restored on the failure path, and the
    // old `waveRef.current = 1` below the mint is DELETED: `advanceToWave` already
    // assigns `waveRef.current = nextWave` on success and pairs it with
    // `setWave(nextWave)`, which is the only assignment that keeps the ref and the
    // HUD state in step. A second, unpaired assignment above a failure return is
    // exactly what let them diverge — `waveRef` silently 1 while the wave-N board was
    // still in play, so the next WON restarted the difficulty ramp and a run at wave
    // 30 quietly became a run at wave 2. Nothing else in here may write `waveRef`.
    //
    // Be clear about what these two are and are NOT. They are NOT behaviourally
    // observable today: once `failEndlessStart` ends the run, nothing reads
    // `runSeedRef` or `waveRef` again before the next `startEndlessRun` re-mints
    // them. They exist so that the resume-in-place alternative 11-UI-SPEC § Run
    // boundaries explicitly contemplates cannot silently inherit a re-minted seed or
    // a rewound wave. Because they are unobservable they are asserted as SOURCE
    // contracts in `tests/ui/PlayingHost.endless-host.test.ts`, and that file says so
    // rather than dressing them up as behaviour.
    const prevSeed = runSeedRef.current;
    runSeedRef.current = Date.now() >>> 0;
    if (!advanceToWave(1)) {
      runSeedRef.current = prevSeed;
      // Pressing Retry again re-mints a different seed (`Date.now()` above), which is
      // why the live button is a real remedy and not just a nicer-looking dead end.
      failEndlessStart();
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
    // WR-04 (11-11). This published `previousBestRef.current` — a CAMPAIGN per-level
    // best — into the host's `best` prop for the entire lifetime of the endless run
    // being started. It was LATENT: `best` reaches `ResultOverlay` and nothing else
    // today, the overlay is unmounted while a run is live, and `handleRunEnded`'s
    // endless arm always overwrites `resultBest` before `setResult` raises it. It was
    // not latent for long: Phase 14 adds a mid-run endless record surface, at which
    // point a campaign level best would be RENDERED as the player's endless record for
    // the whole duration of every run — prohibition 3 of 11-08, "MUST NOT display a
    // record belonging to one mode as the player record of another mode". The owner
    // chose on 2026-09-26 to fold the fix in now rather than record it as debt.
    //
    // Both halves are published, not just the score: the run being started is an
    // endless run, and `resultBestWave` is the endless-only counterpart on the same
    // 11-UI-SPEC § Record Display Contract row. `previousBestRef` may not appear in
    // this function at all — pinned by `tests/ui/PlayingHost.endless-host.test.ts`.
    // The campaign branches of `onRetry` and `remountDevSession` keep publishing it,
    // unchanged: those are campaign resets.
    setResultBest(endlessBestScoreRef.current);
    setResultBestWave(endlessBestWaveRef.current);
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
    failEndlessStart,
    recordInFlightEndlessRun,
    retry,
    setActive,
    levelReady,
    levelError,
    fxReady,
  ]);

  /**
   * Today's board could not be built — the date stays OPEN (12-05).
   *
   * Modelled on `failEndlessStart` and deliberately the same SHAPE: raise the result
   * chrome so the panel is reachable, and carry the failure as its own field rather
   * than as a third `result` value. What differs is which panel reads it — the daily
   * panel renders the accent-white `Daily` heading, not the `Lose` red, because nothing
   * was lost. Nothing is written, so nothing closes the date and `Retry` is legitimate:
   * that is the same D-01 rule which forbids a Retry once a date HAS closed, not an
   * exception to it.
   *
   * `LevelErrorOverlay` is deliberately NOT used. It has no controls and `showResult`
   * is suppressed while `levelError` is set, so a player would face a live sim behind a
   * modal with no exit — the rule 11-UI-SPEC already set for a wave-build failure.
   *
   * The streak lines still render and are still true: they are read from storage and
   * describe dates already closed, not this one.
   */
  const failDailyBoard = useCallback(
    (dateKey: string) => {
      modeRef.current = 'daily';
      setMode('daily');
      dailyDateRef.current = dateKey;
      setDailyDateKey(dateKey);
      setDailyBoardFailed(true);
      publishDailyPanel(dailyRecordRef.current, dateKey);
      clearCountdown();
      setCountdownNumeral(null);
      setWaveBuildFailedWave(null);
      setIsNewRecord(false);
      setResultStars(null);
      setNextGateId(null);
      // No run began, so there is nothing to record — and the latch is what guarantees
      // it stays that way if a stray phase mirror arrives from the campaign board still
      // sitting in `compiledSv`.
      runEndedRef.current = true;
      waveAdvanceInFlightRef.current = false;
      setUiPhase('playing');
      setResult('lose');
      setActive(false);
    },
    [clearCountdown, publishDailyPanel, setActive],
  );

  /**
   * Start today's daily run (N-DAILY-01 / D-01 / D-10 / D-11).
   *
   * `startEndlessRun`-shaped MINUS THE SEED MINT, and that subtraction is the whole
   * point. The two lines in `startEndlessRun` that re-derive `runSeedRef` from the wall
   * clock are correct for endless, where a fresh run sequence IS the requirement
   * (N-END-03), and an outright SC-1 / N-DAILY-01 break here: the daily board is a pure
   * function of the date key and of nothing else, so the same date must yield the same
   * board on every device and on every re-entry. `runSeedRef` is not touched.
   *
   * The clock is read ONCE, HERE, inside the press callback — never during render.
   * `reactCompiler` is on and `react-hooks/purity` fails the build on an impure render
   * call, which this file already documents at the wall-clock refs above. That single
   * read serves both the date key and the run's wall-clock start, which is also why the
   * comment-stripped body of this function contains exactly one `Date.now()`: a second
   * clock read would be a second source of truth for "when is now".
   *
   * `generate` takes the key string STRAIGHT THROUGH. It accepts `number | string`
   * specifically so this phase needs no hashing step (`src/levelgen/rng.ts:78-86`), and
   * it clamps its own difficulty argument, so `DAILY_DIFFICULTY` cannot escape the
   * table even if mis-set.
   *
   * SCOPE, stated so its absence is not read as an oversight: this is the OPEN-date
   * entry only. The closed-date read path (D-02: a date with a stored result is
   * read-only), the abandoned boundaries on Pause/Retry and the dev controls (D-07/D-09)
   * and the on-screen board-failure variant are plan 12-05's, and none is stubbed here.
   */
  const startDailyRun = useCallback(() => {
    // Same invariant, same position, as `startEndlessRun`'s first statement: FIRST,
    // above every gate and every write. A no-op from campaign and from daily; from a
    // LIVE endless run it records the in-flight wave as `abandoned` before this entry
    // discards it. Without it, pressing `Daily` mid-endless-run silently drops that run
    // — verbatim the `11-VERIFICATION.md` gap 1 defect, which was caused by wiring the
    // funnel at some callers instead of at the function that means "a new run starts".
    recordInFlightEndlessRun();
    // 12-05: the clock is read ONCE, here, and the key it produces answers D-01 before
    // anything else happens — the decision and the clock read that justifies it are one
    // statement apart, which is why D-01 reads this local and not a ref written earlier
    // from some other read. `dailyDateRef` below is the RUN's own date and is a different
    // question (see its declaration).
    const nowMs = Date.now();
    const dateKey = localDateKey(nowMs);

    /*
     * D-02 / SC-2 — a date with a stored result is READ-ONLY.
     *
     * This branch is ABOVE the readiness gate and above the generator on purpose:
     * re-opening a closed date needs neither. It renders the panel from the STORED
     * record, and that is the same render path the just-finished case takes — one
     * `publishDailyPanel`, one set of scalars, one renderer. A separate "just
     * finished" view reading in-memory run state would be a second renderer for one
     * truth, which is the defect family the endless UI contract was written to repair:
     * if the two can disagree then one is wrong and no test says which.
     *
     * No board is generated and nothing is written. Generating one and discarding it
     * would satisfy "no run started" while still breaking D-02, which is why the
     * paired test asserts the GENERATOR call count and not merely the run state.
     */
    if (hasResultFor(dailyRecordRef.current.history.map((e) => e.date), dateKey)) {
      const record = dailyRecordRef.current;
      const stored = record.history.find((e) => e.date === dateKey);
      dailyDateRef.current = dateKey;
      setDailyDateKey(dateKey);
      setDailyBoardFailed(false);
      publishDailyPanel(record, dateKey);
      setScore(stored?.score ?? 0);
      setIsNewRecord(false);
      setResultStars(null);
      setNextGateId(null);
      setWaveBuildFailedWave(null);
      // 13 code review WR-01: the THIRD run-absent state, and the only one the block's
      // own suppression cannot reach. No run happens here, so `handleRunEnded` never
      // fires and `publishUnlockedAchievements` is never called — while `isClosed` IS
      // true, so `DailyResultOverlay`'s gate is satisfied and the block renders whatever
      // the last recorded run left in state. Measured: unlock something in campaign, then
      // press `Daily` on an already-closed date, and that campaign unlock appears on the
      // daily panel. Every other panel scalar in this branch is already neutralised on
      // exactly this reasoning; this one was missed. The stored record carries no per-day
      // unlock list to show instead — nor should it, the date is read-only — so the
      // correct render is the ABSENCE.
      setUnlockedAchievementNames([]);
      clearCountdown();
      setCountdownNumeral(null);
      modeRef.current = 'daily';
      setMode('daily');
      // The run is already over — it happened on whatever day closed this date. The
      // latch keeps a stray WON/LOST mirror from the campaign board still sitting in
      // `compiledSv` from recording anything against it.
      runEndedRef.current = true;
      setUiPhase('playing');
      setResult(stored?.outcome ?? 'win');
      setActive(false);
      return;
    }

    if (!levelReady || levelError != null || !fxReady) {
      // Do NOT enter daily. Nothing is written, no board is swapped, `modeRef` is not
      // flipped, and the date therefore stays OPEN (D-01) — the player can press again
      // once the cold path has finished. This is a NOT-YET rather than a failure: the
      // board-failure variant below states that today's board could not be built, and
      // saying that while the cold path is simply still running would be false.
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error('[daily] entry blocked: level or fx not ready');
      }
      return;
    }
    const raw = generate(dateKey, DAILY_DIFFICULTY);
    const compiled = compileGeneratedLevel(raw);
    if (!compiled.ok) {
      // Loud in a dev build and terminal for this attempt, exactly as `advanceToWave`
      // treats the same failure. The generator's own sweep recorded every board
      // compiling and clearing, which is what makes D-13's "the streak counts dates
      // PLAYED" safe; this branch is the tripwire for that claim ceasing to hold.
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error('[daily] generated board failed to compile', compiled.issues);
      }
      failDailyBoard(dateKey);
      return;
    }
    /* eslint-disable react-hooks/immutability -- SharedValue write (D-14) */
    compiledSv.value = compiled.compiled;
    /* eslint-enable react-hooks/immutability */
    // The ref AND the state, in that order and both of them, for the reason
    // `failEndlessStart` states: the compiled-push gate effect and `applyChrome` read
    // the REF in this same commit, while the overlay re-renders on the STATE.
    dailyDateRef.current = dateKey;
    setDailyDateKey(dateKey);
    setDailyBoardFailed(false);
    modeRef.current = 'daily';
    setMode('daily');
    clearCountdown();
    setCountdownNumeral(null);
    setResult(null);
    setWaveBuildFailedWave(null);
    setIsNewRecord(false);
    setResultStars(null);
    setNextGateId(null);
    runEndedRef.current = false;
    // The endless in-flight advance guard is cleared for the same reason every path
    // that BEGINS a run clears it: a latched guard inherited from a previous endless
    // run would swallow a later boundary.
    waveAdvanceInFlightRef.current = false;
    // D-01: every run start is a NEW run — counters and wall clock both start at zero.
    // `nowMs` is reused rather than re-read; see the single-clock-read note above.
    runStartedAtRef.current = nowMs;
    runWallClockMsRef.current = 0;
    wallClockActiveRef.current = true;
    setLives(3);
    setScore(0);
    setCombo(1);
    setStallTier(0);
    setSimPhaseNum(SIM.DOCKED);
    setUiPhase('playing');
    // `retry()` is correct HERE for the same reason it is in `startEndlessRun`: it
    // resets lives, score and combo onto the already-pushed generated board, which is
    // exactly what a new run is. Daily has no wave boundary to protect them at.
    retry();
    setActive(true);
  }, [
    clearCountdown,
    compiledSv,
    failDailyBoard,
    publishDailyPanel,
    recordInFlightEndlessRun,
    retry,
    setActive,
    levelReady,
    levelError,
    fxReady,
  ]);

  /**
   * Entry-mode dispatch (N-UI-01, D-04, 14-01). `GameHost` passes the mode the
   * player tapped on Title; this effect starts the matching run exactly once,
   * deferred past the readiness gate so a cold-start tap does not silently land
   * the player on a campaign board instead.
   *
   * The dispatch is scheduled through `setTimeout`, not called directly in the
   * effect body: `react-hooks/set-state-in-effect` is severity `error` in this
   * tree and is interprocedural — it follows `startEndlessRun`/`startDailyRun`
   * through their own `useCallback` — so a direct call here fails
   * `npm run lint -- --max-warnings 0` and therefore CI.
   *
   * The readiness dependency is not optional either: on a cold start
   * `levelReady`/`fxReady` are false, `startDailyRun`'s own guard would return
   * early, and a `[]`-dependency effect would fire once, no-op, and never fire
   * again. Returning (without latching the ref) while not ready lets the effect
   * re-run and dispatch once readiness flips.
   */
  useEffect(() => {
    if (entryMode === 'campaign' || entryDispatchedRef.current) return;
    if (!levelReady || levelError != null || !fxReady) return;
    entryDispatchedRef.current = true;
    const id = setTimeout(() => {
      if (entryMode === 'endless') {
        startEndlessRun();
      } else {
        startDailyRun();
      }
    }, 0);
    return () => clearTimeout(id);
  }, [entryMode, levelReady, levelError, fxReady, startEndlessRun, startDailyRun]);

  const onRetry = useCallback(() => {
    // 11-07 gap 1 — the run boundary is MODE-AWARE. In endless a run owns a seed, a
    // wave number, a mode and an in-flight advance guard; the campaign reset below
    // touches none of them, so falling through would refill lives against the wave-N
    // generated board still sitting in `compiledSv` and let the next loss record
    // wave N+1. `startEndlessRun` is the only site that resets all four, which is why
    // routing here beats duplicating a reset.
    //
    // 11-10: this branch is now the FIRST statement, ABOVE the campaign readiness
    // gate, and it no longer records anything itself — `startEndlessRun` owns the
    // funnel (see its first statement) and owns the readiness decision for endless,
    // routing a closed gate to `failEndlessStart()` so the decided A-01 copy reaches
    // the screen. Leaving the gate above this branch would re-create gap 3 here: a
    // Retry pressed while `fxReady` is false returned SILENTLY, which is verbatim the
    // `silent-noop` the owner rejected on 2026-09-26. The behaviour change is
    // deliberate and is driven end-to-end in
    // `tests/ui/PlayingHost.endless-record.test.tsx`.
    //
    // The funnel inside `startEndlessRun` still makes ONE branch satisfy TWO contract
    // rows: reached from the lose overlay `runEndedRef.current` is already true (the
    // LOST branch set it) so it no-ops; reached from Pause mid-run it is false, so the
    // in-flight wave is recorded `abandoned` before the reset discards it.
    if (modeRef.current === 'endless') {
      startEndlessRun();
      return;
    }
    // 12-05 / D-08: route a daily Retry to `startDailyRun`, which regenerates the board
    // from the SAME stored date key. The endless branch above re-mints its run seed
    // from the wall clock, which is correct for endless (N-END-03) and an outright
    // SC-1 break here — the daily board is a pure function of the date and of nothing
    // else, so a re-minted seed would make the day un-replayable.
    //
    // The funnel inside `startDailyRun` makes ONE branch satisfy TWO contract rows, the
    // same way the endless branch does: reached from the result panel `runEndedRef` is
    // already true so it no-ops, and reached from Pause mid-run it is false, so the
    // in-flight run is recorded `abandoned` before the restart discards it. No
    // confirmation dialog on this path either — it restarts the same board and the date
    // stays open, so nothing is destroyed and a confirmation would claim a commitment
    // that does not exist.
    if (modeRef.current === 'daily') {
      startDailyRun();
      return;
    }
    if (!levelReady || levelError != null || !fxReady) {
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
    startEndlessRun,
    startDailyRun,
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

  /**
   * Cycle the `__DEV__` level, and — since 11-10 — EXIT endless while doing it.
   *
   * A-02, owner decision of 2026-09-26: `Lv` during an endless run is an explicit
   * exit. Record the in-flight run, then return to campaign. The two alternatives
   * the owner considered — disabling the control while endless, and deferring the
   * whole question to Phase 14 — were REJECTED; do not re-open them.
   *
   * Before this, `toggleDevLevel` was the third un-mode-aware copy of the run-boundary
   * reset, with the same omission list as the two already fixed. The verifier measured
   * it: pressing `Lv` at wave 2 left `mode = 'endless'` with the readout at `W2`,
   * `recordRunEnd` called ZERO times, and the NEXT loss filed under
   * `{mode:'endless', wave:2}` for what is nominally a campaign level — a campaign run
   * recorded through the endless arm. It also cleared `runEndedRef` for an
   * already-recorded run, un-latching the double-record guard.
   *
   * This is also the FIRST and ONLY writer that returns `modeRef` to `'campaign'`.
   * That matters beyond this control: the compiled-push gate effect early-returns
   * while `modeRef.current === 'endless'`, so until now a single endless entry left
   * that effect dead for the remainder of the mount — `Lv` switched the level and left
   * a stopped frame loop behind a live HUD. With a writer back to campaign the effect
   * is live again.
   *
   * Phase 14 DELETES this control along with the rest of the dev row. Nothing should
   * grow a dependency on it.
   */
  const toggleDevLevel = useCallback(() => {
    // FIRST, before `setLevelId` and before every reset below, for the same reason it
    // is first in `startEndlessRun`: it reads `waveRef.current` to decide the wave it
    // records, and it latches `runEndedRef` so the `runEndedRef.current = false` below
    // cannot un-latch a run that was just recorded. In campaign it no-ops, so campaign
    // behaviour is unchanged byte for byte.
    recordInFlightEndlessRun();
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
    // The EXIT (A-02). `modeRef.current` is written directly AS WELL AS calling
    // `setMode`: the mirroring effect runs after render, and the compiled-push gate
    // effect reads the REF in this same commit — without the direct write the level
    // being switched to never arms the loop. `waveRef` / `setWave` return the run
    // identity to 1 in step with each other, and the advance guard is cleared so a
    // latched in-flight advance cannot swallow the next campaign WON.
    modeRef.current = 'campaign';
    setMode('campaign');
    // 12-05: the daily board-failure flag is cleared on every EXIT from daily, not just
    // on the next daily entry. Left set, it would decide the panel variant the moment a
    // later daily result raised the result chrome.
    setDailyBoardFailed(false);
    // 11-REVIEW.md IN-03, and 11-12 Task 1's guard is what makes it necessary. The
    // preload effect no longer publishes while endless, and its re-run on the
    // `levelId` change THIS function triggers is asynchronous — so without this line
    // the stale endless watermark stands as the campaign `Best` for the whole gap
    // between the exit and the next storage read. The cache is warm because the guard
    // left `previousBestRef.current` unconditional, so this costs no round trip.
    //
    // The SCORE watermark only: `resultBestWave` is endless-only and `ResultOverlay`
    // renders it only in endless, so republishing it here would be noise.
    setResultBest(previousBestRef.current);
    waveRef.current = 1;
    setWave(1);
    waveAdvanceInFlightRef.current = false;
    // Correct where it sits: the endless run above has already been recorded AND
    // latched by the funnel, so this begins a new CAMPAIGN run rather than un-latching
    // a recorded one.
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
  }, [clearCountdown, setLevelId, recordInFlightEndlessRun]);

  /** DEV force Low→Mid→High→auto; session remount via budget change + retry (Pitfall 5). */
  const cycleDevTier = useCallback(() => {
    setTierOverride((prev) => {
      if (prev == null) return 'low';
      if (prev === 'low') return 'mid';
      if (prev === 'mid') return 'high';
      return null;
    });
  }, []);

  /**
   * Leave a live daily run for campaign, recording it as `abandoned` (12-05 / D-09).
   *
   * A NAMED function for the same reason `startEndlessRun` is the endless one: the
   * abandon invariant lives in exactly one place per exit shape, and its callers route
   * to it rather than keeping a second copy. `11-VERIFICATION.md` gap 1 is the
   * post-mortem of what happens when that rule is relaxed — the funnel gets wired at
   * some callers instead of at the function that means "this run is over", and the ones
   * it misses drop runs silently.
   *
   * The date stays OPEN. Abandoning is not closing (D-07), so a dev control pressed
   * mid-run must not cost the player their day — and no write happens here at all
   * beyond the telemetry the funnel itself records.
   *
   * `modeRef` is written directly AS WELL AS calling `setMode`, for the reason
   * `toggleDevLevel` states: the mirroring effect runs after render while the
   * compiled-push gate effect reads the REF in this same commit, so without the direct
   * write the campaign level being returned to never re-arms the loop.
   */
  const exitDailyToCampaign = useCallback(() => {
    // FIRST, above the mode writes, because the funnel reads `modeRef.current` to
    // decide whether there is a daily run to record at all.
    recordInFlightEndlessRun();
    modeRef.current = 'campaign';
    setMode('campaign');
    setDailyBoardFailed(false);
  }, [recordInFlightEndlessRun]);

  const remountDevSession = useCallback(() => {
    // 11-07 gap 1, second half. A DEV tier change during a live endless run used to
    // reset lives/score/combo while leaving `waveRef`, `runSeedRef` and
    // `waveAdvanceInFlightRef` untouched — silently discarding the in-flight run and
    // carrying its wave into the next loss. Same funnel, same route as `onRetry`.
    //
    // 11-10: hoisted above the readiness gate and stripped of its own funnel call,
    // for the same two reasons `onRetry` was — `startEndlessRun` owns the invariant
    // and owns the endless readiness decision, and a gate above this branch would
    // silently swallow the boundary instead of ending and reporting the run.
    if (modeRef.current === 'endless') {
      startEndlessRun();
      return;
    }
    // 12-05 / D-09: a dev session remount during a live daily run EXITS daily rather
    // than restarting it, which is the same treatment Phase 11's controls gave endless
    // — these are development instruments, and silently re-entering the mode a tier
    // change was meant to leave would make them lie. FIRST, above the readiness gate
    // and above every reset below, because the funnel latches `runEndedRef` and the
    // `runEndedRef.current = false` further down must not un-latch a run it just
    // recorded. The run is recorded `abandoned` and the date stays OPEN.
    if (modeRef.current === 'daily') {
      exitDailyToCampaign();
    }
    if (!levelReady || levelError != null || !fxReady) {
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
    startEndlessRun,
    exitDailyToCampaign,
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

  // 11-19 / 11-VERIFICATION round-5 gap 1. ONE named decision, read by three
  // consumers below: the level half, the deferral arm, and the deferred-cert
  // effect's self-cancel. It replaces two separate expressions that answered the
  // same question and drifted apart in three consecutive rounds — each round
  // taught one of them a new term and left the other ignorant of it. A fourth term
  // added to `certLevelPlanFor` now reaches every consumer by construction.
  //
  // `modeRef` and `runEndedRef` are refs, read at call time, and deliberately
  // absent from the dependency array — the same reason the surrounding comments
  // already give. `levelId` is state and is listed.
  const certLevelPlan = useCallback(
    (): CertLevelPlan =>
      certLevelPlanFor({
        mode: modeRef.current,
        runEnded: runEndedRef.current,
        levelId,
      }),
    [levelId],
  );

  const runCertWorstCase = useCallback(() => {
    // Profiling IPA: CERT_HARNESS with __DEV__ false must still arm (A1).
    if (
      !CERT_HARNESS &&
      (typeof __DEV__ === 'undefined' || !__DEV__)
    ) {
      return;
    }
    let defer = false;
    // ONE consultation per press, stored. The level half below and the arm are two
    // consumers of this same value, not two expressions that happen to agree today.
    const plan = certLevelPlan();
    // 11-14 / 11-VERIFICATION gap 1 bullet 5 + gap 2 bullet 4 and round-4 gap. The
    // LEVEL half is gated; the tier half below is deliberately NOT.
    //
    // Line comments only in this function — `codeOnly()` in
    // `tests/ui/PlayingHost.endless-host.test.ts` strips `//` but not `/** */`, so a
    // block comment here could satisfy or falsify a source contract with prose.
    //
    // WHAT THE GATE IS NOW. This half no longer tests anything itself: it asks
    // `certLevelPlan()` once, above, and acts on the answer. The predicate and the
    // reasons for its three answers live in `app/_components/certLevelPlan.ts`, and
    // the answers are driven cell by cell in `tests/ui/certLevelPlan.test.ts`. Do not
    // restate either here, and do not add a term at this call site — add it to the
    // predicate, where all three consumers will see it.
    //
    // WHY THE PREDICATE EXISTS. This half and the arm below used to be two separate
    // expressions asking the same question, and they drifted apart in three
    // consecutive rounds: round 3 taught this half the run mode and left the arm
    // ignorant of it; round 4 taught the arm the mode; round 5 taught this half the
    // run-ended latch and left the arm ignorant of THAT, which armed a one-shot whose
    // discharge the same press had just made unreachable. They are now one value.
    //
    // WHY THIS HALF IS GUARDED RATHER THAN RESETTING. A reset here would have to
    // clear the run-ended latch AND write the five chrome values on the same
    // synchronous path — a sixth copy of the five near-identical run-boundary reset
    // blocks the verifier's WR-06 advisory names as the structural cause of this
    // phase's whole "fix one half, leave the neighbour" pattern. Clearing without
    // those writes is worse still: it leaves a dead run's score and lives standing on
    // the HUD of a fresh board.
    //
    // WHY THIS HALF ONLY. Gating the tier half below would be the "disable `Cert WC`
    // while endless" option the owner rejected on 2026-09-26; it is a real,
    // funnel-covered run boundary that routes through `remountDevSession`. A-02 was
    // resolved the same way for `Lv` next door — an explicit exit, not a dead button.
    //
    // WHY THE LEVEL HALF MATTERED IN THE FIRST PLACE. The level-forcing call below
    // was the last deterministic, race-free trigger for a CAMPAIGN per-level best
    // being published into the endless `best` prop — it drives the `getBestForLevel`
    // preload effect, which 11-12 guarded at the publication end. (The call is
    // written once and only once in this function, so the structural gate can count
    // it — do not restate it in prose.)
    //
    // MEASURED PRE-FIX, one press from a mounted campaign lose panel at
    // `{score: 2400, lives: 0}` with the tier already Mid: the `Lv` label moved to the
    // cert level, `retry()` 1, `setActive` `[[false],[false],[false],[true]]` — a
    // fresh board simulating behind the overlay of a run that is over. Its own later
    // loss was swallowed by the latch, so the loop was never stopped.
    //
    // MEASURED PRE-FIX on the neighbouring branch (round-6 cell 5, tier AUTO): the
    // press injected 0 and moved no level, and then four `Lv` presses gave
    // `level-04 0 | level-05 0 | level-06 0 | level-03 1` — the stranded one-shot
    // discharging on a later campaign session. Driven in
    // `tests/ui/PlayingHost.endless-retry.test.tsx`.
    //
    // WHAT IT COSTS — CORRECTED 2026-09-26 (round 6). A round-5 revision of this
    // paragraph told the reader that a press from a mounted Results panel applies
    // its worst-case load to the run that has just ended, and that the cost was
    // therefore spent on a board nobody would see again. That is false, and the
    // evidence it was written from could not have caught it: the injector is a spy
    // in the host tests, so a call count there shows only that this function reached
    // it. The superseded clause is described rather than quoted — plan 11-20 pins it
    // at zero occurrences in this file and the verbatim original is in git at
    // `6bb18bf`.
    //
    // What the press ACTUALLY costs. The injection is a REQUEST. It bumps a counter
    // on the UI runtime (`certRequest`, `src/runtime/useGameLoop.ts:787`) and the one
    // and only thing that consumes that counter lives inside `onFrame` (`:440`). On
    // this branch the frame loop is stopped, and nothing anywhere clears the counter
    // at a run boundary — so the load is QUEUED, and it applies on the FIRST FRAME OF
    // THE NEXT RUN that arms the loop, below the retry-reset block, onto the freshly
    // reset world. A `Retry` straight from the panel the operator is looking at is
    // that next run. The cost of the press is not contained in the run that is over.
    //
    // Pinned link by link in `tests/runtime.cert-request.test.ts`. That file reads
    // source and CANNOT produce a frame — nothing in this repo drives a Reanimated
    // worklet — so nothing above is a frame-level measurement and must not be written
    // up as one.
    if (plan === 'force') {
      setLevelId('level-03');
      defer = true;
    }
    if (tierOverride !== 'mid') {
      setTierOverride('mid');
      defer = true;
    }
    if (defer) {
      // 11-VERIFICATION.md round-3 gap 2 / WR-01, then round-5 gap 1. This
      // bookkeeping was unconditional, then it knew one term of the half above, and
      // both times it armed a one-shot that no reachable session could discharge.
      //
      // It is now the SAME value the half above acted on, so the two cannot disagree.
      // `'unreachable'` is the only answer that must not arm: under `'force'` the
      // half above has just moved the session to where the consumer effect wants it,
      // and under `'ready'` the session is already there.
      //
      // The rule this is an instance of: do not arm a latch whose discharge
      // preconditions the same change has made unreachable.
      certPendingRef.current = plan !== 'unreachable';
      return;
    }
    injectCertWorstCase();
    // setLevelId / setTierOverride are stable useState setters — listed so R-24
    // deps at this cert-arm site stay explicit (exhaustive-deps must not be ignored here).
  }, [
    certLevelPlan,
    tierOverride,
    injectCertWorstCase,
    setLevelId,
    setTierOverride,
  ]);

  // After remount to level-03 + Mid, fire deferred cert inject once (not per-frame).
  useEffect(() => {
    if (!certPendingRef.current) {
      return;
    }
    // 11-19 Task 3 Part B — an arm must not outlive its own reachability.
    //
    // The THIRD consumer of the one predicate. If the session has gone endless or its
    // run has ended since the press, the answer is `'unreachable'` and this one-shot
    // can no longer discharge onto anything it was armed for — so drop it here rather
    // than leave it waiting for some later session's preconditions to line up.
    //
    // WHY HERE AND NOT A SIXTH RESET BLOCK. The verifier names the five near-identical
    // run-boundary reset blocks as the structural cause of this phase's
    // fix-one-half-leave-the-neighbour pattern; a clear added to each would be five
    // more places that have to stay in step with the predicate. One clause at the
    // single consumer reuses the one predicate and needs no reset block to remember
    // anything.
    //
    // WHY IT CANNOT CANCEL A LEGITIMATE DISCHARGE. The tier-change effect is declared
    // ABOVE this one, so React runs `remountDevSession` first within the same commit
    // and its campaign branch has already cleared the run-ended latch by the time this
    // body runs. And where the session is already at the cert level the predicate
    // answers `'ready'` from the level test regardless of the latch, so that discharge
    // is robust to the ordering either way. The two campaign cases in
    // `tests/ui/PlayingHost.endless-retry.test.tsx` are the behavioural guards on this
    // direction; both stay green.
    if (certLevelPlan() === 'unreachable') {
      certPendingRef.current = false;
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
    certLevelPlan,
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
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.devSwitchLabel}
          >
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
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.devSwitchLabel}>
            {tierLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cert worst-case: level-03 Mid multi-ball particles shake"
          onPress={runCertWorstCase}
          hitSlop={8}
          style={styles.devSwitch}
        >
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.devSwitchLabel}>
            Cert WC
          </Text>
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
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.devSwitchLabel}>
            Crash
          </Text>
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
        // Likewise the `dailyDateKey` STATE, not `dailyDateRef` — the panel renders the
        // date, so a ref read during render would hand it the pre-flip value.
        dailyDateKey={dailyDateKey}
        dailyStreak={dailyStreak}
        dailyLongestStreak={dailyLongestStreak}
        dailyTotalDaysPlayed={dailyTotalDaysPlayed}
        dailyEndedStreakLength={dailyEndedStreakLength}
        dailyNowMs={dailyNowMs}
        dailyNextBoundaryMs={dailyNextBoundaryMs}
        dailyBoardFailed={dailyBoardFailed}
        // The unlock names as STATE, not a ref, for the reason the `mode` threading
        // records: the overlay has to re-render when they arrive, and a ref read during
        // render returns the pre-flip value.
        unlockedAchievements={unlockedAchievementNames}
        wave={resultWave}
        bestWave={resultBestWave}
        waveBuildFailedWave={waveBuildFailedWave}
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
    // MEASURED on an iPhone 17 simulator (402pt), 2026-09-28: the seven controls total
    // ~431-475px, so an unwrapped row overflows and CLIPS AT THE LEFT — `Lv` and the tier
    // button were cut off and unreachable while `Daily` and `Crash` stayed on screen.
    // 12-UI-SPEC E5 predicted the ~431-475px width from font metrics and routed the fit to
    // a device backstop; this is that backstop coming back positive. Wrapping is the fix
    // that holds at any width, and costs nothing: Phase 14 deletes the whole row.
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    rowGap: 8,
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
