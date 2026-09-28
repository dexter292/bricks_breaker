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
 * That last clause is forward-stated on purpose: nothing in this module steps a day
 * yet. `nextLocalMidnightMs` arrives in plan 12-02, written test-first beside the two
 * real 2026 DST days that are the only thing able to falsify it. The rule is written
 * here because it is a property of the module, and 12-02 inherits it together with this
 * plan's comment-stripped grep gate over `src/services/daily/*.ts`.
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
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
