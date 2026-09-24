/**
 * F-13 — particle burst color from HP before damage (evA snapshot).
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  pushEvent,
  clearEvents,
  EventCode,
  BrickFlags,
} from '../src/core';
import { allocateVfx } from '../src/vfx/types';
import {
  consumeEventsForVfx,
  rgbFromBrickHp,
  defaultResolveBrickRgb,
} from '../src/vfx/consumeEvents';
import { countActiveParticles } from '../src/vfx/particles';

function firstActiveRgb(vfx: ReturnType<typeof allocateVfx>) {
  for (let i = 0; i < vfx.active.length; i++) {
    if (vfx.active[i] === 1) {
      return { r: vfx.r[i], g: vfx.g[i], b: vfx.b[i] };
    }
  }
  return null;
}

describe('vfx brick color (F-13)', () => {
  it('rgbFromBrickHp maps HP / flags to UI-SPEC fills', () => {
    expect(rgbFromBrickHp(3, 0)).toEqual({
      r: 0.769,
      g: 0.271,
      b: 0.412,
    });
    expect(rgbFromBrickHp(2, 0)).toEqual({
      r: 0.878,
      g: 0.478,
      b: 0.373,
    });
    expect(rgbFromBrickHp(1, 0)).toEqual({
      r: 0.949,
      g: 0.8,
      b: 0.561,
    });
    expect(rgbFromBrickHp(0, BrickFlags.UNBREAKABLE)).toEqual({
      r: 0.42,
      g: 0.447,
      b: 0.502,
    });
    expect(rgbFromBrickHp(1, BrickFlags.EXPLOSIVE)).toEqual({
      r: 0.976,
      g: 0.451,
      b: 0.086,
    });
  });

  it('defaultResolveBrickRgb reads live brick SoA', () => {
    const world = allocateWorld();
    world.brickCount = 1;
    world.brickHp[0] = 3;
    world.brickFlags[0] = 0;
    expect(defaultResolveBrickRgb(world, 0)).toEqual(rgbFromBrickHp(3, 0));
  });

  it('BRICK_BREAK uses evA HP snapshot even when live HP is 0', () => {
    const world = allocateWorld();
    world.brickCount = 1;
    world.brickHp[0] = 0; // post-destroy
    world.brickFlags[0] = 0;
    clearEvents(world);

    const vfx = allocateVfx();
    const expected = rgbFromBrickHp(3, 0); // magenta — HP before break
    // evA = hpBefore, evB = brick index (matches step.ts contract)
    pushEvent(world, EventCode.BRICK_BREAK, 3, 0, 120, 80);

    consumeEventsForVfx(world, vfx, 1.0, {
      rng: () => 0.5,
    });

    expect(countActiveParticles(vfx)).toBeGreaterThan(0);
    const rgb = firstActiveRgb(vfx);
    expect(rgb).not.toBeNull();
    expect(rgb!.r).toBeCloseTo(expected.r, 3);
    expect(rgb!.g).toBeCloseTo(expected.g, 3);
    expect(rgb!.b).toBeCloseTo(expected.b, 3);
  });

  it('BRICK_HIT HP=2 snapshot stays orange after damage to HP=1', () => {
    const world = allocateWorld();
    world.brickCount = 1;
    world.brickHp[0] = 1;
    world.brickFlags[0] = 0;
    clearEvents(world);

    const vfx = allocateVfx();
    const expected = rgbFromBrickHp(2, 0);
    pushEvent(world, EventCode.BRICK_HIT, 2, 0, 50, 60);

    consumeEventsForVfx(world, vfx, 1.0, { rng: () => 0.25 });

    const rgb = firstActiveRgb(vfx);
    expect(rgb).not.toBeNull();
    expect(rgb!.r).toBeCloseTo(expected.r, 3);
    expect(rgb!.g).toBeCloseTo(expected.g, 3);
    expect(rgb!.b).toBeCloseTo(expected.b, 3);
  });
});
