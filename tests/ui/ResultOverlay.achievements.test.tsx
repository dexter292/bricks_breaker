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
 * The suppression states below are plan 13-04's, added to this file rather than a new one
 * so the present and the absent cases of one rule are read side by side. The classifier's
 * own exhaustive battery is `tests/ui/achievementLines.test.ts`, under the node
 * environment — nothing here re-asserts what that file proves about the return value.
 *
 * EVERY ABSENCE CASE BELOW CARRIES A POSITIVE CONTROL IN THE SAME CASE, and that is not
 * decoration: without one, "the component rendered nothing at all" passes as "the
 * suppression fired", which is the failure mode `tests/ui/DailyResultOverlay.test.tsx`'s
 * `base`-with-everything-suppressed idiom exists to close. The `'mid'` case is the paired
 * opposite of the `'start'` case for the same reason — it is what stops the rule from
 * degenerating into "absent whenever anything went wrong".
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

/**
 * The endless base: `kind` is forced to the lose variant inside the component (SC-1 — an
 * endless run never ends on a cleared wave), so only the wave-build failure prop moves
 * between the two cases below.
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

describe('ResultOverlay unlock block — suppression and determinism (SC-4 / D-07, 13-04)', () => {
  it('at endless Retry time there is no run yet, so the block is absent under the failure copy', () => {
    render(
      createElement(ResultOverlay, {
        ...endlessBase,
        // `waveBuildFailureKind` classifies 1 as `'start'`: `startEndlessRun` calls
        // `advanceToWave(1)`, so a start that cannot build is by construction a wave-1
        // failure.
        waveBuildFailedWave: 1,
        unlockedAchievements: ['1000 Bricks', 'Wave 20'],
      }),
    );

    expect(
      screen.queryByText(/^Unlocked · /),
      'at Retry time no run has happened yet, so any names still in props belong to the PREVIOUS run and would be re-announced under failure copy — the block describes a run, and here there is none',
    ).toBeNull();
    expect(
      screen.queryByText(/and \d+ more/),
      'and no overflow line either — the whole block is gone, not thinned',
    ).toBeNull();
    expect(blockLineCount(), 'nothing of the block rendered').toBe(0);

    // The positive control, in this same case: the panel DID mount and DID render, so
    // the three absences above are the suppression and not a failed render.
    expect(
      screen.getByText('Wave 1 could not be built — tap Retry'),
      'the positive control: the Retry-time failure copy is on screen, which is only reachable through a successful render of this panel',
    ).toBeTruthy();
    expect(
      screen.getByText('Best · 5000'),
      'and the watermark line renders too — `Best ·` is read from `telemetry.endless` rather than from a run, so it stays meaningful when no run exists',
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Return to title' }),
      'and `Menu` is reachable, which is the way out this panel must always offer',
    ).toBeTruthy();
  });

  it('a mid-run wave-build failure saved the run, so the block IS present', () => {
    render(
      createElement(ResultOverlay, {
        ...endlessBase,
        // 2 classifies as `'mid'`: a mid-run failure is `waveRef.current + 1` and
        // `waveRef` is at or above 1 from the first successful build.
        waveBuildFailedWave: 2,
        unlockedAchievements: ['1000 Bricks', 'Wave 20'],
      }),
    );

    expect(
      screen.getByText('Wave 2 could not be built — run saved'),
      'the mid-run copy, which is the state this case is about',
    ).toBeTruthy();
    expect(
      screen.getByText('Unlocked · 1000 Bricks'),
      'the run ENDED and was SAVED, `recordRunEnd` ran, and the unlocks are real — absence here would be a bug, not a suppression. This case is the paired opposite of the Retry-time one and it is what stops the rule becoming "absent whenever anything went wrong"',
    ).toBeTruthy();
    expect(
      screen.getByText('Unlocked · Wave 20'),
      'both names, because the suppression is all-or-nothing and never thins the block',
    ).toBeTruthy();
    expect(blockLineCount(), 'two unlocks, two lines').toBe(2);
  });

  it('the same array renders identical lines twice — SC-2 determinism at the surface', () => {
    const names = ['1000 Bricks', 'Wave 20', 'Seven Days'];

    render(createElement(ResultOverlay, { ...base, unlockedAchievements: names }));
    const first = document.body.textContent ?? '';
    expect(
      first.includes('Unlocked · 1000 Bricks'),
      'the snapshot must contain the block, or the comparison below is vacuous over two empty strings',
    ).toBe(true);

    cleanup();

    render(createElement(ResultOverlay, { ...base, unlockedAchievements: names }));
    expect(
      document.body.textContent ?? '',
      'the classifier is pure and the panel injects no clock for this block, so nothing about it may depend on mount order or on how many times the panel has rendered. This is SC-2 reaching the surface the player actually reads, not just the evaluator',
    ).toBe(first);
  });

  it('the block carries no prohibited framing, and adds no control', () => {
    render(
      createElement(ResultOverlay, {
        ...base,
        unlockedAchievements: ['1000 Bricks', 'Wave 20', 'Seven Days'],
      }),
    );
    const text = document.body.textContent ?? '';

    // `Locked` is capitalised on purpose and lowercase `locked` is deliberately NOT in
    // this list: `Unlocked` contains it, so banning the lowercase form would fail on the
    // block's own contract copy. The list is the shapes 13-UI-SPEC § Standing
    // Prohibitions names, each of which an achievement surface actively invites.
    for (const banned of [
      '%',
      '!',
      'Claim',
      'claim',
      'Locked',
      'Share',
      'share',
      'Invite',
      'Leaderboard',
      'Compare',
      'compare',
      'Progress',
      'progress',
      'so close',
      'to go',
      'Congratulations',
      'limited',
      'expires',
    ]) {
      expect(
        text.includes(banned),
        `13-UI-SPEC § Standing Prohibitions: "${banned}" is a progress teaser, a locked-achievement preview, a claim action, a share or compare affordance, or scarcity framing — and an achievement surface is exactly where that pressure reappears`,
      ).toBe(false);
    }

    expect(
      screen.getByText('Unlocked · 1000 Bricks'),
      'the block itself must still be there — the prohibition is on the framing, not on the report',
    ).toBeTruthy();

    const controls = screen.getAllByRole('button');
    expect(
      controls.map((c) => c.textContent),
      'the block adds NO control: the lines are `Text` and never `Pressable`, because Phase 14 owns the screen a line would want to link to and a control that has nowhere to go must not render. Only the panel\u2019s own two controls are here',
    ).toEqual(['Retry', 'Menu']);
  });
});
