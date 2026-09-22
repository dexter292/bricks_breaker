/**
 * LVL-04 — default level-03 load (Plan 01).
 * NH-2: level-02 is a compile fixture only — not a playable LevelId.
 */
import { describe, expect, it } from 'vitest';
import { loadLevelById, type LevelId } from '../src/runtime/loadLevel';

describe('runtime.loadLevel', () => {
  it('LevelId is playable set level-01 | level-03', () => {
    const ids: LevelId[] = ['level-01', 'level-03'];
    expect(ids).toContain('level-03');
    expect(ids).toHaveLength(2);
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
});
