# Stack Research

**Domain:** 2D arcade brick-breaker mobile game (React Native / Expo / Skia, custom deterministic physics)
**Researched:** 2026-09-19
**Confidence:** HIGH for versions and compatibility (verified against npm registry + Expo SDK 57 `bundledNativeModules.json` + official docs). MEDIUM for the one deliberate deviation from SDK pins (Skia) and for the audio recommendation.

---

## The One Rule That Governs This Whole Stack

**Expo SDK 57 pins exact versions of every native module, and npm `latest` is currently ahead of those pins for almost every library in this project.** Installing "latest" will produce a build that either fails on EAS or breaks subtly at runtime.

Verified drift as of 2026-09-19:

| Package | npm `latest` | Expo SDK 57 pin | Use |
|---------|--------------|-----------------|-----|
| `react-native` | 0.87.1 | **0.86.3** | SDK pin |
| `react-native-reanimated` | 4.7.0 | **4.5.1** | SDK pin |
| `react-native-worklets` | 0.12.2 | **0.10.1** | SDK pin |
| `react-native-gesture-handler` | 3.3.0 | **2.32.0** | SDK pin |
| `typescript` | 7.0.2 | **~6.0.3** (template) | SDK pin |
| `@shopify/react-native-skia` | 2.12.0 | 2.6.2 | **2.12.0 — deliberate override, see below** |

Concretely: `react-native-reanimated@4.7.0` declares `peerDependencies: { "react-native-worklets": "0.13.x" }`, and worklets `0.13.0` is only published under the `next` dist-tag. Reaching for latest on Reanimated forces a prerelease worklets runtime into the hot path of a 60 FPS game.

**Always install with `npx expo install <pkg>`, never `npm install <pkg>`.** Use `npx expo install --fix` after any dependency change, and `npx expo-doctor@latest` before every EAS build.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `expo` | `~57.0.24` | SDK, CLI, config plugins, prebuild | SDK 57 is the current stable `latest` dist-tag. SDK 58 exists only as `58.0.0-preview.3` / canary — not production. SDK 57 is explicitly a small, non-breaking RN 0.86 release, so it is the lowest-risk foundation available right now. **Pin at `>=57.0.17`**: 57.0.9 fixed a Hermes V1 memory regression that drastically inflated memory in apps importing `react-native-worklets`/`reanimated` (exactly this app), and 57.0.17 fixed a dev-mode startup regression. |
| `react-native` | `0.86.3` | Runtime | SDK-pinned. New Architecture only, Hermes V1. Do not deviate. |
| `react` / `react-dom` | `19.2.3` | UI layer (menus, HUD shell, overlays only) | SDK-pinned. React renders the shell; it must never render the play field per frame. |
| `typescript` | `~6.0.3` | Types | This is what `expo-template-blank-typescript@57.0.26` ships. TypeScript **7.0.2** (the Go-native compiler port) is npm `latest` but has no Expo/Metro/babel-preset-expo validation yet. A physics engine is exactly where you want boring, proven type checking. |
| `@types/react` | `~19.2.2` | Types | SDK template pin. Do not jump to `@types/react@19.3.0`. |
| `@shopify/react-native-skia` | `2.12.0` | All gameplay rendering (bricks, ball, paddle, glow, trails, particles) | **Deliberate override of the SDK 2.6.2 pin.** Peer deps of 2.12.0 are `react-native >=0.78`, `react >=19`, `react-native-reanimated >=4.0.0`, `react-native-worklets >=0.7.0` — all satisfied by SDK 57 (0.86.3 / 19.2.3 / 4.5.1 / 0.10.1). The reason to override: **`select()` shipped in 2.11.0** ("drive multiple animated props from a single shared value"). See "Why the Skia override matters" below. Ships prebuilt binaries (`react-native-skia-android`/`-apple-ios` @ `154.0.0`, Skia m154) as plain npm deps — no postinstall script, no `trustedDependencies` config. |
| `react-native-reanimated` | `4.5.1` | UI-thread frame driver + shared-value transport | SDK-pinned. `useFrameCallback` is the fixed-timestep clock (see below). Skia 2.10+ *requires* Reanimated v4 for its native animation integration. |
| `react-native-worklets` | `0.10.1` | Worklet runtime + babel plugin | SDK-pinned. Reanimated 4 split worklets into this package; it is what actually moves the physics step off the JS thread. |
| `react-native-gesture-handler` | `~2.32.0` | Paddle input | SDK-pinned. `Gesture.Pan()` handlers are worklets by default, so a drag writes straight into a shared value on the UI thread with zero JS-thread round-trip. **Do not install 3.x** — the 2.x line is maintained through RN 0.87 (`2.33.0`), and 3.x targets the next SDK. |

### The game loop, concretely

This is the architectural core, and all three pieces are verified against official docs:

1. **Clock** — `useFrameCallback((frameInfo) => { 'worklet'; ... })` from Reanimated. The callback is auto-workletized and runs on the UI thread. `frameInfo.timeSincePreviousFrame` (~16 ms at 60 Hz, ~8 ms at 120 Hz, `null` on the first frame) is the raw delta you feed into a fixed-timestep accumulator. `setActive(false)` is your pause — it stops the loop dead without unmounting anything, which is exactly the pause/resume requirement.
2. **State transport** — one `useSharedValue` holding the whole game snapshot (ball positions, paddle x, brick states). Shared values live in memory accessible to both runtimes; writing to them does not trigger a React render. This is what satisfies "no React state updates every physics frame."
3. **Render binding** — pass shared values directly as Skia props. Skia has no `createAnimatedComponent`/`useAnimatedProps` requirement; you bind the value to the prop and Skia re-renders on the UI thread.

**Worklet constraint to plan around:** any pure physics function imported into the frame callback needs the `'worklet'` directive at the top so the Worklets babel plugin picks it up. Plain `'worklet'`-marked exported functions are still ordinary functions in Node, so **the same file is directly unit-testable in Vitest with no mocking** — the directive is an inert string literal outside React Native. Design the physics module as `'worklet'`-marked pure functions taking and returning plain objects/typed arrays, and you get UI-thread execution and trivial testability from one source of truth.

### Why the Skia override matters

Without `select()`, driving N props from animated state means N `useDerivedValue` calls and N subscriptions. In a brick breaker you have a paddle, 1–3 balls, and dozens of bricks — the subscription count is exactly the thing that eats frame budget. `select(sharedValue, "cx")` binds one key of one object-valued shared value to one prop, so a single shared value with a single subscription drives the entire scene. From the official docs: *"one shared value drives three props with a single subscription, instead of three derived values with three subscriptions."*

The cost of the override: `npx expo-doctor` will emit a version-mismatch warning. Silence it intentionally in `package.json`:

```json
{
  "expo": {
    "install": {
      "exclude": ["@shopify/react-native-skia"]
    }
  }
}
```

`expo.install.exclude` is the officially documented mechanism for using a version other than the one `npx expo install` recommends.

**Fallback:** if a dev-client build with 2.12.0 fails on either platform, drop to the SDK-pinned `2.6.2` and use `useDerivedValue` per prop. Do this smoke test in the very first phase, before any gameplay code exists — a native-build incompatibility discovered in week six is expensive, and discovered in hour one is free.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-audio` | `~57.0.5` | All SFX (paddle hit, brick hit/break, power-up, life lost, win/lose) | **The only SDK-supported audio option.** `expo-av` is gone from SDK 57 — absent from `bundledNativeModules.json`, and `docs.expo.dev/versions/v57.0.0/sdk/av/` returns 404. Build the modular SFX layer on `createAudioPlayer()` (not `useAudioPlayer`) so players live outside the React component lifecycle in a small pre-warmed pool; you own `release()`. A pool of 2–3 players per sound is what lets rapid brick hits overlap instead of cutting each other off. |
| `expo-haptics` | `~57.0.3` | Impact feedback on brick break / life lost | Cheap, large perceived-punch return. Fits the 40% "arcade punchy" budget. Keep it off the physics thread — fire from the JS side via `scheduleOnRN`. |
| `expo-keep-awake` | `~57.0.2` | Prevent screen sleep mid-run | Already a transitive dep of `expo`. Enable during active play only. |
| `expo-screen-orientation` | `~57.0.2` | Lock orientation | Lock to portrait (or your chosen single orientation) at boot. A brick breaker with a rotating play field is a physics and layout problem you do not need. |
| `react-native-safe-area-context` | `~5.7.0` | Play-field bounds on notched/gesture-bar devices | SDK-pinned. The play field's wall geometry must derive from safe-area insets, not raw window dimensions, or collision boundaries land under the home indicator. |
| `expo-build-properties` | `~57.0.21` | Native build config | **Required for shipping.** Apps built with the iOS 27 SDK must use the UIKit scene-based lifecycle or they fail to launch on iOS 27. SDK 58 does this by default; on SDK 57 you must opt in via `ios.enableSceneSupport` (needs `expo@>=57.0.23`). |
| `expo-dev-client` | `~57.0.19` | On-device development | **Mandatory.** Skia is native code and is not in Expo Go. Every real-device FPS measurement happens in a dev client or a release build. |
| `expo-splash-screen` | `~57.0.9` | Boot experience | SDK-pinned; hide only after Skia textures/atlas are prepared so the first frame is never a blank canvas. |
| `expo-status-bar` / `expo-system-ui` | `~57.0.1` / `~57.0.4` | Immersive chrome | Dark background + hidden status bar during play, for the neon look. |
| `@react-native-async-storage/async-storage` | `2.2.0` | Local high scores (when that phase arrives) | SDK-pinned, zero-risk. `react-native-mmkv@4.3.2` is synchronous and faster, but it is an unpinned native module and high scores are written once per run — the speed is irrelevant here. Take the SDK-pinned option. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `vitest` | `5.0.1` | **Unit tests for physics, collisions, scoring, level parsing** | Requires Node `^22.12.0 \|\| ^24 \|\| >=26`. Runs pure TS directly with no React Native transform, no `transformIgnorePatterns`, no jsdom — so the collision suite runs in milliseconds and you will actually run it on every save. |
| `@vitest/coverage-v8` | `5.0.1` | Coverage on the physics core | Must match the `vitest` major exactly. Gate the physics/collision modules at high coverage; do not gate UI. |
| `fast-check` | `4.10.1` | Property-based collision testing | **The highest-value testing choice for this project.** Example-based tests miss tunneling. Properties to assert across thousands of generated inputs: ball speed magnitude is preserved (within epsilon) across any reflection; a ball never ends a step inside a brick's AABB; the same seed + same input sequence produces a byte-identical state hash after N steps (this *is* your determinism test); reflection off a vertical wall negates only x. |
| `jest-expo` | `~57.0.5` | React component tests — **only if needed later** | Peer-deps on `@react-native/jest-preset@^0.86.3`. Skia's Jest mocks need `testEnvironment: "@shopify/react-native-skia/jestEnv.js"` plus `setupFilesAfterEnv: ["@shopify/react-native-skia/jestSetup.js"]` and Skia added to `transformIgnorePatterns` — it loads CanvasKit WASM. Heavy. Defer until there is a component worth testing; do not put the physics core here. |
| `eas-cli` | `24.7.0` | Cloud builds, submission | Run via `npx eas-cli@latest`; do not add as a project dependency. |
| `eslint-config-expo` | `~57.0.2` | Lint baseline | SDK-pinned. |
| `typescript-eslint` | `8.70.0` | TS lint rules | Pairs with TS 6.0.x. |
| `prettier` | `3.9.8` | Formatting | Standard. |
| `tsx` | `4.23.13` | Run TS scripts in Node | For level-format validators and headless physics soak tests (run 100k deterministic steps in CI, assert no NaN, no escape, no tunneling). |

**FPS measurement:** do not add a performance library. `react-native-performance@7.0.0` measures startup, not frame pacing, and `@shopify/react-native-performance@4.1.2` was last published in April 2026. Build an in-game FPS/frame-time readout from `frameInfo.timeSincePreviousFrame` inside the frame callback you already have, render it as a Skia text node, and cross-check against Xcode Instruments (iOS) and Perfetto / Android GPU rendering profiler. You need the *frame-time distribution and worst-case spikes*, not a mean FPS number — a game that averages 60 with periodic 40 ms hitches feels broken.

---

## Installation

```bash
# Scaffold (the Skia template pre-wires the Canvas + Reanimated setup)
npx create-expo-app@latest bricks-breaker -e with-skia
cd bricks-breaker

# Align everything to the SDK 57 matrix
npx expo install expo@^57.0.24 --fix

# Gameplay runtime (SDK-pinned resolution)
npx expo install \
  react-native-reanimated \
  react-native-worklets \
  react-native-gesture-handler \
  react-native-safe-area-context

# Skia — deliberate override of the SDK 2.6.2 pin (add expo.install.exclude first)
npm install @shopify/react-native-skia@2.12.0

# Platform services
npx expo install \
  expo-audio \
  expo-haptics \
  expo-keep-awake \
  expo-screen-orientation \
  expo-splash-screen \
  expo-system-ui \
  expo-status-bar \
  expo-build-properties \
  expo-dev-client

# Test + tooling (plain npm — not native, so no SDK pinning applies)
npm install -D vitest@5.0.1 @vitest/coverage-v8@5.0.1 fast-check@4.10.1 tsx@4.23.13
npm install -D typescript@~6.0.3 @types/react@~19.2.2
npm install -D eslint-config-expo@~57.0.2 typescript-eslint@8.70.0 prettier@3.9.8

# Verify before building
npx expo-doctor@latest

# First real-device build — do this before writing gameplay code
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile development --platform android
```

Required `babel.config.js` — the worklets plugin must be **last**:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
```

Required `app.json` additions:

```json
{
  "expo": {
    "orientation": "portrait",
    "plugins": [
      ["expo-build-properties", { "ios": { "enableSceneSupport": true } }]
    ],
    "install": { "exclude": ["@shopify/react-native-skia"] }
  }
}
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Custom deterministic physics | `matter-js` | Only if the game grows into arbitrary rigid-body interactions (rotating obstacles, stacked debris, joints). For circle-vs-AABB reflection it is the wrong shape of tool — see "What NOT to Use". |
| `@shopify/react-native-skia` 2.12.0 | Skia 2.6.2 (the SDK pin) | If a dev-client build with 2.12.0 fails natively. You lose `select()` and fall back to per-prop `useDerivedValue`. Decide this in week one. |
| `expo-audio` | `react-native-audio-api` 0.13.5 (Software Mansion) | If measured SFX latency on a real mid-range Android device is unacceptable. It is a genuine Web Audio API implementation — `AudioBufferSourceNode` gives sample-accurate, truly overlapping, near-zero-latency playback, which is what a Web game dev would reach for. **Not the default because it is pre-1.0** (1.0.0 exists only as nightlies), it is outside the SDK matrix, and it needs its own config plugin. Active development though (0.13.5 shipped 2026-09-18). Treat as a planned, measured upgrade path, not a starting bet. |
| `vitest` | `jest-expo` | Only for React component tests that must resolve the RN module graph. |
| Physics on the UI thread (worklets) | Physics on the JS thread via `requestAnimationFrame` | If worklet constraints (no capturing mutable JS closures, limited debugging) prove too painful during prototyping. Simpler to debug, but the JS thread is shared with React, and any GC pause or state update becomes a visible hitch. Revert to this only as a concession, and re-measure. |
| Expo SDK 57 | Expo SDK 58 (`58.0.0-preview.3`) | Once 58 reaches stable. It ships scene-based lifecycle by default, removing the `expo-build-properties` workaround. Plan the migration after MVP, not during. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `matter-js` / `planck-js` / `box2d` | Three independent problems. (1) **Worklet-hostile**: they are large stateful OO libraries, not `'worklet'`-marked pure functions, so they pin your simulation to the JS thread. (2) **Tunneling**: general iterative solvers use discrete collision detection by default; a fast brick-breaker ball passes through thin bricks between frames. You would end up writing swept-collision code anyway. (3) **Wrong feel**: arcade brick-breakers need *non-physical* reflection — paddle-relative bounce angle is how the player steers, and a correct rigid-body solver actively fights that. You'd spend more effort overriding the engine than writing ~300 lines of swept circle-vs-AABB. | Custom swept-collision physics as `'worklet'` pure functions |
| `react-native-game-engine` | Architecturally incompatible with the project's stated mandate: it runs a JS-thread `requestAnimationFrame` loop and pushes entity state through React `setState` every tick. That is precisely the "no React state updates every physics frame" constraint, violated by design. | `useFrameCallback` + shared values |
| `expo-av` | **Removed from Expo SDK 57.** Not in `bundledNativeModules.json`; its SDK 57 docs page 404s. `expo-av@16.0.8` still exists on npm and will install — and then fail. | `expo-audio` |
| `react-native-sound` | Unmaintained; predates the New Architecture, which RN 0.86 mandates. | `expo-audio` |
| `react-native-svg` for gameplay | Retained-mode DOM-like tree. Every ball position change mutates nodes through the bridge/shadow tree. Fine for static HUD icons; unusable at 60 FPS for a moving scene. | Skia `Canvas` |
| `expo-gl` + `three.js` / `expo-three` | 3D engine for a 2D game. Larger bundle, more boilerplate, and you hand-roll everything Skia gives free (blur, glow, blend modes, path effects). The neon aesthetic maps directly onto Skia's `BlurMask` and blend modes. | Skia |
| RN core `Animated` | JS-driven by default; `useNativeDriver` only covers transform/opacity and cannot express a physics simulation. | Reanimated worklets |
| `setInterval` / `setTimeout` game loops | Not vsync-aligned; drifts, coalesces under load, and produces visible judder. This is the classic mistake that makes an otherwise-correct game feel bad. | `useFrameCallback` |
| Redux / Zustand / Jotai for gameplay state | Every store write is a React render. Correct for menus, score-at-end-of-run, and settings. Catastrophic in the physics loop. | Shared values for the loop; React state only at run boundaries |
| `typescript@7.x` | npm `latest` (7.0.2) is the new Go-native compiler. No Expo/Metro validation; `expo-template-blank-typescript@57.0.26` ships `~6.0.3`. | `typescript@~6.0.3` |
| `react-native-gesture-handler@3.x`, `reanimated@4.7.x`, `worklets@0.12.x` | Ahead of the SDK 57 matrix. Reanimated 4.7.0 peer-requires `worklets@0.13.x`, published only under the `next` tag. | SDK-pinned 2.32.0 / 4.5.1 / 0.10.1 |
| Expo Go | Cannot load Skia (native code). Expo's own guidance is that Expo Go is not a development environment for production apps. | `expo-dev-client` |
| `Math.random()` in the physics step | Destroys determinism and makes every replay/regression test flaky. | Inline seeded PRNG (below) |

**On seeded randomness:** power-up drops and particle spawn need randomness, but determinism is a hard requirement. Do not add a dependency — write a ~5-line `mulberry32` or `xorshift32` PRNG with the `'worklet'` directive, holding its state in the game-state shared value. Zero deps, worklet-safe by construction, trivially seedable, and a fixed seed makes the whole run reproducible in tests. `pure-rand@8.4.2` is excellent and well-maintained, but a third-party module inside a worklet is friction you do not need for a 5-line function. Keep `pure-rand` in mind for JS-side test fixture generation only.

---

## Stack Patterns by Variant

**If worklet debugging blocks progress in the prototype phase:**
- Run the fixed-timestep loop on the JS thread with `requestAnimationFrame`, still writing results into shared values.
- Because the physics functions are pure and `'worklet'`-marked, moving them back to the UI thread later is a one-line change to the call site.
- Do this only as a temporary unblock, and re-measure frame time on real hardware before accepting it.

**If mid-range Android SFX latency measures poorly:**
- Migrate the audio module (and only the audio module) to `react-native-audio-api@0.13.5`.
- The modular SFX layer the project already mandates makes this a single-file swap.
- Budget a dev-client rebuild and a config plugin; do not attempt it in the same phase as gameplay work.

**If particle counts hurt the frame budget:**
- Move particles from individual Skia nodes to the `<Atlas>` component with `useTexture` + `useRSXformBuffer`.
- Per official docs, Atlas transforms animate "with near-zero cost using worklets" — it is designed for exactly this (many instances of one texture, each with its own rotate/scale/translate).
- Pre-render the neon particle sprite once via `useTexture`, then drive hundreds of `RSXform` entries from the physics buffer. This is the single biggest rendering lever available and worth designing the particle system around from the start.

**If 120 Hz ProMotion devices behave differently:**
- `timeSincePreviousFrame` is ~8 ms on 120 Hz displays. A fixed-timestep accumulator handles this correctly by construction (fewer physics steps per frame), which is one more reason the fixed timestep is non-negotiable.
- Clamp the accumulator to avoid a death spiral after a long stall (e.g. app backgrounded): cap `delta` at ~250 ms before accumulating.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `expo@57.0.24` | `react-native@0.86.3`, `react@19.2.3` | Hard SDK pin. Use `>=57.0.17` — earlier 57.x carries the Hermes V1 memory regression that specifically hits worklets/reanimated apps. |
| `@shopify/react-native-skia@2.12.0` | `react-native >=0.78`, `react >=19`, `reanimated >=4.0.0`, `worklets >=0.7.0` | All satisfied by SDK 57. Verified from published peer-dependency metadata. Bundles Skia m154 prebuilts. |
| Skia `>=2.10` | Reanimated **v4+ required** | Official docs: Skia 2.10+ requires Reanimated v4 for native animation integration. Reanimated v3 only works with Skia `<2.10`. |
| Skia `>=2.11` | Provides `select()` | Landed in 2.11.0 — the single-subscription multi-prop binding. The reason for the override. |
| Skia `<=1.12.4` | `react-native <=0.78`, `react <=18` | Irrelevant here; noted so nobody reads a stale tutorial and downgrades. |
| `reanimated@4.5.1` | `worklets@0.10.1` | Both SDK-pinned; move them together or not at all. |
| `reanimated@4.7.0` | `worklets@0.13.x`, `react-native 0.86 – 0.88` | **Trap:** `worklets@0.13.0` is only on the `next` tag. Avoid. |
| `react-native-gesture-handler@2.32.0` | RN 0.86 | 2.x is supported through RN 0.87 (`2.33.0`); 3.x is the forward line for post-0.87. |
| `jest-expo@57.0.5` | `@react-native/jest-preset@^0.86.3` | Only relevant if component tests are added. |
| `vitest@5.0.1` | Node `^22.12.0 \|\| ^24 \|\| >=26` | Check the local Node version before adopting. Pin `@vitest/coverage-v8` to the same major. |
| iOS 27 SDK / Xcode 27 | `expo@>=57.0.23` + `expo-build-properties` `ios.enableSceneSupport: true` | **Ship blocker.** Apps built against the iOS 27 SDK must use the UIKit scene-based lifecycle or they do not launch on iOS 27. SDK 58 does this by default; SDK 57 requires the opt-in. |

---

## Confidence Assessment

| Recommendation | Confidence | Basis |
|----------------|------------|-------|
| Expo SDK 57 as the target; all SDK-pinned versions | **HIGH** | `bundledNativeModules.json` read directly from the `sdk-57` release branch; npm dist-tags confirm 57 is `latest` and 58 is `preview`; official SDK 57 changelog. |
| `expo-audio` over `expo-av` | **HIGH** | `expo-av` absent from SDK 57 bundled modules; its SDK 57 docs page returns 404. Two independent confirmations. |
| `useFrameCallback` as the loop driver | **HIGH** | Official Reanimated docs, including the `timeSincePreviousFrame` semantics and auto-workletization. |
| Skia `select()` / `<Atlas>` patterns | **HIGH** | Official Skia docs pages plus the 2.11.0 release note introducing `select()`. |
| Rejecting `matter-js` for custom physics | **HIGH** | Reasoning is architectural (worklet incompatibility, discrete-CD tunneling, arcade-vs-rigid-body feel) and follows from verified constraints, not from benchmarks. |
| TypeScript `~6.0.3` over `7.0.2` | **HIGH** | Read directly from the published `expo-template-blank-typescript@57.0.26` devDependencies. |
| Skia 2.12.0 override of the 2.6.2 SDK pin | **MEDIUM** | Peer deps verified compatible, but no source confirms anyone has shipped this exact combination on EAS. Mitigated by making the dev-client smoke test the first task, with a documented 2.6.2 fallback. |
| `react-native-audio-api` as the latency escape hatch | **MEDIUM** | Library and Expo support verified from official docs and recent releases. No benchmark found comparing its SFX latency to `expo-audio` on mid-range Android — the upgrade trigger must be your own measurement. |
| Vitest over Jest for the physics core | **MEDIUM** | Versions and Node requirements verified; the recommendation itself is an engineering judgment (no RN transform needed for pure logic) rather than a documented Expo-endorsed path. |

---

## Open Questions for Later Phases

- **SFX latency on real mid-range Android** — decides `expo-audio` vs `react-native-audio-api`. Only resolvable by measurement on hardware, which the project already mandates.
- **Skia 2.12.0 on EAS Build** — resolve in the first phase with a dev-client build on both platforms, before any gameplay code.
- **Particle budget** — at what count do individual Skia nodes stop holding 60 FPS on the target device, forcing the `<Atlas>` path? Measure early enough that the particle system can be designed around the answer.
- **SDK 58 timing** — currently `58.0.0-preview.3`. It removes the `enableSceneSupport` workaround. Revisit at MVP completion, not before.

---

## Sources

- npm registry (queried directly, 2026-09-19) — exact versions, `dist-tags`, and `peerDependencies` for every package listed. HIGH.
- `https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo/bundledNativeModules.json` — authoritative SDK 57 version matrix. HIGH.
- `https://expo.dev/changelog/sdk-57` — RN 0.86.3, Hermes V1 memory/startup regressions and fix versions, bundled reanimated/worklets/RNGH bumps, Xcode 27 scene-lifecycle requirement. HIGH.
- `https://shopify.github.io/react-native-skia/docs/getting-started/installation` — version compatibility floors, prebuilt binary delivery, Proguard rule, Jest setup, `with-skia` template. HIGH.
- `https://shopify.github.io/react-native-skia/docs/animations/animations` — Reanimated v4 requirement from 2.10+, direct shared-value props, `select()`, `interpolateColors`. HIGH.
- `https://shopify.github.io/react-native-skia/docs/shapes/atlas` — `<Atlas>`, `useTexture`, `useRSXformBuffer` for near-zero-cost instanced sprites. HIGH.
- `https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback/` — `FrameInfo` fields, `setActive`, auto-workletization. HIGH.
- `https://docs.swmansion.com/react-native-worklets/docs/fundamentals/glossary` — `'worklet'` directive, babel plugin workletization, thread model. HIGH.
- `https://docs.expo.dev/versions/latest/sdk/audio/` — `createAudioPlayer` vs `useAudioPlayer` lifecycle and `release()` responsibility. HIGH.
- `https://docs.expo.dev/versions/v57.0.0/sdk/av/` — **404**, confirming `expo-av` removal from SDK 57. HIGH.
- `https://docs.expo.dev/more/expo-cli/` — `expo.install.exclude` dependency-validation override. HIGH.
- `https://docs.swmansion.com/react-native-audio-api/docs/fundamentals/getting-started` — Expo plugin, dev-build requirement, optional worklets dependency. HIGH.
- GitHub Releases API for `Shopify/react-native-skia`, `software-mansion/react-native-gesture-handler`, `software-mansion/react-native-audio-api` — release dates, `select()` introduction (2.11.0), RNGH 2.x-through-0.87 support statement, audio-api release cadence. HIGH.

---
*Stack research for: 2D arcade brick-breaker mobile game (React Native / Expo / Skia)*
*Researched: 2026-09-19*
