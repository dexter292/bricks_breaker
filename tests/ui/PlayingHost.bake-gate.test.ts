/**
 * R-24 / R-26 source contracts for PlayingHost bake ↔ gate ordering.
 *
 * This is a cheap regression net for the known pauseTimer footgun — not a full
 * invariant test. Ideal follow-up: mock useGameLoop + fake timers and assert
 * setActive(true) is the last call after fxReady flips.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOST = join(process.cwd(), 'app/_components/PlayingHost.tsx');

/** Strip // line comments so doc notes cannot false-positive. */
function codeOnly(src: string): string {
  return src.replace(/\/\/.*$/gm, '');
}

describe('PlayingHost R-24 / R-26 bake gate (source contract)', () => {
  const code = codeOnly(readFileSync(HOST, 'utf8'));

  it('bake effect has no deferred setActive(false) via setTimeout (R-24)', () => {
    expect(code).not.toMatch(/\bpauseTimer\b/);
    // Catches nested-if / renamed-ref variants that still use setTimeout.
    // Does not catch queueMicrotask / rAF / InteractionManager deferrals.
    expect(code).not.toMatch(
      /setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]*?setActiveRef\.current\(false\)/,
    );
  });

  it('gate effect still arms with retry then setActive(true) when fxReady', () => {
    expect(code).toMatch(/compiledSv\.value\s*=\s*loadResult\.compiled/);
    // Whitespace-tolerant — Prettier may keep or collapse the newline.
    expect(code).toMatch(/retry\(\);\s*setActive\(true\)/);
  });

  it('toggleDevLevel does not arm the loop itself (R-26)', () => {
    const m = code.match(
      /const toggleDevLevel = useCallback\(\(\) => \{([\s\S]*?)\}, \[/,
    );
    expect(m?.[1]).toBeTruthy();
    expect(m![1]).not.toMatch(/setActive\s*\(\s*true\s*\)/);
    expect(m![1]).toMatch(/setLevelId|changeLevelId|onLevelIdChange/);
  });

  it('goNext / Next callback does not arm the loop (D-03 / R-24)', () => {
    const m = code.match(
      /const goNext = useCallback\(\(\) => \{([\s\S]*?)\}, \[/,
    );
    expect(m?.[1]).toBeTruthy();
    expect(m![1]).not.toMatch(/setActive\s*\(\s*true\s*\)/);
    expect(m![1]).toMatch(/runEndedRef\.current = false/);
  });
});
