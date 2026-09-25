export type HapticStyle = 'light' | 'medium';

export interface HapticsService {
  playFromBatch(codes: ArrayLike<number>, count: number): void;
  release(): void;
}

export type MemoryHapticsService = HapticsService & {
  fires: { style: HapticStyle }[];
};
