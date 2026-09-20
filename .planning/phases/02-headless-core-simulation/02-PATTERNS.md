# Phase 2: Headless Core Simulation - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 24
**Analogs found:** 18 / 24

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/core/types.ts` | model | transform | `src/core/types.ts` (SpikeWorld) | exact |
| `src/core/constants.ts` | config | — | `src/core/constants.ts` + `src/runtime/constants.ts` | exact |
| `src/core/allocate.ts` | service | transform | `src/core/allocate.ts` | exact |
| `src/core/reset.ts` | service | transform | `src/core/allocate.ts` (seed/mutate without realloc) | role-match |
| `src/core/step.ts` | service | event-driven | `src/core/step.ts` (`stepStub`) | exact |
| `src/core/hash.ts` | utility | transform | — | none |
| `src/core/physics/sweep.ts` | utility | transform | `src/core/step.ts` (bounds bounce) | partial |
| `src/core/physics/broadphase.ts` | utility | transform | — | none |
| `src/core/physics/resolve.ts` | utility | transform | `src/core/step.ts` (velocity flip) | partial |
| `src/core/physics/integrate.ts` | utility | transform | `src/core/step.ts` (pos += vel×dt) | role-match |
| `src/core/events/ring.ts` | service | pub-sub | `src/runtime/metrics.ts` (`pushSample` ring) | role-match |
| `src/core/rng/mulberry32.ts` | utility | transform | `src/core/allocate.ts` (deterministic seed comment) | partial |
| `src/core/index.ts` | config | — | `src/core/index.ts` | exact |
| `eslint.config.js` | config | — | `eslint.config.js` | exact |
| `tests/core.purity.test.ts` | test | file-I/O | `tests/core.purity.test.ts` | exact |
| `tests/core.smoke.test.ts` | test | request-response | `tests/core.smoke.test.ts` | exact |
| `tests/physics.sweep.test.ts` | test | request-response | `tests/core.smoke.test.ts` | role-match |
| `tests/physics.paddle.test.ts` | test | request-response | `tests/core.smoke.test.ts` | role-match |
| `tests/physics.bricks.test.ts` | test | request-response | `tests/core.smoke.test.ts` | role-match |
| `tests/physics.world-shape.test.ts` | test | request-response | `tests/core.smoke.test.ts` | role-match |
| `tests/physics.golden-replay.test.ts` | test | batch | `tests/core.smoke.test.ts` + `useSpikeLoop` accumulator | partial |
| `tests/physics.tunneling.prop.test.ts` | test | batch | — | none |
| `src/runtime/useSpikeLoop.ts` | hook | event-driven | `src/runtime/useSpikeLoop.ts` | exact |
| `src/render/recordSprites.ts` | component | transform | `src/render/recordSprites.ts` | exact |
| `package.json` / lockfile | config | — | existing `devDependencies` (vitest) | exact |

## Pattern Assignments

### `src/core/types.ts` (model, transform)

**Analog:** `src/core/types.ts` (SpikeWorld SoA shape)

**Core pattern** (lines 1–13) — replace `SpikeWorld` sprite fields with full `World` SoA; keep typed-array + scalar mix, mutable object returned once:

```typescript
/** SoA stub world for the Phase-1 thread-boundary spike (no physics). */
export type SpikeWorld = {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  w: Float32Array;
  h: Float32Array;
  color: Uint32Array;
  spriteCount: number;
  accumulator: number;
  tick: number;
};
```

**Copy:** Parallel typed arrays + `tick` / `accumulator` scalars. **Change:** Rename to `World`; add N-ball, paddle, brick grid, dual RNG slots, event ring fields, effect reserve (D-07…D-09). Drop sprite `color` / singular sprite SoA.

---

### `src/core/constants.ts` (config)

**Analog:** `src/core/constants.ts` + `src/runtime/constants.ts`

**Exports for Node/tests** (core lines 1–11):

```typescript
export const DEFAULT_SPRITE_CAP = 256;
export const LOGICAL_WIDTH = 360;
export const LOGICAL_HEIGHT = 640;
export const DEFAULT_SPRITE_SIZE = 8;
```

**Timestep host values** (runtime lines 1–8) — re-export equivalents from `core/constants.ts` for tests; runtime may keep local copies or import for non-worklet code:

```typescript
export const FIXED_DT = 1 / 120;
export const MAX_SUBSTEPS = 5;
export const MAX_FRAME_TIME = 0.25;
```

**Copy:** Named exported consts for tests. **Critical worklet rule:** worklet bodies must **inline** matching literals (see allocate/step comments) — do not close over these bindings inside `'worklet'` functions.

---

### `src/core/allocate.ts` (service, transform)

**Analog:** `src/core/allocate.ts`

**Imports + worklet allocate-once** (lines 1–48):

```typescript
import type { SpikeWorld } from './types';

/**
 * Allocate a mutable SoA world inside the (future) UI-runtime worklet path.
 * Deterministic seeds only — no Math.random().
 */
export function allocateWorld(capacity: number): SpikeWorld {
  'worklet';
  // Literals must match constants.ts — worklets cannot close over module consts.
  const logicalWidth = 360;
  const logicalHeight = 640;
  // ... new Float32Array(cap) for each field ...
  return {
    x, y, vx, vy, w, h, color,
    spriteCount,
    accumulator: 0,
    tick: 0,
  };
}
```

**Copy:**
1. `'worklet'` on every exported hot-path fn
2. Inline numeric literals matching `constants.ts`
3. Preallocate all typed arrays once; return one mutable object
4. No `Math.random()` (comment already states this — Phase 2 hardens with lint)

**Change:** Signature becomes `allocateWorld(capacities)` (maxBalls, maxBricks, eventCap, …); seed one active ball + empty brick grid + dual RNG Uint32Array(1) slots.

---

### `src/core/reset.ts` (service, transform)

**Analog:** `src/core/allocate.ts` (deterministic field fill) — no existing reset module

**Pattern to copy:** Same zero-alloc mutation style as allocate’s seed loop (lines 25–34): write into existing arrays; never `new` in hot path. Use for `resetWorld` / `loadTestGrid` that tests call between cases.

```typescript
for (let i = 0; i < spriteCount; i++) {
  // Deterministic lattice + velocity from index (no RNG).
  x[i] = (i * 37) % logicalWidth;
  y[i] = (i * 53) % logicalHeight;
  // ...
}
```

---

### `src/core/step.ts` → `stepWorld` (service, event-driven)

**Analog:** `src/core/step.ts` (`stepStub`)

**Imports + worklet step + in-place mutation** (lines 1–42):

```typescript
import type { SpikeWorld } from './types';

export function stepStub(world: SpikeWorld, dt: number): void {
  'worklet';
  const logicalWidth = 360;
  const logicalHeight = 640;
  const n = world.spriteCount;
  const { x, y, vx, vy, w, h } = world;

  for (let i = 0; i < n; i++) {
    let nx = x[i] + vx[i] * dt;
    let ny = y[i] + vy[i] * dt;
    // discrete AABB bounce — REPLACE with sweep/resolve CCD loop
    x[i] = nx;
    y[i] = ny;
  }

  world.tick += 1;
}
```

**Copy:** `'worklet'`; destructure SoA; mutate in place; increment `tick`; no allocations; void return.

**Change:** Signature `stepWorld(world, intent, dt)`; call paddle intent clamp → per-ball CCD loop (`sweep` → `resolve` → `pushEvent`) → bounds backstop. Do **not** integrate partial leftover dt inside core.

**Host accumulator pattern** (do not put in core — copy into test helper / keep in runtime) from `src/runtime/useSpikeLoop.ts` lines 93–105:

```typescript
let dt = (frame.timeSincePreviousFrame ?? 16.67) / 1000;
if (dt > maxFrameTime) dt = maxFrameTime;

w.accumulator += dt;
let steps = 0;
while (w.accumulator >= fixedDt && steps < maxSubsteps) {
  stepStub(w, fixedDt);
  w.accumulator -= fixedDt;
  steps += 1;
}
if (steps === maxSubsteps) {
  w.accumulator = 0;
}
```

---

### `src/core/physics/integrate.ts` (utility, transform)

**Analog:** `src/core/step.ts` lines 16–17

```typescript
let nx = x[i] + vx[i] * dt;
let ny = y[i] + vy[i] * dt;
```

**Copy:** Extract to `advanceBall(world, i, t)` with `'worklet'` and literals; used after TOI and on miss (full remaining).

---

### `src/core/physics/sweep.ts` / `resolve.ts` / `broadphase.ts` (utility, transform)

**Analog (partial):** `src/core/step.ts` wall bounce (lines 21–36) — discrete flip, not CCD

```typescript
if (nx - halfW < 0) {
  nx = halfW;
  vx[i] = -vx[i];
} else if (nx + halfW > logicalWidth) {
  nx = logicalWidth - halfW;
  vx[i] = -vx[i];
}
```

**Copy from analog:** Pure math in `'worklet'` fn; mutate velocity/position on world arrays; no imports outside `core/`.

**No full CCD analog in repo** — implement per `02-RESEARCH.md` Pattern 1–2 (Minkowski expand + ray slab; paddle english). Planner should treat RESEARCH code examples as the primary template for these three files.

---

### `src/core/events/ring.ts` (service, pub-sub)

**Analog:** `src/runtime/metrics.ts` `pushSample` circular index (lines 100–111)

```typescript
export function pushSample(
  m: SpikeMetrics,
  intervalMs: number,
  // ...
): void {
  'worklet';
  m.intervals[m.index] = intervalMs;
  m.index = (m.index + 1) % m.window;
  if (m.count < m.window) m.count += 1;
  // ...
}
```

**Copy:** Fixed-capacity typed-array ring; modulo head; `'worklet'`; no heap alloc on push.

**Change:** Parallel arrays (`evCode`, `evA`, `evB`, `evX`, `evY`); overflow policy = drop newest + set `evOverflow` (RESEARCH Pattern 4); live in `World`, not runtime metrics.

---

### `src/core/rng/mulberry32.ts` (utility, transform)

**Analog (partial):** `src/core/allocate.ts` lines 5–6 / 26 — “Deterministic seeds only — no Math.random()”

**No mulberry32 in repo.** Implement from RESEARCH Pattern 3:

```typescript
export function nextFloat(state: Uint32Array, i: number): number {
  'worklet';
  state[i] = (state[i] + 0x6d2b79f5) | 0;
  // ...
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
```

**Copy constraints from allocate/step:** `'worklet'`; state lives on `World` (`rngGameplay` / `rngCosmetic`); never share streams.

---

### `src/core/hash.ts` (utility, transform)

**Analog:** none in codebase.

**Guidance from RESEARCH:** FNV-1a 32-bit over `Uint32` views of SoA + scalars + both RNG states + ring cursors. Same `'worklet'` + no platform APIs rules as other core modules. Used only from tests in Phase 2 (Node-stable, not cross-device bit lock).

---

### `src/core/index.ts` (config)

**Analog:** `src/core/index.ts` lines 1–9

```typescript
export { allocateWorld } from './allocate';
export { stepStub } from './step';
export type { SpikeWorld } from './types';
export {
  DEFAULT_SPRITE_CAP,
  DEFAULT_SPRITE_SIZE,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
} from './constants';
```

**Copy:** Barrel re-exports only. **Change:** Export `World`, `stepWorld`, `hashWorld`, physics/rng/events as needed; remove `stepStub` / `SpikeWorld` after harness migration.

---

### `eslint.config.js` (config)

**Analog:** existing core purity block (lines 35–50) + boundaries settings (lines 75–84)

**Extend `files: ['src/core/**/*.{ts,tsx}']` rules** with RESEARCH snippet — `no-restricted-syntax` for `Math.random` / `Date.now` / `performance.now`, plus `no-restricted-globals` for `performance`.

**Update boundaries patterns** from single-segment to nested (required when adding `physics/`, `events/`, `rng/`):

```javascript
{ type: 'core', pattern: 'src/core/*' },  // TODAY — breaks nested dirs
// CHANGE TO:
{ type: 'core', pattern: 'src/core/**' },
// similarly prefer ** for runtime/render/input/ui/vfx/services
```

Keep existing `FORBIDDEN_IN_CORE` list and LC-07 hot-path bans unchanged.

---

### `tests/core.purity.test.ts` (test, file-I/O)

**Analog:** self — extend in place (lines 1–27)

```typescript
const FORBIDDEN =
  /from\s+['"](react|react-dom|react-native|react-native-.*|@shopify\/react-native-skia.*|expo.*|@react-native.*)['"]|require\(\s*['"](react|react-native|expo)/;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
```

**Copy:** Recursive `walk('src/core')`; assert offenders empty; module-count ≥ 5 (will grow with nested physics — keep threshold).

**Add:** Second regex (or same filter) scanning for `Math.random`, `Date.now`, `performance.now` per D-13.

---

### `tests/core.smoke.test.ts` + physics unit tests (test, request-response)

**Analog:** `tests/core.smoke.test.ts` lines 1–14

```typescript
import { describe, it, expect } from 'vitest';
import { allocateWorld, stepStub } from '../src/core';

describe('core/ runs unchanged in Node', () => {
  it('allocates and mutates a world across steps with no RN runtime', () => {
    const w = allocateWorld(256);
    const x0 = w.x[0];
    stepStub(w, 1 / 120);
    stepStub(w, 1 / 120);
    expect(w.x[0]).not.toBe(x0);
    expect(Number.isFinite(w.x[0])).toBe(true);
  });
});
```

**Copy for all `tests/physics.*.test.ts`:**
- Vitest `describe` / `it` / `expect`
- Import from `../src/core` (barrel)
- Allocate → mutate → assert finite / equality
- No RN mocks; Node environment via `vitest.config.ts`

**Update smoke:** `stepWorld` + ball SoA fields instead of `stepStub` / `w.x`.

---

### `tests/physics.golden-replay.test.ts` (test, batch)

**Analogs:** smoke test (step API) + `useSpikeLoop` accumulator (chunked fixed steps)

**Copy host loop semantics** from `useSpikeLoop.ts` 98–105 into a pure test helper `runChunked(world, intents, chunkSteps)` that only calls `stepWorld(..., FIXED_DT)` — never partial dt.

**Assert:** `hashWorld(a) === hashWorld(b)` across different chunk partitions (RESEARCH golden-replay sketch).

---

### `tests/physics.tunneling.prop.test.ts` (test, batch)

**Analog:** none — `fast-check` / `@fast-check/vitest` not installed yet.

**Wave 0:** install deps; follow RESEARCH property sketch (`test.prop` + `fc.double` angles, speed = `2 * MAX_BALL_SPEED`). Structure still uses Vitest runners like smoke tests.

---

### `src/runtime/useSpikeLoop.ts` (hook, event-driven) — thin migration

**Analog:** self (lines 10–18, 78–105)

```typescript
import { allocateWorld, stepStub, type SpikeWorld } from '../core';
// ...
w = allocateWorld(capacity);
// ...
stepStub(w, fixedDt);
```

**Copy:** Accumulator / max-substep / frame clamp unchanged; allocate on first UI frame into SharedValue.

**Change (minimal compile fix):** Import `World` / `stepWorld`; drop sprite-target mutation and stub drawing dependency if `SpikeWorld` removed; prefer blank/minimal picture until Phase 3 (RESEARCH recommendation). Do **not** expand Phase 2 into paddle gestures.

---

### `src/render/recordSprites.ts` (component, transform) — compile coupling

**Analog:** self — currently typed on `SpikeWorld` (lines 2, 41–42, 59)

```typescript
import type { SpikeWorld } from '../core';
// ...
export function recordFrame(
  world: SpikeWorld,
  // ...
): SkPicture {
  'worklet';
  const n = world.spriteCount;
  for (let i = 0; i < n; i++) {
```

**When World replaces SpikeWorld:** either stub empty recording (no sprite loop) or temporarily map unused arrays — prefer empty field + overlay-only to avoid dual-world types. Keep `'worklet'` + global recorder tools pattern (lines 20–34).

---

### `package.json` (config)

**Analog:** existing `devDependencies` block — add non-native test libs with plain `npm` (same as vitest):

```json
"vitest": "5.0.1",
"@vitest/coverage-v8": "5.0.1"
```

**Add:** `fast-check@4.10.2`, `@fast-check/vitest@0.5.0`. Use Node 24 PATH (`.nvmrc` / `engines`).

## Shared Patterns

### Worklet purity & literal inlining
**Source:** `src/core/allocate.ts` lines 8–9; `src/core/step.ts` lines 8–9; `src/runtime/metrics.ts` lines 5–7, 33–35  
**Apply to:** All new `src/core/**` hot-path functions (`stepWorld`, sweep, resolve, ring push, mulberry32, integrate)

```typescript
'worklet';
// Literals must match constants.ts — worklets cannot close over module consts.
const logicalWidth = 360;
const logicalHeight = 640;
```

### Layer contract (core stays pure)
**Source:** `docs/layer-contract.md` LC-01/LC-06; `eslint.config.js` lines 35–50; `tests/core.purity.test.ts`  
**Apply to:** Every new core module — no React/RN/Skia/Reanimated/Expo; core→core only; simulation pushes event ring, never imports services (LC-09)

### Fixed-timestep host (outside core)
**Source:** `src/runtime/useSpikeLoop.ts` lines 93–105; `src/runtime/constants.ts`  
**Apply to:** Golden-replay test helper; future Phase 3 `useFrameCallback`. Core only accepts exact `FIXED_DT`.

### Deterministic allocation / no Math.random
**Source:** `src/core/allocate.ts` lines 5–6, 26  
**Apply to:** `allocate.ts`, `reset.ts`, `rng/mulberry32.ts`; enforce via ESLint + purity test extension (D-13)

### SoA preallocation + in-place mutation
**Source:** `src/core/types.ts`, `allocate.ts`, `step.ts`  
**Apply to:** World shape, event ring, brick grid — never allocate in `stepWorld`

### Vitest Node smoke style
**Source:** `tests/core.smoke.test.ts`; `vitest.config.ts` (`environment: 'node'`)  
**Apply to:** All new `tests/physics.*.test.ts`

### Circular fixed buffer
**Source:** `src/runtime/metrics.ts` `pushSample`  
**Apply to:** `src/core/events/ring.ts` (move pattern into core World, not runtime)

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/core/hash.ts` | utility | transform | No hashing / golden-replay utilities yet |
| `src/core/physics/sweep.ts` | utility | transform | No CCD / TOI code; only discrete bounce in `stepStub` |
| `src/core/physics/broadphase.ts` | utility | transform | No grid cell walk; brick grid does not exist yet |
| `src/core/physics/resolve.ts` | utility | transform | No paddle english / reflect helpers |
| `src/core/rng/mulberry32.ts` | utility | transform | No PRNG module (only “no Math.random” comments) |
| `tests/physics.tunneling.prop.test.ts` | test | batch | `fast-check` not installed; no property tests yet |

For these six, planner should use `02-RESEARCH.md` Code Examples / Patterns 1–4 as the implementation template while still obeying Shared Patterns (worklet, purity, SoA) from Phase 1 analogs.

## Metadata

**Analog search scope:** `src/core/`, `src/runtime/`, `src/render/`, `tests/`, `eslint.config.js`, `docs/layer-contract.md`, `vitest.config.ts`, `package.json`  
**Files scanned:** ~25 source/config/test files  
**Pattern extraction date:** 2026-09-20  
**Project rules consulted:** `.cursor/rules/gsd.md` (custom physics, Vitest, fixed timestep)  
**Project skills:** none under `.cursor/skills/` or `.agents/skills/`
