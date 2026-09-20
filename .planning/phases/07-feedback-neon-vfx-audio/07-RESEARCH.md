# Phase 7: Feedback — Neon VFX & Audio - Research

**Researched:** 2026-09-20
**Domain:** Cosmetic UI-thread VFX (Skia immediate-mode trails / baked glow / pooled particles / camera shake) + modular `expo-audio` SFX over the existing event ring
**Confidence:** HIGH on architecture seams, event/audio APIs, and Android glow pitfalls; MEDIUM on exact particle/Atlas budgets and `expo-audio` Android latency (must measure on Pixel 6a)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### North star & hard constraints
- **D-01:** Art direction: **Shatter-inspired neon sci-fi** — impressive brick destruction, readable ball trail, modern arcade SFX.
- **D-02:** All VFX are **cosmetic only**. Deleting the VFX layer leaves gameplay identical. Effects must never compromise **ball visibility**, **paddle responsiveness**, or **stable 60 FPS on Pixel 6a**.
- **D-03:** **Reduced-motion support** and **adaptive VFX intensity** (single global scalar) are in scope. Intensity defaults from the OS reduce-motion flag — dampen, never a binary “effects off” for trail readability.
- **D-04:** No hit-stop / gameplay slowdown in Phase 7. No music, haptics, or full audio settings UI.

#### Neon glow & break spectacle (FX-02)
- **D-05:** Idle bricks: **always-on soft neon edge/halo** via **baked or cached** sprites/layers — **never** expensive per-brick blur every frame.
- **D-06:** Break particles: **bright neon sparks / energy flecks** — short, satisfying burst.
- **D-07:** Chip vs destroy: **same visual language at different intensities** — chip = small spark pop; destroy = larger burst + **brief glow flash**.
- **D-08:** Particle colors: **inherit brick color** + **white/cyan highlights**.
- **D-09:** Hard particle budget + intensity scalar; spectacle never obscures paddle/ball long enough to cost a rally.

#### Ball trail (FX-01)
- **D-10:** Trail style: **fading ghost afterimages** (not a continuous ribbon) for max readability at high speed and multi-ball.
- **D-11:** Trail length at full intensity: **short 3–5 frame history**; current ball position must always remain clearly distinguishable.
- **D-12:** Trail color: **white/light matching the ball** + **subtle cyan rim** for contrast on navy.
- **D-13:** Reduced / low intensity: preserve **1–2 high-contrast afterimages** with **no glow/bloom**; **never fully disable** the trail.
- **D-14:** Trail rendering stays lightweight — **bounded history per ball**; **no per-frame React state** updates.

#### Shake & impact punch
- **D-15:** Camera shake triggers: **brick destruction** and **life lost** only — not ordinary hits or power-up catch.
- **D-16:** Feel: **subtle, short-lived** shake with **smooth decay**; preserve aiming accuracy.
- **D-17:** Rapid destroys: **merge overlapping shakes** with a **hard amplitude cap** and **deterministic decay** (prevent multi-ball jitter).
- **D-18:** Shake amplitude scales with global VFX intensity → **approaches zero at minimum**.
- **D-19:** Shake is a **cosmetic camera/render offset only** — must never modify simulation coordinates, collision, paddle input, or ball trajectories.

#### SFX personality & mix (FX-03)
- **D-20:** Sonic identity: **modern neon arcade** — clean synth blips, punchy impacts, subtle sci-fi textures; **original assets only**.
- **D-21:** Brick hit vs break: **same sound family** — chip = short softer impact; destroy = fuller impact + brief shimmer.
- **D-22:** Loudness hierarchy: **Life lost / Win / Lose → Brick break → Paddle hit / Brick chip → Power-up catch** — rare events cut through without excessive volume.
- **D-23:** Rapid-fire: pooled players with **per-category voice limits**; at limit **reuse oldest voice** in that category (bounded overlap, not unbounded).
- **D-24:** Modular **`AudioService`**; **preload/decode before gameplay**; consume simulation events **without blocking** the physics loop. Event set: paddle hit, brick hit/break, power-up catch, life lost, win, lose — frame-aligned to impact.

### Claude's Discretion
- Exact particle pool sizes, spark lifetimes, glow-bake variant counts, and shake amplitude/decay constants within the locked feel bands
- Exact synth sample design / file packaging within “modern neon arcade + original”
- Exact per-category voice-limit numbers and `expo-audio` pool sizing (research recommends 2–3 players per sound — planner may refine)
- How intensity scalar maps numerically from OS reduce-motion (dampen ~research default band) as long as D-03/D-13/D-18 hold
- Internal VFX module file layout under `src/` as long as architecture seams (event ring → UI-thread VFX; batched drain → audio) are respected

### Deferred Ideas (OUT OF SCOPE)
- Haptics on paddle/break/life lost — FX-04 (v2)
- Combo-tier escalating juice (hit-stop, rising pitch, trail/shake scaling) — FX-06 (v2)
- Background music / ambient loop — AUD-01 / Out of Scope for MVP
- Full in-game audio or VFX settings UI — Out of Scope (modular hook only)
- Device quality tiers capping particles/trails/glow — Phase 8 (PLT-03 adjacent)
- Formal release-build 60 FPS certification + soak — Phase 8
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FX-01 | Ball has a trail that preserves readability at maximum speed (degrades to high-contrast minimum under reduced motion, never vanishes) | Ghost afterimage ring per ball slot; intensity maps trail length 5→2; SharedValue history; draw under ball in `recordFrame` |
| FX-02 | Neon destruction effects (glow, particles, subtle shake) use a global intensity scalar and a hard particle budget; spectacle never hides paddle/ball or breaks frame budget | Baked glow sprites; SoA particle pool; cosmetic shake offset; `vfxIntensity` SharedValue from OS reduce-motion; Pixel 6a measurement gate |
| FX-03 | Modular audio plays frame-accurate SFX for paddle hit, brick hit/break, power-up catch, life lost, win, and lose | Extend `EventCode` + push missing events; `AudioService` + `createAudioPlayer` pools; one batched `scheduleOnRN` drain after substeps |
</phase_requirements>

## Summary

Phase 7 adds a **deletable cosmetic layer** on top of the already-shipping UI-thread loop: trails, baked neon brick glow, pooled spark particles, cosmetic camera shake, and a modular `expo-audio` SFX service. The simulation stays authoritative; VFX and audio are pure event consumers. The phase succeeds only if spectacle never beats ball/paddle readability and every new draw cost is measured against the Phase 1 Pixel 6a frame budget (`docs/measurement-methodology.md`).

Three codebase facts dominate planning. (1) `EventCode` today is only `WALL_HIT | PADDLE_HIT | BRICK_HIT | BRICK_BREAK | BALL_OUT` — **power-up catch, life lost, win, and lose do not emit events yet**, so FX-03 requires a small `core/` taxonomy extension. (2) `stepRun` calls `clearEvents` at the start of every fixed substep, so an end-of-frame-only drain **drops events from intermediate substeps** — VFX/audio must snapshot after **each** `stepRun`. (3) ESLint currently forbids `runtime → vfx`, `runtime → services`, and any `scheduleOnRN` inside `runtime/`/`render/` (LC-07) — Phase 7 must update the layer contract with a **narrow batched-drain exception** and allow `runtime → vfx` (+ `render → vfx` for draw helpers).

**Primary recommendation:** Ship `src/vfx/` (trail + particles + shake + intensity) stepped on the UI thread from `useGameLoop`, bake glow into `SkImage`s at load, extend `EventCode` for FX-03 gaps, and implement `src/services/audio/` with `createAudioPlayer` pools + `preload`, drained by one batched JS hop per frame.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ghost ball trails | Browser / Client (UI-thread worklet + Skia) | — | Per-frame history must live in SharedValues / typed arrays; never React state |
| Baked brick neon glow | Browser / Client (startup bake → Skia blit) | CDN / Static (asset images if pre-authored) | One-time bake or load; zero per-brick blur at runtime |
| Pooled destruction particles | Browser / Client (UI-thread SoA + SkPicture) | — | Cosmetic only; stepped after sim from event ring |
| Cosmetic camera shake | Browser / Client (render offset) | — | Applied in `recordFrame` camera transform; never touches `World` coords |
| Global VFX intensity | Browser / Client (OS a11y → SharedValue) | — | `AccessibilityInfo` / Reanimated reduce-motion → scalar consumed by emitters |
| SFX playback | Browser / Client (JS-thread `AudioService`) | — | Native audio cannot run inside worklets; batch via event drain |
| Event taxonomy for SFX/VFX | API / Backend analogue = `core/` simulation | — | Only `core/` may push events; keeps purity + Node tests |
| Frame-budget measurement | External tooling (adb gfxinfo) | In-app overlay | Phase 1 contract: overlay = loop; verdict = release/profile gfxinfo on Pixel 6a |

## Project Constraints (from `.cursor/rules/`)

| Directive | Implication for Phase 7 |
|-----------|-------------------------|
| Expo HAS CHANGED — use https://docs.expo.dev/versions/v57.0.0/ | Install `expo-audio` via `npx expo install`; follow SDK 57 audio docs only (`expo-av` is gone) |
| Stack lock: RN + Expo + Skia + custom physics + fixed timestep | No alternate render/audio engines; VFX stays Skia immediate-mode |
| Performance: stable 60 FPS on mid-range; measure on hardware | Every VFX merge gates on Pixel 6a methodology; RN perf monitor alone invalid |
| Originality: no third-party game assets/music | Author original short SFX only; no Shatter samples |
| Offline MVP | Preload local `require()` assets; no network audio |
| GSD workflow: plan before free-form edits | Research → plan → execute; do not land VFX outside phase plans |
| Layer boundaries (eslint + `docs/layer-contract.md`) | Extend LC matrix for `vfx` + batched audio drain; keep `core/` pure |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@shopify/react-native-skia` | `2.12.0` (installed) | Trails, particles, baked glow blits, flash overlays inside `SkPicture` | Already locked; immediate mode is the documented path for games/particles `[VERIFIED: package.json]` `[CITED: shopify.github.io/react-native-skia/docs/shapes/atlas]` |
| `react-native-reanimated` | `4.5.1` | Frame host, SharedValues for intensity/trail/shake | Existing loop; `useReducedMotion` optional sync read `[CITED: docs.swmansion.com/.../useReducedMotion]` |
| `react-native-worklets` | `0.10.1` | `scheduleOnRN` for one batched audio drain | Documented cross-runtime hop `[CITED: ARCHITECTURE.md Pattern 5]` |
| `expo-audio` | `~57.0.5` (npm; **not yet installed**) | Modular SFX pools | Only SDK 57 audio path; `createAudioPlayer` + `preload` + `release()` `[VERIFIED: npm view expo-audio@57.0.5]` `[CITED: docs.expo.dev/versions/v57.0.0/sdk/audio/]` |
| React Native `AccessibilityInfo` | RN `0.86.3` | Live reduce-motion flag | `isReduceMotionEnabled` + `reduceMotionChanged` `[CITED: reactnative.dev/docs/0.86/accessibilityinfo]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `5.0.1` | Unit-test pure VFX math + AudioService mapping | Shake merge, intensity map, trail length, event→SFX routing (no Skia) |
| Existing `src/runtime/metrics.ts` | — | In-app ms/FPS overlay | Fast loop while tuning particle count |
| `docs/measurement-methodology.md` | — | Pixel 6a gfxinfo contract | Phase gate for every effect merge |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-audio` pools | `react-native-audio-api` | Lower latency Web-Audio path, but pre-1.0 + config plugin + rebuild — **escape hatch only after measured latency fails** `[CITED: STACK.md]` |
| Ghost afterimages in `SkPicture` | Continuous Path ribbon trail | Ribbon looks smoother but hides ball direction; locked out by D-10 |
| Baked glow sprites | Per-brick `BlurMask` | Looks great on iPhone; documented 60→15–30 on mid Android — **forbidden by D-05** `[CITED: PITFALLS.md Pitfall 7]` |
| Immediate-mode particle circles | Skia `<Atlas>` + `useRSXformBuffer` | Atlas wins at hundreds of instances; start with Picture draws; escalate if Pixel 6a cliff `[CITED: Skia Atlas docs]` |
| `useReducedMotion()` only | `AccessibilityInfo` listener | Hook is sync but **does not update on setting change**; prefer AccessibilityInfo for live defaults `[CITED: Reanimated useReducedMotion remarks]` |

**Installation:**
```bash
npx expo install expo-audio
# Prefer config plugin with microphone disabled for SFX-only:
# ["expo-audio", { "microphonePermission": false, "recordAudioAndroid": false, "enableBackgroundPlayback": false }]
```

**Version verification:** `expo-audio@57.0.5` published 2026-09-11 `[VERIFIED: npm registry]`. Skia `2.12.0` already pinned.

## Architecture Patterns

### System Architecture Diagram

```
  stepRun (per FIXED_DT)                 useFrameCallback (per vsync)
  ┌─────────────────────────┐            ┌──────────────────────────────────┐
  │ clearEvents             │            │ while accumulator >= FIXED_DT:   │
  │ stepWorld → push events │──events──► │   stepRun(world)                 │
  │ scoring / drops / …     │            │   snapshotEvents → VFX spawn     │
  │ lives / win (NEW events)│            │   append → audioBatch[]          │
  └─────────────────────────┘            │ stepVfx(vfx, dt, intensity)      │
                                         │ recordFrame(+ glow/trail/fx/shake)│
                                         │ scheduleOnRN(playBatch)  ← ONE   │
                                         └───────────────┬──────────────────┘
                                                         │
                    UI thread VFX                         │ JS thread
           ┌────────────────────┐                        ▼
           │ trails SoA         │              ┌─────────────────────┐
           │ particle pool      │              │ AudioService        │
           │ shake state        │              │ createAudioPlayer[] │
           │ intensity SharedVal│              │ per-category reuse  │
           └────────────────────┘              └─────────────────────┘
                         │
                         ▼
                  SkPicture → GameCanvas (opaque)
```

### Recommended Project Structure
```
src/
├── vfx/
│   ├── types.ts              # VfxState SoA shapes (no React)
│   ├── intensity.ts          # mapReduceMotion → scalar; clamp helpers
│   ├── trails.ts             # per-ball ring history (write/step/draw data)
│   ├── particles.ts          # pool spawn/step (chip vs destroy)
│   ├── shake.ts              # merge/cap/decay amplitude → offset
│   ├── consumeEvents.ts      # UI-thread event → spawn mapping
│   └── index.ts
├── render/
│   ├── textures/
│   │   └── bakeGlowSprites.ts  # startup: HP colors → SkImage halo variants
│   └── recordSprites.ts        # apply shake translate; draw glow/trails/particles under ball/paddle
├── services/
│   └── audio/
│       ├── types.ts            # AudioService interface
│       ├── expoAudioService.ts # pools + preload + playBatch
│       ├── mapping.ts          # EventCode → SfxId + volume
│       └── index.ts
├── runtime/
│   ├── useGameLoop.ts          # snapshot after each stepRun; stepVfx; batched drain
│   └── useVfxIntensity.ts      # AccessibilityInfo → SharedValue (cold path)
└── assets/sfx/                 # original short wav/m4a (paddle, chip, break, catch, life, win, lose)
```

### Pattern 1: Dual Event Consumers (UI VFX + Batched Audio)
**What:** Simulation only `pushEvent`s. After each `stepRun`, UI-thread code scans `evCode/evA/evB/evX/evY` once for VFX spawns and copies compact records into a preallocated audio batch. After the substep loop, **one** `scheduleOnRN(playBatch)`.
**When to use:** Always — this is the only outbound channel from `core/`.
**Example:**
```typescript
// Source: architecture Pattern 5 + stepRun clearEvents semantics [VERIFIED: src/core/stepRun.ts]
function afterStep(world: World, vfx: VfxState, audioBatch: AudioEventSoA): void {
  'worklet';
  consumeEventsForVfx(world, vfx);      // spawn particles / punch shake
  appendEventsForAudio(world, audioBatch); // copy codes; do not call audio here
}
// end of frame:
scheduleOnRN(playAudioBatch, audioBatch); // exactly once
```

### Pattern 2: Ghost Afterimage Trails (Bounded History)
**What:** For each ball slot, a ring of `N` `{x,y}` samples (N from intensity: 5 @ 1.0, 2 @ ≤0.25). Each frame after sim, write current interpolated ball position; draw oldest→newest as lower-alpha circles (+ cyan rim stroke on newest ghost only at high intensity).
**When to use:** FX-01 always-on readability.
**Example:**
```typescript
// Source: D-10…D-14; FEATURES.md trail-as-readability
const TRAIL_MAX = 5;
// Float32Array length = maxBalls * TRAIL_MAX * 2
function pushTrail(vfx: VfxState, ballIndex: number, x: number, y: number, len: number): void {
  'worklet';
  const base = ballIndex * TRAIL_MAX;
  const h = vfx.trailHead[ballIndex];
  vfx.trailX[base + h] = x;
  vfx.trailY[base + h] = y;
  vfx.trailHead[ballIndex] = (h + 1) % len; // len = f(intensity), never 0
}
```

### Pattern 3: Baked Neon Glow (No Per-Entity BlurMask)
**What:** At level load / app warm-up, render each brick fill color into an `SkImage` with a soft halo already painted (2 radius variants max). During play, `drawImage` under each live brick. Optional brief **destroy flash** = one full-screen or local additive quad fading ≤100ms — still not a live blur.
**When to use:** Idle bricks (D-05) and destroy flash (D-07).
**Anti-pattern:** `<BlurMask>` / image filter per brick `[CITED: Skia discussion #773, issue #2099]`.

### Pattern 4: Pooled Sparks + Chip/Destroy Intensity
**What:** Fixed SoA pool (`x,y,vx,vy,life,r,g,b,a,active`). `BRICK_HIT` → small burst; `BRICK_BREAK` → larger burst + flash. Spawn count × `vfxIntensity`; hard cap with oldest-eviction. Step with **variable frame dt** (cosmetic). Draw after bricks, **before** paddle/ball so tokens stay on top (Game Token Priority).
**When to use:** FX-02 destruction spectacle.
**Discretion defaults (planner may tune):** pool **128** (hard max **192**); chip **4** sparks / destroy **12**; life **120–220ms**; inherit `brickFill` color + white/cyan flecks.

### Pattern 5: Cosmestic Shake Merge/Cap/Decay
**What:** On `BRICK_BREAK` / `LIFE_LOST` only, add impulse to `shakeAmp`; `shakeAmp = min(CAP, max(shakeAmp, impulse))`; each frame `shakeAmp *= decay`; offset = `shakeAmp * intensity * (noiseX, noiseY)` from **cosmetic** PRNG — applied only as `canvas.translate` inside the letterbox save/restore. Never write paddle/ball world coords.
**Discretion defaults:** CAP ≈ **2.5** logical px; decay ≈ **0.85/frame @60Hz**; impulse destroy **1.2**, life lost **2.0**; at intensity 0.2 amplitude ≈ 0.

### Pattern 6: Global Intensity from OS Reduce-Motion
**What:** Cold-path hook reads `AccessibilityInfo.isReduceMotionEnabled()` and subscribes to `reduceMotionChanged`. Writes `vfxIntensity` SharedValue: `enabled ? 0.2 : 1.0` (FEATURES ~20% dampen band — discretionary within D-03/D-13/D-18). All emitters multiply counts/alpha/shake by this scalar; trail length uses `max(2, round(5 * intensity))` style mapping so trail never vanishes.
**When to use:** From first particle/trail API — do not retrofit.

### Pattern 7: Modular AudioService with Voice Pools
**What:** Interface mirrors `PersonalBestStore` / platform seams. Impl owns `Map<SfxId, AudioPlayer[]>` via `createAudioPlayer`, `preload(source)` at module/boot, `setAudioModeAsync({ playsInSilentMode: true })` for arcade feel, `release()` on teardown. `playBatch(events)` maps codes → SFX; per-category round-robin / oldest reuse (D-23).
**Discretion defaults:** brick chip/break **3** voices; paddle **2**; catch **2**; life/win/lose **1** each. Volumes follow D-22 hierarchy (linear gains, e.g. 1.0 / 0.85 / 0.7 / 0.55).

### Anti-Patterns to Avoid
- **Per-entity BlurMask/Shadow:** Android FPS cliff — bake instead.
- **React state for trails/particles:** Violates PHYS-06 / D-14.
- **End-of-frame-only event drain:** Loses multi-substep events — snapshot after each `stepRun`.
- **`useAudioPlayer` for the pool:** Lifecycle tied to React; use `createAudioPlayer` + manual `release()` `[CITED: expo-audio docs]`.
- **Calling audio from `core/` or inside worklets:** Breaks purity and cannot touch native audio.
- **Shake on every chip / power-up:** Violates D-15; dilutes impact.
- **Drawing particles above the ball:** Hides the token — draw under paddle/ball.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Overlapping SFX | One player + restart | `createAudioPlayer` pools | Official lifecycle; bounded overlap |
| Decode-on-first-hit | Lazy `new Player` in play() | `preload()` before PlayingHost | Frame-align requires warm buffers |
| Live neon glow | Custom blur shader per brick | Baked `SkImage` / `drawAsImage` | Android mask cost is documented |
| Particle GC | `particles.push({})` | Fixed SoA pool | Hermes GC pauses look like physics bugs |
| Intensity plumbing | Scattered booleans | One SharedValue scalar | Single a11y + readability control |
| FPS claims | RN Perf Monitor | `dumpsys gfxinfo` + overlay | Skia not visible to RN monitor |

**Key insight:** The hard problems (audio session readiness, Android glow cost, cross-runtime batching) already have blessed solutions in Expo 57 + project research — Phase 7 is integration discipline, not invention.

## Common Pitfalls

### Pitfall 1: Multi-Substep Event Loss
**What goes wrong:** Only the last `stepRun`'s events reach audio/VFX; combos feel randomly quiet.
**Why it happens:** `clearEvents(world)` at the start of every `stepRun` `[VERIFIED: src/core/stepRun.ts]`.
**How to avoid:** After each `stepRun` in the accumulator loop, snapshot events into VFX + audio batch; clear remains owned by `stepRun`.
**Warning signs:** Single-ball play sounds fine; multi-ball / high-speed bursts drop SFX.

### Pitfall 2: Missing Event Codes for FX-03
**What goes wrong:** Audio never fires for catch / life / win / lose.
**Why it happens:** Current `EventCode` lacks those codes; pickup catch and lives/win mutate state without `pushEvent` `[VERIFIED: src/core/types.ts, pickups.ts, lives.ts]`.
**How to avoid:** Add `POWERUP_CATCH`, `LIFE_LOST`, `WIN`, `LOSE` (and push at the authoritative mutation sites). Keep `core/` tests asserting event emission. Do **not** invent parallel React-only signals.

### Pitfall 3: Android Neon Glow Cliff
**What goes wrong:** iPhone 60 FPS, Pixel mid-range 15–30 FPS after glow lands.
**Why it happens:** Per-entity `BlurMask` / animated blur cache misses `[CITED: Skia #773, #2099]`.
**How to avoid:** Bake halos; zero live mask filters on bricks; measure worst-case multi-ball + max particles on Pixel 6a before merge.
**Warning signs:** Overlay fine on simulator; device drops only when bricks visible.

### Pitfall 4: Particles / Flash Hide the Ball
**What goes wrong:** Player loses a life “to VFX.”
**Why it happens:** Large opaque bursts drawn above tokens; flash too long.
**How to avoid:** Draw order bricks→glow→particles→paddle→ball→trail ghosts under ball; flash ≤~100ms; intensity scales count/alpha; playtest rule: ball must stay trackable.
**Warning signs:** Deaths immediately after multi-breaks with no paddle error.

### Pitfall 5: LC-07 vs Required Audio Hop
**What goes wrong:** Plan blocked by eslint, or someone adds per-event `scheduleOnRN`.
**Why it happens:** Phase 1 banned all `scheduleOnRN` in `runtime/`/`render/` `[VERIFIED: eslint.config.js, docs/layer-contract.md]`.
**How to avoid:** Update layer contract: allow **exactly one** batched drain helper (named file) OR host the hop in `app/`/`services` via a SharedValue queue drained with `useFrameCallback` on JS — prefer explicit eslint allowlist comment + LC amendment for one call/frame.
**Warning signs:** Lint disables on the whole runtime folder.

### Pitfall 6: Audio Not Ready / Silent Mode
**What goes wrong:** First hits silent; Android silent switch mutes arcade feel.
**Why it happens:** Playing before decode; default session respects silent switch.
**How to avoid:** `preload` all SFX before `setActive(true)`; await readiness (`playbackState` / loaded semantics per docs — do not trust `isLoaded` alone per PITFALLS); `setAudioModeAsync({ playsInSilentMode: true })`.
**Warning signs:** First brick quiet, later bricks loud.

### Pitfall 7: Measuring with the Wrong Tool
**What goes wrong:** Ship “60 FPS” that is only JS-thread idle.
**Why it happens:** Architecture keeps JS idle by design.
**How to avoid:** Follow `docs/measurement-methodology.md`; profiling build; Pixel 6a; worst-case scene (multi-ball × particle cap × shake).

### Pitfall 8: Cosmetic RNG Contaminates Gameplay
**What goes wrong:** Particle tweaks reshuffle power-up drops / break golden replays.
**Why it happens:** Shared PRNG stream.
**How to avoid:** Particle jitter uses `world.rngCosmetic` only (or a VFX-local seeded stream that never feeds `core/` outcomes).

## Code Examples

### Intensity Mapping (discretion band)
```typescript
// Source: FEATURES.md (~20% dampen) + D-03/D-13/D-18 [ASSUMED numeric 0.2]
export function intensityFromReduceMotion(enabled: boolean): number {
  return enabled ? 0.2 : 1.0;
}

export function trailLength(intensity: number): number {
  // never 0 — high-contrast minimum 2 ghosts
  return Math.max(2, Math.min(5, Math.round(3 + 2 * intensity)));
}
```

### Shake Merge / Cap / Decay
```typescript
// Source: D-15…D-19 research recommendation
export function punchShake(s: ShakeState, impulse: number, intensity: number): void {
  'worklet';
  const capped = Math.min(2.5, Math.max(s.amp, impulse));
  s.amp = capped * intensity; // intensity→0 kills shake (D-18)
}

export function stepShake(s: ShakeState): void {
  'worklet';
  s.amp *= 0.85;
  if (s.amp < 0.05) s.amp = 0;
}
```

### Audio Pool Play (JS thread)
```typescript
// Source: https://docs.expo.dev/versions/v57.0.0/sdk/audio/ [CITED]
import { createAudioPlayer, preload, setAudioModeAsync } from 'expo-audio';

await setAudioModeAsync({ playsInSilentMode: true });
preload(require('../../assets/sfx/brick_break.m4a'));

const pool = [0, 1, 2].map(() =>
  createAudioPlayer(require('../../assets/sfx/brick_break.m4a')),
);
let cursor = 0;

function playBreak(): void {
  const p = pool[cursor];
  cursor = (cursor + 1) % pool.length;
  p.seekTo(0);
  p.play();
}
```

### Baked Glow Draw Hook (conceptual)
```typescript
// Source: ARCHITECTURE Pattern 7 — bake once, blit many [CITED]
// At load: glowImages[hpKey] = await drawAsImage(<halo+fill/>, size)
// In recordFrame, under brick fill:
//   canvas.drawImage(glowImages[key], bx - pad, by - pad);
// Never: paint.setMaskFilter(BlurMask(...)) inside the brick loop.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-av` Sound | `expo-audio` `createAudioPlayer` / `preload` | Expo SDK 57 | Must not install `expo-av`; docs 404 on v57 |
| Per-shape BlurMask glow tutorials | Baked sprites + additive blit | Skia Android post-mortems 2023–2025 | Only viable mid-range path |
| Retained Skia children for particles | Immediate `SkPicture` / Atlas | Skia rendering-modes docs | Required for destruction bursts |
| Binary reduce-motion off | Dampened intensity scalar | Apple Reduced Motion guidance + FEATURES.md | Trail remains readable |

**Deprecated/outdated:**
- `expo-av` for this app — removed from SDK 57 matrix `[CITED: STACK.md / expo docs 404]`.
- Per-entity live blur as “the neon recipe” — fine for demos, fatal on Pixel-class Android.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Reduce-motion dampen scalar default `0.2` | Intensity | May feel too strong/weak — tune in discretion band |
| A2 | Particle pool 128 / chip 4 / destroy 12 is inside Pixel 6a budget | Particles | May need Atlas or lower caps after first gfxinfo |
| A3 | Shake CAP 2.5 logical px + 0.85 decay feels “subtle” | Shake | Aim feel regression — tune with playtest |
| A4 | `playsInSilentMode: true` is acceptable product choice | Audio | Some players expect silent hardware mute — document if contested |
| A5 | Baked 2D halo sprites achieve Shatter-like neon without RuntimeShader bloom | Glow | Art spike may require single full-screen bloom fallback |

**If empty:** N/A — table above lists discretionary assumptions needing playtest confirmation, not blockers.

## Open Questions (RESOLVED)

1. **Pixel 6a VFX frame budget after particles+glow** — **RESOLVED**
   - What we know: Phase 1 ~256 flat sprites target was waived; methodology exists; no gfxinfo numbers yet `[VERIFIED: docs/device-gate-results.md]`.
   - What's unclear: headroom once glow blits + ≤192 particles + trails land.
   - Recommendation: Plan a Wave measurement task after glow+particles land; cut particle cap / Atlas escalate before adding more spectacle.
   - **Resolution (plans):** Plan 04 lands glow+particles draw; Plan 06 writes `docs/phase7-vfx-measurement.md` + human/gfxinfo checkpoint against Phase 1 Pixel 6a methodology (D-04 waiver allowed). Cap/Atlas escalation only if measurement fails — not in-scope unless gap plans.

2. **`expo-audio` end-to-end latency on mid-range Android** — **RESOLVED**
   - What we know: API + pooling pattern verified; no recent public benchmark `[CITED: STACK.md open questions]`.
   - What's unclear: whether impact SFX feel frame-aligned under load.
   - Recommendation: Measure in-phase; if unacceptable, schedule `react-native-audio-api` migration as a follow-up (not same plan as first landing).
   - **Resolution (plans):** Plan 00 installs `expo-audio` only; Plan 03 ships pooled `AudioService`; Plan 05 one `scheduleOnRN` hop/frame; Plan 06 UAT checks frame-align feel. `react-native-audio-api` migration stays out of Phase 7 (follow-up if UAT fails).

3. **ESLint placement of the single `scheduleOnRN`** — **RESOLVED**
   - What we know: LC-07 bans it in `runtime/`/`render/` today.
   - What's unclear: whether planner prefers allowlisted `runtime/eventBridge.ts` vs app-owned drain.
   - Recommendation: Prefer `runtime/eventBridge.ts` with a **file-scoped** eslint exception and LC-07 amendment (“≤1 batched hop/frame allowed”).
   - **Resolution (plans):** Plan 00 file-scopes the exception to `src/runtime/eventBridge.ts` only + LC-07/LC-13/14 amendments; Plan 05 implements `flushAudioBatchOnJS` there (not app-owned drain).

4. **Glow bake implementation API** — **RESOLVED**
   - What we know: `drawAsImage` / `useTexture` patterns in Skia docs; recorder already in `recordSprites.ts`.
   - What's unclear: worklet-safe cache handoff (images created on JS, read on UI).
   - Recommendation: Bake on JS at level load into SharedValue/`SkImage` refs before `setActive(true)` — same lifecycle as fonts.
   - **Resolution (plans):** Plan 04 creates `bakeGlowSprites()` on the JS cold path (no live `BlurMask`); Plan 05 calls it from PlayingHost before `setActive(true)` and hands atlas into `recordFrame`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Vitest / tooling | ✓ | v25.6.0 (engines prefer 24 LTS) | Use Node 24 via nvm if engine strict |
| npm | Install expo-audio | ✓ | 11.8.0 | — |
| `expo-audio` package | FX-03 | ✗ not installed | target `~57.0.5` | `npx expo install expo-audio` |
| Pixel 6a + adb | Per-effect FPS gate | ✗ no device attached | — | Document D-04 substitute; still required before MVP |
| Original SFX assets | FX-03 | ✗ none in `assets/` yet | — | Author short m4a/wav in-phase |
| Skia 2.12.0 | All VFX draw | ✓ | 2.12.0 | — |
| Vitest | Validation | ✓ | 5.0.1 | — |

**Missing dependencies with no fallback:**
- Pixel 6a (or documented substitute) for merge gates that claim frame budget — simulator evidence invalid (D-05).

**Missing dependencies with fallback:**
- `expo-audio` — install via Expo; blocking until installed but trivial.
- SFX files — author originals; placeholder tones OK for wiring tests, replace before UAT.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `5.0.1` (Node env) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:core` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FX-01 | Trail length never 0; maps intensity→[2..5]; history bounded per ball | unit | `npx vitest run tests/vfx.trails.test.ts` | ❌ Wave 0 |
| FX-01 | Trail write does not allocate / respects ring modulus | unit | `npx vitest run tests/vfx.trails.test.ts` | ❌ Wave 0 |
| FX-02 | Particle spawn respects hard cap (oldest eviction) | unit | `npx vitest run tests/vfx.particles.test.ts` | ❌ Wave 0 |
| FX-02 | Chip vs destroy spawn counts scale with intensity | unit | `npx vitest run tests/vfx.particles.test.ts` | ❌ Wave 0 |
| FX-02 | Shake merge uses max+cap; decay monotonic; intensity 0 → amp 0 | unit | `npx vitest run tests/vfx.shake.test.ts` | ❌ Wave 0 |
| FX-02 | `intensityFromReduceMotion` dampens not zeros | unit | `npx vitest run tests/vfx.intensity.test.ts` | ❌ Wave 0 |
| FX-03 | EventCode includes catch/life/win/lose; core pushes them | unit | `npx vitest run tests/events.fx.test.ts` | ❌ Wave 0 |
| FX-03 | Audio mapping EventCode→SfxId + voice reuse at limit | unit | `npx vitest run tests/audio.mapping.test.ts` | ❌ Wave 0 |
| FX-03 | Multi-substep snapshot retains events across clears | unit | `npx vitest run tests/runtime.event-drain.test.ts` | ❌ Wave 0 |
| FX-01/02 | Pixel 6a worst-case frame budget (multi-ball×particles×glow) | manual-on-device | `adb shell dumpsys gfxinfo com.dexter292.bricksbreaker framestats` | ❌ Wave 0 (harness exists; device gate open) |
| Cross | Deleting `src/vfx` + audio wiring leaves `hashWorld` / physics tests green | unit | `npm run test:core` | ✅ existing |

### Sampling Rate
- **Per task commit:** `npm run test:core` (+ new VFX/audio unit files as they land)
- **Per wave merge:** `npm test` + eslint boundaries
- **Phase gate:** Full suite green + Pixel 6a (or D-04) gfxinfo note for VFX-on worst-case before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/vfx.trails.test.ts` — FX-01 length/bounds
- [ ] `tests/vfx.particles.test.ts` — FX-02 pool/cap/intensity
- [ ] `tests/vfx.shake.test.ts` — FX-02 merge/cap/decay
- [ ] `tests/vfx.intensity.test.ts` — reduce-motion mapping
- [ ] `tests/events.fx.test.ts` — new EventCodes + push sites
- [ ] `tests/audio.mapping.test.ts` — routing + voice limit (mock players)
- [ ] `tests/runtime.event-drain.test.ts` — multi-substep snapshot semantics
- [ ] `npx expo install expo-audio` + app plugin config (mic off)
- [ ] ESLint / `docs/layer-contract.md` updates: `runtime→vfx`, `render→vfx`, batched drain exception
- [ ] `assets/sfx/*` original placeholders
- [ ] Device measurement checklist item referencing `docs/measurement-methodology.md`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Offline game; no accounts in MVP |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (light) | Intensity scalar clamped `[0,1]`; event codes from trusted `core` enum only |
| V6 Cryptography | no | — |

### Known Threat Patterns for Expo + local SFX

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mic permission over-request | Elevation / Privacy | Disable mic in `expo-audio` plugin (`microphonePermission: false`, `recordAudioAndroid: false`) |
| Third-party copyrighted SFX | Legal / Spoofing brand | Original assets only; inventory in repo (Guideline 4.1) |
| Unbounded audio player alloc | Denial of Service (mem) | Fixed voice pools + `release()` on unmount |
| Perf overlay / debug drain in production | Information Disclosure | Keep `EXPO_PUBLIC_PERF_OVERLAY` off in production profile (existing Phase 1 rule) |

## Sources

### Primary (HIGH confidence)
- `src/core/stepRun.ts`, `src/core/types.ts`, `src/core/events/ring.ts` — event clear semantics + EventCode gaps `[VERIFIED: codebase]`
- `src/runtime/useGameLoop.ts`, `src/render/recordSprites.ts`, `src/render/camera.ts` — integration points `[VERIFIED: codebase]`
- `eslint.config.js`, `docs/layer-contract.md` — LC-07 / boundaries `[VERIFIED: codebase]`
- https://docs.expo.dev/versions/v57.0.0/sdk/audio/ — `createAudioPlayer`, `preload`, `setAudioModeAsync`, `release` `[CITED]`
- npm `expo-audio@57.0.5` `[VERIFIED: npm registry 2026-09-20]`
- https://reactnative.dev/docs/0.86/accessibilityinfo — reduce motion API `[CITED]`
- https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/ — sync caveat `[CITED]`
- https://shopify.github.io/react-native-skia/docs/shapes/atlas — particle scale-up path `[CITED]`
- `.planning/research/{SUMMARY,ARCHITECTURE,STACK,PITFALLS,FEATURES}.md` — baked glow, pools, dual consumers `[CITED]`
- `docs/measurement-methodology.md`, `docs/device-gate-results.md` — Pixel 6a gate status `[VERIFIED]`

### Secondary (MEDIUM confidence)
- Skia discussion #773 / issue #2099 — Android blur cliffs `[CITED: PITFALLS.md]`
- FEATURES.md ~20% dampen guidance — numeric intensity default `[CITED]`
- Apple Reduced Motion evaluation criteria — dampen vs delete `[CITED: FEATURES.md sources]`

### Tertiary (LOW confidence)
- Exact particle counts that hold 60 FPS on Pixel 6a with glow — **unmeasured**; treat as provisional until gfxinfo

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — Expo 57 audio + installed Skia/Reanimated verified
- Architecture: **HIGH** — seams match existing code; event-drain hazard verified in source
- Pitfalls: **HIGH** on glow/events/LC-07; **MEDIUM** on audio latency and particle ceilings

**Research date:** 2026-09-20
**Valid until:** 2026-10-20 (30 days; re-check if SDK 58 stable lands or expo-audio major bumps)
