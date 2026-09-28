/**
 * N-DAILY-02 / D-06 / D-07 / D-15 / D-16 — a date closes once, and the three values that
 * must outlive the trimmed window do.
 *
 * D-16 is the reason this file exists. The daily history is a bounded window (D-15), so
 * anything derived from it alone is capped at the window size — and a lifetime achievement
 * that silently stops growing is the failure D-16 was written to prevent. Three stored
 * values carry past the window: `longestStreak`, `totalDaysPlayed` and
 * `currentStreakStart`. The bounded case below overshoots the window by 50 dates
 * specifically so a "recomputed from what survived" implementation cannot pass it.
 *
 * `currentStreakStart` is an amendment to D-16, taken at plan 12-03's blocking decision
 * checkpoint with the developer's approval. Its justification is measured and recorded in
 * `12-03-SUMMARY.md`: with only the two original scalars, `longestStreak` saturates at
 * `DAILY_HISTORY_BOUND + 1` and can never report a longer run, which defeats D-16's own
 * stated purpose. A third stored DATE — not a counter — makes the current streak exactly
 * derivable and unbounded while keeping SC-3's "computed from stored dates rather than an
 * incrementing counter that a crash could corrupt".
 *
 * Analog: `tests/storage.endless-firewall.test.ts` — the store-level assertion style
 * (`:56-70`), asserting what a CALLER observes through `getSnapshot()` rather than what a
 * merge helper returns. The write path is exercised through `createMemoryProgressStore`
 * for that reason. Two things cannot be reached that way and are exercised directly on
 * `mergeDailyRecord` / `mergeTelemetryBlobs`, which is stated at each case: the
 * no-mutation guarantee (it is a claim about the helper's inputs) and the tamper cases
 * (a store offers no way to write a hostile `currentStreakStart`).
 *
 * The AsyncStorage twin is deliberately NOT covered here — `tests/storage.daily-firewall.test.ts`
 * (plan 12-02) owns it. Note that `sanitizeTelemetry` (`parseBlob.ts`) does not yet read
 * `telemetry.daily` at all, so the record does not survive a serialise/parse round trip;
 * `sanitizeDailyRecord` is plan 12-04's task and MUST learn `currentStreakStart` when it
 * lands. That gap is why these cases use the memory store, which does not serialise.
 */
import { describe, it, expect } from 'vitest';
import {
  DAILY_HISTORY_BOUND,
  DAILY_STREAK_WALK_CAP,
  createMemoryProgressStore,
  currentDailyStreak,
  defaultRunStatsInput,
  defaultTelemetryBlob,
  mergeDailyRecord,
  mergeTelemetryBlobs,
  parseProgressResult,
  type DailyRecord,
  type ProgressStore,
  type RunOutcome,
  type RunStatsInput,
  type TelemetryBlob,
} from '../src/services/storage';
import { hasResultFor, previousDateKey, streakFrom } from '../src/services/daily';

/** All-zero per-run counters — only the fields a case cares about are set. */
function runStats(over: Partial<RunStatsInput> = {}): RunStatsInput {
  return { ...defaultRunStatsInput(), ...over };
}

/**
 * `DAILY_HISTORY_BOUND + 50` — the overshoot the bounded case walks. Stated as the bound
 * plus a margin rather than as a literal so it tracks the constant: the case's whole
 * point is that the scalars exceed the window, and a hard-coded 450 would stop proving
 * that the moment the bound were re-tuned.
 */
const OVERSHOOT = DAILY_HISTORY_BOUND + 50;

/** Build `n` consecutive keys ending at `end`, ascending. Adjacency is the phase's own. */
function consecutiveEndingAt(end: string, n: number): string[] {
  const out: string[] = [end];
  for (let i = 1; i < n; i++) {
    out.unshift(previousDateKey(out[0]!));
  }
  return out;
}

/**
 * Days from `start` to `end` inclusive, by the phase's own calendar walk.
 *
 * Used only to build fixtures that are INTERNALLY CONSISTENT: a record carrying a
 * `currentStreakStart` also has to carry a `totalDaysPlayed` large enough to have closed
 * that many dates, because `carriedStartIsCredible` now holds the claim to that bound.
 * Derived rather than hard-coded so the fixtures cannot drift out of agreement with the
 * adjacency rule they are built from.
 */
function inclusiveSpan(start: string, end: string): number {
  let cursor = end;
  let days = 1;
  while (cursor !== start) {
    cursor = previousDateKey(cursor);
    days++;
  }
  return days;
}

/** Close `date` through a real store, exactly as a finished daily run does. */
function closeDate(
  store: ProgressStore,
  date: string,
  outcome: RunOutcome = 'win',
  score = 1_000,
): void {
  store.recordRunEnd({
    mode: 'daily',
    date,
    score,
    outcome,
    livesRemaining: 2,
    stats: runStats({ bricksBroken: 40, ticksPlayed: 5_000 }),
  });
}

/** The daily record a caller observes. */
async function dailyOf(store: ProgressStore): Promise<DailyRecord> {
  return (await store.getSnapshot()).telemetry.daily;
}

/** A telemetry blob carrying a hand-built daily record — for the tamper cases only. */
function blobWithDaily(daily: DailyRecord): TelemetryBlob {
  const t = defaultTelemetryBlob();
  t.daily = daily;
  return t;
}

/** A daily record from a list of closed dates, with the scalars supplied explicitly. */
function recordOf(
  dates: readonly string[],
  over: Partial<Omit<DailyRecord, 'history'>> = {},
): DailyRecord {
  return {
    history: dates.map((date) => ({ date, score: 100, outcome: 'win' as const })),
    longestStreak: over.longestStreak ?? dates.length,
    totalDaysPlayed: over.totalDaysPlayed ?? dates.length,
    currentStreakStart: over.currentStreakStart ?? (dates[0] ?? ''),
  };
}

describe('closing a date through the store (D-06 / D-07 / N-DAILY-02, 12-03)', () => {
  it('a win on a new date appends it and counts the day', async () => {
    const store = createMemoryProgressStore();
    closeDate(store, '2026-09-27');
    const daily = await dailyOf(store);
    expect(daily.history.map((e) => e.date), 'the date is in the history').toEqual([
      '2026-09-27',
    ]);
    expect(daily.totalDaysPlayed, 'one date closed is one day played').toBe(1);
    expect(daily.longestStreak, 'a first date is a one-day streak').toBe(1);
    expect(daily.currentStreakStart, 'the run starts at the date just closed').toBe(
      '2026-09-27',
    );
  });

  it('recording the same date twice replaces the entry and does not double-count the day', async () => {
    const store = createMemoryProgressStore();
    closeDate(store, '2026-09-27', 'win', 1_000);
    closeDate(store, '2026-09-27', 'lose', 2_500);
    const daily = await dailyOf(store);
    expect(daily.history.length, 'D-06: one attempt per date, so one entry').toBe(1);
    expect(daily.history[0]?.score, 'the second write REPLACED the first in place').toBe(2_500);
    expect(daily.history[0]?.outcome, 'and replaced its outcome too').toBe('lose');
    expect(daily.totalDaysPlayed, 'a repeated write is idempotent for the day count').toBe(1);
    expect(daily.longestStreak, 'and for the streak').toBe(1);
  });

  it('a lose closes the date exactly as a win does — the streak counts dates played (D-13)', async () => {
    const store = createMemoryProgressStore();
    closeDate(store, '2026-09-25', 'lose');
    closeDate(store, '2026-09-26', 'lose');
    closeDate(store, '2026-09-27', 'win');
    const daily = await dailyOf(store);
    expect(daily.history.length, 'all three dates closed regardless of outcome').toBe(3);
    expect(daily.longestStreak, 'two losses and a win are a three-day streak').toBe(3);
    expect(daily.totalDaysPlayed, 'and three days played').toBe(3);
  });

  it('an abandoned run accumulates telemetry but abandoned leaves open the date (D-07 / D-09)', async () => {
    const store = createMemoryProgressStore();
    closeDate(store, '2026-09-26', 'win');
    const before = await dailyOf(store);

    closeDate(store, '2026-09-27', 'abandoned');
    const after = await dailyOf(store);

    expect(after.history.length, 'an abandoned run does not append to the history').toBe(
      before.history.length,
    );
    expect(
      after.history.some((e) => e.date === '2026-09-27'),
      'the abandoned date is not stored, so it is still playable (D-01)',
    ).toBe(false);
    expect(after.totalDaysPlayed, 'and does not count as a day played').toBe(
      before.totalDaysPlayed,
    );
    expect(after.longestStreak, 'nor move the streak').toBe(before.longestStreak);
    expect(after.currentStreakStart, 'nor the run start').toBe(before.currentStreakStart);

    // The other half of D-09: the run DID accumulate mode-keyed telemetry. Without this
    // the case above is equally satisfied by a daily arm that does nothing at all.
    const snapshot = await store.getSnapshot();
    expect(
      snapshot.telemetry.lifetime.runsAbandoned,
      'the abandoned run still reached the shared aggregate path',
    ).toBe(1);
  });

  it('longestStreak rises with the current streak and never falls', async () => {
    const store = createMemoryProgressStore();
    for (const date of ['2026-09-01', '2026-09-02', '2026-09-03']) {
      closeDate(store, date);
    }
    expect((await dailyOf(store)).longestStreak, 'a three-day run').toBe(3);

    // A gap, then a single isolated date: the CURRENT streak is 1, the lifetime best is 3.
    closeDate(store, '2026-09-20');
    const daily = await dailyOf(store);
    expect(daily.longestStreak, 'the lifetime best must not fall when a streak breaks').toBe(3);
    expect(daily.currentStreakStart, 'but the current run restarts at the new date').toBe(
      '2026-09-20',
    );
    expect(daily.totalDaysPlayed, 'four dates closed in total').toBe(4);
  });

  it('hardens every incoming number: a non-finite or negative score lands as a non-negative integer', async () => {
    const store = createMemoryProgressStore();
    const hostile = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, -9_999, 12.7];
    const dates = consecutiveEndingAt('2026-09-27', hostile.length);
    dates.forEach((date, i) => closeDate(store, date, 'win', hostile[i]!));

    const daily = await dailyOf(store);
    for (const entry of daily.history) {
      expect(
        Number.isInteger(entry.score),
        `${entry.date} stored a non-integer score ${entry.score}`,
      ).toBe(true);
      expect(entry.score, `${entry.date} stored a negative score`).toBeGreaterThanOrEqual(0);
    }
    expect(daily.history.at(-1)?.score, '12.7 floors to 12 rather than being discarded').toBe(12);
  });
});

describe('the bounded window and the scalars that outlive it (D-15 / D-16, 12-03)', () => {
  it('bounded: the history stops at the bound while the scalars keep counting past it', async () => {
    const store = createMemoryProgressStore();
    const dates = consecutiveEndingAt('2027-06-01', OVERSHOOT);
    for (const date of dates) {
      closeDate(store, date);
    }
    const daily = await dailyOf(store);

    // All three together — any one alone is satisfiable by a broken implementation.
    expect(daily.history.length, 'the history is trimmed to the bound on write').toBe(
      DAILY_HISTORY_BOUND,
    );
    expect(
      daily.history.some((e) => e.date === dates[0]),
      'the OLDEST dates are the ones that went',
    ).toBe(false);
    expect(daily.history.at(-1)?.date, 'and the newest survived').toBe(dates.at(-1));
    expect(
      daily.totalDaysPlayed,
      'the day count still reflects every date ever closed, not the survivors',
    ).toBe(OVERSHOOT);

    // The direct proof the streak is not recomputed from what survived: a window of
    // DAILY_HISTORY_BOUND entries cannot derive a streak longer than itself.
    expect(daily.longestStreak, 'the lifetime streak counts every consecutive date').toBe(
      OVERSHOOT,
    );
    expect(
      daily.longestStreak,
      'and therefore exceeds the window it could have been recomputed from',
    ).toBeGreaterThan(daily.history.length);
    expect(
      streakFrom(daily.history.map((e) => e.date)),
      'the window alone derives only the window length — which is exactly the ceiling ' +
        'that made the third stored date necessary',
    ).toBe(DAILY_HISTORY_BOUND);
    expect(daily.currentStreakStart, 'the run start is the first date ever closed').toBe(
      dates[0],
    );
  });
});

describe('currentStreakStart self-correction (D-16 amendment, 12-03)', () => {
  it('discards a tampered start when the window shows a genuine gap', () => {
    // The window has a real gap (09-10 then 09-25), so the run start is EXACTLY derivable
    // from stored dates and the stored claim is evidence about nothing. Derivable beats
    // carried, always — that is the contract.
    const tampered = recordOf(['2026-09-10', '2026-09-25', '2026-09-26'], {
      currentStreakStart: '1999-01-01',
      longestStreak: 3,
      totalDaysPlayed: 3,
    });
    const next = mergeDailyRecord(blobWithDaily(tampered), {
      date: '2026-09-27',
      score: 500,
      outcome: 'win',
    });
    expect(
      next.daily.currentStreakStart,
      'the gap at 09-10 makes 09-25 the derivable start; the stored 1999 claim is discarded',
    ).toBe('2026-09-25');
    expect(next.daily.longestStreak, 'and the streak is the derived 3, not a 1999-sized number').toBe(
      3,
    );
  });

  it('replaces a start LATER than the derivable one — a start cannot postdate its own run', () => {
    const wrong = recordOf(['2026-09-10', '2026-09-25', '2026-09-26'], {
      currentStreakStart: '2026-09-26',
      longestStreak: 1,
      totalDaysPlayed: 3,
    });
    const next = mergeDailyRecord(blobWithDaily(wrong), {
      date: '2026-09-27',
      score: 500,
      outcome: 'win',
    });
    expect(
      next.daily.currentStreakStart,
      'the window proves the run reaches back to 09-25',
    ).toBe('2026-09-25');
    expect(next.daily.longestStreak, 'so the streak is 3').toBe(3);
  });

  it('degrades DOWNWARD, never inflating, when the stored start exceeds the walk cap', () => {
    // A start this old implies a streak of roughly 740 000 days. The cap is a TAMPER
    // fence, not a streak ceiling: exceeding it proves the value is not a real run, so
    // the honest response is to discard it and fall back to what the window can derive.
    // Saturating AT the cap would report ~36 525 days of daily play that never happened.
    const window = consecutiveEndingAt('2026-09-26', 5);
    const tampered = recordOf(window, {
      currentStreakStart: '0001-01-01',
      longestStreak: 0,
      totalDaysPlayed: window.length,
    });
    const started = Date.now();
    const next = mergeDailyRecord(blobWithDaily(tampered), {
      date: '2026-09-27',
      score: 500,
      outcome: 'win',
    });
    const elapsed = Date.now() - started;

    expect(
      next.daily.longestStreak,
      'the streak must not inflate towards the cap on a hostile start',
    ).toBe(window.length + 1);
    expect(
      next.daily.longestStreak,
      'and specifically must not BE the cap',
    ).toBeLessThan(DAILY_STREAK_WALK_CAP);
    expect(
      next.daily.currentStreakStart,
      'the start falls back to the oldest date the window can vouch for',
    ).toBe(window[0]);
    expect(elapsed, 'and the walk terminates rather than running to the epoch').toBeLessThan(
      2_000,
    );
  });

  it('rejects a malformed start outright rather than walking from garbage', () => {
    for (const bad of ['', 'not-a-date', '2026-13-45', '0NaN-NaN-NaN']) {
      const window = consecutiveEndingAt('2026-09-26', 3);
      const record = recordOf(window, { currentStreakStart: bad, longestStreak: 0 });
      const next = mergeDailyRecord(blobWithDaily(record), {
        date: '2026-09-27',
        score: 1,
        outcome: 'win',
      });
      expect(
        next.daily.currentStreakStart,
        `a start of ${JSON.stringify(bad)} must be replaced by the derivable one`,
      ).toBe(window[0]);
      expect(next.daily.longestStreak, `and the streak derived from the window`).toBe(
        window.length + 1,
      );
    }
  });

  it('never reports a run longer than the number of dates the record says were ever closed', () => {
    // THE INVARIANT, stated rather than the implementation tested: a streak counts closed
    // dates and every close increments `totalDaysPlayed`, so no record can be on a run
    // longer than its own day count. A carried start that claims otherwise is inconsistent
    // with the record carrying it and must not be believed.
    //
    // This is the shape of the defect, not an off-by-one: `sanitizeDailyHistoryEntry` drops
    // history ENTRY BY ENTRY while `currentStreakStart` survives WHOLE, so any rejection —
    // tamper, a truncated write, a field an older build never wrote — leaves a short but
    // consecutive window beside an ancient claim, which is exactly the floored condition
    // the carried start is trusted on. MEASURED on the code before the bound: read side
    // 2463, and the next close persisted `longestStreak: 2464` — one-way under D-16.
    const record = recordOf(['2026-09-27', '2026-09-28'], {
      currentStreakStart: '2020-01-01',
      longestStreak: 2,
      totalDaysPlayed: 2,
    });

    expect(
      currentDailyStreak(record),
      'the panel must not show a streak the record cannot have earned',
    ).toBeLessThanOrEqual(record.totalDaysPlayed);
    expect(currentDailyStreak(record), 'specifically, the two dates it can prove').toBe(2);

    // The write side independently: `longestStreak` is the one-way scalar, and it can only
    // ever be raised from this same derivation. Checking it separately is the point — a fix
    // that only calmed the display would still burn the number into storage.
    const next = mergeDailyRecord(blobWithDaily(record), {
      date: '2026-09-29',
      score: 500,
      outcome: 'win',
    });
    expect(
      next.daily.longestStreak,
      'the one-way lifetime best must not be raised from an unbelievable claim',
    ).toBeLessThanOrEqual(next.daily.totalDaysPlayed);
    expect(next.daily.longestStreak, 'three dates closed, three days of streak').toBe(3);
    expect(
      next.daily.currentStreakStart,
      'and the discard falls back to the window-derived start, as every other discard does',
    ).toBe('2026-09-27');
  });

  it('still carries the start of a genuine run longer than the window — the bound does not bite the case D-16 exists for', () => {
    // The control that makes the case above non-vacuous. A player on a real OVERSHOOT-day
    // run has closed OVERSHOOT dates, so `totalDaysPlayed` is OVERSHOOT and a start that
    // many days back is admitted — even though only DAILY_HISTORY_BOUND dates survive the
    // window and `streakFrom` over them saturates at the bound.
    const dates = consecutiveEndingAt('2027-06-01', OVERSHOOT);
    const record = recordOf(dates.slice(-DAILY_HISTORY_BOUND), {
      currentStreakStart: dates[0],
      longestStreak: OVERSHOOT,
      totalDaysPlayed: OVERSHOOT,
    });

    expect(
      currentDailyStreak(record),
      'the carried start is believed, because the record can account for every day of it',
    ).toBe(OVERSHOOT);
    expect(
      currentDailyStreak(record),
      'and it exceeds the window it could have been recomputed from',
    ).toBeGreaterThan(record.history.length);
    expect(
      streakFrom(record.history.map((e) => e.date)),
      'fixture sanity: the window alone saturates at the bound, which is why D-16 stores a date',
    ).toBe(DAILY_HISTORY_BOUND);

    // And the bound is exactly tight, not merely generous: one fewer day closed than the
    // claim needs, and the same start is no longer credible.
    const short = { ...record, totalDaysPlayed: OVERSHOOT - 1 };
    expect(
      currentDailyStreak(short),
      'one day short of accounting for the claim, and the window-derived start stands',
    ).toBe(DAILY_HISTORY_BOUND);
  });

  it('never reports a run longer than the evidence, when the day COUNT is the thing that was raised', () => {
    // THE INVARIANT, stated rather than the implementation tested: a record whose window
    // was never full has never been trimmed, so the dates it holds are the whole of its
    // evidence and no claim may reach back past them — whatever number the record reports
    // about itself.
    //
    // The sibling case above holds the claim to `totalDaysPlayed`. This one holds
    // `totalDaysPlayed` to something, because it is a carried scalar with nothing behind
    // it: `sanitizeDailyRecord` copies it WHOLE through `safeCounter` while it drops
    // history ENTRY BY ENTRY. Raise it and the bound above opens. MEASURED before the
    // saturation gate, at the same numbers the case above reports: read side 2463, and the
    // next close persisted `longestStreak: 2464` — one-way under D-16.
    const window = consecutiveEndingAt('2026-09-28', 3);
    const record = recordOf(window, {
      currentStreakStart: '2020-01-01',
      longestStreak: 3,
      totalDaysPlayed: 3_000,
    });

    expect(
      currentDailyStreak(record),
      'a window that was never full is all the evidence there is, so the three dates it proves',
    ).toBe(3);
    expect(
      record.history.length,
      'fixture sanity: the window is nowhere near the bound, so nothing was ever trimmed from it',
    ).toBeLessThan(DAILY_HISTORY_BOUND);

    // The write side independently — `longestStreak` is the permanent one, and a fix that
    // only calmed the display would still burn the number into storage.
    const next = mergeDailyRecord(blobWithDaily(record), {
      date: '2026-09-29',
      score: 500,
      outcome: 'win',
    });
    expect(
      next.daily.longestStreak,
      'the one-way lifetime best must not be raised from a claim only a counter vouches for',
    ).toBe(4);
    expect(
      next.daily.currentStreakStart,
      'and the discard falls back to the window-derived start, as every other discard does',
    ).toBe(window[0]);
  });

  it('holds that line across the parse boundary, where the evidence was DAMAGED rather than absent', () => {
    // The end-to-end shape the fence exists for, and the one a unit fixture cannot claim to
    // have covered: entries dropped by `sanitizeDailyHistoryEntry` — a truncated write, a
    // malformed field, a field an older build never wrote — leave a SHORT but consecutive
    // window beside scalars that survived whole. That is the floored condition the carried
    // start is trusted on, reached by corruption rather than by tampering.
    const window = consecutiveEndingAt('2026-09-28', 3);
    const unreadable = Array.from({ length: 100 }, () => ({
      date: '2026-02-30',
      score: 1,
      outcome: 'win',
    }));
    const parsed = parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: [],
        bestByLevel: {},
        bestScore: 0,
        updatedAt: 0,
        telemetry: {
          ...defaultTelemetryBlob(),
          daily: {
            history: [...unreadable, ...window.map((date) => ({ date, score: 10, outcome: 'win' }))],
            longestStreak: 3,
            totalDaysPlayed: 3_000,
            currentStreakStart: '2020-01-01',
          },
        },
      }),
    );

    expect(parsed.status, 'a damaged daily record degrades daily alone').toBe('ok');
    const daily = parsed.progress.telemetry.daily;
    expect(
      daily.history.length,
      'fixture sanity: 100 entries really were dropped, leaving three consecutive dates',
    ).toBe(3);
    expect(
      currentDailyStreak(daily),
      'the panel shows what survived, not what the undamaged scalars still claim',
    ).toBe(3);

    const next = mergeDailyRecord(blobWithDaily(daily), {
      date: '2026-09-29',
      score: 500,
      outcome: 'win',
    });
    expect(
      next.daily.longestStreak,
      'and the close after the damage writes four, not a number no later release could repair',
    ).toBe(4);
  });
});

describe('mergeDailyRecord does not mutate its input (12-03)', () => {
  it('returns a new blob and leaves the input byte-identical', () => {
    const input = blobWithDaily(recordOf(['2026-09-25', '2026-09-26']));
    const snapshot = structuredClone(input);
    const next = mergeDailyRecord(input, { date: '2026-09-27', score: 700, outcome: 'win' });

    expect(input, 'the input blob must be untouched by the merge').toEqual(snapshot);
    expect(next, 'and the result must be a different object').not.toBe(input);
    expect(next.daily.history.length, 'the result carries the new date').toBe(3);
  });
});

describe('mergeDailyRecords reconcile — max-and-union (12-03 checkpoint decision)', () => {
  it('maxes longestStreak and unions the history without double-counting a shared date', () => {
    const a = blobWithDaily(
      recordOf(['2026-09-01', '2026-09-02'], { longestStreak: 9, totalDaysPlayed: 2 }),
    );
    const b = blobWithDaily(
      recordOf(['2026-09-02', '2026-09-03'], { longestStreak: 4, totalDaysPlayed: 2 }),
    );
    const merged = mergeTelemetryBlobs(a, b);

    expect(
      merged.daily.history.map((e) => e.date),
      'the union holds three distinct dates, sorted, with 09-02 counted once',
    ).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
    expect(merged.daily.longestStreak, 'longestStreak is an "ever" field and takes the max').toBe(
      9,
    );
    expect(
      merged.daily.totalDaysPlayed,
      'the count is the union size (3), not the sum (4) which would double-count 09-02',
    ).toBe(3);
  });

  it('never drops a date only one side holds', () => {
    const a = blobWithDaily(recordOf(['2026-09-01'], { totalDaysPlayed: 1, longestStreak: 1 }));
    const b = blobWithDaily(recordOf(['2026-09-20'], { totalDaysPlayed: 1, longestStreak: 1 }));
    const merged = mergeTelemetryBlobs(a, b);
    expect(
      merged.daily.totalDaysPlayed,
      'a per-field MAX would report 1 and silently lose the other device’s date',
    ).toBe(2);
  });

  it('derives currentStreakStart from the union when the union shows a gap, discarding both claims', () => {
    // The two copies disagree AND the union has a gap between them. Neither stored claim
    // survives: the union proves the current run begins at 09-25.
    const a = blobWithDaily(
      recordOf(['2026-09-01', '2026-09-25'], { currentStreakStart: '2026-09-01' }),
    );
    const b = blobWithDaily(
      recordOf(['2026-09-25', '2026-09-26'], { currentStreakStart: '2026-09-25' }),
    );
    const merged = mergeTelemetryBlobs(a, b);

    expect(
      merged.daily.history.map((e) => e.date),
      'fixture sanity: the union really does have a gap between 09-01 and 09-25',
    ).toEqual(['2026-09-01', '2026-09-25', '2026-09-26']);
    expect(
      merged.daily.currentStreakStart,
      'the gap makes the start derivable, so the earlier 09-01 claim is discarded',
    ).toBe('2026-09-25');
  });

  it('carries the earlier stored start only when the union is consecutive end to end', () => {
    // The union is SATURATED at the bound, so trimming is available to explain the days it
    // does not hold and a claim reaching back past it is admissible at all — otherwise the
    // case would pass on the saturation gate rather than on the thing it names. Both
    // copies have also closed enough dates for their own claim, so the length bound is
    // silent too and the case tests what it says it tests: earliest-admissible-claim-wins.
    const full = consecutiveEndingAt('2027-06-01', OVERSHOOT);
    const window = full.slice(-DAILY_HISTORY_BOUND);
    const earlier = full[0]!;
    const later = full[25]!;
    const a = blobWithDaily(
      recordOf(window, {
        currentStreakStart: earlier,
        totalDaysPlayed: inclusiveSpan(earlier, '2027-06-01'),
      }),
    );
    const b = blobWithDaily(
      recordOf(window, {
        currentStreakStart: later,
        totalDaysPlayed: inclusiveSpan(later, '2027-06-01'),
      }),
    );
    const merged = mergeTelemetryBlobs(a, b);

    expect(
      streakFrom(merged.daily.history.map((e) => e.date)),
      'fixture sanity: the union is consecutive end to end, so it can contradict nothing',
    ).toBe(window.length);
    expect(
      window.length,
      'fixture sanity: and it is full, so a claim reaching back past it is admissible at all',
    ).toBe(DAILY_HISTORY_BOUND);
    expect(
      merged.daily.currentStreakStart,
      'with the union silent, the earlier surviving claim is carried',
    ).toBe(earlier);
  });

  it('discards BOTH claims when neither copy has closed enough dates to support its own', () => {
    // The same fixture as above with one number changed on each copy: a full window, two
    // claims reaching back past it, and day counts that stop at the window. Neither copy
    // can have been on that run, so the union-derived start stands for both — the
    // under-reporting direction.
    const full = consecutiveEndingAt('2027-06-01', OVERSHOOT);
    const window = full.slice(-DAILY_HISTORY_BOUND);
    const a = blobWithDaily(
      recordOf(window, { currentStreakStart: full[0], totalDaysPlayed: DAILY_HISTORY_BOUND }),
    );
    const b = blobWithDaily(
      recordOf(window, { currentStreakStart: full[25], totalDaysPlayed: DAILY_HISTORY_BOUND }),
    );
    const merged = mergeTelemetryBlobs(a, b);

    expect(
      merged.daily.currentStreakStart,
      'no claim survives its own record, so the union-derived start is all that is left',
    ).toBe(window[0]);
    expect(
      currentDailyStreak(merged.daily),
      'and the streak is the window, never the claim',
    ).toBe(window.length);
  });

  it('does not let one copy’s day count vouch for the other copy’s claim', () => {
    // THE INVARIANT, stated rather than the implementation tested: a claim is evidence
    // about the record that MADE it, so the record that made it is what must be able to
    // account for it. The merged total is `max(a, b, |union|)`, so holding both claims to
    // it launders an incredible claim through whichever copy happens to carry a big number.
    //
    // The window is deliberately SATURATED, so the saturation gate is silent here and the
    // only thing that can reject A's claim is A's own day count. A sub-saturated fixture
    // would pass on the gate and pin nothing about whose total is asked. `mergeTelemetryBlobs`
    // is live on the hydrate path (`watermark.ts`), so this is not a dead helper.
    const full = consecutiveEndingAt('2027-06-01', OVERSHOOT);
    const window = full.slice(-DAILY_HISTORY_BOUND);
    // A reaches back past its own window but has only ever closed the window's worth of
    // dates, so it cannot account for its claim. B makes no old claim and carries a large
    // count. Neither record, alone, reads more than the window.
    const a = blobWithDaily(
      recordOf(window, { currentStreakStart: full[0], totalDaysPlayed: DAILY_HISTORY_BOUND }),
    );
    const b = blobWithDaily(recordOf(window, { totalDaysPlayed: 3_000 }));

    expect(
      currentDailyStreak(a.daily),
      'fixture sanity: A alone cannot account for its own claim, so it reads its window',
    ).toBe(DAILY_HISTORY_BOUND);
    expect(
      currentDailyStreak(b.daily),
      'fixture sanity: B alone makes no claim past its window, so it reads its window',
    ).toBe(DAILY_HISTORY_BOUND);

    const merged = mergeTelemetryBlobs(a, b);
    expect(
      currentDailyStreak(merged.daily),
      'merging two records that each read the window cannot produce a run neither was on',
    ).toBe(DAILY_HISTORY_BOUND);
    expect(
      merged.daily.currentStreakStart,
      'A’s claim is held to A’s own closed dates, not to B’s three thousand',
    ).toBe(window[0]);
  });

  it('judges each copy’s claim on that copy’s own evidence, never on the union’s', () => {
    // THE INVARIANT, stated rather than the implementation tested: a record's claim is
    // judged on THAT RECORD'S OWN evidence. The union decides the merged HISTORY; it is
    // never evidence for a claim that did not come from it.
    //
    // Why this case and not the one above it. That case gives BOTH copies the same
    // saturated window, so it is structurally unable to fail on the union: there is no
    // difference between "the claimant's window" and "the union" for it to detect. Here the
    // two copies have DIFFERENT windows, and the copy making the outrageous claim has the
    // small one.
    //
    // MEASURED on the code before the fix: A alone reads 450, B alone reads 2, and merged
    // they read 2709 — the merge admitted B's claim because B borrowed A's saturated window
    // to clear the saturation question while clearing the day-count question with its own
    // inflated counter. Each guard was defeated by a different side. The next close would
    // then have persisted 2709 into `longestStreak`, which is one-way (D-16) and repairable
    // only by a migration.
    //
    // A is a wholly legitimate, undamaged 450-day player, so unlike the accepted costs in
    // `docs/ops/DAILY-CHALLENGE.md` there is no reading in which the inflated number is
    // correct: the true streak is 450 and nothing about B can change that.
    const full = consecutiveEndingAt('2027-06-01', OVERSHOOT);
    const window = full.slice(-DAILY_HISTORY_BOUND);
    const genuineStart = full[0]!;

    const a = blobWithDaily(
      recordOf(window, {
        currentStreakStart: genuineStart,
        totalDaysPlayed: inclusiveSpan(genuineStart, '2027-06-01'),
        longestStreak: OVERSHOOT,
      }),
    );
    // Exactly the shape the saturation rule rejects on its own: a claim reaching back years
    // behind a window of two dates, propped up by a hand-written day count.
    const b = blobWithDaily(
      recordOf(window.slice(-2), { currentStreakStart: '2020-01-01', totalDaysPlayed: 3_000 }),
    );

    expect(
      currentDailyStreak(a.daily),
      'fixture sanity: A is a legitimate 450-day player and reads its true streak alone',
    ).toBe(OVERSHOOT);
    expect(
      currentDailyStreak(b.daily),
      'fixture sanity: B’s claim is refused alone — its own window is nowhere near full',
    ).toBe(2);
    expect(
      b.daily.history.length,
      'fixture sanity: and B’s window is sub-saturated, which is what it must borrow past',
    ).toBeLessThan(DAILY_HISTORY_BOUND);

    const merged = mergeTelemetryBlobs(a, b);
    expect(
      merged.daily.currentStreakStart,
      'B’s claim is judged on B’s two dates, so it dies; A’s genuine start is what carries',
    ).toBe(genuineStart);
    expect(
      currentDailyStreak(merged.daily),
      'meeting a liar cannot lengthen an honest streak, nor shorten it',
    ).toBe(OVERSHOOT);
    expect(
      currentDailyStreak(mergeTelemetryBlobs(b, a).daily),
      'and the answer cannot depend on which copy is the memory side',
    ).toBe(OVERSHOOT);

    // The write path is where an inflated streak becomes permanent, so trace it: closing the
    // next date on the merged record must not persist anything past the honest run.
    const closed = mergeDailyRecord(merged, {
      date: '2027-06-02',
      score: 500,
      outcome: 'win',
    });
    expect(
      closed.daily.longestStreak,
      'the one-way scalar takes the honest run plus the day just closed, and nothing more',
    ).toBe(OVERSHOOT + 1);
  });

  it('under-counts rather than inflates when a trimmed copy meets one holding exclusive dates', () => {
    // The documented limit of max-and-union, asserted rather than only described. Copy A
    // has played 500 dates but its window holds the newest 400; copy B holds 10 dates A
    // has never seen. The true total is 510; the union can only see 410, so the rule
    // reports A's carried 500. It loses B's 10 — and it never inflates.
    const aDates = consecutiveEndingAt('2027-06-01', DAILY_HISTORY_BOUND);
    const bDates = consecutiveEndingAt('2020-03-10', 10);
    const a = blobWithDaily(recordOf(aDates, { totalDaysPlayed: 500, longestStreak: 500 }));
    const b = blobWithDaily(recordOf(bDates, { totalDaysPlayed: 10, longestStreak: 10 }));
    const merged = mergeTelemetryBlobs(a, b);

    expect(
      merged.daily.totalDaysPlayed,
      'max(500, 10, |union| = 410) is 500 — B’s 10 exclusive dates are lost',
    ).toBe(500);
    expect(
      merged.daily.totalDaysPlayed,
      'the true total is 510, so the rule UNDER-counts here and must never be called lossless',
    ).toBeLessThan(510);
    expect(
      merged.daily.totalDaysPlayed,
      'but it never inflates past the truth, which is the direction that matters',
    ).toBeLessThanOrEqual(510);
  });
});

/**
 * The read-side fence, from the caller's side (T-12-15 / D-01 / 12-UI-SPEC § Storage-failure,
 * plan 12-04).
 *
 * `tests/storage.progress-v4.test.ts` owns `sanitizeDailyRecord`'s case-by-case table. This
 * file owns the consequence a PLAYER sees, which is the claim 12-UI-SPEC actually made: an
 * entry that cannot be read means the date it named has no stored result, and a date with no
 * stored result is playable (D-01).
 *
 * Both halves are asserted in one case on purpose. An implementation that dropped the entry
 * but somehow left its date reading as closed would satisfy the first half alone and lock a
 * player out of their day — which is exactly the failure the UI-SPEC rejected in writing when
 * it accepted the opposite cost (a transient fault handing a player a second attempt).
 */
describe('a tampered blob supplying an invalid key (T-12-15 / D-01, 12-04)', () => {
  it('drops the entry with an invalid key and leaves that date with no stored result — the playable direction', () => {
    const hostile = '9'.repeat(4_000);
    const raw = JSON.stringify({
      v: 4,
      unlocked: [],
      bestByLevel: {},
      bestScore: 0,
      updatedAt: 0,
      telemetry: {
        ...defaultTelemetryBlob(),
        daily: {
          history: [
            { date: hostile, score: 5_000, outcome: 'win' },
            { date: '2026-02-30', score: 5_000, outcome: 'win' },
            { date: '2026-09-27', score: 1_200, outcome: 'win' },
          ],
          longestStreak: 1,
          totalDaysPlayed: 1,
          currentStreakStart: '2026-09-27',
        },
      },
    });

    const parsed = parseProgressResult(raw);
    expect(
      parsed.status,
      'a hostile daily entry must degrade daily alone and never make the blob read as corrupt',
    ).toBe('ok');

    const keys = parsed.progress.telemetry.daily.history.map((e) => e.date);

    // Half one — the entries are ABSENT. Dropped, not truncated and not repaired: no prefix
    // of the 4 000-character key survives anywhere in the record, so nothing of it can reach
    // the panel that renders a stored key verbatim.
    expect(keys).toEqual(['2026-09-27']);
    expect(JSON.stringify(parsed.progress.telemetry.daily)).not.toContain(hostile.slice(0, 32));

    // Half two — the dates those entries named read as having NO stored result, so D-01
    // reports them playable rather than closed.
    expect(hasResultFor(keys, hostile)).toBe(false);
    expect(hasResultFor(keys, '2026-02-30')).toBe(false);
    // …while the one well-formed sibling is untouched and still closed.
    expect(hasResultFor(keys, '2026-09-27')).toBe(true);
  });
});
