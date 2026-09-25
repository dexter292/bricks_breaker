---
phase: E2-balance-pass
status: passed_with_debt
verified: 2026-09-25
requirements: [N-CNT-01, N-CNT-02, N-CNT-03]
owner_signoff: not_obtained
human_uat: skipped_owner_2026_09_25
open_process:
  - ceiling_cert_5d_now_requires_ramp_build
---

# Phase E2 — Verification

**Goal:** N-CNT-01 difficulty curve · N-CNT-02 drop rates / star score bands ·
N-CNT-03 F-45 ball speed ramp ship-or-reject.

**Verdict:** `passed_with_debt`. The engineering is complete and evidence-backed, but E2's
stated acceptance is *"Owner sign-off on the curve"* and that was **not obtained** — the A3
cohort was skipped and owner/device gates were skipped for this run.

## Must-haves

| Truth | Evidence | Status |
|-------|----------|--------|
| Curve is monotone in authored weight | bricks 32/48/55/68/94; HP 55/64/94/132/173 | ✅ |
| Monotonicity cannot regress | `balance.curve-e2` curve test | ✅ |
| Showpiece is the finale | order ends `level-03` | ✅ |
| Reorder does not corrupt saves | v3 keys by `LevelId`; `unlocked` is membership | ✅ |
| Every level still winnable | bot WON on all 5, `bricksRemaining === 0` | ✅ |
| Ramp decision is data-backed | 4 rates × 20 runs table | ✅ |
| Ramp is a floor, not an assignment | faster-ball test leaves `vx/vy` byte-identical | ✅ |
| Anti-stall ×1.08 survives the ramp | ramp ordered before `stepAntiStall` | ✅ |
| SLOW power-up unaffected | scale applied at integration; stored `vx/vy` absolute | ✅ |
| Direction preserved | angle test to 1e-12 | ✅ |
| Cap is exactly `MAX_BALL_SPEED` | cap test | ✅ |
| Ramp is hash-deterministic | `hashWorld(a) === hashWorld(b)` | ✅ |
| Worklet rules hold | `assert-worklet-closures` green | ✅ |
| Score bands rejected on evidence, not vibes | 3.3× / 3.0× spread at equal skill | ✅ |
| Suite green | 79 files / 401 tests; typecheck + lint clean | ✅ |
| Owner sign-off on curve | — | ❌ **not obtained** |
| §5d cert covers shipped build | ramp changes sustained speed | ⏳ **open debt** |

## Requirement IDs

| ID | Outcome |
|----|---------|
| N-CNT-01 | Curve defect found and fixed; validated by authored-weight analysis + headless measurement **instead of** the playtest the requirement text names |
| N-CNT-02 | Evaluated → **no change**. Score-band stars rejected (combo variance); drop table untouched (needs cohort) |
| N-CNT-03 | Evaluated → **ship** at `0.01`/s |

## Carried forward

1. **Owner sign-off** on the new campaign order and the ramp feel.
2. **§5d ceiling re-cert on a ramp build**, capture window past t = 100 s so the cap is
   reached. `SPEED_RAMP_PER_SECOND = 0` reproduces the pre-E2 baseline.
3. **Cohort-dependent tuning** stays open: score-band thresholds (N-CNT-02) and drop weights
   both need human runs. The v3 `{score, stars}` shape is ready for them.
