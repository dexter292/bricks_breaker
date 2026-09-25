/**
 * Engine-portable determinism fingerprint over a fixed board corpus (N-GEN-01).
 *
 * RED stub — plan 10-03 task 2 fills this in the GREEN commit.
 */

/** Seeds in the pinned corpus. `CORPUS_SEEDS` x (D_MAX + 1) = 4 200 boards. */
export const CORPUS_SEEDS = 200;

export function corpusFingerprint(seedCount: number = CORPUS_SEEDS): number {
  throw new Error(`corpusFingerprint(${seedCount}): not implemented (RED)`);
}
