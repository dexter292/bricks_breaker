# Phase 8: Showpiece Level, Performance Certification & Launch Baseline - Research

**Researched:** 2026-09-21
**Domain:** Level authoring (schema v1 JSON) + device quality tiers + real-device 60 FPS certification + mount/unmount soak + store-compliance baseline (Expo SDK 57)
**Confidence:** HIGH (codebase + Expo v57 docs + existing measurement contracts); MEDIUM on exact numeric gfxinfo pass thresholds and Privacy Manifest reason aggregation completeness

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Showpiece level feel (LVL-04)
- **D-01:** Escalation uses **three distinct acts** with **short difficulty plateaus** between acts: Act 1 accessible opening → Act 2 denser multi-HP middle → Act 3 challenging final pocket shaped by **unbreakable** bricks that rewards skillful paddle control (not luck).
- **D-02:** Target **~2–3 minute successful run** through layout density and playtesting only — no new mechanics.
- **D-03:** Keep Phase 5 **~20% power-up drop rate** and existing **multi-ball / paddle-expand** only. **No level-specific drop rules** in Phase 8.
- **D-04:** Preserve **deterministic physics**; Act 3 must not depend on lucky power-up RNG for fair clears.

#### Level identity & boot path
- **D-05:** Create **`assets/levels/level-03.json`** as the MVP showpiece. Leave **`level-01` / `level-02` unchanged** as regression fixtures.
- **D-06:** Title → Play loads **`level-03` by default**. No production level-selection UI.
- **D-07:** Provide a **development-only** level switch for `level-01` / `level-02` (and showpiece). Must be **unavailable in production** builds.
- **D-08:** All three levels share the **same validate → compile → gameplay pipeline** — no level-specific physics or rendering branches.

#### Device quality tiers
- **D-09:** Three tiers: **Low / Mid / High**. **Mid** is the Pixel 6a certification baseline. Low reduces particle count, trail length, and glow intensity. High enables maximum visual quality within a bounded budget.
- **D-10:** **Automatic** initial tier from device capabilities; **default conservatively** when hardware info is insufficient.
- **D-11:** **`__DEV__`-only** force override for Low/Mid/High. Production uses auto selection only — **no settings UI**.
- **D-12:** Quality-tier logic lives entirely in **render/VFX** (and related RN/runtime wiring). **`core/` must not read** device capabilities or tier.
- **D-13:** If Mid fails the 60 FPS gate on Pixel 6a: **optimize rendering or retune tier budgets and re-certify**. Do **not** silently map the reference device to Low and claim Mid certification.

#### 60 FPS certification protocol (PLT-03)
- **D-14:** Gate scene = **scripted, reproducible worst-case on `level-03`**: maximum active balls, peak particle bursts, overlapping camera shake; **fixed measurement window**; document exact conditions (extends Phase 7 VFX worst-case definition).
- **D-15:** **Pixel 6a + Mid tier + profiling build** is the **mandatory** Android 60 FPS gate. ≥2 runs of ≥30 s; evaluate the **worse** result against existing p95 / frame-time / jank thresholds in `docs/measurement-methodology.md`. Close Phase 7 Pixel gfxinfo Results debt here.
- **D-16:** **Physical iPhone required**: Instruments performance report plus render / touch / stability verification. Installation alone is **not** iOS performance evidence.
- **D-17:** Substitute Android (D-04) allowed for **preliminary** measurements only; **Pixel 6a re-certification remains mandatory** before declaring MVP complete.
- **D-18:** On gate failure: optimize and **rerun the same certification scenario**. Do **not** lower Mid targets or disable required effects solely to obtain a pass. RN perf monitor alone remains invalid.

#### Soak / leak test
- **D-19:** Automate **100 Title ↔ Playing** mount/unmount cycles, then a **15-minute** continuous gameplay session on a **physical device** with a **profiling** build.
- **D-20:** Automated checks must verify release of game loops, worklets, listeners, timers, and audio after unmount — **no duplicate simulation ticks or event subscriptions**.
- **D-21:** Record **memory** and **frame-time** at start and end of the soak session. Fail on sustained memory growth, progressive frame-time degradation, crashes, or unresponsive controls.
- **D-22:** Add automated lifecycle / pool-reset assertions where feasible; **final device soak + performance review remain mandatory manual acceptance gates**.
- **D-23:** Soak harness is **development-only** — must not affect production gameplay or add work to the per-frame hot path.

#### Store compliance baseline (PLT-04)
- **D-24:** Publish a **short, accurate** privacy policy at a **public HTTPS URL** (simple static hosting). Document MVP reality: offline gameplay, local high-score storage, **no ads / IAP / user accounts**. Verify Expo, dependency, and platform data practices before finalizing.
- **D-25:** Prepare **in-repo** artifacts: iOS privacy manifest, Google Play Data Safety + age-rating documentation, app name clearance notes, asset originality attestation — reflecting the **actual production build**.
- **D-26:** Phase 8 does **not** create store listings or submit to TestFlight / Play testing tracks.
- **D-27:** Do not mark PLT-04 complete while any required artifact or live-URL verification remains outstanding.

### Claude's Discretion
- Exact brick layouts / row counts / unbreakable pocket geometry within the three-act + plateau feel
- Exact Low/Mid/High numeric budgets (particle/trail/glow) as long as Mid certifies on Pixel 6a and High stays bounded
- Device-capability heuristic details (which signals, thresholds) as long as D-10/D-13 hold
- Exact scripted worst-case trigger implementation (dev command vs in-level fixture) as long as D-14 is reproducible and documented
- Privacy policy hosting provider and markdown/HTML packaging within D-24
- Exact filenames/layout under `docs/` for store paperwork as long as D-25/D-27 are satisfiable

### Deferred Ideas (OUT OF SCOPE)
- Production level-select UI / campaign progression beyond single showpiece
- Real ad / IAP SDK integration and store submit (TestFlight / Play tracks)
- Music, haptics, combo-tier escalating juice (v2 FX items)
- User-facing quality settings UI (production)

None of the above belong in Phase 8.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LVL-04 | One hand-crafted ~2–3 minute arcade challenge level with progressive difficulty, authored after core feel is validated | Author `level-03.json` under schema v1 via existing `validateLevel` → `compileLevel` → `loadAndCompile` / `loadLevelById`; three-act layout with `X` unbreakables; default boot = level-03; leave 01/02 fixtures |
| PLT-03 | Stable 60 FPS measured on named mid-range real device (worst-case multi-ball + particle burst); RN perf monitor alone is not acceptance | Extend Phase 7 measurement doc; Pixel 6a + Mid + profiling + gfxinfo mandatory; Instruments on physical iPhone; quality tiers cap VFX outside `core/` |
| PLT-04 | Store compliance baseline: public HTTPS privacy policy URL, Play Data Safety form, honest age rating, iOS privacy manifest as required | Static HTTPS policy; `ios.privacyManifests` in app.json; in-repo Data Safety / age / name / originality docs; no store submit |
</phase_requirements>

## Summary

Phase 8 is a **content + certification + paperwork** phase on top of a finished gameplay/VFX stack. The showpiece is a new `assets/levels/level-03.json` authored in the **existing schema v1** (row-strings + brickTypes), loaded through the **unchanged** JS cold path `loadLevelById` → `loadAndCompile` → SharedValue → `applyCompiledLevel`. No physics, drop-rate, or render forks per level. Quality tiers are a **new RN/runtime resolver** (`expo-device`) that feeds **numeric VFX/render caps** into `allocateVfx` / trail / glow paths — never into `core/`. 60 FPS acceptance reuses Phase 1/7 methodology (profiling build, gfxinfo / Instruments, ≥2×≥30s, worse run wins) with a **scripted worst-case on level-03 at Mid**, closing open Pixel Results debt. Soak uses the existing Title↔Playing **unmount** shell (`GameHost`) behind a DEV harness. Store baseline is documentation + live HTTPS policy + `privacyManifests` config — **not** EAS submit.

**Primary recommendation:** Author level-03 within `MAX_BRICKS` (256) using existing `1|2|3|X` types; install SDK-pinned `expo-device`; resolve Low/Mid/High from `Device.totalMemory` with Mid ≈ 6 GB (Pixel 6a); wire caps only through VFX/render; extend measurement docs with a reproducible DEV worst-case + operational gfxinfo pass numbers; ship DEV soak driver on `GameHost`; publish a short static privacy page and fill in-repo Play/iOS paperwork.

## Project Constraints (from .cursor/rules/)

Actionable directives from `.cursor/rules/gsd.md` (synced from PROJECT / STACK / GSD workflow):

- **Stack lock:** React Native + TypeScript + Expo SDK 57 + EAS + Skia + custom fixed-timestep physics — do not introduce alternate engines for this phase. [VERIFIED: .cursor/rules/gsd.md]
- **Performance:** Stable 60 FPS on mid-range devices; measure on hardware — do not assume. [VERIFIED: .cursor/rules/gsd.md]
- **Offline MVP:** Fully playable without network; no ads/IAP/accounts in early phases (seams only). [VERIFIED: .cursor/rules/gsd.md]
- **Originality:** No copyrighted third-party game assets, branding, music, or level layouts. [VERIFIED: .cursor/rules/gsd.md]
- **Expo docs mandate:** Read versioned SDK 57 docs at https://docs.expo.dev/versions/v57.0.0/ before writing code. [VERIFIED: AGENTS.md / workspace rule]
- **Layering:** Simulation in `core/` stays pure (no React/RN/Skia/Expo); React state must not update every physics frame. [VERIFIED: docs/layer-contract.md]
- **GSD workflow:** Prefer GSD commands for file-changing work; `/gsd-execute-phase` for planned phase work. [VERIFIED: .cursor/rules/gsd.md]
- **Vitest for core:** Unit tests for physics/levels in Node under Vitest — keep purity tests green. [VERIFIED: package.json scripts]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Showpiece level JSON authoring | CDN / Static (`assets/levels`) | — | Data file only; validated/compiled on cold path |
| validate → compile → apply | API / Backend analogue (`core/levels`) | Client (`runtime/loadLevel`) | Pure Node-testable pipeline; Metro require in runtime |
| Default boot to level-03 + DEV switch | Browser / Client (`app/_components`) | — | Shell UI; `__DEV__` gating |
| Quality tier resolution | Browser / Client (`runtime` + `expo-device`) | — | Device APIs are RN-only; never `core/` |
| VFX particle/trail/glow caps | Browser / Client (`vfx` + `render`) | — | Cosmetic SoA + Skia draw; `core/` blind (D-12) |
| Scripted worst-case cert scene | Browser / Client (DEV harness) | Docs | Reproducible measurement; not production gameplay |
| gfxinfo / Instruments evidence | External / Device tooling | Docs | Human gate; docs record Results |
| Title↔Playing soak cycles | Browser / Client (`GameHost`) | — | Mount/unmount already tears down PlayingHost |
| Lifecycle unit asserts (audio release, pool reset) | Test / Node (Vitest) | Client services | Pure/service tests where feasible |
| Privacy policy HTTPS | CDN / Static hosting | Docs | Public URL; not in app binary |
| iOS PrivacyInfo + Play paperwork | Build config (`app.json`) + Docs | — | Expo `privacyManifests` + in-repo forms |

## Standard Stack

### Core (already in project — do not replace)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | `~57.0.24` | SDK, prebuild, config plugins | Project pin [VERIFIED: package.json] |
| `react-native` | `0.86.3` | Runtime | SDK 57 pin [VERIFIED: package.json] |
| `@shopify/react-native-skia` | `2.12.0` | Gameplay + glow/trail/particle draw | Deliberate override [VERIFIED: package.json] |
| `react-native-reanimated` | `4.5.1` | `useFrameCallback` + SharedValues | SDK pin [VERIFIED: package.json] |
| `vitest` | `5.0.1` | Unit tests for levels/VFX/services | Existing suite [VERIFIED: package.json] |
| `@react-native-async-storage/async-storage` | `2.2.0` | Local personal best (privacy-relevant) | Already shipping [VERIFIED: package.json] |

### Supporting (add for Phase 8)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-device` | `~57.0.2` | `totalMemory`, `modelName`, `isDevice`, year class | Quality-tier auto resolution (D-09…D-11) [VERIFIED: npm registry + expo bundledNativeModules] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-device` | `react-native-device-info` | Extra native module outside SDK matrix; avoid for MVP |
| `Device.totalMemory` heuristic | GPU renderer string / hardcoded model allowlists | Fragile across OEMs; memory is stable and maps Mid≈Pixel 6a 6 GB |
| Hosted privacy CMS | Static HTML on GitHub Pages / Cloudflare Pages / Netlify | Overkill; D-24 asks simple static HTTPS |

**Installation:**

```bash
npx expo install expo-device
```

**Version verification:** `expo-device@57.0.2` is current SDK 57 pin (`bundledNativeModules.json` → `~57.0.2`; npm `latest` for the 57 line is `57.0.2`, modified 2026-09-11). [VERIFIED: npm registry / expo bundledNativeModules]

## Architecture Patterns

### System Architecture Diagram

```text
[TitleScreen Play]
        │
        ▼
[GameHost shellPhase=playing] ──mount──► [PlayingHost]
        │                                      │
        │                         ┌────────────┼────────────────┐
        │                         ▼            ▼                ▼
        │                 [resolveQualityTier]  [loadLevelById]  [useVfxIntensity]
        │                   (expo-device)       level-03 default   (reduce-motion)
        │                         │            │                │
        │                         ▼            ▼                ▼
        │                 [VfxBudget caps]  [loadAndCompile]  intensity SV
        │                         │         validate→migrate→compile
        │                         ▼            │
        │                 [allocateVfx(caps)]  ▼
        │                 [glow bake skip/α] [compiled SharedValue]
        │                         │            │
        │                         └────► [useGameLoop / worklets]
        │                                      │
        │                         ┌────────────┼────────────┐
        │                         ▼            ▼            ▼
        │                      [core stepRun] [vfx step]  [recordFrame]
        │                         │            │            │
        │                         └────────────┴────────────┘
        │                                      │
[Menu] ◄── unmount PlayingHost (audio.release, frameCallback off)
        │
        ▼
[TitleScreen]  ← soak cycles Title↔Playing here (DEV only)

CERT path (DEV + profiling): force Mid → trigger worst-case fixture →
  adb dumpsys gfxinfo / Instruments → docs Results rows
```

### Recommended Project Structure

```
assets/levels/
  level-01.json          # unchanged regression fixture
  level-02.json          # unchanged regression fixture
  level-03.json          # NEW showpiece (D-05)

src/runtime/
  loadLevel.ts           # extend LevelId + Metro require + default level-03
  resolveQualityTier.ts  # NEW: Device → Low|Mid|High + budgets (not core/)
  useVfxIntensity.ts     # keep; tiers are hard caps, intensity dampens within

src/vfx/
  types.ts               # extend VfxCaps (particleCap, trailMax, glowScale)
  intensity.ts           # trailLength already clamps; apply trailMax from caps

app/_components/
  GameHost.tsx           # DEV soak driver hook (optional)
  PlayingHost.tsx        # default level-03; DEV level + tier overrides

docs/
  phase8-certification.md        # NEW: worst-case script + Results (extends phase7)
  store/
    privacy-policy.md            # source of hosted policy
    play-data-safety.md          # Play Console answers
    age-rating.md
    name-clearance.md
    originality-attestation.md
  measurement-methodology.md     # unchanged contract; cite from phase8 doc

# Hosted (outside or via Pages from docs/store/privacy-policy.html):
# https://…/privacy — live HTTPS URL recorded in docs
```

### Pattern 1: Shared level pipeline (no forks)

**What:** Metro static `require` → `loadAndCompile` (`validateLevel` → `migrateLevel` → `compileLevel`) → SharedValue → `applyCompiledLevel` on UI thread.

**When to use:** All three levels (D-08).

**Example:**

```typescript
// Source: src/runtime/loadLevel.ts + src/core/levels/load.ts [VERIFIED: codebase]
export type LevelId = 'level-01' | 'level-02' | 'level-03';

const LEVEL_MODULES: Record<LevelId, unknown> = {
  'level-01': require('../../assets/levels/level-01.json'),
  'level-02': require('../../assets/levels/level-02.json'),
  'level-03': require('../../assets/levels/level-03.json'), // Metro needs literal path
};

export function loadLevelById(id: LevelId = 'level-03'): LoadLevelResult {
  return loadAndCompile(LEVEL_MODULES[id]);
}
```

### Pattern 2: Quality tier → VFX caps (core-blind)

**What:** Resolve tier once on JS cold path; pass **numbers** into `allocateVfx` / render; never import `expo-device` from `core/`.

**When to use:** PlayingHost mount / game-loop init (before `setActive(true)`).

**Example:**

```typescript
// Source pattern: src/vfx/types.ts allocateVfx + Expo Device API
// [CITED: docs.expo.dev/versions/v57.0.0/sdk/device/]
import * as Device from 'expo-device';

export type QualityTier = 'low' | 'mid' | 'high';

export type VfxBudget = {
  particleCap: number;
  trailMax: number;   // clamp trailLength result; never < 2 (FX-01)
  glowScale: number;  // 0 = skip blit / null atlas; 1 = current bake
};

/** Recommended Mid≈Pixel 6a (6 GB RAM). Conservative default → low. */
export function resolveQualityTier(override?: QualityTier | null): {
  tier: QualityTier;
  budget: VfxBudget;
} {
  const tier =
    override ??
    tierFromMemory(Device.totalMemory) ??
    'low'; // D-10 insufficient info → conservative
  return { tier, budget: BUDGETS[tier] };
}
```

### Pattern 3: DEV-only controls that cannot leak to production

**What:** Gate level switch, tier force, worst-case trigger, and soak driver with `typeof __DEV__ !== 'undefined' && __DEV__` (same pattern as current level toggle in `PlayingHost`).

**When to use:** Any Phase 8 harness UI or auto-cycle.

**Anti-pattern:** Gating only with `EXPO_PUBLIC_*` env that might be set on production, or shipping soak into the frame callback.

### Anti-Patterns to Avoid

- **Silent Mid→Low on Pixel 6a:** Violates D-13; treat Mid fail as optimize/retune + re-cert.
- **`core/` reading Device / tier:** Violates D-12 / LC-01; purity tests must keep failing illegal imports.
- **Dynamic `require(path)` for levels:** Metro cannot resolve; keep literal requires (existing pattern).
- **RN Perf Monitor as gate:** Explicitly invalid (measurement-methodology + phase7 doc).
- **Per-frame soak / cert logic:** Violates D-23; harness must be cold-path / discrete timers only.
- **New gameplay or drop rules in level JSON:** Schema has no drop fields; keep `DROP_CHANCE = 0.2` in core (D-03).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Device capability sniffing | Custom JNI / model CSV | `expo-device` (`totalMemory`, `modelName`, `isDevice`) | SDK-supported, version-pinned [CITED: Expo Device v57] |
| Level schema / validation | Zod or new parser | Existing `validateLevel` / `compileLevel` / `loadAndCompile` | Already fail-closed, tested, worklet-safe compile output [VERIFIED: codebase] |
| Particle pooling | New particle engine | `allocateVfx` + `spawnBurst` / `stepParticles` | Caps + oldest eviction already exist [VERIFIED: src/vfx] |
| Audio lifecycle | Ad-hoc player map | `AudioService.release()` on PlayingHost unmount | Soft-fail + pool clear already implemented [VERIFIED: services/audio] |
| FPS measurement protocol | Custom FPS library | `docs/measurement-methodology.md` + gfxinfo / Instruments | Project gate contract [VERIFIED: docs] |
| iOS PrivacyInfo file by hand in CNG | Checked-in duplicate `ios/PrivacyInfo.xcprivacy` | `expo.ios.privacyManifests` in app.json | Prebuild generates file; duplicates cause "Multiple commands produce" [CITED: docs.expo.dev/guides/apple-privacy] |
| Privacy policy CMS | Custom backend | Static HTTPS host (Pages / Cloudflare / Netlify) | Offline game; short accurate page (D-24) |

**Key insight:** Almost everything Phase 8 needs already exists as seams — the work is **authoring**, **wiring caps**, **measurement evidence**, and **compliance artifacts**, not new systems.

## Common Pitfalls

### Pitfall 1: Thermal throttling mid-cert
**What goes wrong:** First 30s pass, second run fails after heat soak.
**Why it happens:** Pixel 6a sustained GPU load; measurement hygiene notes thermal drift.
**How to avoid:** Cool device between runs; note thermal/charging in Results; keep worse of ≥2 runs (methodology).
**Warning signs:** Overlay/gfxinfo p95 climbs after ~60–90s play.

### Pitfall 2: Metro require for level-03 forgotten / dynamic path
**What goes wrong:** Runtime crash or empty module; level never loads.
**Why it happens:** Metro bundler requires static literal `require` paths.
**How to avoid:** Add literal `'level-03': require('…/level-03.json')` in `LEVEL_MODULES`; add Vitest compile fingerprint test.
**Warning signs:** Redbox on Play; `loadLevelById` returns validation issues for undefined raw.

### Pitfall 3: Production DEV toggle / soak / tier override leaks
**What goes wrong:** Players see level switch or force-Low; soak burns battery; false Mid cert.
**Why it happens:** Gating on wrong flag (`EXPO_PUBLIC_PERF_OVERLAY` style) or dead-code elimination miss.
**How to avoid:** Strict `__DEV__` for UI overrides; never put soak in production profile env; assert production build lacks override UI (mirror overlay production check pattern in device-gate-results).
**Warning signs:** Toggle visible in profiling/production APK visual QA.

### Pitfall 4: Extending VfxCaps incompletely
**What goes wrong:** particleCap changes but trails/glow stay Max — Low tier doesn't help FPS.
**Why it happens:** Today only `particleCap` / `maxBalls` exist on `VfxCaps`; trail uses global `TRAIL_MAX` + intensity; glow is full atlas blit × intensity.
**How to avoid:** Extend budgets to **particleCap + trailMax + glowScale**; wire trail clamp in `pushTrail`/`trailLength` call sites and glow skip/α in `recordSprites` / bake path.
**Warning signs:** Low tier still draws 5 ghosts + full halo.

### Pitfall 5: Reallocating VFX every frame or after tier change mid-hot-path
**What goes wrong:** GC hitch; pool resize thrash.
**Why it happens:** Tier override during play without teardown.
**How to avoid:** Resolve tier once per PlayingHost mount; DEV override remounts session (retry/unmount) rather than mutating typed arrays mid-frame.
**Warning signs:** Frame spikes when tapping tier UI.

### Pitfall 6: level-03 exceeds `MAX_BRICKS` (256)
**What goes wrong:** Validation reject; LevelErrorOverlay; cannot play showpiece.
**Why it happens:** Long three-act layouts with dense grids (`cols*rows` and non-empty count both capped).
**How to avoid:** Design within cap (e.g. 10×18=180, or 8×20=160); use `.` empties and `X` structure; Vitest assert `loadAndCompile(level-03).ok`.
**Warning signs:** `cols*rows exceeds MAX_BRICKS` in issues.

### Pitfall 7: Act 3 unfairness via drop RNG
**What goes wrong:** Clear depends on multi-ball luck — violates D-04.
**Why it happens:** Dense HP + unbreakable pocket without skillful angles.
**How to avoid:** Pocket geometry solvable with paddle english alone; playtest clears without catching power-ups; do not add level-specific drop rates.
**Warning signs:** Testers only clear after multi-ball.

### Pitfall 8: Claiming PLT-03 from substitute Android or simulator
**What goes wrong:** False MVP complete.
**Why it happens:** Phase 1/7 waiver culture.
**How to avoid:** D-15/D-17 — substitute = preliminary only; Pixel 6a Mid mandatory; simulator never counts.
**Warning signs:** Results table lacks Pixel 6a profiling gfxinfo row.

### Pitfall 9: Incomplete Privacy Manifest aggregation
**What goes wrong:** App Store email / rejection for missing required-reason APIs.
**Why it happens:** Apple may not parse all CocoaPods dependency manifests; AsyncStorage / RN already declare FileTimestamp + UserDefaults.
**How to avoid:** Copy reasons from dependency `PrivacyInfo.xcprivacy` into `app.json` `ios.privacyManifests`; set `NSPrivacyTracking: false`; empty collected types for offline MVP.
**Warning signs:** Missing `C617.1` / `CA92.1` after scanning `node_modules/**/PrivacyInfo.xcprivacy`.

## Code Examples

### Level schema + unbreakable Act 3 pocket (authoring)

```json
{
  "schemaVersion": 1,
  "id": "level-03",
  "name": "Neon Gauntlet",
  "grid": {
    "cols": 9,
    "rows": 14,
    "originX": 8,
    "originY": 48,
    "brickW": 36,
    "brickH": 16,
    "gapX": 3,
    "gapY": 3
  },
  "brickTypes": {
    "1": { "hp": 1 },
    "2": { "hp": 2 },
    "3": { "hp": 3 },
    "X": { "hp": 99, "unbreakable": true }
  },
  "cells": [
    "......... ",
    "111.1.111",
    "....X...."
  ]
}
```

Notes: empty cell is `.` (never silently trim); `X` → `BrickFlags.UNBREAKABLE`; win ignores unbreakables. [VERIFIED: schema.ts / validate.ts / Phase 4 CONTEXT]

Validate/compile APIs (planner tasks must use these, not ad-hoc parse):

| API | Module | Role |
|-----|--------|------|
| `validateLevel(raw)` | `src/core/levels/validate.ts` | Fail-closed issues |
| `migrateLevel(level)` | `src/core/levels/migrations` | Identity at schemaVersion 1 |
| `compileLevel(level)` | `src/core/levels/compile.ts` | SoA `CompiledLevel` |
| `loadAndCompile(raw)` | `src/core/levels/load.ts` | validate → migrate → compile |
| `loadLevelById(id)` | `src/runtime/loadLevel.ts` | Metro require + loadAndCompile |
| `applyCompiledLevel(world, compiled)` | `src/core` | Fill World bricks |

Hard constraint: `cols * rows ≤ MAX_BRICKS` (256) and non-empty brick count ≤ 256. [VERIFIED: src/core/constants.ts + validate.ts]

### Recommended tier budgets (discretion — tune if Mid fails)

| Tier | `particleCap` | `trailMax` | `glowScale` | Intent |
|------|---------------|------------|-------------|--------|
| Low | 48 | 2 | 0.0 (skip atlas blit) | Rescue weak devices |
| Mid | 128 (`PARTICLE_POOL_DEFAULT`) | 5 (`TRAIL_MAX`) | 1.0 | **Pixel 6a cert baseline** |
| High | 192 (`PARTICLE_POOL_HARD_MAX`) | 5 | 1.0 | Bounded max; no unbounded bloom |

`trailMax` must never go below 2 (FX-01 / `trailLength`). [VERIFIED: src/vfx/intensity.ts]

### Memory heuristic (Mid ≈ Pixel 6a)

Pixel 6a ships **6 GB LPDDR5 RAM**. [CITED: Google Pixel help / GSMArena]

```typescript
// Recommended: GiB thresholds; null → Low (D-10)
const GB = 1024 ** 3;
function tierFromMemory(totalMemory: number | null): QualityTier | null {
  if (totalMemory == null || !Number.isFinite(totalMemory) || totalMemory <= 0) {
    return null; // caller defaults to 'low'
  }
  if (totalMemory < 4 * GB) return 'low';
  if (totalMemory < 8 * GB) return 'mid'; // includes ~6 GB Pixel 6a
  return 'high';
}
```

Optional secondary signal (discretion): if `Device.modelName` matches `/Pixel 6a/i`, force **mid** so D-13 cannot be violated by a mis-read memory value — still never map Pixel 6a → low automatically.

### Wire caps into existing VFX (no core changes)

```typescript
// Today [VERIFIED: useGameLoop.ts]:
vfx = allocateVfx({ maxBalls: w.maxBalls });

// Phase 8:
vfx = allocateVfx({
  maxBalls: w.maxBalls,
  particleCap: budget.particleCap,
  // extend VfxCaps + trail/glow readers for trailMax / glowScale
});
```

Intensity (`useVfxIntensity`) remains a **dampener within** caps (CONTEXT): tier sets hard ceilings; reduce-motion scales sparks/trail/shake inside them.

### Certification protocol (extends Phase 7)

Authoritative base: `docs/measurement-methodology.md` + `docs/phase7-vfx-measurement.md`. [VERIFIED: docs]

| Step | Action |
|------|--------|
| 1 | Build **profiling** profile (`eas.json` already sets `EXPO_PUBLIC_PERF_OVERLAY=1`) |
| 2 | Install on **Pixel 6a**; force **Mid** via DEV override (prove auto also selects Mid) |
| 3 | Load **level-03**; trigger **scripted worst-case** (DEV): ≥3 balls, particles near Mid cap, shake decaying, glow atlas visible |
| 4 | `adb shell dumpsys gfxinfo com.dexter292.bricksbreaker reset` |
| 5 | Play **≥30 s** fixed window after ~2 s warmup |
| 6 | `adb shell dumpsys gfxinfo com.dexter292.bricksbreaker framestats` |
| 7 | Repeat ≥2; keep **worse** run |
| 8 | Physical iPhone: Instruments Core Animation / Game; render+touch+stability notes (D-16) |
| 9 | Fill Results table in new `docs/phase8-certification.md` (and close Phase 7 OPEN row) |

**Package id:** `com.dexter292.bricksbreaker` [VERIFIED: app.json / phase7 doc]

**Pass/fail thresholds today:** Docs state qualitative **stable ~60 FPS / ~16.7 ms** and overlay metrics (p95/p99, frames > 16.7) but **do not define numeric gfxinfo jank % cutoffs**. [VERIFIED: measurement-methodology.md — no numeric fail line]

**Recommended operational lock for Phase 8 docs (planner should write into phase8-certification.md):**

| Metric | Pass (recommended) | Confidence |
|--------|--------------------|------------|
| Session length | ≥30 s after 2 s warmup; ≥2 runs | HIGH (existing) |
| Primary | 50th percentile frame time ≤ 16.7 ms | MEDIUM (aligns to 60 Hz panel) |
| Stability | 95th percentile ≤ 20 ms **or** missed-vsync / janky frame share ≤ 5% from gfxinfo | LOW–MEDIUM — **lock in phase doc**; not previously numeric |
| Hard fail | Crash, unresponsive touch, progressive degradation across soak | HIGH (D-21) |

Do **not** pass on overlay alone or RN Perf Monitor.

### Soak harness design

Existing shell already unmounts `PlayingHost` on Menu → Title (`GameHost`), which runs `audio.release()` and tears down frame callbacks. [VERIFIED: GameHost.tsx / PlayingHost cleanup]

**DEV harness (discretion):**

1. `__DEV__` + e.g. `EXPO_PUBLIC_SOAK=1` **or** hidden multi-tap on Title — prefer env for CI-less device runs.
2. Auto: `playing` → wait N ms → `title` → wait → repeat **100** times (discrete `setTimeout` / `InteractionManager`, **not** frame callback).
3. Then enter Playing for **15 minutes** continuous; record memory (Android `dumpsys meminfo` / Xcode gauges) + frame-time start/end.
4. Assert no crash; fail on sustained RSS growth / rising p95.

**Unit-testable (automated Wave 0 / tasks):**

| Assert | How |
|--------|-----|
| `AudioService.release` clears pools / idempotent | Extend `tests/audio.*` with memory service or mocked players |
| `allocateVfx` particleCount / shake reset on new allocate | Existing vfx tests pattern |
| `resetAudioBatch` / event drain no double-subscribe | `tests/runtime.event-drain.test.ts` patterns |
| `core/` still cannot import `expo-device` | `tests/core.purity.test.ts` |
| level-03 validates/compiles; fingerprint ≠ 01/02 | Extend `tests/levels.compile.test.ts` |

**Not unit-testable (manual gate):** 100 real mount cycles, 15 min play, worklet leak absence, gfxinfo — D-22.

### Privacy / store baseline

**Privacy policy (D-24):** Short static page stating: offline play; local high score via AsyncStorage on-device; no ads/IAP/accounts/analytics SDKs; no personal data collected or transmitted by the MVP app. Host on GitHub Pages / Cloudflare Pages / Netlify (HTTPS). Record live URL in `docs/store/`.

**iOS Privacy Manifest (D-25):** Configure in app.json:

```json
"ios": {
  "privacyManifests": {
    "NSPrivacyTracking": false,
    "NSPrivacyTrackingDomains": [],
    "NSPrivacyCollectedDataTypes": [],
    "NSPrivacyAccessedAPITypes": [
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
        "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
      },
      {
        "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp",
        "NSPrivacyAccessedAPITypeReasons": ["C617.1"]
      }
    ]
  }
}
```

Reasons observed in current deps: AsyncStorage FileTimestamp `C617.1`; expo-constants / RN UserDefaults `CA92.1`. [VERIFIED: node_modules PrivacyInfo.xcprivacy files] [CITED: docs.expo.dev/guides/apple-privacy]

Re-scan `node_modules/**/PrivacyInfo.xcprivacy` after any dependency change; aggregate into app config (Apple may not parse all pod manifests).

**Play Data Safety (offline local-only) — draft answers for docs:**

| Question | MVP answer |
|----------|------------|
| Collects personal info? | No |
| Shares data? | No |
| Security practices / encryption in transit | N/A for gameplay; policy URL HTTPS only |
| Data types | At most **App activity / other** if declaring on-device high score — mark **not collected** if Play treats purely on-device non-transmitted storage as non-collection; document the chosen interpretation in `play-data-safety.md` |
| Ads / IAP | No |
| Approx age | Everyone / PEGI 3 equivalent — confirm against actual content (no violence/UGC) |

**Age rating / name / originality:** In-repo markdown attesting original "Neon Brick Breaker" name clearance research notes + original SFX/levels (no Maker/Shatter assets). [VERIFIED: PROJECT Out of Scope]

**Explicit non-goals:** No `eas submit`, no store listing creation (D-26).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded phase3Grid | Versioned JSON validate→compile | Phase 4 | Showpiece is data-only |
| Flat navy bricks | Baked glow + particles + trails | Phase 7 | Tier caps act on VFX layer |
| Simulator waiver for FPS | Pixel 6a profiling gfxinfo mandatory | Phase 8 | Closes Phase 1/7 hardware debt |
| No quality tiers | Low/Mid/High outside core | Phase 8 (deferred from Phase 7) | Mid = cert baseline |

**Deprecated/outdated:**

- Treating Phase 7 “procedure ready / Results TBD” as done for PLT-03 — Results still OPEN. [VERIFIED: phase7-vfx-measurement.md]
- Expo Go for measurement — Skia requires dev-client / profiling builds. [VERIFIED: stack rules]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Operational gfxinfo pass: p50 ≤ 16.7 ms and p95 ≤ 20 ms (or ≤5% jank) is an acceptable lock | Certification protocol | Over/under-strict gate; planner must confirm with owner if Pixel fails borderline |
| A2 | `Device.totalMemory` on Pixel 6a reports ~6 GB class (enough to land Mid with 4–8 GB band) | Quality tiers | Mis-tier; mitigate with modelName Pixel 6a → Mid force |
| A3 | Play Console treats on-device-only AsyncStorage high score as “not collected” | Privacy | May need declare “App info and performance” / other; docs must match Console |
| A4 | Aggregating UserDefaults + FileTimestamp reasons covers current Expo 57 + AsyncStorage + RN graph | Privacy Manifest | Apple email may demand more reasons after first upload attempt (phase does not submit — still prep) |
| A5 | High tier = hard max 192 particles is “bounded” enough without Atlas migration | VFX budgets | High may need Atlas later; out of Phase 8 if Mid cert is priority |

**If empty table:** N/A — assumptions listed above need planner/owner awareness, not blocking research.

## Open Questions

1. **Exact numeric gfxinfo fail line**
   - What we know: Qualitative 60 FPS / 16.7 ms; overlay tracks p95 and frames > 16.7.
   - What's unclear: Official project cutoff for “janky frames” percentage from `framestats`.
   - Recommendation: Lock A1 numbers into `docs/phase8-certification.md` at plan start; adjust only via optimize/retune (D-13/D-18), not by moving Pixel to Low.

2. **Worst-case trigger UX**
   - What we know: Need reproducible multi-ball ≥3 + particles near cap + shake + glow (D-14).
   - What's unclear: DEV button vs seed fixture vs debug Intent injector.
   - Recommendation: DEV-only “Cert worst-case” control that forces multi-ball spawn + particle flood **without** changing `core/` RNG rules long-term (temporary debug Intent / event inject in runtime).

3. **Privacy policy host**
   - What we know: Any static HTTPS is fine (D-24 discretion).
   - What's unclear: Which account/domain the owner prefers.
   - Recommendation: `docs/store/privacy-policy.html` + GitHub Pages on this repo (or Cloudflare Pages); verify curl HEAD 200 before PLT-04 checkoff (D-27).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Vitest / tooling | ✓ | v25.6.0 (engines field says `>=24 <25` — note mismatch) | Use Node 24 for CI if engines enforced |
| npm | installs | ✓ | 11.8.0 | — |
| adb | Android gfxinfo gate | ✓ | 1.0.41 | Block PLT-03 Android without adb |
| xcrun / Xcode toolchain | iOS Instruments | ✓ | xcrun 72 | Block D-16 without Mac+Xcode |
| Pixel 6a hardware | Mandatory Mid cert | ? (owner device) | — | Substitute = preliminary only (D-17) |
| Physical iPhone | D-16 | ? (prior: iPhone 16 Pro in Phase 1) | — | Cannot waive for Phase 8 PLT-03 iOS evidence |
| `expo-device` package | Tier resolution | ✗ not installed | add `~57.0.2` | Required — install via `npx expo install` |
| EAS profiling profile | Gate builds | ✓ | eas.json `profiling` | — |
| PrivacyInfo in app config | PLT-04 | ✗ not configured | — | Add `ios.privacyManifests` |

**Missing dependencies with no fallback:**

- Physical **Pixel 6a** for mandatory Mid certification (substitute cannot close MVP).
- Physical **iPhone** + Instruments for D-16.

**Missing dependencies with fallback:**

- `expo-device` — install in Wave 0 / first implementation plan.
- Live privacy URL — can author markdown first; hosting is short task but **blocks PLT-04** until live (D-27).

## Validation Architecture

> `workflow.nyquist_validation` is **true** in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `5.0.1` |
| Config file | Default Vitest (no separate vitest.config required for current suite) |
| Quick run command | `npm test -- tests/levels.compile.test.ts tests/vfx.particles.test.ts tests/core.purity.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LVL-04 | level-03 validates + compiles; brickCount/fingerprint; UNBREAKABLE present | unit | `npm test -- tests/levels.compile.test.ts` | ❌ Wave 0 extend |
| LVL-04 | level-01/02 unchanged fingerprints still pass | unit | same | ✅ exists — keep green |
| LVL-04 | `loadLevelById('level-03')` / default id | unit | new `tests/runtime.loadLevel.test.ts` or levels test | ❌ Wave 0 |
| PLT-03 | Tier→budget mapping (incl. null memory → low; ~6GB → mid) | unit | `tests/runtime.quality-tiers.test.ts` | ❌ Wave 0 |
| PLT-03 | `allocateVfx` respects particleCap; trail clamp ≥2 | unit | `tests/vfx.particles.test.ts` / trails | ✅ partial — extend |
| PLT-03 | `core/` has no expo-device / tier imports | unit | `npm test -- tests/core.purity.test.ts` | ✅ |
| PLT-03 | 60 FPS gfxinfo on Pixel 6a Mid | manual device | profiling + adb script in docs | ❌ docs Results |
| PLT-03 | iPhone Instruments evidence | manual device | Instruments export notes | ❌ docs |
| PLT-04 | app.json contains privacyManifests keys | unit/smoke | small node assert script or snapshot test | ❌ Wave 0 |
| PLT-04 | Live HTTPS privacy URL reachable | manual / curl smoke | `curl -fsSI $URL` | ❌ until hosted |
| PLT-04 | In-repo store docs present | file presence | checklist in VALIDATION | ❌ Wave 0 create |
| Soak D-19/22 | audio.release idempotent; pools cleared | unit | extend audio tests | ❌ Wave 0 |
| Soak D-19 | 100 cycles + 15 min | manual device | DEV harness + meminfo | ❌ harness |

### Sampling Rate

- **Per task commit:** Quick run command above (+ any new tier/level test touched)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green **and** Pixel 6a Mid gfxinfo Results **and** iPhone Instruments notes **and** live privacy URL + store docs (D-27)

### Wave 0 Gaps

- [ ] `tests/levels.compile.test.ts` — add level-03 compile + structural fingerprint vs 01/02
- [ ] `tests/runtime.quality-tiers.test.ts` — memory heuristic + budgets + conservative default
- [ ] Extend `VfxCaps` tests for trailMax/glowScale once API exists
- [ ] `tests/audio.release.test.ts` (or extend mapping) — release clears / idempotent
- [ ] Optional `scripts/assert-privacy-manifest.mjs` — app.json has `privacyManifests`
- [ ] Docs stubs: `docs/phase8-certification.md`, `docs/store/*` placeholders for Results / forms
- [ ] Install: `npx expo install expo-device`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No accounts in MVP |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | yes | `validateLevel` fail-closed on level JSON; dangerous `__proto__` keys rejected [VERIFIED: validate.ts] |
| V6 Cryptography | no | `ITSAppUsesNonExemptEncryption: false` already set [VERIFIED: app.json]; no custom crypto |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious / corrupt level JSON | Tampering | validate before compile; never mutate World on failure |
| Prototype pollution via brickTypes keys | Tampering | Reject `__proto__` / `constructor` / `prototype` |
| Privacy over-claim in policy | Information disclosure | Policy matches actual deps (AsyncStorage local only; no analytics SDK) |
| DEV harness in production | Elevation / abuse | `__DEV__` gates; production profile env hygiene |
| Accidental PII in store docs | Information disclosure | No real user data in repo paperwork |

## Sources

### Primary (HIGH confidence)

- Codebase: `src/runtime/loadLevel.ts`, `src/core/levels/*`, `src/vfx/*`, `app/_components/{GameHost,PlayingHost}.tsx`, `docs/measurement-methodology.md`, `docs/phase7-vfx-measurement.md`, `docs/layer-contract.md`, `app.json`, `eas.json`, `package.json`
- [CITED: https://docs.expo.dev/versions/v57.0.0/sdk/device/] — `Device.totalMemory`, model APIs
- [CITED: https://docs.expo.dev/guides/apple-privacy/] — `ios.privacyManifests`
- [CITED: https://docs.expo.dev/versions/v57.0.0/config/app/#privacymanifests] — config shape
- [VERIFIED: npm registry] — `expo-device@57.0.2`; Expo `bundledNativeModules` `~57.0.2`
- [VERIFIED: node_modules PrivacyInfo.xcprivacy] — AsyncStorage / RN / expo-constants reasons
- Phase CONTEXTs 04–08 — locked decisions

### Secondary (MEDIUM confidence)

- [CITED: Google Pixel help / GSMArena] — Pixel 6a 6 GB RAM for Mid heuristic calibration
- Operational gfxinfo numeric cutoffs (A1) — extrapolated from methodology’s 16.7 ms language

### Tertiary (LOW confidence)

- Play Console “on-device only storage = not collected” interpretation (A3) — confirm at paperwork time
- Exact Instruments template name beyond “Core Animation / Game performance” — follow Phase 1 methodology wording

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — versions verified against package.json / npm / Expo Device docs
- Architecture: **HIGH** — maps 1:1 onto existing loadLevel / VFX / GameHost patterns and CONTEXT locks
- Pitfalls: **HIGH** for Metro/DEV-leak/thermal/MAX_BRICKS; **MEDIUM** for Play Data Safety wording and gfxinfo numeric thresholds

**Research date:** 2026-09-21  
**Valid until:** ~2026-10-21 (30 days; re-check Expo privacy guidance and `expo-device` pin if SDK bumps)
