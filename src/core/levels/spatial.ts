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
    // NJ-2: any live brick that cannot map, or two bricks claiming one cell → fail.
    // Silent continue / overwrite used to drop colliders while still returning true.
    if (c < 0 || r < 0 || c >= cols || r >= rows) {
      return false;
    }
    const cell = r * cols + c;
    if (world.cellToBrick[cell] >= 0) {
      return false;
    }
    world.cellToBrick[cell] = bi;
  }

  world.gridCols = cols;
  world.gridRows = rows;
  world.latticeOriginX = originX;
  world.latticeOriginY = originY;
  world.latticePitchX = pitchX;
  world.latticePitchY = pitchY;
  return true;
}
