# Phase 9: Run Telemetry & Storage v4 - Research

**Researched:** 2026-09-25
**Domain:** Local-only run telemetry (event-ring reducer) + AsyncStorage schema migration (React Native / Expo SDK 57)
**Confidence:** HIGH (architecture, storage migration, event-ring mechanics — all verified by reading the actual source) / MEDIUM (cascade-attribution algorithm, AsyncStorage size ceiling — verified via community sources, not official docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**What counts as a run**
- **D-01:** **Every retry is a new run.** Phase 6 locked RUN-03 (instant retry, no
  confirmation), so retries are frequent and cheap — counting each one keeps "attempts"
  honest and keeps within-run achievements ("clear without dying") naturally scoped.
- **D-02:** **Abandoned runs are recorded**, with an outcome distinct from win/lose.
  Rationale: a player who plays five minutes then exits to Menu must not see "0 bricks
  broken". Counters accumulated up to the exit still count toward lifetime totals; the
  separate outcome keeps win-counting achievements from mis-firing.
- **D-03:** Run outcomes are therefore a closed set: `win | lose | abandoned`.

**Schema shape**
- **D-04:** **v4 is mode-aware from the start.** Stats key on `(mode, levelId)` with
  `mode: 'campaign' | 'endless' | 'daily'`; only `campaign` is written in this phase.
  Phases 11 and 12 then add a mode value instead of forcing a v5 and a v6 migration.
- **D-05:** **Aggregate lifetime totals plus a bounded ring buffer of recent runs.** Each
  log entry stays small — mode, level id, outcome, score, ticks, timestamp. The bound is
  fixed and enforced on write so the blob cannot grow without limit.
  Rationale: E2 had to build a throwaway bot because nothing in the app recorded real
  runs. This is the durable fix, and it is what makes "how have I been playing lately"
  answerable in Phase 14.

**Counters recorded per run**
- **D-06:** Base set (from ROADMAP): bricks broken, best combo, power-ups caught, lives
  lost, ticks played, outcome.
- **D-07:** Plus **per-power-up-type counts** — multiball / expand / extra life / slow /
  fireball counted separately, not as one total. Needed for per-verb achievements, and it
  is the observed drop distribution that N-CNT-02 currently has no data for.
- **D-08:** Plus **largest explosive cascade** (bricks destroyed in a single chain). E1b
  made explosive the campaign's teaching verb; this is the number worth showing off.
- **D-09:** Plus **wall-clock play time (ms)**, separate from `ticks × FIXED_DT`. Ticks
  measure simulated time and exclude pause; wall-clock answers "hours played" honestly.
  Both are stored — they are different questions.
- **D-10:** Plus **longest rally**, defined as *consecutive paddle hits without losing a
  life*. This is deliberately **not** best combo (consecutive brick hits without paddle
  contact), which D-06 already covers — a survival streak, not an aggression streak. The
  planner must not collapse these into one field.

**Carried forward (already locked — do not re-litigate)**
- **C1 D-09:** Parse is fail-soft — corrupt or partial data degrades to defaults, never
  throws into gameplay. v4 follows the same contract.
- **C1 D-10:** Writes are async and non-blocking; memory merge is synchronous and the
  persist is fired and not awaited.
- **C1 D-11:** No storage reads and no React state writes on the simulation or render hot
  path.
- **C2:** `recordRunEnd` is the established end-of-run entry point; telemetry should ride
  it rather than adding a parallel call site.
- **Roadmap SC-5:** telemetry *reads* events — `hashWorld` and core stay untouched.

### Claude's Discretion
- Exact ring-buffer bound (a round number in the tens; justify it against blob size).
- Exact TypeScript shape of the v4 blob beyond the fields above.
- Whether counters accumulate in a JS-side reducer draining the event ring, or are folded
  into the existing `PlayingHost` event fan-out — provided the hot-path and
  core-untouched constraints hold.
- Whether `PersonalBestBlob` v1 remains a separate migrate source or is finally folded in.

### Deferred Ideas (OUT OF SCOPE)
- **Statistics screen / how any of this is displayed** → Phase 14 (N-STAT-03). This phase
  records; it renders nothing.
- **Achievement definitions and unlock rules** → Phase 13. Telemetry is the substrate.
- **Daily streak storage** → Phase 12. D-04's mode dimension leaves room for it, but the
  streak rules (and the clock-change policy) are Phase 12's decision.
- **Reset-stats affordance** → Phase 14 UI question, if wanted at all.
- **Using observed drop counts to retune the drop table** → N-CNT-02, still blocked on a
  human cohort. D-07 only makes the data exist.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| N-STAT-01 | A run records deterministic counters — bricks broken, best combo, power-ups caught, lives lost, ticks played, outcome — derived from the existing event ring, aggregated lifetime and per level id | See "Architecture Patterns" (per-substep runtime reducer, `Pattern 1`/`Pattern 2`), "Code Examples" (event-sourced counter derivation), and "Common Pitfalls" 1–3 (cascade attribution, ticks-from-`world.tick`, lives-lost-from-events) for exactly how each counter is derived without touching core |
| N-STAT-02 | `ProgressBlob` v3 → v4 migration is lossless for every existing best score, star and unlocked level; corrupt v4 degrades to defaults instead of throwing | See "Architecture Patterns" `Pattern 3` (migration chain extension) and "Common Pitfalls" 4 (partial-corruption independence) for the fail-soft contract v4 must preserve; "Validation Architecture" maps this to a golden-fixture round-trip test |
</phase_requirements>

## Summary

This phase adds no new libraries and no new Expo APIs — it is pure application code layered
onto two systems that already exist and are already well-tested: the fixed-capacity event
ring (`src/core/events/ring.ts`) and the versioned `ProgressBlob` migration chain
(`src/services/storage/*`). The correct shape is additive on both: extend `ProgressBlob`
v3 → v4 in place (same key family, same fail-soft parse contract, same never-delete-legacy
rule), and drain the event ring with a **new read-only reducer that lives in `src/runtime/`**
(the same layer as `eventBridge.ts` / `publishChromeMirror.ts`), not in `src/core/` and not
in `src/services/`. This keeps `hashWorld` and the simulation completely untouched (SC-5)
while still reaching storage, because `app/` (which owns `PlayingHost.tsx`) is the one layer
allowed to import both `runtime/` and `services/` (LC-04).

Two counters need real design work because core does not already track them:
**best combo** can be read as a running max of `world.combo` (already a core field, sampled
read-only once per substep — no event needed), but **longest rally** (paddle hits without a
life lost) and **largest explosive cascade** must be derived from the event stream itself,
since core has no concept of either. Cascade attribution is the one place this research
found a real, if narrow, ambiguity: because `explodeAtCell` recursion is synchronous and
depth-first, a single explosive chain's `BRICK_BREAK` events are contiguous in ring order in
the overwhelming common case, but with up to 8 simultaneous balls (`MAX_BALLS`), two
*independent* collisions can in principle resolve in the same 8.3ms substep and their events
would sit in the same ring segment. A grid-adjacency grouping (using `evX`/`evY` already in
the ring, no core change) resolves this correctly; a simpler "any BRICK_BREAK in this
substep counts toward the cascade if one broken brick was EXPLOSIVE" heuristic is available
as a cheaper fallback that only risks overcounting in a genuinely rare multiball edge case.

The event fan-out question ("can telemetry ride the D1 haptics seam?") has a better answer
than riding it: telemetry does not need a per-frame JS hop at all. Every counter this phase
needs is only *read* at a run boundary (win, lose, or abandon-to-menu), so it can accumulate
entirely on the UI thread in a new `runStatsSv` SharedValue (mirroring the existing
`vfxSv`/`audioBatchSv`/`flashSv` pattern already in `useGameLoop.ts`) and be read
synchronously from JS at exactly the three moments `PlayingHost.tsx` already distinguishes
runs ending: the `chromeSeq` reaction's WON/LOST branch, and a new wrapper around the single
`onMenu` callback for the abandon case. This adds zero new `scheduleOnRN`/`runOnJS` hops and
zero hot-path storage or React-state writes.

**Primary recommendation:** Add a worklet-safe, zero-alloc reducer in `src/runtime/` that
drains the event ring once per substep into a preallocated `RunStats` SharedValue (mirroring
`VfxState`); read that SharedValue synchronously from `PlayingHost.tsx` at WON/LOST and at a
newly-wrapped abandon-to-menu path; extend `ProgressBlob` v3 → v4 in place with a `telemetry`
sub-object (lifetime aggregate + per-`(mode, levelId)` aggregate + a bounded 50-entry
recent-runs ring); extend `recordRunEnd` (not a second call site) to accept the new fields;
chain `migrateOrDefault` one level deeper (`v4 → v3 → v2 → v1`) exactly as `v3` already
chains back to `v2`/`v1`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Event-ring draining into run counters | Runtime (UI-thread worklet) | — | Must run inside the same per-substep loop that already drains the ring for VFX/audio (`useGameLoop.ts`); core must stay a pure reader-free simulation (LC-01/LC-06) |
| Best-combo / longest-rally / cascade bookkeeping | Runtime | — | Read-only peeks at `World` fields (`world.combo`) plus event-code counting; zero core mutation |
| Wall-clock play time | App (`PlayingHost.tsx`) | — | `Date.now()` is banned in `core/` (ESLint `no-restricted-syntax`) and unnecessary in `runtime/`; simplest and most correct is a discrete cold-path read at run-start/run-end callbacks that already exist |
| Run-boundary detection (win/lose/abandon) | App (`PlayingHost.tsx` / `GameHost.tsx`) | — | `GameHost` owns `shellPhase`; `PlayingHost` owns the single `onMenu` callback and the `chromeSeq` reaction that already detects WON/LOST |
| `ProgressBlob` v4 schema + migration | Services (`src/services/storage/**`) | — | Versioned-key parse/migrate pattern is a services concern; core/runtime must not import services (LC-04) |
| Persistence (write-through, fail-soft) | Services (`memoryStore.ts` / `asyncStorageStore.ts`) | App (call site) | Existing `recordRunEnd` sync-merge + fire-and-forget persist pattern is unchanged, only the payload grows |

## Standard Stack

No new packages this phase. Everything needed already ships in the repo:

| Library | Version (installed) | Purpose | Why no change needed |
|---------|---------|---------|--------------|
| `@react-native-async-storage/async-storage` | `2.2.0` (pinned exact, `package.json`) `[VERIFIED: codebase grep]` | Backing store for `ProgressBlob` v4 | Same key family, same classic default-export API already in use; no version bump required |
| `react-native-reanimated` | already installed (worklets / `useFrameCallback` / `SharedValue`) `[VERIFIED: codebase grep]` | Hosts the new `runStatsSv` SharedValue the same way `vfxSv`/`audioBatchSv` already work | No new API surface — reuses `useFrameCallback` + `SharedValue.value` cross-thread read, both already exercised in `useGameLoop.ts` |
| `expo` | `~57.0.24` `[VERIFIED: codebase grep, package.json]` | Project SDK pin | AGENTS.md requires reading the versioned docs before touching Expo APIs; this phase touches no new Expo API — `docs.expo.dev/versions/v57.0.0/sdk/async-storage/` was checked and documents no size-limit or API changes relevant here `[CITED: docs.expo.dev/versions/v57.0.0/sdk/async-storage/]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending the existing `@nbb/progress/vN` key in place | A separate `@nbb/telemetry/v1` key | Rejected — Roadmap SC-3 and CONTEXT both frame this as "`ProgressBlob` v3 migrates to v4," i.e. one blob, one version bump. A second key would dodge the migration test the phase explicitly requires and would need its own independent fail-soft contract for no benefit. |
| UI-thread `runStatsSv` SharedValue reducer | Draining the ring on the JS thread via the existing `playBatchOnJS` (audio/haptics) hop | Rejected as primary — would add per-frame payload growth to the one batched hop LC-07 already caps at ≤1/frame, and ties an unrelated concern (telemetry) to the audio/haptics fan-out. The SharedValue approach needs *zero* additional hops. |
| Grid-adjacency cascade grouping | "Any BRICK_BREAK event in the same substep counts if one was EXPLOSIVE" | The cheaper heuristic is a legitimate fallback (documented in Common Pitfalls) if the planner wants to defer the adjacency bookkeeping — it only risks *overcounting* in a rare simultaneous-multiball-collision edge case, never undercounting. |

**Installation:** none — no `npm install` step this phase.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero new packages. All work is additive TypeScript
inside `src/core` (untouched), `src/runtime`, `src/services/storage`, and `app/_components`.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────┐
                         │      src/core (UNTOUCHED this phase)     │
                         │  stepRun → stepWorld → rules/*.ts        │
                         │  pushEvent(...) into fixed evCap=128 ring │
                         │  world.combo / world.tick / world.lives   │
                         │  (read-only from here down — no writes)   │
                         └───────────────┬───────────────────────────┘
                                         │ (per substep, ring alive until next clearEvents)
                                         ▼
      ┌───────────────────────────────────────────────────────────────────┐
      │ src/runtime/useGameLoop.ts  onFrame() worklet — UI thread          │
      │                                                                     │
      │  existing per-substep drains (unchanged):                          │
      │    consumeEventsForVfx(w, vfx, intensity)   → src/vfx               │
      │    appendEventsForAudio(w, batch)           → src/vfx               │
      │    updateFlashFromEvents(w, flash)                                  │
      │                                                                     │
      │  NEW per-substep drain (this phase):                                │
      │    reduceRunTelemetry(w, runStatsSv.value)  → src/runtime (NEW)     │
      │      - counts BRICK_BREAK / POWERUP_CATCH / PADDLE_HIT / LIFE_LOST  │
      │      - tracks running max(world.combo), running rally, cascade     │
      │      - NO scheduleOnRN / runOnJS — pure SharedValue mutation        │
      │                                                                     │
      │  existing ≤1/frame audio hop (unchanged):                          │
      │    flushAudioBatchOnJS(...)  ← the ONLY scheduleOnRN site (LC-07)   │
      │                                                                     │
      │  existing chrome mirror publish (unchanged):                       │
      │    publishChromeMirror(...) + chromeSeq bump on WON/LOST            │
      └───────────────────────────────┬────────────────────────────────────┘
                                      │ chromeSeq reaction (existing) — runOnJS(applyChrome)
                                      ▼
      ┌───────────────────────────────────────────────────────────────────┐
      │ app/_components/PlayingHost.tsx  (JS thread)                       │
      │                                                                     │
      │  applyChrome(mirror): on WON/LOST (existing) → handleRunEnded(...)  │
      │    NEW: read runStatsSv.value (synchronous cross-thread SharedValue │
      │         read — same mechanism chromeSv/compiledSv already use)      │
      │    NEW: Date.now() - runStartedAtRef.current → wallClockMs          │
      │    → store.recordRunEnd({ mode:'campaign', levelId, score,          │
      │         outcome, livesRemaining, stats })  (EXTENDED, same call site)│
      │                                                                     │
      │  NEW: handleMenuPress() wraps the single `onMenu` prop —            │
      │    if a run is live and not yet ended → recordRunEnd(outcome:       │
      │    'abandoned') using the SAME runStatsSv snapshot, THEN call onMenu │
      │    (covers both the Pause-screen Menu button and BackHandler,       │
      │    which both already funnel through this one callback)             │
      └───────────────────────────────┬────────────────────────────────────┘
                                      ▼
      ┌───────────────────────────────────────────────────────────────────┐
      │ src/services/storage (services layer, app-only import — LC-04)     │
      │  recordRunEnd extended: merges score/stars/unlock EXACTLY as today,│
      │  PLUS merges `stats` into telemetry.lifetime and                   │
      │  telemetry.byMode.campaign[levelId], PLUS pushes a bounded          │
      │  RunLogEntry into telemetry.recentRuns (FIFO, cap 50)               │
      │  → sync memory merge, void persist (unchanged D-10/F-26 contract)  │
      └─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── core/                        # UNTOUCHED this phase (SC-5)
├── runtime/
│   ├── useGameLoop.ts            # +1 call site: reduceRunTelemetry per substep
│   ├── runStats.ts               # NEW — RunStats type + allocateRunStats() + reduceRunTelemetry()
│   └── eventBridge.ts            # UNCHANGED — still the sole scheduleOnRN site
├── services/storage/
│   ├── types.ts                  # PROGRESS_VERSION → 4; new TelemetryBlob / RunLogEntry / RunStats types
│   ├── parseBlob.ts              # +parseProgressResultV4 (fail-soft, partial-section recovery)
│   ├── migrateProgress.ts        # +migrateOrDefaultV4(v4Raw, v3Raw, v2Raw, v1Raw); v3ToV4() pure fn
│   ├── telemetry.ts              # NEW — mergeRunIntoTelemetry(), defaultTelemetryBlob(), ring bound
│   ├── memoryStore.ts            # recordRunEnd signature extended
│   └── asyncStorageStore.ts      # recordRunEnd signature extended; hydrate chain +v4
app/_components/
├── PlayingHost.tsx                # runStartedAtRef; handleMenuPress wrapper; extended handleRunEnded
└── GameHost.tsx                   # unchanged — onMenu wiring already funnels through PlayingHost
```

### Pattern 1: Read-only runtime reducer beside the VFX consumer

**What:** A new file, e.g. `src/runtime/runStats.ts`, exporting a `'worklet'` function with
the exact same shape as `consumeEventsForVfx` in `src/vfx/consumeEvents.ts` — same
`(world.evHead - n + world.evCap) % world.evCap` ring-walk idiom, same "does not clear the
ring" contract, same read-only access to `World` fields.
**When to use:** Any time a consumer needs to observe simulation events without
participating in the simulation. This is the established, already-reviewed pattern in this
codebase (`applyScoringFromEvents`, `consumeEventsForVfx`, `appendEventsForAudio` all follow
it).
**Example (adapted from the existing `consumeEventsForVfx` ring-walk):**
```typescript
// Source: src/vfx/consumeEvents.ts (existing pattern this phase should mirror)
const start = (world.evHead - n + world.evCap) % world.evCap;
for (let i = 0; i < n; i++) {
  const idx = (start + i) % world.evCap;
  const code = world.evCode[idx];
  // ... read evA/evB/evX/evY, never mutate world.*
}
```

### Pattern 2: UI-thread SharedValue accumulator, JS-thread synchronous read at run boundary

**What:** `vfxSv`, `audioBatchSv`, and `flashSv` in `useGameLoop.ts` are all
`useSharedValue<T | null>` allocated lazily on first frame and mutated in place on the UI
thread every substep. `runStatsSv` should follow the identical shape: a preallocated struct
(SoA-friendly counters, all plain numbers — no nested objects that would force per-substep
allocation) that the runtime never has to hop to JS, because JS can read
`runStatsSv.value` directly and synchronously (Reanimated SharedValues are genuinely shared
across the JS/UI boundary — this is the same mechanism `chromeSv.value` and `compiledSv.value`
already rely on elsewhere in this file).
**When to use:** Whenever a JS-thread callback needs a point-in-time snapshot of
UI-thread-accumulated state, and that need is rare (per-run, not per-frame) so a dedicated
`scheduleOnRN` hop would be wasteful.
**Example:**
```typescript
// Source: pattern already proven by chromeSv / compiledSv in
// app/_components/PlayingHost.tsx + src/runtime/useGameLoop.ts
const runStatsSv = useSharedValue<RunStats | null>(null);
// ... allocated on first frame, mutated per substep inside onFrame ...
// JS thread, at run-end callback (no runOnJS needed — same-thread already, or
// direct .value read from a JS callback triggered by the existing chromeSeq reaction):
const snapshot = cloneRunStats(runStatsSv.value);
```

### Pattern 3: Versioned blob migration chain (extend, don't replace)

**What:** `migrateOrDefault(v3Raw, v2Raw, v1Raw)` in `src/services/storage/migrateProgress.ts`
is a pure function chaining `parseProgressResult` → `parseProgressV2Result` →
`parsePersonalBestResult`, preferring the newest valid version and falling back through
older ones without ever deleting the older keys. v4 adds one more link at the *front* of
the chain, not a rewrite of the existing links.
**When to use:** Exactly this migration.
**Example:**
```typescript
// Source: src/services/storage/migrateProgress.ts (existing v2→v3 link — v4 adds v3→v4 the same way)
function v2ToV3(v2: ProgressBlobV2): ProgressBlob { /* ... */ }

export function migrateOrDefault(
  v3Raw: string | null, v2Raw: string | null, v1Raw: string | null,
): ProgressBlob {
  const v3 = parseProgressResult(v3Raw);
  if (v3.status === 'ok') return v3.progress;
  const v2 = parseProgressV2Result(v2Raw);
  if (v2.status === 'ok') return v2ToV3(v2.progress);
  const v1 = parsePersonalBestResult(v1Raw);
  if (v1.status === 'ok') { /* seed bestScore only */ }
  return defaultProgressBlob();
}
```
The v4 equivalent: `migrateOrDefaultV4(v4Raw, v3Raw, v2Raw, v1Raw)` tries v4 first, else
calls the *existing* `migrateOrDefault(v3Raw, v2Raw, v1Raw)` and appends
`defaultTelemetryBlob()` to the result via a new pure `v3ToV4()` function. The existing
v3/v2/v1 links are reused verbatim — zero risk of regressing an already-tested path.

### Anti-Patterns to Avoid

- **Adding telemetry fields to `World` in `src/core/types.ts`:** Even though it would be the
  "easiest" place to accumulate a running max or count, this directly violates SC-5
  ("`hashWorld` and core simulation are untouched — telemetry reads events, it does not
  participate in the sim"). `hashWorld` mixes specific `World` fields (`src/core/hash.ts`);
  any new field risks being folded into the golden-replay hash by a future edit, and even if
  carefully excluded, it still makes core carry a responsibility ("remember telemetry
  counters") that belongs one layer up. Keep every new counter outside `src/core`.
- **A second `scheduleOnRN`/`runOnJS` fan-out for telemetry:** LC-07 caps hot-path JS hops at
  ≤1/frame (the existing audio/haptics batch). Telemetry does not need per-frame visibility —
  resist the urge to "push" counters to JS every frame; read them once at run end instead.
- **Re-deriving `world.combo`'s bookkeeping from events instead of reading the field:**
  `applyScoringFromEvents` already computes combo transitions from `PADDLE_HIT`/`BRICK_HIT`/
  `BRICK_BREAK` with an award-then-increment order (Phase 05 decision). Reimplementing that
  logic in the telemetry reducer to derive "best combo" would create a second combo
  state machine that can silently drift from core's if a future rule changes combo behavior
  (e.g. a stall-tier combo penalty). Read `world.combo` directly; it is already authoritative
  and read-only access does not touch core.
- **Treating "abandoned" as a rare edge case not worth a real call site:** Both the
  Pause-screen "Menu" button and the Android hardware-back handler in `PlayingHost.tsx`
  already resolve to the *same* `onMenu` callback reference. Wrap that one reference once;
  do not add abandon-detection logic in multiple places.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-thread run-end snapshot delivery | A custom message-passing queue between UI and JS threads | Direct synchronous `SharedValue.value` read (already proven by `chromeSv`/`compiledSv`) | Reanimated SharedValues already solve exactly this; a custom queue would duplicate infrastructure and risk missing the one guarantee that matters here — reading the *final* accumulated value, not a stale intermediate one |
| Blob versioning / fail-soft parsing | A generic schema-validation library (zod, io-ts, etc.) | The existing hand-rolled `status: 'ok'\|'absent'\|'corrupt'` parse-result pattern in `parseBlob.ts` | Adding a validation library here is disproportionate to the problem (4 known top-level shapes) and would be the first dependency in a file whose entire design philosophy is "no I/O, no surprises, never throw" — a new dependency is itself a new throw surface |
| FIFO ring buffer for `recentRuns` | A circular-buffer class/library | A plain array with `push` + `slice(-BOUND)` (or `shift()`) at write time, mirroring the fixed-capacity philosophy of `src/core/events/ring.ts` but at the *services* layer where allocation cost is irrelevant (write happens once per run end, not per frame) | The core-layer ring (`SoA`, zero-alloc) is a real, justified constraint on the 120Hz hot path; the storage-layer ring buffer runs once per run-end (a cold path) and gains nothing from that level of ceremony |

**Key insight:** Every "hard" part of this phase already has a proven analog somewhere in
this same codebase (VFX/audio ring consumers, chrome mirror cross-thread read, versioned
blob migration chain). The research task was to find those analogs, not to invent new
mechanisms — and having found them, the plan should explicitly cite each one as the pattern
to copy, because plan-checker and code-review will be looking for exactly this kind of
consistency.

## Common Pitfalls

### Pitfall 1: Treating "cascade" as "every BRICK_BREAK in a substep"

**What goes wrong:** Counting all `BRICK_BREAK` events emitted within one 8.3ms substep as
"one cascade" overcounts whenever two independent, non-chained brick breaks happen to land
in the same substep — which is possible (not just theoretical) once multiball is active,
since `stepWorld` resolves collisions for up to `MAX_BALLS = 8` active balls per substep
(`src/core/step.ts`, `for (let bi = 0; bi < ballLimit; bi++)`).
**Why it happens:** The event ring has no per-event "caused by which collision" tag — `evA`
is HP-before-damage and `evB` is the brick index; there is no cascade/chain identifier,
because core was never asked to track one (correctly — that would be a core change).
**How to avoid:** Two viable approaches, in order of correctness:
1. **Spatial-adjacency grouping (recommended):** within one substep's ring segment, connect
   consecutive `BRICK_BREAK` events into the same group only when their `(evX, evY)`
   positions are within one lattice cell of a brick already in the group (8-neighbor
   adjacency, same rule `explodeAtCell` itself uses — derivable read-only from
   `world.latticePitchX/Y` and the event payload already in the ring, no core change).
   Track group size; a group only counts toward "largest cascade" if at least one member
   brick has `(world.brickFlags[evB] & BrickFlags.EXPLOSIVE) !== 0` (checked read-only,
   since `brickFlags` is not cleared on break — only `brickHp` and `cellToBrick` are).
2. **Cheaper heuristic (acceptable fallback):** if at least one `BRICK_BREAK` event in a
   substep's segment is EXPLOSIVE-flagged, treat the *entire* segment's `BRICK_BREAK` count
   as the cascade size for that substep. This only risks overcounting (never undercounting)
   in the rare same-substep-independent-collision case, which is an acceptable approximation
   for a highlight/bragging stat rather than a balance-critical number.
**Warning signs:** A cascade number that is suspiciously exactly equal to "total bricks
broken this run" (suggests the grouping boundary — the "new substep" reset — was never
applied, and everything is being counted as one giant cascade).

### Pitfall 2: Re-deriving "ticks played" instead of reading `world.tick`

**What goes wrong:** Building a separate tick counter in the telemetry reducer (e.g.
incrementing once per substep call) duplicates a field core already exposes and resets:
`world.tick` is incremented once per `stepRun` call (`src/core/stepRun.ts` DOCKED branch,
`src/core/step.ts` PLAYING branch) and reset to `0` on every `resetWorld` (i.e. every retry —
D-01: every retry is a new run). Reading `world.tick` at run end is both simpler and
guaranteed consistent with the hashed replay state.
**Why it happens:** The roadmap phrase "derived from the existing event ring" makes it easy
to assume *every* counter must come from ring events specifically, but `ticks played` and
`outcome` are properly read from `World`/`SimPhase` state directly — only the
verb-counters (bricks broken, power-ups caught, etc.) are actually ring-sourced.
**How to avoid:** Read `world.tick` directly at the run-boundary snapshot; do not add a
parallel counter.
**Warning signs:** Telemetry `ticksPlayed` disagreeing with `world.tick` in a golden-replay
test — a sure sign of a duplicated, drifting counter.

### Pitfall 3: Computing "lives lost" from `3 − livesRemaining` instead of counting `LIFE_LOST` events

**What goes wrong:** `world.lives` can go *up* mid-run via the extra-life pickup
(`src/core/rules/pickups.ts`, capped at `MAX_LIVES = 5`), so `startingLives − endingLives`
undercounts true lives lost whenever an extra life was caught after a loss.
**Why it happens:** It looks like simple arithmetic on two known endpoints, but the
mid-run trajectory (loss → catch → loss again) is invisible from the endpoints alone.
**How to avoid:** Count `EventCode.LIFE_LOST` events emitted across the run (each one is a
real, one-time life loss, pushed exactly once per `applyLivesFromBallCount` call in
`src/core/rules/lives.ts`) rather than diffing start/end life totals.
**Warning signs:** A player who visibly caught an extra-life pickup and still lost twice
shows `livesLost: 1` instead of `2`.

### Pitfall 4: Invalidating the whole v4 blob when only the `telemetry` sub-object is corrupt

**What goes wrong:** SC-4 requires "corrupt **or partial** v4 data" to degrade to defaults —
if the parse function treats any malformed field anywhere in the blob as a reason to return
the *entire* default blob (losing valid `unlocked`/`bestByLevel`/`bestScore` in the
process), a telemetry-only corruption (e.g. a negative number in `lifetime.bricksBroken`
from a future bug) would wrongly wipe the player's progress too.
**Why it happens:** The existing v3 parser (`sanitizeProgressV3`) is already
field-tolerant *within* `bestByLevel` (drops individually-invalid entries) but the v3→v4
extension must extend that same tolerance to the new `telemetry` sub-object independently,
not treat it as an all-or-nothing addition.
**How to avoid:** Validate `unlocked`/`bestByLevel`/`bestScore`/`updatedAt` exactly as v3
does today (reuse `sanitizeProgressV3`'s logic), and validate/default the `telemetry`
sub-object *independently* — a broken `telemetry` object defaults to
`defaultTelemetryBlob()` without touching the sibling progress fields.
**Warning signs:** A migration test that corrupts only `telemetry` and asserts
`unlocked`/`bestByLevel` are lost too (the wrong behavior) instead of preserved.

### Pitfall 5: Forgetting the Android hardware-back path when detecting "abandon"

**What goes wrong:** Adding abandon-detection only to the Pause screen's visible "Menu"
button misses the case where a player backgrounds out via the Android hardware back key
mid-run.
**Why it happens:** `PlayingHost.tsx`'s `BackHandler` effect already special-cases
`uiPhase === 'paused'` / `result != null` to call `onMenu()` directly — a second, easy-to-miss
call site for the exact same transition.
**How to avoid:** Wrap the single `onMenu` prop reference once (not each call site) so both
paths funnel through the same abandon-check.
**Warning signs:** Manual QA shows abandoned-run telemetry recorded when tapping "Menu" but
not when abandoning via hardware back (or vice versa).

## Code Examples

### Reading `world.combo` as a running max (best combo)
```typescript
// New file: src/runtime/runStats.ts — pattern mirrors consumeEventsForVfx (src/vfx/consumeEvents.ts)
'worklet';
if (world.combo > stats.bestCombo) {
  stats.bestCombo = world.combo;
}
```

### Counting LIFE_LOST events for "lives lost" (event-sourced, not endpoint-diffed)
```typescript
// Ring-walk idiom identical to applyScoringFromEvents (src/core/rules/scoring.ts)
// and consumeEventsForVfx (src/vfx/consumeEvents.ts) — same start/idx computation.
if (code === EventCode.LIFE_LOST) {
  stats.livesLost += 1;
  stats.rallyCurrent = 0; // longest-rally resets on life loss (D-10)
}
if (code === EventCode.PADDLE_HIT) {
  stats.rallyCurrent += 1;
  if (stats.rallyCurrent > stats.longestRally) {
    stats.longestRally = stats.rallyCurrent;
  }
}
```

### Synchronous cross-thread SharedValue read at run end (proven pattern already in this file)
```typescript
// Source: app/_components/PlayingHost.tsx — chromeSv / compiledSv already read this way;
// runStatsSv.value follows the identical mechanism, no runOnJS required to READ it
// (only needed to trigger a JS-thread callback, which chromeSeq already provides).
const applyChrome = useCallback((mirror: ChromeMirror) => {
  // ... existing WON/LOST branch ...
  if (mirror.phase === SIM.WON || mirror.phase === SIM.LOST) {
    const stats = cloneRunStats(runStatsSv.value); // synchronous, cross-thread
    handleRunEnded(mirror.score, outcome, mirror.lives, stats, Date.now() - runStartedAtRef.current);
  }
}, [/* ... */]);
```

### v3 → v4 pure migration link (mirrors the existing v2 → v3 link exactly)
```typescript
// Source: src/services/storage/migrateProgress.ts — v2ToV3 is the model for v3ToV4
function v3ToV4(v3: ProgressBlob): ProgressBlobV4 {
  return {
    v: 4,
    unlocked: [...v3.unlocked],
    bestByLevel: { ...v3.bestByLevel }, // shallow copy is safe — LevelBest entries are cloned by store layer
    bestScore: v3.bestScore,
    updatedAt: v3.updatedAt,
    telemetry: defaultTelemetryBlob(), // no telemetry existed before v4 — lossless for v3 fields, empty for new ones
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad-hoc balance measurement via a headless bot (`tests/helpers/balanceBot.ts`) driving `stepRun` directly, because nothing in the app recorded real runs | Real runs contribute deterministic counters via the event-ring reducer this phase adds | This phase (v1.2 Phase 9) | Future balance passes (and Phase 13 achievements, Phase 14 stats screen) read real player data instead of needing another throwaway bot |
| `ProgressBlob` v3: unlock + per-level best/stars only | `ProgressBlob` v4: adds lifetime + per-`(mode, levelId)` telemetry aggregates + a bounded recent-run log | This phase | Statistics/achievements (Phases 13–14) have a substrate; v3-only consumers are unaffected since v3 fields are preserved verbatim |

**Deprecated/outdated:** None — this is a purely additive schema version; no prior pattern
in this codebase is being replaced, only extended.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Abandoned-run score should merge into `bestByLevel`/`bestScore` the same way win/lose already do today (only `unlockAfterClear`/`computeStars` stay win-gated) | Architecture Patterns / Pattern 3, Code Examples | If wrong, an abandoned run with a genuinely high score would not watermark a personal best until a later completed run reaches the same score — low severity, but changes observable Results-screen behavior; CONTEXT did not explicitly lock this, only that counters (not score-watermarking specifically) accumulate regardless of outcome |
| A2 | A run abandoned while still `DOCKED` (ball never served, `ticks === 0`) should still be recorded as one `abandoned` run rather than silently dropped | Common Pitfalls / architecture notes | If wrong, "attempts" honesty (the D-01 rationale) is diluted by not counting true bounce-immediately quits; if the planner instead wants a `ticks > 0` gate, that is a one-line guard on the same call site, not an architecture change |
| A3 | 50 is a defensible round-number bound for `recentRuns` (see arithmetic below) | Architecture Patterns / Recommended Project Structure | If the real per-entry byte cost is materially larger than estimated (e.g. because `levelId`/`mode` end up encoded less compactly than assumed), the blob could grow past the comfortable margin under the ~2MB Android CursorWindow read ceiling — still enormous headroom at 50 entries (~5.8KB estimated vs. ~2MB ceiling), so this is a low-risk assumption |
| A4 | `PersonalBestBlob` v1 stays a separate migrate-input source (not folded into `ProgressBlob`) | User Constraints (Claude's Discretion) | Folding it in would touch a working, already-tested legacy migration path for no functional gain this phase; if wrong, it only means slightly more code in the v1 fallback link than a fully-unified schema would need |
| A5 | AsyncStorage's practical single-value read ceiling is ~2MB on Android (CursorWindow), default DB budget 6MB (configurable via `gradle.properties`) | Standard Stack / Environment considerations | Sourced from community GitHub discussions/issues, not official docs — if the real number differs materially, it still leaves orders-of-magnitude headroom over this phase's actual blob size (single-digit KB), so no plan decision depends on the exact figure |

**If this table is empty:** N/A — see rows above.

## Open Questions

1. **Should the `telemetry` sub-object live nested under `progress.telemetry`, or should
   `mode`/`levelId` be a flat template-literal composite key (`` `${mode}:${levelId}` ``)
   instead of `byMode.campaign[levelId]`?**
   - What we know: CONTEXT locks the `(mode, levelId)` key shape and that only `campaign`
     is written this phase; both encodings satisfy that.
   - What's unclear: which is more ergonomic for Phase 11/12 when `endless`/`daily` start
     writing (endless likely has no natural "levelId" — a wave number or seed might stand
     in instead).
   - Recommendation: nested `byMode: Record<ModeId, Partial<Record<string, RunStatsAggregate>>>`
     (string key, not strictly `LevelId`, so endless/daily can key by wave-bucket or date
     string later without a schema change) — flagged as Claude's discretion per CONTEXT, not
     re-litigating a locked decision.

2. **Does an abandoned run recorded while `DOCKED` (zero ticks) pollute `runsAbandoned`
   lifetime counts in a way that skews future achievement/statistics design (Phase 13/14)?**
   - What we know: D-02's rationale is specifically about *mid-run* exits losing visible
     progress; it does not explicitly address the zero-tick case.
   - What's unclear: whether Phase 13 (achievements) or Phase 14 (stats screen) would want
     to distinguish "quit before serving" from "quit mid-rally."
   - Recommendation: record it (A2 above) since it costs nothing extra and is strictly more
     information; if Phase 13/14 research finds it noisy, filtering `ticks === 0` entries at
     *read* time is non-breaking and requires no Phase 9 schema change.

## Environment Availability

No new external dependencies. AsyncStorage native module is already linked (D-06 pinned
exact `2.2.0`); the existing soft-fail-to-memory-store path (`asyncStorageStore.ts`
`hasAsyncStorageNative()` probe) already covers the "native module missing" case identically
for the larger v4 blob — no new fallback logic needed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@react-native-async-storage/async-storage` | Persisting `ProgressBlob` v4 | ✓ (pinned) | 2.2.0 `[VERIFIED: codebase grep, package.json]` | Existing memory-store soft-fail (unchanged) |
| `react-native-reanimated` (`SharedValue`, `useFrameCallback`) | `runStatsSv` accumulator | ✓ | already installed `[VERIFIED: codebase grep]` | none needed — already load-bearing for the whole game loop |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none beyond the pre-existing AsyncStorage soft-fail.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (`vitest.config.ts`, `environment: 'node'`) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/storage.progress-v4.test.ts` (new file) |
| Full suite command | `npm test` (runs `vitest run` + the repo's assert scripts: worklet-closures, level-solvability, eas-profiles, brand-name) |

The existing `tests/helpers/balanceBot.ts` proves the pattern for testing this phase's
hardest claim (SC-1: "deterministic counters... derived from the existing event ring, not
from ad-hoc call sites"): it drives `stepRun` headlessly in Node with explicit seeds, no RN/
Skia required. The same harness shape (call `stepRun` directly in a Vitest test, feed it a
known level fixture, deterministic seeds) is the right tool to assert exact telemetry
counter values against a known sequence of events — this is a **Node-runnable determinism
test**, not a device/RN test.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| N-STAT-01 | Bricks broken / best combo / power-ups caught / lives lost / ticks played / outcome are deterministic and event-ring-derived | unit (headless `stepRun` harness) | `npx vitest run tests/telemetry.reduce-run-events.test.ts` | ❌ Wave 0 |
| N-STAT-01 | Per-power-up-type counts, largest cascade, longest rally, wall-clock ms are correctly attributed | unit | `npx vitest run tests/telemetry.reduce-run-events.test.ts` | ❌ Wave 0 |
| N-STAT-01 (SC-2) | Lifetime + per-`(mode, levelId)` aggregates survive an app kill (simulated by re-instantiating the store from a persisted string) | unit | `npx vitest run tests/storage.progress-v4.test.ts` | ❌ Wave 0 |
| N-STAT-02 (SC-3) | A v3 fixture round-trips through migration to v4 losing no score/star/unlock | unit (golden fixture) | `npx vitest run tests/storage.progress-v4.test.ts -t "v3 fixture round-trips"` | ❌ Wave 0 |
| N-STAT-02 (SC-4) | Corrupt/partial v4 (including telemetry-only corruption) degrades to defaults without throwing | unit | `npx vitest run tests/storage.progress-v4.test.ts -t "corrupt"` | ❌ Wave 0 |
| Roadmap SC-5 | `hashWorld` / golden-replay hash is byte-identical before and after this phase's changes | unit (existing golden-replay suite) | `npx vitest run tests/core.golden-replay.test.ts` (or equivalent existing hash test — verify exact filename in Wave 0) | check existing file |
| Roadmap SC-5 | `src/core/**` has zero new imports from `runtime/services` and no new fields feeding `hashWorld` | static / lint | `npx eslint src/core` + manual diff review of `src/core/hash.ts` | existing tooling, no new file |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/telemetry.reduce-run-events.test.ts tests/storage.progress-v4.test.ts`
- **Per wave merge:** `npm test` (full suite incl. assert scripts)
- **Phase gate:** Full suite green before `/gsd:verify-work`, plus a manual diff check that
  `src/core/**` has no changed lines (grep the plan's file list for `src/core/` — should be
  empty; this is the cheapest possible SC-5 verification and should be a phase-gate check,
  not just a test).

### Wave 0 Gaps
- [ ] `tests/telemetry.reduce-run-events.test.ts` — covers N-STAT-01 (all counters, including
      the cascade-attribution algorithm chosen)
- [ ] `tests/storage.progress-v4.test.ts` — covers N-STAT-02 (migration losslessness,
      fail-soft partial-corruption, lifetime/per-level aggregation, ring-buffer bound)
- [ ] A v3 fixture blob (JSON literal or builder function) representing a realistic
      "existing player" — some unlocked levels, some starred bests, `bestScore > 0` — for the
      round-trip test
- [ ] Confirm the exact existing golden-replay/hash test filename (grep
      `tests/*golden*` / `tests/*hash*` / `src/core/*.test.ts` in Wave 0 — this research did
      not locate and open that specific file, only confirmed `hashWorld` exists in
      `src/core/hash.ts` and mixes `world.tick`)

## Security Domain

`security_enforcement` is absent from `.planning/config.json` → treated as enabled. This
phase is offline, local-only, single-process storage — most ASVS categories do not apply
(no network, no auth, no session).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — no accounts |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A — single local user, single local blob |
| V5 Input Validation | yes | Already-established fail-soft parse contract (`parseBlob.ts`); this phase extends it to `telemetry`, must not regress it (Pitfall 4) |
| V6 Cryptography | no | AsyncStorage is unencrypted by design here (matches existing `PersonalBestBlob`/`ProgressBlob` — no PII, no secrets stored) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampered/malformed local JSON (rooted device, manual edit, or a future bug writing malformed telemetry) crashing the app on next launch | Tampering / DoS | Fail-soft parse (`status: 'ok'\|'absent'\|'corrupt'`) already in place for v1–v3; extend the identical contract to v4, independently per sub-object (Pitfall 4) |
| Unbounded blob growth (a bug that never trims `recentRuns`) degrading read/write latency or hitting the Android CursorWindow ceiling | DoS (resource exhaustion) | Ring buffer bound enforced **on write**, not just on read — the store layer must truncate before `JSON.stringify`, not rely on the reader to ignore excess entries |

## Sources

### Primary (HIGH confidence — verified by reading the actual source in this repo)
- `src/core/types.ts` — `EventCode`, `BrickFlags`, `PickupType`, full `World` shape
- `src/core/events/ring.ts` — ring push/clear semantics, `evCap` overflow policy
- `src/core/stepRun.ts` — per-phase rule order; `clearEvents` placement (ring lifetime = one substep)
- `src/core/rules/brickDamage.ts` — explosive cascade recursion order, `brickFlags` not cleared on break
- `src/core/rules/lives.ts`, `pickups.ts`, `win.ts`, `scoring.ts` — event-sourcing semantics for lives/pickups/win/score
- `src/core/reset.ts` — `world.tick = 0` on every retry (D-01 alignment)
- `src/core/step.ts` — `MAX_BALLS` (8) collision resolution loop per substep
- `src/core/constants.ts`, `src/runtime/constants.ts` — `FIXED_DT = 1/120`, `MAX_SUBSTEPS = 5`
- `src/runtime/useGameLoop.ts` — full per-frame/per-substep loop, existing `vfxSv`/`audioBatchSv`/`flashSv` SharedValue pattern, chrome mirror publish, `playBatchFn` LC-07 hop
- `src/runtime/eventBridge.ts` — the sole `scheduleOnRN` site (LC-07 exception)
- `src/runtime/publishChromeMirror.ts` — cross-thread mirror + dirty-bit pattern
- `src/vfx/consumeEvents.ts` — the canonical read-only ring-consumer pattern to mirror
- `app/_components/PlayingHost.tsx` — `handleRunEnded`, `applyChrome`/`chromeSeq` reaction, `onMenu` wiring, `BackHandler` abandon path, `runEndedRef`
- `app/_components/GameHost.tsx` — shell phase ownership, `onMenu` → `setShellPhase('title')`
- `src/services/storage/types.ts`, `parseBlob.ts`, `migrateProgress.ts`, `memoryStore.ts`, `asyncStorageStore.ts`, `stars.ts`, `watermark.ts`, `catalog.ts` — full existing versioned-blob contract
- `docs/layer-contract.md`, `eslint.config.js` — LC-01…LC-14 enforcement, confirms `runtime → vfx/core` allowed, `core` cannot import `services`/RN/Reanimated, `Date.now()`/`performance.now()`/`Math.random()` banned in `src/core/**` only
- `docs/ops/PROGRESS-STORAGE.md`, `docs/ops/EXPLOSIVE-BRICKS.md` — existing ops documentation of the migration contract and cascade behavior
- `tests/storage.progress-v3.test.ts`, `tests/storage.progress-v2.test.ts` — existing test conventions for this exact kind of migration work
- `tests/helpers/balanceBot.ts` — proof of the headless `stepRun`-driven Node test pattern
- `package.json`, `vitest.config.ts`, `scripts/assert-worklet-closures.mjs` — pinned versions, test runner config, worklet-purity CI guard
- `.planning/config.json` — `nyquist_validation: true`, no `security_enforcement` key (→ enabled)

### Secondary (MEDIUM confidence — WebSearch/WebFetch, cross-referenced)
- `docs.expo.dev/versions/v57.0.0/sdk/async-storage/` `[CITED]` — confirms no SDK-57-specific size-limit or API changes for AsyncStorage
- `github.com/react-native-async-storage/async-storage/discussions/640` and related issues `[CITED: GitHub, community, not official docs]` — ~2MB Android CursorWindow practical read ceiling, 6MB default total DB budget (configurable)

### Tertiary (LOW confidence)
- None — every claim above was either verified directly against this repo's source or
  cited to an external source; nothing in this research rests on unverified training
  knowledge alone. Package-name provenance is not applicable (no new packages).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing pins verified directly in `package.json`
- Architecture: HIGH — every recommended pattern (SharedValue accumulator, ring-walk reducer,
  migration chain link) is a direct mirror of existing, working code in this repo
- Pitfalls: MEDIUM-HIGH — the four data-derivation pitfalls (cascade, ticks, lives-lost,
  fail-soft granularity) are verified against actual core source; the cascade-attribution
  edge case specifically is MEDIUM confidence because it depends on a same-substep
  simultaneous-collision scenario that was reasoned about from code, not empirically
  reproduced in this research session

**Research date:** 2026-09-25
**Valid until:** No expiry driver — this phase touches no external API surface that changes
independently of this codebase; re-research only if `src/core/events/ring.ts`,
`src/runtime/useGameLoop.ts`, or the storage migration chain change materially before
planning executes.
