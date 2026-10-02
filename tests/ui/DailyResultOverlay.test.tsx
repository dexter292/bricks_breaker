/**
 * Plan 12-05 Task 1 — the Daily Result panel (N-DAILY-02 / N-DAILY-03).
 *
 * SHAPE COPIED FROM `tests/ui/ResultOverlay.test.tsx:1-31`: the per-file jsdom
 * docblock (the environment is NOT set globally — `vitest.config.ts` runs `node`), the
 * safe-area mock, and the `base`-spread-plus-per-case-override idiom. The line-order
 * case is modelled on that file's `:201`; the two absence cases on its `:229` and
 * `:244`; the exported-pure-classifier cases on its `:166-198`.
 *
 * WHAT THIS FILE IS NOT EVIDENCE ABOUT, stated so its silence is not read as coverage.
 * **jsdom performs NO layout and supplies NO safe-area insets.** Nothing here is evidence
 * that the panel FITS, that a line does not WRAP, or that a value does not CLIP. Those
 * three claims are `backstop` rows in `12-UI-SPEC.md § UI Considerations` (E1 overflow
 * horizontal, E1 overflow vertical, E5 overflow) and are routed to device verification in
 * plan 12-06. A passing `render()` assertion in this file must NOT be recorded as having
 * verified one of them — `12-UI-SPEC.md § Measurement Provenance` says so in those terms.
 *
 * Plan 13-04 EXTENDED this file with the unlock block, and extends that paragraph with it.
 * Nothing in the achievement cases below is evidence that this panel plus a two-line block
 * fits at 320x568pt with `Menu` reachable without scrolling (490px contracted / 522px
 * against the defensive 11-row bound, against 548 usable), that a 16-character name in
 * `Unlocked · {name}` renders on one line with no wrap and no truncation, or that the
 * bottom inset is zero — and that last one is what the whole two-row budget rests on.
 * Those are `WINDOWS.md` #16, #17, #28 and #29; a human discharges them in plan 13-05.
 * The single-line clamp is asserted below as a PROP ON A NODE, which is all jsdom can
 * see; whether it ever has to do anything is #16 and stays owed.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import {
  DailyResultOverlay,
  countdownForm,
  streakEndedCopy,
} from '../../src/runtime/overlays/DailyResultOverlay';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

afterEach(cleanup);

const HOUR = 3_600_000;
const MINUTE = 60_000;
const SECOND = 1_000;

/** An arbitrary fixed instant. `nowMs` is a PROP — the panel never reads a clock. */
const NOW = 1_800_000_000_000;

/**
 * A closed date with every optional line suppressed: no ended streak, no badge.
 *
 * Each case adds back exactly the one thing it is about, which is what keeps an
 * absence assertion meaningful — a `base` that already rendered everything would make
 * "renders no Retry" true for the wrong reason.
 */
const base = {
  kind: 'win' as const,
  dateKey: '2026-09-28',
  score: 1200,
  streak: 3,
  longestStreak: 9,
  totalDaysPlayed: 45,
  endedStreakLength: null,
  nowMs: NOW,
  // 7h 12m remaining — the hour form, and the exact value the UI-SPEC's own
  // accessibility row uses as its worked example.
  nextBoundaryMs: NOW + 7 * HOUR + 12 * MINUTE,
  onMenu: () => {},
};

/**
 * Position of each line in the rendered text — -1 when absent.
 *
 * Each `indexOf` starts from 0, INDEPENDENTLY. Advancing a cursor past the previous
 * match would make the returned array monotonic by construction and the ordering
 * assertion green no matter what order the component rendered. Lifted verbatim,
 * rationale included, from `tests/ui/ResultOverlay.test.tsx:143-154`.
 */
function lineOrder(lines: string[]): number[] {
  const text = document.body.textContent ?? '';
  return lines.map((line) => text.indexOf(line));
}

function expectInOrder(lines: string[]): void {
  const order = lineOrder(lines);
  expect(
    order.every((at) => at >= 0),
    `every contract line must render — missing: ${lines
      .filter((_, i) => order[i]! < 0)
      .join(', ')}`,
  ).toBe(true);
  for (let i = 1; i < order.length; i += 1) {
    expect(
      order[i],
      `line order is contract: "${lines[i]}" must render after "${lines[i - 1]}"`,
    ).toBeGreaterThan(order[i - 1]!);
  }
}

/**
 * `countdownForm` — the three render forms plus the omit case, as an exported pure
 * classifier rather than a JSX ternary.
 *
 * Same reason `waveBuildFailureKind` (`ResultOverlay.tsx:61-68`) is a named function:
 * so the visible line and the spoken label can never disagree about which case they
 * are in. 12-UI-SPEC § The countdown line is the table these cases transcribe.
 */
describe('countdownForm (12-UI-SPEC § The countdown line, 12-05)', () => {
  it('at an hour or more renders the hour-and-minute form with BOTH components floored', () => {
    const f = countdownForm(23 * HOUR + 59 * MINUTE + 30 * SECOND);
    expect(f.kind).toBe('hours');
    expect(
      f.kind === 'hours' ? f.text : null,
      'floored, not rounded: a ceiling here would print "24h 0m", which is longer than a day and reads as a bug',
    ).toBe('New board in 23h 59m');
  });

  it('exactly one hour is the hour form, not the minutes form', () => {
    const f = countdownForm(HOUR);
    expect(f.kind).toBe('hours');
    expect(f.kind === 'hours' ? f.text : null).toBe('New board in 1h 0m');
  });

  it('a 25-hour remainder renders 25 hours — not clamped and not special-cased', () => {
    const f = countdownForm(25 * HOUR);
    expect(f.kind).toBe('hours');
    expect(
      f.kind === 'hours' ? f.text : null,
      'a 25-hour local day is real (the DST fall-back day) and the board DOES change at local midnight — a two-character assumption or a 24h clamp would turn a rare correct output into a wrong one',
    ).toBe('New board in 25h 0m');
  });

  it('below an hour renders the minutes-only form, floored', () => {
    const f = countdownForm(59 * MINUTE + 59 * SECOND);
    expect(f.kind).toBe('minutes');
    expect(f.kind === 'minutes' ? f.text : null).toBe('New board in 59m');
  });

  it('below a minute renders the fixed sub-minute sentence, with no number in it', () => {
    const f = countdownForm(30 * SECOND);
    expect(f.kind).toBe('under-a-minute');
    expect(f.kind === 'under-a-minute' ? f.text : null).toBe(
      'New board in under a minute',
    );
  });

  it('omits on zero, on a negative, on NaN and on a non-finite remainder', () => {
    for (const bad of [0, -1, -HOUR, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        countdownForm(bad).kind,
        `a remainder of ${String(bad)} must omit the line rather than render a negative or an expired duration (12-UI-SPEC § Clock policy rule 5)`,
      ).toBe('omit');
    }
  });
});

/**
 * `streakEndedCopy` — the sentence or nothing.
 *
 * The five-case DERIVATION lives in the host, over the stored window
 * (`src/services/daily/streak.ts` `endedStreakLength`). The panel receives the already
 * derived length or nothing and must not attempt to reconstruct it — and in particular
 * must never fall back to the lifetime `longestStreak`, which may belong to an
 * entirely different, earlier run (D-17, `12-UI-SPEC.md § The streak-ended line`).
 */
describe('streakEndedCopy (D-17, 12-05)', () => {
  it('gives nothing when no ended length was derivable', () => {
    expect(
      streakEndedCopy(null),
      'a silent omission is the honest failure mode; a confident wrong number is not',
    ).toBeNull();
  });

  it('gives the sentence at two or more, where {n}-day needs no plural branch', () => {
    expect(streakEndedCopy(2)).toBe('Your 2-day streak ended');
    expect(streakEndedCopy(137)).toBe('Your 137-day streak ended');
  });
});

describe('DailyResultOverlay — the closed-date panel (12-05)', () => {
  it('renders the eleven contract rows in the locked order', () => {
    render(
      createElement(DailyResultOverlay, {
        ...base,
        streak: 9,
        endedStreakLength: 4,
      }),
    );

    expectInOrder([
      'Win',
      'All clear',
      'Daily · 2026-09-28',
      'Score · 1200',
      'Streak · 9',
      'Best streak · 9',
      'Days played · 45',
      'Your 4-day streak ended',
      'Best streak ever',
      'New board in 7h 12m',
      'Menu',
    ]);
  });

  it('a win heading and a streak-ended line co-render — winning today after a two-week gap is exactly that', () => {
    render(
      createElement(DailyResultOverlay, { ...base, endedStreakLength: 14 }),
    );
    expect(screen.getByText('Win')).toBeTruthy();
    expect(screen.getByText('All clear')).toBeTruthy();
    expect(
      screen.getByText('Your 14-day streak ended'),
      'suppressing either one would misreport the day (12-UI-SPEC § Color, the destructive extension)',
    ).toBeTruthy();
    expect(
      screen.getByText('Streak · 3'),
      'the new streak is not itself a loss: the current-streak line stays accent white',
    ).toBeTruthy();
  });

  it('lose renders the destructive heading and the out-of-lives body', () => {
    render(createElement(DailyResultOverlay, { ...base, kind: 'lose' }));
    expect(screen.getByText('Lose')).toBeTruthy();
    expect(screen.getByText('Out of lives')).toBeTruthy();
    expect(screen.queryByText('Win')).toBeNull();
    expect(screen.queryByText('All clear')).toBeNull();
  });

  it('omits the streak-ended line when no ended length is supplied, and never substitutes the lifetime longest streak', () => {
    render(
      createElement(DailyResultOverlay, {
        ...base,
        streak: 1,
        longestStreak: 30,
        endedStreakLength: null,
      }),
    );
    expect(
      screen.queryByText(/streak ended/),
      'the window floor case is underivable; printing `longestStreak` here would state a number that was never the streak that just ended',
    ).toBeNull();
    expect(screen.queryByText('Your 30-day streak ended')).toBeNull();
    expect(screen.getByText('Best streak · 30')).toBeTruthy();
  });

  it('the badge fires when the streak is at least 2 and equals the lifetime longest', () => {
    render(
      createElement(DailyResultOverlay, {
        ...base,
        streak: 5,
        longestStreak: 5,
      }),
    );
    expect(
      screen.getByText('Best streak ever'),
      '=== not >: by the time the panel renders, longestStreak has already absorbed this date, so > would make the badge vanish on re-open the same day',
    ).toBeTruthy();
  });

  it('the badge is absent on a first-ever daily, where streak and longest are both 1', () => {
    render(
      createElement(DailyResultOverlay, {
        ...base,
        streak: 1,
        longestStreak: 1,
      }),
    );
    expect(
      screen.queryByText('Best streak ever'),
      'celebrating day one is noise; the >= 2 floor is what makes the badge mean something from day two onward',
    ).toBeNull();
  });

  it('the badge is absent when the current streak is behind the lifetime longest', () => {
    render(
      createElement(DailyResultOverlay, {
        ...base,
        streak: 4,
        longestStreak: 9,
      }),
    );
    expect(screen.queryByText('Best streak ever')).toBeNull();
  });

  it('omits the countdown line entirely when the remainder is non-positive', () => {
    render(
      createElement(DailyResultOverlay, { ...base, nextBoundaryMs: NOW }),
    );
    expect(
      screen.queryByText(/New board in/),
      'the local date has already rolled; the line is omitted rather than rendering a negative duration or expiring in place',
    ).toBeNull();
    expect(
      screen.getByText('Score · 1200'),
      'and the rest of the panel is unaffected — the countdown is decoration and never a gate',
    ).toBeTruthy();
  });

  it('renders the countdown from the injected instants alone, so the same props give the same line twice', () => {
    const { unmount } = render(
      createElement(DailyResultOverlay, { ...base }),
    );
    expect(screen.getByText('New board in 7h 12m')).toBeTruthy();
    unmount();
    render(createElement(DailyResultOverlay, { ...base }));
    expect(
      screen.getByText('New board in 7h 12m'),
      '`nowMs` is a prop, never a clock read inside render — otherwise the 23h-59m, sub-minute and rollover cases are not testable deterministically',
    ).toBeTruthy();
  });

  it('on a closed date Menu is the only control — no Retry, no star row and no lifetime-best score line, even when a caller supplies an onRetry', () => {
    const onRetry = vi.fn();
    const onMenu = vi.fn();
    render(
      createElement(DailyResultOverlay, { ...base, onRetry, onMenu }),
    );

    expect(
      screen.queryByText('Retry'),
      'D-06 gives one attempt per date, and a control the rule forbids is ABSENT rather than greyed — a disabled button invites a tap and then explains itself',
    ).toBeNull();
    expect(screen.queryByLabelText('Retry today’s daily board')).toBeNull();
    expect(screen.queryByLabelText("Retry today's daily board")).toBeNull();
    expect(screen.queryByText('★')).toBeNull();
    expect(screen.queryByText('☆')).toBeNull();
    expect(
      screen.queryByText(/^Best · /),
      'there is no stored lifetime best daily SCORE; filling such a line from the campaign or endless watermark would break SC-5 outright',
    ).toBeNull();
    expect(screen.queryByText('Next')).toBeNull();

    const controls = screen.getAllByRole('button');
    expect(
      controls.length,
      'Menu is the only control on a closed date',
    ).toBe(1);
    fireEvent.click(controls[0]!);
    expect(onMenu).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('carries the contracted accessibility labels, because the middle dot is announced inconsistently', () => {
    render(
      createElement(DailyResultOverlay, {
        ...base,
        streak: 9,
        endedStreakLength: 4,
      }),
    );
    expect(screen.getByLabelText('Streak: 9 days')).toBeTruthy();
    expect(screen.getByLabelText('Best streak: 9 days')).toBeTruthy();
    expect(screen.getByLabelText('Days played: 45')).toBeTruthy();
    expect(
      screen.getByLabelText('New board in 7 hours 12 minutes'),
      '"7h 12m" reads as letters otherwise',
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Return to title' }),
      'the Menu label is unchanged from the shipped panels',
    ).toBeTruthy();
  });

  it('carries no shaming, guilt or loss-aversion framing and no offer to restore, protect, freeze or buy back a streak', () => {
    render(
      createElement(DailyResultOverlay, {
        ...base,
        streak: 1,
        longestStreak: 30,
        endedStreakLength: 12,
      }),
    );
    const text = document.body.textContent ?? '';
    for (const banned of [
      'restore',
      'Restore',
      'protect',
      'Protect',
      'freeze',
      'Freeze',
      'buy',
      'Buy',
      'watch',
      'Watch',
      'Don’t lose',
      "Don't lose",
      'Oops',
      'Sorry',
      'Unlock',
    ]) {
      expect(
        text.includes(banned),
        `D-17 states the fact that a streak ended and stops there: "${banned}" is either shaming or a monetised recovery hook, and the roadmap goal's own phrase — a streak they would be annoyed to lose — is exactly the framing that invites one`,
      ).toBe(false);
    }
    expect(
      screen.getByText('Your 12-day streak ended'),
      'the statement of fact itself must still be there — the prohibition is on the framing, not on the report',
    ).toBeTruthy();
  });

  /**
   * The unlock block (N-ACH-03 / D-06, plan 13-04). The SAME block `ResultOverlay`
   * renders, from the same `achievementLines` call — 13-UI-SPEC § One shared pure
   * classifier makes S1 and S2 one block rendered by one function, not two designs.
   * What the return value itself guarantees is `tests/ui/achievementLines.test.ts`'s;
   * these cases are the render-level claims only.
   */
  it('renders the achievement unlock block after the badge and above the countdown', () => {
    render(
      createElement(DailyResultOverlay, {
        ...base,
        streak: 9,
        longestStreak: 9,
        unlockedAchievements: ['1000 Bricks', 'Wave 20'],
      }),
    );

    // The ordering claim goes through the shipped independent-`indexOf` helper. Its
    // construction is load-bearing here: a moving cursor would make the array
    // monotonic by construction and this assertion green whatever order rendered.
    expectInOrder([
      'Best streak · 9',
      'Best streak ever',
      'Unlocked · 1000 Bricks',
      'Unlocked · Wave 20',
      'New board in 7h 12m',
      'Menu',
    ]);
    expect(
      screen.getByLabelText('Achievement unlocked: 1000 Bricks'),
      'each line carries the spoken form produced by the same classifier call as the visible text, so the two cannot disagree about which case they are in',
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Achievement unlocked: Wave 20'),
      'both lines, both labels',
    ).toBeTruthy();
    expect(
      screen
        .getByText('Unlocked · 1000 Bricks')
        .getAttribute('class')
        ?.includes('textOverflow'),
      'the single-line clamp is ON THE NODE, which is the whole of what jsdom can see about it. This is NOT evidence that any name fits or that none wraps — that is WINDOWS #16 and it stays owed to a human in plan 13-05',
    ).toBe(true);
  });

  it('no unlocks render no achievement block — an absence, not an empty state', () => {
    render(
      createElement(DailyResultOverlay, {
        ...base,
        unlockedAchievements: [],
      }),
    );

    expect(
      screen.queryByText(/^Unlocked · /),
      'the zero state is an ABSENCE: no block, no divider, no reserved space, no placeholder, and no `No achievements this run` line — that would cost 32px on every result panel forever to say nothing, and phrased at all it becomes a small reproach at the end of a run the player just lost',
    ).toBeNull();
    expect(
      screen.queryByText(/more/),
      'and no overflow line either',
    ).toBeNull();
    expect(
      screen.getByText('Score · 1200'),
      'the positive control: the panel DID render, so the absence above is the rule and not a failed render',
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Return to title' }),
      'and the way out is still there',
    ).toBeTruthy();
  });

  it('an unlock line co-renders with a red streak-ended line without taking its colour', () => {
    render(
      createElement(DailyResultOverlay, {
        ...base,
        endedStreakLength: 4,
        unlockedAchievements: ['1000 Bricks'],
      }),
    );

    const unlock = screen.getByText('Unlocked · 1000 Bricks');
    const ended = screen.getByText('Your 4-day streak ended');
    const plain = screen.getByText('Days played · 45');
    expect(
      [unlock, ended, plain].every((el) => el != null),
      'all three lines must be on screen — a real day can end a streak and unlock something at the same time, and that is the day this case is about',
    ).toBe(true);

    const endedColor = getComputedStyle(ended).color;
    expect(
      endedColor,
      'the colour probe must read a real value, or both comparisons below are vacuous',
    ).toBe('rgb(232, 93, 93)');
    expect(
      getComputedStyle(unlock).color,
      'the unlock line takes `styles.metric` and NOTHING else: 12-UI-SPEC extended the destructive red to exactly one element on an explicitly semantic argument, and an unlock is the opposite of a loss — colouring them alike would misreport the day. It may not borrow the badge’s gold either; the record slot is one slot',
    ).toBe(getComputedStyle(plain).color);
    expect(
      getComputedStyle(unlock).color === endedColor,
      'and it is not the streak-ended colour',
    ).toBe(false);
  });
});

describe('DailyResultOverlay — the board-failure variant keeps the date OPEN (12-05)', () => {
  const failure = {
    ...base,
    kind: 'board-failure' as const,
    onRetry: () => {},
  };

  it('renders the accent-white Daily heading, the could-not-be-built body, and Retry then Menu', () => {
    render(createElement(DailyResultOverlay, { ...failure }));
    expect(screen.getByText('Daily')).toBeTruthy();
    expect(
      screen.getByText("Today's board could not be built — tap Retry"),
      'the wording deliberately mirrors the shipped wave-build failure copy',
    ).toBeTruthy();
    expect(screen.queryByText('Lose')).toBeNull();
    expect(
      screen.queryByText('Win'),
      'nothing was lost and nothing was won — the date is still open',
    ).toBeNull();
    expectInOrder(['Daily · 2026-09-28', 'Streak · 3', 'Best streak · 9']);
    // The two controls are ordered by ROLE, not by `indexOf` over the body text: the
    // failure body literally contains the word "Retry" ("… — tap Retry"), so a
    // text-position check would match the sentence rather than the control and
    // assert the wrong thing in the right-looking way.
    const controls = screen
      .getAllByRole('button')
      .map((el) => el.getAttribute('aria-label'));
    expect(
      controls,
      'Retry (primary) THEN Menu, while the date is still open',
    ).toEqual(["Retry today's daily board", 'Return to title']);
  });

  it('suppresses every line that describes a CLOSED date: score, days played, the streak-ended line, the badge and the countdown', () => {
    render(
      createElement(DailyResultOverlay, {
        ...failure,
        streak: 9,
        longestStreak: 9,
        endedStreakLength: 4,
      }),
    );
    expect(screen.queryByText('Score · 1200')).toBeNull();
    expect(screen.queryByText('Days played · 45')).toBeNull();
    expect(screen.queryByText('Your 4-day streak ended')).toBeNull();
    expect(screen.queryByText('Best streak ever')).toBeNull();
    expect(
      screen.queryByText(/New board in/),
      'a countdown to tomorrow on a date the player has not yet played would state that today is over',
    ).toBeNull();
    expect(
      screen.getByText('Streak · 9'),
      'the streak lines are still true and still derived from storage',
    ).toBeTruthy();
  });

  it('presses Retry and Menu through to the host without a confirmation dialog', () => {
    const onRetry = vi.fn();
    const onMenu = vi.fn();
    render(
      createElement(DailyResultOverlay, { ...failure, onRetry, onMenu }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: "Retry today's daily board" }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Return to title' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  it('renders no achievement block, because nothing was played and nothing was written', () => {
    render(
      createElement(DailyResultOverlay, {
        ...failure,
        unlockedAchievements: ['1000 Bricks', 'Wave 20'],
      }),
    );

    expect(
      screen.queryByText(/^Unlocked · /),
      'nothing was played, nothing was written, `recordRunEnd` never ran and the date is still OPEN — so any names in props describe no run on this panel. The block rides the EXISTING `isClosed`, which is why it cannot half-suppress while the score and the countdown are gone',
    ).toBeNull();
    expect(
      screen.queryByText(/and \d+ more/),
      'and no overflow line either — the whole block is gone, not thinned',
    ).toBeNull();

    // The positive control, in this same case, in this file's own shipped idiom.
    expect(
      screen.getByText("Today's board could not be built — tap Retry"),
      'the positive control: the board-failure copy is on screen, which is only reachable through a successful render of this panel',
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: "Retry today's daily board" }),
      'and `Retry` is present, because THIS date is still open — the same single D-01 rule that forbids a Retry once it has closed',
    ).toBeTruthy();
  });
});
