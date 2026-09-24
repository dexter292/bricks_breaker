# iOS ceiling certification runbook (N-PLT-02 / A1)

**Status:** Protocol ready; official ceiling **NOT RUN** (needs profiling IPA). Metro harness exploratory **PASS-shaped** 2026-09-24.  
**Device:** iPhone 16 Pro (physical)  
**Authority:** `docs/measurement-methodology.md` · `RELEASE-GATES` G2.16 · prior D-16 = observation only

Simulator / Display-mode Instruments = **not** a ceiling PASS. Debug+Metro `[cert-metrics]` = harness signal only — **does not discharge G2.16**.

---

## 1. Build

1. Produce an EAS **`profiling`** IPA (or Xcode Profile configuration with `__DEV__` false for release-like frame path):

   ```bash
   eas build --platform ios --profile profiling
   ```

   Confirm `eas.json` `profiling.env` does **not** set `EXPO_PUBLIC_CERT` / `EXPO_PUBLIC_SOAK`.
2. Install on **iPhone 16 Pro** only for this row (not Simulator).
3. Confirm quality tier forces **Mid** Cert WC (same fixture used for D-16 / measurement doc). Use `__DEV__` Cert WC Pressable on a development build, or ship a temporary profiling-only arm if `__DEV__` is false.

## 2. Instruments session

1. Open Xcode → Instruments → **Game Performance** (or Core Animation + Time Profiler pair per methodology).
2. Attach to the installed app; start recording **before** Play.
3. Run **≥ 2** captures of **≥ 30 s** each on Cert WC Mid while actively playing (not Title).
4. Record **worse** run (higher p95 / any hang) as the official sample.

### 2b. Metro harness (exploratory — optional)

```bash
EXPO_PUBLIC_CERT=1 EXPO_PUBLIC_PERF_OVERLAY=1 npx expo start --dev-client --port 8081
# relaunch dev client → watch Metro for `[cert-metrics]` lines ~1/s
```

Harness notes (2026-09-24):

- `audio.preload` soft-timeouts inside `expoAudioService` + CERT uses memory AudioService (native `createAudioPlayer` can block JS after soft-failed preload).
- CERT skips AppState auto-pause so deep-link relaunch does not freeze the loop.
- `[cert-metrics]` samples **frame interval** (vsync Δ), not CPU work time.

## 3. Pass criteria (ceiling)

| Metric | Pass |
|--------|------|
| p50 frame time | ≤ **8.33 ms** |
| p95 frame time | ≤ **11 ms** |
| Hangs | **0** |

All three required. Fail any → **FAIL**, do not claim G2.16.

## 4. Floor (explicit non-claim)

Mid-tier A13–A15 60 Hz floor remains **NOT RUN (R-10)**. Do not fill floor PASS from 16 Pro data.

## 5. Record

| Field | Value |
|-------|--------|
| Device | iPhone 16 Pro |
| Build | profiling IPA id / commit |
| iOS version | 26.6.1 |
| Run 1 p50 / p95 / hangs | |
| Run 2 p50 / p95 / hangs | |
| Official (worse) | |
| Verdict | **NOT RUN** (official) |
| Notes | date, Instruments template |
| EAS profiling (queued 2026-09-24) | https://expo.dev/accounts/dexter292/projects/bricks-breaker/builds/95a80ef1-3de8-4507-bde9-9d632d2d8871 |

### 5b. Metro exploratory (2026-09-24)

| Field | Value |
|-------|--------|
| Device | iPhone 16 Pro (`00008140-000605803C01801C`) |
| Build | Debug dev-client + Metro `EXPO_PUBLIC_CERT=1` |
| Scene | level-03 Cert WC, tier=mid |
| Samples | n≈4800 (~40 s @ 120 Hz), steady after warmup |
| p50 / p95 / mean | **8.33 / 8.33 / 8.33** ms |
| fps / over16.7 | **120.0 / 0** |
| Verdict | **Harness OK — does not discharge G2.16** |

Paste official Instruments rows into `docs/phase8-certification.md` iOS ceiling row when profiling IPA is available.

## 6. Acceptance for A1

- [ ] Two ≥30s profiling captures on physical 16 Pro  
- [ ] Worse run meets p50/p95/hangs  
- [ ] Floor still marked NOT RUN  
- [ ] No silent quality-tier claim beyond Mid Cert WC
- [x] Metro harness can emit `[cert-metrics]` on Cert WC Mid (exploratory)
