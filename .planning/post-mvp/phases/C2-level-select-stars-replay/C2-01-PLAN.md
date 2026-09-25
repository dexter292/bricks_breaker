---
phase: C2-level-select-stars-replay
plan: 01
type: execute
wave: 1
depends_on:
  - "C2-00"
files_modified:
  - src/services/storage/types.ts
  - src/services/storage/parseBlob.ts
  - src/services/storage/migrateProgress.ts
  - src/services/storage/memoryStore.ts
  - src/services/storage/asyncStorageStore.ts
  - src/services/storage/index.ts
  - tests/storage.progress-v3.test.ts
  - tests/storage.progress-v2.test.ts
autonomous: false
requirements:
  - N-PROG-03
must_haves:
  truths:
    - "C1 device UAT is approved before any code writes @nbb/progress/v3 on device path"
    - "PROGRESS_VERSION=3 and PROGRESS_KEY=@nbb/progress/v3; bestByLevel[id]={score, stars?}"
    - "v1→v3 and v2→v3 preserve unlocked + score values; v2 number→{score} omit stars"
    - "Corrupt v3 → defaults; mergeHighWatermark never lowers memory score/stars"
    - "Win: computeStars + max(stored,computed); lose does not write stars; recordRunEnd returns blob"
  artifacts:
    - path: "src/services/storage/types.ts"
      provides: "ProgressBlob v3 + ProgressStore.recordRunEnd"
      contains: "PROGRESS_VERSION = 3|@nbb/progress/v3|LevelBest"
    - path: "src/services/storage/migrateProgress.ts"
      provides: "migrateOrDefault prefer v3 else v2→v3 else v1→v3"
      exports: ["migrateOrDefault"]
    - path: "src/services/storage/asyncStorageStore.ts"
      provides: "hydrate prefer v3; migrate-on-read; write-through v3; leave v1/v2 keys"
    - path: "tests/storage.progress-v3.test.ts"
      provides: "GREEN migrate/parse/stars merge/watermark/recordRunEnd"
  key_links:
    - from: "asyncStorageStore"
      to: "@nbb/progress/v3"
      via: "getItem/setItem PROGRESS_KEY; migrate reads v2 + v1"
      pattern: "@nbb/progress/v3|PROGRESS_KEY|migrateOrDefault"
    - from: "recordRunEnd"
      to: "mergeLevelBest + unlockAfterClear"
      via: "sync memory update then void persist; return cloned blob"
      pattern: "recordRunEnd|mergeLevelBest|computeStars"
---

<objective>
Gate on C1 device UAT, then flip ProgressBlob to v3, implement fail-soft parse + v1/v2→v3 migrate, evolve ProgressStore (`recordRunEnd` returns blob; nested watermark), turn all Wave 0 storage todos GREEN.

Purpose: Durable lives-based stars (N-PROG-03) on verified C1 substrate without clobbering watermarks (D-04…D-07, F-26).
Output: v3 types + parse/migrate + store adapters + green `tests/storage.progress-v3.test.ts`.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-CONTEXT.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-RESEARCH.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-PATTERNS.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-00-SUMMARY.md
@src/services/storage/types.ts
@src/services/storage/stars.ts
@src/services/storage/parseBlob.ts
@src/services/storage/migrateProgress.ts
@src/services/storage/memoryStore.ts
@src/services/storage/asyncStorageStore.ts
@tests/storage.progress-v3.test.ts
@tests/storage.progress-v2.test.ts

<preconditions>
**R-28 / D-gate:** Do not implement AsyncStorage write-through to `@nbb/progress/v3` until Task 1 (human) confirms C1 UAT approved. Pure helpers + memoryStore may proceed after approval recorded.
</preconditions>

<interfaces>
```typescript
// After this plan — ProgressBlob v3
export const PROGRESS_VERSION = 3 as const;
export const PROGRESS_KEY = '@nbb/progress/v3' as const;
export const PROGRESS_KEY_V2 = '@nbb/progress/v2' as const; // migrate source only

export type ProgressBlob = {
  v: 3;
  unlocked: LevelId[];
  bestByLevel: Partial<Record<LevelId, LevelBest>>;
  bestScore: number;
  updatedAt: number;
};

export interface ProgressStore {
  getBest(): Promise<number>;
  getBestForLevel(id: LevelId): Promise<number>; // returns nested .score
  recordLevelBest(id: LevelId, score: number): Promise<void>; // score-only path OK for lose
  /** Preferred end-of-run: sync memory merge score/stars/unlock; void persist; return clone. */
  recordRunEnd(args: {
    levelId: LevelId;
    score: number;
    outcome: 'win' | 'lose';
    livesRemaining: number;
  }): ProgressBlob; // sync return preferred (D-10 / F-26); Promise<ProgressBlob> also OK if memory updates before await
  unlockAfterClear(id: LevelId): Promise<void>;
  isUnlocked(id: LevelId): Promise<boolean>;
  getSnapshot(): Promise<ProgressBlob>;
  flush?(): Promise<void>;
}

export function migrateOrDefault(
  v3Raw: string | null,
  v2Raw: string | null,
  v1Raw: string | null,
): ProgressBlob;
// prefer valid v3; else v2→v3 (number→{score}); else v1→v3 bestScore only; else defaults

export function parseProgressResult(raw: string | null): ParseProgressResult; // accepts v===3 only
export function parseProgressV2Result(raw: string | null): ParseProgressResultV2; // keep for migrate input
```
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 1: Gate — C1 device UAT approved</name>
  <files>.planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md, .planning/STATE.md</files>
  <read_first>.planning/STATE.md, .planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md, .planning/post-mvp/phases/C2-level-select-stars-replay/C2-CONTEXT.md</read_first>
  <what-built>
    C1 ProgressStore v2 (already code-complete). This checkpoint only confirms human device UAT so C2 may write `@nbb/progress/v3`.
  </what-built>
  <action>
Per **precondition R-28 / CONTEXT**: block v3 migration write-through until C1 device UAT is approved. Do not start Task 2 storage implementation until resume signal.

If C1-VALIDATION already contains `Human UAT: approved`, treat as satisfied after user confirms. If not, user must complete C1-02 device smoke first.
  </action>
  <how-to-verify>
    1. Confirm C1 device smoke (unlock + per-level Best + Title rollup) passed on iOS.
    2. Confirm `C1-VALIDATION.md` contains `Human UAT: approved` (or append dated line now).
    3. Reply `approved` to unblock Plan 01 Task 2.
  </how-to-verify>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; rg -n "Human UAT: approved|approved" .planning/post-mvp/phases/C1-progress-storage/C1-VALIDATION.md .planning/STATE.md || true</automated>
  </verify>
  <resume-signal>Type "approved" (C1 UAT done) or list blockers</resume-signal>
  <acceptance_criteria>
    - User replies `approved`
    - C1-VALIDATION (or STATE) records Human UAT approved before Task 2 commit that writes `@nbb/progress/v3`
  </acceptance_criteria>
  <done>C1 UAT gate cleared; v3 write-through authorized.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: ProgressBlob v3 parse + migrate + store</name>
  <files>src/services/storage/types.ts, src/services/storage/parseBlob.ts, src/services/storage/migrateProgress.ts, src/services/storage/memoryStore.ts, src/services/storage/asyncStorageStore.ts, src/services/storage/index.ts, tests/storage.progress-v3.test.ts, tests/storage.progress-v2.test.ts</files>
  <read_first>src/services/storage/types.ts, src/services/storage/stars.ts, src/services/storage/parseBlob.ts, src/services/storage/migrateProgress.ts, src/services/storage/memoryStore.ts, src/services/storage/asyncStorageStore.ts, tests/storage.progress-v3.test.ts, .planning/post-mvp/phases/C2-level-select-stars-replay/C2-PATTERNS.md</read_first>
  <behavior>
    - defaultProgressBlob(): v===3, unlocked=['level-01'], bestByLevel={}, bestScore=0
    - parseProgressResult: null → absent defaults; corrupt JSON / v!==3 / bad nested best → corrupt defaults; never throw
    - ok parse: floor scores; stars only if 1|2|3; drop unknown LevelIds; ensure level-01 unlocked
    - migrateOrDefault: valid v3 preferred; v2→v3 preserves unlocked + `{score}` omit stars; v1→v3 seeds bestScore only; corrupt v3 + ok v2 still migrates from v2 (do not wipe)
    - mergeHighWatermark: max score; max stars when both present; never drop stars when incoming omits; never lower watermarks on corrupt read
    - recordRunEnd win: computeStars(lives) + mergeLevelBest + unlockAfterClear in one memory update; returns clone with next unlocked
    - recordRunEnd lose: score max only; stars unchanged/absent; no unlock
    - getBestForLevel returns nested `.score` (missing → 0)
    - createDefaultProgressStore singleton still; hydrate reads v3 first else v2+v1 via migrate; write-through v3 once; **do not delete** v1/v2 keys
    - progress-v2 suite: either rewritten as migrate-input helpers OR slimmed to still pass (no compile breaks)
  </behavior>
  <action>
Per **D-04, D-05, D-06, D-07, D-10** and PATTERNS (nested clone / F-26 watermark):

1. Flip `types.ts`: `PROGRESS_VERSION = 3`, `PROGRESS_KEY = '@nbb/progress/v3'`, keep `PROGRESS_KEY_V2 = '@nbb/progress/v2'` (or string literal) for migrate reads. `ProgressBlob.bestByLevel` → `Partial<Record<LevelId, LevelBest>>`. Evolve `ProgressStore` with `recordRunEnd` (sync memory update preferred). Keep `recordLevelBest` working as score-only (or implement via merge with `starsFromWin=null`).

2. Evolve `parseBlob.ts`: `parseProgressResult` accepts `v===3` only; nested sanitize field-by-field (no `Object.assign` from raw — T-C2-01). Keep a `parseProgressV2Result` (or internal) for migrate input of legacy number maps.

3. Evolve `migrateProgress.ts` → `migrateOrDefault(v3Raw, v2Raw, v1Raw)` per D-05.

4. Evolve `memoryStore` + `asyncStorageStore`:
   - Nested clone / mergeHighWatermark for score+stars
   - Hydrate: getItem(v3) → else getItem(v2)+getItem(v1) → migrate → write-through v3 once
   - `recordRunEnd`: on win call `computeStars` + `mergeLevelBest` + pure `unlockAfterClear` into memory, schedule `void persist`, return clone **before** awaiting disk
   - Soft-fail writes; `flush()` unchanged semantics

5. Convert all Plan-00 storage `it.todo` → GREEN in `tests/storage.progress-v3.test.ts`. Update `tests/storage.progress-v2.test.ts` so suite still exits 0 (migrate-from-v2 coverage can live primarily in progress-v3).

Avoid: SelectScreen / ResultOverlay / PlayingHost Next; deleting legacy keys; MMKV / AsyncStorage 3.x; score-band stars; cloud sync.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/storage.progress-v3.test.ts tests/storage.progress-v2.test.ts tests/storage.personal-best.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "PROGRESS_VERSION = 3|@nbb/progress/v3" src/services/storage/types.ts` matches
    - `rg "recordRunEnd" src/services/storage/` matches interface + memory + async implementations
    - `rg "it\\.todo" tests/storage.progress-v3.test.ts` returns no matches
    - Vitest three storage suites exit 0
    - `rg "createAsyncStorage|AsyncStorage\\.create" src/services/storage/` returns no matches
    - No deletion of `@nbb/progress/v2` or `@nbb/personal-best/v1` in store code
  </acceptance_criteria>
  <done>v3 schema + migrate + recordRunEnd + watermark guards tested green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| AsyncStorage JSON ↔ ProgressStore | Untrusted device storage; fail-soft only |
| ProgressStore ↔ hosts (Plans 02–03) | Cold-path API; never worklet |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-C2-01 | Tampering | parseProgressResult v3 | mitigate | Field-by-field nested sanitize; corrupt→defaults; never throw; no Object.assign from raw |
| T-C2-04 | Tampering | migrateOrDefault | mitigate | Prefer valid v3; v2→v3 preserves unlocked+scores; corrupt disk must not wipe memory watermarks (F-26) |
| T-C2-05 | Denial of service | setItem / flush | mitigate | Writes only on recordRunEnd/recordLevelBest/unlock/flush; coalesce pendingWrite; no per-frame I/O |
| T-C2-06 | Information disclosure | Progress blob | accept | Local unencrypted scores/stars by design; no network in store |
| T-C2-02 | Spoofing | Edited unlocks/stars | accept | Offline arcade; no server authority |
</threat_model>

<verification>
Storage suites green; `@nbb/progress/v3` write-through only after C1 UAT gate; watermarks never lowered; `recordRunEnd` returns blob with win stars.
</verification>

<success_criteria>
N-PROG-03 durable stars on v3 blob; migrate v1/v2 safe; C1 UAT gate respected; hosts still compile against evolved store (wire in Plans 02–03).
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/C2-level-select-stars-replay/C2-01-SUMMARY.md`
</output>
