// tests/vfx.shake.test.ts — FX-02 cosmetic camera shake
import { describe, it, expect } from 'vitest';
import { allocateVfx, IMPULSE_DESTROY, IMPULSE_LIFE_LOST } from '../src/vfx/types';
import { punchShake, stepShake, shakeOffset } from '../src/vfx/shake';
import { stepVfx } from '../src/vfx/stepVfx';

describe('vfx shake (FX-02)', () => {
  it('punchShake merges with max then caps at 2.5', () => {
    const vfx = allocateVfx();
    punchShake(vfx, 1.2, 1.0);
    expect(vfx.shakeAmp).toBeCloseTo(1.2, 5);
    punchShake(vfx, 1.0, 1.0); // smaller impulse — keep max
    expect(vfx.shakeAmp).toBeCloseTo(1.2, 5);
    punchShake(vfx, 3.0, 1.0); // over cap
    expect(vfx.shakeAmp).toBeCloseTo(2.5, 5);
  });

  it('stepShake multiplies amp by 0.85 and zeros below 0.05', () => {
    const vfx = allocateVfx();
    vfx.shakeAmp = 1.0;
    stepShake(vfx, 1.0);
    expect(vfx.shakeAmp).toBeCloseTo(0.85, 5);

    vfx.shakeAmp = 0.04;
    stepShake(vfx, 1.0);
    expect(vfx.shakeAmp).toBe(0);
  });

  it('intensity 0.2 → amp approaches 0', () => {
    const vfx = allocateVfx();
    punchShake(vfx, IMPULSE_LIFE_LOST, 0.2);
    expect(vfx.shakeAmp).toBeLessThan(0.6);
    expect(vfx.shakeAmp).toBeCloseTo(2.0 * 0.2, 5);

    // Offset is proportional to amp — near-invisible at reduce-motion
    const off = shakeOffset(vfx.shakeAmp, 1, 0);
    expect(Math.abs(off.x)).toBeLessThan(0.6);
  });

  it('punch only for BRICK_BREAK / LIFE_LOST impulses', () => {
    expect(IMPULSE_DESTROY).toBe(1.2);
    expect(IMPULSE_LIFE_LOST).toBe(2.0);
    const vfx = allocateVfx();
    punchShake(vfx, IMPULSE_DESTROY, 1.0);
    expect(vfx.shakeAmp).toBeCloseTo(1.2, 5);
    punchShake(vfx, IMPULSE_LIFE_LOST, 1.0);
    expect(vfx.shakeAmp).toBeCloseTo(2.0, 5);
  });

  it('stepVfx advances shake decay without clearing gameplay', () => {
    const vfx = allocateVfx();
    punchShake(vfx, IMPULSE_DESTROY, 1.0);
    stepVfx(vfx, 1 / 60, 1.0);
    expect(vfx.shakeAmp).toBeCloseTo(1.2 * 0.85, 5);
  });
});
