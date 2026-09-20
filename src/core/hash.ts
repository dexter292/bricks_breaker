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

  h = mixU32(h, world.rngGameplay[0]);
  h = mixU32(h, world.rngCosmetic[0]);
  h = mixU32(h, world.tick);
  h = mixF32(h, world.accumulator);

  h = mixTyped(h, world.evCode);
  h = mixTyped(h, world.evA);
  h = mixTyped(h, world.evB);
  h = mixTyped(h, world.evX);
  h = mixTyped(h, world.evY);
  h = mixU32(h, world.evHead);
  h = mixU32(h, world.evCount);
  h = mixU32(h, world.evCap);
  h = mixU32(h, world.evOverflow);

  return h >>> 0;
}
