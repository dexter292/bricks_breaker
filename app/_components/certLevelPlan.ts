/**
 * The cert-deferral level policy (N-END-01 / N-END-02).
 *
 * One pure, total function answers the only question the `Cert WC` dev control asks
 * about levels: may the cert deferral's `level-03` precondition be satisfied on this
 * press? Its guard is `tests/ui/certLevelPlan.test.ts`, which drives all 20 cells of
 * the function's real domain.
 *
 * ## Why this module exists at all
 *
 * The same question used to be written twice inside `runCertWorstCase` — once in the
 * level half's condition and once in the expression that armed the one-shot — and the
 * two copies drifted apart in three consecutive rounds of phase 11. Round 3 taught the
 * level half the run mode and left the arm ignorant of it; round 4 taught the arm the
 * mode; round 5 taught the level half the run-ended latch and left the arm ignorant of
 * THAT, which stranded a worst-case injection on a campaign session that never pressed
 * the button. Each round fixed a branch and left its neighbour open.
 *
 * The fix is structural rather than a fourth conjunct in a third place: the decision is
 * named, written once, and read by every consumer.
 *
 * ## What is contract
 *
 * The three-way return **is** contract. Both the level-forcing decision and the arming
 * decision are derived from it — `'force'` means the level half must move the session,
 * `'unreachable'` means nothing may be armed, and `'ready'` means the precondition is
 * already satisfied so the arm is legitimate without a level move. A fourth term added
 * to this body therefore reaches every decision site by construction, which is the
 * whole point. `tests/ui/PlayingHost.endless-host.test.ts` pins that no consumer
 * re-tests these terms inline.
 *
 * ## Why the tests are evaluated in this order
 *
 * The ORDER is contract too, and each step earns its place:
 *
 * 1. **endless first.** 11-16 deliberately suppressed BOTH endless sub-branches,
 *    including the one already standing on `level-03` where the deferral genuinely used
 *    to discharge (measured 1 injection onto the freshly restarted endless board before
 *    that round, 0 since). Testing the mode first is what preserves that suppression;
 *    moving it below the `level-03` test would quietly resurrect the branch.
 * 2. **`level-03` before the run-ended latch.** An ended run already standing at the
 *    cert level needs no level move, and 11-17's run-ended guard exists to stop a level
 *    CHANGE re-arming a dead run's frame loop — where there is no change to make, it has
 *    nothing to guard. Ordering the latch first would return `'unreachable'` there and
 *    disable the cert harness on a branch where the discharge is genuinely reachable
 *    (T-11-39).
 * 3. **run-ended, then `'force'`.** This is round-5 gap 1: campaign, run over, below the
 *    cert level. The level half refuses to move, so an arm here can only be discharged
 *    by an unrelated later session.
 *
 * Pure: no React, no refs, no side effects, and no import outside a `LevelId` type. The
 * `LevelId` specifier matches `PlayingHost.tsx` — `app -> core` is not an allowed edge in
 * `eslint.config.js`'s boundaries matrix, so the type comes through `src/runtime`.
 */
import type { LevelId } from '../../src/runtime/loadLevel';

/**
 * `'force'` — the level half must move the session to the cert level, then defer.
 * `'ready'` — the precondition already holds; no level move, and an arm is legitimate.
 * `'unreachable'` — nothing may be armed; a one-shot armed here could not discharge.
 */
export type CertLevelPlan = 'force' | 'ready' | 'unreachable';

export function certLevelPlanFor(args: {
  mode: 'campaign' | 'endless' | 'daily';
  runEnded: boolean;
  levelId: LevelId;
}): CertLevelPlan {
  if (args.mode === 'endless') {
    return 'unreachable';
  }
  // 12-01 / D-10: daily is `unreachable` for the same reason endless is, and it gets
  // its own statement rather than being folded into the line above. A daily run is on a
  // DATE-derived generated board, not on a catalog level, so `levelId` says nothing
  // about it — forcing the session to `level-03` to discharge a cert arm would destroy
  // the live daily board, and arming a one-shot that can never discharge is the exact
  // stranding round-5 gap 1 was about.
  if (args.mode === 'daily') {
    return 'unreachable';
  }
  if (args.levelId === 'level-03') {
    return 'ready';
  }
  if (args.runEnded) {
    return 'unreachable';
  }
  return 'force';
}
