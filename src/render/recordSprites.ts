import { Skia, type SkFont, type SkPicture } from '@shopify/react-native-skia';
import type { World } from '../core';
import type { OverlayMetrics } from './overlayMetrics';
import { drawOverlay } from './recordOverlay';

/** Logical play-field — must match core allocate/step. */
const LOGICAL_W = 360;
const LOGICAL_H = 640;

type RecorderTools = {
  recorder: ReturnType<typeof Skia.PictureRecorder>;
  paint: ReturnType<typeof Skia.Paint>;
  fieldRect: ReturnType<typeof Skia.XYWHRect>;
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
      fieldRect: Skia.XYWHRect(0, 0, LOGICAL_W, LOGICAL_H),
      surfaceBounds: Skia.XYWHRect(0, 0, LOGICAL_W, LOGICAL_H),
      colorBuf: Skia.Color('#1a1a2eff'),
    };
    global.__spikeRecorderTools = tools;
  }
  return tools;
}

/**
 * Record a blank playfield (+ optional overlay) into one SkPicture.
 * Phase 3 owns gameplay visuals — no sprite SoA loop (D-07 migration).
 */
export function recordFrame(
  _world: World,
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
  // Blank field fill — no sprite loop over removed SoA
  tools.colorBuf[0] = 0.1;
  tools.colorBuf[1] = 0.1;
  tools.colorBuf[2] = 0.18;
  tools.colorBuf[3] = 1;
  tools.paint.setColor(tools.colorBuf);
  tools.fieldRect.setXYWH(0, 0, LOGICAL_W, LOGICAL_H);
  canvas.drawRect(tools.fieldRect, tools.paint);
  canvas.restore();

  if (drawOverlayFlag && hudFont) {
    drawOverlay(canvas, metrics, hudFont);
  }

  return tools.recorder.finishRecordingAsPicture();
}
