# Phase 8 Performance Certification (PLT-03)

Authoritative Phase 8 60 FPS gate protocol. Extends Phase 7 VFX worst-case definition with a **scripted, reproducible** Mid-tier scene on `level-03`.

**Methodology base:** [`docs/measurement-methodology.md`](./measurement-methodology.md)  
**Phase 7 VFX scene:** [`docs/phase7-vfx-measurement.md`](./phase7-vfx-measurement.md)

**Owner decision 2026-09-22:** Pixel 6a / Android gfxinfo gate **WAIVED — no device available**. PLT-03 mid-range Android evidence is **not claimed**. iOS D-16 companion filled from physical Instruments run (below).

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
| Pixel 6a | Mid | profiling | run1 | — | — | — | **WAIVED** | Owner 2026-09-22: no Pixel 6a; Android gfxinfo not run |
| Pixel 6a | Mid | profiling | run2 | — | — | — | **WAIVED** | Same waiver; no second run |
| iPhone 16 Pro (physical) | Mid (Cert WC force) | development / `__DEV__` + `PERF_OVERLAY` | Instruments Game Performance | n/a (Display) | n/a | n/a | **PASS** | 2026-09-22: A18 Pro, iOS 26.6.1; level-03 Cert WC (multi arm); Display surface duration **8.33 ms** (120 Hz) with rare **16.67 ms** blip; **Hangs 0** on multi-Cert-WC run; prior attach run had 2×~600 ms hang (load/attach noise — not reproduced under Cert WC stress). Direct-to-Display=No (compositor — expected). Touch OK during play. |
| _Substitute Android (optional)_ | Mid | profiling | prelim | — | — | — | **WAIVED** | No Android device; D-17 substitute not used |

**Worse-run summary (Pixel Mid):** **WAIVED** — no Pixel runs.

**D-04 / D-17 substitute note:** _Not used. Android mid-range gate remains open until hardware available._

### Deferred gate rows (D2 / D4 — see `docs/audit/DEFERRED-ITEMS.md`)

These are PASS/FAIL gates (not p50/p95/jank). Fill on device; do not invent results.

| ID | Gate | Platform | Build | Status | Evidence / Notes |
|----|------|----------|-------|--------|------------------|
| **D2** | SC-2 release-build worklet mutation (sim mutates World on UI thread) | Android | profiling / release | **WAIVED** | No Android device (same as D-15) |
| **D2** | SC-2 release-build worklet mutation (sim mutates World on UI thread) | iOS | profiling / release | PENDING_DEVICE | Dev-client Instruments run ≠ dedicated release/profiling SC-2 mutation re-run |
| **D4** | iOS profiling SC-2 re-run after HUD font fix | iOS (physical) | profiling | PENDING_DEVICE | Overlay + SpaceMono used in 2026-09-22 session; formal profiling-profile SC-2 row still open |

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
| Pixel 6a | profiling / `__DEV__` soak | — | — | — | — | — | — | **WAIVED** | Owner 2026-09-22: no Pixel 6a |
| iPhone (physical) | profiling / `__DEV__` soak | — | — | — | — | — | — | PENDING_DEVICE | Not run this session (Cert WC / Instruments only) |

---

_Status: iOS D-16 **PASS** (2026-09-22 Instruments). Pixel/Android D-15 + Android soak **WAIVED** (no device). PLT-03 Android mid-range **not claimed**. iOS soak + D2/D4 iOS profiling rows still open._
