---
phase: 7
slug: feedback-neon-vfx-audio
status: in-progress
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-20
updated: 2026-09-20
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.1 (Node env) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:core` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:core` (+ new VFX/audio unit files as they land)
- **After every plan wave:** Run `npm test` + eslint boundaries
- **Before `/gsd-verify-work`:** Full suite must be green + Pixel 6a (or D-04) gfxinfo note for VFX-on worst-case
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-W0-01 | 00 | 0 | FX-01 | — | N/A | unit | `npx vitest run tests/vfx.trails.test.ts` | ✅ | ✅ green |
| 07-W0-02 | 00 | 0 | FX-02 | — | N/A | unit | `npx vitest run tests/vfx.particles.test.ts` | ✅ | ✅ green |
| 07-W0-03 | 00 | 0 | FX-02 | — | N/A | unit | `npx vitest run tests/vfx.shake.test.ts` | ✅ | ✅ green |
| 07-W0-04 | 00 | 0 | FX-02 | — | N/A | unit | `npx vitest run tests/vfx.intensity.test.ts` | ✅ | ✅ green |
| 07-W0-05 | 00 | 0 | FX-03 | — | N/A | unit | `npx vitest run tests/events.fx.test.ts` | ✅ | ✅ green |
| 07-W0-06 | 00 | 0 | FX-03 | — | N/A | unit | `npx vitest run tests/audio.mapping.test.ts` | ✅ | ✅ green |
| 07-W0-07 | 00 | 0 | FX-03 | — | N/A | unit | `npx vitest run tests/runtime.event-drain.test.ts` | ✅ | ✅ green |
| 07-P06-DEV | 06 | 5 | FX-01/02 | T-07-25 | gfxinfo methodology; no RN Perf Monitor alone | manual-on-device | `adb shell dumpsys gfxinfo com.dexter292.bricksbreaker framestats` — see [`docs/phase7-vfx-measurement.md`](../../../docs/phase7-vfx-measurement.md) | ✅ doc | ⬜ manual |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⬜ manual*

**Phase gate notes (Plan 06):** Full automated suite green 2026-09-20 — `npm test` 34 files / 157 tests. Wave 0→5 automated rows above are ✅. Device gfxinfo remains **manual-only** until human measurement per `docs/phase7-vfx-measurement.md` (Pixel 6a preferred; D-04 simulator/substitute = MVP debt — physical re-cert). Human UAT (Task 2) pending.

---

## Wave 0 Requirements

- [x] `tests/vfx.trails.test.ts` — FX-01 length/bounds
- [x] `tests/vfx.particles.test.ts` — FX-02 pool/cap/intensity
- [x] `tests/vfx.shake.test.ts` — FX-02 merge/cap/decay
- [x] `tests/vfx.intensity.test.ts` — reduce-motion mapping
- [x] `tests/events.fx.test.ts` — new EventCodes + push sites
- [x] `tests/audio.mapping.test.ts` — routing + voice limit (mock players)
- [x] `tests/runtime.event-drain.test.ts` — multi-substep snapshot semantics
- [x] `npx expo install expo-audio` + app plugin config (mic off)
- [x] ESLint / `docs/layer-contract.md` updates: `runtime→vfx`, `render→vfx`, batched drain exception

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pixel 6a worst-case frame budget (multi-ball × particles × glow) | FX-01/02 | Device gfxinfo; Phase 1 harness exists but device gate open | Follow [`docs/phase7-vfx-measurement.md`](../../../docs/phase7-vfx-measurement.md): worst-case VFX-on scene; `adb shell dumpsys gfxinfo com.dexter292.bricksbreaker framestats`; confirm within Phase 1 budget (or D-04 waiver with MVP re-cert debt) |
| Trail / particles / shake / SFX clarity (FX-01/02/03) | FX-01/02/03 | Subjective spectacle + overlapping SFX | Plan 06 Task 2 human UAT checklist |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter (automated Wave 0→5 green; device gfxinfo remains manual)

**Approval:** pending Human UAT (Plan 06 Task 2) — do not mark `Human UAT: approved` until human responds
