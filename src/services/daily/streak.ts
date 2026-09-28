/**
 * The daily streak policy (N-DAILY-02 / D-01 / D-13 / D-14 / D-17 / SC-3).
 *
 * Three pure functions answer the only three questions a streak asks: is this date
 * already closed, how long is the run ending at the newest stored date, and — when a run
 * has just ended — how long was it. Their guard is `tests/daily.streak.test.ts`.
 *
 * ## What is contract and what is borrowed
 *
 * The walk over a **lexicographically sorted array of `YYYY-MM-DD` keys** is contract.
 * ISO-8601 local date strings sort chronologically, which is the entire reason the key
 * format is ISO (`dateKey.ts` header) and the entire reason this walk needs no date
 * parsing. SC-3 asks that the streak be "computed from stored dates rather than an
 * incrementing counter that a crash could corrupt"; a module whose only input is the
 * stored dates makes that a structural fact rather than a discipline — there is no
 * counter here to corrupt, and no clock to wind.
 *
 * `previousDateKey` is **borrowed** from the sibling `dateKey.ts`, and the adjacency test
 * is therefore a string comparison, never a duration subtraction. That matters more than
 * it looks: `b - a === 86_400_000` is wrong on every DST day, and wrong in a direction
 * that silently breaks a player's streak on exactly one day a year. Two keys are adjacent
 * iff one IS `previousDateKey` of the other.
 *
 * ## Why the validation lives in this body
 *
 * It deliberately does not. These functions are TOTAL over any array of strings and fold
 * degenerate input — unsorted, duplicated, malformed — into a non-negative integer or a
 * null rather than throwing. The fence against a tampered blob is `isValidDateKey` on the
 * read path (plan 12-04, T-12-13); a policy that threw on bad input would turn a corrupt
 * history into a crashed panel, which is a worse failure than a short streak.
 *
 * The `sortedKeys` precondition is a real one and it is the caller's: `mergeDailyRecords`
 * already sorts, and `streakFrom` walks backward from the END of the array. An unsorted
 * array yields a SHORTER streak, never a longer one or a negative one, so the degenerate
 * case fails safe and is asserted that way rather than assumed.
 *
 * ## No approximated arithmetic, no clock
 *
 * Same rule as `src/services/endless/ramp.ts` § No implementation-approximated Math and
 * `src/services/daily/dateKey.ts` § No locale, no UTC, no fixed-length day, for the same
 * reason and with the same teeth: no date parsing, no exponentiation, no duration
 * subtraction, and no wall-clock read anywhere in this file.
 *
 * The locale/UTC/fixed-day half is enforced by the `src/services/daily/` block in
 * `eslint.config.js`, so `npm run lint` fails on it — including the `86_400_000` named in
 * prose above, which is safe precisely because a comment is not an AST node. The "no
 * wall-clock read" half has NO automated gate: nothing in this repo fails on a `Date.now()`
 * added to this file, and it holds by review only.
 *
 * SECURITY: nothing here protects anything. The streak is a display value derived from a
 * plaintext, attacker-writable blob (AsyncStorage). A rooted device can write any history
 * it likes and these functions will faithfully report the streak that history implies —
 * that is accepted (T-12-05), because a daily streak guards no asset.
 */

import { previousDateKey } from './dateKey';

/**
 * Whether `key` already has a stored result — **the whole of D-01, the clock policy.**
 *
 * A date is playable if and only if it has no stored result. That single rule is why
 * this phase contains no anti-cheat branch anywhere: winding the device clock BACK lands
 * on a date that is already in the set and therefore closed, so it gains nothing; winding
 * it FORWARD opens a date that is not stored, which is playable but is not adjacent to
 * the newest stored date and therefore breaks the player's own streak. Both outcomes fall
 * out of set membership, and neither needed to be detected.
 */
export function hasResultFor(sortedKeys: readonly string[], key: string): boolean {
  return sortedKeys.includes(key);
}

/**
 * The count of consecutive stored dates ending at the newest stored date (D-13 / D-14).
 *
 * Counts dates PLAYED, not dates won — the array holds keys and no outcome can reach
 * this function at all, which is how D-13 is enforced rather than remembered. Two
 * calendar-adjacent dates continue the run; a gap of two or more days ends it, with no
 * grace day (D-14), because the walk stops at the first key that is not `previousDateKey`
 * of its successor.
 *
 * Empty array is 0. Degenerate input folds: the result is always an integer in
 * `[0, sortedKeys.length]`.
 */
export function streakFrom(sortedKeys: readonly string[]): number {
  if (sortedKeys.length === 0) {
    return 0;
  }
  let n = 1;
  for (let i = sortedKeys.length - 1; i > 0; i--) {
    if (sortedKeys[i - 1] !== previousDateKey(sortedKeys[i]!)) {
      break;
    }
    n++;
  }
  return n;
}

/**
 * D-17's ended-streak length for the date being shown, or `null` when the line must be
 * omitted — implementing 12-UI-SPEC § The streak-ended line's five-case table row for row.
 *
 * Let `D` be `date` and `prev` the greatest stored key strictly before it. There are
 * exactly four ways to return nothing and one way to return a number:
 *
 *  1. `prev` does not exist — the first date ever recorded. Nothing ended.
 *  2. `prev` is `D - 1 day` — the streak CONTINUED. Nothing ended.
 *  3. The backward walk reaches the oldest key still in the trimmed window (D-15) while
 *     STILL consecutive — **not derivable**, see below.
 *  4. The derived length is 1 — the `>= 2` floor. "Your 1-day streak ended" is not a loss
 *     worth stating, and the floor also removes the only pluralisation branch in the
 *     phase: at `n >= 2`, `{n}-day` is always correct English, so there is no `1-day`
 *     string to get wrong.
 *  5. Otherwise: the count of consecutive stored dates ending at `prev`.
 *
 * **Never substitute `longestStreak` in case 3.** That scalar is a lifetime maximum and
 * may belong to an entirely different, earlier run; printing it here would state a number
 * that was never the streak that just ended. A silent omission is the honest failure mode
 * and a confident wrong number is not — 12-UI-SPEC says so in those terms. This paragraph
 * exists because the omission looks like a missing feature to a later reader and will
 * otherwise get "fixed"; `tests/daily.streak.test.ts`'s window-floor pair is the guard
 * that catches the fix, and it seeds a distinct lifetime value precisely so the wrong
 * substitution is visible rather than plausible.
 *
 * `date` itself may or may not be present in `sortedWindow` — the filter takes keys
 * strictly less than it, so a panel rendering a date that has just closed and one
 * rendering a date still open both get the same answer.
 */
export function endedStreakLength(
  sortedWindow: readonly string[],
  date: string,
): number | null {
  const before = sortedWindow.filter((k) => k < date);
  if (before.length === 0) {
    return null; // (1) first date ever recorded
  }
  const prev = before[before.length - 1]!;
  if (prev === previousDateKey(date)) {
    return null; // (2) the streak continued
  }
  let n = 1;
  for (let i = before.length - 1; i > 0; i--) {
    if (before[i - 1] !== previousDateKey(before[i]!)) {
      break;
    }
    n++;
    if (i - 1 === 0) {
      return null; // (3) window floor reached while still consecutive — not derivable
    }
  }
  // (4) the >= 2 floor, which also absorbs a single-key window: one stored date before
  // `D` is itself the oldest key in the window, so its run is equally underivable, and
  // both roads lead to the same omission.
  return n >= 2 ? n : null; // (5) otherwise the count
}
