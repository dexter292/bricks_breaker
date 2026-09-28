/**
 * The daily-challenge date policy (N-DAILY-01 / N-DAILY-03 / D-01 / D-11).
 *
 * One pure function answers the only question a daily board asks — which local
 * calendar date is this — and one constant answers how hard every date is. Their
 * guard for this plan is `tests/ui/PlayingHost.daily-run.test.tsx`; the dedicated
 * unit battery, including the two real 2026 DST days, arrives with plan 12-02.
 *
 * ## What is contract and what is borrowed
 *
 * The `YYYY-MM-DD` key format **is** contract. `12-UI-SPEC.md` § Copywriting renders
 * the key verbatim with no formatting step, and D-14's streak walk sorts the stored
 * set lexicographically — ISO-8601 local date strings sort chronologically, which is
 * the only reason that walk needs no parsing. A second representation of the same day
 * is a second thing that can disagree with the seed the board was derived from, and
 * SC-1's whole claim is that those are one thing.
 *
 * `DAILY_DIFFICULTY` is a number *into* `generate`, which clamps its own difficulty
 * argument (`src/levelgen/generate.ts:227`) — so `D_MAX` is **not** ours and is not
 * restated here, exactly as `src/services/endless/ramp.ts` refuses to restate it.
 *
 * ## Why the validation lives in this body
 *
 * `localDateKey` is total over every finite instant: `getFullYear()`, `getMonth()` and
 * `getDate()` are defined by ECMA-262 over `LocalTime(t)`, and there is no instant with
 * no local calendar date. `padStart` fixes the width so a year before 1000 or a
 * single-digit month cannot produce a key that sorts wrong — the sort is what D-14
 * rests on, so a short key would break the streak walk silently rather than loudly.
 * The hostile caller here is a tampered blob (AsyncStorage is plaintext), and the
 * read-side sanitizer that fences it is plan 12-04's; this body's obligation is only
 * that a key it MINTS is always well-formed.
 *
 * ## No locale, no UTC, no fixed-length day
 *
 * Same rule as `src/services/endless/ramp.ts` § No implementation-approximated Math,
 * for the same reason and with the same teeth. Three primitives are banned outright in
 * this module, each because it was measured producing a wrong answer, not because it
 * looked risky:
 *
 *  - The ECMA-402 namespace and every locale-formatting Date method. One instant gave
 *    five different keys across five device locales under this project's own Hermes —
 *    Buddhist, Islamic Umm al-Qura and Persian Solar Hijri calendars plus two Gregorian
 *    forms, two of them in non-ASCII digits (12-RESEARCH § Finding 2). A Thai device and
 *    a US device would draw different boards on the same day: SC-1 dead, and invisible
 *    on an en-US simulator.
 *  - The UTC-serialising method. It is a calendar day wrong for a third of every day in
 *    Santiago: at local 21:00 on 2026-09-27 the local key is 2026-09-27 and the UTC
 *    serialisation is 2026-09-28 (12-RESEARCH § Finding 3(e)).
 *  - Adding a fixed day in milliseconds to step to the next date. It SKIPS 2026-09-06
 *    outright in Santiago and REPEATS 2026-11-01 in Havana, because neither day is
 *    24 hours long (12-RESEARCH § Finding 3(c)). Stepping a day is calendar arithmetic
 *    through the local-wall-time Date constructor, never duration arithmetic.
 *
 * `nextLocalMidnightMs` below is the day-step that rule exists for. It landed in plan
 * 12-02, written test-first beside the two real 2026 DST days that are the only thing
 * able to falsify it (`tests/daily.date-key.test.ts`), and it inherits the ban together
 * with plan 12-01's comment-stripped grep gate over `src/services/daily/*.ts`.
 *
 * SECURITY: the date key is a difficulty/board input, not a secret. It feeds
 * `generate`, whose PRNG is explicitly not a CSPRNG (`src/levelgen/rng.ts:15-18`) —
 * nothing here may be used to protect anything. Predictability is the FEATURE: every
 * device must draw the same board for the same date (D-11, T-12-05 accepted).
 */

/**
 * The local calendar date of `nowMs`, as `YYYY-MM-DD`.
 *
 * Pure in its argument and total over every finite instant. The clock read that
 * produces `nowMs` belongs to the caller, at the edge — `react-hooks/purity` forbids an
 * impure call during render and this project already documents that at
 * `app/_components/PlayingHost.tsx:360`, so the wall clock is read in a press callback
 * and passed in.
 */
export function localDateKey(nowMs: number): string {
  const d = new Date(representableInstant(nowMs));
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * The first instant of the local calendar day AFTER the one containing `nowMs`
 * (N-DAILY-01 / D-02 / 12-UI-SPEC § Clock policy rule 3).
 *
 * **Calendar arithmetic, never duration arithmetic.** The local-field `Date` constructor
 * interprets its arguments as local wall time, so `getDate() + 1` asks the runtime's own
 * tz database for "the same wall-clock midnight, one calendar day on" — which is a
 * different number of milliseconds away on every DST day. The banned alternative is not
 * merely inelegant, it is measured wrong (12-RESEARCH § Finding 3(c)): adding a fixed day
 * in milliseconds SKIPS 2026-09-06 outright in America/Santiago, where that local day has
 * no 00:00–00:59 at all, and REPEATS 2026-11-01 in America/Havana, where that local day is
 * 90 000 000 ms long. A player in Santiago would never be served one of the boards; a
 * player in Havana would be served today's board as "tomorrow's".
 *
 * The constructor also resolves a local midnight that does not exist to the first instant
 * that DOES exist on that local day — measured as `2026-09-06T04:00:00.000Z` in Santiago
 * under both Hermes and Node — rather than yielding `NaN` or falling back a day. Month,
 * year and leap-year overflow of `getDate() + 1` are the constructor's job too, verified
 * across all four boundaries in 12-RESEARCH § Finding 3(d).
 *
 * Total, like its sibling: see `representableInstant`. A boundary is always a finite
 * integer, so a countdown built on it can read `expired` but can never render `NaN`.
 */
export function nextLocalMidnightMs(nowMs: number): number {
  const from = representableInstant(nowMs);
  const d = new Date(from);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
  // At the very top of the representable range there is no next local midnight. Degrade
  // to the instant itself — a remaining-time of zero reads as `expired`, which is the safe
  // direction; `NaN` would reach the UI as a rendered literal.
  return Number.isFinite(next) ? next : from;
}

/**
 * The local calendar date exactly one calendar day before `key` — pure string to string.
 *
 * **Calendar arithmetic, never duration arithmetic**, for the reason the module header
 * states and `nextLocalMidnightMs` above demonstrates: a local day is not always 24 hours
 * long, so subtracting a fixed day in milliseconds would skip 2026-09-06 in Santiago and
 * repeat 2026-11-01 in Havana. The day field is stepped through the local-field `Date`
 * constructor, which owns month, year and leap-year underflow of `day - 1`.
 *
 * **Anchored at midday, not midnight, as a margin rather than as a bug fix.** A DST step
 * shifts local wall time by an hour or two; from a midday anchor no such shift can reach
 * either end of the calendar day, whereas a midnight anchor sits exactly on the boundary
 * and depends on the constructor resolving a non-existent local midnight FORWARD into the
 * same day rather than backward into the previous one. MEASURED (12-03, this project's
 * own Node): the midnight anchor in fact agrees with the midday anchor on all 38 355 real
 * dates across 15 DST-hostile zones over 2024-2030 — Santiago, Havana, Apia, Lord Howe,
 * Troll, Teheran and others — so this is 12 hours of slack against a runtime behaviour we
 * would otherwise be relying on, NOT a defect being patched. Stated as a measurement so a
 * later reader who re-derives it does not conclude the comment is wrong and revert it.
 *
 * The result is minted through `localDateKey`, so a stepped key is well-formed by exactly
 * the same argument a freshly-derived one is. The caller's key is NOT validated here —
 * `isValidDateKey` is the fence and the read path is plan 12-04's; a malformed key in
 * yields a well-formed key out rather than a throw, which keeps D-14's walk total.
 */
export function previousDateKey(key: string): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  const d = Number(key.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return localDateKey(0);
  }
  return localDateKey(new Date(y, m - 1, d - 1, 12, 0, 0, 0).getTime());
}

/** A `YYYY-MM-DD` key: four digits, two, two. Shape only — range is checked below. */
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Days in a Gregorian month. Integer comparisons and a lookup only — no exponentiation,
 * no date parsing round trip. The leap rule is the full one: divisible by 4, except
 * centuries, except every 400th.
 */
function daysInMonth(y: number, m: number): number {
  if (m === 2) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return leap ? 29 : 28;
  }
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31;
}

/**
 * Whether `raw` is a well-formed, in-range `YYYY-MM-DD` key (T-12-13).
 *
 * **Integer range checks, never a parse round trip.** `new Date('2026-02-30')` and
 * friends are exactly the ambient-input dependency this module exists to avoid: a round
 * trip through date parsing ACCEPTS strings this format does not — `2026-2-3`,
 * `2026-09-27T00:00:00Z`, `2026-09-31` rolling silently into October — and its tolerance
 * is implementation-defined, so it could differ between Node and Hermes on the very input
 * a tampered blob supplies. Same rule, same reason and the same teeth as
 * `src/services/endless/ramp.ts` § No implementation-approximated Math and
 * `src/levelgen/schedule.ts:50-55`.
 *
 * The hostile caller is a tampered plaintext blob, which can put any string where a date
 * key belongs. D-14's streak walk compares keys lexicographically and never parses them,
 * so an oversized or non-numeric key would sort into the stored set as silent garbage
 * rather than failing loudly. This predicate is what stops that; it is wired into the read
 * path by plan 12-04.
 */
export function isValidDateKey(raw: unknown): raw is string {
  if (typeof raw !== 'string' || !DATE_KEY_RE.test(raw)) {
    return false;
  }
  const y = Number(raw.slice(0, 4));
  const m = Number(raw.slice(5, 7));
  const d = Number(raw.slice(8, 10));
  if (m < 1 || m > 12) {
    return false;
  }
  return d >= 1 && d <= daysInMonth(y, m);
}

/**
 * Normalise `nowMs` to an instant a `Date` can actually represent, so both exported
 * functions are total over EVERY number rather than only over the finite ones.
 *
 * Without this, `NaN`, `±Infinity` and any magnitude past the ECMA-262 time-value range
 * all propagate: every local getter returns `NaN`, and the key formatter then MINTS
 * `0NaN-NaN-NaN` — a string that would sort into D-14's stored date set as garbage,
 * silently, because that walk compares keys lexicographically and never parses them.
 * A malformed key is exactly the class of corruption SC-1 exists to prevent, so the
 * module refuses to mint one at all.
 *
 * The range check is the runtime's own — `new Date(x).getTime()` is `NaN` for anything
 * out of range — rather than a restated `8.64e15`, for the same reason `DAILY_DIFFICULTY`
 * refuses to restate the generator's `D_MAX`: a bound that belongs to someone else is not
 * ours to copy. The fallback is the epoch, which is deterministic and pure; reading the
 * wall clock here would make these functions impure and is what the `nowMs` argument
 * exists to avoid.
 *
 * This is a floor, not a fence. The hostile caller — a tampered plaintext blob — is
 * fenced by the read-side sanitizer in plan 12-04; this body's obligation is only that a
 * key or boundary it MINTS is always well-formed.
 */
function representableInstant(nowMs: number): number {
  return Number.isFinite(new Date(nowMs).getTime()) ? nowMs : 0;
}

/**
 * The difficulty every daily board is generated at (D-11) — fixed, mid-scale, and the
 * same number on every date so no player loses a streak because their date drew a hard
 * board.
 *
 * Why 10, on the generator's own published table (`docs/ops/BOARD-GENERATOR.md:171-193`):
 * `d = 10` gives 12 rows used, 72 bricks, 116 authored HP, 3 explosives and 3 steel
 * pairs per half. The same document's calibration line puts `d = 0` at `level-01`'s 32
 * bricks and `d ~ 13` at `level-03`'s 94-brick showpiece, so 10 sits between the
 * tutorial level and the showpiece — recognisably a real board, not a warm-up, and not
 * the hardest thing the generator can make. Its sweep's per-difficulty median clear
 * times run 56 s at `d = 0` to 197 s at `d = 20`, putting 10 near a two-minute median:
 * the right size for a once-a-day sitting. It is also exactly the difficulty endless
 * reaches at wave 11 (`difficultyForWave` is `wave - 1`, clamped), so a daily board is
 * directly comparable to a familiar point on the shipped ramp.
 *
 * The sweep recorded 0 non-wins across every generated board, which is what makes
 * D-13's "the streak counts dates PLAYED, not dates won" safe: no date can draw a board
 * that cannot be cleared.
 */
export const DAILY_DIFFICULTY = 10 as const;
