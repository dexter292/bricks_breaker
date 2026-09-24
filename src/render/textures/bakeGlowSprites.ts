/**
 * Cold-path neon halo bake — call from PlayingHost/level load before setActive(true).
 * Idle soft halo only (UI-SPEC ≤2 radius max). Concentric soft fills (baked sprites, never live blur).
 * Destroy flash uses a separate white circle in recordSprites — no unused strong bake.
 */
import { Skia, type SkImage } from '@shopify/react-native-skia';
import {
  BRICK_HP1,
  BRICK_HP2,
  BRICK_HP3,
  BRICK_UNBREAKABLE,
  BRICK_EXPLOSIVE,
} from '../colors';

/** Default reference brick cell (level-01); override via bakeGlowSprites(w,h) (F-14). */
const DEFAULT_BRICK_W = 44;
const DEFAULT_BRICK_H = 18;

/** soft = xs pad — UI-SPEC ≤2 radius variants (idle only). */
export const GLOW_PAD_SOFT = 4;

/** Edge falloff alpha at full intensity (UI-SPEC ≈ 0.35–0.55). */
const EDGE_ALPHA_SOFT = 0.4;

export type GlowVariant = {
  soft: SkImage;
  /** Atlas cell size (brick + pad*2) — blit with drawImageRect to live brick size. */
  atlasW: number;
  atlasH: number;
};

/** Color-string → soft idle halo images. */
export type GlowAtlas = Record<string, GlowVariant>;

/**
 * Paint a soft neon halo into an offscreen surface via concentric rect rings.
 * Approximates edge falloff for blit under brick fills (D-05 baked sprites).
 */
function bakeHalo(
  color: string,
  brickW: number,
  brickH: number,
  pad: number,
  edgeAlpha: number,
): { image: SkImage; atlasW: number; atlasH: number } {
  const width = brickW + pad * 2;
  const height = brickH + pad * 2;
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) {
    throw new Error('bakeGlowSprites: Skia.Surface.MakeOffscreen failed');
  }
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(0); // Fill
  paint.setColor(Skia.Color(color));

  // Outer → inner rings: alpha peaks near brick edge (~edgeAlpha), softens outward
  for (let i = pad; i >= 1; i--) {
    const t = 1 - (i - 1) / pad; // 1 at brick-adjacent, ~1/pad at outer
    paint.setAlphaf(edgeAlpha * t);
    canvas.drawRect(
      Skia.XYWHRect(pad - i, pad - i, brickW + i * 2, brickH + i * 2),
      paint,
    );
  }

  // Soft under-glow in brick footprint (fill drawn on top at runtime)
  paint.setAlphaf(edgeAlpha * 0.35);
  canvas.drawRect(Skia.XYWHRect(pad, pad, brickW, brickH), paint);

  const image = surface.makeImageSnapshot();
  surface.dispose();
  return { image, atlasW: width, atlasH: height };
}

function bakeVariant(
  color: string,
  brickW: number,
  brickH: number,
): GlowVariant {
  const baked = bakeHalo(color, brickW, brickH, GLOW_PAD_SOFT, EDGE_ALPHA_SOFT);
  return {
    soft: baked.image,
    atlasW: baked.atlasW,
    atlasH: baked.atlasH,
  };
}

/**
 * Build idle soft-halo SkImages per brick fill color (JS cold path).
 * Keys are color hex strings matching brickFill / BRICK_* tokens.
 * Pass the active level's brickW/brickH so atlas matches showpiece cells (F-14).
 */
export function bakeGlowSprites(
  brickW: number = DEFAULT_BRICK_W,
  brickH: number = DEFAULT_BRICK_H,
): GlowAtlas {
  const w = brickW > 0 ? Math.floor(brickW) : DEFAULT_BRICK_W;
  const h = brickH > 0 ? Math.floor(brickH) : DEFAULT_BRICK_H;
  return {
    [BRICK_HP3]: bakeVariant(BRICK_HP3, w, h),
    [BRICK_HP2]: bakeVariant(BRICK_HP2, w, h),
    [BRICK_HP1]: bakeVariant(BRICK_HP1, w, h),
    [BRICK_UNBREAKABLE]: bakeVariant(BRICK_UNBREAKABLE, w, h),
    [BRICK_EXPLOSIVE]: bakeVariant(BRICK_EXPLOSIVE, w, h),
  };
}
