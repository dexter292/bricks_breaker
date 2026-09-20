/**
 * LVL-01 — validateLevel (Plan 04-01).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MAX_BRICKS } from '../src/core/constants';
import { loadAndCompile } from '../src/core/levels/load';
import { validateLevel } from '../src/core/levels/validate';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/levels');

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as unknown;
}

function minimalValid(overrides: Record<string, unknown> = {}): unknown {
  return {
    schemaVersion: 1,
    id: 'minimal',
    name: 'Minimal',
    grid: {
      cols: 1,
      rows: 1,
      originX: 0,
      originY: 0,
      brickW: 40,
      brickH: 16,
      gapX: 0,
      gapY: 0,
    },
    brickTypes: {},
    cells: ['.'],
    ...overrides,
  };
}

describe('levels.validate', () => {
  // 04-W0-01
  it('accepts schemaVersion 1 and rejects unsupported with path schemaVersion', () => {
    const ok = validateLevel(minimalValid());
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.schemaVersion).toBe(1);
      expect(ok.value.cells).toEqual(['.']);
    }

    const bad = validateLevel(loadFixture('invalid-schema-version.json'));
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      const issue = bad.issues.find((i) => i.path === 'schemaVersion');
      expect(issue).toBeDefined();
      expect(issue!.message).toMatch(/supported:\s*1/i);
    }
  });

  // 04-W0-02
  it('rejects unknown char, bad row length, and space-in-row', () => {
    const rowLen = validateLevel(loadFixture('invalid-row-length.json'));
    expect(rowLen.ok).toBe(false);
    if (!rowLen.ok) {
      expect(rowLen.issues.some((i) => i.path.includes('cells'))).toBe(true);
    }

    const unknown = validateLevel(loadFixture('invalid-unknown-char.json'));
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.issues.some((i) => i.path.includes('cells'))).toBe(true);
    }

    const space = validateLevel(loadFixture('invalid-space-in-row.json'));
    expect(space.ok).toBe(false);
    if (!space.ok) {
      expect(space.issues.some((i) => i.path.includes('cells'))).toBe(true);
    }
  });

  // T-04-02 / T-04-04
  it('rejects non-finite grid metrics and __proto__ brickTypes key', () => {
    const nonFinite = validateLevel(loadFixture('invalid-non-finite-grid.json'));
    expect(nonFinite.ok).toBe(false);
    if (!nonFinite.ok) {
      expect(nonFinite.issues.some((i) => i.path.startsWith('grid.'))).toBe(true);
    }

    const proto = validateLevel(loadFixture('invalid-proto-key.json'));
    expect(proto.ok).toBe(false);
    if (!proto.ok) {
      expect(
        proto.issues.some(
          (i) =>
            i.path.includes('brickTypes') &&
            (i.path.includes('__proto__') || /dangerous|proto|constructor|prototype/i.test(i.message)),
        ),
      ).toBe(true);
    }
  });

  // T-04-01
  it('rejects brickCount/cols×rows over MAX_BRICKS', () => {
    const overGrid = validateLevel(
      minimalValid({
        grid: {
          cols: MAX_BRICKS + 1,
          rows: 1,
          originX: 0,
          originY: 0,
          brickW: 1,
          brickH: 1,
          gapX: 0,
          gapY: 0,
        },
        cells: ['.'.repeat(MAX_BRICKS + 1)],
      }),
    );
    expect(overGrid.ok).toBe(false);

    const cols = 17;
    const rows = 16; // 272 > 256
    const cells = Array.from({ length: rows }, () => '1'.repeat(cols));
    const overBricks = validateLevel(
      minimalValid({
        grid: {
          cols,
          rows,
          originX: 0,
          originY: 0,
          brickW: 1,
          brickH: 1,
          gapX: 0,
          gapY: 0,
        },
        brickTypes: { '1': { hp: 1 } },
        cells,
      }),
    );
    expect(overBricks.ok).toBe(false);
  });

  it('never silently trims spaces when row lengths otherwise match', () => {
    const spaced = validateLevel(
      minimalValid({
        grid: {
          cols: 3,
          rows: 1,
          originX: 0,
          originY: 0,
          brickW: 40,
          brickH: 16,
          gapX: 0,
          gapY: 0,
        },
        brickTypes: { '1': { hp: 1 } },
        cells: ['1 1'],
      }),
    );
    expect(spaced.ok).toBe(false);
    if (!spaced.ok) {
      expect(spaced.issues.some((i) => i.path.includes('cells'))).toBe(true);
    }
  });

  it('loadAndCompile returns ok:false on invalid input without invoking compile stub', () => {
    const result = loadAndCompile(loadFixture('invalid-schema-version.json'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.path === 'schemaVersion')).toBe(true);
    }
  });
});
