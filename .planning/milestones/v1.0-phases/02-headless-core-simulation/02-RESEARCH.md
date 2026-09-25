# Phase 2: Headless Core Simulation - Research

**Researched:** 2026-09-20
**Domain:** Deterministic 2D arcade physics (swept circle-vs-AABB, fixed timestep, seeded PRNG) in pure TypeScript for Node Vitest + UI-thread worklets
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
#### Paddle bounce / english
- **D-01:** Classic Breakout paddle bounce — impact position along paddle width maps strongly to outgoing angle (skill expression).
- **D-02:** Preserve speed on paddle bounce (no energy loss that softens aim); clamp outgoing angle with **configurable** constants (research default band ~±60–65° / min vertical component — exact numbers are planner/researcher discretion within that classic feel).
- **D-03:** Degenerate near-horizontal and near-vertical trajectories must be prevented by clamps; verified by tests at clamp edges (PHYS-04).

#### Speed envelope & tunneling
- **D-04:** Define an explicit **maximum designed ball speed** constant in `core/` (logical units / second).
- **D-05:** Swept collision must be validated by a property test that fires balls at **2×** that designed max through a dense brick grid with zero tunneling and zero missed collisions against paddle, walls, and bricks (PHYS-02 / PHYS-03).
- **D-06:** Fixed timestep (continue Phase 1 / research direction of `FIXED_DT = 1/120` unless tunneling tests force a documented change); frame clamp + max-substep cap; never integrate leftover accumulator as a partial step; no React state writes during simulation (PHYS-06).

#### World shape (multi-ball ready)
- **D-07:** Reserve **N-ball capacity** in SoA from the start (fixed pool, active count); Phase 2 activates **exactly one** ball.
- **D-08:** Ship a fixed-capacity **event ring** in `core/` for collision / brick-hit / bounce records (consumers in later phases); simulation does not call services directly.
- **D-09:** Reserve a slot/list in world state for future power-up effects (empty / unused in Phase 2) so Phase 5 does not reshape the hot path.

#### Brick / collision API
- **D-10:** Collision hit results and brick metadata support **multi-HP** and **unbreakable** (structural) bricks — reflect without HP loss; never count toward win condition (win logic may stub/defer).
- **D-11:** Defer full level format, authoring, validation, and migrations to **Phase 4**; Phase 2 uses inline/test-constructed grids that exercise the same brick fields the future runtime level will fill.
- **D-12:** Broadphase: treat the brick **grid as the acceleration structure** (no quadtree); swept circle-vs-AABB with explicit corner handling and iteration cap (research).

#### Determinism & purity (locked with user priority)
- **D-13:** Two seeded PRNG streams (gameplay vs cosmetic); simulation never uses `Math.random()` or wall-clock reads — fail the build / tests if present under `src/core/`.
- **D-14:** Golden-replay: same seed + recorded intents chunked differently must yield identical end-state hash.
- **D-15:** Keep Phase 1 layer contract: `core/` imports nothing from React, Skia, Reanimated, or platform APIs; `'worklet'`-safe pure TS.

### Claude's Discretion
- Exact numeric values for paddle clamp degrees, designed max speed, ball radius, paddle size, `FIXED_DT` confirmation vs 1/120, N-ball capacity (e.g. 5–8), event ring size, and SoA field layout — must satisfy D-01…D-15 and PHYS-* success criteria
- Whether spike `SpikeWorld` is evolved in place or replaced by a new `World` type with a thin migration of the harness later
- Hash algorithm for golden-replay (must be stable across Node runs)

### Deferred Ideas (OUT OF SCOPE)
- Relative-drag paddle input, serve/aim launch, lives, win/lose screens — Phase 3
- Level format, validation, migrations, authored layouts — Phase 4
- Score, combo, multi-ball activation, paddle-expand, anti-stall rules — Phase 5
- HUD event mirrors, pause UI — Phase 6
- Neon VFX consuming the event ring — Phase 7
- Hardware 60 FPS re-cert (Pixel 6a / physical iOS) — MVP debt from Phase 1 waiver (D-04/D-05)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHYS-02 | Ball collides with paddle, walls, and bricks using swept, deterministic collision with no tunneling at designed max speed | Pattern: Minkowski-expanded ray-vs-AABB TOI loop; constants `MAX_BALL_SPEED` + 2× property suite; hard bounds backstop |
| PHYS-03 | Collision and simulation logic are unit-tested (including property tests for extreme speeds / dense grids) | Vitest 5.0.1 + fast-check 4.10.2 (+ `@fast-check/vitest` 0.5.0); tunneling + clamp-edge + golden-replay maps |
| PHYS-04 | Ball bounce angle is paddle-relative with clamps that avoid near-horizontal and near-vertical degenerate trajectories | Classic Breakout english in `resolve.ts`; named clamp constants; example tests at ±clamp edges |
| PHYS-06 | Game advances on a fixed-timestep loop; React state is not updated every physics frame | Pure `stepWorld(world, intent, FIXED_DT)`; accumulator host stays out of `core/` (runtime later); golden chunking proves fixed-step identity |
</phase_requirements>

## Project Constraints (from .cursor/rules/)

From `.cursor/rules/gsd.md` (PROJECT + STACK mirror):

- Tech stack locked: React Native, TypeScript, Expo SDK 57, Skia, **custom physics**, fixed timestep
- Custom physics only — no Matter/Box2D/planck for the ball
- Simulation must remain worklet-suitable and Node-testable
- Expo docs for native work: https://docs.expo.dev/versions/v57.0.0/
- Always prefer SDK pins via `npx expo install` for native modules; plain `npm` OK for Vitest/fast-check (non-native)

**Phase 1 enforcement already in repo (must extend, not weaken):**
- `docs/layer-contract.md` LC-01/LC-06: `core/` bans React/RN/Skia/Reanimated/Expo imports
- `eslint.config.js` `no-restricted-imports` + `eslint-plugin-boundaries`
- `tests/core.purity.test.ts` source scan for forbidden imports
- Worklet rule: **do not close over module-level `const` bindings** inside `'worklet'` functions — inline numeric literals or pass values as arguments (`allocate.ts` / `step.ts` comments) [VERIFIED: codebase]

## Summary

Phase 2 replaces the Phase 1 spike stub with a real headless `World`: preallocated SoA for N balls (one active), paddle, brick grid metadata (multi-HP + unbreakable), dual mulberry32 streams, and a fixed-capacity event ring. Physics is continuous collision detection — Minkowski-expand each AABB by ball radius, raycast the center segment, take earliest TOI, reflect, iterate with a hard iteration cap — against walls, paddle, and grid cells. Classic Breakout paddle english maps hit position → outgoing angle, preserves speed, and clamps to configurable ±~62° with a minimum vertical component. All of this runs as pure `'worklet'`-marked TypeScript under Vitest in Node; no pixels, no gestures, no React writes.

The repo already has `FIXED_DT = 1/120`, `MAX_SUBSTEPS = 5`, `MAX_FRAME_TIME = 0.25` in `src/runtime/constants.ts`, Vitest 5.0.1, and purity ESLint — but **not** `fast-check`, and **not** a ban on `Math.random()` / wall-clock. Wave 0 must install fast-check (+ optional `@fast-check/vitest`), extend lint/tests for RNG/clock bans, and grow `core/` into the ARCHITECTURE module map without breaking the spike harness compile.

**Primary recommendation:** Replace `SpikeWorld` with a full `World` SoA; implement `sweep` → `resolve` → `stepWorld` as zero-allocation worklet-safe modules; prove PHYS-02/03/04/06 with golden-replay hash + 2×-speed dense-grid property tests before any render work.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fixed-timestep integration (`stepWorld`) | Browser / Client (UI-runtime worklet) — same pure module | Node (Vitest) | Same `'worklet'` TS runs in both; Phase 2 proves Node half |
| Accumulator / frame clamp / max-substep | Browser / Client (`runtime/`) | Node test harness (pure helper) | Host owns wall-clock; `core/` only accepts exact `FIXED_DT` |
| Swept collision + bounce resolve | Browser / Client (`core/physics`) | — | Pure sim; no render/input |
| Brick HP / unbreakable flags | Browser / Client (`core/`) | — | Metadata + hit API only; levels Phase 4 |
| Event ring push | Browser / Client (`core/events`) | Later: JS services drain | Sim never calls services (LC-09) |
| Dual PRNG | Browser / Client (`core/rng`) | — | State lives inside `World` |
| Golden-replay / property tests | CDN / Static N/A — **Node test process** | — | Headless Vitest only this phase |
| Paddle intent sampling | Deferred Phase 3 (`input/`) | Phase 2: synthetic `Intent` struct in tests | No gestures in Phase 2 |
| Skia / React UI | Out of scope | — | Do not build |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | `~6.0.3` | Typed SoA + pure modules | Already pinned; Expo template |
| Vitest | `5.0.1` | Node unit/property host | Already installed; runs `core/` with no RN transform [VERIFIED: package.json, npm registry] |
| Custom physics (in-repo) | — | Swept circle-vs-AABB | Locked; engines rejected (worklet-hostile, fight english) [CITED: STACK.md, REQUIREMENTS Out of Scope] |
| mulberry32 (inline) | — | Dual seeded PRNG | ~5 lines, `'worklet'`-safe, state in `World` [CITED: ARCHITECTURE.md Pattern 6] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fast-check` | `4.10.2` | Property-based tunneling / clamp / determinism | **Install in Wave 0** — not in package.json today [VERIFIED: npm view 2026-09-20] |
| `@fast-check/vitest` | `0.5.0` | `test.prop` integration with Vitest 5 | Recommended connector; peers `vitest ^4.1 \|\| ^5`, `fast-check ^3\|\|^4` [VERIFIED: npm registry] |
| `@vitest/coverage-v8` | `5.0.1` | Optional coverage on `core/physics` | Already present; gate physics modules if desired |
| ESLint `no-restricted-globals` / syntax | (eslint ^9.39.5) | Fail build on `Math.random` / `Date.now` / `performance.now` in `src/core/` | Extend existing `eslint.config.js` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom swept CCD | matter-js / planck / Box2D | **Rejected** — worklet-hostile, discrete tunnels, fights paddle english [CITED: REQUIREMENTS] |
| Grid broadphase | Quadtree / spatial hash | Unnecessary; bricks already on a uniform grid [CITED: ARCHITECTURE Pattern 4, Jake Gordon] |
| `fc.assert` only | `@fast-check/vitest` `test.prop` | Both work; connector handles Vitest timeouts/hooks better [CITED: fast-check.dev Vitest tutorial] |
| Crypto-grade hash | FNV-1a / mulberry fold over float bits | Need stable Node identity, not security; keep O(n) bit-stable hash |
| Evolve `SpikeWorld` fields | Full replace with `World` | Replace — spike sprites are not gameplay; thin harness update keeps app compiling |

**Installation (Wave 0):**
```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"   # repo engines: Node 24 (.nvmrc)
npm install -D fast-check@4.10.2 @fast-check/vitest@0.5.0
```

**Version verification (2026-09-20):**
| Package | npm version | Notes |
|---------|-------------|-------|
| `vitest` | 5.0.1 | Installed |
| `fast-check` | 4.10.2 | Install (research docs said 4.10.1 — registry is 4.10.2) |
| `@fast-check/vitest` | 0.5.0 | Vitest 5 peer OK |
| Node | 24.21.0 via `node@24` | Default `node` on PATH may be broken (simdjson); use `.nvmrc` / node@24 |

## Architecture Patterns

### System Architecture Diagram

```
  [Test / future runtime]
        │
        │  Intent { paddleX, flags }   (synthetic in Phase 2)
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  advanceAccumulated (test helper) OR useFrameCallback   │
  │  clamp frameDt → accumulator → while ≥ FIXED_DT:        │
  │       stepWorld(world, intent, FIXED_DT)                │
  │  never integrate leftover as partial step               │
  └───────────────────────┬─────────────────────────────────┘
                          │ exactly FIXED_DT
                          ▼
  ┌─────────────────────────────────────────────────────────┐
  │  core/stepWorld                                         │
  │    1. apply paddle intent (clamp to field)              │
  │    2. for each active ball (index order):               │
  │         remaining = FIXED_DT                            │
  │         loop ≤ MAX_CCD_ITERATIONS:                      │
  │           hit = earliest(sweep walls, paddle, grid)     │
  │           if miss → advance(remaining); break           │
  │           advance(toi); resolve(hit); push event;       │
  │           apply brick HP if breakable; remaining -= toi │
  │    3. bounds backstop                                   │
  │    4. tick++                                            │
  └───────────┬───────────────────────────┬─────────────────┘
              │ writes SoA                │ pushes
              ▼                           ▼
        World (typed arrays)         EventRing (fixed cap)
              │
              ▼
        hashWorld(world)  ← golden-replay only (tests)
```

### Recommended Project Structure

```
src/core/
├── constants.ts          # FIXED_DT, MAX_BALL_SPEED, clamps, caps (export for tests;
│                         # worklet bodies still inline literals — Phase 1 lesson)
├── types.ts              # World, Intent, Hit, EventCode, BrickFlags
├── allocate.ts           # allocateWorld(capacities) — once
├── reset.ts              # resetWorld / loadTestGrid (no alloc)
├── step.ts               # stepWorld(world, intent, dt) — single entry
├── hash.ts               # hashWorld for golden-replay (Node + worklet-safe)
├── physics/
│   ├── sweep.ts          # circle segment vs expanded AABB → TOI + normal
│   ├── broadphase.ts     # grid cell walk for brick candidates
│   ├── resolve.ts        # wall/brick reflect + paddle english + clamps
│   └── integrate.ts      # advance position by t * vel
├── events/
│   └── ring.ts           # pushEvent / peek / clear (fixed SoA ring)
├── rng/
│   └── mulberry32.ts     # nextU32 / nextFloat on Uint32Array slot
└── index.ts              # public exports

tests/
├── core.purity.test.ts   # extend: ban Math.random / Date.now / performance
├── core.smoke.test.ts    # update for World
├── physics.sweep.test.ts
├── physics.paddle.test.ts
├── physics.tunneling.prop.test.ts
└── physics.golden-replay.test.ts
```

**ESLint note:** Current `boundaries` patterns use `src/core/*` (single segment). When adding `physics/`, update to `src/core/**` (and other layers similarly) or keep files flat. Prefer updating patterns — nested map matches ARCHITECTURE.md. [VERIFIED: eslint.config.js]

### Pattern 1: Swept circle-vs-AABB (Minkowski + ray slab)

**What:** Expand AABB by ball radius on both axes; raycast center from `p0` along `delta = v * remaining`; earliest face/corner TOI in `[0, 1]` wins; corner normal = normalize(center − corner).

**When to use:** Every ball–wall, ball–paddle, ball–brick contact.

**Example:**
```typescript
// Source: ARCHITECTURE.md Pattern 4; Geometric Tools / Minkowski CCD
// 'worklet'
export function sweepCircleAabb(
  cx: number, cy: number, radius: number,
  dx: number, dy: number, // displacement this remaining slice
  minX: number, minY: number, maxX: number, maxY: number,
): { hit: boolean; t: number; nx: number; ny: number } {
  'worklet';
  const expMinX = minX - radius;
  const expMinY = minY - radius;
  const expMaxX = maxX + radius;
  const expMaxY = maxY + radius;
  // Ray-vs-AABB slab test on (cx,cy)+(dx,dy); return earliest t in [0,1]
  // If impact on a rounded corner region, replace normal with corner vector.
  // ...
}
```

### Pattern 2: Classic Breakout paddle english + clamps

**What:** `t = (ballX - paddleCenterX) / (paddleHalfW)` clamped to `[-1, 1]`; outgoing angle = `lerp(-CLAMP, +CLAMP, (t+1)/2)` from vertical (or from up-vector); set velocity from angle preserving `speed = hypot(vx,vy)`; enforce `abs(vy) >= MIN_VY` / reject near-horizontal.

**When to use:** Only on paddle hits (not brick/wall).

**Example:**
```typescript
// Source: genre practice (Arkanoid / Breakout); D-01..D-03
// Recommend: PADDLE_ANGLE_CLAMP_DEG = 62; MIN_VERTICAL_RATIO ≈ cos(clamp)
'worklet';
const t = Math.max(-1, Math.min(1, (ballX - paddleCx) / paddleHalfW));
const angleFromUp = t * PADDLE_ANGLE_CLAMP_RAD; // ±clamp
const speed = Math.hypot(vx, vy);
vx = Math.sin(angleFromUp) * speed;
vy = -Math.cos(angleFromUp) * speed; // upward in y-down or y-up — pick one coord convention and stick to it
```

**Coordinate convention (discretion → recommend):** Keep Phase 1 logical field `360×640` with **y increasing downward** (matches screen space / spike stub). Paddle near bottom; "up" after bounce is **negative vy**. Document in `constants.ts`.

### Pattern 3: Dual mulberry32 streams in World

**What:** `rngGameplay: Uint32Array(1)`, `rngCosmetic: Uint32Array(1)`; never share; Phase 2 may not *consume* gameplay RNG yet but must allocate + seed both.

```typescript
// Source: ARCHITECTURE.md Pattern 6
export function nextFloat(state: Uint32Array, i: number): number {
  'worklet';
  state[i] = (state[i] + 0x6d2b79f5) | 0;
  let t = state[i];
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
```

### Pattern 4: Event ring (fixed SoA)

**What:** Parallel typed arrays `code`, `a`, `b`, `x`, `y` + `head`/`count`; push wraps; overflow policy: **drop oldest** or **drop newest** — recommend **drop newest + set `ringOverflow` flag** so tests detect silent loss.

**Event codes (Phase 2 minimum):** `WALL_HIT`, `PADDLE_HIT`, `BRICK_HIT`, `BRICK_BREAK` (HP→0), `BALL_OUT` (optional stub).

### Pattern 5: Golden-replay via chunked accumulator

**What:** Record sequence of paddle intents per fixed step; deliver wall-clock chunks `[1×dt]`, `[2×dt]`, `[0.5×dt, 0.5×dt]`, random partitions of the same total time; assert `hashWorld` identical. Never call `stepWorld` with partial dt in production path.

### Anti-Patterns to Avoid

- **Discrete overlap-only collision** — tunnels at speed; forbidden (PHYS-02)
- **Integrating accumulator remainder** — destroys determinism [CITED: Gaffer On Games]
- **`Math.random()` / `Date.now()` in `core/`** — fails D-13
- **Singular `ball` object API** — breaks D-07 multi-ball readiness
- **Quadtree** — overkill; grid is the broadphase (D-12)
- **Calling audio/services from sim** — use event ring only
- **Closing over module consts in worklets** — Phase 1 breakage; inline or pass args
- **Building render/gestures** — deferred; do not expand Phase 2 scope
- **Assuming bit-identical floats across iOS/Android Hermes** — golden-replay bar is **same Node process / same engine**; document as Node-stable hash, not cross-device bit lock [CITED: PITFALLS.md Pitfall 6]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full rigid-body engine | Custom constraint solver | Swept circle + AABB only | Arcade english is the skill; engines fight it |
| Spatial index library | Quadtree package | Brick grid walk | Level *is* the acceleration structure |
| Crypto RNG / `crypto.getRandomValues` | Secure random | mulberry32 in World | Deterministic, serializable, worklet-safe |
| Jest + RN transforms for physics | jest-expo for core | Vitest Node | Already proven in Phase 1 |
| Per-event `scheduleOnRN` | — | Ring + later batch drain | Not Phase 2, but do not invent service calls now |
| Cross-platform fixed-point physics | Soft-float / Q16 | Float32 SoA + Node golden hash | Same-device / Node determinism is the locked bar |

**Key insight:** The hard problems are continuous collision + determinism under chunked timesteps — both have canonical solutions. Do not invent a general physics engine.

## Recommended Constants (Claude's Discretion)

| Constant | Recommended value | Rationale |
|----------|-------------------|-----------|
| `FIXED_DT` | `1/120` | Already in `runtime/constants.ts`; keep unless 2× tunneling tests fail [VERIFIED: src/runtime/constants.ts] |
| `MAX_SUBSTEPS` | `5` | Match runtime host |
| `MAX_FRAME_TIME` | `0.25` | Gaffer clamp; match runtime |
| `LOGICAL_WIDTH/HEIGHT` | `360` / `640` | Phase 1 precedent [VERIFIED: src/core/constants.ts] |
| `BALL_RADIUS` | `6` | ~1.7% of width; readable later in Skia |
| `PADDLE_WIDTH/HEIGHT` | `72` / `12` | Classic fraction of field (~20% width) |
| `MAX_BALL_SPEED` | `720` units/s | Per-step travel at 1× = 6 units; 2× = 12; brick cells ~28–32 — CCD must still catch [ASSUMED: tune if prop tests flake] |
| `PADDLE_ANGLE_CLAMP_DEG` | `62` | Mid of locked ±60–65° band |
| `MAX_BALLS` | `8` | Covers multi-ball later; Phase 2 `activeBallCount = 1` |
| `MAX_BRICKS` | `256` | Dense grid headroom for prop tests |
| `EVENT_RING_CAPACITY` | `128` | Multi-hit chains without overflow in tests |
| `MAX_CCD_ITERATIONS` | `5` | ARCHITECTURE / PITFALLS guidance |
| `SEPARATION_EPS` | `1e-4` | Nudge off surface after reflect |
| Hash | FNV-1a 32-bit over `Uint32` views of all SoA + scalars + both RNG states + ring cursors | Stable in Node; no `JSON.stringify` floats |

**SpikeWorld migration (discretion → recommend):** **Replace** `SpikeWorld` with `World`. Update `useSpikeLoop` to allocate `World` and either (a) stop drawing stub sprites (minimal blank loop) or (b) keep a short-lived `stepStubSprites` on unused arrays — prefer (a) with a comment that Phase 3 owns visuals. Do not leave two competing world types.

## Common Pitfalls

### Pitfall 1: Tunneling via discrete tests
**What goes wrong:** Ball passes through thin bricks at high speed.  
**Why:** Endpoint overlap misses.  
**How to avoid:** Swept TOI from day one; property test at 2× `MAX_BALL_SPEED`.  
**Warning signs:** Bug only at high speed; “fixing DT makes it go away.” [CITED: PITFALLS.md Pitfall 4]

### Pitfall 2: Corner normals as axis flips
**What goes wrong:** Visibly wrong bounce in brick seams.  
**Why:** Naive flip-vy on corner.  
**How to avoid:** Corner → radial normal from corner point; reject contacts with `dot(v,n) >= 0` after reflect. [CITED: PITFALLS.md]

### Pitfall 3: Partial-step remainder integration
**What goes wrong:** Golden-replay diverges across chunkings.  
**Why:** Variable effective dt.  
**How to avoid:** Accumulator only; leftover carries; max-substep clears accumulator (match `useSpikeLoop`). [CITED: Gaffer; useSpikeLoop.ts]

### Pitfall 4: Silent non-determinism
**What goes wrong:** Flaky tests; later VFX breaks physics hashes.  
**Why:** Shared RNG or wall-clock.  
**How to avoid:** Dual streams; ESLint + purity test bans; hash includes RNG state. [CITED: PITFALLS.md Pitfall 6]

### Pitfall 5: Multi-ball-unready APIs
**What goes wrong:** Phase 5 rewrite of hot path.  
**Why:** `world.ball` singular.  
**How to avoid:** SoA + `activeBallCount`; resolve balls in index order; brick HP applied once per brick per step (`damagedThisStep` flag). [CITED: PITFALLS.md Pitfall 5; D-07]

### Pitfall 6: Worklet const capture
**What goes wrong:** Wrong sizes / undefined in UI runtime.  
**Why:** Module bindings not closed into worklets.  
**How to avoid:** Inline literals in `'worklet'` bodies; keep exported consts for Node tests only. [VERIFIED: Phase 1 allocate/step comments]

### Pitfall 7: Expanding Phase 2 into render/input
**What goes wrong:** Scope slip; physics unproven under visual noise.  
**How to avoid:** Honor deferred list; only thin harness compile fix.

## Code Examples

### World SoA sketch
```typescript
// Recommended shape — planner may refine field names
export type World = {
  // Balls
  ballX: Float32Array; ballY: Float32Array;
  ballVx: Float32Array; ballVy: Float32Array;
  ballRadius: Float32Array; // or scalar if uniform
  ballActive: Uint8Array;
  activeBallCount: number;
  maxBalls: number;

  // Paddle
  paddleX: number; paddleY: number;
  paddleW: number; paddleH: number;

  // Bricks (grid authority)
  brickX: Float32Array; brickY: Float32Array;
  brickW: Float32Array; brickH: Float32Array;
  brickHp: Int16Array;      // -1 or flag = unbreakable
  brickFlags: Uint8Array;   // UNBREAKABLE bit
  brickCount: number;
  gridCols: number; gridRows: number;
  cellToBrick: Int16Array;  // -1 empty
  brickDamagedThisStep: Uint8Array;

  // Power-up reserve (D-09) — empty in Phase 2
  effectCount: number;
  effectType: Uint8Array;
  effectUntilTick: Int32Array;
  maxEffects: number;

  // RNG + time
  rngGameplay: Uint32Array; // length 1
  rngCosmetic: Uint32Array;
  tick: number;
  accumulator: number; // owned by host; OK on world for parity with spike

  // Events
  evCode: Uint16Array; evA: Int16Array; evB: Int16Array;
  evX: Float32Array; evY: Float32Array;
  evHead: number; evCount: number; evCap: number;
  evOverflow: number;
};
```

### Golden-replay harness sketch
```typescript
// tests/physics.golden-replay.test.ts
import { allocateWorld, stepWorld, hashWorld, FIXED_DT } from '../src/core';

function runChunked(world, intents, chunkSteps: number[]) {
  let i = 0;
  for (const n of chunkSteps) {
    // Simulate host: n fixed steps in one "frame"
    for (let s = 0; s < n; s++) {
      stepWorld(world, intents[i++], FIXED_DT);
    }
  }
}

it('same intents, different chunking → same hash', () => {
  const intents = /* N paddle targets */;
  const w1 = seedWorld(1); const w2 = seedWorld(1);
  runChunked(w1, intents, Array(intents.length).fill(1));
  runChunked(w2, intents, /* e.g. [2,2,1,3,...] summing to length */);
  expect(hashWorld(w1)).toBe(hashWorld(w2));
});
```

### fast-check tunneling property sketch
```typescript
// Source: fast-check.dev Vitest tutorial — use @fast-check/vitest
import { test, fc } from '@fast-check/vitest';
import { MAX_BALL_SPEED, FIXED_DT } from '../src/core';

test.prop({
  angle: fc.double({ min: 0.15, max: Math.PI - 0.15, noNaN: true }),
  speedMul: fc.constant(2), // locked 2× designed max (D-05)
}, { numRuns: 100 })('no tunneling through dense grid at 2× max speed', ({ angle }) => {
  const speed = MAX_BALL_SPEED * 2;
  const world = denseGridWorld();
  // launch ball; step many FIXED_DT; assert:
  // - never center inside a solid brick AABB (expanded by -eps)
  // - every crossed brick cell registered BRICK_HIT/BREAK or UNBREAKABLE bounce
  // - ball never escapes side/top walls without WALL_HIT
  return true;
});
```

### ESLint ban for RNG / clock
```javascript
// eslint.config.js — files: src/core/**/*.{ts,tsx}
'no-restricted-globals': ['error',
  { name: 'performance', message: 'D-13: no wall-clock in core/' },
],
'no-restricted-syntax': ['error',
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: 'D-13: use World mulberry32 streams, not Math.random()',
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'D-13: no Date.now() in core/',
  },
  {
    selector: "CallExpression[callee.object.name='performance'][callee.property.name='now']",
    message: 'D-13: no performance.now() in core/',
  },
],
```
Also extend `tests/core.purity.test.ts` with a regex scan for `Math.random`, `Date.now`, `performance.now`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Discrete AABB overlap | Swept TOI (Minkowski + ray) | Genre practice; Erin Catto CCD | Required for PHYS-02 |
| Variable dt × velocity | Fixed DT + accumulator | Gaffer 2004 (still current) | Determinism + gesture-rate immunity |
| `Math.random()` | Seeded streams in state | Project lock D-13 | Replay + tests |
| Singular ball | N-ball SoA from day one | Project research | Avoid Phase 5 rewrite |

**Deprecated/outdated:**
- “Just lower DT to fix tunneling” — fingerprint of discrete collision, not a fix
- Off-the-shelf 2D engines for this genre’s paddle english

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `MAX_BALL_SPEED = 720` logical units/s is a good starting designed max | Recommended Constants | Prop tests may need retune; document change if FIXED_DT must shrink |
| A2 | Y-down coordinate system (Phase 1 stub) should continue | Pattern 2 | Sign errors in paddle english if flipped later |
| A3 | FNV-1a over float bit patterns is sufficient for golden-replay | Hash | Collisions theoretically possible but acceptable for tests |
| A4 | Event ring overflow → drop newest + flag | Pattern 4 | Alternate (drop oldest) also fine if tests assert `evOverflow === 0` |
| A5 | `@fast-check/vitest` preferred over raw `fc.assert` | Standard Stack | Either works; connector is convenience |

**If wrong:** Planner adjusts constants in one place; physics formulation unchanged.

## Open Questions (RESOLVED)

1. **Should `FIXED_DT` / `MAX_SUBSTEPS` live in `core/` or stay in `runtime/`?**
   - **RESOLVED:** Export `FIXED_DT`, `MAX_SUBSTEPS`, and `MAX_FRAME_TIME` from `core/constants.ts` for Node tests and as the numeric source of truth. Runtime **duplicates matching literals** inside the frame-callback / worklet closure (Phase 1 pattern — worklets must not close over module consts). Do **not** have `core` import `runtime`.

2. **How aggressive should brick “missed collision” detection be in prop tests?**
   - **RESOLVED:** Dual oracle — (1) no ball center inside a solid brick AABB after any step; (2) any grid cell whose expanded AABB is crossed by the swept segment must produce a hit event (BRICK_HIT/BREAK/unbreakable bounce) or an earlier TOI stop before exiting the far side. Used by plan 02-05 PROP-TUNNEL.

3. **Spike harness after World replace**
   - **RESOLVED:** Replace `SpikeWorld` entirely with `World`. Thin harness to a blank compile-safe playfield + overlay (no sprite SoA dual-world). Phase 3 owns real visuals. Implemented in plan 02-01 Task 3.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 24 | Vitest engines / `.nvmrc` | ✓ via `/opt/homebrew/opt/node@24` | 24.21.0 | Pin PATH; default `node` 25 may be dyld-broken (simdjson) |
| npm | Install fast-check | ✓ | 11.19.0 | — |
| Vitest | PHYS-03 | ✓ | 5.0.1 | — |
| fast-check | Property tests | ✗ not installed | — → install 4.10.2 | Blocker until Wave 0 |
| `@fast-check/vitest` | Ergonomic prop tests | ✗ | — → install 0.5.0 | Raw `fc.assert` fallback |
| ESLint | Purity / RNG ban | ✓ | ^9.39.5 | — |
| Expo / Skia device | Phase 2 physics | Not required | — | Headless only |

**Missing dependencies with no fallback:**
- None blocking research; **fast-check install is Wave 0 execution blocker** for PHYS-03 property suite.

**Missing dependencies with fallback:**
- `@fast-check/vitest` → use `fc.assert(fc.property(...))` with Vitest `it`

**Step 2.6 note:** No Docker/DB/Redis. Graphify graph absent — no graph queries.

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` — this section is required so VALIDATION.md can be derived.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `5.0.1` + fast-check `4.10.2` (+ `@fast-check/vitest` `0.5.0`) |
| Config file | `vitest.config.ts` (`environment: 'node'`, include `src/core/**/*.test.ts`, `tests/**/*.test.ts`) |
| Quick run command | `npm run test:core` |
| Full suite command | `npm test` |
| Lint purity | `npx eslint src/core` |
| Engines | Node 24 (`.nvmrc`) — use `node@24` on PATH |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PHYS-06 | `stepWorld` only accepts fixed dt; leftover accumulator not integrated; no React in `core/` | unit + golden | `npx vitest run tests/physics.golden-replay.test.ts` | ❌ Wave 0 |
| PHYS-06 | Purity: no platform imports | unit | `npx vitest run tests/core.purity.test.ts` | ✅ extend |
| PHYS-06 | Lint: no `Math.random` / `Date.now` / `performance.now` | lint | `npx eslint src/core` | ❌ Wave 0 rule |
| PHYS-02 | Swept hit vs wall / paddle / single brick at designed max speed | unit | `npx vitest run tests/physics.sweep.test.ts` | ❌ Wave 0 |
| PHYS-02 / PHYS-03 | Property: 2× max speed through dense grid — zero tunneling, zero missed collisions | property | `npx vitest run tests/physics.tunneling.prop.test.ts` | ❌ Wave 0 |
| PHYS-04 | Paddle english maps edges → ±clamp; mid → straight-ish up; speed preserved | unit | `npx vitest run tests/physics.paddle.test.ts` | ❌ Wave 0 |
| PHYS-04 | Near-horizontal / near-vertical inputs get clamped | unit | same file | ❌ Wave 0 |
| PHYS-03 | Unbreakable brick reflects, HP unchanged; multi-HP decrements once per step | unit | `npx vitest run tests/physics.bricks.test.ts` | ❌ Wave 0 |
| D-13 / D-14 | Dual RNG seeded; golden hash equal across chunkings | unit | `tests/physics.golden-replay.test.ts` | ❌ Wave 0 |
| D-07 / D-08 | `maxBalls ≥ 2` capacity with `activeBallCount === 1`; ring push/overflow flag | unit | `tests/physics.world-shape.test.ts` | ❌ Wave 0 |

### Property tests (Nyquist sampling focus)

| Property ID | Invariant | Generator | Runs (min) |
|-------------|-----------|-----------|------------|
| PROP-TUNNEL | No ball center inside solid brick after any step; no grid crossing without hit event | angle ∈ (ε, π−ε), launch positions along top band, speed = 2×`MAX_BALL_SPEED` | 100 |
| PROP-SPEED | After paddle/wall/brick reflect, `abs(hypot(vx,vy) − speed0) ≤ 1e-4` (paddle preserves; walls/bricks preserve) | random hit normals / paddle t ∈ [-1,1] | 50 |
| PROP-CLAMP | Outgoing paddle angle always within ±`PADDLE_ANGLE_CLAMP_DEG`; `abs(vy)` ≥ min vertical | paddle t including exact ±1 | 50 |
| PROP-DETERM | Identical seed+intents+step count → identical `hashWorld` | random intent sequences | 20 |

### Golden-replay protocol

1. Seed world (`rngGameplay`, `rngCosmetic`, one ball, fixed test grid).
2. Build intent array length `N` (paddle X targets).
3. Run A: `N` frames × 1 substep.
4. Run B: random partition of `N` into chunk sizes summing to `N` (each chunk = that many `stepWorld` calls back-to-back).
5. Assert `hashWorld(A) === hashWorld(B)` and equal `tick`, ball pose bits, brick HP arrays, both RNG states.

### Purity lint gates

| Gate | Mechanism | Fail condition |
|------|-----------|----------------|
| No platform imports | ESLint `no-restricted-imports` + `tests/core.purity.test.ts` | Any React/RN/Skia/Expo import |
| No RNG/clock | ESLint `no-restricted-syntax` + purity regex | `Math.random`, `Date.now`, `performance.now` |
| Layer boundaries | `eslint-plugin-boundaries` | `core` → non-core |
| Module count | purity test `≥ 5` files | Keep after split (will grow) |

### Sampling Rate

- **Per task commit:** `npm run test:core` + `npx eslint src/core`
- **Per wave merge:** `npm test` + `npx eslint src/core`
- **Phase gate:** Full suite green; tunneling prop + golden-replay must pass before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `npm install -D fast-check@4.10.2 @fast-check/vitest@0.5.0`
- [ ] ESLint restrictions for `Math.random` / wall-clock in `src/core/**`
- [ ] Extend `tests/core.purity.test.ts` regex for RNG/clock
- [ ] Update `boundaries` patterns to `src/core/**` (if nested dirs)
- [ ] `tests/physics.sweep.test.ts` — PHYS-02 unit
- [ ] `tests/physics.paddle.test.ts` — PHYS-04
- [ ] `tests/physics.tunneling.prop.test.ts` — PHYS-02/03
- [ ] `tests/physics.golden-replay.test.ts` — PHYS-06 / D-14
- [ ] `tests/physics.bricks.test.ts` — D-10 multi-HP / unbreakable
- [ ] `tests/physics.world-shape.test.ts` — D-07/D-08/D-09 shape
- [ ] Update `tests/core.smoke.test.ts` for `World` / `stepWorld`
- [ ] Thin `useSpikeLoop` migration so app still typechecks after `SpikeWorld` removal

## Security Domain

> Local offline game sim; no network auth. Still apply ASVS where touch points exist.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Clamp/sanitize `Intent.paddleX` to field bounds inside `stepWorld`; reject NaN/Infinity (set safe default or skip step) |
| V6 Cryptography | no | Hash is integrity-for-tests only — not security-sensitive; do not use for secrets |

### Known Threat Patterns for headless game core

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| NaN poisoning via intent | Tampering / DoS | `Number.isFinite` guards; no silent NaN propagation |
| Accidental non-determinism as “security of fairness” | Spoofing (weak) | Seeded RNG + golden-replay (skill trust) |
| Prototype pollution / unexpected imports | Elevation | ESLint boundaries; no dynamic `require` in core |

## Sources

### Primary (HIGH confidence)
- Repo: `src/core/*`, `src/runtime/constants.ts`, `src/runtime/useSpikeLoop.ts`, `eslint.config.js`, `docs/layer-contract.md`, `package.json` — verified 2026-09-20
- npm registry: `vitest@5.0.1`, `fast-check@4.10.2`, `@fast-check/vitest@0.5.0` — verified 2026-09-20
- [Gaffer On Games — Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) — accumulator, clamp, no partial remainder step
- `.planning/research/ARCHITECTURE.md` — sweep/resolve/ring/mulberry32 module map
- `.planning/research/PITFALLS.md` — tunneling, determinism, multi-ball
- `.planning/research/STACK.md` — Vitest + fast-check; custom physics
- [fast-check Vitest tutorial](https://fast-check.dev/docs/tutorials/setting-up-your-test-environment/property-based-testing-with-vitest/) — `@fast-check/vitest` setup

### Secondary (MEDIUM confidence)
- [Jake Gordon — Collision Detection in Breakout](https://jakesgordon.com/writing/collision-detection-in-breakout/) — multi-hit recursion / earliest intercept
- [Geometric Tools — Intersection of Moving Circle and Rectangle](https://www.geometrictools.com/Documentation/IntersectionMovingCircleRectangle.pdf) — Minkowski rounded-rect CCD
- Genre paddle english writeups (sakimyto / gamedev.SE) — clamp band ±60–65° aligned with D-02

### Tertiary (LOW confidence)
- Exact `MAX_BALL_SPEED = 720` feel tuning — validate with prop tests; adjust if needed

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — versions verified on npm; Vitest already in repo
- Architecture: **HIGH** — matches locked CONTEXT + prior project research + Phase 1 patterns
- Pitfalls: **HIGH** — canonical CCD/timestep pitfalls; repo-specific worklet const capture verified
- Numeric constants: **MEDIUM** — discretionary; gated by property tests

**Research date:** 2026-09-20  
**Valid until:** 2026-10-20 (30 days; physics patterns stable; re-check fast-check major if upgrading Vitest)

---

## RESEARCH COMPLETE

**Phase:** 02 - headless-core-simulation  
**Confidence:** HIGH

### Key Findings
- Replace `SpikeWorld` with N-ball SoA `World` + event ring + dual mulberry32; one active ball; power-up slot reserved empty
- Swept circle-vs-AABB via Minkowski expand + ray slab + corner normals; grid broadphase; `MAX_CCD_ITERATIONS = 5`
- Classic Breakout english: preserve speed; clamp ±62°; y-down field 360×640; `FIXED_DT = 1/120` confirmed
- Wave 0: install `fast-check@4.10.2` + `@fast-check/vitest@0.5.0`; ESLint-ban `Math.random`/wall-clock (not present yet)
- Golden-replay = same intents under different chunkings → identical FNV-1a `hashWorld`; accumulator never partial-steps
- Property suite at **2× `MAX_BALL_SPEED`** through dense grid is the PHYS-02/03 gate
- Do **not** build render, gestures, levels, scoring, or multi-ball activation
- Use Node 24 (`.nvmrc`); default Homebrew `node` may be broken — PATH to `node@24`

### File Created
`.planning/milestones/v1.0-phases/02-headless-core-simulation/02-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | npm + package.json verified |
| Architecture | HIGH | CONTEXT-locked; ARCHITECTURE formulations cited |
| Pitfalls | HIGH | Prior research + Phase 1 worklet lessons |

### Open Questions (RESOLVED)
- **FIXED_DT location:** Export from `core/constants.ts`; runtime duplicates literals in worklet closures (no core→runtime import)
- **Missed-collision oracle:** Dual oracle — center-in-brick + cell-crossing must hit or earlier TOI stop (plan 02-05)
- **Spike harness:** Replace SpikeWorld; blank compile-safe field + overlay (plan 02-01 Task 3)

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
