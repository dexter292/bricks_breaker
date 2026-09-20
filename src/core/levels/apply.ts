/**
 * Worklet-safe SoA fill from a trusted CompiledLevel (D-04, T-04-01).
 * Never parses JSON — only copies typed arrays after JS-thread validate/compile.
 */

import type { World } from '../types';
import type { CompiledLevel } from './schema';
import { assignSpatialBrickCells } from './spatial';

export function applyCompiledLevel(world: World, compiled: CompiledLevel): void {
  'worklet';
  const n =
    compiled.brickCount < world.brickX.length
      ? compiled.brickCount
      : world.brickX.length;

  for (let i = 0; i < world.cellToBrick.length; i++) {
    world.cellToBrick[i] = -1;
    world.brickDamagedThisStep[i] = 0;
  }

  for (let i = 0; i < n; i++) {
    world.brickX[i] = compiled.x[i];
    world.brickY[i] = compiled.y[i];
    world.brickW[i] = compiled.w[i];
    world.brickH[i] = compiled.h[i];
    world.brickHp[i] = compiled.hp[i];
    world.brickFlags[i] = compiled.flags[i];
  }

  world.brickCount = n;

  if (
    compiled.gridRows > 1 &&
    compiled.pitchX > 0 &&
    compiled.pitchY > 0
  ) {
    assignSpatialBrickCells(
      world,
      compiled.gridCols,
      compiled.gridRows,
      compiled.originX,
      compiled.originY,
      compiled.pitchX,
      compiled.pitchY,
    );
  } else {
    world.gridCols = n;
    world.gridRows = n > 0 ? 1 : 0;
    world.latticeOriginX = 0;
    world.latticeOriginY = 0;
    world.latticePitchX = 0;
    world.latticePitchY = 0;
    for (let i = 0; i < n; i++) {
      world.cellToBrick[i] = i;
    }
  }
}
