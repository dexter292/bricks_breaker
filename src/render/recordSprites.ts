import { Skia, type SkPicture } from '@shopify/react-native-skia';
import type { SpikeWorld } from '../core';
import type { OverlayMetrics } from './overlayMetrics';
import { drawOverlay } from './recordOverlay';

/** Logical play-field — must match core allocate/step. */
const LOGICAL_W = 360;
const LOGICAL_H = 640;

// Module-scope host objects — never allocate Paint/Recorder/array literals per frame (Pattern D).
const recorder = Skia.PictureRecorder();
const paint = Skia.Paint();
const spriteRect = Skia.XYWHRect(0, 0, 0, 0);
const surfaceBounds = Skia.XYWHRect(0, 0, LOGICAL_W, LOGICAL_H);
const colorBuf = Skia.Color('#ffffffff');

/**
 * Record ~200–300 sprites into one SkPicture; optionally bake overlay text in (D-06 / D-08).
 * Sprites are authored in logical 360×640, then scaled to the live surface size so the
 * picture fills the phone screen 1:1 (no FitBox required).
 */
export function recordFrame(
  world: SpikeWorld,
  metrics: OverlayMetrics,
  surfaceW: number,
  surfaceH: number,
  drawOverlayFlag: boolean,
): SkPicture {
  'worklet';
  const wPx = surfaceW > 1 ? surfaceW : LOGICAL_W;
  const hPx = surfaceH > 1 ? surfaceH : LOGICAL_H;
  surfaceBounds.setXYWH(0, 0, wPx, hPx);

  const canvas = recorder.beginRecording(surfaceBounds);

  // Draw sprites in logical space, scaled to fill the surface.
  canvas.save();
  canvas.scale(wPx / LOGICAL_W, hPx / LOGICAL_H);
  const n = world.spriteCount;
  for (let i = 0; i < n; i++) {
    const c = world.color[i];
    colorBuf[0] = ((c >>> 16) & 0xff) / 255;
    colorBuf[1] = ((c >>> 8) & 0xff) / 255;
    colorBuf[2] = (c & 0xff) / 255;
    colorBuf[3] = ((c >>> 24) & 0xff) / 255;
    paint.setColor(colorBuf);
    spriteRect.setXYWH(world.x[i], world.y[i], world.w[i], world.h[i]);
    canvas.drawRect(spriteRect, paint);
  }
  canvas.restore();

  // Overlay in surface pixels (stable HUD size, not stretched with fill).
  if (drawOverlayFlag) {
    drawOverlay(canvas, metrics);
  }

  return recorder.finishRecordingAsPicture();
}
