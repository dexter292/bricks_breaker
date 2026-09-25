import { coalesceHapticRank } from './mapping';
import type { HapticStyle, MemoryHapticsService } from './types';

/**
 * In-memory HapticsService for Vitest — records ≤1 fire per batch from coalesce.
 */
export function createMemoryHapticsService(): MemoryHapticsService {
  const fires: { style: HapticStyle }[] = [];
  let released = false;

  return {
    fires,
    playFromBatch(codes: ArrayLike<number>, count: number): void {
      if (released) return;
      const rank = coalesceHapticRank(codes, count);
      if (rank === 0) return;
      const style: HapticStyle = rank === 2 ? 'medium' : 'light';
      fires.push({ style });
    },
    release(): void {
      fires.length = 0;
      released = true;
    },
  };
}
