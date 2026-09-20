/**
 * PHYS-02 — Swept circle-vs-AABB unit coverage at designed max speed.
 * Deep-imports physics modules (barrel consolidation is plan 02-04).
 */
import { describe, it, expect } from 'vitest';
import {
  BALL_RADIUS,
  FIXED_DT,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MAX_BALL_SPEED,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
} from '../src/core/constants';
import { sweepCircleAabb } from '../src/core/physics/sweep';

/** One fixed-step displacement at designed max speed. */
const STEP = MAX_BALL_SPEED * FIXED_DT; // 6 logical units

describe('PHYS-02 swept circle-vs-AABB', () => {
  it('hits left wall AABB with inward (+x) normal at MAX_BALL_SPEED', () => {
    const r = BALL_RADIUS;
    // Thin left wall just outside the playfield
    const minX = -20;
    const minY = 0;
    const maxX = 0;
    const maxY = LOGICAL_HEIGHT;
    // Center starts inside field; flies left one step — place so TOI falls in [0,1]
    const cx = r + STEP * 0.5; // 9 — expands wall maxX to +r=6, so hits mid-step
    const cy = LOGICAL_HEIGHT * 0.5;
    const dx = -STEP;
    const dy = 0;

    const hit = sweepCircleAabb(cx, cy, r, dx, dy, minX, minY, maxX, maxY);

    expect(hit.hit).toBe(true);
    expect(hit.t).toBeGreaterThanOrEqual(0);
    expect(hit.t).toBeLessThanOrEqual(1);
    expect(hit.nx).toBeGreaterThan(0);
    expect(Math.abs(hit.ny)).toBeLessThan(1e-5);
    expect(Number.isFinite(hit.nx)).toBe(true);
    expect(Number.isFinite(hit.ny)).toBe(true);
  });

  it('hits right wall AABB with inward (−x) normal at MAX_BALL_SPEED', () => {
    const r = BALL_RADIUS;
    const minX = LOGICAL_WIDTH;
    const minY = 0;
    const maxX = LOGICAL_WIDTH + 20;
    const maxY = LOGICAL_HEIGHT;
    const cx = LOGICAL_WIDTH - r - STEP * 0.5;
    const cy = LOGICAL_HEIGHT * 0.5;
    const dx = STEP;
    const dy = 0;

    const hit = sweepCircleAabb(cx, cy, r, dx, dy, minX, minY, maxX, maxY);

    expect(hit.hit).toBe(true);
    expect(hit.t).toBeGreaterThanOrEqual(0);
    expect(hit.t).toBeLessThanOrEqual(1);
    expect(hit.nx).toBeLessThan(0);
    expect(Math.abs(hit.ny)).toBeLessThan(1e-5);
  });

  it('hits top wall AABB with inward (+y) normal at MAX_BALL_SPEED', () => {
    const r = BALL_RADIUS;
    const minX = 0;
    const minY = -20;
    const maxX = LOGICAL_WIDTH;
    const maxY = 0;
    const cx = LOGICAL_WIDTH * 0.5;
    const cy = r + STEP * 0.5;
    const dx = 0;
    const dy = -STEP;

    const hit = sweepCircleAabb(cx, cy, r, dx, dy, minX, minY, maxX, maxY);

    expect(hit.hit).toBe(true);
    expect(hit.t).toBeGreaterThanOrEqual(0);
    expect(hit.t).toBeLessThanOrEqual(1);
    expect(hit.ny).toBeGreaterThan(0);
    expect(Math.abs(hit.nx)).toBeLessThan(1e-5);
  });

  it('hits paddle AABB from above at MAX_BALL_SPEED with finite separating normal', () => {
    const r = BALL_RADIUS;
    const paddleCx = LOGICAL_WIDTH * 0.5;
    const paddleY = LOGICAL_HEIGHT - PADDLE_HEIGHT * 2;
    const halfW = PADDLE_WIDTH * 0.5;
    const halfH = PADDLE_HEIGHT * 0.5;
    const minX = paddleCx - halfW;
    const maxX = paddleCx + halfW;
    const minY = paddleY - halfH;
    const maxY = paddleY + halfH;

    // Approach from above (y-down: positive vy). Place so top face is reached mid-step.
    const cx = paddleCx;
    const cy = minY - r - STEP * 0.5;
    const dx = 0;
    const dy = STEP;

    const hit = sweepCircleAabb(cx, cy, r, dx, dy, minX, minY, maxX, maxY);

    expect(hit.hit).toBe(true);
    expect(hit.t).toBeGreaterThanOrEqual(0);
    expect(hit.t).toBeLessThanOrEqual(1);
    expect(Number.isFinite(hit.nx)).toBe(true);
    expect(Number.isFinite(hit.ny)).toBe(true);
    // Separating normal from paddle top toward ball above → ny < 0 (up in y-down)
    expect(hit.ny).toBeLessThan(0);
  });

  it('hits a single brick AABB at MAX_BALL_SPEED when starting outside (no miss / no tunnel)', () => {
    const r = BALL_RADIUS;
    // Typical brick ~32×16; displacement would land past far face if discrete-only
    const minX = 100;
    const minY = 80;
    const maxX = 132;
    const maxY = 96;
    const brickH = maxY - minY; // 16
    // Start above brick; travel downward farther than brick thickness + radius gap
    const cx = (minX + maxX) * 0.5;
    const cy = minY - r - 1;
    const dx = 0;
    // At designed max speed, one step is 6u — use enough steps worth to cross the brick
    const dy = brickH + r * 2 + 4; // would tunnel through if endpoint-only

    const hit = sweepCircleAabb(cx, cy, r, dx, dy, minX, minY, maxX, maxY);

    expect(hit.hit).toBe(true);
    expect(hit.t).toBeGreaterThanOrEqual(0);
    expect(hit.t).toBeLessThanOrEqual(1);
    // Impact on top face before exiting far side
    expect(hit.t * dy).toBeLessThan(brickH + r);
  });

  it('misses when displacement points away from the AABB', () => {
    const r = BALL_RADIUS;
    const minX = 100;
    const minY = 100;
    const maxX = 140;
    const maxY = 120;
    const cx = 80;
    const cy = 110;
    const dx = -STEP; // fly left, away from brick
    const dy = 0;

    const hit = sweepCircleAabb(cx, cy, r, dx, dy, minX, minY, maxX, maxY);

    expect(hit.hit).toBe(false);
  });

  it('reports non-axis-aligned corner normal when approaching an AABB corner', () => {
    const r = BALL_RADIUS;
    const minX = 100;
    const minY = 100;
    const maxX = 140;
    const maxY = 130;
    // Approach bottom-left corner from southwest (y-down: +y is down)
    const cx = minX - r - 4;
    const cy = maxY + r + 4;
    const dx = 10;
    const dy = -10;

    const hit = sweepCircleAabb(cx, cy, r, dx, dy, minX, minY, maxX, maxY);

    expect(hit.hit).toBe(true);
    expect(hit.t).toBeGreaterThanOrEqual(0);
    expect(hit.t).toBeLessThanOrEqual(1);
    expect(Math.abs(hit.nx)).toBeGreaterThan(1e-4);
    expect(Math.abs(hit.ny)).toBeGreaterThan(1e-4);
    // Unit-ish normal
    const len = Math.hypot(hit.nx, hit.ny);
    expect(len).toBeGreaterThan(0.99);
    expect(len).toBeLessThan(1.01);
  });

  it('returns hit=false for non-finite inputs (T-02-01)', () => {
    const hit = sweepCircleAabb(
      Number.NaN,
      10,
      BALL_RADIUS,
      -STEP,
      0,
      0,
      0,
      10,
      10,
    );
    expect(hit.hit).toBe(false);
  });
});
