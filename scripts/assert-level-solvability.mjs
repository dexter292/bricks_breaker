/**
 * N-LVL-03 CI guard: solvability lint over assets/levels/*.json.
 *
 * Exit 0 when:
 *   - level-02.json FAILS reachability (negative fixture / self-check)
 *   - every other level PASSES reachability
 * Exit 1 otherwise (including structural validation failure).
 *
 * Corridor warnings are printed but do not fail the gate.
 *
 * Algorithm lives in `./lib/levelSolvability.mjs` — must match
 * `src/core/levels/solvability.ts` (R-16 parity test).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSolvability } from './lib/levelSolvability.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS_DIR = join(ROOT, 'assets/levels');
const NEGATIVE_FIXTURE = 'level-02.json';

function listLevelFiles() {
  return readdirSync(LEVELS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

function loadJson(name) {
  return JSON.parse(readFileSync(join(LEVELS_DIR, name), 'utf8'));
}

function structuralIssues(raw) {
  const issues = [];
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Level must be a non-null object'];
  }
  if (raw.schemaVersion !== 1) {
    issues.push(`Unsupported schemaVersion ${String(raw.schemaVersion)}`);
  }
  if (typeof raw.id !== 'string' || raw.id.length === 0) {
    issues.push('id must be a non-empty string');
  }
  if (!raw.grid || typeof raw.grid !== 'object') {
    issues.push('grid missing');
    return issues;
  }
  const { cols, rows } = raw.grid;
  if (!Number.isInteger(cols) || cols <= 0 || !Number.isInteger(rows) || rows <= 0) {
    issues.push('grid.cols/rows must be positive integers');
  }
  if (!raw.brickTypes || typeof raw.brickTypes !== 'object') {
    issues.push('brickTypes missing');
  }
  if (!Array.isArray(raw.cells) || raw.cells.length !== rows) {
    issues.push(`cells must have length ${rows}`);
  } else {
    for (let r = 0; r < raw.cells.length; r++) {
      const row = raw.cells[r];
      if (typeof row !== 'string' || row.length !== cols) {
        issues.push(`cells[${r}] length must be ${cols}`);
      }
    }
  }
  return issues;
}

function formatUnreachable(list) {
  return list.map((u) => `(${u.row},${u.col})'${u.char}'`).join(', ');
}

const files = listLevelFiles();
if (files.length === 0) {
  console.error('assert-level-solvability: no assets/levels/*.json found');
  process.exit(1);
}

if (!files.includes(NEGATIVE_FIXTURE)) {
  console.error(
    `assert-level-solvability: missing negative fixture ${NEGATIVE_FIXTURE}`,
  );
  process.exit(1);
}

let failed = false;
let negativeFailedAsExpected = false;

for (const file of files) {
  const raw = loadJson(file);
  const issues = structuralIssues(raw);
  if (issues.length > 0) {
    console.error(`${file}: structural validate FAILED — ${issues.join('; ')}`);
    failed = true;
    continue;
  }

  const result = checkSolvability(raw);
  const isNegative = file === NEGATIVE_FIXTURE;

  if (result.corridorWarnings.length > 0) {
    console.warn(
      `${file}: ${result.corridorWarnings.length} corridor warning(s) (non-blocking)`,
    );
    for (const w of result.corridorWarnings) {
      console.warn(
        `  ${w.kind} ${w.a.row},${w.a.col}→${w.b.row},${w.b.col} open=${w.openWidth} < min=${w.minRequired}`,
      );
    }
  }

  if (isNegative) {
    if (result.ok) {
      console.error(
        `${file}: expected reachability FAILURE (negative fixture), but check passed`,
      );
      failed = true;
    } else {
      negativeFailedAsExpected = true;
      console.log(
        `${file}: FAIL as expected (${result.unreachableBreakables.length} unreachable) — self-check OK`,
      );
    }
    continue;
  }

  if (!result.ok) {
    console.error(
      `${file}: reachability FAILED — unreachable: ${formatUnreachable(result.unreachableBreakables)}`,
    );
    failed = true;
  } else {
    console.log(`${file}: OK`);
  }
}

if (!negativeFailedAsExpected) {
  console.error(
    `assert-level-solvability: negative fixture ${NEGATIVE_FIXTURE} did not fail reachability`,
  );
  failed = true;
}

if (failed) {
  console.error('assert-level-solvability: FAILED');
  process.exit(1);
}

console.log('assert-level-solvability: OK (ship levels pass; level-02 fails)');
process.exit(0);
