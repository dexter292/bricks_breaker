# Phase 1: Foundation & Thread-Boundary Spike - Research

**Researched:** 2026-09-19
**Domain:** Expo SDK 57 native project bootstrap + React Native Skia immediate-mode rendering + Reanimated/Worklets UI-runtime simulation host + repo-enforced layer boundaries
**Confidence:** HIGH on stack versions, library APIs, and local toolchain (verified against npm registry, published `.d.ts`/source of the exact pinned packages, and this machine). MEDIUM on the empirical gates this phase exists to answer (UI-runtime world mutation in release builds, Skia 2.12.0 on EAS, sprite-count budget on Pixel 6a) — those are *unresolvable by research* and are the point of the phase.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Reference devices**
- **D-01:** Primary Android 60 FPS reference device is **Pixel 6a**.
- **D-02:** iOS Phase 1 gate is an available recent **physical iPhone** for install, rendering, touch responsiveness, and stability — Android remains the hard FPS gate.
- **D-03:** Use **dev-client for daily development**; require a **release/profile build on physical hardware** before Phase 1 is marked complete.
- **D-04:** Temporary substitute Android is allowed if Pixel 6a is unavailable. Document exact model, chipset, OS version, display refresh rate, and measured frame times. **Re-certify on Pixel 6a before final MVP acceptance.**
- **D-05:** Never claim the 60 FPS gate passed based on simulator results, dev builds alone, or untested hardware.

**Spike proof surface**
- **D-06:** Phase 1 on-device proof is a **minimal FPS harness**: opaque Skia canvas, ~200–300 dummy sprites via `SkPicture`, UI-thread worklet updating a mutable world object, frame-time overlay behind a dev flag.
- **D-07:** Also **ramp sprite count until the frame budget breaks** and record the performance cliff as research — not a Phase 1 completion requirement. Completion target remains ~200–300 sprites at 60 FPS on the reference device (release/profile).
- **D-08:** Overlay displays **ms/frame, rolling FPS, and simulation substep count**. Document the measurement methodology (how FPS is derived, which build, which device).
- **D-09:** Require a **passing Vitest smoke test** proving `core/` can be imported and executed in Node without React Native / Skia / Reanimated dependencies.
- **D-10:** Keep Phase 1 focused on architecture + rendering performance validation. Defer gameplay, collision physics, and advanced visual effects.

**Layer enforcement**
- **D-11:** Enforce strict layer boundaries with **ESLint/import rules from Phase 1**. `core/` must not import React Native, Skia, Reanimated, or platform APIs.
- **D-12:** `core/` in Phase 1 is a **pure TypeScript stub** + smoke test only. World modeling and physics land in Phase 2.
- **D-13:** Spike harness lives in **`src/runtime/`** and **`src/render/`**, hosted by a thin Expo **`app/`** screen.
- **D-14:** **Prohibit `runOnJS` and `scheduleOnRN` on the per-frame hot path.** Performance overlay uses shared values without triggering React re-renders every frame.
- **D-15:** No monorepo or extra package abstractions in Phase 1 — keep the architecture simple and enforceable.

**Skia version**
- **D-16:** Use research-recommended **Skia `2.12.0`** (SDK pin override) unless the first hardware build reveals compatibility or performance issues; then fall back to SDK-pinned `2.6.2` and record the decision.

### Claude's Discretion
- Exact Expo app router screen naming and file layout within `app/` / `src/`
- Overlay visual styling (as long as metrics and methodology are clear)
- Exact ESLint boundary plugin/config choice (must actually fail illegal imports)
- How the cliff-ramp experiment is triggered (dev menu, button, or const) — results must be recorded

### Deferred Ideas (OUT OF SCOPE)
- Gameplay, collision physics, paddle/ball behavior — Phase 2+
- Advanced neon VFX, particles, glow baking — Phase 7
- Monorepo / multi-package layout — not in Phase 1; revisit only if boundaries become unenforceable
- Named iPhone as a second hard FPS gate — not required for Phase 1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **ARCH-01** | Game logic, physics, rendering, input, and UI are separated; simulation is suitable to run on the UI-thread worklet path | Two halves must both be delivered. **Separation** → "Architecture Patterns / Recommended Project Structure" (directory contract), "Layer Enforcement" (ESLint flat-config rules that actually fail illegal imports + a Node-resolution smoke test that cannot be linted around), and the written crossing contract in `docs/`. **Worklet suitability** → "Pattern A: UI-runtime world allocation" (verified: worklets 0.10.1 freezes RN-runtime objects in dev and *copies* typed arrays across the boundary, so the world must be allocated inside the UI runtime), "Pattern B: `useFrameCallback` fixed-timestep host" (verified `FrameInfo` shape), "Pattern C: cross-module `'worklet'` imports" (verified `bundleMode`/`importForwarding` fallbacks exist in the pinned plugin). The `SkPicture` harness and frame overlay prove the render seam holds at ~200–300 sprites without any React involvement in the hot path. |
</phase_requirements>

## Summary

This phase is a **native-bootstrap plus empirical gate**, not a feature. Nearly everything needed to *plan* it is now verified: the exact SDK 57 dependency matrix, the Skia 2.12.0 peer-dependency compatibility, the precise names of every API the harness calls (`opaque`, `debug`, `select`, `PictureRecorder`, `FrameInfo`, `scheduleOnRN`), the babel plugin path and its fallback options, a working ESLint boundary strategy, and the local toolchain state. Three things remain genuinely unknowable from documentation and are exactly what the phase must answer on hardware: (1) does Skia 2.12.0 build and run on EAS against the SDK 57 matrix, (2) can a mutable world object allocated on the UI runtime be mutated in place across frames in **release** builds, and (3) how many `SkPicture` draw commands a Pixel 6a sustains at 60 FPS.

Two research findings change the plan's shape versus the project-level STACK.md. First, **do not scaffold with `-e with-skia`**: that example is pinned behind the SDK 57 matrix (`expo ^57.0.1`, `react-native 0.86.0`, `reanimated 4.5.0`, `worklets 0.10.0`, Skia 2.6.2) and carries a web-only `postinstall` CanvasKit copy step. `expo-template-default@57.0.26` ships the exact pins (`react-native 0.86.3`, `reanimated 4.5.1`, `worklets 0.10.1`, `gesture-handler ~2.32.0`, `safe-area-context ~5.7.0`) *and* an `app/` directory via expo-router, which is what D-13 asks for. Second, **the local Node is 25.6.0, which is outside `vitest@5.0.1`'s supported engines** (`^22.12.0 || ^24.0.0 || >=26.0.0`). The D-09 smoke test therefore needs either Node 24 LTS pinned for the repo or `vitest@4.1.11` (engines `^20 || ^22 || >=24`). This must be settled in the first task, not discovered when the test runner refuses to start.

The most important *design* finding for the worklet gate came from reading the pinned `react-native-worklets@0.10.1` source rather than the docs: `freezeObjectInDev` only runs when `__DEV__` **and** the current runtime is the React Native runtime, and typed arrays crossing the boundary go through `createSerializableArrayBufferView` — i.e. they are **copied, not shared**. Both facts point the same way: allocate the world *inside* a `runOnUI`/`scheduleOnUI` worklet and never hand a mutable world object across the boundary. It also means a dev build and a release build can behave differently (freeze warnings are dev-only), which independently justifies D-03's release-build requirement — a dev-only pass is not evidence.

**Primary recommendation:** Scaffold from `expo-template-default@57.0.26` into a temp directory and move it into the existing repo; pin every native module to the SDK 57 matrix with `npx expo install`; override only Skia to 2.12.0 behind `expo.install.exclude`; put the worklets babel plugin last; allocate the world on the UI runtime inside `runOnUI`; record all sprites into one module-scope `SkPicture` recorder written to a single `SharedValue<SkPicture>` per frame; render the overlay text *inside that same picture* so no React state and no `scheduleOnRN` ever touches the hot path; and gate the phase on release/profile builds measured with `dumpsys gfxinfo` on Pixel 6a and Instruments on the iPhone.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pure simulation stub + Node-testability (`core/`) | Portable pure TS (no runtime) | — | Must run unchanged in Node (Vitest) and in the UI runtime; owning nothing platform-specific is what makes both true (D-12, ARCH-01) |
| Fixed-timestep clock, substep accounting, world ownership (`runtime/`) | UI runtime (Reanimated worklet) | — | `useFrameCallback` executes as a UI-thread worklet; putting the clock anywhere else reintroduces a cross-runtime hop (D-14) |
| World allocation | UI runtime (inside `runOnUI`) | — | Verified: objects converted on the RN runtime are frozen in dev; typed arrays are copied, not shared |
| Draw-command recording → `SkPicture` (`render/`) | UI runtime (worklet) | Skia render thread (native) | Recording is JSI work on the UI thread; rasterization happens on Skia's own thread — which is exactly why the RN perf monitor cannot see it |
| Frame-time / FPS / substep overlay | UI runtime (drawn into the same picture) | — | D-14 forbids per-frame React re-renders; drawing text into the recorded picture keeps the whole overlay inside one UI-thread pass |
| Canvas compositing mode (`opaque` → SurfaceView on Android) | Native Android compositor | UI runtime (prop) | Set as a Canvas prop; the consequence (own background, lowest z-order) is a view-hierarchy constraint, not a rendering one |
| Host screen, dev flag wiring, mount/unmount lifecycle (`app/`) | RN runtime (React, cold path) | — | React may mount/unmount the harness and toggle flags; it must not participate per frame |
| Layer enforcement (ESLint + Node resolution) | Build/CI tooling | — | A contract only counts if the repo fails the build when it is violated (D-11) |
| Native build config (`app.json`, `eas.json`, babel, Metro) | Build toolchain | — | Determines whether the Skia 2.12.0 bet is even testable |
| Device measurement (`gfxinfo`, Instruments) | External tooling on release builds | — | D-05: the app cannot certify itself; measurement must come from outside the app on a release build |

## Project Constraints (from .cursor/rules/)

`.cursor/rules/gsd.md` is a generated mirror of PROJECT.md + STACK.md plus a workflow section. Actionable directives the planner must honor:

| Directive | Source section | Planning implication |
|-----------|----------------|---------------------|
| Tech stack locked: React Native, TypeScript, Expo, EAS, Skia, custom physics, fixed timestep | Project → Constraints | No alternative renderer/engine may be proposed, even for the spike |
| Performance measured on hardware, never assumed | Project → Constraints | Every FPS claim in the phase artifacts needs a device + build + tool attribution |
| iOS and Android from the start | Project → Constraints | Both platforms must build in Phase 1; Android is the FPS gate, iOS is the install/feel gate |
| Offline MVP | Project → Constraints | Harness must not require network at runtime |
| Approval gate before coding | Project → Constraints | Phase 1 is the first coding phase; plan tasks must stay inside the approved phase scope |
| Monetization deferred, seams only | Project → Constraints | No ads/IAP/analytics packages installed in Phase 1 (not even "for later") |
| **Install with `npx expo install`, never `npm install`** for native modules | Stack → "The One Rule" | Every dependency task must specify which installer to use; only Skia and non-native dev tooling use plain `npm install` |
| `npx expo install --fix` after dependency changes; `npx expo-doctor@latest` before every EAS build | Stack → The One Rule | Belongs as an explicit verification step before each build task |
| Do not install `gesture-handler@3.x`, `reanimated@4.7.x`, `worklets@0.12.x`, `typescript@7.x`, `expo-av`, Expo Go | Stack → What NOT to Use | Forbidden-version list for the plan's dependency task |
| Babel: worklets plugin must be **last** | Stack → Installation | A single-line ordering requirement that silently breaks worklets if violated |
| `expo.install.exclude` for the Skia override | Stack → Why the Skia override matters | Must be written into `package.json` *before* the Skia install, or `expo install --fix` will downgrade it |
| GSD workflow enforcement: no direct repo edits outside a GSD command | Workflow Enforcement | Execution must run through `/gsd-execute-phase` |

No `.cursor/skills/` or `.agents/skills/` directory exists; no project skills to honor. No knowledge graph (`.planning/graphs/`) exists, so no graph context was injected.

## Standard Stack

All versions below were verified against the npm registry and the Expo SDK 57 `bundledNativeModules.json` on 2026-09-19.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | `~57.0.24` | SDK, CLI, config plugins, prebuild | `57.0.24` is the current `latest` dist-tag `[VERIFIED: npm view expo version]`. `>=57.0.17` clears the Hermes V1 memory regression that specifically hits worklets/Reanimated apps `[CITED: expo.dev/changelog/sdk-57]` |
| `react-native` | `0.86.3` | Runtime | SDK 57 pin. Engines `^20.19.4 \|\| ^22.13.0 \|\| ^24.3.0 \|\| >=25.0.0` `[VERIFIED: npm view react-native@0.86.3 engines]` — local Node 25.6.0 is acceptable to RN itself |
| `react` / `react-dom` | `19.2.3` | Cold-path UI only | SDK pin `[VERIFIED: expo-template-default@57.0.26]` |
| `typescript` | `~6.0.3` | Types | What `expo-template-blank-typescript@57.0.26` ships `[VERIFIED: npm view devDependencies]`; also inside `typescript-eslint@8.70.0`'s peer range `>=4.8.4 <6.1.0` `[VERIFIED: npm]` |
| `@types/react` | `~19.2.2` | Types | SDK template pin `[VERIFIED: npm]` |
| `@shopify/react-native-skia` | `2.12.0` | All gameplay rendering | **Deliberate override of the SDK's 2.6.2** (D-16). Peers verified as `react >=19.0`, `react-native >=0.78`, `react-native-reanimated >=4.0.0`, `react-native-worklets >=0.7.0` — every one satisfied by the SDK 57 matrix `[VERIFIED: packed tarball package.json]`. Ships prebuilt native binaries as ordinary deps (`react-native-skia-android`, `react-native-skia-apple-ios` @ `154.0.0`) with **no postinstall script** `[VERIFIED: tarball]`, which is why the EAS risk is lower than it reads |
| `react-native-reanimated` | `4.5.1` | UI-thread frame driver + shared values | SDK 57 pin `[VERIFIED: bundledNativeModules.json]`. Peer-requires `react-native-worklets: 0.10.x` and `react-native: 0.83 - 0.86` `[VERIFIED: npm]` — moving either alone breaks the pair |
| `react-native-worklets` | `0.10.1` | Worklet runtime + babel plugin | SDK 57 pin `[VERIFIED]`. Peer `react-native: 0.83 - 0.86` `[VERIFIED]` |
| `react-native-gesture-handler` | `~2.32.0` | (Phase 3 input; installed now by the template) | SDK 57 pin `[VERIFIED]`. Do **not** install 3.x |
| `react-native-safe-area-context` | `~5.7.0` | Canvas bounds | SDK 57 pin `[VERIFIED]` |
| `expo-router` | `~57.0.22` | The `app/` host screen (D-13) | Ships in `expo-template-default@57.0.26` `[VERIFIED: npm view dependencies]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-dev-client` | `~57.0.19` | On-device development | Mandatory — Skia is native, Expo Go cannot load it `[VERIFIED: bundledNativeModules.json]` |
| `expo-build-properties` | `~57.0.21` | `ios.enableSceneSupport` | Option **verified present** in the pinned version: `pluginConfig.d.ts:394 enableSceneSupport?: boolean` and `iosSceneSupport.js` implements it `[VERIFIED: packed tarball]` |
| `expo-screen-orientation` | `~57.0.2` | Portrait lock at boot | Removes an entire class of layout/physics variance before it starts |
| `expo-keep-awake` | `~57.0.2` | Prevent sleep during a measurement run | A screen that sleeps mid-ramp invalidates the sample |
| `expo-system-ui` / `expo-status-bar` | `~57.0.4` / `~57.0.1` | Dark background, hidden chrome | Needed anyway for the opaque-canvas background story |
| `expo-splash-screen` | `~57.0.9` | Already in the default template | Keep; no Phase 1 work |

### Development

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `vitest` | `5.0.1` **or** `4.1.11` | `core/` Node smoke test (D-09) | **Engine conflict, must be resolved in task 1:** `5.0.1` engines are `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`; local Node is **25.6.0** `[VERIFIED: npm view + node --version]`. `4.1.11` engines are `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0` and *do* accept Node 25 `[VERIFIED: npm]` |
| `@vitest/coverage-v8` | match `vitest` major | Coverage on `core/` | Must match exactly |
| `fast-check` | `4.10.1` | Property tests | Phase 2 consumer; installing now is optional |
| `eslint` | `^9.39.5` | Boundary enforcement | `9.39.5` is latest 9.x `[VERIFIED: npm]`. ESLint `10.11.0` is `latest` but `eslint-config-expo@57.0.2` only declares `eslint >=8.10` and is not validated against 10 — prefer 9.x |
| `eslint-config-expo` | `~57.0.2` | Lint baseline | **Has a flat-config entry**: `package/flat.js` + `package/flat/` `[VERIFIED: packed tarball]`, so `eslint.config.js` can `require('eslint-config-expo/flat')` |
| `typescript-eslint` | `8.70.0` | TS rules | Peers `eslint ^8.57 \|\| ^9 \|\| ^10` and `typescript >=4.8.4 <6.1.0` `[VERIFIED: npm]` |
| `eslint-plugin-boundaries` | `7.2.0` | Full layer matrix (optional second layer) | Exports `./recommended` and `./strict` flat entries; peer `eslint >=6` `[VERIFIED: packed tarball]` |
| `prettier` | `3.9.8` | Formatting | Standard |
| `eas-cli` | `24.7.0` | Cloud builds | `[VERIFIED: npm view eas-cli version]`. Run via `npx eas-cli@latest`; do not add as a project dependency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-template-default@57.0.26` (recommended scaffold) | `npx create-expo-app -e with-skia` (STACK.md's suggestion) | **Rejected.** The example pins `expo ^57.0.1`, `react-native 0.86.0`, `reanimated 4.5.0`, `worklets 0.10.0`, Skia 2.6.2, and adds a `postinstall: node copy-canvaskit.js` step for web `[VERIFIED: raw.githubusercontent.com/expo/examples/master/with-skia/package.json]`. Every one of those has to be corrected anyway, and the postinstall is dead weight for a mobile-only game |
| `expo-template-default` | `expo-template-blank-typescript@57.0.26` | Blank is leaner but ships **no** `app/` directory and none of reanimated/worklets/gesture-handler/safe-area — contradicts D-13 and adds four installs. Default's cost is deleting the tab-navigation example and ~6 unused deps |
| Skia `2.12.0` | Skia `2.6.2` (SDK pin) | The documented D-16 fallback. Cost: lose `select()` (one shared value → many props, one subscription), fall back to per-prop `useDerivedValue`. **Phase-1 relevance is low** — the sprite harness writes a single `SharedValue<SkPicture>`, so `select()` is not load-bearing until later phases. This makes the fallback cheap *if* the build fails |
| `vitest 5.0.1` + Node 24 LTS | `vitest 4.1.11` on the existing Node 25.6.0 | Node 24 LTS keeps the project-level STACK.md recommendation intact and matches what EAS/Expo tooling is exercised against; Vitest 4 avoids installing a Node version. No Node manager (`nvm`/`fnm`/`volta`/`mise`) is currently installed on this machine `[VERIFIED: command -v]`, so "just switch Node" is not a one-liner today |
| ESLint `no-restricted-imports` zones | `eslint-plugin-boundaries@7.2.0` | Core rule needs zero new deps and is guaranteed to work; the plugin expresses the full 5-layer matrix declaratively. **Use both** — see "Layer Enforcement" |
| EAS cloud builds | Local `npx expo run:ios --device` / `run:android --variant release` | Local builds avoid the Apple Developer Program requirement for iOS device installs (free personal team, 7-day profiles) and this machine has Xcode 26.5 + CocoaPods 1.16.2 + JDK 21 `[VERIFIED]`. Cloud builds avoid local toolchain drift. See "Environment Availability" — the Apple account question is a real gate |

**Installation** (ordering matters; `expo.install.exclude` must exist before the Skia install):

```bash
# 1. Scaffold OUTSIDE the repo — create-expo-app refuses a non-empty target,
#    and this repo already contains .planning/ and .cursor/
npx create-expo-app@latest /tmp/bb-scaffold          # expo-template-default@57.0.26
rsync -a --exclude .git /tmp/bb-scaffold/ ./          # move into the existing repo
npx expo install expo@^57.0.24 --fix

# 2. Native modules the template does not ship (SDK-pinned resolution)
npx expo install expo-dev-client expo-build-properties \
  expo-screen-orientation expo-keep-awake

# 3. Skia — plain npm, deliberate override. Add expo.install.exclude FIRST.
npm install @shopify/react-native-skia@2.12.0

# 4. Dev tooling (not native — no SDK pinning applies)
npm install -D vitest@5.0.1 @vitest/coverage-v8@5.0.1   # or @4.1.11 — see engine note
npm install -D eslint@^9.39.5 eslint-config-expo@~57.0.2 \
  typescript-eslint@8.70.0 eslint-plugin-boundaries@7.2.0 prettier@3.9.8

# 5. Verify before any build
npx expo-doctor@latest
```

**Version verification performed:** `npm view <pkg> version engines peerDependencies` for every package above, plus `bundledNativeModules.json` from the `sdk-57` branch, plus direct inspection of packed tarballs for `@shopify/react-native-skia@2.12.0`, `react-native-reanimated@4.5.1`, `react-native-worklets@0.10.1`, `expo-build-properties@57.0.21`, `eslint-config-expo@57.0.2`, `eslint-plugin-boundaries@7.2.0`. All on 2026-09-19.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌───────────────────────────────────────────────┐
  cold path         │  RN RUNTIME (JS thread)                       │
  (mount, flags,    │                                               │
   never per frame) │  app/index.tsx  ──mount──►  <GameCanvas/>     │
                    │      │                                        │
                    │      │ reads PERF_OVERLAY build-time flag     │
                    │      │                                        │
                    │      └── runOnUI(allocateWorld)(caps) ───┐    │
                    └────────────────────────────────────────┼──────┘
      ═══════════════════ RUNTIME BOUNDARY ══════════════════╪══════════
                    ┌────────────────────────────────────────┼──────┐
  hot path          │  UI RUNTIME (UI thread)                ▼      │
  (every frame,     │                            world = SharedValue│
   zero crossings)  │                            (allocated HERE)   │
                    │                                   │           │
                    │   useFrameCallback(frameInfo) ◄────┘           │
                    │        │                                      │
                    │        ├─ dt = clamp(timeSincePreviousFrame)   │
                    │        ├─ accumulator += dt                    │
                    │        ├─ while(acc>=FIXED_DT && n<MAX):       │
                    │        │     stepStub(world, FIXED_DT) ──► core/ (pure TS,
                    │        │     n++                                  'worklet',
                    │        │                                          no imports of
                    │        ├─ metrics.push(dt, n)   ← ring buffer     RN/Skia/Rea)
                    │        │                                      │
                    │        └─ picture.value = record(world,       │
                    │                            metrics)           │
                    │                    │                          │
                    │            ┌───────┴────────┐                 │
                    │            │ module-scope   │                 │
                    │            │ PictureRecorder│                 │
                    │            │ + Paint + Font │                 │
                    │            └───────┬────────┘                 │
                    └────────────────────┼─────────────────────────┘
                                         ▼
                    <Canvas opaque>  <Picture picture={picture}/>
                                         │
                    ┌────────────────────▼─────────────────────────┐
                    │  SKIA RENDER THREAD (native)                 │
                    │  Android: SurfaceView (because opaque)       │
                    │  iOS: CAMetalLayer                           │
                    └──────────────────────────────────────────────┘
                                         │
                    ┌────────────────────▼─────────────────────────┐
                    │  EXTERNAL MEASUREMENT (release build only)   │
                    │  adb dumpsys gfxinfo · Instruments · Perfetto│
                    └──────────────────────────────────────────────┘
```

Read the diagram as the phase's acceptance shape: **nothing crosses the runtime boundary between mount and unmount.** If an arrow appears from the UI runtime back up to the RN runtime during play, D-14 is violated.

### Recommended Project Structure

```
app/
├── _layout.tsx              # expo-router root; portrait lock, dark system UI
└── index.tsx                # thin host: mounts <SpikeScreen/>, reads dev flag  (D-13)

src/
├── core/                    # PURE TS. Zero imports. Node-runnable.           (D-12)
│   ├── index.ts             # public surface of core/
│   ├── types.ts             # SpikeWorld shape (sprite SoA typed arrays)
│   ├── allocate.ts          # allocateWorld(capacity) — the ONLY allocation site
│   └── step.ts              # stepStub(world, dt): 'worklet' — moves sprites, no physics
│
├── runtime/                 # UI-thread host. Thin. Knows core/ AND render/.  (D-13)
│   ├── constants.ts         # FIXED_DT, MAX_SUBSTEPS, MAX_FRAME_TIME, SPRITE_CAP
│   ├── useSpikeLoop.ts      # useFrameCallback: clamp, accumulate, step, record
│   └── metrics.ts           # 'worklet' rolling frame-time ring buffer + percentiles
│
├── render/                  # Skia. Reads world, never writes it.             (D-13)
│   ├── SpikeCanvas.tsx      # <Canvas opaque> + <Fill> + <Picture>
│   ├── recordSprites.ts     # 'worklet' module-scope recorder/paint
│   └── recordOverlay.ts     # 'worklet' ms/FPS/substeps drawn INTO the picture (D-08/D-14)
│
└── devflags.ts              # PERF_OVERLAY / CLIFF_RAMP build-time constants

docs/
└── layer-contract.md        # the written, checkable crossing contract        (ARCH-01)

tests/ (or src/core/__tests__/)
└── core.smoke.test.ts       # D-09: core/ imports + runs in Node
└── core.purity.test.ts      # static scan: no forbidden import specifiers in core/
```

Rationale: `src/input/`, `src/ui/`, `src/vfx/`, `src/services/` from the project-level architecture are **deliberately not created yet** (D-10, D-15) — but the layer contract and the ESLint matrix should name them now so later phases inherit enforcement instead of negotiating it.

### Pattern A: Allocate the world on the UI runtime

**What:** The mutable world object is created inside a worklet that runs on the UI runtime, then stored in a shared value. Nothing mutable is ever handed across the boundary.

**When to use:** Always, for any per-frame mutable state. This is the phase's central bet.

**Why (verified, not assumed):** In `react-native-worklets@0.10.1`, `freezeObjectInDev(value)` early-returns unless `__DEV__ && globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative`; otherwise it replaces every own property with a getter/setter pair that logs *"Tried to modify key \`X\` of an object which has been already passed to a worklet"* and calls `Object.preventExtensions(value)` `[VERIFIED: package/lib/module/memory/serializable.native.js:460-481]`. Separately, `ArrayBuffer.isView(value)` routes typed arrays through `createSerializableArrayBufferView(...)` — a **copy**, not a shared view `[VERIFIED: same file, lines 143-145, 405-411]`. Two consequences the plan must encode:

1. A world created on the JS thread and passed in is frozen (dev) and its typed arrays are copied (both dev and release) — mutations will not propagate. Allocating on the UI runtime avoids both.
2. Freezing is **dev-only**. A release build will silently *not* warn. This is precisely why D-03 requires a release/profile build: a dev pass is not evidence, and a release pass without a dev pass hides bugs.

Contrast: Skia objects are JSI **host objects**, and the serializer wraps them (`isHostObject(value) → _createSerializableHostObject(value)`) rather than cloning `[VERIFIED: same file, lines 110, 488]`. That is why a module-scope `PictureRecorder`/`Paint`/`SkFont` created on the JS thread is safe to capture in a worklet, while a plain object or typed array is not.

```ts
// src/runtime/useSpikeLoop.ts (excerpt)
// Source: react-native-worklets 0.10.1 threads API (scheduleOnUI/runOnUI verified in index.d.ts:14)
import { useSharedValue } from 'react-native-reanimated';
import { runOnUI } from 'react-native-worklets';
import { allocateWorld } from '../core';

const world = useSharedValue<SpikeWorld | null>(null);

useEffect(() => {
  runOnUI((capacity: number) => {
    'worklet';
    world.value = allocateWorld(capacity);   // typed arrays created ON the UI runtime
  })(SPRITE_CAP);
}, []);
```

**Fallback if the gate fails** (record the decision either way): keep all hot state in typed arrays inside a *single* shared value and mutate the buffers in place; if that also fails, move the loop to the JS thread with `requestAnimationFrame` — a call-site change only, because `core/` is pure and `'worklet'`-marked in both worlds.

### Pattern B: `useFrameCallback` as the fixed-timestep clock

**What:** One `useFrameCallback` owns clamping, accumulation, substepping, recording, and metrics.

**Verified API surface** (from the pinned `react-native-reanimated@4.5.1` typings):
- `useFrameCallback(callback: (frameInfo: FrameInfo) => void, autostart?: boolean): FrameCallback`
- `FrameInfo = { timestamp: number; timeSincePreviousFrame: number | null; timeSinceFirstFrame: number }` — note `timeSincePreviousFrame` is **`null` on the first frame** and is in **milliseconds**
- `FrameCallback = { setActive: (isActive: boolean) => void; isActive: boolean; callbackId: number }` — `setActive(false)` is the pause/teardown primitive
`[VERIFIED: package/lib/typescript/hook/useFrameCallback.d.ts, frameCallback/FrameCallbackRegistryUI.d.ts]`

**Phase-1 note:** even with no physics yet (D-12), build the accumulator now. It is what makes the substep counter in the overlay (D-08) meaningful, and it is the thing that neutralizes the documented Gesture-Handler frame-rate inflation before input ever lands in Phase 3.

### Pattern C: Cross-module `'worklet'` imports (Validation Gate 2)

**What:** `core/` is split across several files and imported into the frame callback. The worklets babel plugin auto-workletizes inline callbacks, but **imported functions need an explicit `'worklet'` directive** in their own source.

**Plan requirement:** deliberately split `core/` across ≥5 files (`index.ts`, `types.ts`, `allocate.ts`, `step.ts`, plus at least one re-exported helper) and import the chain through the frame callback, so the gate is actually exercised rather than accidentally satisfied by a single-file spike.

**Fallbacks exist and are verified present in the pinned plugin:** `react-native-worklets@0.10.1`'s `plugin/index.js` reads `state.opts.bundleMode` and `state.opts.importForwarding` (with `relativePaths` and `moduleNames` sub-options), and the package ships `bundleMode/index.js` + shims `[VERIFIED: packed tarball, plugin/index.js:299,557-558,617,713-720 and package.json files list]`. So if plain cross-module imports fail, Bundle Mode with `importForwarding` is a configuration change, not a redesign.

```js
// babel.config.js — the worklets plugin MUST be last
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
```

### Pattern D: Immediate-mode `SkPicture` recording with module-scope objects

**Verified API surface** (from `@shopify/react-native-skia@2.12.0` typings):
- `Skia.PictureRecorder()` → `SkPictureRecorder` with `beginRecording(bounds?: SkRect): SkCanvas` and `finishRecordingAsPicture(): SkPicture` `[VERIFIED: skia/types/Picture/PictureRecorder.d.ts]`
- `PictureProps { picture: SkPicture }`, and `Picture` is typed `SkiaProps<PictureProps>` → `AnimatedProp<SkPicture>` accepts a `SharedValue` `[VERIFIED: dom/types/Drawings.d.ts:70-72, renderer/components/Picture.d.ts, renderer/processors/Animations/Animations.d.ts]`
- `canvas.drawPicture(skp: SkPicture): void` for composing layers `[VERIFIED: skia/types/Canvas.d.ts:386]`
- `select<T extends object, K extends keyof T & string>(value: SharedValue<T>, key: K)` — the 2.11+ feature motivating D-16 `[VERIFIED: Animations.d.ts]`. Not load-bearing in Phase 1.

```ts
// src/render/recordSprites.ts
// Source: Skia 2.12.0 typings + official Pictures docs (reuse recorder/paints; never allocate per frame)
import { Skia } from '@shopify/react-native-skia';

const recorder = Skia.PictureRecorder();   // module scope — host object, safe to capture in a worklet
const paint = Skia.Paint();
const rect = Skia.XYWHRect(0, 0, 0, 0);    // reused; mutate rather than allocate

export const recordFrame = (w: SpikeWorld, bounds: SkRect): SkPicture => {
  'worklet';
  const canvas = recorder.beginRecording(bounds);
  for (let i = 0; i < w.spriteCount; i++) {
    paint.setColor(w.color[i]);
    canvas.drawRect(Skia.XYWHRect(w.x[i], w.y[i], w.w[i], w.h[i]), paint);
  }
  return recorder.finishRecordingAsPicture();
};
```

### Pattern E: Opaque Canvas → SurfaceView on Android

**The open question from project research is now closed.** `@shopify/react-native-skia@2.12.0` declares `opaque?: boolean` on both `CanvasProps` and `SkiaBaseViewProps`, alongside `debug?: boolean`, `onSize`, `colorSpace`, `highBitDepth`, and `androidWarmup` `[VERIFIED: renderer/Canvas.d.ts, views/types.d.ts]`. The `highBitDepth` doc comment in the same file corroborates the compositing story: *"On Android the extra precision survives composition only when combined with `opaque`."*

Consequences the view hierarchy must respect from the first commit: the canvas paints its own background (bottom `<Fill>`), sits **lowest** in z-order within its host, and any React Native views overlaid on it render *after* it in JSX.

### Pattern F: Frame overlay with zero React involvement (D-08 + D-14)

**What:** The overlay is drawn *inside the same recorded picture*, from the same worklet, using a Skia font created once.

**Why this over alternatives:** a React `<Text>` bound to state re-renders per frame (forbidden). A Skia retained `<Text>` node bound to a derived string value avoids React but adds a second subscription and a second node update per frame. Drawing into the picture keeps the entire overlay inside the single `SharedValue<SkPicture>` write that already happens.

**Font:** `matchFont(inputStyle?: Partial<RNFontStyle>, fontMgr?: SkFontMgr): SkFont` is available and synchronous (no asset loading), unlike `useFont` which returns `SkFont | null` after async load `[VERIFIED: skia/core/Font.d.ts:7,31]`. Create it once at module/component scope on the JS thread; it is a host object, so capturing it in the worklet is safe (Pattern A rationale).

**Metric derivation to document (D-08):**
- `msPerFrame` — raw `frameInfo.timeSincePreviousFrame` (ms), with the first frame (`null`) skipped
- `fps` — rolling mean over the last N frames computed as `1000 / mean(interval)`, **not** a mean of per-frame FPS values (averaging reciprocals overstates performance)
- `substeps` — the substep count from the most recent frame, plus a session max
- Also worth surfacing because a mean hides exactly what matters: **p95/p99 frame time** and a count of frames over 16.7 ms

**Release-build availability caveat:** D-06 says "behind a dev flag," but D-03 requires measuring a **release/profile** build. `__DEV__` is false in release, so an `if (__DEV__)` overlay is invisible exactly when it is needed. Resolve with a build-time flag that is independent of `__DEV__` (e.g. `process.env.EXPO_PUBLIC_PERF_OVERLAY === '1'`, set only on the `development` and `profiling` EAS profiles and never on `production`), and add a release-build check that the production profile ships with it off.

### Anti-Patterns to Avoid

- **`bricks.map(b => <Rect/>)` inside `<Canvas>`** — retained mode reprocesses the tree whenever the element count changes. Immediate mode from the first commit; retrofitting later is a render-layer rewrite.
- **Allocating `Skia.Paint()`, `Skia.PictureRecorder()`, rects, or object/array literals inside the frame callback** — Hermes GC pauses (~48 ms p99.9) read as physics bugs and are far harder to diagnose than a dropped frame.
- **`runOnJS` / `scheduleOnRN` anywhere in the frame callback** (D-14) — one crossing per event becomes dozens per frame the moment gameplay lands. Note `runOnJS` is now deprecated in favor of `scheduleOnRN` `[VERIFIED: reanimated 4.5.1 workletFunctions.d.ts:30-31]`; both are banned on the hot path regardless.
- **Reading `sharedValue.value` from a React render, `useEffect`, or event handler** — forces a UI→JS synchronization that blocks the JS thread.
- **Creating the world on the JS thread and passing it in** — dev-frozen, typed arrays copied. See Pattern A.
- **`useDerivedValue` to produce the picture instead of writing it from the frame callback** — introduces a second reactive path over the same state; keep one write per frame.
- **Declaring the FPS gate passed from a simulator, a dev build, or the RN perf monitor** (D-05) — the perf monitor reports JS/UI thread rates and cannot see Skia's render thread; in this architecture the JS thread is idle *by design*, so it will always look healthy.
- **Installing Skia before writing `expo.install.exclude`** — the next `expo install --fix` will quietly downgrade it to 2.6.2 and the Phase-1 bet will appear to pass for the wrong reason.

## Layer Enforcement (D-11 — "must actually fail illegal imports")

Three independent layers, because each one alone has a hole.

**Layer 1 — ESLint core rule, zero new dependencies, scoped to `core/`.** `no-restricted-imports` with `patterns` is guaranteed available and cannot be misconfigured into a no-op:

```js
// eslint.config.js (flat config)
const expoFlat = require('eslint-config-expo/flat');   // VERIFIED: package ships flat.js + flat/

const FORBIDDEN_IN_CORE = [
  'react', 'react/*', 'react-dom',
  'react-native', 'react-native/*',
  'react-native-*',                       // reanimated, worklets, gesture-handler, safe-area
  '@shopify/react-native-skia', '@shopify/react-native-skia/*',
  'expo', 'expo-*', 'expo/*',
  '@react-native/*', '@react-native-*/*',
];

module.exports = [
  ...expoFlat,
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: FORBIDDEN_IN_CORE,
          message: 'core/ must stay pure TypeScript: no React, React Native, Skia, Reanimated, or Expo imports (ARCH-01, D-11).',
        }],
      }],
    },
  },
  {
    // D-14: no cross-runtime hops on the hot path
    files: ['src/runtime/**/*.{ts,tsx}', 'src/render/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error',
        { selector: "CallExpression[callee.name='runOnJS']",     message: 'No runOnJS on the per-frame hot path (D-14).' },
        { selector: "CallExpression[callee.name='scheduleOnRN']", message: 'No scheduleOnRN on the per-frame hot path (D-14).' },
      ],
    },
  },
];
```

`no-restricted-syntax` is the right tool for the D-14 half: `runOnJS`/`scheduleOnRN` are legal imports elsewhere in the app, so the ban has to be on the *call site within the hot-path directories*, not on the import.

Known holes in Layer 1: it does not catch `require()`, dynamic `import()`, or transitive imports (`core/` → a local helper → `react-native`).

**Layer 2 — `eslint-plugin-boundaries@7.2.0`** expresses the full one-way matrix (`core` ← `runtime` → `render`; `app` → `runtime`; nothing → `app`) declaratively, and catches the transitive-through-local-file case that Layer 1 misses. Flat entries `eslint-plugin-boundaries/recommended` and `/strict` are available `[VERIFIED: tarball exports]`. Treat this as the layer that encodes the *contract*, and Layer 1 as the layer that can never accidentally be turned off.

**Layer 3 — Node resolution, which cannot be linted around.** The D-09 Vitest smoke test imports `core/` in a bare Node environment with no React Native resolver. Any real RN/Skia/Reanimated import — direct, transitive, or dynamic — fails to resolve and the test goes red. Add a companion static test that reads every file under `src/core/` and asserts no forbidden specifier appears in any `import`/`require`/`from` position, so a *type-only* import (erased at runtime, invisible to Layer 3) is still caught.

**The written contract (ARCH-01's "checkable" half):** `docs/layer-contract.md` should state, as a table, every allowed crossing (`input → runtime` via shared value; `runtime → core` via direct worklet call; `core → render` read-only; `core → services` via event ring, batched, ≤1 per frame; `runtime ↔ RN runtime` only at mount/unmount and discrete phase changes) and every banned one. The plan should require that each ESLint rule cite the contract row it enforces, so drift between the doc and the config is visible.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-frame clock | `setInterval` / `setTimeout` / a manual `requestAnimationFrame` chain | `useFrameCallback` | Not vsync-aligned; drifts and coalesces under load. `setActive(false)` also gives you pause/teardown free |
| FPS measurement library | `react-native-performance`, `@shopify/react-native-performance` | Derive from `frameInfo.timeSincePreviousFrame` + external profilers | Those measure startup, not frame pacing; the second was last published April 2026. You need the frame-time *distribution*, which neither provides |
| Android SurfaceView switch | A custom native view or view-flattening hacks | `<Canvas opaque>` | One verified prop; the alternative is re-implementing the compositing path |
| Layer-boundary checking | A custom import-scanning script as the only gate | ESLint (2 layers) + Node resolution | A bespoke scanner is one regex away from silently passing; three independent mechanisms with different failure modes is the cheap answer |
| Seeded RNG (Phase 2 preview) | A dependency | ~5-line inline `mulberry32` marked `'worklet'` | A third-party module inside a worklet is friction for five lines |
| Test runner for pure TS | `jest-expo` for the physics core | `vitest` | `jest-expo` drags in the RN module graph, `transformIgnorePatterns`, and CanvasKit WASM for Skia mocks — all irrelevant to pure numeric code |
| Scene lifecycle plumbing | Hand-edited `AppDelegate`/`Info.plist` | `expo-build-properties` `ios.enableSceneSupport` | Verified to exist in the pinned version; hand edits are lost on the next prebuild |

**Key insight:** in Phase 1 the temptation is to hand-roll *measurement*, because the numbers feel like the deliverable. They are not — the deliverable is a measurement you can defend. Derived in-app numbers are the fast feedback loop; `dumpsys gfxinfo` and Instruments on a release build are the evidence. Build both, and state which one the gate is decided on.

## Common Pitfalls

### Pitfall 1: The Skia override is silently reverted
**What goes wrong:** Skia 2.12.0 installs, then a later `npx expo install --fix` or `expo-doctor` "fix" downgrades it to 2.6.2. The hardware build then passes — but it proves nothing about D-16.
**Why it happens:** `expo install --fix` aligns everything to `bundledNativeModules.json` unless explicitly excluded.
**How to avoid:** Write `expo.install.exclude: ["@shopify/react-native-skia"]` into `package.json` *before* installing Skia, and add an assertion to the build-prep step that reads the installed version and fails if it is not the intended one.
**Warning signs:** `expo-doctor` stops warning about the Skia mismatch (the warning is expected and intentional).

### Pitfall 2: A dev-build pass is mistaken for proof of the worklet gate
**What goes wrong:** The world mutates fine in the dev client; the release build behaves differently (or vice versa — the release build works while dev logs freeze warnings that get ignored).
**Why it happens:** Verified: `freezeObjectInDev` is `__DEV__`-only. Dev and release genuinely have different object semantics at the boundary.
**How to avoid:** D-03 already mandates a release/profile build. Make the *same* scripted check run in both, and record both results side by side. Treat any dev-mode "Tried to modify key" warning as a failure even if release appears fine.
**Warning signs:** That warning string anywhere in the dev log; a world that appears frozen only in dev.

### Pitfall 3: The overlay disappears exactly when it is needed
**What goes wrong:** The overlay is gated on `__DEV__`, so the release/profile build that decides the gate has no readout.
**How to avoid:** Pattern F — an explicit build-time flag independent of `__DEV__`, enabled on the profiling EAS profile, verified off in production before submission.
**Warning signs:** "We'll just read the FPS from the dev build" appearing in a task description.

### Pitfall 4: Measuring with a tool that cannot see Skia
**What goes wrong:** The RN perf monitor reports a comfortable 60/60 while the device visibly runs at 15, because Skia executes outside both the JS and UI threads — and in this architecture the JS thread is idle by design.
**How to avoid:** D-05. Gate on `adb shell dumpsys gfxinfo <pkg> framestats` (Android release) and Instruments (iOS release). Use the in-app overlay and the Canvas `debug` prop as the fast loop, never as the verdict.
**Warning signs:** Any FPS number in a phase artifact without a device + build-type + tool attribution.

### Pitfall 5: `create-expo-app` refuses the target directory
**What goes wrong:** The repo already contains `.planning/` and `.cursor/`; the scaffolder's empty-directory check rejects it, and the reflex fix is to scaffold into a subdirectory — which creates a nested project and quietly breaks the `app/`-at-root assumption in D-13.
**How to avoid:** Scaffold to a temp path and `rsync` in, excluding `.git`. Verify afterwards that `app/` and `package.json` are at the repo root and that `.gitignore` covers `node_modules/`, `ios/`, `android/`, and `.expo/`.
**Warning signs:** A `package.json` anywhere other than the repo root.

### Pitfall 6: The 5-file worklet-import gate is accidentally not tested
**What goes wrong:** The spike's `core/` ends up as one file (or everything gets inlined into the callback), so Validation Gate 2 is never exercised and the failure surfaces in Phase 2 with real physics in flight.
**How to avoid:** Make "≥5 files in `core/`, imported transitively through the frame callback" an explicit, checkable task criterion.
**Warning signs:** `core/` with fewer than 5 modules at phase close.

### Pitfall 7: Frame-time samples polluted by warmup, thermals, or the screen sleeping
**What goes wrong:** The first seconds after launch include shader compilation and JIT/interpreter warmup; a long ramp run heats the phone and throttles; the screen sleeps mid-run.
**How to avoid:** Discard the first ~2 seconds of samples; run a fixed-duration measurement window (e.g. 30 s) with `expo-keep-awake` active; reset counters with `adb shell dumpsys gfxinfo <pkg> reset` immediately before the window; record battery/thermal state and repeat the run at least twice.
**Warning signs:** Two runs of the same build differing by more than a few percent with no code change.

### Pitfall 8: Overlay or ramp affordances shipped in a production build
**What goes wrong:** A dev menu or state-manipulation affordance ships to the store.
**How to avoid:** Keep the flag off in the production EAS profile and add a release-build verification step. See "Security Domain."

## Code Examples

### Package config — the Skia override + scene support

```jsonc
// package.json (excerpt) — MUST exist before installing Skia
{
  "expo": {
    "install": { "exclude": ["@shopify/react-native-skia"] }
  }
}
```

```jsonc
// app.json (excerpt)
{
  "expo": {
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "plugins": [
      "expo-router",
      "expo-dev-client",
      ["expo-build-properties", { "ios": { "enableSceneSupport": true } }]
    ]
  }
}
```

### EAS profiles — dev client, profiling (release + overlay), production

```jsonc
// eas.json
{
  "cli": { "version": ">= 24.7.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_PERF_OVERLAY": "1" }
    },
    "profiling": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_PERF_OVERLAY": "1" }   // release build, overlay ON (D-03 + D-08)
    },
    "production": {
      "autoIncrement": true
      // no EXPO_PUBLIC_PERF_OVERLAY — verified off before submission
    }
  }
}
```

### The frame callback

```ts
// src/runtime/useSpikeLoop.ts
// Source: reanimated 4.5.1 useFrameCallback.d.ts + FrameCallbackRegistryUI.d.ts (FrameInfo shape verified)
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { stepStub } from '../core';
import { recordFrame } from '../render/recordSprites';
import { pushSample } from './metrics';
import { FIXED_DT, MAX_SUBSTEPS, MAX_FRAME_TIME } from './constants';

export const useSpikeLoop = (
  world: SharedValue<SpikeWorld | null>,
  picture: SharedValue<SkPicture | null>,
  metrics: SharedValue<Metrics>,
  bounds: SkRect,
) =>
  useFrameCallback((frame) => {
    'worklet';
    const w = world.value;
    if (!w) return;

    // timeSincePreviousFrame is ms and is null on the very first frame
    let dt = (frame.timeSincePreviousFrame ?? 16.67) / 1000;
    if (dt > MAX_FRAME_TIME) dt = MAX_FRAME_TIME;

    w.accumulator += dt;
    let steps = 0;
    while (w.accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
      stepStub(w, FIXED_DT);            // pure core/, 'worklet'-marked, no allocation
      w.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_SUBSTEPS) w.accumulator = 0;   // give up rather than spiral

    pushSample(metrics.value, dt * 1000, steps);     // mutates a preallocated ring buffer
    picture.value = recordFrame(w, metrics.value, bounds);   // ONE shared-value write
    // NOTE: no scheduleOnRN, no runOnJS, no setState anywhere above (D-14)
  });
```

### The canvas host

```tsx
// src/render/SpikeCanvas.tsx
// Source: Skia 2.12.0 renderer/Canvas.d.ts — `opaque` and `debug` verified on CanvasProps
import { Canvas, Fill, Picture } from '@shopify/react-native-skia';

export const SpikeCanvas = ({ picture }: { picture: SharedValue<SkPicture | null> }) => (
  <Canvas style={{ flex: 1 }} opaque>
    {/* opaque ⇒ SurfaceView on Android ⇒ the canvas must paint its own background
        and sit lowest in z-order; any RN overlay renders AFTER this in JSX */}
    <Fill color="black" />
    <Picture picture={picture} />
  </Canvas>
);
```

### Overlay drawn into the picture

```ts
// src/render/recordOverlay.ts
// Source: Skia 2.12.0 skia/core/Font.d.ts — matchFont is synchronous; useFont is async and nullable
import { Skia, matchFont } from '@shopify/react-native-skia';

const font = matchFont({ fontFamily: 'monospace', fontSize: 12 });  // host object; worklet-safe capture
const textPaint = Skia.Paint();
textPaint.setColor(Skia.Color('#00ffaa'));

export const drawOverlay = (canvas: SkCanvas, m: Metrics) => {
  'worklet';
  canvas.drawText(`${m.lastMs.toFixed(2)} ms  ${m.rollingFps.toFixed(1)} fps`, 8, 20, textPaint, font);
  canvas.drawText(`p95 ${m.p95Ms.toFixed(2)}  p99 ${m.p99Ms.toFixed(2)}`, 8, 36, textPaint, font);
  canvas.drawText(`substeps ${m.lastSubsteps} (max ${m.maxSubsteps})  sprites ${m.spriteCount}`, 8, 52, textPaint, font);
  canvas.drawText(`frames>16.7ms ${m.overBudget}/${m.sampleCount}`, 8, 68, textPaint, font);
};
```

### Vitest config + the two `core/` tests

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/core/**/*.test.ts', 'tests/**/*.test.ts'],
    // no RN preset, no transformIgnorePatterns, no jsdom — that is the point
  },
});
```

```ts
// tests/core.smoke.test.ts — D-09
import { describe, it, expect } from 'vitest';
import { allocateWorld, stepStub } from '../src/core';

describe('core/ runs unchanged in Node', () => {
  it('allocates and mutates a world across steps with no RN runtime', () => {
    const w = allocateWorld(256);
    const x0 = w.x[0];
    stepStub(w, 1 / 120);
    stepStub(w, 1 / 120);
    expect(w.x[0]).not.toBe(x0);          // mutated in place
    expect(Number.isFinite(w.x[0])).toBe(true);
  });
});
```

```ts
// tests/core.purity.test.ts — catches type-only and dynamic imports that Node resolution misses
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = /from\s+['"](react|react-dom|react-native|react-native-.*|@shopify\/react-native-skia.*|expo.*|@react-native.*)['"]|require\(\s*['"](react|react-native|expo)/;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });

describe('core/ purity', () => {
  it('contains no platform imports', () => {
    const offenders = walk('src/core').filter((p) => FORBIDDEN.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('is split across enough modules to exercise cross-module worklet imports', () => {
    expect(walk('src/core').filter((p) => !p.includes('.test.')).length).toBeGreaterThanOrEqual(5);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-native-reanimated/plugin` in babel | `react-native-worklets/plugin` | Reanimated 4 split worklets into its own package | Using the old path on SDK 57 silently fails to workletize |
| `runOnJS(fn)(args)` | `scheduleOnRN` from `react-native-worklets` | Reanimated 4.x | `runOnJS` is **deprecated** in 4.5.1 `[VERIFIED: workletFunctions.d.ts:30-31]`. Both are banned on the hot path (D-14), but new non-hot-path code should use `scheduleOnRN` |
| Canvas prop name uncertain (docs prop table vs. code example disagreed) | `opaque?: boolean` — confirmed on `CanvasProps` | Resolved here against the installed version | Closes project-research open question; no runtime experiment needed |
| One `useSharedValue` + one `useDerivedValue` per animated prop | `select(sharedValue, key)` — one value, one subscription, many props | Skia 2.11.0 | The reason for D-16. Not exercised in Phase 1; becomes load-bearing in Phase 3+ |
| `expo-av` | `expo-audio` | SDK 57 | Phase 7 concern; noted so nobody installs `expo-av` from a stale tutorial |
| iOS UIApplicationDelegate lifecycle | UIKit scene-based lifecycle | iOS 27 SDK / SDK 58 default | On SDK 57 it is an opt-in via `expo-build-properties`; local Xcode is 26.5, so it is not yet forced here — but enable it now rather than discovering it at submission |

**Deprecated / outdated:**
- `create-expo-app -e with-skia` as the recommended scaffold for this project — behind the SDK 57 matrix (see Alternatives).
- Expo Go for anything in this project — cannot load Skia.
- `vitest@5` on odd-numbered Node releases — Node 25 is outside its declared engines.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `create-expo-app` rejects the repo root because `.planning/` and `.cursor/` are not in its ignore list | Pitfall 5 / Installation | Low — if it actually succeeds, the temp-dir + rsync step is merely redundant. Verify by attempting it once |
| A2 | A `SkFont` from `matchFont` created on the JS thread can be used inside a UI-runtime worklet | Pattern F | Medium. Rationale is verified (Skia objects are JSI host objects and the serializer wraps rather than clones them), but this specific object was not exercised. **Fallback:** create the font inside the UI runtime at init, or render the overlay as a retained Skia `<Text>` node bound to a derived value |
| A3 | Enabling `ios.enableSceneSupport: true` is harmless when building with Xcode 26.5 / iOS 26 SDK | Pattern / app.json | Medium. The option is verified to exist; its behavior on a pre-27 SDK was not verified. **Mitigation:** if the first iOS build fails, drop the flag, record it, and re-add when the EAS image moves to Xcode 27 |
| A4 | EAS build images for SDK 57 ship a Xcode version compatible with these pins | Environment | Medium. Not verified in this session. Check the EAS build image docs or the first build log before assuming |
| A5 | `expo-template-default`'s extra dependencies (`@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-image`, `expo-web-browser`, `expo-device`) can be removed without breaking the router scaffold | Standard Stack / Alternatives | Low. Worst case they stay installed and add bundle weight that is irrelevant to a Phase-1 spike |
| A6 | Local `npx expo run:ios --device --configuration Release` with a free Apple ID is a viable fallback for the iOS release gate | Environment | Medium-High impact if wrong, because it is the escape hatch for the Apple Developer Program question. Free personal-team profiles expire after 7 days, which is acceptable for a one-time measurement but not for ongoing dev |
| A7 | `~200–300` opaque rects is well inside a Pixel 6a's budget, so the cliff ramp will need to go considerably higher | Validation / D-07 | Low. If 200 sprites already misses 60 FPS, that is itself the phase's most important finding and triggers the Skia 2.6.2 / layering / Atlas investigation early |
| A8 | Android release builds via `expo run:android --variant release` sign with the debug keystore by default in the Expo template | Environment fallback | Low. If not, generate a throwaway keystore for the measurement build |

## Open Questions

1. **Does Skia 2.12.0 build and run on EAS against the SDK 57 matrix?** (D-16, Validation Gate)
   - What we know: peer dependencies verified compatible; prebuilt binaries ship as plain npm deps with no postinstall, which removes the most common native-install failure mode.
   - What's unclear: no source confirms this exact combination shipping through EAS Build.
   - Recommendation: make it the very first build task on both platforms. Fallback to 2.6.2 is documented and, in Phase 1 specifically, cheap — `select()` is not used by the sprite harness.

2. **Can a UI-runtime-allocated mutable world be mutated in place across frames in a *release* build?** (Validation Gate 1)
   - What we know: dev-mode freezing is `__DEV__`-gated and applies to objects converted *on the RN runtime*; typed arrays crossing the boundary are copied. Allocating on the UI runtime should sidestep both.
   - What's unclear: release-build behavior on real hardware, on both platforms.
   - Recommendation: run the identical scripted check in dev and release and record both. Fallbacks: all hot state in typed arrays inside one shared value; then a JS-thread `requestAnimationFrame` loop.

3. **Do cross-module `'worklet'` imports work, or is Bundle Mode needed?** (Validation Gate 2)
   - What we know: imported functions need explicit `'worklet'` directives; `bundleMode` and `importForwarding` options exist in the pinned plugin.
   - Recommendation: force the question with ≥5 `core/` modules. If it fails, enable Bundle Mode with `importForwarding` and record it as a project-wide constraint — it affects every later phase.

4. **What is the Pixel 6a `SkPicture` draw-command budget?** (D-07)
   - What we know: nothing device-specific; project research offers only a general "watch closely above 150 commands, trouble above 400 on mid-range Android" heuristic.
   - Recommendation: ramp and record the curve, not just the pass/fail point. The number becomes the frame budget every later phase is measured against.

5. **Is there a paid Apple Developer Program membership available?**
   - What we know: EAS ad hoc internal distribution "requires a paid Apple Developer account" `[CITED: docs.expo.dev/build/internal-distribution]`. A physical iPhone (iOS 26.5.2) is already paired with this Mac, and Xcode 26.5 + CocoaPods are installed.
   - Recommendation: **ask before planning the iOS build tasks.** If there is no membership, plan the iOS gate as a local Xcode build with a free personal team and note the 7-day certificate expiry in the phase artifacts.

6. **Node runtime for the repo: 24 LTS, or `vitest@4` on the installed 25.6.0?**
   - What we know: RN 0.86.3 accepts Node ≥25; `vitest@5.0.1` does not; `vitest@4.1.11` does. No Node version manager is installed.
   - Recommendation: decide in the first task and record it (`.nvmrc` + `engines` if switching to 24; a STACK.md deviation note if staying on Vitest 4).

## Environment Availability

Probed on this machine on 2026-09-19.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Everything | ✓ | **25.6.0** | See below — outside `vitest@5` engines |
| npm | Install | ✓ | 11.8.0 | — |
| npx | `create-expo-app`, `eas-cli`, `expo-doctor` | ✓ | bundled | — |
| Xcode | Local iOS builds, Instruments profiling | ✓ | **26.5** (17F42) | EAS cloud build |
| CocoaPods | iOS prebuild | ✓ | 1.16.2 | — |
| Physical iPhone (D-02) | iOS install/feel gate | ✓ paired (currently offline) | iOS 26.5.2 | — |
| JDK | Local Android builds | ✓ | OpenJDK 21.0.10 LTS | EAS cloud build |
| Android SDK / cmdline tools | Local Android builds | ✓ | `/opt/homebrew/share/android-commandlinetools` (`ANDROID_HOME` set) | EAS cloud build |
| `adb` | `dumpsys gfxinfo` measurement | ✓ | platform-tools on PATH | — |
| **Pixel 6a attached (D-01)** | The hard FPS gate | **✗ no device currently attached** | — | D-04 substitute device with full documentation + Pixel 6a re-cert before MVP |
| `eas-cli` | EAS builds | ✗ not installed globally | latest is 24.7.0 | `npx eas-cli@latest` — no install needed |
| Expo account / EAS project | Any cloud build | **unknown** | — | Local builds (toolchain is present) |
| **Apple Developer Program membership** | iOS device install via EAS ad hoc | **unknown** | — | Local `expo run:ios --device` with a free personal team (7-day profiles) |
| `vitest@5.0.1` on Node 25.6.0 | D-09 smoke test | **✗ engine mismatch** | engines `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` | `vitest@4.1.11` (engines `^20 \|\| ^22 \|\| >=24`) **or** install Node 24 LTS |
| Node version manager (`nvm`/`fnm`/`volta`/`mise`) | Switching Node cleanly | ✗ none installed | — | `brew install node@24` (Homebrew currently has `node@25`) |
| `watchman` | Metro file watching (recommended) | ✗ | — | Metro works without it; expect slower/less reliable watching on large trees |

**Missing dependencies with no fallback:**
- **Pixel 6a on hand.** Nothing else can close the D-01 gate. If it is unavailable when execution starts, D-04 governs — but the plan must then carry an explicit re-certification task into the MVP milestone rather than leaving it implied.
- **Apple Developer Program membership *if* the iOS gate is planned on EAS.** Confirm before the plan hard-codes `eas build --platform ios --profile development`.

**Missing dependencies with fallback:**
- `eas-cli` → `npx eas-cli@latest` (this is the documented recommendation anyway).
- Node 25 vs Vitest 5 → Vitest 4.1.11, or `brew install node@24` plus an `.nvmrc`/`engines` entry.
- `watchman` → optional; `brew install watchman` if Metro watching misbehaves.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest` — **5.0.1 if Node 24 LTS is adopted, 4.1.11 if staying on Node 25.6.0** (decide in task 1) |
| Config file | `vitest.config.ts` — none exists yet; Wave 0 |
| Quick run command | `npx vitest run src/core` |
| Full suite command | `npx vitest run && npx tsc --noEmit && npx eslint .` |

### Phase Requirements → Test Map

ARCH-01 is a compound requirement; each success criterion needs its own check, and the two device criteria are inherently manual-with-tooling.

| Criterion | Behavior | Test Type | Automated Command | File Exists? |
|-----------|----------|-----------|-------------------|--------------|
| SC-4a (ARCH-01) | `core/` imports and executes in Node with no RN/Skia/Reanimated | unit | `npx vitest run tests/core.smoke.test.ts` | ❌ Wave 0 |
| SC-4b (ARCH-01) | No forbidden import specifier appears anywhere in `src/core/` (incl. type-only) | static/unit | `npx vitest run tests/core.purity.test.ts` | ❌ Wave 0 |
| SC-4c (ARCH-01, D-11) | An illegal import in `core/` **fails the lint run** | lint (negative test) | `npx eslint .` after temporarily adding `import 'react-native'` to a `core/` file — must exit non-zero, then revert | ❌ Wave 0 |
| SC-4d (ARCH-01, D-14) | No `runOnJS` / `scheduleOnRN` / `setState` in `src/runtime/` or `src/render/` hot-path modules | lint | `no-restricted-imports` + `no-restricted-syntax` rule, run by `npx eslint .` | ❌ Wave 0 |
| SC-4e (ARCH-01, D-12) | `core/` is split across ≥5 modules and imported transitively by the frame callback | unit | part of `tests/core.purity.test.ts` | ❌ Wave 0 |
| SC-2 | `'worklet'` module mutates a UI-runtime world in place across frames — **dev and release, both platforms** | manual-on-device | In-app self-check: assert a monotonically advancing tick counter and a changed sprite position after N frames; surface PASS/FAIL in the overlay. Justification for manual: requires the real UI runtime on hardware; no Node-runnable equivalent exists | ❌ Wave 0 |
| SC-3 | ~200–300 `SkPicture` sprites hold 60 FPS on Pixel 6a, release/profile | manual-on-device + external tool | `adb shell dumpsys gfxinfo <pkg> reset` → 30 s run → `adb shell dumpsys gfxinfo <pkg> framestats`; cross-read the in-app overlay. Justification for manual: D-05 forbids simulator/dev-build evidence | ❌ Wave 0 |
| SC-1 | Dev-client build installs and runs on both a physical iPhone and the Android reference device; Skia version bet resolved | manual-on-device | Build + install + launch, then an in-app assertion that the linked Skia version matches the intended one | ❌ Wave 0 |

### Device Measurement Protocol (D-08 methodology to write down)

- **What is measured:** frame interval in ms (`timeSincePreviousFrame`), rolling FPS as `1000 / mean(interval)` over the last 60 frames, p95 and p99 frame time, count of frames over 16.7 ms, substeps per frame (last + session max), and sprite count.
- **How:** the in-app overlay is the fast loop. The **verdict** comes from `adb shell dumpsys gfxinfo <pkg> framestats` on Android (and Perfetto if attribution is needed) and Xcode Instruments on iOS. Cross-check the Skia `debug` Canvas prop.
- **Which build:** release / profiling EAS profile (or local `--configuration Release` / `--variant release`). Never a dev build, never a simulator (D-05).
- **Which device:** Pixel 6a as the gate (D-01); the paired iPhone for install, rendering, touch responsiveness, and stability only (D-02). Record model, chipset, OS version, and display refresh rate for whatever device is used (D-04).
- **Sampling hygiene:** portrait-locked, screen kept awake, first ~2 s of samples discarded, fixed 30 s window, at least two runs, thermal state noted.
- **Also verify the compositing path on Android:** confirm the opaque Canvas is backed by a SurfaceView rather than a TextureView (e.g. via `adb shell dumpsys SurfaceFlinger --list` / `adb shell dumpsys window`), because the whole Android frame budget argument depends on it.

### Sampling Rate

- **Per task commit:** `npx vitest run src/core` (sub-second)
- **Per wave merge:** `npx vitest run && npx tsc --noEmit && npx eslint .`
- **Before every EAS build:** `npx expo-doctor@latest` + an assertion that the installed Skia version matches the intended one
- **Phase gate:** full suite green **and** release/profile device measurements recorded on both platforms before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] Node/Vitest decision + `vitest.config.ts` — blocks every automated check
- [ ] `tests/core.smoke.test.ts` — covers ARCH-01 SC-4a (D-09)
- [ ] `tests/core.purity.test.ts` — covers SC-4b and SC-4e
- [ ] `eslint.config.js` with the boundary matrix — covers SC-4c and SC-4d
- [ ] `docs/layer-contract.md` — the written half of ARCH-01
- [ ] In-app self-check + overlay (`src/runtime/metrics.ts`, `src/render/recordOverlay.ts`) — the only readout available for SC-2 and SC-3
- [ ] `eas.json` with a `profiling` profile that keeps the overlay on in a release build
- [ ] Framework install: `npm install -D vitest@<decided> @vitest/coverage-v8@<same major>`

## Security Domain

Surface area is near-zero in Phase 1 (offline, no backend, no accounts, no user input beyond a dev-flag toggle), but two items are real.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in this phase or milestone |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No multi-user surface |
| V5 Input Validation | no (Phase 1) | No external/user data is parsed yet; becomes relevant at Phase 4 (level JSON) |
| V6 Cryptography | no | Nothing stored or transmitted |
| V14 Configuration | **yes** | Build-configuration hygiene — see below |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Perf overlay / cliff-ramp affordance ships in a production build | Information Disclosure | Drive the overlay from an explicit build-time env flag set only on `development` and `profiling` EAS profiles; add a pre-submission check that a production build has it off. Note this is *more* important here than usual precisely because D-03 forces the overlay to survive into release builds |
| Dependency-integrity risk from an off-matrix native package | Tampering / Supply chain | Skia 2.12.0 is the single deliberate deviation. It ships prebuilt binaries as ordinary npm deps with **no postinstall script** `[VERIFIED: tarball]`, which is the lower-risk shape. Pin the exact version (no caret), commit the lockfile, and assert the resolved version before each build |
| Native build config drift across prebuilds | Tampering | All native config expressed through `app.json` + config plugins (`expo-build-properties`), never hand-edited in `ios/`/`android/`; keep those directories gitignored so a prebuild is always reproducible |
| Debug-signed release APK escaping the measurement context | Spoofing | If the Android release measurement build is debug-signed as a shortcut, label the artifact clearly and never distribute it |

## Sources

### Primary (HIGH confidence — verified this session)
- npm registry, queried 2026-09-19 — `version`, `engines`, `peerDependencies` for `expo`, `react-native@0.86.3`, `@shopify/react-native-skia`, `react-native-reanimated@4.5.1`, `react-native-worklets@0.10.1`, `react-native-gesture-handler`, `vitest` (5.0.1 and 4.1.11), `@vitest/coverage-v8`, `fast-check`, `eslint`, `eslint-config-expo`, `typescript-eslint`, `eslint-plugin-boundaries`, `eas-cli`, `tsx`, `expo-template-default@57.0.26`, `expo-template-blank-typescript@57.0.26`
- `raw.githubusercontent.com/expo/expo/sdk-57/packages/expo/bundledNativeModules.json` — authoritative SDK 57 pins for every native module cited
- `@shopify/react-native-skia@2.12.0` packed tarball — `renderer/Canvas.d.ts` (`opaque`, `debug`, `highBitDepth`, `androidWarmup`, `colorSpace`), `views/types.d.ts`, `skia/types/Picture/PictureRecorder.d.ts`, `dom/types/Drawings.d.ts` (`PictureProps`), `renderer/processors/Animations/Animations.d.ts` (`select`, `AnimatedProp`), `skia/core/Font.d.ts` (`matchFont`, `useFont`), `skia/types/Canvas.d.ts` (`drawPicture`), `package.json` (peer deps, prebuilt binary deps, no postinstall)
- `react-native-reanimated@4.5.1` packed tarball — `hook/useFrameCallback.d.ts`, `frameCallback/FrameCallbackRegistryUI.d.ts` (`FrameInfo` shape), `workletFunctions.d.ts` (`runOnJS` deprecation)
- `react-native-worklets@0.10.1` packed tarball — `memory/serializable.native.js` (`freezeObjectInDev` gating, `isHostObject` wrapping, `createSerializableArrayBufferView` copying), `index.d.ts` (`scheduleOnRN`, `scheduleOnUI`, `runOnUI`, `createWorkletRuntime`, `createSerializable`), `plugin/index.js` (`bundleMode`, `importForwarding`), `package.json` files list (`bundleMode/`, `plugin/`)
- `expo-build-properties@57.0.21` packed tarball — `pluginConfig.d.ts:394` and `iosSceneSupport.js` confirming `ios.enableSceneSupport`
- `eslint-config-expo@57.0.2` packed tarball — `flat.js` + `flat/` entries, `eslint >=8.10` peer
- `eslint-plugin-boundaries@7.2.0` packed tarball — `./recommended` and `./strict` exports
- `raw.githubusercontent.com/expo/examples/master/with-skia/package.json` — the off-matrix pins and `postinstall` that disqualify it as the scaffold
- Local machine probe — Node 25.6.0, npm 11.8.0, Xcode 26.5 (17F42), CocoaPods 1.16.2, OpenJDK 21.0.10, `ANDROID_HOME` set, `adb` present with no device attached, paired iPhone on iOS 26.5.2, no Node version manager, no `watchman`
- [Expo docs — Internal distribution](https://docs.expo.dev/build/internal-distribution/) — iOS ad hoc "requires a paid Apple Developer account"; Android internal builds produce an APK

### Secondary (MEDIUM confidence — inherited from project research, re-read this session)
- `.planning/research/STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `SUMMARY.md` — the SDK 57 matrix rationale, the Topology-B thread argument, immediate-mode rendering, the TextureView/SurfaceView finding, the measurement-tool warnings, and the validation-gate list. Original citations include the Reanimated/Skia/Expo official docs, Margelo's "Chasing a Phantom Jump" post-mortem, Skia discussions #773/#2099/#3218/#3556, and Reanimated issues #6189/#9661
- [Gaffer On Games — Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) — the accumulator formulation used in Pattern B

### Tertiary (LOW confidence — flagged for validation)
- Every item in the Assumptions Log, in particular A2 (`matchFont` host object in a worklet), A3 (`enableSceneSupport` on a pre-27 SDK), A4 (EAS image Xcode version), and A6 (free-personal-team local iOS release build)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every version, engine constraint, and peer dependency read directly from the registry or the packed tarball on 2026-09-19
- Library API surface: **HIGH** — `opaque`, `debug`, `select`, `PictureRecorder`, `PictureProps`, `matchFont`, `FrameInfo`, `useFrameCallback`, `scheduleOnRN`, `bundleMode`/`importForwarding`, and `enableSceneSupport` all confirmed in the exact pinned versions, not from documentation
- Architecture / worklet-boundary reasoning: **MEDIUM-HIGH** — the freeze-and-copy semantics are verified from worklets source; the conclusion that UI-runtime allocation therefore works on hardware in release builds is a well-supported inference, and is exactly what the phase exists to test
- Layer enforcement: **HIGH** — three mechanisms with independent failure modes, all using verified-available tooling
- Pitfalls: **MEDIUM-HIGH** — Phase-1-specific pitfalls derived from verified facts; the rendering/measurement pitfalls inherit the project research's MEDIUM-HIGH sourcing
- Device performance numbers: **LOW by construction** — no device-specific data exists; producing it is the phase's job

**Runtime State Inventory:** omitted — greenfield phase, no rename/refactor/migration and no pre-existing runtime state.

**Research date:** 2026-09-19
**Valid until:** 2026-10-19 for the version matrix (SDK 57 is stable; SDK 58 is in preview and will change this). The API-surface findings are valid for as long as the pinned versions are.
