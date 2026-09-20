import { Skia, type SkPicture, type SkRect } from '@shopify/react-native-skia';
import type { SpikeWorld } from '../core';
import type { OverlayMetrics } from './overlayMetrics';

// Module-scope host objects — safe to capture in worklets (Pattern D).
const recorder = Skia.PictureRecorder();
const paint = Skia.Paint();
const rect = Skia.XYWHRect(0, 0, 0, 0);
const colorBuf = Skia.Color('#ffffffff');

/**
 * Stub recorder — Task 2 fills sprite loop + overlay.
 * Exists so Task 1 `useSpikeLoop` can import a worklet-safe symbol.
 */
export function recordFrame(
  world: SpikeWorld,
  _metrics: OverlayMetrics,
  bounds: SkRect,
  _drawOverlayFlag: boolean,
): SkPicture {
  'worklet';
  const canvas = recorder.beginRecording(bounds);
  const n = world.spriteCount;
  for (let i = 0; i < n; i++) {
    const c = world.color[i];
    colorBuf[0] = ((c >>> 16) & 0xff) / 255;
    colorBuf[1] = ((c >>> 8) & 0xff) / 255;
    colorBuf[2] = (c & 0xff) / 255;
    colorBuf[3] = ((c >>> 24) & 0xff) / 255;
    paint.setColor(colorBuf);
    rect.setXYWH(world.x[i], world.y[i], world.w[i], world.h[i]);
    canvas.drawRect(rect, paint);
  }
  return recorder.finishRecordingAsPicture();
}
