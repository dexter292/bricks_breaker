---
phase: 04-level-format-brick-types
plan: 01
subsystem: core
tags: [levels, validate, schema, migrations, LVL-01, vitest]

requires:
  - phase: 04-level-format-brick-types
    provides: Wave 0 invalid fixtures + validate test stubs (04-00)
provides:
  - SCHEMA_VERSION / LevelFileV1 / CompiledLevel types
  - Hand-rolled validateLevel with actionable ValidationIssue paths
  - migrateLevel v1 identity + migrations README
  - loadAndCompile fail-closed compose (compile stub)
affects:
  - 04-02 compile + applyCompiledLevel
  - 04-04 GameHost load wiring

tech-stack:
  added: []
  patterns:
    - Hand-rolled validateLevel Result (no Zod); never trim row strings
    - loadAndCompile = validate → migrate → compile; fail before World
    - compileLevel stub throws until Plan 04-02

key-files:
  created:
    - src/core/levels/schema.ts
    - src/core/levels/validate.ts
    - src/core/levels/migrations/index.ts
    - src/core/levels/migrations/README.md
    - src/core/levels/load.ts
    - src/core/levels/compile.ts
  modified:
    - src/core/index.ts
    - tests/levels.validate.test.ts

key-decisions:
  - "Prefer compile stub (a) over short-circuit placeholder so load imports compileLevel"
  - "brickTypes stored via Object.create(null) after dangerous-key rejection"
  - "TDD: RED tests commit before GREEN schema/validate"

patterns-established:
  - "Pattern: validateLevel never mutates World; issues use cells[r][c] paths"
  - "Pattern: MAX_BRICKS caps both cols*rows and non-empty cell count"
  - "Pattern: loadAndCompile returns ok:false without calling compile on validate failure"

requirements-completed: [LVL-01]

duration: 2min
completed: 2026-09-20
---

# Phase 04 Plan 01: Level Schema & Validate Gate Summary

**Hand-rolled schemaVersion-1 validateLevel with security caps, v1-identity migrate, and fail-closed loadAndCompile before a Plan-02 compile stub**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T07:25:12Z
- **Completed:** 2026-09-20T07:27:02Z
- **Tasks:** 2/2
- **Files modified:** 8 created/modified

## Accomplishments

- Implemented `SCHEMA_VERSION`, `LevelFileV1`, `BrickTypeDef`, `CompiledLevel`, `ValidationIssue` without Zod
- `validateLevel` rejects unsupported versions, bad rows/chars/spaces, non-finite grid metrics, dangerous `brickTypes` keys, and oversize grids/brick counts with path-aware issues
- `loadAndCompile` composes validate → migrate → compile stub; invalid input returns `{ ok: false }` without throwing

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): schema types + validateLevel tests** - `70f6b01` (test)
2. **Task 1 (GREEN): schema + validateLevel** - `7837538` (feat)
3. **Task 2: migrations + loadAndCompile + compile stub** - `185de60` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/core/levels/schema.ts` — SCHEMA_VERSION + authoring/compiled types
- `src/core/levels/validate.ts` — hand-rolled validateLevel (D-01…D-03, T-04-01/02/04)
- `src/core/levels/migrations/index.ts` — v1 identity migrateLevel
- `src/core/levels/migrations/README.md` — how to add v1→v2
- `src/core/levels/compile.ts` — stub throws until 04-02
- `src/core/levels/load.ts` — loadAndCompile orchestration
- `src/core/index.ts` — barrel exports for levels pipeline
- `tests/levels.validate.test.ts` — green fixture + MAX_BRICKS + loadAndCompile fail-closed tests

## Decisions Made

- Chose plan option (a): tiny `compileLevel` stub so `loadAndCompile` can import it; full packing deferred to 04-02
- Built validated `brickTypes` on a null-prototype object after rejecting `__proto__` / `constructor` / `prototype`
- Kept `loadPhase3Grid` export until Plan 04 removal (per plan)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `src/core/levels/compile.ts` | `compileLevel` throws `implement in plan 04-02` | Intentional Plan 01 scope; Plan 02 replaces body |
| `tests/levels.compile.test.ts` | remaining `it.todo` | Wave 0 — Plan 02 fills |
| `tests/levels.apply.test.ts` | remaining `it.todo` | Wave 0 — Plan 02 fills |
| `tests/levels.damage-cues.test.ts` | remaining `it.todo` | Wave 0 — Plan 03 fills |

Intentional: validate suite is green; compile stub does not block Plan 01 success criteria (fail-closed before compile).

## Threat Flags

None — no new network/auth/file surfaces beyond planned JSON validate gate.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 can replace `compileLevel` stub and fill compile/apply tests
- `loadAndCompile(valid)` will throw until compile is implemented — expected
- LVL-01 validation gate ready for host wiring in later plans

## Self-Check: PASSED

- Artifacts FOUND: schema.ts, validate.ts, migrations/index.ts, migrations/README.md, load.ts, compile.ts
- Commits FOUND: `70f6b01`, `7837538`, `185de60`

---
*Phase: 04-level-format-brick-types*
*Completed: 2026-09-20*
