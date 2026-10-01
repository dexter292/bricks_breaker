/**
 * Plan 11-08 — the endless RECORD DISPLAY, driven through the real host and the
 * real `ResultOverlay`.
 *
 * `11-VERIFICATION.md` gap 2: the mode firewall stopped at the storage layer.
 * `RecordRunEndArgs` made the campaign WRITE structurally unreachable for an endless
 * run, but `handleRunEnded` still compared that run against `previousBestRef` — a
 * CAMPAIGN level best — and only branched on mode afterwards. So the endless Results
 * overlay showed a campaign PB as `Best`, fired `New Record` against an unrelated
 * campaign score, and wrote the endless score back into `previousBestRef`, which
 * `onRetry` and `remountDevSession` then re-published as the campaign best.
 *
 * Every assertion here is about WHAT THE PLAYER SEES, which is why the `GameScreen`
 * mock renders the real `ResultOverlay` rather than a stub. The harness is otherwise
 * the 11-07 one: a STABLE `useSharedValue` mock, a `useAnimatedReaction` capture
 * list, and `deliverPhase` as the `chromeSeq` bump.
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
  within,
} from '@testing-library/react';
import type { LevelId } from '../../src/core';
import type { RecordRunEndArgs } from '../../src/services/storage';

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
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

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
 * The forced wave-build failure, same shape as the 11-07 harness. `loadLevelById`
 * stays REAL: a generated board failing to compile is not a catalog error and must
 * never reach `LevelErrorOverlay`. Only `compileGeneratedLevel` is wrapped, and only
 * from the call index a test opts into.
 */
let compileCalls = 0;
let failCompileFrom = 0;
/**
 * The READINESS lever (11-10) — deliberately independent of `failCompileFrom` above.
 *
 * `fxReady` is `loadResult.ok && bakedKey === loadKey`, and `setBakedKey` runs
 * SYNCHRONOUSLY inside the bake effect's async body before its first `await`, so
 * there is no mid-bake window a test can stand in. A not-ok `loadResult` is the only
 * lever that holds all three readiness terms false — `levelReady` false, `levelError`
 * non-null, `fxReady` false — and it is reachable only by changing `levelId`. Naming
 * one catalog id whose `loadLevelById` call is rejected is therefore the only way to
 * drive the closed-gate endless Retry that 11-10's hoist exists to change.
 *
 * It must stay independent of `compileGeneratedLevel`: a GENERATED board that fails
 * to compile is not a catalog error, and collapsing the two would make a case unable
 * to say which failure it is measuring.
 */
let rejectLevelId: LevelId | null = null;
vi.mock('../../src/runtime/loadLevel', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/runtime/loadLevel')>();
  return {
    ...actual,
    loadLevelById: (id: LevelId) => {
      if (rejectLevelId !== null && id === rejectLevelId) {
        return {
          ok: false as const,
          issues: [{ path: 'forced', message: 'forced catalog rejection' }],
        };
      }
      return actual.loadLevelById(id);
    },
    compileGeneratedLevel: (
      raw: Parameters<typeof actual.compileGeneratedLevel>[0],
    ) => {
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

/** The host props this file reads back, plus the three 11-08 added. */
type HostProps = {
  devLevelSwitch?: unknown;
  result?: null | 'win' | 'lose';
  mode?: 'campaign' | 'endless';
  uiPhase?: string;
  lives?: number;
  score?: number;
  best?: number;
  wave?: number;
  bestWave?: number;
  isNewRecord?: boolean;
  waveBuildFailedWave?: number | null;
  // 11-10: the readiness gate's own term, read back so a case can PROVE the gate is
  // genuinely closed rather than assume its lever worked.
  levelError?: unknown;
  stars?: 1 | 2 | 3 | null;
  onPause?: () => void;
  onRetry?: () => void;
  onMenu?: () => void;
  onNext?: (() => void) | null;
};
const hostProps: { current: HostProps | null } = { current: null };

/**
 * `GameScreen` is mocked; `ResultOverlay` is NOT. Every record assertion below is
 * therefore about rendered player-facing text, not about a prop value.
 *
 * Two structural obligations this mock carries:
 *  - `result-slot` wraps ONLY the overlay, so "the campaign best appears nowhere in
 *    the overlay" can be asserted against the overlay's own subtree rather than the
 *    document (which also holds the probe below, by design).
 *  - `host-best` renders `props.best` on EVERY render, overlay or not. That is the
 *    campaign-poisoning probe: `startEndlessRun` republishes `previousBestRef.current`
 *    through `setResultBest(...)` at every run start, so this node is how a write-back
 *    to the campaign ref becomes observable. It has to be OUTSIDE `result-slot`.
 */
vi.mock('../../src/runtime/GameScreen', async () => {
  const react = await import('react');
  const { Pressable, Text, View } = await import('react-native');
  const { ResultOverlay } = await import(
    '../../src/runtime/overlays/ResultOverlay'
  );
  return {
    GameScreen: (props: HostProps) => {
      hostProps.current = props;
      const children: ReturnType<typeof react.createElement>[] = [
        react.createElement(
          react.Fragment,
          { key: 'dev' },
          (props.devLevelSwitch ?? null) as never,
        ),
        react.createElement(
          Text,
          { key: 'best-probe', testID: 'host-best' },
          `host-best=${String(props.best)}`,
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
      // The pause panel, mirroring the sibling `PlayingHost.endless-retry.test.tsx`
      // harness. `onRetry` is passed ONCE by the host and serves both panels, so the
      // labels say which panel was pressed even though the handler is the same
      // function. Added by 11-09 Task 1 so Task 2 can drive Pause → Retry with the
      // REAL overlay mounted, changing only test bodies.
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
            View,
            { key: 'result-slot', testID: 'result-slot' },
            react.createElement(ResultOverlay, {
              kind: props.result,
              mode: props.mode ?? 'campaign',
              score: props.score ?? 0,
              best: props.best ?? 0,
              wave: props.wave ?? 0,
              bestWave: props.bestWave ?? 0,
              isNewRecord: props.isNewRecord ?? false,
              waveBuildFailedWave: props.waveBuildFailedWave ?? null,
              stars: props.stars ?? null,
              onRetry: props.onRetry ?? (() => {}),
              onMenu: props.onMenu ?? (() => {}),
              onNext: props.onNext ?? null,
            }),
          ),
        );
      }
      return react.createElement(react.Fragment, null, ...children) as never;
    },
  };
});

/**
 * The campaign level best. Deliberately a DISTINCT, larger value than every endless
 * number in the default fixture, so a leak onto the endless overlay is unmistakable
 * rather than a coincidence of equal integers. Two cases override it — see each.
 */
const CAMPAIGN_BEST_DEFAULT = 7777;
let campaignBest = CAMPAIGN_BEST_DEFAULT;

/** `telemetry.endless` as it stands BEFORE this run — the mount-time seed. */
let seededRecord = { bestScore: 900, bestWave: 1 };
/** `telemetry.endless` as `recordRunEnd` returns it — the POST-MERGE record. */
let postMergeRecord = { bestScore: 2400, bestWave: 2 };

/**
 * The campaign per-level read, indirected behind a mutable implementation (11-12).
 *
 * `11-VERIFICATION.md` gap 1 is a RACE: the mount-time `getBestForLevel` preload
 * published its campaign result into `resultBest` with no mode term, so a read that
 * landed while the endless Results overlay was mounted repainted the player's
 * endless `Best ·` with a campaign number. Reproducing it needs the read to be
 * HELD, which the previous inline `() => Promise.resolve(campaignBest)` could never
 * do.
 *
 * The DEFAULT is byte-for-byte the old behaviour — an immediate resolve reading
 * `campaignBest` at call time, so the two cases that override that fixture still
 * work. This matters more than it looks: both mount helpers below wait on
 * `host-best=${campaignBest}`, so a deferral that were on by default would hang
 * every pre-existing case in this file.
 */
const immediateCampaignRead = (): Promise<number> =>
  Promise.resolve(campaignBest);
let getBestForLevelImpl: (id: LevelId) => Promise<number> =
  immediateCampaignRead;

/**
 * Arm the deferral: the NEXT `getBestForLevel` call (and every one after it) returns
 * a promise that never settles until the returned resolver is called. Returns that
 * resolver so a case can land the campaign read at an exact, chosen moment.
 */
function deferCampaignRead(): (value: number) => void {
  let settle!: (value: number) => void;
  const pending = new Promise<number>((resolve) => {
    settle = resolve;
  });
  getBestForLevelImpl = () => pending;
  return settle;
}

const recordRunEnd = vi.fn((_args: RecordRunEndArgs) => ({
  bestByLevel: {},
  unlocked: [],
  telemetry: { endless: { ...postMergeRecord } },
}));
const getSnapshot = vi.fn(() =>
  Promise.resolve({
    bestByLevel: {},
    unlocked: [],
    telemetry: { endless: { ...seededRecord } },
  }),
);
vi.mock('../../src/services/storage', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/services/storage')>();
  return {
    ...actual,
    createDefaultProgressStore: () => ({
      getBestForLevel: (id: LevelId) => getBestForLevelImpl(id),
      getSnapshot,
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

async function press(name: string | RegExp): Promise<void> {
  const el = screen.getByRole('button', { name });
  await act(async () => {
    fireEvent.click(el);
    await Promise.resolve();
  });
}

/**
 * `Retry` by PREFIX, not exact label. The endless accessibility label is
 * `Retry endless run from wave 1` (11-UI-SPEC § Accessibility labels) and the
 * campaign one is `Retry level`; this file is about the record block, not the label,
 * so it must not break when the label case lands.
 */
const RETRY = /^Retry/;

/**
 * The settle-and-press sequence shared by the uncontrolled and controlled mounts
 * (11-10). Extracted rather than duplicated so the two helpers cannot drift: the same
 * wait on the entry button, the same wait on `host-best`, the same mock clears, the
 * same `Start an endless run` press.
 */
async function settleAndStartEndless(): Promise<void> {
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
  // The watermark seed must LAND before the run ends, or every strictness assertion
  // below silently compares against 0. The campaign preload is observable (it lands
  // in `best`), so waiting on that also proves the sibling snapshot chain flushed.
  await waitFor(() => {
    expect(screen.getByTestId('host-best').textContent).toBe(
      `host-best=${campaignBest}`,
    );
  });
  expect(getSnapshot).toHaveBeenCalled();
  setActive.mockClear();
  retry.mockClear();
  advanceWave.mockClear();
  recordRunEnd.mockClear();
  await press('Start an endless run');
}

async function mountAndStartEndless(): Promise<void> {
  const { PlayingHost } = await import('../../app/_components/PlayingHost');
  // UNCONTROLLED on purpose, and it must stay that way: every pre-11-10 case in this
  // file mounts through here, and supplying `onLevelIdChange` would silently change
  // what `toggleDevLevel` does to them.
  render(
    createElement(PlayingHost, {
      levelId: 'level-01' as LevelId,
      onMenu: () => {},
      entryMode: 'campaign',
    }),
  );
  await settleAndStartEndless();
}

/**
 * CONTROLLED `levelId` mount (11-10) — the only lever a test has to change `levelId`
 * without pressing `Lv`. Returns the render result so a case can re-render with a
 * different id and hold the readiness gate closed underneath a live endless run.
 *
 * `Lv` is deliberately NOT usable here: 11-10 Task 2 makes `toggleDevLevel` an
 * explicit EXIT from endless, so pressing it would leave the mode and measure a
 * different path entirely.
 */
async function mountControlledAndStartEndless(
  levelId: LevelId = 'level-01' as LevelId,
): Promise<{
  rerenderWithLevel: (next: LevelId) => Promise<void>;
}> {
  const { PlayingHost } = await import('../../app/_components/PlayingHost');
  const view = render(
    createElement(PlayingHost, {
      levelId,
      onLevelIdChange: () => {},
      onMenu: () => {},
      entryMode: 'campaign',
    }),
  );
  await settleAndStartEndless();
  return {
    rerenderWithLevel: async (next: LevelId) => {
      await act(async () => {
        view.rerender(
          createElement(PlayingHost, {
            levelId: next,
            onLevelIdChange: () => {},
            onMenu: () => {},
            entryMode: 'campaign',
          }),
        );
        await Promise.resolve();
      });
    },
  };
}

/**
 * Mount the host and stop — mode is still `'campaign'` and no endless run has been
 * started (11-09 Task 1). This is the FRESH-MOUNT entry path the verifier measured as
 * `silent-noop`: pressing `Start an endless run` from here left `result = null`,
 * `mode = 'campaign'` and nothing on screen.
 *
 * The same two waits as `mountAndStartEndless`: the campaign preload is observable
 * (it lands in `best`), so waiting on it also proves the sibling `getSnapshot` chain
 * flushed and the endless watermark refs are seeded rather than merely defaulted.
 */
async function mountOnly(): Promise<void> {
  const { PlayingHost } = await import('../../app/_components/PlayingHost');
  render(
    createElement(PlayingHost, {
      levelId: 'level-01' as LevelId,
      onMenu: () => {},
      entryMode: 'campaign',
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
  await waitFor(() => {
    expect(screen.getByTestId('host-best').textContent).toBe(
      `host-best=${campaignBest}`,
    );
  });
  expect(getSnapshot).toHaveBeenCalled();
  setActive.mockClear();
  retry.mockClear();
  advanceWave.mockClear();
  recordRunEnd.mockClear();
}

/** Run to wave 2 and stop there, leaving the guard released and the run live. */
async function advanceToWaveTwo(): Promise<void> {
  await deliverPhase(SIM.WON, { score: 1200 });
  await deliverPhase(SIM.DOCKED, { score: 1200 });
}

function overlayText(): string {
  return screen.getByTestId('result-slot').textContent ?? '';
}

/**
 * FILE-level reset, deliberately outside every `describe`. Vitest runs a top-level
 * `beforeEach` ahead of the suite-scoped ones, so this restores the campaign read to
 * its immediate-resolve default for all four blocks from one place — a per-describe
 * copy would be four places for one invariant and the fifth block added later would
 * silently inherit a deferral armed by the previous case.
 */
beforeEach(() => {
  getBestForLevelImpl = immediateCampaignRead;
});

describe('PlayingHost endless record display (gap 2)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    seq = 0;
    compileCalls = 0;
    failCompileFrom = 0;
    rejectLevelId = null;
    campaignBest = CAMPAIGN_BEST_DEFAULT;
    seededRecord = { bestScore: 900, bestWave: 1 };
    postMergeRecord = { bestScore: 2400, bestWave: 2 };
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
    getSnapshot.mockClear();
  });

  it('an endless loss renders the four endless metric lines in contract order (11-UI-SPEC § Endless copy)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });

    const slot = within(screen.getByTestId('result-slot'));
    expect(slot.getByText('Wave · 2')).toBeTruthy();
    expect(slot.getByText('Score · 2400')).toBeTruthy();
    expect(slot.getByText('Best · 2400')).toBeTruthy();
    expect(slot.getByText('Best wave · 2')).toBeTruthy();

    // SC-1: an endless run never ends on a cleared board, so the heading is Lose.
    expect(slot.getByText('Lose')).toBeTruthy();

    // Line order is contract: heading → body → Wave → Score → Best → Best wave.
    const text = overlayText();
    const order = ['Lose', 'Out of lives', 'Wave · 2', 'Score · 2400', 'Best · 2400', 'Best wave · 2'];
    let cursor = -1;
    for (const line of order) {
      const at = text.indexOf(line, cursor + 1);
      expect(at, `"${line}" must appear after the line before it`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  /**
   * 11-15 Task 1 — `11-VERIFICATION.md` round-3 gap 1. THE case, and it is a RENDER.
   *
   * 11-13 closed the WAVE half of "an ended run stays ended" with a latch inside the
   * endless WON branch. The five chrome writes that OPEN `applyChrome` — sim phase,
   * lives, score, combo, stall tier, all taken from the mirror — sit ABOVE that latch
   * and above every mode test, so a straggler mirror that arrives after the boundary
   * still repaints the run's own numbers into the Results panel the player is reading.
   *
   * Measured pre-fix on this harness, with the REAL `ResultOverlay` mounted inside
   * `result-slot`: a run banked `{mode:'endless', wave:2, score:2400, outcome:'lose'}`
   * opens at `Score · 2400 / Best · 2400 / New Record`, and ONE straggler `WON` mirror
   * at `{lives:3, score:9999}` repaints the slot to `Score · 9999` above the SAME
   * `Best · 2400` and the SAME `New Record`, under an `Out of lives` heading, with
   * host props back at `{score: 9999, lives: 3}`. The record was always right; the
   * run's own score above it was not.
   *
   * The straggler's payload is DELIBERATELY distinguishable from the boundary
   * mirror's. The three gap-3 drives in `PlayingHost.endless-retry.test.tsx` re-sent
   * the boundary's own `score: 2400`, which is exactly why they proved the wave half
   * and were structurally blind to this one — the same shape as round 2's
   * `previousBestRef` blind spot, an instrument pointed one symbol away from the
   * defect.
   *
   * BOTH channels are wanted, for the reason 11-12's own contract gives: the
   * `hostProps` prop channel proves the WRITE, the `result-slot` query proves the
   * RENDER. A source contract proves neither, which is why
   * `tests/ui/PlayingHost.endless-host.test.ts` names this case rather than standing
   * in for it.
   */
  it('an ENDED endless run keeps its own numbers on the mounted overlay — one straggler WON at 9999 repaints nothing (gap 1)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });

    // The boundary mirror ITSELF must be allowed through — this opening state is the
    // third proof that the fix is a latch and not a blanket freeze.
    const opened = within(screen.getByTestId('result-slot'));
    expect(
      opened.getByText('Wave · 2'),
      'the boundary mirror wrote the run final state before the latch closed',
    ).toBeTruthy();
    expect(
      opened.getByText('Score · 2400'),
      'the panel opens at the run own final score, written BY the LOST mirror',
    ).toBeTruthy();
    expect(opened.getByText('Best · 2400')).toBeTruthy();
    expect(opened.getByText('Best wave · 2')).toBeTruthy();
    expect(
      opened.getByText('New Record'),
      'the record block is correct before the straggler and must stay correct after it',
    ).toBeTruthy();
    expect(
      recordRunEnd,
      'the loss is the run boundary — it records exactly once',
    ).toHaveBeenCalledTimes(1);

    // ONE straggler WON, carrying a payload the boundary mirror never had.
    await deliverPhase(SIM.WON, { lives: 3, score: 9999 });

    const after = within(screen.getByTestId('result-slot'));
    expect(
      after.getByText('Score · 2400'),
      'measured pre-fix: the mounted slot repainted to `Score · 9999` on a run banked at 2400',
    ).toBeTruthy();
    expect(
      after.queryByText('Score · 9999'),
      'measured pre-fix: `Score · 9999` was rendered inside result-slot, above the run own `Best · 2400`',
    ).toBeNull();
    expect(
      after.getByText('Best · 2400'),
      'the record beside it is untouched — `best` is written at handleRunEnded, never by applyChrome',
    ).toBeTruthy();
    expect(
      after.getByText('New Record'),
      'and the badge is unchanged: measured pre-fix it sat above a score that was not the recorded one',
    ).toBeTruthy();
    expect(
      after.getByText('Lose'),
      'SC-1: an endless run never ends on a cleared board — a straggler WON cannot flip the heading',
    ).toBeTruthy();
    expect(
      after.getByText('Out of lives'),
      'and the body stays the zero-lives copy the run actually ended on',
    ).toBeTruthy();
    expect(
      hostProps.current?.score,
      'measured pre-fix: host score became 9999 — the WRITE half of the same defect',
    ).toBe(2400);
    expect(
      hostProps.current?.lives,
      'measured pre-fix: host lives went back to 3 on a run that ended at zero (D-04: never a refill)',
    ).toBe(0);
    expect(
      recordRunEnd,
      'nothing false reaches telemetry across the straggler — still exactly one record',
    ).toHaveBeenCalledTimes(1);
  });

  /**
   * 11-15 Task 1 — the OTHER side of the same condition, so the fix cannot be a
   * blanket freeze.
   *
   * A guard written as an unconditional early return, or one hoisted without the
   * `runEndedRef` test, would make this case RED. That is deliberate: the plan's own
   * T-11-32 row is "a hoisted guard that locks a NEW run out of its own chrome".
   */
  it('a LIVE endless run still takes every mirror chrome — the latch freezes only an ENDED run (gap 1)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();

    expect(
      hostProps.current?.result,
      'no boundary has fired — this run is live',
    ).toBeNull();

    await deliverPhase(SIM.PLAYING, { lives: 2, score: 1234 });

    expect(
      hostProps.current?.score,
      'a run that has NOT ended takes score from every mirror — a blanket freeze would strand it at 1200',
    ).toBe(1234);
    expect(
      hostProps.current?.lives,
      'and lives too — this is the side of the condition the hoist must not touch',
    ).toBe(2);
  });

  /**
   * 11-12 gap 1 — THE case. A BEHAVIOUR test, not a source contract, because a source
   * contract is what let this through twice.
   *
   * `resultBest` had a SECOND writer: the mount-time `getBestForLevel` preload effect,
   * which published its campaign result unconditionally with `[store, levelId]` deps
   * and no mode term. The verifier measured the consequence on a MOUNTED endless
   * Results overlay — `Best ·` flipped from the endless watermark to a campaign level
   * best (spot-checks P8/P9/P10, `4200` -> `7777`). A player cannot chase a number
   * that is not theirs.
   *
   * It survived the WR-04 contract because that contract counts `previousBestRef`
   * ASSIGNMENTS and explicitly whitelists this very effect as campaign-only, so it is
   * structurally blind to a campaign value being PUBLISHED out of the region into the
   * prop the endless overlay reads.
   *
   * THE OTHER HALF, observed elsewhere on purpose: the fix guards only the
   * PUBLICATION. `previousBestRef.current = b` stays unconditional, so the campaign PB
   * cache still warms while endless is live — the guard is not a dropped write. That
   * half is observed in the sibling case `'leaving endless through Lv republishes the
   * campaign best synchronously'` below, which presses `Lv` with the next read still
   * pending and reads `7777` straight back out of the cache. Do not read the guard
   * here as the campaign best being lost.
   */
  it('a campaign per-level best that resolves LATE never reaches the rendered endless `Best ·` (11-12 gap 1)', async () => {
    // Armed BEFORE the mount, so the preload effect's own promise is the held one.
    const landCampaignRead = deferCampaignRead();
    const { PlayingHost } = await import('../../app/_components/PlayingHost');
    render(
      createElement(PlayingHost, {
        levelId: 'level-01' as LevelId,
        onMenu: () => {},
        entryMode: 'campaign',
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
    // NOT the `host-best` wait the shared helpers use: `best` cannot land while the
    // campaign read is held, so waiting on it would hang. `getSnapshot` is the sibling
    // chain and IS observable, which is what proves the endless watermarks are seeded
    // rather than merely defaulted.
    await waitFor(() => {
      expect(getSnapshot).toHaveBeenCalled();
    });
    setActive.mockClear();
    retry.mockClear();
    advanceWave.mockClear();
    recordRunEnd.mockClear();
    await press('Start an endless run');

    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });

    // The overlay is MOUNTED and reading the post-merge endless watermark. This is the
    // state the verifier was in when the campaign read landed on top of it.
    expect(
      within(screen.getByTestId('result-slot')).getByText('Best · 2400'),
      'the endless overlay must open on the post-merge endless watermark',
    ).toBeTruthy();

    // Land the campaign read WITH THE OVERLAY ON SCREEN.
    await act(async () => {
      landCampaignRead(CAMPAIGN_BEST_DEFAULT);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      overlayText(),
      `measured pre-fix the slot goes Best · 2400 -> Best · ${CAMPAIGN_BEST_DEFAULT}: a campaign per-level best must never be presented as an endless record, at ANY moment of the run's lifetime`,
    ).not.toContain(String(CAMPAIGN_BEST_DEFAULT));
    expect(
      within(screen.getByTestId('result-slot')).getByText('Best · 2400'),
      'and the endless watermark must still be the line the player reads',
    ).toBeTruthy();
    // The prop tier as well as the render: the truth says "at any moment", and
    // `host-best` sits OUTSIDE `result-slot` precisely so the channel can be asserted
    // independently of what the overlay happens to render.
    expect(
      screen.getByTestId('host-best').textContent,
      `measured pre-fix: host-best=${CAMPAIGN_BEST_DEFAULT} — the campaign value reached the prop, not merely the pixels`,
    ).toBe('host-best=2400');
  });

  /**
   * 11-12, the OTHER half of the gap-1 fix (`11-REVIEW.md` IN-03).
   *
   * Task 1's guard stops the preload effect publishing while endless is live. That
   * alone would leave a stale ENDLESS watermark standing as the campaign `Best` from
   * the moment the player exits until the next storage read lands — the preload
   * effect re-runs on the `levelId` change `toggleDevLevel` triggers, but that re-run
   * is ASYNCHRONOUS. `toggleDevLevel` therefore republishes the cached campaign value
   * synchronously, and this case holds the storage read PENDING for the whole press so
   * the assertion can only be satisfied by the synchronous path.
   *
   * It is also what proves the guard is not a dropped write: `previousBestRef.current`
   * stayed unconditional through the endless run, so the number read back here is the
   * campaign best the cache kept warm.
   */
  it('leaving endless through `Lv` republishes the campaign best synchronously, with the storage read still pending (11-12 / IN-03)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();

    // Mid-run the prop carries the ENDLESS watermark that `startEndlessRun` published.
    expect(
      screen.getByTestId('host-best').textContent,
      'an endless run publishes the endless watermark, never the campaign best (WR-04)',
    ).toBe(`host-best=${seededRecord.bestScore}`);

    // Hold the NEXT campaign read — the one the levelId change is about to trigger —
    // so nothing but the synchronous republication can satisfy the assertion below.
    deferCampaignRead();
    const labelBefore = screen
      .getByRole('button', { name: /^Switch level/ })
      .getAttribute('aria-label');
    await press(/^Switch level/);

    expect(
      screen.getByTestId('host-best').textContent,
      `measured pre-fix: host-best=${postMergeRecord.bestScore} — the funnel records the in-flight run first, so the POST-MERGE endless watermark is what stands as the campaign best for the whole gap between the exit and the next storage read; with that read held, the gap never ended`,
    ).toBe(`host-best=${CAMPAIGN_BEST_DEFAULT}`);

    // And the press did something: a case that passes against a dead `Lv` control
    // would be measuring the mount, not the exit.
    expect(
      screen
        .getByRole('button', { name: /^Switch level/ })
        .getAttribute('aria-label'),
      'the Lv control must actually have switched the level',
    ).not.toBe(labelBefore);
    expect(
      hostProps.current?.mode,
      'and the exit must have left endless (A-02)',
    ).toBe('campaign');
  });

  it('the campaign level best appears NOWHERE on the endless overlay (gap 2 / T-11-08-01)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });

    // The probe OUTSIDE the overlay still holds a campaign number at mount time, so
    // this has to be scoped to the overlay subtree to mean anything.
    expect(
      overlayText(),
      'a campaign per-level best must never be presented as an endless record',
    ).not.toContain(String(CAMPAIGN_BEST_DEFAULT));
    expect(screen.queryByText(`Best · ${CAMPAIGN_BEST_DEFAULT}`)).toBeNull();

    // And the run was recorded through the endless arm, with no levelId in sight.
    const args = recordRunEnd.mock.calls.at(-1)?.[0];
    expect(args?.mode).toBe('endless');
    expect(args && 'levelId' in args).toBe(false);
  });

  it('the displayed record is the POST-MERGE value from recordRunEnd, not the pre-run watermark and not the run', async () => {
    // Deliberately unrelated to both the seed and this run's own numbers, so the only
    // way the overlay can show them is by reading the blob the merge just returned.
    postMergeRecord = { bestScore: 9001, bestWave: 42 };
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });

    const slot = within(screen.getByTestId('result-slot'));
    expect(slot.getByText('Best · 9001')).toBeTruthy();
    expect(slot.getByText('Best wave · 42')).toBeTruthy();
    // The run's own lines are unaffected — the merge feeds the BEST pair only.
    expect(slot.getByText('Score · 2400')).toBeTruthy();
    expect(slot.getByText('Wave · 2')).toBeTruthy();
    // Exact text-node match, not `toContain`: `Best · 9001` has `Best · 900` as a
    // prefix, so a substring check here would be green for the wrong reason.
    expect(screen.queryByText('Best · 900')).toBeNull();
    expect(screen.queryByText('Best wave · 1')).toBeNull();
  });

  it('New Record is strict in BOTH watermarks — equality keeps the previous record (D-11 / N-END-02)', async () => {
    // Equal on score AND equal on wave → no badge.
    //
    // `campaignBest = 0` is load-bearing, not tidiness. Falsified against the pre-fix
    // host, this case was the ONE that stayed green: with the default campaign best of
    // 7777, `evaluatePersonalBest(2400, 7777)` reports no record either, so the
    // assertion passed for entirely the wrong reason. At 0 the defective host WOULD
    // fire the badge (2400 > 0) while the fixed one must not (2400 is not > 2400).
    campaignBest = 0;
    seededRecord = { bestScore: 2400, bestWave: 2 };
    postMergeRecord = { bestScore: 2400, bestWave: 2 };
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    expect(
      overlayText(),
      'a run that only MATCHES both watermarks is not a new record',
    ).not.toContain('New Record');
  });

  it('New Record fires on score alone, one point above the watermark', async () => {
    seededRecord = { bestScore: 2400, bestWave: 5 };
    postMergeRecord = { bestScore: 2401, bestWave: 5 };
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2401 });
    expect(screen.getAllByText('New Record')).toHaveLength(1);
  });

  it('New Record fires on wave alone, with the score exactly at the watermark', async () => {
    // wave 2 > bestWave 1, score exactly equal — a deeper run at no extra score is
    // unambiguously a record, and firing on score alone would elect a primary record.
    seededRecord = { bestScore: 2400, bestWave: 1 };
    postMergeRecord = { bestScore: 2400, bestWave: 2 };
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    expect(screen.getAllByText('New Record')).toHaveLength(1);
  });

  /**
   * WR-04 (11-11) — the host's `best` prop belongs to the mode the player is in at
   * EVERY moment of an endless run, not only at the moments the overlay happens to be
   * mounted.
   *
   * THE TIER CHANGE, stated plainly because the old shape of this case is exactly the
   * kind of thing that looks like coverage and is not.
   *
   * This case was `an endless run does not write the campaign personal best
   * (T-11-08-02 / WR-02)`. Its intent was sound — prove an endless run did not poison
   * `previousBestRef` — but the only probe available for it was a read-back through
   * `host-best`, and that read-back worked ONLY because `startEndlessRun` republished
   * `previousBestRef.current` into `best` at every run start. That republication is
   * WR-04: a campaign per-level best published as the endless `best` prop for the
   * whole lifetime of a run. The probe therefore depended on the defect, and asserting
   * `host-best=100` after a Retry PINNED the defect as expected behaviour.
   *
   * With the defect removed, the campaign-ref claim moves to the SOURCE-CONTRACT tier
   * (`tests/ui/PlayingHost.endless-host.test.ts`, `previousBestRef is assigned in
   * exactly two places…`), and the render claim asserted here gets strictly STRONGER:
   * `best` is the endless watermark while the overlay is up, still the endless
   * watermark after a Retry re-starts the run, and still the endless watermark on the
   * NEXT run's overlay. Pre-fix the post-Retry value measured `host-best=100`, so the
   * middle assertion discriminates the fix rather than restating the first one.
   *
   * `campaignBest = 100` is load-bearing: it must differ from every endless number in
   * this case so a leak is unmistakable rather than a coincidence of equal integers.
   */
  it('a new endless run publishes the ENDLESS watermark as `best`, never the campaign level best (T-11-08-02 / WR-02 / WR-04)', async () => {
    campaignBest = 100;
    seededRecord = { bestScore: 0, bestWave: 0 };
    postMergeRecord = { bestScore: 2400, bestWave: 2 };
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });

    // Test 1 — while the overlay is up, `best` is the ENDLESS record.
    expect(screen.getByTestId('host-best').textContent).toBe('host-best=2400');

    // Test 2 — and it STAYS the endless record across the run restart. `modeRef`
    // latches to endless for the life of the mount (WR-02), so this Retry routes
    // through `startEndlessRun`, which is where WR-04 lived.
    await press(RETRY);
    expect(
      screen.getByTestId('host-best').textContent,
      'startEndlessRun must publish the ENDLESS watermark (WR-04) — measured pre-fix: host-best=100, a campaign per-level best carried as the endless `best` for the life of the run',
    ).toBe('host-best=2400');
    expect(
      screen.getByTestId('host-best').textContent,
      'WR-04: a campaign number must never reach the host `best` prop during an endless run',
    ).not.toBe('host-best=100');

    // Test 3 — and the NEXT run's Results overlay renders it. The write is not the
    // point; the render is. Proving the write and never the render is how the
    // previous round's gap 3 shipped green.
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    const slot = within(screen.getByTestId('result-slot'));
    expect(slot.getByText('Best · 2400')).toBeTruthy();
    expect(
      overlayText(),
      'the campaign level best must appear nowhere on the endless overlay of the run that FOLLOWS a retry',
    ).not.toContain('Best · 100');
  });

  /**
   * 11-07 shipped `waveBuildFailedWave` as a WRITE-ONLY value: the run-ending branch
   * produced it and nothing rendered from it, so its coverage entry (D8) was recorded
   * `human_judgment: true` with the note "11-08 owes the rendering test". These two
   * cases are that debt, paid through the real host and the real overlay — the string
   * the owner decided is asserted where a player would read it.
   */
  it('a mid-run wave-build failure renders the run-saved body on the real overlay', async () => {
    await mountAndStartEndless();
    // Every generated board from the next one on fails to compile.
    failCompileFrom = compileCalls + 1;
    await deliverPhase(SIM.WON, { score: 1200 });

    const slot = within(screen.getByTestId('result-slot'));
    expect(slot.getByText('Wave 2 could not be built — run saved')).toBeTruthy();
    expect(screen.queryByText('Out of lives')).toBeNull();
    // The four metric lines still render — the failure replaces the BODY only.
    expect(slot.getByText('Wave · 1')).toBeTruthy();
    expect(slot.getByText('Score · 1200')).toBeTruthy();
    expect(slot.getByText('Best · 2400')).toBeTruthy();
    expect(slot.getByText('Best wave · 2')).toBeTruthy();
  });

  it('a Retry that cannot build wave 1 renders the decided tap-Retry body (A-01, D8)', async () => {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
    expect(screen.getByText('Out of lives')).toBeTruthy();

    failCompileFrom = compileCalls + 1;
    await press(RETRY);

    const slot = within(screen.getByTestId('result-slot'));
    expect(
      slot.getByText('Wave 1 could not be built — tap Retry'),
      'the Retry-time body is the owner-decided literal, never the mid-run run-saved copy',
    ).toBeTruthy();
    expect(screen.queryByText(/run saved/)).toBeNull();
    expect(screen.queryByText('Out of lives')).toBeNull();
    // retry-in-place: the overlay stays and Retry stays live, so a second press can
    // re-mint a seed and recover.
    expect(
      screen.getByRole('button', { name: RETRY }),
    ).toBeTruthy();
  });
});

/**
 * 11-09 Task 1 — `11-VERIFICATION.md` gap 3, the FRESH-MOUNT entry path.
 *
 * The A-01 copy shipped in 11-07/11-08 and was unit-tested, yet it was unreachable
 * from two of the three `startEndlessRun` call sites: the failure returns set it while
 * `modeRef`/`mode` were still `'campaign'` and `result` was still `null`, so
 * `ResultOverlay` nulled the prop and `GameScreen` never mounted the overlay. The
 * shipped first-entry behaviour WAS the `silent-noop` the owner explicitly rejected.
 *
 * What makes these cases different from the source contract in
 * `PlayingHost.endless-host.test.ts` is the thing that let gap 3 ship: those prove a
 * value was WRITTEN, these prove a player can SEE it. Every assertion below is scoped
 * to the `result-slot` subtree — the real `ResultOverlay`, mounted by the real
 * `GameScreen` prop contract, from a mount whose mode is still campaign.
 */
describe('PlayingHost endless — a failed start from a fresh mount (gap 3)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    seq = 0;
    compileCalls = 0;
    failCompileFrom = 0;
    rejectLevelId = null;
    campaignBest = CAMPAIGN_BEST_DEFAULT;
    seededRecord = { bestScore: 0, bestWave: 0 };
    postMergeRecord = { bestScore: 2400, bestWave: 2 };
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
    getSnapshot.mockClear();
  });

  /** Fresh mount, first generated board forced to fail, press the only endless entry. */
  async function failFirstStart(): Promise<void> {
    await mountOnly();
    // The very FIRST `compileGeneratedLevel` call fails. `compileCalls` is 0 here —
    // the campaign catalog load goes through the real `loadLevelById`, never this
    // wrapper — so this targets `advanceToWave(1)` and nothing else.
    failCompileFrom = compileCalls + 1;
    await press('Start an endless run');
  }

  it('renders the owner-decided tap-Retry copy on the REAL overlay (A-01, gap 3)', async () => {
    await failFirstStart();
    const slot = within(screen.getByTestId('result-slot'));
    expect(
      slot.getByText('Wave 1 could not be built — tap Retry'),
      'the only control that enters endless must never be met with nothing — this is the path the owner rejected as silent-noop',
    ).toBeTruthy();
  });

  it('leaves a LIVE Retry control on screen, not a decorative one (A-01 retry-in-place)', async () => {
    await failFirstStart();
    const retryButton = within(screen.getByTestId('result-slot')).getByRole(
      'button',
      { name: 'Retry endless run from wave 1' },
    );
    expect(
      retryButton,
      'retry-in-place: the remedy the copy points at must be present and pressable',
    ).toBeTruthy();

    // 11-12, repairing an assertion that could not fail. The old form pressed Retry
    // and then asserted the tap-Retry body was on screen — but that body was ALREADY
    // on screen before the press (`failFirstStart` is what puts it there), so
    // asserting its presence afterwards distinguishes nothing. `11-VERIFICATION.md`
    // advisory finding 1 confirmed it by mutation: with the overlay Retry's
    // `onPress` set to `undefined` the case stayed GREEN.
    //
    // The repair asserts something the PRESS CAUSES. `compileGeneratedLevel` is
    // wrapped by this file's harness and `compileCalls` increments on EVERY call
    // including a forced failure, so a live Retry routing through
    // `startEndlessRun` -> `advanceToWave(1)` strictly increases it and a dead
    // handler cannot.
    //
    // This is a repair of ONE assertion, NOT a rebuild of liveness coverage. The
    // verifier measured that two sibling cases in this file already kill the
    // dead-handler mutant — 'a Retry that cannot build wave 1 renders the decided
    // tap-Retry body (A-01, D8)' and 'the run that FOLLOWS a failed start is a real,
    // recordable run' — which is why `11-REVIEW.md` WR-02's "coverage hole" reading
    // is not the one acted on here.
    const compilesBefore = compileCalls;
    await act(async () => {
      fireEvent.click(retryButton);
      await Promise.resolve();
    });
    expect(
      compileCalls,
      'the press must CAUSE a further wave-1 build attempt — measured against the mutant `onPress={undefined}`, the previous copy-presence assertion stayed green',
    ).toBeGreaterThan(compilesBefore);

    // Secondary, kept: compilation is still forced to fail, so the live Retry
    // re-attempts and reports the same failure rather than a different screen.
    expect(
      within(screen.getByTestId('result-slot')).getByText(
        'Wave 1 could not be built — tap Retry',
      ),
      'and the failure it hits must still be reported where the player reads it',
    ).toBeTruthy();
  });

  it('satisfies BOTH overlay gates — mode is endless and result is lose (the two the verifier measured unsatisfied)', async () => {
    await failFirstStart();
    expect(
      hostProps.current?.mode,
      'ResultOverlay nulls waveBuildFailedWave outside endless — measured pre-fix: campaign',
    ).toBe('endless');
    expect(
      hostProps.current?.result,
      'GameScreen mounts the Results overlay only when result != null — measured pre-fix: null',
    ).toBe('lose');
  });

  it('shows the ENDLESS watermarks, never the campaign level best the mount effect loaded', async () => {
    await failFirstStart();
    const slot = within(screen.getByTestId('result-slot'));
    expect(
      slot.getByText('Best · 0'),
      'the endless overlay reads telemetry.endless.bestScore, seeded at 0 for a first run',
    ).toBeTruthy();
    expect(
      slot.getByText('Best wave · 0'),
      'the endless overlay reads telemetry.endless.bestWave, seeded at 0 for a first run',
    ).toBeTruthy();
    // On a fresh mount `resultBest` still holds the campaign level best written by the
    // getBestForLevel effect. Without the republish in failEndlessStart, THIS overlay
    // would render 7777 as the endless `Best` — the exact prohibition 11-08 declared.
    expect(
      screen.getByTestId('result-slot').textContent ?? '',
      'a campaign per-level best must never be presented as an endless record',
    ).not.toContain(String(CAMPAIGN_BEST_DEFAULT));
  });

  it('writes NO run — a start that never began must not reach telemetry (T-11-02)', async () => {
    await failFirstStart();
    expect(
      recordRunEnd,
      'an abandoned record at wave 1 with score 0 is a fabricated run in the data Phase 13 achievements read',
    ).toHaveBeenCalledTimes(0);
  });

  /**
   * 11-13 Task 2, case (c) from `11-VERIFICATION.md` gap 3 `missing[]` — the worst
   * face of the walking wave, and the reason it is a COPY defect and not only an
   * incoherent counter.
   *
   * A failed START is an ENDED run: `failEndlessStart` sets `waveBuildFailedWave` to
   * 1, which `waveBuildFailureKind` classifies as Retry-time — body
   * `Wave 1 could not be built — tap Retry`, run-scoped lines SUPPRESSED because
   * there is no run to describe. Pre-fix, one straggler WON re-entered the endless
   * branch, attempted `advanceToWave(2)`, failed again and REWROTE the value to 2.
   * `waveBuildFailureKind` then reads mid-run and BOTH consumers flip at once: the
   * body becomes `Wave 2 could not be built — run saved` (a run was saved — there was
   * no run) and `showRunLines` un-suppresses, rendering `Wave · 0` for a run that
   * never began. That is exactly the class 11-09's IN-05 suppression exists to
   * prevent, and the owner decided this copy on 2026-09-26.
   *
   * Asserted on the RENDERED `result-slot` subtree, not on the prop alone, because a
   * source contract that proved the WRITE and never the RENDER is the mechanism that
   * let the original gap 3 ship green. The `Wave · 0` absence is checked against the
   * SLOT's text, never a document-wide query: the `host-best` probe and the dev row
   * live outside the slot by design.
   */
  it('a failed START stays ended — one WON mirror cannot rewrite the decided tap-Retry copy (gap 3, case c)', async () => {
    await failFirstStart();
    expect(
      hostProps.current?.waveBuildFailedWave,
      'the failed start decided wave 1 — Retry-time, no run to describe',
    ).toBe(1);

    await deliverPhase(SIM.WON, { score: 0 });

    expect(
      hostProps.current?.waveBuildFailedWave,
      'measured pre-fix: rewritten to 2, which flips waveBuildFailureKind from start to mid',
    ).toBe(1);
    const slot = within(screen.getByTestId('result-slot'));
    expect(
      slot.getByText('Wave 1 could not be built — tap Retry'),
      'measured pre-fix: the body read `Wave 2 could not be built — run saved` — a run saved where no run began',
    ).toBeTruthy();
    expect(
      overlayText(),
      'measured pre-fix: `Wave · 0` rendered, because the rewritten value un-suppressed the run-scoped lines (11-09 IN-05)',
    ).not.toContain('Wave · 0');
    // Secondary and deliberately non-discriminating: `runEndedRef` already blocked the
    // RECORD pre-fix. The defect was never a fabricated run here — it was the copy.
    expect(
      recordRunEnd,
      'and a start that never began still reaches no telemetry',
    ).not.toHaveBeenCalled();
  });
});

/**
 * 11-09 Task 2 — `11-VERIFICATION.md` gap 2: a failed start is ATOMIC.
 *
 * The verifier's measured pre-fix post-condition for Pause → Retry at wave 2 with a
 * forced compile failure: `result = null`, `uiPhase = 'paused'`, the wave-N board
 * still in play, `runEndedRef` latched, `waveRef` silently 1, and `recordRunEnd`
 * called ZERO times — the deep run the record exists to capture, silently discarded,
 * and the run that followed unrecordable. All three cases below drive the real host
 * and the real overlay, because the post-condition is what a player is left looking
 * at, not a value.
 */
describe('PlayingHost endless — Pause → Retry with a failing build (gap 2)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    seq = 0;
    compileCalls = 0;
    failCompileFrom = 0;
    rejectLevelId = null;
    campaignBest = CAMPAIGN_BEST_DEFAULT;
    seededRecord = { bestScore: 900, bestWave: 1 };
    postMergeRecord = { bestScore: 2400, bestWave: 2 };
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
    getSnapshot.mockClear();
  });

  /** Live run at wave 2, paused, with the NEXT generated board forced to fail. */
  async function pauseThenFailingRetry(): Promise<void> {
    await mountAndStartEndless();
    await advanceToWaveTwo();
    await press('Pause game');
    failCompileFrom = compileCalls + 1;
    await press('Pause panel Retry');
  }

  it('records the in-flight run at the wave it REACHED, exactly once (measured pre-fix: 0 calls)', async () => {
    await pauseThenFailingRetry();
    expect(
      recordRunEnd,
      'a run that cannot restart is a run that ENDED — it must be recorded, not silently dropped',
    ).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls.at(-1)?.[0];
    expect(args?.mode).toBe('endless');
    expect(
      args?.mode === 'endless' ? args.wave : null,
      'the wave the run reached, not the wave the failed restart attempted — a run at wave 30 must not become a run at wave 2',
    ).toBe(2);
    expect(args?.outcome, 'the player did not lose it').toBe('abandoned');
  });

  it('leaves ONE coherent state: the run is over, the overlay is up, Retry is the only live control', async () => {
    await pauseThenFailingRetry();
    expect(
      hostProps.current?.result,
      'measured pre-fix: null — no overlay, nothing on screen',
    ).toBe('lose');
    expect(
      hostProps.current?.uiPhase,
      'measured pre-fix: paused — the half-applied state, still on the wave-N board',
    ).not.toBe('paused');
    expect(
      screen.queryByRole('button', { name: 'Pause panel Retry' }),
      'the pause panel must be gone — two live panels is not one coherent state',
    ).toBeNull();
    expect(
      within(screen.getByTestId('result-slot')).getByText(
        'Wave 1 could not be built — tap Retry',
      ),
      'and the failure must say so where the player reads it',
    ).toBeTruthy();
  });

  it('the run that FOLLOWS a failed start is a real, recordable run (pre-fix: runEndedRef latched with no way to clear it)', async () => {
    await pauseThenFailingRetry();
    // Compilation is allowed to succeed again — this Retry starts a genuine run.
    failCompileFrom = 0;
    await press(RETRY);

    expect(
      screen.getByText('W1'),
      'a new endless run starts at wave 1, with the ref and the HUD in step',
    ).toBeTruthy();
    expect(hostProps.current?.result, 'the overlay is cleared for the new run').toBeNull();

    await deliverPhase(SIM.LOST, { lives: 0, score: 300 });
    expect(
      recordRunEnd,
      'the abandoned run at wave 2, then this one — the run after a failed start is NOT lost',
    ).toHaveBeenCalledTimes(2);
    const args = recordRunEnd.mock.calls.at(-1)?.[0];
    expect(args?.mode).toBe('endless');
    expect(args?.mode === 'endless' ? args.wave : null).toBe(1);
  });
});

/**
 * 11-10 — the case that exercises the HOIST itself.
 *
 * Moving `if (modeRef.current === 'endless') { startEndlessRun(); return; }` above
 * `onRetry`'s `!levelReady || levelError != null || !fxReady` gate deliberately
 * changes one behaviour: an endless Retry pressed while readiness is CLOSED used to
 * return silently and leave the run resumable; it now records the in-flight run
 * `abandoned` at the wave it reached and puts the decided A-01 copy on the real
 * overlay. That trade is the `silent-noop` the owner rejected on 2026-09-26, closed
 * on a third path.
 *
 * It is driven here, in the file whose `GameScreen` mock renders the REAL
 * `ResultOverlay` inside `result-slot`, and not in the sibling retry file whose mock
 * renders a bare labelled button. The rendered copy is the whole point: the previous
 * round's gap 3 escaped precisely because a source-contract test proved the WRITE and
 * never the RENDER, and reasoning that a hoist is correct is exactly what shipped it.
 *
 * Nothing else in the suite reaches this path. Re-instating the pre-hoist order turns
 * THIS block red while the sibling gap-1 cases stay green — which is what makes it
 * evidence about the reorder rather than about the outcome.
 */
describe('PlayingHost endless — Retry with the readiness gate CLOSED (11-10, the hoist)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    seq = 0;
    compileCalls = 0;
    failCompileFrom = 0;
    rejectLevelId = null;
    campaignBest = CAMPAIGN_BEST_DEFAULT;
    seededRecord = { bestScore: 900, bestWave: 1 };
    postMergeRecord = { bestScore: 2400, bestWave: 2 };
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
    getSnapshot.mockClear();
  });

  /**
   * A live endless run at wave 2, with all three readiness terms genuinely false.
   *
   * The lever is a re-render with a `levelId` the harness rejects — `loadResult.ok`
   * false makes `levelReady` false, `levelError` non-null and `fxReady` false at
   * once, and it is the ONLY lever: `setBakedKey` runs synchronously before the bake
   * effect's first `await`, so no mid-bake window exists to occupy.
   *
   * The endless run survives the rejection because an endless run's boards are
   * written into `compiledSv` by `advanceToWave`, never by `loadResult`, and the
   * compiled-push gate effect early-returns while `modeRef.current` is endless.
   *
   * The `levelId` change ALSO re-runs the `getBestForLevel` effect, which pushes the
   * CAMPAIGN level best into `resultBest`. That is left in place on purpose: it is
   * what makes `failEndlessStart`'s watermark republish observable, and the case
   * asserts the campaign digits never reach `result-slot`.
   */
  async function liveRunThenCloseTheGate(): Promise<void> {
    const { rerenderWithLevel } = await mountControlledAndStartEndless();
    await advanceToWaveTwo();
    // The dev-row readout, not `props.wave` — that prop is `resultWave`, which is
    // written only at run END, so it reads 0 while a run is live.
    expect(screen.getByText('W2'), 'the run is live at wave 2').toBeTruthy();
    rejectLevelId = 'level-04' as LevelId;
    await rerenderWithLevel('level-04' as LevelId);
    expect(
      hostProps.current?.levelError,
      'the readiness gate is genuinely CLOSED — levelError is what onRetry used to return on',
    ).not.toBeNull();
  }

  it('records the in-flight run exactly once, at the wave it REACHED (measured pre-hoist: 0 calls)', async () => {
    await liveRunThenCloseTheGate();

    await press('Pause game');
    await press('Pause panel Retry');

    expect(
      recordRunEnd,
      'pre-hoist onRetry returned at the readiness gate and the run stayed silently resumable — measured 0 calls',
    ).toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls.at(-1)?.[0];
    expect(args?.mode, 'filed under the endless arm').toBe('endless');
    expect(
      args?.mode === 'endless' ? args.wave : null,
      'the wave the run reached, not the wave the failed restart attempted',
    ).toBe(2);
    expect(args?.outcome, 'the player did not lose it').toBe('abandoned');
  });

  it('puts the decided copy on the REAL overlay, not nothing at all (A-01, gap 3 on a third path)', async () => {
    await liveRunThenCloseTheGate();

    await press('Pause game');
    await press('Pause panel Retry');

    expect(
      within(screen.getByTestId('result-slot')).getByText(
        'Wave 1 could not be built — tap Retry',
      ),
      'measured pre-hoist: nothing in result-slot at all, because the overlay never mounted',
    ).toBeTruthy();
    expect(
      hostProps.current?.result,
      'GameScreen mounts the Results overlay only when result != null — measured pre-hoist: null',
    ).toBe('lose');
  });

  it('shows the ENDLESS watermarks even though the level switch reloaded the campaign best', async () => {
    await liveRunThenCloseTheGate();

    await press('Pause game');
    await press('Pause panel Retry');

    // `failEndlessStart` republishes `endlessBestScoreRef` / `endlessBestWaveRef`
    // over whatever `getBestForLevel` last wrote. Without that republish THIS overlay
    // would render 7777 as the endless `Best` — the prohibition 11-08 shipped.
    expect(
      screen.getByTestId('result-slot').textContent ?? '',
      'a campaign per-level best must never be presented as an endless record',
    ).not.toContain(String(CAMPAIGN_BEST_DEFAULT));
    const slot = within(screen.getByTestId('result-slot'));
    expect(
      slot.getByText('Best · 2400'),
      'the post-merge endless watermark returned by recordRunEnd',
    ).toBeTruthy();
    expect(slot.getByText('Best wave · 2')).toBeTruthy();
  });
});
