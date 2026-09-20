---
phase: 03-first-playable-render-input-bricks-lives-pause
plan: 01
subsystem: core
tags: [vitest, stepRun, serve, lives, win, phase3Grid, SimPhase, worklet]

requires:
  - phase: 02-headless-core-simulation
    provides: stepWorld CCD, resolvePaddleEnglish, SoA World, event ring, loadTestGrid
  - phase: 03-00
    provides: Wave 0 it.todo stubs for rules/grid suites
provides:
  - SimPhase/lives on World with docked allocate/reset
  - loadPhase3Grid D-20 multi-HP + unbreakable layout
  - dockBall/applyServe/processDocked (PHYS-05)
  - applyLivesFromEvents + applyWinCheck/countBreakableAlive (RUN-02)
  - stepRun orchestrator (docked vs playing vs terminal)
affects:
  - 03-03 paddle gesture / launch wiring
  - 03-04 useGameLoop stepping via stepRun
  - 03-05 GameHost overlays reading simPhase/lives

tech-stack:
  added: []
  patterns:
    - Pure worklet rules modules under src/core/rules/
    - stepRun clears events then stepWorld then lives/win while PLAYING
    - resetWorld docks (vx=vy=0); fixtures set free-flight velocity explicitly

key-files:
  created:
    - src/core/levels/phase3Grid.ts
    - src/core/rules/serve.ts
    - src/core/rules/lives.ts
    - src/core/rules/win.ts
    - src/core/stepRun.ts
  modified:
    - src/core/types.ts
    - src/core/allocate.ts
    - src/core/reset.ts
    - src/core/constants.ts
    - src/core/index.ts
    - tests/levels.phase3-grid.test.ts
    - tests/rules.serve.test.ts
    - tests/rules.lives.test.ts
    - tests/rules.win.test.ts
    - tests/core.smoke.test.ts

key-decisions:
  - "SERVE_SPEED=360 and DEFAULT_LIVES=3 as named constants"
  - "resetWorld clears bricks; callers invoke loadPhase3Grid"
  - "stepRun clears event ring at start of PLAYING so lives drain only same-step BALL_OUT"

patterns-established:
  - "Pattern: dock/serve/lives/win stay pure core worklets; pause stays in runtime"
  - "Pattern: Intent.launch finite-guarded; non-finite paddleX leaves prior paddle"

requirements-completed: [PHYS-05, RUN-02]

duration: 2min
completed: 2026-09-20
---

# Phase 03 Plan 01: Core Serve/Lives/Win + stepRun Summary

**Pure headless run rules: docked serve via paddle english, 3-life BALL_OUT, last-breakable win, D-20 grid, orchestrated by `stepRun`**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T04:47:54Z
- **Completed:** 2026-09-20T04:49:52Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Extended World with `lives` / `simPhase`; allocate/reset dock ball (vx=vy=0)
- Shipped hardcoded Phase 3 grid with multi-HP breakables + steel unbreakables
- Implemented serve/lives/win rules and `stepRun` with green Vitest coverage (PHYS-05, RUN-02)

## Task Commits

Each task was committed atomically (TDD RED → GREEN for Task 2):

1. **Task 1:** `e480226` (feat) — SimPhase/lives, docked reset, phase3Grid
2. **Task 2 RED:** `56e2769` (test) — failing serve/lives/win stepRun contracts
3. **Task 2 GREEN:** `8162bcc` (feat) — rules modules + stepRun

**Plan metadata:** (docs commit after this SUMMARY)

## Files Created/Modified

- `src/core/types.ts` — `SimPhase`, `lives`/`simPhase` on World; launch comment
- `src/core/constants.ts` — `DEFAULT_LIVES`, `SERVE_SPEED`
- `src/core/allocate.ts` / `src/core/reset.ts` — docked seed; no free-flight velocity
- `src/core/levels/phase3Grid.ts` — D-20 layout via `loadTestGrid`
- `src/core/rules/serve.ts` — `dockBall`, `applyServe`, `processDocked`
- `src/core/rules/lives.ts` — `applyLivesFromEvents`
- `src/core/rules/win.ts` — `countBreakableAlive`, `applyWinCheck`
- `src/core/stepRun.ts` — docked/playing/terminal orchestrator
- `src/core/index.ts` — barrel exports
- `tests/levels.phase3-grid.test.ts` — multi-HP + unbreakable assertions
- `tests/rules.serve.test.ts` — dock/launch/finite guards
- `tests/rules.lives.test.ts` — BALL_OUT re-dock/LOST + stepRun miss
- `tests/rules.win.test.ts` — last breakable win ignores steel
- `tests/core.smoke.test.ts` — explicit free-flight velocity after docked allocate

## Decisions Made

- Locked discretion defaults: `SERVE_SPEED = 360`, `DEFAULT_LIVES = 3`
- `resetWorld` does not load the Phase 3 grid (tests need empty/custom grids)
- While PLAYING, `stepRun` clears the ring before `stepWorld` so lives only see same-step events

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Purity test false positive on `Math.random` in comment**
- **Found during:** Task 1 verification
- **Issue:** Comment text `no Math.random` matched `core.purity` regex
- **Fix:** Reworded comment to "deterministic layout"
- **Files modified:** `src/core/levels/phase3Grid.ts`
- **Verification:** `npm run test:core` green
- **Committed in:** `e480226`

**2. [Rule 1 - Bug] Smoke test assumed free-flying allocate velocity**
- **Found during:** Task 1 verification
- **Issue:** Docked allocate left ball motionless; smoke asserted position change
- **Fix:** Smoke fixture sets `ballVx/ballVy` after allocate
- **Files modified:** `tests/core.smoke.test.ts`
- **Verification:** smoke + `test:core` green
- **Committed in:** `e480226`

**3. [Rule 3 - Blocking] Lives tests vs clearEvents-at-start of stepRun**
- **Found during:** Task 2 GREEN
- **Issue:** Pre-pushed `BALL_OUT` was cleared before `applyLivesFromEvents` inside `stepRun`
- **Fix:** Unit-test `applyLivesFromEvents` with pushEvent; add stepRun integration via real bottom miss
- **Files modified:** `tests/rules.lives.test.ts`
- **Verification:** rules + `test:core` green
- **Committed in:** `8162bcc`

---

**Total deviations:** 3 auto-fixed (2 Rule 1, 1 Rule 3)
**Impact on plan:** Correctness only; no scope creep.

## Issues Encountered

None beyond the deviations above.

## Known Stubs

None — Wave 0 `it.todo` stubs replaced with real assertions.

## TDD Gate Compliance

- RED commit present: `56e2769`
- GREEN commit present: `8162bcc`
- Optional REFACTOR: not needed

## Threat Flags

None — Intent finite guards (T-03-01) implemented; no new network/auth/file surfaces.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Runtime/host can call `stepRun` instead of bare `stepWorld`
- Gesture layer can set `intent.launch` when docked
- Overlays can read `world.simPhase` / `world.lives`

## Self-Check: PASSED

- FOUND: `src/core/stepRun.ts`, `src/core/rules/serve.ts`, `src/core/rules/lives.ts`, `src/core/rules/win.ts`, `src/core/levels/phase3Grid.ts`
- FOUND commits: `e480226`, `56e2769`, `8162bcc`
- FOUND: `tests/rules.serve.test.ts`, `tests/rules.lives.test.ts`, `tests/rules.win.test.ts`, `tests/levels.phase3-grid.test.ts`

---
*Phase: 03-first-playable-render-input-bricks-lives-pause*
*Completed: 2026-09-20*
