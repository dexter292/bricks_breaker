// tests/physics.paddle.test.ts — PHYS-04 paddle english / clamps (D-01…D-03)
import { describe, it, expect } from 'vitest';
import {
  resolvePaddleEnglish,
  reflectVelocity,
} from '../src/core/physics/resolve';
import {
  PADDLE_ANGLE_CLAMP_DEG,
} from '../src/core/constants';

const CLAMP_RAD = (PADDLE_ANGLE_CLAMP_DEG * Math.PI) / 180;
/** Min |vy|/speed after english ≈ cos(clamp). */
const MIN_VERTICAL_RATIO = Math.cos(CLAMP_RAD);
const SPEED_EPS = 1e-4;
const ANGLE_EPS = 1e-3;

/** Outgoing angle from vertical (up = −y) in radians; positive = right. */
function angleFromUp(vx: number, vy: number): number {
  return Math.atan2(vx, -vy);
}

describe('PHYS-04 paddle english / clamps', () => {
  const paddleCx = 180;
  const paddleHalfW = 36;
  const inboundVx = 100;
  const inboundVy = 400; // downward toward paddle
  const inboundSpeed = Math.hypot(inboundVx, inboundVy);

  it('t=+1 (right edge) → outgoing angle ≈ +PADDLE_ANGLE_CLAMP_DEG', () => {
    const ballX = paddleCx + paddleHalfW;
    const out = resolvePaddleEnglish(
      ballX,
      paddleCx,
      paddleHalfW,
      inboundVx,
      inboundVy,
    );
    expect(angleFromUp(out.vx, out.vy)).toBeCloseTo(CLAMP_RAD, 3);
    expect(Math.abs(angleFromUp(out.vx, out.vy) - CLAMP_RAD)).toBeLessThan(
      ANGLE_EPS,
    );
    expect(out.vy).toBeLessThan(0);
  });

  it('t=-1 (left edge) → outgoing angle ≈ −PADDLE_ANGLE_CLAMP_DEG', () => {
    const ballX = paddleCx - paddleHalfW;
    const out = resolvePaddleEnglish(
      ballX,
      paddleCx,
      paddleHalfW,
      inboundVx,
      inboundVy,
    );
    expect(angleFromUp(out.vx, out.vy)).toBeCloseTo(-CLAMP_RAD, 3);
    expect(Math.abs(angleFromUp(out.vx, out.vy) + CLAMP_RAD)).toBeLessThan(
      ANGLE_EPS,
    );
    expect(out.vy).toBeLessThan(0);
  });

  it('t=0 (center) → outgoing angle ≈ +8° (min horizontal, NG-1)', () => {
    const out = resolvePaddleEnglish(
      paddleCx,
      paddleCx,
      paddleHalfW,
      inboundVx,
      inboundVy,
    );
    const minHorizRad = (8 * Math.PI) / 180;
    expect(angleFromUp(out.vx, out.vy)).toBeCloseTo(minHorizRad, 3);
    expect(out.vy).toBeLessThan(0);
  });

  it('preserves speed within 1e-4 (D-02)', () => {
    const cases = [
      paddleCx - paddleHalfW,
      paddleCx,
      paddleCx + paddleHalfW,
      paddleCx + paddleHalfW * 0.5,
    ];
    for (const ballX of cases) {
      const out = resolvePaddleEnglish(
        ballX,
        paddleCx,
        paddleHalfW,
        inboundVx,
        inboundVy,
      );
      const speed = Math.hypot(out.vx, out.vy);
      expect(Math.abs(speed - inboundSpeed)).toBeLessThanOrEqual(SPEED_EPS);
    }
  });

  it('near-horizontal inbound still exits within clamp / min vertical (D-03)', () => {
    // Nearly horizontal inbound (small vy)
    const vx = 500;
    const vy = 1;
    const speed0 = Math.hypot(vx, vy);
    const out = resolvePaddleEnglish(
      paddleCx + paddleHalfW,
      paddleCx,
      paddleHalfW,
      vx,
      vy,
    );
    const speed = Math.hypot(out.vx, out.vy);
    expect(Math.abs(speed - speed0)).toBeLessThanOrEqual(SPEED_EPS);
    expect(out.vy).toBeLessThan(0);
    const ang = Math.abs(angleFromUp(out.vx, out.vy));
    expect(ang).toBeLessThanOrEqual(CLAMP_RAD + ANGLE_EPS);
    expect(Math.abs(out.vy) / speed).toBeGreaterThanOrEqual(
      MIN_VERTICAL_RATIO - 1e-4,
    );
  });

  it('reflectVelocity on vertical wall negates vx only; speed preserved', () => {
    const vx = 200;
    const vy = -150;
    const speed0 = Math.hypot(vx, vy);
    // Unit normal pointing right (left wall hit)
    const out = reflectVelocity(vx, vy, 1, 0);
    expect(out.vx).toBeCloseTo(-vx, 5);
    expect(out.vy).toBeCloseTo(vy, 5);
    expect(Math.abs(Math.hypot(out.vx, out.vy) - speed0)).toBeLessThanOrEqual(
      SPEED_EPS,
    );
  });
});
