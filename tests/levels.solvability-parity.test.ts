/**
 * R-16 — CI gate solvability (scripts/lib) must match the TS library.
 *
 * @vitest-environment node
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BALL_RADIUS,
  SEPARATION_EPS,
} from '../src/core/constants';
import {
  checkSolvability as checkTs,
  MIN_BALL_CORRIDOR as MIN_TS,
} from '../src/core/levels/solvability';
import { validateLevel } from '../src/core/levels/validate';
import type { LevelFileV1 } from '../src/core/levels/schema';
import {
  checkSolvability as checkMjs,
  MIN_BALL_CORRIDOR as MIN_MJS,
  BALL_RADIUS as BALL_MJS,
  SEPARATION_EPS as EPS_MJS,
} from '../scripts/lib/levelSolvability.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levelsDir = join(root, 'assets/levels');

function listLevelFiles(): string[] {
  return readdirSync(levelsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

function loadValidated(name: string): LevelFileV1 {
  const raw = JSON.parse(
    readFileSync(join(levelsDir, name), 'utf8'),
  ) as unknown;
  const v = validateLevel(raw);
  if (!v.ok) {
    throw new Error(`${name} structural validate failed: ${JSON.stringify(v.issues)}`);
  }
  return v.value;
}

function sortUnreachable(
  list: { row: number; col: number; char: string }[],
) {
  return [...list].sort(
    (a, b) => a.row - b.row || a.col - b.col || a.char.localeCompare(b.char),
  );
}

function sortWarnings(
  list: {
    kind: string;
    a: { row: number; col: number };
    b: { row: number; col: number };
    openWidth: number;
    minRequired: number;
  }[],
) {
  return [...list].sort((x, y) => {
    const kx = `${x.kind}:${x.a.row},${x.a.col}:${x.b.row},${x.b.col}`;
    const ky = `${y.kind}:${y.a.row},${y.a.col}:${y.b.row},${y.b.col}`;
    return kx.localeCompare(ky) || x.openWidth - y.openWidth;
  });
}

describe('solvability parity (R-16)', () => {
  it('mjs constants match core exports', () => {
    expect(BALL_MJS).toBe(BALL_RADIUS);
    expect(EPS_MJS).toBe(SEPARATION_EPS);
    expect(MIN_MJS).toBe(MIN_TS);
    expect(MIN_TS).toBe(2 * (BALL_RADIUS + SEPARATION_EPS));
  });

  it('TS lib and CI mjs agree on every assets/levels/*.json', () => {
    const files = listLevelFiles();
    expect(files.length).toBeGreaterThanOrEqual(5);

    for (const file of files) {
      const level = loadValidated(file);
      const ts = checkTs(level);
      const mjs = checkMjs(level);

      expect(mjs.ok, `${file} ok`).toBe(ts.ok);
      expect(
        sortUnreachable(mjs.unreachableBreakables),
        `${file} unreachable`,
      ).toEqual(sortUnreachable(ts.unreachableBreakables));
      expect(
        sortWarnings(mjs.corridorWarnings),
        `${file} corridorWarnings`,
      ).toEqual(sortWarnings(ts.corridorWarnings));
    }
  });
});
