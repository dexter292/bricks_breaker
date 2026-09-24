# Phase C2: Level Select + Stars + Replay - Research

**Researched:** 2026-09-24  
**Domain:** Campaign shell (Select) + progress v3 stars + Results Next/replay on Expo SDK 57  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Preconditions / harness law
- **D-01:** Both CERT and SOAK drive `shellPhase` directly; **new phases must not be inserted into harness paths**. Cert (`GameHost` initial phase) and soak (`setShellPhase('playing'|'title')`) stay Title↔Playing; document soak intentional Select skip in `docs/ops/SOAK-PHYSICAL.md`.
- **D-02:** Every `levelId` change path ends with bake → `fxReady` → gate `setActive(true)`. **No path** calls `setActive(true)` itself (same as `toggleDevLevel`).
- **D-03:** Behavioral test: after Next / select start / DEV toggle, `setActive(true)` is the **last** call (mock `useGameLoop`, fake timers — no Skia).

#### Stars schema (N-PROG-03 storage)
- **D-04:** Bump to **`v: 3`**; `bestByLevel[id] = { score: number; stars: 1 | 2 | 3 }` — single source of truth (not parallel maps, not separate key).
- **D-05:** Migration tests: **v1→v3** and **v2→v3** preserve `unlocked` + score values (v2 number → `{ score, stars: 0 or omit until win }`); corrupt v3 → defaults; do **not** erase watermark incorrectly.
- **D-06:** Schema locks **shape** for richer formulas later; E2 may change star **criteria** without another schema bump if still 1–3.

#### Stars criteria & persist
- **D-07:** On **win only**: `computed = clamp(livesRemaining, 1, 3)`; `storedStars = max(prev, computed)`. Lose does not write stars.
- **D-08:** Formula is pure from World/chrome at win (`lives` + outcome) — no RNG, wall-clock, or UI settings (golden-replay safe).
- **D-09:** Amend **N-PROG-03**: lives-based in C2; score bands deferred to **E2** (N-CNT-02). Rationale: max scores differ ~3× across levels; global T2 unfair; per-level thresholds = tuning without playtest (A3 0/5).

#### Stars surfaces
- **D-10:** Show stars on **Select + Results** (win). Select reads fresh snapshot on each mount; Results uses blob returned from `handleRunEnded` after write (avoid dual async reads racing the same event).

#### Results / replay (N-PROG-04)
- **D-11:** Win: **Retry + Next + Menu**. Next visible iff `nextLevelId(cleared)` exists **and** that id is unlocked. Final level (`level-06`): **Retry + Menu only** — no disabled Next.
- **D-12:** Lose: **Retry + Menu** only (no Next).
- **D-13:** Next stays in the **same PlayingHost**: mirror `toggleDevLevel` reset checklist exactly, including `runEndedRef.current = false`, then `setLevelId(next)` only — gate arms; never `setActive(true)` here.

#### Session start / levelId plumbing
- **D-14:** Title **Play → Select**. Playing receives **required** `levelId` prop (no play-path fallback to `'level-03'`).
- **D-15:** Four call sites to name in plans:
  1. `PlayingHost` `useState('level-03')` → required prop / controlled from GameHost
  2. `loadLevel` default param → remove
  3. Cert gate forcing `level-03` → **keep**; add verify-arm step after change (before A1 re-run)
  4. `GameHost` cert initial `'playing'` → must continue to **bypass Select**
- **D-16:** After default/play-path change, cert sessions always hit defer+remount branch — plan includes one cert arm smoke before measurement.

#### Level select UI (N-LVL-02)
- **D-17:** `ShellPhase = 'title' | 'select' | 'playing'`. Select is its own React screen; **Playing unmounts** when leaving play (Menu/Back path tears down worklets/atlas).
- **D-18:** Vertical **list of 5** rows (catalog order). Unlocked cleared row: label + ★★★ + best. Three states:
  | State | Display |
  |-------|---------|
  | Locked | lock affordance; no best/stars |
  | Unlocked, never cleared | label + ☆☆☆; **no** “Best 0” |
  | Cleared | label + earned stars + best score |
- **D-19:** Select has **Back → Title**. Tap unlocked row → `playing` + that `levelId`.
- **D-20:** Select **`getSnapshot()` on every mount** — no cached progress across visits.
- **D-21:** Locked tap = **ignore** (no toast, no preview, no load).

### Claude's Discretion
- Exact Select/ResultOverlay styling within existing navy/flat chrome language
- Whether `stars: 0` vs omitting key means “never cleared” (must match three-state table; prefer omit / no entry until first win)
- Exact TypeScript helpers (`computeStars`, `recordLevelBest` signature evolution)
- Whether DEV level chip remains beside Select or stays on Playing only

### Deferred Ideas (OUT OF SCOPE)
- Area 2 lock chrome / toast / preview
- Score-band / per-level star thresholds → **E2** (N-CNT-02)
- Chapters / worlds (FC-L05)
- Thumbnail art for select (FC-L02 art creep)
- Cloud sync / accounts
- Measuring ceiling twice — do **one** re-run after C2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| N-LVL-02 | Level select with lock/unlock | `ShellPhase` + `SelectScreen`; `isUnlocked` + three-state rows; mount `getSnapshot()`; locked tap ignore |
| N-PROG-03 | Stars 1–3 lives-based; durable best-stars max | Progress **v3** `{ score, stars }`; `computeStars` + `max(prev, computed)` on win; migrate v1/v2→v3; Select + win Results |
| N-PROG-04 | Cleared levels replayable | Unlocked rows start play; win Results **Next** (gated) + Retry; Next = `toggleDevLevel` checklist |
</phase_requirements>

## Summary

C2 is **shell + schema + Results chrome** on top of the shipped C1 ProgressStore. The sim stays pure; all progress I/O remains in `src/services/storage`. The hard integration risks are already known in-repo: (1) **bake-gate / R-24** on every new `levelId` path (Select start, Next, DEV toggle), (2) **CERT/SOAK must not grow a Select hop**, (3) **v3 migration must not clobber v2 watermarks** and must wait on **C1 device UAT** before writing `@nbb/progress/v3`. [VERIFIED: codebase + STATE.md + C2-CONTEXT]

Existing assets to reuse: `PLAYABLE_LEVEL_ORDER` / `nextLevelId`, `getSnapshot` / `isUnlocked` / `unlockAfterClear`, `toggleDevLevel` reset sequence, Title/Result Pressable chrome, `PlayingHost.bake-gate` source contracts, GameHost Title↔Playing unmount pattern. [VERIFIED: catalog.ts, PlayingHost.tsx, GameHost.tsx]

**Primary recommendation:** Ship Progress **v3** (`bestByLevel[id] = { score; stars?: 1\|2\|3 }`, omit stars until first win); evolve `handleRunEnded` to apply win stars + unlock **in one memory update** and **return the blob** for Results; add `SelectScreen` between Title and Playing; make `levelId` a required PlayingHost prop; extend ResultOverlay with optional Next + stars; keep CERT/SOAK Title↔Playing; schedule **one** iOS ceiling Cert WC re-run after chrome lands (RELEASE-GATES §6 / D-16).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Progress v3 schema / parse / migrate | Client services (`src/services/storage`) | — | Pure TS; Vitest; no React |
| Star formula + best-stars max | Client services (pure helpers) | PlayingHost cold path | Deterministic; golden-replay safe |
| Persist read/write / flush | Client services (AsyncStorage) | AppState pause | Same C1 seam; never in worklets |
| ShellPhase title/select/playing | Browser / Client shell (`GameHost`) | — | Mount/unmount Playing; harness bypass |
| Level select list UI | Client UI (`SelectScreen`) | ProgressStore.getSnapshot | Cold path; remount refresh |
| End-of-run record + return blob | Client shell (`PlayingHost`) | ProgressStore | Discrete WON/LOST only |
| Results stars / Next / Retry / Menu | Client UI (`ResultOverlay` via GameScreen) | PlayingHost state | Prop-driven; Next = levelId change |
| Bake gate / setActive | Client shell (`PlayingHost`) | useGameLoop | Gate owns arm; Next mirrors toggleDevLevel |
| Cert / soak harness | Client shell (`GameHost` + PlayingHost cert) | — | Bypass Select; force level-03 |
| Sim / physics | — | — | Must not import storage or shell |

## Project Constraints (from .cursor/rules/)

From `.cursor/rules/gsd.md` (PROJECT + STACK excerpts):

- Stack locked: React Native, TypeScript, Expo SDK 57, Skia, custom physics — do not introduce alternate engines or storage for this phase.
- Offline-first: progress must work without network; no accounts/cloud sync.
- `@react-native-async-storage/async-storage` **2.2.0** is the blessed local progress path (SDK-pinned); do not swap to MMKV.
- Vitest for pure TS unit tests; jest-expo / jsdom only for UI contracts (Title / GameHost / Select / Result).
- Hot path: no React state / storage I/O per frame; cold-path only after discrete WON/LOST and on Select mount.
- React renders shell only; playfield stays Skia + worklets.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-native-async-storage/async-storage` | **2.2.0** (Expo SDK 57 pin; installed) | Persist JSON progress v3 blob | Already wired in C1; Expo SDK 57 lists it [VERIFIED: package.json + docs.expo.dev/versions/v57.0.0/sdk/async-storage] |
| `vitest` | **5.0.1** | Unit tests migrate/stars/parse | Existing `tests/storage.progress-v2.test.ts` pattern [VERIFIED: package.json] |
| `@testing-library/react` | **^16.3.3** | GameHost / Select / Result UI contracts | Existing `tests/ui/GameHost.test.tsx` [VERIFIED: package.json] |
| TypeScript `LevelId` + `PLAYABLE_LEVEL_ORDER` | repo | Catalog identity | `catalog.ts` + `loadLevel.ts` [VERIFIED: codebase] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Native `Pressable` / `FlatList` or `ScrollView` | RN 0.86.3 (SDK pin) | Select list rows | Mirror TitleScreen; no new UI kit |
| `react-native-safe-area-context` | SDK pin | Select/Results insets | Same as Title/Result |
| `expo-font` SpaceMono | existing | Select/Result typography | Match chrome language |
| Platform `onRunEnded` seams | in-repo | Leave payload; optional stars later | Do not block C2 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Nested shell phases in GameHost | `expo-router` stacks | Overkill for 3 phases; harness must stay imperative `setShellPhase` — **reject** |
| AsyncStorage 2.2.0 | MMKV / upgrade to 3.x | Contradicts STACK.md; C1 already chose pin [CITED: .cursor/rules/gsd.md] |
| Parallel `@nbb/stars` key | Single v3 blob | Locked D-04 — single source of truth |
| Remount PlayingHost on Next | In-host `setLevelId` | Locked D-13 — mirror toggleDevLevel; cheaper than full remount |

**Installation:** None — dependencies already present.

```bash
# Already satisfied — do not reinstall unless pin drifts
npx expo install @react-native-async-storage/async-storage
```

**Version verification:** `npm view @react-native-async-storage/async-storage version` → registry latest **3.1.1** (2026); project correctly pins **2.2.0** via Expo SDK 57. Do not upgrade in C2. [VERIFIED: npm registry + package.json]

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ GameHost ShellPhase                                          │
│                                                              │
│  CERT: initial 'playing' ─────────────────────────┐          │
│  SOAK: Title ↔ Playing only (skip Select)         │          │
│                                                   ▼          │
│  Title ──Play──► Select ──row──► Playing ──Menu──► Title     │
│                    ▲               │                         │
│                    │ Back          │ Menu                    │
│                    └───────────────┘                         │
└──────────────────────────────────────────────────────────────┘

Select (mount):
  getSnapshot() ──► row state = locked | uncleared | cleared
  tap unlocked ──► setShellPhase('playing') + setActiveLevelId(id)

PlayingHost (required levelId prop):
  levelId change ──► loadKey flip ──► bake ──► fxReady ──► gate setActive(true)
       ▲                                                      │
       │                                                      │
  Next / DEV toggle: reset chrome + setLevelId only ──────────┘
       (NEVER setActive(true) here)

WON/LOST cold path:
  applyChrome ──► handleRunEnded(score, outcome, lives):
       ├─ computeStars on win (clamp lives 1..3)
       ├─ store.recordRunEnd → memory watermark + async persist
       ├─ return ProgressBlob (or stars/best fields)
       └─ ResultOverlay uses returned blob (stars + Next gate)
            Next iff nextLevelId(id) && isUnlocked(next) in blob
```

### Recommended Project Structure

```
src/services/storage/
├── types.ts                 # ProgressBlob v3; LevelBest = { score; stars? }
├── catalog.ts               # unchanged PLAYABLE_LEVEL_ORDER / nextLevelId
├── stars.ts                 # computeStars, mergeLevelBest  [NEW]
├── parseBlob.ts             # parse v3; reject unknown v; sanitize nested bests
├── migrateProgress.ts       # v1→v3, v2→v3, prefer valid v3
├── unlock.ts                # unchanged
├── memoryStore.ts           # v3 blob + recordRunEnd returning blob
├── asyncStorageStore.ts     # PROGRESS_KEY v3; migrate-on-read; watermark merge
└── index.ts                 # exports

app/_components/
├── GameHost.tsx             # ShellPhase + activeLevelId; Title→Select→Playing
├── SelectScreen.tsx         # NEW — list of 5; Back; getSnapshot on mount
├── PlayingHost.tsx          # required levelId; Next; handleRunEnded returns blob
└── TitleScreen.tsx          # onPlay → Select (GameHost wires)

src/runtime/
├── loadLevel.ts             # remove default LevelId param
├── GameScreen.tsx           # pass stars / onNext into ResultOverlay
└── overlays/ResultOverlay.tsx  # stars (win); optional Next

docs/ops/
├── PROGRESS-STORAGE.md      # v3 + stars rules + N-PROG-03 amend note
└── SOAK-PHYSICAL.md         # Select skip (already noted — verify stays)

tests/
├── storage.progress-v3.test.ts          # migrate / parse / stars merge  [NEW]
├── storage.stars.test.ts                # computeStars clamp  [NEW or colocated]
├── ui/SelectScreen.test.tsx             # three states; locked ignore  [NEW]
├── ui/GameHost.test.tsx                 # Title→Select→Playing→Menu
├── ui/ResultOverlay.test.tsx            # Next gated; lose no Next  [NEW or extend GameScreen]
├── ui/PlayingHost.next-bake.test.ts     # setActive(true) last after levelId  [NEW]
└── runtime.loadLevel.test.ts            # update: no default id
```

### Pattern 1: Progress v3 nested best (locked shape)

**What:** Single map entry per level: `{ score, stars? }` with stars omitted until first win.  
**When to use:** All durable campaign bests after C1 UAT.  
**Example:**

```typescript
// Recommended — Claude's Discretion (omit stars until win)
export const PROGRESS_VERSION = 3 as const;
export const PROGRESS_KEY = '@nbb/progress/v3' as const;

export type StarCount = 1 | 2 | 3;

export type LevelBest = {
  score: number;
  /** Present only after at least one win (D-05 / discretion). */
  stars?: StarCount;
};

export type ProgressBlob = {
  v: 3;
  unlocked: LevelId[];
  bestByLevel: Partial<Record<LevelId, LevelBest>>;
  bestScore: number;
  updatedAt: number;
};
```

### Pattern 2: Pure stars + merge (N-PROG-03)

**What:** `computeStars(lives)` on win only; persist `max(prevStars, computed)`.  
**When to use:** `handleRunEnded` when `outcome === 'win'`.  
**Example:**

```typescript
// Source: phase research — align with D-07 / D-08; MAX_LIVES can be 5
export function computeStars(livesRemaining: number): StarCount {
  const n = Math.floor(livesRemaining);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(3, n)) as StarCount;
}

export function mergeLevelBest(
  prev: LevelBest | undefined,
  score: number,
  starsFromWin: StarCount | null, // null on lose
): LevelBest {
  const nextScore = Math.max(prev?.score ?? 0, Math.floor(score));
  if (starsFromWin == null) {
    return prev?.stars != null
      ? { score: nextScore, stars: prev.stars }
      : { score: nextScore };
  }
  const prevStars = prev?.stars ?? 0;
  const stars = Math.max(prevStars, starsFromWin) as StarCount;
  return { score: nextScore, stars };
}
```

### Pattern 3: handleRunEnded returns blob (D-10)

**What:** One store mutation updates score/stars/unlock in memory, schedules async persist, returns clone for Results. Select never shares that read.  
**When to use:** Every WON/LOST.  
**Example:**

```typescript
// PlayingHost — cold path only
const blob = await store.recordRunEnd({
  levelId,
  score: runScore,
  outcome,
  livesRemaining: lives, // chrome mirror at terminal frame
});
setResultStars(outcome === 'win' ? blob.bestByLevel[levelId]?.stars ?? null : null);
setResultBlob(blob); // Next gate from blob.unlocked + nextLevelId(levelId)
```

Prefer a **sync memory update** API (`recordRunEnd` updates watermark then `void persist`) so Results does not await disk. Return the in-memory blob immediately (same F-26 pattern as C1 evaluate-then-void-write).

### Pattern 4: Next = toggleDevLevel checklist (D-13)

**What:** Reset end-of-run chrome, clear `runEndedRef`, `setLevelId(next)` only.  
**When to use:** Win Results Next press.  
**Anti-pattern:** Calling `setActive(true)` or `retry()` before `fxReady`.

```typescript
// Must match toggleDevLevel — from C2-CONTEXT specifics
setResult(null); setIsNewRecord(false); runEndedRef.current = false;
setLives(3); setScore(0); setCombo(1); setStallTier(0);
setSimPhaseNum(SIM.DOCKED); setUiPhase('playing');
clearCountdown(); setCountdownNumeral(null);
setLevelId(next); // gate arms — DO NOT setActive(true)
```

If `levelId` is a **controlled prop** from GameHost, Next must call `onLevelIdChange(next)` (or equivalent) so parent state updates — same bake path.

### Pattern 5: ShellPhase Select + Playing unmount (D-17)

**What:** Conditional render like today's Title↔Playing; Select is a third sibling.  
**When to use:** Player UX only.  
**Harness:** CERT starts `'playing'` with `levelId='level-03'`; SOAK only toggles `'title'|'playing'`. [VERIFIED: GameHost.tsx]

### Anti-Patterns to Avoid

- **Inserting Select into CERT/SOAK paths** — breaks harness law (D-01) and soak baseline comparability.
- **`setActive(true)` inside Next / Select-driven level change** — R-24 blank playfield class.
- **Dual async `getSnapshot` on Results at same event as write** — race; use returned blob (D-10).
- **Treating `stars: 0` as cleared** — breaks three-state table; prefer omit until win.
- **Global score-band stars in C2** — deferred to E2 / N-CNT-02 (D-09).
- **Awaiting storage inside Select render** — mount effect + local state only.
- **Leaving `loadLevelById()` default** — play path must require id (D-14/D-15).
- **Writing v3 before C1 UAT approved** — precondition R-28 / STATE.md.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent KV | Custom FileSystem / SQLite | Existing AsyncStorage ProgressStore | C1 proven; F-26 flush/singleton |
| Unlock graph | Quest engine / chapters | `PLAYABLE_LEVEL_ORDER` + `nextLevelId` | 5-level chain only |
| Star formula in UI | Ad-hoc JSX math with RNG | Pure `computeStars` in services | Golden-replay + unit tests |
| Navigation library | expo-router stacks for 3 phases | GameHost `ShellPhase` | Harness needs direct setState |
| Next remount whole host | Unmount Playing on Next | In-host levelId change | Locked D-13; preserves pools carefully via bake gate |
| Lock toast / preview | Custom modal stack | Ignore locked tap | Deferred area 2 |

**Key insight:** C2 complexity is **ordering** (bake gate + harness + migration watermark), not new infrastructure. Copy C1 storage patterns; copy `toggleDevLevel` for Next; keep Select as dumb React.

## Runtime State Inventory

> Schema migration v2 → v3 (rename/migration class).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Device/AsyncStorage: `@nbb/progress/v2` (C1), `@nbb/personal-best/v1` (legacy); memory singleton watermarks in process | **Data migration** on read: prefer valid v3; else migrate v2→v3 (preserve unlocked + scores as nested); else v1→v3 (bestScore only); write-through v3; **do not delete** v1/v2 until one release after C2 (safer rollback) — code edit + migrate tests |
| Live service config | None — offline ProgressStore only; no cloud dashboards for progress keys | None — verified by architecture (no network in store) |
| OS-registered state | None for progress keys (no launchd/pm2 task names tied to `@nbb/progress`) | None |
| Secrets/env vars | `EXPO_PUBLIC_CERT` / `EXPO_PUBLIC_SOAK` harness flags (unchanged names) | Code must keep bypass behavior; **do not** rename env flags in C2 |
| Build artifacts | None carrying progress schema (no embedded JSON caches of blob) | None — verified: blob only in AsyncStorage / memory |

**Nothing found in category:** Live service / OS-registered / build artifacts — verified by codebase search of storage keys + ops docs (no external progress service).

## Common Pitfalls

### Pitfall 1: Next / Select calls setActive(true) before bake

**What goes wrong:** Blank or wrong-atlas playfield (R-24 / R-28 stacking).  
**Why it happens:** Retry path correctly uses `setActive(true)` when `fxReady`; Next looks similar but `fxReady` is false after `levelId` change.  
**How to avoid:** Copy `toggleDevLevel` exactly; gate effect owns arm; D-03 behavioral test.  
**Warning signs:** `setActive(true)` inside Next callback; bake-gate source contract only covers `toggleDevLevel`.

### Pitfall 2: Next gated on stale unlock (async race)

**What goes wrong:** After first clear of level-01, Next hidden because `getSnapshot()` runs before `unlockAfterClear` write.  
**Why it happens:** Today's `handleRunEnded` fire-and-forgets unlock.  
**How to avoid:** Apply unlock + stars in memory **before** returning blob to Results (D-10).  
**Warning signs:** Next missing on first win of a level; works after Menu→Select remount.

### Pitfall 3: Migrating v2 numbers without preserving scores

**What goes wrong:** Players lose per-level bests or Title rollup.  
**Why it happens:** Naive `defaultProgressBlob()` on seeing nested shape expectation.  
**How to avoid:** v2→v3 map `number → { score: n }` (omit stars); mergeHighWatermark on nested scores; corrupt v3 must not lower memory watermarks (F-26).  
**Warning signs:** Migrate tests only cover empty keys.

### Pitfall 4: Writing v3 before C1 UAT

**What goes wrong:** Migrating from an unverified v2 substrate; hard to attribute field bugs.  
**Why it happens:** Code-complete ≠ device-approved (STATE: awaiting UAT).  
**How to avoid:** Plan Wave 0 / gate: **block v3 key write** until C1 UAT `approved`; parallelize pure UI if needed.  
**Warning signs:** Shipping `@nbb/progress/v3` while C1 device smoke open.

### Pitfall 5: CERT starts at Select or wrong level

**What goes wrong:** Instruments attach to menu chrome; Cert WC never arms; ceiling re-run invalid.  
**Why it happens:** ShellPhase union grows; initial state accidentally `'select'` or Play path default changes.  
**How to avoid:** Keep CERT initial `'playing'` + force `level-03`; D-16 cert arm smoke before measurement.  
**Warning signs:** `[cert] GameHost CERT=1 phase=playing` log missing; Select visible under CERT.

### Pitfall 6: Uncleared row shows “Best 0”

**What goes wrong:** Acceptance fail on three-state table (D-18).  
**Why it happens:** Missing key coerced to 0 in UI.  
**How to avoid:** Show Best only when cleared (`stars` present); uncleared = ☆☆☆ only.  
**Warning signs:** Snapshot with no entry still renders `Best · 0`.

### Pitfall 7: livesRemaining > 3 from power-ups

**What goes wrong:** Stars 4/5 if UI uses raw lives.  
**Why it happens:** `MAX_LIVES = 5` in core. [VERIFIED: constants.ts]  
**How to avoid:** Always `clamp(..., 1, 3)` in `computeStars`.  
**Warning signs:** Unit tests only use lives ∈ {1,2,3}.

### Pitfall 8: loadLevel default survives + tests still assert it

**What goes wrong:** Silent fallback to level-03 on play path.  
**Why it happens:** `loadLevelById(id = 'level-03')` + `tests/runtime.loadLevel.test.ts` asserts default. [VERIFIED: loadLevel.ts]  
**How to avoid:** Remove default; update tests to require explicit id; cert keeps explicit `'level-03'`.

## Code Examples

### Migrate v2 → v3 (pure)

```typescript
// Prefer valid v3; else v2 nested conversion; else v1 seed
function levelBestFromV2(
  bestByLevel: Partial<Record<LevelId, number>>,
): Partial<Record<LevelId, LevelBest>> {
  const out: Partial<Record<LevelId, LevelBest>> = {};
  for (const [id, score] of Object.entries(bestByLevel)) {
    if (typeof score === 'number' && Number.isFinite(score) && score >= 0) {
      out[id as LevelId] = { score: Math.floor(score) }; // omit stars
    }
  }
  return out;
}
```

### Select row model (pure)

```typescript
export type SelectRowState = 'locked' | 'uncleared' | 'cleared';

export function selectRowState(
  id: LevelId,
  unlocked: readonly LevelId[],
  best: LevelBest | undefined,
): SelectRowState {
  if (!isUnlocked(unlocked, id)) return 'locked';
  if (best?.stars === 1 || best?.stars === 2 || best?.stars === 3) {
    return 'cleared';
  }
  return 'uncleared';
}
```

### ResultOverlay Next props (evolve)

```typescript
// Extend existing Props — Source: ResultOverlay.tsx pattern
type Props = {
  kind: 'win' | 'lose';
  score: number;
  best: number;
  isNewRecord: boolean;
  /** Win only; 1–3 when cleared this run or prior best stars. */
  stars?: 1 | 2 | 3 | null;
  onRetry: () => void;
  onMenu: () => void;
  /** Win only; omit entirely when null (final level / locked next). */
  onNext?: (() => void) | null;
};
```

### GameHost shell (sketch)

```typescript
type ShellPhase = 'title' | 'select' | 'playing';
// CERT: useState(() => CERT && !SOAK ? 'playing' : 'title')
// Title onPlay → setShellPhase('select')
// Select onChoose(id) → setActiveLevelId(id); setShellPhase('playing')
// Playing onMenu → setShellPhase('title')  // or 'select' if product wants — CONTEXT: Menu→Title via existing onMenu
// CERT PlayingHost levelId={'level-03'} always
```

**Menu target:** Keep Menu → Title (existing `onMenu`); Select re-entered via Play. Do not change Menu to Select unless discuss reopens (not locked otherwise — **recommend Title** to match today’s mental model and soak Title footprints).

### Controlled levelId

```typescript
// PlayingHost props
type Props = {
  onMenu: () => void;
  levelId: LevelId; // required — no useState default
  onLevelIdChange?: (id: LevelId) => void; // Next + DEV toggle
};
```

DEV toggle and Next update via `onLevelIdChange` when controlled; cert parent passes fixed `'level-03'` and may ignore DEV changes or keep internal override only in `__DEV__` without harness — discretion: **DEV chip stays on Playing**; under CERT, force effect still wins.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Title → Playing (`level-03` default) | Title → Select → Playing (required levelId) | C2 | Campaign entry honesty |
| Progress v2 `bestByLevel: number` | v3 `{ score, stars? }` | C2 | Stars durable; E2 can retune criteria |
| Results Retry + Menu only | Win + Next (gated); stars on win | C2 | N-PROG-04 replay flow |
| Stars = score bands (original N-PROG-03) | Lives-based in C2; bands → E2 | 2026-09-24 amend | Avoid unfair global T2 |
| Bake-gate source grep for toggleDevLevel | + behavioral setActive-last test | C2 D-03 | Catches Next regression |

**Deprecated/outdated:**

- Play-path `loadLevelById()` default `'level-03'`.
- Treating C1 “default start level-03 ungated” as permanent (PROGRESS-STORAGE.md “until C2”).
- Global score T2 star thresholds in Milestone C.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Menu from Results/Pause returns to **Title** (not Select) | Pattern 5 / Code Examples | If owner wants Menu→Select, GameHost `onMenu` wiring changes |
| A2 | Leave v1 + v2 keys on disk after v3 write-through (delete later) | Runtime State Inventory | Negligible storage; dual-read only if migrate prefers wrong key — mitigate by “valid v3 wins” |
| A3 | `recordRunEnd` sync memory + async persist (return blob sync) is preferred over awaiting setItem | Pattern 3 | If planner awaits disk, Results latency rises; still correct if ordered |
| A4 | SOAK-PHYSICAL Select-skip note already present is sufficient; C2 only verifies/extends if needed | D-01 | If note was premature draft, confirm wording still matches implementation |

**If this table is empty:** N/A — four low-risk assumptions logged.

## Open Questions

1. **Menu destination: Title vs Select?**
   - What we know: Today Menu → Title; CONTEXT does not lock Menu target.
   - What's unclear: Whether players expect return to Select after a run.
   - Recommendation: **Title** (A1); Select via Play. Revisit only if UAT complains.

2. **Show Best on uncleared rows when lose scored > 0?**
   - What we know: Table forbids “Best 0”; cleared shows best; lose can write score without stars.
   - What's unclear: Whether uncleared-with-score shows Best.
   - Recommendation: **Best only when cleared** (stars present) — simplest match to D-18.

3. **Under CERT, can DEV level chip change levelId?**
   - What we know: Cert force effect sets level-03; chip exists in `__DEV__`.
   - Recommendation: Keep chip; cert effect re-forces level-03; measurement sessions leave chip alone.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Vitest | ✓ | v25.6.0 | — |
| npm | scripts | ✓ | 11.8.0 | — |
| `@react-native-async-storage/async-storage` | Persist v3 | ✓ | 2.2.0 installed | Memory store (existing) |
| Vitest | Unit tests | ✓ | 5.0.1 | — |
| `@testing-library/react` + jsdom | UI contracts | ✓ | ^16.3.3 | — |
| iOS AsyncStorage native | Device durability | ✓ when dev-client linked | — | Memory + `__DEV__` warn |
| Physical iPhone + CERT harness | Post-C2 ceiling re-run | ✓ ops runbooks | — | Block G2 ship until done — not a code fallback |

**Missing dependencies with no fallback:** None for implementation. Ceiling re-run is a **process gate**, not a missing toolchain.

**Missing dependencies with fallback:** Native AsyncStorage absent in Vitest — memory store already handled. [VERIFIED: asyncStorageStore.ts]

Step 2.6: External deps are existing AsyncStorage + Vitest/RTL — audited above.

## Validation Architecture

> `workflow.nyquist_validation` is **true** in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 5.0.1 (+ @testing-library/react for UI) |
| Config file | project vitest config (existing suite under `tests/`) |
| Quick run command | `npx vitest run tests/storage.progress-v3.test.ts tests/ui/SelectScreen.test.tsx tests/ui/PlayingHost.next-bake.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| N-PROG-03 | `computeStars`: 1,2,3 clamp; lives 0→1; lives 5→3 | unit | `npx vitest run tests/storage.progress-v3.test.ts` | ❌ Wave 0 |
| N-PROG-03 | Win merges `max(stars)`; lose does not write stars | unit | same | ❌ Wave 0 |
| N-PROG-03 | v2→v3 preserves unlocked + scores as `{score}` | unit | same | ❌ Wave 0 |
| N-PROG-03 | v1→v3 seeds bestScore; unlocked=`[level-01]` | unit | same | ❌ Wave 0 |
| N-PROG-03 | Corrupt v3 → defaults; watermark not clobbered | unit | same | ❌ Wave 0 |
| N-LVL-02 | Select rows: locked / uncleared / cleared display rules | UI | `npx vitest run tests/ui/SelectScreen.test.tsx` | ❌ Wave 0 |
| N-LVL-02 | Locked tap does not call onChoose | UI | same | ❌ Wave 0 |
| N-LVL-02 | Mount calls getSnapshot (mock) | UI | same | ❌ Wave 0 |
| N-PROG-04 | Win Results shows Next when next unlocked; hidden on level-06 | UI | `npx vitest run tests/ui/ResultOverlay.test.tsx` or GameScreen | ❌ Wave 0 |
| N-PROG-04 | Lose Results has no Next | UI | same | ❌ Wave 0 |
| N-LVL-02 / shell | Title → Select → Playing → Menu → Title | UI | `npx vitest run tests/ui/GameHost.test.tsx` | ⚠️ exists — **update** for Select |
| Bake gate D-03 | After levelId change, `setActive(true)` is last (mock useGameLoop) | UI/unit | `npx vitest run tests/ui/PlayingHost.next-bake.test.ts` | ❌ Wave 0 (source contract only today) |
| D-15 | `loadLevelById` requires id (no default) | unit | `npx vitest run tests/runtime.loadLevel.test.ts` | ⚠️ exists — **update** |

### Sampling Rate

- **Per task commit:** quick command above (storage v3 + Select + bake)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`; plus C1 UAT approved before v3 persist ships; plus cert arm smoke before ceiling measurement

### Wave 0 Gaps

- [ ] `tests/storage.progress-v3.test.ts` — migrate v1/v2→v3, stars merge, corrupt watermark
- [ ] `src/services/storage/stars.ts` (or equivalent) — `computeStars` / `mergeLevelBest` / `selectRowState`
- [ ] `tests/ui/SelectScreen.test.tsx` — three states + locked ignore + snapshot on mount
- [ ] `tests/ui/PlayingHost.next-bake.test.ts` — behavioral setActive-last (D-03)
- [ ] Update `tests/ui/GameHost.test.tsx` — Title→Select→Playing
- [ ] Update `tests/runtime.loadLevel.test.ts` — remove default-id assertion
- [ ] Extend ResultOverlay / GameScreen tests for Next + stars
- [ ] Gate note in plan: **C1 device UAT approved** before enabling v3 write-through

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Offline; no accounts |
| V3 Session Management | no | — |
| V4 Access Control | no* | *Local unlock chrome only — not security boundary; locked rows are UX |
| V5 Input Validation | yes | Fail-soft JSON parse; sanitize LevelId; clamp stars 1–3; floor scores |
| V6 Cryptography | no | Unencrypted AsyncStorage by design; do not hand-roll crypto |

### Known Threat Patterns for local progress + select UI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Corrupt / crafted JSON in AsyncStorage | Tampering | Fail-soft parse; never throw; never lower watermarks |
| Prototype pollution via JSON | Tampering | Field-by-field sanitize; no `Object.assign` from raw |
| Client “unlock cheat” via edited storage | Spoofing | Accept for offline single-player; no server authority |
| Write storms from Select remount spam | Denial of service | getSnapshot read-only on mount; writes only on run end + flush |
| Accidental cloud exfil | Information disclosure | No network in store |

## Sources

### Primary (HIGH confidence)

- Codebase: `GameHost.tsx`, `PlayingHost.tsx`, `ResultOverlay.tsx`, `GameScreen.tsx`, `src/services/storage/*`, `loadLevel.ts`, `tests/ui/PlayingHost.bake-gate.test.ts`, `tests/storage.progress-v2.test.ts`
- `.planning/post-mvp/phases/C2-level-select-stars-replay/C2-CONTEXT.md` — locked decisions
- `.planning/post-mvp/phases/C1-progress-storage/C1-RESEARCH.md` — patterns to reuse
- `.planning/post-mvp/REQUIREMENTS-NEXT.md` — N-LVL-02, N-PROG-03 (amended), N-PROG-04, N-CNT-02
- `.planning/post-mvp/ROADMAP-NEXT.md` — C2 goal / deps
- `.planning/post-mvp/RELEASE-GATES.md` §6 — cert re-run when surface/budgets change
- `.planning/STATE.md` — C1 awaiting device UAT
- `docs/ops/PROGRESS-STORAGE.md`, `docs/ops/SOAK-PHYSICAL.md`
- Expo SDK 57 AsyncStorage: https://docs.expo.dev/versions/v57.0.0/sdk/async-storage/
- Installed pins: async-storage 2.2.0, vitest 5.0.1, expo ~57.0.24

### Secondary (MEDIUM confidence)

- npm registry: async-storage latest 3.1.1 vs project pin 2.2.0 — upgrade out of scope
- Max-score spread rationale for rejecting global T2 (~3×) — from C2-CONTEXT specifics / discuss (product judgment, not measured in this research pass)

### Tertiary (LOW confidence)

- Exact post-C2 Instruments session length / operator checklist beyond existing CEILING-CERT runbook — follow existing A1 docs at measurement time

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — no new packages; Expo 57 AsyncStorage confirmed
- Architecture: **HIGH** — extends C1 + documented bake-gate / harness constraints in-repo
- Pitfalls: **HIGH** — R-24/R-28 and F-26 watermark lessons already paid for once

**Research date:** 2026-09-24  
**Valid until:** ~2026-10-24 (stable domain; revisit if Expo bumps AsyncStorage pin or C1 UAT forces schema tweaks)
