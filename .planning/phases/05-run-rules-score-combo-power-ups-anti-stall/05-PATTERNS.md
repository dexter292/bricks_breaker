# Phase 5: Run Rules — Score, Combo, Power-ups, Anti-Stall - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 21
**Analogs found:** 20 / 21

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/core/rules/scoring.ts` | service | event-driven | `src/core/rules/lives.ts` | role-match |
| `src/core/rules/pickups.ts` | service | event-driven + transform | `src/core/rules/lives.ts` + `src/core/allocate.ts` | partial |
| `src/core/rules/effects.ts` | service | transform | `src/core/reset.ts` (effects clear) + `src/core/rules/serve.ts` (derive from `paddleW`) | partial |
| `src/core/rules/multiball.ts` | service | transform | `src/core/rules/serve.ts` | role-match |
| `src/core/rules/stall.ts` | service | event-driven | `src/core/rules/win.ts` | role-match |
| `src/core/rules/lives.ts` | service | transform | `src/core/rules/lives.ts` (rewrite in place) | exact |
| `src/core/rules/serve.ts` | service | transform | `src/core/rules/serve.ts` | exact |
| `src/core/stepRun.ts` | controller | request-response | `src/core/stepRun.ts` | exact |
| `src/core/step.ts` | service | transform | `src/core/step.ts` | exact |
| `src/core/constants.ts` | config | — | `src/core/constants.ts` | exact |
| `src/core/types.ts` | model | — | `src/core/types.ts` | exact |
| `src/core/allocate.ts` | utility | — | `src/core/allocate.ts` | exact |
| `src/core/reset.ts` | utility | — | `src/core/reset.ts` | exact |
| `src/core/hash.ts` | utility | transform | `src/core/hash.ts` | exact |
| `src/core/index.ts` | config | — | `src/core/index.ts` | exact |
| `src/runtime/useGameLoop.ts` | hook | streaming | `src/runtime/useGameLoop.ts` | exact |
| `app/_components/GameHost.tsx` | component | pub-sub | `app/_components/GameHost.tsx` | exact |
| `src/runtime/GameScreen.tsx` | component | request-response | `src/runtime/GameScreen.tsx` | exact |
| `src/render/recordSprites.ts` | utility | transform | `src/render/recordSprites.ts` (`recordFrame`) | exact |
| `tests/rules.scoring.test.ts` | test | — | `tests/rules.lives.test.ts` | role-match |
| `tests/rules.pickups.test.ts` | test | — | `tests/rules.lives.test.ts` | role-match |
| `tests/rules.effects.test.ts` | test | — | `tests/rules.win.test.ts` | role-match |
| `tests/rules.multiball.test.ts` | test | — | `tests/rules.serve.test.ts` | role-match |
| `tests/rules.stall.test.ts` | test | — | `tests/runtime.freeze.test.ts` + `tests/rules.win.test.ts` | partial |
| `tests/rules.lives.test.ts` | test | — | `tests/rules.lives.test.ts` | exact |
| `tests/physics.golden-replay.test.ts` | test | — | `tests/physics.golden-replay.test.ts` | exact |

## Pattern Assignments

### `src/core/rules/scoring.ts` (service, event-driven)

**Analog:** `src/core/rules/lives.ts`

**Imports pattern** (lines 1–3):
```typescript
import type { World } from '../types';
import { EventCode, SimPhase } from '../types';
```

**Core event-ring scan pattern** (lines 9–27) — copy for `BRICK_HIT` / `BRICK_BREAK` / `PADDLE_HIT`:
```typescript
export function applyLivesFromEvents(world: World): void {
  'worklet';
  if (world.simPhase !== SimPhase.PLAYING) {
    return;
  }

  const n = world.evCount;
  if (n <= 0) {
    return;
  }
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % world.evCap;
    // branch on world.evCode[idx]
  }
}
```

**Do not clear the ring** — comment at lines 5–7: `stepRun` / `stepWorld` own clear policy. Score after `stepWorld`, same as lives today.

**Scoring constants** — extend `src/core/constants.ts` with `SCORE_HIT`, `SCORE_BREAK_BONUS` (discretionary values); worklet bodies must **inline literals** (see constants header lines 1–5).

**Event sources already emitted** — `src/core/step.ts` lines 290, 328–344: `PADDLE_HIT`, `BRICK_HIT`, `BRICK_BREAK` (one damage event per brick per step via `brickDamagedThisStep`). Score only from the ring — never re-award inside CCD.

---

### `src/core/rules/pickups.ts` (service, event-driven + transform)

**Analogs:** `src/core/rules/lives.ts` (BREAK drain), `src/core/rng/mulberry32.ts` (drop roll), `src/core/allocate.ts` (SoA pool shape)

**RNG pattern** (`src/core/rng/mulberry32.ts` lines 16–24) — gameplay stream only:
```typescript
export function nextFloat(state: Uint32Array, i: number): number {
  'worklet';
  // ...
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// Usage: nextFloat(world.rngGameplay, 0) — never Math.random / rngCosmetic
```

**SoA pool allocation pattern** (`src/core/allocate.ts` lines 65–66, 125–128) — mirror for pickups:
```typescript
const effectType = new Uint8Array(maxEffects);
const effectUntilTick = new Int32Array(maxEffects);
// return { effectCount: 0, effectType, effectUntilTick, maxEffects, ... }
```
Add parallel `pickupX/Y/Type/Active` + `pickupCount` / `maxPickups` the same way.

**Event drain for BREAK only** — same ring walk as lives; filter `EventCode.BRICK_BREAK` and use `evX`/`evY` as spawn position (`pushEvent` stores them in `src/core/events/ring.ts` lines 21–25).

**AABB catch** — no existing pickup catch; closest geometry is paddle AABB in `src/render/recordSprites.ts` lines 177–186 (`paddleX - halfW`, `paddleY`, `paddleW`, `paddleH`) and bottom miss in `src/core/step.ts` lines 265–268 (`BALL_OUT` when past bottom). Pickup miss: `y > LOGICAL_HEIGHT` → deactivate.

---

### `src/core/rules/effects.ts` (service, transform)

**Analogs:** `src/core/reset.ts` (clear effects), `src/core/rules/serve.ts` (uses `world.paddleW`)

**Effects clear / expire pattern** (`src/core/reset.ts` lines 61–65):
```typescript
world.effectCount = 0;
for (let i = 0; i < world.maxEffects; i++) {
  world.effectType[i] = 0;
  world.effectUntilTick[i] = 0;
}
```

**Derive paddle width — never assign ad hoc.** After refresh/expire:
```typescript
// Pattern from serve.ts line 29: half = world.paddleW * 0.5
// stepRun docked clamp (stepRun.ts lines 28–32) already uses half-width vs LOGICAL_WIDTH
const half = world.paddleW * 0.5;
let x = world.paddleX;
if (x < half) x = half;
else if (x > logicalWidth - half) x = logicalWidth - half;
world.paddleX = x;
```

**English already uses current half-width** — `src/core/step.ts` paddle resolve passes `paddleHalfW` from `world.paddleW` (lines 271–278). Effects only need to set `paddleW` from base × expand.

**World reserve already present** — `src/core/types.ts` lines 87–91: `effectCount`, `effectType`, `effectUntilTick`, `maxEffects`.

---

### `src/core/rules/multiball.ts` (service, transform)

**Analog:** `src/core/rules/serve.ts`

**Imports / worklet / finite guard** (lines 1–26):
```typescript
import type { Intent, World } from '../types';
import { SimPhase } from '../types';
import { resolvePaddleEnglish } from '../physics/resolve';

export function dockBall(world: World): void {
  'worklet';
  // ...
}

export function applyServe(world: World, serveSpeed: number): void {
  'worklet';
  if (!Number.isFinite(serveSpeed) || !(serveSpeed > 0)) {
    return;
  }
  // resolvePaddleEnglish → write ballVx/Vy, ballActive, activeBallCount
}
```

**Spawn slots** — activate unused indices `ballActive[i]===0` up to `maxBalls`; set velocities with fixed angles (inline clamp matching `PADDLE_ANGLE_CLAMP` / `MIN_VERTICAL_RATIO` from `constants.ts` lines 34–44). Do **not** zero existing balls' velocities.

**Cap pattern** — `dockBall` / `applyServe` set `activeBallCount = 1` today (serve.ts lines 15, 39). Multiball must update `activeBallCount` to dense live count after spawn (Phase 5 compact semantics).

---

### `src/core/rules/stall.ts` (service, event-driven)

**Analog:** `src/core/rules/win.ts` (run-level scalar gate)

**Phase + early return** (win.ts lines 18–25):
```typescript
export function applyWinCheck(world: World): void {
  'worklet';
  if (world.simPhase !== SimPhase.PLAYING) {
    return;
  }
  // mutate run-level fields only
}
```

**Reset on breakable damage** — scan ring for `BRICK_HIT`/`BRICK_BREAK` where brick is not `UNBREAKABLE` (`BrickFlags` in types.ts lines 18–20; win.ts already filters unbreakable).

**Freeze gate (do not advance stall outside stepped PLAYING)** — runtime already skips `stepRun` when UI frozen (`useGameLoop.ts` lines 180–194). Stall idle `+= 1` only inside `stepRun` PLAYING path after `stepWorld`. Mirror freeze helpers conceptually from `src/runtime/freeze.ts` `shouldFreezeForUiPhase` — stall must **not** use wall-clock.

**Speed clamp** — `MAX_BALL_SPEED` / `MIN_VERTICAL_RATIO` in `constants.ts` lines 31–44; velocity math style from `resolve.ts` `reflectVelocity` finite checks (lines 18–25).

---

### `src/core/rules/lives.ts` (service, transform) — REWRITE

**Analog:** same file + `serve.dockBall`

**Current (deprecated) pattern** — any `BALL_OUT` → −life (lives.ts lines 22–41). Replace with end-of-step `activeBallCount === 0`.

**Life-reset cleanup** — call `dockBall` when lives remain (lines 36–38); extend D-13: clear pickups, expire expand / derive `paddleW`, deactivate all balls then dock one, **preserve `score` + brick HP**.

**Export rename** — `index.ts` currently exports `applyLivesFromEvents` (line 48); planner should export `applyLivesFromBallCount` (or keep name and change semantics — update all tests).

---

### `src/core/rules/serve.ts` (service, transform) — MODIFY

**Analog:** self

On multi-ball life reset / dock: ensure extras deactivated and `activeBallCount = 1` (already lines 14–15). Preserve score (new World field) — `dockBall` must not touch score/combo/bricks.

---

### `src/core/stepRun.ts` (controller, request-response) — MODIFY

**Analog:** self (orchestration skeleton)

**Current PLAYING path** (lines 39–43):
```typescript
clearEvents(world);
stepWorld(world, intent, dt);
applyLivesFromEvents(world);
applyWinCheck(world);
```

**Extend to** (from RESEARCH Pattern 1):
```typescript
clearEvents(world);
stepWorld(world, intent, dt);
applyScoringFromEvents(world);
applyDropsFromBreaks(world); // or inside pickups module
stepPickups(world, dt);
stepEffects(world);
stepAntiStall(world);
applyLivesFromBallCount(world);
applyWinCheck(world);
```

Keep `'worklet'` + inline literals for width/serve speed (lines 15–17).

---

### `src/core/step.ts` (service, transform) — MODIFY

**Analog:** self — BALL_OUT deactivate without compact (lines 265–268):
```typescript
pushEvent(world, EventCode.BALL_OUT, bi, -1, hx, hy);
world.ballActive[bi] = 0;
```

**Add** swap-with-last (or recount) so `activeBallCount` = live dense count after despawn. Loop currently uses `ballLimit = world.activeBallCount` (line 58) — compact must keep that invariant.

---

### `src/core/constants.ts` / `types.ts` / `allocate.ts` / `reset.ts` / `hash.ts` / `index.ts`

**Analog:** self — extend in place.

**Constants header rule** (constants.ts lines 1–5): worklets inline matching literals.

**Hash extension pattern** (hash.ts lines 89–92) — add score, combo, pickups SoA, stall scalars the same way effects are mixed:
```typescript
h = mixU32(h, world.effectCount);
h = mixTyped(h, world.effectType);
h = mixTyped(h, world.effectUntilTick);
```

**Allocate/reset** — initialize new scalars to 0 / combo to 1; clear pickup SoA like effects (reset.ts lines 61–65).

**Barrel exports** — follow `index.ts` lines 47–49 for new rules modules + new constants.

---

### `src/runtime/useGameLoop.ts` (hook, streaming) — MODIFY

**Analog:** self — Lives mirror

**Options type** (lines 76–78):
```typescript
/** Host-owned mirrors written every frame (in-place World edits are silent). */
livesOut: SharedValue<number>;
simPhaseOut: SharedValue<number>;
```
Add `scoreOut`, `comboOut`, `stallTierOut` the same way.

**Publish every frame** (lines 216–218):
```typescript
livesOut.value = w.lives;
simPhaseOut.value = w.simPhase;
// + scoreOut.value = w.score; comboOut.value = w.combo; stallTierOut.value = w.stallTier;
```

**Freeze already skips stepRun** (lines 186–194) — stall timer stays correct if stall only runs inside `stepRun`.

---

### `app/_components/GameHost.tsx` (component, pub-sub) — MODIFY

**Analog:** self — Lives SharedValue chrome

**State + SV** (lines 54, 66):
```typescript
const [lives, setLives] = useState(3);
const livesSv = useSharedValue(3);
```

**Pass into loop** (line 107): `livesOut: livesSv`

**Packed reaction + runOnJS** (lines 143–168):
```typescript
const applyWorldChrome = useCallback(
  (phase: number, livesCount: number) => {
    setSimPhaseNum(phase);
    setLives(livesCount);
    // ...
  },
  [setActive],
);

useAnimatedReaction(
  () => (simPhaseSv.value << 8) | (livesSv.value & 0xff),
  (packed, prev) => {
    if (prev === null || packed !== prev) {
      runOnJS(applyWorldChrome)(phase, livesCount);
    }
  },
);
```
Extend packing or add separate reactions for score/combo/stallTier (prefer separate reactions if packing overflows 32-bit comfort).

---

### `src/runtime/GameScreen.tsx` (component, request-response) — MODIFY

**Analog:** self — Lives HUD text

**Props + display** (lines 22, 105–106):
```typescript
lives: number;
// ...
<Text pointerEvents="none" style={styles.lives}>
  {`Lives · ${lives}`}
</Text>
```
Clone for `Score · ${score}`, combo indicator, `Stall! · ${tier}` in the same `styles.hud` row (lines 93–106).

---

### `src/render/recordSprites.ts` (utility, transform) — MODIFY

**Analog:** self — `recordFrame` brick/paddle draw

**Flat rect draw** (lines 145–186): fill color + `entityRect.setXYWH` + `canvas.drawRect`. Add pickup loop over active pickup SoA the same way as bricks (skip inactive). Paddle already uses `world.paddleW` — expanded width draws automatically once effects derive width.

**No neon** — colors stay flat hex (`Skia.Color('#FFFFFF')` style); Phase 7 owns glow.

---

### `tests/rules.scoring.test.ts` (+ pickups / effects / multiball / stall) (test)

**Analog:** `tests/rules.lives.test.ts` + `tests/rules.win.test.ts`

**Fixture bootstrap** (lives.test.ts lines 19–27):
```typescript
const w = allocateWorld();
resetWorld(w, 1, 2);
w.simPhase = SimPhase.PLAYING;
clearEvents(w);
pushEvent(w, EventCode.BALL_OUT, 0, -1, 180, 640);
applyLivesFromEvents(w);
expect(w.lives).toBe(2);
```

**Integration via stepRun** (lives.test.ts lines 51–74): drive physics until phase change.

**Win-style grid** (win.test.ts lines 20–24): `loadTestGrid` for brick HP scenarios.

**Determinism / hash** — extend `tests/physics.golden-replay.test.ts` pattern (`hashWorld` after chunked steps, lines 28–38).

**Freeze assertion for stall** — `tests/runtime.freeze.test.ts` proves pause freezes UI; stall unit tests should step `stepRun` N times vs skip steps and assert idle counter unchanged.

---

### `tests/rules.lives.test.ts` (test) — UPDATE

**Analog:** self — rewrite expectations from “any BALL_OUT → −life” to “life only when `activeBallCount === 0`”; add multi-ball miss-one-ball-no-life + life-reset preserves score/bricks/clears pickups.

## Shared Patterns

### Worklet purity + inline constants
**Source:** `src/core/constants.ts` lines 1–5; `src/core/stepRun.ts` lines 15–17  
**Apply to:** All `core/rules/*`, `step.ts`, `stepRun.ts`  
```typescript
'worklet';
// Literals must match constants.ts — worklets cannot close over module consts.
const logicalWidth = 360;
```

### Event-ring drain (do not clear inside rules)
**Source:** `src/core/rules/lives.ts` lines 5–27; `src/core/events/ring.ts`  
**Apply to:** scoring, pickups (BREAK), stall reset, (legacy lives)  
Scan with `(evHead - evCount + evCap) % evCap`; leave `clearEvents` to `stepRun`.

### Dual PRNG — gameplay only for drops
**Source:** `src/core/rng/mulberry32.ts`; World slots in `allocate.ts` lines 68–71  
**Apply to:** `pickups.ts` drop rolls only  
```typescript
nextFloat(world.rngGameplay, 0);
```

### SharedValue chrome mirrors (never per-frame React)
**Source:** `useGameLoop.ts` 216–218 + `GameHost.tsx` 160–168 + `GameScreen.tsx` 105–106  
**Apply to:** Score, combo, Stall!  
Loop writes SV → `useAnimatedReaction` → `runOnJS` → React text.

### Derive paddle width from base + effects
**Source:** `serve.ts` / `step.ts` use `world.paddleW * 0.5`; `reset.ts` restores `paddleW = 72`  
**Apply to:** effects expire/refresh/life-reset  
Never leave expand stuck; clamp `paddleX` after width change (`stepRun.ts` 28–32).

### Ball pool + last-ball life
**Source:** Current gap in `step.ts` 265–268 + `lives.ts` 22–41  
**Apply to:** `step.ts` compact, `multiball.ts`, rewritten `lives.ts`  
`activeBallCount === 0` after step → −1 life; individual `BALL_OUT` while others live → no life loss.

### Fixed-timestep freeze
**Source:** `useGameLoop.ts` 180–194; `freeze.ts` `shouldFreezeForUiPhase`  
**Apply to:** stall idle counter  
Only advance stall when `stepRun` actually runs in PLAYING.

### Vitest Node core tests
**Source:** `tests/rules.lives.test.ts`, `tests/rules.win.test.ts`  
**Apply to:** all new `tests/rules.*.test.ts`  
Import from `../src/core`; `allocateWorld` + `resetWorld` + optional `pushEvent` / `stepRun`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Pickup SoA + AABB catch (inside `pickups.ts`) | service | transform | No falling-entity pool exists yet — closest is effects SoA shape + paddle AABB draw; implement from RESEARCH AABB snippet |
| Stall tier magnitude tables | service | transform | No prior anti-stall module — use `win.ts` gate shape + `resolve.ts` velocity clamps |

*(File-level rows above still have role-match analogs; these are the greenfield *behaviors* inside those files.)*

## Metadata

**Analog search scope:** `src/core/**`, `src/runtime/**`, `src/render/**`, `app/_components/**`, `tests/**`, `.cursor/rules/`  
**Files scanned:** ~70 TS/TSX under `src/` + 20 test files  
**Pattern extraction date:** 2026-09-20
