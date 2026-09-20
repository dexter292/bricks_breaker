/**
 * JS-thread load pipeline: validate → migrate → compile (D-04, D-13).
 * Never mutates World. Fail-closed before compile on validation errors.
 */

import { compileLevel } from './compile';
import { migrateLevel } from './migrations';
import type { CompiledLevel, ValidationIssue } from './schema';
import { validateLevel } from './validate';

export function loadAndCompile(
  raw: unknown,
): { ok: true; compiled: CompiledLevel } | { ok: false; issues: ValidationIssue[] } {
  const v = validateLevel(raw);
  if (!v.ok) {
    return v;
  }
  const migrated = migrateLevel(v.value);
  return { ok: true, compiled: compileLevel(migrated) };
}
