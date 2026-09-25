/**
 * RED stub (11-01 Task 1) — the endless wave policy is not implemented yet.
 * The contract header, the clamp and the per-wave seed derivation land in the GREEN commit.
 */

import { hashSeed } from '../../levelgen';

export function difficultyForWave(wave: number): number {
  return wave | 0;
}

export function seedForWave(runSeed: number | string, wave: number): number {
  return hashSeed(runSeed) + (wave | 0) * 0;
}
