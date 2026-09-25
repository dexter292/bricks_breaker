---
phase: D1
slug: juice-presentation
status: human_uat_approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-25
updated: 2026-09-25
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
| N-FX-01 | Ghost brick fade on BRICK_BREAK; cascade all members | unit | `npx vitest run tests/vfx.brick-ghosts.test.ts` | ✅ |
| N-FX-01 | No World write; hashWorld stable | unit | `npx vitest run tests/physics.golden-replay.test.ts` + hash snap | ✅ |
| N-FX-03 | Batch coalesce: ≤1 haptic/drain; life > break | unit | `npx vitest run tests/haptics.batch-coalesce.test.ts` | ✅ |
| N-FX-03 | Not gated by reduce-motion intensity; PlayingHost fan-out; ≤1 scheduleOnRN | unit | same + source contracts | ✅ Plan 03 |
| — | Paddle squash draw-only; paddleW unchanged | unit | `npx vitest run tests/vfx.paddle-squash.test.ts` | ✅ |
| — | Mid particleCap still 128 | unit/rg | `npx vitest run tests/runtime.quality-tiers.test.ts` | ✅ |

---

## Wave 0 Requirements

- [x] Brick fade / ghost SoA stubs + GREEN path tests (`tests/vfx.brick-ghosts.test.ts`)
- [x] Haptics batch coalesce tests — memory + expo soft-fail (`tests/haptics.batch-coalesce.test.ts`)
- [x] Paddle squash unit (`tests/vfx.paddle-squash.test.ts`)
- [x] Assert `hashWorld` / golden-replay still green after Wave 1+
- [x] Gate note: ceiling §5c PASS pre-D1; **post-D1 Cert WC required** (ghost quads = render-load delta) — see CEILING-CERT §5c note

---

## N-FX-02 harness locks (docs-only — D-06 / D-07)

Recorded 2026-09-25 (no timed shell / Results code in D1):

- CERT (`GameHost` init) and SOAK (`setShellPhase` Title↔Playing) drive `shellPhase` **instantly**.
- Any future transition animation **must no-op** when `CERT_HARNESS || SOAK_HARNESS` (instant swap). Soak must not gain fade delay.
- No delayed Results overlay (Retry instant locked). No confetti. No star reveal animation on Results in D1.
- See `docs/ops/HAPTICS.md` for N-FX-03; Mid freeze in `docs/ops/QUALITY-TIER.md`; Cert second-run policy in `docs/ops/CEILING-CERT.md` §5c note.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Ball readable during fade | N-FX-01 | Visual | Play level with breaks — ball never hidden | ✅ 2026-09-25 |
| Haptics feel + OS mute | N-FX-03 | Device | System Haptics off → no buzz; on → break/life only; cascade coalesced | ✅ 2026-09-25 |
| Paddle squash cosmetic | FC-F04 | Feel | Hit paddle — visual only; collision unchanged | ✅ 2026-09-25 |
| Post-D1 ceiling | D-05 | Process | Instruments Cert WC **required** after D1 (ghosts + squash = draw load) | ⏳ pending owner measure → stamp §5d |

---

## Validation Sign-Off

- [x] Wave 0 automated verify targets exist (ghost / squash / haptics coalesce)
- [x] All tasks have automated verify or Wave 0 deps
- [x] `nyquist_compliant: true` after Plan 03 code/docs (PlayingHost + expo + consume/draw)

**Approval:** Human UAT: approved 2026-09-25 (owner — ball-readable juice + haptics feel; post-D1 Cert WC still open for §5d)
