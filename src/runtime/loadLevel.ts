/**
 * JS-thread level cold path (D-04, D-14): Metro-require JSON → loadAndCompile.
 * Never mutates World; never runs under a worklet.
 *
 * level-02.json remains on disk as a compile/regression fixture (F-02 / NH-2)
 * but is NOT a playable LevelId — its steel gate is unwinnable with the 8° floor.
 */

import {
  loadAndCompile,
  type CompiledLevel,
  type ValidationIssue,
} from '../core';

export type { CompiledLevel, ValidationIssue };

/** Playable bundled levels only (NH-2). */
export type LevelId = 'level-01' | 'level-03';

export type LoadLevelResult =
  | { ok: true; compiled: CompiledLevel }
  | { ok: false; issues: ValidationIssue[] };

const LEVEL_MODULES: Record<LevelId, unknown> = {
  // Metro static requires — keep literal paths (D-06 default is level-03).
  'level-01': require('../../assets/levels/level-01.json'),
  'level-03': require('../../assets/levels/level-03.json'),
};

/**
 * Validate + compile a bundled level by id. Default id is level-03 (D-06).
 */
export function loadLevelById(id: LevelId = 'level-03'): LoadLevelResult {
  const raw = LEVEL_MODULES[id];
  return loadAndCompile(raw);
}
