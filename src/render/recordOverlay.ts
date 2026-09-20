import { Skia, type SkCanvas, type SkFont, type SkPaint } from '@shopify/react-native-skia';
import type { OverlayMetrics } from './overlayMetrics';

declare const global: typeof globalThis & {
  __spikeOverlayPaint?: SkPaint;
};

function ensurePaint(): SkPaint {
  'worklet';
  let paint = global.__spikeOverlayPaint;
  if (!paint) {
    paint = Skia.Paint();
    paint.setColor(Skia.Color('#00ffaa'));
    global.__spikeOverlayPaint = paint;
  }
  return paint;
}

/**
 * Draw D-08 overlay lines into the same SkPicture as the sprites (no React text).
 * `font` must be a loaded SkFont (bundled TTF via useFont) — matchFont is unreliable on sim.
 */
export function drawOverlay(
  canvas: SkCanvas,
  m: OverlayMetrics,
  font: SkFont,
): void {
  'worklet';
  const paint = ensurePaint();
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
