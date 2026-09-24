# Phase C1: Progress Storage & Unlock Model - Pattern Map

**Mapped:** 2026-09-24  
**Files analyzed:** 14  
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/services/storage/types.ts` | model | file-I/O | `src/services/storage/types.ts` (v1 blob + store iface) | exact (evolve) |
| `src/services/storage/parseBlob.ts` | utility | transform | `src/services/storage/parseBlob.ts` (`parsePersonalBestResult`) | exact (evolve) |
| `src/services/storage/migrateProgress.ts` *(new)* | utility | transform | `src/services/storage/parseBlob.ts` + v1→defaults seed | role-match |
| `src/services/storage/compareBest.ts` | utility | transform | `src/services/storage/compareBest.ts` (`evaluatePersonalBest`) | exact (reuse / extend) |
| `src/services/storage/catalogOrder.ts` *(new)* | utility | transform | `src/runtime/loadLevel.ts` `LevelId` + `PlayingHost.toggleDevLevel` order | exact |
| `src/services/storage/memoryStore.ts` | service | CRUD | `src/services/storage/memoryStore.ts` | exact (evolve / parallel ProgressStore) |
| `src/services/storage/asyncStorageStore.ts` | service | file-I/O | `src/services/storage/asyncStorageStore.ts` | exact (evolve / parallel) |
| `src/services/storage/index.ts` | utility | — | `src/services/storage/index.ts` | exact (evolve) |
| `src/runtime/loadLevel.ts` | model | file-I/O | self — export playable catalog order | exact (evolve) |
| `app/_components/PlayingHost.tsx` | provider | event-driven | self — `handleRunEnded` + preload + flush | exact (evolve) |
| `app/_components/GameHost.tsx` | provider | request-response | self — Title `getBest` on shellPhase | exact (evolve) |
| `src/runtime/overlays/ResultOverlay.tsx` | component | request-response | self — `Best · {best}` props | exact (evolve, wire-only) |
| `tests/storage.progress.test.ts` *(new)* | test | transform | `tests/storage.personal-best.test.ts` | exact |
| `docs/ops/PROGRESS-UNLOCK.md` *(new)* | config | — | `docs/ops/POWERUPS-B2.md` (rules table) | role-match |

**Out of scope (C2):** level-select UI, stars, replay chrome — no analogs assigned here.

---

## Pattern Assignments

### `src/services/storage/types.ts` (model, file-I/O) — evolve for v2

**Analog:** `src/services/storage/types.ts`

**Imports / versioned key pattern** (lines 1–15):

```typescript
export const PERSONAL_BEST_VERSION = 1 as const;
export const PERSONAL_BEST_KEY = '@nbb/personal-best/v1' as const;

export type PersonalBestBlob = {
  v: 1;
  bestScore: number;
  updatedAt: number; // ms epoch, informational only
};

export interface PersonalBestStore {
  getBest(): Promise<number>;
  setBest(bestScore: number): Promise<void>;
  /** Optional: re-attempt a failed write (F-26 AppState flush). */
  flush?(): Promise<void>;
}
```

**Copy for C1:**
- Add `PROGRESS_VERSION = 2`, `PROGRESS_KEY = '@nbb/progress/v2'`.
- Blob shape (discretion): `{ v: 2; unlocked: LevelId[]; bestByLevel: Partial<Record<LevelId, number>>; bestScore: number; updatedAt: number }` — keep `bestScore` as rolled-up max for Title (D-07).
- Prefer a `ProgressStore` interface parallel to `PersonalBestStore` (`getProgress` / `recordRunEnd` / `flush`) rather than bloating v1-only methods; Title can keep calling `getBest()` if ProgressStore also exposes it or a thin adapter wraps both.

---

### `src/services/storage/parseBlob.ts` (utility, transform) — evolve / sibling parse

**Analog:** `src/services/storage/parseBlob.ts`

**Fail-soft discriminated result** (lines 6–33):

```typescript
export type ParseBestResult =
  | { status: 'ok'; best: number }
  | { status: 'absent'; best: 0 }
  | { status: 'corrupt'; best: 0 };

export function parsePersonalBestResult(
  raw: string | null,
): ParseBestResult {
  if (raw == null) {
    return { status: 'absent', best: 0 };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object') {
      return { status: 'corrupt', best: 0 };
    }
    const blob = parsed as { v?: unknown; bestScore?: unknown };
    if (blob.v !== 1 || typeof blob.bestScore !== 'number') {
      return { status: 'corrupt', best: 0 };
    }
    if (!Number.isFinite(blob.bestScore) || blob.bestScore < 0) {
      return { status: 'corrupt', best: 0 };
    }
    return { status: 'ok', best: Math.floor(blob.bestScore) };
  } catch {
    return { status: 'corrupt', best: 0 };
  }
}
```

**Copy for C1:**
- `parseProgressResult(raw)` → `ok | absent | corrupt` with **defaults** on corrupt/absent (never throw into gameplay — D-09).
- On corrupt: return default progress (`unlocked: ['level-01']`, empty `bestByLevel`, `bestScore: 0`) — do **not** treat garbage as empty unlocked set that would wipe a memory watermark (mirror F-26 high-watermark refusal in `asyncStorageStore.getBest`).

---

### `src/services/storage/migrateProgress.ts` *(new)* (utility, transform)

**Analog:** parse fail-soft + explicit v1 seed (no existing migrate module — synthesize from parse + D-08)

**Core migrate pattern (planner target):**

```typescript
// Pseudocode aligned to D-08 — implement as pure function (unit-testable)
function migrateOrDefault(v2Raw: string | null, v1Raw: string | null): ProgressBlob {
  const v2 = parseProgressResult(v2Raw);
  if (v2.status === 'ok') return v2.progress;

  const v1 = parsePersonalBestResult(v1Raw);
  if (v1.status === 'ok') {
    return {
      v: 2,
      unlocked: ['level-01'],
      bestByLevel: {},
      bestScore: v1.best, // seed global only; unlocks stay default
      updatedAt: Date.now(),
    };
  }
  return defaultProgress(); // level-01 unlocked, zeros
}
```

**Apply:** cold load inside ProgressStore factory only — never on frame path (D-11).

---

### `src/services/storage/compareBest.ts` (utility, transform) — reuse

**Analog:** `src/services/storage/compareBest.ts`

**Strict greater-than** (lines 1–9):

```typescript
export function evaluatePersonalBest(
  runScore: number,
  previousBest: number,
): { best: number; isNewRecord: boolean } {
  const isNewRecord = runScore > previousBest;
  return {
    best: isNewRecord ? runScore : previousBest,
    isNewRecord,
  };
}
```

**Copy for C1:**
- Reuse for per-level best (D-05) and for Title rollup checks.
- Optional sibling: `evaluateUnlock(clearedId, unlocked, catalogOrder)` → next id or no-op (pure; WON-only callers).

---

### `src/services/storage/catalogOrder.ts` *(new)* (utility, transform)

**Analog A:** `src/runtime/loadLevel.ts` playable `LevelId` union (lines 18–37)

```typescript
export type LevelId =
  | 'level-01'
  | 'level-03'
  | 'level-04'
  | 'level-05'
  | 'level-06';

const LEVEL_MODULES: Record<LevelId, unknown> = {
  'level-01': require('../../assets/levels/level-01.json'),
  'level-03': require('../../assets/levels/level-03.json'),
  'level-04': require('../../assets/levels/level-04.json'),
  'level-05': require('../../assets/levels/level-05.json'),
  'level-06': require('../../assets/levels/level-06.json'),
};
```

**Analog B:** `app/_components/PlayingHost.tsx` DEV catalog order (lines 563–574) — **this is the locked unlock chain (D-01):**

```typescript
const order: LevelId[] = [
  'level-01',
  'level-03',
  'level-04',
  'level-05',
  'level-06',
];
```

**Copy for C1:**
- Export single `PLAYABLE_CATALOG_ORDER: readonly LevelId[]` from `loadLevel.ts` **or** `catalogOrder.ts` that re-exports `LevelId` — one source of truth for unlock next + DEV cycle + tests.
- `nextLevelId(id): LevelId | null` = index+1 in that array (not numeric filename sort).
- `level-02` must never appear (already excluded from `LevelId`).

---

### `src/services/storage/memoryStore.ts` + `asyncStorageStore.ts` (service, CRUD / file-I/O)

**Analog:** existing personal-best stores

**Memory watermark** (`memoryStore.ts` lines 3–18):

```typescript
export function createMemoryPersonalBestStore(): PersonalBestStore {
  let bestScore = 0;
  return {
    async getBest(): Promise<number> {
      return bestScore;
    },
    async setBest(next: number): Promise<void> {
      const n = Math.floor(next);
      if (n > bestScore) {
        bestScore = n;
      }
    },
    async flush(): Promise<void> {
      // in-memory — nothing to flush
    },
  };
}
```

**AsyncStorage singleton + pending flush** (`asyncStorageStore.ts` lines 16–18, 72–88, 100–161):

```typescript
/** Process-wide singleton — Title + Playing must share one store (F-26). */
let sharedStore: PersonalBestStore | null = null;

export function createDefaultPersonalBestStore(): PersonalBestStore {
  if (sharedStore != null) {
    return sharedStore;
  }
  // … probe native → memory fallback …
  return sharedStore;
}

// setBest: update memory watermark, set pendingWrite, try setItem; catch keeps pending
// flush(): re-attempt pendingWrite on AppState background
```

**Native probe / VITEST early-return** (lines 49–66) — keep identical for ProgressStore so Node tests never pull AsyncStorage RN entry.

**Copy for C1:**
- Same singleton discipline: `createDefaultProgressStore()` shared by GameHost + PlayingHost.
- Writes async / `void … .catch(() => {})` from hosts; `flush` on OS pause (D-10).
- High-watermark: never lower `bestScore` or per-level bests on corrupt read.
- Migration: on first get, if v2 absent, read v1 key once and seed (D-08); optionally write v2 after successful migrate (discretion — prefer write-through so Title sees rollup).

---

### `src/services/storage/index.ts` (utility) — barrel evolve

**Analog:** `src/services/storage/index.ts` (lines 1–18)

Export new types, parse/migrate helpers, catalog order, `createDefaultProgressStore`, `__resetShared…ForTests` alongside existing PB exports (keep PB for migrate + backward-compat tests).

---

### `app/_components/PlayingHost.tsx` (provider, event-driven) — primary wire-up

**Analog:** self — end-of-run cold path

**Store + preload** (lines 141, 228–246):

```typescript
const store = useMemo(() => createDefaultPersonalBestStore(), []);
const previousBestRef = useRef(0);
const runEndedRef = useRef(false);

// Preload previousBest for optimistic Results (D-10 / research lock).
useEffect(() => {
  let cancelled = false;
  void store
    .getBest()
    .then((b) => {
      if (cancelled) return;
      previousBestRef.current = b;
      setResultBest(b);
    })
    .catch(() => {
      if (cancelled) return;
      previousBestRef.current = 0;
      setResultBest(0);
    });
  return () => {
    cancelled = true;
  };
}, [store]);
```

**OS pause flush** (lines 258–264):

```typescript
const onOsPause = useCallback(() => {
  clearCountdown();
  setCountdownNumeral(null);
  setUiPhase('paused');
  // F-26: re-attempt pending personal-best write on background/OS pause.
  void store.flush?.().catch(() => {});
}, [clearCountdown, store]);
```

**handleRunEnded + phase gate** (lines 410–456):

```typescript
const handleRunEnded = useCallback(
  (runScore: number, outcome: 'win' | 'lose') => {
    const previous = previousBestRef.current;
    const { best, isNewRecord: record } = evaluatePersonalBest(
      runScore,
      previous,
    );
    setResultBest(best);
    setIsNewRecord(record);
    if (record) {
      previousBestRef.current = best;
      void store.setBest(best).catch(() => {});
    }
    const payload = { score: runScore, outcome, isNewRecord: record };
    platform.ads.onRunEnded(payload);
    platform.purchases.onRunEnded(payload);
    platform.accounts.onRunEnded(payload);
  },
  [platform, store],
);

// applyChrome:
if (mirror.phase === SIM.WON) {
  if (!runEndedRef.current) {
    runEndedRef.current = true;
    handleRunEnded(mirror.score, 'win');
  }
  // …
} else if (mirror.phase === SIM.LOST) {
  if (!runEndedRef.current) {
    runEndedRef.current = true;
    handleRunEnded(mirror.score, 'lose');
  }
  // …
}
```

**Copy for C1:**
- Pass `levelId` into `handleRunEnded` (already in component state, default `'level-03'`).
- On **every** end (win|lose): if `runScore > bestByLevel[levelId]`, persist per-level + rollup `bestScore` (D-05, D-07).
- On **win only**: unlock `nextLevelId(levelId)` permanently (D-04).
- Results `best` / `isNewRecord`: prefer **this level’s** best when active id known (D-06); Title still uses global max.
- Keep `runEndedRef` once-per-run guard; never await storage inside `useAnimatedReaction` / frame callback.
- Preload: fetch progress once on mount (and when `levelId` changes if per-level Results) — still cold path only.
- Flush: call ProgressStore `flush` from same `onOsPause` path.

**Props to GameScreen** (lines 761–770) — unchanged shape; only data source for `best` / `isNewRecord` becomes per-level:

```tsx
best={resultBest}
isNewRecord={isNewRecord}
```

---

### `app/_components/GameHost.tsx` (provider, request-response) — Title rollup

**Analog:** self (lines 43–61)

```typescript
const [best, setBest] = useState(0);
// F-26: same singleton as PlayingHost — Title best matches Playing.
const store = useMemo(() => createDefaultPersonalBestStore(), []);

useEffect(() => {
  if (shellPhase !== 'title') return;
  let cancelled = false;
  void store
    .getBest()
    .then((b) => {
      if (!cancelled) setBest(b);
    })
    .catch(() => {
      if (!cancelled) setBest(0);
    });
  return () => {
    cancelled = true;
  };
}, [shellPhase, store]);
```

**Copy for C1:**
- Swap to ProgressStore singleton (or ProgressStore that still implements `getBest()` as max rollup).
- Re-read when returning to Title after Menu so unlocked/rollup state is fresh (existing `shellPhase === 'title'` effect already does this).
- Do **not** add per-frame reads; TitleScreen stays presentational (`best` prop only).

---

### `src/runtime/overlays/ResultOverlay.tsx` (component, request-response)

**Analog:** self (lines 45–50)

```tsx
<Text style={styles.metric}>Score · {score}</Text>
<Text style={styles.metric}>Best · {best}</Text>
{isNewRecord ? (
  <View style={styles.badge}>
    <Text style={styles.badgeLabel}>New Record</Text>
  </View>
) : null}
```

**Copy for C1:**
- Wire-only in C1 if host already passes per-level `best` — no chrome redesign required (C2 polish).
- Optional label tweak (“Level best”) is discretion / C2.

---

### `app/_components/TitleScreen.tsx` (component)

**Analog:** self — no structural change; continues `Best · ${best}` (line 29). Host supplies rolled-up max (D-07).

---

### `tests/storage.progress.test.ts` *(new)* (test, transform)

**Analog:** `tests/storage.personal-best.test.ts`

**Structure to copy** (imports + describe blocks):

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
// pure compare / parse / memory / singleton reset — same style
import { __resetSharedPersonalBestStoreForTests } from '../src/services/storage/asyncStorageStore';

describe('evaluatePersonalBest', () => { /* … */ });
describe('parsePersonalBestBlob / Result (F-26)', () => { /* … */ });
describe('memory store watermark (F-26)', () => { /* … */ });
describe('createDefaultPersonalBestStore singleton (F-26)', () => {
  beforeEach(() => {
    __resetSharedPersonalBestStoreForTests();
  });
  // …
});
```

**C1 cases required by context:**
- migrate: v1-only → unlocks `['level-01']`, `bestScore` seeded
- unlock: win on `level-01` unlocks `level-03`; lose does not unlock
- persist fail-soft: corrupt v2 → defaults, no throw
- per-level best: higher score updates; lower does not
- catalog order: next after `level-06` is null; `level-02` absent
- singleton + memory watermark parallels F-26 tests

**Also mirror:** `tests/runtime.loadLevel.test.ts` `PLAYABLE` array (lines 9–16) — keep in sync with exported catalog order.

**UI mock pattern** (`tests/ui/GameHost.test.tsx` lines 35–38):

```typescript
vi.mock('../../src/services/storage', () => ({
  createDefaultPersonalBestStore: () => ({
    getBest: () => Promise.resolve(7),
  }),
}));
```

Update mock to ProgressStore / `getBest` rollup when GameHost switches.

---

### `docs/ops/PROGRESS-UNLOCK.md` *(new)* (docs)

**Analog:** `docs/ops/POWERUPS-B2.md` — short status + tables for rules

Document: catalog order (D-01), unlock on WON only (D-04), per-level best on win|lose (D-05), key `@nbb/progress/v2`, migrate from `@nbb/personal-best/v1`, fail-soft defaults.

---

## Shared Patterns

### Singleton store (Title ↔ Playing)

**Source:** `src/services/storage/asyncStorageStore.ts` (`sharedStore`, `createDefaultPersonalBestStore`, `__resetShared…ForTests`)  
**Apply to:** ProgressStore factory used by `GameHost` + `PlayingHost`

### Fail-soft parse (corrupt ≠ absent)

**Source:** `src/services/storage/parseBlob.ts` `ParseBestResult`  
**Apply to:** all progress JSON reads; never throw into gameplay (D-09)

### High-watermark + pending flush

**Source:** `asyncStorageStore.ts` `memoryBest` / `pendingWrite` / `flush`  
**Apply to:** global + per-level bests; flush from `PlayingHost.onOsPause` (and `subscribeAppStateAutoPause` if host uses `onBackgroundFlush`)

### End-of-run cold path (never on frame)

**Source:** `PlayingHost.handleRunEnded` + `runEndedRef` + `applyChrome` WON/LOST  
**Apply to:** persist best + unlock; keep platform `onRunEnded` seams after storage updates

### Playable catalog order

**Source:** `loadLevel.ts` `LevelId` + `PlayingHost.toggleDevLevel` order array + `tests/runtime.loadLevel.test.ts` `PLAYABLE`  
**Apply to:** unlock chain, DEV cycle, docs, migrate defaults — single exported constant

### Layer contract

**Source:** `docs/layer-contract.md` LC-04 — storage I/O from `app/` / `services/` only; sim stays pure (C1-CONTEXT specifics)

### AsyncStorage native soft-fail

**Source:** `asyncStorageStore.ts` `hasAsyncStorageNative` + VITEST early return + memory fallback  
**Apply to:** ProgressStore identically so Vitest stays green without native module

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | None — migrate is new but composed from `parseBlob` + D-08; no blank slate |

---

## Metadata

**Analog search scope:** `src/services/storage/**`, `src/runtime/loadLevel.ts`, `src/runtime/overlays/ResultOverlay.tsx`, `src/runtime/GameScreen.tsx`, `src/runtime/appStatePause.ts`, `app/_components/{PlayingHost,GameHost,TitleScreen}.tsx`, `tests/storage.personal-best.test.ts`, `tests/runtime.loadLevel.test.ts`, `tests/ui/GameHost.test.tsx`, `docs/ops/*`  
**Files scanned:** ~35  
**Pattern extraction date:** 2026-09-24
