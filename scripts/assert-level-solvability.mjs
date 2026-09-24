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
 * Algorithm mirrors src/core/levels/solvability.ts (keep in sync).
 * Structural checks mirror validateLevel essentials for authored assets.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS_DIR = join(ROOT, 'assets/levels');
const NEGATIVE_FIXTURE = 'level-02.json';

/** Match src/core/constants.ts — do not import (extensionless TS under Node ESM). */
const BALL_RADIUS = 6;
const SEPARATION_EPS = 1e-4;
const MIN_BALL_CORRIDOR = 2 * (BALL_RADIUS + SEPARATION_EPS);
const EMPTY = '.';

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

function isSteel(level, ch) {
  if (ch === EMPTY) return false;
  const def = level.brickTypes[ch];
  return def != null && def.unbreakable === true;
}

function isBreakable(level, ch) {
  if (ch === EMPTY) return false;
  const def = level.brickTypes[ch];
  return def != null && def.unbreakable !== true;
}

function isPassable(level, ch) {
  return ch === EMPTY || isBreakable(level, ch);
}

function horizontalOpenWidth(level, aCol, bCol) {
  const d = bCol - aCol;
  return (d - 1) * level.grid.brickW + d * level.grid.gapX;
}

function verticalOpenWidth(level, aRow, bRow) {
  const d = bRow - aRow;
  return (d - 1) * level.grid.brickH + d * level.grid.gapY;
}

function collectCorridorWarnings(level) {
  const { cols, rows } = level.grid;
  const warnings = [];
  const minRequired = MIN_BALL_CORRIDOR;

  for (let r = 0; r < rows; r++) {
    const row = level.cells[r];
    let prevSteel = -1;
    for (let c = 0; c < cols; c++) {
      if (!isSteel(level, row[c])) continue;
      if (prevSteel >= 0) {
        const openWidth = horizontalOpenWidth(level, prevSteel, c);
        if (openWidth < minRequired) {
          warnings.push({
            kind: 'horizontal',
            a: { row: r, col: prevSteel },
            b: { row: r, col: c },
            openWidth,
            minRequired,
          });
        }
      }
      prevSteel = c;
    }
  }

  for (let c = 0; c < cols; c++) {
    let prevSteel = -1;
    for (let r = 0; r < rows; r++) {
      if (!isSteel(level, level.cells[r][c])) continue;
      if (prevSteel >= 0) {
        const openWidth = verticalOpenWidth(level, prevSteel, r);
        if (openWidth < minRequired) {
          warnings.push({
            kind: 'vertical',
            a: { row: prevSteel, col: c },
            b: { row: r, col: c },
            openWidth,
            minRequired,
          });
        }
      }
      prevSteel = r;
    }
  }

  return warnings;
}

function checkSolvability(level) {
  const { cols, rows } = level.grid;
  const reachable = new Uint8Array(cols * rows);
  const queue = [];

  const bottom = rows - 1;
  if (bottom >= 0) {
    const bottomRow = level.cells[bottom];
    for (let c = 0; c < cols; c++) {
      if (isPassable(level, bottomRow[c])) {
        const i = bottom * cols + c;
        reachable[i] = 1;
        queue.push(i);
      }
    }
  }

  const neighbors = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const r = (i / cols) | 0;
    const c = i - r * cols;
    for (const [dr, dc] of neighbors) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const ni = nr * cols + nc;
      if (reachable[ni]) continue;
      if (!isPassable(level, level.cells[nr][nc])) continue;
      reachable[ni] = 1;
      queue.push(ni);
    }
  }

  const unreachableBreakables = [];
  for (let r = 0; r < rows; r++) {
    const row = level.cells[r];
    for (let c = 0; c < cols; c++) {
      const ch = row[c];
      if (!isBreakable(level, ch)) continue;
      if (!reachable[r * cols + c]) {
        unreachableBreakables.push({ row: r, col: c, char: ch });
      }
    }
  }

  return {
    ok: unreachableBreakables.length === 0,
    unreachableBreakables,
    corridorWarnings: collectCorridorWarnings(level),
  };
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
