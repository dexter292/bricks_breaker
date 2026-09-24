---
phase: C1-progress-storage
plan: 02
type: execute
wave: 2
depends_on:
  - "C1-01"
files_modified:
  - app/_components/PlayingHost.tsx
  - app/_components/GameHost.tsx
  - tests/ui/GameHost.test.tsx
  - docs/ops/PROGRESS-STORAGE.md
  - .planning/post-mvp/ROADMAP-NEXT.md
autonomous: false
requirements:
  - N-PROG-01
  - N-PROG-02
must_haves:
  truths:
    - "On WON, PlayingHost calls progressStore.unlockAfterClear(levelId) fire-and-forget"
    - "On WON or LOST, if score beats per-level best, recordLevelBest(levelId, score) fire-and-forget"
    - "Results Best / New Record evaluate against getBestForLevel(active levelId), not global"
    - "Title Personal Best still uses getBest() rollup from ProgressStore singleton"
    - "OS pause still flushes ProgressStore pending write"
    - "Ops doc states catalog order + unlock-on-win + migrate rules"
  artifacts:
    - path: "app/_components/PlayingHost.tsx"
      provides: "End-of-run unlock + per-level best wire"
      contains: "createDefaultProgressStore|getBestForLevel|unlockAfterClear|recordLevelBest"
    - path: "app/_components/GameHost.tsx"
      provides: "Title rollup via ProgressStore.getBest"
    - path: "docs/ops/PROGRESS-STORAGE.md"
      provides: "Catalog + unlock + migrate operator rules"
    - path: "tests/ui/GameHost.test.tsx"
      provides: "Mock createDefaultProgressStore"
  key_links:
    - from: "PlayingHost.handleRunEnded"
      to: "ProgressStore.recordLevelBest / unlockAfterClear"
      via: "void … .catch(() => {}) cold path after SIM.WON/LOST"
      pattern: "recordLevelBest|unlockAfterClear|outcome === 'win'"
    - from: "PlayingHost preload"
      to: "getBestForLevel(levelId)"
      via: "useEffect on store + levelId"
      pattern: "getBestForLevel"
    - from: "GameHost Title effect"
      to: "createDefaultProgressStore().getBest"
      via: "shellPhase === 'title'"
      pattern: "createDefaultProgressStore"
---

<objective>
Wire ProgressStore into PlayingHost + GameHost: per-level Results Best, unlock-on-win, Title rollup, flush on pause; document catalog/unlock rules; update UI test mocks.

Purpose: N-PROG-01/02 become player-observable without C2 level-select UI.
Output: Host cold-path wiring + `docs/ops/PROGRESS-STORAGE.md` + green GameHost mock.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/C1-progress-storage/C1-CONTEXT.md
@.planning/post-mvp/phases/C1-progress-storage/C1-RESEARCH.md
@.planning/post-mvp/phases/C1-progress-storage/C1-PATTERNS.md
@.planning/post-mvp/phases/C1-progress-storage/C1-01-SUMMARY.md
@app/_components/PlayingHost.tsx
@app/_components/GameHost.tsx
@src/runtime/overlays/ResultOverlay.tsx
@tests/ui/GameHost.test.tsx
@src/services/storage/index.ts

<interfaces>
```typescript
// ProgressStore (Plan 01) — hosts use these only
createDefaultProgressStore(): ProgressStore;
store.getBest(): Promise<number>;
store.getBestForLevel(id: LevelId): Promise<number>;
store.recordLevelBest(id: LevelId, score: number): Promise<void>;
store.unlockAfterClear(id: LevelId): Promise<void>;
store.flush?.(): Promise<void>;

evaluatePersonalBest(runScore, previousBest): { best, isNewRecord };

// PlayingHost already has:
const [levelId, setLevelId] = useState<LevelId>('level-03'); // KEEP default (discretion / RESEARCH OQ1)
// handleRunEnded(runScore, outcome: 'win' | 'lose')
// previousBestRef + setResultBest + setIsNewRecord
// onOsPause → store.flush?.()

// ResultOverlay — no chrome change required; still Best · {best}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: PlayingHost + GameHost ProgressStore wire</name>
  <files>app/_components/PlayingHost.tsx, app/_components/GameHost.tsx, tests/ui/GameHost.test.tsx</files>
  <read_first>app/_components/PlayingHost.tsx, app/_components/GameHost.tsx, tests/ui/GameHost.test.tsx, src/services/storage/index.ts, .planning/post-mvp/phases/C1-progress-storage/C1-CONTEXT.md</read_first>
  <action>
Per **D-04, D-05, D-06, D-07, D-10, D-11** (Results per-level in C1 — locked discretion):

### PlayingHost
1. Replace `createDefaultPersonalBestStore` with `createDefaultProgressStore` (same `useMemo` singleton pattern).
2. Preload effect: depend on `[store, levelId]`; call `getBestForLevel(levelId)` into `previousBestRef` + `setResultBest`. On `levelId` change (DEV toggle), refresh so New Record is not stale vs global (RESEARCH pitfall 1).
3. `handleRunEnded(runScore, outcome)`:
   - `evaluatePersonalBest(runScore, previousBestRef.current)` as today for Results badge
   - If `record`: update ref + `void store.recordLevelBest(levelId, best).catch(() => {})` — **not** `setBest`
   - If `outcome === 'win'`: `void store.unlockAfterClear(levelId).catch(() => {})` — **never** on lose (D-04)
   - Keep platform `onRunEnded` payload unchanged (optional `levelId` field **out of scope** unless trivial — skip)
4. `onOsPause`: `void store.flush?.().catch(() => {})` against ProgressStore.
5. DEV level cycle: import `PLAYABLE_LEVEL_ORDER` from storage catalog (or re-export) instead of local duplicated array — single source of truth (D-01).
6. Do **not** change default `levelId` from `'level-03'`; do **not** gate Play on `isUnlocked` (C2); do **not** add level-select UI; do **not** change serve.

### GameHost
1. Swap Title store to `createDefaultProgressStore`; keep `getBest()` for Title “Personal Best” rollup (D-07).
2. Existing `shellPhase === 'title'` re-fetch stays — ensures Menu→Title sees updated rollup.

### Tests
1. Update `tests/ui/GameHost.test.tsx` mock:
   ```typescript
   vi.mock('../../src/services/storage', () => ({
     createDefaultProgressStore: () => ({
       getBest: () => Promise.resolve(7),
     }),
   }));
   ```
   Remove `createDefaultPersonalBestStore` mock unless still imported.

Avoid: ResultOverlay redesign; stars; lock icons; aimed serve; Sentry.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/storage.progress-v2.test.ts tests/storage.personal-best.test.ts tests/ui/GameHost.test.tsx && rg -n "createDefaultProgressStore|getBestForLevel|recordLevelBest|unlockAfterClear" app/_components/PlayingHost.tsx && rg -n "createDefaultProgressStore" app/_components/GameHost.tsx && rg -n "outcome === 'win'|outcome === \"win\"" app/_components/PlayingHost.tsx</automated>
  </verify>
  <acceptance_criteria>
    - PlayingHost has no `createDefaultPersonalBestStore` / `setBest` call sites for end-of-run
    - Unlock call is gated on win only (`rg` shows unlockAfterClear only inside win branch)
    - Preload uses `getBestForLevel` and effect deps include `levelId`
    - GameHost uses ProgressStore `getBest`
    - GameHost UI test exits 0
    - ResultOverlay file unchanged (wire-only via props) unless a one-line comment — prefer zero chrome edits
  </acceptance_criteria>
  <done>Hosts persist unlock-on-win + per-level best; Title rollup; Results per-level Best.</done>
</task>

<task type="auto">
  <name>Task 2: Ops doc + roadmap progress note</name>
  <files>docs/ops/PROGRESS-STORAGE.md, .planning/post-mvp/ROADMAP-NEXT.md, .planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md</files>
  <read_first>docs/ops/POWERUPS-B2.md, .planning/post-mvp/ROADMAP-NEXT.md, .planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md</read_first>
  <action>
1. Create `docs/ops/PROGRESS-STORAGE.md` (analog POWERUPS-B2 short tables):
   - Status: C1 storage live
   - Catalog order table (D-01): `level-01 → 03 → 04 → 05 → 06`; `level-02` negative fixture only
   - Unlock: WON only unlocks next; lose does not (D-04)
   - Per-level best: WON|LOST if score &gt; stored (D-05); Title = max rollup (D-07)
   - Keys: `@nbb/progress/v2`; migrate from `@nbb/personal-best/v1` seeds `bestScore` only; v1 key retained
   - Fail-soft + flush on AppState pause
   - Explicit **not in C1**: level select / stars / play gating (C2)

2. Update ROADMAP-NEXT Phase C1 **Progress** line to note plans executed / storage landed (checkbox style consistent with other Done rows) — only after this plan’s code is in; if executing mid-phase, set “In progress — plans C1-00…02” then flip to Done when verify passes. Executor: mark **Done** when Task 1 green.

3. Touch VALIDATION.md: mark C1-02 rows File Exists / status as appropriate; leave `nyquist_compliant` for verify-work.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; test -f docs/ops/PROGRESS-STORAGE.md && rg -n "level-01 →|@nbb/progress/v2|WON|unlock" docs/ops/PROGRESS-STORAGE.md && rg -n "C1-00-PLAN|C1-01-PLAN|C1-02-PLAN|Progress Storage" .planning/post-mvp/ROADMAP-NEXT.md && npm test</automated>
  </verify>
  <acceptance_criteria>
    - Ops doc exists with catalog order, unlock-on-win, migrate, and C2 out-of-scope called out
    - ROADMAP-NEXT C1 section references plan files or Done status
    - Full `npm test` exits 0
  </acceptance_criteria>
  <done>Operator docs + roadmap updated; full suite green.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Device smoke — unlock + per-level Best</name>
  <files>.planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md</files>
  <read_first>.planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md, docs/ops/PROGRESS-STORAGE.md</read_first>
  <what-built>
    ProgressStore v2 with migrate, PlayingHost unlock-on-win + per-level Results Best, Title rollup Best.
  </what-built>
  <action>
Pause for human device smoke against N-PROG-01/02. Do not change gameplay code during this checkpoint unless the user reports failures. After approval, mark Manual-Only rows in `C1-VALIDATION.md` as checked and append `Human UAT: approved YYYY-MM-DD` (leave `nyquist_compliant` for verify-work).
  </action>
  <how-to-verify>
    1. Launch on iOS (dev-client with AsyncStorage native linked).
    2. Play level-01 (DEV toggle if needed), **win** — note Results Best / New Record for that level.
    3. Force-quit and relaunch — Title Best should reflect rollup; unlock of next should persist (confirm via second win path or __DEV__ snapshot if available).
    4. **Lose** a run on a mid level — confirm next level does not unlock (store/docs expectation).
    5. Beat a low level best while global PB is higher — Results should still show New Record for that level.
    6. Airplane mode: Title→Play→Win→Menu still works.
  </how-to-verify>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/storage.progress-v2.test.ts tests/storage.personal-best.test.ts tests/ui/GameHost.test.tsx</automated>
  </verify>
  <resume-signal>Type "approved" or list issues</resume-signal>
  <acceptance_criteria>
    - User replies `approved` OR a written defect list
    - If approved: `C1-VALIDATION.md` contains `Human UAT: approved`
  </acceptance_criteria>
  <done>Human confirmed unlock durability + per-level Results Best on device.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Chrome WON/LOST → ProgressStore | Discrete cold path only; never worklet |
| Title/Results UI ← store numbers | Display-only; no privileged unlock UI in C1 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-C1-03 | Denial of service | handleRunEnded | mitigate | Fire-and-forget void.catch; runEndedRef once-per-run; no await in reaction |
| T-C1-05 | Tampering | Client-side unlocks | accept | Offline single-player; C2 may read isUnlocked — no server authority |
| T-C1-06 | Elevation of privilege | Default level-03 playable while later locked in store | accept | Intentional until C2 select (CONTEXT pitfall 5 / RESEARCH OQ1) — document in ops doc |
</threat_model>

<verification>
Storage + GameHost vitest green; PlayingHost/GameHost use ProgressStore; ops doc present; full `npm test` green; human device smoke for durability.
</verification>

<success_criteria>
N-PROG-01 unlock-on-clear offline and N-PROG-02 per-level Results Best are wired; Title rollup honest; C2 UI not built; docs published.
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/C1-progress-storage/C1-02-SUMMARY.md`
</output>
