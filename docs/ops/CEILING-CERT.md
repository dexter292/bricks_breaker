# iOS ceiling certification runbook (N-PLT-02 / A1)

**Status:** **PASS** under §5 — historical `13018eb` (2026-09-24) · **Re-run PASS** post B+C2 (2026-09-25, §5c) — D1 execute unblocked  
**Device:** iPhone 16 Pro (physical)  
**Authority:** `docs/measurement-methodology.md` · `RELEASE-GATES` G2.16 · `docs/audit/A1-CEILING-ANALYSIS.md` (R-22 / R-23)  
**Owner lock:** bar §5 (60 FPS + jank OR) — not the prior 120 Hz `p50≤8.33 / p95≤11` lock

Simulator / Display-mode-only observation = **not** a ceiling PASS. Debug+Metro `[cert-metrics]` = app-loop health cross-check only.

---

## 1. Build

1. Produce an EAS **`profiling`** IPA **or** local `Release` with Cert env (`__DEV__` false):

   ```bash
   eas build --platform ios --profile profiling
   # or local:
   EXPO_PUBLIC_CERT=1 EXPO_PUBLIC_PERF_OVERLAY=1 npx expo run:ios --device --configuration Release
   ```

   `eas.json` **`profiling.env` sets `EXPO_PUBLIC_CERT=1`**.  
   **`production.env` must never set** `EXPO_PUBLIC_CERT` / `SOAK` / `CLIFF_RAMP` / `PERF_OVERLAY` — `scripts/assert-eas-profiles.mjs` (R-21 / G2.5).
2. Install on **iPhone 16 Pro** only for this row (not Simulator).
3. Confirm quality tier forces **Mid** Cert WC (auto-arm when `EXPO_PUBLIC_CERT=1`).

## 2. Instruments session

1. Open Xcode → Instruments → **Game Performance**.
2. Attach; start recording **before** / at active Cert WC playfield.
3. Run **≥ 2** captures of **≥ 30 s** each on Cert WC Mid while actively playing (not Title).
4. Export **`display-surface-swap`** Δ (presentation layer — R-23). Discard ~2 s warmup. Keep **worse** run.
5. Record **Hangs** (`potential-hangs` row count).

### 2b. App-loop health (secondary — not G2.16 alone)

```bash
EXPO_PUBLIC_CERT=1 EXPO_PUBLIC_PERF_OVERLAY=1 npx expo start --dev-client --port 8081
# Metro `[cert-metrics]` — require over16.7=0 for ≥30 s at Cert WC Mid
```

Harness notes:

- `[cert-metrics]` = frame-callback `dt` (sim/render loop), **not** display swap.
- **R-20:** mirror + reaction (~1 Hz UI marshalling residual — see below).
- **Measurement nuance:** ~1 Hz `runOnJS` from cert reaction can sit between frames; not inside frame body.

## 3. Pass criteria (ceiling) — owner lock §5

| Layer | Metric | Pass |
|-------|--------|------|
| **G2.16 / N-PLT-02 ceiling** | `display-surface-swap` Δ | **p50 ≤ 16.7 ms** **and** (**p95 ≤ 20 ms** **or** jank ≤ 5%) **and** **Hangs = 0** |
| App-loop health | `[cert-metrics]` / overlay | `over16.7 = 0` for ≥30 s (secondary) |
| 120 Hz stretch | `display-surface-swap` Δ p50 ≤ 8.33 ms | **Informational only** — not a ship gate |

All G2.16 row cells required. Fail any → **FAIL**, do not claim G2.16.

Aligned with product **PLT-03 “stable 60 FPS”** (R-22). Quantum Δ values cluster near 8.33 / 16.67 — hence the **OR jank** branch (R-22 §2.3).

## 4. Floor (explicit non-claim)

Mid-tier A13–A15 60 Hz floor remains **NOT RUN (R-10)**. Do not fill floor PASS from 16 Pro data. Marketing must not claim FPS on unmeasured devices (G2.13).

## 5. Record

| Field | Value |
|-------|--------|
| Device | iPhone 16 Pro |
| Build | local `Release` + `EXPO_PUBLIC_CERT=1` @ `13018eb` (LC-07-clean) |
| iOS version | 26.6.1 |
| Run 1 p50 / p95 / hangs | display-surface-swap Δ ≈ **8.89 / 16.10** ms; **Hangs 0** |
| Run 2 p50 / p95 / hangs | display-surface-swap Δ ≈ **8.85 / 16.11** ms; **Hangs 0** |
| Official (worse) | p95 ≈ **16.11** ms |
| **Verdict (§5 bar)** | **PASS** — p50≤16.7 ✓; p95≤20 ✓; Hangs 0 ✓. Traces `/tmp/bricks-a1/a1-clean{1,2}.trace`. Distribution bimodal 50/50 @ ~8.3/~16.7 (see A1-CEILING-ANALYSIS §3.3) |
| Notes | Owner locked §5 2026-09-24. Prior 120 Hz bar retired for G2.16. |

### 5c. Re-run PASS — post Milestone B + C2 (D1 precondition B3)

> **Why:** §5 PASS above is build `13018eb` (pre–Milestone B). B + C2 changed render/core/shell. Owner stamped **PASS** 2026-09-25 on current C2 tip (D1-CONTEXT B3).

| Field | Value |
|-------|--------|
| Device | iPhone 16 Pro (physical) |
| Build | post-B+C2 tip (owner session 2026-09-25; see git log / local Release+CERT) |
| iOS version | _(owner device)_ |
| Run 1 / Run 2 / worse | _(owner Instruments session — numbers on device/traces)_ |
| **Verdict (§5 bar)** | **PASS** — owner stamp 2026-09-25 |
| Notes | Debt from B+C2 closed for D1 gate; Mid freeze still applies; second re-run only if D1 changes render load |

- [x] Two ≥30s Cert WC Mid captures on 16 Pro (owner)  
- [x] Worse run meets §5 (owner)  
- [x] Floor still NOT RUN  
- [x] Owner stamped PASS  

**Stamp:** `Human ceiling re-run: PASS 2026-09-25`

### 5c note — D1 second Cert (D-05)

§5c PASS is retained. **Do not** re-run Instruments Cert WC for D1 unless **render load** changes: new particles, extra full-screen layers, or heavier glow. Ghost quads (flat fill) + expo-haptics (non-render) alone → **skip** second Cert. Mid freeze (`docs/ops/QUALITY-TIER.md`) is the process guard.

### 5b. App-loop health (2026-09-24)

| Field | Value |
|-------|--------|
| Build | Debug dev-client + Metro `EXPO_PUBLIC_CERT=1` |
| p50 / p95 / mean | **8.33 / 8.33 / 8.33** ms |
| fps / over16.7 | **120.0 / 0** |
| Verdict | **PASS (secondary)** — does not alone discharge G2.16 |

## 6. Acceptance for A1

- [x] Two ≥30s captures on physical 16 Pro (Cert WC Mid)  
- [x] Worse run meets §5 bar (p50/p95-or-jank/Hangs)  
- [x] Floor still marked NOT RUN  
- [x] No silent quality-tier claim beyond Mid Cert WC  
- [x] App-loop `over16.7=0` cross-check  
- [x] Owner locked product bar (§5 / R-22)
