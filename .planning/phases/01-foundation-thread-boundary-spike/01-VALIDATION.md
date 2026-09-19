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
| **Framework** | vitest 5.0.1 (Node 24 LTS — D-18) |
| **Config file** | `vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `npx vitest run src/core` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit && npx eslint .` |
| **Estimated runtime** | ~5–30 seconds local; device gates are manual |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/core`
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit && npx eslint .`
- **Before every EAS build:** `npx expo-doctor@latest` + assert resolved Skia version
- **Before `/gsd-verify-work`:** Full suite green **and** release/profile device measurements recorded
- **Max feedback latency:** ~30 seconds for automated suite

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | ARCH-01 | T-1-01 | Overlay off in production profile | unit | `npx vitest run tests/core.smoke.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ARCH-01 | — | N/A | unit | `npx vitest run tests/core.purity.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ARCH-01 | — | N/A | lint | `npx eslint .` | ❌ W0 | ⬜ pending |

*Planner fills concrete Task IDs. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Node 24 LTS via nvm/fnm — `.nvmrc` + `engines` (D-18)
- [ ] `vitest.config.ts` + vitest 5.0.1
- [ ] `tests/core.smoke.test.ts` — ARCH-01 Node import smoke (D-09)
- [ ] `tests/core.purity.test.ts` — no forbidden imports; ≥5 core modules transitive
- [ ] `eslint.config.js` with boundary rules — illegal `core/` import fails lint
- [ ] `docs/layer-contract.md` — written layer contract
- [ ] In-app overlay + self-check (ms/FPS/substeps) behind profiling env flag (not `__DEV__` alone)
- [ ] `eas.json` with `development`, `profiling` (overlay on), `production` (overlay off)
- [ ] Apple signing credentials verified before first iOS EAS build (D-17)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dev-client + release/profile installs on Pixel 6a (or documented substitute) and physical iPhone | ARCH-01 / SC-1 | Requires real devices + EAS signing | Build, install, launch; record Skia version resolution |
| Worklet mutates UI-runtime world across frames in **dev and release** | ARCH-01 / SC-2 | UI runtime only exists on device | In-app PASS/FAIL self-check on tick + sprite mutation |
| ~200–300 SkPicture sprites hold 60 FPS on Pixel 6a release/profile | ARCH-01 / SC-3 | D-05 forbids sim/dev evidence | Overlay + `adb shell dumpsys gfxinfo` framestats; 30s window; document methodology |
| Opaque Canvas uses SurfaceView path on Android | ARCH-01 | Platform compositing | `adb` SurfaceFlinger/window dumps |
| Performance cliff ramp recorded | D-07 | Research artifact | Increase sprite count until budget breaks; write results note |

---

## Device Gate Protocol (locked)

- **Android FPS gate:** Pixel 6a (substitute allowed with full docs; re-certify on 6a before MVP)
- **iOS:** Physical iPhone via paid Apple Developer + EAS internal distribution
- **Build for FPS verdict:** release/profile only — never simulator, never claim from dev-client alone
- **Overlay metrics:** ms/frame, rolling FPS, substep count + written methodology

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s for automated suite
- [ ] `nyquist_compliant: true` set in frontmatter after plans map tasks

**Approval:** pending
