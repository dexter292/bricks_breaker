# Project Research Summary

**Project:** Neon Brick Breaker
**Domain:** Real-time 2D arcade game (paddle-and-ball brick breaker) on React Native + Expo + Skia with a custom deterministic physics engine, shipped offline/premium to iOS + Android
**Researched:** 2026-09-19
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a **real-time reflex game wearing a React Native app as a shell**, and every meaningful finding across the four research tracks points the same direction: the game must run entirely on the UI thread, with React relegated to menus and end-of-run screens. Paddle input already arrives on the UI thread (Gesture Handler), and Skia already draws from the UI thread — putting the simulation anywhere else adds a cross-runtime round-trip to the hot path and degrades exactly when the app is busiest. The recommended topology is therefore: a fixed-timestep accumulator driven by Reanimated's `useFrameCallback`, stepping pure `'worklet'`-marked TypeScript physics over a preallocated typed-array world, rendering through Skia's **immediate mode** (`SkPicture` recording), and emitting gameplay events into a ring buffer drained once per frame to the JS thread for audio, haptics, and HUD. Because the physics modules are pure functions over plain numbers, the same source runs unchanged in Node — the unit-test requirement in PROJECT.md is satisfied by construction rather than retrofitted.

The stack is effectively decided by Expo SDK 57's version matrix, which pins exact versions for every native module and is currently *behind* npm `latest` for nearly every library in this project. The single operational rule is: **install with `npx expo install`, never `npm install`**. There is one deliberate exception — `@shopify/react-native-skia@2.12.0` instead of the SDK-pinned 2.6.2, to get `select()` (one shared value, one subscription, many animated props). That override is the project's first real risk and must be smoke-tested with an EAS dev-client build on both platforms in hour one, with a documented fallback to 2.6.2.

The market finding reframes the product. Almost everything ranking under "brick breaker" on mobile today is a turn-based **aim-and-shoot "ballz" game** — no paddle, no continuous input, no reflex skill. The real-time paddle niche is under-served on mobile, and the incumbents' one-star reviews cluster on a short, fixable list: collision clipping, inconsistent paddle physics, forced interstitial ads, crashes on resume, and unfair difficulty spikes. An offline, ad-free, collision-correct, resume-safe paddle game competes directly against the actual complaints in the market. The dominant technical risks are equally concrete and all have known preventions: **tunneling** (fast ball through thin bricks — solved by swept collision from day one, never retrofitted), **per-entity neon glow on mid-range Android** (documented 60→15 FPS cliffs; solved by baking glow into sprites and using one shared glow layer), **variable-entity rendering through the React/Skia component tree** (stutters at exactly the destruction moments; solved by immediate mode), and **measuring FPS with the wrong tool** (the RN perf monitor reports a healthy 60 on a device visibly running at 15, because Skia executes outside both JS and UI threads).

## Key Findings

### Recommended Stack

Expo SDK 57 (`~57.0.24`, minimum `>=57.0.17` to clear a Hermes V1 memory regression that specifically hits worklets/Reanimated apps) with React Native 0.86.3, React 19.2.3, TypeScript `~6.0.3`. All native modules resolve through `npx expo install` to the SDK-pinned versions; `expo-doctor` runs before every EAS build. SDK 58 exists only as a preview and should be revisited after MVP. Because Skia is native code, **Expo Go cannot run this app at all** — `expo-dev-client` is mandatory from day one, and every FPS number comes from a dev-client or release build on real hardware.

The one deliberate deviation is Skia 2.12.0 over the SDK's 2.6.2, silenced via `expo.install.exclude` in `package.json`. Peer dependencies are verified compatible, but no source confirms this exact combination shipping on EAS — hence the hour-one smoke test.

**Core technologies:**
- **`expo` `~57.0.24` + `react-native` `0.86.3`** — the SDK matrix governs everything; deviating from pins breaks EAS builds or fails subtly at runtime
- **`@shopify/react-native-skia` `2.12.0`** — all gameplay rendering; `select()` (2.11.0+) binds one shared value to many props with a single subscription, which is the whole frame-budget argument
- **`react-native-reanimated` `4.5.1` + `react-native-worklets` `0.10.1`** — `useFrameCallback` is the fixed-timestep clock and runs as a UI-thread worklet; `setActive(false)` is the pause primitive
- **`react-native-gesture-handler` `~2.32.0`** — `Gesture.Pan()` handlers are worklets by default, so a drag writes straight into a shared value with zero JS-thread hop (do **not** install 3.x)
- **`expo-audio` `~57.0.5`** — the only SDK-supported audio path; `expo-av` was removed from SDK 57 entirely. Use `createAudioPlayer()` with a pooled 2–3 players per sound so rapid hits overlap
- **`vitest` `5.0.1` + `fast-check` `4.10.1`** — physics tests run as plain TS with no RN transform; property-based testing is the highest-value choice here because example-based tests systematically miss tunneling
- **Custom physics, seeded inline PRNG, no engine** — a ~5-line `mulberry32` marked `'worklet'`, state living inside the game state struct

**Explicitly rejected:** `matter-js`/`planck-js`/`box2d` (worklet-hostile, discrete collision tunnels, and a correct rigid-body solver actively fights the paddle-relative bounce that *is* the game's skill expression); `react-native-game-engine` (pushes entity state through React `setState` every tick — violates the project mandate by design); `expo-av`; `react-native-svg` for gameplay; Redux/Zustand/Jotai in the loop; `setInterval` loops; `Math.random()` anywhere in the simulation.

**Ship blocker to schedule early:** apps built against the iOS 27 SDK must use the UIKit scene-based lifecycle or they fail to launch. On SDK 57 this requires `expo-build-properties` with `ios.enableSceneSupport: true` and `expo@>=57.0.23`.

### Expected Features

The genre's canonical design question governs the whole product: *"When missing the ball, does the player's frustration center on their lack of skill, or do they blame the paddle?"* If they blame the paddle, nothing else matters. Everything below is ordered by that principle.

**Must have (table stakes):**
- **Relative-drag paddle control** (not absolute finger-follow) — absolute placement teleports the paddle on every re-press and puts the thumb over the action; this is literally the "inconsistent paddle physics" complaint in competitor reviews
- **Swept, non-clipping, deterministic collision** — tunneling reads as "the game is broken," not "the game is hard," and is the #1 review complaint in the genre
- **Paddle-relative bounce angle with degenerate-angle clamping** (±60–65°, minimum vertical component enforced) — this is where skill lives; near-horizontal and near-vertical are both un-fun
- **Docked ball + aimed launch** — a random serve is a life the player didn't lose fairly, and it doubles as text-free onboarding
- **Multi-HP brick types with non-color damage cues**, score + combo, 3 lives, clear win/lose
- **Multi-ball + paddle expand, caught on the paddle** — the catch is the interesting part: it forces a real choice between chasing the ball and chasing the drop
- **Anti-stall mitigation** — the genre's defining structural flaw; angle clamping plus a visible escalation after a stall timer
- **Pause with OS-lifecycle auto-pause and countdown resume** — losing a run to a phone call is a one-star review
- **Ball trail as readability, not decoration** — the ball must stay visible at maximum speed
- **Local high score, responsive safe-area layout, core SFX frame-accurate to impacts, measured 60 FPS on mid-range hardware**
- **Store compliance baseline** — a public HTTPS privacy policy URL is required by *both* stores, and Google's Data Safety form must be completed even for an app that collects nothing

**Should have (competitive):**
- **Neon destruction spectacle with a hard readability rule** — nothing may visually out-compete the paddle and ball; if a brick explosion hides the ball for 100ms, the effect is a bug
- **Paddle bump** — the highest-value differentiator per unit of effort. A short upward lunge converts dead waiting time into active play and largely dissolves the last-brick problem, at a fraction of the cost of Shatter's full pull/push
- **Combo-tier escalating juice** (graded hit-stop, rising pitch, trail/shake scaling) — but only *after* controls are already fair; juice over mushy controls reads as chaos
- **Haptics on impact** — cheap, and carries the "punch" a phone speaker can't
- **Hand-crafted showpiece level with authored escalation phases** — every competitor ships "thousands of levels" and gets reviewed down for uneven difficulty
- **Motion/VFX intensity scalar** driven by the OS reduce-motion flag — dampened (~20%), never a binary off switch

**Defer (v2+):**
- Shatter-style pull/push forces, deterministic replay/ghost runs, level editor, platform leaderboards, cosmetic IAP, rewarded-ad continues

**Anti-features worth naming explicitly** (several are things incumbents ship and get punished for): paddle-shrink power-downs (punishing the player for succeeding), random jitter to break stalls (silently destroys the trust model), tilt/gyro controls, turn-based "ballz" mechanics, modal text tutorials, thousands of procedural levels, and any ads/IAP/analytics SDK in MVP.

### Architecture Approach

A one-way layered pipeline with a hard runtime boundary. `core/` is pure TypeScript with zero dependencies — physics, rules, power-ups, RNG, level compilation — importable unchanged into Node for tests and into the UI runtime for play. `runtime/` is a thin host (a few hundred lines) owning the accumulator and the recording call; it is the only module that knows about both `core/` and `render/`. `render/` and `vfx/` are downstream-only: you could delete all of `vfx/` and the game plays identically, which is what makes "spectacle never compromises responsiveness" an enforceable rule rather than an aspiration. The simulation runs in virtual units (e.g. 10×16) with a single camera transform at the edges, so physics is identical on every device and level files are resolution-independent.

**Major components:**
1. **Core Simulation** (`core/`) — advances the world by exactly one `FIXED_DT`; pure `'worklet'` functions, zero allocation, no React/Skia/Reanimated imports, no `Math.random()` or `Date.now()`
2. **World State** — a single plain object allocated **on the UI runtime**, hot collections as SoA typed arrays (`Float32Array`/`Int32Array`)
3. **Game Loop Host** (`useFrameCallback`) — clamps frame time, runs N fixed substeps, computes render `alpha`, triggers recording, drains events
4. **Input Layer** — `Gesture.Pan()` writing a normalized `paddleIntent` shared value; never resolves physics
5. **Render Layer** — layered `SkPicture`s by update frequency: background (once), bricks (dirty-flagged), dynamic FX (every frame); one shared value write per frame ⇒ one redraw
6. **Event Ring Buffer** — the *only* outbound channel from the simulation; two consumers (UI-thread VFX, and one batched `scheduleOnRN` per frame for audio/haptics/HUD)
7. **Level Loader/Compiler** — versioned authoring JSON validated on the JS thread, compiled once into runtime typed arrays; the runtime never reads the authoring format
8. **Services + Platform Seams** — audio, haptics, storage behind interfaces; ads/IAP/accounts as interface-only no-op stubs from day one

Ten named patterns back this: fixed timestep with interpolation, immediate-mode layered rendering, virtual units, swept collision with the level grid *as* the broadphase, the event ring, two independent PRNG streams (gameplay vs cosmetic), pre-baked glow sprites, authoring-vs-runtime level formats, layered modules instead of ECS, and fixed-capacity pools with zero per-frame allocation.

### Critical Pitfalls

1. **Deciding the thread split late** — the physics starts as plain JS "because it's easier to test," then paddle input, power-up timers, and particle spawning each get wired to whichever thread was convenient, and the game becomes an untanglable mesh of `runOnJS` hops. *Avoid:* make the UI-thread-worklet decision explicit before any gameplay code, write down the allowed crossings as a contract, and treat every new `runOnJS` in a hot path as requiring justification. Worklet-safe code is a subset of JS, so testability is not the tradeoff it appears to be.

2. **Tunneling** — at high ball speed the per-step displacement exceeds a brick's thickness and the ball passes clean through, intermittently, only after difficulty tuning raises the speed, by which point collision is load-bearing for everything. *Avoid:* swept circle-vs-AABB from day one (Minkowski-expand the brick, ray-vs-rect, earliest TOI, reflect, iterate with a 4–5 cap), plus a hard bounds check as a backstop. A property test firing balls at extreme speeds through dense grids. Note: *reducing `DT` making a bug disappear is a tunneling fingerprint, not a fix.*

3. **Frame-rate-dependent motion, and the gesture trap** — Gesture Handler deliberately raises the `useFrameCallback` rate while a gesture is active. In a paddle game the finger is on the screen essentially always, so the ball speeds up dramatically during play. This was reported as a bug by a developer building exactly this kind of game and confirmed as intended behavior. *Avoid:* a fixed-timestep accumulator fixes this for free — extra callbacks just add smaller deltas. Never integrate the leftover remainder as a partial step.

4. **Per-entity neon glow and the Android rendering cliff** — a `<BlurMask>` or `<Shadow>` per brick looks spectacular on an iPhone at a locked 60 and drops a mid-range Android to 15–30 FPS (documented: 60→15-20 with per-bar shadows; 120→20-30 on a Pixel 6 Pro with animated BlurMask in a Mask). *Avoid:* bake glow into sprites at startup, use one shared glow layer rather than N blurred entities, prefer `BlurMask` over image filters, quantize animated blur radius (Skia's cache is keyed on radius+color, so a unique float per frame misses every frame). Related and nearly as large: the default Android **TextureView** compositing path — set the Canvas to opaque so it is backed by a SurfaceView, and accept that the canvas must then paint its own background and sit lowest in z-order.

5. **Rendering a variable number of entities through the React/Skia tree** — `bricks.map(b => <Rect/>)` is fast to *move* but stutters the moment the count changes, which in a brick breaker is every destruction and every multi-ball. Skia's own docs route "game with dynamic entities" and "particle systems" to immediate mode. *Avoid:* `<Picture>` + recorder from the first prototype; retrofitting after VFX lands is a full render-layer rewrite.

6. **Measuring 60 FPS with the wrong tool** — the RN perf monitor reported a healthy 60/60 on a device visibly running at 15, because Skia executes outside both the JS and UI threads. In this architecture the JS thread is nearly idle *by design*, so it will always look fine. *Avoid:* name a specific mid-range (ideally 120 Hz) Android reference device in the project constraints, measure on release builds with `adb shell dumpsys gfxinfo`, the Canvas `debug` prop, and platform profilers, and gate every phase from the prototype onward on a measured frame-time criterion.

Also worth carrying forward, in descending severity: backgrounding detonating the accumulator (clamp *and* an `AppState` listener that resets rather than catches up), silent non-determinism entering through cosmetic randomness (two separate PRNG streams, a lint rule, a golden-replay hash test), multi-ball turning single-collision bugs into a chaos generator (brick grid as destruction authority; life loss evaluated once at end of step from `activeBalls.length === 0`), per-frame allocation and Hermes GC pauses (~48ms p99.9 — invisible during fast motion, very visible during the precision-aiming settle), power-up state explosion (model as data with an explicit `stackPolicy`; derive paddle width, never assign it), bounce physics that is technically correct but not fun, and inspiration drifting into imitation (App Store Guideline 4.1; author all level layouts originally and run a USPTO search on the name before the first TestFlight build).

## Implications for Roadmap

Research converges on a build order that is remarkably consistent across the architecture and pitfalls tracks. The non-negotiable shape: **a de-risking spike, then headless physics, then the render/input integration — strictly sequential — after which five workstreams parallelize cleanly because the layer boundaries are one-way.**

### Phase 1: Foundation & Thread-Boundary Spike
**Rationale:** Every later decision rests on this, and retrofitting worklet compatibility onto a finished physics engine is a rewrite. It is also where the project's two version bets get proven or killed cheaply. A native-build incompatibility found in hour one is free; found in week six it is expensive.
**Delivers:** Expo SDK 57 project on the pinned matrix; Skia + Reanimated/Worklets + Gesture Handler wired with the worklets Babel plugin last; `expo.install.exclude` for the Skia override; `ios.enableSceneSupport`; portrait lock; EAS dev-client builds on **both** platforms; Vitest harness running `core/` in Node; a named mid-range Android reference device; an in-game frame-time overlay behind a dev flag.
**Proves on real hardware:** a `'worklet'`-marked pure TS module imported across ≥5 files runs inside `useFrameCallback`; a world object allocated on the UI runtime can be mutated in place across frames without hitting Reanimated's shareable-freeze; N dummy sprites recorded into an `SkPicture` hold 60 FPS.
**Avoids:** Pitfall 1 (late thread-split decision), and the Skia-2.12.0-on-EAS unknown. Documented fallbacks: Skia 2.6.2 with per-prop `useDerivedValue`; typed-arrays-in-one-shared-value; Worklets Bundle Mode with `importForwarding`.

### Phase 2: Core Simulation, Headless
**Rationale:** Physics is the riskiest logic and is far easier to get right without a renderer confusing the picture. This front-loads the PROJECT.md unit-test requirement instead of bolting it on. Must be sequential with Phase 3.
**Delivers:** the `World` shape as preallocated SoA typed arrays; fixed-timestep accumulator with frame clamp and max-steps cap; swept circle-vs-AABB against the level grid with explicit corner handling; reflection with paddle-relative angle mapping and speed preservation; two seeded PRNG streams; the event ring buffer; **an N-ball data model even though only one ball ships yet**; a reserved slot in the state for the power-up effects list.
**Addresses:** deterministic collision, bounce-angle control (the skill layer), the foundations of score/combo.
**Avoids:** Pitfalls 2, 3, 5, 6, 9, 12. Tests: a tunneling property test at 2× max designed speed through a dense grid; a golden-replay hash test asserting identical end state across differently-chunked frame deliveries; a lint rule failing the build on `Math.random()` in the simulation directory.

### Phase 3: Render Bridge + Input → First Playable
**Rationale:** The mandated sequential integration point. Ends with something you can hold and feel — the earliest honest read on whether the controls are snappy, which is the whole product thesis.
**Delivers:** camera transform (virtual units → device pixels, safe-area aware); immediate-mode `<Picture>` layers split by update frequency; opaque/SurfaceView Canvas with its own background `<Fill>` and correct z-order; `Gesture.Pan` → `paddleIntent` relative-drag control; flat untextured shapes. Ugly and correct.
**Uses:** Skia `PictureRecorder` with module-scope recorder and paints; Gesture Handler 2.32.0.
**Avoids:** Pitfalls 5 (immediate mode before the first destructible brick), 8 (Android compositing set up front — retrofitting means reordering the whole screen), 13 (the measurement harness and frame budget are established *here*, not at the end).

### Phase 4: Playable Prototype — Bricks, Lives, Serve, Pause
**Rationale:** Turns the integration into a game loop and forces the feel question early, while bounce tuning is still a small isolated function.
**Delivers:** destructible bricks with HP; lives and respawn; serve state (ball rides the paddle, launches on tap); win/lose transitions; pause menu **plus** `AppState` background/foreground handling with accumulator reset and a tap-to-resume screen.
**Acceptance criterion should be a feel judgment,** not a functional one: *can a player deliberately aim at a chosen brick within their first minute?*
**Avoids:** Pitfalls 10 (bounce feel), 11 (backgrounding detonation — test by backgrounding 60+ seconds mid-rally).

### Phase 5: Level Format, Compiler & Brick Types
**Rationale:** Needs working collision to be meaningful; unlocks all content work. Parallelizable with Phase 6.
**Delivers:** versioned authoring JSON schema (row-strings, brick-type table, per-cell overrides, ball tuning, lives), a JS-thread validator, a compile step producing runtime typed arrays, a `migrations/` folder, and multiple brick types including at least one indestructible/structural brick with non-color damage cues.
**Avoids:** making the authoring format the runtime format; hardcoded level layouts (which kill the editor requirement). Verification: a second, structurally different level loads with zero code changes.

### Phase 6: Rules — Scoring, Combo, Power-Ups, Anti-Stall
**Rationale:** Operates on the same `World` but is independent of level *parsing*, so it runs alongside Phase 5.
**Delivers:** scoring and combo with decay on paddle contact; the phase state machine; a **data-driven power-up effects system** (`{ id, type, duration, stackPolicy, onApply, onExpire }`) with multi-ball and paddle expand as its first two entries; derived paddle width and ball count computed from base + active effects each step; stall-timer escalation.
**Avoids:** Pitfall 12 (power-up state explosion) and Pitfall 5's multi-ball chaos. Two decisions must be written into the schema before implementation: a life is lost only when the *last* ball leaves play, and paddle-expand must normalize the bounce-angle mapping against the *current* width or it silently changes the control feel mid-run.

### Phase 7: UI Shell, HUD, Persistence & Platform Seams
**Rationale:** Needs the phase state machine from Phase 6. Pure cold-path React; touches nothing in the hot path, so it parallelizes with Phase 8.
**Delivers:** menus, HUD driven by discrete shared-value mirrors (never per-frame), pause/results overlays, instant restart with no confirmation dialog, responsive safe-area layout, local high score persistence via AsyncStorage, and the ads/IAP/accounts interfaces as no-op stubs with real call sites (`onRunEnded()`).
**Note:** the platform seams are roughly thirty minutes of work — fold them in, do not make them a phase.

### Phase 8: Audio via the Event Bus
**Rationale:** Needs the event taxonomy from Phase 6; fully decoupled from rendering.
**Delivers:** an `AudioService` interface consuming the batched event drain; `createAudioPlayer()` pools of 2–3 per sound so rapid hits overlap; all SFX decoded at load, never at first play; rate-limited haptics.
**Avoids:** the simulation calling `playSound()` directly (which turns a 15-brick chain into 15 cross-runtime hops in one frame). Verify latency and overlap on Android specifically — `isLoaded`/`isBuffering` are not reliable readiness signals; check `playbackState === 'readyToPlay'`.

### Phase 9: Neon VFX
**Rationale:** Deliberately last among feature work. Building spectacle before the loop feels right inverts the stated 40/30/30 priority and risks tuning effects around a game that then changes.
**Delivers:** glow sprites baked to `SkImage` at startup (2–3 intensity variants) with additive blending; a fixed-capacity pooled particle system; ball trails; decaying screen shake reserved for high-value events; and a **global VFX intensity scalar wired into the emitter API from the first particle**, defaulting from the OS reduce-motion flag — this single scalar resolves both the readability conflict and the accessibility requirement.
**Avoids:** Pitfalls 4 and 7. Hard rule inherited from Phase 3: every VFX addition is measured on the reference Android device before merge.

### Phase 10: Performance Pass on Real Devices
**Rationale:** Must follow Phase 9 — you cannot certify a frame budget before the expensive things exist. This is the *final* pass, not the first measurement.
**Delivers:** release-build profiling via `gfxinfo`, Canvas `debug`, and Hermes sampling profiler; a `quality: 'high' | 'medium' | 'low'` device tier controlling particle cap, trail length, and glow variants (nothing in `core/` reads it); a worst-case-frame verification (multi-ball × max particles × combo shake), not an idle-scene one; a soak test for worklet/loop leaks across mount-unmount cycles.

### Phase 11: Level Design, Difficulty Tuning & Launch Readiness
**Rationale:** Needs everything above to evaluate feel. Critically, **level authoring must come after feel tuning** — the level is the most expensive hand-made artifact in the MVP, and authoring it against un-tuned ball speed or paddle width means re-authoring it.
**Delivers:** the ~2–3 minute arcade challenge with authored escalation phases and plateau (stair-step) difficulty; ball-speed ramp and drop-rate tuning; original visual identity review against reference material; privacy policy URL, Play Data Safety form, honest age rating, `PrivacyInfo.xcprivacy`, USPTO search on the chosen name, and an asset licence inventory.
**Avoids:** Pitfall 14 (inspiration becoming imitation → Guideline 4.1 rejection).

### Phase Ordering Rationale

- **Phase 1 is non-negotiable and non-parallel.** It de-risks the project's central architectural bet plus its one version override. If the spike shows worklet-hosted simulation is impractical, falling back to a JS-thread loop costs days now and weeks later.
- **Phases 2 → 3 → 4 are strictly sequential,** exactly as PROJECT.md mandates for physics ↔ game loop ↔ rendering. Parallel development here produces components built against different assumptions about state shape, update cadence, and coordinate space, followed by a painful merge.
- **Phases 5–9 parallelize well** because the layer boundaries are one-way: levels, rules, UI, audio, and VFX each touch a different seam of the `World` and never each other. Natural pairs: 5∥6 and 7∥8.
- **Several architectural commitments must be made in Phase 2 even though they pay off much later.** The N-ball data model (activated in Phase 6), the power-up effects list slot (filled in Phase 6), the separate cosmetic PRNG stream (used in Phase 9), and the typed-array SoA layout (which would otherwise touch every line of physics to convert). Each of these is cheap now and a migration later.
- **Performance is a per-phase gate, not a phase.** Phase 3 establishes the harness and the budget; every phase from Phase 4 onward carries a measured frame-time acceptance criterion on the named reference device; Phase 10 is the final certification.
- **Content comes last on purpose.** The showpiece level is authored against locked feel constants, and the store-compliance work sits with it because both are launch-shaped rather than engineering-shaped.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1** — the least-documented territory in the whole project: worklet-hosted mutable game state, UI-runtime world allocation vs Reanimated's shareable-freeze behavior, cross-module `'worklet'` imports, and whether Skia 2.12.0 builds cleanly on EAS against the SDK 57 matrix. Four of the five architecture validation gates land here.
- **Phase 3** — where the frame budget's real shape becomes known: the per-frame `SkPicture` recording budget on mid-range Android, and the exact Canvas opaque/SurfaceView prop name, which the Skia docs' prop table and their own code example disagree on.
- **Phase 8** — no authoritative recent benchmark exists for `expo-audio` SFX latency on mid-range Android. The migration path to `react-native-audio-api` is known but must be triggered by measurement, not assumption.
- **Phase 9** — where the Android glow-performance cliff lives, and where art direction and the frame budget negotiate. Whether baked sprites achieve the intended neon look, or a single full-screen `RuntimeShader` bloom pass is needed, is an art spike.

Phases with standard patterns (skip research-phase):
- **Phase 2** — fixed timestep, swept circle-vs-AABB, and seeded PRNGs are canonical and thoroughly documented; the research already contains the formulations.
- **Phases 5, 6, 7** — level compilation, effect-list systems, and cold-path React UI are well-trodden. The design decisions are already specified above; they need planning, not research.
- **Phase 11** — the store-compliance requirements were verified directly against Apple and Google's official documentation and need execution, not investigation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Versions read directly from the `sdk-57` branch's `bundledNativeModules.json`, npm dist-tags, published peer-dependency metadata, and official changelogs. Two independent confirmations of the `expo-av` removal. The Skia 2.12.0 override and the `expo-audio` latency question are the only MEDIUM items, and both have explicit fallbacks. |
| Features | **MEDIUM-HIGH** | Genre design canon comes from a practitioner-authored primary source, and store requirements from official Apple/Google documentation (HIGH). Competitor weakness claims come from live store listings plus user reviews — real signal, but not controlled research. The "under-served paddle niche" read is inferred from store search composition, not revenue data. |
| Architecture | **MEDIUM-HIGH** | Rendering and threading mechanics are HIGH (official Skia, Reanimated, and Worklets docs). The specific "whole simulation in a worklet" recommendation is inferred from documented primitives rather than a published RN game case study — which is precisely why Phase 1 exists as an empirical gate rather than an assumption. |
| Pitfalls | **MEDIUM-HIGH** | Game-loop and collision pitfalls are HIGH (long-standing canonical references: Gaffer On Games, Erin Catto's GDC talk). RN/Skia rendering pitfalls are MEDIUM-HIGH, sourced from official docs plus maintainer-answered issues and a recent detailed production post-mortem with concrete measured numbers. Audio and legal are MEDIUM. |

**Overall confidence:** MEDIUM-HIGH. The stack is pinned and verifiable, the failure modes are specific and evidenced with numbers, and the preventions are concrete. The residual uncertainty is concentrated in one place — whether the UI-thread-worklet simulation topology works as cleanly as the documented primitives suggest — and the roadmap deliberately front-loads that question into a short, cheap, fallback-equipped spike.

### Gaps to Address

- **Worklet-hosted mutable world state** (the central architectural bet): settle in the Phase 1 spike, in dev *and* release builds on both platforms. Fallback: all hot state in typed arrays inside one shared value; or move the simulation to the JS thread with `requestAnimationFrame` (a one-line call-site change, since the physics functions are pure and `'worklet'`-marked either way).
- **Skia 2.12.0 on EAS Build:** unresolvable from documentation — no source confirms this combination shipping. Phase 1 dev-client build on both platforms decides it; fall back to the SDK-pinned 2.6.2 with per-prop `useDerivedValue`.
- **Per-frame `SkPicture` recording budget on mid-range Android:** ramp draw-command count in Phase 1/3 until frame time exceeds budget. Unknown until measured; shift more layers to dirty-flag caching, or move particles to the Atlas API.
- **`FIXED_DT = 1/120` sufficiency at maximum ball speed:** settle with the automated tunneling test in Phase 2 at 2× the intended max speed. Fallback: smaller `FIXED_DT`, or a hard speed ceiling in the rules layer.
- **Particle throughput:** no RN Skia–specific benchmarks were found. Treat every VFX complexity estimate as provisional until the performance harness exists; make `maxParticles` a device-tier setting from the start rather than a late emergency patch.
- **`expo-audio` SFX latency on mid-range Android:** measure in Phase 8. The single-file migration to `react-native-audio-api` is the escape hatch, but it needs a dev-client rebuild and its own config plugin — do not attempt it in the same phase as gameplay work.
- **Canvas opaque/SurfaceView prop name:** the Skia docs' prop table and a code example on the same page disagree. One-line check against the installed version in Phase 3.
- **Reanimated worklet-compilation memory leaks** (issues #9438, #9661): unknown whether fixed in 4.5.1, and a long-running game loop is exactly the exposed case. Needs a soak test in Phase 10.
- **Baked glow sprites vs. the intended neon look:** an art-direction question, not a technical one. Art spike in Phase 9; fallback is a single full-screen `RuntimeShader` bloom pass (one filter, not per-entity).

## Sources

### Primary (HIGH confidence)
- npm registry, queried directly 2026-09-19 — exact versions, dist-tags, and peer dependencies for every package
- `raw.githubusercontent.com/expo/expo/sdk-57/packages/expo/bundledNativeModules.json` — the authoritative SDK 57 version matrix
- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57) — RN 0.86.3, Hermes V1 regressions and fix versions, Xcode 27 scene-lifecycle requirement
- [React Native Skia docs](https://shopify.github.io/react-native-skia/) — rendering modes (games/particles → immediate), Pictures, Atlas, animations/`select()`, image and mask filters, gestures, installation compatibility floors
- [Reanimated `useFrameCallback`](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback/), [troubleshooting/object freezing](https://docs.swmansion.com/react-native-reanimated/docs/3.x/guides/troubleshooting/)
- [react-native-worklets](https://docs.swmansion.com/react-native-worklets/docs/) — glossary, Babel plugin autoworkletization limits, sharing memory, `scheduleOnRN`/`scheduleOnUI`
- [Expo Audio SDK](https://docs.expo.dev/versions/latest/sdk/audio/); [`expo-av` SDK 57 docs → 404](https://docs.expo.dev/versions/v57.0.0/sdk/av/), confirming removal
- [Expo CLI — `expo.install.exclude`](https://docs.expo.dev/more/expo-cli/)
- [React Native AppState](https://reactnative.dev/docs/appstate); [Toward Hermes Being the Default](https://reactnative.dev/blog/2021/10/26/toward-hermes-being-the-default) — Hades GC pause figures
- [Gaffer On Games — Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/); [Erin Catto — Continuous Collision, GDC 2013](https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf); [Jake Gordon — Collision Detection in Breakout](https://jakesgordon.com/writing/collision-detection-in-breakout/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (4.1 Copycats, 2.3.7 metadata), [App Store Connect app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/), [Reduced Motion evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/), [Onboarding for Games](https://developer.apple.com/app-store/onboarding-for-games/)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469) and [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311); [Android accessibility guidance](https://developer.android.com/guide/topics/ui/accessibility/apps)
- [Game Developer — Breaking Down Breakout](https://www.gamedeveloper.com/design/breaking-down-breakout-system-and-level-design-for-breakout-style-games) — genre element taxonomy, Game Token Priority, Level Quality Checklist

### Secondary (MEDIUM confidence)
- [Margelo — Chasing a Phantom Jump (June 2026)](https://margelo.com/blog/profiling-skia-reanimated-low-end-android) — TextureView vs SurfaceView, `Container.redraw()` at ~13% of the JS frame budget, blur cache keying, GC and allocation, measurement-tool guidance
- Skia [discussion #773](https://github.com/Shopify/react-native-skia/discussions/773) (60→15-20 FPS Android shadows; maintainer confirms perf monitor unreliability), [issue #2099](https://github.com/Shopify/react-native-skia/issues/2099) (120→20-30 on Pixel 6 Pro), [discussion #3218](https://github.com/Shopify/react-native-skia/discussions/3218) (ECS + entity-count stutter), [issue #2521](https://github.com/Shopify/react-native-skia/issues/2521) (Atlas FFI throttling), [discussion #3556](https://github.com/Shopify/react-native-skia/discussions/3556)
- Reanimated [issue #6189](https://github.com/software-mansion/react-native-reanimated/issues/6189) (frame-callback rate rises during gestures — confirmed intended), [#7984](https://github.com/software-mansion/react-native-reanimated/issues/7984) (ProMotion), [#9661](https://github.com/software-mansion/react-native-reanimated/issues/9661) (worklet-captured callback leak)
- [Game Developer — Shatter solved The Breakout Problem](https://www.gamedeveloper.com/design/shatter-solved-the-breakout-problem-please-don-t-keep-making-the-same-mistake-), [Eurogamer](https://www.eurogamer.net/shatter-review) and [PCWorld](https://www.pcworld.com/article/456672/review-shatter-combines-bullet-hell-with-brick-breaking-heaven.html) reviews, [TheSixthAxis Sidhe interview](https://www.thesixthaxis.com/2009/07/21/interview-sidhe-on-shatter/)
- [Smiling Cat — Physics for a Block Breaker Game](https://www.smilingcatentertainment.com/physics-for-a-block-breaker-game/); [Breakout reflection angles](https://sakimyto.com/en/blog/breakout-game-canvas); [gamedev.SE — paddle bouncing](https://gamedev.stackexchange.com/questions/158007/breakout-paddle-bouncing)
- [jjunior.net — relative-drag control](https://jjunior.net/articles/why-glydra-uses-relative-drag-control/); [Jake Gordon — Touch Support for Mobile Breakout](https://jakesgordon.com/writing/adding-touch-to-breakout/)
- [react-native-emoji-burst](https://github.com/nphardorworse/react-native-emoji-burst) (typed-array pool + UI-thread worklet physics); [rn-game-engine-next](https://github.com/ahsanmunyr/rn-game-engine-next) (JS-thread-sim split)
- [Thoughts on ECS](https://blog.voxagon.se/2025/03/28/thoughts-on-ecs.html); [@thi.ng/timestep](https://docs.thi.ng/umbrella/timestep/)
- [Tetris Holding v. Xio Interactive](https://hallapproved.com/nj/cases/federal/district/2012/8715588/) — idea/expression and trade dress. *Not legal advice; consult counsel before launch.*

### Tertiary (LOW confidence — needs validation)
- Competitor store listings and review aggregators (Ballistic, Brick Out, Legend Balls, Bricks Breaker Dash; [appviewable](https://appviewable.com/apps/app-brick-out-shoot-the-ball/)) — user-reported complaints, not verified defects; directionally useful for positioning
- [Arkanoid clone with JSON levels + editor](https://github.com/cosgunhalil/arkanoid-clone), [SDL3 Breakout with map editor](https://www.studyplan.dev/sdl3/sdl3-breakout-start) — the authoring/runtime format split is corroborated; the specific schema proposed is a design, not a standard
- [Cocos Creator 2D Physics on iOS](https://dev.to/imagebear/cocos-creator-2d-physics-on-ios-notes-on-fixed-timestep-promotion-and-ccd-4j52) — different engine, same backgrounding failure mode
- Haptics' contribution to perceived game feel — asserted from general mobile UX guidance, not genre-specific research

---
*Research completed: 2026-09-19*
*Ready for roadmap: yes*
