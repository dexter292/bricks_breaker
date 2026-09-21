import type { Intent, World } from './types';
import { BrickFlags, EventCode } from './types';
import { advanceBall } from './physics/integrate';
import { forEachBrickCandidate } from './physics/broadphase';
import { sweepCircleAabb } from './physics/sweep';
import { reflectVelocity, resolvePaddleEnglish, enforceMinVerticalRatio } from './physics/resolve';
import { pushEvent } from './events/ring';

const KIND_WALL = 0;
const KIND_PADDLE = 1;
const KIND_BRICK = 2;
const KIND_BOTTOM = 3;

/**
 * Push circle center out of an overlapping AABB to distance radius+eps (F-12).
 * Returns true if a correction was applied.
 */
function depenetrateCircleAabb(
  world: World,
  bi: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  eps: number,
): boolean {
  'worklet';
  const cx = world.ballX[bi];
  const cy = world.ballY[bi];
  const r = world.ballRadius[bi];
  // Closest point on AABB to center
  let qx = cx;
  if (qx < minX) qx = minX;
  else if (qx > maxX) qx = maxX;
  let qy = cy;
  if (qy < minY) qy = minY;
  else if (qy > maxY) qy = maxY;

  let dx = cx - qx;
  let dy = cy - qy;
  // Center inside solid AABB — push along shallowest face
  if (dx === 0 && dy === 0) {
    const left = cx - minX;
    const right = maxX - cx;
    const top = cy - minY;
    const bot = maxY - cy;
    let m = left;
    let nx = -1;
    let ny = 0;
    if (right < m) {
      m = right;
      nx = 1;
      ny = 0;
    }
    if (top < m) {
      m = top;
      nx = 0;
      ny = -1;
    }
    if (bot < m) {
      m = bot;
      nx = 0;
      ny = 1;
    }
    world.ballX[bi] = cx + nx * (m + r + eps);
    world.ballY[bi] = cy + ny * (m + r + eps);
    return true;
  }

  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= r - 1e-8) {
    return false; // not overlapping (or only grazing)
  }
  const scale = (r + eps) / (dist < 1e-8 ? 1e-8 : dist);
  world.ballX[bi] = qx + dx * scale;
  world.ballY[bi] = qy + dy * scale;
  return true;
}

/**
 * Pack live balls into dense prefix [0, live).
 * activeBallCount === live dense count (Phase 5 / D-12).
 */
function compactBallPool(world: World): void {
  'worklet';
  let write = 0;
  const n = world.maxBalls;
  for (let i = 0; i < n; i++) {
    if (world.ballActive[i] !== 1) {
      continue;
    }
    if (write !== i) {
      world.ballX[write] = world.ballX[i];
      world.ballY[write] = world.ballY[i];
      world.ballVx[write] = world.ballVx[i];
      world.ballVy[write] = world.ballVy[i];
      world.ballRadius[write] = world.ballRadius[i];
      world.ballActive[write] = 1;
      world.ballActive[i] = 0;
    }
    write += 1;
  }
  world.activeBallCount = write;
}

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
    let paddleHitThisStep = 0;

    // F-12: resolve deep overlaps before CCD so t=0 contacts do not burn all iterations.
    // Walls (field bounds as inward AABBs are thin — depenetrate against playfield edges).
    {
      const r = world.ballRadius[bi];
      const eps = sepEps;
      if (world.ballX[bi] < r + eps) {
        world.ballX[bi] = r + eps;
      } else if (world.ballX[bi] > logicalWidth - r - eps) {
        world.ballX[bi] = logicalWidth - r - eps;
      }
      if (world.ballY[bi] < r + eps) {
        world.ballY[bi] = r + eps;
      }
      // Do not clamp bottom — BALL_OUT owns the miss zone below the paddle.

      // Bricks (breakable + steel)
      for (let brickIndex = 0; brickIndex < world.brickCount; brickIndex++) {
        if (world.brickHp[brickIndex] <= 0) {
          continue;
        }
        depenetrateCircleAabb(
          world,
          bi,
          world.brickX[brickIndex],
          world.brickY[brickIndex],
          world.brickX[brickIndex] + world.brickW[brickIndex],
          world.brickY[brickIndex] + world.brickH[brickIndex],
          eps,
        );
      }

      // Paddle: only depenetrate when center is above the paddle bottom
      // (underside overlaps must fall through to BALL_OUT — never hoist upward).
      if (world.ballY[bi] <= paddleMaxY) {
        depenetrateCircleAabb(
          world,
          bi,
          paddleMinX,
          paddleMinY,
          paddleMaxX,
          paddleMaxY,
          eps,
        );
        // Prefer resting on top face after depenetration
        if (
          world.ballY[bi] > paddleMinY - r &&
          world.ballY[bi] < paddleMinY + r &&
          world.ballX[bi] >= paddleMinX - r &&
          world.ballX[bi] <= paddleMaxX + r
        ) {
          world.ballY[bi] = paddleMinY - r - eps;
        }
      }
    }

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
      // F-12: ignore paddle when center is already below its bottom face
      // (player slid under a dying ball) — bottom / BALL_OUT owns that region.
      if (cy <= paddleMaxY) {
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

      // --- Bricks ---
      // Exhaustive scan when brickCount is small (Phase 3 = 35). loadTestGrid's
      // packed 1-row cellToBrick is NOT spatial — broadphase misses most bricks
      // and the ball tunnels. Dense levels (cols×rows) still use the grid.
      const useSpatial =
        world.gridRows > 1 &&
        world.gridCols > 1 &&
        world.gridCols * world.gridRows >= world.brickCount;

      const considerBrick = (brickIndex: number) => {
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
      };

      if (useSpatial) {
        forEachBrickCandidate(world, cx, cy, x1, y1, radius, considerBrick);
      } else {
        for (let brickIndex = 0; brickIndex < world.brickCount; brickIndex++) {
          considerBrick(brickIndex);
        }
      }

      // Miss → advance full remaining once, then stop (F-11: zero remaining so
      // the post-loop exhaust path cannot advance a second time).
      if (bestKind < 0 || bestT > 1) {
        advanceBall(world, bi, remaining);
        remaining = 0;
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
        // F-12 / F-48: at most one PADDLE_HIT per ball per step
        if (paddleHitThisStep === 0) {
          paddleHitThisStep = 1;
          pushEvent(world, EventCode.PADDLE_HIT, bi, -1, hx, hy);
        }
        continue;
      }

      if (bestKind === KIND_WALL) {
        let out = reflectVelocity(
          world.ballVx[bi],
          world.ballVy[bi],
          bestNx,
          bestNy,
        );
        out = enforceMinVerticalRatio(out.vx, out.vy);
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
        let out = reflectVelocity(
          world.ballVx[bi],
          world.ballVy[bi],
          bestNx,
          bestNy,
        );
        out = enforceMinVerticalRatio(out.vx, out.vy);
        world.ballVx[bi] = out.vx;
        world.ballVy[bi] = out.vy;
        world.ballX[bi] = world.ballX[bi] + bestNx * sepEps;
        world.ballY[bi] = world.ballY[bi] + bestNy * sepEps;

        const unbreakable =
          (world.brickFlags[bIdx] & BrickFlags.UNBREAKABLE) !== 0;

        if (unbreakable) {
          // F-48: mark touched so steel cannot spam BRICK_HIT every CCD iter
          if (world.brickDamagedThisStep[bIdx] === 0) {
            world.brickDamagedThisStep[bIdx] = 1;
            // D-10: reflect only; HP unchanged; never BRICK_BREAK
            // evA = HP snapshot for VFX color (F-13); evB = brick index
            pushEvent(
              world,
              EventCode.BRICK_HIT,
              world.brickHp[bIdx],
              bIdx,
              hx,
              hy,
            );
          }
        } else if (world.brickDamagedThisStep[bIdx] === 0) {
          world.brickDamagedThisStep[bIdx] = 1;
          const hpBefore = world.brickHp[bIdx];
          let hp = hpBefore - 1;
          if (hp < 0) hp = 0;
          world.brickHp[bIdx] = hp;
          if (hp <= 0) {
            pushEvent(world, EventCode.BRICK_BREAK, hpBefore, bIdx, hx, hy);
            // Clear from grid / inactive
            const cells = world.cellToBrick;
            for (let c = 0; c < cells.length; c++) {
              if (cells[c] === bIdx) {
                cells[c] = -1;
              }
            }
          } else {
            pushEvent(world, EventCode.BRICK_HIT, hpBefore, bIdx, hx, hy);
          }
        }
        // Already damaged this step: reflect only, no further HP loss / events
      }
    }

    // Cap leftover: if CCD exhausted, discard remaining motion (F-11 / F-12).
    // Free-integrating here tunnels through colliders the loop already failed to clear.
    if (remaining > toiEps && world.ballActive[bi] && ccd >= maxCcd) {
      remaining = 0;
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

  // 5. Dense live ball count (D-12) — after BALL_OUT marks, before tick++
  compactBallPool(world);

  // 6. tick++
  world.tick += 1;
}
