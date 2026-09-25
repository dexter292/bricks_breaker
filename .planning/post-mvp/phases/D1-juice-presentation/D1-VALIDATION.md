---
phase: D1
slug: juice-presentation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-25
---

# Phase D1 — Validation Strategy

> N-FX-01 (brick fade), N-FX-03 (haptics), paddle squash; Mid freeze; hashWorld unchanged.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/vfx.* tests/haptics.* tests/physics.golden-replay.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~40 seconds |

---

## Sampling Rate

- **After every task commit:** quick run (vfx + haptics + golden-replay)
- **After every plan wave:** `npm test`
- **Before verify-work:** full suite green + golden-replay green
- **Max feedback latency:** 60 seconds

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| N-FX-01 | Ghost brick fade on BRICK_BREAK; cascade all members | unit | `npx vitest run tests/vfx.brick-fade.test.ts` | ❌ W0 |
| N-FX-01 | No World write; hashWorld stable | unit | `npx vitest run tests/physics.golden-replay.test.ts` + hash snap | ✅ golden |
| N-FX-03 | Batch coalesce: ≤1 haptic/drain; life > break | unit | `npx vitest run tests/haptics.batch.test.ts` | ❌ W0 |
| N-FX-03 | Not gated by reduce-motion intensity | unit | same | ❌ W0 |
| — | Paddle squash draw-only; paddleW unchanged | unit | `tests/vfx.paddle-squash.test.ts` | ❌ W0 |
| — | Mid particleCap still 128 | unit/rg | quality tier / types | ✅ |

---

## Wave 0 Requirements

- [ ] Brick fade / ghost SoA stubs + GREEN path tests
- [ ] Haptics batch coalesce tests (mock expo-haptics)
- [ ] Paddle squash unit
- [ ] Assert `hashWorld` / golden-replay still green after Wave 1+
- [ ] Gate note: ceiling §5c already PASS; no second Cert unless render load changes

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ball readable during fade | N-FX-01 | Visual | Play Cert WC / level with breaks — ball never hidden |
| Haptics feel + OS mute | N-FX-03 | Device | System Haptics off → no buzz; on → break/life only |
| Paddle squash cosmetic | FC-F04 | Feel | Hit paddle — visual only; collision unchanged |
| No second ceiling | D-05 | Process | Only if D1 violates Mid freeze |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 deps
- [ ] `nyquist_compliant: true` after Wave 0 lands

**Approval:** pending
