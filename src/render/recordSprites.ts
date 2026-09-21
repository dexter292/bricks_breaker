import { Skia, type SkFont, type SkImage, type SkPicture } from '@shopify/react-native-skia';
import type { World } from '../core';
import type { VfxState } from '../vfx';
import { trailLength } from '../vfx/intensity';
import type { OverlayMetrics } from './overlayMetrics';
import { drawOverlay } from './recordOverlay';
import type { GlowAtlas } from './textures/bakeGlowSprites';

/** Logical play-field — literals inside worklets (no cross-module const capture). */
const LOGICAL_W = 360;
const LOGICAL_H = 640;

/** Ball ghost radius (core BALL_RADIUS) — worklet literal. */
const BALL_RADIUS_LOCAL = 6;

/** Trail rim cyan — UI-SPEC #67E8F9 (TRAIL_CYAN); worklet-local. */
const TRAIL_CYAN_LOCAL = '#67E8F9';

/** soft halo pad (xs) — matches bakeGlowSprites PAD_SOFT. */
const GLOW_PAD_SOFT = 4;

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

/** Optional destroy flash — life gated ≤100ms by producer (Plan 05). */
export type DestroyFlashState = {
  x: number;
  y: number;
  /** Remaining life in seconds. */
  life: number;
  /** Peak life for alpha ramp (default 0.1). */
  lifeMax?: number;
};

/**
 * Record letterboxed playfield entities into one SkPicture (D-01…D-03).
 * LC-08: read World SoA only — never mutate.
 *
 * Optional `vfx` / glow / flash are cosmetic (D-02 deletable). When `vfx` is
 * null, output matches pre-Phase-7 flat draw. Shake is canvas.translate inside
 * the letterbox save/restore only — never writes World ball/paddle coords.
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
  vfx: VfxState | null = null,
  vfxIntensity: number = 1,
  glowAtlas: GlowAtlas | null = null,
  flash: DestroyFlashState | null = null,
): SkPicture {
  'worklet';
  const tools = ensureRecorderTools();
  const wPx = Number.isFinite(surfaceW) && surfaceW > 1 ? surfaceW : 360;
  const hPx = Number.isFinite(surfaceH) && surfaceH > 1 ? surfaceH : 640;
  tools.surfaceBounds.setXYWH(0, 0, wPx, hPx);

  const canvas = tools.recorder.beginRecording(tools.surfaceBounds);

  // Letterbox bars — black over entire surface
  tools.paint.setAlphaf(1);
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

  // Cosmetic camera shake — letterboxed group only (D-19); amp already × intensity at punch
  if (vfx != null) {
    const amp = vfx.shakeAmp;
    // shakeOffset(amp, 0.85, 0.53) — fixed unit-ish direction (no World writes)
    canvas.translate(amp * 0.85, amp * 0.53);
  }

  // Navy field only inside logical 360×640
  tools.paint.setAlphaf(1);
  tools.paint.setColor(Skia.Color('#1a1a2e'));
  tools.fieldRect.setXYWH(0, 0, 360, 640);
  canvas.drawRect(tools.fieldRect, tools.paint);

  const intensity =
    Number.isFinite(vfxIntensity) && vfxIntensity > 0 ? vfxIntensity : 0;

  // --- Bricks: baked glow (under) → fill → damage cues ---
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
    const fill = brickFillLocal(hp, flags);

    // Idle neon halo blit from bake atlas (scale alpha by intensity)
    if (vfx != null && glowAtlas != null && intensity > 0) {
      const variant = glowAtlas[fill];
      if (variant != null) {
        const img: SkImage = variant.soft;
        tools.paint.setStyle(0);
        tools.paint.setAlphaf(intensity);
        canvas.drawImage(img, bx - GLOW_PAD_SOFT, by - GLOW_PAD_SOFT, tools.paint);
        tools.paint.setAlphaf(1);
      }
    }

    tools.paint.setStyle(0); // PaintStyle.Fill — literal avoids JS remote
    tools.paint.setAlphaf(1);
    tools.paint.setColor(Skia.Color(fill));
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
  tools.paint.setStyle(0); // restore Fill
  tools.paint.setAlphaf(1);

  // --- Particles + destroy flash (under pickups / paddle / ball) ---
  if (vfx != null) {
    const cap = vfx.particleCap;
    for (let pi = 0; pi < cap; pi++) {
      if (vfx.active[pi] === 0) {
        continue;
      }
      const pr = Math.round(vfx.r[pi] * 255);
      const pg = Math.round(vfx.g[pi] * 255);
      const pb = Math.round(vfx.b[pi] * 255);
      const pa = vfx.a[pi];
      tools.paint.setColor(Skia.Color(`rgb(${pr}, ${pg}, ${pb})`));
      tools.paint.setAlphaf(pa);
      canvas.drawCircle(vfx.px[pi], vfx.py[pi], 2, tools.paint);
    }
    tools.paint.setAlphaf(1);

    if (flash != null && flash.life > 0) {
      const lifeMax = flash.lifeMax != null && flash.lifeMax > 0 ? flash.lifeMax : 0.1;
      const t = flash.life / lifeMax;
      // Peak ≤0.45 @1.0 / ≤0.12 @0.2 (0.45 × intensity)
      const peak = 0.45 * intensity;
      const flashAlpha = peak * (t > 1 ? 1 : t < 0 ? 0 : t);
      if (flashAlpha > 0.001) {
        tools.paint.setColor(Skia.Color('#FFFFFF'));
        tools.paint.setAlphaf(flashAlpha);
        canvas.drawCircle(flash.x, flash.y, 18, tools.paint);
        tools.paint.setAlphaf(1);
      }
    }
  }

  // Active pickups — flat amber rects (no glow/shadow); sparse pool scan
  const pickupW = 20;
  const pickupH = 12;
  const pickupHalfW = pickupW * 0.5;
  const pickupHalfH = pickupH * 0.5;
  tools.paint.setColor(Skia.Color('#FBBF24'));
  const maxPickups = world.maxPickups;
  for (let pi = 0; pi < maxPickups; pi++) {
    if (world.pickupActive[pi] === 0) {
      continue;
    }
    tools.entityRect.setXYWH(
      world.pickupX[pi] - pickupHalfW,
      world.pickupY[pi] - pickupHalfH,
      pickupW,
      pickupH,
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

  // Trail ghosts (oldest → newest) under live ball — discrete circles, never a Path ribbon
  if (vfx != null) {
    const ringLen = trailLength(intensity);
    const trailMax = 5;
    const maxBallsTrail = world.maxBalls < vfx.maxBalls ? world.maxBalls : vfx.maxBalls;
    for (let bi = 0; bi < maxBallsTrail; bi++) {
      if (world.ballActive[bi] === 0) {
        continue;
      }
      const base = bi * trailMax;
      const head = vfx.trailHead[bi] % ringLen;
      const radius =
        world.ballRadius[bi] > 0 ? world.ballRadius[bi] : BALL_RADIUS_LOCAL;

      for (let k = 0; k < ringLen; k++) {
        const slot = (head + k) % ringLen;
        const gx = vfx.trailX[base + slot];
        const gy = vfx.trailY[base + slot];
        // Alpha ramp oldest→newest ≈ 0.15 → 0.55
        const tGhost = ringLen <= 1 ? 1 : k / (ringLen - 1);
        const ghostAlpha = 0.15 + 0.4 * tGhost;
        tools.paint.setStyle(0);
        tools.paint.setColor(Skia.Color('#FFFFFF'));
        tools.paint.setAlphaf(ghostAlpha);
        canvas.drawCircle(gx, gy, radius, tools.paint);

        // Cyan rim on newest ghost only when intensity ≥ 0.75
        if (k === ringLen - 1 && intensity >= 0.75) {
          tools.paint.setStyle(1); // Stroke
          tools.paint.setStrokeWidth(1.5);
          tools.paint.setColor(Skia.Color(TRAIL_CYAN_LOCAL));
          tools.paint.setAlphaf(0.85);
          canvas.drawCircle(gx, gy, radius, tools.paint);
          tools.paint.setStyle(0);
        }
      }
    }
    tools.paint.setAlphaf(1);
    tools.paint.setStyle(0);
  }

  // Active balls — full white opacity last (highest contrast token)
  tools.paint.setColor(Skia.Color('#FFFFFF'));
  tools.paint.setAlphaf(1);
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
