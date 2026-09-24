/**
 * Brick HP damage + explosive AoE cascade (N-BRK-01).
 * Worklet-safe; no allocations on the hot path.
 */
import type { World } from '../types';
import { BrickFlags, EventCode } from '../types';
import { pushEvent } from '../events/ring';

function clearBrickFromLattice(world: World, bIdx: number): void {
  'worklet';
  const cells = world.cellToBrick;
  for (let c = 0; c < cells.length; c++) {
    if (cells[c] === bIdx) {
      cells[c] = -1;
    }
  }
}

/** Lattice cell for brick center; null when pitch unset or OOB. */
function brickLatticeCell(
  world: World,
  bIdx: number,
): { c: number; r: number } | null {
  'worklet';
  const pitchX = world.latticePitchX;
  const pitchY = world.latticePitchY;
  if (!(pitchX > 0) || !(pitchY > 0)) {
    return null;
  }
  const c = Math.round((world.brickX[bIdx] - world.latticeOriginX) / pitchX);
  const r = Math.round((world.brickY[bIdx] - world.latticeOriginY) / pitchY);
  if (c < 0 || r < 0 || c >= world.gridCols || r >= world.gridRows) {
    return null;
  }
  return { c, r };
}

/**
 * 8-neighbor 1 HP cascade. Neighbor order: row −1…+1, within each row col −1…+1
 * (skip self). Chains when a damaged neighbor is explosive and breaks.
 */
function explodeAtCell(
  world: World,
  centerC: number,
  centerR: number,
  centerIdx: number,
): void {
  'worklet';
  const cols = world.gridCols;
  const rows = world.gridRows;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      const nr = centerR + dr;
      const nc = centerC + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) {
        continue;
      }
      const nb = world.cellToBrick[nr * cols + nc];
      if (nb < 0 || nb === centerIdx) {
        continue;
      }
      const hx = world.brickX[nb] + world.brickW[nb] * 0.5;
      const hy = world.brickY[nb] + world.brickH[nb] * 0.5;
      applyBrickHpDamage(world, nb, hx, hy, false);
    }
  }
}

/**
 * Apply 1 HP of damage to a brick.
 * @param fromBall when true, enforces ≤1 ball-HP per brick per step via brickDamagedThisStep.
 *                 AoE cascade passes false so a brick can take ball + AoE in one step.
 */
export function applyBrickHpDamage(
  world: World,
  bIdx: number,
  hx: number,
  hy: number,
  fromBall: boolean,
): void {
  'worklet';
  if (bIdx < 0 || bIdx >= world.brickCount) {
    return;
  }
  if (world.brickHp[bIdx] <= 0) {
    return;
  }

  const flags = world.brickFlags[bIdx];
  const unbreakable = (flags & BrickFlags.UNBREAKABLE) !== 0;

  if (unbreakable) {
    if (fromBall && world.brickDamagedThisStep[bIdx] === 0) {
      world.brickDamagedThisStep[bIdx] = 1;
      pushEvent(world, EventCode.BRICK_HIT, world.brickHp[bIdx], bIdx, hx, hy);
    }
    return;
  }

  if (fromBall) {
    if (world.brickDamagedThisStep[bIdx] !== 0) {
      return;
    }
    world.brickDamagedThisStep[bIdx] = 1;
  }

  const hpBefore = world.brickHp[bIdx];
  let hp = hpBefore - 1;
  if (hp < 0) {
    hp = 0;
  }
  world.brickHp[bIdx] = hp;

  if (hp <= 0) {
    pushEvent(world, EventCode.BRICK_BREAK, hpBefore, bIdx, hx, hy);
    const cell = brickLatticeCell(world, bIdx);
    clearBrickFromLattice(world, bIdx);
    if ((flags & BrickFlags.EXPLOSIVE) !== 0 && cell != null) {
      explodeAtCell(world, cell.c, cell.r, bIdx);
    }
  } else {
    pushEvent(world, EventCode.BRICK_HIT, hpBefore, bIdx, hx, hy);
  }
}
