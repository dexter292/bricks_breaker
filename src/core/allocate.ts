import {
  DEFAULT_SPRITE_SIZE,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
} from './constants';
import type { SpikeWorld } from './types';

/**
 * Allocate a mutable SoA world inside the (future) UI-runtime worklet path.
 * Deterministic seeds only — no Math.random().
 */
export function allocateWorld(capacity: number): SpikeWorld {
  'worklet';
  const cap = Math.max(0, Math.floor(capacity));
  // Capacity is the live sprite count (cliff-ramp may request up to ~300).
  // DEFAULT_SPRITE_CAP remains the harness default, not a hard ceiling.
  const spriteCount = cap;
  const x = new Float32Array(cap);
  const y = new Float32Array(cap);
  const vx = new Float32Array(cap);
  const vy = new Float32Array(cap);
  const w = new Float32Array(cap);
  const h = new Float32Array(cap);
  const color = new Uint32Array(cap);

  for (let i = 0; i < spriteCount; i++) {
    // Deterministic lattice + velocity from index (no RNG).
    x[i] = (i * 37) % LOGICAL_WIDTH;
    y[i] = (i * 53) % LOGICAL_HEIGHT;
    vx[i] = 40 + (i % 17) * 3;
    vy[i] = 30 + (i % 13) * 2;
    w[i] = DEFAULT_SPRITE_SIZE;
    h[i] = DEFAULT_SPRITE_SIZE;
    color[i] = 0xff00ffff + ((i * 97) & 0x00ffffff);
  }

  return {
    x,
    y,
    vx,
    vy,
    w,
    h,
    color,
    spriteCount,
    accumulator: 0,
    tick: 0,
  };
}
