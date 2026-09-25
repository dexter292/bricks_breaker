---
phase: 09-run-telemetry-storage-v4
status: diagnosed
tested_on: iPhone 17 simulator (iOS 26.5), Metro dev bundle
tested: 2026-09-25
---

# Phase 9 — Device UAT

Run by the orchestrator on the simulator, reading the real AsyncStorage blob from the app
container rather than trusting in-app display:
`.../Application Support/com.dexter292.bricksbreaker/RCTAsyncLocalStorage_V1`

## Checkpoint 1 — abandoned-run flush

**Procedure:** relaunch app → Play → Level 01 → tap to launch → ~9s of play (score reached
60, one brick visibly destroyed, one life lost 3→2) → Pause → Menu.

| Assertion | Expected | Actual | Verdict |
|---|---|---|---|
| Exactly one `abandoned` entry in `recentRuns` | 1 | **1** | ✅ |
| `runsAbandoned` lifetime counter | 1 | **1** | ✅ |
| `bricksBroken > 0` | ≥1 | **0** | ❌ |
| `ticks` reflects ~9s of play (~1000 at 120 t/s) | ~1000 | **2** | ❌ |
| `livesLost` (HUD showed 3→2) | ≥1 | **0** | ❌ |
| `longestRally` (ball hit the paddle repeatedly) | ≥1 | **0** | ❌ |
| `bestCombo` | >1 | 1 (the initial value, not accumulation) | ❌ |

**The abandon funnel works. The counters do not reach storage.**

## Diagnosis

`wallClockMs` came through correctly (30157 ms, consistent with elapsed play). It is read
from a React ref in the app layer. Every field that is wrong is read from the game loop's
SharedValues instead — so the wiring is not reading stale *objects* (the handle exports the
same `world` and `runStats: runStatsSv` the loop writes), it is reading them **after they
were zeroed**.

`useGameLoop.ts:370-384` resets the world (`applyRetryWorldReset`, tick → 0) and zeroes the
counters (`resetRunStats`) whenever `resetRequest.value !== resetApplied.value`. `tick: 2`
rather than `0` says the reset landed ~2 frames before the snapshot and then the loop
stopped stepping — which is what a pause does. `handleMenuPress` correctly snapshots before
calling `onMenu()`, so the zeroing happened **earlier than the Menu press**, around the
pause transition.

Ordering inside `handleMenuPress` is not the bug. The bug is that a reset fires while a run
is still in progress, so the run's counters are gone before any run-end path can read them.

## Checkpoint 2 — wall clock excludes pause

**Not run.** Blocked: with counters zeroing mid-run the measurement would not be
attributable. `wallClockMsTotal` of 30157 ms against roughly 30 s of wall time that included
~10 s paused is *suggestive* that pause is not being excluded, but this is not a clean
measurement and is explicitly **not** being recorded as a result either way.

## Verdict

**Phase 9 is NOT verified.** N-STAT-02 (storage, migration, fail-soft) looks sound — the v4
blob exists, migrated, and the abandoned entry persisted correctly. N-STAT-01 fails on
device: the counters the phase exists to record are zero.

Automated tests did not catch this because they exercise `reduceRunTelemetry` directly with
a synthetic world, never through the reset-request path a real pause takes.

## Gap to close

1. Find what bumps `resetRequest` around the pause/`uiPhase` transition and stop it firing
   mid-run, or snapshot counters before the reset applies.
2. Add a regression test that drives a run through pause → menu via the reset-request path,
   not just the reducer in isolation.
3. Re-run both checkpoints afterwards.
