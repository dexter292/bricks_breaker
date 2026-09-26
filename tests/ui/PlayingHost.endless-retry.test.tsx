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
  /** 11-13 case (b): the integer that drives BOTH the failure body copy and the
   *  run-line suppression in `ResultOverlay`. Read back here, rendered in the
   *  sibling `PlayingHost.endless-record.test.tsx`. */
  waveBuildFailedWave?: number | null;
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
      // 11-08 seeds the endless watermark refs from this at mount. Zeros here, so
      // this file's contracts are unchanged: the display half is not what it drives.
      getSnapshot: () =>
        Promise.resolve({
          bestByLevel: {},
          unlocked: [],
          telemetry: { endless: { bestWave: 0, bestScore: 0 } },
        }),
      recordRunEnd,
      flush: () => Promise.resolve(),
    }),
  };
});

const setActive = vi.fn();
const retry = vi.fn();
const advanceWave = vi.fn();
/**
 * 11-16 Task 1 Step A. This was a bare no-op arrow, so no case in this file could
 * count injections — and the whole of round-4 gap 2 is a claim about WHEN
 * `injectCertWorstCase` fires and on whose session. A spy is the instrument.
 */
const injectCertWorstCase = vi.fn();

vi.mock('../../src/runtime/useGameLoop', () => ({
  UiPhaseNum: { PLAYING: 0, PAUSED: 1, COUNTDOWN: 2 },
  useGameLoop: () => ({
    picture: { value: null },
    surfaceSize: { value: { width: 360, height: 640 } },
    setActive,
    retry,
    advanceWave,
    injectCertWorstCase,
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

/**
 * Give every deferred effect its chance: the level-load promise, the bake effect and
 * — the reason this exists — the deferred-cert effect's 50 ms `setTimeout`. A walk
 * step that never settles would be green for the wrong reason: the PRE-fix run has to
 * be able to produce its one `injectCertWorstCase` call, or the case proves nothing.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await Promise.resolve();
      vi.runAllTimers();
      await Promise.resolve();
    });
  }
}

/** The `Lv` control's live label — `Switch level, current level-0N`. */
function levelSwitchLabel(): string {
  const el = screen.getByRole('button', { name: /^Switch level, current / });
  return el.getAttribute('aria-label') ?? '';
}

/** One `Lv` press, whatever level the row is currently on. */
async function pressLevelSwitch(): Promise<void> {
  const el = screen.getByRole('button', { name: /^Switch level, current / });
  await act(async () => {
    fireEvent.click(el);
    await Promise.resolve();
  });
}

async function mountAndStartEndless(
  levelId: LevelId = 'level-01' as LevelId,
): Promise<void> {
  const { PlayingHost } = await import('../../app/_components/PlayingHost');
  render(
    createElement(PlayingHost, {
      levelId,
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
  injectCertWorstCase.mockClear();
  recordRunEnd.mockClear();
  await press('Start an endless run');
}

/**
 * Mount and stop at the dev row — mode is still `'campaign'` and no endless run has
 * been started (11-10 Task 2). `mountAndStartEndless` presses the entry button, so a
 * case about CAMPAIGN behaviour cannot use it.
 */
async function mountOnly(): Promise<void> {
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
  injectCertWorstCase.mockClear();
  recordRunEnd.mockClear();
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
    injectCertWorstCase.mockClear();
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

  /**
   * 11-10 — `11-VERIFICATION.md` gap 1, the DURABLE half.
   *
   * The `__DEV__` `Endless` button binds `onPress={startEndlessRun}` directly and the
   * dev row stays mounted and tappable for the whole run, so a second press mid-run
   * is a run boundary — and it was the one round 1 missed, because the funnel was
   * wired at the CALLERS rather than inside `startEndlessRun`. Measured pre-fix:
   * readout `W2` → `W1`, `recordRunEnd` calls = ZERO. No case in this file pressed
   * that button twice before now.
   *
   * `startEndlessRun` is the function Phase 14 promotes to the production endless
   * entry point, which is why the omission outlives the dev row that exposed it.
   */
  it('a second press of the __DEV__ Endless button records the run it discards (gap 1)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    expect(screen.getByText('W2'), 'the run is live at wave 2').toBeTruthy();
    expect(recordRunEnd, 'nothing recorded yet — the run is still live').toHaveBeenCalledTimes(0);

    await press('Start an endless run');

    expect(
      recordRunEnd,
      'measured pre-fix: 0 calls — the in-flight run vanished from telemetry entirely',
    ).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    expect(args.mode, 'filed under the endless arm, not the campaign one').toBe(
      'endless',
    );
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(
      args.wave,
      'at the wave the discarded run REACHED — recorded before anything can move waveRef',
    ).toBe(2);
    expect(args.outcome, 'the player did not lose it — they replaced it').toBe(
      'abandoned',
    );
    expect(
      screen.getByText('W1'),
      'and only AFTER the record does the readout return to W1',
    ).toBeTruthy();
  });

  it('that second press starts a genuinely NEW run — the wave does not carry forward (gap 1)', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);
    await mountAndStartEndless();
    const wave1A = boardFingerprint();
    await advanceToWaveTwo();
    const wave2 = boardFingerprint();
    advanceWave.mockClear();

    now.mockReturnValue(9_876_543);
    await press('Start an endless run');

    expect(wave1A, 'the harness produced a real board to compare against').not.toBe(
      'none',
    );
    expect(
      boardFingerprint(),
      'the wave-2 generated board must be replaced, not refilled with lives',
    ).not.toBe(wave2);
    expect(
      boardFingerprint(),
      'and the seed was re-minted — a reused seed would replay the identical board sequence',
    ).not.toBe(wave1A);
    expect(
      advanceWave,
      'a run START is not a wave transition — advanceWave belongs to the WON intercept alone',
    ).not.toHaveBeenCalled();
    expect(hostProps.current?.lives, 'lives reset').toBe(3);
    expect(hostProps.current?.score, 'score reset').toBe(0);

    // The discriminating assertion: a mid-run restart that carried the wave forward
    // would file this loss at wave 3, silently inflating the record it just dropped.
    recordRunEnd.mockClear();
    await deliverPhase(SIM.LOST, { lives: 0, score: 300 });
    expect(recordRunEnd, 'the new run records on its own loss').toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.wave, 'a new run starts at wave 1 and loses at wave 1').toBe(1);
  });

  it('Retry from the endless lose overlay records nothing extra — the funnel latch survived the move (T-11-11)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    expect(recordRunEnd, 'the loss recorded the finished run once').toHaveBeenCalledTimes(1);

    await press('Retry');

    // The funnel now runs on EVERY startEndlessRun, so the shared `runEndedRef` gate
    // is the only thing standing between a Retry and a double-record of the run that
    // just ended. Without it every single Retry writes the finished run a second time.
    expect(
      recordRunEnd,
      'the run already ended at zero lives — a Retry must not write it again',
    ).toHaveBeenCalledTimes(1);
    expect(screen.getByText('W1'), 'and the Retry still starts a new run').toBeTruthy();
    expect(hostProps.current?.result, 'which clears the overlay').toBeNull();
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

  it('a wave that cannot be built ENDS the run, records it, and the ended run STAYS ended (WR-04 / gap 3)', async () => {
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

    // 11-13 Task 2 Step B — a DISCLOSED TIER CHANGE, not a silent rewrite.
    //
    // What this block used to assert: `compileCalls` INCREASES across a repeat WON,
    // on the reasoning that "the failure branch RELEASED the guard, so a repeat WON
    // re-enters the branch and attempts the build again". That was a real property
    // and it was really observed here.
    //
    // 11-13 Task 1 makes that observation IMPOSSIBLE BY DESIGN. The endless WON
    // branch now returns on `runEndedRef.current`, and a wave-build failure always
    // ends the run, so no later mirror can re-enter the branch at all — there is no
    // drive left in this repo that can see the release. The property did not go away;
    // its OBSERVATION did. The release itself is now a SOURCE contract, in
    // `tests/ui/PlayingHost.endless-host.test.ts` § 'the failed wave build ends the
    // run and releases the guard, inside the endless branch (WR-04 / SC-1)'. Be clear
    // about what that buys: counting the statement proves the WRITE, never a
    // behaviour. Nothing below is dressed up as the old assertion.
    //
    // What the same drive now asserts instead is strictly the property gap 3 is
    // about: an ENDED run stays ended. That is not a consolation prize — it is the
    // defect this case sat one line away from for two rounds.
    //
    // The next mirror below is still a bare WON, with NO intervening DOCKED, and that
    // shape is still load-bearing: `applyChrome` releases the guard on any phase that
    // is neither WON nor LOST (Pitfall 5), so a DOCKED in between would let the
    // ordinary release path decide the outcome instead of the latch. A repeat WON is
    // also the realistic shape — Pitfall 5 is precisely that the WON mirror can
    // arrive twice.
    //
    // Measured on the pre-fix code, this same drive: `compileCalls` rose by one.
    const compilesAfterFailure = compileCalls;
    await deliverPhase(SIM.WON, { score: 1500 });

    expect(
      compileCalls,
      'the run has ENDED: a repeat WON must not re-enter the branch and attempt another build — measured pre-fix, compileCalls rose by one',
    ).toBe(compilesAfterFailure);
    expect(
      advanceWave,
      'an ended run never requests a wave swap',
    ).not.toHaveBeenCalled();
    expect(
      recordRunEnd,
      'runEndedRef still holds: the finished run is not recorded a second time',
    ).toHaveBeenCalledTimes(1);
  });

  /**
   * 11-13 Task 1 — `11-VERIFICATION.md` gap 3: an endless run that has ENDED does not
   * stay ended.
   *
   * `applyChrome` is built around ONE `runEndedRef` latch that every run-boundary
   * branch consults — campaign WON, campaign LOST and the mid-run wave-build failure
   * all do. The endless WON branch gated on `modeRef` and `waveAdvanceInFlightRef`
   * only, and the inner `if (!waveAdvanceInFlightRef.current)` guards CONCURRENCY,
   * not run lifetime. So after the run boundary had fired, further WON mirrors kept
   * regenerating boards and walking the wave.
   *
   * SEVERITY, stated the way the verifier settled it rather than the way `11-REVIEW`
   * CR-01 opened it. This cannot inflate the record: from an ended run walked to W7,
   * `Menu` records nothing (`runEndedRef` is latched) and `Retry` resets to wave 1, so
   * the next loss records wave 1. Every path that clears `runEndedRef` either routes
   * through a wave-1 restart or exits to campaign, so no walked wave can reach
   * `telemetry.endless.bestWave`. What it IS: an incoherent ENDED state, a burned seed
   * walk, and an overlay that contradicts the readout behind it.
   *
   * Reachability is bounded and the cases below are honest about the shape they drive:
   * `chromeSeq` bumps only when the mirror CHANGES, and both ended states have already
   * called `setActive(false)`, so the in-app producer is a straggler frame that was in
   * flight when the loop stopped.
   */
  it('an endless run that LOST stays ended — one further WON mirror builds no board (gap 3)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    const wave2 = boardFingerprint();
    expect(screen.getByText('W2'), 'the run reached wave 2').toBeTruthy();

    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    expect(
      recordRunEnd,
      'the loss is the run boundary — it records exactly once',
    ).toHaveBeenCalledTimes(1);
    advanceWave.mockClear();

    // ONE straggler WON. This is the whole defect in a single mirror.
    //
    // 11-15 Task 2 — the PAYLOAD is the retrofit and it is the whole point. This
    // straggler used to re-send the boundary mirror's own `score: 2400`, which is
    // exactly why this drive proved the WAVE half of "an ended run stays ended" and
    // was structurally blind to the CHROME half: a mirror that repaints 2400 over
    // 2400 is indistinguishable from one that is correctly ignored. The same shape as
    // round 2's `previousBestRef` blind spot — an instrument pointed one symbol away
    // from the defect, now at its third occurrence.
    await deliverPhase(SIM.WON, { lives: 3, score: 9999 });

    expect(
      screen.queryByText('W3'),
      'measured pre-fix: the readout had walked to W3 on a run that was already over',
    ).toBeNull();
    expect(
      screen.queryByText('W2'),
      'the wave readout must not move after the run ended',
    ).not.toBeNull();
    expect(
      advanceWave,
      'measured pre-fix: advanceWave called ONCE, on a run the player had already lost',
    ).not.toHaveBeenCalled();
    expect(
      boardFingerprint(),
      'measured pre-fix: the compiled board CHANGED — a fresh wave-3 board sitting behind the lose overlay',
    ).toBe(wave2);
    expect(
      recordRunEnd,
      'and the ended run is still recorded exactly once',
    ).toHaveBeenCalledTimes(1);
    // 11-15 Task 2 — the CHROME half, on the same drive that already proved the wave.
    expect(
      hostProps.current?.score,
      'measured pre-fix: the host score became 9999 on a run banked at 2400, and the mounted Results panel repainted with it',
    ).toBe(2400);
    expect(
      hostProps.current?.lives,
      'measured pre-fix: lives went back to 3 on a run that ended at zero — D-04 says the frozen value is the run real final one, never a refill',
    ).toBe(0);
  });

  it('and it stays ended through a WALK — four more WON/DOCKED pairs do not move the wave (gap 3)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    const wave2 = boardFingerprint();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    advanceWave.mockClear();

    // The DOCKED half of each pair is what made the walk unbounded pre-fix:
    // `applyChrome` releases `waveAdvanceInFlightRef` on any phase that is neither WON
    // nor LOST, so every pair handed the branch a fresh, unlatched guard.
    //
    // 11-15 Task 2 — BOTH halves of every pair carry the distinguishable payload, not
    // just the WON. The DOCKED mirror is non-terminal, so pre-fix it fell straight
    // through the five writes at the top of `applyChrome` and repainted the panel
    // exactly as the WON did; a drive that only distinguished the WON half would
    // leave the non-terminal producer unproven.
    for (let i = 0; i < 4; i += 1) {
      await deliverPhase(SIM.WON, { lives: 3, score: 9999 });
      await deliverPhase(SIM.DOCKED, { lives: 3, score: 9999 });
    }

    expect(
      screen.queryByText('W6'),
      'measured pre-fix: four pairs walked the readout to W6 with the lose overlay still up',
    ).toBeNull();
    expect(
      screen.queryByText('W2'),
      'four WON/DOCKED pairs after the run ended must change nothing',
    ).not.toBeNull();
    expect(
      advanceWave,
      'measured pre-fix: four advanceWave calls, one per pair',
    ).not.toHaveBeenCalled();
    expect(
      boardFingerprint(),
      'and four generated boards were compiled and swapped in behind the overlay pre-fix',
    ).toBe(wave2);
    expect(
      recordRunEnd,
      'and still exactly one record, for the one run that happened',
    ).toHaveBeenCalledTimes(1);
    // 11-15 Task 2 — the CHROME half. Eight post-boundary mirrors, four of them
    // non-terminal, and not one of them may move the finished run's numbers.
    expect(
      hostProps.current?.score,
      'measured pre-fix: eight post-boundary mirrors each repainted the host score, leaving 9999 above the run own Best · 2400',
    ).toBe(2400);
    expect(
      hostProps.current?.lives,
      'measured pre-fix: lives back at 3 on a run that ended at zero',
    ).toBe(0);
  });

  /**
   * 11-13 Task 2, case (b) from `11-VERIFICATION.md` gap 3 `missing[]`.
   *
   * The sibling WR-04 case above drives a repeat WON while compilation is STILL
   * forced to fail, so post-fix it cannot tell "the branch was not re-entered" from
   * "it was re-entered and failed again". This case DISARMS the failure first, so the
   * second mirror is one that WOULD have built a board. That is what makes it
   * discriminating: pre-fix the readout moved to W3 while the overlay behind it was
   * still reading the wave-3 FAILURE copy — the run's own chrome contradicting itself.
   */
  it('a mid-run wave-build failure ENDS the run — a later WON that WOULD have succeeded moves nothing (gap 3, case b)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await mountAndStartEndless();
    await advanceToWaveTwo();
    const wave2 = boardFingerprint();
    expect(screen.queryByText('W2'), 'the run reached wave 2').not.toBeNull();

    // Fail exactly the wave-3 build.
    //
    // 11-15 Task 2 — this WON is the BOUNDARY mirror, not a straggler, so it keeps
    // the run's real numbers and must be allowed through. `lives: 2` is explicit
    // rather than the helper default of 3 for one reason: this drive's ended state is
    // a mid-run BUILD failure, not a zero-lives loss, so "the frozen lives" here is
    // whatever the run was actually on — and a boundary at 3 could not be told apart
    // from the straggler's 3 below, which would make the frozen-lives assertion an
    // assertion that already held.
    failCompileFrom = compileCalls + 1;
    await deliverPhase(SIM.WON, { lives: 2, score: 2400 });

    expect(hostProps.current?.result, 'the failed build ENDED the run').toBe('lose');
    expect(
      recordRunEnd,
      'recorded once, at the last SUCCESSFULLY built wave',
    ).toHaveBeenCalledTimes(1);
    expect(
      hostProps.current?.waveBuildFailedWave,
      'the overlay is told which wave could not be built — 3, the one the failure was armed for',
    ).toBe(3);
    advanceWave.mockClear();

    // DISARM, then deliver a WON that would build a real board.
    //
    // 11-15 Task 2 — and it carries a payload the boundary mirror never had, so this
    // drive can now see the chrome half as well as the wave half.
    failCompileFrom = 0;
    await deliverPhase(SIM.WON, { lives: 3, score: 9999 });

    expect(
      screen.queryByText('W3'),
      'measured pre-fix: the readout moved to W3 while the overlay still read the wave-3 failure copy',
    ).toBeNull();
    expect(
      screen.queryByText('W2'),
      'an ended run holds its last successfully built wave',
    ).not.toBeNull();
    expect(
      advanceWave,
      'measured pre-fix: advanceWave called once, on a run that had already ended',
    ).not.toHaveBeenCalled();
    expect(
      boardFingerprint(),
      'and no board was generated, compiled or swapped in behind the overlay',
    ).toBe(wave2);
    expect(
      hostProps.current?.waveBuildFailedWave,
      'the decided failure copy is not rewritten by a mirror that arrived after the run ended',
    ).toBe(3);
    // Secondary and deliberately non-discriminating: `runEndedRef` already blocked the
    // RECORD pre-fix — that is the half of the latch this branch always honoured. Kept
    // because the post-condition is the claim, not because it moves.
    expect(
      recordRunEnd,
      'and the finished run is still recorded exactly once',
    ).toHaveBeenCalledTimes(1);
    // 11-15 Task 2 — the CHROME half on the third ended-run state.
    expect(
      hostProps.current?.score,
      'measured pre-fix: 9999 painted over the run own 2400 while the overlay beside it still read the wave-3 failure copy',
    ).toBe(2400);
    expect(
      hostProps.current?.lives,
      'and the lives the run actually ended on — measured pre-fix, the straggler put them back to 3',
    ).toBe(2);
  });

  it('a Retry that cannot build wave 1 keeps the overlay up with Retry live, and a second press recovers (A-01, retry-in-place)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    expect(hostProps.current?.result, 'the Results overlay is up').toBe('lose');
    recordRunEnd.mockClear();

    // The next generated board — wave 1 of the new run — fails to compile.
    failCompileFrom = compileCalls + 1;
    await press('Retry');

    expect(
      hostProps.current?.result,
      'retry-in-place: the overlay STAYS — the alternative is a blank screen with no way back',
    ).toBe('lose');
    expect(
      screen.getByRole('button', { name: 'Retry' }),
      'and Retry stays LIVE — the E2 loading contract, and the whole reason option C (silent no-op) was rejected',
    ).toBeTruthy();
    expect(
      hostProps.current?.levelError,
      'still not a catalog error — LevelErrorOverlay would replace the live Retry with a dead modal',
    ).toBeNull();
    expect(
      recordRunEnd,
      'nothing to record: the run had already ended at zero lives, so the funnel no-ops',
    ).not.toHaveBeenCalled();

    // A second press re-mints the seed. That is what makes the live button a real
    // remedy rather than a nicer-looking dead end — the claim option A rests on.
    failCompileFrom = 0;
    await press('Retry');

    expect(
      hostProps.current?.result,
      'the second press starts the run, which clears the overlay',
    ).toBeNull();
    expect(screen.getByText('W1'), 'a new run at wave 1').toBeTruthy();
    expect(hostProps.current?.lives).toBe(3);
    expect(hostProps.current?.score).toBe(0);
  });
});

/**
 * 11-15 Task 2 — the OTHER producers and the OTHER side of the same condition.
 *
 * WHY THIS BLOCK EXISTS, stated plainly because the omission it repairs is the
 * pattern this whole round is written against. The five chrome writes at the top of
 * `applyChrome` are SHARED PREAMBLE: they run before the endless WON branch, before
 * the mid-run wave-build failure, and before the campaign WON and campaign LOST
 * branches alike. An endless-only proof of the hoisted latch would therefore leave
 * the CAMPAIGN panel resting on an inference from shared source — and "verified at
 * one producer, left open at its neighbour" is exactly what round 2 and round 3 each
 * shipped. The campaign half is DRIVEN here instead.
 *
 * The campaign exposure is also strictly WORSE than the endless one, which is the
 * second reason it cannot be inferred: `setResult(...)` and `setActive(false)` sit
 * OUTSIDE each campaign branch's own `if (!runEndedRef.current)` gate, so pre-fix a
 * straggler `WON` after a campaign `LOST` called `setResult('win')` on an already
 * lost run. The panel flipped its KIND as well as its score — a win heading over a
 * run the player lost.
 *
 * Entry is `mountOnly()` throughout: it stops at the dev row with `mode` still
 * `'campaign'` and no endless run started, which `mountAndStartEndless` cannot do.
 */
describe('PlayingHost — the ended-run chrome latch covers CAMPAIGN too (11-15, gap 1)', () => {
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
    injectCertWorstCase.mockClear();
    recordRunEnd.mockClear();
  });

  it('a CAMPAIGN run that LOST keeps its kind and its numbers — a straggler WON flips neither (gap 1)', async () => {
    await mountOnly();

    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });

    expect(
      hostProps.current?.result,
      'the campaign LOST branch is the run boundary',
    ).toBe('lose');
    expect(
      recordRunEnd,
      'recorded once, through the campaign arm',
    ).toHaveBeenCalledTimes(1);
    expect(hostProps.current?.score, 'the boundary mirror wrote the run final score').toBe(2400);

    // ONE straggler WON, distinguishable from the boundary mirror.
    await deliverPhase(SIM.WON, { lives: 3, score: 9999 });

    expect(
      hostProps.current?.result,
      'measured pre-fix: the kind flipped from lose to WIN — setResult sits outside the campaign branch own latch gate, so the panel showed a win heading over a run that was lost',
    ).toBe('lose');
    expect(
      hostProps.current?.score,
      'measured pre-fix: 9999 — the same five shared writes that repainted the endless panel repaint the campaign one',
    ).toBe(2400);
    expect(
      hostProps.current?.lives,
      'measured pre-fix: lives back at 3 on a run that ended at zero',
    ).toBe(0);
    expect(
      recordRunEnd,
      'and the straggler still reaches no telemetry — handleRunEnded stays behind its own gate',
    ).toHaveBeenCalledTimes(1);
  });

  it('a LIVE campaign run still takes every mirror chrome (gap 1, the side the latch must not touch)', async () => {
    await mountOnly();

    expect(
      hostProps.current?.result,
      'no boundary has fired — this run is live',
    ).toBeNull();

    await deliverPhase(SIM.PLAYING, { lives: 2, score: 777 });

    // What this case FORBIDS, deliberately: a guard written as an unconditional early
    // return — or one hoisted without the `runEndedRef` test — makes this RED. That is
    // the T-11-32 row, "a hoisted guard that locks a NEW run out of its own chrome",
    // and it is why the fix is a latch rather than a freeze.
    expect(
      hostProps.current?.score,
      'a run that has NOT ended takes score from every mirror, in campaign exactly as in endless',
    ).toBe(777);
    expect(
      hostProps.current?.lives,
      'and lives too — a blanket freeze would strand a live campaign run on its mount defaults',
    ).toBe(2);
  });

  it('a FAILED START stays ended — the one ended state that writes no chrome of its own (gap 1)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await mountOnly();

    // The mechanism the sibling A-01 / failed-START cases already use: the very first
    // `compileGeneratedLevel` call fails, so `startEndlessRun` cannot build wave 1 and
    // routes into `failEndlessStart`.
    failCompileFrom = compileCalls + 1;
    await press('Start an endless run');

    expect(
      hostProps.current?.result,
      'a start that never began still ENDS — the overlay is up with the tap-Retry copy',
    ).toBe('lose');
    expect(
      hostProps.current?.waveBuildFailedWave,
      'wave 1 is the Retry-time classification ResultOverlay keys the decided copy off',
    ).toBe(1);
    const openedScore = hostProps.current?.score;
    const openedLives = hostProps.current?.lives;

    // `failEndlessStart` latches `runEndedRef` and writes NO chrome, which makes this
    // the ended state with the least protection of its own: without the hoisted guard
    // there is nothing else between a straggler and the panel. The straggler carries
    // `lives: 1` rather than the plan's 3 for the reason the prohibition names — the
    // host opens this state at the mount default of 3, so a straggler at 3 would make
    // the frozen-lives assertion one that already held before the action it follows.
    await deliverPhase(SIM.WON, { lives: 1, score: 9999 });

    expect(
      hostProps.current?.score,
      'measured pre-fix: 9999 — a run that never started displaying a four-digit score',
    ).toBe(openedScore);
    expect(
      hostProps.current?.lives,
      'measured pre-fix: 1 — chrome from a run that does not exist',
    ).toBe(openedLives);
    expect(
      hostProps.current?.result,
      'and the kind is unchanged: SC-1 forbids an endless WON from ending a run, straggler or not',
    ).toBe('lose');
    expect(
      hostProps.current?.waveBuildFailedWave,
      '11-13 decided tap-Retry copy must not be rewritten by a mirror that arrived after the run ended',
    ).toBe(1);
  });
});

/**
 * 11-10 Task 2 — `Lv` is an explicit EXIT from endless (A-02, owner 2026-09-26).
 *
 * `toggleDevLevel` was the third un-mode-aware copy of the run-boundary reset. The
 * verifier measured, against this same host: pressing `Lv` at wave 2 left
 * `mode = 'endless'` with the readout at `W2`, `recordRunEnd` called ZERO times, and
 * the NEXT loss recorded `{mode:'endless', wave:2}` for what is nominally a campaign
 * level — a campaign run filed through the endless arm.
 *
 * The owner rejected both alternatives: disabling the control while endless, and
 * deferring to Phase 14. Record first, then exit.
 */
describe('PlayingHost — Lv exits endless (A-02)', () => {
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
    injectCertWorstCase.mockClear();
    recordRunEnd.mockClear();
  });

  const LV = 'Switch level, current level-01';

  it('records the in-flight run before discarding it (measured pre-fix: 0 calls)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    expect(screen.getByText('W2'), 'the run is live at wave 2').toBeTruthy();

    await press(LV);

    expect(
      recordRunEnd,
      'a control that changes the level ends the endless run — it must not be silently dropped',
    ).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    expect(args.mode, 'the run that ended was an ENDLESS run').toBe('endless');
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.wave, 'at the wave it reached, recorded before any reset').toBe(2);
    expect(args.outcome).toBe('abandoned');
  });

  it('leaves the mode — no W{n} readout survives the press', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    expect(screen.getByText('W2')).toBeTruthy();

    await press(LV);

    // The readout is gated on `mode === 'endless'`, so its absence is the RENDERED
    // proof that the mode actually changed — not a prop read or a source shape.
    expect(
      screen.queryByText('W2'),
      'measured pre-fix: the readout stayed at W2 because nothing wrote modeRef back',
    ).toBeNull();
    expect(
      screen.queryByText(/^W\d+$/),
      'and no other wave readout takes its place — the run is over, not rewound',
    ).toBeNull();
    expect(screen.queryByLabelText(/^Wave \d+$/)).toBeNull();
  });

  it('hands the NEXT loss to the CAMPAIGN arm, not the endless one (T-11-08)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await press(LV);
    expect(recordRunEnd, 'the endless run recorded on the way out').toHaveBeenCalledTimes(1);

    await deliverPhase(SIM.LOST, { lives: 0, score: 500 });

    expect(
      recordRunEnd,
      'the campaign run that followed records on its own loss',
    ).toHaveBeenCalledTimes(2);
    const args = recordRunEnd.mock.calls[1]![0];
    // `RecordRunEndArgs` is a discriminated union whose endless arm has no `levelId`.
    // Narrowing by throwing makes a wrong-arm record fail LOUDLY rather than read as
    // undefined — and this is the assertion that actually discriminates the fix.
    // Test 2 above is weaker: a missing readout could be argued from `setMode` alone.
    if (args.mode !== 'campaign') {
      throw new Error(
        `expected the CAMPAIGN arm — measured pre-fix: {mode:'endless', wave:2} for a campaign level`,
      );
    }
    expect(args.levelId, 'the campaign arm carries the level it was played on').toBe(
      'level-04',
    );
    expect(
      args,
      'and it carries no wave — a campaign run has none, which is what the union enforces (D-11 / SC-3)',
    ).not.toHaveProperty('wave');
  });

  it('pressing Lv in CAMPAIGN mode records nothing — campaign behaviour is unchanged', async () => {
    await mountOnly();
    expect(
      screen.queryByText(/^W\d+$/),
      'no endless run was started, so there is no readout',
    ).toBeNull();

    await press(LV);

    expect(
      recordRunEnd,
      "the funnel's campaign no-op is intact — a campaign level switch is not a run boundary that records",
    ).toHaveBeenCalledTimes(0);
    expect(
      screen.queryByText(/^W\d+$/),
      'and the press does not enter endless either',
    ).toBeNull();
  });
});

/**
 * Plan 11-14 — `Cert WC` was the last `__DEV__` control with no mode term.
 *
 * `11-VERIFICATION.md` gap 1 `missing[]` bullet 5 and gap 2 `missing[]` bullet 4 both
 * land here. `runCertWorstCase` has two independent halves — a level half that forces
 * `level-03` and a tier half that forces Mid — and until this plan neither knew what
 * mode the player was in.
 *
 * The TIER half is a genuine, funnel-covered run boundary: `setTierOverride('mid')`
 * fires the `tierOverrideRef` effect, which calls `remountDevSession`, whose endless
 * branch routes to `startEndlessRun()` — recorded, then restarted at wave 1. The
 * verifier measured that (P3) and the first case below pins it so it cannot regress.
 *
 * The LEVEL half was not a boundary at all, it was a hole. Measured pre-fix with the
 * tier ALREADY Mid — so the tier half no-ops and the level half runs alone — the `Lv`
 * label moved to `level-03`, the compiled-push gate early-returned because
 * `modeRef.current === 'endless'`, and the bake effect's `setActiveRef.current(false)`
 * left a stopped frame loop behind a live HUD with nothing recorded. It was also the
 * only deterministic, race-free trigger for a campaign per-level best being published
 * into the endless `best` prop, which 11-12 guarded at the publication end.
 *
 * Owner decision 2026-09-26: gate the level half on the mode. "Document only" and
 * "disable `Cert WC` while endless" were both rejected — the latter is inconsistent
 * with how A-02 was just resolved next door via an explicit exit.
 */
describe('PlayingHost — Cert WC carries a mode term (gap 1 / gap 2)', () => {
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
    injectCertWorstCase.mockClear();
    recordRunEnd.mockClear();
  });

  const CERT = 'Cert worst-case: level-03 Mid multi-ball particles shake';
  const TIER_AUTO = 'Force quality tier, current Auto mid';
  const TIER_LOW = 'Force quality tier, current Low';
  const TIER_MID = 'Force quality tier, current Mid';
  const LV_01 = 'Switch level, current level-01';
  const LV_03 = 'Switch level, current level-03';

  it('with the tier UNSET, Cert WC still records the run at the wave it reached and restarts at wave 1 (P3)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    const wave2 = boardFingerprint();
    expect(screen.getByText('W2'), 'the run is live at wave 2').toBeTruthy();
    expect(
      screen.getByRole('button', { name: TIER_AUTO }),
      'the tier must be UNSET going in — this case is about the branch that DOES cross a boundary',
    ).toBeTruthy();

    setActive.mockClear();
    await press(CERT);

    expect(
      recordRunEnd,
      'the tier half fires remountDevSession -> startEndlessRun, which records before it resets',
    ).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    expect(args.mode).toBe('endless');
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.outcome).toBe('abandoned');
    expect(args.wave, 'at the wave reached BEFORE the reset').toBe(2);
    expect(screen.getByText('W1'), 'and then it is a new run at wave 1').toBeTruthy();
    expect(boardFingerprint(), 'on a freshly generated board').not.toBe(wave2);
    expect(hostProps.current?.result, 'a restart, not a Results overlay').toBeNull();
  });

  it('with the tier already Mid, Cert WC leaves the endless run live and the level unchanged', async () => {
    await mountOnly();
    // The tier must really be Mid BEFORE endless is entered, or this case would pass
    // against a run on some other tier and prove nothing about the level half alone.
    await press(TIER_AUTO); // null -> low
    await press(TIER_LOW); // low -> mid
    expect(
      screen.getByRole('button', { name: TIER_MID }),
      'the tier half of runCertWorstCase must be a no-op for this case to isolate the level half',
    ).toBeTruthy();

    await press('Start an endless run');
    await advanceToWaveTwo();
    expect(screen.getByText('W2'), 'the run is live at wave 2').toBeTruthy();
    expect(
      screen.getByRole('button', { name: LV_01 }),
      'and it is on a level that is NOT level-03, so the level half would have fired',
    ).toBeTruthy();
    const wave2 = boardFingerprint();

    recordRunEnd.mockClear();
    setActive.mockClear();
    await press(CERT);

    // The `Lv` label exposes the live `levelId`. This is the RENDERED proof that the
    // level half did not fire — measured pre-fix it read `level-03` after the press.
    expect(
      screen.queryByRole('button', { name: LV_03 }),
      'measured pre-fix: setLevelId(level-03) fired while endless and the label moved',
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: LV_01 }),
      'the run keeps the level it started on',
    ).toBeTruthy();
    expect(screen.getByText('W2'), 'and the run is still live at wave 2').toBeTruthy();
    expect(
      boardFingerprint(),
      'the generated board under measurement is untouched',
    ).toBe(wave2);
    expect(hostProps.current?.result, 'the run did not end').toBeNull();
    expect(
      recordRunEnd,
      'nothing was recorded, because nothing ended',
    ).toHaveBeenCalledTimes(0);
    expect(
      setActive.mock.calls.filter((c) => c[0] === false),
      'measured pre-fix: the level switch re-entered the bake cold path and stopped the loop behind a live HUD',
    ).toHaveLength(0);
    // 11-16 Task 2, case E3. BRANCH: endless with the tier ALREADY Mid — both halves
    // no-op, `defer` stays false and the injection happens DIRECTLY, with no deferral
    // to arm. It is the only branch of this control the ops document's injection
    // claim was ever true of, which is why § Limits item 2 now scopes that claim to
    // it. The mode term Task 1 added is on the deferral arm, so it cannot reach here —
    // and this assertion is what proves the endless fix did not silence the control.
    expect(
      injectCertWorstCase,
      'the worst-case load still lands on the live endless board — exactly once, undeferred',
    ).toHaveBeenCalledTimes(1);
  });

  /**
   * BRANCH: endless, level NOT already `level-03`, tier not already Mid — the branch
   * `11-VERIFICATION.md` round-3 gap 2 was reported on. 11-14 gated the LEVEL half on
   * the mode and left the deferral bookkeeping unconditional, so the press armed a
   * one-shot whose own discharge preconditions (`levelId === 'level-03'` AND
   * `tierOverride === 'mid'`) the same gate had just made unreachable from endless.
   *
   * Step-0 measurement, 11-16, against the UNCHANGED source:
   *   at the press  — injectCertWorstCase 0, recordRunEnd 1
   *                   {mode:'endless', wave:2, outcome:'abandoned'}, readout W1
   *   Lv walk       — level-04 inject=0, level-05 inject=0, level-06 inject=0,
   *                   level-03 inject=1
   * One injection landed on a CAMPAIGN `level-03` session that never pressed the
   * button. That is the hazard; this case is what keeps it closed.
   */
  it('while endless below level-03, Cert WC arms nothing — a later campaign walk to level-03 never injects (gap 2)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    const wave2 = boardFingerprint();
    expect(screen.getByText('W2'), 'the run is live at wave 2').toBeTruthy();
    expect(
      screen.getByRole('button', { name: TIER_AUTO }),
      'the tier must be UNSET going in — a Mid tier would no-op the half that arms the deferral',
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: LV_01 }),
      'and NOT already on level-03 — that is the other endless sub-branch, covered by the case below',
    ).toBeTruthy();

    recordRunEnd.mockClear();
    injectCertWorstCase.mockClear();
    await press(CERT);
    await settle();

    expect(
      injectCertWorstCase,
      'measured pre-fix: 0 at the press — the function returns at its defer branch before the injection',
    ).toHaveBeenCalledTimes(0);
    expect(
      recordRunEnd,
      'the tier half is still a real run boundary: remountDevSession -> startEndlessRun records before it resets',
    ).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    expect(args.mode).toBe('endless');
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.outcome, 'measured pre-fix: abandoned').toBe('abandoned');
    expect(args.wave, 'measured pre-fix: at the wave reached, 2').toBe(2);
    expect(
      screen.getByText('W1'),
      'measured pre-fix: the restart lands at wave 1 — the boundary half is unchanged by this plan',
    ).toBeTruthy();
    expect(
      boardFingerprint(),
      'measured pre-fix: a freshly generated board',
    ).not.toBe(wave2);

    // The walk the verifier ran by hand (P6/P7): level-01 -> 04 -> 05 -> 06 -> 03.
    // Timers run between presses so the deferred-cert effect and its 50 ms timeout
    // get their chance — pre-fix they take it, which is what makes this case sharp.
    const walk: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      await pressLevelSwitch();
      await settle();
      walk.push(
        `${levelSwitchLabel()} inject=${injectCertWorstCase.mock.calls.length}`,
      );
    }
    expect(
      levelSwitchLabel(),
      'four Lv presses reach level-03 — if the walk stops short the assertion below is vacuous',
    ).toBe(LV_03);
    expect(
      walk.join(' | '),
      'measured pre-fix: level-04 inject=0 | level-05 inject=0 | level-06 inject=0 | level-03 inject=1',
    ).toBe(
      'Switch level, current level-04 inject=0 | Switch level, current level-05 inject=0 | Switch level, current level-06 inject=0 | Switch level, current level-03 inject=0',
    );
    expect(
      injectCertWorstCase,
      'measured pre-fix: exactly ONE call, on walk step 4, on a campaign session that never pressed Cert WC',
    ).toHaveBeenCalledTimes(0);
  });

  /**
   * BRANCH: endless, level ALREADY `level-03`, tier not already Mid — the SECOND
   * endless sub-branch, which no prior round measured. `level-03` is the shipped
   * default `LevelId` (Phase 08 D-06), so this is the common case on a real device,
   * not an exotic one.
   *
   * Step-0 measurement, 11-16, against the UNCHANGED source:
   *   before the press — Lv `level-03`, tier `Auto mid`
   *   at the press     — injectCertWorstCase 1, recordRunEnd 1
   *                      {mode:'endless', wave:2, outcome:'abandoned'}, readout W1,
   *                      level still `level-03`
   * So here the deferral was NOT stranded: the tier half's remount restarts the
   * endless run and leaves both preconditions satisfiable, and the one-shot
   * discharged the pathological load onto the freshly restarted endless board. The
   * mode term suppresses that too — a deliberate behaviour change on a branch the
   * review's one-liner did not enumerate, recorded here rather than left silent.
   */
  it('while endless already on level-03, Cert WC injects nothing either — the deferral that WOULD have discharged is suppressed (gap 2)', async () => {
    await mountAndStartEndless('level-03' as LevelId);
    await advanceToWaveTwo();
    expect(screen.getByText('W2'), 'the run is live at wave 2').toBeTruthy();
    expect(
      levelSwitchLabel(),
      'the session must really START on level-03, or this case silently tests the OTHER sub-branch',
    ).toBe(LV_03);
    expect(
      screen.getByRole('button', { name: TIER_AUTO }),
      'and the tier UNSET, so the tier half fires and the press defers',
    ).toBeTruthy();

    recordRunEnd.mockClear();
    injectCertWorstCase.mockClear();
    await press(CERT);
    await settle();

    expect(
      injectCertWorstCase,
      'measured pre-fix: 1 — the deferral discharged into the freshly restarted endless run',
    ).toHaveBeenCalledTimes(0);
    expect(
      recordRunEnd,
      'measured pre-fix: 1 — the tier half is a real run boundary on this branch too',
    ).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    expect(args.mode).toBe('endless');
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.outcome, 'measured pre-fix: abandoned').toBe('abandoned');
    expect(args.wave, 'measured pre-fix: at the wave reached, 2').toBe(2);
    expect(
      screen.getByText('W1'),
      'measured pre-fix: still endless, restarted at wave 1 — the mode is not what changes here',
    ).toBeTruthy();
    expect(
      levelSwitchLabel(),
      'measured pre-fix: still level-03 — the level half no-ops because it is already there',
    ).toBe(LV_03);
  });

  /**
   * 11-16 Task 2, case C1. BRANCH: CAMPAIGN, below `level-03`, tier not Mid — both
   * halves fire, so the press defers, and this is the side of Task 1's new condition
   * that Task 1 does NOT change. Without it the endless fix could have closed the
   * hazard by breaking the cert harness outright — a deferral that never arms at all
   * would make every endless case above pass and the control useless (T-11-39).
   */
  it('a CAMPAIGN press below level-03 still arms the deferral and discharges it exactly once', async () => {
    await mountOnly();
    expect(
      screen.queryByText('W1'),
      'mountOnly leaves the host in CAMPAIGN mode — no endless run, no wave readout',
    ).toBeNull();
    expect(levelSwitchLabel(), 'and below level-03, so the level half fires').toBe(
      LV_01,
    );
    expect(
      screen.getByRole('button', { name: TIER_AUTO }),
      'and with the tier unset, so the tier half fires too — this press DEFERS',
    ).toBeTruthy();

    injectCertWorstCase.mockClear();
    await press(CERT);
    await settle();

    // The rendered proof the deferral's own preconditions actually settled: if the
    // level or the tier had not moved, the count below would be a vacuous zero.
    expect(
      levelSwitchLabel(),
      'the level half moved the session to where the consumer effect wants it',
    ).toBe(LV_03);
    expect(
      screen.getByRole('button', { name: TIER_MID }),
      'and the tier half moved the tier — both preconditions of the deferred inject',
    ).toBeTruthy();
    expect(
      injectCertWorstCase,
      'the campaign harness is untouched by the endless fix: the one-shot armed and discharged ONCE',
    ).toHaveBeenCalledTimes(1);
  });

  /**
   * 11-16 Task 2, case C2. BRANCH: CAMPAIGN, already at `level-03` with the tier
   * already Mid — both halves no-op, `defer` stays false and the injection is DIRECT,
   * never touching `certPendingRef` at all. Together with C1 this pins both campaign
   * routes through the control, so the count Task 1 changed can be attributed.
   *
   * What this case cannot see: it asserts the COUNT, not the route. `settle()` runs
   * the timers either way, so a direct call and a 50 ms deferred call are
   * indistinguishable from here — the route is a property of `runCertWorstCase`'s
   * `defer` flag and is pinned at source in `PlayingHost.endless-host.test.ts`.
   */
  it('a CAMPAIGN press already at level-03 with the tier Mid injects exactly once, with nothing deferred', async () => {
    await mountOnly();
    for (let i = 0; i < 4; i += 1) {
      await pressLevelSwitch();
      await settle();
    }
    expect(
      levelSwitchLabel(),
      'four Lv presses reach level-03 — the level half must have nothing left to do',
    ).toBe(LV_03);
    await press(TIER_AUTO); // null -> low
    await settle();
    await press(TIER_LOW); // low -> mid
    await settle();
    expect(
      screen.getByRole('button', { name: TIER_MID }),
      'and the tier is already Mid — the tier half must have nothing left to do either',
    ).toBeTruthy();
    expect(
      screen.queryByText('W1'),
      'still CAMPAIGN — no endless run was ever started',
    ).toBeNull();

    injectCertWorstCase.mockClear();
    await press(CERT);
    await settle();

    expect(
      injectCertWorstCase,
      'exactly one injection; this case asserts the COUNT, not that the call skipped the deferral',
    ).toHaveBeenCalledTimes(1);
  });
});
