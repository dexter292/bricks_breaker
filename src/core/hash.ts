import type { World } from './types';

/** FNV-1a offset basis (32-bit). */
const FNV_OFFSET = 2166136261;

/** Scratch for float→u32 bit reinterpret (hash is test/golden path, not per-frame). */
const _f32 = new Float32Array(1);
const _u32 = new Uint32Array(_f32.buffer);

function mixU32(h: number, v: number): number {
  'worklet';
  return Math.imul(h ^ (v >>> 0), 16777619) >>> 0;
}

function mixF32(h: number, v: number): number {
  'worklet';
  _f32[0] = v;
  return mixU32(h, _u32[0]);
}

/** FNV-1a over a typed-array buffer via Uint32 views (+ leftover bytes). */
function mixBuffer(
  h: number,
  buf: ArrayBufferLike,
  byteOffset: number,
  byteLength: number,
): number {
  'worklet';
  const words = (byteLength / 4) | 0;
  const view = new Uint32Array(buf, byteOffset, words);
  for (let i = 0; i < words; i++) {
    h = mixU32(h, view[i]);
  }
  const rem = byteLength & 3;
  if (rem !== 0) {
    const u8 = new Uint8Array(buf, byteOffset + words * 4, rem);
    let last = 0;
    for (let i = 0; i < rem; i++) {
      last |= u8[i] << (i * 8);
    }
    h = mixU32(h, last);
  }
  return h;
}

function mixTyped(h: number, arr: ArrayBufferView): number {
  'worklet';
  return mixBuffer(h, arr.buffer, arr.byteOffset, arr.byteLength);
}

/**
 * Stable FNV-1a 32-bit hash of World SoA + scalars (D-14 surface).
 * Node-stable; not a cross-device bit lock. No JSON.stringify.
 */
export function hashWorld(world: World): number {
  'worklet';
  let h = FNV_OFFSET >>> 0;

  h = mixTyped(h, world.ballX);
  h = mixTyped(h, world.ballY);
  h = mixTyped(h, world.ballVx);
  h = mixTyped(h, world.ballVy);
  h = mixTyped(h, world.ballRadius);
  h = mixTyped(h, world.ballActive);
  h = mixU32(h, world.activeBallCount);
  h = mixU32(h, world.maxBalls);

  h = mixF32(h, world.paddleX);
  h = mixF32(h, world.paddleY);
  h = mixF32(h, world.paddleW);
  h = mixF32(h, world.paddleH);

  h = mixTyped(h, world.brickX);
  h = mixTyped(h, world.brickY);
  h = mixTyped(h, world.brickW);
  h = mixTyped(h, world.brickH);
  h = mixTyped(h, world.brickHp);
  h = mixTyped(h, world.brickFlags);
  h = mixU32(h, world.brickCount);
  h = mixU32(h, world.gridCols);
  h = mixU32(h, world.gridRows);
  h = mixF32(h, world.latticeOriginX);
  h = mixF32(h, world.latticeOriginY);
  h = mixF32(h, world.latticePitchX);
  h = mixF32(h, world.latticePitchY);
  h = mixTyped(h, world.cellToBrick);
  h = mixTyped(h, world.brickDamagedThisStep);

  h = mixU32(h, world.effectCount);
  h = mixTyped(h, world.effectType);
  h = mixTyped(h, world.effectUntilTick);
  h = mixU32(h, world.maxEffects);

  h = mixU32(h, world.score);
  h = mixU32(h, world.combo);
  h = mixU32(h, world.pickupCount);
  h = mixTyped(h, world.pickupType);
  h = mixTyped(h, world.pickupActive);
  h = mixTyped(h, world.pickupX);
  h = mixTyped(h, world.pickupY);
  h = mixU32(h, world.maxPickups);
  h = mixU32(h, world.stallIdleTicks);
  h = mixU32(h, world.stallTier);

  // F-50: lives + simPhase are live run state (were omitted).
  h = mixU32(h, world.lives);
  h = mixU32(h, world.simPhase);

  // F-32: gameplay RNG only — cosmetic stream must not affect golden/replay hash.
  h = mixU32(h, world.rngGameplay[0]);
  h = mixU32(h, world.tick);
  h = mixF32(h, world.accumulator);

  // F-50: hash only the live ring slice [start, start+evCount), not stale payload.
  const evN = world.evCount;
  const evCap = world.evCap;
  const evStart = (world.evHead - evN + evCap) % evCap;
  for (let i = 0; i < evN; i++) {
    const idx = (evStart + i) % evCap;
    h = mixU32(h, world.evCode[idx]);
    h = mixU32(h, world.evA[idx]);
    h = mixU32(h, world.evB[idx]);
    h = mixF32(h, world.evX[idx]);
    h = mixF32(h, world.evY[idx]);
  }
  h = mixU32(h, evN);
  h = mixU32(h, world.evOverflow);

  return h >>> 0;
}
