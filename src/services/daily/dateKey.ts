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
