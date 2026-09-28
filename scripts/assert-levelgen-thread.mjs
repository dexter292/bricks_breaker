/**
 * T-10-24 guard: no `'worklet'` directive may appear under `src/levelgen/**`.
 *
 * Board generation runs on the JS thread, on the cold path, before a board is handed to
 * the simulation. A `'worklet'` directive moves a function onto the UI thread, where it
 * would run inside the render loop — and `src/levelgen`'s work is bounded per call but not
 * frame-bounded, so a generate on the UI thread is a dropped-frame source with no ceiling.
 *
 * ## Why this script exists, and what was measured
 *
 * The phase-10 security audit found T-10-24's three declared enforcements and measured that
 * **none of them performs this check**:
 *
 *   1. The "line-anchored absence check" had NO COMMITTED RUNNER — it was a one-shot command
 *      inside `10-05-PLAN.md`'s verify block. `scripts/` and `package.json` referenced
 *      `src/levelgen` zero times.
 *   2. `scripts/assert-worklet-closures.mjs` is a sound guard with a different rule: *a
 *      worklet must not call a non-worklet helper*. MEASURED — a self-contained
 *      `'worklet'` planted in `src/levelgen/grid.ts` left it at **exit 0,
 *      "Worklet closure guard OK (130 files)"**. It reds only when the worklet calls a
 *      non-worklet local.
 *   3. `npx eslint src/levelgen` drew **zero** errors on the same planted directive. The
 *      `boundaries/dependencies` matrix stops reanimated and react-native *imports*, not
 *      the directive.
 *
 * So the uncovered path was a self-contained worklet inlining integer math — which is
 * exactly the shape `src/levelgen/rng.ts`'s own header warns about when it explains why it
 * copies four lines of mulberry32 rather than importing `src/core/rng/`. Both measurements
 * in (2) and (3) were independently reproduced by the orchestrator before this was written.
 *
 * ## What it checks
 *
 * A line whose only content is a `'worklet'` / `"worklet"` directive statement. Anchored to
 * the line so a mention inside prose does not count — the four `'worklet'` occurrences in
 * `src/levelgen`'s own header comments are all explanations of this very rule, and a check
 * that flagged them would be a check that forbids documenting itself. That is the defect
 * phase 13 shipped twice (a `numberOfLines` grep counting its own JSDoc), so the
 * self-check below plants the pattern in a comment AND in code and requires exactly one
 * of them to be caught.
 *
 * Exit 1 on any directive found, and on a self-check that does not distinguish the two.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE = 'src/levelgen/**/*.{ts,tsx}';

/** A whole line that is nothing but a worklet directive statement. */
const DIRECTIVE_LINE = /^\s*(['"])worklet\1\s*;?\s*$/;

function fail(msg) {
  console.error(`assert-levelgen-thread: ${msg}`);
  process.exit(1);
}

/** Lines carrying a bare `'worklet'` directive, as `{ file, line }`. */
function findDirectives(source, rel) {
  return source
    .split('\n')
    .map((text, i) => ({ text, line: i + 1 }))
    .filter(({ text }) => DIRECTIVE_LINE.test(text))
    .map(({ line }) => ({ file: rel, line }));
}

/**
 * The instrument's own test. A source scan that cannot tell a comment from code is the
 * failure mode this repo has shipped three times, so prove the distinction rather than
 * asserting it in a comment.
 */
function runSelfCheck() {
  const inCode = ["export function f(n) {", "  'worklet';", '  return n;', '}'].join('\n');
  const inComment = [
    '/**',
    " * This paragraph mentions a 'worklet' directive and must NOT be flagged.",
    ' */',
    "// 'worklet';",
    'export function g(n) { return n; }',
  ].join('\n');

  const codeHits = findDirectives(inCode, '<self-check:code>');
  if (codeHits.length !== 1) {
    fail(
      `self-check FAILED: a real directive in code produced ${codeHits.length} hits, expected 1. The guard is blind and would pass a generator moved onto the UI thread.`,
    );
  }
  const commentHits = findDirectives(inComment, '<self-check:comment>');
  if (commentHits.length !== 0) {
    fail(
      `self-check FAILED: prose mentioning the directive produced ${commentHits.length} hits, expected 0. The guard would forbid documenting the rule it enforces — the defect phase 13 shipped twice.`,
    );
  }
}

runSelfCheck();

const files = globSync(SCOPE, { cwd: ROOT }).filter((p) => !p.includes('.test.'));
if (files.length < 5) {
  fail(
    `a scan over ${files.length} files passes vacuously — src/levelgen must exist and hold the generator modules. Check the glob: ${SCOPE}`,
  );
}

const hits = files.flatMap((rel) =>
  findDirectives(readFileSync(join(ROOT, rel), 'utf8'), rel),
);

if (hits.length > 0) {
  fail(
    `found ${hits.length} 'worklet' directive(s) under src/levelgen:\n` +
      hits.map((h) => `  ${h.file}:${h.line}`).join('\n') +
      `\nBoard generation runs on the JS thread on the cold path. A worklet moves it onto the UI thread inside the render loop, where its per-call work has no frame budget. If this is deliberate, the T-10-24 disposition in 10-SECURITY.md must change first.`,
  );
}

console.log(
  `assert-levelgen-thread: OK (T-10-24 — 0 'worklet' directives across ${files.length} src/levelgen files; prose mentioning the directive is not counted, self-check proves both directions)`,
);
