import type { World } from '../types';

/**
 * Grid broadphase (D-12): walk cells overlapped by a swept circle segment.
 *
 * Lattice mode (pitchX > 0): cells are level-grid slots at origin+pitch —
 * used by playable compiled levels.
 * Legacy mode (pitchX <= 0): divide the full logical field by gridCols×gridRows —
 * used by dense physics fixtures that fill the field 1:1.
 */
export function forEachBrickCandidate(
  world: World,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  visit: (brickIndex: number) => void,
): void {
  'worklet';
  if (
    !Number.isFinite(x0) ||
    !Number.isFinite(y0) ||
    !Number.isFinite(x1) ||
    !Number.isFinite(y1) ||
    !Number.isFinite(radius) ||
    radius < 0
  ) {
    return;
  }

  const cols = world.gridCols | 0;
  const rows = world.gridRows | 0;
  if (cols <= 0 || rows <= 0) {
    return;
  }

  const useLattice = world.latticePitchX > 0 && world.latticePitchY > 0;
  let cellW: number;
  let cellH: number;
  let originX = 0;
  let originY = 0;

  if (useLattice) {
    cellW = world.latticePitchX;
    cellH = world.latticePitchY;
    originX = world.latticeOriginX;
    originY = world.latticeOriginY;
  } else {
    // Literals match constants.ts — worklets cannot close over module consts.
    const logicalWidth = 360;
    const logicalHeight = 640;
    cellW = logicalWidth / cols;
    cellH = logicalHeight / rows;
  }

  if (!(cellW > 0) || !(cellH > 0)) {
    return;
  }

  // AABB of segment expanded by radius
  let minX = x0 < x1 ? x0 : x1;
  let maxX = x0 > x1 ? x0 : x1;
  let minY = y0 < y1 ? y0 : y1;
  let maxY = y0 > y1 ? y0 : y1;
  minX -= radius;
  maxX += radius;
  minY -= radius;
  maxY += radius;

  let c0 = Math.floor((minX - originX) / cellW);
  let c1 = Math.floor((maxX - originX) / cellW);
  let r0 = Math.floor((minY - originY) / cellH);
  let r1 = Math.floor((maxY - originY) / cellH);

  if (c0 < 0) c0 = 0;
  if (r0 < 0) r0 = 0;
  if (c1 >= cols) c1 = cols - 1;
  if (r1 >= rows) r1 = rows - 1;
  if (c0 > c1 || r0 > r1) {
    return;
  }

  const cells = world.cellToBrick;
  const cellLen = cells.length;

  for (let ry = r0; ry <= r1; ry++) {
    const rowBase = ry * cols;
    for (let cx = c0; cx <= c1; cx++) {
      const cellIndex = rowBase + cx;
      if (cellIndex < 0 || cellIndex >= cellLen) {
        continue;
      }
      const bi = cells[cellIndex];
      if (bi < 0) {
        continue;
      }

      // Unique brick index: only visit on first occurrence in this window.
      // Stop at the current cell — scanning past it false-negatives vertical
      // duplicates (both cells clear each other → brick never visited) (F-47).
      let first = true;
      let done = false;
      for (let ry2 = r0; ry2 <= r1 && first && !done; ry2++) {
        const rowBase2 = ry2 * cols;
        for (let cx2 = c0; cx2 <= c1; cx2++) {
          if (ry2 === ry && cx2 === cx) {
            done = true;
            break;
          }
          const prev = cells[rowBase2 + cx2];
          if (prev === bi) {
            first = false;
            break;
          }
        }
      }
      if (first) {
        visit(bi);
      }
    }
  }
}
