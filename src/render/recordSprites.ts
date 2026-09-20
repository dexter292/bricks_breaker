import { Skia, type SkPicture, type SkRect } from '@shopify/react-native-skia';
import type { SpikeWorld } from '../core';
import type { OverlayMetrics } from './overlayMetrics';
import { drawOverlay } from './recordOverlay';

// Module-scope host objects — never allocate Paint/Recorder/array literals per frame (Pattern D).
const recorder = Skia.PictureRecorder();
const paint = Skia.Paint();
const rect = Skia.XYWHRect(0, 0, 0, 0);
const colorBuf = Skia.Color('#ffffffff');

/**
 * Record ~200–300 sprites into one SkPicture; optionally bake overlay text in (D-06 / D-08).
 */
export function recordFrame(
  world: SpikeWorld,
  metrics: OverlayMetrics,
  bounds: SkRect,
  drawOverlayFlag: boolean,
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
  if (drawOverlayFlag) {
    drawOverlay(canvas, metrics);
  }
  return recorder.finishRecordingAsPicture();
}
