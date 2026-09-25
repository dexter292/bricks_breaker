---
phase: 04-level-format-brick-types
plan: 00
subsystem: testing
tags: [vitest, nyquist, level-json, fixtures, wave-0]

requires:
  - phase: 03-first-playable-render-input-bricks-lives-pause
    provides: Vitest core suite + phase3Grid playable baseline to migrate
provides:
  - Six invalid authoring JSON fixtures for Plan 01 validate RED→GREEN
  - Wave 0 it.todo stubs for validate/compile/apply/damage-cues suites
affects:
  - 04-01 validateLevel fail-closed
  - 04-02 compile + applyCompiledLevel
  - 04-03 damage cue stroke plans

tech-stack:
  added: []
  patterns:
    - Wave 0 Nyquist stubs use it.todo so suites stay green until feature plans
    - Invalid fixtures are real JSON with intentional defects (no silent fixes)
    - Threat fixtures cover T-04-01/02/04 (__proto__, non-finite, size caps stubbed)

key-files:
  created:
    - tests/fixtures/levels/invalid-schema-version.json
    - tests/fixtures/levels/invalid-row-length.json
    - tests/fixtures/levels/invalid-unknown-char.json
    - tests/fixtures/levels/invalid-space-in-row.json
    - tests/fixtures/levels/invalid-non-finite-grid.json
    - tests/fixtures/levels/invalid-proto-key.json
    - tests/levels.validate.test.ts
    - tests/levels.compile.test.ts
    - tests/levels.apply.test.ts
    - tests/levels.damage-cues.test.ts
  modified: []

key-decisions:
  - "Tiny ≤3×3 fixtures keep defects readable for Plan 01 path assertions"
  - "originX: null drives T-04-02 non-finite rejection (not Infinity — JSON has no Infinity literal)"
  - "Stub files import only vitest describe/it — no src/core/levels until modules exist"

patterns-established:
  - "Pattern: Wave 0 Nyquist stubs use it.todo so suites stay green until Plan 01"
  - "Pattern: Invalid level fixtures live under tests/fixtures/levels/invalid-*.json"

requirements-completed: []

duration: 1min
completed: 2026-09-20
---

# Phase 04 Plan 00: Wave 0 Level Pipeline Nyquist Scaffold Summary

**Invalid level JSON fixtures plus green `it.todo` Vitest stubs for validate/compile/apply/damage-cues so Plans 01–03 have automated verify targets**

## Performance

- **Duration:** 1 min
- **Started:** 2026-09-20T07:22:32Z
- **Completed:** 2026-09-20T07:23:38Z
- **Tasks:** 2/2
- **Files modified:** 10 created

## Accomplishments

- Added six minimal invalid authoring-shaped JSON fixtures covering schemaVersion, row length, unknown char, space-in-row (D-02), non-finite grid (T-04-02), and `__proto__` brickTypes key (T-04-04)
- Added four Wave 0 Vitest stub suites matching 04-VALIDATION Task IDs; suite stays green (10 todo)
- Confirmed `npm run test:core` green with stubs present (65 passed | 10 todo)

## Task Commits

Each task was committed atomically:

1. **Task 1: Invalid level JSON fixtures for validator security cases** - `30e3620` (test)
2. **Task 2: Wave 0 it.todo Vitest stubs for validate/compile/apply/damage-cues** - `c8bf637` (test)

**Plan metadata:** `9b33bcb` (docs: complete plan)

## Files Created/Modified

- `tests/fixtures/levels/invalid-schema-version.json` — schemaVersion 99
- `tests/fixtures/levels/invalid-row-length.json` — cells row length ≠ cols
- `tests/fixtures/levels/invalid-unknown-char.json` — cell char `Z` not in brickTypes
- `tests/fixtures/levels/invalid-space-in-row.json` — space inside cells string
- `tests/fixtures/levels/invalid-non-finite-grid.json` — `originX: null`
- `tests/fixtures/levels/invalid-proto-key.json` — `__proto__` in brickTypes
- `tests/levels.validate.test.ts` — 04-W0-01/02 + threat todos
- `tests/levels.compile.test.ts` — 04-W0-03/05/07 todos
- `tests/levels.apply.test.ts` — apply + no-mutate-on-failure todos
- `tests/levels.damage-cues.test.ts` — 04-W0-06 crack/hatch todos

## Decisions Made

- Kept fixtures ≤3×3 and authoring-shaped (`schemaVersion`, `id`, `name`, `grid`, `brickTypes`, `cells`) per RESEARCH example
- Used `originX: null` for non-finite (JSON cannot express `Infinity`/`NaN` literals)
- Deferred all `src/core/levels/*` imports until Plan 01+ modules exist

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ROADMAP progress table not updated by gsd-tools**
- **Found during:** Final docs commit
- **Issue:** `roadmap update-plan-progress 04` reported success but left `| 4. Level Format… | 0/5 | Planned |`
- **Fix:** Manually set table row to `1/5 | In Progress` (plan checklist already had 04-00 checked)
- **Files modified:** `.planning/ROADMAP.md`
- **Verification:** Visual confirm of progress table
- **Committed in:** (docs follow-up)

---

**Total deviations:** 1 auto-fixed (Rule 3)
**Impact on plan:** Docs accuracy only; no code scope change.

## Issues Encountered

None

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `tests/levels.validate.test.ts` | 4× `it.todo` | Wave 0 Nyquist — Plan 01 fills |
| `tests/levels.compile.test.ts` | 3× `it.todo` | Wave 0 Nyquist — Plan 01–02 fills |
| `tests/levels.apply.test.ts` | 2× `it.todo` | Wave 0 Nyquist — Plan 02 fills |
| `tests/levels.damage-cues.test.ts` | 1× `it.todo` | Wave 0 Nyquist — Plan 03 fills |

Intentional: stubs do not block Wave 0 goal (automated verify targets exist). LVL-01/02/03 remain pending until feature plans.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01 can import fixtures and replace `it.todo` in `levels.validate.test.ts`
- No feature validate/compile pipeline yet (by design)
- LVL-01/02/03 not marked complete (Wave 0 scaffold only)

## Self-Check: PASSED

- All 10 artifact paths FOUND
- Commits `30e3620`, `c8bf637` FOUND in git log

---
*Phase: 04-level-format-brick-types*
*Completed: 2026-09-20*
