/**
 * D-20 — hardcoded Phase 3 grid: multi-HP breakables + unbreakable.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  loadPhase3Grid,
  BrickFlags,
} from '../src/core';

describe('phase3 hardcoded grid', () => {
  it('loads multi-HP breakables and at least one unbreakable', () => {
    const w = allocateWorld();
    resetWorld(w, 0xabc, 0xdef);
    loadPhase3Grid(w);

    expect(w.brickCount).toBeGreaterThanOrEqual(1);

    const breakableHp = new Set<number>();
    let unbreakableCount = 0;
    let hasHpAtLeast2 = false;

    for (let i = 0; i < w.brickCount; i++) {
      const flags = w.brickFlags[i];
      const hp = w.brickHp[i];
      if ((flags & BrickFlags.UNBREAKABLE) !== 0) {
        unbreakableCount += 1;
      } else if (hp > 0) {
        breakableHp.add(hp);
        if (hp >= 2) hasHpAtLeast2 = true;
      }
    }

    expect(unbreakableCount).toBeGreaterThanOrEqual(1);
    expect(hasHpAtLeast2).toBe(true);
    expect(breakableHp.size).toBeGreaterThanOrEqual(2);
  });
});
