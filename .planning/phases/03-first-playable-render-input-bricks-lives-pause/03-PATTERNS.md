# Phase 3: First Playable — Render, Input, Bricks, Lives, Pause - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 24
**Analogs found:** 18 / 24

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/core/types.ts` | model | transform | `src/core/types.ts` (extend) | exact |
| `src/core/allocate.ts` | service | transform | `src/core/allocate.ts` | exact |
| `src/core/reset.ts` | service | transform | `src/core/reset.ts` | exact |
| `src/core/index.ts` | config | — | `src/core/index.ts` | exact |
| `src/core/rules/serve.ts` | service | event-driven | `src/core/physics/resolve.ts` + `src/core/physics/integrate.ts` | role-match |
| `src/core/rules/lives.ts` | service | event-driven | `src/core/step.ts` (BALL_OUT) + `src/core/events/ring.ts` | role-match |
| `src/core/rules/win.ts` | utility | transform | `src/core/step.ts` (BrickFlags / HP) | partial |
| `src/core/levels/phase3Grid.ts` | service | batch | `src/core/reset.ts` (`loadTestGrid`) | role-match |
| `src/core/stepRun.ts` (or rules orchestrator) | service | event-driven | `src/core/step.ts` | role-match |
| `src/input/paddleIntent.ts` (pure helpers) | utility | transform | *(none — extract for Node tests)* | none |
| `src/input/usePaddleGesture.ts` | hook | event-driven | *(none — first RNGH file)*; host chrome from `SpikeScreen` | none / partial |
| `src/input/gestureGates.ts` (pure predicates) | utility | transform | *(none)* | none |
| `src/render/camera.ts` | utility | transform | `src/render/recordSprites.ts` (LOGICAL_W/H scale) | partial |
| `src/render/colors.ts` | config | — | `src/render/recordSprites.ts` (`#1a1a2e`) + UI-SPEC | partial |
| `src/render/recordSprites.ts` | service | transform | `src/render/recordSprites.ts` | exact |
| `src/render/GameCanvas.tsx` | component | streaming | `src/render/SpikeCanvas.tsx` | exact |
| `src/runtime/useGameLoop.ts` | hook | event-driven | `src/runtime/useSpikeLoop.ts` | exact |
| `src/runtime/GameScreen.tsx` | component | event-driven | `src/runtime/SpikeScreen.tsx` | exact |
| `src/runtime/overlays/PauseOverlay.tsx` | component | request-response | `src/runtime/SpikeScreen.tsx` (Pressable chrome) | role-match |
| `src/runtime/overlays/CountdownOverlay.tsx` | component | request-response | `src/runtime/SpikeScreen.tsx` | role-match |
| `src/runtime/overlays/ResultOverlay.tsx` | component | request-response | `src/runtime/SpikeScreen.tsx` | role-match |
| `src/runtime/freeze.ts` (pure accumulator helpers) | utility | transform | `src/runtime/useSpikeLoop.ts` (clamp/reset) | partial |
| `app/index.tsx` | route | request-response | `app/index.tsx` | exact |
| `tests/rules.*.test.ts` / `tests/input.*.test.ts` / `tests/levels.*.test.ts` / `tests/runtime.*.test.ts` | test | batch | `tests/physics.bricks.test.ts`, `tests/physics.paddle.test.ts`, `tests/core.smoke.test.ts` | role-match |

## Pattern Assignments

### `src/core/types.ts` (model, transform)

**Analog:** `src/core/types.ts` (extend in place)

**Imports / enum pattern** (lines 1–26):
```typescript
export const EventCode = {
  WALL_HIT: 1,
  PADDLE_HIT: 2,
  BRICK_HIT: 3,
  BRICK_BREAK: 4,
  BALL_OUT: 5,
} as const;

export const BrickFlags = {
  UNBREAKABLE: 1,
} as const;

export type Intent = {
  paddleX: number;
  launch: number; // Phase 3: consume once while docked
};
```

**Core pattern — extend World + Intent (do not replace SoA):**
- Add `lives: number` and `simPhase: number` (`docked=0`, `playing=1`, `won=2`, `lost=3`) on `World`.
- Keep `Intent.paddleX` as **absolute virtual paddle center** (Phase 2 contract).
- Add numeric `SimPhase` const object beside `EventCode` / `BrickFlags` (same style).

---

### `src/core/allocate.ts` / `src/core/reset.ts` (service, transform)

**Analog:** `src/core/allocate.ts`, `src/core/reset.ts`

**Core allocate return shape** (`allocate.ts` lines 103–144): return one object with all SoA fields + scalars; initialize `accumulator: 0`, `tick: 0`, empty bricks.

**Reset in-place zero-alloc** (`reset.ts` lines 8–70):
```typescript
export function resetWorld(
  world: World,
  seedGameplay: number,
  seedCosmetic: number,
): void {
  'worklet';
  // ... mutate paddle / balls / bricks / rng / tick / accumulator / events
}
```

**Phase 3 deltas to copy style from:**
- After reset: set `lives = 3`, `simPhase = docked`, ball docked (`vx=vy=0`, `active=1`, snap above paddle) — **do not** keep free-flying seed velocity from Phase 2 (`ballVx[0]=120`, `ballVy[0]=-360` at lines 36–38).
- Call `loadPhase3Grid(world)` (or `loadTestGrid`-compatible loader) after clear.

**Brick load analog** (`reset.ts` lines 85–105):
```typescript
export function loadTestGrid(world: World, bricks: TestBrickSpec[]): void {
  'worklet';
  // fill brickX/Y/W/H/Hp/Flags + cellToBrick; set brickCount
}
```

---

### `src/core/rules/serve.ts` (service, event-driven)

**Analog:** `src/core/physics/resolve.ts` (`resolvePaddleEnglish`) + `src/core/physics/integrate.ts`

**Imports pattern:**
```typescript
import type { World } from '../types';
import { resolvePaddleEnglish } from '../physics/resolve';
```

**Worklet + finite guards** (`resolve.ts` lines 64–80):
```typescript
export function resolvePaddleEnglish(
  ballX: number,
  paddleCx: number,
  paddleHalfW: number,
  vx: number,
  vy: number,
): { vx: number; vy: number } {
  'worklet';
  if (
    !Number.isFinite(ballX) ||
    !Number.isFinite(paddleCx) ||
    !Number.isFinite(paddleHalfW) ||
    !Number.isFinite(vx) ||
    !Number.isFinite(vy)
  ) {
    return { vx, vy };
  }
  // ...
}
```

**Core serve pattern (from RESEARCH; copy english call site from `step.ts` 255–264):**
```typescript
export function applyServe(world: World, serveSpeed: number): void {
  'worklet';
  const bi = 0;
  const half = world.paddleW * 0.5;
  const out = resolvePaddleEnglish(
    world.ballX[bi],
    world.paddleX,
    half,
    0,
    -serveSpeed,
  );
  world.ballVx[bi] = out.vx;
  world.ballVy[bi] = out.vy;
  world.ballActive[bi] = 1;
  world.activeBallCount = 1;
}
```

**Dock each step while `simPhase === docked`:** snap `ballX/Y` to paddle top; force `vx=vy=0`. On `intent.launch` edge → `applyServe` → `simPhase = playing`. No `Math.random()` (purity — `tests/core.purity.test.ts`).

---

### `src/core/rules/lives.ts` / `src/core/rules/win.ts` (service / utility, event-driven)

**Analog:** `src/core/step.ts` event push + `BrickFlags`; `src/core/events/ring.ts`

**Event ring drain pattern** (tests already reverse-walk ring — `tests/physics.bricks.test.ts` lines 19–28):
```typescript
function eventCodes(world: ReturnType<typeof allocateWorld>): number[] {
  const codes: number[] = [];
  const n = world.evCount;
  const start = (world.evHead - n + world.evCap) % world.evCap;
  for (let i = 0; i < n; i++) {
    codes.push(world.evCode[(start + i) % world.evCap]);
  }
  return codes;
}
```

**BALL_OUT producer** (`step.ts` lines 249–252):
```typescript
if (bestKind === KIND_BOTTOM) {
  pushEvent(world, EventCode.BALL_OUT, bi, -1, hx, hy);
  world.ballActive[bi] = 0;
  break;
}
```

**Unbreakable check** (`step.ts` lines 307–308):
```typescript
const unbreakable =
  (world.brickFlags[bIdx] & BrickFlags.UNBREAKABLE) !== 0;
```

**Lives core pattern:** after `stepWorld` (or inside `stepRunRules`), scan ring for `EventCode.BALL_OUT` → `lives--`; if `lives > 0` re-dock else `simPhase = lost`.  
**Win core pattern:** on `BRICK_BREAK` (or end-of-step), `countBreakableAlive` = bricks with `hp > 0` and `(flags & UNBREAKABLE) === 0`; if zero → `simPhase = won`.

**Ring clear** (`ring.ts` lines 30–36): prefer `clearEvents` at start of step or after consume — match Phase 2 test habit of `clearEvents` before asserting.

---

### `src/core/levels/phase3Grid.ts` (service, batch)

**Analog:** `src/core/reset.ts` `loadTestGrid` + `TestBrickSpec`

**Core pattern:**
```typescript
export type TestBrickSpec = {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  unbreakable?: boolean;
};

export function loadTestGrid(world: World, bricks: TestBrickSpec[]): void {
  'worklet';
  // mutate SoA only — no allocation
}
```

**Phase 3:** export `loadPhase3Grid(world)` that fills multi-HP (≥2 HP values) + ≥1 unbreakable via same SoA fields. Prefer calling `loadTestGrid` internally or duplicating its loop. Keep `'worklet'` + no platform imports.

---

### `src/core/stepRun.ts` (or `stepRunRules`) (service, event-driven)

**Analog:** `src/core/step.ts` entry signature

**Core pattern** (`step.ts` lines 19–49):
```typescript
export function stepWorld(world: World, intent: Intent, dt: number): void {
  'worklet';
  // Intent guard: only apply finite paddleX; clamp to field
  const px = intent.paddleX;
  if (Number.isFinite(px)) {
    const half = world.paddleW * 0.5;
    let x = px;
    if (x < half) x = half;
    else if (x > logicalWidth - half) x = logicalWidth - half;
    world.paddleX = x;
  }
  // ...
}
```

**Phase 3 orchestrator:** one exported `stepRun(world, intent, dt)` that:
1. If `docked` → dock + maybe launch; skip CCD until playing
2. If `playing` → `stepWorld` then drain events → lives/win
3. If `won`/`lost` → no-op (or freeze physics)

Do **not** put AppState / wall-clock pause inside core.

**Barrel export** — extend `src/core/index.ts` the same way Phase 2 exports `stepWorld` / `resolvePaddleEnglish`.

---

### `src/input/paddleIntent.ts` + `src/input/gestureGates.ts` (utility, transform)

**Analog:** none in repo (first input layer). Closest *math* style: clamp + finite guards in `step.ts` / `resolve.ts`.

**Extract pure helpers for Vitest Node** (Wave 0 — RESEARCH):
```typescript
// No RNGH / Reanimated imports — Node-testable
export function computeRelativePaddleX(args: {
  anchorPaddleX: number;
  translationXPx: number;
  camScale: number;
  gain: number;
  prevTarget: number;
  smoothAlpha: number;
  paddleHalfW: number;
  logicalWidth: number; // pass 360 — input cannot import core (eslint)
}): number { /* clamp */ }

export function shouldAcceptServeTap(args: {
  simPhaseDocked: boolean;
  uiPaused: boolean;
  countdown: boolean;
  panActive: boolean;
}): boolean { /* ... */ }
```

**ESLint constraint (critical):** `input` may import only `runtime` + `input` — **not** `core`. Pass `logicalWidth` / half-width as args or inline `360`.

---

### `src/input/usePaddleGesture.ts` (hook, event-driven)

**Analog:** none for Gesture Handler. **Host chrome** from `SpikeScreen.tsx` (Pressable outside hot path).

**Composition boundary (LC-05 / eslint):**
- `runtime` **cannot** import `input`.
- `app` **can** import `runtime` + `input`.
- Wire: `app/index.tsx` (or a thin app host) owns `useGameLoop` + `usePaddleGesture` and passes SharedValues / gesture into `GameScreen`, **or** `GameScreen` lives under `app/` and imports both. Do not invent `runtime → input`.

**Gesture scheme to implement** (from RESEARCH / UI-SPEC — no in-repo sample):
```typescript
import { Gesture } from 'react-native-gesture-handler';

const pan = Gesture.Pan()
  .enabled(gesturesEnabled)
  .minDistance(6)
  .onBegin(() => { 'worklet'; /* snapshot paddleTarget — never finger×scale */ })
  .onUpdate((e) => { 'worklet'; /* relative write via computeRelativePaddleX */ })
  .onFinalize(() => { 'worklet'; panActive.value = false; });

const tap = Gesture.Tap()
  .enabled(serveEnabled)
  .maxDistance(10)
  .onEnd(() => {
    'worklet';
    if (panActive.value) return;
    launchFlag.value = 1;
  });

const playfieldGesture = Gesture.Race(pan, tap);
```

**Never:** absolute finger X → paddle; Resume via playfield tap; `runOnJS` on pan update.

---

### `src/render/camera.ts` (utility, transform)

**Analog:** `src/render/recordSprites.ts` logical constants + scale (currently stretch)

**Current stretch to replace** (`recordSprites.ts` lines 6–8, 57–58):
```typescript
const LOGICAL_W = 360;
const LOGICAL_H = 640;
// ...
canvas.scale(wPx / LOGICAL_W, hPx / LOGICAL_H);
```

**Target pattern (RESEARCH / ARCHITECTURE):**
```typescript
export function makeCamera(safeW: number, safeH: number) {
  'worklet';
  const scale = Math.min(safeW / 360, safeH / 640);
  return {
    scale,
    ox: (safeW - 360 * scale) * 0.5,
    oy: (safeH - 640 * scale) * 0.5,
  };
}
```

Letterbox bars = black (`Fill` / clear); navy only inside 360×640 field.

---

### `src/render/colors.ts` (config)

**Analog:** hardcoded `#1a1a2e` in `recordSprites.ts` line 30 / UI-SPEC palette

```typescript
export const FIELD_NAVY = '#1a1a2e';
export const LETTERBOX_BLACK = '#000000';
export const BALL_PADDLE = '#FFFFFF';
// brick HP fills from 03-UI-SPEC
```

Do **not** reuse cliff-ramp cyan `#00ffaa` for gameplay (`SpikeScreen` / `recordOverlay` — dev-only).

---

### `src/render/recordSprites.ts` (service, transform)

**Analog:** itself — evolve `recordFrame`

**Recorder tools on UI global** (`recordSprites.ts` lines 18–35, 41–73):
```typescript
declare const global: typeof globalThis & { __spikeRecorderTools?: RecorderTools };

function ensureRecorderTools(): RecorderTools {
  'worklet';
  let tools = global.__spikeRecorderTools;
  if (!tools) {
    tools = { /* PictureRecorder, Paint, rects, colorBuf */ };
    global.__spikeRecorderTools = tools;
  }
  return tools;
}

export function recordFrame(...): SkPicture {
  'worklet';
  // beginRecording → draw → finishRecordingAsPicture
}
```

**Phase 3 draw order:** black letterbox → `translate(ox,oy)` + uniform `scale` → navy field → bricks (by HP/flags colors) → paddle → ball. Keep optional `drawOverlay` behind `PERF_OVERLAY`. Read-only world (LC-08) — never mutate SoA here.

---

### `src/render/GameCanvas.tsx` (component, streaming)

**Analog:** `src/render/SpikeCanvas.tsx` (rename or thin re-export)

```typescript
export function SpikeCanvas({ picture, onSize }: Props) {
  return (
    <Canvas style={styles.canvas} opaque onSize={onSize}>
      <Fill color="black" />
      <Picture picture={picture} />
    </Canvas>
  );
}
// absolute fill; opaque; lowest z-order
```

Keep `opaque` + black `Fill`. Rename export to `GameCanvas` per UI-SPEC.

---

### `src/runtime/useGameLoop.ts` (hook, event-driven)

**Analog:** `src/runtime/useSpikeLoop.ts`

**Imports + allocate-on-first-frame** (lines 1–19, 70–116):
```typescript
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { allocateWorld, stepWorld, type World } from '../core';
import { recordFrame } from '../render/recordSprites';

useFrameCallback((frame) => {
  'worklet';
  let w = world.value;
  if (!w) {
    w = allocateWorld();
    world.value = w;
  }
  let dt = (frame.timeSincePreviousFrame ?? 16.67) / 1000;
  if (dt > maxFrameTime) dt = maxFrameTime;
  w.accumulator += dt;
  let steps = 0;
  while (w.accumulator >= fixedDt && steps < maxSubsteps) {
    stepWorld(w, { paddleX: w.paddleX, launch: 0 }, fixedDt);
    w.accumulator -= fixedDt;
    steps += 1;
  }
  if (steps === maxSubsteps) {
    w.accumulator = 0;
  }
  picture.value = recordFrame(/* ... */);
});
```

**Phase 3 deltas:**
- Intent from SharedValues: `{ paddleX: paddleTarget.value, launch: launchFlag.value }` then clear launch edge.
- Call `stepRun` (rules + world) instead of bare `stepWorld`.
- Expose `frameCallback.setActive` / freeze: when paused/countdown/won/lost → `setActive(false)` + `accumulator = 0`.
- First frame after reactivate: `timeSincePreviousFrame` may be `null` → treat as `16.67` (already patterned).
- Pass camera/safe size into `recordFrame` (not stretch window).

**AppState listener** (no in-repo sample — RN core): on `inactive`/`background` → freeze + React pause UI; on `active` → **do not** `setActive(true)`.

---

### `src/runtime/GameScreen.tsx` (component, event-driven)

**Analog:** `src/runtime/SpikeScreen.tsx`

**Host pattern** (lines 17–54):
```typescript
export function SpikeScreen() {
  useKeepAwake();
  const hudFont = useFont(require('../../assets/fonts/SpaceMono-Regular.ttf'), 16);
  const { picture, surfaceSize /* ... */ } = useSpikeLoop(/* ... */);

  return (
    <View style={styles.root}>
      <SpikeCanvas picture={picture} onSize={surfaceSize} />
      {/* chrome AFTER canvas — z-order over opaque SurfaceView */}
      {CLIFF_RAMP ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ramp sprite count"
          onPress={onCliffRamp}
          style={styles.cliffButton}
        >
          <Text style={styles.cliffLabel}>Cliff +{CLIFF_STEP}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
```

**Phase 3:** keep canvas lowest; add Pause chrome + overlays after canvas; SpaceMono for overlay text (UI-SPEC); `useSafeAreaInsets` for letterbox content box; replace cliff button with Pause / lives label. GestureDetector: prefer composition from `app/` if eslint blocks `runtime → input`.

**SharedValue write from JS Pressable** (lines 32–38) — safe pattern for Pause/Resume discrete actions (not per-frame).

---

### `src/runtime/overlays/*.tsx` (component, request-response)

**Analog:** `SpikeScreen` Pressable + StyleSheet (no dedicated overlay files yet)

**Copy:**
- `Pressable` + `accessibilityLabel` (`"Resume game"`, `"Retry level"`, `"Pause game"` — UI-SPEC)
- Absolute positioning over canvas; scrim `#000000` @ 60%; panel `#12121f`; accent white CTAs
- `pointerEvents` on full-screen catcher while paused/countdown/results so canvas does not receive serve taps
- Discrete React state only (LC-11) — no per-frame setState
- Colocate under `runtime/overlays/` (eslint: runtime cannot import `ui/`)

---

### `src/runtime/freeze.ts` (utility, transform)

**Analog:** accumulator clamp/reset in `useSpikeLoop.ts` lines 83–96

```typescript
if (dt > maxFrameTime) dt = maxFrameTime;
// ...
if (steps === maxSubsteps) {
  w.accumulator = 0;
}
```

**Extract pure helpers for tests:** `resetAccumulator(world)`, `shouldFreezeForUiPhase(phase)`, `clampFrameDt(dt, maxFrameTime)` — no AppState import in Vitest.

---

### `app/index.tsx` (route, request-response)

**Analog:** `app/index.tsx`

```typescript
import { SpikeScreen } from '../src/runtime/SpikeScreen';

export default function Index() {
  return <SpikeScreen />;
}
```

**Phase 3:** mount `GameScreen` (and/or compose `usePaddleGesture` here to satisfy LC-05 / eslint). Safe-area provider already expected from Expo template / dependency — wire insets into screen.

---

### Wave 0 tests (test, batch)

**Analogs:** `tests/physics.bricks.test.ts`, `tests/physics.paddle.test.ts`, `tests/core.smoke.test.ts`, `tests/core.purity.test.ts`

**Imports pattern:**
```typescript
import { describe, it, expect } from 'vitest';
import {
  allocateWorld,
  resetWorld,
  loadTestGrid,
  stepWorld,
  clearEvents,
  FIXED_DT,
  EventCode,
  BrickFlags,
} from '../src/core';
```

**Patterns to copy:**
- Allocate → reset → mutate fixtures → step loop → assert events / SoA
- Pure function unit tests for english clamps (`physics.paddle.test.ts`) — mirror for serve/gates/paddle-intent helpers
- Purity walk remains green for new `core/rules/**` and `core/levels/**`
- **Do not** put RNGH/Skia component tests in Node Vitest this phase

| Wave 0 file | Closest analog |
|-------------|----------------|
| `tests/rules.serve.test.ts` | `physics.paddle.test.ts` + dock fixtures |
| `tests/rules.lives.test.ts` | `physics.bricks.test.ts` event drain |
| `tests/rules.win.test.ts` | `physics.bricks.test.ts` unbreakable |
| `tests/levels.phase3-grid.test.ts` | `loadTestGrid` usage in bricks tests |
| `tests/input.paddle-intent.test.ts` | pure helper tests like paddle english |
| `tests/input.gesture-gates.test.ts` | predicate-only unit tests |
| `tests/runtime.freeze.test.ts` | smoke + accumulator asserts |
| `tests/runtime.accumulator-reset.test.ts` | clamp/reset helpers |

## Shared Patterns

### Layer boundaries (LC-*)
**Source:** `docs/layer-contract.md`, `eslint.config.js` lines 99–170  
**Apply to:** all Phase 3 files

| Rule | Implication for Phase 3 |
|------|-------------------------|
| LC-01 | `core/rules/*`, `core/levels/*` — no React/RN/Skia/Reanimated |
| LC-02 | `useGameLoop` calls `stepRun` / `allocateWorld` directly (`'worklet'`) |
| LC-03 | `recordFrame` reads World only |
| LC-05 | `input` writes SharedValues; **runtime must not import input** — compose in `app/` |
| LC-07 | No `runOnJS` / `scheduleOnRN` on hot path; overlays use discrete React state |
| LC-11 | Lives/win/lose React updates only on phase transitions |
| LC-12 | Loop calls `recordFrame` from runtime |

```javascript
// eslint: input may depend on runtime|input only — not core
{
  from: { element: { type: 'input' } },
  allow: {
    to: { element: { types: { anyOf: ['runtime', 'input'] } } },
  },
},
```

### Worklet purity
**Source:** `src/core/step.ts`, `resolve.ts`, `integrate.ts`  
**Apply to:** all `core/` Phase 3 modules

- Leading `'worklet';`
- Inline numeric literals matching `constants.ts` (do not close over module consts in worklet bodies)
- `Number.isFinite` guards on intent / velocities
- Zero heap alloc in hot paths

### Fixed-timestep accumulator
**Source:** `src/runtime/useSpikeLoop.ts` lines 83–96 + `src/runtime/constants.ts`  
**Apply to:** `useGameLoop`, freeze helpers

- `FIXED_DT = 1/120`, `MAX_SUBSTEPS = 5`, `MAX_FRAME_TIME = 0.25`
- Never integrate leftover partial dt
- On pause/background: `setActive(false)` + `accumulator = 0` — never catch up

### Opaque canvas z-order
**Source:** `SpikeCanvas.tsx` + `SpikeScreen.tsx`  
**Apply to:** `GameCanvas` + overlays

- Canvas `position: 'absolute'` fill, `opaque`
- All React chrome **after** canvas in JSX
- Root `backgroundColor: '#000'`

### Intent contract
**Source:** `src/core/types.ts`, `useSpikeLoop.ts` line 90  
**Apply to:** input → loop → core

- `Intent.paddleX` = absolute virtual paddle center
- Relative-drag math lives in `input/`; core only clamps finite `paddleX`
- `launch` consumed once while docked; clear flag after edge

### Testing
**Source:** `vitest.config.ts`, `tests/physics.*.test.ts`  
**Apply to:** Wave 0 suite

- `environment: 'node'`, includes `tests/**/*.test.ts` and `src/core/**/*.test.ts`
- Import from `../src/core` barrel
- Extract pure helpers so input/runtime policies are unit-tested without RN

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/input/usePaddleGesture.ts` | hook | event-driven | No Gesture Handler usage in repo yet; implement from RESEARCH + UI-SPEC Race/Pan/Tap scheme |
| `src/input/paddleIntent.ts` | utility | transform | No relative-drag helper; invent pure function + Vitest |
| `src/input/gestureGates.ts` | utility | transform | No mode-gate predicates yet |
| AppState pause wiring | hook | event-driven | No `AppState` listener in repo; follow RESEARCH Pattern 5 + RN docs |
| `src/runtime/overlays/*` visual layout | component | request-response | No pause/win/lose UI yet — copy Pressable/a11y from SpikeScreen; tokens from `03-UI-SPEC.md` |
| Countdown JS timers | component | request-response | No countdown pattern in repo |

Planner should use `03-RESEARCH.md` Code Examples + `03-UI-SPEC.md` for these gaps.

## Metadata

**Analog search scope:** `src/core/**`, `src/runtime/**`, `src/render/**`, `app/**`, `tests/**`, `docs/layer-contract.md`, `eslint.config.js`  
**Files scanned:** ~34 TS/TSX sources + key tests  
**Pattern extraction date:** 2026-09-20  
**Rename note:** CONTEXT leaves Spike→Game rename to discretion; UI-SPEC names `GameScreen` / `GameCanvas` — prefer rename with thin re-exports if needed.
