// tests/core.purity.test.ts — catches type-only and dynamic imports that Node resolution misses
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN =
  /from\s+['"](react|react-dom|react-native|react-native-.*|@shopify\/react-native-skia.*|expo.*|@react-native.*)['"]|require\(\s*['"](react|react-native|expo)/;

/** D-13: simulation must never call host RNG or wall-clock */
const FORBIDDEN_RNG_CLOCK = /Math\.random|Date\.now|performance\.now/;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });

describe('core/ purity', () => {
  it('contains no platform imports', () => {
    const offenders = walk('src/core').filter((p) =>
      FORBIDDEN.test(readFileSync(p, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
  it('contains no Math.random or wall-clock reads (D-13)', () => {
    const offenders = walk('src/core')
      .filter((p) => !p.includes('.test.'))
      .filter((p) => FORBIDDEN_RNG_CLOCK.test(readFileSync(p, 'utf8')));
    expect(
      offenders,
      'D-13: core/ must not use Math.random, Date.now, or performance.now',
    ).toEqual([]);
  });
  it('is split across enough modules to exercise cross-module worklet imports', () => {
    expect(
      walk('src/core').filter((p) => !p.includes('.test.')).length,
    ).toBeGreaterThanOrEqual(5);
  });
});
