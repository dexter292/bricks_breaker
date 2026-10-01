/**
 * The three colour fences over both new Phase 14 screens (N-UI-02, 14-05).
 *
 * `StatisticsScreen.tsx` and `AchievementsScreen.tsx` must never use three fenced hex
 * tokens, each fenced for its own reason and none of them an aesthetic preference:
 *
 *  - `#6B7280` (Muted) is 3.53:1 on this `#1a1a2e` background and fails WCAG AA for normal
 *    text. The level-select screen's own locked row is the closest layout analog for both
 *    new screens' list bodies — it is the right analog for LAYOUT and the wrong one for
 *    COLOUR. Using it on a locked achievement's description would put D-08's whole point
 *    (every entry shows its condition) below AA.
 *  - `#F2CC8F` (the record-slot token) is fenced on semantic grounds: an achievement is
 *    not a record — it is a threshold crossed once that never un-crosses — and Statistics
 *    renders no record slot at all.
 *  - `#E85D5D` (destructive) is fenced because nothing on either screen is a loss.
 *
 * The level-select screen itself is OUT OF SCOPE and keeps its own use of the Muted
 * token; this fence binds only the two files listed below.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const MUTED = '#6B7280';
const RECORD_SLOT = '#F2CC8F';
const DESTRUCTIVE = '#E85D5D';
const ACCENT = '#FFFFFF';
const FENCED = [MUTED, RECORD_SLOT, DESTRUCTIVE];

const SCANNED_FILES = [
  'app/_components/StatisticsScreen.tsx',
  'app/_components/AchievementsScreen.tsx',
];

/** Strip block comments then line comments, in that order, before matching. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function countOf(code: string, token: string): number {
  return code.split(token).length - 1;
}

describe('shell colour fences over StatisticsScreen and AchievementsScreen', () => {
  it('self-check: the comment strip removes tokens from comments and keeps them in code (runs before the real scan)', () => {
    const inCode = [MUTED, RECORD_SLOT, DESTRUCTIVE]
      .map((t) => `const x = '${t}';`)
      .join('\n');
    const strippedCode = stripComments(inCode);
    for (const token of FENCED) {
      expect(
        countOf(strippedCode, token),
        `self-check FAILED: real code use of ${token} was stripped — the guard is blind and a fenced colour would ship unnoticed`,
      ).toBe(1);
    }

    const inComments = [
      '/**',
      ` * Do not use ${MUTED} here.`,
      ' */',
      `// ${RECORD_SLOT} was once used here.`,
      `/* ${DESTRUCTIVE} */`,
      "const x = 'unrelated';",
    ].join('\n');
    const strippedComments = stripComments(inComments);
    for (const token of FENCED) {
      expect(
        countOf(strippedComments, token),
        `self-check FAILED: prose mentioning ${token} counted nonzero after stripping — the guard would fail on files that explain the fence in their own doc comments`,
      ).toBe(0);
    }
  });

  it('file-list guard: exactly two files are scanned and both exist on disk', () => {
    expect(SCANNED_FILES).toHaveLength(2);
    for (const rel of SCANNED_FILES) {
      expect(existsSync(rel), `${rel} must exist, or this contract passes vacuously`).toBe(
        true,
      );
    }
  });

  it('neither new screen uses the Muted, record-slot or destructive tokens, and the strip did not delete the file', () => {
    for (const rel of SCANNED_FILES) {
      const code = stripComments(readFileSync(rel, 'utf8'));

      // Non-vacuity: the accent token every readable element on these screens uses MUST
      // still be present after stripping, or a strip that deleted the whole file would
      // leave all three zero-occurrence assertions below passing on an empty string.
      expect(
        countOf(code, ACCENT),
        `${rel}: the accent token ${ACCENT} must survive the comment strip, or this file's zero-occurrence assertions below are vacuous`,
      ).toBeGreaterThan(0);

      for (const token of FENCED) {
        expect(
          countOf(code, token),
          `${rel} must not use the fenced token ${token}`,
        ).toBe(0);
      }
    }
  });
});
