---
phase: C2-level-select-stars-replay
plan: 00
type: execute
wave: 0
depends_on: []
files_modified:
  - src/services/storage/types.ts
  - src/services/storage/stars.ts
  - src/services/storage/index.ts
  - tests/storage.progress-v3.test.ts
  - tests/ui/SelectScreen.test.tsx
  - tests/ui/PlayingHost.next-bake.test.ts
  - tests/ui/ResultOverlay.test.tsx
  - .planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md
autonomous: true
requirements:
  - N-PROG-03
  - N-LVL-02
  - N-PROG-04
must_haves:
  truths:
    - "computeStars clamps lives to 1–3 (0→1, 5→3, non-finite→1)"
    - "mergeLevelBest maxes score always; stars only on win; lose preserves prior stars"
    - "selectRowState maps locked / uncleared / cleared from unlocked + stars present"
    - "Wave 0 Vitest files exist so Plans 01–03 have automated verify targets"
  artifacts:
    - path: "src/services/storage/stars.ts"
      provides: "computeStars / mergeLevelBest / selectRowState"
      exports: ["computeStars", "mergeLevelBest", "selectRowState", "StarCount", "LevelBest"]
    - path: "tests/storage.progress-v3.test.ts"
      provides: "N-PROG-03 Nyquist stubs + stars GREEN"
    - path: "tests/ui/SelectScreen.test.tsx"
      provides: "N-LVL-02 stub suite"
    - path: "tests/ui/PlayingHost.next-bake.test.ts"
      provides: "D-03 bake stub suite"
    - path: "tests/ui/ResultOverlay.test.tsx"
      provides: "N-PROG-04 Next/stars stub suite"
  key_links:
    - from: "C2-VALIDATION.md Wave 0"
      to: "tests/storage.progress-v3.test.ts"
      via: "automated vitest path resolves"
      pattern: "storage\\.progress-v3"
    - from: "stars.ts"
      to: "LevelId / unlocked helpers"
      via: "selectRowState uses isUnlocked"
      pattern: "selectRowState|computeStars|mergeLevelBest"
---

<objective>
Wave 0 contracts: lock pure star helpers + LevelBest types, create progress-v3 + UI Vitest stubs (GREEN for stars/rowState; `it.todo` for migrate/store/Select/Next/bake), mark VALIDATION Wave 0 complete.

Purpose: Later plans must not invent star formula or row-state rules; Nyquist files must exist before v3 store / Select / Next implementation.
Output: `stars.ts` + additive types + four test files + VALIDATION `wave_0_complete: true`.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-CONTEXT.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-RESEARCH.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-PATTERNS.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-UI-SPEC.md
@src/services/storage/types.ts
@src/services/storage/unlock.ts
@src/services/storage/compareBest.ts
@tests/storage.progress-v2.test.ts
@tests/ui/TitleScreen.test.tsx
@tests/ui/PlayingHost.bake-gate.test.ts

<interfaces>
<!-- Contracts this plan CREATES — implement exactly (D-04…D-08, D-18, D-23). Do NOT flip ProgressBlob to v3 yet (Plan 01). -->

```typescript
// src/services/storage/types.ts — ADD alongside existing v2 ProgressBlob (do not change PROGRESS_VERSION yet)
export type StarCount = 1 | 2 | 3;
export type LevelBest = {
  score: number;
  /** Present only after ≥1 win (D-05 / discretion omit until win). */
  stars?: StarCount;
};

// src/services/storage/stars.ts — NEW pure helpers (no I/O, no React)
export type SelectRowState = 'locked' | 'uncleared' | 'cleared';

export function computeStars(livesRemaining: number): StarCount;
// floor; non-finite → 1; clamp Math.max(1, Math.min(3, n))

export function mergeLevelBest(
  prev: LevelBest | undefined,
  score: number,
  starsFromWin: StarCount | null, // null on lose
): LevelBest;
// score = max(prev.score, floor(score)); stars only when starsFromWin != null;
// on lose: preserve prev.stars if present, else omit stars

export function selectRowState(
  id: LevelId,
  unlocked: readonly LevelId[],
  best: LevelBest | undefined,
): SelectRowState;
// locked if !isUnlocked; cleared iff best?.stars ∈ {1,2,3}; else uncleared
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: stars.ts + LevelBest types + progress-v3 GREEN/todos</name>
  <files>src/services/storage/types.ts, src/services/storage/stars.ts, src/services/storage/index.ts, tests/storage.progress-v3.test.ts</files>
  <read_first>.planning/post-mvp/phases/C2-level-select-stars-replay/C2-CONTEXT.md, .planning/post-mvp/phases/C2-level-select-stars-replay/C2-RESEARCH.md, src/services/storage/types.ts, src/services/storage/compareBest.ts, src/services/storage/unlock.ts, tests/storage.progress-v2.test.ts</read_first>
  <behavior>
    - computeStars(1|2|3) → same; computeStars(0) → 1; computeStars(5) → 3; computeStars(NaN) → 1
    - mergeLevelBest(undefined, 100, 2) → { score: 100, stars: 2 }
    - mergeLevelBest({ score: 50, stars: 3 }, 40, 1) → { score: 50, stars: 3 } (max both)
    - mergeLevelBest({ score: 50, stars: 2 }, 80, null) → { score: 80, stars: 2 } (lose: score max, stars preserved)
    - mergeLevelBest(undefined, 10, null) → { score: 10 } (no stars key)
    - selectRowState locked / uncleared (unlocked, no stars) / cleared (stars 1–3)
    - defaultProgressBlob / PROGRESS_VERSION remain v2 until Plan 01 (do not break progress-v2 suite)
  </behavior>
  <action>
Per **D-04, D-07, D-08, D-18, D-23** and RESEARCH Pattern 2:

1. Add `StarCount` + `LevelBest` to `types.ts` **without** changing `PROGRESS_VERSION` / `PROGRESS_KEY` / `ProgressBlob` (still v2). Plan 01 owns the schema bump.

2. Create `stars.ts` with `computeStars`, `mergeLevelBest`, `selectRowState` (use `isUnlocked` from `unlock.ts`). No AsyncStorage, no React.

3. Export new symbols from `index.ts` barrel.

4. Create `tests/storage.progress-v3.test.ts`:
   - Real `it`/`expect` for computeStars / mergeLevelBest / selectRowState (this task GREEN)
   - `it.todo` for Plan 01 (do not implement):
     - `migrateOrDefault: v1→v3 seeds bestScore; unlocked=[level-01]; empty bestByLevel`
     - `migrateOrDefault: v2→v3 preserves unlocked + maps number→{score} omit stars`
     - `migrateOrDefault: valid v3 preferred over v2/v1`
     - `parseProgressResult: corrupt v3 → defaults; never throw`
     - `mergeHighWatermark: corrupt disk must not lower memory score/stars`
     - `recordRunEnd: win merges max(stars); lose does not write stars; returns blob`
     - `PROGRESS_KEY === '@nbb/progress/v3'` and `PROGRESS_VERSION === 3`

Avoid: flipping ProgressBlob to v3; AsyncStorage write-through; SelectScreen UI; PlayingHost; deleting v1/v2 keys; score-band stars (E2).
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/storage.progress-v3.test.ts tests/storage.progress-v2.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function computeStars|export function mergeLevelBest|export function selectRowState" src/services/storage/stars.ts` matches
    - `rg "export type LevelBest|export type StarCount" src/services/storage/types.ts` matches
    - `rg "PROGRESS_VERSION = 2|PROGRESS_KEY = '@nbb/progress/v2'" src/services/storage/types.ts` still matches (v2 unchanged)
    - `rg "it\\.todo" tests/storage.progress-v3.test.ts` matches ≥5 Plan-01 todos
    - Vitest both suites exit 0; stars describes have real expects
    - No `react` / `react-native` / AsyncStorage imports in `stars.ts`
  </acceptance_criteria>
  <done>Pure star helpers + LevelBest types tested green; migrate/store todos reserved for Plan 01.</done>
</task>

<task type="auto">
  <name>Task 2: UI Nyquist stubs + VALIDATION Wave 0</name>
  <files>tests/ui/SelectScreen.test.tsx, tests/ui/PlayingHost.next-bake.test.ts, tests/ui/ResultOverlay.test.tsx, .planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md</files>
  <read_first>.planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md, tests/ui/TitleScreen.test.tsx, tests/ui/PlayingHost.bake-gate.test.ts, tests/ui/GameScreen.test.tsx, .planning/post-mvp/phases/C2-level-select-stars-replay/C2-UI-SPEC.md</read_first>
  <action>
Per **D-03, D-11, D-12, D-18, D-20, D-21** and VALIDATION Wave 0 checklist:

1. Create stub test files that **exist and run** (exit 0) with `it.todo` (or one trivial smoke `it` + todos) for Plans 02–03:
   - `tests/ui/SelectScreen.test.tsx` — todos: three row states; locked tap no `onChoose`; mount calls `getSnapshot`; Back → `onBack`
   - `tests/ui/PlayingHost.next-bake.test.ts` — todos: after Next / levelId change, `setActive(true)` is last call (mock `useGameLoop`); source contract: Next callback must not contain `setActive(true)`
   - `tests/ui/ResultOverlay.test.tsx` — todos: win + `onNext` shows Next; win without `onNext` / level-06 omit Next; lose no Next; win shows ★/☆ when `stars` set

2. Update `C2-VALIDATION.md`:
   - Frontmatter: `wave_0_complete: true` (leave `nyquist_compliant: false`)
   - Check Wave 0 boxes for progress-v3, stars.ts, SelectScreen stub, next-bake stub, ResultOverlay stub
   - Fill Per-Task Verification Map rows for `C2-W0-*` File Exists ✅
   - Confirm Phase Requirements → Test Map "File Exists?" for new files is ✅ (stubs count as exist)

Avoid: implementing SelectScreen / ResultOverlay / PlayingHost; flipping storage schema; device UAT.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; test -f tests/ui/SelectScreen.test.tsx && test -f tests/ui/PlayingHost.next-bake.test.ts && test -f tests/ui/ResultOverlay.test.tsx && rg -n "wave_0_complete: true" .planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md && npx vitest run tests/storage.progress-v3.test.ts tests/ui/SelectScreen.test.tsx tests/ui/PlayingHost.next-bake.test.ts tests/ui/ResultOverlay.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - All three UI stub files exist
    - VALIDATION frontmatter `wave_0_complete: true`
    - Vitest exits 0 (todos allowed; no failing expects)
    - Wave 0 checklist items for stubs + stars checked
  </acceptance_criteria>
  <done>Nyquist Wave 0 documented complete for C2; UI stubs reserved for Plans 02–03.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Pure stars / row-state helpers | Deterministic only — no trust of caller beyond number/LevelId unions |
| Device AsyncStorage ↔ app (later plans) | Untrusted JSON — not touched in Wave 0 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-C2-01 | Tampering | Star formula / LevelBest shape | mitigate | Lock pure `computeStars` clamp 1–3; omit stars until win; no Object.assign from raw (parse in Plan 01) |
| T-C2-02 | Spoofing | Client unlock / stars cheat | accept | Offline single-player; no server authority (RESEARCH) |
| T-C2-03 | Denial of service | Storage I/O | accept (deferred Plan 01) | No AsyncStorage writes in Wave 0 |
</threat_model>

<verification>
`npx vitest run tests/storage.progress-v3.test.ts` (+ UI stubs) exits 0; `stars.ts` exported; VALIDATION `wave_0_complete: true`; ProgressBlob still v2.
</verification>

<success_criteria>
Wave 0 complete: star helpers green; migrate/store/UI todos present; VALIDATION updated; v2 substrate untouched.
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/C2-level-select-stars-replay/C2-00-SUMMARY.md`
</output>
