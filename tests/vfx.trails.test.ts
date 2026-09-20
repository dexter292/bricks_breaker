// tests/vfx.trails.test.ts — FX-01 ghost trail ring
import { describe, it, expect } from 'vitest';
import { trailLength } from '../src/vfx/intensity';
import { allocateVfx, TRAIL_MAX } from '../src/vfx/types';
import { pushTrail } from '../src/vfx/trails';

describe('vfx trails (FX-01)', () => {
  it('trailLength(1.0) === 5', () => {
    expect(trailLength(1.0)).toBe(5);
  });

  it('trailLength(0.2) === 2', () => {
    expect(trailLength(0.2)).toBe(2);
  });

  it('trailLength never returns 0', () => {
    expect(trailLength(0)).toBeGreaterThanOrEqual(2);
    expect(trailLength(0)).not.toBe(0);
  });

  it('pushTrail respects ring modulus and does not grow arrays', () => {
    const vfx = allocateVfx({ maxBalls: 2 });
    const len = trailLength(1.0);
    expect(len).toBe(5);
    expect(TRAIL_MAX).toBe(5);

    const beforeX = vfx.trailX.byteLength;
    const beforeY = vfx.trailY.byteLength;

    for (let i = 0; i < 1000; i++) {
      pushTrail(vfx, 0, i, i * 2, len);
    }

    expect(vfx.trailX.byteLength).toBe(beforeX);
    expect(vfx.trailY.byteLength).toBe(beforeY);
    expect(vfx.trailX.length).toBe(2 * TRAIL_MAX);

    // Newest sample sits at (head - 1 + len) % len within the ball's ring
    const head = vfx.trailHead[0];
    const newest = (head - 1 + len) % len;
    const base = 0 * TRAIL_MAX;
    expect(vfx.trailX[base + newest]).toBe(999);
    expect(vfx.trailY[base + newest]).toBe(1998);
  });
});
