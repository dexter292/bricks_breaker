/**
 * Plan 13-01 — the unlock block on the campaign / endless result panel (N-ACH-03 / D-05
 * AMENDED / D-06 / D-08).
 *
 * SHAPE COPIED FROM `tests/ui/DailyResultOverlay.test.tsx`: the per-file jsdom docblock
 * (the environment is NOT set globally — `vitest.config.ts` runs `node`), the safe-area
 * mock, `afterEach(cleanup)`, the `base`-with-everything-suppressed idiom and its
 * rationale, and the independent-`indexOf` `lineOrder` helper.
 *
 * WHAT THIS FILE IS NOT EVIDENCE ABOUT, stated so its silence is not read as coverage.
 * **jsdom performs NO layout and supplies NO safe-area insets.** Nothing here is evidence
 * that the panel FITS at 320x568pt, that a 16-character name renders on one line without
 * wrapping, that `Menu` is reachable without scrolling, or that the bottom inset is zero —
 * and that last one is what the whole two-row budget rests on. Those are `WINDOWS.md` #16,
 * #17, #28 and #29; they are device backstops discharged by a human in plan 13-05, and a
 * passing `render()` here must NOT be recorded as having verified one of them.
 * `13-UI-SPEC.md` § Measurement Provenance says so in those terms.
 *
 * The suppression states and the classifier's own exhaustive battery are plan 13-04's.
 *
 * The names below are LITERALS on purpose: this panel takes display-name strings and
 * knows nothing about a catalog (D-08), so importing `src/services` here to derive them
 * would assert a coupling the component must not have.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { ResultOverlay } from '../../src/runtime/overlays/ResultOverlay';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

afterEach(cleanup);

/**
 * A campaign win with every optional line suppressed: no stars, no badge, no `Next`, no
 * wave-build failure, no unlocks.
 *
 * Each case adds back exactly the one thing it is about, which is what keeps an absence
 * assertion meaningful — a `base` that already rendered everything would make "renders no
 * unlock block" true for the wrong reason.
 */
const base = {
  kind: 'win' as const,
  mode: 'campaign' as const,
  score: 1200,
  best: 5000,
  wave: 0,
  bestWave: 0,
  isNewRecord: false,
  stars: null,
  onRetry: () => {},
  onMenu: () => {},
  onNext: null,
};

/**
 * Position of each line in the rendered text — -1 when absent.
 *
 * Each `indexOf` starts from 0, INDEPENDENTLY. Advancing a cursor past the previous match
 * would make the returned array monotonic by construction and the ordering assertion green
 * no matter what order the component rendered. Lifted with its rationale from
 * `tests/ui/DailyResultOverlay.test.tsx`.
 */
function lineOrder(lines: string[]): number[] {
  const text = document.body.textContent ?? '';
  return lines.map((line) => text.indexOf(line));
}

/**
 * How many lines of the unlock block rendered: name lines plus an overflow line.
 *
 * Counted off the rendered text rather than by querying a container, because the block
 * deliberately introduces no wrapper `View` — `13-UI-SPEC.md` § Where the block sits
 * forbids a divider, a rule or an extra gap at either seam.
 */
function blockLineCount(): number {
  const text = document.body.textContent ?? '';
  const names = text.split('Unlocked · ').length - 1;
  const overflow = /and \d+ more/.test(text) ? 1 : 0;
  return names + overflow;
}

describe('ResultOverlay unlock block (N-ACH-03 / D-06)', () => {
  it('one unlock renders one line, after the records and before the controls', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        unlockedAchievements: ['1000 Bricks'],
      }),
    );

    expect(screen.getByText('Unlocked · 1000 Bricks')).toBeTruthy();
    expect(
      screen.getByText('Score · 1200'),
      'the positive control: this case must not be able to pass because the panel failed to render at all',
    ).toBeTruthy();
    expect(blockLineCount(), 'one unlock is one line, never a heading plus a line').toBe(1);

    const order = lineOrder(['Score · 1200', 'Unlocked · 1000 Bricks', 'Retry']);
    expect(
      order.every((at) => at >= 0),
      'every line in the ordering claim must actually have rendered',
    ).toBe(true);
    expect(
      order[1],
      '13-UI-SPEC § Where the block sits: what you earned comes after your numbers',
    ).toBeGreaterThan(order[0]!);
    expect(
      order[2],
      '…and before the way out',
    ).toBeGreaterThan(order[1]!);
  });

  it('the spoken label is produced with the visible line, never derived separately', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        unlockedAchievements: ['1000 Bricks'],
      }),
    );

    expect(
      screen.getByLabelText('Achievement unlocked: 1000 Bricks'),
      '`·` is announced inconsistently across screen readers, so every unlock line carries a spoken form — produced by the same classifier call as the visible text, so the two cannot disagree',
    ).toBeTruthy();
  });

  it('no unlocks render NO block — an absence, not an empty state', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        unlockedAchievements: [],
      }),
    );

    expect(
      screen.queryByText(/^Unlocked · /),
      'the zero state is an ABSENCE: no block, no divider, no reserved space, no placeholder. A `No achievements this run` line would cost 32px on every result panel forever to say nothing, and phrased at all it is a small reproach at the end of a run the player just lost',
    ).toBeNull();
    expect(
      screen.queryByText(/more/),
      'and no overflow line either',
    ).toBeNull();
    expect(blockLineCount()).toBe(0);
    expect(
      screen.getByText('Score · 1200'),
      'the positive control: the panel DID render, so the absence above is the rule and not a failed render',
    ).toBeTruthy();
  });

  it('three unlocks render one name and a count, capped at two lines (D-05 AMENDED)', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        unlockedAchievements: ['1000 Bricks', 'Wave 20', 'Seven Days'],
      }),
    );

    expect(screen.getByText('Unlocked · 1000 Bricks')).toBeTruthy();
    expect(
      screen.getByText('and 2 more'),
      'D-05 rejected a bare count; `n >= 3` still names one and counts the rest',
    ).toBeTruthy();
    expect(
      screen.queryByText('Unlocked · Wave 20'),
      'the second name is NOT rendered at n >= 3 — three rows put the campaign-win panel at 554px against 548 usable, which clips `Menu` on a panel that cannot scroll',
    ).toBeNull();
    expect(
      blockLineCount(),
      'the cap is a property of the component, not a promise by the host',
    ).toBe(2);
    expect(
      screen.getByLabelText('And 2 more achievements unlocked'),
      'the bare visible string is not a sentence on its own',
    ).toBeTruthy();
  });
});
