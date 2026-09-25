---
phase: 5
slug: run-rules-score-combo-power-ups-anti-stall
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-20
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.1 (+ fast-check 4.10.2 where useful) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/rules.scoring.test.ts tests/rules.pickups.test.ts tests/rules.lives.test.ts` |
| **Full suite command** | `npm test` / `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted `vitest run` for touched `tests/rules.*.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------------|-----------|-------------------|-------------|--------|
| 05-W0-01 | 00 | 0 | RUN-01 | — | N/A | unit stub | `npx vitest run tests/rules.scoring.test.ts` | ✅ | ⬜ pending |
| 05-W0-02 | 00 | 0 | PWR-01/03 | — | N/A | unit stub | `npx vitest run tests/rules.pickups.test.ts` | ✅ | ⬜ pending |
| 05-W0-03 | 00 | 0 | PWR-02 | — | N/A | unit stub | `npx vitest run tests/rules.effects.test.ts` | ✅ | ⬜ pending |
| 05-W0-04 | 00 | 0 | PWR-01 | — | N/A | unit stub | `npx vitest run tests/rules.multiball.test.ts` | ✅ | ⬜ pending |
| 05-W0-05 | 00 | 0 | PHYS-07 | — | N/A | unit stub | `npx vitest run tests/rules.stall.test.ts` | ✅ | ⬜ pending |
| 05-02-01 | 02 | 2 | RUN-01 | T-05-01 | No Math.random in core scoring | unit | `npx vitest run tests/rules.scoring.test.ts` | Plan 00 stub | ⬜ pending |
| 05-03-01 | 03 | 2 | PWR-01/03 | T-05-01 | Gameplay RNG for drops; AABB catch | unit | `npx vitest run tests/rules.pickups.test.ts` | Plan 00 stub | ⬜ pending |
| 05-03-02 | 03 | 2 | PWR-02 | T-05-03 | Finite paddle clamp after expand | unit | `npx vitest run tests/rules.effects.test.ts` | Plan 00 stub | ⬜ pending |
| 05-03-03 | 03 | 2 | PWR-01 | T-05-03 | Multiball finite velocities / cap | unit | `npx vitest run tests/rules.multiball.test.ts` | Plan 00 stub | ⬜ pending |
| 05-04-01 | 04 | 3 | PWR-01 | T-05-02 | Last-ball life only | unit | `npx vitest run tests/rules.lives.test.ts` | ✅ Wave 0 rewrite (Plan 00); fill 05-04-* on Plan 04 | ⬜ pending |
| 05-05-01 | 05 | 4 | PHYS-07 | T-05-02/03 | Stall on sim ticks; no random jitter | unit | `npx vitest run tests/rules.stall.test.ts` | Plan 00 stub | ⬜ pending |
| 05-01-02 | 01 | 1 | Cross | T-05-01 | Same seed → identical hashWorld | unit | `npx vitest run tests/physics.golden-replay.test.ts` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/rules.scoring.test.ts` — stubs for RUN-01 (hit/break/combo/paddle reset/simultaneous)
- [x] `tests/rules.pickups.test.ts` — stubs for PWR-01/03 drop chance, catch, miss, RNG stream
- [x] `tests/rules.effects.test.ts` — stubs for PWR-02 expand refresh/expire/derive width/clamp
- [x] `tests/rules.multiball.test.ts` — stubs for +2 spawn, maxBalls, preserve velocities
- [x] `tests/rules.stall.test.ts` — stubs for PHYS-07 thresholds, reset, freeze, determinism
- [x] Update `tests/rules.lives.test.ts` — last-ball only; life-reset cleanup preserves score/bricks
- [ ] Extend `hashWorld` + golden replay expectations for new fields

*Existing infrastructure: Vitest + `tests/core.purity.test.ts` cover purity; lives Wave 0 stubs encode last-ball semantics (Plan 04 implements).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Score · N / combo SharedValue chrome visible | RUN-01 SC-1 | Thin runtime mirror; visual | Launch playable; confirm score and combo update on brick hits / paddle reset |
| Stall! tier indicator visible | PHYS-07 SC-5 | Thin runtime mirror; visual | Idle without brick damage ≥8s sim; confirm Stall! + tier escalate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
