---
phase: 7
slug: feedback-neon-vfx-audio
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-20
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
| 07-W0-01 | 00 | 0 | FX-01 | — | N/A | unit | `npx vitest run tests/vfx.trails.test.ts` | ❌ W0 | ⬜ pending |
| 07-W0-02 | 00 | 0 | FX-02 | — | N/A | unit | `npx vitest run tests/vfx.particles.test.ts` | ❌ W0 | ⬜ pending |
| 07-W0-03 | 00 | 0 | FX-02 | — | N/A | unit | `npx vitest run tests/vfx.shake.test.ts` | ❌ W0 | ⬜ pending |
| 07-W0-04 | 00 | 0 | FX-02 | — | N/A | unit | `npx vitest run tests/vfx.intensity.test.ts` | ❌ W0 | ⬜ pending |
| 07-W0-05 | 00 | 0 | FX-03 | — | N/A | unit | `npx vitest run tests/events.fx.test.ts` | ❌ W0 | ⬜ pending |
| 07-W0-06 | 00 | 0 | FX-03 | — | N/A | unit | `npx vitest run tests/audio.mapping.test.ts` | ❌ W0 | ⬜ pending |
| 07-W0-07 | 00 | 0 | FX-03 | — | N/A | unit | `npx vitest run tests/runtime.event-drain.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | FX-01/02 | — | N/A | manual-on-device | `adb shell dumpsys gfxinfo … framestats` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs above are Wave 0 placeholders — planner will replace with concrete plan/task IDs.*

---

## Wave 0 Requirements

- [ ] `tests/vfx.trails.test.ts` — FX-01 length/bounds
- [ ] `tests/vfx.particles.test.ts` — FX-02 pool/cap/intensity
- [ ] `tests/vfx.shake.test.ts` — FX-02 merge/cap/decay
- [ ] `tests/vfx.intensity.test.ts` — reduce-motion mapping
- [ ] `tests/events.fx.test.ts` — new EventCodes + push sites
- [ ] `tests/audio.mapping.test.ts` — routing + voice limit (mock players)
- [ ] `tests/runtime.event-drain.test.ts` — multi-substep snapshot semantics
- [ ] `npx expo install expo-audio` + app plugin config (mic off)
- [ ] ESLint / `docs/layer-contract.md` updates: `runtime→vfx`, `render→vfx`, batched drain exception

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pixel 6a worst-case frame budget (multi-ball × particles × glow) | FX-01/02 | Device gfxinfo; Phase 1 harness exists but device gate open | Run worst-case scene on Pixel 6a; `adb shell dumpsys gfxinfo com.dexter292.bricksbreaker framestats`; confirm within Phase 1 budget |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
