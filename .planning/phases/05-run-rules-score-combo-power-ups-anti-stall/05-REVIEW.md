---
phase: 05-run-rules-score-combo-power-ups-anti-stall
reviewed: 2026-09-20T10:18:58Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/core/constants.ts
  - src/core/types.ts
  - src/core/index.ts
  - src/core/allocate.ts
  - src/core/reset.ts
  - src/core/hash.ts
  - src/core/step.ts
  - src/core/stepRun.ts
  - src/core/rules/scoring.ts
  - src/core/rules/pickups.ts
  - src/core/rules/effects.ts
  - src/core/rules/multiball.ts
  - src/core/rules/lives.ts
  - src/core/rules/serve.ts
  - src/core/rules/stall.ts
  - src/runtime/useGameLoop.ts
  - src/runtime/useSpikeLoop.ts
  - src/runtime/GameScreen.tsx
  - app/_components/GameHost.tsx
  - src/render/recordSprites.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-09-20T10:18:58Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 5 run-rules code is generally solid: last-ball lives, award-then-increment scoring, seeded drop RNG (no `Math.random`), expand refresh, multiball spawn caps, anti-stall tiers, `stepRun` ordering, SharedValue chrome mirrors, and read-only pickup draw all match CONTEXT / layer-contract intent. Two warnings remain around terminal-state priority (win vs life loss) and Stall! chrome while docked; three info items cover hash completeness and defensive gates.

Determinism spot-check: no `Math.random` under `src/`; drops use `nextFloat(world.rngGameplay)`; stall velocity mutations are literal/deterministic.

## Warnings

### WR-01: Win check after lives loses simultaneous clear + death

**File:** `src/core/stepRun.ts:51-53`
**Issue:** PLAYING order runs `applyLivesFromBallCount` before `applyWinCheck`. When the last breakable breaks and `activeBallCount` becomes 0 in the same step on the final life, lives sets `SimPhase.LOST` and win never runs — the player loses a cleared board. With lives remaining, the same frame docks on an empty grid and forces an extra serve before WON.
**Fix:** Prefer win when the board is clear, e.g. call win before lives, or skip life loss when breakables are already zero:

```typescript
stepAntiStall(world);
applyWinCheck(world);
if (world.simPhase === SimPhase.PLAYING) {
  applyLivesFromBallCount(world);
}
```

Or inside `applyLivesFromBallCount`, early-return when `countBreakableAlive(world) === 0` so the subsequent `applyWinCheck` can mark WON.

### WR-02: Stall! chrome not gated to active play

**File:** `src/runtime/GameScreen.tsx:115-117`
**Issue:** D-18 keeps stall at run level (not cleared on life reset — correct vs D-13). `Stall! · N` renders whenever `stallTier > 0`, including `DOCKED` after a life loss. That shows an active stall warning while the ball is waiting to serve.
**Fix:** Gate chrome on playing (and optionally hide under result overlays):

```tsx
{stallTier > 0 && result == null && uiPhase === 'playing' && simPhaseNum === SIM.PLAYING ? (
  <Text style={styles.lives}>{`Stall! · ${stallTier}`}</Text>
) : null}
```

(Pass `simPhaseNum` into `GameScreen`, or derive a `showStall` boolean in `GameHost`.)

## Info

### IN-01: `hashWorld` omits `lives` and `simPhase`

**File:** `src/core/hash.ts:94-103`
**Issue:** Phase 5 correctly mixes score/combo/pickups/stall into `hashWorld`, but `lives` and `simPhase` are still absent. Dual-world golden checks can miss divergences on life loss / WON / LOST.
**Fix:** After stall fields, mix both scalars:

```typescript
h = mixU32(h, world.lives);
h = mixU32(h, world.simPhase);
```

### IN-02: Drop/pickup helpers lack PLAYING phase guards

**File:** `src/core/rules/pickups.ts:35-40`, `src/core/rules/pickups.ts:78-83`
**Issue:** `applyDropsFromBreaks` / `stepPickups` rely on `stepRun` only calling them on the PLAYING path (unlike scoring/lives/stall). A future direct caller could spawn or catch while docked/lost.
**Fix:** Add the same early-out as scoring:

```typescript
if (world.simPhase !== SimPhase.PLAYING) {
  return;
}
```

### IN-03: LOST path leaves pickups/effects uncleared

**File:** `src/core/rules/lives.ts:49-51`
**Issue:** When `lives` hits 0, phase becomes `LOST` without clearing pickup SoA or expand effects. Frozen `recordFrame` can still draw amber pickups / wide paddle on the lose screen. Harmless for sim correctness; slightly noisy chrome.
**Fix:** Optionally clear pickups/effects on the LOST branch the same way as the life-reset path (or leave for Phase 6 result polish).

---

## Focus area notes

| Area | Assessment |
|------|------------|
| Scoring / combo | Award-then-increment; paddle resets combo; unbreakable HIT skipped; HIT vs BREAK mutually exclusive from `step.ts` |
| Pickups / effects / multiball | Seeded drops; AABB catch; expand refresh×1.5/1200 ticks; `min(2, freeSlots)` at ±18°/±36° |
| Last-ball lives | Decrements only when `activeBallCount === 0`; same-frame multiball catch can save before lives (intentional order) |
| Stall | PLAYING-only idle; breakable HIT/BREAK reset; tier-entry speed/nudge once; no RNG |
| `stepRun` wiring | score → drops → pickups → effects → stall → lives → win (win/lives order = WR-01) |
| SharedValue chrome | Separate outs for score/combo/stallTier; reactions + `runOnJS` on change only (app host, not LC-07 violation) |
| Determinism | No `Math.random` in reviewed sources; gameplay mulberry32 for drops only |

---

_Reviewed: 2026-09-20T10:18:58Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
