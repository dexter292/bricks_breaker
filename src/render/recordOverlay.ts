import {
  Skia,
  matchFont,
  type SkCanvas,
  type SkFont,
  type SkPaint,
} from '@shopify/react-native-skia';
import type { OverlayMetrics } from './overlayMetrics';

type OverlayTools = { paint: SkPaint; font: SkFont };

declare const global: typeof globalThis & { __spikeOverlayTools?: OverlayTools | null };

function ensureOverlayTools(): OverlayTools | null {
  'worklet';
  if (global.__spikeOverlayTools !== undefined) {
    return global.__spikeOverlayTools;
  }

  const paint = Skia.Paint();
  paint.setColor(Skia.Color('#00ffaa'));

  // Try several system faces — matchFont can return a null typeface on sim
  // which makes Skia.Font throw "Expected Typeface but got non-object".
  const families = ['Helvetica', 'System', 'Arial', 'Courier'];
  let font: SkFont | null = null;
  for (let i = 0; i < families.length; i++) {
    try {
      const candidate = matchFont({
        fontFamily: families[i],
        fontSize: 16,
        fontStyle: 'normal',
        fontWeight: 'normal',
      });
      // Probe: measureText throws if the font is unusable.
      candidate.measureText('fps');
      font = candidate;
      break;
    } catch {
      // try next family
    }
  }

  if (!font) {
    global.__spikeOverlayTools = null;
    return null;
  }

  const tools = { paint, font };
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

  try {
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
  } catch {
    // Font/typeface issues must not tear down the frame loop.
    global.__spikeOverlayTools = null;
  }
}
