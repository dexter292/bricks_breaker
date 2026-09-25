# Phase D1: Juice & Presentation Pass - Research

**Researched:** 2026-09-25  
**Domain:** Cosmetic juice (brick fade/scale, paddle squash) + `expo-haptics` on Expo SDK 57 / existing Phase 7 VFX  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Budget & cert (area 5) — A1 / B3
- **D-01:** **Freeze Mid** as certified: `particleCap` 128, glowScale 1, existing shake caps. No new particles (no confetti), no extra full-screen Skia layers, no heavier glow.
- **D-02:** N-FX-01 already requires Mid respect — freeze is compliance, not a cut.
- **D-03:** Reject raising High-only juice (A3) while R-12 RAM heuristic is open — doubles cert surface; Mid devices include strong chips mis-bucketed.
- **D-04:** Re-open budget increases only after R-10 floor device exists **and** R-12 mitigation chosen.
- **D-05:** One ceiling re-run after C2 / before D1; conditional second run only if D1 violates render-load freeze.

#### Harness / shell / Results (areas 2–3 skipped)
- **D-06:** CERT (`GameHost` init) and SOAK (`setShellPhase` Title↔Playing) drive `shellPhase` directly. Any future transition animation **must no-op** when `CERT_HARNESS || SOAK_HARNESS` (instant swap). Soak must not gain fade delay (100-cycle baseline).
- **D-07:** No delayed Results overlay (Retry instant locked). No confetti. No star reveal animation on Results in D1 (C2 overlay just stabilized). Results copy = Claude’s Discretion only.

#### Haptics (N-FX-03) — C1 / D1 / E1
- **D-08:** **Ship haptics in D1** with a real native module (e.g. `expo-haptics`). Not a no-op ARCH-02-style seam. Does not violate G2.17 (not ads/IAP/analytics). No privacy-manifest data collection types.
- **D-09:** **OS haptics-off is platform-enforced** (iOS has no public API to read System Haptics). App **must not** invent an OS query. Amend N-FX-03 note: *OS-level suppression relied upon; app adds no separate OS query.* Optional **in-app** mute toggle is separate state if product wants it later.
- **D-10:** **Never AND haptics with reduce-motion** (`useVfxIntensity`). Two independent concerns.
- **D-11:** Trigger map **minimal:** break → light; life lost → stronger. No paddle-drag / serve spam.
- **D-12:** **Coalesce like SFX batch** (`expoAudioService` identical-sfx pattern): at most **one** haptic per event-drain; pick **strongest** in batch (`life lost > break`). Explosive 8-brick cascade must not fire 8 native calls in one frame.

#### Break presentation (N-FX-01) — F1 / G1
- **D-13:** Break juice = **scale/fade on existing brick quads** already drawn in `recordSprites` — parameter change only; **zero new particles**.
- **D-14:** Explosive cascade: **every brick in the chain** gets the same short scale/fade (not root-only) — looks intentional; cost is JS/CPU on ≤8 bricks, not fill-rate.
- **D-15:** **Hard rule — juice reads World, never writes it.** Brick fade/scale state lives in `src/vfx/` (alongside particles/trails/shake). **Do not** add `brickFadeT` (or similar) to `World`. **`hashWorld` must not change in D1** — golden-replay green is an acceptance gate.

#### Atmosphere (area 6) — H1 / I1
- **D-16:** **Defer** parallax / scanlines (FC-F02) — third full-screen fill; banned by A1 + R-10.
- **D-17:** **Ship paddle squash** (FC-F04) in D1 — draw-quad scale only. **Never** mutate `world.paddleW` (hashed + collision width). Cosmetic only.

### Claude's Discretion
- Exact scale/fade curves and durations (keep short; ball never occluded)
- Exact haptic styles (Impact Light vs Medium) within E1 map
- Whether optional in-app haptics mute ships in D1 or later
- Results microcopy polish without new chrome motion
- Whether shell transitions are coded as zero-duration helpers now or omitted entirely until a later phase

### Deferred Ideas (OUT OF SCOPE)
- Shell timed transitions (when coded: harness bypass mandatory)
- Win/lose confetti / delayed overlay / Results star animations
- FC-F02 parallax / scanlines
- N-AUD-01 ambient
- FC-F08 combo hit-stop
- Mid budget increases (after R-10 + R-12)
- D2 brand surfaces (needs N-BRAND-01 string)
- In-app haptics mute (optional later)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| N-FX-01 | Break presentation upgrade; Mid budgets; ball readable | Ghost fade/scale SoA in `src/vfx/`; spawn on every `BRICK_BREAK` (incl. cascade); draw in `recordSprites` under ball; Mid freeze — no particle/glow/fill bumps |
| N-FX-03 | Haptics; OS suppression relied upon; no reduce-motion AND; batch coalesce | `expo-haptics@~57.0.3`; JS service + strongest-wins coalesce on existing audio batch hop; never gate on `useVfxIntensity` |
| N-FX-02 | Transitions + win/lose commercial baseline; Retry instant | **Harness-only locks in D1** (D-06/D-07) — no timed shell fades, no delayed Results/confetti; full commercial transitions deferred |

**Acceptance gates (roadmap):** Ball readable; no regression vs A1 Mid freeze; `hashWorld` unchanged; `tests/physics.golden-replay.test.ts` green. [VERIFIED: ROADMAP-NEXT + D1-CONTEXT]
</phase_requirements>

## Summary

D1 is a **zero–/low–fill-rate presentation pass** on top of shipped Phase 7 VFX. Ceiling Cert WC was **re-run PASS** post B+C2 (`docs/ops/CEILING-CERT.md` §5c, 2026-09-25) — B3 gate cleared. Mid budgets stay frozen (`particleCap` 128 / glowScale 1 / existing shake). The only **new native dependency** is `expo-haptics` (~57.0.3, SDK-bundled, not yet in `package.json`). [VERIFIED: CEILING-CERT.md §5c, QUALITY-TIER.md, package.json, npm/`bundledNativeModules.json`]

Architecture is already shaped for this work: event ring → `consumeEventsForVfx` / `appendEventsForAudio` → one `scheduleOnRN`/`playBatch` hop (LC-07) → JS `AudioService`. Brick destroy already spawns sparks + flash; live bricks with `hp <= 0` are **skipped** in `recordSprites`, so scale/fade must be **ghost quads in `VfxState`**, not World fields. Paddle squash is a draw-time scale of the paddle rect triggered by `PADDLE_HIT` (cosmetic only — `paddleW` stays hashed/collision truth). Haptics piggyback the **same** `playBatch` JS callback with strongest-wins coalesce so cascade breaks never issue N native calls. [VERIFIED: recordSprites.ts, consumeEvents.ts, eventBridge.ts, PlayingHost.tsx, hash.ts]

**Primary recommendation:** Add fixed SoA brick-ghost + paddle-squash state under `src/vfx/`; spawn ghosts on every `BRICK_BREAK` (cascade inclusive) and step them in `stepVfx`; draw ghosts + squashed paddle in `recordSprites` under the ball; install `expo-haptics` via `npx expo install` and fire from an injectable `HapticsService` inside the existing `playBatch` wrapper (≤1 hop/frame); leave `hashWorld` / Mid caps / reduce-motion gating untouched; doc Mid freeze + N-FX-03 OS semantics + cert “no second run unless render load changes.”

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Brick ghost fade/scale SoA | Client VFX (`src/vfx/`) | — | Cosmetic; never writes World |
| Spawn ghosts from `BRICK_BREAK` | Client VFX (`consumeEvents`) | Core event ring (read-only) | Same drain as particles/shake |
| Draw ghost quads + paddle squash | Client render (`recordSprites`) | VfxState read-only | LC-03/LC-14; ball last |
| Paddle squash trigger | Client VFX (on `PADDLE_HIT`) | — | Draw-only; no `paddleW` mutate |
| Haptic coalesce + native fire | Client services (`src/services/haptics/`) | App host `playBatch` wrapper | JS thread only; soft-fail |
| Event batch hop | Client runtime (`eventBridge`) | PlayingHost callback | Keep **one** LC-07 `scheduleOnRN` |
| Reduce-motion intensity | Client runtime (`useVfxIntensity`) | VFX spawn/step | Visual only — **never** gate haptics |
| Mid budget freeze / cert docs | Docs (`QUALITY-TIER`, `CEILING-CERT`) | — | No code budget bumps |
| Sim / `hashWorld` | — | — | Must not change in D1 |

## Project Constraints (from .cursor/rules/)

From `.cursor/rules/gsd.md` (PROJECT + STACK excerpts):

- Stack locked: React Native, TypeScript, Expo SDK 57, Skia, custom physics — do not introduce alternate engines.
- Neon effects must never steal ball clarity or frame time; Mid is Cert WC baseline.
- `expo-haptics` is the STACK-blessed haptic path (`~57.0.3`); fire off physics thread via existing `scheduleOnRN` batch.
- Vitest for pure TS; keep services outside `core/`; runtime must not import `services/` (host injects callbacks).
- Hot path: no React state per frame; VFX/render read World, never write.
- GSD workflow: plan/execute via GSD commands; research docs live under post-mvp phases for this milestone.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-haptics` | **~57.0.3** (SDK 57 bundled; npm `57.0.3`) | Impact feedback break / life lost | Official Expo SDK module; STACK already lists it; soft OS suppression on iOS [VERIFIED: bundledNativeModules.json + docs.expo.dev/versions/v57.0.0/sdk/haptics + npm] |
| Existing `src/vfx/*` | repo | Ghost fade, squash timers, event consume | Phase 7 cosmetic SoA pattern [VERIFIED: codebase] |
| Existing `src/services/audio` batch pattern | repo | Template for haptic coalesce + soft native probe | F-34 dedupe in `playBatch` [VERIFIED: expoAudioService.ts] |
| `react-native-worklets` `scheduleOnRN` | 0.10.1 (SDK pin) | One UI→JS hop/frame | LC-07 sole exception in `eventBridge.ts` [VERIFIED: layer-contract.md] |
| Vitest | 5.0.1 | Unit tests for coalesce / ghosts / hash identity | Existing suites [VERIFIED: package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@shopify/react-native-skia` | 2.12.0 (override) | Draw ghost rects / paddle scale | Same `recordFrame` path — no new layers |
| `AccessibilityInfo` via `useVfxIntensity` | RN | Visual intensity only | Do **not** import for haptics |
| Memory / no-op haptics service | in-repo (new) | Vitest + missing native | Mirror `createMemoryAudioService` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-haptics` | Pulsar / custom native | Locked D-08 — Expo module; Pulsar is docs “advanced” escape only [CITED: docs.expo.dev haptics] |
| Second `scheduleOnRN` for haptics | Piggyback `playBatch` | Would violate LC-07 ≤1 hop — **reject** |
| World `brickFadeT` | VFX ghost SoA | Locked D-15 — would change `hashWorld` surface risk — **reject** |
| Extra destroy particles | Scale/fade quads | Locked D-01/D-13 Mid freeze — **reject** |
| Query System Haptics / AND reduce-motion | OS enforcement only | Locked D-09/D-10 — **reject** |

**Installation:**

```bash
npx expo install expo-haptics
# Then rebuild native binary (dev-client / Release) — same as expo-audio add
npx expo run:ios --device
```

**Version verification:** `npm view expo-haptics version` → **57.0.3** (modified 2026-09-23). Expo SDK 57 `bundledNativeModules.json` pins `expo-haptics: ~57.0.3`. Not installed in workspace today (`NOT_INSTALLED`). [VERIFIED: npm registry + bundledNativeModules + local probe]

## Architecture Patterns

### System Architecture Diagram

```
World event ring (read-only for juice)
        │
        ├─ after each stepRun (UI thread) ──────────────────────────┐
        │                                                           │
        ▼                                                           ▼
 consumeEventsForVfx                          appendEventsForAudio
  ├─ BRICK_BREAK → spawnBurst (existing)      (codes Int16Array)
  ├─ BRICK_BREAK → spawnBrickGhost (NEW)              │
  ├─ LIFE_LOST   → punchShake (existing)              │
  └─ PADDLE_HIT  → punchPaddleSquash (NEW)            │
        │                                             │
        ▼                                             ▼
 stepVfx(dt): particles + shake + ghost life + squash decay
        │
        ▼
 recordFrame(world, vfx, …)
  ├─ live bricks (hp>0)
  ├─ ghost quads (scale/alpha)     ← under pickups/paddle/ball
  ├─ particles / flash
  ├─ paddle rect × squash scale    ← never writes paddleW
  └─ ball LAST (readability)
        │
        ▼
 flushAudioBatchOnJS → scheduleOnRN(playBatch)   ← STILL ≤1 hop (LC-07)
        │
        ▼  PlayingHost playBatch wrapper (JS)
        ├─ audio.playBatch(codes, count)          # F-34 dedupe
        └─ haptics.playFromBatch(codes, count)    # strongest-wins ≤1 fire
```

### Recommended Project Structure

```
src/vfx/
├── types.ts              # extend VfxState: ghost SoA + paddleSquashT
├── brickGhosts.ts        # NEW: spawnGhost, stepGhosts (fixed pool)
├── paddleSquash.ts       # NEW: punch/step squash scalar
├── consumeEvents.ts      # spawn ghosts on BRICK_BREAK; squash on PADDLE_HIT
├── stepVfx.ts            # call stepGhosts + stepSquash
├── audioBatch.ts         # unchanged (shared codes feed haptics)
└── index.ts              # export new helpers

src/services/haptics/
├── types.ts              # HapticsService { playFromBatch, release? }
├── mapping.ts            # EventCode → impact rank (numeric literals; no core import)
├── expoHapticsService.ts # impactAsync Soft/Light/Medium; soft native probe
└── index.ts

src/render/recordSprites.ts   # draw ghosts; paddle draw uses squash
src/runtime/eventBridge.ts    # unchanged hop (comment: audio+haptics via host)
app/_components/PlayingHost.tsx  # wrap playBatch → audio + haptics

docs/ops/
├── HAPTICS.md            # NEW: OS semantics, coalesce, Mid note
└── (amend CEILING-CERT / QUALITY-TIER Mid freeze lines if needed)
```

### Pattern 1: Ghost quads (not live hp fade)

**What:** On `BRICK_BREAK`, snapshot `brickX/Y/W/H` + RGB into a fixed VFX ghost slot with `life`/`lifeMax`. Dead bricks stay `hp<=0` and are skipped by the live brick loop — ghosts are drawn separately.

**When to use:** Every break including explosive cascade members (each emits its own `BRICK_BREAK`). [VERIFIED: brickDamage.ts cascade + EXPLOSIVE-BRICKS.md]

**Example:**

```typescript
// Source: pattern mirrors spawnBurst / DestroyFlash in useGameLoop + consumeEvents
// Pseudocode — planner fills exact SoA layout
function spawnBrickGhost(vfx: VfxState, world: World, brickIndex: number, lifeMax: number): void {
  'worklet';
  // read geom even when brickHp[i] === 0 (arrays persist; lattice cleared only)
  const slot = allocGhostSlot(vfx); // fixed pool, FIFO if full
  vfx.ghostX[slot] = world.brickX[brickIndex];
  vfx.ghostY[slot] = world.brickY[brickIndex];
  vfx.ghostW[slot] = world.brickW[brickIndex];
  vfx.ghostH[slot] = world.brickH[brickIndex];
  // rgb from evA hpSnap + flags (same as destroy burst)
  vfx.ghostLife[slot] = lifeMax;
  vfx.ghostLifeMax[slot] = lifeMax;
}
```

**Draw:** Center-scale down + alphaf ramp; draw **after** live bricks, **before** ball. Cap ghost pool ≥ cascade worst case (recommend **16**, Mid-safe; cascade docs imply small neighbor sets). [ASSUMED: 16-slot cap is enough for chained explosives — measure in tests with multi-break fixtures]

### Pattern 2: Haptics piggyback on audio batch (LC-07)

**What:** Do **not** add a second `scheduleOnRN`. Extend PlayingHost’s `playBatch` wrapper to call haptics after audio.

**When to use:** Always for N-FX-03.

**Example:**

```typescript
// Source: app/_components/PlayingHost.tsx playBatchRef pattern + expo docs impactAsync
playBatchRef.current = (codes, count) => {
  audio.playBatch(codes, count);
  haptics.playFromBatch(codes, count); // ≤1 native call; soft-fail
};

// HapticsService.playFromBatch — strongest wins (D-12)
// LIFE_LOST=7 > BRICK_BREAK=4; ignore paddle/chip/etc.
let rank = 0; // 0 none, 1 break→Light, 2 life→Medium (discretion)
for (let i = 0; i < count; i++) {
  const c = codes[i]!;
  if (c === 7) rank = 2;
  else if (c === 4 && rank < 1) rank = 1;
}
if (rank === 1) void Haptics.impactAsync(ImpactFeedbackStyle.Light);
if (rank === 2) void Haptics.impactAsync(ImpactFeedbackStyle.Medium);
```

[CITED: docs.expo.dev/versions/v57.0.0/sdk/haptics — `impactAsync` / `ImpactFeedbackStyle`]

### Pattern 3: Paddle squash draw-only

**What:** On `PADDLE_HIT`, set `vfx.paddleSquashT = T_MAX`. In `recordSprites`, scale draw height down / width up (or slight Y squash) around paddle center using `world.paddleW/H` as **source** dimensions — never assign `world.paddleW`.

**When to use:** Contact juice only (D-11 forbids drag/serve spam). `PADDLE_HIT` is already ≤1 per ball per step (F-12/F-48). [VERIFIED: step.ts]

### Anti-Patterns to Avoid

- **Writing fade into World / hash surface:** Breaks golden-replay and D-15.
- **Spawning more destroy particles for “juice”:** Violates Mid freeze D-01.
- **Per-break `impactAsync` in the consume loop / worklet:** Blocks UI thread + LC-07 / cascade spam.
- **`if (intensity < x) skip haptic`:** Violates D-10.
- **`expo-battery` Low Power Mode check as “haptics enabled” proxy:** Invents an OS query class product forbade (D-09); OS already no-ops Taptic in Low Power Mode. [CITED: Expo haptics docs iOS conditions]
- **Full-screen parallax/scanlines / confetti / delayed Results:** Deferred D-16 / D-07.
- **Mutating `paddleW` for squash:** Collision + `hashWorld` both include `paddleW`. [VERIFIED: hash.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Device vibration / Taptic | Custom native module / Vibration API wrappers | `expo-haptics` | SDK-pinned, iOS/Android/Web, OS suppression built-in |
| Batch hop UI→JS | Second `scheduleOnRN` or per-event hop | Existing `flushAudioBatchOnJS` + host wrapper | LC-07 hard rule |
| Identical-event spam | N haptic calls | Strongest-wins coalesce (mirror F-34 audio) | Cascade 8 breaks / frame |
| Soft-fail missing native | Hard crash / modal | Optional native probe + memory no-op (mirror audio) | Stale binary after `expo install` |
| Privacy for haptics | New privacyManifest data types | Nothing — haptics are not data collection | D-08 / G2.17 |

**Key insight:** The expensive mistakes in this domain are **fill-rate** and **JS↔native spam**, not missing libraries. Reuse Phase 7 seams; only add SoA ghosts + one SDK module.

## Common Pitfalls

### Pitfall 1: Fading live bricks that are already skipped
**What goes wrong:** Code scales `brickHp>0` bricks only — destroy appears to “pop” with no fade because `hp` is already 0 when VFX runs.  
**Why it happens:** `recordSprites` `continue`s on `hp <= 0`. [VERIFIED: recordSprites.ts:295–298]  
**How to avoid:** Ghost SoA snapshot at `BRICK_BREAK` using still-valid geom arrays.  
**Warning signs:** Visual pop with sparks but no scale/fade in cascade.

### Pitfall 2: Cascade fires 8 haptics
**What goes wrong:** Frame hitch / harsh buzz on explosive clears.  
**Why it happens:** One `BRICK_BREAK` per cascade member in the same ring drain. [VERIFIED: EXPLOSIVE-BRICKS.md]  
**How to avoid:** D-12 strongest-wins in `playFromBatch`; unit-test 8× break → 1 call.  
**Warning signs:** Test spy sees `impactAsync` count === break count.

### Pitfall 3: Second scheduleOnRN for haptics
**What goes wrong:** ESLint LC-07 fail or frame budget regression.  
**Why it happens:** Treating haptics as a new bridge instead of host fan-out.  
**How to avoid:** Only `eventBridge.ts` calls `scheduleOnRN`; host wraps audio+haptics.  
**Warning signs:** New `scheduleOnRN` call sites outside eventBridge.

### Pitfall 4: Gating haptics on reduce-motion
**What goes wrong:** Accessibility users lose tactile feedback; violates N-FX-03.  
**Why it happens:** Reusing `vfxIntensity` as a global “effects” mute.  
**How to avoid:** Haptics service never reads intensity SharedValue.  
**Warning signs:** Import of `useVfxIntensity` / `intensityFromReduceMotion` in haptics module.

### Pitfall 5: Accidental hashWorld / golden-replay drift
**What goes wrong:** CI red; trust in determinism broken.  
**Why it happens:** Adding World fields or mutating `paddleW` / brick SoA for cosmetics.  
**How to avoid:** VFX-only state; assert `hashWorld` identity tests still pass unchanged.  
**Warning signs:** Diffs in `src/core/hash.ts` or golden expected hashes.

### Pitfall 6: Paying for a “surely green” second ceiling run
**What goes wrong:** Wasted Instruments time; false signal that D1 changed render load.  
**Why it happens:** Habit after B/C2.  
**How to avoid:** D-05 / CONTEXT §6 — re-run **only** if D1 adds particles, full-screen layers, or heavier glow. Ghost quads + haptics (non-render) should not trigger.  
**Warning signs:** Plan tasks that mandate Cert WC without a render-load delta checklist.

### Pitfall 7: Stale native binary after adding expo-haptics
**What goes wrong:** Runtime soft-falls to no-op; “haptics shipped” but device silent.  
**Why it happens:** Same class as expo-audio missing `ExpoAudio`. [VERIFIED: expoAudioService probe pattern]  
**How to avoid:** Soft-fail + `__DEV__` warn; plan includes rebuild smoke; doc in HAPTICS.md.  
**Warning signs:** Memory service always selected on device.

## Code Examples

### expo-haptics impact (SDK 57)

```typescript
// Source: https://docs.expo.dev/versions/v57.0.0/sdk/haptics/
import * as Haptics from 'expo-haptics';

await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

iOS no-ops when Low Power Mode / user disabled Taptic / Camera / dictation active — app must not query these for D-09 compliance. [CITED: same docs page]

### Audio batch dedupe to mirror (strongest-wins variant)

```typescript
// Source: src/services/audio/expoAudioService.ts playBatch (F-34)
// Audio: tally identical sfx → one play with gain bump
// Haptics: scan ranks → one impact at max rank (life > break)
```

### Ghost draw sketch in recordSprites

```typescript
// Source: extend recordSprites brick loop pattern (flat fill + alphaf)
// After live bricks, before particles:
for (let g = 0; g < vfx.ghostCap; g++) {
  if (vfx.ghostActive[g] === 0) continue;
  const t = vfx.ghostLife[g] / vfx.ghostLifeMax[g]; // 1 → 0
  const scale = 0.85 + 0.15 * t; // discretion: short shrink
  const cx = vfx.ghostX[g] + vfx.ghostW[g] * 0.5;
  const cy = vfx.ghostY[g] + vfx.ghostH[g] * 0.5;
  const dw = vfx.ghostW[g] * scale;
  const dh = vfx.ghostH[g] * scale;
  tools.paint.setAlphaf(t * intensity); // visual dampen OK; not haptic
  tools.entityRect.setXYWH(cx - dw * 0.5, cy - dh * 0.5, dw, dh);
  canvas.drawRect(tools.entityRect, tools.paint);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 7: sparks + flash only on break | D1: + ghost scale/fade quads | D1 2026-09 | Spectacle without particle budget ↑ |
| FX-04 haptics deferred | Ship `expo-haptics` in D1 | Post-MVP D | Native rebuild required |
| Per-event audio risk | Batched dedupe F-34 | Phase 7 | Template for haptic coalesce |
| Pre-B ceiling @ `13018eb` | §5c re-run PASS post B+C2 | 2026-09-25 | D1 execute unblocked |

**Deprecated/outdated:**
- Inventing an in-app “OS haptics enabled?” poll — not available; Expo documents OS-side no-op conditions instead.
- Raising Mid particle caps for juice — blocked until R-10 + R-12 (D-04).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ghost pool cap ~16 is enough for worst explosive chain without visible drop | Pattern 1 | Rarely drop early ghosts on huge chains — raise cap (still not particles) |
| A2 | Discretion: break=`Light`, life=`Medium` is the right Impact pair | Haptics / Discretion | Feel tuning only — swap styles without architecture change |
| A3 | Short ghost life (~80–150ms) won’t occlude ball if drawn under ball | Pitfalls / Discretion | If UAT shows occlusion, shorten life / lower peak alpha |
| A4 | In-app haptics mute deferred (Discretion lean: later) | Discretion | Product may ask for mute in D1 — small additive flag on service |

**If wrong:** None block planning architecture; A1–A3 are executor/UAT knobs.

## Open Questions

1. **In-app haptics mute in D1?**
   - What we know: Discretion; deferred list prefers later.
   - What's unclear: Product desire for Settings chrome this phase.
   - Recommendation: **Omit mute in D1**; service can accept a future `enabled` flag without redesign.

2. **Zero-duration shell transition helpers now?**
   - What we know: D-06 harness law; full timed transitions deferred.
   - Recommendation: **Omit code** until a later phase; document harness no-op requirement in HAPTICS/ops or ROADMAP note only.

3. **Ghost glow blit?**
   - What we know: Live bricks blit glow atlas; ghosts are parameter-only quads (D-13).
   - Recommendation: **Flat fill only** for ghosts — no extra glow blit (fill-rate discipline).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Vitest / npm | ✓ | v25.6.0 | — |
| npm / npx | install scripts | ✓ | 11.8.0 | — |
| `expo-haptics` | N-FX-03 | ✗ not installed | target ~57.0.3 | Memory no-op service until rebuild |
| Expo SDK 57 / prebuild | Native link | ✓ project on 57 | expo ~57.0.24 | — |
| Physical iPhone Taptic | Device feel UAT | ✓ (owner 16 Pro) | — | Soft-fail silent on unsupported |
| Vitest | Unit gates | ✓ | 5.0.1 | — |
| Instruments Cert WC | Second run **if** render load changes | ✓ runbook | — | Skip if Mid freeze held |

**Missing dependencies with no fallback:** None for planning — install+rebuild is Wave 0.

**Missing dependencies with fallback:** Native haptics module until rebuild → memory no-op (must not block play).

Step 2.6: Audited — primary external add is `expo-haptics`.

## Validation Architecture

> `workflow.nyquist_validation` is **true** in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 5.0.1 |
| Config file | project vitest under `tests/` |
| Quick run command | `npx vitest run tests/vfx.brick-ghosts.test.ts tests/haptics.batch-coalesce.test.ts tests/physics.golden-replay.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| N-FX-01 | `BRICK_BREAK` spawns ghost; life decays in `stepVfx` | unit | `npx vitest run tests/vfx.brick-ghosts.test.ts` | ❌ Wave 0 |
| N-FX-01 | Explosive multi-break → one ghost per break event | unit | same | ❌ Wave 0 |
| N-FX-01 | Ghost draw helpers / scale-alpha pure fn (optional) | unit | same | ❌ Wave 0 |
| N-FX-01 | `hashWorld` unchanged after VFX-only juice (no core edits) | unit | `npx vitest run tests/physics.golden-replay.test.ts tests/physics.hash-canonical.test.ts` | ✅ exists |
| N-FX-01 | Mid caps unchanged (`particleCap` 128 etc.) | unit | `npx vitest run tests/runtime.quality-tiers.test.ts` | ✅ exists |
| N-FX-03 | 8× `BRICK_BREAK` → exactly 1 haptic fire (Light) | unit | `npx vitest run tests/haptics.batch-coalesce.test.ts` | ❌ Wave 0 |
| N-FX-03 | Mixed break + life → 1 fire at life strength | unit | same | ❌ Wave 0 |
| N-FX-03 | Paddle/chip-only batch → 0 haptic fires | unit | same | ❌ Wave 0 |
| N-FX-03 | Haptics module does not import intensity / AccessibilityInfo | lint/unit | contract grep or eslint | ❌ Wave 0 |
| FC-F04 | `PADDLE_HIT` punches squash; does not change `paddleW` | unit | `npx vitest run tests/vfx.paddle-squash.test.ts` | ❌ Wave 0 |
| D-15 | No new fields in `hash.ts` / World types for fade | review + golden | `npm test` | ✅ process |
| N-FX-02 harness | CERT/SOAK still Title↔Playing instant (no new delay) | UI / doc | existing GameHost soak docs — no new timed transition code | ✅ harness law |

### Sampling Rate

- **Per task commit:** quick command (ghosts + haptics coalesce + golden-replay)
- **Per wave merge:** `npm test` (+ `assert:privacy-manifest` if app config touched)
- **Phase gate:** Full suite green; device rebuild smoke that haptics fire (manual); ceiling re-run **only if** render-load freeze broken

### Wave 0 Gaps

- [ ] `tests/vfx.brick-ghosts.test.ts` — spawn / step / cascade count
- [ ] `tests/vfx.paddle-squash.test.ts` — punch / decay / paddleW identity
- [ ] `tests/haptics.batch-coalesce.test.ts` — strongest-wins + ignore map
- [ ] `src/services/haptics/*` stubs + memory service
- [ ] `npx expo install expo-haptics` + pin verify
- [ ] Docs stub `docs/ops/HAPTICS.md` (OS note, coalesce, rebuild)
- [ ] Optional: source-contract test that `useVfxIntensity` not imported from haptics

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Offline game |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Event codes clamped in coalesce; ignore unknown codes |
| V6 Cryptography | no | — |

### Known Threat Patterns for haptics + juice

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Native module crash on missing binary | Denial of service | Soft-fail probe + memory no-op (audio precedent) |
| Haptic spam as battery/DoS | Denial of service | ≤1 fire per frame batch; no paddle-drag triggers |
| Invented OS settings scrape | Information disclosure | Do not query System Haptics / battery for gating (D-09) |
| Privacy manifest bloat | Spoofing / compliance noise | No new data-collection types for haptics (D-08) |
| World tampering via juice | Tampering | VFX-only writes; core purity + golden-replay |

## Sources

### Primary (HIGH confidence)

- `.planning/post-mvp/phases/D1-juice-presentation/D1-CONTEXT.md` — locked decisions
- `.planning/post-mvp/REQUIREMENTS-NEXT.md` — N-FX-01…03 (amended OS note)
- `.planning/post-mvp/ROADMAP-NEXT.md` — D1 goal / acceptance / Mid freeze
- `docs/ops/CEILING-CERT.md` §5c — re-run PASS 2026-09-25
- `docs/ops/QUALITY-TIER.md` — Mid budgets; R-12 open
- `docs/ops/EXPLOSIVE-BRICKS.md` — cascade emits many `BRICK_BREAK`
- `docs/layer-contract.md` — LC-07 ≤1 `scheduleOnRN`
- Code: `src/render/recordSprites.ts`, `src/vfx/*`, `src/core/hash.ts`, `src/services/audio/expoAudioService.ts`, `src/runtime/eventBridge.ts`, `src/runtime/useVfxIntensity.ts`, `app/_components/PlayingHost.tsx`
- Expo SDK 57 Haptics: https://docs.expo.dev/versions/v57.0.0/sdk/haptics/
- npm / bundled: `expo-haptics@57.0.3`, pin `~57.0.3`
- `.planning/milestones/v1.0-phases/07-feedback-neon-vfx-audio/07-CONTEXT.md` — ball readability, Mid, reduce-motion (visual)
- C2 research style: `.planning/post-mvp/phases/C2-level-select-stars-replay/C2-RESEARCH.md`

### Secondary (MEDIUM confidence)

- STACK.md / `.cursor/rules/gsd.md` listing `expo-haptics` as blessed — aligned with install plan
- RELEASE-GATES §6 — re-run when physics/VFX/render load changes (interpreted with D1 D-05)

### Tertiary (LOW confidence)

- Exact ghost duration / squash amplitude — Discretion; validate in device UAT
- Whether any exotic explosive chain exceeds 16 concurrent ghosts — A1

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — expo-haptics SDK 57 pin verified; audio/VFX seams in-repo
- Architecture: **HIGH** — ghost-SoA + playBatch piggyback follows existing contracts
- Pitfalls: **HIGH** — cascade haptic spam, hp<=0 skip, LC-07, hashWorld already documented in codebase

**Research date:** 2026-09-25  
**Valid until:** ~2026-10-25 (stable; revisit if Expo bumps haptics API or Mid budgets reopen after R-10/R-12)
