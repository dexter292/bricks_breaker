---
phase: 04-level-format-brick-types
verified: 2026-09-20T08:16:51Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 4: Level Format & Brick Types Verification Report

**Phase Goal:** Levels are data rather than code — versioned, validated, and expressive enough for the showpiece level and a future editor

**Verified:** 2026-09-20T08:16:51Z  
**Status:** passed  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | A second, structurally different level file loads and plays with zero code changes | ✓ VERIFIED | `assets/levels/level-01.json` + `level-02.json` (corridor steel); `loadLevelById` Metro map; `__DEV__` toggle in `GameHost`; fingerprint test differs; same `loadAndCompile` → `applyCompiledLevel` path |
| 2 | Invalid level files are rejected with actionable validation errors before play starts, and the runtime reads only the compiled form — never the authoring format | ✓ VERIFIED | `validateLevel` issues with `path`+`message`; `loadAndCompile` fail-closed before compile; GameHost `console.error` + `LevelErrorOverlay`; worklets only `applyCompiledLevel` (typed arrays) |
| 3 | A level contains multiple brick types whose remaining hit points are readable through a non-color cue as well as colour | ✓ VERIFIED | Types `1`/`2`/`3`/`X` in JSON; `planBrickDamageCues` 0/1/2 crack strokes; `recordFrame` draws strokes after fill; tests assert distinct plans |
| 4 | Unbreakable/structural bricks reflect the ball, never break, and never block the win condition | ✓ VERIFIED | `step.ts` reflect-only for `UNBREAKABLE`; `win.ts` ignores steel; `physics.bricks` + `rules.win` tests; hatch cues flags-first in damage planner |
| 5 | The format carries a version and a migration path, so level files authored today still load after the schema evolves | ✓ VERIFIED | `schemaVersion: 1` / `SCHEMA_VERSION`; unsupported rejected; `migrateLevel` after validate (v1 identity); `migrations/README.md` documents v1→v2 steps |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `assets/levels/level-01.json` | Migrated 7×5 multi-HP + steel | ✓ VERIFIED | schemaVersion 1, brickCount 35 via compile tests |
| `assets/levels/level-02.json` | Corridor/channel layout | ✓ VERIFIED | Full steel row + side channels; fingerprint ≠ level-01 |
| `src/core/levels/schema.ts` | Versioned authoring types | ✓ VERIFIED | `SCHEMA_VERSION`, `LevelFileV1`, `CompiledLevel` |
| `src/core/levels/validate.ts` | Actionable reject | ✓ VERIFIED | No `.trim()`; MAX_BRICKS; proto/space/row/version fixtures |
| `src/core/levels/migrations/` | Migration seam | ✓ VERIFIED | Identity migrate + README path for v2 |
| `src/core/levels/load.ts` | validate→migrate→compile | ✓ VERIFIED | Fail-closed before compile |
| `src/core/levels/compile.ts` | Pack SoA arrays | ✓ VERIFIED | Skips `.`; UNBREAKABLE flags |
| `src/core/levels/apply.ts` | Worklet SoA fill | ✓ VERIFIED | Calls lattice `assignSpatialBrickCells` |
| `src/core/levels/spatial.ts` | Lattice broadphase cells | ✓ VERIFIED | Origin+pitch (tunneling fix) |
| `src/core/levels/damageCues.ts` | Crack/hatch plans | ✓ VERIFIED | Flags-first; Node-testable |
| `src/render/recordSprites.ts` | Skia cues in recordFrame | ✓ VERIFIED | `drawLine` after fill; local worklet twin |
| `src/runtime/loadLevel.ts` | JS cold path | ✓ VERIFIED | `loadLevelById` → `loadAndCompile` |
| `app/_components/GameHost.tsx` | Boot gate + dev switch | ✓ VERIFIED | level-01 default; gates setActive; Retry keeps id |
| `src/runtime/overlays/LevelErrorOverlay.tsx` | On-screen errors | ✓ VERIFIED | Wired via GameScreen |
| `src/core/levels/phase3Grid.ts` | Removed (D-15) | ✓ VERIFIED | Absent; zero `loadPhase3Grid` in src/tests/app |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `load.ts` | `validateLevel` → `migrateLevel` → `compileLevel` | fail-closed | ✓ WIRED | Invalid returns before compile |
| `loadLevel.ts` | `loadAndCompile` | Metro require JSON | ✓ WIRED | Both level ids |
| `GameHost` | `compiledSv` / `setActive` | useEffect on loadResult | ✓ WIRED | Null compiled + inactive on error |
| `useGameLoop` | `applyCompiledLevel` | first frame + retry | ✓ WIRED | No authoring parse on UI thread |
| `GameHost levelError` | `LevelErrorOverlay` | GameScreen prop | ✓ WIRED | Blocks chrome when issues present |
| `compileLevel` | `BrickFlags.UNBREAKABLE` | brickTypes.unbreakable | ✓ WIRED | |
| `applyCompiledLevel` | `assignSpatialBrickCells` | gridRows>1 + pitch | ✓ WIRED | Lattice fields for broadphase |
| `recordFrame` | crack/hatch strokes | `planBrickDamageCuesLocal` | ✓ WIRED | After fill; flags-first |
| `step.ts` / `win.ts` | UNBREAKABLE semantics | reflect / ignore for win | ✓ WIRED | Pre-existing + still tested |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `GameHost` | `loadResult` / `compiledSv` | `loadLevelById` → JSON fixtures | Real compiled typed arrays | ✓ FLOWING |
| `useGameLoop` | `world.brick*` | `applyCompiledLevel(compiled)` | SoA from level JSON | ✓ FLOWING |
| `recordFrame` | `brickHp` / `brickFlags` | World SoA | Dynamic HP/flags drive fill + cues | ✓ FLOWING |
| `LevelErrorOverlay` | `issues` | `validateLevel` failure | Path/message from validator | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Level pipeline unit suite | `npx vitest run tests/levels.*.test.ts tests/rules.win.test.ts tests/physics.bricks.test.ts` | 22/22 pass | ✓ PASS |
| Full suite | `npm test` | 79/79 pass (20 files) | ✓ PASS |
| phase3Grid removed | `rg loadPhase3Grid src tests app`; file absent | CLEAN | ✓ PASS |
| No silent row trim | `rg '\\.trim\\(' src/core/levels/validate.ts` | no matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| LVL-01 | 04-00…04-04 | Versioned data-driven levels for future editor | ✓ SATISFIED | JSON schema + validate/compile/apply + two levels + single pipeline |
| LVL-02 | 04-02, 04-03 | Multi-HP types + readable damage (color + non-color) | ✓ SATISFIED | HP 1/2/3 types; crack strokes in Skia; palette fills |
| LVL-03 | 04-02, 04-04 | Unbreakable/structural channel bricks | ✓ SATISFIED | `X` unbreakable in both levels; corridor level-02; physics + win ignore steel |

No orphaned Phase 4 requirements in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `recordSprites.ts` vs `damageCues.ts` | — | Duplicated stroke geometry (intentional worklet twin) | ℹ️ Info | Drift risk if one side updates; currently matched |
| — | — | TODO/FIXME/placeholder in phase hot path | — | None found in src level/runtime path |

### Human Verification Required

None pending. Human UAT approved 2026-09-20 (post lattice broadphase tunneling fix), covering SC-1 play of level-02, SC-3 crack readability, SC-4 steel behavior, and SC-2 error overlay path as exercised in-app.

### Gaps Summary

No gaps. All five roadmap success criteria hold in code, wiring, data flow, and automated tests. Phase goal achieved.

### Confirmation-bias notes (non-blocking)

1. **SC-5 migration depth:** Only v1 identity migrator exists today — acceptable per D-03; documented extension path in `migrations/README.md`.
2. **Overlay unit tests:** LevelErrorOverlay is RN UI; validated via wiring + validate fixtures, not a dedicated component test.
3. **Damage-cue twin:** Render uses local worklet copy; core helper is what Vitest asserts — keep geometry in sync.

---

_Verified: 2026-09-20T08:16:51Z_  
_Verifier: Claude (gsd-verifier)_
