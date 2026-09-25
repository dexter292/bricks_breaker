/**
 * Engine-portable determinism fingerprint over a fixed board corpus (N-GEN-01).
 *
 * JS cold path, called at most once per process: no `'worklet'` directive, and it must
 * never acquire one (LC-17). Pure — its only inputs are `CORPUS_SEEDS` and `D_MAX`.
 *
 * ## Why this is a module and not four lines inside the test
 *
 * It has two consumers, and the whole point is that they compute the *same* number:
 *
 *   1. `tests/levelgen.determinism.test.ts`, which pins it against a hex literal, and
 *   2. the `__DEV__` on-device probe (plan 10-05), which re-derives it on Hermes to
 *      discharge assumption A1.
 *
 * The test could use `sha256`; the probe cannot, because Hermes ships no crypto built-in
 * and no Buffer. So the portable digest has to live in shared, pure TypeScript that both
 * sides import, rather than in the test file. It imports nothing from outside this folder
 * and uses no platform built-in whatsoever — that is the requirement, not an accident.
 *
 * ## SECURITY: this is a determinism fingerprint, not a security digest
 *
 * 32 bits of FNV-1a. It is not collision-resistant, not preimage-resistant, and trivially
 * forgeable. It exists to make an *accidental* change loud, alongside the SHA-256 pin that
 * covers the same corpus in the test. Never use it to authenticate a board, a score, a
 * daily-challenge submission, or anything else an adversary would want to control.
 *
 * ## Why FNV-1a specifically, and not a new mixer
 *
 * Same constants and the same `Math.imul(x, k) >>> 0` mixing shape as `src/core/hash.ts`
 * and `src/levelgen/rng.ts`'s `hashSeed`. `Math.imul` and `>>> 0` are exactly specified
 * over int32, so every step is engine-independent by construction — which is the entire
 * claim being made. The constants are redeclared here rather than imported from
 * `src/core/hash.ts` for the reason `rng.ts` gives for copying mulberry32: that file's
 * mixers are marked `'worklet'`, and `src/levelgen` stays clear of the worklet world.
 */

import { generate } from './generate';
import { D_MAX } from './schedule';

/** FNV-1a offset basis (32-bit) — same constant as src/core/hash.ts and ./rng.ts. */
const FNV_OFFSET = 2166136261;

/** FNV-1a prime (32-bit) — same constant as src/core/hash.ts and ./rng.ts. */
const FNV_PRIME = 16777619;

/**
 * Seeds in the pinned corpus. `CORPUS_SEEDS` x (`D_MAX` + 1) = 4 200 boards — the corpus
 * RESEARCH §Q5 hashed identically across three separate node processes, one of them
 * `--jitless`.
 *
 * Deliberately smaller than `tests/levelgen.sweep.test.ts`'s `SWEEP_SEEDS`: the sweep is a
 * property check that can afford 21 000 boards in CI, while this corpus must also be
 * computable on a phone inside a dev-menu tap. Changing this constant changes the digest,
 * so it is part of the pin, not a tuning knob.
 */
export const CORPUS_SEEDS = 200;

/**
 * FNV-1a u32 over `JSON.stringify(generate(s, d))` for every `s` in `0..seedCount-1` and
 * every `d` in `0..D_MAX`, `s` outer and `d` inner.
 *
 * The nesting order is part of the contract: the same boards folded in a different order
 * give a different number, and `tests/levelgen.determinism.test.ts` builds its SHA-256
 * corpus in this same order so the two pins are cross-checks on one thing rather than two
 * unrelated numbers.
 */
export function corpusFingerprint(seedCount: number = CORPUS_SEEDS): number {
  let h = FNV_OFFSET >>> 0;
  for (let s = 0; s < seedCount; s++) {
    for (let d = 0; d <= D_MAX; d++) {
      const json = JSON.stringify(generate(s, d));
      for (let i = 0; i < json.length; i++) {
        h = (h ^ json.charCodeAt(i)) >>> 0;
        h = Math.imul(h, FNV_PRIME) >>> 0;
      }
    }
  }
  return h >>> 0;
}
