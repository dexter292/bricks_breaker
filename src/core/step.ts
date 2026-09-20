import type { Intent, World } from './types';
import { BrickFlags, EventCode } from './types';
import { advanceBall } from './physics/integrate';
import { forEachBrickCandidate } from './physics/broadphase';
import { sweepCircleAabb } from './physics/sweep';
import { reflectVelocity, resolvePaddleEnglish } from './physics/resolve';
import { pushEvent } from './events/ring';

const KIND_WALL = 0;
const KIND_PADDLE = 1;
const KIND_BRICK = 2;
const KIND_BOTTOM = 3;

/**
 * Advance one fixed simulation step with swept CCD (PHYS-02 / PHYS-06 / D-06).
 * Callers supply FIXED_DT; core never integrates leftover partial steps.
 * No React / service calls — events go to the ring only (D-08).
 */
export function stepWorld(world: World, intent: Intent, dt: number): void {
  'worklet';
  // Literals must match constants.ts — worklets cannot close over module consts.
  const logicalWidth = 360;
  const logicalHeight = 640;
  const maxCcd = 5; // MAX_CCD_ITERATIONS
  const sepEps = 1e-4; // SEPARATION_EPS
  const wallThickness = 20;
  const toiEps = 1e-8;

  // 1. Clear per-step brick damage marks
  const nDamage = world.brickDamagedThisStep.length;
  for (let i = 0; i < nDamage; i++) {
    world.brickDamagedThisStep[i] = 0;
  }

  // 2. Intent guard (T-02-01): only apply finite paddleX; clamp to field
  const px = intent.paddleX;
  if (Number.isFinite(px)) {
    const half = world.paddleW * 0.5;
    let x = px;
    if (x < half) x = half;
    else if (x > logicalWidth - half) x = logicalWidth - half;
    world.paddleX = x;
  }
  // Non-finite launch / other flags ignored

  if (!Number.isFinite(dt) || dt <= 0) {
    world.tick += 1;
    return;
  }

  const paddleHalfW = world.paddleW * 0.5;
  const paddleMinX = world.paddleX - paddleHalfW;
  const paddleMaxX = world.paddleX + paddleHalfW;
  const paddleMinY = world.paddleY;
  const paddleMaxY = world.paddleY + world.paddleH;

  // 3. Per active ball CCD (index order, D-07)
  const ballLimit = world.activeBallCount;
  for (let bi = 0; bi < ballLimit; bi++) {
    if (!world.ballActive[bi]) {
      continue;
    }

    let remaining = dt;
    let ccd = 0;
    while (ccd < maxCcd && remaining > toiEps) {
      ccd += 1;

      const cx = world.ballX[bi];
      const cy = world.ballY[bi];
      const vx = world.ballVx[bi];
      const vy = world.ballVy[bi];
      const radius = world.ballRadius[bi];

      if (
        !Number.isFinite(cx) ||
        !Number.isFinite(cy) ||
        !Number.isFinite(vx) ||
        !Number.isFinite(vy) ||
        !Number.isFinite(radius)
      ) {
        break;
      }

      const dx = vx * remaining;
      const dy = vy * remaining;
      const x1 = cx + dx;
      const y1 = cy + dy;

      let bestT = 2; // >1 → miss
      let bestNx = 0;
      let bestNy = 0;
      let bestKind = -1;
      let bestIndex = -1;

      // --- Walls (thin AABBs outside the field) ---
      // Left
      {
        const h = sweepCircleAabb(
          cx,
          cy,
          radius,
          dx,
          dy,
          -wallThickness,
          -wallThickness,
          0,
          logicalHeight + wallThickness,
        );
        if (h.hit && h.t < bestT) {
          bestT = h.t;
          bestNx = h.nx;
          bestNy = h.ny;
          bestKind = KIND_WALL;
          bestIndex = -1;
        }
      }
      // Right
      {
        const h = sweepCircleAabb(
          cx,
          cy,
          radius,
          dx,
          dy,
          logicalWidth,
          -wallThickness,
          logicalWidth + wallThickness,
          logicalHeight + wallThickness,
        );
        if (h.hit && h.t < bestT) {
          bestT = h.t;
          bestNx = h.nx;
          bestNy = h.ny;
          bestKind = KIND_WALL;
          bestIndex = -1;
        }
      }
      // Top
      {
        const h = sweepCircleAabb(
          cx,
          cy,
          radius,
          dx,
          dy,
          -wallThickness,
          -wallThickness,
          logicalWidth + wallThickness,
          0,
        );
        if (h.hit && h.t < bestT) {
          bestT = h.t;
          bestNx = h.nx;
          bestNy = h.ny;
          bestKind = KIND_WALL;
          bestIndex = -1;
        }
      }
      // Bottom → BALL_OUT stub
      {
        const h = sweepCircleAabb(
          cx,
          cy,
          radius,
          dx,
          dy,
          -wallThickness,
          logicalHeight,
          logicalWidth + wallThickness,
          logicalHeight + wallThickness,
        );
        if (h.hit && h.t < bestT) {
          bestT = h.t;
          bestNx = h.nx;
          bestNy = h.ny;
          bestKind = KIND_BOTTOM;
          bestIndex = -1;
        }
      }

      // --- Paddle ---
      {
        const h = sweepCircleAabb(
          cx,
          cy,
          radius,
          dx,
          dy,
          paddleMinX,
          paddleMinY,
          paddleMaxX,
          paddleMaxY,
        );
        if (h.hit && h.t < bestT) {
          bestT = h.t;
          bestNx = h.nx;
          bestNy = h.ny;
          bestKind = KIND_PADDLE;
          bestIndex = -1;
        }
      }

      // --- Bricks (grid broadphase) ---
      forEachBrickCandidate(world, cx, cy, x1, y1, radius, (brickIndex) => {
        if (brickIndex < 0 || brickIndex >= world.brickCount) {
          return;
        }
        if (world.brickHp[brickIndex] <= 0) {
          return;
        }
        const bx = world.brickX[brickIndex];
        const by = world.brickY[brickIndex];
        const bw = world.brickW[brickIndex];
        const bh = world.brickH[brickIndex];
        const h = sweepCircleAabb(
          cx,
          cy,
          radius,
          dx,
          dy,
          bx,
          by,
          bx + bw,
          by + bh,
        );
        if (h.hit && h.t < bestT) {
          bestT = h.t;
          bestNx = h.nx;
          bestNy = h.ny;
          bestKind = KIND_BRICK;
          bestIndex = brickIndex;
        }
      });

      // Miss → advance full remaining and stop CCD for this ball
      if (bestKind < 0 || bestT > 1) {
        advanceBall(world, bi, remaining);
        break;
      }

      const tAbs = bestT * remaining;
      advanceBall(world, bi, tAbs);
      remaining -= tAbs;

      const hx = world.ballX[bi];
      const hy = world.ballY[bi];

      if (bestKind === KIND_BOTTOM) {
        pushEvent(world, EventCode.BALL_OUT, bi, -1, hx, hy);
        world.ballActive[bi] = 0;
        break;
      }

      if (bestKind === KIND_PADDLE) {
        const out = resolvePaddleEnglish(
          hx,
          world.paddleX,
          paddleHalfW,
          world.ballVx[bi],
          world.ballVy[bi],
        );
        world.ballVx[bi] = out.vx;
        world.ballVy[bi] = out.vy;
        // SEPARATION_EPS nudge along contact normal (prefer upward if flat)
        let nx = bestNx;
        let ny = bestNy;
        if (ny > 0) {
          // Paddle top face: push ball upward (negative y)
          ny = -Math.abs(ny) || -1;
        }
        world.ballX[bi] = world.ballX[bi] + nx * sepEps;
        world.ballY[bi] = world.ballY[bi] + ny * sepEps;
        pushEvent(world, EventCode.PADDLE_HIT, bi, -1, hx, hy);
        continue;
      }

      if (bestKind === KIND_WALL) {
        const out = reflectVelocity(
          world.ballVx[bi],
          world.ballVy[bi],
          bestNx,
          bestNy,
        );
        world.ballVx[bi] = out.vx;
        world.ballVy[bi] = out.vy;
        world.ballX[bi] = world.ballX[bi] + bestNx * sepEps;
        world.ballY[bi] = world.ballY[bi] + bestNy * sepEps;
        pushEvent(world, EventCode.WALL_HIT, bi, -1, hx, hy);
        continue;
      }

      // KIND_BRICK
      {
        const bIdx = bestIndex;
        const out = reflectVelocity(
          world.ballVx[bi],
          world.ballVy[bi],
          bestNx,
          bestNy,
        );
        world.ballVx[bi] = out.vx;
        world.ballVy[bi] = out.vy;
        world.ballX[bi] = world.ballX[bi] + bestNx * sepEps;
        world.ballY[bi] = world.ballY[bi] + bestNy * sepEps;

        const unbreakable =
          (world.brickFlags[bIdx] & BrickFlags.UNBREAKABLE) !== 0;

        if (unbreakable) {
          // D-10: reflect only; HP unchanged; never BRICK_BREAK
          pushEvent(world, EventCode.BRICK_HIT, bi, bIdx, hx, hy);
        } else if (world.brickDamagedThisStep[bIdx] === 0) {
          world.brickDamagedThisStep[bIdx] = 1;
          let hp = world.brickHp[bIdx] - 1;
          if (hp < 0) hp = 0;
          world.brickHp[bIdx] = hp;
          if (hp <= 0) {
            pushEvent(world, EventCode.BRICK_BREAK, bi, bIdx, hx, hy);
            // Clear from grid / inactive
            const cells = world.cellToBrick;
            for (let c = 0; c < cells.length; c++) {
              if (cells[c] === bIdx) {
                cells[c] = -1;
              }
            }
          } else {
            pushEvent(world, EventCode.BRICK_HIT, bi, bIdx, hx, hy);
          }
        }
        // Already damaged this step: reflect only, no further HP loss
      }
    }

    // Cap leftover: if CCD exhausted, advance remaining motion
    if (remaining > toiEps && world.ballActive[bi]) {
      // Only if we exited due to maxCcd without a final miss-advance
      // (miss path already advanced and broke with remaining unused conceptually)
      // After loop exit via maxCcd, consume leftover:
      const stillHasTime = remaining > toiEps;
      if (stillHasTime && ccd >= maxCcd) {
        advanceBall(world, bi, remaining);
      }
    }

    // 4. Bounds backstop (clamp center inside field expanded by radius)
    if (world.ballActive[bi]) {
      const r = world.ballRadius[bi];
      let bx = world.ballX[bi];
      let by = world.ballY[bi];
      if (bx < r) bx = r;
      else if (bx > logicalWidth - r) bx = logicalWidth - r;
      if (by < r) by = r;
      else if (by > logicalHeight - r) by = logicalHeight - r;
      world.ballX[bi] = bx;
      world.ballY[bi] = by;
    }
  }

  // 5. tick++
  world.tick += 1;
}
