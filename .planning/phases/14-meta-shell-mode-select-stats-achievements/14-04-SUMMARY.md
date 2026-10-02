---
phase: 14-meta-shell-mode-select-stats-achievements
plan: 04
type: execute
status: complete
---

# 14-04 Summary: MAX_FONT_SCALE across the src/runtime tier

## What shipped

- `src/runtime/textScale.ts` — `export const MAX_FONT_SCALE = 1.2;`, zero imports, one
  export, full derivation doc (binding-surface measurement, growth-coefficient
  calibration, rejected values, the two prop-surface facts, the twelve-file enumeration),
  carrying the literal `#29` (5 occurrences).
- `maxFontSizeMultiplier={MAX_FONT_SCALE}` added to every `Text` node across all seven
  `src/runtime` files that render one, through the imported identifier only.

## Measured counts

**Task 1** (the two binding result panels):
```
src/runtime/overlays/ResultOverlay.tsx text=12 prop=12 viaConstant=12
src/runtime/overlays/DailyResultOverlay.tsx text=13 prop=13 viaConstant=13
total=25
SCALE_PARITY_OK
```

**Task 2** (the remaining five surfaces):
```
src/runtime/overlays/PauseOverlay.tsx text=4 prop=4 viaConstant=4
src/runtime/overlays/CountdownOverlay.tsx text=1 prop=1 viaConstant=1
src/runtime/overlays/LevelErrorOverlay.tsx text=3 prop=3 viaConstant=3
src/runtime/HudStrip.tsx text=5 prop=5 viaConstant=5
src/runtime/GameScreen.tsx text=1 prop=1 viaConstant=1
runtimeTailTotal=14
SCALE_PARITY_OK
```

**`src/runtime` tier total: 25 + 14 = 39 capped nodes** — exactly the plan's predicted
total, recorded here for 14-07's twelve-file gate.

Whole-tier scan: `tsxScanned=7`, `RUNTIME_TIER_FULLY_CAPPED`.

## Red-proofs observed

1. **Task 1** — temporarily replaced `ResultOverlay.tsx`'s body `Text`'s
   `maxFontSizeMultiplier={MAX_FONT_SCALE}` with a hard-coded `maxFontSizeMultiplier={1.2}`.
   Re-ran the two-file parity scan: `viaConstant=11` against `prop=12`, printing
   `SCALE_PARITY_MISMATCH=1`. Restored the imported identifier; re-ran to confirm
   `SCALE_PARITY_OK`.
2. **Task 2** — temporarily removed the prop from `HudStrip.tsx`'s combo `Text` node.
   Re-ran the whole-tier scan: printed `UNCAPPED:src/runtime/HudStrip.tsx text=5 prop=4`.
   Restored the prop; re-ran to confirm `RUNTIME_TIER_FULLY_CAPPED`.

## Verification (all green)

- `node` constant scan — `decl=1 imports=0 exports=1`
- `grep -c '#29' src/runtime/textScale.ts` → 5
- `grep -n "ACHIEVEMENT_LINES_MAX = 2" src/runtime/overlays/achievementLines.ts` → line 49
  (unchanged)
- `npx vitest run tests/ui` — 22 files / 228 tests passed
- `npm test` — 113 files / 898 tests passed, all 8 assert scripts `OK`
- `npm run lint -- --max-warnings 0` — clean (the only observer of the new
  `runtime -> runtime` import under `boundaries/dependencies`)
- `npm run typecheck` — clean
- `git diff --stat HEAD -- src/runtime` — one new file (`textScale.ts`) plus prop/import
  additions only in the seven touched files; no `StyleSheet` value, string literal or
  colour changed
- `git diff --quiet HEAD -- package-lock.json` — clean
