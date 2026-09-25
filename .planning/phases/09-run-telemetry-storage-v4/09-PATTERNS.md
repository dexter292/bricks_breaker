# Phase 9: Run Telemetry & Storage v4 - Pattern Map

**Mapped:** 2026-09-25
**Files analyzed:** 11 (new/modified) + 2 new test files
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/runtime/runStats.ts` (NEW) | utility (worklet reducer) | event-driven | `src/vfx/consumeEvents.ts` | exact |
| `src/runtime/useGameLoop.ts` (+1 call site, +1 SharedValue) | hook / runtime loop | streaming (per-substep) | itself — mirror `vfxSv`/`flashSv` allocation + drain sites | exact |
| `src/services/storage/types.ts` (v3→v4 additions) | model / types | CRUD | itself (`ProgressBlob` v3 block) | exact |
| `src/services/storage/parseBlob.ts` (+parseProgressResultV4) | utility (parser) | transform | itself (`parseProgressResult` / `sanitizeProgressV3`) | exact |
| `src/services/storage/migrateProgress.ts` (+v3ToV4, +migrateOrDefaultV4) | service (migration) | batch/transform | itself (`v2ToV3` / `migrateOrDefault`) | exact |
| `src/services/storage/telemetry.ts` (NEW) | service (merge/aggregate) | CRUD | `src/services/storage/stars.ts` + `watermark.ts` (pure merge helpers) | role-match |
| `src/services/storage/memoryStore.ts` (`recordRunEnd` extended) | store / CRUD | request-response | itself (`recordRunEnd` in this file) | exact |
| `src/services/storage/asyncStorageStore.ts` (`recordRunEnd` extended, hydrate chain +v4) | store / CRUD | request-response, file-I/O | itself (`recordRunEnd` + `ensureHydrated` in this file) | exact |
| `app/_components/PlayingHost.tsx` (`runStartedAtRef`, `handleMenuPress`, extended `handleRunEnded`) | controller (host component) | request-response, event-driven | itself (`handleRunEnded` / `applyChrome` / `BackHandler` effect) | exact |
| `app/_components/GameHost.tsx` (no functional change expected; verify `onMenu` wiring) | controller (shell) | request-response | itself | exact |
| `tests/telemetry.reduce-run-events.test.ts` (NEW) | test | event-driven / determinism | `tests/helpers/balanceBot.ts` + `tests/levels.verb-curve-e1b.test.ts` | role-match |
| `tests/storage.progress-v4.test.ts` (NEW) | test | CRUD / migration | `tests/storage.progress-v3.test.ts` | exact |

## Pattern Assignments

### `src/runtime/runStats.ts` (NEW) — utility, event-driven reducer

**Analog:** `src/vfx/consumeEvents.ts` (`consumeEventsForVfx`)

**Imports pattern** (`src/vfx/consumeEvents.ts` lines 1-13):
```typescript
/**
 * Drain World event ring into cosmetic VFX (particles + shake).
 * Does NOT clear the ring — stepRun owns clear policy (scoring analog).
 */
import type { World } from '../core/types';
import { EventCode, BrickFlags } from '../core/types';
import { nextFloat } from '../core/rng/mulberry32';
import type { VfxState } from './types';
import { IMPULSE_DESTROY, IMPULSE_LIFE_LOST } from './types';
```
For `runStats.ts`, mirror this shape: `import type { World } from '../core/types'; import { EventCode, BrickFlags } from '../core/types';` — no import from `services/` (LC-04 boundary), no import from `react-native-reanimated` needed inside the reducer itself (only `useGameLoop.ts` needs `useSharedValue`).

**Core ring-walk pattern to copy verbatim** (`src/vfx/consumeEvents.ts` lines 57-90):
```typescript
export function consumeEventsForVfx(
  world: World,
  vfx: VfxState,
  intensity: number,
  opts?: ConsumeVfxOpts,
): void {
  'worklet';
  const n = world.evCount;
  if (n <= 0) {
    return;
  }
  // ...
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    const code = world.evCode[idx];
    const x = world.evX[idx];
    const y = world.evY[idx];
    const brickIndex = world.evB[idx];

    if (code === EventCode.BRICK_HIT) {
      // evA = HP before damage (F-13); fall back to live HP if absent
      const hpSnap = world.evA[idx];
      // ...
    }
  }
}
```
Copy this exact `(world.evHead - n + world.evCap) % world.evCap` start computation and per-index `code = world.evCode[idx]` idiom into `reduceRunTelemetry(world, stats)`. **Read-only contract**: never mutate `world.*`, never call `clearEvents` — the existing per-substep drain order in `useGameLoop.ts` already clears/refills the ring between calls (see below). Add a `'worklet'` directive at the top of the exported function, matching this file's convention.

**Event payload semantics to rely on** (verified directly, not inferred):
- `src/core/events/ring.ts` lines 11-29 (`pushEvent`): signature is `pushEvent(world, code, a, b, x, y)`.
- `src/core/rules/pickups.ts` line 174: `pushEvent(world, EventCode.POWERUP_CATCH, type, -1, x, y);` — so for `POWERUP_CATCH`, `evA` = the `PickupType` code (1=MULTIBALL, 2=EXPAND, 3=EXTRA_LIFE, 4=SLOW, 5=FIREBALL — `src/core/types.ts` lines 37-43), `evB = -1`.
- `src/core/types.ts` lines 9-19: `EventCode` = `{ WALL_HIT:1, PADDLE_HIT:2, BRICK_HIT:3, BRICK_BREAK:4, BALL_OUT:5, POWERUP_CATCH:6, LIFE_LOST:7, WIN:8, LOSE:9 }`.
- `src/core/types.ts` lines 22-26: `BrickFlags = { UNBREAKABLE:1, EXPLOSIVE:2 }` — `world.brickFlags[brickIndex]` is not cleared on break (only `brickHp`/`cellToBrick` are), so it is safe to read post-break for cascade attribution, exactly as `consumeEventsForVfx` already does at line 105-108 (`const flags = brickIndex >= 0 && brickIndex < world.brickCount ? world.brickFlags[brickIndex] : 0;`).

**Running-max / event-counted stat idioms** (from `09-RESEARCH.md` Code Examples, confirmed consistent with the ring-walk contract above — reuse verbatim, do not re-derive):
```typescript
// best combo — read world.combo directly, do NOT re-derive from events (Pitfall: see research)
if (world.combo > stats.bestCombo) {
  stats.bestCombo = world.combo;
}
// lives lost + rally reset — event-sourced, not (3 - livesRemaining) diffed
if (code === EventCode.LIFE_LOST) {
  stats.livesLost += 1;
  stats.rallyCurrent = 0;
}
if (code === EventCode.PADDLE_HIT) {
  stats.rallyCurrent += 1;
  if (stats.rallyCurrent > stats.longestRally) {
    stats.longestRally = stats.rallyCurrent;
  }
}
```

**Worklet-constant convention** (analog: `src/core/rules/speedRamp.ts` lines 16-26, for any tuned literal the reducer needs, e.g. a ring-buffer bound used inside a worklet):
```typescript
import type { World } from '../types';

export function applySpeedRamp(world: World): void {
  'worklet';
  // Literals must match constants.ts — worklets cannot close over module consts.
  const ratePerSecond = 0.01; // SPEED_RAMP_PER_SECOND
  const serveSpeed = 360; // SERVE_SPEED
  const maxSpeed = 720; // MAX_BALL_SPEED
  const ticksPerSecond = 120; // 1 / FIXED_DT
```
If `runStats.ts` needs any tuned constant inside a `'worklet'` function, inline the literal with a `// CONSTANT_NAME` trailing comment exactly like this — worklets cannot close over module-level `const` bindings from outside the worklet boundary in this codebase's convention.

---

### `src/runtime/useGameLoop.ts` (extend, don't rewrite)

**Analog:** itself — three existing `SharedValue` accumulators are the direct template for `runStatsSv`.

**SharedValue declaration + lazy allocation pattern** (lines 259-269, 311-344):
```typescript
const vfxSv = useSharedValue<VfxState | null>(null);
const audioBatchSv = useSharedValue<AudioBatchSoA | null>(null);
const flashSv = useSharedValue<DestroyFlashState>({
  x: 0,
  y: 0,
  life: 0,
  lifeMax: 0.1,
});
// ...
const onFrame = useCallback((frame: { timeSincePreviousFrame: number | null }) => {
  'worklet';
  let w = world.value;
  let vfx = vfxSv.value;
  let batch = audioBatchSv.value;
  if (!w) { /* allocate world */ }
  if (!vfx) {
    vfx = allocateVfx({ maxBalls: w.maxBalls, particleCap: budgetParticleCap, trailMax: budgetTrailMax, glowScale: budgetGlowScale });
    vfxSv.value = vfx;
  }
  if (!batch) {
    batch = createAudioBatch();
    audioBatchSv.value = batch;
  }
```
`runStatsSv` follows the identical shape: `useSharedValue<RunStats | null>(null)`, allocated lazily on first frame with an `allocateRunStats()` factory (SoA-friendly: plain numbers only, no nested objects — same "no per-substep allocation" constraint already documented for `vfx`/`batch`).

**Reset-on-retry site** (lines 350-364, the `resetRequest.value !== resetApplied.value` block) — `runStatsSv.value` must be reset here alongside `flashSv`/`clearCosmeticVfx`/`resetAudioBatch`, since D-01 makes every retry a new run and `world.tick`/`world.combo` are already reset by `applyRetryWorldReset`.

**Per-substep drain call site** (lines 395-403, inside the `while (w.accumulator >= fixedDt ...)` loop):
```typescript
stepRun(w, intent, fixedDt);
// Per-substep drain BEFORE next clearEvents (Pitfall 1 / FX-03)
consumeEventsForVfx(w, vfx, intensity);
appendEventsForAudio(w, batch);
updateFlashFromEvents(w, flash);
```
Add `reduceRunTelemetry(w, stats);` as a fourth line in this exact block, same position (before the ring is next cleared by the following `stepRun`/`clearEvents` cycle), same "no `scheduleOnRN`/`runOnJS`" contract — this is a pure SharedValue mutation, zero new hops (LC-07 stays at 1/frame, unchanged).

**Cross-thread synchronous read precedent** (`chromeSv`/`compiledSv`, confirmed in `PlayingHost.tsx` lines 238-323 and `useGameLoop.ts` return/props) — `runStatsSv.value` is read the same way from JS: no `runOnJS` needed to *read*, only to trigger the JS callback that then reads it (the existing `chromeSeq` reaction already provides that trigger for WON/LOST).

---

### `src/services/storage/types.ts` (v3 → v4 additions)

**Analog:** itself, the existing `ProgressBlob` v3 block (lines 19-65).

**Exact shape to extend** (verbatim, current v3):
```typescript
export const PROGRESS_VERSION = 3 as const;
export const PROGRESS_KEY = '@nbb/progress/v3' as const;
/** Legacy v2 key — migrate-on-read source only; never delete. */
export const PROGRESS_KEY_V2 = '@nbb/progress/v2' as const;

export type ProgressBlob = {
  v: 3;
  unlocked: LevelId[];
  bestByLevel: Partial<Record<LevelId, LevelBest>>;
  bestScore: number;
  updatedAt: number;
};

export function defaultProgressBlob(): ProgressBlob {
  return { v: 3, unlocked: ['level-01'], bestByLevel: {}, bestScore: 0, updatedAt: 0 };
}
```
For v4: bump `PROGRESS_VERSION = 4`, `PROGRESS_KEY = '@nbb/progress/v4'`, add `PROGRESS_KEY_V3 = '@nbb/progress/v3' as const` (never-delete-legacy rule — v3 becomes the new migrate-on-read source, mirroring how `PROGRESS_KEY_V2` already sits beside `PROGRESS_KEY`). Add `ProgressBlobV4` (or bump `ProgressBlob` in place per repo convention — check whether the codebase versions the type name or reuses `ProgressBlob`; this file currently reuses one name per active version, so the safest additive move is renaming the v3 type to `ProgressBlobV3` for migrate-input use, exactly as `ProgressBlobV2` already exists for v2). Add a `telemetry: TelemetryBlob` field alongside `unlocked`/`bestByLevel`/`bestScore`/`updatedAt`.

**`ProgressStore.recordRunEnd` interface to extend** (lines 73-82):
```typescript
recordRunEnd(args: {
  levelId: LevelId;
  score: number;
  outcome: 'win' | 'lose';
  livesRemaining: number;
}): ProgressBlob;
```
Extend the `outcome` union to `'win' | 'lose' | 'abandoned'` (D-03) and add a `stats?: RunStats` (or equivalent) field plus `mode: 'campaign' | 'endless' | 'daily'` (D-04) — same method name, same synchronous-return contract, no new method (C2 lock: "ride `recordRunEnd`, not a parallel call site").

---

### `src/services/storage/parseBlob.ts` (+parseProgressResultV4)

**Analog:** itself — `parseProgressResult` (lines 208-249) and `sanitizeProgressV3` (lines 120-162).

**Fail-soft status contract to preserve exactly:**
```typescript
export type ParseProgressResult =
  | { status: 'ok'; progress: ProgressBlob }
  | { status: 'absent'; progress: ProgressBlob }
  | { status: 'corrupt'; progress: ProgressBlob };
```

**Top-level parse skeleton to copy** (lines 209-249):
```typescript
export function parseProgressResult(raw: string | null): ParseProgressResult {
  if (raw == null) {
    return { status: 'absent', progress: defaultProgressBlob() };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object') {
      return { status: 'corrupt', progress: defaultProgressBlob() };
    }
    const blob = parsed as { v?: unknown; unlocked?: unknown; bestByLevel?: unknown; bestScore?: unknown; updatedAt?: unknown };
    if (blob.v !== 3) {
      return { status: 'corrupt', progress: defaultProgressBlob() };
    }
    if (!Array.isArray(blob.unlocked)) {
      return { status: 'corrupt', progress: defaultProgressBlob() };
    }
    // ... field-by-field checks ...
    return { status: 'ok', progress: sanitizeProgressV3({ /* ... */ }) };
  } catch {
    return { status: 'corrupt', progress: defaultProgressBlob() };
  }
}
```
For v4, `blob.v !== 4` gates the top-level version, but the **critical divergence from this template** (per Pitfall 4 in research and CONTEXT's fail-soft requirement) is that `telemetry` must be validated/defaulted **independently** of `unlocked`/`bestByLevel`/`bestScore`/`updatedAt` — do not let a malformed `telemetry` sub-object make the whole parse return `corrupt`. Model the independent-field tolerance on how `sanitizeLevelBest` (lines 105-118) already drops individually-invalid `bestByLevel` entries without invalidating the rest of the blob:
```typescript
function sanitizeLevelBest(raw: unknown): LevelBest | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const entry = raw as { score?: unknown; stars?: unknown };
  if (typeof entry.score !== 'number' || !Number.isFinite(entry.score) || entry.score < 0) {
    return null;
  }
  const best: LevelBest = { score: Math.floor(entry.score) };
  if (entry.stars === 1 || entry.stars === 2 || entry.stars === 3) {
    best.stars = entry.stars as StarCount;
  }
  return best;
}
```
Write a `sanitizeTelemetry(raw: unknown): TelemetryBlob` that returns `defaultTelemetryBlob()` wholesale on any structural failure but never causes the caller (`parseProgressResultV4`) to discard the sibling `unlocked`/`bestByLevel`/`bestScore` fields.

**Level-id allowlist convention** (lines 63, 91-103) — reuse `PLAYABLE_SET` / `PLAYABLE_LEVEL_ORDER` for any new level-keyed telemetry map (`byMode.campaign[levelId]`), do not hardcode ids (E2 reordered the campaign once already; the codebase now derives everything from `PLAYABLE_LEVEL_ORDER`).

---

### `src/services/storage/migrateProgress.ts` (+v3ToV4, +migrateOrDefaultV4)

**Analog:** itself — `v2ToV3` (lines 18-32) and `migrateOrDefault` (lines 38-62), verbatim.

```typescript
function v2ToV3(v2: ProgressBlobV2): ProgressBlob {
  const bestByLevel: Partial<Record<LevelId, LevelBest>> = {};
  for (const [key, score] of Object.entries(v2.bestByLevel)) {
    if (typeof score === 'number') {
      bestByLevel[key as LevelId] = { score };
    }
  }
  return { v: 3, unlocked: [...v2.unlocked], bestByLevel, bestScore: v2.bestScore, updatedAt: v2.updatedAt };
}

export function migrateOrDefault(
  v3Raw: string | null,
  v2Raw: string | null,
  v1Raw: string | null,
): ProgressBlob {
  const v3 = parseProgressResult(v3Raw);
  if (v3.status === 'ok') {
    return v3.progress;
  }
  const v2 = parseProgressV2Result(v2Raw);
  if (v2.status === 'ok') {
    return v2ToV3(v2.progress);
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
Add `v3ToV4(v3: ProgressBlob): ProgressBlobV4` as a new pure function (per `09-RESEARCH.md` Code Examples): copy `unlocked`/`bestByLevel`/`bestScore`/`updatedAt` verbatim, set `telemetry: defaultTelemetryBlob()`. Add `migrateOrDefaultV4(v4Raw, v3Raw, v2Raw, v1Raw)` that tries `parseProgressResultV4(v4Raw)` first, else **calls the existing `migrateOrDefault(v3Raw, v2Raw, v1Raw)` unchanged** and pipes the result through `v3ToV4`. Do not touch `v2ToV3` or the v1 fallback branch — zero regression risk on an already-tested path (this is the single most important instruction from research: reuse the existing chain link, add one more in front).

---

### `src/services/storage/telemetry.ts` (NEW)

**Analog:** `src/services/storage/stars.ts` (`mergeLevelBest`, referenced above) and `src/services/storage/watermark.ts` (`mergeHighWatermark`) — both are pure, allocation-light merge helpers used by the store layer; `telemetry.ts` should follow the same "pure function, no I/O, called from both `memoryStore.ts` and `asyncStorageStore.ts`" shape. (Neither file was expanded line-by-line here since the merge signature — `merge(prev, incoming) → next`, no class, no internal mutation of the argument — is fully evident from how they're called at `memoryStore.ts` lines 81, 91-96 and `asyncStorageStore.ts` line 280/290/341.)

**Ring-buffer-on-write pattern** (Don't-Hand-Roll guidance from research, not an existing file but the specified idiom): a plain array with `push` then `slice(-BOUND)` (or `shift()` when over cap) at the point of merge, mirroring the fixed-capacity philosophy of `src/core/events/ring.ts` conceptually but *not* copying its SoA/zero-alloc machinery — this write happens once per run-end (cold path), so a plain `RunLogEntry[]` array is correct here, unlike the core ring.

---

### `src/services/storage/memoryStore.ts` (`recordRunEnd` extended)

**Analog:** itself, lines 83-102 (verbatim, current signature):
```typescript
recordRunEnd(args: {
  levelId: LevelId;
  score: number;
  outcome: 'win' | 'lose';
  livesRemaining: number;
}): ProgressBlob {
  const starsFromWin =
    args.outcome === 'win' ? computeStars(args.livesRemaining) : null;
  const merged = mergeLevelBest(
    blob.bestByLevel[args.levelId],
    args.score,
    starsFromWin,
  );
  applyLevelBest(args.levelId, merged);
  if (args.outcome === 'win') {
    blob.unlocked = unlockAfterClearPure(blob.unlocked, args.levelId);
    blob.updatedAt = Date.now();
  }
  return cloneBlob(blob);
},
```
Extend `args` with `mode`, `stats`, and widen `outcome` to include `'abandoned'`. The `starsFromWin`/`unlocked` branch stays gated on `outcome === 'win'` exactly as today (research Assumption A1: score/telemetry watermarking happens for all outcomes; `unlockAfterClear`/`computeStars` stay win-gated only). Add a call to the new `mergeRunIntoTelemetry(blob.telemetry, { mode, levelId, stats, outcome, score })` inside this same function, then return `cloneBlob(blob)` including the new `telemetry` field (extend `cloneBlob`, lines 36-50, to deep-copy `telemetry` the same way it already deep-copies `bestByLevel`).

**Clone pattern to extend** (lines 36-50):
```typescript
function cloneBlob(b: ProgressBlob): ProgressBlob {
  const bestByLevel: Partial<Record<LevelId, LevelBest>> = {};
  for (const [key, val] of Object.entries(b.bestByLevel)) {
    if (val != null) {
      bestByLevel[key as LevelId] = cloneLevelBest(val);
    }
  }
  return { v: 3, unlocked: [...b.unlocked], bestByLevel, bestScore: b.bestScore, updatedAt: b.updatedAt };
}
```

---

### `src/services/storage/asyncStorageStore.ts` (`recordRunEnd` extended, hydrate chain +v4)

**Analog:** itself, `recordRunEnd` (lines 326-357) and `ensureHydrated` (lines 271-302).

```typescript
recordRunEnd(args: {
  levelId: LevelId;
  score: number;
  outcome: 'win' | 'lose';
  livesRemaining: number;
}): ProgressBlob {
  // Sync memory update first so Results can use returned blob (D-10 / F-26).
  if (!hydrated) {
    void ensureHydrated();
  }
  const starsFromWin =
    args.outcome === 'win' ? computeStars(args.livesRemaining) : null;
  const merged = mergeLevelBest(memory.bestByLevel[args.levelId], args.score, starsFromWin);
  applyLevelBest(args.levelId, merged);
  if (args.outcome === 'win') {
    memory = { ...memory, unlocked: unlockAfterClearPure(memory.unlocked, args.levelId), updatedAt: Date.now() };
  }
  const snapshot = cloneBlob(memory);
  void persist(memory);
  return snapshot;
},
```
This is the "synchronous memory merge, void persist, return clone before awaiting disk" contract (C1 D-10) — extend identically to `memoryStore.ts` above: add `mergeRunIntoTelemetry` call before `cloneBlob`, keep `void persist(memory)` fire-and-forget, keep the synchronous return.

**Hydrate-chain extension** (lines 271-302, the model for adding one more version link):
```typescript
async function ensureHydrated(): Promise<void> {
  if (hydrated) return;
  try {
    const v3Raw = await AsyncStorage.getItem(PROGRESS_KEY);
    const parsed = parseProgressResult(v3Raw);
    if (parsed.status === 'ok') {
      memory = mergeHighWatermark(memory, parsed.progress);
      hydrated = true;
      return;
    }
    // Absent or corrupt v3 → migrate from v2 + v1 (D-05); never clobber watermarks.
    const v2Raw = await AsyncStorage.getItem(PROGRESS_KEY_V2);
    const v1Raw = await AsyncStorage.getItem(PERSONAL_BEST_KEY);
    const migrated = migrateOrDefault(v3Raw, v2Raw, v1Raw);
    memory = mergeHighWatermark(memory, migrated);
    // ... write-through migrate-through-once guard ...
  } catch {
    // Soft-fail — keep memory defaults / prior watermarks.
  }
  hydrated = true;
}
```
For v4: read `PROGRESS_KEY` (now the v4 key) first, then fall back to reading `PROGRESS_KEY_V3` (the renamed legacy v3 key) + `PROGRESS_KEY_V2` + `PERSONAL_BEST_KEY`, calling `migrateOrDefaultV4(v4Raw, v3Raw, v2Raw, v1Raw)` in place of `migrateOrDefault`. Same "never delete legacy keys" rule, same "write migrated blob through once" guard (`wroteMigrateThrough`).

---

### `app/_components/PlayingHost.tsx` (extend `handleRunEnded`, add `runStartedAtRef`, wrap `onMenu`)

**Analog:** itself.

**`handleRunEnded` to extend** (lines 454-496, current signature and body):
```typescript
const handleRunEnded = useCallback(
  (runScore: number, outcome: 'win' | 'lose', livesRemaining: number) => {
    const previous = previousBestRef.current;
    const { best, isNewRecord: record } = evaluatePersonalBest(runScore, previous);
    // Sync memory merge score/stars/unlock; void persist inside store (D-10).
    const blob = store.recordRunEnd({ levelId, score: runScore, outcome, livesRemaining });
    setResultBest(best);
    setIsNewRecord(record);
    if (record) { previousBestRef.current = best; }
    const entry = blob.bestByLevel[levelId];
    const stars = entry?.stars;
    // ... win-gated stars/nextGateId logic unchanged ...
    const payload = { score: runScore, outcome, isNewRecord: record };
    platform.ads.onRunEnded(payload);
    platform.purchases.onRunEnded(payload);
    platform.accounts.onRunEnded(payload);
  },
  [platform, store, levelId],
);
```
Extend the signature to `(runScore, outcome: 'win' | 'lose' | 'abandoned', livesRemaining, stats: RunStats, wallClockMs: number)` and pass `mode: 'campaign'`, `stats`, into `store.recordRunEnd(...)`. Keep every existing branch (`evaluatePersonalBest`, stars, `nextGateId`, `platform.*.onRunEnded`) untouched for `'win'`/`'lose'`; guard the win-only branches (`stars`, `nextGateId`) so `'abandoned'` skips them exactly as `'lose'` already skips the stars-setting branch (line 475-479: `if (outcome === 'win' && ...) { setResultStars(stars) } else { setResultStars(null) }` — `'abandoned'` falls into the same `else`).

**`applyChrome` WON/LOST call sites to extend** (lines 498-522):
```typescript
const applyChrome = useCallback(
  (mirror: ChromeMirror) => {
    // ...
    if (mirror.phase === SIM.WON) {
      if (!runEndedRef.current) {
        runEndedRef.current = true;
        handleRunEnded(mirror.score, 'win', mirror.lives);
      }
      setResult('win');
      setActive(false);
    } else if (mirror.phase === SIM.LOST) {
      if (!runEndedRef.current) {
        runEndedRef.current = true;
        handleRunEnded(mirror.score, 'lose', mirror.lives);
      }
      setResult('lose');
      setActive(false);
    }
  },
  [handleRunEnded, setActive],
);
```
At both call sites, read `const stats = cloneRunStats(runStatsSv.value);` (synchronous cross-thread SharedValue read — the pattern chosen by research over any new hop) and `Date.now() - runStartedAtRef.current` for wall-clock ms, then pass both into the now-5-arg `handleRunEnded(...)`.

**Single `onMenu` wrap point** (lines 644-658, the existing BackHandler effect, and line 894 where `onMenu` is forwarded to `GameScreen`):
```typescript
// F-30: Android hardware Back — pause mid-run; Menu from Pause/Result.
useEffect(() => {
  const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    if (result != null || uiPhase === 'paused') {
      onMenu();
      return true;
    }
    if (uiPhase === 'playing' || uiPhase === 'countdown') {
      onPause();
      return true;
    }
    return false;
  });
  return () => sub.remove();
}, [uiPhase, result, onMenu, onPause]);
// ...
<GameScreen ... onMenu={onMenu} ... />  // line 894
```
The component receives `onMenu` as a prop (line 101/123) and currently uses that single reference in exactly two places: the `BackHandler` handler above and the `GameScreen` prop forward at line 894. Introduce one `handleMenuPress = useCallback(() => { if (!runEndedRef.current) { runEndedRef.current = true; handleRunEnded(currentScore, 'abandoned', currentLives, cloneRunStats(runStatsSv.value), Date.now() - runStartedAtRef.current); } onMenu(); }, [...])` and substitute `handleMenuPress` for the bare `onMenu` reference at **both** call sites (BackHandler line ~648 and the `GameScreen` prop at line 894) — do not add a second abandon-check; this reuses the `runEndedRef` guard already in place for WON/LOST so a run that already ended via WON/LOST cannot double-record as abandoned.

**`runStartedAtRef` placement** (analog: `previousBestRef`/`runEndedRef`, lines 208-209):
```typescript
const previousBestRef = useRef(0);
const runEndedRef = useRef(false);
```
Add `const runStartedAtRef = useRef(0);` beside these, set to `Date.now()` at the same points `runEndedRef.current = false` is reset today (lines 604, 635, 680, 710 — `onRetry`, `goNext`, and other run-restart call sites) so it always reflects the current run's start time.

---

### `app/_components/GameHost.tsx` — verify only, no expected functional change

**Analog:** itself, lines 170-179:
```typescript
<PlayingHost
  levelId={CERT_HARNESS ? 'level-03' : activeLevelId}
  onLevelIdChange={setActiveLevelId}
  onMenu={() => setShellPhase('title')}
/>
```
`GameHost` already owns `shellPhase` and passes a single inline `onMenu` closure straight through; this phase's abandon-detection work lives entirely inside `PlayingHost`'s `handleMenuPress` wrapper (above) — `GameHost` needs no change unless the planner decides `mode`/telemetry context should be threaded down as a prop (not required by any locked decision; campaign is the only mode written this phase per D-04).

---

### `tests/telemetry.reduce-run-events.test.ts` (NEW)

**Analog:** `tests/helpers/balanceBot.ts` (headless `stepRun` harness) + `tests/levels.verb-curve-e1b.test.ts` (asset-driven assertions).

**Headless determinism harness shape to copy** (`tests/helpers/balanceBot.ts` lines 14-25, 108-158):
```typescript
import {
  allocateWorld,
  applyCompiledLevel,
  resetWorld,
  stepRun,
  FIXED_DT,
  SimPhase,
  loadAndCompile,
  type Intent,
} from '../../src/core';

export function runBot(levelId: string, opts: BotOptions = {}): BotResult {
  const compiled = loadAndCompile(readLevelFile(levelId));
  if (!compiled.ok) { throw new Error(/* ... */); }
  const w = allocateWorld();
  resetWorld(w, seedA, seedB);
  applyCompiledLevel(w, compiled.compiled);
  let ticks = 0;
  while (ticks < maxTicks) {
    stepRun(w, intent, FIXED_DT);
    ticks++;
    if (w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST) break;
    // ... intent update ...
  }
  return { outcome, ticks, score: w.score, lives: w.lives, /* ... */ };
}
```
The new test drives `stepRun` the same way, but after each `stepRun` call also invokes `reduceRunTelemetry(w, stats)` (mirroring how `useGameLoop.ts` calls it in production) and asserts exact counter values against a known event sequence — a fixed seed + a small fixture level (or the same `assets/levels/*.json` fixtures `balanceBot.ts` already reads via `readLevelFile`).

**Documented gotcha to respect** (from the strong-analog hint, verified applicable): `tests/levels.verb-curve-e1b.test.ts` notes that `cellToBrick` is cleared to `-1` on break, so any test logic that needs to resolve a brick's lattice cell/adjacency (i.e. the cascade-grouping algorithm) must resolve indices from the event's `(evX, evY)` **before** the brick is mutated further, not by re-deriving from `cellToBrick` after the fact.

---

### `tests/storage.progress-v4.test.ts` (NEW)

**Analog:** `tests/storage.progress-v3.test.ts` — copy the file's `describe`/`it` shape and import style directly.

**Import + describe/it shape to copy** (lines 1-20, 145-226):
```typescript
import { describe, it, expect } from 'vitest';
import {
  PROGRESS_KEY,
  PROGRESS_VERSION,
  PERSONAL_BEST_KEY,
  computeStars,
  mergeLevelBest,
  selectRowState,
  defaultProgressBlob,
  parseProgressResult,
  migrateOrDefault,
  createMemoryProgressStore,
  mergeHighWatermark,
  PLAYABLE_LEVEL_ORDER,
  type LevelBest,
  type ProgressBlob,
} from '../src/services/storage';

describe('PROGRESS_KEY / VERSION (C2 Plan 01)', () => {
  it("PROGRESS_KEY === '@nbb/progress/v3' and PROGRESS_VERSION === 3", () => {
    // ...
  });
});

describe('migrateOrDefault (C2 Plan 01)', () => {
  it('v1→v3 seeds bestScore; unlocked=[level-01]; empty bestByLevel', () => { /* ... */ });
  it('v2→v3 heals unlocked to a same-length catalog prefix; number→{score} omit stars', () => { /* ... */ });
  it('valid v3 preferred over v2/v1', () => { /* ... */ });
  it('corrupt v3 + ok v2 still migrates from v2 (do not wipe)', () => { /* ... */ });
});

describe('recordRunEnd (C2 Plan 01)', () => {
  it('win merges max(stars); lose does not write stars; returns blob', () => { /* ... */ });
});
```
Mirror this exact structure for v4: `describe('PROGRESS_KEY / VERSION (v4)')`, `describe('migrateOrDefaultV4')` (with the same 4 cases: valid v4 preferred / v3→v4 heal / v2/v1 fallback / corrupt-v4-falls-back-to-v3), `describe('parseProgressResultV4')` (ok / corrupt / **telemetry-only corruption preserves unlocked+bestByLevel** — the new case this phase specifically requires per Pitfall 4), `describe('recordRunEnd (v4, mode-aware)')` (extend the existing win/lose cases with the new `abandoned` outcome + `stats` aggregation + ring-buffer-bound eviction case). Note per research: derive level ids from `PLAYABLE_LEVEL_ORDER` (already imported in the v3 test) rather than hardcoding — the E2 reorder lesson applies identically to any new v3-fixture-blob builder.

## Shared Patterns

### Event-ring read-only consumer (worklet, no ring mutation)
**Source:** `src/vfx/consumeEvents.ts` lines 57-90 (full ring-walk idiom)
**Apply to:** `src/runtime/runStats.ts` (the only new file that reads the ring)
```typescript
const start = (world.evHead - n + world.evCap) % world.evCap;
for (let i = 0; i < n; i++) {
  const idx = (start + i) % world.evCap;
  const code = world.evCode[idx];
  // read evA/evB/evX/evY, never mutate world.*
}
```

### Fail-soft parse-result triad
**Source:** `src/services/storage/parseBlob.ts` lines 53-56, 209-249
**Apply to:** `src/services/storage/parseBlob.ts` (new `parseProgressResultV4`)
```typescript
export type ParseProgressResult =
  | { status: 'ok'; progress: ProgressBlob }
  | { status: 'absent'; progress: ProgressBlob }
  | { status: 'corrupt'; progress: ProgressBlob };
```

### Versioned migration chain (extend at the front, never rewrite existing links)
**Source:** `src/services/storage/migrateProgress.ts` lines 38-62
**Apply to:** `src/services/storage/migrateProgress.ts` (new `migrateOrDefaultV4`)
```typescript
export function migrateOrDefault(v3Raw, v2Raw, v1Raw): ProgressBlob {
  const v3 = parseProgressResult(v3Raw);
  if (v3.status === 'ok') return v3.progress;
  const v2 = parseProgressV2Result(v2Raw);
  if (v2.status === 'ok') return v2ToV3(v2.progress);
  const v1 = parsePersonalBestResult(v1Raw);
  if (v1.status === 'ok') { /* seed bestScore only */ }
  return defaultProgressBlob();
}
```

### Sync-merge / void-persist / return-clone store contract
**Source:** `src/services/storage/asyncStorageStore.ts` lines 326-357, `src/services/storage/memoryStore.ts` lines 83-102
**Apply to:** both stores' extended `recordRunEnd`
```typescript
const snapshot = cloneBlob(memory);
void persist(memory);
return snapshot;
```

### Cross-thread SharedValue accumulator + synchronous JS read at a rare boundary
**Source:** `src/runtime/useGameLoop.ts` lines 259-269, 311-344 (`vfxSv`/`audioBatchSv`/`flashSv`); `app/_components/PlayingHost.tsx` lines 238-247, 524-539 (`chromeSv`/`chromeSeq` reaction)
**Apply to:** `src/runtime/useGameLoop.ts` (`runStatsSv`), `app/_components/PlayingHost.tsx` (synchronous `.value` read inside `applyChrome`/`handleMenuPress`)
```typescript
const runStatsSv = useSharedValue<RunStats | null>(null);
// UI thread: allocate lazily, mutate in place, never scheduleOnRN
// JS thread, at a rare boundary already reached via chromeSeq reaction:
const snapshot = cloneRunStats(runStatsSv.value);
```

### Single funnel-point for a state transition (do not add a second detection site)
**Source:** `app/_components/PlayingHost.tsx` lines 644-658 (`BackHandler`) + line 894 (`GameScreen` prop) — both already resolve to the same `onMenu` reference
**Apply to:** the new `handleMenuPress` wrapper — replace `onMenu` at both existing call sites, do not add abandon-detection logic in a third place

### Worklet-safe inlined constant (worklets cannot close over module `const`)
**Source:** `src/core/rules/speedRamp.ts` lines 21-25
**Apply to:** any tuned literal referenced inside a `'worklet'`-marked function in `runStats.ts`
```typescript
'worklet';
// Literals must match constants.ts — worklets cannot close over module consts.
const someConstant = 50; // RECENT_RUNS_BOUND (example — verify actual constant name/location)
```

## No Analog Found

None. Every file in this phase's scope has a same-file-family analog (either the exact file being extended, or a closely-related sibling in the same directory following the same contract).

## Metadata

**Analog search scope:** `src/runtime/`, `src/vfx/`, `src/core/rules/`, `src/core/types.ts`, `src/core/events/ring.ts`, `src/services/storage/**`, `app/_components/`, `tests/`
**Files scanned (read in full or via targeted offset/limit):** `src/vfx/consumeEvents.ts`, `src/services/storage/types.ts`, `src/services/storage/parseBlob.ts`, `src/services/storage/migrateProgress.ts`, `src/services/storage/memoryStore.ts`, `src/services/storage/asyncStorageStore.ts` (hydrate + recordRunEnd sections), `src/runtime/useGameLoop.ts` (SharedValue setup + onFrame drain + chrome publish sections), `src/runtime/eventBridge.ts`, `src/core/rules/speedRamp.ts`, `src/core/types.ts` (EventCode/BrickFlags/PickupType), `src/core/events/ring.ts`, `src/core/rules/pickups.ts` (POWERUP_CATCH push site), `app/_components/PlayingHost.tsx` (imports, SharedValue block, `handleRunEnded`/`applyChrome`/chromeSeq reaction, BackHandler effect, GameScreen render), `app/_components/GameHost.tsx` (full), `tests/helpers/balanceBot.ts` (full), `tests/storage.progress-v3.test.ts` (imports + describe/it index)
**Pattern extraction date:** 2026-09-25
