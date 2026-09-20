import { Skia, type SkFont, type SkPicture } from '@shopify/react-native-skia';
import type { SpikeWorld } from '../core';
import type { OverlayMetrics } from './overlayMetrics';
import { drawOverlay } from './recordOverlay';

/** Logical play-field — must match core allocate/step. */
const LOGICAL_W = 360;
const LOGICAL_H = 640;

type RecorderTools = {
  recorder: ReturnType<typeof Skia.PictureRecorder>;
  paint: ReturnType<typeof Skia.Paint>;
  spriteRect: ReturnType<typeof Skia.XYWHRect>;
  surfaceBounds: ReturnType<typeof Skia.XYWHRect>;
  colorBuf: Float32Array;
};

declare const global: typeof globalThis & { __spikeRecorderTools?: RecorderTools };

function ensureRecorderTools(): RecorderTools {
  'worklet';
  // Store on UI-runtime global — module `let` bindings break worklet serialization.
  let tools = global.__spikeRecorderTools;
  if (!tools) {
    tools = {
      recorder: Skia.PictureRecorder(),
      paint: Skia.Paint(),
      spriteRect: Skia.XYWHRect(0, 0, 0, 0),
      surfaceBounds: Skia.XYWHRect(0, 0, LOGICAL_W, LOGICAL_H),
      colorBuf: Skia.Color('#ffffffff'),
    };
    global.__spikeRecorderTools = tools;
  }
  return tools;
}

/**
 * Record ~200–300 sprites into one SkPicture; optionally bake overlay text in (D-06 / D-08).
 * Overlay requires a loaded SkFont (bundled TTF) — skipped until font is ready.
 */
export function recordFrame(
  world: SpikeWorld,
  metrics: OverlayMetrics,
  surfaceW: number,
  surfaceH: number,
  drawOverlayFlag: boolean,
  hudFont: SkFont | null,
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

  if (drawOverlayFlag && hudFont) {
    drawOverlay(canvas, metrics, hudFont);
  }

  return tools.recorder.finishRecordingAsPicture();
}
