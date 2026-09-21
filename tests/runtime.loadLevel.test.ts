/**
 * LVL-04 — default level-03 load (Plan 01).
 */
import { describe, expect, it } from 'vitest';
import { loadLevelById, type LevelId } from '../src/runtime/loadLevel';

describe('runtime.loadLevel', () => {
  it('LevelId includes level-03', () => {
    const ids: LevelId[] = ['level-01', 'level-02', 'level-03'];
    expect(ids).toContain('level-03');
    // Exhaustiveness: assigning outside the union is a type error at compile time.
    expect(ids).toHaveLength(3);
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
