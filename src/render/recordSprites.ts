import {
  Skia,
  type SkHostRect,
  type SkPaint,
  type SkPicture,
  type SkPictureRecorder,
} from '@shopify/react-native-skia';
import type { SpikeWorld } from '../core';
import type { OverlayMetrics } from './overlayMetrics';
import { drawOverlay } from './recordOverlay';

/** Logical play-field — must match core allocate/step. */
const LOGICAL_W = 360;
const LOGICAL_H = 640;

// Lazily created on the UI runtime — never at module import (Skia JSI may not be ready).
let recorder: SkPictureRecorder | null = null;
let paint: SkPaint | null = null;
let spriteRect: SkHostRect | null = null;
let surfaceBounds: SkHostRect | null = null;
let colorBuf: Float32Array | null = null;

function ensureRecorderTools(): {
  recorder: SkPictureRecorder;
  paint: SkPaint;
  spriteRect: SkHostRect;
  surfaceBounds: SkHostRect;
  colorBuf: Float32Array;
} {
  'worklet';
  if (!recorder) {
    recorder = Skia.PictureRecorder();
  }
  if (!paint) {
    paint = Skia.Paint();
  }
  if (!spriteRect) {
    spriteRect = Skia.XYWHRect(0, 0, 0, 0);
  }
  if (!surfaceBounds) {
    surfaceBounds = Skia.XYWHRect(0, 0, LOGICAL_W, LOGICAL_H);
  }
  if (!colorBuf) {
    colorBuf = Skia.Color('#ffffffff');
  }
  return {
    recorder,
    paint,
    spriteRect,
    surfaceBounds,
    colorBuf,
  };
}

/**
 * Record ~200–300 sprites into one SkPicture; optionally bake overlay text in (D-06 / D-08).
 * Sprites are authored in logical 360×640, then scaled to the live surface size so the
 * picture fills the phone screen 1:1.
 */
export function recordFrame(
  world: SpikeWorld,
  metrics: OverlayMetrics,
  surfaceW: number,
  surfaceH: number,
  drawOverlayFlag: boolean,
): SkPicture {
  'worklet';
  const tools = ensureRecorderTools();
  const wPx = surfaceW > 1 ? surfaceW : LOGICAL_W;
  const hPx = surfaceH > 1 ? surfaceH : LOGICAL_H;
  tools.surfaceBounds.setXYWH(0, 0, wPx, hPx);

  const canvas = tools.recorder.beginRecording(tools.surfaceBounds);

  canvas.save();
  canvas.scale(wPx / LOGICAL_W, hPx / LOGICAL_H);
  const n = world.spriteCount;
  for (let i = 0; i < n; i++) {
    const c = world.color[i];
    tools.colorBuf[0] = ((c >>> 16) & 0xff) / 255;
    tools.colorBuf[1] = ((c >>> 8) & 0xff) / 255;
    tools.colorBuf[2] = (c & 0xff) / 255;
    tools.colorBuf[3] = ((c >>> 24) & 0xff) / 255;
    tools.paint.setColor(tools.colorBuf);
    tools.spriteRect.setXYWH(world.x[i], world.y[i], world.w[i], world.h[i]);
    canvas.drawRect(tools.spriteRect, tools.paint);
  }
  canvas.restore();

  if (drawOverlayFlag) {
    drawOverlay(canvas, metrics);
  }

  return tools.recorder.finishRecordingAsPicture();
}
