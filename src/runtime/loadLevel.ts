/**
 * JS-thread level cold path (D-04, D-14): Metro-require JSON → loadAndCompile.
 * Never mutates World; never runs under a worklet.
 */

import {
  loadAndCompile,
  type CompiledLevel,
  type ValidationIssue,
} from '../core';

export type { CompiledLevel, ValidationIssue };

export type LevelId = 'level-01' | 'level-02';

export type LoadLevelResult =
  | { ok: true; compiled: CompiledLevel }
  | { ok: false; issues: ValidationIssue[] };

const LEVEL_MODULES: Record<LevelId, unknown> = {
  // Metro static requires — keep literal paths (D-12 default is level-01).
  'level-01': require('../../assets/levels/level-01.json'),
  'level-02': require('../../assets/levels/level-02.json'),
};

/**
 * Validate + compile a bundled level by id. Default id is level-01 (D-12).
 */
export function loadLevelById(id: LevelId = 'level-01'): LoadLevelResult {
  const raw = LEVEL_MODULES[id];
  return loadAndCompile(raw);
}
