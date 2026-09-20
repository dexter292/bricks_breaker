// tests/core.purity.test.ts — catches type-only and dynamic imports that Node resolution misses
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN =
  /from\s+['"](react|react-dom|react-native|react-native-.*|@shopify\/react-native-skia.*|expo.*|@react-native.*)['"]|require\(\s*['"](react|react-native|expo)/;

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
  it('is split across enough modules to exercise cross-module worklet imports', () => {
    expect(
      walk('src/core').filter((p) => !p.includes('.test.')).length,
    ).toBeGreaterThanOrEqual(5);
  });
});
