/**
 * F-22 — MIN_VERTICAL_RATIO after wall/brick reflect.
 */
import { describe, it, expect } from 'vitest';
import {
  enforceMinVerticalRatio,
  reflectVelocity,
  MIN_VERTICAL_RATIO,
} from '../src/core';

describe('enforceMinVerticalRatio (F-22)', () => {
  it('leaves steep trajectories unchanged', () => {
    const out = enforceMinVerticalRatio(100, -400);
    expect(out.vx).toBeCloseTo(100, 6);
    expect(out.vy).toBeCloseTo(-400, 6);
  });

  it('lifts near-horizontal to floor while preserving speed + Y sign', () => {
    const speed = 720;
    const inVx = speed;
    const inVy = 0.5;
    const out = enforceMinVerticalRatio(inVx, inVy);
    const outSpeed = Math.hypot(out.vx, out.vy);
    expect(outSpeed).toBeCloseTo(Math.hypot(inVx, inVy), 4);
    expect(Math.abs(out.vy) / outSpeed).toBeGreaterThanOrEqual(
      MIN_VERTICAL_RATIO - 1e-6,
    );
    expect(out.vy).toBeGreaterThan(0); // preserve downward sign
  });

  it('reflect + enforce never returns sub-floor |vy|/speed', () => {
    // Grazing wall normal that would produce near-horizontal reflect
    const hit = reflectVelocity(700, -50, 1, 0);
    const out = enforceMinVerticalRatio(hit.vx, hit.vy);
    const speed = Math.hypot(out.vx, out.vy);
    expect(speed).toBeCloseTo(Math.hypot(700, -50), 3);
    expect(Math.abs(out.vy) / speed).toBeGreaterThanOrEqual(
      MIN_VERTICAL_RATIO - 1e-6,
    );
  });
});
