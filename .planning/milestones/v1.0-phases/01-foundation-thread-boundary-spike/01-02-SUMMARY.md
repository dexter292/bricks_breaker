---
phase: 01-foundation-thread-boundary-spike
plan: 02
subsystem: architecture
tags: [vitest, eslint, core, layer-boundaries, arch-01, node-24]

requires:
  - phase: 01-foundation-thread-boundary-spike/01
    provides: Expo SDK 57 repo-root shell, Node 24 pin, Skia override
provides:
  - Pure TypeScript src/core/ stub (≥5 modules) runnable in Node
  - Vitest 5.0.1 smoke + purity gates (D-09, D-12)
  - ESLint flat config with D-11 restricted imports and D-14 hot-path bans
  - docs/layer-contract.md LC-* crossing table (ARCH-01)
affects:
  - 01-foundation-thread-boundary-spike plan-03 FPS harness
  - Later physics/core expansion

tech-stack:
  added:
    - vitest 5.0.1
    - @vitest/coverage-v8 5.0.1
    - eslint ^9.39.5
    - eslint-config-expo ~57.0.2
    - typescript-eslint 8.70.0
    - eslint-plugin-boundaries 7.2.0
  patterns:
    - core/ SoA stub with 'worklet' directives and zero platform imports
    - Triple enforcement: ESLint no-restricted-imports + boundaries + Node Vitest
    - Layer contract rows (LC-*) cited from eslint rule messages

key-files:
  created:
    - src/core/types.ts
    - src/core/constants.ts
    - src/core/allocate.ts
    - src/core/step.ts
    - src/core/index.ts
    - tests/core.smoke.test.ts
    - tests/core.purity.test.ts
    - vitest.config.ts
    - eslint.config.js
    - docs/layer-contract.md
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "core/ stub uses deterministic lattice seeds (no Math.random) and bounce inside LOGICAL_WIDTH/HEIGHT"
  - "eslint-plugin-boundaries recommended mode so empty future dirs do not crash CI"
  - "lint script switched from expo lint to eslint . for flat-config boundaries"

patterns-established:
  - "TDD RED smoke before implementing src/core/"
  - "Public core surface via src/core/index.ts (allocateWorld, stepStub)"
  - "Each ESLint boundary rule message cites an LC-* contract row"

requirements-completed: [ARCH-01]

duration: 2min
completed: 2026-09-20
---

# Phase 01 Plan 02: Pure Core + Layer Boundaries Summary

**Pure SoA `src/core/` stub (≥5 modules) runs under Vitest in Node, with ESLint D-11/D-14 gates and a checkable `docs/layer-contract.md`**

## Performance

- **Duration:** 2 min
- **Started:** 2026-09-20T00:23:00Z
- **Completed:** 2026-09-20T00:24:36Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Installed Vitest 5.0.1 on Node 24; smoke test went RED then GREEN after core stub
- Implemented five pure modules (`types`, `constants`, `allocate`, `step`, `index`) with `'worklet'` on allocate/step
- Added flat ESLint boundaries + written LC-* contract; negative `react-native` import in `core/` fails eslint

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Vitest 5 + write failing core smoke/purity tests** - `adfad0d` (test)
2. **Task 2: Implement pure core/ stub (≥5 modules) until Vitest green** - `9954467` (feat)
3. **Task 3: ESLint boundaries + written layer contract** - `01b2c15` (feat)

**Plan metadata:** (docs commit after this SUMMARY)

## Files Created/Modified

- `src/core/*` — SoA SpikeWorld allocate/step stub
- `tests/core.smoke.test.ts` — D-09 Node mutation smoke
- `tests/core.purity.test.ts` — forbidden-import scan + ≥5 modules
- `vitest.config.ts` — `environment: 'node'`
- `eslint.config.js` — LC-01/06 restricted imports, LC-07 runOnJS/scheduleOnRN ban, boundaries matrix
- `docs/layer-contract.md` — allowed/banned crossing table
- `package.json` — test/lint scripts + tooling deps

## Decisions Made

- Seeded velocities/positions from index arithmetic so smoke always sees `x[0]` change without RNG
- Used `boundaries.configs.recommended` so unclassified template/app files do not block the spike
- Replaced `"lint": "expo lint"` with `"lint": "eslint ."` so flat-config rules are the single lint entry

## Deviations from Plan

None - plan executed exactly as written.

## Negative ESLint Probe (Task 3)

1. Appended `import 'react-native';` to `src/core/step.ts`
2. Ran `npx eslint src/core/step.ts` → **exit 1** with `no-restricted-imports` error citing LC-01/LC-06
3. Reverted the import; `npx eslint src/core` → exit 0

## Issues Encountered

- Vitest prints a Vite `configLoader: 'native'` warning for ESM `vitest.config.ts` under CJS package.json — non-blocking; tests pass
- Acceptance `rg ...|expo` substring would false-positive on `export`; purity Vitest regex is the authoritative gate

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for plan 03: UI-thread frame callback can import `allocateWorld` / `stepStub` from `src/core`
- `src/runtime/` and `src/render/` are empty but already covered by D-14 ESLint selectors
- Do not add gameplay physics yet (D-10 / D-12)

## Self-Check: PASSED

- FOUND: src/core/index.ts, tests/core.smoke.test.ts, tests/core.purity.test.ts, vitest.config.ts, eslint.config.js, docs/layer-contract.md
- FOUND commits: `adfad0d`, `9954467`, `01b2c15`
- `npx vitest run` exits 0; `npx eslint src/core` exits 0

---
*Phase: 01-foundation-thread-boundary-spike*
*Completed: 2026-09-20*
