# Phase 03: First Playable — Render, Input, Bricks, Lives, Pause - Research

**Researched:** 2026-09-20
**Domain:** RN/Expo UI-thread game loop — Skia immediate-mode render, Gesture Handler relative-drag input, core serve/lives/win-lose rules, AppState-safe pause
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Visual first-playable
- **D-01:** Flat untextured shapes only — no neon glow, particles, trails, or baked glow sprites (those wait for Phase 7).
- **D-02:** Palette: **navy playfield background** + white/light ball and paddle + **row-colored bricks** (basic solid fills). Multi-HP readability via color/brightness differences only in Phase 3 (non-color crack cues can wait for Phase 4 LVL-03 if needed for that phase's criteria).
- **D-03:** Keep the Phase 1 opaque Skia canvas / immediate-mode `SkPicture` path; evolve the blank spike harness into a real playfield renderer (layered by update frequency where practical: static bg, dirty bricks, per-frame dynamics).

### Paddle drag feel (PHYS-01)
- **D-04:** **Relative drag** across the **entire playfield** — record touch-down + paddle x, apply deltas with gain, clamp to arena. **Never teleport** the paddle to the finger on re-press.
- **D-05:** **Snappy arcade** tuning: slightly elevated gain, **minimal** smoothing (reject thumb jitter only — must not feel like syrup). Exact numeric gain/smoothing constants are Claude's discretion within that feel band; expect hardware retune.
- **D-06:** Control must feel responsive on both iOS and Android; no absolute finger-follow, no tilt/gyro.

### Serve & aim launch (PHYS-05)
- **D-07:** On life start the ball is **docked** to the paddle (rides with paddle motion).
- **D-08:** **Tap to launch** — outgoing angle derived from **paddle position / classic paddle-relative mapping** (same family as bounce clamps). No random serve.
- **D-09:** **No aim line** in Phase 3.
- **D-10:** No drag-release aim vector in Phase 3 (tap-only launch).

### Gesture / action separation (hard requirement)
- **D-11:** Touch used to **move the paddle must never accidentally trigger serve or resume**. Gameplay pan and UI/serve/resume actions must be clearly separated (e.g. distinct gesture recognizers, hit targets, and/or mode gates: serve tap only while docked and not paused; resume only via explicit resume control while paused; pan never counts as those taps).
- **D-12:** Planner/researcher must specify a concrete separation scheme that survives simultaneous finger motion and accidental taps on the playfield.

### Pause / background resume (PLT-01)
- **D-13:** Player can **Pause / Resume / Retry** from a **minimal** pause overlay.
- **D-14:** **`AppState` (or equivalent) auto-pauses** on background/blur/interruption; **reset the simulation accumulator** — never catch up a large backlog of physics steps on return.
- **D-15:** After OS interruption (and for resume from pause): require an **explicit tap** (Resume control), **then** a **3-second countdown**, **then** gameplay continues. **Never auto-resume gameplay** after an OS interruption without that tap + countdown sequence.
- **D-16:** Mid-rally background for 60+ seconds must return safely with no physics jump (success criterion).

### Lives, win / lose, bricks (RUN-02)
- **D-17:** Default **3** lives; clear **lose** when the last life is spent.
- **D-18:** Clear **win** when the last **breakable** brick is destroyed (unbreakable bricks never block win — consistent with Phase 2 D-10).
- **D-19:** Win/lose presentation: **minimal overlay** — “Win” / “Lose” + **Retry** (no fancy results screen; Phase 6 owns polished UI/HUD/persistence).
- **D-20:** **One hardcoded brick grid** in code for Phase 3 — includes multi-HP bricks and some unbreakable/structural bricks. Level format/authoring deferred to Phase 4.

### Claude's Discretion
- Exact gain, smoothing alpha, and dead-zone numbers (must match D-05 feel)
- Exact serve angle mapping from paddle position (must stay consistent with Phase 2 paddle bounce clamps / PHYS-04)
- SkPicture layer split (bg / bricks / dynamics) and camera letterbox math details
- Exact Resume button placement and countdown visual (must satisfy D-11…D-15)
- Hardcoded grid layout density/shape (must be playable and exercise multi-HP + unbreakable)
- Whether spike file names (`SpikeScreen`, `useSpikeLoop`) are renamed to game names in this phase or evolved in place

### Deferred Ideas (OUT OF SCOPE)
- Level format, validation, migrations, authored layouts, non-color brick damage cues as first-class — Phase 4
- Score, combo, power-ups, multi-ball activation, anti-stall — Phase 5
- Polished menus, HUD event mirrors, high score persistence, safe-area product polish beyond playable letterbox — Phase 6
- Neon VFX, trails, particles, audio/haptics — Phase 7
- Aim line / drag-release serve variants — backlog unless a later phase needs them
- Hardware 60 FPS re-cert (Pixel 6a / physical iOS) — MVP debt from Phase 1 waiver
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHYS-01 | Relative-drag paddle with tuned gain + light smoothing; never absolute finger-follow | Input layer `Gesture.Pan` → absolute virtual `Intent.paddleX`; relative anchor on `onBegin`; gain + EMA; camera scale conversion |
| PHYS-05 | Docked ball on life start; aimed tap/release launch | Core dock/serve rules; `Intent.launch`; reuse `resolvePaddleEnglish` family; Tap recognizer mode-gated to docked |
| RUN-02 | Default 3 lives; clear win/lose presentations | Core lives + win (last breakable) + lose; React `ResultOverlay` + Retry; hardcoded multi-HP/unbreakable grid |
| PLT-01 | Pause/resume; OS auto-pause; countdown resume; no physics catch-up | `useFrameCallback.setActive(false)`; AppState → pause + accumulator reset; Resume Pressable → 3s countdown → unfreeze |
</phase_requirements>

## Summary

Phase 3 is the mandated sequential integration: evolve the Phase 1/2 spike host into a playable rally by wiring (1) letterboxed Skia entity rendering, (2) UI-thread relative-drag + docked tap-serve, (3) pure core lives/serve/win-lose rules consuming Phase 2 `stepWorld` + event ring, and (4) pause with AppState-safe accumulator reset and tap→countdown resume. The physics core already provides swept collision, paddle english, multi-HP/unbreakable bricks, and `BALL_OUT` events — it does **not** yet dock the ball, consume `Intent.launch`, track lives, or declare win/lose. The render path currently stretches a blank navy field full-bleed; it must switch to uniform scale + black letterbox and draw paddle/ball/bricks. Gesture Handler and Reanimated are already installed at SDK pins; overlays stay thin React chrome per `03-UI-SPEC.md`.

**Primary recommendation:** Keep `Intent.paddleX` as **absolute virtual paddle center** (Phase 2 contract). Put relative-drag math in `src/input/` writing a SharedValue each pan update; add pure `core/` run rules (`docked`/`playing`, lives, launch, win/lose) stepped from the evolved frame host; freeze the loop with `frameCallback.setActive(false)` + accumulator zero on any pause path; never auto-unfreeze after OS return — only Resume Pressable → 3·2·1 → `setActive(true)`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Relative-drag → paddle target | Browser / Client (UI-thread worklet) | — | Gesture Handler callbacks are UI-thread worklets; write SharedValue, never resolve physics |
| Dock / launch / lives / win-lose rules | API / Backend analogue (`core/` pure TS) | Runtime host | Testable in Node; same step path as physics |
| Swept sim step | `core/` | Runtime accumulator | Already Phase 2; host only supplies `Intent` + `FIXED_DT` |
| SkPicture entity draw | Render layer (UI thread) | — | Immediate-mode read-only world consumer |
| Camera / letterbox | Render + Input | Safe-area (RN) | Virtual→device at edges only; gestures invert the same transform |
| Pause overlay / countdown / win-lose chrome | React UI shell | — | Discrete React state; not per-frame |
| OS background auto-pause | Runtime (AppState) | — | Platform lifecycle; reset accumulator; freeze frame callback |
| Hardcoded brick grid | `core/` init / reset | — | Same SoA fields Phase 4 will fill from level data |

## Project Constraints (from .cursor/rules/)

From `.cursor/rules/gsd.md` (project + stack locks):

- **Stack locked:** Expo SDK 57, RN 0.86.3, Skia 2.12.0 override, Reanimated 4.5.1, Worklets 0.10.1, Gesture Handler ~2.32.0, Vitest for `core/`
- **Performance:** Measure on hardware for FPS claims; Phase 3 playable may use simulator but must not claim 60 FPS gate closed (Phase 1 waiver / D-04 debt)
- **Offline / originality / no ads-IAP in MVP** — Phase 3 adds no network or monetization
- **Phasing:** Playable prototype first — this phase *is* that prototype
- **GSD workflow:** Prefer GSD commands for file-changing work; research artifact is expected here
- **AGENTS.md:** Use [Expo SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/) before recommending Expo APIs — AppState itself is React Native core (no Expo AppState module in v57)

## Standard Stack

### Core (already installed — do not re-litigate)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | ~57.0.24 | App host | SDK matrix [VERIFIED: package.json] |
| `react-native` | 0.86.3 | AppState, Views | SDK pin [VERIFIED: package.json] |
| `@shopify/react-native-skia` | 2.12.0 | Opaque Canvas + Picture | Immediate-mode games path; `opaque` prop present in 2.12.0 types [VERIFIED: node_modules types] |
| `react-native-reanimated` | 4.5.1 | `useFrameCallback` + `setActive` | Pause primitive [CITED: docs.swmansion.com/.../useFrameCallback] |
| `react-native-worklets` | 0.10.1 | Worklet runtime | SDK pin with Reanimated |
| `react-native-gesture-handler` | ~2.32.0 (installed 2.32.0) | `Gesture.Pan` / `Tap` / composition | UI-thread handlers by default [VERIFIED: node_modules] |
| `react-native-safe-area-context` | ~5.7.0 | Insets for letterbox | Already dependency [VERIFIED: package.json] |
| `vitest` | 5.0.1 | Unit tests for core rules | Existing harness [VERIFIED: package.json / vitest.config.ts] |
| `fast-check` | 4.10.2 | Keep for physics props; optional for rules | Existing |

### Supporting (Phase 3 — no new native modules required)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-keep-awake` | ~57.0.2 | Prevent sleep mid-rally | Already used in `SpikeScreen` |
| SpaceMono font | bundled | Overlay / countdown text | Per UI-SPEC |
| React `AppState` | RN core | Background / inactive | Prefer over inventing Expo wrapper — Expo v57 has no dedicated AppState SDK page (404) [VERIFIED: docs.expo.dev/versions/v57.0.0/sdk/app-state → 404] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Relative drag → absolute `Intent.paddleX` | Delta intent inside `stepWorld` | Would break Phase 2 Intent contract and golden-replay shape; reject |
| `Gesture.Pan` + mode-gated `Tap` | Single Pan with `onEnd` launch | Violates D-10/D-11 (drag-release aim / accidental serve) |
| Playfield tap to resume | Resume Pressable | Violates D-11/D-15 |
| Catch-up physics after background | Accumulator reset | Causes teleport / multi-life loss (Pitfall 11) |
| Retained `<Rect>` bricks | Immediate `Picture` | Entity-count stutter on breaks (Pitfall 5) — reject |
| New native deps | — | None needed for Phase 3 |

**Installation:** No new packages required for Phase 3 deliverables.

**Version verification (2026-09-20):**
- `react-native-gesture-handler@2.32.0`, `react-native-reanimated@4.5.1`, `@shopify/react-native-skia@2.12.0`, `vitest@5.0.1` — installed [VERIFIED: node_modules + npm view]
- npm `latest` RNGH is 3.x — **do not upgrade** (SDK 57 matrix) [VERIFIED: npm view]

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ AppState: inactive/background                                    │
│   → uiPhase=paused, setActive(false), accumulator=0              │
│   (on return to active: stay paused — never auto-unfreeze)       │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ GameScreen (evolve SpikeScreen)                                  │
│  ┌─ PauseButton / Lives label (React chrome)                    │
│  ┌─ Overlays: Pause | Countdown | Win | Lose (pointerEvents)    │
│  └─ GestureDetector (playfield)                                  │
│        Pan ──(docked|playing)──► paddleTarget SV (virtual X)     │
│        Tap ──(docked only; blocked if panActive)──► launch flag  │
└───────────────┬───────────────────────────┬─────────────────────┘
                │                           │
                ▼                           ▼
┌───────────────────────────┐   ┌─────────────────────────────────┐
│ useGameLoop (evolve       │   │ camera.ts                        │
│  useSpikeLoop)            │   │  scale=min(safeW/360,safeH/640)  │
│  if !frozen:              │   │  ox,oy letterbox into safe area  │
│    accumulate dt (clamped)│   └──────────────▲──────────────────┘
│    while ≥ FIXED_DT:      │                  │
│      Intent{paddleX,launch}                  │ invert for pan
│      stepRunRules + stepWorld                │ (Δpx / scale)×gain
│    recordFrame → picture SV                  │
│  setActive(false) when paused/countdown/over │
└───────────────┬───────────┘                  │
                │                              │
        ┌───────▼────────┐            ┌────────┴────────┐
        │ core/          │            │ render/         │
        │  stepWorld     │ read-only  │  recordFrame:   │
        │  serve/lives   │───────────►│   bg + bricks   │
        │  win/lose      │            │   + paddle/ball │
        │  event ring    │            │  GameCanvas     │
        └────────────────┘            │  opaque Picture │
                                      └─────────────────┘
```

### Recommended Project Structure

```
src/
├── core/
│   ├── step.ts                 # existing CCD step (keep Intent.paddleX absolute)
│   ├── rules/
│   │   ├── serve.ts            # dock ball to paddle; apply launch via english
│   │   ├── lives.ts            # BALL_OUT → life loss / re-dock / lose
│   │   └── win.ts              # last breakable destroyed → win
│   ├── levels/
│   │   └── phase3Grid.ts       # hardcoded multi-HP + unbreakable layout (D-20)
│   └── types.ts                # extend: lives, simPhase (docked|playing|won|lost)
├── input/
│   └── usePaddleGesture.ts     # Pan relative + Tap serve; mode SharedValues
├── render/
│   ├── camera.ts               # letterbox math (NEW)
│   ├── recordSprites.ts        # evolve → entities (or split layers)
│   ├── GameCanvas.tsx          # evolve SpikeCanvas
│   └── colors.ts               # UI-SPEC hex fills
├── runtime/
│   ├── GameScreen.tsx          # evolve SpikeScreen + overlays host
│   ├── useGameLoop.ts          # evolve useSpikeLoop + freeze/AppState hooks
│   └── overlays/               # Pause / Countdown / Result (colocate — see note)
└── app/index.tsx               # mount GameScreen
```

**ESLint boundary note:** `runtime/` may import `core` + `render` only — **not** `ui/`. Keep Phase 3 overlays under `runtime/overlays/` (SpikeScreen pattern) unless `app/` composes `ui/` separately. Do not invent `runtime → ui` without an eslint policy change. [VERIFIED: eslint.config.js]

### Pattern 1: Relative drag → absolute Intent (PHYS-01)

**What:** On pan begin, snapshot `{ fingerX_px, paddleX_vu }`. On update:  
`targetVu = paddleAtBegin + (translationX_px / camera.scale) * GAIN`, then EMA-smooth into SharedValue consumed as `Intent.paddleX`. Clamp with paddle half-width vs `LOGICAL_WIDTH` (same as `stepWorld`).

**When to use:** Always for paddle control.

**Example:**
```typescript
// Source: RNGH Pan translationX [CITED: docs.swmansion.com/.../pan-gesture]
// Relative-drag principle [CITED: FEATURES.md / jjunior.net relative-drag]
pan
  .onBegin(() => {
    'worklet';
    anchorFingerX.value = 0; // translation starts at 0 each gesture
    anchorPaddleX.value = paddleTarget.value; // current paddle — NOT finger×scale
  })
  .onUpdate((e) => {
    'worklet';
    if (uiPhase.value !== PHASE_PLAYING && uiPhase.value !== PHASE_DOCKED) return;
    const raw = anchorPaddleX.value + (e.translationX / camScale.value) * PADDLE_GAIN;
    const smoothed = paddleTarget.value + (raw - paddleTarget.value) * SMOOTH_ALPHA;
    paddleTarget.value = clampPaddle(smoothed);
  });
```

**Discretion defaults (tune on device):** `PADDLE_GAIN ≈ 1.15–1.35`, `SMOOTH_ALPHA ≈ 0.35–0.5` (higher = snappier), dead-zone optional via `minDistance(4–8)`. [ASSUMED] exact numbers — D-05 band only.

### Pattern 2: Gesture / UI separation scheme (D-11, D-12) — CONCRETE

Implement the UI-SPEC locked scheme (or equivalent preserving invariants):

1. **Two recognizers, mode-gated**
   - `Gesture.Pan()` — `.enabled(simPhase === docked || simPhase === playing)` via React `.enabled(...)` updates when phase SharedValue/React state changes; writes paddle target only.
   - `Gesture.Tap()` — `.enabled(simPhase === docked && uiPhase === playingShell)` i.e. docked and **not** paused/countdown/won/lost.
2. **Composition:** Prefer `Gesture.Race(pan.minDistance(N), tap.maxDistance(N))` so movement activates Pan and cancels Tap; a stationary finger-up activates Tap. Also track `panActive` SharedValue; Tap `onEnd` no-ops if `panActive`. [CITED: RNGH Race composition docs]
3. **Resume is never a playfield tap** — only `Pressable` on pause overlay (`accessibilityLabel: "Resume game"`).
4. **Pause / Retry** — React chrome only (top-trailing Pause; overlay Retry).
5. **Overlays** set `pointerEvents="box-none"` / full-screen catcher so canvas underneath receives no serve taps while paused/countdown/results.
6. **Simultaneous fingers:** While `panActive`, ignore serve; second finger must not call Resume (Resume not on playfield).

**Invariant tests:**
- Unit: mode-flag helpers — pan-while-docked does not set `launch`; paused phase ignores launch.
- Manual: pan across playfield while docked moves paddle and does not launch; pan while paused does not Resume.

### Pattern 3: Serve + lives + win in `core/` (PHYS-05, RUN-02)

**What:** Extend world with `lives` (default 3) and `simPhase` (`docked=0`, `playing=1`, `won=2`, `lost=3`). Each fixed step:

```
if simPhase == docked:
  snap ball to paddle (vx=vy=0); if intent.launch → applyServeVelocity(); simPhase=playing
else if simPhase == playing:
  stepWorld(...)
  drain events: BALL_OUT → lives--; if lives>0 re-dock else lost
                BRICK_BREAK → if countBreakableAlive()==0 → won
```

**Serve velocity:** Reuse `resolvePaddleEnglish(ballX, paddleX, halfW, 0, -SERVE_SPEED)` so serve angles share PHYS-04 clamps (±62°). [VERIFIED: src/core/physics/resolve.ts] No `Math.random()`.

**Win:** Count bricks with `hp > 0` and `(flags & UNBREAKABLE) === 0`. Unbreakables never block win (Phase 2 D-10 / Phase 3 D-18).

**BALL_OUT today:** `stepWorld` already pushes `EventCode.BALL_OUT` and clears `ballActive` — lives logic must consume the ring each step (or end-of-step scan). [VERIFIED: src/core/step.ts]

### Pattern 4: Camera letterbox (D-03 / UI-SPEC)

Replace current stretch `scale(wPx/360, hPx/640)` in `recordSprites.ts` with uniform scale into the **safe-area** content box; fill letterbox `#000000`; navy `#1a1a2e` only inside field. [VERIFIED: current stretch in recordSprites.ts; UI-SPEC letterbox contract]

```typescript
// Source: ARCHITECTURE Pattern 3 [CITED: .planning/research/ARCHITECTURE.md]
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

Wire `useSafeAreaInsets()` in GameScreen; pass content size into loop/`onSize` path. Canvas stays opaque + lowest z-order (already `SpikeCanvas`). [VERIFIED: SpikeCanvas opaque prop]

### Pattern 5: Pause / AppState / countdown (PLT-01)

```
Playing → [Pause Pressable | AppState inactive|background] → Paused
  frameCallback.setActive(false)
  world.accumulator = 0
  show PauseOverlay

Paused → Resume Pressable → CountdownOverlay (3,2,1 via JS timers)
  sim stays frozen (setActive false); pan disabled; no paddle intent applied

Countdown end → uiPhase=playingShell; setActive(true)
  if simPhase was playing, continue rally; if was docked, stay docked
```

**Critical:** On AppState return to `active`, **do not** call `setActive(true)`. Re-show pause overlay if interrupted mid-rally. [CITED: reactnative.dev/docs/appstate; PITFALLS.md Pitfall 11]

Also keep existing `MAX_FRAME_TIME` / `MAX_SUBSTEPS` clamps as belt-and-suspenders. [VERIFIED: useSpikeLoop.ts]

`timeSincePreviousFrame` is `null` on first frame after reactivation — treat as ~16.67 ms; do not accumulate a huge synthetic dt. [CITED: useFrameCallback docs]

### Anti-Patterns to Avoid

- **Absolute finger-follow / teleport on re-press** — sets paddle to finger X; violates PHYS-01 / D-04
- **`runOnJS` / `scheduleOnRN` on hot path** — LC-07 banned; overlays use discrete React state only
- **React state every physics frame** — LC-11; lives label updates only on discrete life events
- **Catch-up after background** — PLT-01 failure mode
- **Playfield tap Resume** — D-11/D-15 failure
- **`bricks.map → <Rect>`** — retained-mode stutter
- **Stretch non-uniform camera** — changes feel across aspect ratios
- **Putting pause phase inside `stepWorld` with wall-clock** — purity / determinism break

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Touch → shared value | Custom native modules / JS-thread PanResponder | RNGH `Gesture.Pan` worklets | Zero JS hop; already pinned |
| Frame clock / pause | `setInterval` / rAF on JS | `useFrameCallback` + `setActive` | Vsync; documented pause |
| Safe-area math | Manual status-bar hacks only | `react-native-safe-area-context` | Notches / home indicator |
| Serve angle mapping | New random/ad-hoc angles | `resolvePaddleEnglish` | PHYS-04 consistency |
| Brick HP / CCD | New collision in render | Existing `stepWorld` | Already tested |
| Opaque Android path | Guess TextureView workarounds | Keep `<Canvas opaque>` | SurfaceView path; already spike-proven |

**Key insight:** Phase 3 is integration + thin rules/UI — not a new engine. Hand-rolling touch, timestep, or collision would fight the Phase 1/2 architecture.

## Common Pitfalls

### Pitfall 1: Gesture raises frame-callback rate
**What goes wrong:** Ball appears to speed up while finger is down.  
**Why:** RNGH raises `useFrameCallback` rate during gestures (intended). [CITED: reanimated#6189 via PITFALLS]  
**How to avoid:** Fixed-timestep accumulator (already present) — never integrate partial remainder.  
**Warning signs:** Speed changes only while dragging.

### Pitfall 2: Background accumulator detonation
**What goes wrong:** Return from phone call → freeze then teleport / multi-life loss.  
**Why:** Huge `dt` drains many substeps.  
**How to avoid:** AppState → `setActive(false)` + `accumulator = 0`; never catch up; Resume + countdown.  
**Warning signs:** No AppState listener; loop still ticking when backgrounded.

### Pitfall 3: Accidental serve / resume
**What goes wrong:** Drag ends launch the ball or unpause.  
**Why:** Single gesture handles move + tap; Resume on playfield.  
**How to avoid:** Race/Exclusive + mode gates + Resume Pressable only; overlay `pointerEvents`.  
**Warning signs:** Launch while panning; resume without button.

### Pitfall 4: Stretch camera vs letterbox
**What goes wrong:** Paddle feel and aim differ on tall vs wide phones.  
**Why:** Current `recordSprites` non-uniform scale. [VERIFIED: recordSprites.ts]  
**How to avoid:** Uniform `min` scale + black bars; convert pan by `/ scale`.  
**Warning signs:** Circles look elliptical; gain feels different per device.

### Pitfall 5: Intent.launch ignored / no dock
**What goes wrong:** Ball always free-flying from `resetWorld` defaults.  
**Why:** Phase 2 leaves `launch` unused; reset places a moving ball. [VERIFIED: types.ts, reset.ts, step.ts]  
**How to avoid:** Explicit dock path before first `stepWorld` CCD; consume launch once per edge.  
**Warning signs:** Life start with ball already in flight.

### Pitfall 6: Win blocked by unbreakables
**What goes wrong:** Level uncleared with only steel bricks left.  
**Why:** Counting all `hp > 0`.  
**How to avoid:** Exclude `BrickFlags.UNBREAKABLE`.  
**Warning signs:** Win never fires on D-20 grid.

### Pitfall 7: Overlay z-order under opaque canvas
**What goes wrong:** Pause UI invisible / untappable.  
**Why:** Opaque SurfaceView occludes siblings behind it.  
**How to avoid:** Canvas absolute fill lowest; overlays **after** canvas in JSX (SpikeScreen cliff button pattern). [VERIFIED: SpikeScreen.tsx]

### Pitfall 8: Hot-path React or scheduleOnRN for HUD
**What goes wrong:** Frame hitches; ESLint LC-07 failures.  
**How to avoid:** Lives label via discrete SharedValue mirror + `useAnimatedReaction` → rare `runOnJS`, or event drain ≤1/frame only for life/win/lose transitions — not per physics tick. Prefer React state updated only on phase transitions from a gated reaction.

## Code Examples

### Relative pan + gated tap (composition)

```typescript
// Source: RNGH Race + Pan minDistance [CITED: gesture-handler docs]
import { Gesture } from 'react-native-gesture-handler';

const panActive = useSharedValue(false);

const pan = Gesture.Pan()
  .enabled(gesturesEnabled) // docked | playing only
  .minDistance(6)
  .onStart(() => {
    'worklet';
    panActive.value = true;
  })
  .onUpdate((e) => {
    'worklet';
    // relative target write — see Pattern 1
  })
  .onFinalize(() => {
    'worklet';
    panActive.value = false;
  });

const tap = Gesture.Tap()
  .enabled(serveEnabled) // docked && !paused && !countdown
  .maxDistance(10)
  .onEnd(() => {
    'worklet';
    if (panActive.value) return;
    launchFlag.value = 1;
  });

const playfieldGesture = Gesture.Race(pan, tap);
```

### Freeze loop + AppState

```typescript
// Source: useFrameCallback setActive [CITED: reanimated docs]
// Source: AppState [CITED: reactnative.dev/docs/appstate]
const frame = useFrameCallback((info) => { /* accumulate + step */ }, true);

useEffect(() => {
  const sub = AppState.addEventListener('change', (next) => {
    if (next === 'inactive' || next === 'background') {
      frame.setActive(false);
      // also: setReactPhase('paused'); reset accumulator via shared flag
    }
    // on 'active': do NOT setActive(true) — wait for Resume + countdown
  });
  return () => sub.remove();
}, [frame]);
```

### Dock + serve using paddle english

```typescript
// Source: resolvePaddleEnglish [VERIFIED: src/core/physics/resolve.ts]
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

### Letterbox record (sketch)

```typescript
// Evolve recordFrame — uniform scale + translate [CITED: ARCHITECTURE camera]
const cam = makeCamera(safeW, safeH);
canvas.clear(/* black letterbox already from Fill */);
canvas.save();
canvas.translate(cam.ox, cam.oy);
canvas.scale(cam.scale, cam.scale);
// draw navy field 360×640, bricks, paddle, ball
canvas.restore();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Research roadmap split “render” then “lives/pause” | Project ROADMAP Phase 3 combines both | Roadmap 2026-09-19 | Plan one integration phase |
| Stretch full-bleed spike camera | Uniform letterbox into safe area | Phase 3 | Cross-device feel parity |
| Static Intent hold paddle | Gesture → Intent each substep | Phase 3 | PHYS-01 |
| Free-flying reset ball | Docked serve state | Phase 3 | PHYS-05 |
| No AppState | Auto-pause + countdown | Phase 3 | PLT-01 |
| Skia docs opaque prop ambiguity | `opaque?: boolean` in 2.12.0; spike already uses it | Phase 1 done | No prop-name spike needed [VERIFIED] |

**Deprecated/outdated:**
- Absolute finger-follow paddle (project Out of Scope / FEATURES anti-feature)
- `expo-av` (removed SDK 57) — N/A this phase (no audio)
- Gesture Handler 3.x — ahead of SDK matrix

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Default `PADDLE_GAIN` ~1.15–1.35 and EMA α ~0.35–0.5 match D-05 “snappy” on both platforms | Pattern 1 | Feel retune required on hardware — plan a constants file + manual UAT |
| A2 | Serve speed constant ~`MAX_BALL_SPEED * 0.5` (or similar) feels aimable in first minute | Pattern 3 | Too slow/fast breaks SC-3; expose named constant |
| A3 | `Gesture.Race(pan.minDistance, tap)` is sufficient vs Exclusive for D-11 on both OS | Pattern 2 | If flaky, fall back to panActive gate + Simultaneous with Tap `.requireExternalGestureToFail(pan)` |
| A4 | Colocating overlays in `runtime/overlays/` (not `src/ui/`) is preferred for ESLint | Structure | If planner wants `ui/`, must route composition through `app/` or update boundaries |
| A5 | Discrete life/win/lose React updates via phase transitions (not per-frame drain) suffice for Phase 3 HUD | Pitfall 8 | If event drain needed, batch ≤1 `scheduleOnRN`/frame only on phase edges |

## Open Questions (RESOLVED)

1. **Rename spike symbols now vs evolve in place?** — RESOLVED
   - What we know: CONTEXT leaves to discretion; UI-SPEC names `GameScreen` / `GameCanvas`.
   - Decision (Plans 02/04/05): Rename to `Game*` (`GameScreen`, `GameCanvas`, `useGameLoop`, `GameHost`); keep thin re-exports (`useSpikeLoop` → `useGameLoop`, SpikeScreen → GameScreen) until Plan 05 removes cliff harness.

2. **Brick dirty-layer split vs single Picture?** — RESOLVED
   - What we know: Architecture prefers dirty bricks; Phase 3 grid is small.
   - Decision (Plan 02): Single `recordFrame` / one SkPicture drawing all entities first; defer `bricksDirty` + second Picture unless frame-time overlay shows pressure (out of Phase 3 must-haves).

3. **Where does `uiPhase` live vs `simPhase`?** — RESOLVED
   - Decision (Plans 04/05): `simPhase` lives on World in core (docked/playing/won/lost); `uiPhase` lives in React state in `GameHost` plus a mirrored SharedValue consumed by `useGameLoop` / gestures (playing/paused/countdown) to gate `setActive` and serve/pan. AppState stays out of core — host `onOsPause` only.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Vitest | ✓ | v25.6.0 (engines prefer 24) | Use Node 24 via nvm if CI enforces engines |
| Vitest | Core rules tests | ✓ | 5.0.1 | — |
| RNGH / Reanimated / Skia | Input/render/loop | ✓ | 2.32.0 / 4.5.1 / 2.12.0 | — |
| safe-area-context | Letterbox | ✓ | ~5.7.0 | — |
| Physical devices | Feel UAT / SC | Partial | Phase 1 waiver | Simulator OK for functional SC; no FPS certification this phase |
| Expo AppState module | — | ✗ (N/A) | — | Use RN `AppState` |

**Missing dependencies with no fallback:** None for implementation.

**Missing dependencies with fallback:** Hardware FPS cert deferred (documented debt).

Step 2.6: External tools beyond code — Node/Vitest/native modules above; no DB/Docker required.

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.1 (+ fast-check for existing physics props) |
| Config file | `vitest.config.ts` (`environment: 'node'`, includes `src/core/**/*.test.ts`, `tests/**/*.test.ts`) |
| Quick run command | `npm run test:core` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PHYS-01 | Relative target math: re-press does not snap to finger; clamp to arena | unit | `npx vitest run tests/input.paddle-intent.test.ts` | ❌ Wave 0 |
| PHYS-01 | Mode flags: pan does not set launch | unit | `npx vitest run tests/input.gesture-gates.test.ts` | ❌ Wave 0 |
| PHYS-05 | Dock snaps ball to paddle each step while docked | unit | `npx vitest run tests/rules.serve.test.ts` | ❌ Wave 0 |
| PHYS-05 | Launch uses english clamps (no near-horizontal) | unit | `npx vitest run tests/rules.serve.test.ts` | ❌ Wave 0 |
| PHYS-05 | Pan-while-docked does not launch (gate helper) | unit | `npx vitest run tests/input.gesture-gates.test.ts` | ❌ Wave 0 |
| RUN-02 | BALL_OUT decrements lives; re-dock while lives remain | unit | `npx vitest run tests/rules.lives.test.ts` | ❌ Wave 0 |
| RUN-02 | Lives→0 ⇒ lost | unit | `npx vitest run tests/rules.lives.test.ts` | ❌ Wave 0 |
| RUN-02 | Last breakable break ⇒ won; unbreakable-only remaining still won | unit | `npx vitest run tests/rules.win.test.ts` | ❌ Wave 0 |
| RUN-02 | Hardcoded grid loads multi-HP + ≥1 unbreakable | unit | `npx vitest run tests/levels.phase3-grid.test.ts` | ❌ Wave 0 |
| PLT-01 | Pause freezes stepping (accumulator unchanged / setActive contract via pure freeze helper) | unit | `npx vitest run tests/runtime.freeze.test.ts` | ❌ Wave 0 |
| PLT-01 | After long dt stall, clamp+reset policy leaves no catch-up jump (pure accumulator helper) | unit | `npx vitest run tests/runtime.accumulator-reset.test.ts` | ❌ Wave 0 |
| PLT-01 | AppState background → pause + no auto-resume | manual | Device/sim: background 60s mid-rally | N/A manual |
| PHYS-01/05 | Feel: snappy drag; aim a brick in ≤1 min | manual | Device UAT vs ROADMAP SC-1..3 | N/A manual |
| Existing | Physics CCD / paddle / golden-replay still green | unit | `npm test` | ✅ |

### Sampling Rate

- **Per task commit:** `npm run test:core` (target &lt; 30s)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + manual AppState 60s + gesture invariant checklist before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/rules.serve.test.ts` — PHYS-05 dock/launch
- [ ] `tests/rules.lives.test.ts` — RUN-02 life loss / lose
- [ ] `tests/rules.win.test.ts` — RUN-02 win vs unbreakable
- [ ] `tests/levels.phase3-grid.test.ts` — D-20 grid shape
- [ ] `tests/input.paddle-intent.test.ts` — pure relative-drag helper (extract math from hook for Node)
- [ ] `tests/input.gesture-gates.test.ts` — launch/resume gate predicates
- [ ] `tests/runtime.freeze.test.ts` / `tests/runtime.accumulator-reset.test.ts` — pure freeze helpers (no RN AppState in Vitest)
- [ ] Extract pure helpers (`computeRelativePaddleX`, `shouldAcceptServeTap`, `resetAccumulator`, `countBreakableAlive`) so Node tests do not need RNGH/Skia

**Note:** Do not put Gesture Handler / Skia component tests in Vitest Node environment this phase — keep UI verification manual + gate predicates unit-tested.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Offline single-player; no accounts |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Finite guards on `Intent.paddleX` / `launch` (already in `stepWorld`); clamp paddle; ignore non-finite |
| V6 Cryptography | no | No secrets / scores sync this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed / NaN intent destabilizing sim | Tampering | Existing `Number.isFinite` guards in `stepWorld` |
| Accidental UI actions via gesture spoofing | Elevation (UX) | Mode-gated recognizers; Resume not on playfield |
| Background catch-up destroying run fairness | Tampering / DoS-of-fun | AppState freeze + accumulator reset |
| Future score tampering | Tampering | Out of scope until RUN-04; no persistence this phase |

## Sources

### Primary (HIGH confidence)

- Phase 2 codebase: `src/core/step.ts`, `types.ts`, `resolve.ts`, `reset.ts`, `useSpikeLoop.ts`, `recordSprites.ts`, `SpikeCanvas.tsx` — [VERIFIED]
- `docs/layer-contract.md`, `eslint.config.js` boundaries — [VERIFIED]
- `03-CONTEXT.md`, `03-UI-SPEC.md`, `REQUIREMENTS.md`, `ROADMAP.md` — [CITED]
- [Reanimated useFrameCallback](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback/) — `setActive`, `timeSincePreviousFrame` null on first frame — [CITED]
- [RNGH Pan gesture](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/pan-gesture) — `translationX`, `enabled`, relations — [CITED]
- [RNGH gesture composition Race/Simultaneous](https://github.com/software-mansion/react-native-gesture-handler/blob/main/packages/docs-gesture-handler/docs/legacy-gestures/gesture-composition.md) — [CITED via Context7]
- [React Native AppState](https://reactnative.dev/docs/appstate) — inactive/background/active — [CITED]
- [Skia Pictures / rendering modes](https://shopify.github.io/react-native-skia/docs/shapes/pictures/) — [CITED]
- Skia 2.12.0 `Canvas` `opaque?: boolean` — [VERIFIED: node_modules types]
- Project research: `SUMMARY.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `FEATURES.md`, `STACK.md` — [CITED]

### Secondary (MEDIUM confidence)

- Relative-drag feel guidance — FEATURES + jjunior.net (via research) — numbers need device tune
- Margelo / TextureView guidance — already applied in Phase 1 opaque canvas

### Tertiary (LOW confidence)

- Exact gain/smoothing constants — [ASSUMED] pending hardware feel UAT
- Race vs Exclusive preference on both OS — validate in manual UAT; panActive gate is the hard invariant

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — versions verified installed; no new deps
- Architecture: **HIGH** — maps cleanly onto Phase 1/2 code + locked CONTEXT/UI-SPEC; ESLint overlay placement called out
- Pitfalls: **HIGH** — project PITFALLS + verified code gaps (no dock/lives/AppState yet)

**Research date:** 2026-09-20  
**Valid until:** ~2026-10-20 (stable stack; retune feel constants earlier if devices available)
