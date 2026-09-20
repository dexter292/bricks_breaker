import { BrickFlags } from '../types';

/** Local stroke segment in world/logical coordinates (AABB-relative). */
export type BrickCueStroke = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

/**
 * Pure stroke-plan helper for crack/hatch cues (D-05…D-06, LVL-02/LVL-03).
 * Canvas-free / Node-testable. Flags checked first so steel never gets crack plans.
 *
 * Keep geometry in sync with `planBrickDamageCuesLocal` in recordSprites.ts.
 */
export function planBrickDamageCues(args: {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  flags: number;
}): BrickCueStroke[] {
  const { x, y, w, h, hp, flags } = args;

  if ((flags & BrickFlags.UNBREAKABLE) !== 0) {
    // Fixed 3-segment hatch — distinct from breakable crack geometry
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
    // Single chip
    return [
      {
        x0: x + w * 0.1,
        y0: y + h * 0.5,
        x1: x + w * 0.9,
        y1: y + h * 0.35,
      },
    ];
  }

  // hp === 1 — two cracks
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
