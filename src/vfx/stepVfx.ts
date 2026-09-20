import type { VfxState } from './types';
import { stepParticles } from './particles';
import { stepShake } from './shake';

/**
 * Advance cosmetic VFX for one frame (Plan 05 / useGameLoop contract).
 * Does not clear events or touch World gameplay fields.
 * Per-ball pushTrail stays in the game-loop substep — not here.
 */
export function stepVfx(vfx: VfxState, dt: number, intensity: number): void {
  'worklet';
  stepParticles(vfx, dt);
  stepShake(vfx, intensity);
}
