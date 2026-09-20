---
phase: 03-first-playable-render-input-bricks-lives-pause
verified: 2026-09-20T05:41:49Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 3: First Playable — Render, Input, Bricks, Lives, Pause Verification Report

**Phase Goal:** A player can hold the phone and play a real rally — drag the paddle, aim a launch, break bricks, lose lives, pause and come back

**Verified:** 2026-09-20T05:41:49Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Roadmap success criteria (phase contract). Plan frontmatter truths map into these and were checked in artifacts/links below.

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | Dragging anywhere on the playfield moves the paddle by relative offset with tuned gain and light smoothing; the paddle never teleports to the finger on re-press; control feels responsive on both platforms | ✓ VERIFIED | `computeRelativePaddleX` anchors from prior paddle (`anchorPaddleX = paddleTarget` on pan begin/start); gain `1.25` / `SMOOTH_ALPHA 0.45`; `Gesture.Race(Pan,Tap)` on full playfield via `GameScreen` `GestureDetector`. Human UAT approved PHYS-01. |
| 2 | At the start of each life the ball rides the paddle and the player launches with an aimed tap/release; bricks take damage and disappear as the ball hits them | ✓ VERIFIED | `resetWorld`/`dockBall` → `SimPhase.DOCKED`, ball snapped each docked step; `launchFlag` → `processDocked` → `applyServe` (`resolvePaddleEnglish`, no `Math.random`); `stepWorld` + HP colors in `recordFrame`. UAT approved PHYS-05. |
| 3 | A player can deliberately aim the ball at a chosen brick within their first minute of play | ✓ VERIFIED | Positional aim: docked ball rides paddle; serve launches from paddle X into playable 7×5 grid with open aim space (`topMargin` 56). Human UAT signed SC-3 / PHYS-05 (“ổn rồi”). Note: docked serve always center-english after `dockBall` (see Anti-Patterns INFO). |
| 4 | A run ends with a clear win when the last breakable brick is destroyed and a clear lose when the last of three lives is spent | ✓ VERIFIED | `DEFAULT_LIVES=3`; `applyLivesFromEvents` → LOST at 0; `applyWinCheck` / `countBreakableAlive` excludes `UNBREAKABLE`; `ResultOverlay` Win/Lose + Retry; chrome `Lives · N`. UAT approved RUN-02. |
| 5 | The player can pause and resume, and backgrounding mid-rally for 60+ seconds auto-pauses and resumes via countdown with no physics catch-up jump | ✓ VERIFIED | Pause → `setActive(false)` + `resetAccumulator`; Resume Pressable → 3·2·1 → `setActive(true)`; `subscribeAppStateAutoPause` on `inactive\|background` only (active is no-op); first frame null dt → 16.67ms. UAT approved PLT-01. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------- | ------- |
| `src/input/paddleIntent.ts` | Relative paddle math | ✓ VERIFIED | Exists, substantive, used by gesture hook + tests |
| `src/input/gestureGates.ts` | Serve/resume gates | ✓ VERIFIED | `shouldAcceptServeTap` wired in gesture; resume predicate unit-tested (Resume is Pressable, not playfield) |
| `src/runtime/freeze.ts` | Accumulator helpers | ✓ VERIFIED | Used conceptually; `useGameLoop` inlines reset for worklet portability |
| `src/core/stepRun.ts` | Dock/serve + stepWorld + lives/win | ✓ VERIFIED | Calls `stepWorld` only while PLAYING |
| `src/core/rules/serve.ts` | dockBall + applyServe | ✓ VERIFIED | `resolvePaddleEnglish` serve |
| `src/core/rules/lives.ts` | BALL_OUT → lives / re-dock / lose | ✓ VERIFIED | Wired from `stepRun` |
| `src/core/rules/win.ts` | Breakables-only win | ✓ VERIFIED | UNBREAKABLE excluded |
| `src/core/levels/phase3Grid.ts` | Multi-HP + steel grid | ✓ VERIFIED | HP 1/2/3 + ≥3 steel bricks |
| `src/render/camera.ts` / `recordSprites.ts` / `GameCanvas.tsx` | Letterbox + entities + opaque | ✓ VERIFIED | Uniform scale + black bars; bricks/paddle/ball; `opaque` |
| `src/input/usePaddleGesture.ts` | Race pan+tap SharedValues | ✓ VERIFIED | Composed in `GameHost` |
| `src/runtime/useGameLoop.ts` | Intent → stepRun + freeze | ✓ VERIFIED | `retry()` resets grid+dock without app importing core |
| `src/runtime/appStatePause.ts` | AppState auto-pause | ✓ VERIFIED | Wired in `useGameLoop` effect |
| `app/_components/GameHost.tsx` | LC-05 composition | ✓ VERIFIED | Plan path was `app/GameHost.tsx`; shipped under `_components/` and mounted from `app/index.tsx` — same contract |
| `src/runtime/GameScreen.tsx` | Canvas + chrome + overlays | ✓ VERIFIED | GestureDetector + HUD + overlay stack |
| Overlays (`Pause` / `Countdown` / `Result`) | Pause FSM + win/lose | ✓ VERIFIED | Resume a11y label; 3·2·1; Win/Lose + Retry |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `paddleIntent.ts` | Intent absolute X | `computeRelativePaddleX` | ✓ WIRED | Never finger absolute X alone |
| `usePaddleGesture.ts` | `paddleIntent` / gates | pan update + serve tap | ✓ WIRED | `translationX` / camScale × gain; `shouldAcceptServeTap` |
| `stepRun.ts` | `stepWorld` | PLAYING only | ✓ WIRED | Manual confirm (gsd-tools regex escape false-negative) |
| `serve.ts` | `resolvePaddleEnglish` | applyServe | ✓ WIRED | |
| `win.ts` | `BrickFlags.UNBREAKABLE` | countBreakableAlive | ✓ WIRED | |
| `recordSprites.ts` | camera + World SoA | letterbox draw | ✓ WIRED | Inline letterbox; brickHp/paddleX/ballX |
| `GameCanvas.tsx` | Skia opaque | `opaque` prop | ✓ WIRED | |
| `useGameLoop.ts` | `stepRun` + freeze | substeps + setActive | ✓ WIRED | Manual confirm `stepRun(` |
| `appStatePause.ts` | AppState | inactive/background | ✓ WIRED | active → no resume |
| `GameHost` | gesture + loop | compose + retry/setActive | ✓ WIRED | Path `app/_components/GameHost.tsx` |
| `PauseOverlay` | countdown → unfreeze | `accessibilityLabel="Resume game"` | ✓ WIRED | Host `onResume` timers |
| `GameScreen` | `GestureDetector` | `playfieldGesture` prop | ✓ WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `GameScreen` lives HUD | `lives` | `livesOut` SharedValue ← `world.lives` each frame | Yes — core events / reset | ✓ FLOWING |
| `GameScreen` result | `result` win/lose | `simPhaseOut` → `applyWorldChrome` | Yes — win/lives rules | ✓ FLOWING |
| `GameCanvas` picture | `picture` SV | `recordFrame(world, …)` in frame callback | Yes — live World SoA | ✓ FLOWING |
| Paddle motion | `paddleTarget` | Pan → `computeRelativePaddleX` → Intent | Yes — gesture | ✓ FLOWING |
| Serve | `launchFlag` | Tap gate → `stepRun` / `processDocked` | Yes — cleared after consume | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full suite (phase + prior) | `npm test -- --run` | 16 files, 65/65 passed | ✓ PASS |
| Serve / lives / win / grid / drag / freeze | `npx vitest run tests/rules.*.test.ts tests/levels.phase3-grid.test.ts tests/input.paddle-intent.test.ts tests/runtime.accumulator-reset.test.ts` | 18/18 passed | ✓ PASS |
| No `Math.random` in serve/input | `rg Math.random src/core/rules src/input` | No matches | ✓ PASS |
| App does not import core | `rg "from .*core" app/` | No matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| PHYS-01 | 00, 02, 03, 05 | Relative-drag paddle with gain/smoothing | ✓ SATISFIED | Helpers + Race gesture + UAT |
| PHYS-05 | 00, 01, 03, 04, 05 | Docked ball + aimed tap launch | ✓ SATISFIED | dock/serve + launchFlag + UAT |
| RUN-02 | 01, 02, 05 | 3 lives + clear win/lose | ✓ SATISFIED | lives/win rules + ResultOverlay + UAT |
| PLT-01 | 00, 04, 05 | Pause/resume + AppState + countdown, no catch-up | ✓ SATISFIED | freeze path + overlays + UAT |

No orphaned Phase 3 requirements in REQUIREMENTS.md beyond these four.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `tests/rules.serve.test.ts` | ~36–48 | Comment claims offset ball yields non-zero vx, but `processDocked` → `dockBall` before serve; test never asserts `vx !== 0` | ℹ️ Info | Misleading test comment; production serve is center-english (straight up). Aim is paddle **position**, which still satisfies SC-3 + approved UAT. |
| `src/input/gestureGates.ts` | `shouldAcceptResumeTap` | Predicate not called from Resume Pressable | ℹ️ Info | Resume is explicit Pressable (D-11); predicate documents contract + unit tests — not orphaned gameplay. |
| Plan artifact path `app/GameHost.tsx` | — | Shipped as `app/_components/GameHost.tsx` | ℹ️ Info | Intentional layout; wired via `app/index.tsx`. |

No blocker stubs (no TODO/FIXME/placeholder in phase playable path; Wave 0 `it.todo` stubs filled).

### Human Verification Required

None pending. Plan 05 human UAT was completed and approved after bug fixes (serve, lives chrome, HUD safe-area, pause overlay). Checklist in `03-05-SUMMARY.md`: PHYS-01, PHYS-05, RUN-02, PLT-01, D-11, and `npm test` 65/65 all Pass.

### Gaps Summary

No actionable gaps. Phase goal is achieved in code and confirmed by player UAT. Path naming for `GameHost` differs from PLAN frontmatter but is fully wired. Serve aim is positional (paddle X) rather than off-center english while docked — acceptable under D-08 discretion and UAT.

**Phase can be marked complete.**

---

_Verified: 2026-09-20T05:41:49Z_
_Verifier: Claude (gsd-verifier)_
