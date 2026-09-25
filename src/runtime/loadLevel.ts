/**
 * JS-thread level cold path (D-04, D-14): Metro-require JSON → loadAndCompile.
 * Never mutates World; never runs under a worklet.
 *
 * level-02.json remains on disk as a compile/regression + N-LVL-03 negative
 * fixture (F-02 / NH-2) but is NOT a playable LevelId — its steel gate is
 * unwinnable and must fail solvability lint.
 */

import {
  loadAndCompile,
  type CompiledLevel,
  type LevelFileV1,
  type LevelId,
  type ValidationIssue,
} from '../core';

export type { CompiledLevel, LevelFileV1, LevelId, ValidationIssue };

export type LoadLevelResult =
  | { ok: true; compiled: CompiledLevel }
  | { ok: false; issues: ValidationIssue[] };

const LEVEL_MODULES: Record<LevelId, unknown> = {
  // Metro static requires — keep literal paths (caller supplies LevelId).
  'level-01': require('../../assets/levels/level-01.json'),
  'level-03': require('../../assets/levels/level-03.json'),
  'level-04': require('../../assets/levels/level-04.json'),
  'level-05': require('../../assets/levels/level-05.json'),
  'level-06': require('../../assets/levels/level-06.json'),
};

/**
 * Validate + compile a bundled level by id (D-15 — no default; caller must pass LevelId).
 */
export function loadLevelById(id: LevelId): LoadLevelResult {
  const raw = LEVEL_MODULES[id];
  return loadAndCompile(raw);
}

/**
 * Validate + compile a *generated* board (N-END-01 / N-END-03) — the same pipeline
 * `loadLevelById` puts a bundled level through, over a caller-supplied object instead of a
 * Metro require.
 *
 * It exists for a layer reason, not a logic one: `app/` may not import `src/core` (LC-04)
 * but `runtime -> core` is LC-02, so this wrapper is the only way a host-generated board
 * reaches the compile pipeline. Reuses `LoadLevelResult` — a second result shape would
 * make the host branch on which compile path it took.
 */
export function compileGeneratedLevel(raw: LevelFileV1): LoadLevelResult {
  return loadAndCompile(raw);
}
