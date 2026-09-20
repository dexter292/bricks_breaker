import type { World } from '../types';
import { loadTestGrid, type TestBrickSpec } from '../reset';

/**
 * Hardcoded Phase 3 playable grid (D-20).
 * Multi-HP breakables + unbreakables; deterministic layout; no platform imports.
 * Call after resetWorld — reset clears bricks by design.
 */
export function loadPhase3Grid(world: World): void {
  'worklet';
  // Literals match LOGICAL_WIDTH/HEIGHT — worklets cannot close over module consts.
  const cols = 7;
  const rows = 5;
  const brickW = 44;
  const brickH = 18;
  const gapX = 4;
  const gapY = 4;
  const fieldW = 360;
  const topMargin = 56;
  const totalW = cols * brickW + (cols - 1) * gapX;
  const originX = (fieldW - totalW) * 0.5;

  // Row HP pattern: mix of 1–3 among breakables; steel on corners of row 0 & 2.
  // Distinct breakable HP values: 1, 2, 3. Unbreakable: ≥2 steel bricks.
  const hpByRow = [3, 2, 2, 1, 1];
  const specs: TestBrickSpec[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = originX + c * (brickW + gapX);
      const y = topMargin + r * (brickH + gapY);
      const steel =
        (r === 0 && (c === 0 || c === cols - 1)) ||
        (r === 2 && c === Math.floor(cols / 2));
      if (steel) {
        specs.push({
          x,
          y,
          w: brickW,
          h: brickH,
          hp: 99,
          unbreakable: true,
        });
      } else {
        specs.push({
          x,
          y,
          w: brickW,
          h: brickH,
          hp: hpByRow[r],
        });
      }
    }
  }

  loadTestGrid(world, specs);
}
