// tests/vfx.paddle-squash.test.ts — FC-F04 paddle squash scalar (Wave 0 + Plan 01 wire)
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  pushEvent,
  clearEvents,
  EventCode,
} from '../src/core';
import { allocateVfx } from '../src/vfx/types';
import {
  PADDLE_SQUASH_T_MAX,
  punchPaddleSquash,
  stepPaddleSquash,
} from '../src/vfx/paddleSquash';
import { consumeEventsForVfx } from '../src/vfx/consumeEvents';
import { stepVfx } from '../src/vfx/stepVfx';

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

  it('PADDLE_HIT punches squash; World.paddleW unchanged', () => {
    const world = allocateWorld();
    const paddleWBefore = world.paddleW;
    const paddleHBefore = world.paddleH;
    clearEvents(world);
    pushEvent(world, EventCode.PADDLE_HIT, 0, 0, 180, 600);

    const vfx = allocateVfx();
    expect(vfx.paddleSquashT).toBe(0);
    consumeEventsForVfx(world, vfx, 1.0, { rng: () => 0.5 });

    expect(vfx.paddleSquashT).toBeGreaterThan(0);
    expect(vfx.paddleSquashT).toBe(PADDLE_SQUASH_T_MAX);
    expect(world.paddleW).toBe(paddleWBefore);
    expect(world.paddleH).toBe(paddleHBefore);
  });

  it('stepVfx decays paddleSquashT', () => {
    const vfx = allocateVfx();
    punchPaddleSquash(vfx);
    stepVfx(vfx, 0.04, 1);
    expect(vfx.paddleSquashT).toBeCloseTo(PADDLE_SQUASH_T_MAX - 0.04, 5);
  });

  it.todo('recordSprites scales draw only');
});
