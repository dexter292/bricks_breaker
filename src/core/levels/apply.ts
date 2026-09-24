/**
 * Worklet-safe SoA fill from a trusted CompiledLevel (D-04, T-04-01).
 * Never parses JSON — only copies typed arrays after JS-thread validate/compile.
 */

import type { World } from '../types';
import type { CompiledLevel } from './schema';
import { assignSpatialBrickCells } from './spatial';

/** Packed 1-row cellToBrick[i]=i — always collidable; used when spatial fails (F-38). */
function applyExhaustiveCellMap(world: World, n: number): void {
  'worklet';
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

export function applyCompiledLevel(world: World, compiled: CompiledLevel): void {
  'worklet';
  // F-38: never write past World brick capacity (silent truncate was latent).
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

  // Lattice for any authored grid with valid pitch — including 1-row boards
  // (N-BRK-01 AoE needs pitch). Exhaustive fallback only when spatial fails / no pitch.
  if (
    compiled.gridCols > 0 &&
    compiled.gridRows > 0 &&
    compiled.pitchX > 0 &&
    compiled.pitchY > 0
  ) {
    const mapped = assignSpatialBrickCells(
      world,
      compiled.gridCols,
      compiled.gridRows,
      compiled.originX,
      compiled.originY,
      compiled.pitchX,
      compiled.pitchY,
    );
    // F-38: spatial early-return left grid stale / all -1 — fall back exhaustive.
    if (!mapped) {
      applyExhaustiveCellMap(world, n);
    }
  } else {
    applyExhaustiveCellMap(world, n);
  }
}
