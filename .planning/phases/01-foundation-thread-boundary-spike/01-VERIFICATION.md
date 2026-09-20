---
phase: 01-foundation-thread-boundary-spike
verified: 2026-09-20T02:54:50Z
status: gaps_found
score: 5/8 must-haves verified
overrides_applied: 0
gaps:
  - truth: "A dev-client build installs and runs on a real iOS device and on a named mid-range Android reference device, with the Skia version bet either confirmed on EAS or the documented fallback adopted and recorded"
    status: partial
    reason: "iOS iPhone 16 Pro SC-1 PASS and Skia 2.12.0 Confirmed (EAS both platforms + iPhone run). Android reference device was never attached — SC-1 Android is DEFERRED with D-04 Pixel 6a re-cert debt. ROADMAP requires both platforms."
    artifacts:
      - path: "docs/device-gate-results.md"
        issue: "SC-1 Android row is DEFERRED; no named mid-range Android model recorded as installed"
    missing:
      - "Install development APK on Pixel 6a (or documented D-04 substitute) and record PASS with model/chipset/OS/refresh rate"
  - truth: "A 'worklet'-marked pure TypeScript module imported across several files mutates a UI-runtime world object in place across frames inside useFrameCallback, in both dev and release builds"
    status: partial
    reason: "Code path verified (allocateWorld/stepStub 'worklet' → useFrameCallback). Human evidence only for iOS development (worklet tick PASS). Android all builds DEFERRED; iOS profiling/release not re-run after HUD font fix. ROADMAP requires both dev and release."
    artifacts:
      - path: "docs/device-gate-results.md"
        issue: "SC-2 table: only development/iOS PASS; profiling/release and Android rows DEFERRED"
      - path: "src/runtime/useSpikeLoop.ts"
        issue: "Implementation allocates on first useFrameCallback frame (no runOnUI) — intent OK, but release-build on-device evidence still missing"
    missing:
      - "SC-2 PASS on Android development + Android profiling/release"
      - "SC-2 PASS on iOS profiling/release (re-install profiling IPA after SpaceMono fix)"
  - truth: "Several hundred dummy sprites recorded into an SkPicture hold 60 FPS on the reference Android device, readable from an in-app frame-time overlay behind a dev flag"
    status: failed
    reason: "No gfxinfo/Instruments numbers captured. SC-3 marked DEFERRED. iPhone overlay ~60 FPS is smoke only (D-05) and must not be treated as the Android gate. No invented FPS figures."
    artifacts:
      - path: "docs/device-gate-results.md"
        issue: "SC-3 runs table empty — framestats not captured"
    missing:
      - "Two profiling/release Android runs with adb dumpsys gfxinfo framestats at ~256 sprites"
      - "Record overlay FPS/p95 cross-check + thermal notes; pass/fail against stable ~60 FPS"
human_verification:
  - test: "SC-1 Android install"
    expected: "Development APK launches on Pixel 6a (or D-04 substitute with full device docs); canvas + sprites visible"
    why_human: "Requires physical Android device; not attached during 2026-09-20 session"
  - test: "SC-2 worklet on profiling/release (iOS + Android)"
    expected: "Overlay self-check shows worklet tick PASS; sprites moving; no freezeObjectInDev"
    why_human: "Release binary behavior cannot be asserted from source alone"
  - test: "SC-3 Pixel 6a 60 FPS gate"
    expected: "Two ≥30s profiling runs; gfxinfo framestats + overlay cross-read show stable ~60 FPS at ~256 sprites"
    why_human: "Hardware measurement; no numbers exist yet — do not invent"
---

# Phase 1: Foundation & Thread-Boundary Spike Verification Report

**Phase Goal:** The project's central architectural bet is proven on real hardware, and the layer boundaries that protect it are enforced by the repo  
**Verified:** 2026-09-20T02:54:50Z  
**Status:** gaps_found  
**Re-verification:** No — initial verification

## Goal Achievement

Phase 1 has two halves. The **repo-enforced boundaries** half is met (pure `core/`, Vitest, ESLint, layer contract, wired FPS harness). The **proven on real hardware** half is incomplete: iPhone development SC-1/SC-2 PASS, Skia 2.12.0 Confirmed for EAS builds + iPhone run, but Android SC-1/SC-2 and SC-3 FPS remain DEFERRED with explicit human acknowledgment and D-04 debt — not closed against ROADMAP success criteria.

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Dev-client installs on real iOS **and** named mid-range Android; Skia bet confirmed or fallback recorded | ✗ FAILED (partial) | iOS iPhone 16 Pro PASS; Skia **Confirmed** 2.12.0 in `docs/skia-version-decision.md` + `npm run assert:skia`. Android SC-1 **DEFERRED** (`docs/device-gate-results.md`) |
| 2 | `'worklet'` core modules mutate UI-runtime world in `useFrameCallback` in **both** dev and release | ✗ FAILED (partial) | Code: `step.ts`/`allocate.ts` `'worklet'` + `useSpikeLoop` `useFrameCallback` → `stepStub`. Human: iOS development `worklet tick PASS` only. Profiling/release + Android DEFERRED |
| 3 | ~200–300 `SkPicture` sprites hold 60 FPS on reference Android; overlay behind flag | ✗ FAILED | Harness + overlay code present (`PERF_OVERLAY`, `recordOverlay`). **No gfxinfo numbers**; SC-3 DEFERRED. iPhone overlay smoke ≠ D-01 gate |
| 4 | `core/` imports nothing from React/Skia/Reanimated; runs in Node under Vitest; written checkable layer contract | ✓ VERIFIED | 5 modules; Vitest 3/3 pass; `npx eslint src/core` exit 0; `docs/layer-contract.md` LC-* rows; `eslint.config.js` restricted imports + `scheduleOnRN` ban |
| 5 | Expo SDK 57 at repo root; Node 24; Skia exact 2.12.0 + `expo.install.exclude`; EAS profiles with overlay hygiene | ✓ VERIFIED | `package.json` / `.nvmrc` / `eas.json` / `babel.config.js` worklets plugin last / `scripts/assert-skia-version.mjs` OK |
| 6 | Illegal platform imports in `core/` fail ESLint; ≥5 core modules | ✓ VERIFIED | `tests/core.purity.test.ts` + `eslint.config.js` `no-restricted-imports`; 5 `.ts` files under `src/core/` |
| 7 | Opaque Skia Canvas + fixed-timestep hot path; no `runOnJS`/`scheduleOnRN`/`setState` on frame path; cliff ramp documented | ✓ VERIFIED | `SpikeCanvas` `opaque`; `useSpikeLoop` steps + `picture.value = recordFrame`; hot-path grep clean; `CLIFF_RAMP` Pressable; `docs/measurement-methodology.md` |
| 8 | Production overlay flag OFF; methodology + device-gate + Skia decision docs present | ✓ VERIFIED | `eas.json` production has no `EXPO_PUBLIC_PERF_OVERLAY`; docs exist with PASS/DEFERRED attribution |

**Score:** 5/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `package.json` | SDK 57, engines, Skia exclude | ✓ VERIFIED | Skia `2.12.0`, `engines.node` `>=24 <25`, exclude present |
| `.nvmrc` | Node 24 | ✓ VERIFIED | Content `24` |
| `eas.json` | development/profiling/production + overlay hygiene | ✓ VERIFIED | Overlay on development+profiling; production unset |
| `babel.config.js` | worklets plugin last | ✓ VERIFIED | `react-native-worklets/plugin` |
| `scripts/assert-skia-version.mjs` | Pin integrity | ✓ VERIFIED | Assert exits 0 → 2.12.0 |
| `src/core/index.ts` (+4 modules) | Pure allocate/step stub | ✓ VERIFIED | Exports `allocateWorld`, `stepStub`; `'worklet'` in allocate/step |
| `tests/core.smoke.test.ts` | Node smoke | ✓ VERIFIED | Vitest green |
| `tests/core.purity.test.ts` | Purity + ≥5 modules | ✓ VERIFIED | Vitest green |
| `eslint.config.js` | ARCH-01 / D-11 / D-14 | ✓ VERIFIED | restricted-imports + scheduleOnRN/runOnJS syntax ban |
| `docs/layer-contract.md` | Written crossings | ✓ VERIFIED | LC-01..LC-12 |
| `vitest.config.ts` | Node env | ✓ VERIFIED | `environment: 'node'` |
| `src/runtime/useSpikeLoop.ts` | Fixed-timestep host | ✓ VERIFIED | Substantive; **wired**; allocates on first UI frame (not `runOnUI` — see key links) |
| `src/render/SpikeCanvas.tsx` | Opaque Canvas + Picture | ✓ VERIFIED | `opaque`; mounted via `SpikeScreen` |
| `src/render/recordSprites.ts` | SkPicture record | ✓ VERIFIED | Module-scope `PictureRecorder` |
| `src/render/recordOverlay.ts` | Overlay metrics in picture | ✓ VERIFIED | ms/FPS/substeps |
| `src/devflags.ts` | PERF_OVERLAY / CLIFF_RAMP | ✓ VERIFIED | Env flags, not `__DEV__` |
| `app/index.tsx` | Thin host | ✓ VERIFIED | Renders `<SpikeScreen />` |
| `docs/measurement-methodology.md` | D-08 methodology | ✓ VERIFIED | `1000/mean`, gfxinfo/Instruments |
| `docs/device-gate-results.md` | SC evidence | ⚠️ PARTIAL | Exists with iPhone PASS + Android/SC-3 DEFERRED; no FPS numbers |
| `docs/skia-version-decision.md` | D-16 decision | ✓ VERIFIED | **Confirmed** 2.12.0; fallback unused |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `package.json` | `@shopify/react-native-skia` | exact 2.12.0 + exclude | ✓ WIRED | Assert + lock |
| `eas.json` | `EXPO_PUBLIC_PERF_OVERLAY` | development+profiling only | ✓ WIRED | Production unset |
| `tests/core.smoke.test.ts` | `src/core` | import allocate/step | ✓ WIRED | Vitest pass |
| `eslint.config.js` | `src/core/**` | no-restricted-imports | ✓ WIRED | eslint exit 0 |
| `docs/layer-contract.md` | `eslint.config.js` | LC / ARCH-01 cites | ✓ WIRED | Contract rows + eslint messages |
| `useSpikeLoop.ts` | `src/core/step.ts` | `stepStub` in frame callback | ✓ WIRED | Line ~99 |
| `useSpikeLoop.ts` | `recordSprites` | `picture.value = recordFrame` | ✓ WIRED | Line ~117 |
| `SpikeCanvas.tsx` | `SharedValue<SkPicture>` | `Picture` + `opaque` | ✓ WIRED | Hosted by SpikeScreen |
| `useSpikeLoop.ts` | `runOnUI` allocate | plan pattern | ⚠️ PARTIAL | **No `runOnUI`/`scheduleOnUI`**. Allocates inside first `useFrameCallback` worklet (comment: avoid RN→UI typed-array crossing). Intent of UI-runtime allocation holds; literal plan key_link pattern fails |
| `device-gate-results.md` | gfxinfo / Instruments | recorded frame stats | ✗ NOT_WIRED | Tooling named; **no captured stats** |
| `skia-version-decision.md` | package Skia version | asserted match | ✓ WIRED | Confirmed 2.12.0 |

**Override suggestion (intentional deviation):** Plan 01-03 key_link expected `runOnUI|scheduleOnUI`. Implementation allocates on the first UI frame instead. To accept:

```yaml
overrides:
  - must_have: "runOnUI allocateWorld / world allocated on UI runtime"
    reason: "allocateWorld runs inside useFrameCallback worklet on first frame — typed arrays never cross RN→UI; same UI-runtime intent as runOnUI"
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `useSpikeLoop` | `world` SharedValue | `allocateWorld` on first frame worklet | Yes — SoA typed arrays mutated by `stepStub` | ✓ FLOWING |
| `useSpikeLoop` | `picture` SharedValue | `recordFrame(world, metrics, …)` | Yes — per-frame SkPicture | ✓ FLOWING |
| `recordOverlay` | overlay strings | `SpikeMetrics` ring (`rollingFps`, substeps, tick check) | Yes when `PERF_OVERLAY` | ✓ FLOWING |
| `device-gate-results` SC-3 | FPS / framestats | gfxinfo / Instruments | **No** — deferred empty | ✗ DISCONNECTED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| core Node smoke + purity | `npx vitest run` | 2 files, 3 tests passed | ✓ PASS |
| Skia pin | `npm run assert:skia` | `@shopify/react-native-skia@2.12.0 OK` | ✓ PASS |
| Production overlay unset | `node -e` parse `eas.json` | `production overlay unset OK` | ✓ PASS |
| core ESLint clean | `npx eslint src/core` | exit 0 | ✓ PASS |
| Hot-path bridge ban | `rg runOnJS\|scheduleOnRN src/runtime src/render` | no matches | ✓ PASS |
| Android gfxinfo gate | N/A (no device) | not run | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| **ARCH-01** | 01-01, 01-02, 01-03, 01-04 | Game logic, physics, rendering, input, and UI separated; simulation suitable for UI-thread worklet path | ✗ BLOCKED (partial) | Separation + contract + ESLint + Node purity **satisfied**. Worklet suitability **partially** proven (iOS development only). Android + release/profiling + 60 FPS spike gate incomplete — ARCH-01 “suitable to run on worklet path” not fully closed on hardware |

No orphaned Phase 1 requirements: REQUIREMENTS.md maps only ARCH-01 to Phase 1; all four plans declare `requirements: [ARCH-01]`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `01-03-SUMMARY.md` | provides / accomplishments | Claims `runOnUI` allocation | ℹ️ Info | SUMMARY diverges from code (`useFrameCallback` first-frame allocate). Not a runtime stub; document drift |
| `docs/device-gate-results.md` | SC-3 | Empty measurement cells | 🛑 Blocker | Blocks ROADMAP SC-3 / phase goal hardware proof |
| `docs/skia-version-decision.md` | Confirmation criteria | Notes Android physical still outstanding | ⚠️ Warning | Status Confirmed while Android on-device install deferred — acceptable per human approval but incomplete vs doc’s own “both platforms install” criteria |

No TODO/FIXME/placeholder stubs in `src/runtime` or `src/render`. No hollow `return null` harness.

### Human Verification Required

### 1. SC-1 Android install

**Test:** Install EAS development APK on Pixel 6a (or D-04 substitute with model/chipset/OS/refresh rate).  
**Expected:** App launches; opaque canvas + ~256 sprites visible.  
**Why human:** Physical Android device required.

### 2. SC-2 profiling/release worklet

**Test:** Install profiling builds on Android and re-install iOS profiling IPA; confirm overlay `worklet tick PASS`.  
**Expected:** Tick advances / sprites move on release-style builds.  
**Why human:** Cannot prove release binary behavior from source.

### 3. SC-3 FPS gate

**Test:** Profiling Android, `adb shell dumpsys gfxinfo com.dexter292.bricksbreaker` reset → ≥30s → framestats; two runs; cross-read overlay.  
**Expected:** Stable ~60 FPS at ~256 sprites; numbers recorded (do not invent).  
**Why human:** Hardware measurement; currently DEFERRED with no figures.

### Gaps Summary

Three ROADMAP success criteria remain open despite human `approved` on 2026-09-20 with intentional Android/SC-3 deferral:

1. **Dual-platform install** — iOS done; Android DEFERRED (D-04 Pixel 6a re-cert before MVP).
2. **Worklet mutation in both dev and release** — only iOS development evidenced.
3. **Android 60 FPS at hundreds of sprites** — not measured; no gfxinfo numbers.

Repo-side ARCH-01 boundaries and harness wiring are solid. Phase goal “proven on real hardware” is **not** fully achieved. No topology fallback was chosen — gap closure is measurement/install, not redesign.

These gaps are **not** deferred to later milestone phases under Step 9b: Phase 8 certifies full-game worst-case 60 FPS (PLT-03), which assumes Phase 1 established the architectural frame budget. Closing SC-1/SC-2/SC-3 remains Phase 1 debt (with D-04 explicitly calling out Pixel 6a re-cert before MVP acceptance).

---

_Verified: 2026-09-20T02:54:50Z_  
_Verifier: Claude (gsd-verifier)_
