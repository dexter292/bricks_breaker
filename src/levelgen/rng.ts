/**
 * Seeded, integer-only PRNG primitives for board generation (N-GEN-01).
 *
 * This module runs on the JS cold path — once per board, never per frame — so it
 * carries NO 'worklet' directive and must never acquire one (LC-17). It is a local
 * copy of the mulberry32 algorithm in src/core/rng/mulberry32.ts rather than an
 * import, because that file's streams live on World-owned Uint32Array slots and are
 * marked 'worklet'; copying four lines keeps src/levelgen free of both.
 *
 * Every draw is a u32 and every decision downstream is made in integer space. The
 * float-returning helper that file also exports is deliberately NOT ported:
 * implementation-approximated Math and float rounding are exactly what would let
 * Node and Hermes disagree about a board.
 *
 * SECURITY: this is a *deterministic* generator and explicitly NOT a CSPRNG. Its
 * entire contract is that its output is reproducible from the seed, i.e. fully
 * predictable. Never reuse it for a token, nonce, key or session id.
 */

/** FNV-1a offset basis (32-bit) — same constant as src/core/hash.ts. */
const FNV_OFFSET = 2166136261;

/** FNV-1a prime (32-bit) — same constant as src/core/hash.ts. */
const FNV_PRIME = 16777619;

/** Golden-ratio odd constant; mixes the seed half of a stream key. */
const MIX_SEED = 0x9e3779b1;

/** MurmurHash3 odd constant; mixes the difficulty half of a stream key. */
const MIX_DIFFICULTY = 0x85ebca6b;

/**
 * A mulberry32 stream over closure state. Returns a u32 in [0, 2^32) — never a float.
 * The same `seed` always yields the same sequence, in this process and any other.
 */
export function makeRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/**
 * Unbiased integer in [0, n) by rejection sampling. Returns 0 for n <= 1 without
 * consuming a draw.
 *
 * `lim` is a plain Number on purpose. Coercing it to u32 (the reflex for "make this
 * a u32") maps 2^32 to 0 for every power-of-two `n`, because the modulo is 0 there —
 * `u < 0` is then never true and this loop never exits. Fisher-Yates calls
 * below(rng, i + 1), hitting n = 2, 4, 8, 16, ... on every shuffle, so that is a
 * guaranteed hang of the whole suite rather than a rare one. Measured in 10-RESEARCH
 * Pitfall 2: the first sweep run timed out at 120 s until the coercion was removed.
 */
export function below(rng: () => number, n: number): number {
  if (n <= 1) return 0;
  const lim = 4294967296 - (4294967296 % n);
  for (;;) {
    const u = rng();
    if (u < lim) return u % n;
  }
}

/** Fisher-Yates over `items`, in place, drawing from `rng`. Returns `items`. */
export function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = below(rng, i + 1);
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

/**
 * Normalise a caller-supplied seed to a u32 (ASVS V5 — seed is one of only two
 * inputs to the whole phase, and neither is validated by the caller).
 *
 * `generate` accepts `number | string` so Phase 12 can pass a date string without a
 * signature change. A non-finite number normalises to 0 rather than propagating NaN
 * into the PRNG state, where it would poison every subsequent draw silently.
 * Strings go through integer-only FNV-1a over charCodeAt.
 */
export function hashSeed(seed: number | string): number {
  if (typeof seed === 'number') {
    return Number.isFinite(seed) ? seed >>> 0 : 0;
  }
  let h = FNV_OFFSET >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) >>> 0;
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

/**
 * Fold `difficulty` into the stream key so generate(s, d) and generate(s, d + 1) are
 * independent draws rather than one being a prefix of the other. Both constants are
 * odd, so each half is injective mod 2^32 and adjacent difficulties cannot collide.
 */
export function mixSeed(seedU32: number, difficulty: number): number {
  const a = Math.imul(seedU32 | 0, MIX_SEED);
  const b = Math.imul((difficulty | 0) + 1, MIX_DIFFICULTY);
  return (a ^ b) >>> 0;
}
