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
  // 11-08 widened the props: `mode` selects the record domain, `wave`/`bestWave`
  // are the two endless-only metric lines. Campaign renders neither.
  mode: 'campaign' as const,
  score: 500,
  best: 500,
  wave: 0,
  bestWave: 0,
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

/**
 * 11-08 — the endless variant of the same component.
 *
 * One overlay serves both modes, and everything mode specific is a prop the host
 * selects, so neither mode can read the other's numbers. What is asserted here is
 * the COPY and INTERACTION contract (11-UI-SPEC § Endless copy, § Accessibility
 * labels). The strictness of the `New Record` rule is host logic — it is proven in
 * `tests/ui/PlayingHost.endless-record.test.tsx`, against real watermarks — so the
 * badge cases below assert only what this component decides: that there is exactly
 * ONE badge, in one style, for either kind of record.
 */
const endlessBase = {
  ...base,
  mode: 'endless' as const,
  kind: 'lose' as const,
  score: 2400,
  best: 5000,
  wave: 7,
  bestWave: 12,
};

/**
 * Position of each line in the rendered text — -1 when absent.
 *
 * Each `indexOf` starts from 0, INDEPENDENTLY. An earlier draft advanced a cursor
 * past the previous match, which made the returned array monotonic by construction
 * and the ordering assertion below green no matter what order the component
 * rendered. Searching independently is what makes it a real ordering check.
 */
function lineOrder(lines: string[]): number[] {
  const text = document.body.textContent ?? '';
  return lines.map((line) => text.indexOf(line));
}

describe('ResultOverlay endless (11-08)', () => {
  it('renders the four metric lines in contract order: wave, score, best, best wave', () => {
    render(createElement(ResultOverlay, endlessBase));

    expect(screen.getByText('Wave · 7')).toBeTruthy();
    expect(screen.getByText('Score · 2400')).toBeTruthy();
    expect(screen.getByText('Best · 5000')).toBeTruthy();
    expect(screen.getByText('Best wave · 12')).toBeTruthy();

    const order = lineOrder([
      'Lose',
      'Out of lives',
      'Wave · 7',
      'Score · 2400',
      'Best · 5000',
      'Best wave · 12',
    ]);
    expect(
      order.every((at) => at >= 0),
      'every contract line must render',
    ).toBe(true);
    for (let i = 1; i < order.length; i += 1) {
      expect(
        order[i],
        `line order is contract: "${['Lose','Out of lives','Wave · 7','Score · 2400','Best · 5000','Best wave · 12'][i]}" must render after the line before it`,
      ).toBeGreaterThan(order[i - 1]!);
    }
  });

  it('campaign renders neither endless line, so the campaign overlay is unchanged', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        kind: 'lose',
        wave: 7,
        bestWave: 12,
      }),
    );
    expect(screen.queryByText('Wave · 7')).toBeNull();
    expect(screen.queryByText('Best wave · 12')).toBeNull();
    expect(screen.getByText('Score · 500')).toBeTruthy();
    expect(screen.getByText('Best · 500')).toBeTruthy();
  });

  it('the win chrome is unreachable in endless even when stars and onNext are supplied (SC-1)', () => {
    render(
      createElement(ResultOverlay, {
        ...endlessBase,
        // The campaign-shaped mistake: a caller handing endless a cleared-board win.
        kind: 'win',
        stars: 3,
        onNext: vi.fn(),
      }),
    );

    expect(screen.queryByText('Win')).toBeNull();
    expect(screen.queryByText('All clear')).toBeNull();
    expect(screen.getByText('Lose')).toBeTruthy();
    expect(screen.getByText('Out of lives')).toBeTruthy();
    expect(screen.queryByLabelText('3 of 3 stars')).toBeNull();
    expect(screen.queryByText('★')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Play next level' }),
    ).toBeNull();
  });

  it('the Retry control announces the endless action, not a level retry', () => {
    render(createElement(ResultOverlay, endlessBase));

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Retry endless run from wave 1',
      'Return to title',
    ]);
    // The VISIBLE label is unchanged — only the screen-reader text differs.
    expect(screen.getByText('Retry')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry level' })).toBeNull();
  });

  it('a record of either kind shows exactly ONE badge, in one style — no primary record is elected (A-08)', () => {
    // A score record at a wave the player has beaten before.
    render(
      createElement(ResultOverlay, {
        ...endlessBase,
        score: 5001,
        best: 5001,
        wave: 3,
        bestWave: 12,
        isNewRecord: true,
      }),
    );
    const scoreBadges = screen.getAllByText('New Record');
    expect(scoreBadges).toHaveLength(1);
    const scoreStyle = scoreBadges[0]!.getAttribute('class');
    expect(scoreStyle, 'the style probe must read a real class, or the comparison below is vacuous').toBeTruthy();

    cleanup();

    // A wave record at a score the player has beaten before.
    render(
      createElement(ResultOverlay, {
        ...endlessBase,
        score: 100,
        best: 5000,
        wave: 13,
        bestWave: 13,
        isNewRecord: true,
      }),
    );
    const waveBadges = screen.getAllByText('New Record');
    expect(waveBadges).toHaveLength(1);
    expect(
      waveBadges[0]!.getAttribute('class'),
      'one badge, one color — tinting a wave record differently would elect a primary record',
    ).toBe(scoreStyle);
  });

  it('no badge when the run set no record', () => {
    render(createElement(ResultOverlay, endlessBase));
    expect(screen.queryByText('New Record')).toBeNull();
  });

  it('a mid-run wave-build failure replaces the body and keeps all four metric lines', () => {
    render(
      createElement(ResultOverlay, {
        ...endlessBase,
        waveBuildFailedWave: 8,
      }),
    );

    expect(
      screen.getByText('Wave 8 could not be built — run saved'),
    ).toBeTruthy();
    expect(screen.queryByText('Out of lives')).toBeNull();
    expect(screen.getByText('Wave · 7')).toBeTruthy();
    expect(screen.getByText('Score · 2400')).toBeTruthy();
    expect(screen.getByText('Best · 5000')).toBeTruthy();
    expect(screen.getByText('Best wave · 12')).toBeTruthy();
  });

  it('a Retry-time wave-build failure says tap Retry, never run saved (A-01, retry-in-place)', () => {
    render(
      createElement(ResultOverlay, {
        ...endlessBase,
        waveBuildFailedWave: 1,
      }),
    );

    // `Wave 1` is contract copy, NOT a template: a Retry-time failure is by
    // construction a wave-1 failure. `run saved` would be false here — there is no
    // in-flight run to save (owner decision, 2026-09-26).
    expect(
      screen.getByText('Wave 1 could not be built — tap Retry'),
    ).toBeTruthy();
    expect(screen.queryByText(/run saved/)).toBeNull();
    expect(screen.queryByText('Out of lives')).toBeNull();
    // Retry stays live and stays the endless control — that is what makes the copy
    // a remedy rather than a dead end.
    expect(
      screen.getByRole('button', { name: 'Retry endless run from wave 1' }),
    ).toBeTruthy();
    expect(screen.getByText('Wave · 7')).toBeTruthy();
    expect(screen.getByText('Best wave · 12')).toBeTruthy();
  });

  it('campaign never shows a wave-build-failure body, even if one is passed', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        kind: 'lose',
        waveBuildFailedWave: 8,
      }),
    );
    expect(screen.getByText('Out of lives')).toBeTruthy();
    expect(screen.queryByText(/could not be built/)).toBeNull();
  });
});
