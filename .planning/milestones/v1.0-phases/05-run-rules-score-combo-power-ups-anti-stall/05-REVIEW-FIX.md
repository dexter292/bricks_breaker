---
phase: 05-run-rules-score-combo-power-ups-anti-stall
fixed_at: 2026-09-20T10:31:00Z
review_path: .planning/milestones/v1.0-phases/05-run-rules-score-combo-power-ups-anti-stall/05-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-09-20T10:31:00Z
**Source review:** `.planning/milestones/v1.0-phases/05-run-rules-score-combo-power-ups-anti-stall/05-REVIEW.md`
**Iteration:** 1
**Fix scope:** critical_warning (Info IN-01…IN-03 left untouched)

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Win check after lives loses simultaneous clear + death

**Files modified:** `src/core/stepRun.ts`, `tests/rules.win.test.ts`, `tests/rules.lives.test.ts`
**Commit:** `f2c1615`
**Applied fix:** Reordered PLAYING path to `applyWinCheck` before `applyLivesFromBallCount` (lives only if still PLAYING). Added tests for cleared board + no balls → WON (final life and lives remaining). Updated last-ball miss test to keep a breakable alive so life loss still covers the non-clear path.
**Status:** fixed: requires human verification (logic ordering)

### WR-02: Stall! chrome not gated to active play

**Files modified:** `src/runtime/GameScreen.tsx`, `app/_components/GameHost.tsx`
**Commit:** `526d5ec`
**Applied fix:** Pass `simPhaseNum` into `GameScreen`; show `Stall! · N` only when `stallTier > 0`, `result == null`, `uiPhase === 'playing'`, and `simPhaseNum === PLAYING` (docked / overlays hide chrome; stall sim state still preserved per D-18).

## Verification

- `npm test` — 25 files, 112 tests passed

---

_Fixed: 2026-09-20T10:31:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
