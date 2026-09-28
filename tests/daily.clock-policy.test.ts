/**
 * N-DAILY-03 — the device-clock policy, which is one membership test and nothing else.
 *
 * D-01 states the whole of it: **a date is playable if and only if it has no stored result.**
 * D-02 and D-03 are its two consequences rather than two more rules — winding the clock BACK
 * lands on a date already in the stored set, so it gains nothing; winding it FORWARD opens a
 * date that is not stored but is not adjacent to the newest stored one, so the player's own
 * streak breaks by arithmetic. D-04 refuses to distinguish timezone travel from clock
 * tampering (offline and without a trusted time source the two are not distinguishable, so
 * any special case would be a guess dressed as a policy) and D-05 declines a monotonic
 * highest-date-ever-seen watermark.
 *
 * **The payoff of this file is an ABSENCE**, which is why it also reads the daily policy tree
 * from disk. There is no anti-cheat branch to test because there is none to write; the
 * `forwards` case carries the standing guard against a later round adding the "helpful" check
 * D-04 and D-05 already declined on the record. No accusation copy, no lockout, no
 * "suspicious clock" state, no punitive reset, no penalty of any kind — a branch like that
 * punishes a traveller for travelling, and travel is the common case.
 *
 * Analogs: `tests/daily.date-key.test.ts` (plan 12-02) for the capture-and-restore TZ idiom
 * and the pin-every-case rule; `tests/storage.daily-firewall.test.ts` (plan 12-02) for
 * driving a real store and asserting what a CALLER observes through `getSnapshot()` rather
 * than what a merge helper returns. Every expected date key below is an EXECUTED measurement
 * under this project's own Node, asserted as a literal rather than re-derived — a case that
 * re-derives can agree with a broken module by computing the same wrong answer twice.
 *
 * The injected clock is a plain millisecond value threaded into `localDateKey`. Nothing here
 * stubs global time, because the production code never reads global time outside a press
 * callback either (`react-hooks/purity`; the rule is documented at
 * `app/_components/PlayingHost.tsx:360`).
 *
 * Deliberately NOT covered here, and carried by plan 12-06 as device-verification items:
 *  - **A real device clock change.** No test can move the device's wall clock; what is
 *    modelled is the consequence, which is that a different instant is handed in.
 *  - **A real device timezone change mid-session.** 12-RESEARCH § Finding 4 measured Hermes
 *    caching the zone per runtime, so the OS zone change is invisible until the JS runtime is
 *    recreated. `process.env.TZ` under Node is a different mechanism; this file is evidence
 *    about the RULE, not about that cache.
 *  - **Hermes.** vitest runs on Node/V8. A green suite here is evidence about V8.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createMemoryProgressStore,
  defaultRunStatsInput,
  type ProgressStore,
  type RunStatsInput,
} from '../src/services/storage';
import { hasResultFor, localDateKey, previousDateKey, streakFrom } from '../src/services/daily';

/**
 * The ambient zone, captured ONCE at module scope before any case reassigns it.
 * `process.env.TZ` is process-global and vitest reuses a worker across files, so the
 * restore below is not hygiene — a spec that leaves the zone pinned corrupts every file that
 * runs after it in the same worker.
 */
const ORIG_TZ = process.env.TZ;

/** Pin the zone for the case about to run. Never rely on the ambient one. */
function setZone(tz: string): void {
  process.env.TZ = tz;
}

afterEach(() => {
  if (ORIG_TZ === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = ORIG_TZ;
  }
});

/** All-zero per-run counters — only the fields a case cares about are set. */
function runStats(over: Partial<RunStatsInput> = {}): RunStatsInput {
  return { ...defaultRunStatsInput(), ...over };
}

/** Close `date` through the store, exactly as a finished daily run does. */
function closeDate(
  store: ProgressStore,
  date: string,
  score: number,
  outcome: 'win' | 'lose' = 'win',
): void {
  store.recordRunEnd({
    mode: 'daily',
    date,
    score,
    outcome,
    livesRemaining: 2,
    stats: runStats({ bricksBroken: 40 }),
  });
}

/** The stored date keys a caller observes — the only state D-01 reads. */
async function storedKeys(store: ProgressStore): Promise<string[]> {
  const after = await store.getSnapshot();
  return after.telemetry.daily.history.map((e) => e.date);
}

/** One local day in milliseconds, used ONLY to model a clock being wound, never to step a date. */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The instant every clock case starts from, and the keys it derives under its pinned zone.
 * MEASURED under this project's own Node, zone by zone — never re-derived in an assertion.
 */
const BACKWARDS_ZONE = 'America/Santiago';
const BACKWARDS_NOW = Date.parse('2026-09-27T15:00:00.000Z'); // Santiago local 2026-09-27
const BACKWARDS_TODAY = '2026-09-27';
const BACKWARDS_YESTERDAY = '2026-09-26'; // the same instant minus one day, same zone

const FORWARDS_ZONE = 'Asia/Tokyo'; // no DST, so a seven-day clock jump is exactly seven dates
const FORWARDS_NOW = Date.parse('2026-09-27T03:00:00.000Z'); // Tokyo local 2026-09-27
const FORWARDS_TODAY = '2026-09-27';
const FORWARDS_JUMP_DAYS = 7;
const FORWARDS_JUMPED = '2026-10-04';

/** The same instant, 25 hours of offset apart — the sharpest form of D-04's travel case. */
const TRAVEL_NOW = Date.parse('2026-09-27T12:00:00.000Z');
const DEPARTURE_ZONE = 'Pacific/Kiritimati'; // UTC+14 -> 2026-09-28
const DEPARTURE_KEY = '2026-09-28';
const ARRIVAL_ZONE = 'Pacific/Niue'; // UTC-11 -> 2026-09-27
const ARRIVAL_KEY = '2026-09-27';

/** Five zones the streak walk must agree across — it reads dates, never a clock. */
const INVARIANCE_ZONES = [
  'UTC',
  'America/Santiago',
  'Pacific/Kiritimati',
  'Pacific/Niue',
  'Asia/Kathmandu',
] as const;

/** The daily policy tree, read from disk by the standing anti-cheat guard. */
const DAILY_POLICY_SOURCES = [
  'src/services/daily/dateKey.ts',
  'src/services/daily/streak.ts',
  'src/services/daily/index.ts',
] as const;

/**
 * Identifiers that would betray an anti-cheat design D-04 and D-05 declined: a monotonic
 * highest-date-ever-seen field, a last-seen-date watermark, or a clock-suspicion flag. The
 * pattern matches an identifier followed by a DECLARATION or an ASSIGNMENT, so prose cannot
 * trip it, and the source is comment-stripped first so the policy headers may discuss the
 * rejected designs freely.
 */
const ANTI_CHEAT_DECLARATION = /(watermark|highestDate|lastSeenDate|clockTamper)[A-Za-z]*\s*[:=]/;

/** Comment-stripped source text, the same helper `tests/daily.board.test.ts` uses. */
function strippedSource(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

describe('the clock policy is one membership test over stored dates (D-01 / N-DAILY-03, 12-04)', () => {
  it('a date is playable if and only if it has no stored result — that is the whole rule', async () => {
    setZone(BACKWARDS_ZONE);
    const store = createMemoryProgressStore();
    closeDate(store, '2026-09-26', 900);
    closeDate(store, '2026-09-27', 1_200);
    const keys = await storedKeys(store);

    // Swept over a closed date, its neighbours, and dates far on either side. The predicate
    // agrees with plain set membership on every one of them, which is the claim: there is no
    // second condition anywhere for a clock to influence.
    const sweep = [
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2020-01-01',
      '2099-12-31',
    ];
    for (const date of sweep) {
      expect(hasResultFor(keys, date), `${date} must answer exactly set membership`).toBe(
        keys.includes(date),
      );
    }
    // Non-vacuity: the sweep must contain both answers, or it would pass against a constant.
    expect(sweep.filter((d) => hasResultFor(keys, d))).toEqual(['2026-09-26', '2026-09-27']);
  });
});

describe('winding the clock backwards (D-02 / N-DAILY-03, 12-04)', () => {
  it('backwards: a date that already has a stored result stays read-only, and a repeat write is not a second attempt', async () => {
    setZone(BACKWARDS_ZONE);
    const store = createMemoryProgressStore();

    // Today, as the device says it, is closed with a win.
    expect(localDateKey(BACKWARDS_NOW)).toBe(BACKWARDS_TODAY);
    closeDate(store, BACKWARDS_TODAY, 8_400);
    const closed = await store.getSnapshot();
    const storedEntry = closed.telemetry.daily.history.find((e) => e.date === BACKWARDS_TODAY);
    expect(storedEntry).toEqual({ date: BACKWARDS_TODAY, score: 8_400, outcome: 'win' });

    // The player now winds the device clock back one day. Nothing in the app is told; all
    // that happens is that a different instant is handed in.
    const wound = BACKWARDS_NOW - ONE_DAY_MS;
    expect(localDateKey(wound)).toBe(BACKWARDS_YESTERDAY);

    const keys = await storedKeys(store);
    // The closed date is still closed — it did not become playable by the clock moving, and
    // the stored result is unchanged. That is D-02, and it needed no branch.
    expect(hasResultFor(keys, BACKWARDS_TODAY)).toBe(true);
    // The earlier date is genuinely playable, because it genuinely has no stored result.
    // The player gained a DIFFERENT date, not a replay of the one they closed.
    expect(hasResultFor(keys, BACKWARDS_YESTERDAY)).toBe(false);

    // Second half, and the one a weaker case would miss: wind forward again and try to replay
    // the closed date. A write for it REPLACES rather than appends, and the D-16 scalars do
    // not move — so the wind-back bought nothing at all.
    const beforeReplay = await store.getSnapshot();
    closeDate(store, BACKWARDS_TODAY, 99_999);
    const afterReplay = await store.getSnapshot();

    expect(afterReplay.telemetry.daily.history).toHaveLength(1);
    expect(
      afterReplay.telemetry.daily.totalDaysPlayed,
      'a replayed date must not count as a second day played (D-06)',
    ).toBe(beforeReplay.telemetry.daily.totalDaysPlayed);
    expect(afterReplay.telemetry.daily.longestStreak).toBe(
      beforeReplay.telemetry.daily.longestStreak,
    );
    expect(afterReplay.telemetry.daily.currentStreakStart).toBe(
      beforeReplay.telemetry.daily.currentStreakStart,
    );
  });

  it('backwards: with no write, winding the clock cannot change the stored set at all', async () => {
    setZone(BACKWARDS_ZONE);
    const store = createMemoryProgressStore();
    closeDate(store, BACKWARDS_TODAY, 1_500);

    const before = JSON.stringify((await store.getSnapshot()).telemetry.daily);
    // Wind back a day, a week, and a year. Reading the policy is pure — the stored set is the
    // only state it consults, and no amount of clock movement writes to it.
    for (const back of [ONE_DAY_MS, 7 * ONE_DAY_MS, 365 * ONE_DAY_MS]) {
      const derived = localDateKey(BACKWARDS_NOW - back);
      const keys = await storedKeys(store);
      expect(hasResultFor(keys, derived)).toBe(derived === BACKWARDS_TODAY);
    }
    expect(JSON.stringify((await store.getSnapshot()).telemetry.daily)).toBe(before);
  });
});

describe('winding the clock forwards (D-03 / D-04 / D-05 / N-DAILY-03, 12-04)', () => {
  it('forwards: a seven-day jump opens the new date and breaks the streak BY ITSELF — 1, not 8', async () => {
    setZone(FORWARDS_ZONE);
    const store = createMemoryProgressStore();

    expect(localDateKey(FORWARDS_NOW)).toBe(FORWARDS_TODAY);
    closeDate(store, FORWARDS_TODAY, 1_000);
    expect(streakFrom(await storedKeys(store))).toBe(1);

    // Seven days of clock, in one jump.
    const jumped = FORWARDS_NOW + FORWARDS_JUMP_DAYS * ONE_DAY_MS;
    expect(localDateKey(jumped)).toBe(FORWARDS_JUMPED);

    // The jumped-to date has no stored result, so D-01 says it is playable. The player is not
    // stopped, accused, or told anything about their clock.
    expect(hasResultFor(await storedKeys(store), FORWARDS_JUMPED)).toBe(false);
    closeDate(store, FORWARDS_JUMPED, 2_000);

    const keys = await storedKeys(store);
    expect(keys).toEqual([FORWARDS_TODAY, FORWARDS_JUMPED]);
    // **This is D-03's whole point.** The streak is 1 rather than 8 because the six
    // intervening dates have no stored result, so the walk ends at the gap. There is no
    // anti-cheat branch to write, to test, or to get wrong — the arithmetic already refused.
    expect(
      streakFrom(keys),
      'the streak must break at the gap by arithmetic, not by accusation',
    ).toBe(1);
    // The gap is real rather than assumed: the jumped date is not the calendar successor of
    // the closed one.
    expect(previousDateKey(FORWARDS_JUMPED)).not.toBe(FORWARDS_TODAY);

    const after = await store.getSnapshot();
    // Two dates were genuinely played, and the lifetime best is still the 1 it was — a
    // forward jump cannot manufacture a streak either.
    expect(after.telemetry.daily.totalDaysPlayed).toBe(2);
    expect(after.telemetry.daily.longestStreak).toBe(1);

    // The companion source assertion, in this case deliberately: the payoff of D-03 is an
    // ABSENCE, and an absence needs a standing guard or a later round will "helpfully" fill
    // it in. D-04 and D-05 declined a monotonic highest-date watermark and a clock-suspicion
    // branch on the record; this is what keeps them declined.
    for (const path of DAILY_POLICY_SOURCES) {
      expect(
        strippedSource(path),
        `${path} must declare no highest-date watermark and no clock-suspicion state — D-04 and D-05 declined both, and any such branch punishes a traveller for travelling`,
      ).not.toMatch(ANTI_CHEAT_DECLARATION);
    }
    // Non-vacuity for the matcher itself: it fires on the thing it is looking for.
    expect('const lastSeenDateKey = "2026-09-27";').toMatch(ANTI_CHEAT_DECLARATION);
  });
});

describe('timezone travel is the same rule, not a special case (D-04, 12-04)', () => {
  it('the derived local date differs by zone, and whichever one is derived is playable iff it has no stored result', async () => {
    // One instant, two zones 25 hours of offset apart: two different local calendar dates.
    setZone(DEPARTURE_ZONE);
    expect(localDateKey(TRAVEL_NOW)).toBe(DEPARTURE_KEY);
    const store = createMemoryProgressStore();
    closeDate(store, DEPARTURE_KEY, 3_300);

    setZone(ARRIVAL_ZONE);
    expect(localDateKey(TRAVEL_NOW)).toBe(ARRIVAL_KEY);
    expect(DEPARTURE_KEY).not.toBe(ARRIVAL_KEY);

    const keys = await storedKeys(store);
    // After travel the app derives a date that has no stored result, so it is playable. That
    // is not a loophole being tolerated — it is D-01 applied unchanged, and D-04 says the
    // traveller and the tamperer are the same person as far as this code can tell.
    expect(hasResultFor(keys, ARRIVAL_KEY)).toBe(false);
    // …and the date closed before travelling is still closed.
    expect(hasResultFor(keys, DEPARTURE_KEY)).toBe(true);

    // Travelling back re-derives the closed date, which is read-only again. Nothing was
    // stored about the zone, so there is nothing to be stale or to disagree.
    setZone(DEPARTURE_ZONE);
    expect(hasResultFor(await storedKeys(store), localDateKey(TRAVEL_NOW))).toBe(true);
  });
});

describe('neither conclusion consulted a clock (SC-3 / D-05, 12-04)', () => {
  it('the same stored dates give the same answers under every pinned zone — the policy reads dates, not time', async () => {
    setZone('UTC');
    const store = createMemoryProgressStore();
    for (const date of ['2026-09-25', '2026-09-26', '2026-09-27']) {
      closeDate(store, date, 700);
    }
    closeDate(store, '2026-10-04', 700); // after a gap
    const keys = await storedKeys(store);

    const answers = INVARIANCE_ZONES.map((tz) => {
      setZone(tz);
      return {
        tz,
        streak: streakFrom(keys),
        closed: hasResultFor(keys, '2026-09-26'),
        open: hasResultFor(keys, '2026-09-30'),
      };
    });

    for (const answer of answers) {
      expect(answer, `${answer.tz} must not change an answer derived from stored dates`).toEqual({
        tz: answer.tz,
        streak: 1,
        closed: true,
        open: false,
      });
    }
    // Non-vacuity: the fixture genuinely contains a gap and a run, so a constant-returning
    // walk could not satisfy the invariance above.
    expect(keys).toEqual(['2026-09-25', '2026-09-26', '2026-09-27', '2026-10-04']);
  });
});
