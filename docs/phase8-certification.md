# Phase 8 Performance Certification (PLT-03)

Authoritative Phase 8 60 FPS gate protocol. Extends Phase 7 VFX worst-case definition with a **scripted, reproducible** Mid-tier scene on `level-03`.

**Methodology base:** [`docs/measurement-methodology.md`](./measurement-methodology.md)  
**Phase 7 VFX scene:** [`docs/phase7-vfx-measurement.md`](./phase7-vfx-measurement.md)

**Owner decision 2026-09-22:** Pixel 6a / Android gfxinfo gate **WAIVED — no device available**.  
**Owner decision 2026-09-24 (D2=B):** Android mid-range gate is **OUT OF SCOPE** for the iOS-first public release — not Complete. Shipping quantitative gate = **iOS ceiling** in `measurement-methodology.md` (must re-run; prior D-16 ≠ ceiling PASS). iOS floor mid-tier **NOT RUN** (R-10).

**Legend:** **WAIVED ≠ PASS ≠ OUT OF SCOPE ≠ NOT RUN ≠ HARNESS-ONLY**.

---

## Gate scene (D-14)

| Item | Required |
|------|----------|
| Level | **`level-03`** (showpiece) |
| Quality tier | **Mid** (Pixel 6a cert baseline; `glowScale` 1) |
| Balls | **≥3** active (scripted multiball inject — not DROP_CHANCE change) |
| Particles | Near Mid **`particleCap`** (128) via one-shot flood |
| Shake | Decaying amp after life/destroy impulse punch |
| Glow | Baked glow atlas visible (`glowScale` 1 on Mid) |
| Window | Fixed measurement window after ~2 s warmup |

Do **not** change core RNG / `DROP_CHANCE` to manufacture this scene.

---

## Build

| Item | Value |
|------|-------|
| Profile | **profiling** (`eas.json`) |
| Package id | `com.dexter292.bricksbreaker` |
| Overlay | `EXPO_PUBLIC_PERF_OVERLAY=1` (cross-check only) |
| Cert env | Optional `EXPO_PUBLIC_CERT=1` for DEV auto-arm — **never** on production EAS profile |
| Cert UI | `__DEV__` **Cert WC** Pressable on PlayingHost (primary) |

Gate runs use a **dev-client or profiling build that still exposes `__DEV__`** so the Cert WC control is present. Production profile must not set `EXPO_PUBLIC_CERT`. RN Perf Monitor alone is **invalid**.

---

## How to arm the harness

1. Install a **profiling** (or development) build with the Cert WC control available (`__DEV__`).
2. Open **Play** → confirm session is on **`level-03`** (DEV level chip shows `Lv 03`).
3. Force **Mid** via the DEV tier chip (`Mid`), or tap **Cert WC** (it forces Mid + level-03).
4. Tap **Cert WC** — one-shot inject: ≥3 balls, particles near Mid cap, shake punched. Does **not** run every frame.
5. Optional auto-arm: `__DEV__` + `EXPO_PUBLIC_CERT=1` (still never production).
6. Keep the screen awake; discard ~2 s warmup; measure ≥30 s.

---

## Android mandatory — Pixel 6a Mid (D-15) — **WAIVED 2026-09-22**

| Rule | Detail |
|------|--------|
| Device | **Pixel 6a** physical |
| Tier | **Mid** |
| Runs | **≥2** independent runs × **≥30 s** after ~2 s warmup |
| Verdict input | Keep the **worse** run |
| Substitute Android | **Preliminary only** (D-17) — Pixel 6a re-cert remains mandatory before MVP |
| **Owner waiver** | **WAIVED** — no Pixel 6a (or other Android) available. Do **not** invent gfxinfo numbers. PLT-03 Android mid-range gate stays **unproven** until hardware exists. |

### Commands (kept for when hardware returns)

```bash
adb shell dumpsys gfxinfo com.dexter292.bricksbreaker reset
# … play cert worst-case scene ≥30 s after ~2 s warmup …
adb shell dumpsys gfxinfo com.dexter292.bricksbreaker framestats
```

---

## Operational pass lock (A1)

| Metric | Pass |
|--------|------|
| p50 frame time | **≤ 16.7 ms** |
| Stability | p95 **≤ 20 ms** **OR** janky / missed-vsync share **≤ 5%** (gfxinfo) |
| Hard fail | Crash, unresponsive touch, or progressive frame-time degradation |

- **RN Perf Monitor alone is invalid** — never declare pass from it.
- On fail → optimize / retune budgets and **rerun the same scenario** (D-18). Do **not** silently map Pixel 6a to Low or disable required effects solely to pass (D-13).
- A1 thresholds apply to **Android gfxinfo** runs. iOS D-16 uses Instruments Display / Hangs + touch notes (not gfxinfo p50/p95).

---

## iOS (D-16)

| Rule | Detail |
|------|--------|
| Device | **Physical iPhone** required |
| Tool | Instruments **Core Animation** / **Game** (Game Performance on Xcode 26+) |
| Evidence | Render + touch + stability notes |
| Install alone | **≠** performance evidence |

---

## Results

| Device | Tier | Build | Run | p50 ms | p95 ms | Jank % | Verdict | Notes |
|--------|------|-------|-----|--------|--------|--------|---------|-------|
| Pixel 6a | Mid | profiling | run1 | — | — | — | **OUT OF SCOPE (iOS-first D2=B)** | Was WAIVED no-device 2026-09-22; deferred — do not claim Complete |
| Pixel 6a | Mid | profiling | run2 | — | — | — | **OUT OF SCOPE (iOS-first D2=B)** | Same |
| iPhone 16 Pro (physical) | Mid (Cert WC force) | development / `__DEV__` + `PERF_OVERLAY` | Instruments Game Performance | n/a (Display) | n/a | n/a | **OBSERVATION (not ceiling PASS)** | 2026-09-22: A18 Pro; Display ~**8.33 ms** (120 Hz); **Hangs 0**. Single session, development build, no p50/p95 — **re-run required** for iOS ceiling row |
| iPhone 16 Pro **ceiling** | Mid Cert WC | local Release+CERT @ `13018eb` | 2×~35s Game Performance | ≈8.89 | ≈16.1 | Hangs **0** | **NOT PASS** (export) | 2026-09-24 LC-07-clean path. `display-surface-swap` Δ after 2s warmup — p95>~11. Traces `/tmp/bricks-a1/a1-clean{1,2}.trace`. G2.16 still open pending GUI frame-duration / profiling IPA confirm. Metro exploratory earlier = harness only |
| iOS **floor** mid-tier | Mid | profiling | — | — | — | — | **NOT RUN** | No A13–A15 device (R-10) |
| _Substitute Android (optional)_ | Mid | profiling | prelim | — | — | — | **OUT OF SCOPE (D2=B)** | |

**Worse-run summary (Pixel Mid):** **OUT OF SCOPE** — Android deferred under D2=B.

**D-04 / D-17 substitute note:** _Not used. Android return will re-open Pixel / substitute protocol._

### Deferred gate rows (D2 / D4 — see `docs/audit/DEFERRED-ITEMS.md`)

These are PASS/FAIL gates (not p50/p95/jank). Fill on device; do not invent results.

| ID | Gate | Platform | Build | Status | Evidence / Notes |
|----|------|----------|-------|--------|------------------|
| **D2** | SC-2 release-build worklet mutation (sim mutates World on UI thread) | Android | profiling / release | **OUT OF SCOPE (iOS-first D2=B)** | Deferred with Android platform return |
| **D2** | SC-2 release-build worklet mutation (sim mutates World on UI thread) | iOS | Release (local `expo run:ios --configuration Release`) | **PASS** | 2026-09-22: Release-iphoneos installed on iPhone 16 Pro; offline play (no Metro); UI-thread physics/render continuous. Overlay string not baked (`PERF_OVERLAY` unset on that artifact) — mutation evidenced by live play + prior Instruments Display activity on same device. |
| **D4** | iOS profiling SC-2 re-run after HUD font fix | iOS (physical) | development / `__DEV__` + Instruments | **PASS (dev-build; profiling IPA debt)** | 2026-09-22: SpaceMono HUD + `PERF_OVERLAY` on iPhone 16 Pro during Cert WC / Game Performance session; worklet loop advanced (Display ~8.33 ms). Formal EAS `profiling` IPA reinstall still debt for ceiling protocol. |

---

## Soak test (D-19…D-23)

**Physical iOS runbook:** [`docs/ops/SOAK-PHYSICAL.md`](ops/SOAK-PHYSICAL.md) (N-PLT-03 / A2).

DEV-only Title↔Playing lifecycle soak. Proves mount/unmount does not leak loops/listeners/audio before the Plan 06 human gate.

| Item | Value |
|------|--------|
| Arm | `__DEV__` + `EXPO_PUBLIC_SOAK=1` (dev-client / profiling with `__DEV__`) |
| Driver | `GameHost` soak harness — discrete `setTimeout` only (**not** `useFrameCallback`) |
| Phase A | **100** Title↔Playing mount/unmount cycles (~750 ms dwell each edge) |
| Phase B | **15 min** continuous play, then return to Title + `[soak] complete` log |
| Production | **Never** set `EXPO_PUBLIC_SOAK` on the production EAS profile |

### How to arm

1. Install a **dev-client** or profiling build that still exposes `__DEV__`.
2. Launch with `EXPO_PUBLIC_SOAK=1` (e.g. env on the development/profiling profile for a soak session only — not production).
3. Leave the app foregrounded; do not manually thrash Menu/Play while the harness runs.
4. Watch Metro / device logs for `[soak] arming` → cycles done → `[soak] complete`.

### Record at start and end (D-21)

| Signal | Android | iOS |
|--------|---------|-----|
| Memory | `adb shell dumpsys meminfo com.dexter292.bricksbreaker` | Xcode Memory gauges / Instruments Allocations |
| Frame-time | `adb shell dumpsys gfxinfo … framestats` (same package) | Instruments Core Animation / Game |

**Fail when:** sustained RSS growth, rising p95 / progressive frame-time degradation, crash, or unresponsive controls.

### Automated vs device gate (D-20 / D-22)

- Unit asserts (`tests/audio.release.test.ts`) cover **audio `release()`** pool clear + idempotent double-release after unmount paths.
- **Final device soak + performance review remain a mandatory human gate** — unit green alone does **not** claim soak pass.

### Soak Results (Plan 06)

| Device | Build | Cycles | Continuous | Mem start | Mem end | Frame start | Frame end | Verdict | Notes |
|--------|-------|--------|------------|-----------|---------|-------------|-----------|---------|-------|
| Pixel 6a | profiling / `__DEV__` soak | — | — | — | — | — | — | **OUT OF SCOPE (iOS-first D2=B)** | Android deferred |
| iPhone 17 Pro Simulator | development / `__DEV__` + `EXPO_PUBLIC_SOAK=1` | 100 | 15 min | n/a (iOS — adb meminfo N/A) | n/a | n/a (adb gfxinfo N/A) | n/a | **HARNESS-ONLY (sim; no mem/frame data)** | 2026-09-22: Metro logs `[soak] arming` → `cycles done (100)` → `complete`. Simulator never counts for gate (D-05). Physical iPhone soak still owed. |
| iPhone 16 Pro (physical) | development / `__DEV__` + `EXPO_PUBLIC_SOAK=1` (dev-client + Metro) | 100 | 15 min | ~576 MiB footprint (Activity Monitor, mid-cycle Title↔Playing) | ~514 MiB footprint (Activity Monitor, Title after `complete`) | n/a (iOS — no gfxinfo) | n/a | **PASS** | 2026-09-24: physical 16 Pro iOS 26.6.1; Metro `[soak] arming` → `cycles done (100)` → `complete`. **Comparable Title footprints: 576 → 514 (−11%) — no sustained growth.** In-play peak sample ~725 MiB is headroom only (not the leak comparator). **0** `disposed` / HostFunction on this green run after `useGameLoop` unmount `setActive(false)`. **Pre-fix red (R-18):** same device earlier same day (terminal log before `5144984`) — `HostFunction: Attempted to access a disposed object` at `recordSprites.ts` `drawImageRect` during Title↔Playing remount. Debug+Metro mem is fat — not a release RSS claim. Tool: Instruments **Activity Monitor** (`xctrace`). Traces: `/tmp/bricks-soak/start.trace`, `end.trace`. |

---

_Status: iOS D-16 = **OBSERVATION** (not ceiling PASS). D2 iOS Release **PASS**. D4 **PASS (dev-build; profiling IPA debt)**. Soak physical 16 Pro = **PASS** (dev-client). iOS ceiling under new protocol still **NOT RUN** (profiling IPA + p50/p95 protocol). Floor **NOT RUN**. Android **OUT OF SCOPE (D2=B)**._
