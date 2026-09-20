import { Skia, type SkFont, type SkPicture } from '@shopify/react-native-skia';
import type { World } from '../core';
import type { OverlayMetrics } from './overlayMetrics';
import { drawOverlay } from './recordOverlay';

/** Logical play-field — literals inside worklets (no cross-module const capture). */
const LOGICAL_W = 360;
const LOGICAL_H = 640;

type RecorderTools = {
  recorder: ReturnType<typeof Skia.PictureRecorder>;
  paint: ReturnType<typeof Skia.Paint>;
  fieldRect: ReturnType<typeof Skia.XYWHRect>;
  entityRect: ReturnType<typeof Skia.XYWHRect>;
  surfaceBounds: ReturnType<typeof Skia.XYWHRect>;
};

declare const global: typeof globalThis & {
  __gameRecorderTools?: RecorderTools;
};

function ensureRecorderTools(): RecorderTools {
  'worklet';
  let tools = global.__gameRecorderTools;
  if (!tools || tools.entityRect == null || tools.surfaceBounds == null) {
    tools = {
      recorder: Skia.PictureRecorder(),
      paint: Skia.Paint(),
      fieldRect: Skia.XYWHRect(0, 0, 360, 640),
      entityRect: Skia.XYWHRect(0, 0, 1, 1),
      surfaceBounds: Skia.XYWHRect(0, 0, 360, 640),
    };
    global.__gameRecorderTools = tools;
  }
  return tools;
}

/** Flat brick fill — inlined so UI worklet never calls a JS remote (UI-SPEC). */
function brickFillLocal(hp: number, flags: number): string {
  'worklet';
  if ((flags & 1) !== 0) {
    return '#6B7280';
  }
  if (hp >= 3) {
    return '#C44569';
  }
  if (hp === 2) {
    return '#E07A5F';
  }
  return '#F2CC8F';
}

type LocalCueStroke = { x0: number; y0: number; x1: number; y1: number };

/**
 * Worklet-local stroke geometry — keep in sync with src/core/levels/damageCues.ts.
 * Duplicated so UI worklet never calls a JS remote (same reason as brickFillLocal).
 */
function planBrickDamageCuesLocal(
  x: number,
  y: number,
  w: number,
  h: number,
  hp: number,
  flags: number,
): LocalCueStroke[] {
  'worklet';
  if ((flags & 1) !== 0) {
    return [
      { x0: x, y0: y, x1: x + w, y1: y + h },
      { x0: x + w * 0.5, y0: y, x1: x + w, y1: y + h * 0.5 },
      { x0: x, y0: y + h * 0.5, x1: x + w * 0.5, y1: y + h },
    ];
  }
  if (hp <= 0 || hp >= 3) {
    return [];
  }
  if (hp === 2) {
    return [
      {
        x0: x + w * 0.1,
        y0: y + h * 0.5,
        x1: x + w * 0.9,
        y1: y + h * 0.35,
      },
    ];
  }
  return [
    {
      x0: x + w * 0.1,
      y0: y + h * 0.35,
      x1: x + w * 0.9,
      y1: y + h * 0.55,
    },
    {
      x0: x + w * 0.15,
      y0: y + h * 0.65,
      x1: x + w * 0.85,
      y1: y + h * 0.45,
    },
  ];
}

/**
 * Record letterboxed playfield entities into one SkPicture (D-01…D-03).
 * LC-08: read World SoA only — never mutate.
 *
 * Camera/color helpers are local: imported worklets can stay JS remotes and
 * abort the frame (black canvas + chrome still visible).
 */
export function recordFrame(
  world: World,
  metrics: OverlayMetrics,
  surfaceW: number,
  surfaceH: number,
  drawOverlayFlag: boolean,
  hudFont: SkFont | null,
): SkPicture {
  'worklet';
  const tools = ensureRecorderTools();
  const wPx = Number.isFinite(surfaceW) && surfaceW > 1 ? surfaceW : 360;
  const hPx = Number.isFinite(surfaceH) && surfaceH > 1 ? surfaceH : 640;
  tools.surfaceBounds.setXYWH(0, 0, wPx, hPx);

  const canvas = tools.recorder.beginRecording(tools.surfaceBounds);

  // Letterbox bars — black over entire surface
  tools.paint.setColor(Skia.Color('#000000'));
  tools.entityRect.setXYWH(0, 0, wPx, hPx);
  canvas.drawRect(tools.entityRect, tools.paint);

  // Uniform letterbox (inline makeCamera)
  const scale = Math.min(wPx / 360, hPx / 640);
  const ox = (wPx - 360 * scale) * 0.5;
  const oy = (hPx - 640 * scale) * 0.5;
  canvas.save();
  canvas.translate(ox, oy);
  canvas.scale(scale, scale);

  // Navy field only inside logical 360×640
  tools.paint.setColor(Skia.Color('#1a1a2e'));
  tools.fieldRect.setXYWH(0, 0, 360, 640);
  canvas.drawRect(tools.fieldRect, tools.paint);

  // Bricks (hp > 0 — unbreakables keep hp)
  const brickCount = world.brickCount;
  for (let i = 0; i < brickCount; i++) {
    const hp = world.brickHp[i];
    if (hp <= 0) {
      continue;
    }
    const flags = world.brickFlags[i];
    const bx = world.brickX[i];
    const by = world.brickY[i];
    const bw = world.brickW[i];
    const bh = world.brickH[i];
    tools.paint.setStyle(0); // PaintStyle.Fill — literal avoids JS remote
    tools.paint.setColor(Skia.Color(brickFillLocal(hp, flags)));
    tools.entityRect.setXYWH(bx, by, bw, bh);
    canvas.drawRect(tools.entityRect, tools.paint);

    // Crack / hatch cues after fill (D-05…D-08) — flags-first, ≤3 strokes
    const cues = planBrickDamageCuesLocal(bx, by, bw, bh, hp, flags);
    const cueLen = cues.length;
    if (cueLen > 0) {
      tools.paint.setStyle(1); // PaintStyle.Stroke
      tools.paint.setStrokeWidth(1.25);
      tools.paint.setColor(Skia.Color('#E5E7EB'));
      for (let ci = 0; ci < cueLen; ci++) {
        const s = cues[ci];
        canvas.drawLine(s.x0, s.y0, s.x1, s.y1, tools.paint);
      }
    }
  }
  tools.paint.setStyle(0); // restore Fill for paddle / balls

  // Paddle — X center-based, Y top of AABB
  tools.paint.setColor(Skia.Color('#FFFFFF'));
  const paddleHalfW = world.paddleW * 0.5;
  tools.entityRect.setXYWH(
    world.paddleX - paddleHalfW,
    world.paddleY,
    world.paddleW,
    world.paddleH,
  );
  canvas.drawRect(tools.entityRect, tools.paint);

  // Active balls
  tools.paint.setColor(Skia.Color('#FFFFFF'));
  const maxBalls = world.maxBalls;
  for (let bi = 0; bi < maxBalls; bi++) {
    if (world.ballActive[bi] === 0) {
      continue;
    }
    canvas.drawCircle(
      world.ballX[bi],
      world.ballY[bi],
      world.ballRadius[bi],
      tools.paint,
    );
  }

  canvas.restore();

  if (drawOverlayFlag && hudFont) {
    drawOverlay(canvas, metrics, hudFont);
  }

  return tools.recorder.finishRecordingAsPicture();
}

// Re-export logical size for GameHost / camera consumers that still import from camera.ts
export { LOGICAL_W, LOGICAL_H };
