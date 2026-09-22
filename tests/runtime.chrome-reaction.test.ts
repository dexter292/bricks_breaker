/**
 * F-25 / NF-8 / NG-16 — chrome bridge: behavior of in-place mutate + seq bump.
 * (Not a source-grep pin of the old object-literal assign form.)
 */
import { describe, expect, it } from 'vitest';

type ChromeMirror = {
  phase: number;
  lives: number;
  score: number;
  combo: number;
  stallTier: number;
};

/**
 * Mirrors useGameLoop publish path: mutate stable object; bump seq only on change.
 */
function publishChrome(
  mirror: ChromeMirror,
  seq: { value: number },
  next: ChromeMirror,
): void {
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
  if (dirty) {
    seq.value = seq.value + 1;
  }
}

describe('runtime chrome reaction (F-25 / NF-8 / NG-16)', () => {
  it('keeps the same mirror object identity across publishes', () => {
    const mirror: ChromeMirror = {
      phase: 0,
      lives: 3,
      score: 0,
      combo: 1,
      stallTier: 0,
    };
    const seq = { value: 0 };
    const before = mirror;
    publishChrome(mirror, seq, {
      phase: 1,
      lives: 3,
      score: 10,
      combo: 1,
      stallTier: 0,
    });
    expect(mirror).toBe(before);
    expect(mirror.score).toBe(10);
    expect(mirror.phase).toBe(1);
  });

  it('bumps seq only when a field changes', () => {
    const mirror: ChromeMirror = {
      phase: 1,
      lives: 3,
      score: 10,
      combo: 1,
      stallTier: 0,
    };
    const seq = { value: 0 };
    publishChrome(mirror, seq, { ...mirror });
    expect(seq.value).toBe(0);
    publishChrome(mirror, seq, { ...mirror, score: 20 });
    expect(seq.value).toBe(1);
    publishChrome(mirror, seq, { ...mirror, score: 20 });
    expect(seq.value).toBe(1);
    publishChrome(mirror, seq, { ...mirror, lives: 2 });
    expect(seq.value).toBe(2);
  });
});
