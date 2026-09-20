import { Skia, matchFont, type SkCanvas, type SkFont, type SkPaint } from '@shopify/react-native-skia';
import type { OverlayMetrics } from './overlayMetrics';

/** iOS system UI font — avoid "monospace" (often resolves empty / no glyphs). */
const FONT_FAMILY = 'Helvetica';

let textPaint: SkPaint | null = null;
let overlayFont: SkFont | null = null;

function ensureOverlayTools(): { paint: SkPaint; font: SkFont } | null {
  'worklet';
  if (textPaint && overlayFont) {
    return { paint: textPaint, font: overlayFont };
  }
  try {
    textPaint = Skia.Paint();
    textPaint.setColor(Skia.Color('#00ffaa'));
    overlayFont = matchFont({
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      fontStyle: 'normal',
      fontWeight: 'normal',
    });
  } catch {
    textPaint = Skia.Paint();
    textPaint.setColor(Skia.Color('#00ffaa'));
    overlayFont = Skia.Font(undefined, 16);
  }
  if (!textPaint || !overlayFont) {
    return null;
  }
  return { paint: textPaint, font: overlayFont };
}

/**
 * Draw D-08 overlay lines into the same SkPicture as the sprites (no React text).
 * Coordinates are in **surface pixels** (after logical→surface scale is restored).
 * Host objects are created lazily on the UI runtime (never at module import).
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
