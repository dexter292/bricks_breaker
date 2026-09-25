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
 * Apply 1 HP of damage to a brick.
 *
 * An explosive break deals 1 HP to each 8-neighbour (row −1…+1, within each row
 * col −1…+1, skip self) and chains depth-first when a damaged neighbour is
 * itself explosive and breaks.
 *
 * The cascade runs on an explicit stack rather than by recursion: the worklets
 * Babel plugin rewrites each worklet's function declaration into a `var`
 * assignment and snapshots its closure at that point, so two worklets that call
 * each other can never both resolve — whichever is declared second is still
 * `undefined` when the first one's `__closure` is built, and the UI runtime
 * throws "undefined is not a function". Keeping the cascade inside one worklet
 * sidesteps that, and also bounds stack depth on the UI thread.
 *
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
  const cols = world.gridCols;
  const rows = world.gridRows;

  // Pending explosion centres, stride 4: [cellC, cellR, brickIdx, nextNeighbour].
  // Allocated on the first explosion so plain hits stay allocation-free.
  let stack: number[] | null = null;

  let tIdx = bIdx;
  let tHx = hx;
  let tHy = hy;
  let tFromBall = fromBall;
  let hasTarget = true;

  for (;;) {
    if (hasTarget) {
      hasTarget = false;
      const i = tIdx;
      if (i >= 0 && i < world.brickCount && world.brickHp[i] > 0) {
        const flags = world.brickFlags[i];

        if ((flags & BrickFlags.UNBREAKABLE) !== 0) {
          if (tFromBall && world.brickDamagedThisStep[i] === 0) {
            world.brickDamagedThisStep[i] = 1;
            pushEvent(world, EventCode.BRICK_HIT, world.brickHp[i], i, tHx, tHy);
          }
        } else if (tFromBall && world.brickDamagedThisStep[i] !== 0) {
          // Already took its one ball HP this step.
        } else {
          if (tFromBall) {
            world.brickDamagedThisStep[i] = 1;
          }
          const hpBefore = world.brickHp[i];
          let hp = hpBefore - 1;
          if (hp < 0) {
            hp = 0;
          }
          world.brickHp[i] = hp;

          if (hp <= 0) {
            pushEvent(world, EventCode.BRICK_BREAK, hpBefore, i, tHx, tHy);
            const cell = brickLatticeCell(world, i);
            clearBrickFromLattice(world, i);
            if ((flags & BrickFlags.EXPLOSIVE) !== 0 && cell != null) {
              if (stack === null) {
                stack = [];
              }
              stack.push(cell.c, cell.r, i, 0);
            }
          } else {
            pushEvent(world, EventCode.BRICK_HIT, hpBefore, i, tHx, tHy);
          }
        }
      }
      continue;
    }

    if (stack === null) {
      return;
    }
    const top = stack.length - 4;
    if (top < 0) {
      return;
    }

    const k = stack[top + 3];
    if (k >= 9) {
      stack.length = top;
      continue;
    }
    stack[top + 3] = k + 1;
    if (k === 4) {
      continue; // dr === 0 && dc === 0 — skip self
    }

    const nr = stack[top + 1] + (((k / 3) | 0) - 1);
    const nc = stack[top] + ((k % 3) - 1);
    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) {
      continue;
    }
    const nb = world.cellToBrick[nr * cols + nc];
    if (nb < 0 || nb === stack[top + 2]) {
      continue;
    }

    tIdx = nb;
    tHx = world.brickX[nb] + world.brickW[nb] * 0.5;
    tHy = world.brickY[nb] + world.brickH[nb] * 0.5;
    tFromBall = false;
    hasTarget = true;
  }
}
