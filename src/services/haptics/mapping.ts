/**
 * Map simulation EventCode integers → haptic rank.
 * Numeric literals only (services must not import core/) — mirrors EventCode:
 * BRICK_BREAK=4 → rank 1 (Light); LIFE_LOST=7 → rank 2 (Medium); else 0.
 */
export function hapticRankForCode(code: number): 0 | 1 | 2 {
  if (code === 7) return 2;
  if (code === 4) return 1;
  return 0;
}

/**
 * Strongest-wins coalesce over a drain batch (D-11/D-12).
 * Any life lost → 2; else any break → 1; else 0.
 */
export function coalesceHapticRank(
  codes: ArrayLike<number>,
  count: number,
): 0 | 1 | 2 {
  let best: 0 | 1 | 2 = 0;
  const n = Math.max(0, Math.min(count, codes.length));
  for (let i = 0; i < n; i++) {
    const rank = hapticRankForCode(codes[i]);
    if (rank > best) {
      best = rank;
      if (best === 2) return 2;
    }
  }
  return best;
}
