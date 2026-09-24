---
phase: C1-progress-storage
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - src/services/storage/types.ts
  - src/services/storage/catalog.ts
  - src/services/storage/unlock.ts
  - src/services/storage/index.ts
  - tests/storage.progress-v2.test.ts
  - .planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md
autonomous: true
requirements:
  - N-PROG-01
  - N-PROG-02
must_haves:
  truths:
    - "PLAYABLE_LEVEL_ORDER is level-01 → 03 → 04 → 05 → 06 with no level-02"
    - "nextLevelId('level-01') === 'level-03'; next after level-06 is null"
    - "unlockAfterClear unlocks next only; idempotent if already unlocked"
    - "Wave 0 Vitest file exists so Plans 01–02 have automated verify targets"
  artifacts:
    - path: "src/services/storage/types.ts"
      provides: "PROGRESS_KEY / ProgressBlob / ProgressStore contracts"
      contains: "PROGRESS_KEY|ProgressBlob|ProgressStore"
    - path: "src/services/storage/catalog.ts"
      provides: "PLAYABLE_LEVEL_ORDER + nextLevelId"
      exports: ["PLAYABLE_LEVEL_ORDER", "nextLevelId", "defaultUnlocked"]
    - path: "src/services/storage/unlock.ts"
      provides: "pure unlockAfterClear / isUnlocked"
      exports: ["unlockAfterClear", "isUnlocked"]
    - path: "tests/storage.progress-v2.test.ts"
      provides: "N-PROG-01/02 Nyquist stubs + catalog GREEN"
  key_links:
    - from: "C1-VALIDATION.md Wave 0"
      to: "tests/storage.progress-v2.test.ts"
      via: "automated vitest path resolves"
      pattern: "storage\\.progress-v2"
    - from: "catalog.ts"
      to: "LevelId"
      via: "import type from runtime/loadLevel"
      pattern: "LevelId|PLAYABLE_LEVEL_ORDER"
---

<objective>
Wave 0 contracts: lock ProgressBlob / ProgressStore types, export playable catalog + pure unlock helpers, and create the progress-v2 Vitest suite (GREEN for catalog/unlock; `it.todo` for parse/migrate/store).

Purpose: Later plans must not invent unlock order or blob shape; Nyquist file must exist before store implementation.
Output: types + catalog + unlock + barrel exports + progress-v2 test file + VALIDATION Wave 0 marked complete.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/C1-progress-storage/C1-CONTEXT.md
@.planning/post-mvp/phases/C1-progress-storage/C1-RESEARCH.md
@.planning/post-mvp/phases/C1-progress-storage/C1-PATTERNS.md
@.planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md
@src/services/storage/types.ts
@src/services/storage/index.ts
@src/runtime/loadLevel.ts
@tests/storage.personal-best.test.ts

<interfaces>
<!-- Contracts this plan CREATES — implement exactly (D-01…D-11; Claude discretion locked here). -->

```typescript
// src/services/storage/types.ts — ADD alongside existing v1 types (do not delete PERSONAL_BEST_*)
import type { LevelId } from '../../runtime/loadLevel';

export const PROGRESS_VERSION = 2 as const;
export const PROGRESS_KEY = '@nbb/progress/v2' as const;

export type ProgressBlob = {
  v: 2;
  /** Always includes 'level-01'; catalog order; never level-02 */
  unlocked: LevelId[];
  /** Sparse map; missing key ⇒ best 0 */
  bestByLevel: Partial<Record<LevelId, number>>;
  /** Rolled-up Title PB = max(values) maintained on write (D-07) */
  bestScore: number;
  updatedAt: number;
};

export function defaultProgressBlob(): ProgressBlob;

export interface ProgressStore {
  getBest(): Promise<number>; // Title rollup
  getBestForLevel(id: LevelId): Promise<number>;
  recordLevelBest(id: LevelId, score: number): Promise<void>;
  unlockAfterClear(id: LevelId): Promise<void>;
  isUnlocked(id: LevelId): Promise<boolean>;
  getSnapshot(): Promise<ProgressBlob>;
  flush?(): Promise<void>;
}

// src/services/storage/catalog.ts
export const PLAYABLE_LEVEL_ORDER: readonly LevelId[] = [
  'level-01', 'level-03', 'level-04', 'level-05', 'level-06',
] as const;
export function nextLevelId(id: LevelId): LevelId | null;
export function defaultUnlocked(): LevelId[]; // ['level-01']

// src/services/storage/unlock.ts — pure (no I/O)
export function unlockAfterClear(
  unlocked: readonly LevelId[],
  cleared: LevelId,
): LevelId[];
export function isUnlocked(
  unlocked: readonly LevelId[],
  id: LevelId,
): boolean; // level-01 always true
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Progress types + catalog + unlock pure (GREEN)</name>
  <files>src/services/storage/types.ts, src/services/storage/catalog.ts, src/services/storage/unlock.ts, src/services/storage/index.ts, tests/storage.progress-v2.test.ts</files>
  <read_first>.planning/post-mvp/phases/C1-progress-storage/C1-CONTEXT.md, .planning/post-mvp/phases/C1-progress-storage/C1-RESEARCH.md, src/services/storage/types.ts, src/runtime/loadLevel.ts, tests/storage.personal-best.test.ts</read_first>
  <behavior>
    - PLAYABLE_LEVEL_ORDER length 5; never includes 'level-02'
    - nextLevelId('level-01') → 'level-03'; nextLevelId('level-06') → null; unknown/non-playable → null
    - unlockAfterClear(['level-01'], 'level-01') → includes 'level-03'; does not add 'level-02'
    - unlockAfterClear already-unlocked next → unchanged set (idempotent)
    - isUnlocked(_, 'level-01') → true always; locked id → false until present
    - defaultProgressBlob(): v===2, unlocked=['level-01'], bestByLevel={}, bestScore=0
  </behavior>
  <action>
Per **D-01, D-02** (catalog unlock chain) and RESEARCH recommended shapes:

1. Extend `types.ts` with `PROGRESS_VERSION`, `PROGRESS_KEY = '@nbb/progress/v2'`, `ProgressBlob`, `defaultProgressBlob()`, `ProgressStore`. Keep all v1 `PERSONAL_BEST_*` exports unchanged (migrate source in Plan 01).

2. Create `catalog.ts` exporting `PLAYABLE_LEVEL_ORDER`, `nextLevelId`, `defaultUnlocked` matching PlayingHost DEV order exactly (D-01). Import `LevelId` from `src/runtime/loadLevel` — do **not** redefine the union.

3. Create `unlock.ts` with pure `unlockAfterClear` / `isUnlocked`. Rules:
   - Next id from `nextLevelId(cleared)` only (never numeric filename sort)
   - `level-01` always treated unlocked in `isUnlocked`
   - No I/O, no React, no AsyncStorage

4. Export new symbols from `index.ts` barrel alongside existing PB exports.

5. Create `tests/storage.progress-v2.test.ts`:
   - Real `it`/`expect` for catalog + unlock + `defaultProgressBlob` (this task GREEN)
   - `it.todo` cases for Plan 01 (do not implement yet):
     - `parseProgressResult: null → absent defaults`
     - `parseProgressResult: corrupt JSON / wrong v / bad unlocked → corrupt`
     - `migrateOrDefault: v1-only seeds bestScore; unlocked=[level-01]; empty bestByLevel`
     - `migrateOrDefault: valid v2 preferred over v1`
     - `memory ProgressStore: recordLevelBest strict >; rollup bestScore`
     - `memory ProgressStore: unlockAfterClear on win semantics (store method)`
     - `createDefaultProgressStore singleton identity`
   - Do **not** import AsyncStorage. Do **not** touch PlayingHost/GameHost (Plan 02).

Avoid: C2 level select, stars fields on blob, aimed serve, Sentry, deleting v1 types.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/storage.progress-v2.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "PROGRESS_KEY = '@nbb/progress/v2'" src/services/storage/types.ts` matches
    - `rg "level-02" src/services/storage/catalog.ts` returns no matches
    - `rg "PLAYABLE_LEVEL_ORDER|nextLevelId|unlockAfterClear" src/services/storage/index.ts` matches
    - Vitest exits 0; catalog/unlock describes have real expects; parse/migrate/store cases still `it.todo`
    - No import of `react` / `react-native` under new storage modules (catalog/unlock)
  </acceptance_criteria>
  <done>Contracts + catalog/unlock pure helpers tested green; store todos reserved for Plan 01.</done>
</task>

<task type="auto">
  <name>Task 2: Mark VALIDATION Wave 0 complete</name>
  <files>.planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md</files>
  <read_first>.planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md</read_first>
  <action>
Update `C1-VALIDATION.md`:
1. Frontmatter: `wave_0_complete: true` (leave `nyquist_compliant: false` until phase gate).
2. Check Wave 0 boxes for `tests/storage.progress-v2.test.ts`, `types.ts` Progress contracts, `catalog.ts`.
3. Set Per-Task rows `C1-W0-01` / `C1-W0-02` File Exists ✅; Status stub/green as appropriate.
4. Confirm Phase Requirements → Test Map "File Exists?" for progress-v2 is ✅.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; rg -n "wave_0_complete: true" .planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md && test -f tests/storage.progress-v2.test.ts && npx vitest run tests/storage.progress-v2.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - VALIDATION frontmatter `wave_0_complete: true`
    - Wave 0 checklist items for progress-v2 + catalog checked
    - Vitest still exits 0
  </acceptance_criteria>
  <done>Nyquist Wave 0 documented complete for C1.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Device AsyncStorage ↔ app cold path | Untrusted persisted JSON (handled Plan 01 parse) |
| Pure catalog/unlock helpers | Deterministic only — no trust of caller LevelId beyond union |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-C1-01 | Tampering / Integrity | Progress blob shape | mitigate | Lock typed `ProgressBlob` + catalog; reject `level-02` by type + order constant; parse validation in Plan 01 |
| T-C1-02 | Denial of service | Storage I/O | accept (deferred Plan 01–02) | No AsyncStorage writes in Wave 0 |
| T-C1-03 | Elevation of privilege | Unlock enforcement UI | accept | C1 stores unlocks only; C2 gates play — document in VALIDATION out-of-scope |
</threat_model>

<verification>
`npx vitest run tests/storage.progress-v2.test.ts` exits 0; `PROGRESS_KEY` and `PLAYABLE_LEVEL_ORDER` exported; VALIDATION `wave_0_complete: true`.
</verification>

<success_criteria>
Wave 0 complete: Progress contracts + catalog/unlock green; parse/migrate/store todos present; VALIDATION updated.
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/C1-progress-storage/C1-00-SUMMARY.md`
</output>
