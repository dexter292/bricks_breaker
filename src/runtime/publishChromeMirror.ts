/**
 * Pure chrome HUD publish (NF-8 / NG-15 / NK-3 / NL-1).
 * Mutates the stable mirror in place; returns whether chromeSeq should bump.
 * Five scalar args — zero allocation on the UI-thread hot path.
 */
export type ChromeMirror = {
  phase: number;
  lives: number;
  score: number;
  combo: number;
  stallTier: number;
};

/**
 * Copy world chrome fields into `mirror` when they differ.
 * @returns 1 if any field changed (caller bumps chromeSeq), else 0.
 */
export function publishChromeMirror(
  mirror: ChromeMirror,
  phase: number,
  lives: number,
  score: number,
  combo: number,
  stallTier: number,
): number {
  'worklet';
  let dirty = 0;
  if (mirror.phase !== phase) {
    mirror.phase = phase;
    dirty = 1;
  }
  if (mirror.lives !== lives) {
    mirror.lives = lives;
    dirty = 1;
  }
  if (mirror.score !== score) {
    mirror.score = score;
    dirty = 1;
  }
  if (mirror.combo !== combo) {
    mirror.combo = combo;
    dirty = 1;
  }
  if (mirror.stallTier !== stallTier) {
    mirror.stallTier = stallTier;
    dirty = 1;
  }
  return dirty;
}
