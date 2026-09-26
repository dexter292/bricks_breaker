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
