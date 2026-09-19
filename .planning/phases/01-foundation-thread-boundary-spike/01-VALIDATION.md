---
phase: 1
slug: foundation-thread-boundary-spike
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-19
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.1 (Node 24 LTS via `.nvmrc` + `engines`) |
| **Config file** | `vitest.config.ts` — Plan 01-02 installs |
| **Quick run command** | `npx vitest run src/core` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit && npx eslint .` |
| **Estimated runtime** | ~5–15 seconds (unit/lint); device gates are manual |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/core` (once Plan 01-02 lands)
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit && npx eslint .`
- **Before every EAS build:** `npx expo-doctor@latest` + `npm run assert:skia`
- **Before `/gsd-verify-work`:** Full suite green **and** release/profile device measurements recorded
- **Max feedback latency:** ~15 seconds for automated suite

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 1 | ARCH-01 | — | Expo scaffold at repo root (not nested) | smoke | `test -f package.json && test -d app` | ❌ | ⬜ pending |
| 01-01-T2 | 01-01 | 1 | ARCH-01 | T-01-01, T-01-02 | Skia pin + overlay env hygiene in eas.json | script | `npm run assert:skia` + eas production overlay unset | ❌ | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | ARCH-01 | — | Vitest 5 + RED smoke scaffold | unit | `npx vitest run tests/core.smoke.test.ts` (expect fail pre-impl) | ❌ W0 | ⬜ pending |
| 01-02-T2 | 01-02 | 2 | ARCH-01 | T-01-04 | `core/` Node smoke + purity (≥5 modules) | unit | `npx vitest run tests/core.smoke.test.ts tests/core.purity.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-T3 | 01-02 | 2 | ARCH-01 | T-01-04 | Illegal `core/` import fails lint; D-14 syntax ban | lint | `npx eslint src/core` (+ negative probe) | ❌ W0 | ⬜ pending |
| 01-03-T1 | 01-03 | 3 | ARCH-01 | T-01-01 | No `runOnJS`/`scheduleOnRN` in runtime loop | lint | `npx eslint src/runtime` | ❌ | ⬜ pending |
| 01-03-T2 | 01-03 | 3 | ARCH-01 | T-01-01, T-01-05 | Opaque SkPicture + overlay + host | lint+tsc | `npx vitest run && npx tsc --noEmit && npx eslint src/runtime src/render` | ❌ | ⬜ pending |
| 01-04-T1 | 01-04 | 4 | ARCH-01 | T-01-01, T-01-02 | Production overlay off; Skia decision doc | script | `npm run assert:skia` + eas production check | ❌ | ⬜ pending |
| 01-04-T2 | 01-04 | 4 | ARCH-01 | — | Worklet + FPS + install on real devices | manual-on-device | In-app PASS/FAIL + `adb dumpsys gfxinfo` / Instruments | ❌ | ⬜ pending |
| 01-04-T3 | 01-04 | 4 | ARCH-01 | T-01-01, T-01-07 | Evidence docs finalized post-approval | unit+script | `npx vitest run && npx tsc --noEmit && npm run assert:skia` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Covered by **Plan 01-02** (depends on Plan 01-01 scaffold):

- [ ] `.nvmrc` + `package.json` `engines` pin Node 24 LTS — Plan 01-01 Task 2
- [ ] `vitest.config.ts` + `vitest@5.0.1` — Plan 01-02 Task 1
- [ ] `tests/core.smoke.test.ts` — ARCH-01 Node import smoke (D-09) — Plan 01-02 Task 1–2
- [ ] `tests/core.purity.test.ts` — no forbidden imports; ≥5 `core/` modules — Plan 01-02 Task 1–2
- [ ] `eslint.config.js` with boundary / restricted-import rules (D-11, D-14) — Plan 01-02 Task 3
- [ ] `docs/layer-contract.md` — written half of ARCH-01 — Plan 01-02 Task 3
- [ ] In-app overlay + metrics modules (`src/runtime/`, `src/render/`) — Plan 01-03
- [ ] `eas.json` with `profiling` profile overlay on; production overlay off — Plan 01-01 Task 2 / Plan 01-04 verify

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Task ID |
|----------|-------------|------------|-------------------|---------|
| Worklet mutates UI-runtime world across frames (dev + release) | ARCH-01 / SC-2 | Requires real UI runtime on hardware | Release + profiling builds; overlay self-check PASS on iPhone + Android | 01-04-T2 |
| ~200–300 SkPicture sprites hold 60 FPS | ARCH-01 / SC-3 | D-05 forbids sim/dev-only evidence | Pixel 6a (or documented substitute); release/profile; `adb shell dumpsys gfxinfo`; 30s window ×2; record methodology | 01-04-T2 |
| Dev-client + paid-ADP EAS internal install on physical iPhone | ARCH-01 / SC-1 / D-17 | Signing + device install | Verify credentials/provisioning before build; install via EAS internal distribution | 01-04-T1, 01-04-T2 |
| Opaque Canvas uses SurfaceView path on Android | ARCH-01 / perf | Platform compositing | Confirm via dumpsys SurfaceFlinger/window after opaque Canvas | 01-04-T2 |
| Skia 2.12.0 confirmed or fallback recorded | ARCH-01 / D-16 | EAS native binary | Assert linked Skia version; document fallback if required | 01-04-T1, 01-04-T3 |

### Device Measurement Protocol (locked)

- **Metrics:** ms/frame, rolling FPS (`1000/mean` over 60 frames), substep count; also record p95/p99 and frames >16.7ms for the methodology doc
- **Verdict tools:** Android `adb shell dumpsys gfxinfo <pkg> framestats`; iOS Instruments as needed; never RN perf monitor alone
- **Build:** release/profiling only for the FPS gate (D-03); never simulator / never claim from dev-only (D-05)
- **Device:** Pixel 6a gate (D-01); physical iPhone for install/feel (D-02); substitute Android only with full D-04 docs + Pixel 6a re-cert before MVP
- **Hygiene:** portrait, awake, discard first ~2s, 30s window, ≥2 runs, note thermal state

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies / manual-on-device justification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 01-02)
- [x] No watch-mode flags
- [x] Feedback latency < 15s for automated suite
- [x] `nyquist_compliant: true` set after plans map task IDs

**Approval:** pending
