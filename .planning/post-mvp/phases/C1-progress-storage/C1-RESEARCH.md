# Phase C1: Progress Storage & Unlock Model - Research

**Researched:** 2026-09-24  
**Domain:** Offline campaign progress (AsyncStorage v2 blob, unlock chain, per-level best)  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Catalog & unlock (N-PROG-01)
- **D-01:** Playable catalog order (locked): `level-01` → `level-03` → `level-04` → `level-05` → `level-06`. `level-02` remains **non-playable** negative fixture only.
- **D-02:** `level-01` is always unlocked. Clearing level *i* unlocks the next id in that order (not by numeric filename).
- **D-03:** Unlock is permanent offline (survives kill/reinstall only if AsyncStorage persists; same fail-soft memory fallback as PB today).
- **D-04:** Win (`SimPhase.WON`) is the only event that unlocks next. Lose does **not** unlock.

#### Per-level best (N-PROG-02)
- **D-05:** On every run end (WON or LOST), if `score > bestByLevel[id]`, update that level’s best asynchronously.
- **D-06:** Results overlay can show **this level’s** best (wire data in C1; chrome polish may land with C2 if Results already has a single Best — extend to per-level when active level is known).
- **D-07:** Title “Personal Best” = max of per-level bests (or explicit `bestScore` rolled up on write) so existing Title copy stays honest.

#### Storage v2
- **D-08:** New key e.g. `@nbb/progress/v2` (or bump under versioned blob). Migrate: if only v1 PB exists, seed global best and leave unlocks at default (`level-01` only).
- **D-09:** Fail-soft parse (corrupt → defaults); never throw into gameplay.
- **D-10:** Writes async / non-blocking; optional `flush` on AppState background (mirror F-26 PB pattern).
- **D-11:** No per-frame React or storage reads on the hot path.

#### Out of scope locks
- **D-12:** Stars criteria (**N-PROG-03**) deferred to **C2**.
- **D-13:** Level select UI deferred to **C2**.
- **D-14:** Do not change serve to aimed (B0 Won’t-Do).

### Claude's Discretion
- Exact TypeScript shape of the v2 blob (fields beyond unlocks + bestByLevel + schema version)
- Whether active LevelId is plumbed through GameHost now or stubbed for C2
- Whether Results “Best” switches to per-level in C1 or C2 if wiring is trivial

### Deferred Ideas (OUT OF SCOPE)
- C2: level select, stars 1–3, replay UX
- N-BRAND-01 display name
- N-OPS-01 Sentry dashboard verify
- E1b layouts teaching explosive / new power-ups
- B0 aimed serve (Won’t-Do)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| N-PROG-01 | Clear unlocks next; offline across kills | Catalog constant + `recordWin` unlock-next; `@nbb/progress/v2` + migrate from v1; singleton store + `flush` on AppState |
| N-PROG-02 | Per-level best score on Results | `bestByLevel[levelId]` preload + `evaluatePersonalBest` on WON/LOST; Results already accepts `best` prop — switch data source only |
</phase_requirements>

## Summary

C1 extends the existing F-26 personal-best seam into a **versioned offline progress blob** without touching the sim/worklet hot path. The codebase already has: AsyncStorage + memory fallback singleton (`createDefaultPersonalBestStore`), fail-soft parse with absent/corrupt distinction, fire-and-forget `setBest` + `flush` on OS pause, and Results/Title chrome that consume a single `best` number. PlayingHost already tracks `levelId: LevelId` and ends runs on `SIM.WON` / `SIM.LOST` via `handleRunEnded`. [VERIFIED: codebase]

The playable catalog is already the `LevelId` union in `src/runtime/loadLevel.ts` (`level-01`, `03`–`06`); DEV level cycling uses the same order. `level-02` must never enter unlock maps or playable APIs. [VERIFIED: loadLevel.ts]

**Primary recommendation:** Replace the PB-only store with a **ProgressStore** behind the same singleton factory pattern; key `@nbb/progress/v2`; migrate v1 → seed `bestScore` only; wire PlayingHost end-of-run to unlock-on-win + per-level best; switch Results Best to per-level (trivial); keep Title on rolled-up `getBest()`. No new npm packages. Do not build C2 UI.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Progress blob schema / parse / migrate | Client services (`src/services/storage`) | — | Pure TS; Vitest; no React |
| Unlock / best mutation rules | Client services (pure helpers) | Host cold path | Deterministic; unit-testable; hosts only call |
| Persist read/write / flush | Client services (AsyncStorage adapter) | — | Same F-26 seam; never in worklets |
| End-of-run record (WON/LOST) | Browser / Client shell (`PlayingHost`) | Platform `onRunEnded` | Discrete chrome bridge already exists |
| Results Best display | Client UI (`ResultOverlay`) | PlayingHost state | Prop already present; change data source |
| Title Best display | Client UI (`TitleScreen` via GameHost) | ProgressStore.getBest | Re-read on title entry |
| Catalog order constant | Client runtime (`loadLevel` or `services/progress`) | — | Single source for unlock + C2 later |
| Level select / lock chrome | — (C2) | — | Out of scope |
| Sim / physics | — | — | Must not import storage |

## Project Constraints (from .cursor/rules/)

From `.cursor/rules/gsd.md` (PROJECT + STACK excerpts):

- Stack locked: React Native, TypeScript, Expo, Skia, custom physics — do not introduce alternate engines or storage for this phase.
- Offline-first: progress must work without network.
- Monetization deferred: keep platform seams; do not add accounts/cloud sync.
- `@react-native-async-storage/async-storage` is the blessed local high-score path (SDK-pinned); do not swap to MMKV for C1.
- Vitest for pure TS unit tests; keep storage logic out of jest-expo unless UI contracts require it.
- Hot path: no React state / storage I/O per frame; cold-path only after discrete WON/LOST.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-native-async-storage/async-storage` | **2.2.0** (Expo SDK 57 pin; installed) | Persist JSON progress blob | Already wired; Expo docs list it for SDK 57; async API fits cold-path writes [VERIFIED: package.json + npm registry + docs.expo.dev/versions/v57.0.0/sdk/async-storage] |
| `vitest` | **5.0.1** | Unit tests for parse/migrate/unlock | Existing `tests/storage.personal-best.test.ts` pattern [VERIFIED: package.json] |
| TypeScript `LevelId` | repo type | Catalog identity | `src/runtime/loadLevel.ts` [VERIFIED: codebase] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Native `AppState` / existing pause path | RN 0.86.3 (SDK pin) | `flush()` pending write | Already called from `PlayingHost.onOsPause` [VERIFIED: PlayingHost.tsx] |
| Platform `onRunEnded` seams | in-repo | Future ads/IAP — leave payload; optional later fields | Do not block C1 on extending payload [VERIFIED: platform/types.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AsyncStorage 2.2.0 default export | MMKV | Faster sync API, extra native module — unnecessary for once-per-run writes; contradicts STACK.md [CITED: .cursor/rules/gsd.md] |
| AsyncStorage default | `createAsyncStorage` (docs “latest” / next) | Newer API surface; **not** what 2.2.0 types expose as primary path in this install — keep existing lazy-require + `default` [VERIFIED: node_modules types + current asyncStorageStore.ts] |
| Dual keys forever | Single v2 key + one-shot migrate | Prefer single source of truth after first successful v2 write |

**Installation:** None — dependency already present.

```bash
# Already satisfied — do not reinstall unless pin drifts
npx expo install @react-native-async-storage/async-storage
```

**Version verification:** `npm view @react-native-async-storage/async-storage version` → registry latest **3.1.1** (2026); project correctly pins **2.2.0** via Expo SDK 57. Do not upgrade in C1. [VERIFIED: npm registry + package.json]

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Title (GameHost)                                            │
│   mount/title entry → ProgressStore.getBest() → TitleScreen │
└──────────────────────────────▲──────────────────────────────┘
                               │ async read (cold)
┌──────────────────────────────┴──────────────────────────────┐
│ PlayingHost (JS cold path only)                             │
│                                                             │
│  mount / levelId change → getBestForLevel(levelId)          │
│       → previousBestRef + resultBest                        │
│                                                             │
│  chrome WON/LOST (discrete) → handleRunEnded:               │
│    ┌─ evaluatePersonalBest(score, levelBest)                │
│    ├─ if new: recordLevelBest(id, score)  ──void──┐         │
│    ├─ if WON: unlockNext(id)              ──void──┤         │
│    └─ platform.*.onRunEnded(payload)              │         │
│                                                   ▼         │
│                              ProgressStore (singleton)      │
│                              memory watermark + pendingWrite│
│                              AsyncStorage setItem(v2)       │
│                              flush() on AppState pause      │
└─────────────────────────────────────────────────────────────┘
        │
        ▼  (never from worklet / useFrameCallback)
┌───────────────────┐     migrate once      ┌──────────────────┐
│ @nbb/progress/v2  │◄── if absent, read ───│ @nbb/personal-   │
│ JSON blob         │     @nbb/personal-    │ best/v1 (legacy) │
└───────────────────┘     best/v1           └──────────────────┘
```

### Recommended Project Structure

```
src/services/storage/
├── types.ts                 # ProgressBlob v2 + ProgressStore; keep v1 types for migrate
├── catalog.ts               # PLAYABLE_LEVEL_ORDER, nextLevelId(), defaultUnlocked()  [NEW]
├── parseBlob.ts             # parseProgressResult + legacy parsePersonalBestResult
├── migrate.ts               # v1 → v2 seed  [NEW or colocated]
├── unlock.ts                # pure unlockNext / isUnlocked  [NEW]
├── compareBest.ts           # reuse evaluatePersonalBest (strict >)
├── memoryStore.ts           # memory ProgressStore
├── asyncStorageStore.ts     # singleton + flush + migrate-on-read
└── index.ts                 # public exports

docs/ops/
└── PROGRESS-STORAGE.md      # catalog order + unlock rules  [NEW]

tests/
├── storage.personal-best.test.ts   # keep / extend for evaluatePersonalBest
└── storage.progress-v2.test.ts     # migrate / unlock / parse fail-soft  [NEW]
```

### Pattern 1: Singleton store + memory watermark (F-26)

**What:** One process-wide store shared by Title + Playing; in-memory high-watermark never lowered by corrupt reads; failed writes kept in `pendingWrite` for `flush()`.  
**When to use:** All durable campaign progress.  
**Example:**

```typescript
// Source: src/services/storage/asyncStorageStore.ts (existing pattern)
async getBest(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    const parsed = parseProgressResult(raw);
    if (parsed.status === 'corrupt') return memoryBestScore;
    memoryBestScore = Math.max(memoryBestScore, parsed.blob.bestScore);
    return memoryBestScore;
  } catch {
    return memoryBestScore;
  }
}
```

### Pattern 2: Cold-path end-of-run (no await in reaction)

**What:** Discrete `applyChrome` → `handleRunEnded` → optimistic UI + `void store.*.catch(() => {})`.  
**When to use:** WON/LOST only.  
**Example:**

```typescript
// Source: app/_components/PlayingHost.tsx (adapt for per-level)
const { best, isNewRecord: record } = evaluatePersonalBest(
  runScore,
  previousBestRef.current, // MUST be best for active levelId
);
setResultBest(best);
if (record) {
  previousBestRef.current = best;
  void store.recordLevelBest(levelId, best).catch(() => {});
}
if (outcome === 'win') {
  void store.unlockAfterClear(levelId).catch(() => {});
}
```

### Pattern 3: Fail-soft parse with status discriminant

**What:** `{ status: 'ok' | 'absent' | 'corrupt' }` — corrupt must not clobber watermark to 0.  
**When to use:** Every AsyncStorage read.  
**Example:** Extend `parseBlob.ts` for `v === 2`; reject unknown `v`, non-arrays, non-finite scores. [VERIFIED: parseBlob.ts]

### Anti-Patterns to Avoid

- **Per-frame storage / React writes:** Never call store from `useFrameCallback` / worklets.
- **Treating corrupt as absent=0 then writing:** Overwrites real best (historical F-26 bug class).
- **Numeric filename unlock:** `level-01` clear must unlock `level-03`, not `level-02`.
- **Including `level-02` in unlock maps:** Negative fixture only.
- **Awaiting storage inside Results render:** Optimistic evaluate + async persist only.
- **Building level select in C1:** C2 owns N-LVL-02 / N-PROG-03/04.
- **Migrating to AsyncStorage 3.x / `createAsyncStorage` in C1:** Stay on Expo-pinned 2.2.0 default API already in use.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent KV | Custom FileSystem / SQLite | Existing AsyncStorage adapter | Already proven; F-26 flush/singleton |
| Best comparison | Ad-hoc `>=` | `evaluatePersonalBest` (strict `>`) | New Record semantics locked |
| Level identity | Stringly `'level-2'` | `LevelId` + `PLAYABLE_LEVEL_ORDER` | Prevents level-02 creep |
| Unlock graph | Graph DB / quest engine | Linear next-in-catalog helper | 5-level chain only |

**Key insight:** C1 is a **schema + pure rules + thin host wire** problem. Complexity lives in migrate/parse fail-soft and not lowering watermarks — already solved once for PB; copy the pattern, do not invent a new persistence stack.

## Common Pitfalls

### Pitfall 1: Global best used as per-level previousBest

**What goes wrong:** Results “New Record” fires when beating global PB on a weak level, or never fires when beating a high level best below global.  
**Why it happens:** Today `PlayingHost` preloads `store.getBest()` (global) into `previousBestRef`. [VERIFIED: PlayingHost.tsx ~228–246]  
**How to avoid:** Preload `getBestForLevel(levelId)` on mount **and when `levelId` changes**; evaluate against that.  
**Warning signs:** DEV level toggle leaves stale `previousBestRef`.

### Pitfall 2: Unlock on lose or on score threshold

**What goes wrong:** Soft unlocks without clearing.  
**Why it happens:** Confusing N-PROG-02 (score on win/lose) with N-PROG-01 (unlock on clear).  
**How to avoid:** Unlock only when `outcome === 'win'` / `SIM.WON` (D-04).  
**Warning signs:** Tests that unlock on LOST.

### Pitfall 3: Dual store instances / lost Title sync

**What goes wrong:** Title shows 0 after a record run.  
**Why it happens:** Separate memory fallbacks if singleton broken (documented F-26).  
**How to avoid:** Keep `__resetShared…ForTests` + single `createDefaultProgressStore()`.  
**Warning signs:** Title ≠ max(bestByLevel) after Menu return.

### Pitfall 4: Migrate writes zeros over v1

**What goes wrong:** Player loses historical PB.  
**Why it happens:** Corrupt/absent v2 read then write defaults without reading v1.  
**How to avoid:** On first v2 miss, read v1; if ok, seed `bestScore`; write v2; leave v1 key (optional delete later — not required). Never write v2 defaults over a successful v1 without copying `bestScore`.  
**Warning signs:** Migrate tests only cover “no keys”.

### Pitfall 5: Enforcing locks before C2 UI

**What goes wrong:** Scope creep into level select / start-level gating.  
**Why it happens:** Unlock API exists; temptation to block `level-03` default.  
**How to avoid:** C1 stores unlocks + exposes `isUnlocked`; **do not** redesign Title→Play or remove DEV toggle. Default `level-03` may remain playable until C2 (document as intentional). Optionally start new installs at `level-01` only if trivial — see Open Questions.  
**Warning signs:** New Title screens or lock icons in C1 plans.

### Pitfall 6: Hot-path LevelId plumbing through SharedValues

**What goes wrong:** Accidental worklet capture of store/React.  
**Why it happens:** Wanting sim to know campaign progress.  
**How to avoid:** Keep `levelId` as React state driving `loadLevelById` only (already true). Progress I/O stays in services + host callbacks.

## Code Examples

### Recommended v2 blob (discretion — locked fields covered)

```typescript
// Recommended shape for planner (Claude's Discretion — adopt unless discuss reopens)
export const PROGRESS_VERSION = 2 as const;
export const PROGRESS_KEY = '@nbb/progress/v2' as const;

export type ProgressBlob = {
  v: 2;
  /** Always includes 'level-01'; catalog order, no level-02 */
  unlocked: LevelId[];
  /** Sparse map; missing key ⇒ best 0 */
  bestByLevel: Partial<Record<LevelId, number>>;
  /** Rolled-up Title PB = max(values) maintained on write */
  bestScore: number;
  updatedAt: number;
};

export function defaultProgressBlob(): ProgressBlob {
  return {
    v: 2,
    unlocked: ['level-01'],
    bestByLevel: {},
    bestScore: 0,
    updatedAt: 0,
  };
}
```

### Catalog + unlock (pure)

```typescript
// Align with PlayingHost DEV order + LevelId union
export const PLAYABLE_LEVEL_ORDER: readonly LevelId[] = [
  'level-01',
  'level-03',
  'level-04',
  'level-05',
  'level-06',
] as const;

export function nextLevelId(id: LevelId): LevelId | null {
  const i = PLAYABLE_LEVEL_ORDER.indexOf(id);
  if (i < 0 || i === PLAYABLE_LEVEL_ORDER.length - 1) return null;
  return PLAYABLE_LEVEL_ORDER[i + 1]!;
}

export function unlockAfterClear(
  unlocked: readonly LevelId[],
  cleared: LevelId,
): LevelId[] {
  const next = nextLevelId(cleared);
  if (next == null || unlocked.includes(next)) return [...unlocked];
  return [...unlocked, next];
}
```

### Migrate v1 → v2

```typescript
// On progress key absent: try PERSONAL_BEST_KEY
const v1 = parsePersonalBestResult(await AsyncStorage.getItem(PERSONAL_BEST_KEY));
if (v1.status === 'ok') {
  return {
    ...defaultProgressBlob(),
    bestScore: v1.best,
    // do NOT invent bestByLevel attribution (D-08)
    updatedAt: Date.now(),
  };
}
return defaultProgressBlob();
```

### AsyncStorage string API (pinned 2.2.0)

```typescript
// Source: Expo SDK 57 AsyncStorage + installed 2.2.0 AsyncStorageStatic
await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(blob));
const raw = await AsyncStorage.getItem(PROGRESS_KEY); // string | null
```

[CITED: docs.expo.dev/versions/v57.0.0/sdk/async-storage]  
[VERIFIED: node_modules/@react-native-async-storage/async-storage types]

### Results wire (trivial — recommend in C1)

`ResultOverlay` already shows `Best · {best}` with no level label. PlayingHost already has `levelId`. **Do per-level Best in C1** (D-06 + discretion): change preload/evaluate source only; no chrome redesign. C2 can later add “Lv XX” copy if desired.

### ProgressStore API (recommended)

```typescript
export interface ProgressStore {
  getBest(): Promise<number>; // Title rollup
  getBestForLevel(id: LevelId): Promise<number>;
  /** High-watermark write for one level + rollup bestScore */
  recordLevelBest(id: LevelId, score: number): Promise<void>;
  /** Idempotent unlock of next after clear */
  unlockAfterClear(id: LevelId): Promise<void>;
  isUnlocked(id: LevelId): Promise<boolean>;
  /** Optional: snapshot for C2 — ok to add now */
  getSnapshot?(): Promise<ProgressBlob>;
  flush?(): Promise<void>;
}
```

Keep thin compatibility: `setBest(n)` may remain as “update rollup only” for tests, or delete call sites after ProgressStore lands. Prefer deleting `setBest` usages in favor of `recordLevelBest`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global PB `@nbb/personal-best/v1` | Progress `@nbb/progress/v2` + migrate | C1 (this phase) | Unlocks + per-level bests |
| Results uses global previousBest | Results uses `bestByLevel[active]` | C1 (recommended) | Honest New Record |
| Title Best = single field | Title Best = rolled-up `bestScore` | C1 | Same UI copy |
| A3 cohort → B0 aimed serve | A3 SKIPPED → B0 Won’t-Do | 2026-09-24 | No serve changes in C1 |

**Deprecated/outdated:**

- Writing only v1 key after C1 ships — treat v1 as read-once migrate source.
- AsyncStorage “latest” docs pushing `createAsyncStorage` — not required for Expo 57 / 2.2.0 pin.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Lock enforcement (refuse play of locked levels) stays in C2 | Pitfall 5 / Open Questions | If owner expects C1 to gate Play, plan needs Title/Playing start-level change |
| A2 | Leaving v1 key in place after migrate is fine | Migrate | Negligible; dual source only if migrate skipped on later reads — mitigate by “if v2 present, ignore v1” |
| A3 | Extending `RunEndedPayload` with `levelId` is optional for C1 | Standard Stack | Noops ignore extra fields; skip unless analytics needs it |

**If this table is empty:** N/A — three low-risk assumptions logged for planner/discuss confirmation.

## Open Questions

1. **Should Play default to `level-01` once progress exists?**
   - What we know: Default today is `level-03` (D-06 historical); unlock chain starts at `level-01`.
   - What's unclear: Whether C1 should change default start without select UI.
   - Recommendation: **No** default change in C1 unless owner insists; document unlocks for C2 select. Optionally set default to `level-01` in a one-line PlayingHost change if owner wants campaign honesty without select.

2. **Should `getSnapshot` / cleared-set ship in C1 for C2?**
   - What we know: C2 needs unlock + stars + replay.
   - What's unclear: Stars criteria unknown until C2 discuss.
   - Recommendation: Export `unlocked` + `bestByLevel` via `getSnapshot()` now; omit stars fields.

3. **Delete v1 key after successful migrate?**
   - Recommendation: **Keep** v1 until one release after C1 (safer rollback); always prefer v2 when present.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Vitest | ✓ | v25.6.0 | — |
| npm | scripts | ✓ | 11.8.0 | — |
| `@react-native-async-storage/async-storage` | Persist | ✓ | 2.2.0 installed | Memory store (existing) |
| Vitest | Unit tests | ✓ | 5.0.1 | — |
| iOS AsyncStorage native | Device durability | ✓ when dev-client linked | — | Memory + `__DEV__` warn (existing) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Native AsyncStorage absent in Vitest/Node — memory store path already handled via `VITEST` env + native probe. [VERIFIED: asyncStorageStore.ts]

Step 2.6: External deps are the existing AsyncStorage pin only — audited above.

## Validation Architecture

> `workflow.nyquist_validation` is **true** in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 5.0.1 |
| Config file | project vitest config (existing suite under `tests/`) |
| Quick run command | `npx vitest run tests/storage.progress-v2.test.ts tests/storage.personal-best.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| N-PROG-01 | `level-01` unlocks `level-03` (not `level-02`) | unit | `npx vitest run tests/storage.progress-v2.test.ts` | ❌ Wave 0 |
| N-PROG-01 | Lose does not unlock | unit | same | ❌ Wave 0 |
| N-PROG-01 | Corrupt v2 → defaults; watermark not clobbered | unit | same | ❌ Wave 0 |
| N-PROG-01 | v1-only migrate seeds `bestScore`, unlocked=`[level-01]` | unit | same | ❌ Wave 0 |
| N-PROG-02 | `recordLevelBest` strict `>`; rollup `bestScore` | unit | same + existing compareBest tests | ⚠️ partial (`evaluatePersonalBest` ✅) |
| N-PROG-02 | Results data path uses per-level previousBest | unit or light host test | optional; pure store sufficient if host wiring reviewed | ❌ optional |
| — | Singleton identity | unit | existing personal-best tests pattern | ✅ pattern |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/storage.progress-v2.test.ts tests/storage.personal-best.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/storage.progress-v2.test.ts` — covers N-PROG-01/02 parse, migrate, unlock, rollup
- [ ] `src/services/storage/catalog.ts` (or equivalent) — single PLAYABLE_LEVEL_ORDER
- [ ] `docs/ops/PROGRESS-STORAGE.md` — catalog order + unlock rules (acceptance from CONTEXT)

*(Existing `tests/storage.personal-best.test.ts` remains for `evaluatePersonalBest` / legacy parse.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Offline; no accounts (N-META deferred) |
| V3 Session Management | no | — |
| V4 Access Control | no | Local single-player unlocks only |
| V5 Input Validation | yes | Fail-soft JSON parse; floor non-negative ints; reject bad `LevelId` |
| V6 Cryptography | no | Unencrypted AsyncStorage by design (local high scores); do not hand-roll crypto for C1 |

### Known Threat Patterns for local progress storage

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Corrupt / crafted JSON in AsyncStorage | Tampering | Fail-soft parse; never throw; never lower watermark |
| Prototype pollution via JSON | Tampering | Validate shape field-by-field; no `Object.assign` from raw |
| Write storms / DoS via rapid setState | Denial of service | Writes only on run end + flush; coalesce pendingWrite |
| Accidental cloud exfil | Information disclosure | No network in store; keep offline seam |

## Sources

### Primary (HIGH confidence)

- Codebase: `src/services/storage/*`, `app/_components/PlayingHost.tsx`, `GameHost.tsx`, `TitleScreen.tsx`, `src/runtime/loadLevel.ts`, `ResultOverlay.tsx`
- `.planning/post-mvp/phases/C1-progress-storage/C1-CONTEXT.md` — locked decisions
- `.planning/post-mvp/ROADMAP-NEXT.md` — C1/C2; A3 SKIPPED; B0 Won’t-Do
- `.planning/post-mvp/REQUIREMENTS-NEXT.md` — N-PROG-01/02
- Expo SDK 57 AsyncStorage page: https://docs.expo.dev/versions/v57.0.0/sdk/async-storage/
- Installed package types: `@react-native-async-storage/async-storage@2.2.0`
- Context7: `/react-native-async-storage/async-storage` — getItem/setItem string KV + JSON.stringify pattern

### Secondary (MEDIUM confidence)

- npm registry: async-storage latest 3.1.1 vs project pin 2.2.0 — upgrade out of scope
- Historical F-26 notes in `docs/audit/REQUIREMENTS-MATRIX.md` — singleton / corrupt pitfalls

### Tertiary (LOW confidence)

- AsyncStorage “latest” docs emphasizing `createAsyncStorage` — may target newer major; do not adopt in C1 without Expo pin change

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — packages installed and pinned; Expo docs confirm AsyncStorage for SDK 57
- Architecture: **HIGH** — mirrors proven PB seam; hosts already have levelId + run-end hooks
- Pitfalls: **HIGH** — several are prior F-26 lessons already fixed once in-repo

**Research date:** 2026-09-24  
**Valid until:** ~2026-10-24 (stable domain; revisit if Expo bumps AsyncStorage pin)
