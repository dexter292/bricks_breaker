import { Skia, matchFont, type SkCanvas, type SkFont } from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import type { OverlayMetrics } from './overlayMetrics';

// Module-scope host objects — Paint only; font is lazy-created on the UI runtime
// (A2 fallback — matchFont at import time can fail / resolve a useless face).
const textPaint = Skia.Paint();
textPaint.setColor(Skia.Color('#00ffaa'));

const FONT_FAMILY = Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif';

let overlayFont: SkFont | null = null;

function ensureOverlayFont(): SkFont | null {
  'worklet';
  if (overlayFont) {
    return overlayFont;
  }
  try {
    overlayFont = matchFont({
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      fontStyle: 'normal',
      fontWeight: 'normal',
    });
  } catch {
    overlayFont = Skia.Font(undefined, 16);
  }
  return overlayFont;
}

/**
 * Draw D-08 overlay lines into the same SkPicture as the sprites (no React text).
 * Coordinates are in **surface pixels** (after logical→surface scale is restored).
 */
export function drawOverlay(canvas: SkCanvas, m: OverlayMetrics): void {
  'worklet';
  const font = ensureOverlayFont();
  if (!font) {
    return;
  }

  const fps = m.rollingFps;
  const self = m.selfCheckReady ? (m.workletPass ? 'PASS' : 'FAIL') : '...';

  canvas.drawText(
    `${m.lastMs.toFixed(2)} ms/frame  ${fps.toFixed(1)} fps`,
    12,
    28,
    textPaint,
    font,
  );
  canvas.drawText(
    `substeps ${m.lastSubsteps} (max ${m.maxSubsteps})`,
    12,
    48,
    textPaint,
    font,
  );
  canvas.drawText(
    `p95 ${m.p95Ms.toFixed(2)}  p99 ${m.p99Ms.toFixed(2)}`,
    12,
    68,
    textPaint,
    font,
  );
  canvas.drawText(
    `frames>16.7ms ${m.overBudget}/${m.sampleCount}  sprites ${m.spriteCount}`,
    12,
    88,
    textPaint,
    font,
  );
  canvas.drawText(`worklet tick ${self}`, 12, 108, textPaint, font);
}
