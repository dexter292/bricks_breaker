---
phase: 05-run-rules-score-combo-power-ups-anti-stall
verified: 2026-09-20T10:20:32Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 5: Run Rules — Score, Combo, Power-ups, Anti-Stall Verification Report

**Phase Goal:** The run rewards skill and risk-taking, and no rally can dead-end
**Verified:** 2026-09-20T10:20:32Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Roadmap success criteria (phase contract). Plan frontmatter truths map into these and were checked in artifacts/links below.

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Consecutive brick hits without paddle contact raise a combo multiplier that resets on paddle contact, and the score visibly reflects it | ✓ VERIFIED | `applyScoringFromEvents`: BRICK_HIT → `SCORE_HIT * combo` then `combo++`; BRICK_BREAK → `(HIT+BONUS)*combo` then `combo++`; PADDLE_HIT → `combo = 1`; unbreakable skipped. Chrome: `useGameLoop` mirrors `scoreOut`/`comboOut` → GameHost reactions → `Score · N` / `×N`. Unit: `tests/rules.scoring.test.ts`. Human UAT chrome approved (05-06). |
| 2 | Destroyed bricks can drop multi-ball and paddle-expand pickups, which apply only when caught on the paddle — nothing auto-collects | ✓ VERIFIED | `applyDropsFromBreaks`: BRICK_BREAK only, `nextFloat(rngGameplay)` @ 0.2 → multiball/expand. `stepPickups`: fall + AABB paddle catch → `spawnMultiballFromPaddle` / `applyOrRefreshExpand`; miss below field removes. No magnetic path. Flat amber rects in `recordSprites`. Human catch UAT approved. |
| 3 | With several balls in play, a life is lost only when the last ball leaves the playfield | ✓ VERIFIED | `applyLivesFromBallCount`: early-return if `activeBallCount > 0`; decrement + dock only at 0. Life reset clears pickups/expand, preserves score (brick HP untouched). `stepRun` order after physics. Tests: last-ball / multi-ball / cleanup green. |
| 4 | While the paddle is expanded, bounce angles respond the same way as at base width, because the angle mapping normalizes to the current width | ✓ VERIFIED | `derivePaddleWidth` sets `paddleW = 72*1.5`; refresh without width stack. `step.ts` passes `paddleHalfW = world.paddleW * 0.5` into `resolvePaddleEnglish` (`t = (ballX-cx)/half`). Effects test asserts expanded-edge angle equals base-edge angle. |
| 5 | A stalled rally escalates visibly and deterministically until it breaks out, with no random bounce jitter | ✓ VERIFIED | `stepAntiStall`: idle tiers at 960/1200/1440; tier2 speed×1.08 clamp; tier3 ±8° nudge; breakable HIT/BREAK resets; PLAYING-only (pause skips `stepRun`). No `Math.random` in `src/`. Chrome: `Stall! · N` when `stallTier > 0`. Human stall visibility approved. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------- | ------- |
| `src/core/constants.ts` | SCORE_*/DROP_*/EXPAND_*/STALL_* | ✓ VERIFIED | SCORE_HIT=10, DROP_CHANCE=0.2, EXPAND 1.5×/1200 ticks, STALL 960/1200/1440 |
| `src/core/types.ts` | score/combo/pickup/stall fields | ✓ VERIFIED | PickupType/EffectType + SoA + stallIdleTicks/stallTier |
| `src/core/step.ts` | compactBallPool | ✓ VERIFIED | Compact after ball loop; paddleHalfW from `paddleW` |
| `src/core/hash.ts` | Mix score/combo/pickups/stall | ✓ VERIFIED | mixU32/mixTyped on those fields |
| `src/core/rules/scoring.ts` | applyScoringFromEvents | ✓ VERIFIED | Wired in stepRun; barrel export |
| `src/core/rules/pickups.ts` | drops + stepPickups | ✓ VERIFIED | gameplay RNG + AABB catch |
| `src/core/rules/effects.ts` | expand refresh/expire/derive | ✓ VERIFIED | No width stack |
| `src/core/rules/multiball.ts` | spawn ±18°/±36° | ✓ VERIFIED | min(2, freeSlots); existing velocities untouched |
| `src/core/rules/lives.ts` | last-ball life | ✓ VERIFIED | activeBallCount gate + D-13 cleanup |
| `src/core/rules/stall.ts` | stepAntiStall | ✓ VERIFIED | Deterministic tiers; no RNG |
| `src/core/stepRun.ts` | Ordered orchestration | ✓ VERIFIED | score→drops→pickups→effects→stall→lives→win |
| `src/runtime/useGameLoop.ts` | score/combo/stallTier mirrors | ✓ VERIFIED | Written each frame from World |
| `app/_components/GameHost.tsx` | React chrome from SVs | ✓ VERIFIED | Separate reactions (score not 8-bit packed) |
| `src/runtime/GameScreen.tsx` | Score · / ×combo / Stall! | ✓ VERIFIED | Conditional Stall! on tier>0 |
| `src/render/recordSprites.ts` | Flat pickup rects | ✓ VERIFIED | Amber drawRect; paddle uses `paddleW` |
| `tests/rules.*.test.ts` | Phase 5 suites | ✓ VERIFIED | scoring/pickups/effects/multiball/stall/lives — 34/34 pass; no it.todo |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | ---- | ------ | ------- |
| Event ring BRICK_HIT/BREAK/PADDLE_HIT | world.score / combo | applyScoringFromEvents | ✓ WIRED | Called from stepRun after stepWorld |
| BRICK_BREAK | pickup SoA | nextFloat(rngGameplay) | ✓ WIRED | applyDropsFromBreaks |
| Pickup AABB catch | multiball / expand | spawn / applyOrRefreshExpand | ✓ WIRED | stepPickups overlap branch |
| stepRun PLAYING | rules modules | ordered post-stepWorld calls | ✓ WIRED | Exact order matches plan 04/05 |
| activeBallCount === 0 | lives-- | applyLivesFromBallCount | ✓ WIRED | No BALL_OUT scan |
| stepRun PLAYING | stepAntiStall | after effects, before lives | ✓ WIRED | Confirmed in stepRun.ts |
| Breakable damage events | stallIdleTicks = 0 | hasBreakableDamage scan | ✓ WIRED | stall.ts |
| useGameLoop | GameHost / GameScreen | scoreOut/comboOut/stallTierOut | ✓ WIRED | Reactions + HUD text |
| recordFrame | pickup SoA | drawRect active pickups | ✓ WIRED | pickupActive/X/Y |
| stepWorld paddle bounce | current paddleW | resolvePaddleEnglish(half) | ✓ WIRED | paddleHalfW = paddleW*0.5 |
| BALL_OUT / ball loop | activeBallCount | compactBallPool | ✓ WIRED | End of stepWorld |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| GameScreen Score | `score` | scoreOut SV ← `w.score` each frame | Yes — scoring rules | ✓ FLOWING |
| GameScreen combo | `combo` | comboOut SV ← `w.combo` | Yes — hit/paddle events | ✓ FLOWING |
| GameScreen Stall! | `stallTier` | stallTierOut ← `w.stallTier` | Yes — stepAntiStall | ✓ FLOWING |
| recordSprites pickups | pickupX/Y/Active | applyDropsFromBreaks + stepPickups | Yes — BREAK RNG + fall | ✓ FLOWING |
| Expanded paddle draw | `world.paddleW` | derivePaddleWidth / stepEffects | Yes — effect SoA | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Phase 5 rule suites | `npm test -- --run tests/rules.{scoring,pickups,effects,multiball,stall,lives}.test.ts` | 6 files, 34/34 passed | ✓ PASS |
| No Math.random in core rules | `rg Math.random src/core/rules` | No matches | ✓ PASS |
| No Math.random in src/ | `rg Math.random src/` | No matches | ✓ PASS |
| stepRun orchestration | grep stepRun PLAYING path | score→drops→pickups→effects→stall→lives→win | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| RUN-01 | 00, 01, 02, 04, 06 | Score + combo for consecutive brick hits without paddle contact | ✓ SATISFIED | scoring.ts + chrome + tests |
| PWR-01 | 00, 01, 03, 04 | Multi-ball drops; life only on last ball | ✓ SATISFIED | pickups/multiball/lives + tests |
| PWR-02 | 00, 01, 03, 04 | Paddle-expand drops; bounce normalizes to current width | ✓ SATISFIED | effects + resolvePaddleEnglish(half) + test |
| PWR-03 | 00, 01, 03, 04, 06 | Catch on paddle only (no auto-collect) | ✓ SATISFIED | AABB catch; no magnet; UAT catch approved |
| PHYS-07 | 00, 01, 05, 06 | Visible deterministic anti-stall; no random jitter | ✓ SATISFIED | stall.ts tiers + Stall! chrome; no Math.random |

No orphaned Phase 5 requirements in REQUIREMENTS.md beyond these five. All plan-declared IDs accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `src/core/stepRun.ts` | ~51–53 | Lives before win on same frame (05-REVIEW WR-01) | ℹ️ Info | Edge: clear board + last ball out on final life → LOST not WON. Does not break must-haves / SC. Advisory only. |
| `src/runtime/GameScreen.tsx` | ~115–117 | Stall! while DOCKED if tier>0 (05-REVIEW WR-02) | ℹ️ Info | D-18 keeps stall at run level; chrome not gated to PLAYING. SC-5 still met (visible escalation during play). Advisory only. |

No blocker stubs. Wave 0 `it.todo` files are fully green. No TODO/FIXME/placeholder in Phase 5 rule path.

### Human Verification Required

None pending. Plan 05-06 human checkpoint (Score/combo/Stall! chrome + pickup catch) was approved during execute-phase (`approved`, 2026-09-20). Codebase chrome mirrors and catch-only pickup path match that approval; no contradiction found.

### Gaps Summary

No actionable gaps. All five roadmap success criteria are implemented, wired, and covered by unit tests. Advisory review findings (lives-before-win same-frame; Stall chrome while docked) do not violate must-haves or success criteria and are recorded as INFO only.

**Phase can be marked complete.**

---

_Verified: 2026-09-20T10:20:32Z_
_Verifier: Claude (gsd-verifier)_
