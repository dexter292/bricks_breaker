/**
 * F-25 — PlayingHost batches HUD chrome through one useAnimatedReaction bridge.
 * NG-16: do NOT pin `chromeOut.value = {` object-literal form — that blocked
 * the stable-mirror + chromeSeq fix for NF-8/NG-15.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('runtime chrome reaction (F-25)', () => {
  it('useGameLoop publishes a single chromeOut mirror (not five scalar outs)', () => {
    const src = read('src/runtime/useGameLoop.ts');
    expect(src).toContain('chromeOut: SharedValue<ChromeMirror>');
    expect(src).toMatch(/chromeOut\.value\s*=/);
    expect(src).not.toContain('livesOut');
    expect(src).not.toContain('scoreOut');
    expect(src).not.toContain('simPhaseOut');
    expect(src).not.toContain('comboOut');
    expect(src).not.toContain('stallTierOut');
  });

  it('PlayingHost uses one batched chrome reaction, not four HUD bridges', () => {
    const src = read('app/_components/PlayingHost.tsx');
    expect(src).toContain('chromeOut: chromeSv');
    expect(src).toContain('runOnJS(applyChrome)');
    expect(src).not.toMatch(/runOnJS\(setScore\)/);
    expect(src).not.toMatch(/runOnJS\(setCombo\)/);
    expect(src).not.toMatch(/runOnJS\(setStallTier\)/);
    expect(src).not.toMatch(/runOnJS\(applyWorldChrome\)/);

    const reactionBlocks = src.match(/useAnimatedReaction\(/g) ?? [];
    expect(reactionBlocks.length).toBe(2);
  });
});
