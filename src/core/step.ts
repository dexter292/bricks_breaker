import type { Intent, World } from './types';
import { BrickFlags, EventCode } from './types';
import { advanceBall } from './physics/integrate';
import { sweepCircleAabbInto, type SweepHit } from './physics/sweep';
import {
  reflectVelocityInto,
  resolvePaddleEnglishInto,
  enforceMinVerticalRatioInto,
  enforceMinHorizontalRatioInto,
  type Velocity2,
} from './physics/resolve';
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

/** True when circle overlaps solid AABB (shell or center-inside). */
function circleOverlapsAabb(
  cx: number,
  cy: number,
  r: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  'worklet';
  let qx = cx;
  if (qx < minX) qx = minX;
  else if (qx > maxX) qx = maxX;
  let qy = cy;
  if (qy < minY) qy = minY;
  else if (qy > maxY) qy = maxY;
  const dx = cx - qx;
  const dy = cy - qy;
  if (dx === 0 && dy === 0) {
    return true;
  }
  // Strict penetration only (dist < r). Flush contact (dist == r) is a valid
  // resting/bounce surface — treating it as overlap made escape hatch teleport
  // every frame and preferred "up" when vy < 0 (into the brick stack).
  return dx * dx + dy * dy < r * r - 1e-8;
}

/**
 * After CCD: if the ball still overlaps any live brick solid (common when
 * gapY/gapX < 2r so underside contact embeds into the neighbor), eject outside
 * the overlapping cluster. Never run a blanket per-brick depenetrate pre-pass —
 * that pushes out of one brick into another and pins the ball.
 */
function escapeOverlappingBricks(world: World, bi: number, eps: number): void {
  'worklet';
  const r = world.ballRadius[bi];
  const cx0 = world.ballX[bi];
  const cy0 = world.ballY[bi];
  const vx = world.ballVx[bi];
  const vy = world.ballVy[bi];
  const nBricks = world.brickCount;

  let clusterMinX = 0;
  let clusterMinY = 0;
  let clusterMaxX = 0;
  let clusterMaxY = 0;
  let overlapCount = 0;
  let deepestIdx = -1;
  let deepestPen = -1;

  for (let i = 0; i < nBricks; i++) {
    if (world.brickHp[i] <= 0) {
      continue;
    }
    const minX = world.brickX[i];
    const minY = world.brickY[i];
    const maxX = minX + world.brickW[i];
    const maxY = minY + world.brickH[i];
    if (!circleOverlapsAabb(cx0, cy0, r, minX, minY, maxX, maxY)) {
      continue;
    }
    if (overlapCount === 0) {
      clusterMinX = minX;
      clusterMinY = minY;
      clusterMaxX = maxX;
      clusterMaxY = maxY;
    } else {
      if (minX < clusterMinX) clusterMinX = minX;
      if (minY < clusterMinY) clusterMinY = minY;
      if (maxX > clusterMaxX) clusterMaxX = maxX;
      if (maxY > clusterMaxY) clusterMaxY = maxY;
    }
    overlapCount += 1;
    let qx = cx0;
    if (qx < minX) qx = minX;
    else if (qx > maxX) qx = maxX;
    let qy = cy0;
    if (qy < minY) qy = minY;
    else if (qy > maxY) qy = maxY;
    let pen = 0;
    if (qx === cx0 && qy === cy0) {
      const left = cx0 - minX;
      const right = maxX - cx0;
      const top = cy0 - minY;
      const bot = maxY - cy0;
      let m = left;
      if (right < m) m = right;
      if (top < m) m = top;
      if (bot < m) m = bot;
      pen = m + r;
    } else {
      const dist = Math.sqrt((cx0 - qx) * (cx0 - qx) + (cy0 - qy) * (cy0 - qy));
      pen = r - dist;
    }
    if (pen > deepestPen) {
      deepestPen = pen;
      deepestIdx = i;
    }
  }

  if (overlapCount === 0) {
    return;
  }

  // Isolated single-brick embed: face push is enough when it clears all solids.
  if (overlapCount === 1 && deepestIdx >= 0) {
    depenetrateCircleAabb(
      world,
      bi,
      world.brickX[deepestIdx],
      world.brickY[deepestIdx],
      world.brickX[deepestIdx] + world.brickW[deepestIdx],
      world.brickY[deepestIdx] + world.brickH[deepestIdx],
      eps,
    );
    const cx1 = world.ballX[bi];
    const cy1 = world.ballY[bi];
    let still = 0;
    for (let i = 0; i < nBricks; i++) {
      if (world.brickHp[i] <= 0) {
        continue;
      }
      if (
        circleOverlapsAabb(
          cx1,
          cy1,
          r,
          world.brickX[i],
          world.brickY[i],
          world.brickX[i] + world.brickW[i],
          world.brickY[i] + world.brickH[i],
        )
      ) {
        still = 1;
        break;
      }
    }
    if (still === 0) {
      return;
    }
    // Restore start pose — single-face push made things worse (neighbor embed).
    world.ballX[bi] = cx0;
    world.ballY[bi] = cy0;
  }

  // Cluster eject: keep the ORIGINAL union AABB (never shrink to one brick —
  // "below" of a single residual brick is the death pocket between tight rows).
  // Also expand union by scanning bricks that touch the cluster (gap bridges).
  for (let i = 0; i < nBricks; i++) {
    if (world.brickHp[i] <= 0) {
      continue;
    }
    const minX = world.brickX[i];
    const minY = world.brickY[i];
    const maxX = minX + world.brickW[i];
    const maxY = minY + world.brickH[i];
    // Brick near the cluster (within 2r) — include so eject clears the pocket.
    const near =
      minX <= clusterMaxX + 2 * r &&
      maxX >= clusterMinX - 2 * r &&
      minY <= clusterMaxY + 2 * r &&
      maxY >= clusterMinY - 2 * r;
    if (!near) {
      continue;
    }
    if (minX < clusterMinX) clusterMinX = minX;
    if (minY < clusterMinY) clusterMinY = minY;
    if (maxX > clusterMaxX) clusterMaxX = maxX;
    if (maxY > clusterMaxY) clusterMaxY = maxY;
  }

  const candidatesX = [
    cx0,
    cx0,
    clusterMinX - r - eps,
    clusterMaxX + r + eps,
  ];
  const candidatesY = [
    clusterMaxY + r + eps,
    clusterMinY - r - eps,
    cy0,
    cy0,
  ];
  const candidatesNx = [0, 0, -1, 1];
  const candidatesNy = [1, -1, 0, 0];

  let bestCost = 1e30;
  let bestX = cx0;
  let bestY = cy0;
  let bestNx = 0;
  let bestNy = 1;
  let foundClear = 0;

  for (let c = 0; c < 4; c++) {
    const x = candidatesX[c];
    const y = candidatesY[c];
    const nx = candidatesNx[c];
    const ny = candidatesNy[c];
    let blocked = 0;
    for (let i = 0; i < nBricks; i++) {
      if (world.brickHp[i] <= 0) {
        continue;
      }
      if (
        circleOverlapsAabb(
          x,
          y,
          r,
          world.brickX[i],
          world.brickY[i],
          world.brickX[i] + world.brickW[i],
          world.brickY[i] + world.brickH[i],
        )
      ) {
        blocked = 1;
        break;
      }
    }
    if (blocked === 1) {
      continue;
    }
    const dx = x - cx0;
    const dy = y - cy0;
    const cost = dx * dx + dy * dy;
    // Prefer destinations that already separate along velocity.
    const align = vx * nx + vy * ny;
    const adj = align >= 0 ? cost : cost + 1e6;
    if (adj < bestCost) {
      bestCost = adj;
      bestX = x;
      bestY = y;
      bestNx = nx;
      bestNy = ny;
      foundClear = 1;
    }
  }

  if (foundClear === 0) {
    // No clear axis slot — force below the expanded cluster.
    bestX = cx0;
    bestY = clusterMaxY + r + eps;
    bestNx = 0;
    bestNy = 1;
  }

  world.ballX[bi] = bestX;
  world.ballY[bi] = bestY;

  const speed = Math.hypot(vx, vy);
  if (speed > 0) {
    const approach = vx * bestNx + vy * bestNy;
    if (approach < 0) {
      // Inline reflect — avoid module scratch / cross-fn out-params on worklets.
      const nLen = Math.hypot(bestNx, bestNy) || 1;
      const unx = bestNx / nLen;
      const uny = bestNy / nLen;
      const dot = vx * unx + vy * uny;
      let ovx = vx - 2 * dot * unx;
      let ovy = vy - 2 * dot * uny;
      const s1 = Math.hypot(ovx, ovy);
      if (s1 > 0) {
        const scale = speed / s1;
        ovx *= scale;
        ovy *= scale;
      }
      world.ballVx[bi] = ovx;
      world.ballVy[bi] = ovy;
    }
  } else {
    world.ballVx[bi] = bestNx * 360;
    world.ballVy[bi] = bestNy * 360;
  }
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
  const serveSpeed = 360; // SERVE_SPEED — floor for nuclear unstick

  // Per-step locals (NOT module mutables). Reanimated worklets can clone/share
  // module objects incorrectly across UI frames; stack locals are reliable.
  const sweepOut: SweepHit = { hit: false, t: 1, nx: 0, ny: 0 };
  const velOut: Velocity2 = { vx: 0, vy: 0 };

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
    let brickTouchedThisStep = 0;
    const xStart = world.ballX[bi];
    const yStart = world.ballY[bi];

    // F-12: resolve wall/paddle overlaps before CCD. Do NOT blanket-depenetrate
    // all bricks — when gapY/gapX < 2r that pushes the ball out of one solid
    // into a neighbor and permanently pins it (ball-freeze root cause #2).
    // Brick embeds are cleared after CCD via escapeOverlappingBricks.
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

      let bestT = 2; // >1 → miss
      let bestNx = 0;
      let bestNy = 0;
      let bestKind = -1;
      let bestIndex = -1;

      // --- Walls (thin AABBs outside the field) ---
      // Left
      sweepCircleAabbInto(
        sweepOut,
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
      if (sweepOut.hit && sweepOut.t < bestT) {
        bestT = sweepOut.t;
        bestNx = sweepOut.nx;
        bestNy = sweepOut.ny;
        bestKind = KIND_WALL;
        bestIndex = -1;
      }
      // Right
      sweepCircleAabbInto(
        sweepOut,
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
      if (sweepOut.hit && sweepOut.t < bestT) {
        bestT = sweepOut.t;
        bestNx = sweepOut.nx;
        bestNy = sweepOut.ny;
        bestKind = KIND_WALL;
        bestIndex = -1;
      }
      // Top
      sweepCircleAabbInto(
        sweepOut,
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
      if (sweepOut.hit && sweepOut.t < bestT) {
        bestT = sweepOut.t;
        bestNx = sweepOut.nx;
        bestNy = sweepOut.ny;
        bestKind = KIND_WALL;
        bestIndex = -1;
      }
      // Bottom → BALL_OUT stub
      sweepCircleAabbInto(
        sweepOut,
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
      if (sweepOut.hit && sweepOut.t < bestT) {
        bestT = sweepOut.t;
        bestNx = sweepOut.nx;
        bestNy = sweepOut.ny;
        bestKind = KIND_BOTTOM;
        bestIndex = -1;
      }

      // --- Paddle ---
      if (cy <= paddleMaxY) {
        sweepCircleAabbInto(
          sweepOut,
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
        if (sweepOut.hit && sweepOut.t < bestT) {
          bestT = sweepOut.t;
          bestNx = sweepOut.nx;
          bestNy = sweepOut.ny;
          bestKind = KIND_PADDLE;
          bestIndex = -1;
        }
      }

      // --- Bricks: flat for-loop (NO nested worklet closure). Nested
      // considerBrick callbacks that mutate outer `let` best* are unreliable
      // on Reanimated UI runtime and can leave the ball glued to a brick.
      const nBricks = world.brickCount;
      for (let brickIndex = 0; brickIndex < nBricks; brickIndex++) {
        if (world.brickHp[brickIndex] <= 0) {
          continue;
        }
        const bx = world.brickX[brickIndex];
        const by = world.brickY[brickIndex];
        const bw = world.brickW[brickIndex];
        const bh = world.brickH[brickIndex];
        sweepCircleAabbInto(
          sweepOut,
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
        if (sweepOut.hit && sweepOut.t < bestT) {
          bestT = sweepOut.t;
          bestNx = sweepOut.nx;
          bestNy = sweepOut.ny;
          bestKind = KIND_BRICK;
          bestIndex = brickIndex;
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
        resolvePaddleEnglishInto(
          velOut,
          hx,
          world.paddleX,
          paddleHalfW,
          world.ballVx[bi],
          world.ballVy[bi],
        );
        world.ballVx[bi] = velOut.vx;
        world.ballVy[bi] = velOut.vy;
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
        // Only reflect when approaching — separating contacts are sweep misses,
        // but belt-and-suspenders if a t≈0 normal is noisy.
        const approach =
          world.ballVx[bi] * bestNx + world.ballVy[bi] * bestNy;
        if (approach < 0) {
          reflectVelocityInto(
            velOut,
            world.ballVx[bi],
            world.ballVy[bi],
            bestNx,
            bestNy,
          );
          enforceMinVerticalRatioInto(velOut, velOut.vx, velOut.vy);
          enforceMinHorizontalRatioInto(velOut, velOut.vx, velOut.vy);
          world.ballVx[bi] = velOut.vx;
          world.ballVy[bi] = velOut.vy;
        }
        world.ballX[bi] = world.ballX[bi] + bestNx * sepEps;
        world.ballY[bi] = world.ballY[bi] + bestNy * sepEps;
        pushEvent(world, EventCode.WALL_HIT, bi, -1, hx, hy);
        continue;
      }

      // KIND_BRICK — one brick contact ends CCD for this ball this step.
      // Continuing with leftover time immediately re-hits a neighbor when
      // gap < 2r and pins the ball (device: "bóng vừa chạm là đứng").
      {
        const bIdx = bestIndex;
        const nx = bestNx;
        const ny = bestNy;

        brickTouchedThisStep = 1;
        const approach =
          world.ballVx[bi] * nx + world.ballVy[bi] * ny;
        if (approach < 0) {
          reflectVelocityInto(
            velOut,
            world.ballVx[bi],
            world.ballVy[bi],
            nx,
            ny,
          );
          enforceMinVerticalRatioInto(velOut, velOut.vx, velOut.vy);
          enforceMinHorizontalRatioInto(velOut, velOut.vx, velOut.vy);
          world.ballVx[bi] = velOut.vx;
          world.ballVy[bi] = velOut.vy;
        }

        // Push fully outside this brick's solid (+eps), not just sepEps.
        depenetrateCircleAabb(
          world,
          bi,
          world.brickX[bIdx],
          world.brickY[bIdx],
          world.brickX[bIdx] + world.brickW[bIdx],
          world.brickY[bIdx] + world.brickH[bIdx],
          sepEps,
        );
        world.ballX[bi] = world.ballX[bi] + nx * sepEps;
        world.ballY[bi] = world.ballY[bi] + ny * sepEps;

        const unbreakable =
          (world.brickFlags[bIdx] & BrickFlags.UNBREAKABLE) !== 0;

        if (unbreakable) {
          if (world.brickDamagedThisStep[bIdx] === 0) {
            world.brickDamagedThisStep[bIdx] = 1;
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

        remaining = 0;
        break;
      }
    }

    // Cap leftover: if CCD exhausted, discard remaining motion (F-11 / F-12).
    // Free-integrating here tunnels through colliders the loop already failed to clear.
    if (remaining > toiEps && world.ballActive[bi] && ccd >= maxCcd) {
      remaining = 0;
    }

    // Escape hatch: only when a brick was touched this step (NH-3 — no
    // unconditional full-brick overlap scan; 0 hits in 12M probes when gated).
    if (world.ballActive[bi] && brickTouchedThisStep) {
      escapeOverlappingBricks(world, bi, sepEps);
    }

    // Nuclear unstick: if almost no displacement despite speed, shove along the
    // *post-resolve* heading (NH-1). Never flip velocity — that re-approaches
    // the brick we just reflected off and double-damages on the next step.
    if (world.ballActive[bi]) {
      const disp = Math.hypot(
        world.ballX[bi] - xStart,
        world.ballY[bi] - yStart,
      );
      let spd = Math.hypot(world.ballVx[bi], world.ballVy[bi]);
      if (spd > 1 && disp < 0.01) {
        const inv = 1 / spd;
        world.ballX[bi] =
          world.ballX[bi] + world.ballVx[bi] * inv * 3;
        world.ballY[bi] =
          world.ballY[bi] + world.ballVy[bi] * inv * 3;
        if (spd < serveSpeed) {
          const scale = serveSpeed / spd;
          world.ballVx[bi] = world.ballVx[bi] * scale;
          world.ballVy[bi] = world.ballVy[bi] * scale;
          spd = serveSpeed;
        }
        enforceMinVerticalRatioInto(
          velOut,
          world.ballVx[bi],
          world.ballVy[bi],
        );
        enforceMinHorizontalRatioInto(velOut, velOut.vx, velOut.vy);
        world.ballVx[bi] = velOut.vx;
        world.ballVy[bi] = velOut.vy;
        spd = Math.hypot(world.ballVx[bi], world.ballVy[bi]);
      }
      // Never leave a live ball with near-zero speed (stall glue).
      if (spd > 0 && spd < 30) {
        const scale = serveSpeed / spd;
        world.ballVx[bi] = world.ballVx[bi] * scale;
        world.ballVy[bi] = world.ballVy[bi] * scale;
      } else if (!(spd > 0)) {
        world.ballVx[bi] = serveSpeed * 0.2;
        world.ballVy[bi] = -serveSpeed;
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

  // 5. Dense live ball count (D-12) — after BALL_OUT marks, before tick++
  compactBallPool(world);

  // 6. tick++
  world.tick += 1;
}
