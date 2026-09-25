---
phase: 01-foundation-thread-boundary-spike
plan: 01
subsystem: infra
tags: [expo, sdk-57, skia, eas, node-24, react-native, worklets]

requires: []
provides:
  - Expo SDK 57 app shell at repo root (expo-template-default@57)
  - Node 24 pin via .nvmrc + engines
  - Skia 2.12.0 exact pin behind expo.install.exclude + assert:skia
  - EAS development / profiling / production profiles with overlay hygiene
  - babel worklets plugin last
affects:
  - 01-foundation-thread-boundary-spike
  - plan-02 Vitest/core boundaries
  - plan-03 FPS harness
  - plan-04 EAS device builds

tech-stack:
  added:
    - expo ~57.0.24
    - react-native 0.86.3
    - @shopify/react-native-skia 2.12.0
    - expo-dev-client
    - expo-build-properties
    - expo-screen-orientation
    - expo-keep-awake
    - react-native-reanimated 4.5.1
    - react-native-worklets 0.10.1
  patterns:
    - Repo-root Expo app (no monorepo / nested package)
    - Skia override via expo.install.exclude before npm install
    - EXPO_PUBLIC_PERF_OVERLAY only on development + profiling EAS profiles

key-files:
  created:
    - package.json
    - .nvmrc
    - eas.json
    - babel.config.js
    - app/_layout.tsx
    - app/index.tsx
    - scripts/assert-skia-version.mjs
  modified:
    - app.json
    - package-lock.json
    - .gitignore
    - tsconfig.json

key-decisions:
  - "Scaffolded from expo-template-default@57.0.26 (not with-skia) and relocated routes from template src/app/ to root app/"
  - "Node 24 via Homebrew node@24 (PATH), pinned with .nvmrc=24 and engines.node >=24 <25"
  - "Skia exact 2.12.0 with expo.install.exclude; assert:skia gates version"

patterns-established:
  - "Thin app/ host only — src/ owned by later plans"
  - "Install native modules with npx expo install; Skia alone via npm install after exclude"
  - "babel.config.js plugins end with react-native-worklets/plugin"

requirements-completed: [ARCH-01]

duration: 3min
completed: 2026-09-20
---

# Phase 01 Plan 01: Foundation Scaffold Summary

**Expo SDK 57 repo-root shell with Node 24, Skia 2.12.0 override, worklets babel last, and EAS profiles that keep EXPO_PUBLIC_PERF_OVERLAY off production**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-20T00:19:05Z
- **Completed:** 2026-09-20T00:21:45Z
- **Tasks:** 2
- **Files modified:** 37 (across both task commits)

## Accomplishments

- Bootstrapped greenfield Expo SDK 57 at repo root from `expo-template-default@57.0.26` (explicitly not `with-skia`)
- Stripped default-template demo tabs/components; thin `app/` host renders "Spike host — pending"
- Pinned Node 24 (Homebrew `node@24`), Skia `2.12.0` behind `expo.install.exclude`, EAS overlay hygiene, and `assert:skia`

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Expo SDK 57 at repo root** - `2b694cc` (feat)
2. **Task 2: Pin Node 24, install native matrix + Skia 2.12.0, configure babel/EAS** - `e65c0b1` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `package.json` / `package-lock.json` — SDK 57 matrix, engines, expo.install.exclude, assert:skia script
- `.nvmrc` — Node major `24`
- `app/_layout.tsx`, `app/index.tsx` — thin spike host
- `app.json` — portrait, dark UI, expo-router / expo-dev-client / expo-build-properties (enableSceneSupport)
- `eas.json` — development (dev-client + overlay), profiling (overlay), production (no overlay)
- `babel.config.js` — `babel-preset-expo` + `react-native-worklets/plugin` last
- `scripts/assert-skia-version.mjs` — exits non-zero unless Skia === 2.12.0
- `.gitignore` — node_modules, .expo, /ios, /android

## Decisions Made

- Relocated Expo Router from template `src/app/` to root `app/` so plan 02 can own `src/` without colliding with the default-template layout
- Used Homebrew `node@24` (keg-only, session PATH) rather than fnm/nvm — machine had neither; recorded for Vitest in plan 02
- Forced Skia dependency string to exact `2.12.0` (npm initially wrote `^2.12.0`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Template ships `src/app/` instead of root `app/`**
- **Found during:** Task 1 (Scaffold Expo SDK 57 at repo root)
- **Issue:** `expo-template-default@57.0.26` places router under `src/app/` and demo components under `src/`; plan acceptance requires root `app/_layout.tsx` + `app/index.tsx` and forbids creating `src/` yet (plans 02–03 own it)
- **Fix:** Removed template `src/`, created thin root `app/` host, stripped unused demo deps (`@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-image`, `expo-web-browser`, `expo-device`)
- **Files modified:** `app/_layout.tsx`, `app/index.tsx`, `package.json`, removed `src/`
- **Verification:** `test -d app && ! test -d src` + acceptance checks
- **Committed in:** `2b694cc`

**2. [Rule 2 - Correctness] Skia version range was caret after npm install**
- **Found during:** Task 2
- **Issue:** `npm install @shopify/react-native-skia@2.12.0` wrote `^2.12.0` into package.json; plan requires exact pin (T-01-02)
- **Fix:** Rewrote dependency to exact `2.12.0` and re-ran `npm install`
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm run assert:skia` exits 0; package.json shows `2.12.0`
- **Committed in:** `e65c0b1`

**Total deviations:** 2 auto-fixed (1× Rule 3, 1× Rule 2)
**Impact on plan:** Required for D-13/D-15 layout and T-01-02 pin integrity. No scope creep.

## Issues Encountered

- Local Node was 25.6.0 (outside Vitest-supported engines for plan 02). Installed Homebrew `node@24` (24.21.0); session uses `PATH="/opt/homebrew/opt/node@24/bin:$PATH"`. Keg-only — not linked over system Node 25.
- `npx expo-doctor@latest`: **21/21 checks passed** (no Skia mismatch warning surfaced; exclude + exact pin in place). Intentional override still documented for later EAS smoke.

## User Setup Required

Plan frontmatter lists external gates (not blocking this scaffold plan):

1. **Apple Developer Program (D-17)** — confirm paid membership at https://developer.apple.com/account; prepare Expo/EAS iOS credentials before plan 04 builds (`npx eas-cli@latest credentials -p ios`)
2. **Expo/EAS account** — `npx eas-cli@latest login` and create/link EAS project at https://expo.dev

## Next Phase Readiness

- Ready for plan 02: add `src/core/`, Vitest, ESLint layer boundaries
- Do not create gameplay/harness yet — plans 03–04 own FPS spike and device builds
- Ensure shells use Node 24 (`.nvmrc` / Homebrew PATH) before Vitest runs

## Self-Check: PASSED

- FOUND: package.json, .nvmrc, eas.json, babel.config.js, scripts/assert-skia-version.mjs, app/_layout.tsx, app/index.tsx
- FOUND commits: `2b694cc`, `e65c0b1`
- `npm run assert:skia` exits 0

---
*Phase: 01-foundation-thread-boundary-spike*
*Completed: 2026-09-20*
