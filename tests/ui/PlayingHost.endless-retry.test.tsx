/**
 * Plan 11-07 — the endless RUN BOUNDARY, driven through the real host.
 *
 * `11-VERIFICATION.md` gap 1 shipped because no test drove Retry in endless at all:
 * `PlayingHost.endless-run.test.tsx` exercises entry, WON, double-WON, guard release
 * and zero lives, and every one of those is a happy path. This file drives the paths
 * that reset a live run — the Results `Retry`, the Pause controls and the `__DEV__`
 * tier change — and asserts on what `recordRunEnd` actually received, because that
 * argument is what reaches AsyncStorage and becomes `telemetry.endless.bestWave`.
 *
 * The harness is the host's own bridge, copied from the 11-05 file: a STABLE
 * `useSharedValue` mock, a `useAnimatedReaction` capture list, and `deliverPhase` as
 * the `chromeSeq` bump. `generate`, `compileGeneratedLevel` and the endless ramp are
 * all REAL — the boards below are the boards a device would get.
 *
 * One divergence from the 11-05 harness: the `GameScreen` mock renders the result
 * and pause CONTROLS as well as the dev row, so a test can press the real control
 * rather than reach into the host's props.
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

// The entry is `__DEV__`-gated (D-05), which is the point — so the harness has to
// stand where a dev build stands. An undefined `__DEV__` renders no dev row at all.
vi.stubGlobal('__DEV__', true);

/** Mirror of the host's own SimPhase numerals (the app tier may not import core). */
const SIM = { DOCKED: 0, PLAYING: 1, WON: 2, LOST: 3 } as const;

type Sv = { value: unknown };
type Reaction = { fn: (next: unknown, prev: unknown) => void };
const sharedValues: Sv[] = [];
const reactions: Reaction[] = [];

vi.mock('expo-font', () => ({ useFonts: () => [true] }));
vi.mock('expo-keep-awake', () => ({ useKeepAwake: () => {} }));
vi.mock('@shopify/react-native-skia', () => ({ useFont: () => null }));

/**
 * Reanimated's `useSharedValue` is STABLE across renders, and this mock has to be
 * too — a fresh object per render changes the identity of `compiledSv`, which is an
 * effect dependency, and the bake effect then tears down on every render.
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
 * The forced wave-build failure (11-07 Task 4).
 *
 * `loadLevelById` stays REAL — the catalog level must still load, because the whole
 * point of the contract is that a GENERATED board failing is not a catalog error and
 * must never reach `LevelErrorOverlay`. Only `compileGeneratedLevel` is wrapped, and
 * only from the call index a test opts into: `failCompileFrom = compileCalls + 1`
 * makes the NEXT generated board, and every one after it, fail to compile. Failing
 * persistently rather than once is deliberate — it is what lets the test tell a
 * released guard (the branch is re-entered and fails again) apart from a latched one
 * (the branch is never re-entered at all).
 */
let compileCalls = 0;
let failCompileFrom = 0;
vi.mock('../../src/runtime/loadLevel', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/runtime/loadLevel')>();
  return {
    ...actual,
    compileGeneratedLevel: (raw: Parameters<typeof actual.compileGeneratedLevel>[0]) => {
      compileCalls += 1;
      if (failCompileFrom !== 0 && compileCalls >= failCompileFrom) {
        return {
          ok: false as const,
          issues: [{ path: 'forced', message: 'forced compile failure' }],
        };
      }
      return actual.compileGeneratedLevel(raw);
    },
  };
});

/** The host props this file reads back — HUD values the mock does not render. */
type HostProps = {
  devLevelSwitch?: unknown;
  result?: null | 'win' | 'lose';
  uiPhase?: string;
  lives?: number;
  score?: number;
  levelError?: unknown;
  onRetry?: () => void;
  onMenu?: () => void;
  onPause?: () => void;
};
const hostProps: { current: HostProps | null } = { current: null };

/**
 * Render the dev row AND the controls. The stock 11-05 mock renders only
 * `devLevelSwitch`, which is why no test could press Retry — the whole of gap 1
 * lives behind that button. `onRetry` is passed ONCE by the host and serves both
 * panels, so the two Retry buttons below are distinctly labelled: a test must say
 * which panel it pressed even though the handler is the same function.
 */
vi.mock('../../src/runtime/GameScreen', async () => {
  const react = await import('react');
  const { Pressable, Text } = await import('react-native');
  return {
    GameScreen: (props: HostProps) => {
      hostProps.current = props;
      const children: ReturnType<typeof react.createElement>[] = [
        react.createElement(
          react.Fragment,
          { key: 'dev' },
          (props.devLevelSwitch ?? null) as never,
        ),
      ];
      if (props.result != null) {
        children.push(
          react.createElement(
            Pressable,
            {
              key: 'result-retry',
              accessibilityRole: 'button',
              accessibilityLabel: 'Retry',
              onPress: props.onRetry,
            },
            react.createElement(Text, null, 'Retry'),
          ),
          react.createElement(
            Pressable,
            {
              key: 'result-menu',
              accessibilityRole: 'button',
              accessibilityLabel: 'Menu',
              onPress: props.onMenu,
            },
            react.createElement(Text, null, 'Menu'),
          ),
        );
      }
      children.push(
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
      );
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
      return react.createElement(react.Fragment, null, ...children) as never;
    },
  };
});

/**
 * The return shape carries `telemetry.endless` so plan 11-08 (the display half of
 * the mode firewall) can read it here without re-shaping this mock.
 */
const recordRunEnd = vi.fn((_args: RecordRunEndArgs) => ({
  bestByLevel: {},
  unlocked: [],
  telemetry: { endless: { bestWave: 0, bestScore: 0, runs: 0 } },
}));
vi.mock('../../src/services/storage', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/services/storage')>();
  return {
    ...actual,
    createDefaultProgressStore: () => ({
      getBestForLevel: () => Promise.resolve(0),
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

async function press(name: string): Promise<void> {
  const el = screen.getByRole('button', { name });
  await act(async () => {
    fireEvent.click(el);
    await Promise.resolve();
  });
}

async function mountAndStartEndless(): Promise<void> {
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
      screen.getByRole('button', { name: 'Start an endless run' }),
    ).toBeTruthy();
  });
  setActive.mockClear();
  retry.mockClear();
  advanceWave.mockClear();
  recordRunEnd.mockClear();
  await press('Start an endless run');
}

/** Run to wave 2 and stop there, leaving the guard released and the run live. */
async function advanceToWaveTwo(): Promise<void> {
  await deliverPhase(SIM.WON, { score: 1200 });
  await deliverPhase(SIM.DOCKED, { score: 1200 });
}

describe('PlayingHost endless run boundary (behaviour)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    seq = 0;
    compileCalls = 0;
    failCompileFrom = 0;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    sharedValues.length = 0;
    reactions.length = 0;
    hostProps.current = null;
    setActive.mockClear();
    retry.mockClear();
    advanceWave.mockClear();
    recordRunEnd.mockClear();
  });

  it('Retry from the endless Results overlay restarts at wave 1, not on the wave-N board (gap 1)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    const wave2 = boardFingerprint();
    expect(screen.getByText('W2')).toBeTruthy();

    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    advanceWave.mockClear();
    retry.mockClear();

    await press('Retry');

    expect(
      screen.getByText('W1'),
      'an endless Retry is a NEW run — waveRef must return to 1, not resume at 2',
    ).toBeTruthy();
    expect(
      boardFingerprint(),
      'the wave-N generated board must be replaced, never refilled with lives',
    ).not.toBe(wave2);
    expect(
      advanceWave,
      'a Retry is a run start, not a wave transition',
    ).not.toHaveBeenCalled();
    expect(
      retry,
      'exactly the one retry() startEndlessRun itself makes — the campaign onRetry path must be unreachable',
    ).toHaveBeenCalledTimes(1);
    expect(hostProps.current?.lives, 'lives reset').toBe(3);
    expect(hostProps.current?.score, 'score reset').toBe(0);
  });

  it('the Retry re-mints the run seed, so the new wave 1 is a different board (N-END-03)', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);
    await mountAndStartEndless();
    const wave1A = boardFingerprint();
    await advanceToWaveTwo();
    const wave2 = boardFingerprint();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });

    now.mockReturnValue(9_876_543);
    await press('Retry');
    const wave1B = boardFingerprint();

    expect(wave1A).not.toBe('none');
    expect(
      wave1B,
      'a Retry that reused the run seed would replay the identical board sequence',
    ).not.toBe(wave1A);
    expect(wave1B, 'and it is not the wave-2 board either').not.toBe(wave2);
  });

  it('the loss after a Retry records wave 1 — a Retry chain cannot raise bestWave (N-END-02)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });

    expect(recordRunEnd, 'the first run records once').toHaveBeenCalledTimes(1);
    const first = recordRunEnd.mock.calls[0]![0];
    if (first.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(first.wave, 'the first run genuinely reached wave 2').toBe(2);

    await press('Retry');
    await deliverPhase(SIM.LOST, { lives: 0, score: 300 });

    expect(
      recordRunEnd,
      'the second run records once — the Retry itself records nothing, the run had already ended',
    ).toHaveBeenCalledTimes(2);
    const second = recordRunEnd.mock.calls[1]![0];
    expect(second.mode).toBe('endless');
    if (second.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(
      second.wave,
      'THE GAP: a resumed run recorded wave 3 here; a new run records wave 1',
    ).toBe(1);
    expect(second.outcome).toBe('lose');
    expect(
      second,
      'the endless arm has NO levelId — that absence is what makes the campaign write unreachable (D-11 / SC-3)',
    ).not.toHaveProperty('levelId');
  });

  it('a DEV tier change during a live endless run records it before restarting (gap 1)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    const wave2 = boardFingerprint();
    expect(screen.getByText('W2')).toBeTruthy();

    // `remountDevSession` is reached exactly as a developer reaches it: the dev-row
    // tier button runs `cycleDevTier`, and the `tierOverrideRef` effect calls the
    // remount. The glow-bake effect does not depend on the tier (its array ends
    // `loadResult, loadKey`), so the press cannot flip `fxReady` and make the restart
    // return at its own guard.
    await press('Force quality tier, current Auto mid');

    expect(
      recordRunEnd,
      'the in-flight run must be recorded before the reset discards its wave',
    ).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    expect(args.mode).toBe('endless');
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.outcome).toBe('abandoned');
    expect(args.wave, 'recorded at the wave reached BEFORE the reset').toBe(2);
    expect(screen.getByText('W1'), 'and then it is a new run at wave 1').toBeTruthy();
    expect(boardFingerprint(), 'on a freshly generated board').not.toBe(wave2);
  });

  it('Pause then Retry records the in-flight run, then restarts at wave 1 (UI-SPEC run boundaries)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();

    await press('Pause game');
    await press('Pause panel Retry');

    expect(recordRunEnd, 'exactly one abandoned record').toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.outcome).toBe('abandoned');
    expect(args.wave, 'at the wave reached before the reset').toBe(2);
    expect(screen.getByText('W1')).toBeTruthy();
    expect(hostProps.current?.lives, 'lives reset').toBe(3);
    expect(hostProps.current?.score, 'score reset').toBe(0);
  });

  it('Pause then Menu keeps its existing abandon funnel, unchanged (T-09-10)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();

    await press('Pause game');
    await press('Pause panel Menu');

    expect(recordRunEnd).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.outcome).toBe('abandoned');
    expect(args.wave).toBe(2);
  });

  it('Menu after the run already ended records nothing extra — the funnel cannot double-record', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    expect(recordRunEnd, 'the loss recorded once').toHaveBeenCalledTimes(1);

    await press('Menu');

    expect(
      recordRunEnd,
      'runEndedRef is the single funnel — a finished run leaving to Menu records nothing extra',
    ).toHaveBeenCalledTimes(1);
  });

  it('the dev-row wave readout carries a screen-reader label naming the wave (11-UI-SPEC)', async () => {
    await mountAndStartEndless();

    expect(
      screen.getByLabelText('Wave 1'),
      'a bare W1 reads as nonsense to a screen reader',
    ).toBeTruthy();
    expect(screen.getByText('W1'), 'the visible readout is unchanged').toBeTruthy();

    await advanceToWaveTwo();

    expect(screen.getByLabelText('Wave 2')).toBeTruthy();
    expect(screen.getByText('W2')).toBeTruthy();
    expect(screen.queryByLabelText('Wave 1')).toBeNull();
  });

  it('a wave that cannot be built ENDS the run, records it, and releases the guard (WR-04)', async () => {
    const devError = vi.spyOn(console, 'error').mockImplementation(() => {});
    await mountAndStartEndless();
    expect(compileCalls, 'wave 1 compiled for real').toBeGreaterThan(0);

    // Every generated board from here on fails to compile.
    failCompileFrom = compileCalls + 1;
    await deliverPhase(SIM.WON, { score: 1500 });

    expect(
      advanceWave,
      'the wave swap must not be requested when the board behind it does not exist',
    ).not.toHaveBeenCalled();
    expect(
      recordRunEnd,
      'a failed wave build ends the run — it must not be silently dropped',
    ).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    expect(args.mode).toBe('endless');
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.outcome).toBe('abandoned');
    expect(
      args.wave,
      'recorded at the last SUCCESSFULLY built wave — advanceToWave assigns waveRef only after a good compile',
    ).toBe(1);

    expect(hostProps.current?.result, 'the run is over, not frozen mid-WON').toBe(
      'lose',
    );
    expect(
      setActive.mock.calls.at(-1)?.[0],
      'the frame loop is stopped — otherwise a live sim runs behind the overlay with keepAwake mounted',
    ).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Retry' }),
      'the Results controls are reachable, which is the whole reason LevelErrorOverlay is banned here',
    ).toBeTruthy();
    expect(
      hostProps.current?.levelError,
      'a GENERATED board failure must never reach levelError — GameScreen suppresses showResult on it and LevelErrorOverlay has no controls (11-UI-SPEC Error state (board))',
    ).toBeNull();
    expect(
      devError,
      'the failure still has to be loud on the __DEV__ diagnostic channel',
    ).toHaveBeenCalled();

    // The guard half of the SC-1 break: a latched `waveAdvanceInFlightRef` makes the
    // endless WON branch a no-op forever, so the next WON is swallowed in silence.
    //
    // The next mirror below is a bare WON, with NO intervening DOCKED — that shape is
    // load-bearing. `applyChrome` releases the guard on any phase that is neither WON
    // nor LOST (Pitfall 5), so a DOCKED in between would release it by the ordinary
    // path and this assertion would pass whether or not the failure branch cleared it.
    // A repeat WON is also the realistic shape: Pitfall 5 is precisely that the WON
    // mirror can arrive twice.
    const compilesAfterFailure = compileCalls;
    await deliverPhase(SIM.WON, { score: 1500 });

    expect(
      compileCalls,
      'the failure branch RELEASED the guard: a repeat WON re-enters the branch and attempts the build again',
    ).toBeGreaterThan(compilesAfterFailure);
    expect(
      advanceWave,
      'and it fails again — same seed, same wave, same board, so no wave swap is ever requested',
    ).not.toHaveBeenCalled();
    expect(
      recordRunEnd,
      'runEndedRef still holds: the finished run is not recorded a second time',
    ).toHaveBeenCalledTimes(1);
  });
});
