---
phase: C1-progress-storage
plan: 01
type: execute
wave: 1
depends_on:
  - "C1-00"
files_modified:
  - src/services/storage/parseBlob.ts
  - src/services/storage/migrateProgress.ts
  - src/services/storage/memoryStore.ts
  - src/services/storage/asyncStorageStore.ts
  - src/services/storage/index.ts
  - tests/storage.progress-v2.test.ts
autonomous: true
requirements:
  - N-PROG-01
  - N-PROG-02
must_haves:
  truths:
    - "Corrupt / invalid v2 JSON fails soft to defaults and never throws"
    - "v1-only migrate seeds bestScore and leaves unlocked at [level-01] with empty bestByLevel"
    - "Valid v2 is preferred; v1 ignored when v2 present"
    - "recordLevelBest uses strict >; rollup bestScore = max(bestByLevel values, prior bestScore)"
    - "unlockAfterClear store method adds next catalog id; lose is not a store concern"
    - "createDefaultProgressStore is a process singleton with flush + memory fallback"
  artifacts:
    - path: "src/services/storage/parseBlob.ts"
      provides: "parseProgressResult fail-soft discriminant"
      exports: ["parseProgressResult"]
    - path: "src/services/storage/migrateProgress.ts"
      provides: "migrateOrDefault(v2Raw, v1Raw)"
      exports: ["migrateOrDefault"]
    - path: "src/services/storage/asyncStorageStore.ts"
      provides: "ProgressStore AsyncStorage adapter @nbb/progress/v2 + migrate-on-read"
    - path: "tests/storage.progress-v2.test.ts"
      provides: "GREEN N-PROG-01/02 unit coverage"
  key_links:
    - from: "asyncStorageStore ProgressStore"
      to: "@nbb/progress/v2"
      via: "getItem/setItem PROGRESS_KEY; migrate reads PERSONAL_BEST_KEY once"
      pattern: "@nbb/progress/v2|PERSONAL_BEST_KEY|migrateOrDefault"
    - from: "recordLevelBest"
      to: "evaluatePersonalBest / strict >"
      via: "per-level watermark + bestScore rollup"
      pattern: "recordLevelBest|bestByLevel|bestScore"
---

<objective>
Implement fail-soft parse + v1→v2 migrate and the ProgressStore (memory + AsyncStorage singleton with migrate-on-read, high-watermark, flush). Turn all Wave 0 `it.todo` cases GREEN.

Purpose: Durable offline unlock + per-level best without blocking sim; preserve historical PB via migrate (D-08/D-09/D-10).
Output: parse/migrate modules + ProgressStore adapters + green `tests/storage.progress-v2.test.ts`.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/C1-progress-storage/C1-CONTEXT.md
@.planning/post-mvp/phases/C1-progress-storage/C1-RESEARCH.md
@.planning/post-mvp/phases/C1-progress-storage/C1-PATTERNS.md
@.planning/post-mvp/phases/C1-progress-storage/C1-00-SUMMARY.md
@src/services/storage/types.ts
@src/services/storage/catalog.ts
@src/services/storage/unlock.ts
@src/services/storage/parseBlob.ts
@src/services/storage/asyncStorageStore.ts
@src/services/storage/memoryStore.ts
@tests/storage.personal-best.test.ts

<interfaces>
<!-- From Plan 00 + existing F-26 patterns — implement against these. -->

```typescript
// Existing — keep working for migrate + personal-best tests
export function parsePersonalBestResult(raw: string | null): ParseBestResult;
export function createDefaultPersonalBestStore(): PersonalBestStore;

// Plan 00
export const PROGRESS_KEY = '@nbb/progress/v2';
export type ProgressBlob = { v: 2; unlocked: LevelId[]; bestByLevel: Partial<Record<LevelId, number>>; bestScore: number; updatedAt: number };
export interface ProgressStore { getBest(): Promise<number>; getBestForLevel(id: LevelId): Promise<number>; recordLevelBest(id: LevelId, score: number): Promise<void>; unlockAfterClear(id: LevelId): Promise<void>; isUnlocked(id: LevelId): Promise<boolean>; getSnapshot(): Promise<ProgressBlob>; flush?(): Promise<void>; }
export function unlockAfterClear(unlocked: readonly LevelId[], cleared: LevelId): LevelId[];
export function evaluatePersonalBest(runScore: number, previousBest: number): { best: number; isNewRecord: boolean };

// This plan adds
export type ParseProgressResult =
  | { status: 'ok'; progress: ProgressBlob }
  | { status: 'absent'; progress: ProgressBlob }  // defaults
  | { status: 'corrupt'; progress: ProgressBlob }; // defaults — caller must NOT clobber watermark

export function parseProgressResult(raw: string | null): ParseProgressResult;
export function migrateOrDefault(v2Raw: string | null, v1Raw: string | null): ProgressBlob;
export function createMemoryProgressStore(seed?: ProgressBlob): ProgressStore;
export function createDefaultProgressStore(): ProgressStore;
export function __resetSharedProgressStoreForTests(): void;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: parseProgressResult + migrateOrDefault (GREEN todos)</name>
  <files>src/services/storage/parseBlob.ts, src/services/storage/migrateProgress.ts, src/services/storage/index.ts, tests/storage.progress-v2.test.ts</files>
  <read_first>src/services/storage/parseBlob.ts, src/services/storage/types.ts, src/services/storage/catalog.ts, .planning/post-mvp/phases/C1-progress-storage/C1-RESEARCH.md, tests/storage.progress-v2.test.ts</read_first>
  <behavior>
    - parseProgressResult(null) → status 'absent', progress === defaultProgressBlob() shape (unlocked=['level-01'])
    - corrupt JSON / v!==2 / non-array unlocked / non-object bestByLevel / non-finite scores → status 'corrupt', defaults (never throw)
    - ok blob: floor scores; drop unknown LevelIds from unlocked/bestByLevel; ensure level-01 in unlocked
    - migrateOrDefault(null, v1ok) → bestScore=v1.best, unlocked=['level-01'], bestByLevel={}
    - migrateOrDefault(validV2, anything) → returns parsed v2 (ignore v1)
    - migrateOrDefault(null, null) → defaultProgressBlob()
    - migrateOrDefault(corruptV2, v1ok) → treat like absent v2: seed from v1 (do not lose PB)
  </behavior>
  <action>
Per **D-08, D-09** and PATTERNS migrate pseudocode:

1. Add `parseProgressResult` in `parseBlob.ts` (keep `parsePersonalBestResult` intact). Validate field-by-field — no `Object.assign` from raw (T-C1-01). On corrupt/absent return `defaultProgressBlob()` inside the result object.

2. Create `migrateProgress.ts` with pure `migrateOrDefault(v2Raw, v1Raw)`:
   - If v2 `ok` → return that progress
   - If v2 absent **or corrupt**, try v1 via `parsePersonalBestResult`; on v1 ok seed `bestScore` only (D-08 — do **not** invent `bestByLevel` attribution)
   - Else defaults
   - Prefer writing this pure function so Vitest needs no AsyncStorage

3. Export from barrel. Convert matching `it.todo` → real tests. Keep personal-best suite green.

Avoid: deleting v1 key; stars fields; network; AsyncStorage 3.x / `createAsyncStorage`.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/storage.progress-v2.test.ts tests/storage.personal-best.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "parseProgressResult|migrateOrDefault" src/services/storage/` matches implementations + barrel
    - `rg "it\\.todo\\('parseProgressResult|it\\.todo\\('migrateOrDefault" tests/storage.progress-v2.test.ts` returns no matches
    - Vitest exits 0 for both storage suites
  </acceptance_criteria>
  <done>Fail-soft parse + v1→v2 migrate pure helpers tested green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Memory + AsyncStorage ProgressStore singleton</name>
  <files>src/services/storage/memoryStore.ts, src/services/storage/asyncStorageStore.ts, src/services/storage/index.ts, tests/storage.progress-v2.test.ts</files>
  <read_first>src/services/storage/asyncStorageStore.ts, src/services/storage/memoryStore.ts, src/services/storage/migrateProgress.ts, src/services/storage/unlock.ts, .planning/post-mvp/phases/C1-progress-storage/C1-PATTERNS.md</read_first>
  <behavior>
    - createMemoryProgressStore: getBestForLevel missing → 0; recordLevelBest(100) then get → 100; equal/lower no change; bestScore rollup updates to max
    - unlockAfterClear('level-01') → isUnlocked('level-03') true; second call idempotent; does not unlock level-02
    - getSnapshot returns deep-enough copy of current blob fields
    - createDefaultProgressStore() === createDefaultProgressStore() (singleton); __resetSharedProgressStoreForTests clears
    - Async path (injectable AsyncStorageLike in tests OR memory when VITEST): first get with only v1 key → migrateOrDefault then optional write-through v2; subsequent gets prefer v2
    - corrupt v2 read must not lower in-memory bestScore / bestByLevel watermarks (F-26 pitfall)
    - flush() re-attempts pendingWrite; memory flush no-op
    - Existing createDefaultPersonalBestStore still works (do not break PB tests) — may share native probe helpers
  </behavior>
  <action>
Per **D-03, D-05, D-07, D-08, D-10, D-11** and F-26 singleton pattern:

1. Extend `memoryStore.ts` with `createMemoryProgressStore(seed?)` implementing full `ProgressStore`. Use pure `unlockAfterClear` from unlock.ts. `recordLevelBest`: floor score; only update if `score > (bestByLevel[id] ?? 0)`; set `bestScore = max(bestScore, newLevelBest)`.

2. Evolve `asyncStorageStore.ts`:
   - Add `sharedProgressStore` singleton + `createDefaultProgressStore` + `__resetSharedProgressStoreForTests`
   - Reuse existing `loadAsyncStorage` / native probe / VITEST early-return → memory fallback (identical soft-fail)
   - On read path: `getItem(PROGRESS_KEY)` + if need migrate `getItem(PERSONAL_BEST_KEY)` → `migrateOrDefault`; on successful migrate from v1, **write-through** v2 once (keep v1 key — D-08 / RESEARCH: do not delete v1)
   - When v2 present, ignore v1
   - Writes: `setItem(PROGRESS_KEY, JSON.stringify(blob))` via classic AsyncStorage 2.2.0 default API only
   - pendingWrite + `flush()` mirror PB store
   - High-watermark: corrupt parse must return memory watermarks, never write defaults over known good memory

3. Keep `createDefaultPersonalBestStore` functional for legacy tests (thin wrapper OK if it reads rollup from progress **or** leave independent v1 store — prefer **independent v1 store unchanged** so migrate source stays readable; hosts switch in Plan 02).

4. Convert remaining store `it.todo` → GREEN. Export ProgressStore factories from barrel.

Avoid: host wiring (Plan 02); per-frame reads; MMKV; awaiting in React; lock-enforcement UI; changing default start level.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/storage.progress-v2.test.ts tests/storage.personal-best.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "createDefaultProgressStore|__resetSharedProgressStoreForTests" src/services/storage/` matches
    - `rg "it\\.todo" tests/storage.progress-v2.test.ts` returns no matches
    - `rg "@nbb/progress/v2" src/services/storage/asyncStorageStore.ts` matches
    - Vitest both storage suites exit 0
    - No `createAsyncStorage` / AsyncStorage 3.x API usage
  </acceptance_criteria>
  <done>ProgressStore memory + AsyncStorage singleton with migrate-on-read and flush tested green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| AsyncStorage JSON ↔ ProgressStore | Untrusted device storage; fail-soft only |
| ProgressStore ↔ hosts (Plan 02) | Cold-path API; never worklet |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-C1-01 | Tampering | parseProgressResult | mitigate | Field-by-field validate; corrupt→defaults; no Object.assign from raw; never throw |
| T-C1-02 | Tampering | migrateOrDefault | mitigate | Prefer v2 when ok; corrupt v2 still try v1 seed so PB not wiped; never invent bestByLevel from v1 |
| T-C1-03 | Denial of service | setItem / flush | mitigate | Writes only on record/unlock/flush; coalesce pendingWrite; no per-frame I/O |
| T-C1-04 | Information disclosure | Progress blob | accept | Local unencrypted high scores by design (offline arcade); no network exfil in store |
</threat_model>

<verification>
`npx vitest run tests/storage.progress-v2.test.ts tests/storage.personal-best.test.ts` exits 0; no `it.todo` left in progress-v2 suite.
</verification>

<success_criteria>
Parse/migrate fail-soft correct; ProgressStore singleton persists unlocks + per-level bests + rollup; v1 migrate seeds global only; flush/pendingWrite preserved.
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/C1-progress-storage/C1-01-SUMMARY.md`
</output>
