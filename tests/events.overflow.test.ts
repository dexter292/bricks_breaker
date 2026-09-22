/**
 * F-53 — event ring overflow: drop newest, set evOverflow=1 (conscious contract).
 * Score/drops/VFX can be lost; phase/lives derive from state and survive.
 */
import { describe, it, expect } from 'vitest';
import { allocateWorld, pushEvent, EventCode } from '../src/core';

describe('events.overflow (F-53)', () => {
  it('allocateWorld({ eventCap: 8 }) + >8 pushes → evOverflow === 1', () => {
    const w = allocateWorld({ eventCap: 8 });
    expect(w.evCap).toBe(8);
    expect(w.evOverflow).toBe(0);

    for (let i = 0; i < 8; i++) {
      pushEvent(w, EventCode.WALL_HIT, i, 0, 1, 2);
    }
    expect(w.evCount).toBe(8);
    expect(w.evOverflow).toBe(0);

    // 9th push drops newest; flag is the sole overflow signal (no worklet console).
    pushEvent(w, EventCode.PADDLE_HIT, 99, 0, 3, 4);
    expect(w.evOverflow).toBe(1);
    expect(w.evCount).toBe(8);
  });
});
