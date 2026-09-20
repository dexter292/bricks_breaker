/**
 * PROP-TUNNEL / PROP-SPEED / PROP-CLAMP — PHYS-02/03/04, D-05.
 * Dual oracle (RESEARCH Q2): (1) center never inside solid brick;
 * (2) free-segment brick crossings yield hit event or earlier TOI stop (no tunnel-through).
 */
import { test, fc } from '@fast-check/vitest';
import { expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  stepWorld,
  clearEvents,
  sweepCircleAabb,
  resolvePaddleEnglish,
  reflectVelocity,
  FIXED_DT,
  MAX_BALL_SPEED,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  BALL_RADIUS,
  PADDLE_ANGLE_CLAMP_DEG,
  EventCode,
  BrickFlags,
  type World,
  type Intent,
} from '../src/core';

const SPEED_EPS = 1e-4;
const CLAMP_RAD = (PADDLE_ANGLE_CLAMP_DEG * Math.PI) / 180;
const MIN_VERTICAL_RATIO = Math.cos(CLAMP_RAD);
const ANGLE_EPS = 1e-3;

/** Dense spatial grid: bricks aligned to broadphase cells (D-12). */
const GRID_COLS = 12;
const GRID_ROWS = 20;
/** Fill mid rows so launch band at top stays clear. */
const BRICK_ROW0 = 3;
const BRICK_ROW1 = 10;

function cellW(): number {
  return LOGICAL_WIDTH / GRID_COLS;
}
function cellH(): number {
  return LOGICAL_HEIGHT / GRID_ROWS;
}

/**
 * Unbreakable dense grid with correct cellToBrick spatial mapping.
 * loadTestGrid packs 1-row; tunneling needs full-field cols×rows (D-11 inline).
 */
function loadDenseUnbreakableGrid(world: World): void {
  const cw = cellW();
  const ch = cellH();
  const inset = 1;
  let n = 0;

  for (let i = 0; i < world.cellToBrick.length; i++) {
    world.cellToBrick[i] = -1;
    world.brickDamagedThisStep[i] = 0;
  }

  for (let r = BRICK_ROW0; r < BRICK_ROW1; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (n >= world.brickX.length) break;
      world.brickX[n] = c * cw + inset;
      world.brickY[n] = r * ch + inset;
      world.brickW[n] = cw - inset * 2;
      world.brickH[n] = ch - inset * 2;
      world.brickHp[n] = 99;
      world.brickFlags[n] = BrickFlags.UNBREAKABLE;
      world.cellToBrick[r * GRID_COLS + c] = n;
      n += 1;
    }
  }
  world.brickCount = n;
  world.gridCols = GRID_COLS;
  world.gridRows = GRID_ROWS;
}

function pointInSolidBrick(
  world: World,
  px: number,
  py: number,
): number {
  for (let i = 0; i < world.brickCount; i++) {
    if (world.brickHp[i] <= 0) continue;
    const x0 = world.brickX[i];
    const y0 = world.brickY[i];
    const x1 = x0 + world.brickW[i];
    const y1 = y0 + world.brickH[i];
    // Strict interior (oracle 1): center inside solid AABB
    if (px > x0 && px < x1 && py > y0 && py < y1) {
      return i;
    }
  }
  return -1;
}

function eventPairs(world: World): { code: number; b: number }[] {
  const out: { code: number; b: number }[] = [];
  const n = world.evCount;
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    out.push({ code: world.evCode[idx], b: world.evB[idx] });
  }
  return out;
}

function hadBrickEvent(world: World, brickIndex: number): boolean {
  return eventPairs(world).some(
    (e) =>
      (e.code === EventCode.BRICK_HIT || e.code === EventCode.BRICK_BREAK) &&
      e.b === brickIndex,
  );
}

function hadAnyCollisionEvent(world: World): boolean {
  return eventPairs(world).some(
    (e) =>
      e.code === EventCode.WALL_HIT ||
      e.code === EventCode.PADDLE_HIT ||
      e.code === EventCode.BRICK_HIT ||
      e.code === EventCode.BRICK_BREAK ||
      e.code === EventCode.BALL_OUT,
  );
}

function hadWallEvent(world: World): boolean {
  return eventPairs(world).some((e) => e.code === EventCode.WALL_HIT);
}

/** Expanded AABB crossed by free segment but start/end both outside → tunnel-through candidate. */
function tunneledThroughBrick(
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  radius: number,
  world: World,
  bi: number,
): boolean {
  const minX = world.brickX[bi];
  const minY = world.brickY[bi];
  const maxX = minX + world.brickW[bi];
  const maxY = minY + world.brickH[bi];
  const hit = sweepCircleAabb(cx, cy, radius, dx, dy, minX, minY, maxX, maxY);
  if (!hit.hit || hit.t > 1) return false;

  const ex = cx + dx;
  const ey = cy + dy;
  const expMinX = minX - radius;
  const expMinY = minY - radius;
  const expMaxX = maxX + radius;
  const expMaxY = maxY + radius;
  const startIn =
    cx >= expMinX && cx <= expMaxX && cy >= expMinY && cy <= expMaxY;
  const endIn =
    ex >= expMinX && ex <= expMaxX && ey >= expMinY && ey <= expMaxY;
  // Tunnel-through: started outside, free end outside on far side, segment crossed
  return !startIn && !endIn;
}

function angleFromUp(vx: number, vy: number): number {
  return Math.atan2(vx, -vy);
}

// ---------------------------------------------------------------------------
// PROP-TUNNEL (Nyquist ≥ 100) — may approach 60s VALIDATION budget
// ---------------------------------------------------------------------------
test.prop(
  {
    angle: fc.double({ min: 0.15, max: Math.PI - 0.15, noNaN: true }),
    launchX: fc.double({
      min: BALL_RADIUS + 2,
      max: LOGICAL_WIDTH - BALL_RADIUS - 2,
      noNaN: true,
    }),
  },
  { numRuns: 100 },
)(
  'PROP-TUNNEL: no tunneling / missed collisions at 2× MAX_BALL_SPEED',
  ({ angle, launchX }) => {
    const speed = 2 * MAX_BALL_SPEED;
    const w = allocateWorld();
    resetWorld(w, 0x71e71e71, 0xc0c0a11e);
    clearEvents(w);
    loadDenseUnbreakableGrid(w);

    // Launch along top band, downward into dense grid (y-down).
    w.ballX[0] = launchX;
    w.ballY[0] = BALL_RADIUS + 4;
    w.ballVx[0] = Math.cos(angle) * speed;
    w.ballVy[0] = Math.sin(angle) * speed;
    w.ballActive[0] = 1;
    w.activeBallCount = 1;
    w.paddleX = LOGICAL_WIDTH * 0.5;

    const intent: Intent = { paddleX: w.paddleX, launch: 0 };
    const steps = 240; // 2s @ 120Hz

    for (let s = 0; s < steps; s++) {
      if (!w.ballActive[0]) break;

      const cx = w.ballX[0];
      const cy = w.ballY[0];
      const vx = w.ballVx[0];
      const vy = w.ballVy[0];
      const radius = w.ballRadius[0];
      const dx = vx * FIXED_DT;
      const dy = vy * FIXED_DT;

      // Precompute free-segment brick crossings (oracle 2)
      const crossed: number[] = [];
      for (let bi = 0; bi < w.brickCount; bi++) {
        if (w.brickHp[bi] <= 0) continue;
        if (tunneledThroughBrick(cx, cy, dx, dy, radius, w, bi)) {
          crossed.push(bi);
        } else {
          const h = sweepCircleAabb(
            cx,
            cy,
            radius,
            dx,
            dy,
            w.brickX[bi],
            w.brickY[bi],
            w.brickX[bi] + w.brickW[bi],
            w.brickY[bi] + w.brickH[bi],
          );
          if (h.hit && h.t <= 1) crossed.push(bi);
        }
      }

      // Wall escape candidate: free segment exits side/top
      const freeEndX = cx + dx;
      const freeEndY = cy + dy;
      const escapesSideOrTop =
        freeEndX - radius < 0 ||
        freeEndX + radius > LOGICAL_WIDTH ||
        freeEndY - radius < 0;

      clearEvents(w);
      stepWorld(w, intent, FIXED_DT);

      // Oracle 1: never center inside solid brick
      if (w.ballActive[0]) {
        const inside = pointInSolidBrick(w, w.ballX[0], w.ballY[0]);
        expect(inside).toBe(-1);
      }

      // Oracle 2: each crossed solid cell → brick event or earlier TOI stop
      for (const bi of crossed) {
        if (hadBrickEvent(w, bi)) continue;
        // Earlier TOI stop: some collision handled this step, and we did not
        // finish on the far side of a free tunnel-through.
        const stillTunnel =
          tunneledThroughBrick(cx, cy, dx, dy, radius, w, bi) &&
          !hadAnyCollisionEvent(w);
        // If free path would tunnel through and we got no collision at all → fail.
        // If we got an earlier collision, ball should not sit past far side without brick hit:
        // verify end pose is not both outside-expanded on the free-end side without events.
        if (stillTunnel) {
          expect(stillTunnel).toBe(false);
        } else if (
          tunneledThroughBrick(cx, cy, dx, dy, radius, w, bi) &&
          hadAnyCollisionEvent(w)
        ) {
          // Earlier stop OK — ball must not have reached free end past the brick.
          // Position should differ from free end (CCD interrupted motion).
          const reachedFreeEnd =
            Math.abs(w.ballX[0] - freeEndX) < 1e-3 &&
            Math.abs(w.ballY[0] - freeEndY) < 1e-3;
          expect(reachedFreeEnd).toBe(false);
        } else {
          // Segment grazed / entered: must have brick event or earlier stop
          expect(hadAnyCollisionEvent(w)).toBe(true);
        }
      }

      // Side/top escape without WALL_HIT
      if (escapesSideOrTop && w.ballActive[0]) {
        const pastWall =
          w.ballX[0] < radius - 1e-3 ||
          w.ballX[0] > LOGICAL_WIDTH - radius + 1e-3 ||
          w.ballY[0] < radius - 1e-3;
        if (pastWall) {
          expect(hadWallEvent(w)).toBe(true);
        }
      }

      expect(Number.isFinite(w.ballX[0])).toBe(true);
      expect(Number.isFinite(w.ballY[0])).toBe(true);
      expect(Number.isFinite(w.ballVx[0])).toBe(true);
      expect(Number.isFinite(w.ballVy[0])).toBe(true);
    }
  },
  60_000,
);

// ---------------------------------------------------------------------------
// PROP-SPEED (Nyquist ≥ 50)
// ---------------------------------------------------------------------------
test.prop(
  {
    path: fc.constantFrom('paddle', 'wall', 'brick'),
    t: fc.double({ min: -1, max: 1, noNaN: true }),
    speed: fc.double({ min: 50, max: MAX_BALL_SPEED, noNaN: true }),
    nx: fc.double({ min: -1, max: 1, noNaN: true }),
    ny: fc.double({ min: -1, max: 1, noNaN: true }),
  },
  { numRuns: 50 },
)(
  'PROP-SPEED: |hypot(vx,vy) − speed0| ≤ 1e-4 after paddle/wall/brick resolve',
  ({ path, t, speed, nx, ny }) => {
    if (path === 'paddle') {
      const paddleCx = 180;
      const paddleHalfW = 36;
      const ballX = paddleCx + t * paddleHalfW;
      const inboundVx = 80;
      const inboundVy = 300;
      const speed0 = Math.hypot(inboundVx, inboundVy);
      const out = resolvePaddleEnglish(
        ballX,
        paddleCx,
        paddleHalfW,
        inboundVx,
        inboundVy,
      );
      expect(Math.abs(Math.hypot(out.vx, out.vy) - speed0)).toBeLessThanOrEqual(
        SPEED_EPS,
      );
      return;
    }

    // wall / brick share reflectVelocity
    const nLen = Math.hypot(nx, ny);
    fc.pre(nLen > 1e-6);
    const unx = nx / nLen;
    const uny = ny / nLen;
    // Inbound toward surface (dot(v,n) < 0)
    const vx = -unx * speed + uny * speed * 0.1;
    const vy = -uny * speed - unx * speed * 0.1;
    const speed0 = Math.hypot(vx, vy);
    const out = reflectVelocity(vx, vy, unx, uny);
    expect(Math.abs(Math.hypot(out.vx, out.vy) - speed0)).toBeLessThanOrEqual(
      SPEED_EPS,
    );
  },
);

// ---------------------------------------------------------------------------
// PROP-CLAMP (Nyquist ≥ 50)
// ---------------------------------------------------------------------------
test.prop(
  {
    t: fc.double({ min: -1.5, max: 1.5, noNaN: true }),
    inboundVx: fc.double({ min: -600, max: 600, noNaN: true }),
    inboundVy: fc.double({ min: 1, max: 600, noNaN: true }),
  },
  { numRuns: 50 },
)(
  'PROP-CLAMP: paddle outgoing angle within ±clamp; |vy|/speed ≥ min vertical',
  ({ t, inboundVx, inboundVy }) => {
    const paddleCx = 180;
    const paddleHalfW = 36;
    const ballX = paddleCx + t * paddleHalfW;
    const speed0 = Math.hypot(inboundVx, inboundVy);
    fc.pre(speed0 > 1e-6);

    const out = resolvePaddleEnglish(
      ballX,
      paddleCx,
      paddleHalfW,
      inboundVx,
      inboundVy,
    );
    const speed = Math.hypot(out.vx, out.vy);
    expect(Math.abs(speed - speed0)).toBeLessThanOrEqual(SPEED_EPS);
    expect(out.vy).toBeLessThan(0);

    const ang = Math.abs(angleFromUp(out.vx, out.vy));
    expect(ang).toBeLessThanOrEqual(CLAMP_RAD + ANGLE_EPS);
    expect(Math.abs(out.vy) / speed).toBeGreaterThanOrEqual(
      MIN_VERTICAL_RATIO - 1e-4,
    );
  },
);
