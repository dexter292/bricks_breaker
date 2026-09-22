/**
 * F-25 / NF-8 / NG-16 / NK-3 / NL-1 — assert production publishChromeMirror.
 */
import { describe, expect, it } from 'vitest';
import {
  publishChromeMirror,
  type ChromeMirror,
} from '../src/runtime/publishChromeMirror';

describe('runtime chrome reaction (F-25 / NF-8 / NK-3 / NL-1)', () => {
  it('keeps the same mirror object identity across publishes', () => {
    const mirror: ChromeMirror = {
      phase: 0,
      lives: 3,
      score: 0,
      combo: 1,
      stallTier: 0,
    };
    const before = mirror;
    const dirty = publishChromeMirror(mirror, 1, 3, 10, 1, 0);
    expect(mirror).toBe(before);
    expect(dirty).toBe(1);
    expect(mirror.score).toBe(10);
    expect(mirror.phase).toBe(1);
  });

  it('returns 0 when nothing changes; 1 when a field changes', () => {
    const mirror: ChromeMirror = {
      phase: 1,
      lives: 3,
      score: 10,
      combo: 1,
      stallTier: 0,
    };
    expect(
      publishChromeMirror(
        mirror,
        mirror.phase,
        mirror.lives,
        mirror.score,
        mirror.combo,
        mirror.stallTier,
      ),
    ).toBe(0);
    expect(
      publishChromeMirror(
        mirror,
        mirror.phase,
        mirror.lives,
        20,
        mirror.combo,
        mirror.stallTier,
      ),
    ).toBe(1);
    expect(
      publishChromeMirror(
        mirror,
        mirror.phase,
        mirror.lives,
        20,
        mirror.combo,
        mirror.stallTier,
      ),
    ).toBe(0);
    expect(
      publishChromeMirror(
        mirror,
        mirror.phase,
        2,
        mirror.score,
        mirror.combo,
        mirror.stallTier,
      ),
    ).toBe(1);
  });
});
