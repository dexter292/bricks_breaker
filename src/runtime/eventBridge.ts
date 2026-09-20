/**
 * LC-07 sole exception: ≤1 batched scheduleOnRN / frame for audio drain.
 * Host passes a JS-thread-bound playBatch — runtime must not import services/.
 */
import { scheduleOnRN } from 'react-native-worklets';

/**
 * Hop a compact event-code batch to the JS AudioService once per frame.
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
