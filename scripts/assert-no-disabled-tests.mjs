/**
 * Guard: no test may be silently disabled.
 *
 * ## What this catches, and why a green `npm test` does not
 *
 * A suite reports what it RAN. Converting `it(...)` to `it.todo(...)` or `it.skip(...)`
 * removes a case from the run and the summary line reports it as a todo or a skip, not as
 * a failure — so a case can stop asserting anything and the gate that was supposed to
 * notice stays green. `it.only` is worse still: it disables **every other case in the
 * file** and the suite goes green with a fraction of its coverage, which is the shape that
 * survives a hurried debugging session and gets committed.
 *
 * ## Provenance
 *
 * Plan 10-03's `T-10-14` declared exactly this control — "`it.todo` count asserted at 0" —
 * and the phase-10 security audit measured that **it was never built**: zero `it.todo`
 * occurrences *and* zero todo-count assertion anywhere in the phase (Finding 3).
 * `10-03-SUMMARY.md` restates it as "0 todos in the file", which was a true one-shot
 * measurement and not a gate. This is the gate, and it is repo-wide rather than
 * phase-scoped because the risk never was.
 *
 * ## Comments are stripped before matching
 *
 * MEASURED 2026-09-29: the only two textual `it.todo` hits in this repository are
 * **prose** — `tests/telemetry.reduce-run-events.test.ts` and
 * `tests/storage.progress-v4.test.ts` both have header comments explaining that plan 00
 * scaffolded them as `it.todo` checklists. A scan that did not strip comments would fail
 * on files that describe their own history, which is the defect phase 13 shipped twice
 * (a `numberOfLines` grep that counted its own JSDoc). The self-check below proves both
 * directions before the real scan runs.
 *
 * ## Skips are allowed, but only by name
 *
 * A skip with a stated reason is a legitimate act — the allowance below is a
 * non-applicability, not a disabled test. New skips must be added here deliberately, which
 * is the point: the cost of skipping a case is a line in this file.
 *
 * Exit 1 on any `only`, any `todo`, or any `skip` outside the allowance.
 */
import { globSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE = '{tests,src,app}/**/*.{ts,tsx}';

/**
 * Skips that are deliberate, each with the reason it is not a disabled test.
 * `count` is exact: a second skip appearing in an allowed file still fails.
 */
const ALLOWED_SKIPS = [
  {
    file: 'tests/achievements.record.test.ts',
    count: 1,
    why: 'the memory-store cold-start case is a NON-APPLICABILITY, not a disabled test: that store is a blob in RAM, so a "second store over the same bytes" is the same object and the case would report green while asserting nothing about persistence. Its reason is in the test name, and the AsyncStorage instantiation of the same suite body does assert it (13-03, N-ACH-02 / SC-3).',
  },
];

function fail(msg) {
  console.error(`assert-no-disabled-tests: ${msg}`);
  process.exit(1);
}

const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** `it.only` / `describe.only` / `test.only`, and the same for `.skip` and `.todo`. */
const patternFor = (kind) =>
  new RegExp(`\\b(?:it|test|describe)\\s*\\.\\s*${kind}\\s*\\(`, 'g');

const countIn = (code, kind) => (code.match(patternFor(kind)) ?? []).length;

function runSelfCheck() {
  const inCode = "it.todo('x');\ndescribe.only('y', () => {});\nit.skip('z', () => {});";
  const inProse = [
    '/**',
    ' * Plan 00 scaffolded this file as an `it.todo` checklist, and it.only is banned.',
    ' */',
    '// it.skip(...) was once used here.',
    "it('a real case', () => {});",
  ].join('\n');

  for (const [kind, want] of [
    ['todo', 1],
    ['only', 1],
    ['skip', 1],
  ]) {
    const got = countIn(stripComments(inCode), kind);
    if (got !== want) {
      fail(
        `self-check FAILED: real \`.${kind}(\` in code counted ${got}, expected ${want}. The guard is blind and a disabled test would ship unnoticed.`,
      );
    }
  }
  for (const kind of ['todo', 'only', 'skip']) {
    const got = countIn(stripComments(inProse), kind);
    if (got !== 0) {
      fail(
        `self-check FAILED: prose mentioning \`.${kind}(\` counted ${got}, expected 0. The guard would fail on files that describe their own history — the defect phase 13 shipped twice.`,
      );
    }
  }
}

runSelfCheck();

const files = globSync(SCOPE, { cwd: ROOT });
if (files.length < 50) {
  fail(
    `a scan over ${files.length} files passes vacuously — check the glob: ${SCOPE}`,
  );
}

const problems = [];
const skipsByFile = new Map();

for (const rel of files) {
  const code = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
  for (const kind of ['only', 'todo']) {
    const n = countIn(code, kind);
    if (n > 0) {
      problems.push(
        `  ${rel}: ${n} \`.${kind}(\`` +
          (kind === 'only'
            ? ' — this disables EVERY OTHER CASE in the file and the suite still goes green'
            : ' — a todo is reported as a todo, never as a failure'),
      );
    }
  }
  const skips = countIn(code, 'skip');
  if (skips > 0) {
    skipsByFile.set(rel, skips);
  }
}

for (const [rel, n] of skipsByFile) {
  const allowed = ALLOWED_SKIPS.find((a) => a.file === rel);
  if (!allowed) {
    problems.push(
      `  ${rel}: ${n} \`.skip(\` with no entry in ALLOWED_SKIPS. A skip is allowed, but only by name — add it to scripts/assert-no-disabled-tests.mjs with the reason it is a non-applicability rather than a disabled test.`,
    );
  } else if (n !== allowed.count) {
    problems.push(
      `  ${rel}: ${n} \`.skip(\`, but ALLOWED_SKIPS declares ${allowed.count}. A new skip appeared in an allowed file; the allowance is exact on purpose.`,
    );
  }
}

for (const a of ALLOWED_SKIPS) {
  if (!skipsByFile.has(a.file)) {
    problems.push(
      `  ${a.file}: ALLOWED_SKIPS declares ${a.count} skip(s) here and the file has none. The skip was resolved — delete the allowance so the count stays honest.`,
    );
  }
}

if (problems.length > 0) {
  fail(`disabled tests found:\n${problems.join('\n')}`);
}

const allowedTotal = ALLOWED_SKIPS.reduce((n, a) => n + a.count, 0);
console.log(
  `assert-no-disabled-tests: OK (${files.length} files — 0 only, 0 todo, ${allowedTotal} declared skip; prose mentioning them is not counted, self-check proves both directions)`,
);
