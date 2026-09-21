/**
 * Cosmetic VFX SoA state — deletable layer (D-02).
 * No React / Skia / gameplay World mutation.
 */

export const TRAIL_MAX = 5;
export const PARTICLE_POOL_DEFAULT = 128;
export const PARTICLE_POOL_HARD_MAX = 192;
export const CHIP_SPARKS_AT_1 = 4;
export const DESTROY_SPARKS_AT_1 = 12;
export const SHAKE_CAP = 2.5;
export const SHAKE_DECAY = 0.85;
export const SHAKE_EPSILON = 0.05;
export const IMPULSE_DESTROY = 1.2;
export const IMPULSE_LIFE_LOST = 2.0;

export type VfxCaps = {
  maxBalls?: number;
  particleCap?: number;
  /** Clamp trail ghosts; never apply < 2 (FX-01). */
  trailMax?: number;
  /** 0 = skip glow blit; 1 = full. */
  glowScale?: number;
};

export type VfxState = {
  maxBalls: number;
  /** Per-ball ring: length = maxBalls * TRAIL_MAX (storage stride). */
  trailX: Float32Array;
  trailY: Float32Array;
  /** Next write index within [0, trailMax) per ball */
  trailHead: Uint8Array;
  /** Effective trail ceiling from tier budget (≥2, ≤TRAIL_MAX). */
  trailMax: number;
  /** Glow blit scale from tier budget ([0,1]). */
  glowScale: number;

  particleCap: number;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  life: Float32Array;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  a: Float32Array;
  active: Uint8Array;
  /** Active particle count (dense tally) */
  particleCount: number;
  /** Oldest-active cursor for FIFO eviction when free-list empty (F-60). */
  particleOldest: number;
  /** Free-list stack of inactive slots (F-60). */
  freeStack: Int16Array;
  /** Top index into freeStack (count of free slots). */
  freeTop: number;

  shakeAmp: number;
  /** Radians — advances in stepShake for oscillating camera offset (F-31). */
  shakePhase: number;
};

/**
 * Allocate fixed typed-array VFX state once (no heap growth on spawn).
 */
export function allocateVfx(caps?: VfxCaps): VfxState {
  'worklet';
  const maxBalls = Math.max(1, Math.floor(caps?.maxBalls ?? 8));
  let particleCap = Math.floor(caps?.particleCap ?? PARTICLE_POOL_DEFAULT);
  if (particleCap < 1) particleCap = PARTICLE_POOL_DEFAULT;
  if (particleCap > PARTICLE_POOL_HARD_MAX) particleCap = PARTICLE_POOL_HARD_MAX;

  let trailMax = Math.floor(caps?.trailMax ?? TRAIL_MAX);
  if (!Number.isFinite(trailMax)) trailMax = TRAIL_MAX;
  trailMax = Math.max(2, Math.min(TRAIL_MAX, trailMax));

  let glowScale = caps?.glowScale ?? 1;
  if (!Number.isFinite(glowScale)) glowScale = 1;
  if (glowScale < 0) glowScale = 0;
  if (glowScale > 1) glowScale = 1;

  const trailSlots = maxBalls * TRAIL_MAX;

  const freeStack = new Int16Array(particleCap);
  for (let i = 0; i < particleCap; i++) {
    freeStack[i] = i;
  }

  return {
    maxBalls,
    trailX: new Float32Array(trailSlots),
    trailY: new Float32Array(trailSlots),
    trailHead: new Uint8Array(maxBalls),
    trailMax,
    glowScale,

    particleCap,
    px: new Float32Array(particleCap),
    py: new Float32Array(particleCap),
    vx: new Float32Array(particleCap),
    vy: new Float32Array(particleCap),
    life: new Float32Array(particleCap),
    r: new Float32Array(particleCap),
    g: new Float32Array(particleCap),
    b: new Float32Array(particleCap),
    a: new Float32Array(particleCap),
    active: new Uint8Array(particleCap),
    particleCount: 0,
    particleOldest: 0,
    freeStack,
    freeTop: particleCap,

    shakeAmp: 0,
    shakePhase: 0,
  };
}
