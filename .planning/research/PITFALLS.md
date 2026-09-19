# Pitfalls Research

**Domain:** React Native + Skia arcade game (brick breaker) with custom deterministic physics
**Researched:** 2026-09-19
**Confidence:** MEDIUM-HIGH (game-loop and collision pitfalls are HIGH — long-standing, well-documented; RN/Skia-specific rendering pitfalls are MEDIUM-HIGH — sourced from official docs plus recent production post-mortems; audio and legal are MEDIUM)

**Suggested phase names used below** (the roadmap does not exist yet — these are topic labels, not committed phase numbers):

| Label | Topic |
|-------|-------|
| P1 | Physics kernel + fixed-timestep loop (headless, testable) |
| P2 | Skia render bridge + input |
| P3 | Playable prototype (bricks, lives, win/lose) |
| P4 | Level data format + one designed level |
| P5 | Power-ups + scoring/combo |
| P6 | Neon VFX + juice |
| P7 | Audio |
| P8 | Device performance pass + polish |

---

## Critical Pitfalls

### Pitfall 1: The UI-thread/JS-thread split is decided late, then everything gets rewritten

**What goes wrong:**
The physics runs as plain TypeScript on the JS thread (easy to write, easy to unit test), rendering runs on the UI thread via Skia + Reanimated worklets. It works at prototype scale. Then paddle input, power-up timers, particle spawning, and combo scoring each get wired to whichever thread was convenient, and the game becomes an un-untanglable mesh of `runOnJS` / `runOnUI` hops. Frame pacing degrades and nothing is reproducible.

**Why it happens:**
Reanimated worklets impose real constraints (no closures over mutable JS objects, no imports, serialization costs at the boundary), so developers keep "just this one thing" on the JS thread. The cost is invisible until several such decisions stack.

There is genuine ecosystem disagreement here, which is why teams drift. The `rn-game-engine-next` project ships a `SkiaGameEngine` whose systems run on the JS thread via `requestAnimationFrame` while only *rendering* happens in a worklet, and explicitly lists "loop and systems in worklets on the UI thread" as a future phase. Meanwhile Reanimated's own `useFrameCallback` runs the callback as a UI-thread worklet by default. Both are viable; picking neither is not.

**How to avoid:**
Make this an explicit, written architecture decision before any gameplay code exists, and pick **simulation entirely inside the UI-thread worklet runtime**:

- The physics step is a pure function `step(state, dt) → state` written as a worklet-safe module (no closures over React state, no imports of non-worklet code, only numbers and pre-allocated typed arrays).
- Because it is a pure function over plain numbers, the *same* module is importable in Jest and runs as ordinary JS — worklet-safe code is a subset of JS, so testability is not sacrificed.
- The JS thread only ever sends discrete *commands* in (launch ball, pause, activate power-up) and receives discrete *events* out (brick destroyed, life lost, level complete) — never per-frame data.
- Write down the allowed crossings as a short contract in the architecture doc, and treat every new `runOnJS` in a hot path as requiring justification.

**Warning signs:**
- Any `runOnJS` inside `useFrameCallback` or a Skia `useDerivedValue`.
- A `useState`/`useEffect` that reads ball position.
- Reading `sharedValue.value` from a React render, event handler, or `useEffect` — this forces a UI→JS synchronization that blocks the JS thread.
- A profiler showing `runOnUISync` chains inside the Skia recorder.

**Phase to address:** P1 (decide and enforce), verified continuously through P8.

---

### Pitfall 2: Rendering a variable number of entities through the React/Skia component tree

**What goes wrong:**
Bricks, balls, and particles are rendered as `<Rect>`/`<Circle>` React children of `<Canvas>`. Moving them is fast (shared values bind directly to props, zero bridge cost). But the moment the *count* changes — a brick is destroyed, multi-ball splits into three, 40 particles spawn — React has to reconcile, Skia rebuilds its display list, and the frame visibly stutters exactly at the most dramatic gameplay moments.

**Why it happens:**
The Skia docs' animation examples all animate a *static* tree, which is the case they optimize for. Retained mode is explicitly described as "fast … if the drawing list updates infrequently." A brick breaker's drawing list updates on every single destruction event. Developers generalize from the animation examples and hit a wall.

This is not hypothetical: Shopify discussion [#3218](https://github.com/Shopify/react-native-skia/discussions/3218) is a developer building exactly this (ECS + Skia game) reporting stutter on every entity array push/pop, correctly diagnosing that "the Canvas has to re-process its tree on every update." Separately, Margelo measured a single redraw of a ~150-node canvas at roughly **13% of the JS frame budget**, because Skia's `Container.redraw()` walks the entire scene tree on every React commit and each animated node pays its own synchronous `runOnUISync`.

**How to avoid:**
Use Skia's **immediate mode** for everything whose count varies. Skia supports both paradigms in one scene, so split deliberately:

- **Retained mode** (`<Rect>`, `<Circle>` with shared-value props) — only for the fixed-cardinality background/chrome.
- **Immediate mode** (`<Picture>` + `useDerivedValue` returning `recorder.finishRecordingAsPicture()`) — for bricks, balls, particles, trails. The docs state this directly: immediate mode "is ideal for scenes where the number of drawing commands changes frequently, such as in games, generative art, and particle systems."
- Reuse a single `Skia.PictureRecorder()` and a small set of `Skia.Paint()` objects across frames — do not allocate them inside the worklet.
- For large uniform sprite counts (particles), prefer `<Atlas>` with `useRSXformBuffer` and `useTexture`, which batches instances of one texture and mutates a preallocated buffer in a worklet.

**Warning signs:**
- `bricks.map(b => <Brick .../>)` anywhere in the Canvas tree.
- Frame hitches that correlate with destruction events rather than with motion.
- A `key` prop inside `<Canvas>`.

**Phase to address:** P2 — the render bridge must be immediate-mode from the first prototype. Retrofitting after P5/P6 means rewriting the entire render layer.

---

### Pitfall 3: Frame-rate-dependent motion (and the `useFrameCallback` gesture trap)

**What goes wrong:**
`ball.x += vx` per frame. The game runs at correct speed on a 60 Hz test device, **double speed** on a 120 Hz phone, and slow motion when frames drop. Worse and far more confusing: with Reanimated's `useFrameCallback`, *the ball speeds up dramatically while the player's finger is on the screen.*

**Why it happens:**
Gesture Handler raises the frame-callback rate while a gesture is active so apps can react immediately to touch input. This is documented intended behavior, reported as a bug ([reanimated#6189](https://github.com/software-mansion/react-native-reanimated/issues/6189)) by a developer building a ball-collision game — the exact scenario here. A paddle game has a finger on the screen essentially all the time, so this is not an edge case; it is the primary play state.

The device-refresh variant is just as real: mid-range Android phones now ship 120 Hz panels (Margelo's test device was a sub-$100 120 Hz Android), and iOS ProMotion is enabled by the `CADisableMinimumFrameDurationOnPhone` flag that Expo prebuild sets by default.

**How to avoid:**
Never derive motion from frame count. Use a fixed-timestep accumulator, and note that this *also* fixes the gesture problem for free — extra frame callbacks simply add smaller deltas to the accumulator and drain zero or one simulation steps:

```ts
const DT = 1 / 120;            // simulation step, independent of display Hz
const MAX_FRAME = 0.25;        // spiral-of-death clamp
const MAX_STEPS = 5;           // hard cap per frame

accumulator += Math.min(frameSeconds, MAX_FRAME);
let steps = 0;
while (accumulator >= DT && steps < MAX_STEPS) {
  previous = current;          // copy for interpolation
  current = step(current, DT);
  accumulator -= DT;
  steps++;
}
const alpha = accumulator / DT;
render(lerp(previous, current, alpha));
```

Do **not** integrate the leftover remainder as a partial step — that reintroduces variable timesteps and destroys determinism. Carry it forward.

**Warning signs:**
- Any use of `timeSincePreviousFrame` to scale a position directly.
- The `if (timeSincePreviousFrame < 16) return;` hack (posted as a workaround in #6189) — it "fixes" the gesture symptom by throwing away frames and caps you at 60 FPS forever.
- Ball speed differs between a 60 Hz and a 120 Hz device.
- Gameplay feels faster while dragging.

**Phase to address:** P1. Add an automated test that runs N fixed steps and asserts a byte-identical end state regardless of how the frames were chunked.

---

### Pitfall 4: Tunneling — the ball passes through bricks, the paddle, or the world

**What goes wrong:**
At high ball speed (late-level difficulty ramp, or a speed power-up), the ball's per-step displacement exceeds a brick's thickness. Discrete overlap testing sees no overlap at either endpoint, and the ball passes clean through — or worse, escapes the play field entirely. This is often *intermittent*, appearing only at specific speeds and angles, which makes it hell to reproduce.

**Why it happens:**
Discrete AABB overlap is the obvious first implementation and works fine at prototype speeds. The bug appears only after difficulty tuning raises ball speed, by which point the collision code is load-bearing for everything else. Erin Catto's GDC talk is blunt: "Tunneling is a nasty physics bug," and notes many engines punt on it.

Shrinking `DT` reduces but never eliminates it, and costs CPU on exactly the mid-range devices you are targeting.

**How to avoid:**
Implement **swept (continuous) collision from day one** — it is not much harder than discrete for a circle-vs-AABB world, and it is the only correct answer:

1. Expand every brick AABB by the ball radius (Minkowski sum) → the problem reduces to a ray/segment vs. rectangle test.
2. Sweep the ball centre segment against all candidate expanded AABBs; find the **earliest** time of impact `t ∈ [0,1]`.
3. Advance the ball to that exact point, reflect velocity about the surface normal, apply a small separation epsilon.
4. Recurse/iterate with the remaining `(1 − t)` of the step, capping iterations (4–5) to bound worst-case cost.
5. Keep a **hard bounds check** as a backstop: if the ball is ever outside the play field, reflect it back in rather than trusting collision alone. As one block-breaker post-mortem puts it, don't rely on colliders to keep the ball in-bounds — things get chaotic.

Corners need explicit handling: treat the brick corner as a point and collide against the rounded corner, using the corner-to-centre vector as the normal. The naive "flip vy" on a corner hit produces visibly wrong bounces.

**Warning signs:**
- Any collision code shaped `if (overlaps(ballAABB, brickAABB))`.
- Bug reports that only reproduce "sometimes, when the ball is fast."
- Reducing `DT` makes a bug go away (that is a tunneling fingerprint, not a fix).

**Phase to address:** P1. Write the swept test with a property-based test that fires balls at extreme speeds through dense brick grids and asserts no brick is ever passed without being registered.

---

### Pitfall 5: Multi-ball turns single-collision bugs into a chaos generator

**What goes wrong:**
Everything is stable with one ball. Multi-ball ships and: balls stick inside bricks, two balls destroy the same brick and the combo counter double-counts, a ball wedged between two adjacent bricks flips twice in one step and reverses into the wall, the last ball is lost but the life counter decrements three times, and frame time spikes because collision is O(balls × bricks).

**Why it happens:**
Single-ball code silently relies on invariants that multi-ball breaks — most importantly "at most one collision event per step" and "ball loss equals life loss." The seams between physics, scoring, and lives were never designed for concurrency.

**How to avoid:**
- Make the brick grid the authority for destruction: a brick has HP and a `destroyedThisStep` flag; resolve all ball–brick contacts for a step, then apply damage once per brick. Two balls hitting the same brick in one step produce one destruction event.
- Resolve the ball list in a **deterministic, index-stable order** every step. Never iterate a `Set`, a `Map`, or anything whose order depends on insertion history that varies across runs.
- Life loss is a function of `activeBalls.length === 0`, evaluated once at end of step — not a side effect of an individual ball leaving the field.
- Never reflect twice in one step: after the first reflection, subsequent contacts in the same step must be tested against the *new* velocity, and reject any contact whose normal already points away from the direction of travel (`dot(v, n) >= 0`).
- Use a broadphase from the start. Bricks sit on a grid, so a spatial hash / grid bucket lookup is nearly free and turns 750-brick worst case into a handful of candidates per ball.

**Warning signs:**
- Score or combo values that differ between two runs of an identical recorded input sequence.
- Balls that visibly jitter when near each other or near a brick seam.
- Frame time that scales with ball count.

**Phase to address:** P1 must support N balls in the data model even though P3 ships one; P5 activates it. Never let the physics API assume a singular ball.

---

### Pitfall 6: "Deterministic" physics that silently isn't

**What goes wrong:**
The project commits to deterministic physics for skill-based play and testable collisions, then `Math.random()` appears in particle spawning, brick drop chances, or the launch angle. Replays diverge. Unit tests pass locally and fail in CI. A "ghost run" or replay feature becomes impossible to add later.

**Why it happens:**
Randomness enters through VFX and juice, which feel like presentation rather than simulation — until a random power-up drop chance or a randomized launch angle makes it gameplay-affecting. Nobody draws the line, because in phase 1 there is no randomness at all.

`Math.random()` in a worklet is additionally unreliable as a simulation source: the UI runtime is a separate Hermes runtime with its own unsynchronized state.

**How to avoid:**
- Ban `Math.random()` from the simulation module with a lint rule. Not a convention — a rule that fails the build.
- Use an explicit seeded PRNG (e.g. mulberry32 / xorshift128) whose state lives *inside* the game state struct, so it serializes and rewinds with everything else.
- Draw a hard line: **simulation randomness** uses the seeded stream; **cosmetic randomness** (particle jitter, glow flicker) uses a completely separate stream that never feeds back into simulation state.
- Avoid accumulating float error paths that differ by platform. Prefer recomputing from stable inputs over incrementally mutating a float across thousands of steps. (Full cross-platform bit-exact float determinism is not required here — same-device replay determinism is the realistic and sufficient bar. Write that bar down so nobody over-engineers fixed-point math.)
- Ship a golden-replay test: a recorded input sequence + seed must produce an identical final state hash.

**Warning signs:**
- A test that is flaky by one pixel.
- Any `Math.random` inside the physics directory.
- Inability to answer "what seed produced this run?"

**Phase to address:** P1 (PRNG in state, lint rule, golden replay test). Re-verify at P5 when power-up drop chances introduce the first gameplay-affecting randomness.

---

### Pitfall 7: Neon glow implemented per-object, killing mid-range Android

**What goes wrong:**
Every brick, the ball, the trail, and the paddle each get a `<BlurMask>` or `<Shadow>`. It looks spectacular on the developer's iPhone at a locked 60. On a mid-range Android it drops to 15–30 FPS and the core value proposition ("neon effects never steal frame time") is dead.

**Why it happens:**
The Skia glow recipe in the docs is per-shape (glow layer + solid layer), so the natural reading is to apply it per entity. The iOS/Android asymmetry then hides it: iOS composites through `CAMetalLayer` and absorbs the cost, Android does not.

The evidence is consistent and specific. Shopify discussion [#773](https://github.com/Shopify/react-native-skia/discussions/773): a scene at 60 FPS on a slow Android dropped to **15–20 FPS** by adding a shadow per bar, while staying 60 on an iPhone 12 Pro — and the maintainer's reply notes masking operations are slow on Android even on GPU. Issue [#2099](https://github.com/Shopify/react-native-skia/issues/2099): animated `BlurMask` inside a `Mask` in a list took a Pixel 6 Pro from 120 FPS to **20–30 FPS**, with zero drop on iOS.

Worse, the RN perf monitor **lies here** — it reported 60/60 for UI and JS on a device that was visibly at 15 FPS, because Skia executes outside both threads.

**How to avoid:**
- Budget glow as a fixed cost, not a per-entity cost. Render all bricks into **one** glow layer (draw the whole brick set into a Picture, apply one blur to that), not N blurred bricks.
- Prefer `BlurMask` over image filters for edge glow — mask filters only touch the alpha channel and are meaningfully cheaper; image filters allocate offscreen buffers.
- Use `style="outer"` and `respectCTM={false}`, and keep sigma small. Cost scales with radius.
- **Quantize any animated blur radius or glow alpha** to a small number of discrete steps. Skia's blur mask cache is keyed on `(blurRadius, color)`; a unique float per frame misses the cache every single frame.
- Pre-render static glows to textures with `drawAsImage` / `useTexture` at level load, then blit. A brick's glow does not change shape.
- Consider a "reduced effects" quality tier selected from a measured startup benchmark, not from a device-model allowlist.

**Warning signs:**
- `<BlurMask>` inside a loop or inside a per-entity component.
- A `<Mask>` component anywhere in the hot path.
- Trusting the RN perf monitor. Use `Canvas`'s `debug` prop and `adb shell dumpsys gfxinfo` instead.
- "It's fine on my iPhone."

**Phase to address:** P6 designs within a measured budget established at P2. Add a hard rule at P2: every VFX addition must be measured on the reference Android device before merge.

---

### Pitfall 8: The Android compositing path (TextureView vs SurfaceView)

**What goes wrong:**
A fullscreen, every-frame Skia canvas on Android is composited through a `TextureView` by default. Every frame, the GPU touches the canvas pixels two to three times plus a cross-process texture handoff. On a 60 Hz flagship this hides inside a 16.6 ms budget; on a cheap 120 Hz Android the budget halves to 8.3 ms while the GPU is weaker, and the upload blows straight through it.

**Why it happens:**
It is a default, it is invisible in code, and it costs nothing on iOS. Margelo's conclusion after profiling an entire animation stack: this single structural issue "dwarfed everything else we found," and the one-prop fix "is worth more than every other change here combined" for a fullscreen every-frame canvas on high-refresh Android.

**How to avoid:**
Set the Canvas to opaque mode so Android backs it with a `SurfaceView` (its own SurfaceFlinger layer, eligible for hardware overlay composition). Verify the exact prop name against the installed `@shopify/react-native-skia` version — the docs' Canvas prop table lists `style`, `ref`, `onSize`, `highBitDepth`, and `androidWarmup`, while a code example in the same page shows `<Canvas style={{flex:1}} opaque highBitDepth>`, so treat the prop name as needing a one-line check rather than an assumption.

Accept the tax that comes with it: a SurfaceView is opaque and occludes siblings rendered behind it, so the canvas must paint its own full background (a bottom `<Fill>` with the background colour) and must be lowest in z-order within its host. For a neon game on a dark background this is a natural fit, not a compromise. Any HUD overlaid as React Native views must render *after* the canvas in JSX.

**Warning signs:**
- Android frame times 2–4× iOS for the identical scene.
- `dumpsys gfxinfo` showing high time in the upload/compositing buckets.
- The canvas looking correct but performing badly with no obvious JS or GPU hotspot.

**Phase to address:** P2 (set it up front and structure the view hierarchy around it — retrofitting means reordering the whole screen). Verify at P8 with `gfxinfo` on the reference device.

---

### Pitfall 9: Per-frame allocation and Hermes GC pauses

**What goes wrong:**
The physics step returns `{x, y, vx, vy}` objects, `useDerivedValue` returns a fresh transform array, particles are a growing array of objects. Motion looks fine at speed, but the game develops intermittent micro-stutters — most visible during slow moments, which in a brick breaker is exactly when the player is lining up a precision shot.

**Why it happens:**
Idiomatic React/TS style is allocation-heavy and immutable-by-default. At 60–120 steps per second with dozens of entities, that is thousands of objects per second. Hermes' Hades collector is much better than its predecessor but still pauses — roughly 48 ms at p99.9 on 64-bit and ~88 ms on 32-bit devices, per the React Native team's own numbers. Margelo observed exactly this: GC pauses "invisible during fast motion and very visible during the subpixel settle."

**How to avoid:**
- Represent game state as preallocated `Float64Array` / `Int32Array` buffers (SoA layout: `ballX[]`, `ballY[]`, `ballVX[]`, …). Mutate in place; never allocate in the step function.
- Use a fixed-size object pool for particles with a free-list, and hard-cap the pool. A cap that occasionally drops a particle is invisible; a GC pause is not.
- Return the *same* buffer reference from worklets rather than a fresh array — Margelo's specific fix.
- Keep `useFrameCallback` and gesture objects memoized (`useCallback` / `useMemo`) so they are not recreated per render.

**Warning signs:**
- Stutter during slow/settling motion but not during fast motion.
- Heap growth over a play session.
- Object literals or array literals inside any worklet.

**Phase to address:** P1 (choose the typed-array state layout before writing the step function — converting later touches every line of physics). Re-verify at P6 when particles arrive.

---

### Pitfall 10: Bounce physics that is technically correct but not fun

**What goes wrong:**
`vy = -vy` on paddle contact. The ball returns along a mirrored path forever, the player has no aiming agency, and the game feels like a screensaver. Or: the ball settles into a near-horizontal trajectory and trolley-cars between the two side walls for fifteen seconds while the player can do nothing. Or: the ball lands inside the paddle and jitters rapidly instead of bouncing.

**Why it happens:**
Physically accurate reflection is *not* the goal. The project's stated feel mix is 30% "physics toy — predictable trajectories, controllable bounce angles, meaningful skill," and pure reflection delivers zero of that. Teams that build the physics first and tune feel later discover the tuning knobs were never designed in.

**How to avoid:**
- **Paddle contact is an input device, not a collision.** Map normalized hit position to an outgoing angle: `angle = -π/2 + hitPos * (π/3)`, preserving speed magnitude. The ±60–65° clamp is deliberate — ±90° allows the horizontal stall, ±30° removes player agency.
- **Enforce a minimum vertical velocity component** after every bounce, and forbid the near-vertical case too (it makes aiming trivially easy). Every fun block breaker keeps the ball out of both extremes.
- **Only bounce when the ball is moving toward the surface** (`vy > 0` for the paddle). This single check eliminates the in-paddle jitter class of bug outright.
- After resolving, **reposition the ball to the surface**, don't just flip velocity.
- Add a **serve state**: the ball rides on the paddle and launches on tap. The pause-before-launch materially changes how the controls feel and gives the player a moment to compose after losing a life.
- Optionally add controlled paddle "English" from paddle velocity — but renormalize speed afterward so total energy stays under designer control.

**Warning signs:**
- Playtesters say "it feels floaty" or "I can't aim."
- Any observed rally longer than a few seconds with no vertical progress.
- The ball entering the paddle at all.

**Phase to address:** P3 — the prototype's acceptance criterion should be a feel judgment ("can a player deliberately aim at a chosen brick?"), not just "the ball bounces."

---

### Pitfall 11: Backgrounding the app detonates the simulation

**What goes wrong:**
The player takes a call. On return, the accumulator receives a delta representing the entire pause. The loop runs hundreds or thousands of fixed steps in one tick — the game freezes, then resumes with the ball teleported through walls, several lives lost, and bricks destroyed the player never hit.

**Why it happens:**
Everyone remembers to write the pause menu; far fewer remember that the OS can suspend the app without going through it. It never reproduces during development because the developer's app is always foregrounded.

**How to avoid:**
Belt and braces, both required:
- `AppState` listener: on `inactive`/`background`, call `frameCallback.setActive(false)` and enter the paused state. On return to `active`, **reset the accumulator to zero and reset the last-timestamp** before restarting — do not attempt to catch up.
- Independently, clamp incoming frame time (`Math.min(dt, 0.25)`) and cap steps per frame. These clamps also protect against a long GC pause or a slow first frame.
- Prefer resuming to an explicit "tap to resume" screen rather than dropping the player straight into live play — it is both safer for the simulation and better UX.

Note the Android nuance: `background` fires for temporary system activities too (autofill pickers, permission dialogs), so pause must be cheap and idempotent.

**Warning signs:**
- No `AppState` subscription anywhere.
- The loop still ticking (battery drain) when the app is backgrounded.
- Testers reporting "I came back and had lost."

**Phase to address:** P3, alongside the pause/resume requirement. Test it explicitly by backgrounding for 60+ seconds mid-rally.

---

### Pitfall 12: Power-up state explosion

**What goes wrong:**
Multi-ball and paddle-expand ship as two booleans with two timers. Then: what happens when paddle-expand is picked up while already expanded — does the timer reset, stack, or extend? What if the player loses a life while expanded? Does multi-ball's third ball spawn inside a brick? What if a power-up brick is destroyed by a ball that is itself a product of multi-ball? By the fourth power-up the combinatorics are untestable and every new power-up breaks two old ones.

**Why it happens:**
Power-ups are implemented as ad-hoc mutations scattered across the physics step rather than as a uniform data-driven system. With only two power-ups the ad-hoc version is genuinely simpler, so it wins — and then the MVP scope note says "expand power-ups after MVP," which is exactly when it collapses.

**How to avoid:**
- Model power-ups as **data**: `{ id, type, duration, stackPolicy: 'refresh' | 'extend' | 'ignore', onApply, onExpire }`. Two power-ups justify the system because the project has already committed to adding more.
- Keep active effects in a single ordered list inside the game state, ticked once per fixed step. Effect expiry is deterministic and serializes with everything else.
- Define **explicit** answers, written in the level/power-up schema, for: stacking, life loss, level end, and pause. Ambiguity here is the actual bug source.
- Derived properties (paddle width, ball count, ball speed) must be **computed from base value + active effects** each step, never mutated in place. Mutating `paddle.width` directly means a missed expiry leaves the paddle permanently wrong.
- Spawn multi-ball copies at the source ball's position with deterministic angle offsets from the seeded PRNG, and validate spawn positions against the brick grid.

**Warning signs:**
- `if (powerUpActive)` branches inside the physics step.
- Paddle width being assigned rather than derived.
- Any power-up interaction the team has to reason about verbally rather than read from a table.

**Phase to address:** P5, but the state shape must be reserved in P1 — the effects list has to live inside the serialized game state from the start or replay determinism breaks when it is added.

---

### Pitfall 13: 60 FPS assumed instead of measured, and measured with the wrong tool

**What goes wrong:**
The team develops on an iPhone and a fast emulator, hits 60 everywhere, declares the performance requirement met, and discovers at beta that mid-range Android is at 25 FPS — after all the VFX and architecture decisions are baked in.

**Why it happens:**
Three compounding reasons, all evidenced above: (1) iOS genuinely is faster here because of the compositing path; (2) debug builds are not representative — Metro, Hermes debug mode, and dev warnings all add overhead, so profiling must be done on release builds; (3) **the obvious measurement tool is wrong** — the RN perf monitor reported 60/60 UI and JS on a device visibly running at 15 FPS, because Skia executes outside both threads.

**How to avoid:**
- Name a specific **reference device** (a real, mid-range, ideally 120 Hz Android handset) in the project constraints, and gate phase completion on it.
- Measure with the right tools, because each cost is visible to a different one:
  - `adb shell dumpsys gfxinfo <pkg>` — frame pacing and compositing/upload costs.
  - Skia `Canvas`'s `debug` prop — Skia's own frame timing.
  - Hermes sampling profiler over CDP — JS-thread costs (`runOnUISync` chains are invisible to system tracers).
  - `react-native-release-profiler` on **release** builds.
- Establish the budget early: at 120 Hz the budget is 8.3 ms, not 16.6 ms. Decide explicitly whether to target 60 FPS capped or uncapped high-refresh, and write it down — it changes every subsequent VFX decision.
- Add an in-game FPS/frame-time overlay behind a dev flag from P2 so regressions are noticed the day they land, not at P8.
- Use the disable-to-measure technique for attribution: a module-scope `if (PERF_DISABLE_X) return null` as the first line of a component (before hooks — safe because a module const is stable across renders) makes a suspect vanish so you can measure its true cost.

**Warning signs:**
- Performance numbers quoted from a simulator, a debug build, or the RN perf monitor.
- No named reference device.
- Performance work scheduled as a single late phase rather than a per-phase gate.

**Phase to address:** P2 establishes the harness and budget; every phase from P3 onward has a measured frame-time acceptance criterion; P8 is a final pass, **not** the first measurement.

---

### Pitfall 14: Inspiration becoming imitation

**What goes wrong:**
"Shatter as visual reference" drifts into recreating Shatter's palette, HUD, and shader look; "Brick Breaker Maker as feel reference" drifts into recreating its actual level layouts. The result risks an IP claim and, more immediately, an App Store Guideline 4.1 (Copycats) rejection — which can happen even for independently written code if the app resembles an existing one in name, icon, or UI.

**Why it happens:**
Reference material is loaded into the project at the start and stays visually present through months of implementation. Drift is gradual and nobody notices the line being crossed.

Legally the line is real but not where people assume: copyright does not protect game ideas, rules, or mechanics, so a brick breaker is fine. What is protected is *expression* — distinctive audiovisual presentation, characters, specific layouts, assets — and trade dress, per *Tetris Holding v. Xio*. Separately, "Arkanoid" and "Breakout" are trademarks (Taito and Atari respectively), and Atari has a history of using store takedowns rather than courts.

**How to avoid:**
- Pick an original name early and run a USPTO trademark search on it. Keep "Arkanoid," "Breakout," and "Shatter" out of the app name, subtitle, keywords, and all store metadata — Guideline 2.3.7 explicitly prohibits packing metadata with trademarked terms.
- Design an original visual identity (own palette, own brick silhouettes, own UI language) rather than matching a reference frame-by-frame. Neon-on-dark is a genre convention, not anyone's trade dress; a specific shard-shatter effect plus a specific palette plus a specific HUD arrangement might be.
- Author all level layouts originally. Layouts are among the most defensibly copyrightable elements and the easiest thing to accidentally copy.
- All art, SFX, and fonts must be original or properly licensed, with licences recorded in the repo. Document independent creation as you go — it is the practical defence if challenged.

**Warning signs:**
- A reference screenshot open next to the editor during visual implementation.
- Level layouts transcribed from a video.
- Any reference-game name in the codebase, asset filenames, or store metadata.

**Phase to address:** P4 (original level authoring) and P6 (original visual identity). Run the trademark check before the first TestFlight/internal-track build.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Physics on the JS thread with `runOnJS` glue | Trivially testable, no worklet constraints | Rewrite of every gameplay system when frame pacing fails; worst on mid-range Android | Only for a throwaway spike explicitly deleted before P1 |
| Discrete AABB collision, "we'll add sweeping later" | Ships a bouncing ball in an afternoon | Intermittent tunneling that surfaces after difficulty tuning; the fix touches all downstream physics | Never — swept circle-vs-AABB is barely harder |
| Rendering bricks as React children of `<Canvas>` | Reads naturally, binds shared values directly | Full render-layer rewrite once particles/multi-ball land | Only for the very first "does Skia draw" smoke test |
| `Math.random()` for particles "because it's just visual" | One line | Kills replay determinism and makes tests flaky; the boundary erodes into gameplay | Acceptable only through a *separate, clearly named* cosmetic stream |
| Two booleans instead of a power-up effects system | Simpler with exactly two power-ups | Combinatorial bug surface from power-up #3 onward; state won't serialize for replay | Never — the roadmap already commits to more power-ups |
| Object literals for entity state | Idiomatic TS, pleasant to debug | Hermes GC pauses visible during precision aiming; conversion touches all physics | Acceptable in P1 spike only if the SoA layout is designed on paper first |
| Skipping the interpolated render (render `current` directly) | Removes the previous-state copy | Subtle judder at 120 Hz; hard to attribute later | Acceptable while `DT` ≥ display rate; revisit at P8 |
| Hardcoded level layout in TS instead of the data format | Faster first level | Level editor requirement dies; re-authoring all content | Never — data-driven is a stated day-one constraint |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Reanimated `useFrameCallback` | Treating callback rate as the display rate; deriving motion from it | Fixed-timestep accumulator; the rate rises during gestures by design |
| Reanimated shared values | Reading `.value` on the JS thread to sync UI/HUD | `useDerivedValue` on the UI thread; push discrete events to JS, throttled |
| Reanimated worklets | Capturing JS callbacks in worklet closures | Known leak: `__remoteFunctionRegistry` never releases captured functions ([#9661](https://github.com/software-mansion/react-native-reanimated/issues/9661)). Keep captures to a single stable callback; avoid entirely in the hot path |
| Skia `<Canvas>` on Android | Leaving the default TextureView path | Opaque/SurfaceView mode; canvas paints its own background and sits lowest in z-order |
| Skia `usePathValue` / `usePathInterpolation` | Assuming they are free | Known self-dirtying redraw loop that any global `withRepeat(-1)` keeps alive. Prefer buffer-mutated `SkPath` |
| Gesture Handler | `setState` or `runOnJS` in `onUpdate` | Write to shared values only; store start position in `onBegin`, use `translationX` in `onUpdate`; prefer `absoluteX` if the host view is transformed |
| expo-audio | Assuming `isLoaded`/`isBuffering` mean ready-to-play | Neither is reliable. Check `playbackState === 'readyToPlay'`; preload with `Audio.preload`; hold multiple `createAudioPlayer` instances so overlapping SFX don't cut each other off |
| Expo / EAS | Profiling a dev-client or debug build | Profile release builds only; verify `CADisableMinimumFrameDurationOnPhone` in the prebuild output |
| Jest + worklets | Trying to test through the Reanimated runtime | Keep the simulation a pure numeric module importable directly; test it as plain JS, no RN runtime |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-entity blur/glow | Android 15–30 FPS, iOS fine | One shared glow layer; pre-rendered glow textures | ~10+ blurred entities on mid-range Android |
| TextureView compositing | Android frame times 2–4× iOS, no JS hotspot | Opaque/SurfaceView canvas | Immediately on fullscreen 120 Hz mid-range Android |
| React tree reconciliation on entity count change | Stutter exactly at destruction/multi-ball moments | Immediate mode `<Picture>` + `Atlas` | First brick destroyed; severe past ~50 particles |
| Unquantized animated blur radius | Steady low-grade frame cost during pulsing glow | Quantize radius/alpha to discrete steps | Any per-frame float blur value (cache misses every frame) |
| Per-frame allocation | Micro-stutter during slow motion; heap growth | Typed-array SoA state; object pools; return stable buffer refs | ~1000+ objects/sec, worse on 32-bit devices |
| O(balls × bricks) collision | Frame time scales with ball count | Grid/spatial-hash broadphase | ~3 balls × several hundred bricks |
| Unbounded particle spawn | Cliff-edge drop during heavy combos | Hard-capped pool with oldest-eviction | Combo chains destroying many bricks at once |
| Unclamped accumulator | Freeze then teleport after a stall | Clamp frame time + cap steps/frame | Any GC pause, app resume, or slow first frame |
| Offscreen/unmounted canvases still redrawing | UI thread hot at idle (17–32 ms/frame with zero interaction) | Audit for self-dirtying loops; `setActive(false)` when not playing | Any global infinite `withRepeat` in the app |

## Security Mistakes

Low surface area — offline, no backend, no accounts. What still applies:

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing high scores unsigned in plain AsyncStorage | Trivial tampering; poisons the leaderboard if cloud sync is added later as promised | Keep scores local-only in MVP; if/when sync arrives, treat the client as untrusted and validate server-side. Do not design a sync schema that assumes client honesty |
| Shipping a debug/perf overlay or dev menu in release | Leaks internals; can expose state-manipulation affordances | Strip behind `__DEV__` and verify in a release build before submission |
| Bundling analytics/ads SDKs "for later" ahead of need | Privacy-manifest and App Store data-disclosure obligations with zero product benefit | Honor the deferred-monetization decision literally: define integration seams, install nothing |
| Unvalidated level JSON when the editor arrives | Malformed/hostile level data crashes or hangs the physics step | Validate level data against a schema at load time from P4, before user-authored content exists |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Paddle centred exactly on the fingertip | The finger covers the paddle and the action under it | Offset the paddle above the touch point, or use relative drag so the finger stays clear of the play area |
| Absolute-position paddle control only | Paddle teleports on touch-down; feels twitchy and imprecise | Offer relative drag (`translationX` from an `onBegin` anchor); test both and pick by feel, not by which is easier |
| Ball launches immediately on life start | Player is thrown into action with no composure | Serve state — ball rides the paddle, launches on tap, aim indicator visible |
| Glow so strong it obscures the ball | Player loses track of the ball; directly violates "effects never steal clarity" | Ball and its immediate trail get the highest contrast; brick glow is subordinate. Validate by playtest, not by screenshot |
| Screen shake on every brick hit | Nauseating and it erases the impact signal by overusing it | Reserve shake for high-value events; keep amplitude small and decay fast; consider a reduce-motion setting |
| Near-horizontal ball stall | Player waits, powerless, for fifteen seconds | Minimum vertical velocity enforcement |
| No aim feedback on the paddle | Player can't learn the hit-position-to-angle mapping and never feels skilled | Visually communicate paddle zones (subtle segment tinting) so the control model is discoverable |
| Life loss with no clear cause | Feels unfair and random | Distinct audio + visual beat on loss; brief pause before re-serve |
| SFX latency or cut-off on rapid hits | Feedback decouples from action; combos feel mushy | Preloaded players, multiple instances per sound; verify latency on Android specifically |

## "Looks Done But Isn't" Checklist

- [ ] **Fixed timestep:** Often missing the frame-time clamp AND the max-steps cap — verify by artificially stalling 2 seconds mid-rally and confirming the ball does not teleport
- [ ] **Collision:** Often discrete-only — verify by running the ball at 10× normal speed through a dense grid and asserting zero missed bricks
- [ ] **Determinism:** Often broken by cosmetic randomness — verify a recorded input + seed produces an identical state hash across runs and across app restarts
- [ ] **Multi-ball:** Often only tested with two balls in open space — verify 5+ balls in a dense grid with no double-counting and no double-reflection
- [ ] **Pause:** Often only the in-game menu — verify `AppState` background for 60+ seconds mid-rally, and an incoming call / notification drawer
- [ ] **Power-ups:** Often missing the stacking and life-loss rules — verify picking up an active power-up again, and losing a life while one is active
- [ ] **60 FPS:** Often measured on iOS, debug build, or the RN perf monitor — verify on the named mid-range Android reference device, release build, via `gfxinfo`
- [ ] **Neon VFX:** Often only checked on one device in a quiet scene — verify during peak load (multi-ball + max particles + combo shake) on the reference device
- [ ] **Responsive layout:** Often only aspect-ratio scaling — verify play-field geometry, brick grid, and safe areas on tall (20:9) and short (4:3) devices, and that physics constants scale with the field rather than with pixels
- [ ] **Level format:** Often "data-driven" but with hardcoded assumptions — verify a second, structurally different level loads with zero code changes
- [ ] **Audio:** Often tested with single taps — verify rapid overlapping hits, and behavior with the device on silent / with other audio playing
- [ ] **Loop lifecycle:** Often never stopped — verify `setActive(false)` on pause/unmount and confirm no battery drain or leak across 20 mount/unmount cycles

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Physics on the wrong thread | HIGH | Extract the step function to a pure numeric module first (mechanical, safe), then move it into the worklet runtime, then convert remaining JS-thread reads to events. Do not attempt all three at once |
| Retained-mode rendering of variable entities | HIGH | Add a `<Picture>` immediate-mode layer alongside the existing tree; migrate entity classes one at a time (particles → balls → bricks); delete the old tree last |
| Tunneling discovered late | MEDIUM | Swept collision is a localized replacement if the step function is already pure. Ship the hard bounds check as an immediate hotfix while the sweep is written |
| Non-determinism discovered late | MEDIUM | Grep for `Math.random`, route each call site to either the seeded or the cosmetic stream, then add the golden-replay test to prevent regression |
| Glow too expensive | LOW-MEDIUM | Consolidate to one glow layer, quantize animated values, pre-render static glows. Contained to the render layer if VFX is already separated |
| TextureView compositing | LOW (code) / MEDIUM (layout) | One prop, plus reordering z-index and adding a background `<Fill>`. Cheap if the screen is simple; verify HUD layering |
| Per-frame allocation | MEDIUM | Convert the hot path to typed arrays incrementally, hottest structure first; measure after each conversion |
| Power-up state explosion | MEDIUM | Build the effects-list system, migrate the existing two power-ups into it, then add new ones. Cost grows with each ad-hoc power-up already shipped |
| Bounce feel is wrong | LOW | Paddle reflection is a small isolated function — if it is isolated. Ensure it is a single named function from P3 |
| IP/trademark problem | LOW if caught pre-launch / HIGH after | Rename, re-author assets and layouts, resubmit. After launch it means a takedown and lost store ranking |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Thread-split architecture drift | P1 (decide), all (enforce) | Zero `runOnJS` in hot paths; documented crossing contract reviewed each phase |
| Frame-rate-dependent motion | P1 | Identical end state from differently-chunked frame deliveries; same speed on 60 Hz and 120 Hz devices |
| Tunneling | P1 | Property test: extreme speeds through a dense grid, zero missed collisions |
| Non-determinism | P1 | Golden-replay hash test in CI; lint rule blocking `Math.random` in the simulation |
| Per-frame allocation | P1 (state layout), P6 (particles) | Heap flat across a 5-minute session; no allocations in the step function |
| Multi-ball correctness | P1 (N-ball data model), P5 (activate) | 5+ balls in a dense grid: no double-counting, no double-reflection, no stuck balls |
| Variable-entity rendering | P2 | Immediate mode in place before the first destructible brick ships |
| Android compositing path | P2 (set), P8 (verify) | `gfxinfo` on reference device shows no per-frame upload dominance |
| No measurement harness | P2 | FPS/frame-time overlay exists; reference device named in the roadmap |
| Backgrounding detonation | P3 | 60-second background mid-rally resumes cleanly with state intact |
| Bounce feel | P3 | Playtest: a player can deliberately aim at a chosen brick within their first minute |
| Level data not truly data-driven | P4 | A second structurally different level loads with zero code changes |
| Original level layouts | P4 | Layouts authored in-project; no transcription from reference material |
| Power-up state explosion | P1 (reserve state), P5 (system) | Stacking, life-loss, level-end, and pause behaviors documented in the schema and tested |
| Glow cost on Android | P2 (budget), P6 (design within it) | Peak-load scene holds target frame time on the reference device |
| Original visual identity | P6 | Design review against reference material; no matching palette/HUD/effect signature |
| Audio latency | P7 | Rapid overlapping SFX on Android with no cut-off or perceptible lag |
| Assumed vs measured FPS | Every phase | Frame-time acceptance criterion measured on release build on reference device |
| IP / store rejection | Pre-first-build | USPTO search on the chosen name; metadata free of trademarked terms; asset licence inventory |

## Sources

**HIGH confidence — official documentation**
- [React Native Skia — Rendering Modes](https://shopify.github.io/react-native-skia/docs/canvas/rendering-modes) — retained vs immediate mode; immediate mode is "ideal for … games … and particle systems"
- [React Native Skia — Pictures](https://shopify.github.io/react-native-skia/docs/shapes/pictures), [Atlas](https://shopify.github.io/react-native-skia/docs/shapes/atlas), [Canvas overview](https://shopify.github.io/react-native-skia/docs/canvas/overview), [Mask Filters](https://shopify.github.io/react-native-skia/docs/mask-filters/), [Animations](https://shopify.github.io/react-native-skia/docs/animations/animations/) (via Context7)
- [Reanimated — useFrameCallback](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback/) — frame timing fields, `setActive`
- [React Native — AppState](https://reactnative.dev/docs/appstate) — background/inactive semantics, Android nuances
- [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/) — player lifecycle and preloading
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 4.1 Copycats, 2.3.7 metadata
- [Toward Hermes being the Default](https://reactnative.dev/blog/2021/10/26/toward-hermes-being-the-default) — Hades GC pause figures (48 ms p99.9 / 88 ms on 32-bit)

**HIGH confidence — canonical game-dev references**
- [Fix Your Timestep! — Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/) — accumulator, spiral of death, interpolation
- [Erin Catto, Continuous Collision (GDC 2013)](https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf) — tunneling, TOI solvers, sub-stepping
- [Collision Detection in Breakout — Jake Gordon](https://jakesgordon.com/writing/collision-detection-in-breakout/) — recursive earliest-TOI resolution for exactly this genre

**MEDIUM-HIGH confidence — production post-mortems and maintainer-answered issues**
- [Margelo: Chasing a Phantom Jump (June 2026)](https://margelo.com/blog/profiling-skia-reanimated-low-end-android) — TextureView vs SurfaceView; `Container.redraw()` ~13% of JS frame budget; blur cache keyed on `(radius, color)`; per-frame allocation and GC; measurement-tool guidance
- [Skia discussion #773 — Shadow performance](https://github.com/Shopify/react-native-skia/discussions/773) — 60→15-20 FPS on Android with per-bar shadow; maintainer confirms masking is slow on Android; RN perf monitor is unreliable for Skia
- [Skia issue #2099](https://github.com/Shopify/react-native-skia/issues/2099) — animated BlurMask + Mask: 120→20-30 FPS on Pixel 6 Pro, no iOS drop
- [Skia discussion #3218](https://github.com/Shopify/react-native-skia/discussions/3218) — ECS + Skia game stutter on entity count change
- [Reanimated issue #6189](https://github.com/software-mansion/react-native-reanimated/issues/6189) — `useFrameCallback` rate increases during gestures; maintainer confirms intended
- [Reanimated issue #7984](https://github.com/software-mansion/react-native-reanimated/issues/7984) — `CADisableMinimumFrameDurationOnPhone` and ProMotion
- [Reanimated issue #9661](https://github.com/software-mansion/react-native-reanimated/issues/9661) — worklet-captured callback leak

**MEDIUM confidence — community consensus / single-source**
- [Physics for a Block Breaker Game — Smiling Cat](https://www.smilingcatentertainment.com/physics-for-a-block-breaker-game/) — why generic physics engines fight this genre; hard bounds checks; avoiding near-horizontal and near-vertical angles
- [Breakout reflection angles and level design](https://sakimyto.com/en/blog/breakout-game-canvas) — ±60° clamp rationale; serve state
- [Breakout paddle bouncing — gamedev.SE](https://gamedev.stackexchange.com/questions/158007/breakout-paddle-bouncing) — direction check eliminates in-paddle jitter
- [Cocos Creator 2D Physics on iOS](https://dev.to/imagebear/cocos-creator-2d-physics-on-ios-notes-on-fixed-timestep-promotion-and-ccd-4j52) — background/foreground physics detonation (different engine, same failure mode)
- [Tetris Holding v. Xio Interactive, 863 F. Supp. 2d 394 (D.N.J. 2012)](https://hallapproved.com/nj/cases/federal/district/2012/8715588/) — idea/expression and trade dress in game clones. Not legal advice; consult counsel before launch

**Gaps / open questions for later phase-specific research**
- Exact `Canvas` opaque/SurfaceView prop name and availability in the version of `@shopify/react-native-skia` actually installed — the docs prop table and a docs code example disagree. One-line check at P2.
- Whether the Reanimated worklet-compilation memory leaks ([#9438](https://github.com/software-mansion/react-native-reanimated/issues/9438), [#9661](https://github.com/software-mansion/react-native-reanimated/issues/9661)) are fixed in the target version, and whether a long-running game loop is exposed. Needs a soak test at P8.
- Whether expo-audio's latency is acceptable for arcade SFX on Android, or whether a lower-level audio path is required. Needs measurement at P7 — no authoritative recent benchmark found.
- Skia Graphite vs OpenGL backend status on Android for this workload — not investigated.

---
*Pitfalls research for: React Native + Skia brick breaker with custom deterministic physics*
*Researched: 2026-09-19*
