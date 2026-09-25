# Phase E2 Plan 00: Balance Pass Summary

**One-liner:** Built a deterministic headless measuring instrument, used it to find and fix
a broken campaign curve, shipped the F-45 speed ramp on the numbers, and declined to guess
at score bands and drop weights without a cohort.

## What shipped

### N-CNT-01 — curve fixed (the big finding)

`level-03` "Neon Gauntlet" is the 10×16 showpiece at **94 bricks / 173 HP — 2.7× the
authored weight of `level-04`** — and it sat at **slot 2**. The campaign's hardest board was
the second thing a new player saw, and everything after it was lighter.

`PLAYABLE_LEVEL_ORDER` is now `01 → 04 → 05 → 06 → 03`: monotone non-decreasing in brick
count (32/48/55/68/94) and HP (55/64/94/132/173), showpiece as finale. Pinned by a
monotonicity test so it cannot silently regress.

Data-safe: v3 keys bests by `LevelId` and `unlocked` is a membership list, so existing saves
keep bests and unlocks; only the forward chain differs.

### N-CNT-03 — F-45 ramp: **shipped**

Probed 4 rates outside core, 20 runs each:

| ramp/s | median clear | slowest | not won |
|--------|--------------|---------|---------|
| 0 (pre-E2) | 195.4 s | 360 s timeout | 1 |
| 0.005 | 136.5 s | 360 s timeout | 1 |
| **0.01** | 142.5 s | 272.9 s | 0 |
| 0.02 | 91.1 s | 209.1 s | 0 |

Chose `0.01` — gentlest rate that removes the "last brick" timeout; hits the 720 cap only at
t = 100 s. Shipped config measured: **median 195.4 → 126.7 s (−35%), slowest 360 s timeout →
223.8 s (−38%), 20/20 won.**

Implemented as a **floor**, not an assignment (`src/core/rules/speedRamp.ts`, called before
`stepAntiStall`), so the anti-stall ×1.08 boost is never erased. SLOW is unaffected — it
scales at integration time and leaves stored `vx/vy` absolute. Driven by `world.tick`, so
`hashWorld` stays reproducible. `SPEED_RAMP_PER_SECOND = 0` disables it in one line.

### N-CNT-02 — score bands and drop rates: **no change, with evidence**

Score spread at *identical bot skill on an identical board*: level-03 15,160 → 50,570
(**3.3×**), level-04 7,030 → 21,020 (3.0×). The spread is pure combo/ricochet luck, so any
fixed score band would mostly measure luck. Score-band stars **rejected for now**; lives
stars and the v3 `{score, stars}` shape kept. Drop table unchanged — N-CNT-02 says "tuned
from playtest" and the bot never dies, so it cannot supply that signal.

## Files

- `src/core/rules/speedRamp.ts` — new
- `src/core/constants.ts` (`SPEED_RAMP_PER_SECOND`), `src/core/index.ts`, `src/core/stepRun.ts`
- `src/services/storage/catalog.ts` — curve order
- `tests/helpers/balanceBot.ts` — new measuring instrument
- `tests/balance.curve-e2.test.ts` — new, 7 guards
- `tests/storage.progress-v2.test.ts`, `tests/storage.progress-v3.test.ts` — order assertions
  rewritten to derive from `PLAYABLE_LEVEL_ORDER` instead of restating it
- `docs/ops/BALANCE-E2.md` — new; `docs/ops/CEILING-CERT.md` — §5d bar raised

## Deviations / notes

- **Bug caught during implementation:** `FIXED_DT = 1/120`, not 1/60. The first ramp draft
  inlined `ticksPerSecond = 60` and ran twice as fast as intended (cap at 50 s). Caught by
  the ramp-floor test before commit.
- `level-01`'s slow bot tail (223.8 s) is a bot artefact — on a 32-brick board the
  degenerate return angle dominates. The curve test pins **authored weight**, not bot time.

## Verification

`npm test` — 79 files / 401 tests (from 78 / 394), worklet-closure, solvability and
EAS-profile asserts green. `npm run typecheck` and `npm run lint` clean.

## Carried debt

- **Owner sign-off on the curve — E2's stated acceptance — not obtained** (cohort skipped).
- **§5d ceiling re-cert now mandatory and harder:** the ramp raises sustained ball speed, so
  every §5/§5b/§5c figure was measured on a build that no longer matches ship. Correctness at
  speed is covered (`PROP-TUNNEL` runs at 2× `MAX_BALL_SPEED`); frame cost is not.
