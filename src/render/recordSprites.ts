import { Skia, type SkFont, type SkPicture } from '@shopify/react-native-skia';
import type { World } from '../core';
import { LOGICAL_H, LOGICAL_W, makeCamera } from './camera';
import {
  BALL_PADDLE,
  FIELD_NAVY,
  LETTERBOX_BLACK,
  brickFill,
} from './colors';
import type { OverlayMetrics } from './overlayMetrics';
import { drawOverlay } from './recordOverlay';

type RecorderTools = {
  recorder: ReturnType<typeof Skia.PictureRecorder>;
  paint: ReturnType<typeof Skia.Paint>;
  fieldRect: ReturnType<typeof Skia.XYWHRect>;
  entityRect: ReturnType<typeof Skia.XYWHRect>;
  surfaceBounds: ReturnType<typeof Skia.XYWHRect>;
};

declare const global: typeof globalThis & {
  __gameRecorderTools?: RecorderTools;
  __spikeRecorderTools?: RecorderTools;
};

function ensureRecorderTools(): RecorderTools {
  'worklet';
  // Prefer new key; fall back once to spike key for hot-reload continuity.
  let tools = global.__gameRecorderTools ?? global.__spikeRecorderTools;
  if (!tools) {
    tools = {
      recorder: Skia.PictureRecorder(),
      paint: Skia.Paint(),
      fieldRect: Skia.XYWHRect(0, 0, LOGICAL_W, LOGICAL_H),
      entityRect: Skia.XYWHRect(0, 0, 1, 1),
      surfaceBounds: Skia.XYWHRect(0, 0, LOGICAL_W, LOGICAL_H),
    };
  }
  global.__gameRecorderTools = tools;
  return tools;
}

/**
 * Record letterboxed playfield entities into one SkPicture (D-01…D-03).
 * LC-08: read World SoA only — never mutate.
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
  const wPx = Number.isFinite(surfaceW) && surfaceW > 1 ? surfaceW : LOGICAL_W;
  const hPx = Number.isFinite(surfaceH) && surfaceH > 1 ? surfaceH : LOGICAL_H;
  tools.surfaceBounds.setXYWH(0, 0, wPx, hPx);

  const canvas = tools.recorder.beginRecording(tools.surfaceBounds);

  // Letterbox bars — black over entire surface
  tools.paint.setColor(Skia.Color(LETTERBOX_BLACK));
  tools.entityRect.setXYWH(0, 0, wPx, hPx);
  canvas.drawRect(tools.entityRect, tools.paint);

  const cam = makeCamera(wPx, hPx);
  canvas.save();
  canvas.translate(cam.ox, cam.oy);
  canvas.scale(cam.scale, cam.scale);

  // Navy field only inside logical 360×640
  tools.paint.setColor(Skia.Color(FIELD_NAVY));
  tools.fieldRect.setXYWH(0, 0, LOGICAL_W, LOGICAL_H);
  canvas.drawRect(tools.fieldRect, tools.paint);

  // Bricks (hp > 0 — unbreakables keep hp)
  const brickCount = world.brickCount;
  for (let i = 0; i < brickCount; i++) {
    const hp = world.brickHp[i];
    if (hp <= 0) {
      continue;
    }
    tools.paint.setColor(Skia.Color(brickFill(hp, world.brickFlags[i])));
    tools.entityRect.setXYWH(
      world.brickX[i],
      world.brickY[i],
      world.brickW[i],
      world.brickH[i],
    );
    canvas.drawRect(tools.entityRect, tools.paint);
  }

  // Paddle — X center-based, Y top of AABB
  tools.paint.setColor(Skia.Color(BALL_PADDLE));
  const paddleHalfW = world.paddleW * 0.5;
  tools.entityRect.setXYWH(
    world.paddleX - paddleHalfW,
    world.paddleY,
    world.paddleW,
    world.paddleH,
  );
  canvas.drawRect(tools.entityRect, tools.paint);

  // Active balls
  tools.paint.setColor(Skia.Color(BALL_PADDLE));
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
