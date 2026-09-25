/**
 * RED-phase stub — the real three-stage generator lands in the GREEN commit of plan
 * 10-02 task 1.
 */

import type { LevelFileV1 } from '../core/levels/schema';

export function generate(seed: number | string, difficulty: number): LevelFileV1 {
  throw new Error(`generate(${String(seed)}, ${difficulty}): not implemented (RED)`);
}
