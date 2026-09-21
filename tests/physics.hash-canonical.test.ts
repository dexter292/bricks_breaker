/**
 * F-32 / F-50 — hashWorld ignores cosmetic RNG + stale events; mixes lives/simPhase.
 */
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  hashWorld,
  pushEvent,
  clearEvents,
  EventCode,
  SimPhase,
} from '../src/core';

describe('hashWorld canonical (F-32 / F-50)', () => {
  it('rngCosmetic divergence does not change hash', () => {
    const a = allocateWorld();
    const b = allocateWorld();
    resetWorld(a, 1, 2);
    resetWorld(b, 1, 2);
    a.rngCosmetic[0] = 0x11111111;
    b.rngCosmetic[0] = 0x99999999;
    expect(hashWorld(a)).toBe(hashWorld(b));
  });

  it('lives / simPhase divergence changes hash', () => {
    const a = allocateWorld();
    const b = allocateWorld();
    resetWorld(a, 1, 2);
    resetWorld(b, 1, 2);
    expect(hashWorld(a)).toBe(hashWorld(b));
    b.lives = 1;
    expect(hashWorld(a)).not.toBe(hashWorld(b));
    b.lives = a.lives;
    b.simPhase = SimPhase.PLAYING;
    expect(hashWorld(a)).not.toBe(hashWorld(b));
  });

  it('stale event payload after clearEvents does not change hash', () => {
    const a = allocateWorld();
    const b = allocateWorld();
    resetWorld(a, 1, 2);
    resetWorld(b, 1, 2);
    pushEvent(a, EventCode.BRICK_HIT, 2, 0, 10, 20);
    pushEvent(a, EventCode.WALL_HIT, 0, 0, 1, 2);
    clearEvents(a);
    // b never had events — living cursors match; stale A payload must not matter
    expect(a.evCount).toBe(0);
    expect(b.evCount).toBe(0);
    expect(hashWorld(a)).toBe(hashWorld(b));
  });

  it('live event slice content does change hash', () => {
    const a = allocateWorld();
    const b = allocateWorld();
    resetWorld(a, 1, 2);
    resetWorld(b, 1, 2);
    pushEvent(a, EventCode.BRICK_HIT, 2, 0, 10, 20);
    pushEvent(b, EventCode.PADDLE_HIT, 0, 0, 10, 20);
    expect(hashWorld(a)).not.toBe(hashWorld(b));
  });
});
