import {
  matchFont,
  type SkCanvas,
} from '@shopify/react-native-skia';
import { Skia } from '@shopify/react-native-skia';
import type { OverlayMetrics } from './overlayMetrics';

// Module-scope host objects — created on JS thread; safe to capture in worklets (Pattern F).
const font = matchFont({ fontFamily: 'monospace', fontSize: 12 });
const textPaint = Skia.Paint();
textPaint.setColor(Skia.Color('#00ffaa'));

/**
 * Draw D-08 overlay lines into the same SkPicture as the sprites (no React text).
 */
export function drawOverlay(canvas: SkCanvas, m: OverlayMetrics): void {
  'worklet';
  const fps = m.rollingFps;
  const self =
    m.selfCheckReady ? (m.workletPass ? 'PASS' : 'FAIL') : '…';

  canvas.drawText(
    `${m.lastMs.toFixed(2)} ms/frame  ${fps.toFixed(1)} fps`,
    8,
    20,
    textPaint,
    font,
  );
  canvas.drawText(
    `substeps ${m.lastSubsteps} (max ${m.maxSubsteps})`,
    8,
    36,
    textPaint,
    font,
  );
  canvas.drawText(
    `p95 ${m.p95Ms.toFixed(2)}  p99 ${m.p99Ms.toFixed(2)}`,
    8,
    52,
    textPaint,
    font,
  );
  canvas.drawText(
    `frames>16.7ms ${m.overBudget}/${m.sampleCount}  sprites ${m.spriteCount}`,
    8,
    68,
    textPaint,
    font,
  );
  canvas.drawText(`worklet tick ${self}`, 8, 84, textPaint, font);
}
