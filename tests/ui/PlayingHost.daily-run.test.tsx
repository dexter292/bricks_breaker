/**
 * Plan 12-01 — a daily run driven end to end through the real host.
 *
 * SHAPE COPIED FROM `tests/ui/PlayingHost.endless-run.test.tsx`: the header, the
 * `__DEV__` stub, the whole mock wall including the `GameScreen` mock that makes the
 * dev row reachable, the mocked store, and the `compiledBoard` / `boardFingerprint` /
 * `deliverPhase` helpers. That file is the only harness in the repo that drives the
 * real host under jsdom, and this is the same harness pointed at the daily path.
 *
 * ONE CASE IS THE DELIBERATE INVERSE OF ITS ANALOG. The endless file's final case
 * spies `Date.now` and asserts two runs' boards DIFFER, because endless mints a seed
 * per run (N-END-03). Daily asserts the opposite in the same breath: the same instant
 * must give the same board, and only a different local DATE may give a different one.
 * The daily seed is a pure function of the date key and of nothing else (SC-1).
 *
 * `generate` and `compileGeneratedLevel` are REAL here — the boards below are the
 * boards a device would get for those dates.
 *
 * WHAT THIS FILE IS NOT EVIDENCE ABOUT, stated so its silence is not read as coverage:
 *  - Layout. jsdom performs no layout, so nothing here says the dev row fits on a
 *    375pt viewport (12-UI-SPEC E5 overflow is a device backstop) or that the panel
 *    fits in one.
 *  - The rendered panel. `GameScreen` is mocked down to its dev-row slot, so
 *    `DailyResultOverlay`'s own markup is not exercised; the props the host hands it
 *    ARE asserted below, and the component's own cases are plan 12-05's.
 *  - The rendered panel's MARKUP. `GameScreen` is mocked down to its dev row and its
 *    controls, so `DailyResultOverlay`'s own markup is not exercised; the props the
 *    host hands it ARE asserted below, and the component's own cases are
 *    `tests/ui/DailyResultOverlay.test.tsx`.
 *
 * 12-05 EXPANDED this file with the run boundaries: the closed-date read path (D-02),
 * the four abandoned exits (D-07 / D-09), the same-board retry and the board-failure
 * variant.
 *
 * **Do NOT call `vi.runAllTimers()` while the Daily Result panel is open.** The analog
 * this file was copied from calls it inside its mount-and-start helper, and copying that
 * by pattern is the likely move here — but 12-05 Task 2 mounts a 60-second interval that
 * is live in exactly the state where the panel is showing, and a live recurring timer
 * makes `runAllTimers()` non-terminating: MEASURED on this tree, inducing an
 * unconditional interval throws `Aborting after running 10000 timers, assuming an
 * infinite loop!` across four host specs. `vi.advanceTimersByTime` against the same live
 * interval ticks exactly the expected number of times and returns cleanly. The helper
 * below keeps `runAllTimers()` only for the PRE-panel mount sequence, where no interval
 * exists yet.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createElement } from 'react';
import {
  cleanup,
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import type { LevelId } from '../../src/core';
import type {
  DailyRecord,
  RecordRunEndArgs,
} from '../../src/services/storage';
import {
  localDateKey,
  localMidnightEndingMs,
  nextLocalMidnightMs,
  previousDateKey,
} from '../../src/services/daily';

// The entry is `__DEV__`-gated (N-UI-01), which is the point — so the harness has to
// stand where a dev build stands. An undefined `__DEV__` renders no dev row at all.
vi.stubGlobal('__DEV__', true);

/** Mirror of the host's own SimPhase numerals (the app tier may not import core). */
const SIM = { DOCKED: 0, PLAYING: 1, WON: 2, LOST: 3 } as const;

/**
 * Two instants at LOCAL NOON on consecutive local calendar days.
 *
 * Local noon rather than an instant plus a fixed day in milliseconds: a day is not
 * always 24 hours long, and `now + 86_400_000` is measured skipping a date outright in
 * Santiago and repeating one in Havana (12-RESEARCH § Finding 3(c)). Noon is far enough
 * from either boundary that no real zone's DST shift can move it onto another date, so
 * these two are adjacent local dates in whatever zone the suite runs in — asserted
 * below rather than assumed.
 */
const DAY_A_NOON = new Date(2026, 8, 27, 12, 0, 0, 0).getTime();
const DAY_B_NOON = new Date(2026, 8, 28, 12, 0, 0, 0).getTime();

type Sv = { value: unknown };
type Reaction = { fn: (next: unknown, prev: unknown) => void };
const sharedValues: Sv[] = [];
const reactions: Reaction[] = [];

vi.mock('expo-font', () => ({ useFonts: () => [true] }));
vi.mock('expo-keep-awake', () => ({ useKeepAwake: () => {} }));
vi.mock('@shopify/react-native-skia', () => ({ useFont: () => null }));

/**
 * Reanimated's `useSharedValue` is STABLE across renders, and this mock has to be
 * too. A mock that minted a fresh object per render silently changes the identity
 * of `compiledSv` / `glowAtlasSv`, which are effect dependencies here — the bake
 * effect then tears down and re-runs on every single render, calling
 * `setActive(false)` each time, and the test measures the harness instead of the
 * host. Same for the reaction list: one entry per hook slot, holding the LATEST
 * closure, because `applyChrome` is memoised and its identity moves.
 */
vi.mock('react-native-reanimated', async () => {
  const { useRef } = await import('react');
  return {
    useSharedValue: (init: unknown) => {
      const ref = useRef<Sv | null>(null);
      if (ref.current === null) {
        ref.current = { value: init };
        sharedValues.push(ref.current);
      }
      return ref.current;
    },
    useAnimatedReaction: (
      _prepare: unknown,
      react: (next: unknown, prev: unknown) => void,
    ) => {
      const ref = useRef<Reaction | null>(null);
      if (ref.current === null) {
        ref.current = { fn: react };
        reactions.push(ref.current);
      } else {
        ref.current.fn = react;
      }
    },
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    runOnUI: (fn: () => void) => () => fn(),
  };
});

vi.mock('../../src/input', () => ({
  usePaddleGesture: () => ({
    paddleTarget: { value: 0 },
    launchFlag: { value: 0 },
    gesture: {},
  }),
}));

vi.mock('../../src/runtime/useVfxIntensity', () => ({
  useVfxIntensity: () => ({ value: 1 }),
}));

vi.mock('../../src/runtime/resolveQualityTier', () => ({
  readDeviceMemory: () => ({ totalMemory: 8, modelName: 'test' }),
  resolveQualityTier: () => ({
    tier: 'mid',
    budget: { particles: 0, glow: false },
  }),
}));

vi.mock('../../src/services/audio', () => ({
  createDefaultAudioService: () => ({
    preload: () => Promise.resolve(),
    playBatch: () => {},
    release: () => {},
  }),
  createMemoryAudioService: () => ({
    preload: () => Promise.resolve(),
    playBatch: () => {},
    release: () => {},
  }),
}));

vi.mock('../../src/services/platform', () => ({
  defaultPlatformServices: () => ({
    ads: { onRunEnded: () => {} },
    purchases: { onRunEnded: () => {} },
    accounts: { onRunEnded: () => {} },
  }),
}));

vi.mock('../../src/devflags', () => ({
  CERT_HARNESS: false,
  PERF_OVERLAY: false,
}));

vi.mock('../../src/services/crashReporting', () => ({
  triggerTestCrash: () => {},
}));

vi.mock('../../src/render/textures/bakeGlowSprites', () => ({
  bakeGlowSprites: () => ({ soft: null }),
}));

/**
 * Every `generate` call the host makes, recorded by a PASSTHROUGH mock.
 *
 * Passthrough and not a stub: the boards below must stay the boards a device would get
 * for those dates, which is what makes the same-date / different-date case mean
 * anything. All this wrapper adds is a count, and the count is what the closed-date
 * case needs — "no run started" is weaker than "no board was generated", and an
 * implementation that generated a board and threw it away would satisfy the first
 * while breaking D-02.
 */
const generateCalls: (string | number)[] = [];
vi.mock('../../src/levelgen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/levelgen')>();
  return {
    ...actual,
    generate: (seed: string | number, difficulty: number) => {
      generateCalls.push(seed);
      return actual.generate(seed, difficulty);
    },
  };
});

/**
 * A switch that forces today's board to fail compilation, for the board-failure variant.
 *
 * Also a passthrough: the campaign level load and every non-forced daily board still go
 * through the real pipeline, so the failure case is the ONLY thing this changes.
 */
let forceBoardFailure = false;
vi.mock('../../src/runtime/loadLevel', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/runtime/loadLevel')>();
  return {
    ...actual,
    compileGeneratedLevel: (raw: Parameters<
      typeof actual.compileGeneratedLevel
    >[0]) =>
      forceBoardFailure
        ? ({
            ok: false,
            issues: [{ path: 'induced', message: 'induced board failure' }],
          } as ReturnType<typeof actual.compileGeneratedLevel>)
        : actual.compileGeneratedLevel(raw),
  };
});

/**
 * The props the host last handed `GameScreen`. Captured rather than rendered: the
 * mock below collapses the whole screen to its dev-row slot plus the controls the host
 * owns, which also means the real panel never mounts. Asserting the props is what
 * remains provable here about "the panel is rendered from the stored record" — the
 * markup itself is `tests/ui/DailyResultOverlay.test.tsx`.
 */
type HostProps = {
  devLevelSwitch?: unknown;
  mode?: unknown;
  result?: unknown;
  dailyDateKey?: unknown;
  score?: unknown;
  dailyStreak?: unknown;
  dailyLongestStreak?: unknown;
  dailyTotalDaysPlayed?: unknown;
  dailyEndedStreakLength?: unknown;
  dailyNowMs?: unknown;
  dailyNextBoundaryMs?: unknown;
  dailyBoardFailed?: unknown;
  levelError?: unknown;
  uiPhase?: unknown;
  onRetry?: () => void;
  onMenu?: () => void;
  onPause?: () => void;
};
let lastScreenProps: HostProps = {};

/**
 * Render the dev row AND the controls the host owns.
 *
 * The 12-01 mock rendered only `devLevelSwitch`, which is why no case could press
 * Pause, Retry or Menu — and the four abandoned boundaries all live behind those. The
 * same `onRetry` is passed once by the host and serves both the pause panel and the
 * result panel, so the two are distinctly labelled here: a case must say which panel it
 * pressed even though the handler is one function.
 */
vi.mock('../../src/runtime/GameScreen', async () => {
  const react = await import('react');
  const { Pressable, Text } = await import('react-native');
  return {
    GameScreen: (props: HostProps) => {
      lastScreenProps = props;
      const children: ReturnType<typeof react.createElement>[] = [
        react.createElement(
          react.Fragment,
          { key: 'dev' },
          (props.devLevelSwitch ?? null) as never,
        ),
        react.createElement(
          Pressable,
          {
            key: 'pause',
            accessibilityRole: 'button',
            accessibilityLabel: 'Pause game',
            onPress: props.onPause,
          },
          react.createElement(Text, null, 'Pause'),
        ),
      ];
      if (props.uiPhase === 'paused') {
        children.push(
          react.createElement(
            Pressable,
            {
              key: 'pause-retry',
              accessibilityRole: 'button',
              accessibilityLabel: 'Pause panel Retry',
              onPress: props.onRetry,
            },
            react.createElement(Text, null, 'Pause panel Retry'),
          ),
          react.createElement(
            Pressable,
            {
              key: 'pause-menu',
              accessibilityRole: 'button',
              accessibilityLabel: 'Pause panel Menu',
              onPress: props.onMenu,
            },
            react.createElement(Text, null, 'Pause panel Menu'),
          ),
        );
      }
      if (props.result != null) {
        children.push(
          react.createElement(
            Pressable,
            {
              key: 'panel-menu',
              accessibilityRole: 'button',
              accessibilityLabel: 'Panel Menu',
              onPress: props.onMenu,
            },
            react.createElement(Text, null, 'Panel Menu'),
          ),
        );
      }
      return react.createElement(react.Fragment, null, ...children) as never;
    },
  };
});

function emptyDaily(): DailyRecord {
  return {
    history: [],
    longestStreak: 0,
    totalDaysPlayed: 0,
    currentStreakStart: '',
  };
}

/**
 * The STORED daily record the mocked store hands back from BOTH `getSnapshot` and
 * `recordRunEnd`.
 *
 * One fixture behind both, deliberately. 12-UI-SPEC § The panel is a pure function of
 * the stored daily record requires the just-finished path and the re-opened path to
 * render from the same thing; a harness that fed them from two objects could not tell
 * an implementation that renders from in-memory run state apart from one that does not.
 */
let dailyFixture: DailyRecord = emptyDaily();

/** Seed three consecutive closed dates ending at `date` — a live 3-day streak. */
function seedClosedThrough(date: string, score: number): void {
  const d1 = previousDateKey(previousDateKey(date));
  const d2 = previousDateKey(date);
  dailyFixture = {
    history: [
      { date: d1, score: 100, outcome: 'win' },
      { date: d2, score: 200, outcome: 'win' },
      { date, score, outcome: 'win' },
    ],
    longestStreak: 3,
    totalDaysPlayed: 3,
    currentStreakStart: d1,
  };
}

const recordRunEnd = vi.fn((args: RecordRunEndArgs) => {
  // D-07 is honoured in the fixture itself: an `abandoned` daily run accumulates
  // telemetry but gets NO history entry, so it does not close the date. That is what
  // makes "the date stays open" a property of this harness rather than an assertion
  // the harness could not falsify.
  if (
    args.mode === 'daily' &&
    (args.outcome === 'win' || args.outcome === 'lose')
  ) {
    const history = dailyFixture.history.filter((e) => e.date !== args.date);
    history.push({ date: args.date, score: args.score, outcome: args.outcome });
    history.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    dailyFixture = {
      history,
      longestStreak: Math.max(dailyFixture.longestStreak, history.length),
      totalDaysPlayed: history.length,
      currentStreakStart: history[0]!.date,
    };
  }
  return {
    bestByLevel: {},
    unlocked: [],
    telemetry: {
      endless: { bestWave: 0, bestScore: 0 },
      // 12-01: the host's daily arm reads the POST-MERGE record off this synchronous
      // return. A mock that omits `daily` silently exercises the fail-soft branch
      // instead of the real one, which is exactly what the endless harness warns about
      // for its own `endless` field.
      daily: dailyFixture,
    },
  };
});
vi.mock('../../src/services/storage', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/services/storage')>();
  return {
    ...actual,
    createDefaultProgressStore: () => ({
      getBestForLevel: () => Promise.resolve(0),
      getSnapshot: () =>
        Promise.resolve({
          bestByLevel: {},
          unlocked: [],
          telemetry: {
            endless: { bestWave: 0, bestScore: 0 },
            daily: dailyFixture,
          },
        }),
      recordRunEnd,
      flush: () => Promise.resolve(),
    }),
  };
});

const setActive = vi.fn();
const retry = vi.fn();
const advanceWave = vi.fn();

vi.mock('../../src/runtime/useGameLoop', () => ({
  UiPhaseNum: { PLAYING: 0, PAUSED: 1, COUNTDOWN: 2 },
  useGameLoop: () => ({
    picture: { value: null },
    surfaceSize: { value: { width: 360, height: 640 } },
    setActive,
    retry,
    advanceWave,
    injectCertWorstCase: () => {},
    certOut: { value: { p50: 0, p95: 0, mean: 0, fps: 60, n: 0, over: 0 } },
    certSeq: { value: 0 },
    runStatsOut: {
      value: {
        bricksBroken: 0,
        bestCombo: 1,
        pickupMultiball: 0,
        pickupExpand: 0,
        pickupExtraLife: 0,
        pickupSlow: 0,
        pickupFireball: 0,
        livesLost: 0,
        longestRally: 0,
        largestCascade: 0,
        ticksPlayed: 0,
      },
    },
    runStatsSeq: { value: 0 },
  }),
}));

/** The host's chrome SharedValue — the only one seeded with a `phase` field. */
function chromeSv(): Sv {
  const sv = sharedValues.find(
    (s) =>
      typeof s.value === 'object' &&
      s.value !== null &&
      'phase' in (s.value as Record<string, unknown>),
  );
  if (!sv) throw new Error('chrome SharedValue not found');
  return sv;
}

/** The compiled-board SharedValue, identified by the CompiledLevel it holds. */
function compiledBoard(): { brickCount: number; hp: Uint8Array } | null {
  const sv = sharedValues.find(
    (s) =>
      typeof s.value === 'object' &&
      s.value !== null &&
      'brickCount' in (s.value as Record<string, unknown>),
  );
  return (sv?.value as { brickCount: number; hp: Uint8Array } | null) ?? null;
}

/** A board's identity for "did the board actually change" — layout, not count. */
function boardFingerprint(): string {
  const b = compiledBoard();
  if (b == null) return 'none';
  return `${b.brickCount}:${Array.from(b.hp.slice(0, 64)).join(',')}`;
}

/** Deliver one chrome mirror exactly as the UI runtime's `chromeSeq` bump does. */
let seq = 0;
async function deliverPhase(
  phase: number,
  fields: { lives?: number; score?: number } = {},
): Promise<void> {
  const prev = seq;
  seq += 1;
  chromeSv().value = {
    phase,
    lives: fields.lives ?? 3,
    score: fields.score ?? 0,
    combo: 1,
    stallTier: 0,
  };
  await act(async () => {
    for (const reaction of reactions) {
      reaction.fn(seq, prev);
    }
    await Promise.resolve();
  });
}

const hostOnMenu = vi.fn();

/**
 * Mount the host and settle the cold path. Does NOT press `Daily`.
 *
 * `runAllTimers()` is correct HERE and only here: no daily panel exists yet, so no
 * 60-second interval is live. See the file header for why that distinction is not a
 * detail.
 */
async function mountHost(): Promise<void> {
  const { PlayingHost } = await import('../../app/_components/PlayingHost');
  render(
    createElement(PlayingHost, {
      levelId: 'level-01' as LevelId,
      onMenu: hostOnMenu,
    }),
  );
  await act(async () => {
    await Promise.resolve();
    vi.runAllTimers();
    await Promise.resolve();
  });
  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: "Open today's daily challenge" }),
    ).toBeTruthy();
  });
  setActive.mockClear();
  retry.mockClear();
  advanceWave.mockClear();
  recordRunEnd.mockClear();
  hostOnMenu.mockClear();
  generateCalls.length = 0;
}

async function pressDaily(): Promise<void> {
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: "Open today's daily challenge" }),
    );
    await Promise.resolve();
  });
}

async function press(name: string): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
    await Promise.resolve();
  });
}

async function mountAndStartDaily(): Promise<void> {
  await mountHost();
  await pressDaily();
}

/**
 * Narrow one of the panel's millisecond props, which the harness types as `unknown`
 * because it captures whatever the host renders with. The `typeof` check is not
 * ceremony — a prop that arrived as `undefined` would otherwise make a remainder
 * comparison pass as `NaN <= 0` being false, or silently coerce.
 */
function ms(value: unknown, what: string): number {
  expect(typeof value, `${what} must reach the panel as a number`).toBe('number');
  return value as number;
}

/** The daily arm calls to `recordRunEnd`, narrowed. */
function dailyCalls(): { date: string; outcome: string; score: number }[] {
  return recordRunEnd.mock.calls
    .map((c) => c[0])
    .filter((a): a is Extract<RecordRunEndArgs, { mode: 'daily' }> =>
      a.mode === 'daily',
    )
    .map((a) => ({ date: a.date, outcome: a.outcome, score: a.score }));
}

describe('PlayingHost daily run (behaviour)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    seq = 0;
    lastScreenProps = {};
    dailyFixture = emptyDaily();
    forceBoardFailure = false;
    generateCalls.length = 0;
    hostOnMenu.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    sharedValues.length = 0;
    reactions.length = 0;
    setActive.mockClear();
    retry.mockClear();
    advanceWave.mockClear();
    recordRunEnd.mockClear();
  });

  it('the daily board is derived from the date and clearing it records under the daily arm (N-DAILY-01 / N-DAILY-02 / D-10)', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(DAY_A_NOON);
    await mountAndStartDaily();

    expect(
      compiledBoard(),
      'a generated board must be in compiledSv after the entry',
    ).not.toBeNull();
    expect(compiledBoard()!.brickCount).toBeGreaterThan(0);
    expect(
      retry,
      'retry() is correct at run start: it resets lives/score/combo onto the pushed board',
    ).toHaveBeenCalledTimes(1);
    expect(setActive).toHaveBeenLastCalledWith(true);

    await deliverPhase(SIM.WON, { score: 1200 });
    now.mockRestore();

    expect(
      advanceWave,
      'D-10: a cleared daily board ENDS the run — reaching the endless wave-advance intercept would advance the board and leave the date open forever',
    ).not.toHaveBeenCalled();
    expect(
      recordRunEnd,
      'the run must record exactly once',
    ).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    expect(args.mode).toBe('daily');
    // The narrowing below is the D-11 contract in miniature: `date` is only reachable
    // once TypeScript knows the arm, and `levelId` never becomes reachable at all.
    if (args.mode !== 'daily') {
      throw new Error('expected the daily arm of RecordRunEndArgs');
    }
    expect(
      args.date,
      'the LOCAL calendar date of the stubbed instant rides the daily arm',
    ).toBe(localDateKey(DAY_A_NOON));
    expect(args.outcome).toBe('win');
    expect(
      args,
      'the daily arm has NO levelId — that absence is what makes the campaign write unreachable (N-DAILY-03 / SC-5)',
    ).not.toHaveProperty('levelId');

    // Write FIRST, then the panel is fed from the returned stored record
    // (12-UI-SPEC § The panel is a pure function of the stored daily record).
    expect(lastScreenProps.mode, 'the panel routes on the mode STATE').toBe(
      'daily',
    );
    expect(
      lastScreenProps.dailyDateKey,
      'the date the panel renders is the date that was stored',
    ).toBe(localDateKey(DAY_A_NOON));
    expect(
      lastScreenProps.score,
      'and so is the score — read back off the blob recordRunEnd returned, not off the live run state',
    ).toBe(1200);

    await deliverPhase(SIM.WON, { score: 1200 });
    expect(
      recordRunEnd,
      'runEndedRef is the single funnel — a repeat WON records nothing extra',
    ).toHaveBeenCalledTimes(1);
  });

  it('the same date gives the same board and a different date gives a different one (SC-1 / N-DAILY-01)', async () => {
    expect(
      localDateKey(DAY_A_NOON),
      'the two fixtures must be different LOCAL dates in this runner’s zone, or the case below proves nothing',
    ).not.toBe(localDateKey(DAY_B_NOON));

    const now = vi.spyOn(Date, 'now');

    now.mockReturnValue(DAY_A_NOON);
    await mountAndStartDaily();
    const firstA = boardFingerprint();
    cleanup();
    sharedValues.length = 0;
    reactions.length = 0;

    // The SAME date, entered again from a cold mount. The endless analog asserts its
    // two runs DIFFER because it re-mints the seed from the wall clock; daily must
    // never do that, so this assertion is that case inverted.
    now.mockReturnValue(DAY_A_NOON);
    await mountAndStartDaily();
    const secondA = boardFingerprint();
    cleanup();
    sharedValues.length = 0;
    reactions.length = 0;

    now.mockReturnValue(DAY_B_NOON);
    await mountAndStartDaily();
    const firstB = boardFingerprint();
    now.mockRestore();

    expect(firstA).not.toBe('none');
    expect(
      secondA,
      'the same date must give the same board — a re-minted seed here would break SC-1 and make the day un-replayable',
    ).toBe(firstA);
    expect(
      firstB,
      'and the next date must give a different one — a board that ignored the date would be the same every day',
    ).not.toBe(firstA);
  });
});

/**
 * 12-05 Task 3 — the run boundaries (12-UI-SPEC § Run boundaries (daily)).
 *
 * Two assertions in here are the deliberate INVERSE of the adjacent endless code, and
 * both say so where they sit, because copying the analog by pattern gets them backwards:
 * the closed-date case asserts the generator was NOT called, and the retry case asserts
 * the board fingerprint is the SAME across a restart where the endless harness asserts
 * two runs DIFFER.
 */
describe('PlayingHost daily run boundaries (12-05)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    seq = 0;
    lastScreenProps = {};
    dailyFixture = emptyDaily();
    forceBoardFailure = false;
    generateCalls.length = 0;
    hostOnMenu.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    sharedValues.length = 0;
    reactions.length = 0;
    setActive.mockClear();
    retry.mockClear();
    advanceWave.mockClear();
    recordRunEnd.mockClear();
  });

  it('a closed date is READ-ONLY: it renders the stored panel, generates no board and writes nothing (D-02 / SC-2)', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(DAY_A_NOON);
    const today = localDateKey(DAY_A_NOON);
    seedClosedThrough(today, 4242);

    await mountHost();
    // The CAMPAIGN board the cold path pushed. Captured before the press so the
    // assertion below is about what the press did, not about what was already there —
    // `compiledBoard()` is non-null from mount, so a bare not-null check would be
    // green against an implementation that swapped in a daily board.
    const beforePress = boardFingerprint();
    expect(beforePress).not.toBe('none');
    await pressDaily();
    now.mockRestore();

    expect(
      generateCalls,
      'D-02: a date with a stored result is read-only. Asserting only that no run started would pass against an implementation that generated a board and threw it away',
    ).toEqual([]);
    expect(
      recordRunEnd,
      'and nothing is written — a re-open must not touch the record it is reading',
    ).not.toHaveBeenCalled();
    expect(
      boardFingerprint(),
      'no generated board reached compiledSv, so the campaign board behind the panel is untouched',
    ).toBe(beforePress);
    expect(lastScreenProps.mode).toBe('daily');
    expect(
      lastScreenProps.result,
      'the panel is showing, from the stored outcome for that date',
    ).toBe('win');
  });

  it('the closed date panel renders the STORED scalars, through the same path the just-finished panel takes (SC-2)', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(DAY_A_NOON);
    const today = localDateKey(DAY_A_NOON);
    seedClosedThrough(today, 4242);

    await mountHost();
    await pressDaily();
    now.mockRestore();

    expect(lastScreenProps.dailyDateKey).toBe(today);
    expect(
      lastScreenProps.score,
      'the score comes off the stored entry, not off live run state — there is no live run',
    ).toBe(4242);
    expect(lastScreenProps.dailyStreak).toBe(3);
    expect(lastScreenProps.dailyLongestStreak).toBe(3);
    expect(lastScreenProps.dailyTotalDaysPlayed).toBe(3);
    expect(
      lastScreenProps.dailyEndedStreakLength,
      'the previous stored date is this one minus a day, so the streak CONTINUED and the line is omitted',
    ).toBeNull();
    expect(
      lastScreenProps.dailyNextBoundaryMs,
      'the countdown has a boundary to count to',
    ).toBeGreaterThan(0);
  });

  it('an open date is still playable and still starts a run — the closed-date branch is not a blanket block', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(DAY_A_NOON);
    // Yesterday is closed; today is not.
    seedClosedThrough(previousDateKey(localDateKey(DAY_A_NOON)), 900);

    await mountHost();
    await pressDaily();
    now.mockRestore();

    expect(
      generateCalls,
      'the generator ran exactly once, for TODAY — a non-vacuity control for the case above',
    ).toEqual([localDateKey(DAY_A_NOON)]);
    expect(compiledBoard()).not.toBeNull();
  });

  it('pause then Retry records the run as abandoned and restarts the SAME board, leaving the date open (D-08 / D-09)', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(DAY_A_NOON);
    await mountAndStartDaily();
    const before = boardFingerprint();

    await press('Pause game');
    await press('Pause panel Retry');
    now.mockRestore();

    const calls = dailyCalls();
    expect(calls.length, 'exactly one recorded run').toBe(1);
    expect(calls[0]!.outcome).toBe('abandoned');
    expect(calls[0]!.date).toBe(localDateKey(DAY_A_NOON));
    expect(
      dailyFixture.history,
      'D-07: abandoning does not close the date — a real interruption must not cost the player their day',
    ).toEqual([]);
    expect(
      boardFingerprint(),
      'the DELIBERATE INVERSE of the endless harness, which asserts two runs differ because it re-mints the seed per run. The daily board is a pure function of the date key and of nothing else (SC-1)',
    ).toBe(before);
    expect(before).not.toBe('none');
  });

  it('pause then Menu records the run as abandoned and leaves the date open (D-07)', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(DAY_A_NOON);
    await mountAndStartDaily();

    await press('Pause game');
    await press('Pause panel Menu');
    now.mockRestore();

    const calls = dailyCalls();
    expect(calls.length).toBe(1);
    expect(calls[0]!.outcome).toBe('abandoned');
    expect(dailyFixture.history).toEqual([]);
    expect(hostOnMenu, 'and it still leaves to Title').toHaveBeenCalledTimes(1);
  });

  it('a dev-row level press during a live daily run records it as abandoned and exits daily (D-09)', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(DAY_A_NOON);
    await mountAndStartDaily();

    await press('Switch level, current level-01');
    now.mockRestore();

    const calls = dailyCalls();
    expect(
      calls.length,
      '11-VERIFICATION gap 1 for a third mode: a new entry point is a new caller with the same obligation',
    ).toBe(1);
    expect(calls[0]!.outcome).toBe('abandoned');
    expect(dailyFixture.history).toEqual([]);
    expect(lastScreenProps.mode, 'and the host has left daily').toBe(
      'campaign',
    );
  });

  it('a dev session remount during a live daily run records it as abandoned and exits daily (D-09)', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(DAY_A_NOON);
    await mountAndStartDaily();

    await press('Force quality tier, current Auto mid');
    await act(async () => {
      await Promise.resolve();
    });
    now.mockRestore();

    const calls = dailyCalls();
    expect(calls.length).toBe(1);
    expect(calls[0]!.outcome).toBe('abandoned');
    expect(dailyFixture.history).toEqual([]);
    expect(lastScreenProps.mode).toBe('campaign');
  });

  it("a board that cannot be built keeps the date OPEN and renders the failure variant, never the level-error overlay", async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(DAY_A_NOON);
    forceBoardFailure = true;

    await mountHost();
    await pressDaily();
    now.mockRestore();

    expect(
      recordRunEnd,
      'nothing was played, so nothing may be written — the date stays open',
    ).not.toHaveBeenCalled();
    expect(dailyFixture.history).toEqual([]);
    expect(lastScreenProps.mode).toBe('daily');
    expect(
      lastScreenProps.dailyBoardFailed,
      'the panel takes the board-failure variant: the accent-white Daily heading, Retry then Menu',
    ).toBe(true);
    expect(
      lastScreenProps.result,
      'the result chrome is raised so the panel is reachable, exactly as the shipped endless start-failure does it',
    ).not.toBeNull();
    expect(
      lastScreenProps.levelError,
      'LevelErrorOverlay has no controls and would trap the player with no exit',
    ).toBeNull();
  });

  it('the countdown instant refreshes on the 60-second tick while the panel is open, and no interval runs while it is closed', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(DAY_A_NOON);
    await mountAndStartDaily();

    // No panel yet: the interval must not exist. `advanceTimersByTime` rather than
    // `runAllTimers` throughout — see the file header.
    const beforeClosed = lastScreenProps.dailyNowMs;
    now.mockReturnValue(DAY_A_NOON + 180_000);
    await act(async () => {
      vi.advanceTimersByTime(180_000);
      await Promise.resolve();
    });
    expect(
      lastScreenProps.result,
      'still mid-run, so no daily panel is open',
    ).toBeNull();
    expect(
      lastScreenProps.dailyNowMs,
      'and with the panel closed the instant is UNTOUCHED across 180s of timers — an ' +
        'interval that fired would have moved it, so this observes the absence rather ' +
        'than merely asserting the panel is closed',
    ).toBe(beforeClosed);
    now.mockReturnValue(DAY_A_NOON);

    await deliverPhase(SIM.WON, { score: 1200 });
    const atPublish = lastScreenProps.dailyNowMs;
    // CAPTURED BEFORE the refresh — the whole point. `expect(x).toBe(x)` after the fact
    // passes for every value including undefined and NaN, and pinned nothing.
    const boundaryAtPublish = lastScreenProps.dailyNextBoundaryMs;
    expect(atPublish).toBe(DAY_A_NOON);
    expect(
      boundaryAtPublish,
      'fixture sanity: the published boundary is the midnight ending the SHOWN date, so ' +
        'the constant compared against below is itself the right number',
    ).toBe(localMidnightEndingMs(localDateKey(DAY_A_NOON)));

    now.mockReturnValue(DAY_A_NOON + 180_000);
    await act(async () => {
      vi.advanceTimersByTime(180_000);
      await Promise.resolve();
    });
    now.mockRestore();

    expect(
      lastScreenProps.dailyNowMs,
      'the countdown recomputes from a FRESH clock read — derived, never accumulated',
    ).toBe(DAY_A_NOON + 180_000);
    expect(
      lastScreenProps.dailyNextBoundaryMs,
      'and the boundary stays pinned across the refresh, so the remainder can actually ' +
        'reach zero (12-UI-SPEC § Clock policy rule 5)',
    ).toBe(boundaryAtPublish);

    // Now step the clock PAST the pinned boundary, which is the only advance that can
    // tell a pinned boundary from a re-derived one: within day A both answer the same
    // number, so an assertion that never crosses midnight cannot falsify the rule.
    const now2 = vi.spyOn(Date, 'now');
    now2.mockReturnValue(DAY_B_NOON);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    now2.mockRestore();

    expect(
      lastScreenProps.dailyNowMs,
      'the tick after the rollover reads the fresh clock',
    ).toBe(DAY_B_NOON);
    expect(
      lastScreenProps.dailyNextBoundaryMs,
      'but the boundary is STILL the one pinned at publish — re-deriving it here would ' +
        'move it a whole day and the remainder would be permanently positive',
    ).toBe(boundaryAtPublish);
    expect(
      ms(lastScreenProps.dailyNextBoundaryMs, 'dailyNextBoundaryMs') -
        ms(lastScreenProps.dailyNowMs, 'dailyNowMs'),
      'which is what makes the omission reachable at all: the remainder is now ' +
        'non-positive, so the countdown line drops rather than counting to a second tomorrow',
    ).toBeLessThanOrEqual(0);
  });

  it('a run that crosses local midnight counts down to the midnight ending the SHOWN date, not to the next one', async () => {
    // Begun 23:58 on day A, finished 00:01 on day B. D-08 records the result under the
    // date the run STARTED on, so the panel is dated A while the clock is already on B.
    const startedAt = DAY_A_NOON + 11 * 60 * 60 * 1000 + 58 * 60 * 1000;
    const finishedAt = startedAt + 3 * 60 * 1000;
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(startedAt);
    await mountAndStartDaily();

    now.mockReturnValue(finishedAt);
    await deliverPhase(SIM.WON, { score: 1200 });
    now.mockRestore();

    expect(
      localDateKey(startedAt),
      'fixture sanity: the run began on day A…',
    ).toBe(localDateKey(DAY_A_NOON));
    expect(
      localDateKey(finishedAt),
      '…and finished on day B, so the clock has genuinely crossed',
    ).toBe(localDateKey(DAY_B_NOON));
    expect(
      dailyCalls()[0]!.date,
      'the result is recorded under the START date, which must never move (D-08)',
    ).toBe(localDateKey(DAY_A_NOON));

    const boundary = ms(lastScreenProps.dailyNextBoundaryMs, 'dailyNextBoundaryMs');
    expect(
      boundary,
      'the countdown ends when the SHOWN date ends, which is already behind us',
    ).toBe(localMidnightEndingMs(localDateKey(DAY_A_NOON)));
    expect(
      boundary - ms(lastScreenProps.dailyNowMs, 'dailyNowMs'),
      'so the remainder is non-positive and the line omits itself — the new board is ' +
        'already playable and the panel must not advertise it as pending',
    ).toBeLessThanOrEqual(0);
    expect(
      nextLocalMidnightMs(finishedAt) - finishedAt,
      'the clock-derived boundary the defect produced would have advertised ~23h59m of ' +
        'wait beside a panel dated yesterday — stated so this case cannot pass vacuously',
    ).toBeGreaterThan(23 * 60 * 60 * 1000);
  });
});
