---
phase: 1
slug: foundation-thread-boundary-spike
status: draft
nyquist_compliant: false
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
| **Config file** | `vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `npx vitest run src/core` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit && npx eslint .` |
| **Estimated runtime** | ~5–15 seconds (unit/lint); device gates are manual |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/core` (once Wave 0 lands)
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit && npx eslint .`
- **Before every EAS build:** `npx expo-doctor@latest` + assert installed Skia version
- **Before `/gsd-verify-work`:** Full suite green **and** release/profile device measurements recorded
- **Max feedback latency:** ~15 seconds for automated suite

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | ARCH-01 | T-01-01 | Overlay flag off in production profile | unit | `npx vitest run tests/core.smoke.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ARCH-01 | — | `core/` has no RN/Skia/Reanimated imports | unit | `npx vitest run tests/core.purity.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ARCH-01 | — | Illegal `core/` import fails lint | lint | `npx eslint .` (negative probe) | ❌ W0 | ⬜ pending |
| TBD | TBD | 1+ | ARCH-01 | — | No `runOnJS`/`scheduleOnRN` on hot path | lint | `npx eslint .` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2+ | ARCH-01 | — | Worklet world mutation on device | manual-on-device | In-app PASS/FAIL + release build | ❌ | ⬜ pending |
| TBD | TBD | 2+ | ARCH-01 | — | ~200–300 sprites @ 60 FPS on Pixel 6a | manual-on-device | `adb dumpsys gfxinfo` + overlay | ❌ | ⬜ pending |
| TBD | TBD | 2+ | ARCH-01 | — | Dev-client + release install iOS/Android | manual-on-device | EAS install + launch | ❌ | ⬜ pending |

*Planner must replace TBD task IDs when plans are written. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.nvmrc` + `package.json` `engines` pin Node 24 LTS
- [ ] `vitest.config.ts` + `vitest@5.0.1`
- [ ] `tests/core.smoke.test.ts` — ARCH-01 Node import smoke (D-09)
- [ ] `tests/core.purity.test.ts` — no forbidden imports; ≥5 `core/` modules
- [ ] `eslint.config.js` with boundary / restricted-import rules (D-11, D-14)
- [ ] `docs/layer-contract.md` — written half of ARCH-01
- [ ] In-app overlay + metrics modules (`src/runtime/`, `src/render/`)
- [ ] `eas.json` with `profiling` profile that keeps overlay on in release-style build; production profile has overlay off

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Worklet mutates UI-runtime world across frames (dev + release) | ARCH-01 / SC-2 | Requires real UI runtime on hardware | Release + profiling builds; overlay self-check PASS on iPhone + Android |
| ~200–300 SkPicture sprites hold 60 FPS | ARCH-01 / SC-3 | D-05 forbids sim/dev-only evidence | Pixel 6a (or documented substitute); release/profile; `adb shell dumpsys gfxinfo`; 30s window ×2; record methodology |
| Dev-client + paid-ADP EAS internal install on physical iPhone | ARCH-01 / SC-1 / D-17 | Signing + device install | Verify credentials/provisioning before build; install via EAS internal distribution |
| Opaque Canvas uses SurfaceView path on Android | ARCH-01 / perf | Platform compositing | Confirm via dumpsys SurfaceFlinger/window after opaque Canvas |
| Skia 2.12.0 confirmed or fallback recorded | ARCH-01 / D-16 | EAS native binary | Assert linked Skia version; document fallback if required |

### Device Measurement Protocol (locked)

- **Metrics:** ms/frame, rolling FPS (`1000/mean` over 60 frames), substep count; also record p95/p99 and frames >16.7ms for the methodology doc
- **Verdict tools:** Android `adb shell dumpsys gfxinfo <pkg> framestats`; iOS Instruments as needed; never RN perf monitor alone
- **Build:** release/profiling only for the FPS gate (D-03); never simulator / never claim from dev-only (D-05)
- **Device:** Pixel 6a gate (D-01); physical iPhone for install/feel (D-02); substitute Android only with full D-04 docs + Pixel 6a re-cert before MVP
- **Hygiene:** portrait, awake, discard first ~2s, 30s window, ≥2 runs, note thermal state

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s for automated suite
- [ ] `nyquist_compliant: true` set in frontmatter after plans map task IDs

**Approval:** pending
