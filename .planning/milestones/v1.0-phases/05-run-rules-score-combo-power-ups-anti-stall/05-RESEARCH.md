# Phase 5: Run Rules — Score, Combo, Power-ups, Anti-Stall - Research

**Researched:** 2026-09-20
**Domain:** Headless arcade run rules (scoring/combo, pickup catch, multi-ball life, paddle-expand effects, deterministic anti-stall) on the existing Expo/Skia/worklet `core/` World
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Score & combo (RUN-01)
- **D-01:** Award points on **every brick hit**, with a **larger bonus on BREAK**; apply the **current combo multiplier** to both.
- **D-02:** Combo **+1** per consecutive brick hit; **reset when any ball contacts the paddle**. Scoring remains **deterministic** under multi-ball (including simultaneous hits).
- **D-03:** Phase 5 shows minimal chrome: **`Score · N`** and a **small combo indicator** via SharedValue mirrors (same pattern as Lives). HUD polish deferred to Phase 6.
- **D-04:** Scoring constants live as **configurable `core/` constants** with unit tests for multi-HP hits, destroy bonuses, combo increment, paddle reset, and simultaneous multi-ball hits.

#### Drop rules (PWR-01 / PWR-02)
- **D-05:** Roll **gameplay RNG only on breakable BREAK** — no pickups on intermediate hits.
- **D-06:** Pickup types this phase: **multi-ball** and **paddle-expand** only.
- **D-07:** Multi-ball catch spawns **+2 balls**, respecting `maxBalls`; **do not** replace existing balls or reset their trajectories.
- **D-08:** Paddle-expand: width **×1.5 for 10 seconds**; collecting another expand **refreshes duration** without stacking width; **clamp** expanded paddle within playfield.
- **D-09:** Default drop chance **20%** (configurable in the **15–25%** band). Pickup generation uses the **gameplay RNG** stream only. Unit tests: drop generation, ball-cap, effect expire/refresh, replay determinism.

#### Catch & multi-ball life (PWR-01 / PWR-03)
- **D-10:** Catch via **AABB pickup vs paddle** each sim step — **no** magnetic attraction / auto-collect.
- **D-11:** Pickup falling **below the playfield** is removed.
- **D-12:** Deduct **exactly one life** only when **`activeBallCount` reaches 0** after the step. Losing individual balls while others remain must **not** reduce lives.
- **D-13:** On life reset (lives remaining): **clear falling pickups**, **expire expand**, restore normal paddle width, **dock exactly one ball**; **preserve score and destroyed-brick progress**.
- **D-14:** Spawn +2 from the **paddle** with **fixed deterministic angular offsets**; respect `maxBalls`; avoid near-horizontal; preserve existing balls/velocities. Unit tests: catch, miss, multi-ball life-loss, life-reset cleanup, deterministic spawn.

#### Anti-stall (PHYS-07)
- **D-15:** Stall when **no breakable brick receives damage for 8 seconds of active simulation time**. Pause, countdown, and background time **must not** advance the stall timer.
- **D-16:** Deterministic tiers: **visible warning → mild speed increase → controlled angle correction** away from near-horizontal. **No random bounce jitter.** Respect designed **max ball speed** and bounce-angle clamps.
- **D-17:** Minimal chrome: **`Stall!` + current tier**. Advanced animations / neon → Phase 7.
- **D-18:** Reset stall timer + escalation when a **breakable brick is hit or destroyed** (any active ball). Wall/paddle collisions **do not** reset. Stall is tracked at **run level**. Unit tests: thresholds, resets, pause/resume, multi-ball, replay consistency.

### Claude's Discretion
- Exact point values for hit vs BREAK base scores
- Exact combo display formatting
- Exact drop table weights between multi-ball vs expand (within 20% total)
- Exact spawn angle offsets (must stay inside PHYS-04 clamps)
- Exact stall tier magnitude (speed Δ, angle nudge) within max-speed / clamp rules
- Pickup visual (flat Skia shape only — no neon)

### Deferred Ideas (OUT OF SCOPE)
- Polished HUD, menus, local high score — Phase 6 (RUN-04)
- Neon VFX, particles, audio for catch/break — Phase 7
- Additional pickup types (slow, sticky, laser) — backlog
- Magnetic catch — rejected for Phase 5
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RUN-01 | Score with combo for consecutive brick hits without paddle contact | Score/combo rules module; event-driven awards; SharedValue chrome mirrors |
| PWR-01 | Destroyed bricks can drop multi-ball; life lost only when last ball leaves | Pickup pool + DROP on BREAK; rewrite lives gate to live-ball count |
| PWR-02 | Destroyed bricks can drop paddle expand; bounce-angle mapping normalizes to current width | Timed effect with refresh stackPolicy; derive `paddleW`; english already uses half-width |
| PWR-03 | Power-up drops must be caught on the paddle (no auto-collect) | Falling pickup SoA + AABB catch; miss removes below field |
| PHYS-07 | Anti-stall uses visible, deterministic escalation (no random bounce jitter) | Run-level idle timer + tiered speed/angle correction; chrome `Stall!` |
</phase_requirements>

## Summary

Phase 5 fills the reserved `core/` seams (N-ball SoA, empty effects list, dual PRNG, event ring) with run rules that stay pure, worklet-safe, and unit-tested in Node. Scoring and combo are driven from the existing `BRICK_HIT` / `BRICK_BREAK` / `PADDLE_HIT` ring (already one damage event per breakable brick per step via `brickDamagedThisStep`). Pickups are a new fixed-capacity SoA pool — rolls use `rngGameplay` only on breakable BREAK (~20%), fall under gravity, catch via AABB vs paddle, never auto-collect. Multi-ball is an instant catch action (+2 from paddle, fixed angles, cap at `maxBalls`); paddle-expand is the first timed effect (`stackPolicy: refresh`, width ×1.5 for 10s, derive width each step). Anti-stall is a run-level sim-time counter reset only on breakable damage, with three deterministic tiers and minimal chrome — never random bounce jitter.

The single highest-risk integration gap is **ball-pool / life semantics**: today `applyLivesFromEvents` decrements on any `BALL_OUT`, and `stepWorld` clears `ballActive[i]` without maintaining a live `activeBallCount`. Phase 5 must make `activeBallCount` mean “live balls” (swap-with-last or equivalent) and evaluate life loss once per step when that count hits 0 — matching D-12 and Pitfall 5.

**Primary recommendation:** Implement rules as named `core/rules/*` modules orchestrated from `stepRun` (score → pickups → effects → stall → lives), keep all randomness on `rngGameplay`, derive paddle width from base + effects, compact the ball pool on despawn, and mirror score/combo/stallTier with the same SharedValue + `useAnimatedReaction` pattern as Lives.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Score + combo math | Core Simulation | — | Deterministic, headless, must hash/replay in Node |
| Pickup spawn / fall / catch | Core Simulation | Render (draw only) | Gameplay authority; Skia only visualizes SoA |
| Timed paddle-expand effect | Core Simulation | — | Effects list already reserved on World (D-09) |
| Multi-ball spawn / ball pool | Core Simulation | — | N-ball SoA already allocated; life depends on count |
| Life loss / life-reset cleanup | Core Simulation | Runtime chrome | Rules mutate World; Lives/Score mirrors for display |
| Anti-stall timer + tiers | Core Simulation | Runtime chrome | Must freeze with pause (no wall-clock); `Stall!` mirror |
| Score · N / combo / Stall! chrome | Browser / Client (RN UI) | Runtime loop | Discrete SharedValue mirrors — never per-frame React |
| Flat pickup + expanded paddle draw | Render (Skia) | — | Immediate-mode `recordSprites`; no neon (Phase 7) |

## Project Constraints (from .cursor/rules/)

| Directive | Implication for Phase 5 |
|-----------|-------------------------|
| Tech stack locked: RN + TS + Expo + Skia + custom physics + fixed timestep | No new physics engine; extend `core/` only |
| Stable 60 FPS; neon never steals frame time | Flat pickup shapes; no particles/glow this phase |
| Offline MVP | No network; gameplay RNG stays local/seeded |
| No paddle-shrink / no random stall jitter (PROJECT anti-features) | Expand-only; deterministic stall tiers only |
| GSD workflow: plan before ad-hoc edits | Research → PLAN → execute; do not freestyle World shape |
| Expo SDK 57 docs before Expo claims | Chrome uses existing Reanimated SharedValue patterns already in app |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing `src/core/` (pure TS + `'worklet'`) | in-repo | Score, pickups, effects, stall, lives | Layer contract LC-01; Node-testable [VERIFIED: codebase] |
| Dual mulberry32 (`rngGameplay` / `rngCosmetic`) | in-repo | Drop rolls on gameplay stream only | Phase 2 D-13; Pitfall 6 [VERIFIED: `src/core/rng/mulberry32.ts`] |
| Fixed event ring | in-repo | Drive score/combo/drops/life from collision codes | Phase 2 D-08 [VERIFIED: `EventCode` in `types.ts`] |
| `vitest` | `5.0.1` | Unit/property tests for rules | Project pin [VERIFIED: `package.json` / `npm view`] |
| `fast-check` | `4.10.2` | Optional property checks (replay / caps) | Already in repo [VERIFIED: `package.json`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-reanimated` | `4.5.1` | SharedValue chrome mirrors | Score/combo/stallTier out from `useGameLoop` [VERIFIED: `package.json`] |
| `@shopify/react-native-skia` | `2.12.0` | Flat pickup rects in `recordSprites` | Visual only; no neon [VERIFIED: `package.json`] |
| Runtime freeze helpers | in-repo | Ensure stall timer only advances when sim steps | `shouldFreezeForUiPhase` / `setActive(false)` [VERIFIED: `src/runtime/freeze.ts`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Event-driven score from ring | Award inside brick CCD branch | Ring keeps scoring testable without physics fixtures; prefer ring drain in `stepRun` after `stepWorld` |
| Timed effect SoA | Boolean `expandUntilTick` scalar | SoA already reserved; refresh/stackPolicy scales to Phase 7+ pickups [CITED: `.planning/research/PITFALLS.md` Pitfall 12] |
| Compact ball pool (swap-with-last) | Sparse `ballActive` + recount | CONTEXT D-12 names `activeBallCount → 0`; compact matches ARCH Pattern 10 — **use compact** |
| Random bounce jitter for stalls | Deterministic tiers | Explicitly forbidden by PROJECT / PHYS-07 / D-16 |

**Installation:** No new packages. Extend `core/` + thin runtime/render chrome.

**Version verification:** `vitest@5.0.1`, `fast-check@4.10.2`, Expo/RN pins unchanged — confirmed via `package.json` and `npm view` on 2026-09-20.

## Architecture Patterns

### System Architecture Diagram

```
Intent (paddleX, launch)
        │
        ▼
┌──────────────── stepRun (PLAYING) ────────────────┐
│  clearEvents                                      │
│        │                                          │
│        ▼                                          │
│  stepWorld ──CCD──► BRICK_HIT / BRICK_BREAK       │
│                 └──► PADDLE_HIT / BALL_OUT         │
│        │                                          │
│        ▼                                          │
│  applyScoringFromEvents  → score, combo           │
│  applyDropsFromBreaks    → rngGameplay → pickups  │
│  stepPickups             → fall, AABB catch/miss  │
│  stepEffects             → expire; derive paddleW │
│  stepAntiStall           → idle ticks → tiers     │
│  applyLivesFromBallCount → life iff live==0       │
│  applyWinCheck                                        │
└───────────────────────────────────────────────────┘
        │
        ├── World SoA (score, combo, pickups, effects, stall*)
        │
        ▼
useGameLoop mirrors ──► Score · N | ×combo | Stall! · tier
recordSprites ────────► flat pickup rects + current paddleW
```

### Recommended Project Structure

```
src/core/
├── constants.ts              # + SCORE_*, DROP_*, EXPAND_*, STALL_*, MAX_PICKUPS, spawn angles
├── types.ts                  # + score, combo, pickups SoA, stall fields, EffectType, PickupType
├── allocate.ts / reset.ts / hash.ts   # extend for new SoA + scalars
├── step.ts                   # compact ball pool on BALL_OUT (or call helper)
├── stepRun.ts                # orchestrate rules after stepWorld
├── rules/
│   ├── scoring.ts            # NEW — hit/break × combo; paddle reset
│   ├── pickups.ts            # NEW — drop table, fall, catch, miss
│   ├── effects.ts            # NEW — expand apply/refresh/expire; derivePaddleWidth
│   ├── multiball.ts          # NEW — spawn +2 from paddle; fixed angles
│   ├── stall.ts              # NEW — idle timer + tier escalation
│   ├── lives.ts              # REWRITE — last-ball life; life-reset cleanup
│   ├── serve.ts              # dock clears extras; preserve score
│   └── win.ts                # unchanged
└── rng/mulberry32.ts         # gameplay stream for drops only

src/runtime/useGameLoop.ts    # mirror score/combo/stallTier SharedValues
app/_components/GameHost.tsx  # React chrome: Score · N, combo, Stall!
src/render/recordSprites.ts   # draw pickups (flat)
tests/
├── rules.scoring.test.ts     # NEW
├── rules.pickups.test.ts     # NEW
├── rules.effects.test.ts     # NEW
├── rules.multiball.test.ts   # NEW
├── rules.stall.test.ts       # NEW
└── rules.lives.test.ts       # UPDATE — last-ball semantics
```

### Pattern 1: Event-ring rules drain (after physics)

**What:** `stepWorld` only pushes collision events; `stepRun` drains the ring once for scoring, drops, combo reset, then runs pickup/effect/stall/lives.
**When to use:** All Phase 5 gameplay rules.
**Example:**

```typescript
// Source: project pattern — stepRun.ts + events/ring.ts [VERIFIED: codebase]
clearEvents(world);
stepWorld(world, intent, dt);
applyScoringFromEvents(world);      // BRICK_HIT/BREAK → points×combo; PADDLE_HIT → combo=1
applyDropsFromBreaks(world);        // BRICK_BREAK → nextFloat(rngGameplay)
stepPickups(world, dt);             // fall + AABB catch
stepEffects(world);                 // expire by tick; derive paddleW
stepAntiStall(world);               // only when this step ran (PLAYING, not frozen)
applyLivesFromBallCount(world);     // live count === 0 → −1 life
applyWinCheck(world);
```

### Pattern 2: Effects as data + stackPolicy refresh

**What:** Active effects live in `effectType[]` / `effectUntilTick[]`. Expand uses `stackPolicy: refresh` — second catch sets `effectUntilTick = tick + durationTicks` without multiplying width.
**When to use:** Any timed power-up (expand now; more later).
**Example:**

```typescript
// Source: .planning/research/ARCHITECTURE.md + PITFALLS Pitfall 12 [CITED]
const EXPAND_TYPE = 1;
const DURATION_TICKS = Math.round(10 / FIXED_DT); // 10s @ 1/120 → 1200

function applyOrRefreshExpand(world: World): void {
  'worklet';
  for (let i = 0; i < world.effectCount; i++) {
    if (world.effectType[i] === EXPAND_TYPE) {
      world.effectUntilTick[i] = world.tick + DURATION_TICKS;
      return;
    }
  }
  // push new effect slot…
}

function derivePaddleWidth(world: World): void {
  'worklet';
  const base = 72; // PADDLE_WIDTH
  const expanded = hasEffect(world, EXPAND_TYPE);
  world.paddleW = expanded ? base * 1.5 : base;
  // then clamp paddleX so half-width stays in [0, LOGICAL_WIDTH]
}
```

### Pattern 3: Ball pool compact + last-ball life

**What:** On `BALL_OUT`, swap-with-last so indices `[0, activeBallCount)` are dense live balls; life loss only if `activeBallCount === 0` after the step.
**When to use:** Multi-ball (PWR-01 / D-12). **Must replace** current “any BALL_OUT → −life” logic. [VERIFIED: `src/core/rules/lives.ts`]

### Pattern 4: SharedValue chrome mirrors (Lives clone)

**What:** Loop writes `scoreOut` / `comboOut` / `stallTierOut` every frame; `useAnimatedReaction` packs changes and `runOnJS` updates React text (`Score · N`, combo, `Stall! · tier`).
**When to use:** D-03 / D-17 visibility without per-frame React. [VERIFIED: `GameHost.tsx` lives pattern]

### Anti-Patterns to Avoid

- **Award score inside CCD for every ball contact after `brickDamagedThisStep`:** already silent for multi-hit; scoring must use ring events only once per brick per step.
- **Mutate `paddleW` ad hoc on catch and forget expiry:** permanently wide paddle (Pitfall 12).
- **`Math.random()` or cosmetic RNG for drops:** breaks replay (D-09 / D-13).
- **Advance stall on pause/countdown:** violates D-15; stall only increments inside the stepped PLAYING path (runtime already skips `stepRun` when frozen).
- **Random bounce jitter / paddle-shrink:** project anti-features.
- **Auto-collect pickups on proximity:** violates PWR-03 / D-10.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Seeded drops | Ad-hoc `Math.random` | `nextFloat(world.rngGameplay, 0)` | Determinism + dual-stream separation |
| Effect stacking | Scattered booleans | Effects SoA + refresh policy | Pitfall 12; reserved in Phase 2 |
| Paddle english under expand | Separate angle tables | Existing `resolvePaddleEnglish(..., paddleHalfW)` | Already normalizes by current half-width [VERIFIED: `resolve.ts`] |
| Life on each ball-out | Per-event decrement | End-of-step live count === 0 | Pitfall 5 / D-12 |
| Stall break via noise | Random angle jitter | Tiered speed + clamped angle nudge | PHYS-07 / PROJECT |
| Per-frame React score | `setState` in loop | SharedValue mirrors | PHYS-06 / ARCH |

**Key insight:** Phase 5 is mostly **wiring reserved World capacity** and **fixing the one-ball life assumption** — not inventing new libraries.

## Common Pitfalls

### Pitfall 1: `activeBallCount` semantics mismatch
**What goes wrong:** CONTEXT says life when `activeBallCount → 0`, but today the field is a scan high-water mark and is **not** decremented on `BALL_OUT`; lives fire on any `BALL_OUT` event. [VERIFIED: `step.ts`, `lives.ts`, `serve.ts`]
**Why it happens:** Phase 2/3 shipped single-ball; pool compact deferred.
**How to avoid:** Implement swap-with-last (or explicit recount into `activeBallCount`) in the same plan as multi-ball; rewrite `applyLivesFromEvents` → `applyLivesFromBallCount`.
**Warning signs:** Multi-ball catch then one miss ends the life; golden hashes disagree across runs.

### Pitfall 2: Multi-ball score / combo double-count
**What goes wrong:** Two balls hit the same brick; combo or score jumps twice.
**Why it happens:** Forgetting `brickDamagedThisStep` already collapses HP to one event — do not invent a second award path in CCD.
**How to avoid:** Score only from ring `BRICK_HIT`/`BRICK_BREAK`; process events in ring order (ball-index CCD order is deterministic).
**Warning signs:** Simultaneous-hit unit test fails determinism.

### Pitfall 3: Stall timer advances while frozen
**What goes wrong:** Pause/countdown/AppState background burns the 8s stall clock.
**Why it happens:** Using wall-clock or advancing stall outside `stepRun`.
**How to avoid:** Stall idle counter `+= 1` only inside PLAYING `stepRun` after a real `stepWorld` (runtime already skips steps when `uiFrozen`). Unit-test: freeze N wall seconds with no tick advance → stall unchanged.
**Warning signs:** `Stall!` appears immediately after a long pause.

### Pitfall 4: Expand width stacks or english feel changes
**What goes wrong:** Second expand → 2.25× width, or bounce feels “looser” because code uses base half-width.
**Why it happens:** Assigning width instead of deriving; english using constant `PADDLE_WIDTH/2`.
**How to avoid:** Refresh duration only; always `half = world.paddleW * 0.5` (already true in `step.ts` / `resolvePaddleEnglish`). Clamp `paddleX` after width change.
**Warning signs:** Paddle clips walls; aim feels different only while expanded (should feel same *relative* mapping — SC-4).

### Pitfall 5: Drop RNG pollutes cosmetic stream / non-BREAK drops
**What goes wrong:** Particles later reshuffle drops; intermediate HP hits spawn pickups.
**How to avoid:** `rngGameplay` only; roll exclusively on `BRICK_BREAK` for breakable bricks (D-05).
**Warning signs:** Replay hash changes when VFX added in Phase 7.

### Pitfall 6: Life reset wipes score or leaves ghost pickups
**What goes wrong:** Retry-after-life clears score or leaves falling multi-ball / stuck expand.
**How to avoid:** Explicit cleanup checklist (D-13): clear pickups, expire expand, derive width, deactivate all balls, `dockBall` one, keep `score` + brick HP grid.
**Warning signs:** Score resets mid-run; expanded paddle after re-dock.

## Code Examples

### Scoring from events (recommended constants)

```typescript
// Discretion recommendation — configure in constants.ts [ASSUMED values; locked structure]
// SCORE_HIT = 10; SCORE_BREAK_BONUS = 50; combo starts at 1
// points = (SCORE_HIT + (isBreak ? SCORE_BREAK_BONUS : 0)) * combo
// on breakable BRICK_HIT or BRICK_BREAK: combo += 1 after award (or before — pick one; test it)
// Recommendation: award with current combo, then combo += 1 for next hit
// on PADDLE_HIT (any ball): combo = 1
// Unbreakable BRICK_HIT: no score, no combo, no stall reset (D-18)
```

### Drop roll (gameplay RNG only)

```typescript
// Source: mulberry32.ts [VERIFIED]
import { nextFloat } from '../rng/mulberry32';

const DROP_CHANCE = 0.2; // D-09 default; band 0.15–0.25
// On BRICK_BREAK at (evX, evY):
if (nextFloat(world.rngGameplay, 0) < DROP_CHANCE) {
  const which = nextFloat(world.rngGameplay, 0); // second draw — document order for tests
  const type = which < 0.5 ? PICKUP_MULTIBALL : PICKUP_EXPAND; // 50/50 [ASSUMED weights]
  spawnPickup(world, type, evX, evY);
}
```

### Multi-ball spawn angles (discretion)

```typescript
// Spawn from paddle center, speed = SERVE_SPEED or current design speed
// Fixed offsets from vertical (y-down → up is −vy), inside ±62° clamp:
// ±18° and ±36° for two new balls [ASSUMED — within PHYS-04]
// Skip slots if activeBallCount + needed > maxBalls (spawn as many as fit, never kill existing)
```

### Anti-stall tiers (discretion)

```typescript
// STALL_IDLE_TICKS = 8 / FIXED_DT = 960
// Tier 1 @ 960 ticks: stallTier = 1 (chrome only)
// Tier 2 @ 960 + 2s: multiply all live ball speeds by 1.08, clamp to MAX_BALL_SPEED
// Tier 3 @ 960 + 4s: rotate each ball's velocity ±Δ toward steeper angle
//   (deterministic sign from ball index), keep |vy|/speed ≥ MIN_VERTICAL_RATIO
// Reset idle+tier on breakable damage event; walls/paddle do not reset [D-18]
```

### AABB pickup catch

```typescript
// Each step: pickup center/rect vs paddle AABB; on overlap → apply type, deactivate pickup
// vy_pickup = PICKUP_FALL_SPEED (constant); remove if y > LOGICAL_HEIGHT [D-10, D-11]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Life on every ball lost | Life when last ball leaves | Genre + this project's Pitfall 5 | Required for multi-ball fairness |
| Random bounce jitter | Visible deterministic stall tiers | PROJECT anti-feature | Keeps physics-toy trust (PHYS-07) |
| Ad-hoc power-up booleans | Effects list + stackPolicy | Research ARCH / Pitfall 12 | Prevents state explosion |
| SUMMARY “Phase 6 = run rules” | ROADMAP Phase 5 | Roadmap renumber | Use ROADMAP/CONTEXT numbering |

**Deprecated/outdated:**
- `applyLivesFromEvents` BALL_OUT → −life: must be replaced for PWR-01/D-12.
- Treating `activeBallCount` as immutable “slots used” without compact: insufficient for D-12.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `SCORE_HIT=10`, `SCORE_BREAK_BONUS=50`, combo applies then increments | Code Examples / Discretion | Feel/numbers only — structure unchanged |
| A2 | Drop type weights 50/50 within 20% chance | Drop roll | Balance only; keep configurable constants |
| A3 | Multi-ball spawn angles ±18° / ±36° from vertical | Multiball | Must stay ≤62° clamp; retune if feel off |
| A4 | Stall tier schedule: warn@8s, +8% speed@10s, angle nudge@12s | Anti-stall | Magnitudes discretionary; thresholds locked at 8s start |
| A5 | Combo increments on breakable damage events only (not unbreakable) | Scoring | Aligns with D-18 stall; confirm if user wanted unbreakable to count |
| A6 | Pickup fall uses constant vy (no accel) and fixed AABB size | Pickups | Simpler tests; change only if catch feel weak |

**If empty:** N/A — table above lists discretionary numeric assumptions.

## Open Questions (RESOLVED)

1. **Combo increment timing relative to award** — RESOLVED
   - Locked choice: **award-then-increment** — award with current combo (starts at 1), then `combo += 1`. First hit scores ×1; second ×2.
   - Plans: `05-02` scoring module + unit tests; RESEARCH Q1 lock cited in plan interfaces.

2. **Partial multi-ball spawn at cap** — RESOLVED
   - Locked choice: **spawn `min(2, freeSlots)`** — if 7/8 balls, catch still consumes pickup and spawns 1; if 0 free slots, spawn nothing.
   - Plans: `05-03` multiball module (D-07/D-14).

3. **Whether `hashWorld` must include score/combo/stall/pickups** — RESOLVED
   - Locked choice: **extend `hashWorld`** for score, combo, stall fields, and pickup SoA so drop/stall/replay tests can assert equality.
   - Plans: `05-01` World/hash extension; `05-05` determinism asserts.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Vitest core tests | ✓ | v25.6.0 | — |
| `vitest` | Unit tests | ✓ | 5.0.1 | — |
| `fast-check` | Optional props | ✓ | 4.10.2 | Example tests only |
| Expo / device | Chrome smoke | ✓ (existing app) | SDK 57 | Simulator OK for chrome; no new native deps |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

Step 2.6: External tools limited to Node test runner — available.

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.1 (+ fast-check 4.10.2 where useful) |
| Config file | `vitest.config.ts` (`environment: 'node'`, includes `src/core/**/*.test.ts`, `tests/**/*.test.ts`) |
| Quick run command | `npx vitest run tests/rules.scoring.test.ts tests/rules.pickups.test.ts tests/rules.lives.test.ts` |
| Full suite command | `npm test` / `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RUN-01 | Hit + BREAK × combo; paddle resets combo; multi-ball simultaneous deterministic | unit | `npx vitest run tests/rules.scoring.test.ts` | ❌ Wave 0 |
| PWR-01 | BREAK → ~20% drop; multi-ball +2 / cap; last-ball life only | unit | `npx vitest run tests/rules.pickups.test.ts tests/rules.multiball.test.ts tests/rules.lives.test.ts` | ❌ / ⚠️ lives exists but wrong semantics |
| PWR-02 | Expand 1.5× / 10s refresh; english uses current width; clamp in field | unit | `npx vitest run tests/rules.effects.test.ts tests/physics.paddle.test.ts` | ❌ Wave 0 (+ existing paddle tests) |
| PWR-03 | AABB catch only; miss below field removes; no auto-collect | unit | `npx vitest run tests/rules.pickups.test.ts` | ❌ Wave 0 |
| PHYS-07 | 8s idle → tiers; pause freeze; breakable reset; no RNG jitter; multi-ball | unit | `npx vitest run tests/rules.stall.test.ts` | ❌ Wave 0 |
| Cross | Same seed + intents → identical `hashWorld` with drops/stall | unit | `npx vitest run tests/physics.golden-replay.test.ts` (extend) | ✅ extend |
| Cross | `core/` purity (no Math.random / RN imports) | unit | `npx vitest run tests/core.purity.test.ts` | ✅ |

### Sampling Rate

- **Per task commit:** targeted `vitest run` for touched `tests/rules.*.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/rules.scoring.test.ts` — RUN-01 (hit/break/combo/paddle reset/simultaneous)
- [ ] `tests/rules.pickups.test.ts` — PWR-01/03 drop chance, catch, miss, RNG stream
- [ ] `tests/rules.effects.test.ts` — PWR-02 expand refresh/expire/derive width/clamp
- [ ] `tests/rules.multiball.test.ts` — +2 spawn, maxBalls, preserve velocities, angles in clamp
- [ ] `tests/rules.stall.test.ts` — PHYS-07 thresholds, reset, freeze, multi-ball, determinism
- [ ] Update `tests/rules.lives.test.ts` — last-ball only; life-reset cleanup preserves score/bricks
- [ ] Extend `hashWorld` + golden replay expectations for new fields
- [ ] Optional: `it.todo` stubs in Wave 0 if TDD-style plans land before implementation

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Offline game; no accounts (MVP) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Finite guards on intent/dt (existing); clamp paddle after expand; reject non-finite spawn speeds |
| V6 Cryptography | no | Seeded PRNG for gameplay fairness, not security |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Non-deterministic “cheat” via host RNG | Tampering / Spoofing | Ban `Math.random` in `core/`; gameplay stream only for drops |
| Stall bypass via pause abuse | Elevation (soft) | Stall tied to sim ticks, not wall clock |
| State corruption from NaN velocities after stall nudge | Denial of service (soft softlock) | Finite checks + speed clamp + MIN_VERTICAL_RATIO |
| Event ring overflow dropping BREAK during multi-ball chaos | Tampering (lost score/drop) | Keep ring cap 128; assert `evOverflow` in soak tests; consider scoring before overflow-prone bursts |

## Sources

### Primary (HIGH confidence)

- `.planning/milestones/v1.0-phases/05-run-rules-score-combo-power-ups-anti-stall/05-CONTEXT.md` — locked D-01…D-18
- `.planning/REQUIREMENTS.md` — RUN-01, PWR-01…03, PHYS-07
- `.planning/ROADMAP.md` — Phase 5 success criteria 1–5
- `.planning/research/ARCHITECTURE.md` — rules module map, effects list, SharedValue HUD, ball pools
- `.planning/research/PITFALLS.md` — Pitfalls 5 (multi-ball), 6 (RNG), 12 (power-ups), anti-jitter
- `.planning/research/FEATURES.md` — score/combo, catch-on-paddle, anti-stall as table stakes
- `docs/layer-contract.md` — core purity LC-01…LC-11
- Codebase: `src/core/step.ts`, `stepRun.ts`, `rules/lives.ts`, `physics/resolve.ts`, `rng/mulberry32.ts`, `allocate.ts`, `hash.ts`, `app/_components/GameHost.tsx`, `src/runtime/useGameLoop.ts`, `src/runtime/freeze.ts`
- `package.json` / `npm view vitest` — test stack versions (2026-09-20)

### Secondary (MEDIUM confidence)

- `.planning/research/SUMMARY.md` — run-rules deliverable (note: older “Phase 6” label; ROADMAP Phase 5 wins)
- Genre anti-stall practice: visible escalation over silent jitter [CITED: FEATURES.md / PROJECT anti-features; web search did not yield a single canonical numeric schedule]

### Tertiary (LOW confidence)

- Exact arcade point values / stall Δ magnitudes — discretionary; flagged in Assumptions Log

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — no new libs; verified in-repo pins
- Architecture: **HIGH** — reserved World seams + CONTEXT decisions map cleanly; one critical lives/pool gap documented
- Pitfalls: **HIGH** — from project PITFALLS + verified current lives/BALL_OUT bug

**Research date:** 2026-09-20
**Valid until:** 2026-10-20 (stable domain; re-check only if World shape changes in parallel Phase work)
