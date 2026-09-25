# Phase 11: Endless Mode - Pattern Map

**Mapped:** 2026-09-25
**Files analyzed:** 21 (8 new, 13 modified)
**Analogs found:** 21 / 21

Every analog path below was checked with `git ls-files` and is **tracked source** in this
repository (27/27 verified). No `.gsd/capabilities/**` install-mirror paths appear anywhere in
this document.

**Two hard fences the planner must carry into every action:**

- `src/core/**` and `src/levelgen/**` are **byte-frozen**. The phase gate is
  `git diff --name-only <phase-base>..HEAD -- src/core src/levelgen` returning empty. Every
  pattern below is therefore a *read-from* pattern for those two trees, never a *write-to* one.
- The one new directory, `src/services/endless/`, is legal without a layer-contract edit:
  `eslint.config.js:318-322` already permits `services → { services, core, levelgen }` (LC-16),
  and `docs/layer-contract.md:22` names Phase 11 endless waves as the intended LC-16 consumer.
  **Do not add a new LC row.**

---

## File Classification

| New/Modified File | New? | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|---|
| `src/services/endless/ramp.ts` | NEW | service (pure policy) | transform | `src/levelgen/schedule.ts` + `src/levelgen/rng.ts` | exact |
| `src/services/endless/index.ts` | NEW | barrel | — | `src/levelgen/index.ts` | exact |
| `src/runtime/worldRequests.ts` | mod | runtime mutation worklet | event-driven (request/apply) | `applyRetryWorldReset` in the same file | exact |
| `src/runtime/useGameLoop.ts` | mod | hook (frame loop) | event-driven | `resetRequest`/`certRequest` blocks in the same file | exact |
| `src/runtime/loadLevel.ts` | mod | service wrapper | transform | `loadLevelById` in the same file | exact |
| `app/_components/PlayingHost.tsx` | mod | component (host) | request-response + event-driven | `applyChrome` / `handleRunEnded` / `devLevelSwitch` in the same file | exact |
| `src/services/storage/types.ts` | mod | model | CRUD | `TelemetryBlob` / `defaultTelemetryBlob` in the same file | exact |
| `src/services/storage/telemetry.ts` | mod | service (pure merge) | transform | `cloneTelemetryBlob` / `mergeTelemetryBlobs` in the same file | exact |
| `src/services/storage/parseBlob.ts` | mod | service (fail-soft parser) | transform | `sanitizeTelemetry` / `sanitizeAggregate` in the same file | exact |
| `src/services/storage/memoryStore.ts` | mod | store | CRUD | `recordRunEnd` in the same file (defect 1 site) | exact |
| `src/services/storage/asyncStorageStore.ts` | mod | store | CRUD | `memoryStore.recordRunEnd` (mirror implementation) | exact |
| `src/services/storage/index.ts` | mod | barrel | — | the existing `./types` re-export block | exact |
| `docs/ops/ENDLESS-MODE.md` | NEW | ops doc | — | `docs/ops/BOARD-GENERATOR.md`, `docs/ops/BALANCE-E2.md` | exact |
| `docs/ops/BOARD-GENERATOR.md` | mod | ops doc | — | its own `## Limits` idiom | exact |
| `tests/endless.ramp.test.ts` | NEW | test (unit, property) | transform | `tests/levelgen.schedule.test.ts` | exact |
| `tests/runtime.wave-advance.test.ts` | NEW | test (unit, world mutation) | event-driven | `tests/runtime.reset-request.test.ts` | exact |
| `tests/endless.wave-loop.test.ts` | NEW | test (integration, headless sim) | batch | `tests/physics.level03-serve.test.ts` + `tests/helpers/balanceBot.ts` | exact |
| `tests/endless.determinism.test.ts` | NEW | test (integration, determinism) | batch | `tests/physics.golden-replay.test.ts` + `tests/levelgen.determinism.test.ts` | exact |
| `tests/storage.endless-firewall.test.ts` | NEW | test (unit, store) | CRUD | `tests/storage.progress-v4.test.ts` § `recordRunEnd (v4, mode-aware)` | exact |
| `tests/storage.progress-v4.test.ts` | mod (extend) | test (unit, store) | CRUD | its own `parseProgressResult` telemetry-degradation cases | exact |
| `tests/ui/PlayingHost.next-bake.test.ts` | mod (extend) | test (jsdom + source-contract) | request-response | itself + `tests/ui/GameHost.test.tsx:118-132` | exact |

---

## Pattern Assignments

### `src/services/endless/ramp.ts` (service, pure transform) — NEW

**Analog A:** `src/levelgen/schedule.ts` — the contract-header + property-not-literal discipline.
**Analog B:** `src/levelgen/rng.ts` — integer-only purity and the `mixSeed` injectivity argument.

**Module-header pattern** (`src/levelgen/schedule.ts:1-13`) — the header *names the requirement
IDs*, names its own guard test, and states which of its numbers are contract vs tuning:

```ts
/**
 * The difficulty dial table (N-GEN-03 / D-04 / D-05 / D-06 / D-07 / D-08).
 *
 * An ordered table whose *ordering* is itself the contract, in the same sense as
 * `src/services/storage/catalog.ts`: ... Its guard is `tests/levelgen.schedule.test.ts`.
 *
 * **These constants are tuning, not contract.** ... No test in this phase may pin a
 * literal dial value; tests assert the derived *properties* ...
 */
```

Copy this shape verbatim for `ramp.ts`: name **N-END-01 / D-01 / D-02**, name
`tests/endless.ramp.test.ts` as the guard, and state that the wave→difficulty map is *contract*
(SC-2 requires it be written down) while D_MAX itself is owned by the frozen `src/levelgen`.

**Purity / no-approximated-Math pattern** (`src/levelgen/schedule.ts:50-55`):

```ts
/**
 * ## No implementation-approximated Math
 *
 * Every curve is an integer per-mille lerp. `Math.pow`, `**`, and the trig/exp/log family
 * are implementation-approximated: a last-bit difference between Node and Hermes crossing a
 * `Math.floor` boundary changes a count ...
 */
```

`difficultyForWave` / `seedForWave` must stay in the same integer-only register: `| 0`
coercion, comparison clamps, `Math.imul`. No `%` on floats, no `Math.pow`.

**Seed-derivation pattern to call, not re-implement** (`src/levelgen/rng.ts:99-108`, verbatim):

```ts
/**
 * Fold `difficulty` into the stream key so generate(s, d) and generate(s, d + 1) are
 * independent draws rather than one being a prefix of the other. Both constants are
 * odd, so each half is injective mod 2^32 and adjacent difficulties cannot collide.
 */
export function mixSeed(seedU32: number, difficulty: number): number {
  const a = Math.imul(seedU32 | 0, MIX_SEED);
  const b = Math.imul((difficulty | 0) + 1, MIX_DIFFICULTY);
  return (a ^ b) >>> 0;
}
```

`seedForWave(runSeed, wave)` is `mixSeed(hashSeed(runSeed), wave)` — both imported **from the
barrel** `../../levelgen`, never deep-imported. `hashSeed` (`rng.ts:81-97`) already normalises
`number | string` and maps non-finite input to 0, so the ramp inherits that hardening for free.

**Clamp pattern** — mirror `generate`'s own backstop (`src/levelgen/generate.ts:223-227`,
`const d = Math.max(0, Math.min(D_MAX, difficulty | 0));`) but *do not rely on it* as the
correctness argument; `difficultyForWave` clamps in its own body and the test proves it.

---

### `src/services/endless/index.ts` (barrel) — NEW

**Analog:** `src/levelgen/index.ts` (whole file, 13 lines):

```ts
/** Seeded board generator barrel (N-GEN-01 / LC-16) — the only surface Phase 11/12 may import. */

export { makeRng, below, shuffleInPlace, hashSeed, mixSeed } from './rng';
...
export { D_MAX, SCHEDULE, envelope, type ScheduleEntry } from './schedule';
```

One-line doc comment naming the requirement + layer rule, then flat named re-exports grouped by
source module. Follow it exactly: `/** Endless wave policy barrel (N-END-01 / N-END-03). */`
then `export { difficultyForWave, seedForWave } from './ramp';`.

---

### `src/runtime/worldRequests.ts` → add `applyWaveAdvance` (worklet, event-driven)

**Analog:** `applyRetryWorldReset` in the same file, lines 27-42.

**File header — the worklet-closure rule this new function is governed by** (lines 1-7, verbatim):

```ts
/**
 * UI-runtime world / VFX request helpers (audit WP-1 / F-01).
 * Pure mutations for unit tests + frame-callback application — never read SharedValue here.
 *
 * Worklet rule: never close over module exports (SEED_*, IMPULSE_*, SimPhase.*).
 * Inline numeric literals inside `'worklet'` bodies; keep exported consts for JS/tests only.
 */
```

**Function-shape pattern** (lines 27-42, verbatim) — `'worklet'` on the first statement line,
plain `World` + `CompiledLevel | null` params, no SharedValue, null-guard before
`applyCompiledLevel`, `dockBall` last:

```ts
export function applyRetryWorldReset(
  world: World,
  level: CompiledLevel | null,
  seedGameplay?: number,
  seedCosmetic?: number,
): void {
  'worklet';
  // Defaults inlined — default-param expressions close over module bindings (UI crash).
  const sg = seedGameplay === undefined ? 0xc0ffee01 : seedGameplay;
  const sc = seedCosmetic === undefined ? 0xbadc0de2 : seedCosmetic;
  resetWorld(world, sg, sc);
  if (level != null) {
    applyCompiledLevel(world, level);
  }
  dockBall(world);
}
```

**Inlined-literal-with-name-comment convention** (lines 76-86 of the same file, and
`src/core/rules/speedRamp.ts:20-25` which is the canonical statement):

```ts
// src/runtime/worldRequests.ts:76-79
  // Inline SimPhase / seeds / impulse — worklets cannot read module exports.
  if (world.simPhase === 0 /* DOCKED */) {
    applyServe(world, 360);
    world.simPhase = 1; // PLAYING
```

```ts
// src/core/rules/speedRamp.ts:21-25
  // Literals must match constants.ts — worklets cannot close over module consts.
  const ratePerSecond = 0.01; // SPEED_RAMP_PER_SECOND
  const serveSpeed = 360; // SERVE_SPEED
  const maxSpeed = 720; // MAX_BALL_SPEED
  const ticksPerSecond = 120; // 1 / FIXED_DT
```

`applyWaveAdvance` must therefore write `world.simPhase = 0; // SimPhase.DOCKED`, never
`SimPhase.DOCKED`. `scripts/assert-worklet-closures.mjs` (in `npm test`) is the gate.

**What must NOT be copied from the analog:** `resetWorld`. It zeroes `lives`/`score`/`combo`
and re-seeds both RNG streams (`src/core/reset.ts:44-47,79-81`) — exactly the state SC-1
requires be carried. `applyWaveAdvance` clears effects/pickups/stall/tick by hand instead. The
ordering "clear effects **before** `world.tick = 0`" is load-bearing (`effectUntilTick` is an
absolute tick; `src/core/rules/effects.ts:110-123`) and must carry a comment saying so.

---

### `src/runtime/useGameLoop.ts` → add `waveRequest`/`waveApplied` + `advanceWave`

**Analog:** the three existing request-counter pairs in the same file.

**Declaration pattern** (lines 319-326, verbatim):

```ts
  // RN→UI request counters (F-01): JS only bumps; frame callback applies on live World.
  const resetRequest = useSharedValue(0);
  const resetApplied = useSharedValue(0);
  const certRequest = useSharedValue(0);
  const certApplied = useSharedValue(0);
  const accumResetRequest = useSharedValue(0);
  const accumResetApplied = useSharedValue(0);
```

**Apply-block pattern** — the *closest* analog is the short `certRequest` block (lines 412-417),
not the long `resetRequest` block:

```ts
    if (certRequest.value !== certApplied.value) {
      certApplied.value = certRequest.value;
      applyCertWorstCaseInject(w, vfx, compiled.value);
      launchFlag.value = 0;
      paddleTarget.value = w.paddleX;
    }
```

Place the new block immediately after line 417 and **before line 435**:

```ts
    const simFrozen =
      w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST;
```

That ordering is what makes the transition free: the advance sets `simPhase` to DOCKED before
`simFrozen` is computed, so substepping resumes on the same frame with no `setActive` churn.

**Explicitly do NOT copy** lines 398-407 of the `resetRequest` block:

```ts
      // D-01: every retry is a new run — zero counters in place (the local `stats`
      // already holds this reference, so never reassign runStatsSv.value here).
      const s = runStatsSv.value;
      if (s) {
        resetRunStats(s);
```

A wave is not a run (RESEARCH Pitfall 4). Omitting `resetRunStats` is the whole point.

**Handle-method pattern** (lines 673-678, verbatim) — the bump is the entire body, wrapped in
the immutability escape comment:

```ts
  const retry = useCallback(() => {
    // Discrete request only — UI frame applies applyRetryWorldReset on live World (F-01 / D-11).
    /* eslint-disable react-hooks/immutability -- SharedValue write (D-14) */
    resetRequest.value = resetRequest.value + 1;
    /* eslint-enable react-hooks/immutability */
  }, [resetRequest]);
```

**Handle-type pattern** (`GameLoopHandle`, lines 172-199) — every method carries a doc comment
naming its requirement and who is allowed to call it, e.g. lines 193-197:

```ts
  /**
   * One-shot worst-case inject (PLT-03 / D-14): ≥3 balls, particles
   * near Mid cap, shake punched. Discrete cold path — never per-frame.
   * Host gates CERT_HARNESS / __DEV__ Pressable.
   */
  injectCertWorstCase: () => void;
```

Add `advanceWave: () => void;` with the same doc shape, then add `advanceWave` to the returned
object literal at lines 738-752.

---

### `src/runtime/loadLevel.ts` → add `compileGeneratedLevel`

**Analog:** `loadLevelById` in the same file, lines 32-38, plus the header at 1-8.

```ts
import {
  loadAndCompile,
  type CompiledLevel,
  type LevelId,
  type ValidationIssue,
} from '../core';

export type { CompiledLevel, LevelId, ValidationIssue };

export type LoadLevelResult =
  | { ok: true; compiled: CompiledLevel }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Validate + compile a bundled level by id (D-15 — no default; caller must pass LevelId).
 */
export function loadLevelById(id: LevelId): LoadLevelResult {
  const raw = LEVEL_MODULES[id];
  return loadAndCompile(raw);
}
```

The new wrapper is the same two-line body over a caller-supplied `LevelFileV1`, with a doc
comment naming the layer reason (app/ may not import `src/core`, LC-04; runtime→core is LC-02).
Reuse the existing `LoadLevelResult` type — do not introduce a second result shape.

---

### `app/_components/PlayingHost.tsx` (component, request-response + event-driven)

Four distinct in-file patterns apply. All four are in this one file already.

**(a) WON intercept — analog `applyChrome`, lines 637-660 (verbatim):**

```ts
  const applyChrome = useCallback(
    (mirror: ChromeMirror) => {
      setSimPhaseNum(mirror.phase);
      setLives(mirror.lives);
      setScore(mirror.score);
      setCombo(mirror.combo);
      setStallTier(mirror.stallTier);
      if (mirror.phase === SIM.WON) {
        if (!runEndedRef.current) {
          runEndedRef.current = true;
          handleRunEnded(mirror.score, 'win', mirror.lives, snapshotRunStats());
        }
        setResult('win');
        setActive(false);
      } else if (mirror.phase === SIM.LOST) {
```

The endless branch goes **ahead** of this `if`, returns early, and never reaches
`handleRunEnded`/`setActive(false)`. It runs on the RN JS thread (driven by the `chromeSeq`
`useAnimatedReaction` + `runOnJS` at lines 679-692), which is what makes calling `generate()`
from it legal.

**(b) Idempotency-ref pattern — analog `runEndedRef`, lines 244 + 664-676 (verbatim):**

```ts
  const runEndedRef = useRef(false);
```

```ts
  /**
   * THE single abandon funnel (T-09-10). Both existing exit-to-Menu paths — the Android
   * hardware-back handler and the GameScreen `onMenu` prop — route through here, so no
   * third detection site exists. Reuses the SAME `runEndedRef` the WON/LOST branches
   * set, which is what makes a run impossible to record twice: whichever boundary
   * fires first wins, and a finished run leaving to Menu records nothing extra.
   */
  const handleMenuPress = useCallback(() => {
    if (!runEndedRef.current) {
      runEndedRef.current = true;
      handleRunEnded(score, 'abandoned', lives, snapshotRunStats());
    }
    onMenu();
  }, [score, lives, handleRunEnded, snapshotRunStats, onMenu]);
```

`waveAdvanceInFlightRef` copies this exactly: a `useRef(false)`, never state (state is stale
inside the memoised `applyChrome`), cleared when the mirror next reports a non-WON phase.

**(c) Per-segment banking — analog the wall-clock ref trio, lines 245-264 (verbatim).** This is
the model for banking `ticksPlayed` per wave once `world.tick` resets:

```ts
  /**
   * D-09 wall clock — PLAY time, not elapsed time. `runStartedAtRef` marks the start
   * of the current play segment; `runWallClockMsRef` banks segments already closed.
   * ...
   */
  const runStartedAtRef = useRef(0);
  const runWallClockMsRef = useRef(0);
  const wallClockActiveRef = useRef(false);
  /** This run's play-only wall clock, including the live segment if one is open. */
  const readRunWallClockMs = useCallback(() => {
    const live = wallClockActiveRef.current
      ? Date.now() - runStartedAtRef.current
      : 0;
    return runWallClockMsRef.current + live;
  }, []);
```

**(d) Run-end write — analog `handleRunEnded`, lines 531-556 (verbatim):**

```ts
      // Sync memory merge score/stars/unlock; void persist inside store (D-10).
      // `mode`/`stats` are required by the v4 store contract (Phase 9 Plan 02).
      // Campaign is the only mode this phase writes (D-04). ...
      const blob = store.recordRunEnd({
        levelId,
        mode: 'campaign',
        score: runScore,
        outcome,
        livesRemaining,
        stats,
      });
```

Note the comment at line 534 literally says "Campaign is the only mode this phase writes" —
Phase 11 makes that false and the comment must be updated with the change.

**(e) `__DEV__` entry button — analog `devLevelSwitch`, lines 994-1041 (excerpt, verbatim):**

```tsx
  const devLevelSwitch =
    typeof __DEV__ !== 'undefined' && __DEV__ ? (
      <View style={styles.devRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch level, current ${levelId}`}
          onPress={toggleDevLevel}
          hitSlop={8}
          style={styles.devSwitch}
        >
          <Text style={styles.devSwitchLabel}>
            {`Lv ${levelId.slice(-2)}`}
          </Text>
        </Pressable>
        ...
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cert worst-case: level-03 Mid multi-ball particles shake"
          onPress={runCertWorstCase}
          hitSlop={8}
          style={styles.devSwitch}
        >
          <Text style={styles.devSwitchLabel}>Cert WC</Text>
        </Pressable>
```

Note the guard idiom is `typeof __DEV__ !== 'undefined' && __DEV__` (not bare `__DEV__`) —
it appears 8× in this file and the test at `tests/ui/GameHost.test.tsx:127-131` greps for it.
D-05 needs **no** new devflag; `src/devflags.ts:25-30` (the `LEVELGEN_PROBE` block, added by
plan 10-05) is the pattern only if an env flag were wanted, and the RESEARCH Runtime-State
Inventory explicitly says "D-05 says `__DEV__`-gated, which needs no new flag at all".

The handler follows `toggleDevLevel`, lines 822-840: a `useCallback` that logs under `__DEV__`,
then `clearCountdown()` + chrome reset, and **never** calls `setActive(true)` (the gate effect
owns the arm — lines 774-776 / 784-786 state this three times).

**(f) Bake-key fix (defect 2)** — the exact line to change is 289-290:

```ts
  const loadKey = loadResult.ok
    ? `${levelId}:${loadResult.compiled.brickCount}:${loadResult.compiled.w[0]}x${loadResult.compiled.h[0]}`
    : `err:${levelId}`;
  const fxReady = loadResult.ok && bakedKey === loadKey;
```

`bakeGlowSprites(brickW, brickH)` depends on nothing else (`src/render/textures/bakeGlowSprites.ts:95-108`),
so `brickCount` and `levelId` do not belong in the key. Re-key on `${w}x${h}` alone. Keep the
doc comment at 285-288 ("fx ready is derived — bake key must match current loadResult
identity") accurate after the change.

---

### `src/services/storage/types.ts` (model, CRUD)

**Analog:** `TelemetryBlob` + `defaultTelemetryBlob` in the same file.

```ts
// lines 117-125
export type TelemetryBlob = {
  lifetime: TelemetryAggregate;
  byMode: {
    campaign: Partial<Record<string, TelemetryAggregate>>;
    endless: Partial<Record<string, TelemetryAggregate>>;
    daily: Partial<Record<string, TelemetryAggregate>>;
  };
  recentRuns: RunLogEntry[];
};

// lines 148-154
export function defaultTelemetryBlob(): TelemetryBlob {
  return {
    lifetime: defaultTelemetryAggregate(),
    byMode: { campaign: {}, endless: {}, daily: {} },
    recentRuns: [],
  };
}
```

Every type in this file carries a doc comment naming its decision ID and, where a distinction
has bitten before, *why two similar fields are not the same field* — e.g. lines 73-76:

```ts
  /**
   * Max consecutive paddle hits without losing a life (D-10) — a survival streak,
   * deliberately NOT the same metric as `bestComboEver`.
   */
  longestRallyEver: number;
```

`EndlessRecord.bestScore` needs exactly that treatment: it is **not** `ProgressBlob.bestScore`
(line 182, "Rolled-up Title PB"), and the comment must say so. `EndlessRecord` goes on
`TelemetryBlob` (line 117-125), **not** on `ProgressBlob` (line 175-187) — see Shared Patterns
§ Fail-soft telemetry firewall.

`GameMode` at line 44 already includes `'endless'`; no union edit needed.

---

### `src/services/storage/telemetry.ts` (service, pure transform)

**Analog:** `cloneTelemetryBlob` (47-58) and `mergeTelemetryBlobs` (173-195) in the same file.

**Header states the sum-vs-max contract** (lines 1-9, verbatim):

```ts
/**
 * Pure telemetry merge helpers for ProgressBlob v4 (N-STAT-02 / D-05…D-10).
 * No I/O — same `merge(prev, incoming) → next` shape as stars.ts / watermark.ts.
 *
 * Sum-vs-max is the contract: cumulative counters add, `*Ever` fields take a
 * running max. ...
 */
```

**Clone pattern** (47-58) — the new sub-object must be added here or a mutation will leak:

```ts
/** Structural clone — callers may mutate the result without touching the input. */
export function cloneTelemetryBlob(t: TelemetryBlob): TelemetryBlob {
  return {
    lifetime: cloneAggregate(t.lifetime),
    byMode: { ... },
    recentRuns: t.recentRuns.map((e) => ({ ...e })),
  };
}
```

**Running-max merge pattern** (139/146-147, verbatim) — `bestWave`/`bestScore` are max-fields:

```ts
    bestComboEver: Math.max(a.bestComboEver, b.bestComboEver),
    longestRallyEver: Math.max(a.longestRallyEver, b.longestRallyEver),
    largestCascadeEver: Math.max(a.largestCascadeEver, b.largestCascadeEver),
```

**Counter-hardening helper** (23-29, verbatim) — reuse it, do not write a second one:

```ts
/** Counters stay non-negative integers even if a caller hands over garbage. */
function safeCounter(n: number): number {
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}
```

**Merge-entry-point pattern** (97-127) — `mergeRunIntoTelemetry` clones first, then mutates the
clone, then returns it. If the endless record is folded here, follow that order exactly.

---

### `src/services/storage/parseBlob.ts` (service, fail-soft parser)

**Analog:** `sanitizeTelemetry` (387-422) and `sanitizeAggregate` (323-334) in the same file.

**The sanitizer shape to copy for `sanitizeEndlessRecord`** (323-334, verbatim) — start from the
default, bail to it on a non-object, then field-by-field through `safeCounter`:

```ts
function sanitizeAggregate(raw: unknown): TelemetryAggregate {
  const out = defaultTelemetryAggregate();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const map = raw as Record<string, unknown>;
  for (const key of Object.keys(out) as (keyof TelemetryAggregate)[]) {
    out[key] = safeCounter(map[key]);
  }
  return out;
}
```

**The call-site and the firewall doc comment** (387-408, verbatim) — this comment is the SC-3
argument and the new call goes immediately under `out.lifetime = ...`:

```ts
/**
 * Validate `telemetry` INDEPENDENTLY of its sibling progress fields (Pitfall 4 /
 * roadmap SC-4): any structural failure here degrades telemetry alone to defaults
 * and must never make the enclosing blob read as `corrupt`. Partial telemetry keeps
 * every field it does have.
 */
function sanitizeTelemetry(raw: unknown): TelemetryBlob {
  const out = defaultTelemetryBlob();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const telemetry = raw as {
    lifetime?: unknown;
    byMode?: unknown;
    recentRuns?: unknown;
  };
  out.lifetime = sanitizeAggregate(telemetry.lifetime);
```

Add `endless?: unknown;` to that inline type and `out.endless = sanitizeEndlessRecord(telemetry.endless);`.
Because `out` starts from `defaultTelemetryBlob()`, an existing v4 blob with no `endless` key
defaults cleanly — **no `v` bump, no migration edit** (`migrateProgress.ts:41-50` already calls
`defaultTelemetryBlob()`).

**Version-gate note:** `safeCounter` here (315-321) is a *second, separate* implementation from
the one in `telemetry.ts` — they are deliberately not shared across the parse/merge boundary.
Do not "DRY" them.

---

### `src/services/storage/memoryStore.ts` (store, CRUD) — DEFECT 1 SITE

**Analog:** the function being fixed, lines 93-122 (verbatim, ungated):

```ts
    recordRunEnd(args: {
      levelId: LevelId;
      mode: GameMode;
      score: number;
      outcome: RunOutcome;
      livesRemaining: number;
      stats: RunStatsInput;
    }): ProgressBlob {
      // Stars and unlock stay win-gated; an abandoned run merges score + stats only.
      const starsFromWin =
        args.outcome === 'win' ? computeStars(args.livesRemaining) : null;
      const merged = mergeLevelBest(
        blob.bestByLevel[args.levelId],
        args.score,
        starsFromWin,
      );
      applyLevelBest(args.levelId, merged);
      blob.telemetry = mergeRunIntoTelemetry(blob.telemetry, { ... });
      if (args.outcome === 'win') {
        blob.unlocked = unlockAfterClearPure(blob.unlocked, args.levelId);
        blob.updatedAt = Date.now();
      }
      return cloneBlob(blob);
    },
```

The third campaign write is inside `applyLevelBest` (lines 67-73, verbatim):

```ts
  function applyLevelBest(id: LevelId, next: LevelBest): void {
    blob.bestByLevel[id] = next;
    if (next.score > blob.bestScore) {
      blob.bestScore = next.score;
    }
    blob.updatedAt = Date.now();
  }
```

**Gate pattern to follow** — the file already gates on an arg with an inline reason comment
("Stars and unlock stay win-gated; …" at line 101). Write the mode gate the same way: one
`if (args.mode === 'campaign') { … }` wrapping the `mergeLevelBest`/`applyLevelBest` pair and
the `unlockAfterClearPure` branch, with a comment naming SC-3 / N-END-02. `mergeRunIntoTelemetry`
stays **outside** the gate — telemetry is mode-keyed by design.

---

### `src/services/storage/asyncStorageStore.ts` (store, CRUD) — DEFECT 1 SITE (mirror)

**Analog:** `memoryStore.recordRunEnd` above. Lines 364-405 are the same logic with a
persistence wrapper; the three campaign writes sit at the identical positions:

```ts
      // Stars and unlock stay win-gated; an abandoned run merges score + stats only.
      const starsFromWin =
        args.outcome === 'win' ? computeStars(args.livesRemaining) : null;
      const merged = mergeLevelBest(
        memory.bestByLevel[args.levelId],
        args.score,
        starsFromWin,
      );
      applyLevelBest(args.levelId, merged);
      memory = { ...memory, telemetry: mergeRunIntoTelemetry(...) };
      if (args.outcome === 'win') {
        memory = {
          ...memory,
          unlocked: unlockAfterClearPure(memory.unlocked, args.levelId),
          updatedAt: Date.now(),
        };
      }
```

Difference to respect: this store rebuilds `memory` by spread rather than mutating, and has a
cold-path hydration branch below (lines 406-425) whose comment explains why a pre-hydration
write chains behind hydrate. **Do not touch that branch.** The gate is the same `if
(args.mode === 'campaign')`, word-for-word comment included, so a reader diffing the two stores
sees one pattern.

---

### `src/services/storage/index.ts` (barrel)

**Analog:** the existing `from './types'` block, lines 1-28 — flat named exports, `type`-prefixed
for types, grouped by source module. Add `type EndlessRecord` to that block (and
`defaultEndlessRecord` if one is written). `tests/storage.endless-firewall.test.ts` should
import from the barrel, as `tests/storage.progress-v4.test.ts:17-36` does.

---

### `docs/ops/ENDLESS-MODE.md` (ops doc) — NEW

**Analog A:** `docs/ops/BOARD-GENERATOR.md` (structure + `## Limits` idiom).
**Analog B:** `docs/ops/BALANCE-E2.md` (measurement-report framing).

**Header block** (`BOARD-GENERATOR.md:1-9`, verbatim):

```markdown
# Seeded board generator (Phase 10)

**Status:** Implemented 2026-09-25
**Requirements:** N-GEN-01 (seeded generator) · N-GEN-02 (every board solvable) ·
N-GEN-03 (difficulty curve on authored weight)
**Consumers:** Phase 11 endless · Phase 12 daily
**Owner sign-off:** **not obtained.** Every number below comes from deterministic headless
measurement, not from human play. See *Limits* at the end — in particular, assumption **A1**
(Hermes byte-identity) is still unmeasured as of this document.
```

`BALANCE-E2.md:1-8` uses the identical Status/Requirements/Owner-sign-off block. Copy it, with
`**Consumers:** Phase 12 daily (board-swap seam) · Phase 13 achievements · Phase 14 Title entry`.

**`## Limits` preamble** (`BOARD-GENERATOR.md:291-295`, verbatim) — this is the idiom the phase
must reproduce, and it is also the reason item 2 has to be amended rather than deleted:

```markdown
## Limits

This section is why this document exists rather than a code comment. Everything above is real;
these are the things that are **not** established, stated plainly so a later phase does not
mistake an inference for a fact.
```

**Measured-table idiom** (`BOARD-GENERATOR.md:277-290`) — a short prose lead naming the plan
that produced the numbers, then a markdown table, then the honest caveat:

```markdown
Plan 10-04 scanned 840 boards (40 seeds x all 21 difficulties) through the headless bot at
`paddleOffset: 12`. **0 non-wins** ...

| | p50 | p95 | p99 | worst |
|---|---|---|---|---|
| all 840 | 108 | 259 | 416 | **1495** (`s=33 d=20`) |
```

**Discharged-assumption block** (`BOARD-GENERATOR.md:297-303`) is the template for the device
SC-5 reading this phase must land:

```markdown
> **Device digest: MEASURED 2026-09-25 — A1 DISCHARGED.**
> **On-device u32 fingerprint:** `0x2e8f6c23` = `781151267` — **matches the Node pin exactly.**
> Observed on: iPhone 17 simulator, iOS 26.5, Hermes via Expo SDK 57 dev client,
> `EXPO_PUBLIC_LEVELGEN_PROBE=1`. 4 200 boards in 1 331 ms.
> Raw line: `[levelgen] corpus fingerprint u32=0x2e8f6c23 seeds=200 boards=4200 ms=1331`
```

Required sections for SC-2: the wave→difficulty table (the "written down" clause —
`grep -c "wave" docs/ops/ENDLESS-MODE.md` is the automated check), the `world.tick` decision
with its measured justification, and a `## Limits` closing the SC-4 replay scope honestly
(headless-only; no per-tick intent recorder exists).

---

### `docs/ops/BOARD-GENERATOR.md` (amend §Limits item 2)

**The exact text to supersede** — lines 384-388, verbatim:

```markdown
The 840-board scan gives Phase 11 one concrete thing to look at: at the top of the range a
*perfect* bot needs 1495 simulated seconds on the worst board and 416 s at the p99. Since bot
time is a **floor** on human time, boards at that tail are plausibly unfinishable by a real
player. This is a balance observation, not a defect, and it is deliberately not asserted
anywhere — pinning a clear-time ceiling would pin the dial constants by proxy.
```

Amend in place with a dated supersession note pointing at `ENDLESS-MODE.md` (500-seed d=20 scan,
0 non-wins; the 18× trajectory spread on `s=33`; non-monotone per-difficulty maxima with d=17 at
2735.3 s). **Do not delete the original inference** — the `## Limits` preamble's whole purpose is
that a later phase can see what was believed and what corrected it. Keep the first paragraph of
item 2 ("No human play calibrated the dial constants") intact; only the second paragraph is
superseded. Note that BOARD-GENERATOR.md is a `docs/` file, so amending it does not breach the
`src/core` / `src/levelgen` freeze gate.

---

### `tests/endless.ramp.test.ts` (unit, property) — NEW

**Analog:** `tests/levelgen.schedule.test.ts` (whole file, 92 lines).

**Header pattern** (lines 1-28) — states the requirement, names the analog it copies its
assertion style from, and states *what it deliberately does not cover*:

```ts
/**
 * N-GEN-03 — the difficulty schedule is monotone and physically placeable.
 * ...
 * Analog: `tests/balance.curve-e2.test.ts`'s monotone-weight guard over
 * `PLAYABLE_LEVEL_ORDER` — the same non-decreasing `bricks` / `totalHp` pair ...
 *
 * **No test in this phase may pin the literal dial constants.** ... Asserting a *derived*
 * property (monotone `bricks`, monotone `totalHp`, capacity fits) is the contract ...
 *
 * Deliberately NOT covered here: whether a *generated board* actually realises the
 * schedule — that is exact-weight equality in `tests/levelgen.sweep.test.ts` (10-03-02).
 */
```

**Assertion pattern — loop the whole range, message names the index** (lines 37-46, verbatim):

```ts
  it('bricks is non-decreasing across the full 0..D_MAX range (10-03-01)', () => {
    for (let d = 1; d <= D_MAX; d++) {
      const prev = SCHEDULE[d - 1]!;
      const cur = SCHEDULE[d]!;
      expect(
        cur.bricks,
        `difficulty ${d} must not have fewer bricks than difficulty ${d - 1}`,
      ).toBeGreaterThanOrEqual(prev.bricks);
    }
  });
```

Copy the second-argument message convention (`expect(value, 'message').toBe…`) — it is used on
essentially every assertion in both `levelgen.schedule.test.ts` and
`levelgen.determinism.test.ts`, and it is what makes a 10 000-wave loop failure readable.

**Seed-uniqueness assertion pattern** — `tests/levelgen.determinism.test.ts:52` and `:102`:

```ts
    expect(new Set(seqA).size, 'a healthy stream does not repeat within 16 draws').toBe(16);
```

Use exactly that `new Set(...).size` form for the "60 consecutive waves → 60 distinct seeds and
60 distinct board ids" case.

**Imports:** `import { D_MAX } from '../src/levelgen';` (barrel) and
`import { difficultyForWave, seedForWave } from '../src/services/endless';` (barrel). Deep
imports into `src/levelgen/*` are permitted in tests only where the barrel is the thing under
test (see the header note at `levelgen.determinism.test.ts:21-26`); this file has no reason to.

---

### `tests/runtime.wave-advance.test.ts` (unit, world mutation) — NEW

**Analog:** `tests/runtime.reset-request.test.ts` (whole file, 125 lines).

**Setup + import pattern** (lines 4-24, verbatim) — real compiled `level-01` off disk through
`loadAndCompile`, imports split between the `src/core` barrel and
`../src/runtime/worldRequests` (deep, because `worldRequests` has no barrel):

```ts
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  allocateWorld,
  loadAndCompile,
  SimPhase,
  stepRun,
} from '../src/core';
import { allocateVfx } from '../src/vfx';
import {
  applyCertWorstCaseInject,
  applyRetryWorldReset,
  clearCosmeticVfx,
} from '../src/runtime/worldRequests';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const level01 = JSON.parse(
  readFileSync(join(root, 'assets/levels/level-01.json'), 'utf8'),
) as unknown;
```

**Field-by-field contract assertion pattern** (lines 45-72, verbatim) — dirty the world by hand,
apply, then assert each field individually:

```ts
  it('applyRetryWorldReset restores DOCKED + full HP + zero score/tick from LOST-like state', () => {
    const result = loadAndCompile(level01);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const world = allocateWorld();
    applyRetryWorldReset(world, result.compiled);
    world.score = 999;
    world.combo = 5;
    world.tick = 400;
    world.lives = 1;
    world.simPhase = SimPhase.LOST;
    world.accumulator = 0.05;

    applyRetryWorldReset(world, result.compiled);

    expect(world.simPhase).toBe(SimPhase.DOCKED);
    expect(world.score).toBe(0);
    expect(world.combo).toBe(1); // resetWorld baseline combo
    expect(world.tick).toBe(0);
    expect(world.lives).toBe(3);
    expect(world.accumulator).toBe(0);
```

For SC-1 this inverts: after `applyWaveAdvance`, `lives`/`score`/`combo`/`rngGameplay[0]` must be
**unchanged** while effects/pickups/stall/tick are zero and `simPhase === SimPhase.DOCKED`. Note
the `expect(result.ok).toBe(true); if (!result.ok) return;` narrowing idiom — used in every case
in this file — and the `expect(world).toBe(firstRef)` identity check at line 38, which is the
"mutates the live World, not a clone" guard.

**Also copy** the `stepRun`-after-apply smoke case (lines 110-124): apply, step once, assert the
sim does not immediately re-enter a terminal phase.

---

### `tests/endless.wave-loop.test.ts` (integration, headless sim) — NEW

**Analog A:** `tests/helpers/balanceBot.ts` — `runBotOnLevel` and its bot loop.
**Analog B:** `tests/physics.level03-serve.test.ts` — the "device play path through real `stepRun`" framing.

**Helper to reuse, not rebuild** (`balanceBot.ts:115-170`, excerpt) — takes a **level object**,
so a generated board with no file on disk plays through the real pipeline (this is why 10-01
added it):

```ts
export function runBotOnLevel(
  raw: LevelFileV1,
  opts: BotOptions = {},
  label = 'level',
): BotResult {
  const { paddleOffset = 0, seedA = 0xace, seedB = 0xbeef, rampPerSecond = 0 } = opts;
  const maxTicks = opts.maxTicks ?? TICKS_PER_SECOND * 360;

  const compiled = loadAndCompile(raw);
  if (!compiled.ok) {
    throw new Error(`${label} failed to compile: ${JSON.stringify(compiled.issues)}`);
  }
  ...
```

**The per-tick bot policy to copy** (`balanceBot.ts:135-156`, verbatim) — a multi-wave driver
cannot call `runBotOnLevel` directly (it allocates a fresh world per level), so the loop body is
what gets lifted:

```ts
  while (ticks < maxTicks) {
    stepRun(w, intent, FIXED_DT);
    ticks++;
    ...
    if (w.simPhase === SimPhase.WON || w.simPhase === SimPhase.LOST) break;

    if (w.simPhase === SimPhase.DOCKED) {
      // Serve (cold start and after every life loss).
      intent = { paddleX: w.paddleX, launch: 1 };
      continue;
    }

    const b = lowestLiveBall(w);
    intent = {
      paddleX: b >= 0 ? w.ballX[b]! + paddleOffset : w.paddleX,
      launch: 0,
    };
  }
```

`lowestLiveBall` is **private** to `balanceBot.ts` (line 85). RESEARCH's prototype inlined the
four-line scan; exporting it from the helper is the cleaner option — either way, say which.

**File-header framing** (`physics.level03-serve.test.ts:1-5`, verbatim):

```ts
/**
 * Device-path regression: full stepRun pipeline + real level-03 serve.
 * Vitest runs plain JS; if this fails, physics is still broken in the play path.
 * If it passes but device sticks, suspect worklet/Metro divergence.
 */
```

**Instrument-honesty note to carry over** (`balanceBot.ts:6-9`) — the bot "never misses on
purpose, so its clear time is a *floor* on human duration". Any wave-count or timing number this
test prints inherits that caveat.

**Measurement output:** Vitest suppresses `console.log` under this repo's reporter. Write
measurements with `node:fs` to the scratchpad — `balanceBot.ts:11-13` already imports
`node:fs`/`node:path`/`node:url` in exactly the needed form.

---

### `tests/endless.determinism.test.ts` (integration, determinism) — NEW

**Analog A:** `tests/physics.golden-replay.test.ts` — self-consistency assertion, no pinned constants.
**Analog B:** `tests/levelgen.determinism.test.ts` — the scope-honesty header.

**Identity-assertion helper pattern** (`physics.golden-replay.test.ts:61-73`, verbatim) — hash
first, then the individual fields, so a failure says *which* field diverged:

```ts
function assertWorldIdentity(a: World, b: World): void {
  expect(hashWorld(a)).toBe(hashWorld(b));
  expect(a.tick).toBe(b.tick);
  expect(a.ballX[0]).toBe(b.ballX[0]);
  ...
  expect(cloneBrickHp(a)).toEqual(cloneBrickHp(b));
  expect(a.rngGameplay[0]).toBe(b.rngGameplay[0]);
  expect(a.rngCosmetic[0]).toBe(b.rngCosmetic[0]);
}
```

**Scope statement to copy** (`physics.golden-replay.test.ts:1-9`, verbatim) — it refuses to
overclaim, which is exactly what VALIDATION asks of SC-4:

```ts
/**
 * Golden-replay / PROP-DETERM — PHYS-06 / D-14.
 *
 * hashWorld is Node-stable (FNV-1a over float bit patterns) for same-process
 * identity across intent chunkings — not a cross-device bit lock.
 */
```

**The stronger scope-honesty model** is `levelgen.determinism.test.ts:1-16`, which spends its
whole header on "what the pins do and do not claim". SC-4 needs the same paragraph: *given a run
seed, the initial world seeds and a fixed input policy, an endless run replays to the same wave
with the same score and the same `hashWorld` at every boundary* — and a device run is **not**
replayable because nothing records per-tick intent.

**Do not pin a literal hash.** `golden-replay` asserts A-equals-B; `levelgen.determinism` pins a
digest only because it guards a frozen corpus. The endless sequence is not frozen — assert
self-consistency (same seed ⇒ same hashes, different seed ⇒ divergence).

---

### `tests/storage.endless-firewall.test.ts` (unit, store) — NEW

**Analog:** `tests/storage.progress-v4.test.ts` § `recordRunEnd (v4, mode-aware, D-03/D-04)`,
lines 285-341.

**Store-under-test setup + assertion pattern** (lines 286-305, verbatim) — a fresh
`createMemoryProgressStore()`, ids read from `PLAYABLE_LEVEL_ORDER` (never hard-coded — the
campaign order has been reshuffled once already, see lines 41-46), and the returned blob asserted
field by field:

```ts
    const first = PLAYABLE_LEVEL_ORDER[0];
    const second = PLAYABLE_LEVEL_ORDER[1];
    const store = createMemoryProgressStore();

    // WIN — stars from lives, and the next catalog level unlocks (v3 behaviour).
    const afterWin = store.recordRunEnd({
      mode: 'campaign',
      levelId: first,
      score: 100,
      outcome: 'win',
      livesRemaining: 2,
      stats: runStats({ bricksBroken: 10 }),
    });
    expect(afterWin.bestByLevel[first]).toEqual({ score: 100, stars: 2 });
    expect(afterWin.unlocked).toEqual([first, second]);
    expect(afterWin.bestScore).toBe(100);
    expect(afterWin.telemetry.lifetime.runsWon).toBe(1);
```

**Stats-fixture helper** (lines 66-69, verbatim) — copy it rather than building blobs by hand:

```ts
/** All-zero per-run counters with only the fields a case cares about set. */
function runStats(over: Partial<RunStatsInput> = {}): RunStatsInput {
  return { ...defaultRunStatsInput(), ...over };
}
```

**Both stores must be covered.** The v4 file covers the async store in a separate describe block
(`AsyncStorage-backed store: v4 hydrate chain`, line 766) using
`__createAsyncStorageProgressStoreForTests` (imported at line 37). The firewall test needs the
same two-store treatment, or defect 1 stays live on the real device path.

The SC-3 assertion shape: play an endless win, then
`expect(after.unlocked).toEqual(before.unlocked)`, `expect(after.bestByLevel).toEqual(before.bestByLevel)`,
`expect(after.bestScore).toBe(before.bestScore)` — and `expect(after.telemetry.endless.bestWave)`
non-zero, proving the write landed somewhere.

---

### `tests/storage.progress-v4.test.ts` (extend)

**Analog:** its own telemetry-degradation cases, lines 212-267. The two to extend are
`'corrupt telemetry sub-object alone degrades ONLY telemetry to defaultTelemetryBlob(); unlocked/bestByLevel/bestScore survive untouched'`
(line 212) and `'partial telemetry keeps the fields it does have and defaults only the missing/invalid ones'`
(line 236). A corrupt `telemetry.endless` must degrade **that sub-object only** — neither the
sibling telemetry fields nor the enclosing progress fields.

Also extend the merge describe at line 511 (`mergeRunIntoTelemetry` / `mergeTelemetryBlobs`) for
the running-max semantics on `bestWave` / `bestScore`, mirroring the `*Ever` cases at 512-574.

---

### `tests/ui/PlayingHost.next-bake.test.ts` (extend)

**Analog:** itself. Two patterns live in this one file and the phase needs both.

**(a) Source-contract pattern** (lines 16-21 + 134-145, verbatim) — greps the real source with
comments stripped, so a doc note cannot false-positive:

```ts
const HOST = join(process.cwd(), 'app/_components/PlayingHost.tsx');

/** Strip // line comments so doc notes cannot false-positive. */
function codeOnly(src: string): string {
  return src.replace(/\/\/.*$/gm, '');
}
```

```ts
describe('PlayingHost Next bake gate (source contract)', () => {
  const code = codeOnly(readFileSync(HOST, 'utf8'));

  it('Next callback source must not contain setActive(true) (gate owns arm)', () => {
    const m = code.match(
      /const goNext = useCallback\(\(\) => \{([\s\S]*?)\}, \[/,
    );
    expect(m?.[1]).toBeTruthy();
    expect(m![1]).not.toMatch(/setActive\s*\(\s*true\s*\)/);
    expect(m![1]).toMatch(/runEndedRef\.current = false/);
  });
});
```

This is the shape for SC-5's bake-key assertion (`loadKey` must not reference `brickCount`) and
for D-05's `__DEV__` gate. `tests/ui/GameHost.test.tsx:127-131` shows the same technique applied
specifically to a `__DEV__` block:

```ts
    const soakMatch = code.match(
      /if \(typeof __DEV__[\s\S]*?SOAK_HARNESS\)[\s\S]*?return \(\) => \{[\s\S]*?\n  \}, \[\]\);/,
    );
    expect(soakMatch).toBeTruthy();
    expect(soakMatch![0]).not.toMatch(/setShellPhase\('select'\)/);
```

**(b) jsdom behavioural harness** (lines 7 + 23-125 + 147-201) — `@vitest-environment jsdom`
docblock, then the full `vi.mock` wall (expo-font, expo-keep-awake, skia, reanimated, input,
useVfxIntensity, resolveQualityTier, audio, platform, devflags, crashReporting,
bakeGlowSprites, GameScreen, useGameLoop), then a `Controlled` wrapper that owns the prop and an
`act`/`waitFor` settle:

```ts
vi.mock('../../src/runtime/useGameLoop', () => ({
  UiPhaseNum: { PLAYING: 0, PAUSED: 1, COUNTDOWN: 2 },
  useGameLoop: () => ({
    picture: { value: null },
    surfaceSize: { value: { width: 360, height: 640 } },
    setActive,
    retry,
    injectCertWorstCase: () => {},
    certOut: { value: {} },
    certSeq: { value: 0 },
    // Defensive: the scenarios here never fire WON/LOST/menu-exit, so these are
    // not dereferenced today — kept in sync so a future case cannot hit
    // "Cannot read properties of undefined" (Phase 9 N-STAT-01).
    runStats: { value: null },
    world: { value: null },
  }),
}));
```

**This mock must gain `advanceWave: () => {}`** the moment `PlayingHost` starts calling it — the
comment at lines 119-121 is the file telling you it has been bitten by exactly this before.
`tests/ui/PlayingHost.bake-gate.test.ts` carries the same mock wall and needs the same update.

The `setActiveCalls` recorder at lines 103-107 is the instrument for proving SC-5's "no
`setActive(false)` at a wave transition":

```ts
const setActiveCalls: boolean[] = [];
const setActive = vi.fn((v: boolean) => {
  setActiveCalls.push(v);
});
```

---

## Shared Patterns

### Worklet closure discipline

**Source:** `src/runtime/worldRequests.ts:5-6`, `src/core/rules/speedRamp.ts:21-25`
**Apply to:** `src/runtime/worldRequests.ts` (`applyWaveAdvance`), the new block in `src/runtime/useGameLoop.ts`
**Gate:** `scripts/assert-worklet-closures.mjs`, run by `npm test`

Inside a `'worklet'` body: no module constants, no enum member access, no default-parameter
expressions. Inline the numeric literal with a `// CONSTANT_NAME` comment. `SimPhase.DOCKED` is
`0` (`src/core/types.ts:29-34`).

### Request/apply counters — the only JS→UI-runtime mutation route

**Source:** `src/runtime/useGameLoop.ts:319` (declarations), `:412-417` (apply), `:673-678` (bump)
**Apply to:** `src/runtime/useGameLoop.ts`, `app/_components/PlayingHost.tsx`

JS never mutates `world.value`. It bumps a counter; the frame callback compares
`request !== applied`, assigns `applied = request`, then mutates the live `World`. The reason is
recorded at `useGameLoop.ts:174-181`:

```ts
   * JS must NOT read counters off this handle: Reanimated does not propagate in-place
   * mutation of a held object across the bridge, so `runStats.value.bricksBroken` on the
   * JS thread returns a stale value (device UAT: a run that broke bricks persisted 0).
```

### Fail-soft telemetry firewall (this is the SC-3 argument)

**Source:** `src/services/storage/parseBlob.ts:387-392`
**Apply to:** `types.ts`, `parseBlob.ts`, `telemetry.ts`, both stores, `tests/storage.*`

The endless record goes **inside** `TelemetryBlob`, never at `ProgressBlob` top level, because
`sanitizeTelemetry` is validated independently of its siblings: a structural failure there
degrades telemetry alone and can never make the enclosing blob read as `corrupt`. At the top
level it would participate in the top-level gating and could take campaign progress down with
it.

### Single run-boundary funnel

**Source:** `app/_components/PlayingHost.tsx:664-669` (the doc comment), `:637-660`, `:670-676`
**Apply to:** `app/_components/PlayingHost.tsx`

Win, lose and abandon already collapse to one `runEndedRef`-guarded call. Endless adds a
*pre-branch*, not a fourth detection site. `waveAdvanceInFlightRef` copies `runEndedRef`'s shape
(a `useRef`, not state) for the same reason.

### `expect(value, 'why')` message convention

**Source:** `tests/levelgen.schedule.test.ts:41-44`, `tests/levelgen.determinism.test.ts:51-52`
**Apply to:** all five new test files

Every assertion in a loop carries a second-argument message naming the loop index. Without it a
10 000-wave or 60-seed failure is unreadable.

### Property assertions, never pinned dial constants

**Source:** `src/levelgen/schedule.ts:9-12`, `tests/levelgen.schedule.test.ts:18-23`
**Apply to:** `tests/endless.ramp.test.ts`, `docs/ops/ENDLESS-MODE.md`

*"No test in this phase may pin a literal dial value."* The ramp test asserts starts-at-0,
+1-per-wave, clamps-at-`D_MAX`, never-exceeds-out-to-10 000 — not a literal array. Clear-time
numbers belong in the ops doc, never in an `expect()` (`BOARD-GENERATOR.md:387-388`: pinning a
clear-time ceiling would pin the dial constants by proxy).

### `__DEV__` guard idiom

**Source:** `app/_components/PlayingHost.tsx:995`, `app/_components/GameHost.tsx:56`
**Apply to:** `app/_components/PlayingHost.tsx`, `tests/ui/PlayingHost.*.test.ts`

Always `typeof __DEV__ !== 'undefined' && __DEV__`, never bare `__DEV__` — the source-contract
tests grep for the full form. D-05 needs no devflag; `src/devflags.ts` is precedent only.

### Measurement output goes through `node:fs`

**Source:** `tests/helpers/balanceBot.ts:11-13`, VALIDATION § Test Infrastructure
**Apply to:** `tests/endless.wave-loop.test.ts`, `tests/endless.determinism.test.ts`, any
throwaway measurement test

Vitest suppresses `console.log` under this repo's reporter config (plans 10-02, 10-03 and 10-04
each hit it). Write to the scratchpad with `node:fs`, and delete any throwaway measurement file
before the plan's verification block runs `git status --porcelain`.

---

## No Analog Found

None. Every file in scope has a same-role, same-data-flow analog in tracked source — usually in
the very file being modified. This matches RESEARCH § Don't Hand-Roll: *"this phase's whole value
is in not building anything."*

One near-miss worth flagging to the planner: `src/services/endless/` is a **new directory** under
`src/services/`, and its siblings (`audio/`, `haptics/`, `platform/`, `storage/`) are all
I/O-seam services with injectable implementations. `endless/` is a pure policy module with no
seam, so its *structural* analog is `src/levelgen/` (pure, barrel-fronted, Node-testable) even
though it lives under `services/`. `src/levelgen/index.ts` is the barrel to copy, not
`src/services/storage/index.ts`.

---

## Metadata

**Analog search scope:** `src/levelgen/`, `src/runtime/`, `src/services/storage/`, `src/core/rules/`,
`app/_components/`, `tests/`, `tests/ui/`, `tests/helpers/`, `docs/ops/`, `docs/layer-contract.md`,
`eslint.config.js`
**Files scanned:** 27 read (all `git ls-files`-verified tracked), ~40 greped
**Tracked-source gate:** 27 / 27 analogs tracked; 0 gitignored-mirror paths emitted
**Pattern extraction date:** 2026-09-25
