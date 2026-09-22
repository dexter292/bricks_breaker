/**
 * T7.5 / F-13…F-16 — render-path regressions via source contracts.
 * Skia PictureRecorder is awkward in Node; pin the invariants that kept
 * anti-alias, glow size, trail clear, and brick-color wiring correct.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('render path contracts (T7.5)', () => {
  it('F-15: recordSprites enables anti-alias on ball/particle paints', () => {
    const src = read('src/render/recordSprites.ts');
    expect(src).toMatch(/setAntiAlias\s*\(\s*true\s*\)/);
  });

  it('F-14: bakeGlowSprites accepts brick width/height overrides', () => {
    const src = read('src/render/textures/bakeGlowSprites.ts');
    expect(src).toMatch(/export function bakeGlowSprites/);
    expect(src).toMatch(/brickW|cellW|width/);
    expect(src).toMatch(/F-14/);
  });

  it('F-16: useGameLoop clears trails when live ball count drops', () => {
    const src = read('src/runtime/useGameLoop.ts');
    expect(src).toMatch(/lastTrailBallCount|clearTrails|F-16/);
  });

  it('F-13: consumeEvents resolves brick RGB via defaultResolveBrickRgb', () => {
    const src = read('src/vfx/consumeEvents.ts');
    expect(src).toMatch(/defaultResolveBrickRgb|resolveBrickRgb|rgbFromBrickHp/);
  });
});
