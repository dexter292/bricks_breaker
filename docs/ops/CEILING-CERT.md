# iOS ceiling certification runbook (N-PLT-02 / A1)

**Status:** Protocol ready; **ceiling Cert WC NOT RUN** under new protocol  
**Device:** iPhone 16 Pro (physical)  
**Authority:** `docs/measurement-methodology.md` · `RELEASE-GATES` G2.16 · prior D-16 = observation only

Simulator / Display-mode Instruments = **not** a ceiling PASS.

---

## 1. Build

1. Produce an EAS **`profiling`** IPA (or Xcode Profile configuration with `__DEV__` false for release-like frame path).
2. Install on **iPhone 16 Pro** only for this row (not Simulator).
3. Confirm quality tier forces **Mid** Cert WC (same fixture used for D-16 / measurement doc).

## 2. Instruments session

1. Open Xcode → Instruments → **Game Performance** (or Core Animation + Time Profiler pair per methodology).
2. Attach to the installed app; start recording **before** Play.
3. Run **≥ 2** captures of **≥ 30 s** each on Cert WC Mid while actively playing (not Title).
4. Record **worse** run (higher p95 / any hang) as the official sample.

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
| iOS version | |
| Run 1 p50 / p95 / hangs | |
| Run 2 p50 / p95 / hangs | |
| Official (worse) | |
| Verdict | PASS / FAIL |
| Notes | date, Instruments template |

Paste into `docs/phase8-certification.md` iOS ceiling row + `measurement` Results when done.

## 6. Acceptance for A1

- [ ] Two ≥30s profiling captures on physical 16 Pro  
- [ ] Worse run meets p50/p95/hangs  
- [ ] Floor still marked NOT RUN  
- [ ] No silent quality-tier claim beyond Mid Cert WC
