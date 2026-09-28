/**
 * F-43 / N-QA-03 — GameScreen mount-path contract (shell chrome only).
 * Not UI-thread / worklet proof — Skia + gesture-handler are stubbed.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import {
  GameScreen,
  type GameScreenProps,
} from '../../src/runtime/GameScreen';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

vi.mock('../../src/render/GameCanvas', () => ({
  GameCanvas: () => null,
}));

vi.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children?: ReactNode }) => children,
}));

afterEach(cleanup);

/** Minimal SharedValue stub — GameScreen only reads `.value` on these props. */
function stubSharedValue<TOut>(value: unknown): TOut {
  return {
    value,
    get: () => value,
    set: () => {},
    addListener: () => {},
    removeListener: () => {},
    modify: () => {},
  } as TOut;
}

function baseProps(
  overrides: Partial<GameScreenProps> = {},
): GameScreenProps {
  return {
    picture: stubSharedValue<GameScreenProps['picture']>(null),
    surfaceSize: stubSharedValue<GameScreenProps['surfaceSize']>(null),
    playfieldGesture: {} as GameScreenProps['playfieldGesture'],
    uiPhase: 'playing',
    result: null,
    lives: 3,
    score: 100,
    best: 200,
    mode: 'campaign',
    // 12-01 widened `GameScreenProps` with `dailyDateKey`, required for the same
    // reason `mode`/`wave`/`bestWave` are: a defaulted blank would render `Daily · `
    // on a real panel. Unused in campaign, which is the point — overridden per case.
    dailyDateKey: '',
    wave: 0,
    bestWave: 0,
    isNewRecord: false,
    combo: 1,
    stallTier: 0,
    countdownNumeral: null,
    onPause: () => {},
    onResume: () => {},
    onRetry: () => {},
    onMenu: () => {},
    ...overrides,
  };
}

describe('GameScreen', () => {
  it('playing + no result: shows Pause, Score, Lives', () => {
    render(createElement(GameScreen, baseProps()));

    expect(screen.getByRole('button', { name: 'Pause game' })).toBeTruthy();
    expect(screen.getByText('Score · 100')).toBeTruthy();
    expect(screen.getByText('Lives · 3')).toBeTruthy();
  });

  it('paused: shows Resume via PauseOverlay accessibility', () => {
    render(
      createElement(
        GameScreen,
        baseProps({ uiPhase: 'paused', result: null }),
      ),
    );

    expect(screen.getByRole('button', { name: 'Resume game' })).toBeTruthy();
    expect(screen.getByText('Paused')).toBeTruthy();
  });

  /**
   * The two negatives of the case above, and the reason they exist.
   *
   * The phase-11 round-5 verifier applied `&&` -> `||` to `showPauseOverlay`
   * (`src/runtime/GameScreen.tsx:110-111`), giving
   * `!hasLevelError && uiPhase === 'paused' || result == null`, and ran the
   * WHOLE of `tests/ui`: 16 files / 142 tests, ALL GREEN — this file's 6 cases
   * included. The pause overlay renders during normal play under that mutation
   * and nothing in the repository saw it.
   *
   * BOTH upstream explanations for why it would have been caught were measured
   * false. The planner's premise was that a sibling structural gate greps the
   * conjunction as one literal: ASSERTION 5 in
   * `tests/ui/PlayingHost.endless-host.test.ts` matches `result == null` and
   * `uiPhase === 'paused'` as two INDEPENDENT regexes, so both still match once
   * the connecting operator flips. 11-REVIEW WR-03's correction was that "the
   * kill comes from two pre-existing cases in tests/ui/GameScreen.test.tsx":
   * before this pair there was no such case — the file asserted only the
   * POSITIVE direction, and a positive case is green under `||` by definition.
   *
   * REJECTED ALTERNATIVE: extend the source gate to match the whole conjunction
   * as one literal. Rejected because a prettier re-wrap of that assignment would
   * red it with no behaviour changing, and because a source literal cannot
   * distinguish "the operator is `&&`" from "the operator is spelled `&&` on
   * this line" — a render case cannot be satisfied by formatting. ASSERTION 5
   * stays exactly as 11-17 left it: it asserts the two TERMS are present, these
   * cases assert the OPERATOR between them, and both are wanted.
   *
   * Case 2 carries a POSITIVE CONTROL (`Retry level`) on purpose. A case that
   * only checks a `queryBy...` is null also passes when the component rendered
   * nothing at all, which is how a blind harness produces a green that means
   * nothing — this phase has now paid for that twice.
   */
  it('playing + no result: no pause overlay — no Resume, no Paused', () => {
    render(createElement(GameScreen, baseProps()));

    expect(
      screen.queryByRole('button', { name: 'Resume game' }),
    ).toBeNull();
    expect(screen.queryByText('Paused')).toBeNull();
  });

  it('paused + a result: no pause overlay — the result overlay owns the screen', () => {
    render(
      createElement(
        GameScreen,
        baseProps({ uiPhase: 'paused', result: 'lose' }),
      ),
    );

    expect(
      screen.queryByRole('button', { name: 'Resume game' }),
    ).toBeNull();
    // Positive control: the result overlay DID render, so the absence above is
    // the pause gate refusing rather than the screen rendering nothing.
    expect(screen.getByRole('button', { name: 'Retry level' })).toBeTruthy();
  });

  it('result win: shows Win / Retry from ResultOverlay', () => {
    render(
      createElement(
        GameScreen,
        baseProps({
          uiPhase: 'playing',
          result: 'win',
          score: 500,
          best: 500,
          isNewRecord: true,
        }),
      ),
    );

    expect(screen.getByText('Win')).toBeTruthy();
    expect(screen.getByText('All clear')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry level' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Return to title' })).toBeTruthy();
  });

  it('result win + onNext: shows Next; without onNext omits it', () => {
    const onNext = () => {};
    render(
      createElement(
        GameScreen,
        baseProps({
          uiPhase: 'playing',
          result: 'win',
          stars: 2,
          onNext,
        }),
      ),
    );
    expect(screen.getByRole('button', { name: 'Play next level' })).toBeTruthy();
    expect(screen.getByLabelText('2 of 3 stars')).toBeTruthy();

    cleanup();
    render(
      createElement(
        GameScreen,
        baseProps({
          uiPhase: 'playing',
          result: 'win',
        }),
      ),
    );
    expect(
      screen.queryByRole('button', { name: 'Play next level' }),
    ).toBeNull();
  });

  it('result lose: Retry + Menu only, no Next', () => {
    render(
      createElement(
        GameScreen,
        baseProps({
          uiPhase: 'playing',
          result: 'lose',
          onNext: () => {},
          stars: 3,
        }),
      ),
    );
    expect(screen.getByText('Lose')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry level' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Return to title' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Play next level' }),
    ).toBeNull();
  });

  /**
   * 11-08 widened `GameScreenProps` with `mode`, `wave`, `bestWave` and
   * `waveBuildFailedWave`. GameScreen's only job with them is to FORWARD them —
   * the contract itself is proven in `ResultOverlay.test.tsx`. This case exists so
   * a dropped forward cannot pass unnoticed.
   */
  it('result lose in endless: forwards mode, wave, bestWave and the failure body', () => {
    render(
      createElement(
        GameScreen,
        baseProps({
          uiPhase: 'playing',
          result: 'lose',
          mode: 'endless',
          score: 2400,
          best: 5000,
          wave: 7,
          bestWave: 12,
          waveBuildFailedWave: 8,
          // Campaign chrome handed to an endless overlay must stay unreachable.
          stars: 3,
          onNext: () => {},
        }),
      ),
    );

    expect(screen.getByText('Wave · 7')).toBeTruthy();
    expect(screen.getByText('Best wave · 12')).toBeTruthy();
    expect(
      screen.getByText('Wave 8 could not be built — run saved'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Retry endless run from wave 1' }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('3 of 3 stars')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Play next level' }),
    ).toBeNull();
  });
});
