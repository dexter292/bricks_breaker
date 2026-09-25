# Phase C2: Level Select + Stars + Replay - Pattern Map

**Mapped:** 2026-09-25  
**Files analyzed:** 20  
**Analogs found:** 20 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/services/storage/types.ts` | model | file-I/O | self — ProgressBlob v2 + `ProgressStore` | exact (evolve → v3) |
| `src/services/storage/stars.ts` *(new)* | utility | transform | `compareBest.ts` + `unlock.ts` (pure helpers) | role-match |
| `src/services/storage/parseBlob.ts` | utility | transform | self — `parseProgressResult` / `sanitizeProgress` | exact (evolve) |
| `src/services/storage/migrateProgress.ts` | utility | transform | self — `migrateOrDefault` v1→v2 | exact (evolve → v1/v2→v3) |
| `src/services/storage/memoryStore.ts` | service | CRUD | self — `createMemoryProgressStore` | exact (evolve) |
| `src/services/storage/asyncStorageStore.ts` | service | file-I/O | self — hydrate + `mergeHighWatermark` + persist | exact (evolve) |
| `src/services/storage/index.ts` | utility | — | self — barrel exports | exact (evolve) |
| `app/_components/SelectScreen.tsx` *(new)* | component | request-response | `TitleScreen.tsx` (chrome) + GameHost mount-snapshot | exact |
| `app/_components/GameHost.tsx` | provider | request-response | self — `ShellPhase` Title↔Playing | exact (evolve + select) |
| `app/_components/PlayingHost.tsx` | provider | event-driven | self — `toggleDevLevel` + `handleRunEnded` + bake gate | exact (evolve) |
| `app/_components/TitleScreen.tsx` | component | request-response | self — `onPlay` already; GameHost rewires target | exact (wire-only) |
| `src/runtime/overlays/ResultOverlay.tsx` | component | request-response | self + `PauseOverlay` button stack | exact (evolve) |
| `src/runtime/GameScreen.tsx` | component | request-response | self — pass-through ResultOverlay props | exact (evolve) |
| `src/runtime/loadLevel.ts` | utility | transform | self — remove default `LevelId` | exact (evolve) |
| `docs/ops/PROGRESS-STORAGE.md` | config | — | self — C1 ops table | exact (extend) |
| `docs/ops/SOAK-PHYSICAL.md` | config | — | self — Select-skip note already present | exact (verify) |
| `tests/storage.progress-v3.test.ts` *(new)* | test | transform | `tests/storage.progress-v2.test.ts` | exact |
| `tests/ui/SelectScreen.test.tsx` *(new)* | test | request-response | `tests/ui/TitleScreen.test.tsx` | exact |
| `tests/ui/GameHost.test.tsx` | test | request-response | self — Title→Playing stub path | exact (evolve) |
| `tests/ui/PlayingHost.next-bake.test.ts` *(new)* | test | event-driven | `tests/ui/PlayingHost.bake-gate.test.ts` (+ D-03 behavioral) | role-match |
| `tests/ui/GameScreen.test.tsx` / ResultOverlay | test | request-response | self — win Retry/Menu contract | exact (extend) |
| `tests/runtime.loadLevel.test.ts` | test | transform | self — drop default-id assertion | exact (evolve) |

**Unchanged reuse (no new file):** `catalog.ts` (`PLAYABLE_LEVEL_ORDER` / `nextLevelId`), `unlock.ts` (`isUnlocked` / `unlockAfterClear`).

---

## Pattern Assignments

### `src/services/storage/types.ts` (model, file-I/O) — ProgressBlob v3

**Analog:** `src/services/storage/types.ts`

**Versioned key + blob shape** (lines 19–42):

```typescript
/** Campaign progress blob (N-PROG-01 / N-PROG-02). */
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

**Copy for C2 (D-04 / discretion omit stars until win):**
- Bump `PROGRESS_VERSION = 3`, `PROGRESS_KEY = '@nbb/progress/v3'`.
- `LevelBest = { score: number; stars?: 1 | 2 | 3 }` — omit `stars` until first win.
- `bestByLevel: Partial<Record<LevelId, LevelBest>>`.
- Evolve `ProgressStore`: keep `getSnapshot` / `isUnlocked` / `flush`; evolve `recordLevelBest` (or add `recordRunEnd`) so win path can merge score+stars+unlock and **return** a cloned blob (D-10).

**Store interface today** (lines 44–52) — extend, do not replace Title `getBest()`:

```typescript
export interface ProgressStore {
  getBest(): Promise<number>;
  getBestForLevel(id: LevelId): Promise<number>;
  recordLevelBest(id: LevelId, score: number): Promise<void>;
  unlockAfterClear(id: LevelId): Promise<void>;
  isUnlocked(id: LevelId): Promise<boolean>;
  getSnapshot(): Promise<ProgressBlob>;
  flush?(): Promise<void>;
}
```

---

### `src/services/storage/stars.ts` *(new)* (utility, transform)

**Analog:** `src/services/storage/compareBest.ts` + `unlock.ts`

**Pure evaluate pattern** (`compareBest.ts` lines 1–10):

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

**Pure unlock / membership** (`unlock.ts` lines 7–16):

```typescript
export function isUnlocked(
  unlocked: readonly LevelId[],
  id: LevelId,
): boolean {
  if (id === 'level-01') {
    return true;
  }
  return unlocked.includes(id);
}
```

**Copy for C2:**
- `computeStars(livesRemaining): StarCount` — `Math.max(1, Math.min(3, floor(n)))`; non-finite → 1 (D-07 / pitfall lives>3).
- `mergeLevelBest(prev, score, starsFromWin | null)` — score max always; stars only when win arg non-null; preserve prior stars on lose.
- `selectRowState(id, unlocked, best): 'locked' | 'uncleared' | 'cleared'` — cleared iff `best?.stars` ∈ {1,2,3} (D-18 / D-23). Prefer colocate in `stars.ts` or thin `selectRow.ts`.

---

### `src/services/storage/parseBlob.ts` (utility, transform) — v3 sanitize

**Analog:** self

**Fail-soft discriminated result + v check** (lines 47–50, 110–149):

```typescript
export type ParseProgressResult =
  | { status: 'ok'; progress: ProgressBlob }
  | { status: 'absent'; progress: ProgressBlob }
  | { status: 'corrupt'; progress: ProgressBlob };

export function parseProgressResult(raw: string | null): ParseProgressResult {
  // ...
  if (blob.v !== 2) {
    return { status: 'corrupt', progress: defaultProgressBlob() };
  }
  // ...
  return {
    status: 'ok',
    progress: sanitizeProgress({ /* ... */ }),
  };
}
```

**Field-by-field sanitize** (lines 54–108) — keep PLAYABLE_SET filter; never `Object.assign` from raw JSON:

```typescript
function sanitizeProgress(raw: {
  unlocked: unknown;
  bestByLevel: unknown;
  bestScore: unknown;
  updatedAt: unknown;
}): ProgressBlob {
  // unlocked: only PLAYABLE_LEVEL_ORDER ids; ensure level-01
  // bestByLevel: floor finite ≥0 numbers keyed by playable id
  // bestScore: max(rollup, per-level)
  return { v: 2, unlocked, bestByLevel, bestScore, updatedAt };
}
```

**Copy for C2:**
- Accept `v === 3` only in `parseProgressResult`.
- Nested sanitize: `bestByLevel[id] = { score: floor(n) }` + optional `stars` only if `1|2|3`.
- Reject unknown `v` (including leftover v2 JSON under v3 key) as corrupt → defaults (watermark merge stays in async store).
- Keep v2 parser available for migrate input (rename/internal `parseProgressV2Result` or parse-by-version helper).

---

### `src/services/storage/migrateProgress.ts` (utility, transform) — v1/v2→v3

**Analog:** self (`migrateOrDefault` lines 12–30)

```typescript
/**
 * Prefer valid v2. If v2 absent/corrupt, seed bestScore from v1 only
 * (unlocked stays [level-01]; bestByLevel empty).
 */
export function migrateOrDefault(
  v2Raw: string | null,
  v1Raw: string | null,
): ProgressBlob {
  const v2 = parseProgressResult(v2Raw);
  if (v2.status === 'ok') {
    return v2.progress;
  }

  const v1 = parsePersonalBestResult(v1Raw);
  if (v1.status === 'ok') {
    const base = defaultProgressBlob();
    base.bestScore = v1.best;
    base.updatedAt = Date.now();
    return base;
  }

  return defaultProgressBlob();
}
```

**Copy for C2 (D-05):**
- Prefer valid **v3**.
- Else migrate **v2→v3**: preserve `unlocked`; map `number → { score }` (omit stars); keep rollup `bestScore`.
- Else migrate **v1→v3**: seed `bestScore` only; `unlocked=['level-01']`; empty `bestByLevel`.
- Do **not** delete v1/v2 keys on disk (rollback safety).
- Gate write-through to `@nbb/progress/v3` until C1 device UAT approved (precondition).

---

### `src/services/storage/memoryStore.ts` + `asyncStorageStore.ts` (service)

**Analog:** self

**Clone + record watermark** (`memoryStore.ts` lines 27–63):

```typescript
function cloneBlob(b: ProgressBlob): ProgressBlob {
  return {
    v: 2,
    unlocked: [...b.unlocked],
    bestByLevel: { ...b.bestByLevel },
    bestScore: b.bestScore,
    updatedAt: b.updatedAt,
  };
}

async recordLevelBest(id: LevelId, score: number): Promise<void> {
  const n = Math.floor(score);
  // ...
  const prev = blob.bestByLevel[id] ?? 0;
  if (!(n > prev)) {
    return;
  }
  blob.bestByLevel[id] = n;
  if (n > blob.bestScore) {
    blob.bestScore = n;
  }
  blob.updatedAt = Date.now();
}
```

**Never lower watermarks** (`asyncStorageStore.ts` lines 155–188):

```typescript
/** Never lower known watermarks when merging disk into memory (F-26). */
function mergeHighWatermark(
  memory: ProgressBlob,
  incoming: ProgressBlob,
): ProgressBlob {
  // max per-level scores; union unlocked; max bestScore/updatedAt
  return { v: 2, unlocked, bestByLevel, bestScore, updatedAt };
}
```

**Hydrate + migrate-on-read** (`asyncStorageStore.ts` lines 274–305):

```typescript
async function ensureHydrated(): Promise<void> {
  if (hydrated) return;
  const v2Raw = await AsyncStorage.getItem(PROGRESS_KEY);
  const parsed = parseProgressResult(v2Raw);
  if (parsed.status === 'ok') {
    memory = mergeHighWatermark(memory, parsed.progress);
    hydrated = true;
    return;
  }
  const v1Raw = await AsyncStorage.getItem(PERSONAL_BEST_KEY);
  const migrated = migrateOrDefault(v2Raw, v1Raw);
  memory = mergeHighWatermark(memory, migrated);
  // write-through once when seeded from legacy
}
```

**Copy for C2:**
- Nested clone: `{ ...bestByLevel, [id]: { ...LevelBest } }` (shallow map + object copy).
- `mergeHighWatermark`: max `score`; max `stars` when both present; never drop stars when incoming omits.
- Hydrate: read v3 key first; else read v2 (+ v1) via migrate; write-through v3 once.
- Prefer **sync memory update** then `void persist` for `recordRunEnd` so Results can use returned blob without awaiting disk (D-10 / F-26).

---

### `app/_components/SelectScreen.tsx` *(new)* (component, request-response)

**Analog:** `app/_components/TitleScreen.tsx` + GameHost title snapshot effect

**Chrome / safe-area / SpaceMono / Pressable** (`TitleScreen.tsx` lines 1–40):

```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function TitleScreen({ best, onPlay }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {/* brand / Best · N / Play Pressable accessibilityLabel="Start game" */}
    </View>
  );
}
```

**Tokens to copy from Title styles** (lines 43–88): root `#1a1a2e`, SpaceMono, filled primary white CTA, Body 16/400, Label 14 for outline secondary.

**Mount refresh pattern** (`GameHost.tsx` lines 47–61) — Select uses `getSnapshot()` instead of `getBest()`:

```typescript
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

**Copy for C2 (UI-SPEC / D-17…D-21):**
- Props: `onBack`, `onChoose(id: LevelId)`; create store via `createDefaultProgressStore()` (or inject for tests).
- On **every mount**: `getSnapshot()` → local state; fail soft to defaults (no error modal).
- Vertical list of `PLAYABLE_LEVEL_ORDER` (5 rows); row labels **Level 01/03/04/05/06**.
- Locked: muted + **Locked**; `accessibilityState.disabled`; press no-op.
- Uncleared: **☆☆☆**; no Best line.
- Cleared: ★/☆ mix + **Best · {n}**.
- Back outline (copy ResultOverlay/PauseOverlay `menuButton` style) → Title.
- Heading **Levels** (Heading 20/600).

---

### `app/_components/GameHost.tsx` (provider, request-response) — ShellPhase + select

**Analog:** self

**Shell phase + CERT bypass** (lines 10–42, 142–156):

```typescript
type ShellPhase = 'title' | 'playing';

const [shellPhase, setShellPhase] = useState<ShellPhase>(() =>
  CERT_HARNESS && !SOAK_HARNESS ? 'playing' : 'title',
);
useEffect(() => {
  if (!CERT_HARNESS) return;
  console.log('[cert] GameHost CERT=1 phase=playing (skip Title)');
}, []);

if (shellPhase === 'title') {
  return (
    <View style={styles.root}>
      {harnessAwake}
      <TitleScreen best={best} onPlay={() => setShellPhase('playing')} />
    </View>
  );
}

return (
  <View style={styles.root}>
    {harnessAwake}
    <PlayingHost onMenu={() => setShellPhase('title')} />
  </View>
);
```

**SOAK Title↔Playing only** (lines 63–130) — `setShellPhase('playing'|'title')` only; **do not** insert `'select'` (D-01).

**Copy for C2:**
- `ShellPhase = 'title' | 'select' | 'playing'`.
- Title `onPlay` → `'select'` (D-14).
- Select branch: `<SelectScreen onBack={() => setShellPhase('title')} onChoose={(id) => { setActiveLevelId(id); setShellPhase('playing'); }} />`.
- Hold `activeLevelId: LevelId` state; pass **required** `levelId` into `PlayingHost`.
- CERT: keep initial `'playing'` + pass `levelId="level-03"` (bypass Select).
- Menu / Playing `onMenu` → `'title'` (D-22).
- Playing unmounts when leaving `'playing'` (existing conditional render).

---

### `app/_components/PlayingHost.tsx` (provider, event-driven) — levelId / Next / handleRunEnded

**Analog:** self

**Props + default levelId today** (lines 94–96, 134):

```typescript
type Props = {
  onMenu: () => void;
};

const [levelId, setLevelId] = useState<LevelId>('level-03');
```

**Bake / fxReady / gate owns setActive** (lines 181–192, 370–389):

```typescript
const loadResult = useMemo(() => loadLevelById(levelId), [levelId]);
const loadKey = loadResult.ok
  ? `${levelId}:${loadResult.compiled.brickCount}:...`
  : `err:${levelId}`;
const fxReady = loadResult.ok && bakedKey === loadKey;

useEffect(() => {
  if (!loadResult.ok) {
    compiledSv.value = null;
    setActive(false);
    return;
  }
  if (!fxReady) {
    setActive(false);
    return;
  }
  compiledSv.value = loadResult.compiled;
  retry();
  setActive(true); // LAST — only here after levelId change paths
}, [loadResult, fxReady, compiledSv, setActive, retry]);
```

**handleRunEnded cold path** (lines 407–428) — evolve to return blob + stars:

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
      void store.recordLevelBest(levelId, best).catch(() => {});
    }
    if (outcome === 'win') {
      void store.unlockAfterClear(levelId).catch(() => {});
    }
    // platform.ads/purchases/accounts.onRunEnded(...)
  },
  [platform, store, levelId],
);
```

**Next template = toggleDevLevel** (lines 562–587) — **must mirror** including `runEndedRef.current = false`; **never** `setActive(true)`:

```typescript
const toggleDevLevel = useCallback(() => {
  const order = PLAYABLE_LEVEL_ORDER;
  setLevelId((prev) => {
    const i = order.indexOf(prev);
    const next = order[i < 0 ? 0 : (i + 1) % order.length]!;
    return next;
  });
  // Loop re-arm: levelId → loadKey flip → bake → fxReady → gate effect
  // Do not setActive(true) here — fxReady is false until bake (R-26 / R-24).
  clearCountdown();
  setCountdownNumeral(null);
  setResult(null);
  setIsNewRecord(false);
  runEndedRef.current = false;
  setLives(3);
  setScore(0);
  setCombo(1);
  setStallTier(0);
  setSimPhaseNum(SIM.DOCKED);
  setUiPhase('playing');
}, [clearCountdown]);
```

**Retry still arms when same level + fxReady** (lines 525–544) — keep; Next must **not** copy Retry’s `setActive(true)`.

**Copy for C2:**
- Props: `levelId: LevelId` required; `onLevelIdChange?: (id: LevelId) => void` for Next + DEV when controlled from GameHost.
- Remove internal `useState('level-03')` default on play path (D-15).
- `handleRunEnded(score, outcome, livesRemaining)`: on win `computeStars` + merge + unlock **in one memory update**; return/set blob for Results stars + Next gate (`nextLevelId(id) && isUnlocked(next)`).
- `onNext`: same checklist as `toggleDevLevel`, then `onLevelIdChange(next)` / `setLevelId(next)` only.
- Cert force `level-03` effect stays (D-15 site 3).

---

### `src/runtime/overlays/ResultOverlay.tsx` + `GameScreen.tsx` (component)

**Analog:** `ResultOverlay.tsx` + `PauseOverlay.tsx` button stack

**Props + Retry filled / Menu outline** (`ResultOverlay.tsx` lines 4–67):

```typescript
type Props = {
  kind: 'win' | 'lose';
  score: number;
  best: number;
  isNewRecord: boolean;
  onRetry: () => void;
  onMenu: () => void;
};

{/* Retry Pressable styles.button (white fill) */}
{/* Menu Pressable styles.menuButton (outline) */}
```

**Pass-through today** (`GameScreen.tsx` lines 159–167):

```typescript
{showResult ? (
  <ResultOverlay
    kind={result!}
    score={score}
    best={best}
    isNewRecord={isNewRecord}
    onRetry={onRetry}
    onMenu={onMenu}
  />
) : null}
```

**Copy for C2 (D-11 / D-12 / UI-SPEC):**
- Add optional `stars?: 1 | 2 | 3 | null` — render ★/☆ row on **win only**; omit on lose.
- Add optional `onNext?: (() => void) | null` — render **Next** (filled, same as Retry) only when function provided; **omit** control when null/undefined (no disabled Next).
- Button order: Retry → Next? → Menu; gap `md` (16).
- a11y: Next `Play next level`; Menu stays `Return to title`.
- `GameScreenProps` + PlayingHost wiring: pass stars from returned blob; pass `onNext` when gated on.

---

### `src/runtime/loadLevel.ts` (utility) — remove default

**Analog:** self (lines 32–38)

```typescript
/**
 * Validate + compile a bundled level by id. Default id is level-03 (D-06).
 */
export function loadLevelById(id: LevelId = 'level-03'): LoadLevelResult {
  const raw = LEVEL_MODULES[id];
  return loadAndCompile(raw);
}
```

**Copy for C2 (D-14 / D-15):**
- Signature: `loadLevelById(id: LevelId): LoadLevelResult` — **no default**.
- Call sites must pass explicit id (PlayingHost prop, CERT `'level-03'`).
- Update `tests/runtime.loadLevel.test.ts` — delete `loadLevelById()` default assertion; keep explicit playable-id loads.

---

### Docs

| File | Analog | Copy |
|------|--------|------|
| `docs/ops/PROGRESS-STORAGE.md` | self | Extend for v3 nested bests, lives-based stars (N-PROG-03 amend), Select three-state rules, remove “default start level-03 until C2” |
| `docs/ops/SOAK-PHYSICAL.md` | self (Select-skip already at ~L25) | Verify wording matches D-01; extend only if impl differs |

---

### Tests

#### `tests/storage.progress-v3.test.ts` *(new)*

**Analog:** `tests/storage.progress-v2.test.ts`

**Structure to copy** (imports + migrate/parse/store describes, lines 1–20, 70–185):

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  PROGRESS_KEY,
  PROGRESS_VERSION,
  defaultProgressBlob,
  parseProgressResult,
  migrateOrDefault,
  createMemoryProgressStore,
  // ...
} from '../src/services/storage';

describe('migrateOrDefault (C1 Wave 1)', () => {
  it('v1-only seeds bestScore; unlocked=[level-01]; empty bestByLevel', () => {
    // ...
  });
  it('valid v2 preferred over v1', () => { /* ... */ });
  it('corrupt v2 + ok v1 seeds from v1 (do not lose PB)', () => { /* ... */ });
});
```

**C2 cases:** v1→v3; v2→v3 preserves unlocked + `{score}` omit stars; valid v3 preferred; corrupt v3 → defaults; watermark not clobbered; win merges `max(stars)`; lose does not write stars; `computeStars` clamp 0→1, 5→3.

#### `tests/ui/SelectScreen.test.tsx` *(new)*

**Analog:** `tests/ui/TitleScreen.test.tsx` (jsdom + safe-area mock + Pressable a11y)

```typescript
/** @vitest-environment jsdom */
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));
```

**Assert:** three row states from mocked snapshot; locked tap does not call `onChoose`; mount calls `getSnapshot`; Back calls `onBack`.

#### `tests/ui/GameHost.test.tsx` (evolve)

**Analog:** self (lines 65–79)

```typescript
it('Title → Play → PlayingStub → Menu → Title', async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  expect(screen.getByText('PlayingStub')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
  expect(screen.getByText('Neon Brick Breaker')).toBeTruthy();
});
```

**Copy for C2:** Title → Play → **Select** → unlocked row → PlayingStub → Menu → Title; mock Select or use real Select with mocked store; PlayingHost stub must accept `levelId` prop.

#### `tests/ui/PlayingHost.next-bake.test.ts` *(new)*

**Analog:** `tests/ui/PlayingHost.bake-gate.test.ts` (source contract) + RESEARCH D-03 behavioral follow-up

**Source contract today** (lines 39–46) — keep and extend for Next:

```typescript
it('toggleDevLevel does not arm the loop itself (R-26)', () => {
  const m = code.match(
    /const toggleDevLevel = useCallback\(\(\) => \{([\s\S]*?)\}, \[clearCountdown\]\)/,
  );
  expect(m![1]).not.toMatch(/setActive\s*\(\s*true\s*\)/);
  expect(m![1]).toMatch(/setLevelId/);
});
```

**D-03 behavioral (preferred):** mock `useGameLoop` + fake timers; after Next / select-driven `levelId` change, assert `setActive(true)` is the **last** call (no Skia).

#### `tests/ui/GameScreen.test.tsx` / ResultOverlay (extend)

**Analog:** self win contract (lines 86–104)

```typescript
it('result win: shows Win / Retry from ResultOverlay', () => {
  // ...
  expect(screen.getByRole('button', { name: 'Retry level' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Return to title' })).toBeTruthy();
});
```

**Add:** win + `onNext` shows Next; win without `onNext` / lose hides Next; win shows stars glyphs when `stars` set.

#### `tests/runtime.loadLevel.test.ts` (evolve)

**Remove** (lines 24–35):

```typescript
it('loadLevelById() default is level-03', () => {
  const result = loadLevelById();
  // ...
});
```

**Keep** explicit `loadLevelById('level-03')` and playable-set loops.

---

## Shared Patterns

### Fail-soft parse + watermark (F-26)

**Source:** `parseBlob.ts` + `asyncStorageStore.mergeHighWatermark`  
**Apply to:** v3 parse, migrate, async hydrate, corrupt v3 reads

- Discriminated `ok | absent | corrupt`; never throw to UI.
- Memory watermarks never lowered by corrupt disk JSON.
- Soft-fail writes; `flush()` on AppState pause.

### Bake gate / setActive ownership (R-24 / R-26)

**Source:** `PlayingHost.tsx` gate effect + `toggleDevLevel`  
**Apply to:** Select→play levelId, Next, DEV toggle

- `fxReady = bakedKey === loadKey`.
- Only gate effect calls `setActive(true)` after levelId change.
- Next / Select start / DEV: reset chrome + `runEndedRef=false` + change levelId; **never** `setActive(true)` in those callbacks.

### CERT / SOAK harness law (D-01)

**Source:** `GameHost.tsx` initial phase + soak timers  
**Apply to:** ShellPhase union growth

- CERT: initial `'playing'`, skip Title **and** Select; force `level-03`.
- SOAK: only `'title' | 'playing'`; document Select skip in `SOAK-PHYSICAL.md`.

### Navy / flat chrome (UI-SPEC)

**Source:** `TitleScreen.tsx`, `ResultOverlay.tsx`, `PauseOverlay.tsx`  
**Apply to:** SelectScreen, ResultOverlay Next/stars

| Token | Value |
|-------|-------|
| Dominant | `#1a1a2e` |
| Panel | `#12121f` |
| Scrim | `rgba(0,0,0,0.6)` |
| Primary CTA | white fill, label `#1a1a2e` |
| Secondary | outline white border (Back / Menu) |
| Muted / empty star | `#6B7280` |
| Font | SpaceMono only; 44×44 touch floor |

### Progress I/O cold path only

**Source:** C1 PlayingHost `handleRunEnded` + Title/Select mount effects  
**Apply to:** all store reads/writes

- No AsyncStorage / React state in worklets or per-frame path.
- Results consume blob returned from end-of-run write (D-10); Select remounts for fresh snapshot.

### Catalog identity

**Source:** `catalog.ts` lines 7–29  
**Apply to:** Select rows, Next gate, DEV cycle

```typescript
export const PLAYABLE_LEVEL_ORDER: readonly LevelId[] = [
  'level-01', 'level-03', 'level-04', 'level-05', 'level-06',
] as const;

export function nextLevelId(id: LevelId): LevelId | null { /* ... */ }
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | None — every C2 file maps to an in-repo analog (C1 storage evolve, Title chrome, PlayingHost bake/Next template, existing UI tests). |

Planner note: pure star formula is **new logic** but follows existing pure-helper file patterns (`compareBest` / `unlock`); behavioral setActive-last test is the only pattern that upgrades from source-grep to mocked host (bake-gate file already documents that ideal follow-up).

---

## Metadata

**Analog search scope:** `src/services/storage/`, `app/_components/`, `src/runtime/` (+ overlays), `tests/`, `tests/ui/`, `docs/ops/`  
**Files scanned:** ~40 (storage 9, shell 3, runtime overlays/load/GameScreen, UI + storage tests, ops docs)  
**Pattern extraction date:** 2026-09-25  
**Upstream:** `C2-CONTEXT.md`, `C2-RESEARCH.md`, `C2-UI-SPEC.md`  
**Prior map:** `.planning/post-mvp/phases/C1-progress-storage/C1-PATTERNS.md` (v2 substrate this phase evolves)
