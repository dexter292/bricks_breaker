/**
 * Seeded board generator determinism — N-GEN-01 / D-02.
 *
 * SCOPE, stated honestly: the determinism pinned here is **Node-verified within and
 * across processes, not Hermes-verified**. Research measured byte-identity over 4 200
 * boards in three separate node processes (including --jitless); no Hermes observation
 * was made. CONTEXT carries that as assumption A1 and converts it into a *required*
 * on-device task (plan 10-05), not an assumption this file may quietly imply it covers.
 *
 * What this file does cover is the layer beneath the generator: the integer PRNG, the
 * seed normalisation that keeps hostile input out of the PRNG state, and the fixed
 * lattice. The generator's own pins (JSON identity, the corpus digests, difficulty
 * clamping) are the four `it.todo` entries at the bottom — plan 10-03 fills them.
 *
 * Deep imports of ../src/levelgen/rng and ../src/levelgen/grid are deliberate: tests
 * sit outside the boundaries element matrix, so importing the internals here keeps the
 * barrel an honest statement about what Phase 11/12 may use rather than a list widened
 * for the convenience of tests.
 */
import { describe, it, expect } from 'vitest';
import { makeRng, below, shuffleInPlace, hashSeed, mixSeed } from '../src/levelgen/rng';
import { GRID } from '../src/levelgen/grid';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../src/core';

/** 2^32 — the exclusive upper bound of every draw. */
const U32_RANGE = 4294967296;

/** The power-of-two set Fisher-Yates reaches, i.e. the set that hangs the naive form. */
const POWERS_OF_TWO = [2, 4, 8, 16, 32, 64, 1024];

describe('rng (N-GEN-01)', () => {
  it('yields the same u32 sequence for the same seed from two separate closures', () => {
    const a = makeRng(0x1234);
    const b = makeRng(0x1234);
    const seqA: number[] = [];
    const seqB: number[] = [];
    for (let i = 0; i < 16; i++) {
      seqA.push(a());
      seqB.push(b());
    }
    expect(seqB, 'two closures on seed 0x1234 must agree for 16 draws').toEqual(seqA);
    expect(new Set(seqA).size, 'a healthy stream does not repeat within 16 draws').toBe(16);
  });

  it('never produces a float — every draw is an integer in [0, 2^32)', () => {
    const rng = makeRng(0x9e3779b1);
    for (let i = 0; i < 512; i++) {
      const u = rng();
      expect(Number.isInteger(u), `draw ${i} must be an integer, got ${u}`).toBe(true);
      expect(u, `draw ${i} lower bound`).toBeGreaterThanOrEqual(0);
      expect(u, `draw ${i} upper bound`).toBeLessThan(U32_RANGE);
    }
  });

  it('below() terminates and stays in range for every power-of-two n', () => {
    // The canary for RESEARCH Pitfall 2. With a u32-coerced rejection limit this case
    // does not fail — it hangs, because 2^32 coerces to 0 and `u < 0` is never true.
    const rng = makeRng(1);
    for (const n of POWERS_OF_TWO) {
      for (let i = 0; i < 200; i++) {
        const v = below(rng, n);
        expect(Number.isInteger(v), `below(rng, ${n}) must return an integer`).toBe(true);
        expect(v, `below(rng, ${n}) lower bound`).toBeGreaterThanOrEqual(0);
        expect(v, `below(rng, ${n}) upper bound`).toBeLessThan(n);
      }
    }
  });

  it('below() stays in range for non-power-of-two n too', () => {
    const rng = makeRng(7);
    for (const n of [3, 5, 6, 7, 10, 99, 160]) {
      for (let i = 0; i < 100; i++) {
        const v = below(rng, n);
        expect(v, `below(rng, ${n}) lower bound`).toBeGreaterThanOrEqual(0);
        expect(v, `below(rng, ${n}) upper bound`).toBeLessThan(n);
      }
    }
  });

  it('below() returns 0 for n <= 1 without consuming a draw', () => {
    const rng = makeRng(42);
    expect(below(rng, 1), 'below(rng, 1) is the only possible value').toBe(0);
    expect(below(rng, 0), 'below(rng, 0) is degenerate but must not throw or loop').toBe(0);
    const fresh = makeRng(42);
    expect(rng(), 'n <= 1 must not advance the stream').toBe(fresh());
  });

  it('shuffleInPlace is deterministic and is a permutation', () => {
    const range = Array.from({ length: 80 }, (_, i) => i);
    const first = shuffleInPlace([...range], makeRng(2026));
    const second = shuffleInPlace([...range], makeRng(2026));
    expect(second, 'the same seed must produce the same permutation').toEqual(first);
    expect([...first].sort((x, y) => x - y), 'shuffle must not lose or duplicate an element').toEqual(range);
    expect(first, 'a 80-element shuffle that returns identity is a broken shuffle').not.toEqual(range);
  });
});

describe('seed normalisation (N-GEN-01)', () => {
  // Hostile-input set from RESEARCH §Security Domain V5: seed is one of only two
  // inputs to the phase, and no caller validates it. A NaN reaching the PRNG state
  // would poison every later draw silently rather than failing.
  const HOSTILE: Array<number | string> = [0, -1, 1e20, NaN, Infinity, -Infinity, '', '2026-09-25'];

  it('maps every hostile seed to a finite u32', () => {
    for (const seed of HOSTILE) {
      const h = hashSeed(seed);
      expect(Number.isInteger(h), `hashSeed(${String(seed)}) must be an integer`).toBe(true);
      expect(h, `hashSeed(${String(seed)}) lower bound`).toBeGreaterThanOrEqual(0);
      expect(h, `hashSeed(${String(seed)}) upper bound`).toBeLessThan(U32_RANGE);
    }
  });

  it('a normalised hostile seed drives a usable PRNG state (no NaN propagation)', () => {
    for (const seed of HOSTILE) {
      const rng = makeRng(hashSeed(seed));
      const u = rng();
      expect(Number.isNaN(u), `seed ${String(seed)} must not produce a NaN draw`).toBe(false);
      expect(u, `seed ${String(seed)} first draw upper bound`).toBeLessThan(U32_RANGE);
    }
  });

  it('distinguishes different string seeds', () => {
    expect(hashSeed('a'), "hashSeed('a') must differ from hashSeed('b')").not.toBe(hashSeed('b'));
    expect(hashSeed('2026-09-25'), 'adjacent date seeds must differ').not.toBe(hashSeed('2026-09-26'));
    expect(hashSeed(''), 'the empty string is a legal seed with a defined value').toBe(hashSeed(''));
  });

  it('mixSeed makes adjacent difficulties independent draws', () => {
    for (const s of [0, 1, 0x1234, 0xdeadbeef]) {
      for (let d = 0; d < 21; d++) {
        expect(mixSeed(s, d), `mixSeed(${s}, ${d}) must differ from d + 1`).not.toBe(mixSeed(s, d + 1));
      }
    }
  });
});

describe('grid (D-02 / SC-3)', () => {
  it('fits inside the 360x640 playfield by the campaign bounds expression', () => {
    // Same expression as tests/balance.curve-e2.test.ts, against the core constants
    // rather than local literals — level-04/05 shipped 4 units wide precisely because
    // the bounds guard existed in only one place.
    const right = GRID.originX + (GRID.cols - 1) * (GRID.brickW + GRID.gapX) + GRID.brickW;
    const bottom = GRID.originY + (GRID.rows - 1) * (GRID.brickH + GRID.gapY) + GRID.brickH;
    expect(GRID.originX, 'GRID left edge').toBeGreaterThanOrEqual(0);
    expect(GRID.originY, 'GRID top edge').toBeGreaterThanOrEqual(0);
    expect(right, 'GRID right edge').toBeLessThanOrEqual(LOGICAL_WIDTH);
    expect(bottom, 'GRID bottom edge').toBeLessThanOrEqual(LOGICAL_HEIGHT);
  });

  it('has an even column count so every mirrored placement is a clean pair (D-01)', () => {
    expect(GRID.cols % 2, 'GRID.cols must be even — no self-mirroring centre column').toBe(0);
    expect(GRID.cols * GRID.rows, 'cell count must stay under MAX_BRICKS 256').toBeLessThanOrEqual(256);
  });
});

// Plan 10-03 owns these four pins; the todo text is the contract.
describe('generator pins (plan 10-03)', () => {
  it.todo('generate(seed, difficulty) called twice returns identical JSON.stringify output');
  it.todo('the fixed corpus hashes to the pinned SHA-256 digest');
  it.todo('the fixed corpus u32 fingerprint matches the pinned Hermes-portable value');
  it.todo('difficulty is clamped to [0, D_MAX] for hostile callers');
});
