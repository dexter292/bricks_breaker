/**
 * T7.5 — render-path wiring contracts (source API calls, not ticket-comment greps).
 * Skia PictureRecorder is awkward in Node; pin the call-site invariants that kept
 * anti-alias, glow size overrides, trail clear, and brick-color wiring correct.
 * Behavior for trails / brick RGB is covered in tests/vfx.*.test.ts.
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
  it('recordSprites enables anti-alias on paints', () => {
    const src = read('src/render/recordSprites.ts');
    expect(src).toMatch(/setAntiAlias\s*\(\s*true\s*\)/);
  });

  it('bakeGlowSprites takes brickW/brickH overrides and sizes the atlas from them', () => {
    const src = read('src/render/textures/bakeGlowSprites.ts');
    expect(src).toMatch(
      /export function bakeGlowSprites\s*\(\s*brickW\s*:\s*number/,
    );
    expect(src).toMatch(/brickH\s*:\s*number/);
    expect(src).toMatch(/Math\.floor\(\s*brickW\s*\)/);
    expect(src).toMatch(/Math\.floor\(\s*brickH\s*\)/);
  });

  it('useGameLoop clears trails when live ball count drops', () => {
    const src = read('src/runtime/useGameLoop.ts');
    expect(src).toMatch(/lastTrailBallCount/);
    expect(src).toMatch(/clearTrailsFromIndex/);
    expect(src).toMatch(
      /ballCount\s*<\s*lastTrailBallCount\.value/,
    );
  });

  it('consumeEvents resolves brick RGB via defaultResolveBrickRgb', () => {
    const src = read('src/vfx/consumeEvents.ts');
    expect(src).toMatch(/defaultResolveBrickRgb/);
    expect(src).toMatch(
      /resolveBrickRgb\s*\?\?\s*defaultResolveBrickRgb/,
    );
  });
});
