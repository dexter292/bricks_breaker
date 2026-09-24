/**
 * LVL-04 — default level-03 load (Plan 01).
 * NH-2: level-02 is a compile fixture only — not a playable LevelId.
 * N-LVL-01: playable set is level-01 | 03 | 04 | 05 | 06.
 */
import { describe, expect, it } from 'vitest';
import { loadLevelById, type LevelId } from '../src/runtime/loadLevel';

const PLAYABLE: LevelId[] = [
  'level-01',
  'level-03',
  'level-04',
  'level-05',
  'level-06',
];

describe('runtime.loadLevel', () => {
  it('LevelId is playable set level-01 | 03 | 04 | 05 | 06', () => {
    expect(PLAYABLE).toHaveLength(5);
    expect(PLAYABLE).toContain('level-03');
    expect(PLAYABLE).not.toContain('level-02' as LevelId);
  });

  it('loadLevelById() default is level-03', () => {
    const result = loadLevelById();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Default arg must resolve the showpiece module (D-06).
    const explicit = loadLevelById('level-03');
    expect(explicit.ok).toBe(true);
    if (!explicit.ok) return;
    expect(result.compiled.brickCount).toBe(explicit.compiled.brickCount);
    expect(result.compiled.gridCols).toBe(explicit.compiled.gridCols);
    expect(result.compiled.gridRows).toBe(explicit.compiled.gridRows);
  });

  it('loadLevelById("level-03") returns ok:true', () => {
    const result = loadLevelById('level-03');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.compiled.brickCount).toBeGreaterThan(0);
    expect(result.compiled.gridCols * result.compiled.gridRows).toBeLessThanOrEqual(
      256,
    );
  });

  it('loads every playable LevelId', () => {
    for (const id of PLAYABLE) {
      const result = loadLevelById(id);
      expect(result.ok, id).toBe(true);
      if (!result.ok) continue;
      expect(result.compiled.brickCount).toBeGreaterThan(0);
    }
  });
});
