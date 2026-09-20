import {
  Skia,
  matchFont,
  type SkCanvas,
  type SkFont,
  type SkPaint,
} from '@shopify/react-native-skia';
import type { OverlayMetrics } from './overlayMetrics';

const FONT_FAMILY = 'Helvetica';

type OverlayTools = { paint: SkPaint; font: SkFont };

declare const global: typeof globalThis & { __spikeOverlayTools?: OverlayTools };

function ensureOverlayTools(): OverlayTools | null {
  'worklet';
  let tools = global.__spikeOverlayTools;
  if (tools) {
    return tools;
  }
  try {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color('#00ffaa'));
    const font = matchFont({
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      fontStyle: 'normal',
      fontWeight: 'normal',
    });
    tools = { paint, font };
  } catch {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color('#00ffaa'));
    tools = { paint, font: Skia.Font(undefined, 16) };
  }
  global.__spikeOverlayTools = tools;
  return tools;
}

/**
 * Draw D-08 overlay lines into the same SkPicture as the sprites (no React text).
 * Coordinates are in surface pixels.
 */
export function drawOverlay(canvas: SkCanvas, m: OverlayMetrics): void {
  'worklet';
  const tools = ensureOverlayTools();
  if (!tools) {
    return;
  }
  const { paint, font } = tools;
  const fps = m.rollingFps;
  const self = m.selfCheckReady ? (m.workletPass ? 'PASS' : 'FAIL') : '...';

  canvas.drawText(
    `${m.lastMs.toFixed(2)} ms/frame  ${fps.toFixed(1)} fps`,
    12,
    28,
    paint,
    font,
  );
  canvas.drawText(
    `substeps ${m.lastSubsteps} (max ${m.maxSubsteps})`,
    12,
    48,
    paint,
    font,
  );
  canvas.drawText(
    `p95 ${m.p95Ms.toFixed(2)}  p99 ${m.p99Ms.toFixed(2)}`,
    12,
    68,
    paint,
    font,
  );
  canvas.drawText(
    `frames>16.7ms ${m.overBudget}/${m.sampleCount}  sprites ${m.spriteCount}`,
    12,
    88,
    paint,
    font,
  );
  canvas.drawText(`worklet tick ${self}`, 12, 108, paint, font);
}
