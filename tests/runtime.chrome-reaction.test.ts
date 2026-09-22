/**
 * F-25 / NF-8 / NG-16 / NK-3 — assert the real publishChromeMirror helper.
 */
import { describe, expect, it } from 'vitest';
import {
  publishChromeMirror,
  type ChromeMirror,
} from '../src/runtime/publishChromeMirror';

describe('runtime chrome reaction (F-25 / NF-8 / NK-3)', () => {
  it('keeps the same mirror object identity across publishes', () => {
    const mirror: ChromeMirror = {
      phase: 0,
      lives: 3,
      score: 0,
      combo: 1,
      stallTier: 0,
    };
    const before = mirror;
    const dirty = publishChromeMirror(mirror, {
      phase: 1,
      lives: 3,
      score: 10,
      combo: 1,
      stallTier: 0,
    });
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
    expect(publishChromeMirror(mirror, { ...mirror })).toBe(0);
    expect(publishChromeMirror(mirror, { ...mirror, score: 20 })).toBe(1);
    expect(publishChromeMirror(mirror, { ...mirror, score: 20 })).toBe(0);
    expect(publishChromeMirror(mirror, { ...mirror, lives: 2 })).toBe(1);
  });

  it('useGameLoop wires publishChromeMirror (not a local copy)', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const src = readFileSync(join(root, 'src/runtime/useGameLoop.ts'), 'utf8');
    expect(src).toContain("from './publishChromeMirror'");
    expect(src).toContain('publishChromeMirror(c,');
  });
});
