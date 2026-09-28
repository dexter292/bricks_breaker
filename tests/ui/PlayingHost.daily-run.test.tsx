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
 *  - The closed-date read path, the abandoned boundaries, the streak block and the
 *    countdown. All plan 12-03…12-05, none of them stubbed here.
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
import type { RecordRunEndArgs } from '../../src/services/storage';
import { localDateKey } from '../../src/services/daily';

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
 * The props the host last handed `GameScreen`. Captured rather than rendered: the
 * mock below collapses the whole screen to its dev-row slot so the `__DEV__` daily
 * entry is pressable, which also means the real panel never mounts. Asserting the
 * props is what remains provable here about "the panel is rendered from the stored
 * record" — the markup itself is plan 12-05's component test.
 */
let lastScreenProps: { mode?: unknown; dailyDateKey?: unknown; score?: unknown } = {};

/** Render the dev row so the `__DEV__` daily entry is pressable. */
vi.mock('../../src/runtime/GameScreen', () => ({
  GameScreen: (props: {
    devLevelSwitch?: unknown;
    mode?: unknown;
    dailyDateKey?: unknown;
    score?: unknown;
  }) => {
    lastScreenProps = props;
    return (props.devLevelSwitch ?? null) as never;
  },
}));

const recordRunEnd = vi.fn((args: RecordRunEndArgs) => ({
  bestByLevel: {},
  unlocked: [],
  telemetry: {
    endless: { bestWave: 0, bestScore: 0 },
    // 12-01: the host's daily arm reads the POST-MERGE record off this synchronous
    // return. A mock that omits `daily` silently exercises the fail-soft branch
    // instead of the real one, which is exactly what the endless harness warns about
    // for its own `endless` field. Echoing the args is what makes this the STORED
    // record rather than a second copy of the in-memory run state — D-07 is honoured
    // here too, so an abandoned daily run gets no entry and does not close the date.
    daily: {
      history:
        args.mode === 'daily' &&
        (args.outcome === 'win' || args.outcome === 'lose')
          ? [{ date: args.date, score: args.score, outcome: args.outcome }]
          : [],
    },
  },
}));
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
            daily: { history: [] },
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

async function mountAndStartDaily(): Promise<void> {
  const { PlayingHost } = await import('../../app/_components/PlayingHost');
  render(
    createElement(PlayingHost, {
      levelId: 'level-01' as LevelId,
      onMenu: () => {},
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
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: "Open today's daily challenge" }),
    );
    await Promise.resolve();
  });
}

describe('PlayingHost daily run (behaviour)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    seq = 0;
    lastScreenProps = {};
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
