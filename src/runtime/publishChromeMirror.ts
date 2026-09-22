/**
 * Pure chrome HUD publish (NF-8 / NG-15 / NK-3).
 * Mutates the stable mirror in place; returns whether chromeSeq should bump.
 * Extracted from useGameLoop so tests assert the real path — not a local copy.
 */
export type ChromeMirror = {
  phase: number;
  lives: number;
  score: number;
  combo: number;
  stallTier: number;
};

export type ChromeSnapshot = {
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
  next: ChromeSnapshot,
): number {
  'worklet';
  let dirty = 0;
  if (mirror.phase !== next.phase) {
    mirror.phase = next.phase;
    dirty = 1;
  }
  if (mirror.lives !== next.lives) {
    mirror.lives = next.lives;
    dirty = 1;
  }
  if (mirror.score !== next.score) {
    mirror.score = next.score;
    dirty = 1;
  }
  if (mirror.combo !== next.combo) {
    mirror.combo = next.combo;
    dirty = 1;
  }
  if (mirror.stallTier !== next.stallTier) {
    mirror.stallTier = next.stallTier;
    dirty = 1;
  }
  return dirty;
}
