# Phase 8 Performance Certification (PLT-03)

Authoritative Phase 8 60 FPS gate protocol. Extends Phase 7 VFX worst-case definition with a **scripted, reproducible** Mid-tier scene on `level-03`.

**Methodology base:** [`docs/measurement-methodology.md`](./measurement-methodology.md)  
**Phase 7 VFX scene:** [`docs/phase7-vfx-measurement.md`](./phase7-vfx-measurement.md)

Results rows below stay **OPEN** until Plan 06 device fills. This doc locks **conditions + operational thresholds** only — it does not claim a pass.

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

## Android mandatory — Pixel 6a Mid (D-15)

| Rule | Detail |
|------|--------|
| Device | **Pixel 6a** physical |
| Tier | **Mid** |
| Runs | **≥2** independent runs × **≥30 s** after ~2 s warmup |
| Verdict input | Keep the **worse** run |
| Substitute Android | **Preliminary only** (D-17) — Pixel 6a re-cert remains mandatory before MVP |

### Commands

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

---

## iOS (D-16)

| Rule | Detail |
|------|--------|
| Device | **Physical iPhone** required |
| Tool | Instruments **Core Animation** / **Game** |
| Evidence | Render + touch + stability notes |
| Install alone | **≠** performance evidence |

---

## Results

Fill during Plan 06 device certification. Rows below are scaffolding only — **do not invent gfxinfo numbers**. Replace `PENDING_DEVICE` with measured values (or document blockers / waivers).

| Device | Tier | Build | Run | p50 ms | p95 ms | Jank % | Verdict | Notes |
|--------|------|-------|-----|--------|--------|--------|---------|-------|
| Pixel 6a | Mid | profiling | run1 | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | Mandatory Android gate (D-15); level-03 Cert WC; ≥30 s after ~2 s warmup |
| Pixel 6a | Mid | profiling | run2 | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | Second run; keep **worse** of run1/run2 |
| iPhone (physical) | Mid (auto/force) | profiling | Instruments | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | D-16: Core Animation / Game + render/touch/stability notes |
| _Substitute Android (optional)_ | Mid | profiling | prelim | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | Preliminary only (D-17) — **not** MVP close |

**Worse-run summary (Pixel Mid):** `PENDING_DEVICE` — fill after both Pixel runs; evaluate worse run vs A1 thresholds above.

**D-04 / D-17 substitute note (if used):** _model / chipset / OS / refresh — MVP debt until Pixel 6a; substitute alone must not close MVP_

---

## Soak test (D-19…D-23)

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
| Pixel 6a | profiling / `__DEV__` soak | 100 | 15 min | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | Mandatory Android soak (D-19…D-21); 100 Title↔Playing + 15 min play |
| iPhone (physical) | profiling / `__DEV__` soak | 100 | 15 min | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | PENDING_DEVICE | D-16 stability companion; mem + frame-time start/end |

---

_Status: protocol + thresholds locked; Results scaffolding ready (`PENDING_DEVICE`) — Plan 06 human device gate fills real evidence._
