/**
 * N-DAILY-02 / SC-3 — the streak is a pure walk over stored dates, never a counter.
 *
 * SC-3 requires the streak be "computed from stored dates rather than an incrementing
 * counter that a crash could corrupt". That is a structural claim, and this file is the
 * instrument for it: every function under test takes an array of strings and returns a
 * number, a boolean or null. There is no clock to stub and no store to fake, which is
 * itself the evidence — a counter implementation could not satisfy these signatures.
 *
 * Analog: `tests/endless.ramp.test.ts` — the same constants-at-the-top-with-their-reason
 * shape (`:29-37`), the same `describe('<fn> (<criterion> / <requirement>, <plan>)')` /
 * `it('<behaviour>')` naming (`:39-121`), and the same `expect(value, 'why')`
 * second-argument convention throughout. The TZ capture-and-restore idiom is
 * `tests/daily.date-key.test.ts`'s (plan 12-02), which established it; `process.env.TZ`
 * is process-global and vitest reuses a worker across files, so a spec that leaves the
 * zone reassigned corrupts every file that runs after it.
 *
 * `Date.parse` appears freely BELOW. Plan 12-01's comment-stripped grep gate bans it in
 * `src/services/daily/*.ts` only — a test may name a banned primitive to build a fixture
 * or to prove the real thing differs from it.
 *
 * Deliberately NOT covered here:
 *  - **Storage.** Nothing in this file touches a store, a blob or a merge. The D-16
 *    scalars and the write-side bound are `tests/daily.record.test.ts`.
 *  - **Rendering.** Which lines the panel draws from these values is 12-UI-SPEC's table
 *    and Phase 14's surface; this file asserts only the derivation feeding it.
 *  - **The clock.** No case reads the current time. `hasResultFor` is the whole of D-01
 *    and it is set membership, which is exactly why a device clock change gains nothing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  endedStreakLength,
  hasResultFor,
  isValidDateKey,
  localDateKey,
  nextLocalMidnightMs,
  previousDateKey,
  streakFrom,
} from '../src/services/daily';

/**
 * The ambient zone, captured ONCE at module scope before any case reassigns it.
 * Same reason as `tests/daily.date-key.test.ts`: the variable is process-global.
 */
const ORIG_TZ = process.env.TZ;

/**
 * The last second of Saturday 2026-09-05 in America/Santiago. Sunday 2026-09-06 has NO
 * 00:00-00:59 local there, so any day-step across it must resolve a local midnight that
 * does not exist (12-RESEARCH § Finding 3(a), re-used from plan 12-02's fixtures).
 */
const SANTIAGO_SKIPPED_MIDNIGHT_EVE = Date.parse('2026-09-06T03:59:59.000Z');

/**
 * Noon local on 2026-11-01 in America/Havana — a local day that is 25 hours long and
 * contains midnight twice (12-RESEARCH § Finding 3(b)). The day either side of it must
 * still step by exactly one calendar day.
 */
const HAVANA_LONG_DAY_NOON = Date.parse('2026-11-01T16:00:00.000Z');

/**
 * A walk long enough to cross both 2026 DST days in Santiago, and deliberately longer
 * than `DAILY_HISTORY_BOUND` so the inversion property is exercised past the window the
 * record will keep. Not a dial anybody tuned — it is a span chosen to contain the two
 * transitions that can falsify the step.
 */
const ROUND_TRIP_DAYS = 400;

/** The first instant of local 2026-01-01 in Santiago — the round-trip walk's origin. */
const ROUND_TRIP_ORIGIN = Date.parse('2026-01-01T15:00:00.000Z');

/**
 * A lifetime-longest-streak value seeded into every window-floor fixture below,
 * deliberately distinct from every length derivable from those fixtures.
 *
 * It exists so a wrong implementation is VISIBLE. `endedStreakLength` must return
 * nothing at the window floor (12-UI-SPEC § The streak-ended line: "Never substitute
 * `longestStreak`"), and the obvious wrong fix — reaching for the lifetime scalar when
 * the walk cannot derive a length — would return exactly this number. A case that only
 * asserted "not 3" would not catch it; a case that asserts "not this" does.
 */
const SEEDED_LIFETIME_LONGEST = 97;

/** Build a run of `n` consecutive keys ending at `end`, ascending. */
function consecutiveEndingAt(end: string, n: number): string[] {
  const out: string[] = [end];
  for (let i = 1; i < n; i++) {
    out.unshift(previousDateKey(out[0]!));
  }
  return out;
}

/**
 * Restore the process-global zone after EVERY case. Without this, a zone pinned here
 * leaks into whatever file vitest runs next in the same worker.
 */
afterEach(() => {
  if (ORIG_TZ === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = ORIG_TZ;
  }
});

describe('previousDateKey (D-14 / N-DAILY-02, 12-03)', () => {
  it('steps back one calendar day inside a month', () => {
    expect(previousDateKey('2026-09-27'), 'plain mid-month step').toBe('2026-09-26');
    expect(previousDateKey('2026-09-02'), 'step onto a single-digit day keeps the pad').toBe(
      '2026-09-01',
    );
  });

  it('steps back onto the last day of the previous month, including short February', () => {
    expect(previousDateKey('2026-03-01'), '2026 is a common year, so February has 28 days').toBe(
      '2026-02-28',
    );
    expect(previousDateKey('2026-10-01'), 'step onto a 30-day month').toBe('2026-09-30');
    expect(previousDateKey('2026-08-01'), 'step onto a 31-day month').toBe('2026-07-31');
  });

  it('steps back onto a leap day', () => {
    expect(previousDateKey('2028-03-01'), '2028 is a leap year — 29 February exists').toBe(
      '2028-02-29',
    );
    expect(previousDateKey('2028-03-01'), 'the leap day must not be skipped to the 28th').not.toBe(
      '2028-02-28',
    );
  });

  it('steps back across a year boundary', () => {
    expect(previousDateKey('2027-01-01'), 'year and month both roll').toBe('2026-12-31');
  });

  it('is correct across both real 2026 DST days, in both directions', () => {
    // Santiago springs forward across 2026-09-06, a local day with no midnight at all.
    process.env.TZ = 'America/Santiago';
    expect(
      localDateKey(SANTIAGO_SKIPPED_MIDNIGHT_EVE),
      'fixture sanity: the eve is still Saturday 2026-09-05 local',
    ).toBe('2026-09-05');
    expect(
      previousDateKey('2026-09-06'),
      'stepping back OFF the skipped-midnight day must reach its eve',
    ).toBe('2026-09-05');
    expect(
      previousDateKey('2026-09-07'),
      'stepping back ONTO the skipped-midnight day must not skip it',
    ).toBe('2026-09-06');

    // Havana's 2026-11-01 is 25 hours long and contains midnight twice.
    process.env.TZ = 'America/Havana';
    expect(
      localDateKey(HAVANA_LONG_DAY_NOON),
      'fixture sanity: noon on the 25-hour day is 2026-11-01 local',
    ).toBe('2026-11-01');
    expect(previousDateKey('2026-11-01'), 'stepping back off the long day').toBe('2026-10-31');
    expect(previousDateKey('2026-11-02'), 'stepping back onto the long day').toBe('2026-11-01');
  });

  it('inverts localDateKey over a 400-day walk that crosses both 2026 DST days', () => {
    process.env.TZ = 'America/Santiago';
    let instant = ROUND_TRIP_ORIGIN;
    let key = localDateKey(instant);
    for (let day = 0; day < ROUND_TRIP_DAYS; day++) {
      instant = nextLocalMidnightMs(instant);
      const nextKey = localDateKey(instant);
      expect(
        previousDateKey(nextKey),
        `day ${day}: stepping back from ${nextKey} must invert the forward step from ${key}`,
      ).toBe(key);
      key = nextKey;
    }
  });
});

describe('isValidDateKey (T-12-13, 12-03)', () => {
  it('rejects every non-string', () => {
    const notStrings = [null, undefined, 0, 20260927, Number.NaN, {}, [], true, () => '2026-09-27'];
    for (const raw of notStrings) {
      expect(isValidDateKey(raw), `${String(raw)} is not a string and must be rejected`).toBe(
        false,
      );
    }
  });

  it('rejects a wrong-shaped string', () => {
    const misshapen = [
      '',
      '2026-9-27',
      '26-09-27',
      '2026-09-7',
      '2026/09/27',
      '2026-09-27T00:00:00Z',
      '2026-09-27 ',
      ' 2026-09-27',
      '20260927',
      'xxxx-xx-xx',
      '0NaN-NaN-NaN',
    ];
    for (const raw of misshapen) {
      expect(isValidDateKey(raw), `${JSON.stringify(raw)} is not a YYYY-MM-DD key`).toBe(false);
    }
  });

  it('rejects an out-of-range month or day', () => {
    for (const raw of ['2026-00-10', '2026-13-10', '2026-99-10']) {
      expect(isValidDateKey(raw), `${raw} has an impossible month`).toBe(false);
    }
    for (const raw of ['2026-09-00', '2026-09-31', '2026-09-32', '2026-01-32', '2026-02-30']) {
      expect(isValidDateKey(raw), `${raw} has an impossible day`).toBe(false);
    }
    for (const raw of ['2026-09-27', '2026-01-31', '2026-04-30', '2026-12-31']) {
      expect(isValidDateKey(raw), `${raw} is a real date`).toBe(true);
    }
  });

  it('accepts 29 February only in a leap year, by the full century rule', () => {
    expect(isValidDateKey('2028-02-29'), '2028 is divisible by 4 and not a century').toBe(true);
    expect(isValidDateKey('2000-02-29'), '2000 is divisible by 400 — a leap year').toBe(true);
    expect(isValidDateKey('2026-02-29'), '2026 is not divisible by 4').toBe(false);
    expect(isValidDateKey('1900-02-29'), '1900 is a century not divisible by 400').toBe(false);
    expect(isValidDateKey('2100-02-29'), '2100 is a century not divisible by 400').toBe(false);
  });
});

describe('hasResultFor (D-01, 12-03)', () => {
  it('is true if and only if the key is stored — the whole of the clock policy', () => {
    const stored = ['2026-09-25', '2026-09-26', '2026-09-27'];
    expect(hasResultFor(stored, '2026-09-27'), 'a stored date has a result').toBe(true);
    expect(hasResultFor(stored, '2026-09-25'), 'the oldest stored date still has one').toBe(true);
    expect(hasResultFor(stored, '2026-09-28'), 'a date ahead of the set is still playable').toBe(
      false,
    );
    expect(hasResultFor(stored, '2026-09-24'), 'a date behind the set is not stored').toBe(false);
    expect(hasResultFor([], '2026-09-27'), 'nothing is stored, so nothing is closed').toBe(false);
    // The anti-cheat argument, asserted rather than asserted-in-prose: winding the device
    // clock BACK lands on a date that is already in the set, which is closed; winding it
    // FORWARD lands on one that is not stored, which is playable but breaks the streak by
    // itself. Neither needs a branch anywhere in the code.
    expect(hasResultFor(stored, '2026-09-26'), 'a backwards clock gains nothing').toBe(true);
    expect(hasResultFor(stored, '2026-10-05'), 'a forwards clock opens a non-adjacent date').toBe(
      false,
    );
  });
});

describe('streakFrom (D-13 / D-14 / SC-3, 12-03)', () => {
  it('is 0 for no stored dates and 1 for a single stored date', () => {
    expect(streakFrom([]), 'no dates played is no streak').toBe(0);
    expect(streakFrom(['2026-09-27']), 'one date played is a one-day streak').toBe(1);
  });

  it('counts consecutive dates and stops at the first gap', () => {
    expect(
      streakFrom(['2026-09-25', '2026-09-26', '2026-09-27']),
      'three calendar-adjacent dates are a three-day streak',
    ).toBe(3);
    expect(
      streakFrom(['2026-09-24', '2026-09-26', '2026-09-27']),
      'a one-day gap before the last two leaves a two-day streak',
    ).toBe(2);
    expect(
      streakFrom(['2026-09-20', '2026-09-27']),
      'a far-away earlier date contributes nothing',
    ).toBe(1);
  });

  it('ends the streak on a gap of exactly two days — there is no grace day (D-14)', () => {
    // 09-24 then 09-26: exactly one missed date (09-25). D-14 has no grace day, so the
    // streak ending at 09-26 is 1, not 2.
    expect(streakFrom(['2026-09-24', '2026-09-26']), 'one missed date breaks it').toBe(1);
    expect(
      streakFrom(['2026-09-23', '2026-09-24', '2026-09-26']),
      'the run before the gap does not carry across it',
    ).toBe(1);
    // The control: closing the gap restores the full run, so the case above is measuring
    // the gap and not something else about the fixture.
    expect(
      streakFrom(['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26']),
      'with the gap filled the same span is a four-day streak',
    ).toBe(4);
  });

  it('crosses month, year and leap boundaries without a duration subtraction', () => {
    expect(streakFrom(['2026-02-27', '2026-02-28', '2026-03-01']), 'short February').toBe(3);
    expect(streakFrom(['2026-12-30', '2026-12-31', '2027-01-01']), 'year boundary').toBe(3);
    expect(streakFrom(['2028-02-28', '2028-02-29', '2028-03-01']), 'leap day').toBe(3);
  });

  it('folds degenerate input rather than escaping it', () => {
    const degenerate: readonly string[][] = [
      ['2026-09-27', '2026-09-25', '2026-09-26'],
      ['2026-09-27', '2026-09-27', '2026-09-27'],
      ['2026-09-26', '2026-09-26', '2026-09-27'],
      ['', '2026-09-27'],
      ['not-a-date', '2026-09-27'],
      ['2026-09-27', 'not-a-date'],
    ];
    for (const keys of degenerate) {
      const n = streakFrom(keys);
      expect(Number.isInteger(n), `${JSON.stringify(keys)} must yield an integer, got ${n}`).toBe(
        true,
      );
      expect(n, `${JSON.stringify(keys)} must not go negative`).toBeGreaterThanOrEqual(0);
      expect(n, `${JSON.stringify(keys)} must not exceed the number of stored dates`).toBeLessThanOrEqual(
        keys.length,
      );
    }
  });

  it('never reads a clock: the same array gives the same answer under every zone', () => {
    const stored = ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07'];
    const answers = new Set<number>();
    for (const tz of ['UTC', 'America/Santiago', 'America/Havana', 'Asia/Kathmandu', 'Pacific/Apia']) {
      process.env.TZ = tz;
      answers.add(streakFrom(stored));
    }
    expect(
      answers.size,
      'a walk that read a clock or a duration would disagree with itself across zones',
    ).toBe(1);
    expect([...answers][0], 'and the one answer is the plain count of adjacent dates').toBe(4);
  });
});

describe('endedStreakLength (D-17 / 12-UI-SPEC § The streak-ended line, 12-03)', () => {
  it('gives no value when the previous stored date is exactly one day before — the streak continued', () => {
    expect(
      endedStreakLength(['2026-09-25', '2026-09-26'], '2026-09-27'),
      'the run is unbroken, so nothing ended',
    ).toBeNull();
    expect(
      endedStreakLength(['2026-09-25', '2026-09-26', '2026-09-27'], '2026-09-27'),
      'the shown date being present in the window must not change that',
    ).toBeNull();
  });

  it('gives no value when no earlier date exists — the first date ever', () => {
    expect(endedStreakLength([], '2026-09-27'), 'nothing was ever played').toBeNull();
    expect(
      endedStreakLength(['2026-09-27'], '2026-09-27'),
      'only the shown date is stored, so there is no earlier one',
    ).toBeNull();
    expect(
      endedStreakLength(['2026-10-01'], '2026-09-27'),
      'a later date is not an earlier one',
    ).toBeNull();
  });

  it('gives no value when the derived length is 1 — the >= 2 floor', () => {
    // 09-20 is isolated: the run ending at it is one day long. "Your 1-day streak ended"
    // is not a loss worth stating, and the floor is also what removes the only
    // pluralisation branch in the phase — at n >= 2, `{n}-day` is always correct English.
    expect(
      endedStreakLength(['2026-09-18', '2026-09-20'], '2026-09-27'),
      'the run ending at the previous stored date is one day long',
    ).toBeNull();
  });

  it('counts the consecutive dates ending at the previous stored date when the walk stopped on a genuine gap', () => {
    expect(
      endedStreakLength(['2026-09-01', '2026-09-19', '2026-09-20'], '2026-09-27'),
      'a two-day run ended at 09-20, and 09-01 is the gap that terminates the walk',
    ).toBe(2);
    expect(
      endedStreakLength(
        ['2026-09-01', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'],
        '2026-09-27',
      ),
      'a four-day run ended at 09-20',
    ).toBe(4);
    expect(
      endedStreakLength(
        ['2026-09-01', '2026-09-19', '2026-09-20', '2026-09-27'],
        '2026-09-27',
      ),
      'the shown date being present in the window must not be counted into the ended run',
    ).toBe(2);
  });

  it('gives no value at the window floor — consecutive all the way to the oldest stored key', () => {
    // Every stored date is adjacent to its neighbour right down to the oldest one still
    // in the trimmed window, so the walk never meets a gap. The true length is whatever
    // was trimmed away plus what survived: unknown. 12-UI-SPEC requires the omission.
    const flooredWindow = consecutiveEndingAt('2026-09-20', 5);
    expect(
      streakFrom(flooredWindow),
      'fixture sanity: the window really is consecutive end to end',
    ).toBe(flooredWindow.length);
    expect(
      endedStreakLength(flooredWindow, '2026-09-27'),
      'the walk reached the oldest stored key while still consecutive — not derivable',
    ).toBeNull();
  });

  it('at the window floor never substitutes the seeded lifetime longest streak', () => {
    // The partner to the case above. That one asserts the omission; this one asserts the
    // omission is not a number — specifically not SEEDED_LIFETIME_LONGEST, which is what
    // an implementation reaching for `longestStreak` when it cannot derive a length would
    // return. Without this partner, that wrong implementation passes the case above only
    // if it happens to return null, and fails silently in the UI if it does not.
    for (const windowLength of [2, 3, 5, 8, 13]) {
      const flooredWindow = consecutiveEndingAt('2026-09-20', windowLength);
      const got = endedStreakLength(flooredWindow, '2026-09-27');
      expect(
        got,
        `window floor at length ${windowLength} must not report the lifetime longest streak`,
      ).not.toBe(SEEDED_LIFETIME_LONGEST);
      expect(
        got,
        `window floor at length ${windowLength} must not report the surviving window length either`,
      ).not.toBe(windowLength);
      expect(got, `window floor at length ${windowLength} omits the line entirely`).toBeNull();
    }
    expect(
      SEEDED_LIFETIME_LONGEST,
      'the seed must stay distinct from every window length above, or it proves nothing',
    ).toBeGreaterThan(13);
  });

  it('reports a run that ended before a long gap, across a month boundary', () => {
    expect(
      endedStreakLength(
        ['2026-07-04', '2026-08-30', '2026-08-31', '2026-09-01'],
        '2026-09-27',
      ),
      'the run 08-30..09-01 ended, and 07-04 is the gap that terminates the walk',
    ).toBe(3);
  });
});
