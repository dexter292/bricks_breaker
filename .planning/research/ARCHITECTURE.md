# Architecture Research

**Domain:** Real-time 2D arcade game (brick breaker) on React Native + Expo + Skia, custom deterministic physics
**Researched:** 2026-09-19
**Confidence:** HIGH on rendering/threading mechanics (official Skia + Reanimated/Worklets docs); MEDIUM on the "whole simulation in a worklet" recommendation (inferred from documented primitives, not from a published RN game case study — see [Validation Gates](#validation-gates))

---

## The One Decision That Shapes Everything

**Which thread runs the simulation?**

React Native has two JavaScript runtimes: the **RN runtime** (JS thread — React, business logic) and the **UI runtime** (UI thread — Reanimated worklets). Skia draws on its own render thread but reads its scene from the UI thread.

There are three viable topologies. Pick one now, because it is not cheaply reversible:

| Topology | Input → Render latency | Robust under JS load? | Cost |
|----------|------------------------|-----------------------|------|
| **A. Sim on JS thread (`requestAnimationFrame`), render on UI thread** | 1–2 frames, worse under load | No — React renders, asset decode, and GC stall the sim | Low. Plain TS everywhere, no worklet constraints |
| **B. Sim on UI thread in a worklet, render on UI thread** ← **recommended** | Sub-frame; input, sim, and draw all in one UI-thread pass | Yes — JS thread can stall without dropping a frame | Sim modules must be worklet-compatible (`'worklet'` directives, no cross-runtime object capture) |
| C. Sim on a dedicated worklet runtime (`createWorkletRuntime`) | Adds a hop back to UI thread | Yes | Highest complexity; buys nothing for a game this small |

**Recommend B.** The project's stated feel target is "~40% arcade punchy — snappy paddle, precise collisions." Paddle input already arrives on the **UI thread** via Gesture Handler, and Skia already draws from the **UI thread**. Putting the simulation anywhere else means the input has to round-trip to the JS thread and back, adding latency that gets worse exactly when the app is busiest. Topology B keeps the entire hot path — gesture → physics → draw-command recording — inside a single UI-thread frame, with zero React reconciliation and zero cross-runtime traffic.

The price is a real constraint on the simulation code: every exported function the loop calls must carry a `'worklet'` directive, and the world state must be created on the UI runtime. This is cheap if established in the first phase and expensive to retrofit later, which is why the [build order](#recommended-build-order) puts a thread-boundary spike before anything else.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  RN RUNTIME (JS thread)  —  cold path, runs at UI cadence, never 60 Hz   │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │  Screens   │  │  HUD/Menus │  │  Services  │  │  Platform Seams    │  │
│  │ (Expo      │  │ (React +   │  │  audio     │  │  ads / iap /       │  │
│  │  Router)   │  │  RN views) │  │  haptics   │  │  accounts (stubs)  │  │
│  └─────┬──────┘  └─────┬──────┘  │  storage   │  └────────────────────┘  │
│        │               │         └──────▲─────┘                          │
│        │               │                │ batched event drain (≤1/frame) │
│        │    ┌──────────┴────────┐       │                                │
│        │    │  Level Loader +   │       │                                │
│        │    │  Compiler (JSON→  │       │                                │
│        │    │  typed arrays)    │       │                                │
│        │    └──────────┬────────┘       │                                │
└────────────────────────┼────────────────┼────────────────────────────────┘
        commands ↓       │ compiled level │ ↑ scheduleOnRN (batched)
════════════════════════ RUNTIME BOUNDARY ════════════════════════════════
┌────────────────────────┼────────────────┼────────────────────────────────┐
│  UI RUNTIME (UI thread) —  hot path, every frame                         │
├────────────────────────┼────────────────┼────────────────────────────────┤
│  ┌──────────────┐      │                │                                │
│  │ Input Layer  │      ▼                │                                │
│  │ Gesture.Pan  │──► paddleIntent ──┐   │                                │
│  │ (worklet cb) │    (SharedValue)  │   │                                │
│  └──────────────┘                   │   │                                │
│                                     ▼   │                                │
│  ┌──────────────────────────────────────┴─────────────────────────────┐  │
│  │  GAME LOOP HOST  —  useFrameCallback (Reanimated)                  │  │
│  │  accumulate(dt) → while(acc≥FIXED_DT) step() → alpha → record()    │  │
│  └───────┬──────────────────────────────────────────┬─────────────────┘  │
│          │ calls (pure, worklet-marked)             │ writes             │
│  ┌───────▼───────────────────────────────┐  ┌───────▼─────────────────┐  │
│  │  CORE SIMULATION (pure TS, no deps)   │  │  RENDER LAYER (Skia)    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │  │  bgPicture    (static)  │  │
│  │  │ physics │ │  rules  │ │ powerup │  │  │  brickPicture (dirty)   │  │
│  │  │ (swept  │ │ score   │ │ spawn   │  │  │  fxPicture    (frame)   │  │
│  │  │  CCD)   │ │ combo   │ │ effects │  │  │  → SharedValue<SkPicture>│ │
│  │  └─────────┘ └─────────┘ └─────────┘  │  └───────┬─────────────────┘  │
│  │         reads/writes WORLD ───────────┼──────────┘ reads WORLD        │
│  │  ┌──────────────────────────────────┐ │                               │
│  │  │ WORLD STATE (UI-runtime object)  │ │  ┌─────────────────────────┐  │
│  │  │  scalars: ball[], paddle, lives  │ │  │ VFX SYSTEM (cosmetic)   │  │
│  │  │  SoA typed arrays: bricks,       │ │  │ particles, trails,      │  │
│  │  │    particles  |  event ring buf  │ │  │ shake — reads events    │  │
│  │  └──────────────────────────────────┘ │  └─────────────────────────┘  │
│  └────────────────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────────────┘
                                   ↓ SkPicture
                    ┌──────────────────────────────┐
                    │  SKIA RENDER THREAD (native) │
                    └──────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Must NOT do | Typical Implementation |
|-----------|----------------|-------------|------------------------|
| **Core Simulation** | Advance world state by exactly one fixed timestep. Collision, reflection, brick HP, score, combo, lives, power-up lifecycle, win/lose transitions | Import React, Skia, or Reanimated. Touch pixels. Call `Math.random()`, `Date.now()`, or audio | Pure TS functions with `'worklet'` directives; zero-allocation, operates on a passed-in `World` |
| **World State** | Single source of truth for everything simulated | Live in React state or be re-created per frame | Plain object created **on the UI runtime**; hot collections as SoA typed arrays (`Float32Array`/`Int32Array`) |
| **Game Loop Host** | Own the accumulator, clamp frame time, run N fixed steps, compute render `alpha`, trigger recording, drain events | Contain gameplay rules | `useFrameCallback` from Reanimated |
| **Input Layer** | Translate gestures into a normalized intent value | Mutate the world directly, or resolve physics | `Gesture.Pan()` writing a `paddleIntent` SharedValue on the UI thread |
| **Render Layer** | Read world + alpha, emit Skia draw commands into `SkPicture`s | Mutate world state. Create paints, paths, or filters inside the per-frame loop | `Skia.PictureRecorder()` invoked from the frame callback; result assigned to a `SharedValue<SkPicture>` consumed by `<Picture />` |
| **VFX System** | Purely cosmetic particles, trails, screen shake | Feed anything back into gameplay state | Separate SoA particle pool + its own PRNG stream, stepped after the sim |
| **Level Loader / Compiler** | Parse + validate authoring JSON, compile to runtime typed arrays | Be the runtime format | Plain TS on the JS thread at load time (never in a worklet) |
| **Services** | Audio, haptics, persistence — everything with a native side effect | Be called from the simulation | JS-thread modules consuming the batched event drain |
| **Platform Seams** | Interface-only stubs for ads, IAP, accounts, cloud sync | Ship an implementation in MVP | No-op implementations behind a typed interface |
| **UI Shell** | Menus, HUD, pause overlay, settings | Re-render during play, or read the world every frame | React components driven by discrete SharedValue changes, not per-frame state |

---

## Recommended Project Structure

```
src/
├── core/                        # Pure TS. No React/Skia/Reanimated. Node-testable.
│   ├── world/
│   │   ├── types.ts             # World, Ball, Paddle, BrickSoA, EventRing shapes
│   │   ├── create.ts            # allocateWorld(capacity) — called once, on UI runtime
│   │   └── reset.ts             # resetForLevel(world, compiledLevel) — no allocation
│   ├── physics/
│   │   ├── sweep.ts             # circle-vs-AABB swept test → time-of-impact + normal
│   │   ├── resolve.ts           # reflection, paddle-english, speed clamp
│   │   ├── broadphase.ts        # grid raycast over the brick grid (level IS the grid)
│   │   └── step.ts              # stepPhysics(world, FIXED_DT) — one substep
│   ├── rules/
│   │   ├── scoring.ts           # points, combo multiplier, decay
│   │   ├── lives.ts             # life loss, respawn, serve state
│   │   ├── powerups.ts          # drop table, activation, expiry
│   │   └── phase.ts             # SERVING | PLAYING | PAUSED | WON | LOST state machine
│   ├── events/
│   │   └── ring.ts              # fixed-capacity event ring buffer (push/drain)
│   ├── rng/
│   │   └── mulberry32.ts        # seeded PRNG; two independent streams
│   ├── levels/
│   │   ├── schema.ts            # LevelFileV1 type + version constant
│   │   ├── validate.ts          # authoring-format validator (JS thread only)
│   │   ├── compile.ts           # LevelFileV1 → CompiledLevel (typed arrays)
│   │   └── migrations/          # v1→v2 … added when the format changes
│   └── step.ts                  # stepWorld(world, input, FIXED_DT) — the single entry point
│
├── runtime/                     # The UI-thread host. Thin. The only place worlds are wired up.
│   ├── useGameLoop.ts           # useFrameCallback: accumulator, substeps, alpha, record, drain
│   ├── constants.ts             # FIXED_DT, MAX_SUBSTEPS, MAX_FRAME_TIME
│   └── eventBridge.ts           # batched scheduleOnRN drain → services
│
├── render/                      # Skia. Reads world, never writes it.
│   ├── GameCanvas.tsx           # <Canvas>: Picture layers + retained-mode HUD nodes
│   ├── layers/
│   │   ├── background.ts        # recorded once
│   │   ├── bricks.ts            # re-recorded only on dirty flag
│   │   └── dynamic.ts           # balls, paddle, particles, trails — every frame
│   ├── textures/
│   │   └── bakeGlowSprites.ts   # pre-render neon sprites to SkImage at startup
│   ├── camera.ts                # virtual units → device pixels (single transform)
│   └── paints.ts                # module-level Paint/Path singletons, reused
│
├── input/
│   └── usePaddleGesture.ts      # Gesture.Pan → paddleIntent SharedValue
│
├── vfx/
│   ├── particles.ts             # cosmetic SoA pool, stepped on UI thread
│   └── shake.ts                 # decaying screen-shake offset
│
├── services/
│   ├── audio/                   # AudioService interface + SFX impl (music later)
│   ├── haptics/
│   ├── storage/                 # high scores, settings
│   └── platform/                # ads.ts | iap.ts | accounts.ts — INTERFACES + no-op stubs
│
├── ui/                          # React. Cold path only.
│   ├── screens/                 # Menu, Game, Results
│   ├── hud/                     # score, lives, combo — discrete updates only
│   └── overlays/                # PauseOverlay, GameOverOverlay
│
└── assets/levels/
    └── arcade-01.json           # authoring format, hand/editor-editable
```

### Structure Rationale

- **`core/` is the crown jewel and has zero dependencies.** It runs unchanged in Node (Jest/Vitest) and inside a worklet. Every unit test in the "Unit tests for game logic and collision detection" requirement lands here, with no mocking of React, Skia, or native modules. If a future phase ever needs a web build, a replay viewer, or a headless balance-tuning script, `core/` is already portable.
- **`runtime/` is the only module that knows about both `core/` and `render/`.** Keeping it thin (a few hundred lines) means the physics ↔ loop ↔ rendering integration — the one part the project mandates be built sequentially — is contained in one small, reviewable surface instead of smeared across the codebase.
- **`render/` and `vfx/` are downstream-only.** They read the world; nothing they do can change gameplay. This is what makes the "spectacle never compromises responsiveness" rule enforceable: you can delete all of `vfx/` and the game still plays identically, which also means you can disable it wholesale on low-end devices.
- **`services/platform/` exists from day one as interfaces with no-op implementations.** That is the entire ads/IAP/accounts seam. Adding a real SDK later becomes "swap the implementation," not "find every call site."
- **`assets/levels/*.json` is the authoring format, not the runtime format.** `core/levels/compile.ts` is the only code that knows both. A future editor writes the authoring format and ignores everything else.

---

## Architectural Patterns

### Pattern 1: Fixed Timestep with Accumulator and Render Interpolation

**What:** The simulation advances only in discrete, identical `FIXED_DT` increments. Rendering happens at whatever rate the device manages and interpolates between the last two simulated states.

**When to use:** Always, for this project. It is the single mechanism that makes physics deterministic, unit-testable, and identical on a 60 Hz phone and a 120 Hz one.

**Trade-offs:** Requires keeping two copies of the interpolatable state (previous + current) and a third for the interpolated render values. In exchange, you get reproducible tests, frame-rate-independent difficulty, and no stutter.

```ts
// runtime/constants.ts
export const FIXED_DT = 1 / 120;      // 2 substeps per frame at 60 Hz; headroom for a fast ball
export const MAX_SUBSTEPS = 8;        // cap catch-up; drop time rather than spiral
export const MAX_FRAME_TIME = 0.25;   // clamp after a stall/breakpoint

// runtime/useGameLoop.ts
useFrameCallback((frame) => {
  'worklet';
  const w = world.value;
  if (!w) return;

  let frameTime = (frame.timeSincePreviousFrame ?? 16.67) / 1000;
  if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;
  w.accumulator += frameTime;

  let steps = 0;
  while (w.accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
    savePrevious(w);                       // previous ← current
    stepWorld(w, paddleIntent.value, FIXED_DT);
    w.accumulator -= FIXED_DT;
    steps++;
  }
  if (steps === MAX_SUBSTEPS) w.accumulator = 0;   // give up, don't death-spiral

  const alpha = w.accumulator / FIXED_DT;
  stepVfx(w, frameTime);                   // cosmetic, variable dt is fine
  picture.value = recordFrame(w, alpha);   // one write ⇒ one redraw
  drainEvents(w);                          // batched hop to JS thread
});
```

Only the *interpolated* state is ever drawn. Sources: [Gaffer On Games — Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/), [@thi.ng/timestep](https://docs.thi.ng/umbrella/timestep/). **Confidence: HIGH.**

### Pattern 2: Immediate-Mode Rendering via `SkPicture`, Layered by Update Frequency

**What:** Instead of declaring Skia components as React children, record draw commands imperatively into an `SkPicture` on the UI thread and hand the finished picture to a single `<Picture />` node.

**When to use:** Whenever the *number* of things on screen changes — which for a brick breaker is constantly (bricks destroyed, multi-ball, particles spawning). Skia's own documentation names this exact case: *"Game with dynamic entities → Immediate"* and *"Particle systems → Immediate."*

**Trade-offs:** Immediate mode has a per-draw-command FFI cost that retained mode does not, so the number of commands per frame becomes your budget. Mitigate by splitting into layers that re-record at different rates:

| Layer | Re-records | Typical command count |
|-------|-----------|-----------------------|
| `bgPicture` | Once at level load | ~5 |
| `brickPicture` | Only when `world.bricksDirty` is set | 60–120, a few times per second |
| `fxPicture` | Every frame | balls + paddle + live particles |

The brick field is 90% of the draw commands and changes a handful of times per second. Re-recording it only on a dirty flag is the difference between a comfortable frame budget and a tight one.

```ts
// render/layers/bricks.ts
const recorder = Skia.PictureRecorder();      // module scope — never allocate per frame
const paint = Skia.Paint();

export const recordBricks = (w: World, cam: Camera): SkPicture => {
  'worklet';
  const canvas = recorder.beginRecording(cam.bounds);
  for (let i = 0; i < w.brickCount; i++) {
    if (w.brickHp[i] <= 0) continue;
    paint.setColor(w.brickColor[i]);          // mutate the shared paint, don't create one
    canvas.drawRect(brickRect(w, i, cam), paint);
  }
  return recorder.finishRecordingAsPicture();
};
```

You can mix modes in one `<Canvas>` — dynamic gameplay as `<Picture />`, static HUD chrome as ordinary retained Skia nodes. Sources: [Skia Rendering Modes](https://shopify-react-native-skia.mintlify.app/canvas/rendering-modes), [Skia Pictures](https://shopify.github.io/react-native-skia/docs/shapes/pictures/). **Confidence: HIGH.**

### Pattern 3: Simulation in Virtual Units, Rendering Applies One Camera Transform

**What:** The simulation knows nothing about screen pixels. The play field is a fixed virtual space — say `10.0 × 16.0` units — and the render layer computes one transform from virtual space to device pixels.

**When to use:** Always. Two project requirements depend on it: "responsive layout across target phone sizes" and "deterministic collision detection."

**Trade-offs:** One extra mapping step in the render layer and in gesture handling. What you buy is significant: physics behaves identically on every device (a tall phone does not get a slower-feeling ball), unit tests have no device dependency, level files are resolution-independent, and a future level editor can use the same coordinates the game does.

```ts
// render/camera.ts
export const makeCamera = (screenW: number, screenH: number): Camera => {
  'worklet';
  const scale = Math.min(screenW / FIELD_W, screenH / FIELD_H);
  return { scale, ox: (screenW - FIELD_W * scale) / 2, oy: (screenH - FIELD_H * scale) / 2 };
};
// Input goes the other way: px → virtual, before it ever reaches the sim.
```

Device aspect variation becomes a *letterbox/safe-area* question handled entirely in `camera.ts`, never a physics question. **Confidence: HIGH** (standard practice; independent of stack).

### Pattern 4: Continuous (Swept) Collision with the Level Grid as Broadphase

**What:** Rather than moving the ball and then checking for overlaps, compute the earliest time-of-impact along the ball's swept path this substep, advance exactly to it, reflect, and repeat until the substep's time is consumed.

**When to use:** Mandatory here. A ball crossing several brick-heights per frame will tunnel straight through a brick under discrete collision, and that bug is not reliably reproducible — it shows up as "sometimes the ball goes through things," reported from a real device, days later.

**Trade-offs:** More arithmetic per step than overlap testing, and the resolution loop needs an iteration cap. But because bricks live on a **uniform grid defined by the level file**, broadphase is free: walk the grid cells the swept path crosses and test only those. There is no quadtree to build, no spatial hash to maintain, and no per-frame allocation — the level format *is* the acceleration structure.

```ts
// core/physics/step.ts
export const stepBall = (w: World, b: number, dt: number) => {
  'worklet';
  let remaining = dt;
  for (let iter = 0; iter < MAX_CCD_ITERATIONS && remaining > 0; iter++) {
    const hit = sweepAgainstGrid(w, b, remaining);   // walls + bricks + paddle
    if (!hit) { advance(w, b, remaining); break; }
    advance(w, b, hit.toi);
    reflect(w, b, hit.normal);
    applyHitEffects(w, hit);                         // brick HP, score, push event
    remaining -= hit.toi;
  }
};
```

**Confidence: HIGH** (well-established technique). Exact parameters — `FIXED_DT`, `MAX_CCD_ITERATIONS`, max ball speed — need empirical tuning against real gameplay.

### Pattern 5: Event Ring Buffer as the Only Sim → Outside-World Channel

**What:** The simulation never calls a service. It appends compact records (event code, entity index, two floats) to a fixed-capacity ring buffer. Two independent consumers drain it.

**When to use:** As the sole outbound channel from `core/`. It is what keeps `core/` pure, testable, and worklet-safe.

**Trade-offs:** A small amount of encode/decode ceremony. In return: the simulation has no side effects (so tests just assert on the event list), audio and VFX are fully decoupled, you can record a session by dumping events, and — critically — you make **at most one cross-runtime call per frame** instead of one per brick hit.

```
       ┌──────────────────────────┐
       │  core pushes events      │   BRICK_HIT, BRICK_BREAK, PADDLE_HIT,
       │  (never calls services)  │   POWERUP_GET, LIFE_LOST, WIN, LOSE
       └────────────┬─────────────┘
                    │
       ┌────────────┴─────────────┐
       │                          │
  UI-thread consumer        JS-thread consumer
  (same frame, no hop)      (ONE batched scheduleOnRN per frame)
       │                          │
  particles, trails,        audio SFX, haptics,
  screen shake              HUD score, persistence
```

The JS-thread hop is where a naive implementation quietly loses its frame budget. Calling `scheduleOnRN` once per event during a multi-ball chain reaction means dozens of cross-runtime serializations in one frame. Drain into a single batched array and make one call. **Confidence: HIGH** on the mechanism ([react-native-worklets: scheduleOnRN](https://docs.swmansion.com/react-native-worklets/docs/)); the batching discipline is an inference from documented serialization cost.

### Pattern 6: Two Independent PRNG Streams — Gameplay and Cosmetic

**What:** `world.rngGameplay` drives power-up drops and any outcome-affecting randomness. `world.rngCosmetic` drives particle spread, sparkle, and jitter. They never share a stream.

**When to use:** From the first commit. Retrofitting stream separation after tests exist invalidates every recorded expectation.

**Trade-offs:** Eight extra lines. The payoff: you can change particle counts, add a new burst effect, or tune trail density in a polish phase **without breaking a single physics test or replay**. With one shared stream, every VFX tweak silently reshuffles power-up drops.

```ts
// core/rng/mulberry32.ts — seeded, deterministic, no Math.random() anywhere in core/
export const nextFloat = (s: Uint32Array, i: number): number => {
  'worklet';
  s[i] = (s[i] + 0x6d2b79f5) | 0;
  let t = s[i];
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
```

**Confidence: HIGH.**

### Pattern 7: Pre-Baked Glow Sprites, Not Per-Frame Blur Filters

**What:** At startup, render each neon element (brick face, ball, paddle cap, particle dot) once into an `SkImage` **with its glow already baked in**. During play, draw those images — with additive blending for neon accumulation — instead of attaching `BlurMask` or `Shadow` filters to live geometry.

**When to use:** For every recurring glowing element, which is nearly everything on screen.

**Trade-offs:** Glow radius becomes fixed per sprite (mitigate by baking 2–3 intensity variants), and you spend some GPU memory. What you avoid is the documented Android performance cliff: RN Skia maintainers have stated that *"masking operations even on the GPU are quite slow, especially on Android devices,"* and Skia's own docs warn that *"image filters create offscreen buffers and can be expensive"* and that blur radius dominates cost. Applying a live blur to 80 bricks every frame is the most likely single cause of missing the 60 FPS target on a mid-range Android.

Sources: [Skia discussion #773 (shadow performance)](https://github.com/Shopify/react-native-skia/discussions/773), [Skia Image Filters — Performance Considerations](https://shopify-react-native-skia.mintlify.app/api/image-filters). **Confidence: HIGH** on the cost; **MEDIUM** on baked sprites being sufficient for the desired look — that is an art-direction question to settle during the VFX phase.

### Pattern 8: Data-Driven Levels — Authoring Format Compiled to Runtime Format

**What:** Levels ship as versioned JSON in a human-editable, diffable, editor-friendly shape. A compile step converts that into flat typed arrays the simulation consumes. The runtime never reads the authoring format.

**When to use:** From the first level. This is precisely what "data-driven level format designed to support a future level editor" means in practice.

**Trade-offs:** One extra transformation and two type definitions instead of one. The payoff is that the editor and the physics engine stop constraining each other — you can add SoA packing, precomputed neighbor indices, or a different brick memory layout for performance without touching a single level file, and you can add authoring conveniences (patterns, symmetry, comments) without the simulation caring.

```jsonc
// assets/levels/arcade-01.json — AUTHORING format
{
  "schemaVersion": 1,
  "id": "arcade-01",
  "name": "First Light",
  "field": { "width": 10, "height": 16 },          // virtual units — matches the sim
  "grid":  { "cols": 11, "rows": 12, "originY": 1.5, "cellW": 0.85, "cellH": 0.42 },
  "brickTypes": {
    "n": { "hp": 1, "score": 100, "palette": "cyan" },
    "h": { "hp": 3, "score": 300, "palette": "magenta", "flags": ["shakeOnBreak"] },
    "x": { "hp": -1, "score": 0,  "palette": "steel",   "flags": ["indestructible"] }
  },
  "cells": [                                        // one char per column; '.' = empty
    "...nnnnn...",
    "..nnhhhnn..",
    ".nnhhxhhnn."
  ],
  "overrides": [ { "col": 5, "row": 2, "powerup": "multiball" } ],
  "ball": { "initialSpeed": 8.0, "maxSpeed": 14.0, "speedUpPerBricks": 10 },
  "lives": 3
}
```

```ts
// core/levels/compile.ts — runs ONCE, on the JS thread, at load
export interface CompiledLevel {
  brickCount: number;
  x: Float32Array; y: Float32Array; w: Float32Array; h: Float32Array;
  hp: Int16Array; typeId: Uint8Array; flags: Uint8Array; powerup: Uint8Array;
  gridCols: number; gridRows: number; cellIndex: Int16Array;  // grid cell → brick index
  // …ball tuning, lives
}
```

Row-strings keep levels readable in a diff and trivially editable by hand *or* by a grid-based editor UI. `schemaVersion` plus a `migrations/` folder means old level files keep loading after the format evolves — the thing that actually kills editor plans. `validate.ts` runs at load on the JS thread, never in a worklet, so it can use any library and throw descriptive errors.

**Confidence: MEDIUM-HIGH.** The compile-step seam is well supported by how editor-equipped codebases separate the two formats (e.g. [SDL3 Breakout with map editor](https://www.studyplan.dev/sdl3/sdl3-breakout-start), [Arkanoid clone with JSON levels + custom editor](https://github.com/cosgunhalil/arkanoid-clone)); the specific field layout above is a design proposal, not a standard.

### Pattern 9: Layered Modules, Not ECS

**What:** Use explicit, named subsystems (`physics`, `rules`, `powerups`, `vfx`) operating on a known `World` shape. Do not build an entity-component-system.

**When to use:** For this game. Brick breaker has a small, fixed cast: one paddle, 1–5 balls, ~100 bricks, a handful of falling power-ups, N particles. Entity types are known at compile time.

**Trade-offs:** You give up runtime composition of arbitrary behaviors — which this game never needs. What you get is code you can read top to bottom, a `World` shape TypeScript can fully type, and no generic registry to debug. ECS earns its complexity when designers compose behaviors in an editor at runtime; a future *level* editor places bricks from a fixed type table, which is data-driven without being ECS.

There is also a concrete RN-specific reason: a developer attempting exactly this — ECS entities rendered through RN Skia — [reported stutters whenever the entity array changed shape](https://github.com/Shopify/react-native-skia/discussions/3218), because the Skia component tree had to be reprocessed. Pattern 2 (immediate-mode `Picture`) plus fixed-capacity SoA pools avoids that failure mode entirely.

Source: [Thoughts on ECS](https://blog.voxagon.se/2025/03/28/thoughts-on-ecs.html). **Confidence: MEDIUM-HIGH** (well-reasoned engineering consensus, not a hard fact).

### Pattern 10: Fixed-Capacity Object Pools, Zero Per-Frame Allocation

**What:** Balls, particles, falling power-ups, and events all live in arrays allocated once at startup at maximum capacity, with an active count. Spawning increments a counter; despawning swaps-with-last.

**When to use:** For every collection the simulation touches per frame.

**Trade-offs:** Hard caps (e.g. 8 balls, 400 particles) and slightly more bookkeeping than `push`/`filter`. In exchange there is no GC pressure in the hot path — a dropped frame from a garbage collection looks exactly like a physics bug and is far harder to diagnose. Hard caps also give you a free quality dial: halve `maxParticles` on a low-end device and everything else is unchanged. A [Skia-based particle library](https://github.com/nphardorworse/react-native-emoji-burst) using precisely this approach (`Float32Array` pool, UI-thread worklet physics, adaptive recycling) documents the same conclusion.

**Confidence: HIGH.**

---

## Data Flow

### The Frame (hot path — UI thread only)

```
  touch event (native)
        ↓
  Gesture.Pan onChange   ── worklet, UI thread ──►  paddleIntent: SharedValue<number>
        ↓                                                      │
  useFrameCallback(frameInfo)  ◄────────────────────────────────┘
        │
        ├─ clamp frameTime, accumulator += frameTime
        │
        ├─ while (accumulator >= FIXED_DT):          ┌─────────────────────┐
        │     savePrevious(world)                    │  core/ pure worklet │
        │     stepWorld(world, paddleIntent, dt) ───►│  physics → rules    │
        │     accumulator -= FIXED_DT                │  → events pushed    │
        │                                            └─────────────────────┘
        ├─ alpha = accumulator / FIXED_DT
        │
        ├─ stepVfx(world, frameTime)      ← reads events, spawns cosmetic particles
        │
        ├─ picture.value = record(world, alpha)      ── ONE SharedValue write
        │        │                                      ⇒ ONE Skia redraw
        │        └─► bgPicture (cached) + brickPicture (dirty-flagged) + fxPicture
        │
        └─ drainEvents(world) ─► ONE batched scheduleOnRN ──┐
                                                            │
════════════════════════ RUNTIME BOUNDARY ══════════════════┼═══════════════
                                                            ▼
                                        JS thread: audio.playBatch(events)
                                                   haptics, score SharedValue,
                                                   phase transitions → React state
```

Note what is **absent**: no `setState`, no React reconciliation, no `useEffect`, no bridge traffic proportional to entity count. The JS thread can be completely stalled and the game keeps running at 60 FPS; only sound and HUD numbers lag.

### The Cold Path (level load, state transitions)

```
  Menu "Play"  →  fetch arcade-01.json  →  validate()  →  compile() → CompiledLevel
        │                                                                  │
        │                             (JS thread, one-time, may allocate)  │
        │                                                                  ▼
        └──────────────────────────►  scheduleOnUI(initWorld, compiledLevel)
                                                    │
                                        world.value = allocateWorld()   ← created ON the
                                        resetForLevel(world, level)        UI runtime
                                                    │
                                              loop starts
```

**Why the world must be created on the UI runtime:** when a plain object is passed from the JS thread into a worklet, Reanimated serializes it and — in dev builds — **freezes it**, warning *"Tried to modify key … of an object which has been already passed to a worklet."* Mutating nested fields of a JS-thread-created object from a worklet does not work. Allocating the world inside a worklet avoids the whole class of problem. Typed arrays are the safest carrier for bulk data across the boundary; they are serialized (copied), not shared, so treat the handoff as one-time. Source: [Reanimated troubleshooting](https://docs.swmansion.com/react-native-reanimated/docs/3.x/guides/troubleshooting/), [Worklets — sharing memory](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/sharing-memory/). **Confidence: HIGH** on the freeze behavior; **MEDIUM** on UI-runtime allocation being the cleanest workaround — this is the primary thing the Phase 0 spike must prove.

### State Ownership — Who Owns What

| State | Owner | Read by | Update frequency |
|-------|-------|---------|------------------|
| Ball/paddle/brick/particle state | `World` (UI runtime) | Sim, render, VFX | 60–120 Hz |
| `paddleIntent` | SharedValue | Sim | Per touch event |
| `picture` | SharedValue\<SkPicture\> | `<Picture />` | Once per frame |
| Score, lives, combo (display) | SharedValue mirrors | HUD via `useAnimatedReaction` | Only on change (discrete) |
| Game phase (menu/playing/paused/over) | React state | Screens, overlays | A few times per session |
| Settings, high scores | React state + storage | UI | Rare |

The rule: **anything that changes every frame lives in a SharedValue or the World; anything React renders changes at most a few times per second.**

---

## Performance Envelope

"Scale" here means scene complexity and device tier, not user count.

| Dimension | Comfortable | Watch closely | Likely trouble |
|-----------|-------------|---------------|----------------|
| Draw commands per frame (immediate mode) | < 150 | 150–400 | > 400 on mid-range Android |
| Live bricks | ~120 (dirty-flagged layer) | 200+ | 400+ re-recorded per frame |
| Simultaneous balls | 1–5 | 6–12 | 20+ (CCD cost is per ball) |
| Live particles | ≤ 300 | 300–600 | 1000+ — the [Skia Atlas issue](https://github.com/Shopify/react-native-skia/issues/2521) reports FFI throttling at a few hundred per-item JSI calls on cheap Android |
| Live blur/shadow filters per frame | 0 (pre-baked) | 1–2 full-screen | Per-entity filters |
| `scheduleOnRN` calls per frame | 1 | 2–3 | One per gameplay event |

### Where It Breaks First, in Order

1. **Per-entity blur/glow filters.** Ship-stopping on mid-range Android. Prevented by Pattern 7 (bake sprites). Symptom: fine on iPhone, 20–30 FPS on Android — exactly the split reported in the Skia shadow discussion.
2. **Re-recording the full brick field every frame.** ~100 avoidable draw commands per frame. Prevented by the dirty-flagged brick layer (Pattern 2).
3. **Particle count.** The cheapest dial to turn. Make `maxParticles` a device-tier setting from the start rather than a late emergency patch.
4. **Cross-runtime chatter.** Batch the event drain (Pattern 5) and never call `scheduleOnRN` per event.
5. **Only then:** the physics itself. Swept collision against a grid for a handful of balls is nowhere near the budget on a modern phone. **Do not pre-optimize the simulation** — it will not be the bottleneck.

**Device-tier plan:** define `quality: 'high' | 'medium' | 'low'` controlling particle cap, trail length, and glow-sprite variant count. Nothing in `core/` reads it. This gives the performance phase a real lever instead of a rewrite.

---

## Anti-Patterns

### 1. Rendering entities as React/Skia children that come and go

**What people do:** `{bricks.map(b => <Rect key={b.id} … />)}` and remove elements as bricks break.
**Why it's wrong:** Every change to the element count forces Skia to reprocess its display list, and a developer building a game this way [documented exactly this stutter](https://github.com/Shopify/react-native-skia/discussions/3218): the canvas rendered the previous frame's data whenever entities were added or removed. Skia's own docs route "game with dynamic entities" to immediate mode.
**Do this instead:** One `<Picture />` per layer, re-recorded imperatively (Pattern 2).

### 2. React state in the frame loop

**What people do:** `setBallPos({x, y})` in the loop, or a Context holding entities.
**Why it's wrong:** It triggers React reconciliation 60×/second, is the most-reported cause of RN Skia jank, and directly violates the project's "no React state updates every physics frame" mandate.
**Do this instead:** SharedValues + World; React only sees discrete phase and score changes.

### 3. Variable timestep ("just multiply by delta")

**What people do:** `ball.x += ball.vx * dt` with whatever `dt` the frame gave.
**Why it's wrong:** Collision outcomes become frame-rate dependent, so difficulty differs between a 60 Hz and 120 Hz device, unit tests can't assert exact outcomes, and bugs become unreproducible.
**Do this instead:** Fixed timestep + accumulator + render interpolation (Pattern 1).

### 4. Discrete overlap-only collision

**What people do:** Move the ball, then check which bricks it overlaps.
**Why it's wrong:** A fast ball tunnels through thin bricks. This surfaces late, intermittently, on real devices, right when you speed the ball up for difficulty ramping.
**Do this instead:** Swept collision with time-of-impact (Pattern 4). Add a regression test that fires a ball at the maximum designed speed at a one-unit-thick brick.

### 5. Pixel coordinates inside the simulation

**What people do:** Initialize the world from `useWindowDimensions()`.
**Why it's wrong:** Physics becomes device-dependent, tests need a fake screen size, level files become resolution-locked, and a future editor has no stable coordinate system.
**Do this instead:** Virtual units + a single camera transform (Pattern 3).

### 6. `Math.random()` or `Date.now()` inside `core/`

**Why it's wrong:** Kills determinism, makes tests flaky, and forecloses replays and reproducible bug reports.
**Do this instead:** Seeded PRNG streams in the world; time enters only as `FIXED_DT` and a tick counter (Pattern 6).

### 7. The simulation calling `playSound()` directly

**Why it's wrong:** Binds pure logic to a native module (untestable, not worklet-safe), and turns a 15-brick chain reaction into 15 cross-runtime hops in one frame.
**Do this instead:** Push to the event ring; drain once per frame (Pattern 5).

### 8. Making the authoring level format the runtime format

**What people do:** Load JSON and hand the parsed object straight to the physics code.
**Why it's wrong:** The two formats then evolve together forever. Any runtime optimization (typed arrays, precomputed indices) becomes a breaking change to every saved level and to the editor.
**Do this instead:** Compile authoring → runtime; version the authoring format; keep a `migrations/` folder (Pattern 8).

### 9. Building the physics and the renderer in parallel

**Why it's wrong:** The project explicitly flags physics ↔ game loop ↔ rendering as the sequential integration path. Parallel development here produces two components built against different assumptions about state shape, update cadence, and coordinate space — then a painful merge.
**Do this instead:** Sequential through first-playable; parallelize everything downstream (see build order).

### 10. Declaring 60 FPS met based on the RN perf monitor

**Why it's wrong:** RN's perf monitor reports JS and UI thread rates and does not see Skia's render thread. An RN Skia maintainer has stated plainly: *"the perf monitor doesn't give accurate values since we execute things outside the JS and the UI thread."* In this architecture the JS thread is nearly idle by design, so it will happily report a healthy 60.
**Do this instead:** Measure with Skia's `debug` prop on `<Canvas>`, plus platform profilers (Instruments / Android GPU rendering / Perfetto), on a real mid-range Android — matching the project's "measured, not assumed" constraint.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| Input → Sim | `paddleIntent` SharedValue | one-way | Input never resolves physics |
| Loop → Core | Direct worklet function call | one-way | The only caller of `stepWorld` |
| Core → Render | Read-only access to `World` + `alpha` | one-way | Render must never mutate |
| Core → Services | Event ring buffer | one-way, batched | The only outbound side-effect channel |
| Core → VFX | Same event ring, UI-thread consumer | one-way | VFX can never feed back into gameplay |
| Loader → World | One-time `CompiledLevel` handoff via `scheduleOnUI` | one-way | Cold path; typed arrays are copied, not shared |
| Sim → React UI | Discrete SharedValue mirrors + phase events | one-way, low frequency | Never per-frame |

### External Services

| Service | Integration Pattern | Notes / Gotchas |
|---------|--------------------|-----------------|
| Audio (SFX) | `AudioService` interface; JS thread; consumes batched events | Decode all SFX to in-memory buffers **at load**, not at first play. Web-Audio-style libraries make source nodes single-use but cheap — create a node per play, reuse the decoded buffer. Keep the interface music-agnostic so background music slots in later without touching call sites |
| Haptics | Same event drain | Rate-limit — a brick chain should not fire 15 taps |
| Storage | `StorageService` interface | High scores + settings only in MVP. Async; never in the hot path |
| Ads / IAP / Accounts | **Interface + no-op stub, no SDK** | Implement `AdService`, `PurchaseService`, `AccountService` with methods returning "unavailable." The seam is the interface and the call sites (e.g. a `onRunEnded()` hook where a rewarded-continue would later go), not the implementation |
| Level editor (future) | Shares only the authoring JSON schema | Deliberately the *only* shared contract. Editor never imports `core/physics` |
| Analytics (future) | Subscribe to the same event drain | Already have the hook; do not add a second event system |

---

## Recommended Build Order

Ordered by dependency, with the project's sequencing mandate respected. Bracketed labels mark what can run concurrently.

| # | Phase | Why here | Parallel? |
|---|-------|----------|-----------|
| **0** | **Thread-boundary spike + project skeleton** — Expo app, Skia + Reanimated/Worklets + Gesture Handler wired, Babel worklets plugin configured. Prove on a **real mid-range Android**: a pure-TS module marked `'worklet'` runs inside `useFrameCallback`; a world object allocated on the UI runtime can be mutated in place across frames; N dummy sprites recorded into an `SkPicture` hold 60 FPS. Establish the test harness (`core/` running in Node). | Every later decision rests on this. Retrofitting worklet compatibility onto a finished physics engine is a rewrite. This is also where Topology A vs B is confirmed or rejected with evidence. | No — blocks everything |
| **1** | **Core simulation, headless** — `World` shape, fixed-timestep loop, swept collision (walls, paddle, single brick), reflection, paddle english. Unit tests with determinism check: replay an input sequence twice, assert identical state hashes. No rendering at all. | Physics is the riskiest logic and the easiest to get right *without* a renderer confusing the picture. Satisfies the unit-test requirement up front rather than retroactively. | No — sequential with 2 |
| **2** | **Render + input integration → first playable** — camera transform, `Picture` layers, pan gesture, flat untextured shapes. Ball bounces, paddle moves, one brick breaks. Ugly and correct. | The mandated sequential integration point. Ends with a thing you can hold in your hand and feel — the earliest honest read on whether the controls are "snappy." | No — sequential with 1 |
| **3** | **Level format + compiler + brick types** — authoring schema, validator, compiler, grid broadphase wired to real level data, multiple brick types | Needs a working collision system (2) to be meaningful. Unlocks all content work. | Yes — with 4 |
| **4** | **Rules layer** — scoring, combos, lives, serve/respawn, win/lose state machine, power-ups (multi-ball, paddle expand) | Operates on the same `World` but is independent of level *parsing*. | Yes — with 3 |
| **5** | **UI shell** — menus, HUD, pause/resume, results screen, responsive/safe-area layout | Needs the phase state machine from 4. Pure cold-path React; touches nothing in the hot path. | Yes — with 6 |
| **6** | **Audio + haptics via event bus** — `AudioService` interface, SFX preload/decode, batched drain | Needs the event taxonomy from 4. Fully decoupled from rendering. | Yes — with 5 |
| **7** | **Neon VFX** — glow sprite baking, particle pool, ball trails, screen shake, additive blending | Deliberately last among feature work. Building spectacle before the loop feels right inverts the 40/30/30 priority and risks tuning VFX around a game that then changes. | Partly — after 2; final tuning after 4 |
| **8** | **Performance pass on real devices** — Skia `debug` instrumentation, platform profilers, device-tier quality settings, frame-time budget verification on mid-range Android | Must follow 7 — you cannot certify a frame budget before the expensive things exist. Gate: measured on hardware, per project constraint. | No |
| **9** | **Level design + difficulty tuning** — build the actual 2–3 minute arcade challenge, tune ball speed ramp and drop rates | Needs everything above to evaluate feel. Content work, not engineering. | No |
| — | **Platform seams (ads/IAP/accounts stubs)** — interface definitions + no-op implementations + call sites | ~30 minutes of work. Fold into phase 5; do not make it its own phase. | Yes |

### Sequencing Notes for the Roadmapper

- **Phase 0 is non-negotiable and non-parallel.** It is short but it de-risks the project's central architectural bet. If the spike shows worklet-hosted simulation is impractical with the current library versions, falling back to Topology A costs days at this point and weeks later.
- **Phases 1 → 2 must be sequential**, exactly as the project mandates. Both touch the physics ↔ loop ↔ rendering contract.
- **Phases 3–7 parallelize well** because the layer boundaries are one-way: levels, rules, UI, audio, and VFX each touch a different seam of the `World` and never each other.
- **Phase 8 cannot be marked done from a simulator or the RN perf monitor.** Tie its acceptance criteria to a named mid-range Android device and a profiler that sees the Skia render thread.
- **Flag phases 0, 2, and 7 for deeper research.** Phase 0 hits the least-documented territory (worklet-hosted mutable game state). Phase 2 is where the frame budget's shape becomes real. Phase 7 is where the Android glow-performance cliff lives, and where art direction and the frame budget negotiate.

---

## Validation Gates

Things this research could not settle from documentation alone. Each needs an empirical answer before the architecture is locked.

| # | Question | How to settle it | Fallback if it fails |
|---|----------|------------------|----------------------|
| 1 | Can a `World` object be allocated on the UI runtime and mutated in place across frames without triggering Reanimated's shareable-freeze behavior? | Phase 0 spike, dev **and** release builds, both platforms | Store hot state entirely in typed arrays inside one SharedValue; or fall back to Topology A |
| 2 | Does importing `'worklet'`-marked functions across many `core/` modules work cleanly, or is Bundle Mode / import forwarding needed? | Phase 0 spike with `core/` split across ≥5 files | Enable Worklets Bundle Mode with `importForwarding`, or use the experimental file-level `'worklet'` directive |
| 3 | What is the real per-frame `SkPicture` recording budget on a mid-range Android? | Phase 0 spike: ramp draw-command count until frame time exceeds 16 ms | Shift more layers to dirty-flag caching; consider the Atlas API for particles specifically |
| 4 | Do baked glow sprites achieve the intended neon look, or is a runtime shader needed? | Art spike during phase 7 | A single full-screen `RuntimeShader` bloom pass (one filter, not per-entity) |
| 5 | Is `FIXED_DT = 1/120` with swept collision sufficient at maximum designed ball speed? | Automated tunneling test in phase 1, at 2× the intended max speed | Reduce `FIXED_DT`, or add a hard speed ceiling in `rules/` |

---

## Sources

**Official documentation (HIGH confidence)**
- [React Native Skia — Rendering Modes](https://shopify-react-native-skia.mintlify.app/canvas/rendering-modes) — the retained vs immediate decision table; explicitly routes games/particles to immediate mode
- [React Native Skia — Pictures](https://shopify.github.io/react-native-skia/docs/shapes/pictures/) — `PictureRecorder` in `useDerivedValue`, performance tips (reuse paints, keep recorder outside render)
- [React Native Skia — Animations / Reanimated integration](https://shopify.github.io/react-native-skia/docs/animations/animations/) — shared values as props, `select`, version pairing (Skia ≥ 2.10 requires Reanimated v4)
- [React Native Skia — Animation Hooks](https://shopify.github.io/react-native-skia/docs/animations/hooks/) — `useRSXformBuffer`, `useRectBuffer` for Atlas
- [React Native Skia — Image Filters](https://shopify-react-native-skia.mintlify.app/api/image-filters) and [Mask Filters](https://shopify-react-native-skia.mintlify.app/effects/mask-filters) — blur cost, neon glow recipes
- [React Native Skia — Gestures](https://shopify.github.io/react-native-skia/docs/animations/gestures/) — `Gesture.Pan` → shared value → Skia prop
- [Reanimated — Troubleshooting](https://docs.swmansion.com/react-native-reanimated/docs/3.x/guides/troubleshooting/) — object freezing when passed to worklets
- [Reanimated — Worklets guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/) and [Migration from 3.x](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/) — `react-native-worklets` split, `scheduleOnUI` / `scheduleOnRN`
- [react-native-worklets — Babel plugin](https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/about/) — autoworkletization limits; **imported functions need an explicit `'worklet'` directive**
- [react-native-worklets — Sharing memory](https://docs.swmansion.com/react-native-worklets/docs/fundamentals/sharing-memory/) — Serializable vs Shareable vs Synchronizable
- [react-native-audio-api — AudioBufferSourceNode](https://docs.swmansion.com/react-native-audio-api/docs/sources/audio-buffer-source-node/) — single-use nodes, reusable buffers, preload-to-decode

**Established technique (HIGH confidence)**
- [Gaffer On Games — Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) — the canonical accumulator + interpolation formulation
- [@thi.ng/timestep](https://docs.thi.ng/umbrella/timestep/) — previous/current/interpolated three-state requirement

**Field reports (MEDIUM confidence — single-source, but concrete and specific)**
- [Skia discussion #3218 — dynamic entity arrays stutter](https://github.com/Shopify/react-native-skia/discussions/3218) — ECS + retained-mode Skia failure mode
- [Skia discussion #773 — shadow/mask performance](https://github.com/Shopify/react-native-skia/discussions/773) — Android masking cost; perf monitor unreliability, stated by a maintainer
- [Skia issue #2521 — Atlas on low-end Android](https://github.com/Shopify/react-native-skia/issues/2521) — per-item JSI cost throttling at a few hundred sprites
- [Skia issue #2688 — Atlas vs Picture](https://github.com/Shopify/react-native-skia/issues/2688) — Atlas is not automatically faster; measure
- [Skia discussion #3556 — generating Pictures on another runtime](https://github.com/Shopify/react-native-skia/discussions/3556) — maintainer confirms Pictures move across runtimes (no GPU-backed resources)
- [react-native-emoji-burst](https://github.com/nphardorworse/react-native-emoji-burst) — production `Float32Array` pool + UI-thread worklet physics + Atlas
- [rn-game-engine-next](https://github.com/ahsanmunyr/rn-game-engine-next) — documents the JS-thread-sim / UI-thread-render split and names full UI-thread simulation as its next step

**Design reasoning (MEDIUM confidence)**
- [Thoughts on ECS](https://blog.voxagon.se/2025/03/28/thoughts-on-ecs.html) — when ECS earns its complexity (runtime composition) and when it doesn't
- [Arkanoid clone — JSON levels + custom editor](https://github.com/cosgunhalil/arkanoid-clone) — data/logic separation, focused systems
- [SDL3 Breakout with map editor](https://www.studyplan.dev/sdl3/sdl3-breakout-start) — editor and game share only the serialization contract

**Version check (2026-09-19, via npm):** `@shopify/react-native-skia` 2.12.0 · `react-native-reanimated` 4.7.0 · `react-native-worklets` 0.12.2 · `react-native-gesture-handler` 3.3.0 · `react-native-audio-api` 0.13.5. Exact version pinning and Expo SDK compatibility are STACK.md's call; note only that Skia ≥ 2.10 requires Reanimated v4, which requires the separate `react-native-worklets` package.

---
*Architecture research for: RN/Skia mobile arcade game with custom deterministic physics*
*Researched: 2026-09-19*
