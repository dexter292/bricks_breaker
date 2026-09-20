import type { World } from '../types';

/**
 * Map each alive brick into every broadphase cell its AABB overlaps (D-12).
 * loadTestGrid only packs cellToBrick[i]=i in a 1-row layout — that misses
 * spatially distant bricks and causes tunneling in playable grids.
 *
 * Requires cellToBrick.length >= cols*rows (allocate default 256).
 */
export function assignSpatialBrickCells(
  world: World,
  cols: number,
  rows: number,
): void {
  'worklet';
  const logicalWidth = 360;
  const logicalHeight = 640;
  const cellCount = cols * rows;
  if (cols <= 0 || rows <= 0 || cellCount > world.cellToBrick.length) {
    return;
  }

  for (let i = 0; i < world.cellToBrick.length; i++) {
    world.cellToBrick[i] = -1;
  }

  const cellW = logicalWidth / cols;
  const cellH = logicalHeight / rows;

  for (let bi = 0; bi < world.brickCount; bi++) {
    if (world.brickHp[bi] <= 0) {
      continue;
    }
    const x0 = world.brickX[bi];
    const y0 = world.brickY[bi];
    const x1 = x0 + world.brickW[bi];
    const y1 = y0 + world.brickH[bi];

    let c0 = Math.floor(x0 / cellW);
    let c1 = Math.floor((x1 - 1e-6) / cellW);
    let r0 = Math.floor(y0 / cellH);
    let r1 = Math.floor((y1 - 1e-6) / cellH);

    if (c0 < 0) c0 = 0;
    if (r0 < 0) r0 = 0;
    if (c1 >= cols) c1 = cols - 1;
    if (r1 >= rows) r1 = rows - 1;
    if (c0 > c1 || r0 > r1) {
      continue;
    }

    for (let ry = r0; ry <= r1; ry++) {
      for (let cx = c0; cx <= c1; cx++) {
        const cellIndex = ry * cols + cx;
        // First brick wins if two overlap a cell (gaps keep this rare)
        if (world.cellToBrick[cellIndex] < 0) {
          world.cellToBrick[cellIndex] = bi;
        }
      }
    }
  }

  world.gridCols = cols;
  world.gridRows = rows;
}
