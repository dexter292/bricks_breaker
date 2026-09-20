/**
 * UI-phase freeze + accumulator policy helpers (PLT-01 / D-14).
 * Pure TS — Node-safe; no React Native lifecycle imports.
 */

export const UiPhase = {
  PLAYING: 'playing',
  PAUSED: 'paused',
  COUNTDOWN: 'countdown',
  WON: 'won',
  LOST: 'lost',
} as const;

export type UiPhase = (typeof UiPhase)[keyof typeof UiPhase];

export function resetAccumulator(world: { accumulator: number }): void {
  'worklet';
  world.accumulator = 0;
}

export function clampFrameDt(dtSec: number, maxFrameTime: number): number {
  'worklet';
  if (!Number.isFinite(dtSec)) {
    return 1 / 60;
  }
  return Math.min(dtSec, maxFrameTime);
}

export function shouldFreezeForUiPhase(phase: UiPhase): boolean {
  'worklet';
  return phase !== UiPhase.PLAYING;
}

export function pendingSubsteps(
  accumulator: number,
  fixedDt: number,
  maxSubsteps: number,
): number {
  'worklet';
  return Math.min(Math.floor(accumulator / fixedDt), maxSubsteps);
}
