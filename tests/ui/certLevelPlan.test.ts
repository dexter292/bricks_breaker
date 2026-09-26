/**
 * @vitest-environment node
 *
 * 11-19 Task 1 — the cert-level policy's exhaustive truth table (N-END-01 / N-END-02).
 *
 * WHAT THIS GUARDS. `certLevelPlanFor` is the single decision the host's `Cert WC`
 * control asks about the cert deferral's `level-03` precondition. Three consumers read
 * its answer (the level half of `runCertWorstCase`, the deferral arm, and the
 * deferred-cert effect's self-cancel), so a wrong cell here is wrong in three places at
 * once. The same decision written in two places is what drifted apart in rounds 3, 4
 * and 5 of this phase; a table is what a predicate owes in exchange for being trusted.
 *
 * WHY THE DOMAIN IS DERIVED AND NOT LISTED. The level half of the domain is the set of
 * playable levels, and that set belongs to `src/services/storage/catalog.ts`, not here.
 * A hand-written list would go on passing while a sixth playable level escaped the
 * table entirely. `PLAYABLE_LEVEL_ORDER` is read at runtime and compared against the
 * list the table quantifies over, so a catalog change reds this file instead of
 * silently shrinking its coverage.
 *
 * Plain vitest, node environment, no jsdom and no mocks — the subject is pure.
 */
import { describe, expect, it } from 'vitest';
import type { LevelId } from '../../src/runtime/loadLevel';
import { PLAYABLE_LEVEL_ORDER } from '../../src/services/storage/catalog';
import {
  certLevelPlanFor,
  type CertLevelPlan,
} from '../../app/_components/certLevelPlan';

/**
 * The five ids the table below quantifies over. This list is NOT the domain — it is a
 * claim about the domain, and the set-equality case proves the claim against the
 * shipped catalog.
 */
const TABLE_LEVELS: readonly LevelId[] = [
  'level-01',
  'level-03',
  'level-04',
  'level-05',
  'level-06',
];

const MODES = ['campaign', 'endless'] as const;
const RUN_ENDED = [false, true] as const;

/** The expected answer for every cell, written out rather than computed. */
function expectedPlan(
  mode: 'campaign' | 'endless',
  runEnded: boolean,
  levelId: LevelId,
): CertLevelPlan {
  if (mode === 'endless') {
    // 11-16 suppressed BOTH endless sub-branches, including the one already on
    // level-03 where the deferral genuinely used to discharge. The mode test comes
    // first in the predicate for exactly that reason.
    return 'unreachable';
  }
  if (levelId === 'level-03') {
    return 'ready';
  }
  if (runEnded) {
    return 'unreachable';
  }
  return 'force';
}

describe('certLevelPlanFor — the cert-level policy over its real domain', () => {
  it('the level domain is DERIVED from the shipped catalog, not asserted here', () => {
    expect(
      PLAYABLE_LEVEL_ORDER.length,
      'PLAYABLE_LEVEL_ORDER (src/services/storage/catalog.ts) is the runtime value this table quantifies over. Five playable levels; if this moves, the table below is no longer exhaustive and the count is where you find out',
    ).toBe(5);
    expect(
      PLAYABLE_LEVEL_ORDER,
      'and it must still contain level-03 — the cert deferral’s discharge precondition names that id, so a catalog without it makes the whole predicate meaningless',
    ).toContain('level-03');
  });

  it('the table’s level list and PLAYABLE_LEVEL_ORDER are the same set — a sixth playable level reds this case', () => {
    const fromCatalog = [...PLAYABLE_LEVEL_ORDER].sort();
    const fromTable = [...TABLE_LEVELS].sort();
    expect(
      fromTable,
      'TABLE_LEVELS must equal PLAYABLE_LEVEL_ORDER as a set. When a sixth playable level ships, ADD IT TO TABLE_LEVELS and give it a row in expectedPlan — this case exists so that level cannot slip past the truth table by being absent from a hand-written list',
    ).toEqual(fromCatalog);
  });

  it('all 20 cells of mode x runEnded x levelId return the documented plan', () => {
    const cells: string[] = [];
    for (const mode of MODES) {
      for (const runEnded of RUN_ENDED) {
        for (const levelId of TABLE_LEVELS) {
          const actual = certLevelPlanFor({ mode, runEnded, levelId });
          const expectedValue = expectedPlan(mode, runEnded, levelId);
          expect(
            actual,
            `cell {mode: ${mode}, run: ${runEnded ? 'ENDED' : 'live'}, level: ${levelId}} must be '${expectedValue}'`,
          ).toBe(expectedValue);
          cells.push(
            `${mode}/${runEnded ? 'ended' : 'live'}/${levelId}=${actual}`,
          );
        }
      }
    }
    expect(
      cells.length,
      '2 modes x 2 run states x 5 levels = 20 cells, every one driven. A smaller number means the loop stopped short and the pass above is partial',
    ).toBe(20);
  });

  it('the two gap-relevant cells, by name and with their consequence', () => {
    expect(
      certLevelPlanFor({
        mode: 'campaign',
        runEnded: true,
        levelId: 'level-01',
      }),
      'campaign / run ENDED / below level-03 must be unreachable: the level half is refused there, so arming the one-shot strands it until some later session happens to walk to level-03 and discharges a worst-case load it never asked for. This is round-5 gap 1',
    ).toBe('unreachable');
    expect(
      certLevelPlanFor({
        mode: 'campaign',
        runEnded: true,
        levelId: 'level-03',
      }),
      'campaign / run ENDED / already at level-03 must be ready: the discharge precondition is ALREADY satisfied, so no level move is needed and the arm is legitimate. Returning unreachable here would disable the cert harness on a branch where it genuinely works (T-11-39)',
    ).toBe('ready');
    expect(
      certLevelPlanFor({
        mode: 'endless',
        runEnded: false,
        levelId: 'level-03',
      }),
      'and endless stays unreachable even at level-03 — 11-16 suppressed that sub-branch deliberately, which is why the mode test is evaluated first',
    ).toBe('unreachable');
  });
});
