/**
 * N-LVL-03 — static solvability / reachability lint (JS/Node only; not worklet-safe).
 * Flood-fill from open space below the grid through empty and breakable cells;
 * steel (unbreakable) blocks. Corridor squeeze is warn-only.
 */

import { BALL_RADIUS, SEPARATION_EPS } from '../constants';
import type { LevelFileV1 } from './schema';

/** Minimum clear span for a ball to pass (diameter + separation). */
export const MIN_BALL_CORRIDOR = 2 * (BALL_RADIUS + SEPARATION_EPS);

export type UnreachableBreakable = {
  row: number;
  col: number;
  char: string;
};

export type CorridorWarning = {
  kind: 'horizontal' | 'vertical';
  /** First steel cell (row, col). */
  a: { row: number; col: number };
  /** Second steel cell (row, col). */
  b: { row: number; col: number };
  openWidth: number;
  minRequired: number;
};

export type SolvabilityResult = {
  ok: boolean;
  unreachableBreakables: UnreachableBreakable[];
  corridorWarnings: CorridorWarning[];
};

const EMPTY = '.';

function isSteel(level: LevelFileV1, ch: string): boolean {
  if (ch === EMPTY) return false;
  const def = level.brickTypes[ch];
  return def != null && def.unbreakable === true;
}

function isBreakable(level: LevelFileV1, ch: string): boolean {
  if (ch === EMPTY) return false;
  const def = level.brickTypes[ch];
  return def != null && def.unbreakable !== true;
}

function isPassable(level: LevelFileV1, ch: string): boolean {
  return ch === EMPTY || isBreakable(level, ch);
}

/**
 * Open span between steel AABBs in the same row (cols aCol < bCol).
 * Equals (bCol - aCol - 1) * brickW + (bCol - aCol) * gapX.
 */
function horizontalOpenWidth(
  level: LevelFileV1,
  aCol: number,
  bCol: number,
): number {
  const d = bCol - aCol;
  return (d - 1) * level.grid.brickW + d * level.grid.gapX;
}

/**
 * Open span between steel AABBs in the same column (rows aRow < bRow).
 */
function verticalOpenWidth(
  level: LevelFileV1,
  aRow: number,
  bRow: number,
): number {
  const d = bRow - aRow;
  return (d - 1) * level.grid.brickH + d * level.grid.gapY;
}

function collectCorridorWarnings(level: LevelFileV1): CorridorWarning[] {
  const { cols, rows } = level.grid;
  const warnings: CorridorWarning[] = [];
  const minRequired = MIN_BALL_CORRIDOR;

  for (let r = 0; r < rows; r++) {
    const row = level.cells[r]!;
    let prevSteel = -1;
    for (let c = 0; c < cols; c++) {
      if (!isSteel(level, row[c]!)) continue;
      if (prevSteel >= 0) {
        let clear = true;
        for (let k = prevSteel + 1; k < c; k++) {
          if (isSteel(level, row[k]!)) {
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
      if (!isSteel(level, level.cells[r]![c]!)) continue;
      if (prevSteel >= 0) {
        let clear = true;
        for (let k = prevSteel + 1; k < r; k++) {
          if (isSteel(level, level.cells[k]![c]!)) {
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
export function checkSolvability(level: LevelFileV1): SolvabilityResult {
  const { cols, rows } = level.grid;
  const reachable = new Uint8Array(cols * rows);
  const queue: number[] = [];

  // Seed: open space below the grid enters any passable cell on the bottom row.
  const bottom = rows - 1;
  if (bottom >= 0) {
    const bottomRow = level.cells[bottom]!;
    for (let c = 0; c < cols; c++) {
      if (isPassable(level, bottomRow[c]!)) {
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
  ] as const;

  let head = 0;
  while (head < queue.length) {
    const i = queue[head++]!;
    const r = (i / cols) | 0;
    const c = i - r * cols;
    for (const [dr, dc] of neighbors) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const ni = nr * cols + nc;
      if (reachable[ni]) continue;
      if (!isPassable(level, level.cells[nr]![nc]!)) continue;
      reachable[ni] = 1;
      queue.push(ni);
    }
  }

  const unreachableBreakables: UnreachableBreakable[] = [];
  for (let r = 0; r < rows; r++) {
    const row = level.cells[r]!;
    for (let c = 0; c < cols; c++) {
      const ch = row[c]!;
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
