/**
 * Dual mulberry32 streams live on World slots (D-13).
 * Never share rngGameplay and rngCosmetic — pass the correct slot.
 */

/** Advance state[i] and return a u32 in [0, 2^32). */
export function nextU32(state: Uint32Array, i: number): number {
  'worklet';
  state[i] = (state[i] + 0x6d2b79f5) | 0;
  let t = state[i];
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

/** Advance state[i] and return a float in [0, 1). */
export function nextFloat(state: Uint32Array, i: number): number {
  'worklet';
  state[i] = (state[i] + 0x6d2b79f5) | 0;
  let t = state[i];
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
