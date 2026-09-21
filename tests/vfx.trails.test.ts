// tests/vfx.trails.test.ts — FX-01 ghost trail ring
import { describe, it, expect } from 'vitest';
import { trailLength } from '../src/vfx/intensity';
import { allocateVfx, TRAIL_MAX } from '../src/vfx/types';
import {
  pushTrail,
  clearTrailBall,
  clearTrailsFromIndex,
} from '../src/vfx/trails';
import { clearCosmeticVfx } from '../src/runtime/worldRequests';

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

  it('clearTrailBall zeros head + samples for one slot (F-16)', () => {
    const vfx = allocateVfx({ maxBalls: 3 });
    const len = trailLength(1.0);
    pushTrail(vfx, 1, 40, 80, len);
    pushTrail(vfx, 1, 41, 81, len);
    pushTrail(vfx, 2, 90, 10, len);

    clearTrailBall(vfx, 1);

    expect(vfx.trailHead[1]).toBe(0);
    const base = 1 * TRAIL_MAX;
    for (let i = 0; i < TRAIL_MAX; i++) {
      expect(vfx.trailX[base + i]).toBe(0);
      expect(vfx.trailY[base + i]).toBe(0);
    }
    // Sibling slot untouched
    expect(vfx.trailHead[2]).toBe(1);
    expect(vfx.trailX[2 * TRAIL_MAX]).toBe(90);
  });

  it('clearTrailsFromIndex after compaction leaves no ghost slots (F-16)', () => {
    const vfx = allocateVfx({ maxBalls: 4 });
    const len = trailLength(1.0);
    pushTrail(vfx, 0, 10, 10, len);
    pushTrail(vfx, 1, 20, 200, len);
    pushTrail(vfx, 2, 30, 300, len);

    clearTrailsFromIndex(vfx, 0); // runtime clears all when count drops

    for (let bi = 0; bi < 4; bi++) {
      expect(vfx.trailHead[bi]).toBe(0);
      const base = bi * TRAIL_MAX;
      for (let i = 0; i < TRAIL_MAX; i++) {
        expect(vfx.trailX[base + i]).toBe(0);
        expect(vfx.trailY[base + i]).toBe(0);
      }
    }
  });

  it('clearCosmeticVfx zeros trail sample rings (Retry path)', () => {
    const vfx = allocateVfx({ maxBalls: 2 });
    pushTrail(vfx, 0, 11, 22, 5);
    clearCosmeticVfx(vfx);
    expect(vfx.trailHead[0]).toBe(0);
    expect(vfx.trailX[0]).toBe(0);
    expect(vfx.trailY[0]).toBe(0);
  });
});
