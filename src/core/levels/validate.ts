/**
 * Hand-rolled level validator (LVL-01). Fail-closed; never mutates World (D-13).
 * Never trim row strings (D-02).
 */

import { MAX_BRICKS } from '../constants';
import {
  SCHEMA_VERSION,
  type BrickTypeDef,
  type LevelFileV1,
  type ValidationIssue,
} from './schema';

export type ValidateLevelResult =
  | { ok: true; value: LevelFileV1 }
  | { ok: false; issues: ValidationIssue[] };

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const GRID_POSITIVE_INT = ['cols', 'rows'] as const;
const GRID_NON_NEGATIVE = [
  'originX',
  'originY',
  'brickW',
  'brickH',
  'gapX',
  'gapY',
] as const;

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ownKeys(obj: object): string[] {
  return Object.keys(obj).filter((k) => Object.hasOwn(obj, k));
}

export function validateLevel(raw: unknown): ValidateLevelResult {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(raw)) {
    return { ok: false, issues: [issue('', 'Level must be a non-null object')] };
  }

  if (!Object.hasOwn(raw, 'schemaVersion')) {
    issues.push(issue('schemaVersion', `Missing schemaVersion (supported: ${SCHEMA_VERSION})`));
  } else if (raw.schemaVersion !== SCHEMA_VERSION) {
    issues.push(
      issue(
        'schemaVersion',
        `Unsupported schemaVersion ${String(raw.schemaVersion)} (supported: ${SCHEMA_VERSION})`,
      ),
    );
  }

  if (!Object.hasOwn(raw, 'id') || typeof raw.id !== 'string' || raw.id.length === 0) {
    issues.push(issue('id', 'id must be a non-empty string'));
  }
  if (!Object.hasOwn(raw, 'name') || typeof raw.name !== 'string' || raw.name.length === 0) {
    issues.push(issue('name', 'name must be a non-empty string'));
  }

  let cols = 0;
  let rows = 0;
  let gridOk = false;

  if (!Object.hasOwn(raw, 'grid') || !isPlainObject(raw.grid)) {
    issues.push(issue('grid', 'grid must be an object'));
  } else {
    const grid = raw.grid;
    gridOk = true;

    for (const key of GRID_POSITIVE_INT) {
      if (!Object.hasOwn(grid, key)) {
        issues.push(issue(`grid.${key}`, `${key} is required`));
        gridOk = false;
        continue;
      }
      const n = grid[key];
      if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
        issues.push(issue(`grid.${key}`, `${key} must be a finite integer ≥ 1`));
        gridOk = false;
      }
    }

    for (const key of GRID_NON_NEGATIVE) {
      if (!Object.hasOwn(grid, key)) {
        issues.push(issue(`grid.${key}`, `${key} is required`));
        gridOk = false;
        continue;
      }
      const n = grid[key];
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
        issues.push(issue(`grid.${key}`, `${key} must be a finite number ≥ 0`));
        gridOk = false;
      }
    }

    if (gridOk) {
      cols = grid.cols as number;
      rows = grid.rows as number;
      if (cols * rows > MAX_BRICKS) {
        issues.push(
          issue(
            'grid',
            `cols*rows (${cols * rows}) exceeds MAX_BRICKS (${MAX_BRICKS})`,
          ),
        );
        gridOk = false;
      }
    }
  }

  const brickTypes: Record<string, BrickTypeDef> = Object.create(null) as Record<
    string,
    BrickTypeDef
  >;

  if (!Object.hasOwn(raw, 'brickTypes') || !isPlainObject(raw.brickTypes)) {
    issues.push(issue('brickTypes', 'brickTypes must be an object'));
  } else {
    const bt = raw.brickTypes;
    for (const key of ownKeys(bt)) {
      if (DANGEROUS_KEYS.has(key)) {
        issues.push(
          issue(`brickTypes.${key}`, `Dangerous brickTypes key rejected: ${key}`),
        );
        continue;
      }
      const def = bt[key];
      if (!isPlainObject(def)) {
        issues.push(issue(`brickTypes.${key}`, 'Brick type must be an object'));
        continue;
      }
      if (!Object.hasOwn(def, 'hp') || typeof def.hp !== 'number' || !Number.isFinite(def.hp) || def.hp <= 0) {
        issues.push(issue(`brickTypes.${key}.hp`, 'hp must be a finite number > 0'));
        continue;
      }
      if (Object.hasOwn(def, 'unbreakable') && typeof def.unbreakable !== 'boolean') {
        issues.push(issue(`brickTypes.${key}.unbreakable`, 'unbreakable must be a boolean'));
        continue;
      }
      const typed: BrickTypeDef = { hp: def.hp };
      if (Object.hasOwn(def, 'unbreakable')) {
        typed.unbreakable = def.unbreakable as boolean;
      }
      brickTypes[key] = typed;
    }
  }

  if (!Object.hasOwn(raw, 'cells') || !Array.isArray(raw.cells)) {
    issues.push(issue('cells', 'cells must be an array of row strings'));
  } else if (gridOk) {
    const cells = raw.cells;
    if (cells.length !== rows) {
      issues.push(
        issue('cells', `cells.length (${cells.length}) must equal grid.rows (${rows})`),
      );
    } else {
      let nonEmpty = 0;
      for (let r = 0; r < cells.length; r++) {
        const row = cells[r];
        if (typeof row !== 'string') {
          issues.push(issue(`cells[${r}]`, 'Row must be a string (never trimmed)'));
          continue;
        }
        if (row.length !== cols) {
          issues.push(
            issue(
              `cells[${r}]`,
              `Row length ${row.length} must equal grid.cols (${cols})`,
            ),
          );
          continue;
        }
        for (let c = 0; c < row.length; c++) {
          const ch = row[c]!;
          if (ch === ' ') {
            issues.push(
              issue(`cells[${r}][${c}]`, 'Space characters are not allowed (use ".")'),
            );
            continue;
          }
          if (ch === '.') {
            continue;
          }
          if (!Object.hasOwn(brickTypes, ch)) {
            issues.push(
              issue(
                `cells[${r}][${c}]`,
                `Unknown char '${ch}' not in brickTypes`,
              ),
            );
            continue;
          }
          nonEmpty += 1;
        }
      }
      if (nonEmpty > MAX_BRICKS) {
        issues.push(
          issue(
            'cells',
            `Non-empty brick count (${nonEmpty}) exceeds MAX_BRICKS (${MAX_BRICKS})`,
          ),
        );
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const grid = raw.grid as LevelFileV1['grid'];
  const value: LevelFileV1 = {
    schemaVersion: SCHEMA_VERSION,
    id: raw.id as string,
    name: raw.name as string,
    grid: {
      cols: grid.cols,
      rows: grid.rows,
      originX: grid.originX,
      originY: grid.originY,
      brickW: grid.brickW,
      brickH: grid.brickH,
      gapX: grid.gapX,
      gapY: grid.gapY,
    },
    brickTypes,
    cells: (raw.cells as string[]).slice(),
  };

  return { ok: true, value };
}
