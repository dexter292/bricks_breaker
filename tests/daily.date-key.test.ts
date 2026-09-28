/**
 * N-DAILY-01 — the daily date derivation is LOCAL, locale-proof and DST-correct (SC-1).
 *
 * SC-1's whole claim is that every device draws the same board on the same day. That
 * rests on one string: `localDateKey`. Two ways of getting it wrong are both silent on
 * an `en-US` simulator in a UTC-ish zone — a locale-derived key hands a Thai device a
 * different seed from a US device on the same instant, and a UTC-derived key is a
 * calendar day wrong for roughly a third of every day in any non-UTC zone. This file is
 * the instrument that can falsify either, so it pins the zone explicitly on every case
 * and never trusts the ambient one.
 *
 * `nextLocalMidnightMs` is written HERE, test-first, rather than in plan 12-01: the
 * tracer reaches no local-midnight boundary on any path its runnable check drives, and
 * the only things able to falsify a day-step are the two real 2026 DST days below.
 *
 * Analog: `tests/endless.ramp.test.ts` — the same constants-at-the-top-with-their-reason
 * shape (`:29-37`), the same `describe('<fn> (<criterion> / <requirement>, <plan>)')` /
 * `it('<behaviour>')` naming (`:39-121`), the same `expect(value, 'why')` second-argument
 * convention throughout, and the same degenerate-input case (`:58`) walked over a
 * non-finite instant instead of a non-finite wave.
 *
 * **TZ pinning has NO in-repo analog.** No shipped test in `tests/` reassigns
 * `process.env.TZ` (measured: `grep -rc "process.env.TZ" tests/` found nothing before
 * this file). 12-RESEARCH § Finding 5 verified mid-test reassignment is honoured under
 * this project's own `npx vitest run`, but this file is establishing the idiom, not
 * copying one. `process.env.TZ` is process-global and vitest reuses a worker across
 * files, so the capture-and-restore `afterEach` below is not hygiene — a spec that
 * leaves the zone reassigned corrupts every file that runs after it in the same worker.
 *
 * Every expected value below is an EXECUTED measurement from `12-RESEARCH § Finding 3`,
 * reproduced under both Hermes `250829098.0.17` and Node 25.6.0, and asserted against the
 * absolute UTC instant rather than against a re-derivation — a test that re-derives can
 * agree with a broken module by computing the same wrong answer twice.
 *
 * Deliberately NOT covered here:
 *  - **Hermes.** vitest runs on Node/V8. A green suite is evidence about V8. The Hermes
 *    evidence is the executed JSI probe recorded in 12-RESEARCH; the Android ICU4J engine
 *    was never executed at all. Both are device-verification items, not test rows.
 *  - **Hermes's per-runtime timezone cache** (12-RESEARCH § Finding 4): a device zone
 *    change mid-session is invisible until the JS runtime is recreated. D-04 declines to
 *    handle it; nothing here is evidence about it either way.
 *  - **Which board a key produces.** That is `tests/daily.board.test.ts`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { localDateKey, nextLocalMidnightMs } from '../src/services/daily';

/**
 * The ambient zone, captured ONCE at module scope before any case reassigns it.
 * `process.env.TZ` is process-global and vitest reuses a worker across files.
 */
const ORIG_TZ = process.env.TZ;

/** The locale-affecting variables the invariance case sweeps, captured for restore. */
const ORIG_LOCALE_ENV = {
  LANG: process.env.LANG,
  LC_ALL: process.env.LC_ALL,
  LC_TIME: process.env.LC_TIME,
};

/**
 * The last second of Saturday 2026-09-05 in America/Santiago, as an absolute instant.
 * Sunday 2026-09-06 has NO 00:00–00:59 local there (`zdump`: `Sat Sep 5 23:59:59 -04` →
 * `Sun Sep 6 01:00:00 -03`), so a day-step must resolve a local midnight that does not
 * exist. 12-RESEARCH § Finding 3(a).
 */
const SANTIAGO_LAST_SECOND_OF_SATURDAY = Date.parse('2026-09-06T03:59:59.000Z');

/**
 * The instant the local-field constructor resolves that non-existent midnight to — the
 * FIRST instant that does exist on Sunday 2026-09-06 local. Measured, not re-derived:
 * 12-RESEARCH § Finding 3(a) recorded `2026-09-06T04:00:00.000Z` under Hermes and Node.
 */
const SANTIAGO_FIRST_INSTANT_OF_SUNDAY = Date.parse('2026-09-06T04:00:00.000Z');

/**
 * The first instant of local 2026-11-01 in America/Havana. That local day contains
 * midnight TWICE (`zdump`: `Sun Nov 1 00:59:59 CDT` → `Sun Nov 1 00:00:00 CST`) and the
 * constructor resolves to the first occurrence. 12-RESEARCH § Finding 3(b).
 */
const HAVANA_FIRST_MIDNIGHT = Date.parse('2026-11-01T04:00:00.000Z');

/**
 * The MEASURED length of local 2026-11-01 in Havana: 25 hours, not 24. This is the
 * number that makes `now + 86_400_000` wrong, so it is stated as a measurement rather
 * than computed from a day constant. 12-RESEARCH § Finding 3(b).
 */
const HAVANA_DAY_LENGTH_MS = 90_000_000;

/**
 * The banned fixed-day step, present ONLY here as the control the real function must
 * differ from. It is banned in `src/services/daily/*.ts` and enforced there by plan
 * 12-01's comment-stripped grep gate; a test may name it to prove it is wrong.
 */
const FIXED_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The four rollover boundaries 12-RESEARCH § Finding 3(d) executed: year, leap-year,
 * non-leap February, and month. Each is `[noon-of-the-day instant, expected next key]`.
 */
const ROLLOVERS: ReadonlyArray<readonly [string, string, string]> = [
  ['2026-12-31T12:00:00.000Z', '2026-12-31', '2027-01-01'],
  ['2028-02-28T12:00:00.000Z', '2028-02-28', '2028-02-29'],
  ['2027-02-28T12:00:00.000Z', '2027-02-28', '2027-03-01'],
  ['2026-09-30T12:00:00.000Z', '2026-09-30', '2026-10-01'],
];

/**
 * The five device locales 12-RESEARCH § Finding 2 measured producing five different
 * date strings for one instant — three calendar systems and two non-ASCII digit sets.
 */
const DEVICE_LOCALES = ['th-TH', 'ar-SA', 'fa-IR', 'ja-JP', 'en-GB'] as const;

/** The instant Finding 2's five-locale table was measured at. */
const FINDING_2_INSTANT = Date.parse('2026-09-27T12:00:00.000Z');

/** Pin the zone for the case about to run. Never rely on the ambient one. */
function setZone(tz: string): void {
  process.env.TZ = tz;
}

/**
 * Restore the process-global zone and the locale variables after EVERY case. Without
 * this, a zone pinned here leaks into whatever file vitest runs next in this worker.
 */
afterEach(() => {
  if (ORIG_TZ === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = ORIG_TZ;
  }
  for (const [name, value] of Object.entries(ORIG_LOCALE_ENV)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe('localDateKey (SC-1 / N-DAILY-01, 12-02)', () => {
  it('west of UTC at 23:30 local returns the local calendar date — local not UTC (D-01)', () => {
    setZone('America/Los_Angeles');
    // 2026-09-28T06:30Z is 2026-09-27 23:30 local PDT (-07).
    const instant = Date.parse('2026-09-28T06:30:00.000Z');
    expect(
      localDateKey(instant),
      'the key must be the LOCAL calendar date, which is still 2026-09-27 at 23:30 PDT',
    ).toBe('2026-09-27');
    // The control: the UTC calendar date for the same instant is the NEXT day. A key
    // derived from the UTC serialiser would hand this device tomorrow's board tonight.
    expect(
      new Date(instant).getUTCFullYear() +
        '-' +
        String(new Date(instant).getUTCMonth() + 1).padStart(2, '0') +
        '-' +
        String(new Date(instant).getUTCDate()).padStart(2, '0'),
      'the UTC date must differ here, or this case proves nothing (12-RESEARCH § Finding 3(e))',
    ).toBe('2026-09-28');
  });

  it('east of UTC at 00:30 local returns the local calendar date — local not UTC (D-01)', () => {
    setZone('Asia/Bangkok');
    // 2026-09-26T17:30Z is 2026-09-27 00:30 local ICT (+07).
    const instant = Date.parse('2026-09-26T17:30:00.000Z');
    expect(
      localDateKey(instant),
      'the key must be the LOCAL calendar date, which is already 2026-09-27 at 00:30 ICT',
    ).toBe('2026-09-27');
    expect(
      new Date(instant).getUTCDate(),
      'the UTC date must be the PREVIOUS day here, or this case proves nothing',
    ).toBe(26);
  });

  it('is locale invariant: one instant, one key, whatever the device locale says (12-RESEARCH § Finding 2)', () => {
    setZone('Asia/Bangkok');
    const keys = new Set<string>();
    const localeFormatted = new Set<string>();

    for (const locale of DEVICE_LOCALES) {
      // Vary every locale-affecting variable the runtime reads, changing NOTHING else.
      process.env.LANG = locale;
      process.env.LC_ALL = locale;
      process.env.LC_TIME = locale;
      keys.add(localeDateKeyUnderTest(FINDING_2_INSTANT));
      // The control, and the reason the ECMA-402 namespace is banned in the module:
      // the SAME instant formatted through the locale route is a DIFFERENT string per
      // locale — Buddhist and Persian calendar eras and non-ASCII digits among them.
      localeFormatted.add(new Date(FINDING_2_INSTANT).toLocaleDateString(locale));
    }

    expect(
      [...keys],
      `five device locales must yield exactly one key; got ${[...keys].join(', ')}`,
    ).toEqual(['2026-09-27']);
    // Non-vacuity: if the locale route happened to agree everywhere in this ICU build,
    // the case above would pass for the wrong reason. Finding 2 measured five different
    // strings; assert the route is genuinely unstable so the invariance means something.
    expect(
      localeFormatted.size,
      'the locale route must produce more than one string, or this case is vacuous',
    ).toBeGreaterThan(1);
    for (const formatted of localeFormatted) {
      expect(
        formatted,
        `the locale route produced ${formatted}, which must never be used as a seed`,
      ).not.toBe('2026-09-27');
    }
  });

  it('mints a zero-padded key whose lexicographic order is chronological (D-14)', () => {
    setZone('UTC');
    const early = localDateKey(Date.parse('0999-01-02T12:00:00.000Z'));
    const late = localDateKey(Date.parse('2026-09-27T12:00:00.000Z'));
    expect(early, 'a year before 1000 must still be four digits wide').toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(late, 'every minted key is fixed-width YYYY-MM-DD').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      early < late,
      'D-14 sorts the stored date set lexicographically and never parses it, so a short key would break the streak walk silently',
    ).toBe(true);
  });
});

describe('nextLocalMidnightMs (SC-1 / N-DAILY-01, 12-02)', () => {
  it('resolves a skipped midnight to the first instant that exists on that local day (America/Santiago)', () => {
    setZone('America/Santiago');
    const boundary = nextLocalMidnightMs(SANTIAGO_LAST_SECOND_OF_SATURDAY);
    expect(
      boundary,
      'local 2026-09-06 00:00 does not exist in Santiago; the constructor must resolve to 2026-09-06T04:00:00.000Z (12-RESEARCH § Finding 3(a))',
    ).toBe(SANTIAGO_FIRST_INSTANT_OF_SUNDAY);
    expect(
      boundary - SANTIAGO_LAST_SECOND_OF_SATURDAY,
      'the countdown from the last second of Saturday must read exactly 1000 ms',
    ).toBe(1000);
    expect(
      localDateKey(boundary),
      'the boundary must land ON 2026-09-06, the date that has no local midnight',
    ).toBe('2026-09-06');
    expect(
      localDateKey(SANTIAGO_LAST_SECOND_OF_SATURDAY),
      'and the instant it stepped from must still be 2026-09-05',
    ).toBe('2026-09-05');
  });

  it('measures a 25 hour day where local midnight occurs twice (America/Havana)', () => {
    setZone('America/Havana');
    expect(
      localDateKey(HAVANA_FIRST_MIDNIGHT),
      'the first of the two local midnights is on 2026-11-01',
    ).toBe('2026-11-01');
    expect(
      nextLocalMidnightMs(HAVANA_FIRST_MIDNIGHT) - HAVANA_FIRST_MIDNIGHT,
      'local 2026-11-01 in Havana is 90 000 000 ms long, not 86 400 000 (12-RESEARCH § Finding 3(b))',
    ).toBe(HAVANA_DAY_LENGTH_MS);
    expect(
      localDateKey(nextLocalMidnightMs(HAVANA_FIRST_MIDNIGHT)),
      'and the boundary opens 2026-11-02, not a second copy of 2026-11-01',
    ).toBe('2026-11-02');
  });

  it('is not plus 24h: the fixed-duration form skips a date in Santiago and repeats one in Havana', () => {
    setZone('America/Santiago');
    expect(
      localDateKey(nextLocalMidnightMs(SANTIAGO_LAST_SECOND_OF_SATURDAY)),
      'calendar arithmetic reaches 2026-09-06',
    ).toBe('2026-09-06');
    expect(
      localDateKey(SANTIAGO_LAST_SECOND_OF_SATURDAY + FIXED_DAY_MS),
      'duration arithmetic SKIPS 2026-09-06 entirely — a whole daily board unreachable (12-RESEARCH § Finding 3(c))',
    ).toBe('2026-09-07');
    expect(
      nextLocalMidnightMs(SANTIAGO_LAST_SECOND_OF_SATURDAY),
      'the two forms must not coincide on a 23-hour day',
    ).not.toBe(SANTIAGO_LAST_SECOND_OF_SATURDAY + FIXED_DAY_MS);

    setZone('America/Havana');
    const halfPastMidnight = HAVANA_FIRST_MIDNIGHT + 30 * 60 * 1000;
    expect(
      localDateKey(nextLocalMidnightMs(halfPastMidnight)),
      'calendar arithmetic reaches 2026-11-02',
    ).toBe('2026-11-02');
    expect(
      localDateKey(halfPastMidnight + FIXED_DAY_MS),
      'duration arithmetic REPEATS 2026-11-01 — tomorrow’s board is today’s (12-RESEARCH § Finding 3(c))',
    ).toBe('2026-11-01');
    expect(
      nextLocalMidnightMs(halfPastMidnight),
      'the two forms must not coincide on a 25-hour day either',
    ).not.toBe(halfPastMidnight + FIXED_DAY_MS);
  });

  it('steps month, year and leap-year boundaries correctly — rollover (12-RESEARCH § Finding 3(d))', () => {
    setZone('UTC');
    for (const [iso, today, tomorrow] of ROLLOVERS) {
      const instant = Date.parse(iso);
      expect(localDateKey(instant), `${iso} must be ${today} locally`).toBe(today);
      expect(
        localDateKey(nextLocalMidnightMs(instant)),
        `${today} must step to ${tomorrow}; getDate() + 1 overflowing the month is the constructor's job`,
      ).toBe(tomorrow);
    }
  });

  it('stays total on degenerate input: no malformed key and no non-finite boundary', () => {
    setZone('Asia/Bangkok');
    const degenerate = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      1e20, // finite, but outside the ±8.64e15 range a Date can represent
    ];
    for (const nowMs of degenerate) {
      const boundary = nextLocalMidnightMs(nowMs);
      expect(
        Number.isFinite(boundary),
        `nowMs ${nowMs} must not escape as a non-finite boundary; a countdown built on it would render NaN`,
      ).toBe(true);
      expect(
        localDateKey(nowMs),
        `nowMs ${nowMs} must not escape as a malformed key; D-14 sorts stored keys and never parses them`,
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        localDateKey(boundary),
        `the boundary derived from ${nowMs} must itself be a well-formed key`,
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

/**
 * Indirection so the locale sweep above reads as "the derivation under test" rather than
 * as a bare call — the case is an assertion about what the derivation is allowed to READ.
 */
function localeDateKeyUnderTest(nowMs: number): string {
  return localDateKey(nowMs);
}
