/**
 * N-PROG-04 — ResultOverlay Next + stars (C2 Plan 02).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ResultOverlay } from '../../src/runtime/overlays/ResultOverlay';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

afterEach(cleanup);

const base = {
  score: 500,
  best: 500,
  isNewRecord: false,
  onRetry: () => {},
  onMenu: () => {},
};

describe('ResultOverlay Next + stars', () => {
  it('win + onNext shows Next button', () => {
    const onNext = vi.fn();
    render(
      createElement(ResultOverlay, {
        ...base,
        kind: 'win',
        onNext,
      }),
    );

    const next = screen.getByRole('button', { name: 'Play next level' });
    expect(next).toBeTruthy();
    fireEvent.click(next);
    expect(onNext).toHaveBeenCalledTimes(1);

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Retry level',
      'Play next level',
      'Return to title',
    ]);
  });

  it('win without onNext / level-06 omits Next', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        kind: 'win',
      }),
    );
    expect(
      screen.queryByRole('button', { name: 'Play next level' }),
    ).toBeNull();

    cleanup();
    render(
      createElement(ResultOverlay, {
        ...base,
        kind: 'win',
        onNext: null,
      }),
    );
    expect(
      screen.queryByRole('button', { name: 'Play next level' }),
    ).toBeNull();
  });

  it('lose does not show Next', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        kind: 'lose',
        onNext: () => {},
      }),
    );
    expect(
      screen.queryByRole('button', { name: 'Play next level' }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry level' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Return to title' }),
    ).toBeTruthy();
  });

  it('win shows ★/☆ when stars set', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        kind: 'win',
        stars: 2,
      }),
    );
    expect(screen.getByLabelText('2 of 3 stars')).toBeTruthy();
  });

  it('lose omits star row', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        kind: 'lose',
        stars: 2,
      }),
    );
    expect(screen.queryByLabelText('2 of 3 stars')).toBeNull();
    expect(screen.queryByText('★')).toBeNull();
  });
});
