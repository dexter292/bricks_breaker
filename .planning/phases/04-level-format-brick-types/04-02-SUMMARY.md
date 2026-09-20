---
phase: 04-level-format-brick-types
plan: 02
subsystem: core
tags: [levels, compile, apply, spatial, LVL-01, LVL-03, vitest]

requires:
  - phase: 04-level-format-brick-types
    provides: schema validate migrate loadAndCompile (04-01)
provides:
  - Real compileLevel packing into CompiledLevel typed arrays
  - applyCompiledLevel worklet SoA fill with capacity cap
  - assignSpatialBrickCells in spatial.ts
  - assets/levels/level-01.json (phase3 migration) + level-02.json corridor
affects:
  - 04-03 brick visuals / damage cues
  - 04-04 GameHost load wiring + phase3Grid deletion

tech-stack:
  added: []
  patterns:
    - validate → compile (JS) → applyCompiledLevel (worklet); never apply on ok:false
    - Spatial broadphase when gridRows>1; loadTestGrid kept for physics unit tests
    - Level JSON under assets/levels; tests load via readFileSync

key-files:
  created:
    - src/core/levels/apply.ts
    - src/core/levels/spatial.ts
    - assets/levels/level-01.json
    - assets/levels/level-02.json
  modified:
    - src/core/levels/compile.ts
    - src/core/levels/phase3Grid.ts
    - src/core/index.ts
    - src/core/reset.ts
    - tests/levels.compile.test.ts
    - tests/levels.apply.test.ts
    - tests/levels.phase3-grid.test.ts

key-decisions:
  - "level-02 uses a full mid-row steel corridor (XXXXXXX) plus side walls for structural differentiation"
  - "apply falls back to packed 1-row cell map when compiled.gridRows<=1"
  - "phase3Grid re-exports assignSpatialBrickCells until Plan 04-04 deletion"

patterns-established:
  - "Pattern: compileLevel skips '.' and sets flags from unbreakable → BrickFlags.UNBREAKABLE"
  - "Pattern: applyCompiledLevel min(brickCount, world.brickX.length) then assignSpatialBrickCells"
  - "Pattern: playable tests use loadAndCompile + apply — not loadPhase3Grid"

requirements-completed: [LVL-01, LVL-03]

duration: 3min
completed: 2026-09-20
---

# Phase 04 Plan 02: Compile, Apply & Level Assets Summary

**Real compile/apply pipeline with level-01 (phase3 migration) and level-02 steel corridor, green Vitest through the shared loadAndCompile path**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-20T07:28:58Z
- **Completed:** 2026-09-20T07:31:55Z
- **Tasks:** 2/2
- **Files modified:** 11 created/modified

## Accomplishments

- Replaced `compileLevel` stub with JS-thread packing (positions from origin+gap; unbreakable → `BrickFlags.UNBREAKABLE`)
- Authored `level-01.json` (7×5, brickCount 35, multi-HP + steel) and `level-02.json` (corridor channel, distinct fingerprint)
- Implemented `applyCompiledLevel` + moved `assignSpatialBrickCells` to `spatial.ts`; playable tests no longer import `loadPhase3Grid`

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): compile + asset tests** - `f567ff2` (test)
2. **Task 1 (GREEN): compileLevel + level-01/02** - `040c2de` (feat)
3. **Task 2 (RED): apply + retargeted grid tests** - `4b8fac2` (test)
4. **Task 2 (GREEN): applyCompiledLevel + spatial** - `2a2ec6f` (feat)

**Plan metadata:** (pending docs commit)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## Files Created/Modified

- `src/core/levels/compile.ts` — packs validated `LevelFileV1` into `CompiledLevel`
- `src/core/levels/apply.ts` — worklet SoA fill + spatial when `gridRows>1`
- `src/core/levels/spatial.ts` — `assignSpatialBrickCells` (moved from phase3Grid)
- `src/core/levels/phase3Grid.ts` — re-exports spatial; `loadPhase3Grid` kept for GameHost until 04-04
- `src/core/index.ts` — exports `applyCompiledLevel` + spatial from new modules
- `src/core/reset.ts` — comment points callers at apply/loadTestGrid
- `assets/levels/level-01.json` / `level-02.json` — authored playable layouts
- `tests/levels.compile.test.ts` / `apply.test.ts` / `phase3-grid.test.ts` — shared pipeline coverage

## Decisions Made

- level-02 mid-row full steel wall + side `X` columns for corridor channeling vs open level-01
- apply uses packed 1-row fallback when `compiled.gridRows <= 1` (mirrors loadTestGrid for thin grids)

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED commits present: `f567ff2`, `4b8fac2`
- GREEN commits present after RED: `040c2de`, `2a2ec6f`

## Threat Flags

None — apply capacity cap (T-04-01) and no-mutate-on-failed-validate test (T-04-03) match plan threat model; no new network/auth surfaces.

## Known Stubs

None — `compileLevel` no longer throws; assets are real layouts.

## Verification Results

- `npx vitest run tests/levels.compile.test.ts tests/levels.validate.test.ts` — pass
- `npx vitest run tests/levels.apply.test.ts tests/levels.compile.test.ts tests/levels.phase3-grid.test.ts tests/rules.win.test.ts` — pass
- `npm run test:core` / `npm test` — 78 passed, 1 unrelated todo

## Self-Check: PASSED

- Artifacts found: level-01/02 JSON, compile.ts, apply.ts, spatial.ts, 04-02-SUMMARY.md
- Commits found: f567ff2, 040c2de, 4b8fac2, 2a2ec6f
