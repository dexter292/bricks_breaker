/**
 * Fixed-capacity audio event batch — copy codes after each stepRun (Pitfall 1).
 * Never calls audio / never grows beyond initial Int16Array (T-07-10).
 */
import type { World } from '../core/types';

export type AudioBatchSoA = {
  codes: Int16Array;
  count: number;
  cap: number;
  /** 1 when newest events were dropped due to overflow */
  overflow: number;
};

const DEFAULT_AUDIO_BATCH_CAP = 256;

export function createAudioBatch(cap?: number): AudioBatchSoA {
  'worklet';
  const c = Math.max(1, Math.floor(cap ?? DEFAULT_AUDIO_BATCH_CAP));
  return {
    codes: new Int16Array(c),
    count: 0,
    cap: c,
    overflow: 0,
  };
}

export function resetAudioBatch(b: AudioBatchSoA): void {
  'worklet';
  b.count = 0;
  b.overflow = 0;
}

/**
 * Copy current ring evCodes into the batch. Drop newest on overflow.
 * Does not clear the ring and does not invoke audio.
 */
export function appendEventsForAudio(world: World, batch: AudioBatchSoA): void {
  'worklet';
  const n = world.evCount;
  if (n <= 0) {
    return;
  }
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    if (batch.count >= batch.cap) {
      batch.overflow = 1;
      return;
    }
    const idx = (start + i) % world.evCap;
    batch.codes[batch.count] = world.evCode[idx];
    batch.count += 1;
  }
}
