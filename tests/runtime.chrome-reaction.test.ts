/**
 * F-25 / NF-8 / NG-16 — chrome bridge contracts (no pin of object-literal assign form).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('runtime chrome reaction (F-25 / NF-8)', () => {
  it('useGameLoop mutates chrome in place and bumps chromeSeq on change', () => {
    const src = read('src/runtime/useGameLoop.ts');
    expect(src).toContain('chromeOut: SharedValue<ChromeMirror>');
    expect(src).toContain('chromeSeq: SharedValue<number>');
    expect(src).toMatch(/chromeSeq\.value\s*=\s*chromeSeq\.value\s*\+\s*1/);
    expect(src).not.toContain('livesOut');
    expect(src).not.toContain('scoreOut');
  });

  it('PlayingHost reacts to chromeSeq (not a per-frame tuple)', () => {
    const src = read('app/_components/PlayingHost.tsx');
    expect(src).toContain('chromeOut: chromeSv');
    expect(src).toContain('chromeSeq');
    expect(src).toContain('runOnJS(applyChrome)');
    expect(src).toMatch(/\(\)\s*=>\s*chromeSeq\.value/);
    expect(src).not.toMatch(/runOnJS\(setScore\)/);
    expect(src).not.toMatch(/\[c\.phase,\s*c\.lives/);
  });
});
