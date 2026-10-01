/**
 * The durable three-assertion gate over `MAX_FONT_SCALE` (N-UI-02, D-18 / WINDOWS #29,
 * 14-07).
 *
 * Assertion 1 alone — "every `Text` node carries the prop" — passes identically for a
 * file that hard-codes the number, which is exactly the `ACHIEVEMENT_LINES_MAX`-before-
 * `99afd8b` defect this project has already shipped. Assertion 2 makes the constant
 * load-bearing. Assertion 3 makes the twelve-file enumeration a property of the whole
 * tree rather than of a list someone maintained once — it scans the COMPLEMENT of the
 * enumeration over a live `git ls-files` listing, so a thirteenth file is in scope the
 * moment it exists.
 *
 * The gate reads SOURCE TEXT, never a render: research forced an assertion to print the
 * rendered markup under this project's `react-native-web` shim and the prop did not
 * appear in the DOM at all. A render-based assertion would therefore pass or fail
 * without ever observing the thing it claims to.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/**
 * Measured in this tree on 2026-09-29, after Task 1 of this plan capped all twelve
 * enumerated files. Pinned here rather than inherited from any document: `14-UI-SPEC.md`'s
 * own dev-row table said two deletions and its own dated correction said three — the two
 * disagreed, and the number that counts is the one this scan produces today.
 */
const PINNED_TWELVE_FILE_TOTAL = 69;

const ENUMERATED_FILES = [
  'src/runtime/overlays/ResultOverlay.tsx',
  'src/runtime/overlays/DailyResultOverlay.tsx',
  'src/runtime/overlays/PauseOverlay.tsx',
  'src/runtime/overlays/CountdownOverlay.tsx',
  'src/runtime/overlays/LevelErrorOverlay.tsx',
  'src/runtime/HudStrip.tsx',
  'src/runtime/GameScreen.tsx',
  'app/_components/TitleScreen.tsx',
  'app/_components/SelectScreen.tsx',
  'app/_components/StatisticsScreen.tsx',
  'app/_components/AchievementsScreen.tsx',
  'app/_components/PlayingHost.tsx',
];

const PROP = 'maxFontSizeMultiplier';
const TEXT_TAG = /<Text/g;
const PROP_OCCURRENCE = /maxFontSizeMultiplier/g;
const PROP_VIA_CONSTANT = /maxFontSizeMultiplier=\{MAX_FONT_SCALE\}/g;
/** A hard-coded value in the prop position: the prop followed by `{` and a digit. */
const PROP_HARDCODED = /maxFontSizeMultiplier=\{\d/g;

/** Strip block comments then line comments, in that order, before matching. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function countOf(code: string, pattern: RegExp): number {
  return code.match(pattern)?.length ?? 0;
}

function readStripped(path: string): string {
  return stripComments(readFileSync(path, 'utf8'));
}

describe('MAX_FONT_SCALE three-assertion gate over the twelve enumerated files', () => {
  it('self-check: the comment strip removes patterns from comments and keeps them in code (runs before the real scans)', () => {
    const inCode = [
      'const a = <Text maxFontSizeMultiplier={MAX_FONT_SCALE} />;',
      'const b = <Text maxFontSizeMultiplier={1.2} />;',
    ].join('\n');
    const stripped = stripComments(inCode);
    expect(
      countOf(stripped, TEXT_TAG),
      'self-check FAILED: real <Text tags in code were stripped — the guard is blind and an uncapped node would ship unnoticed',
    ).toBe(2);
    expect(
      countOf(stripped, PROP_OCCURRENCE),
      'self-check FAILED: real prop occurrences in code were stripped',
    ).toBe(2);
    expect(
      countOf(stripped, PROP_HARDCODED),
      'self-check FAILED: a real hard-coded prop in code was stripped — assertion 2 would be blind',
    ).toBe(1);

    const inComment = [
      '/**',
      ' * Do not write <Text maxFontSizeMultiplier={1.2} /> — use the constant.',
      ' */',
      '// <Text maxFontSizeMultiplier={MAX_FONT_SCALE} /> was once written by hand here.',
      "const c = 'unrelated';",
    ].join('\n');
    const strippedComment = stripComments(inComment);
    expect(
      countOf(strippedComment, TEXT_TAG),
      'self-check FAILED: prose mentioning <Text survived stripping — the guard would forbid documenting the rule it enforces',
    ).toBe(0);
    expect(
      countOf(strippedComment, PROP_OCCURRENCE),
      'self-check FAILED: prose mentioning the prop survived stripping',
    ).toBe(0);
  });

  it('the enumerated list has exactly twelve members, all present on disk', () => {
    expect(ENUMERATED_FILES).toHaveLength(12);
    for (const rel of ENUMERATED_FILES) {
      expect(
        existsSync(rel),
        `${rel} must exist, or this gate's file-based assertions pass vacuously`,
      ).toBe(true);
    }
  });

  it("the constant's module declares the value over stripped source", () => {
    const code = readStripped('src/runtime/textScale.ts');
    expect(
      /export const MAX_FONT_SCALE = 1\.2;/.test(code),
      'a value named only in prose must not satisfy this gate',
    ).toBe(true);
  });

  it('assertion 1: per-file Text-tag count equals prop-occurrence count, and the twelve-file sum matches the pinned total', () => {
    let sum = 0;
    for (const rel of ENUMERATED_FILES) {
      const code = readStripped(rel);
      const texts = countOf(code, TEXT_TAG);
      const props = countOf(code, PROP_OCCURRENCE);
      expect(
        texts,
        `${rel}: non-vacuity — the file must contain at least one Text node, or this file's equality check is vacuous`,
      ).toBeGreaterThan(0);
      expect(
        props,
        `${rel}: every <Text> node must carry ${PROP} — found ${texts} Text tags but ${props} prop occurrences`,
      ).toBe(texts);
      sum += texts;
    }
    expect(
      sum,
      `the twelve-file total must match the number this plan measured and pinned (${PINNED_TWELVE_FILE_TOTAL}) — a mismatch means a file regressed or the enumeration drifted from what was actually capped`,
    ).toBe(PINNED_TWELVE_FILE_TOTAL);
  });

  it('assertion 2: every prop occurrence is accounted for by the imported MAX_FONT_SCALE identifier, never a hard-coded value', () => {
    for (const rel of ENUMERATED_FILES) {
      const code = readStripped(rel);
      const props = countOf(code, PROP_OCCURRENCE);
      const viaConstant = countOf(code, PROP_VIA_CONSTANT);
      const hardcoded = countOf(code, PROP_HARDCODED);
      expect(
        hardcoded,
        `${rel}: a hard-coded numeric value in the ${PROP} prop position would pass assertion 1 identically while making the constant read by nothing in production`,
      ).toBe(0);
      expect(
        viaConstant,
        `${rel}: every occurrence of ${PROP} must be accounted for by the imported identifier (found ${props} total, ${viaConstant} via the constant)`,
      ).toBe(props);
    }
  });

  it('assertion 3: no Text opening tag exists outside the twelve enumerated files, scanned from a live git ls-files listing', () => {
    const tracked = execFileSync(
      'git',
      ['ls-files', '--', 'src/*.tsx', 'src/**/*.tsx', 'app/*.tsx', 'app/**/*.tsx'],
      { cwd: process.cwd(), encoding: 'utf8' },
    )
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const scanned = [...new Set(tracked)];

    expect(
      scanned.length,
      `a scan over ${scanned.length} component files passes vacuously — check the git ls-files pathspec`,
    ).toBeGreaterThanOrEqual(12);

    const enumeratedSet = new Set(ENUMERATED_FILES);
    const complement = scanned.filter((f) => !enumeratedSet.has(f));
    expect(
      complement.length,
      'the complement of the enumeration must be non-empty, or this assertion is checking zero files',
    ).toBeGreaterThan(0);

    const escapees: string[] = [];
    for (const rel of complement) {
      const code = readStripped(rel);
      if (countOf(code, TEXT_TAG) > 0) {
        escapees.push(rel);
      }
    }
    expect(
      escapees,
      `a Text node exists outside the twelve-file enumeration in: ${escapees.join(', ')} — the enumeration must be widened to include it and this constant's cap applied to it`,
    ).toEqual([]);
  });
});
