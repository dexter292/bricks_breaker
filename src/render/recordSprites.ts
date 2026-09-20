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
    tools.paint.setColor(Skia.Color(brickFillLocal(hp, world.brickFlags[i])));
    tools.entityRect.setXYWH(
      world.brickX[i],
      world.brickY[i],
      world.brickW[i],
      world.brickH[i],
    );
    canvas.drawRect(tools.entityRect, tools.paint);
  }

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
