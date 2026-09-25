/**
 * Plan 11-05 — an endless run driven through the real host.
 *
 * The source contracts in `PlayingHost.endless.test.ts` and
 * `PlayingHost.endless-host.test.ts` pin statement PLACEMENT. This file pins the
 * consequence: press the `__DEV__` entry, deliver WON mirrors, and watch board
 * after board arrive inside ONE run — SC-1's "the run ends only when lives reach
 * zero" as an observed behaviour rather than an absent grep.
 *
 * The harness is the host's own bridge, not a reimplementation of it: the
 * Reanimated mock captures every `useAnimatedReaction` pair, and firing them is
 * exactly what the UI runtime does when `chromeSeq` bumps. `generate`,
 * `compileGeneratedLevel` and the endless ramp are all REAL here — the boards
 * below are the boards a device would get.
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

/** Render the dev row so the `__DEV__` endless entry is pressable. */
vi.mock('../../src/runtime/GameScreen', () => ({
  GameScreen: (props: { devLevelSwitch?: unknown }) =>
    (props.devLevelSwitch ?? null) as never,
}));

const recordRunEnd = vi.fn((_args: RecordRunEndArgs) => ({
  bestByLevel: {},
  unlocked: [],
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
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: 'Start an endless run' }),
    );
    await Promise.resolve();
  });
}

describe('PlayingHost endless run (behaviour)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    seq = 0;
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

  it('the entry starts a run on a generated board and shows wave 1 (D-05 / D-13)', async () => {
    await mountAndStartEndless();
    expect(compiledBoard(), 'a generated board must be in compiledSv').not.toBeNull();
    expect(compiledBoard()!.brickCount).toBeGreaterThan(0);
    expect(retry, 'retry() is correct at run start and only there').toHaveBeenCalledTimes(1);
    expect(setActive).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('W1')).toBeTruthy();
  });

  it('clearing a board swaps in the next one instead of ending the run (SC-1 / N-END-01)', async () => {
    await mountAndStartEndless();
    const wave1 = boardFingerprint();

    await deliverPhase(SIM.WON, { score: 1200 });

    expect(
      recordRunEnd,
      'a WON in endless must not end the run — SC-1 says the run ends only at zero lives',
    ).not.toHaveBeenCalled();
    expect(advanceWave, 'the advance must be requested on the loop handle').toHaveBeenCalledTimes(1);
    expect(
      boardFingerprint(),
      'the next board must be in compiledSv BEFORE advanceWave lands (11-03 ordering)',
    ).not.toBe(wave1);
    expect(screen.getByText('W2')).toBeTruthy();
    expect(
      setActive,
      'a wave transition must cost no gate churn (SC-5)',
    ).not.toHaveBeenCalledWith(false);
    expect(retry, 'retry() at a wave boundary would destroy lives/score/combo').toHaveBeenCalledTimes(1);
  });

  it('a WON delivered twice before the advance lands advances exactly one wave (Pitfall 5)', async () => {
    await mountAndStartEndless();
    await deliverPhase(SIM.WON, { score: 1200 });
    const afterFirst = boardFingerprint();

    await deliverPhase(SIM.WON, { score: 1200 });

    expect(advanceWave, 'the in-flight guard must swallow the repeat').toHaveBeenCalledTimes(1);
    expect(boardFingerprint(), 'no second board may be generated').toBe(afterFirst);
    expect(screen.getByText('W2')).toBeTruthy();
  });

  it('the guard releases once the mirror reports a live phase, so wave 3 follows (Pitfall 5)', async () => {
    await mountAndStartEndless();
    await deliverPhase(SIM.WON, { score: 1200 });
    await deliverPhase(SIM.DOCKED);
    await deliverPhase(SIM.WON, { score: 2400 });

    expect(advanceWave).toHaveBeenCalledTimes(2);
    expect(screen.getByText('W3')).toBeTruthy();
  });

  it('zero lives records once through the endless arm with the wave reached (N-END-02 / SC-3)', async () => {
    await mountAndStartEndless();
    await deliverPhase(SIM.WON, { score: 1200 });
    await deliverPhase(SIM.DOCKED);

    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });

    expect(recordRunEnd, 'the run must record exactly once').toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    expect(args.mode).toBe('endless');
    // The narrowing below is the D-11 contract in miniature: `wave` is only
    // reachable once TypeScript knows the arm, and `levelId` never becomes
    // reachable at all.
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.wave, 'the wave reached rides the endless arm').toBe(2);
    expect(args.outcome).toBe('lose');
    expect(
      args,
      'the endless arm has NO levelId — that absence is what makes the campaign write unreachable (D-11 / SC-3)',
    ).not.toHaveProperty('levelId');

    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    expect(
      recordRunEnd,
      'runEndedRef is the single funnel — a repeat LOST records nothing extra',
    ).toHaveBeenCalledTimes(1);
  });

  it('two runs are not the same board sequence — the seed is minted per run (N-END-03)', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000_000);
    await mountAndStartEndless();
    const runA = boardFingerprint();
    cleanup();
    sharedValues.length = 0;
    reactions.length = 0;

    now.mockReturnValue(2_345_678);
    await mountAndStartEndless();
    const runB = boardFingerprint();
    now.mockRestore();

    expect(runA).not.toBe('none');
    expect(runB, 'a fixed seed would make every endless run identical').not.toBe(runA);
  });
});
