/**
 * Cold-path neon halo bake — call from PlayingHost/level load before setActive(true) (wire in Plan 05).
 * Idle soft halo only (UI-SPEC ≤2 radius max). Concentric soft fills (baked sprites, never live blur).
 * Destroy flash uses a separate white circle in recordSprites — no unused strong bake.
 */
import { Skia, type SkImage } from '@shopify/react-native-skia';
import {
  BRICK_HP1,
  BRICK_HP2,
  BRICK_HP3,
  BRICK_UNBREAKABLE,
} from '../colors';

/** Reference brick cell from level-01 (logical px). */
const BRICK_W = 44;
const BRICK_H = 18;

/** soft = xs pad — UI-SPEC ≤2 radius variants (idle only). */
const PAD_SOFT = 4;

/** Edge falloff alpha at full intensity (UI-SPEC ≈ 0.35–0.55). */
const EDGE_ALPHA_SOFT = 0.4;

export type GlowVariant = {
  soft: SkImage;
};

/** Color-string → soft idle halo images. */
export type GlowAtlas = Record<string, GlowVariant>;

/**
 * Paint a soft neon halo into an offscreen surface via concentric rect rings.
 * Approximates edge falloff for blit under brick fills (D-05 baked sprites).
 */
function bakeHalo(color: string, pad: number, edgeAlpha: number): SkImage {
  const width = BRICK_W + pad * 2;
  const height = BRICK_H + pad * 2;
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
      Skia.XYWHRect(pad - i, pad - i, BRICK_W + i * 2, BRICK_H + i * 2),
      paint,
    );
  }

  // Soft under-glow in brick footprint (fill drawn on top at runtime)
  paint.setAlphaf(edgeAlpha * 0.35);
  canvas.drawRect(Skia.XYWHRect(pad, pad, BRICK_W, BRICK_H), paint);

  return surface.makeImageSnapshot();
}

function bakeVariant(color: string): GlowVariant {
  return {
    soft: bakeHalo(color, PAD_SOFT, EDGE_ALPHA_SOFT),
  };
}

/**
 * Build idle soft-halo SkImages per brick fill color (JS cold path).
 * Keys are color hex strings matching brickFill / BRICK_* tokens.
 */
export function bakeGlowSprites(): GlowAtlas {
  return {
    [BRICK_HP3]: bakeVariant(BRICK_HP3),
    [BRICK_HP2]: bakeVariant(BRICK_HP2),
    [BRICK_HP1]: bakeVariant(BRICK_HP1),
    [BRICK_UNBREAKABLE]: bakeVariant(BRICK_UNBREAKABLE),
  };
}
