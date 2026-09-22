import { Skia, type SkFont, type SkImage, type SkPicture } from '@shopify/react-native-skia';
import type { World } from '../core';
import type { VfxState } from '../vfx';
import { TRAIL_MAX } from '../vfx/types';
import { trailLength } from '../vfx/intensity';
import type { OverlayMetrics } from './overlayMetrics';
import { drawOverlay } from './recordOverlay';
import type { GlowAtlas } from './textures/bakeGlowSprites';
import { GLOW_PAD_SOFT } from './textures/bakeGlowSprites';

/** Logical play-field — literals inside worklets (no cross-module const capture). */
const LOGICAL_W = 360;
const LOGICAL_H = 640;

/** Ball ghost radius (core BALL_RADIUS) — worklet literal. */
const BALL_RADIUS_LOCAL = 6;

type RecorderTools = {
  recorder: ReturnType<typeof Skia.PictureRecorder>;
  paint: ReturnType<typeof Skia.Paint>;
  fieldRect: ReturnType<typeof Skia.XYWHRect>;
  entityRect: ReturnType<typeof Skia.XYWHRect>;
  srcRect: ReturnType<typeof Skia.XYWHRect>;
  surfaceBounds: ReturnType<typeof Skia.XYWHRect>;
  /** Cached SkColors — Float32Array(4) reused every frame (F-17). */
  colBlack: Float32Array;
  colNavy: Float32Array;
  colWhite: Float32Array;
  colCue: Float32Array;
  colPickup: Float32Array;
  colTrailCyan: Float32Array;
  colHp3: Float32Array;
  colHp2: Float32Array;
  colHp1: Float32Array;
  colSteel: Float32Array;
  /** Mutated per-particle then passed to setColor (F-17). */
  colorScratch: Float32Array;
  /** Cue strokes: [x0,y0,x1,y1] × up to 3 (F-17). */
  cueScratch: Float32Array;
};

declare const global: typeof globalThis & {
  __gameRecorderTools?: RecorderTools;
  __gameIntent?: { paddleX: number; launch: number };
};

function makeColor4(r: number, g: number, b: number, a: number = 1): Float32Array {
  'worklet';
  const c = new Float32Array(4);
  c[0] = r;
  c[1] = g;
  c[2] = b;
  c[3] = a;
  return c;
}

function ensureRecorderTools(): RecorderTools {
  'worklet';
  let tools = global.__gameRecorderTools;
  if (
    !tools ||
    tools.entityRect == null ||
    tools.surfaceBounds == null ||
    tools.colorScratch == null ||
    tools.srcRect == null
  ) {
    const paint = Skia.Paint();
    paint.setAntiAlias(true); // F-15 — ball / particle / trail / cue strokes
    tools = {
      recorder: Skia.PictureRecorder(),
      paint,
      fieldRect: Skia.XYWHRect(0, 0, LOGICAL_W, LOGICAL_H),
      entityRect: Skia.XYWHRect(0, 0, 1, 1),
      srcRect: Skia.XYWHRect(0, 0, 1, 1),
      surfaceBounds: Skia.XYWHRect(0, 0, LOGICAL_W, LOGICAL_H),
      // Pre-converted palette (0–1 channels) — no Skia.Color(string) per frame
      colBlack: makeColor4(0, 0, 0),
      colNavy: makeColor4(0.102, 0.102, 0.18), // #1a1a2e
      colWhite: makeColor4(1, 1, 1),
      colCue: makeColor4(0.898, 0.906, 0.922), // #E5E7EB
      colPickup: makeColor4(0.984, 0.749, 0.141), // #FBBF24
      colTrailCyan: makeColor4(0.404, 0.91, 0.976), // #67E8F9
      colHp3: makeColor4(0.769, 0.271, 0.412), // #C44569
      colHp2: makeColor4(0.878, 0.478, 0.373), // #E07A5F
      colHp1: makeColor4(0.949, 0.8, 0.561), // #F2CC8F
      colSteel: makeColor4(0.42, 0.447, 0.502), // #6B7280
      colorScratch: new Float32Array(4),
      cueScratch: new Float32Array(12),
    };
    global.__gameRecorderTools = tools;
  }
  // Re-assert AA if tools were created before F-15 (hot reload / long session).
  tools.paint.setAntiAlias(true);
  return tools;
}

/** Flat brick fill key for glow atlas — hex string matches bake keys. */
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

function brickColorLocal(
  tools: RecorderTools,
  hp: number,
  flags: number,
): Float32Array {
  'worklet';
  if ((flags & 1) !== 0) {
    return tools.colSteel;
  }
  if (hp >= 3) {
    return tools.colHp3;
  }
  if (hp === 2) {
    return tools.colHp2;
  }
  return tools.colHp1;
}

/**
 * Write cue strokes into scratch [x0,y0,x1,y1]*n; return stroke count (F-17).
 * Keep in sync with src/core/levels/damageCues.ts.
 */
function planBrickDamageCuesInto(
  scratch: Float32Array,
  x: number,
  y: number,
  w: number,
  h: number,
  hp: number,
  flags: number,
): number {
  'worklet';
  if ((flags & 1) !== 0) {
    scratch[0] = x;
    scratch[1] = y;
    scratch[2] = x + w;
    scratch[3] = y + h;
    scratch[4] = x + w * 0.5;
    scratch[5] = y;
    scratch[6] = x + w;
    scratch[7] = y + h * 0.5;
    scratch[8] = x;
    scratch[9] = y + h * 0.5;
    scratch[10] = x + w * 0.5;
    scratch[11] = y + h;
    return 3;
  }
  if (hp <= 0 || hp >= 3) {
    return 0;
  }
  if (hp === 2) {
    scratch[0] = x + w * 0.1;
    scratch[1] = y + h * 0.5;
    scratch[2] = x + w * 0.9;
    scratch[3] = y + h * 0.35;
    return 1;
  }
  scratch[0] = x + w * 0.1;
  scratch[1] = y + h * 0.35;
  scratch[2] = x + w * 0.9;
  scratch[3] = y + h * 0.55;
  scratch[4] = x + w * 0.15;
  scratch[5] = y + h * 0.65;
  scratch[6] = x + w * 0.85;
  scratch[7] = y + h * 0.45;
  return 2;
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
  const wPx = Number.isFinite(surfaceW) && surfaceW > 1 ? surfaceW : LOGICAL_W;
  const hPx = Number.isFinite(surfaceH) && surfaceH > 1 ? surfaceH : LOGICAL_H;
  tools.surfaceBounds.setXYWH(0, 0, wPx, hPx);

  const canvas = tools.recorder.beginRecording(tools.surfaceBounds);

  // Letterbox bars — black over entire surface
  tools.paint.setAlphaf(1);
  tools.paint.setColor(tools.colBlack);
  tools.entityRect.setXYWH(0, 0, wPx, hPx);
  canvas.drawRect(tools.entityRect, tools.paint);

  // Uniform letterbox (inline makeCamera)
  const scale = Math.min(wPx / LOGICAL_W, hPx / LOGICAL_H);
  const ox = (wPx - LOGICAL_W * scale) * 0.5;
  const oy = (hPx - LOGICAL_H * scale) * 0.5;
  canvas.save();
  canvas.translate(ox, oy);
  canvas.scale(scale, scale);

  // Cosmetic camera shake — letterboxed group only (D-19); amp already × intensity at punch
  if (vfx != null) {
    const amp = vfx.shakeAmp;
    if (amp > 0) {
      // F-31: oscillating unit direction from shakePhase (not a fixed lurch)
      const phase = vfx.shakePhase;
      const nx = Math.sin(phase);
      const ny = Math.cos(phase * 1.3);
      canvas.translate(amp * nx, amp * ny);
    }
  }

  // Navy field only inside logical LOGICAL_W×LOGICAL_H
  tools.paint.setAlphaf(1);
  tools.paint.setColor(tools.colNavy);
  tools.fieldRect.setXYWH(0, 0, LOGICAL_W, LOGICAL_H);
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
    const fillKey = brickFillLocal(hp, flags);

    // Idle neon halo blit from bake atlas (scale alpha by intensity × glowScale)
    if (
      vfx != null &&
      glowAtlas != null &&
      intensity > 0 &&
      vfx.glowScale > 0
    ) {
      const variant = glowAtlas[fillKey];
      if (variant != null) {
        const img: SkImage = variant.soft;
        const destW = bw + GLOW_PAD_SOFT * 2;
        const destH = bh + GLOW_PAD_SOFT * 2;
        tools.paint.setStyle(0);
        tools.paint.setAlphaf(intensity * vfx.glowScale);
        // F-14: scale atlas cell to live brick size (level-03 32×14 vs bake size)
        tools.srcRect.setXYWH(0, 0, variant.atlasW, variant.atlasH);
        tools.entityRect.setXYWH(bx - GLOW_PAD_SOFT, by - GLOW_PAD_SOFT, destW, destH);
        canvas.drawImageRect(
          img,
          tools.srcRect,
          tools.entityRect,
          tools.paint,
        );
        tools.paint.setAlphaf(1);
      }
    }

    tools.paint.setStyle(0); // PaintStyle.Fill — literal avoids JS remote
    tools.paint.setAlphaf(1);
    tools.paint.setColor(brickColorLocal(tools, hp, flags));
    tools.entityRect.setXYWH(bx, by, bw, bh);
    canvas.drawRect(tools.entityRect, tools.paint);

    // Crack / hatch cues after fill (D-05…D-08) — flags-first, ≤3 strokes
    const cueLen = planBrickDamageCuesInto(
      tools.cueScratch,
      bx,
      by,
      bw,
      bh,
      hp,
      flags,
    );
    if (cueLen > 0) {
      tools.paint.setStyle(1); // PaintStyle.Stroke
      tools.paint.setStrokeWidth(1.25);
      tools.paint.setColor(tools.colCue);
      const cue = tools.cueScratch;
      for (let ci = 0; ci < cueLen; ci++) {
        const o = ci * 4;
        canvas.drawLine(cue[o], cue[o + 1], cue[o + 2], cue[o + 3], tools.paint);
      }
    }
  }
  tools.paint.setStyle(0); // restore Fill
  tools.paint.setAlphaf(1);

  // --- Particles + destroy flash (under pickups / paddle / ball) ---
  if (vfx != null) {
    const cap = vfx.particleCap;
    const scratch = tools.colorScratch;
    for (let pi = 0; pi < cap; pi++) {
      if (vfx.active[pi] === 0) {
        continue;
      }
      // F-17: write 0–1 channels directly — no rgb() string / CSS parse
      scratch[0] = vfx.r[pi];
      scratch[1] = vfx.g[pi];
      scratch[2] = vfx.b[pi];
      scratch[3] = 1;
      tools.paint.setColor(scratch);
      tools.paint.setAlphaf(vfx.a[pi]);
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
        tools.paint.setColor(tools.colWhite);
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
  tools.paint.setColor(tools.colPickup);
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
  tools.paint.setColor(tools.colWhite);
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
    const ringLen = Math.min(trailLength(intensity), vfx.trailMax);
    const maxBallsTrail = world.maxBalls < vfx.maxBalls ? world.maxBalls : vfx.maxBalls;
    for (let bi = 0; bi < maxBallsTrail; bi++) {
      if (world.ballActive[bi] === 0) {
        continue;
      }
      const base = bi * TRAIL_MAX;
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
        tools.paint.setColor(tools.colWhite);
        tools.paint.setAlphaf(ghostAlpha);
        canvas.drawCircle(gx, gy, radius, tools.paint);

        // Cyan rim on newest ghost only when intensity ≥ 0.75
        if (k === ringLen - 1 && intensity >= 0.75) {
          tools.paint.setStyle(1); // Stroke
          tools.paint.setStrokeWidth(1.5);
          tools.paint.setColor(tools.colTrailCyan);
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
  tools.paint.setColor(tools.colWhite);
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

// Re-export logical size for hosts / letterbox consumers.
export { LOGICAL_W, LOGICAL_H };
