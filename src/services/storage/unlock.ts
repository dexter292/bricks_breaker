/**
 * Pure unlock helpers — no I/O (N-PROG-01).
 */
import type { LevelId } from '../../core';
import { nextLevelId } from './catalog';

/** True if id is unlocked; level-01 is always unlocked. */
export function isUnlocked(
  unlocked: readonly LevelId[],
  id: LevelId,
): boolean {
  if (id === 'level-01') {
    return true;
  }
  return unlocked.includes(id);
}

/**
 * After clearing `cleared`, return unlocked list with next catalog id added.
 * Idempotent if next already present; never adds level-02.
 */
export function unlockAfterClear(
  unlocked: readonly LevelId[],
  cleared: LevelId,
): LevelId[] {
  const next = nextLevelId(cleared);
  const out: LevelId[] = [];
  const seen = new Set<LevelId>();
  for (const id of unlocked) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  if (!seen.has('level-01')) {
    out.unshift('level-01');
    seen.add('level-01');
  }
  if (next != null && !seen.has(next)) {
    out.push(next);
  }
  return out;
}
