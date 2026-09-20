// tests/runtime.event-drain.test.ts — FX-03 multi-substep audio batch + VFX consume
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  pushEvent,
  clearEvents,
  EventCode,
} from '../src/core';
import { allocateVfx, IMPULSE_DESTROY, IMPULSE_LIFE_LOST } from '../src/vfx/types';
import { consumeEventsForVfx } from '../src/vfx/consumeEvents';
import {
  createAudioBatch,
  appendEventsForAudio,
  resetAudioBatch,
} from '../src/vfx/audioBatch';
import { countActiveParticles } from '../src/vfx/particles';

describe('runtime event drain (FX-03)', () => {
  it('snapshot after each stepRun retains events across clearEvents', () => {
    const world = allocateWorld({ eventCap: 32 });
    const batch = createAudioBatch(256);

    // stepA
    pushEvent(world, EventCode.BRICK_HIT, 0, 0, 10, 20);
    pushEvent(world, EventCode.PADDLE_HIT, 0, 0, 1, 2);
    const countA = world.evCount;
    appendEventsForAudio(world, batch);
    clearEvents(world);
    expect(world.evCount).toBe(0);

    // stepB
    pushEvent(world, EventCode.BRICK_BREAK, 0, 0, 30, 40);
    pushEvent(world, EventCode.LIFE_LOST, 2, 0, 0, 0);
    const countB = world.evCount;
    appendEventsForAudio(world, batch);
    clearEvents(world);

    expect(batch.count).toBe(countA + countB);
    expect(batch.codes[0]).toBe(EventCode.BRICK_HIT);
    expect(batch.codes[1]).toBe(EventCode.PADDLE_HIT);
    expect(batch.codes[2]).toBe(EventCode.BRICK_BREAK);
    expect(batch.codes[3]).toBe(EventCode.LIFE_LOST);
  });

  it('audio batch length equals sum of per-substep event counts', () => {
    const world = allocateWorld({ eventCap: 64 });
    const batch = createAudioBatch();
    resetAudioBatch(batch);

    let expected = 0;
    for (let step = 0; step < 3; step++) {
      pushEvent(world, EventCode.WALL_HIT, step, 0, 0, 0);
      pushEvent(world, EventCode.BRICK_HIT, step, 0, 5, 5);
      expected += world.evCount;
      appendEventsForAudio(world, batch);
      clearEvents(world);
    }

    expect(batch.count).toBe(expected);
    expect(batch.count).toBe(6);
    // Overflow must not grow codes buffer
    const cap = batch.codes.length;
    for (let i = 0; i < 400; i++) {
      pushEvent(world, EventCode.PADDLE_HIT, 0, 0, 0, 0);
      appendEventsForAudio(world, batch);
      clearEvents(world);
    }
    expect(batch.codes.length).toBe(cap);
    expect(batch.count).toBeLessThanOrEqual(cap);
  });

  it('consumeEventsForVfx maps hit/break/life; no shake on paddle/chip', () => {
    const world = allocateWorld();
    world.brickHp[0] = 2;
    world.brickFlags[0] = 0;
    const vfx = allocateVfx();
    const rngState = new Uint32Array([0xc0ffee]);

    pushEvent(world, EventCode.BRICK_HIT, 0, 0, 100, 50);
    consumeEventsForVfx(world, vfx, 1.0, {
      rng: () => {
        rngState[0] = (rngState[0] + 0x6d2b79f5) | 0;
        return (rngState[0] >>> 0) / 4294967296;
      },
    });
    expect(countActiveParticles(vfx)).toBe(4); // chip
    expect(vfx.shakeAmp).toBe(0);

    clearEvents(world);
    // Reset particles for clean destroy assert
    for (let i = 0; i < vfx.particleCap; i++) vfx.active[i] = 0;
    vfx.particleCount = 0;

    pushEvent(world, EventCode.BRICK_BREAK, 0, 0, 110, 55);
    consumeEventsForVfx(world, vfx, 1.0, {
      rng: () => 0.5,
    });
    expect(countActiveParticles(vfx)).toBe(12);
    expect(vfx.shakeAmp).toBeCloseTo(IMPULSE_DESTROY, 5);

    clearEvents(world);
    pushEvent(world, EventCode.LIFE_LOST, 1, 0, 0, 0);
    consumeEventsForVfx(world, vfx, 1.0, { rng: () => 0.5 });
    expect(vfx.shakeAmp).toBeCloseTo(IMPULSE_LIFE_LOST, 5);

    clearEvents(world);
    vfx.shakeAmp = 0;
    pushEvent(world, EventCode.PADDLE_HIT, 0, 0, 0, 0);
    pushEvent(world, EventCode.POWERUP_CATCH, 1, 0, 0, 0);
    consumeEventsForVfx(world, vfx, 1.0, { rng: () => 0.5 });
    expect(vfx.shakeAmp).toBe(0);
  });
});
