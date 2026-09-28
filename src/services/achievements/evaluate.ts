/**
 * The achievement evaluator (N-ACH-01 / N-ACH-02 / SC-2 / D-01 / D-02 / D-03 / D-17).
 *
 * Two pure functions answer the only two questions an unlock asks: which achievements does
 * this snapshot qualify for, and which of those are NEW. Their guard is
 * `tests/achievements.record.test.ts` (this plan, end to end through both stores) and
 * `tests/achievements.evaluate.test.ts` (plan 13-02, the exhaustive battery).
 *
 * ## What is contract and what is borrowed
 *
 * **Catalog declaration order is contract** and both functions preserve it — it is the
 * display order the panel renders in (`13-UI-SPEC.md` § Ordering is contract), so a
 * re-sort here would be a second ordering rule in a second place.
 *
 * **The catalog and the snapshot shape are borrowed** from `./catalog`. Nothing here
 * restates a threshold, a name or a field name: a rule stated twice is a rule that drifts,
 * and `13-PATTERNS.md` records three consecutive rounds of exactly that in phase 11.
 *
 * ## Why totality lives in this body
 *
 * These functions are TOTAL over any snapshot and any `unlocked` value, and they FOLD
 * degenerate input rather than throwing. `13-UI-SPEC.md` § Error state is explicit about
 * why: *"The host passes no names; the block is absent and the run's own result is
 * unaffected."* A policy that threw would turn a corrupt blob into a broken result panel —
 * and this code runs on the run-end path, so the throw would cost the player the score
 * they just earned, not merely a line of copy (T-13-06).
 *
 * **Degenerate input fails in the UNDER-reporting direction, and that is asserted rather
 * than assumed** — the same property `src/services/daily/streak.ts` states about itself. A
 * snapshot missing a field, or a predicate that throws, yields FEWER unlocks, never more.
 * The one place the direction inverts is `unlocked`, and it is called out at that
 * parameter.
 *
 * ## Deliberate omission: there is no re-evaluation on app open or hydrate
 *
 * This paragraph exists because the omission looks like a missing feature to a later
 * reader and will otherwise get "fixed".
 *
 * D-01 evaluates at run end ONLY, inside the same `recordRunEnd` write, against the
 * telemetry that write has just merged. The cost is real and was accepted: under D-04 a
 * player who already has telemetry unlocks retroactively, but **cannot see it until they
 * finish one run** — on the Title screen immediately after installing this build, nothing
 * has changed yet.
 *
 * It is still the right trade. Evaluating in two places is one rule in two places, which
 * is the exact shape that cost phase 11 six gap-closure rounds and phase 12 five separate
 * leaks of a single rule. A second evaluation site would also need its own answer to "what
 * is the unlocked set right now", i.e. an extra storage read, which D-01 avoided precisely
 * because it opens a race with the write.
 *
 * ## No clock, no RNG, no storage import
 *
 * D-03, enforced at AST level by the `src/services/achievements/**` block in
 * `eslint.config.js` and not by this sentence. The unlock TIMESTAMP is read in the store,
 * beside the `updatedAt = Date.now()` the store already does (D-14) — which is what lets
 * this module stay pure while the stored entry still carries a real instant.
 *
 * SECURITY: nothing here protects anything; see `./catalog`'s header.
 */
import {
  ACHIEVEMENT_CATALOG,
  type Achievement,
  type AchievementSnapshot,
} from './catalog';

/**
 * Whether one predicate holds, without letting it take the run down.
 *
 * A throwing predicate is treated as NOT qualifying: the under-reporting direction, chosen
 * for the reason the module header gives — a thrown evaluator must cost at most a line of
 * copy, never the player's result (T-13-06, `13-UI-SPEC.md` § Error state). A predicate
 * that returns a non-boolean is equally not a qualification; `=== true` rather than a
 * truthiness test, so a predicate accidentally returning a count cannot unlock on `0`
 * being falsy and on everything else being true.
 */
function holds(entry: Achievement, s: AchievementSnapshot): boolean {
  try {
    return entry.predicate(s) === true;
  } catch {
    return false;
  }
}

/**
 * Every catalog id whose predicate holds for `s`, in catalog declaration order (SC-1).
 *
 * **This function owns DETERMINISM**, which is one of SC-2's two halves: it is a pure
 * function of its arguments, so evaluating the same snapshot twice yields the same set by
 * construction rather than by a guard someone has to remember to write. The other half,
 * idempotency, belongs to `newlyUnlockedAchievements` below — the two halves have
 * different mechanisms and each owes its own test, which is why they are two functions and
 * not one.
 *
 * `catalog` defaults to `ACHIEVEMENT_CATALOG`, and both halves of that are deliberate.
 * D-03 names the evaluator as *"a pure function of (catalog, snapshot, unlocked set)"*, so
 * the catalog is an ARGUMENT. The default keeps every production call site — both stores —
 * free of a redundant argument they would only ever pass the same value for. The parameter
 * is what lets a test hand this function a throwing predicate or a deliberately malformed
 * entry with no module mock at all, which is the only way the totality claims above are
 * assertable.
 *
 * Total over a hostile catalog too: a non-array degrades to empty, and an entry with no
 * string id or no callable predicate is skipped. Both under-report.
 */
export function qualifyingAchievements(
  s: AchievementSnapshot,
  catalog: readonly Achievement[] = ACHIEVEMENT_CATALOG,
): readonly string[] {
  if (!Array.isArray(catalog)) {
    return [];
  }
  const out: string[] = [];
  for (const entry of catalog) {
    if (
      entry == null ||
      typeof entry.id !== 'string' ||
      typeof entry.predicate !== 'function'
    ) {
      continue;
    }
    if (holds(entry, s)) {
      out.push(entry.id);
    }
  }
  return out;
}

/**
 * The ids `s` qualifies for that `unlocked` does not already hold — D-02's set difference,
 * in catalog declaration order.
 *
 * **This function owns IDEMPOTENCY**, SC-2's other half. An id already in the stored set
 * produces an empty difference, so re-evaluating an unlocked achievement announces nothing
 * — by construction, not by a per-achievement "already fired" flag that a future write
 * path could forget to set. D-17 makes an unlock one-way; the set difference is what makes
 * that cheap.
 *
 * `unlocked` is read defensively: a non-array degrades to empty. **This is the one place
 * the degradation direction inverts, and it is safe on purpose.** An empty stored set
 * UNDER-reports what the player has, which OVER-reports the delta — so the failure mode is
 * re-announcing an unlock the player already had. That is a cosmetic repeat. The inverse
 * failure, swallowing a delta, is the achievement the player earned and never heard about,
 * which is the one thing the phase goal's verb ("tells them") forbids.
 *
 * The result is a fresh array and is never the caller's `unlocked`, so a caller may merge
 * it without aliasing.
 */
export function newlyUnlockedAchievements(
  s: AchievementSnapshot,
  unlocked: readonly string[],
  catalog: readonly Achievement[] = ACHIEVEMENT_CATALOG,
): readonly string[] {
  const already = new Set<string>(
    Array.isArray(unlocked) ? unlocked.filter((id) => typeof id === 'string') : [],
  );
  return qualifyingAchievements(s, catalog).filter((id) => !already.has(id));
}
