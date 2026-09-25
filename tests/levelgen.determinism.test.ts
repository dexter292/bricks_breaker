/**
 * Seeded board generator determinism — N-GEN-01 / D-02.
 *
 * SCOPE, stated honestly: the determinism pinned here is **Node-verified within and
 * across processes, not Hermes-verified**. Research measured byte-identity over 4 200
 * boards in three separate node processes (including --jitless); no Hermes observation
 * was made. CONTEXT carries that as assumption A1 and converts it into a *required*
 * on-device task (plan 10-05), not an assumption this file may quietly imply it covers.
 *
 * **What the two pins at the bottom do and do not claim.** They claim that a fixed
 * 4 200-board corpus serialises to one exact byte sequence, reproducibly, in any Node
 * process. They do NOT claim that sequence is what Hermes produces — assumption A1 is
 * discharged by plan 10-05's on-device probe, not by this file. Nor are they a security
 * digest: `corpusFingerprint` is 32 bits of FNV-1a and is trivially forgeable. Their only
 * job is to be a trap that a silent change to the PRNG, the candidate ordering or the
 * schedule cannot walk past.
 *
 * This file also covers the layer beneath the generator: the integer PRNG, the seed
 * normalisation that keeps hostile input out of the PRNG state, and the fixed lattice.
 *
 * Deep imports of ../src/levelgen/rng and ../src/levelgen/grid are deliberate: tests
 * sit outside the boundaries element matrix, so importing the internals here keeps the
 * barrel an honest statement about what Phase 11/12 may use rather than a list widened
 * for the convenience of tests. `generate` / `corpusFingerprint` / `CORPUS_SEEDS` come
 * off the barrel instead, because that is the path plan 10-05's device probe must use
 * (LC-16) and a re-export that silently went missing should fail here first.
 */
import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { makeRng, below, shuffleInPlace, hashSeed, mixSeed } from '../src/levelgen/rng';
import { GRID } from '../src/levelgen/grid';
import { CORPUS_SEEDS, D_MAX, corpusFingerprint, generate } from '../src/levelgen';
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
  const HOSTILE: (number | string)[] = [0, -1, 1e20, NaN, Infinity, -Infinity, '', '2026-09-25'];

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

/**
 * The corpus both pins are taken over, built in exactly the nesting order
 * `corpusFingerprint` folds in: `s` outer over `0..CORPUS_SEEDS-1`, `d` inner over
 * `0..D_MAX`. Two digests over two different orders would be two unrelated numbers, and
 * the SHA-256 pin would stop being a cross-check on the u32 one.
 */
function corpusJson(seedCount: number = CORPUS_SEEDS): string[] {
  const out: string[] = [];
  for (let s = 0; s < seedCount; s++) {
    for (let d = 0; d <= D_MAX; d++) out.push(JSON.stringify(generate(s, d)));
  }
  return out;
}

/**
 * SHA-256 over the concatenated corpus. RESEARCH §Q5 produced this exact value in three
 * separate node processes, one of them `--jitless`. Regenerating it is a deliberate act:
 * see the failure message on the case below.
 */
const PINNED_SHA256 = 'PLACEHOLDER_SHA256_PLACEHOLDER_SHA256_PLACEHOLDER_SHA256_PLACEH';

/** The engine-portable twin of the pin above, as 8 lowercase hex digits. */
const PINNED_FINGERPRINT_HEX = '00000000';

/**
 * Why a mismatch is never "just update the number": the pins are the ONLY regression trap
 * for a silent change to the PRNG, the candidate ordering or the schedule. Each of those
 * changes every board for every existing seed, which retroactively rewrites Phase 12's
 * daily-challenge history.
 */
const REGENERATION_WARNING =
  'corpus digest changed: the PRNG, the candidate ordering or SCHEDULE moved. ' +
  'Every board for every existing seed is now different, which invalidates any ' +
  'daily-challenge history keyed on a seed. Regenerate both pins only deliberately, ' +
  "and treat plan 10-05's recorded on-device value as stale until it is re-measured.";

describe('generator pins (plan 10-03)', () => {
  it('generate(seed, difficulty) called twice returns identical JSON.stringify output', () => {
    const a = generate(7, 3);
    const b = generate(7, 3);
    expect(JSON.stringify(a), 'two calls with the same arguments must agree byte for byte').toBe(
      JSON.stringify(b),
    );

    // RESEARCH Pitfall 3, and the only detector for it. Handing a caller the frozen module
    // constants by reference lets one mutation change board N+1 — determinism dies with no
    // error anywhere, and the signature failure is an ordering-dependent pass/fail between
    // test files rather than something that ever throws.
    a.grid.cols = 999;
    a.brickTypes['1'] = { hp: 42 };
    const c = generate(7, 3);
    expect(JSON.stringify(c), 'a caller mutating board N must not reach board N + 1').toBe(
      JSON.stringify(b),
    );
    expect(b.grid.cols, 'the emitted grid must be a fresh object, not the frozen GRID').toBe(
      GRID.cols,
    );
  });

  it('the fixed corpus hashes to the pinned SHA-256 digest', () => {
    const digest = createHash('sha256').update(corpusJson().join('')).digest('hex');
    expect(digest, REGENERATION_WARNING).toBe(PINNED_SHA256);
  });

  it('the fixed corpus u32 fingerprint matches the pinned Hermes-portable value', () => {
    const first = corpusFingerprint();
    expect(Number.isInteger(first), 'the fingerprint must be an integer').toBe(true);
    expect(first, 'the fingerprint must be a u32').toBeGreaterThanOrEqual(0);
    expect(first, 'the fingerprint must be a u32').toBeLessThan(U32_RANGE);
    expect(corpusFingerprint(), 'a pure function of CORPUS_SEEDS and D_MAX').toBe(first);
    expect(first.toString(16).padStart(8, '0'), REGENERATION_WARNING).toBe(
      PINNED_FINGERPRINT_HEX,
    );
  });

  it('difficulty is clamped to [0, D_MAX] for hostile callers', () => {
    // T-10-09. `generate` is called by Phase 11 with a wave counter that runs past D_MAX and
    // by Phase 12 with a date-derived value; an unclamped index reads past the table.
    expect(JSON.stringify(generate(1, -5)), 'negative difficulty clamps to 0').toBe(
      JSON.stringify(generate(1, 0)),
    );
    expect(JSON.stringify(generate(1, 999)), 'difficulty past the ladder clamps to D_MAX').toBe(
      JSON.stringify(generate(1, D_MAX)),
    );
    expect(JSON.stringify(generate(1, Number.NaN)), 'NaN clamps to 0, never propagates').toBe(
      JSON.stringify(generate(1, 0)),
    );

    // The string-seed path end to end: Phase 12 passes a date without a signature change.
    const dated = generate('2026-09-25', 4);
    expect(dated.cells, 'a string seed must produce a full board').toHaveLength(GRID.rows);
    expect(dated.id, 'the id encodes the normalised u32 seed and the clamped difficulty').toBe(
      `gen-${hashSeed('2026-09-25').toString(16)}-4`,
    );
  });
});
