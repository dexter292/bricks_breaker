/**
 * N-LVL-03 — solvability lint: ship levels pass; level-02 fails (negative fixture).
 * Also globs assets/levels/*.json so new levels are gated automatically.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '../src/core/levels/validate';
import { checkSolvability } from '../src/core/levels/solvability';
import type { LevelFileV1 } from '../src/core/levels/schema';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const levelsDir = join(root, 'assets/levels');
const NEGATIVE_FIXTURE = 'level-02.json';

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

function listLevelFiles(): string[] {
  return readdirSync(levelsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

describe('levels.solvability (N-LVL-03)', () => {
  it('level-01 is reachable', () => {
    const result = checkSolvability(loadValidated('level-01.json'));
    expect(result.ok).toBe(true);
    expect(result.unreachableBreakables).toEqual([]);
  });

  it('level-02 fails reachability (steel gate negative fixture)', () => {
    const result = checkSolvability(loadValidated('level-02.json'));
    expect(result.ok).toBe(false);
    expect(result.unreachableBreakables.length).toBeGreaterThan(0);
    // Upper breakables above the full XXXXXXX row must be unreachable.
    const aboveGate = result.unreachableBreakables.filter((u) => u.row < 2);
    expect(aboveGate.length).toBeGreaterThan(0);
  });

  it('level-03 is reachable', () => {
    const result = checkSolvability(loadValidated('level-03.json'));
    expect(result.ok).toBe(true);
    expect(result.unreachableBreakables).toEqual([]);
  });

  it('all assets/levels/*.json: level-02 fails; every other level passes', () => {
    const files = listLevelFiles();
    expect(files).toContain(NEGATIVE_FIXTURE);

    for (const file of files) {
      const result = checkSolvability(loadValidated(file));
      if (file === NEGATIVE_FIXTURE) {
        expect(result.ok, `${file} must fail reachability`).toBe(false);
      } else {
        expect(
          result.ok,
          `${file} must pass reachability; unreachable=${JSON.stringify(result.unreachableBreakables)}`,
        ).toBe(true);
      }
    }
  });
});
