import type { World } from '../types';

/**
 * Lattice broadphase for playable levels (D-12).
 *
 * Maps each brick into cellToBrick[row * cols + col] using the level lattice
 * (origin + pitch) — NOT a full-playfield division by layout cols×rows.
 * Dividing 360×640 by 7×5 made many bricks share one cell ("first wins") and
 * the ball tunneled through the rest.
 *
 * Requires cellToBrick.length >= cols*rows (allocate default 256).
 * Returns false when the grid cannot be built — caller must fall back (F-38).
 */
export function assignSpatialBrickCells(
  world: World,
  cols: number,
  rows: number,
  originX: number,
  originY: number,
  pitchX: number,
  pitchY: number,
): boolean {
  'worklet';
  const cellCount = cols * rows;
  if (
    cols <= 0 ||
    rows <= 0 ||
    cellCount > world.cellToBrick.length ||
    !(pitchX > 0) ||
    !(pitchY > 0)
  ) {
    return false;
  }

  for (let i = 0; i < world.cellToBrick.length; i++) {
    world.cellToBrick[i] = -1;
  }

  for (let bi = 0; bi < world.brickCount; bi++) {
    if (world.brickHp[bi] <= 0) {
      continue;
    }
    const c = Math.round((world.brickX[bi] - originX) / pitchX);
    const r = Math.round((world.brickY[bi] - originY) / pitchY);
    if (c < 0 || r < 0 || c >= cols || r >= rows) {
      continue;
    }
    world.cellToBrick[r * cols + c] = bi;
  }

  world.gridCols = cols;
  world.gridRows = rows;
  world.latticeOriginX = originX;
  world.latticeOriginY = originY;
  world.latticePitchX = pitchX;
  world.latticePitchY = pitchY;
  return true;
}
