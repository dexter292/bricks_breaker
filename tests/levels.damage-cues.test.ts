/**
 * LVL-02 / LVL-03 — pure stroke plans for crack/hatch (no Skia).
 */
import { describe, expect, it } from 'vitest';
import { BrickFlags, planBrickDamageCues } from '../src/core';
import type { BrickCueStroke } from '../src/core';

const BOX = { x: 10, y: 20, w: 40, h: 16 };

function assertInsideAabb(
  strokes: BrickCueStroke[],
  x: number,
  y: number,
  w: number,
  h: number,
  tol = 1,
): void {
  const xMin = x - tol;
  const xMax = x + w + tol;
  const yMin = y - tol;
  const yMax = y + h + tol;
  for (const s of strokes) {
    expect(s.x0).toBeGreaterThanOrEqual(xMin);
    expect(s.x0).toBeLessThanOrEqual(xMax);
    expect(s.x1).toBeGreaterThanOrEqual(xMin);
    expect(s.x1).toBeLessThanOrEqual(xMax);
    expect(s.y0).toBeGreaterThanOrEqual(yMin);
    expect(s.y0).toBeLessThanOrEqual(yMax);
    expect(s.y1).toBeGreaterThanOrEqual(yMin);
    expect(s.y1).toBeLessThanOrEqual(yMax);
  }
}

function strokeKey(s: BrickCueStroke): string {
  return `${s.x0},${s.y0},${s.x1},${s.y1}`;
}

describe('levels.damage-cues', () => {
  // 04-W0-06 / LVL-02 / LVL-03
  it('HP 3/2/1 distinct crack stroke counts; unbreakable uses hatch plan not cracks', () => {
    const hp3 = planBrickDamageCues({ ...BOX, hp: 3, flags: 0 });
    const hp2 = planBrickDamageCues({ ...BOX, hp: 2, flags: 0 });
    const hp1 = planBrickDamageCues({ ...BOX, hp: 1, flags: 0 });
    const steel = planBrickDamageCues({
      ...BOX,
      hp: 99,
      flags: BrickFlags.UNBREAKABLE,
    });
    const dead = planBrickDamageCues({ ...BOX, hp: 0, flags: 0 });
    const negative = planBrickDamageCues({ ...BOX, hp: -1, flags: 0 });

    expect(hp3).toHaveLength(0);
    expect(hp2).toHaveLength(1);
    expect(hp1).toHaveLength(2);
    expect(steel.length).toBeGreaterThanOrEqual(2);
    expect(dead).toHaveLength(0);
    expect(negative).toHaveLength(0);

    const hp1Keys = hp1.map(strokeKey).sort().join('|');
    const steelKeys = steel.map(strokeKey).sort().join('|');
    expect(steelKeys).not.toEqual(hp1Keys);

    assertInsideAabb(hp2, BOX.x, BOX.y, BOX.w, BOX.h);
    assertInsideAabb(hp1, BOX.x, BOX.y, BOX.w, BOX.h);
    assertInsideAabb(steel, BOX.x, BOX.y, BOX.w, BOX.h);

    // Flags first: steel never follows breakable crack counts for same hp
    const steelAsHp1 = planBrickDamageCues({
      ...BOX,
      hp: 1,
      flags: BrickFlags.UNBREAKABLE,
    });
    expect(steelAsHp1.length).toBeGreaterThanOrEqual(2);
    expect(steelAsHp1.map(strokeKey).sort().join('|')).not.toEqual(hp1Keys);
  });
});
