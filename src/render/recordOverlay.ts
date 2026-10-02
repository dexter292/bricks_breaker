import { Skia, type SkCanvas, type SkFont, type SkPaint } from '@shopify/react-native-skia';
import type { OverlayMetrics } from './overlayMetrics';

declare const global: typeof globalThis & {
  __spikeOverlayPaint?: SkPaint;
  __spikeOverlayBgPaint?: SkPaint;
};

/**
 * Layout constants for the overlay block.
 *
 * The block is anchored to the BOTTOM of the surface, not the top. MEASURED on an iPhone 17
 * simulator, 2026-09-28: drawn from y=28 the first two lines (`ms/frame  fps` and
 * `substeps`) rendered underneath the `__DEV__` dev row — React chrome layered over this
 * canvas — and were legible only as fragments showing through the gaps between buttons.
 * Anchoring below the dev row instead is fragile, because the row's height changes when it
 * wraps. The lower playfield is the one band nothing else occupies: bricks sit at the top,
 * the paddle at the very bottom edge, and an operator taking an SC-5 reading needs to watch
 * a wave transition (top) and the numbers at the same time.
 *
 * `CHAR_W` is SpaceMono's 0.612 em advance at the 11px the host loads the face at
 * (`PlayingHost.tsx` `useFont(... , 11)`), the same figure 12-UI-SPEC uses for its text
 * budgets. It only sizes the backdrop, so a small error costs padding, never correctness.
 */
const LINE_H = 20;
const PAD = 8;
// Clears the bottom band the shell owns: the `Tap to launch` serve hint and the paddle.
// MEASURED 2026-09-28 at 28 — the `frames>16.7ms` line rendered underneath the hint.
const BOTTOM_GAP = 140;
const CHAR_W = 11 * 0.612;

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
 * Backdrop so the readings stay legible over whatever is behind them. Without it the
 * `#00ffaa` text sat directly on brick fills and was unreadable. Deliberately translucent
 * rather than opaque: the ball crosses this band, and a reading that hides the ball would
 * trade one observation problem for another.
 */
function ensureBgPaint(): SkPaint {
  'worklet';
  let paint = global.__spikeOverlayBgPaint;
  if (!paint) {
    paint = Skia.Paint();
    paint.setColor(Skia.Color('#000000B8'));
    global.__spikeOverlayBgPaint = paint;
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
  surfaceH: number,
): void {
  'worklet';
  const paint = ensurePaint();
  const bg = ensureBgPaint();
  const fps = m.rollingFps;
  const self = m.selfCheckReady ? (m.workletPass ? 'PASS' : 'FAIL') : '...';

  const lines = [
    `${m.lastMs.toFixed(2)} ms/frame  ${fps.toFixed(1)} fps`,
    `substeps ${m.lastSubsteps} (max ${m.maxSubsteps})`,
    `p95 ${m.p95Ms.toFixed(2)}  p99 ${m.p99Ms.toFixed(2)}`,
    `frames>16.7ms ${m.overBudget}/${m.sampleCount}  sprites ${m.spriteCount}`,
    `worklet tick ${self}`,
  ];

  let widest = 0;
  for (let i = 0; i < lines.length; i++) {
    const w = lines[i]!.length;
    if (w > widest) widest = w;
  }

  const blockH = lines.length * LINE_H + PAD;
  const usableH = Number.isFinite(surfaceH) && surfaceH > blockH + BOTTOM_GAP
    ? surfaceH
    : blockH + BOTTOM_GAP;
  const blockTop = usableH - BOTTOM_GAP - blockH;

  canvas.drawRect(
    {
      x: 6,
      y: blockTop,
      width: widest * CHAR_W + PAD * 2 + 6,
      height: blockH,
    },
    bg,
  );

  for (let i = 0; i < lines.length; i++) {
    canvas.drawText(
      lines[i]!,
      12,
      blockTop + PAD + LINE_H * i + 12,
      paint,
      font,
    );
  }
}
