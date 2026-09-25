/**
 * LC-07 sole exception: ≤1 batched scheduleOnRN / frame for SFX/haptics drain.
 * Host playBatch may fan-out to audio AND haptics on the JS thread (D-12).
 * Runtime must not import services/ — host owns the fan-out.
 */
import { scheduleOnRN } from 'react-native-worklets';

/**
 * Hop a compact event-code batch to the JS host playBatch once per frame.
 * Host may fan-out to AudioService + HapticsService (still ≤1 hop).
 * Copies codes so UI-thread reset/overwrite cannot race the async hop.
 */
export function flushAudioBatchOnJS(
  playBatch: (codes: ArrayLike<number>, count: number) => void,
  codes: ArrayLike<number>,
  count: number,
): void {
  'worklet';
  if (count <= 0) {
    return;
  }
  const n = count | 0;
  const copy = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    copy[i] = codes[i] as number;
  }
  scheduleOnRN(playBatch, copy, n);
}
