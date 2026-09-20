---
phase: 06-ui-shell-hud-persistence-platform-seams
plan: 00
subsystem: testing
tags: [async-storage, eslint-boundaries, vitest, nyquist, wave-0]

# Dependency graph
requires:
  - phase: 05-run-rules-score-combo-power-ups-anti-stall
    provides: Vitest Node suite + layer-contract / eslint boundaries baseline
provides:
  - AsyncStorage 2.2.0 Expo-managed pin
  - ESLint app → services allow-list
  - LC-04 cold-path services documentation
  - Wave 0 it.todo stubs for personal-best and platform seams
affects: [06-01 storage, 06-02 platform seams, 06-05 results persist]

# Tech tracking
tech-stack:
  added: ["@react-native-async-storage/async-storage@2.2.0"]
  patterns:
    - "Wave 0 Nyquist stubs use it.todo so suites stay green until feature plans"
    - "expo install only for native pin (never npm install latest AsyncStorage)"

key-files:
  created:
    - tests/storage.personal-best.test.ts
    - tests/platform.seams.test.ts
  modified:
    - package.json
    - package-lock.json
    - eslint.config.js
    - docs/layer-contract.md
    - .planning/phases/06-ui-shell-hud-persistence-platform-seams/06-VALIDATION.md

key-decisions:
  - "Pinned AsyncStorage exactly 2.2.0 via npx expo install (D-13 / T-06-02)"
  - "Added services to app allow-list only — runtime/core still banned (T-06-03)"

patterns-established:
  - "Pattern: Wave 0 Nyquist stubs import only { describe, it } from vitest"
  - "Pattern: app cold-path may import services; hot path layers may not"

requirements-completed: [RUN-04, ARCH-02]

# Metrics
duration: 2min
completed: 2026-09-20
---

# Phase 06 Plan 00: Wave 0 Nyquist + AsyncStorage Summary

**Expo-pinned AsyncStorage 2.2.0, ESLint `app`→`services`, LC-04 cold-path docs, and green `it.todo` stubs for personal-best / platform suites.**

## Performance

- **Duration:** 2min
- **Started:** 2026-09-20T11:44:42Z
- **Completed:** 2026-09-20T11:46:30Z
- **Tasks:** 2/2
- **Files modified:** 7

## Accomplishments

- Installed `@react-native-async-storage/async-storage@2.2.0` via `npx expo install` (no ads/IAP SDKs)
- Opened ESLint boundary so `app` may import `services`; left `runtime`/`core` banned
- Updated LC-04 for mount/unmount/cold I/O including services
- Added Wave 0 Vitest stubs (9 `it.todo`) and marked `wave_0_complete: true`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AsyncStorage 2.2.0 + allow app→services + LC-04** - `a009fb7` (feat)
2. **Task 2: Wave 0 it.todo stubs + VALIDATION.md** - `a56f9a5` (test)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `package.json` / `package-lock.json` — AsyncStorage 2.2.0 dependency
- `eslint.config.js` — `app` allow-list includes `services`
- `docs/layer-contract.md` — LC-04 cold-path services
- `tests/storage.personal-best.test.ts` — RUN-04 Wave 0 stubs
- `tests/platform.seams.test.ts` — ARCH-02 Wave 0 stubs
- `06-VALIDATION.md` — Wave 0 boxes + frontmatter

## Decisions Made

- Used `npx expo install` only for the native pin (D-13); rejected AsyncStorage 3.x and monetization SDKs (T-06-02)
- `services` added to **app** allow-list only (T-06-03 / LC-01 / LC-09)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| 5× `it.todo` personal-best | `tests/storage.personal-best.test.ts` | Wave 0 Nyquist — Plan 01 fills GREEN |
| 4× `it.todo` platform seams | `tests/platform.seams.test.ts` | Wave 0 Nyquist — Plan 02 fills GREEN |

Intentional Wave 0 stubs; plan goal (install + boundaries + stub targets) achieved.

## Next Phase Readiness

- Plans 01–02 can replace `it.todo` with real assertions and import `src/services/**`
- AsyncStorage 2.2.0 is available for the adapter in Plan 01
- ESLint will allow `app` → `services` imports when adapters land

## Self-Check: PASSED

- Created files found: storage/platform stubs, SUMMARY, VALIDATION
- Commits found: `a009fb7`, `a56f9a5`
- AsyncStorage version assert: `2.2.0`
