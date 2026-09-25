/**
 * Plan 11-05 Task 3 — the `__DEV__` endless entry and the SC-1 / SC-5 / D-14
 * contracts that keep it honest.
 *
 * Source contracts, mirroring `PlayingHost.bake-gate.test.ts`'s layout. Three of
 * the six cases below are NEGATIVE — "this call does not appear here" — and a
 * negative is only trustworthy if a comment cannot satisfy it, which is what
 * `codeOnly` buys. The two region extractions matter for the same reason: the
 * file legitimately contains `setActive`, `setLevelId` and `handleRunEnded`
 * elsewhere, so a whole-file assertion would be either vacuous or wrong.
 *
 * Case 5 duplicates `PlayingHost.next-bake.test.ts`'s D-14 contract on purpose:
 * the re-key is the SC-5 mitigation, and it should survive either file being
 * rewritten.
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

/** Count non-overlapping matches. */
function countOf(haystack: string, needle: RegExp): number {
  return haystack.match(needle)?.length ?? 0;
}

/**
 * The ATTRIBUTE form, not the bare phrase. `codeOnly` strips `//` comments but not
 * JSDoc, and `startEndlessRun`'s own doc comment opens with the same words — so a
 * bare-phrase count would be 2 for a perfectly correct file.
 */
const ENTRY_LABEL = 'accessibilityLabel="Start an endless run"';
const DEV_GUARD = /typeof __DEV__ !== 'undefined' && __DEV__/g;

describe('PlayingHost endless entry and wave contracts (source contract)', () => {
  const code = codeOnly(readFileSync(HOST, 'utf8'));

  /** The one `__DEV__`-guarded dev row — Lv / tier / Cert WC / Crash live here too. */
  const devRow = (() => {
    const m = code.match(/const devLevelSwitch =([\s\S]*?)\n {4}\) : null;/);
    return m?.[1] ?? '';
  })();

  /**
   * The endless wave-advance branch, anchored on its guard and terminated at its
   * early return — never the whole file.
   */
  const waveBranch = (() => {
    const m = code.match(
      /if \(\s*modeRef\.current === 'endless'[\s\S]*?SIM\.WON\s*\)\s*\{([\s\S]*?)\n {8}return;/,
    );
    return m?.[1] ?? '';
  })();

  it('the endless entry lives inside the one __DEV__-guarded dev row (D-05)', () => {
    expect(devRow, 'the dev row must be extractable').not.toBe('');
    expect(
      countOf(code, new RegExp(ENTRY_LABEL, 'g')),
      'the entry label must be attached to exactly one element in the file',
    ).toBe(1);
    expect(
      devRow,
      'the entry must sit INSIDE the guarded dev row, not beside it — a production build must not render it (D-05)',
    ).toContain(ENTRY_LABEL);
    expect(
      countOf(devRow, DEV_GUARD),
      'the dev row is a single guard wrapping all its Pressables — adding a fifth must not add a second guard',
    ).toBe(1);
  });

  it('the dev row uses the full __DEV__ guard idiom, never a bare __DEV__ (D-05)', () => {
    // Each full idiom spends exactly two `__DEV__` tokens. Any third token in this
    // region is a bare `__DEV__`, which throws on a runtime that does not define it.
    expect(
      countOf(devRow, /__DEV__/g),
      'every __DEV__ in the dev row must belong to the full typeof guard (D-05)',
    ).toBe(2 * countOf(devRow, DEV_GUARD));
  });

  it('the endless wave advance never touches the gate or the campaign level id (SC-5)', () => {
    expect(waveBranch, 'the wave-advance branch must be extractable').not.toBe('');
    expect(
      waveBranch,
      'a wave transition must cost no gate churn — setActive here re-enters the cold path (SC-5)',
    ).not.toMatch(/setActive\s*\(/);
    expect(
      waveBranch,
      'the wave path must never touch levelId — the generated board has no catalog id (SC-5)',
    ).not.toMatch(/setLevelId\s*\(/);
    expect(
      waveBranch,
      'the branch must still do its job: request the advance on the loop handle',
    ).toMatch(/advanceWave\(\)/);
  });

  it('a cleared board never ends an endless run (SC-1)', () => {
    expect(
      waveBranch,
      'handleRunEnded in the wave-advance branch would end the run on a WIN — SC-1 says the run ends only at zero lives',
    ).not.toMatch(/handleRunEnded\s*\(/);
    expect(
      waveBranch,
      'the branch must claim the in-flight guard so a double-delivered WON advances one wave',
    ).toMatch(/waveAdvanceInFlightRef\.current = true/);
  });

  it('the glow bake key is brick dimensions only (D-14 / SC-5)', () => {
    const m = code.match(
      /const loadKey = loadResult\.ok\s*\?([\s\S]*?)\s*:\s*`err:/,
    );
    expect(m?.[1], 'the loadKey expression must be extractable').toBeTruthy();
    expect(
      m![1],
      'brickCount moves every wave — keying on it re-bakes the atlas at every boundary (D-14)',
    ).not.toMatch(/brickCount/);
    expect(
      m![1],
      'the atlas identity is the brick dimensions and nothing else (D-14)',
    ).toMatch(/compiled\.w\[0\][\s\S]*compiled\.h\[0\]/);
  });

  it('the wave number renders in the same dev row (D-13)', () => {
    expect(
      devRow,
      'D-13 puts the wave readout in the dev row — a production HUD slot is Phase 14 scope',
    ).toMatch(/`W\$\{wave\}`/);
    expect(
      devRow,
      'the readout is endless-only, so campaign chrome is unchanged',
    ).toMatch(/mode === 'endless' \?/);
  });
});
