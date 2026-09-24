/**
 * N-LVL-03 solvability core for the CI gate (plain ESM, no TS imports).
 * Must stay behavior-identical to `src/core/levels/solvability.ts` — guarded by
 * `tests/levels.solvability-parity.test.ts` (R-16).
 *
 * Constants mirrored from `src/core/constants.ts` (BALL_RADIUS, SEPARATION_EPS).
 */

export const BALL_RADIUS = 6;
export const SEPARATION_EPS = 1e-4;
export const MIN_BALL_CORRIDOR = 2 * (BALL_RADIUS + SEPARATION_EPS);
const EMPTY = '.';

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
        let clear = true;
        for (let k = prevSteel + 1; k < c; k++) {
          if (isSteel(level, row[k])) {
            clear = false;
            break;
          }
        }
        if (clear) {
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
      }
      prevSteel = c;
    }
  }

  for (let c = 0; c < cols; c++) {
    let prevSteel = -1;
    for (let r = 0; r < rows; r++) {
      if (!isSteel(level, level.cells[r][c])) continue;
      if (prevSteel >= 0) {
        let clear = true;
        for (let k = prevSteel + 1; k < r; k++) {
          if (isSteel(level, level.cells[k][c])) {
            clear = false;
            break;
          }
        }
        if (clear) {
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
      }
      prevSteel = r;
    }
  }

  return warnings;
}

/**
 * Reachability flood-fill + optional narrow-corridor warnings.
 * `ok` is false iff any breakable brick is unreachable from below the grid.
 */
export function checkSolvability(level) {
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
