// tests/vfx.paddle-squash.test.ts — FC-F04 paddle squash scalar (Wave 0)
import { describe, it, expect } from 'vitest';
import { allocateVfx } from '../src/vfx/types';
import {
  PADDLE_SQUASH_T_MAX,
  punchPaddleSquash,
  stepPaddleSquash,
} from '../src/vfx/paddleSquash';

describe('vfx paddle squash (FC-F04 Wave 0)', () => {
  it('punchPaddleSquash → paddleSquashT === PADDLE_SQUASH_T_MAX', () => {
    const vfx = allocateVfx();
    expect(vfx.paddleSquashT).toBe(0);
    punchPaddleSquash(vfx);
    expect(vfx.paddleSquashT).toBe(PADDLE_SQUASH_T_MAX);
    expect(PADDLE_SQUASH_T_MAX).toBe(0.1);
  });

  it('stepPaddleSquash decays toward 0', () => {
    const vfx = allocateVfx();
    punchPaddleSquash(vfx);
    stepPaddleSquash(vfx, 0.04);
    expect(vfx.paddleSquashT).toBeCloseTo(PADDLE_SQUASH_T_MAX - 0.04, 5);
    expect(vfx.paddleSquashT).toBeGreaterThan(0);
    stepPaddleSquash(vfx, 0.1);
    expect(vfx.paddleSquashT).toBe(0);
  });

  it('punch max-merges when already punched', () => {
    const vfx = allocateVfx();
    punchPaddleSquash(vfx);
    stepPaddleSquash(vfx, 0.05);
    expect(vfx.paddleSquashT).toBeCloseTo(0.05, 5);
    punchPaddleSquash(vfx);
    expect(vfx.paddleSquashT).toBe(PADDLE_SQUASH_T_MAX);
  });

  it.todo('PADDLE_HIT punches squash; World.paddleW unchanged');
  it.todo('recordSprites scales draw only');
});
