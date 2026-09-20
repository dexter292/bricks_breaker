---
phase: 02-headless-core-simulation
plan: 00
subsystem: testing
tags: [fast-check, vitest, eslint, purity, determinism, D-13]

requires:
  - phase: 01-foundation-thread-boundary-spike
    provides: core/ purity ESLint + Vitest gates, test:core script, Node 24 engines
provides:
  - pinned fast-check@4.10.2 + @fast-check/vitest@0.5.0 for PHYS-03 property suite
  - ESLint D-13 bans on Math.random / Date.now / performance.now under src/core/**
  - nested eslint-plugin-boundaries patterns (src/X/**) for upcoming physics/rng/events
  - purity Vitest regex gate for RNG/wall-clock
affects: [02-01 World modules, PHYS-03 property tests, PHYS-06 determinism lint]

tech-stack:
  added: [fast-check@4.10.2, @fast-check/vitest@0.5.0]
  patterns: [D-13 dual-gate ESLint+regex purity, nested boundaries/** for core subdirs]

key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - eslint.config.js
    - tests/core.purity.test.ts
    - src/core/allocate.ts

key-decisions:
  - "Pin fast-check and @fast-check/vitest exactly (no caret) to match Wave 0 must_haves"
  - "Use RESEARCH.md ESLint selectors verbatim for Math.random / Date.now / performance.now"
  - "Retarget allocate.ts D-13 comment so literal RNG scan does not false-positive on docs"

patterns-established:
  - "D-13 dual gate: ESLint no-restricted-syntax/globals + Vitest source regex walk"
  - "boundaries/elements use src/<layer>/** so nested core packages stay typed as core"

requirements-completed: [PHYS-06]

duration: 2min
completed: 2026-09-20
---

# Phase 02 Plan 00: Wave 0 Purity Tooling Summary

**Pinned fast-check 4.10.2 + @fast-check/vitest 0.5.0, with ESLint and Vitest D-13 bans on Math.random/wall-clock and nested `src/core/**` boundaries**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T03:37:03Z
- **Completed:** 2026-09-20T03:38:41Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Installed property-test tooling on Node 24 without touching native Expo deps
- Extended core ESLint block with D-13 RNG/clock bans; expanded boundaries to `**` nesting
- Extended purity Vitest suite with RNG/clock regex while keeping platform-import + ≥5 module gates

## Task Commits

Each task was committed atomically:

1. **Task 1: Install fast-check + @fast-check/vitest on Node 24** - `c3eb78a` (chore)
2. **Task 2: ESLint RNG/clock bans + nested core boundaries** - `31e740f` (feat)
3. **Task 3: Extend purity Vitest scan for RNG/clock** - `9de9d15` (test)

**Plan metadata:** _(this commit)_

## Files Created/Modified

- `package.json` / `package-lock.json` — exact pins `fast-check@4.10.2`, `@fast-check/vitest@0.5.0`; `test:core` preserved
- `eslint.config.js` — D-13 `no-restricted-globals` / `no-restricted-syntax`; boundaries `src/*/ **`
- `tests/core.purity.test.ts` — second `it` walks `src/core` for `Math.random|Date.now|performance.now`
- `src/core/allocate.ts` — seed comment reworded to avoid literal false positive (deviation)

## Decisions Made

- Exact version pins (no `^`) for Wave 0 must_haves and PHYS-03 reproducibility
- Nested `**` boundaries for all layers (not only core) so future nested packages classify correctly
- Comment reword in `allocate.ts` rather than weakening the purity regex

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] allocate.ts comment tripped D-13 regex**
- **Found during:** Task 3 (Extend purity Vitest scan for RNG/clock)
- **Issue:** Existing JSDoc `no Math.random()` matched `/Math\.random|Date\.now|performance\.now/` and failed the new gate
- **Fix:** Reword comment to cite D-13 without the banned call-site literals
- **Files modified:** `src/core/allocate.ts`
- **Verification:** `npx vitest run tests/core.purity.test.ts` and `npm run test:core` exit 0
- **Committed in:** `9de9d15` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary for the literal scan to pass against Phase 1 docs; no scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Verification Results

| Check | Result |
|-------|--------|
| `npm ls fast-check@4.10.2 @fast-check/vitest@0.5.0` | PASS |
| `npx eslint src/core` | PASS |
| `npm run test:core` | PASS (4 tests) |

## Self-Check: PASSED

- Key artifacts exist on disk (`package.json`, `eslint.config.js`, `tests/core.purity.test.ts`)
- `git log --grep=02-00` returns 3 task commits
- All task `<acceptance_criteria>` re-verified green
- Plan-level `<verification>` commands green

## Next Phase Readiness

Ready for **02-01** (World / RNG / event-ring modules). Wave 0 blockers for PHYS-03 property suite and PHYS-06 determinism lint are cleared.

---
*Phase: 02-headless-core-simulation*
*Completed: 2026-09-20*
