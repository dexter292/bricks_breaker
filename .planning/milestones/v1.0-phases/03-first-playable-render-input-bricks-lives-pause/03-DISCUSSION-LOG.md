# Phase 3: First Playable — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 03-first-playable-render-input-bricks-lives-pause
**Areas discussed:** Visual first-playable, Paddle drag feel, Serve & aim launch, Pause / background resume, Win / lose presentation

---

## Opening priorities (user)

Gameplay correctness; snappy smooth paddle; easy touch aim/launch; safe background pause/resume. Keep graphics simple (basic colors). Defer neon VFX, advanced UI, and fancy win/lose to later phases.

---

## Visual first-playable

| Option | Description | Selected |
|--------|-------------|----------|
| A1 Navy palette | Navy bg + white ball/paddle + row-colored bricks | ✓ |
| A2 Darker accent | Black/gray + brighter accents | |
| A3 Claude decides | Within simple band | |

**User's choice:** A1
**Notes:** Flat shapes only; defer neon to Phase 7

---

## Paddle drag feel

| Option | Description | Selected |
|--------|-------------|----------|
| B1 Snappy arcade | Elevated gain, minimal smoothing | ✓ |
| B2 Balanced | Medium gain + clearer smoothing | |
| B3 Soft | Low gain, heavy smoothing | |
| C1 Entire playfield | Drag anywhere | ✓ |
| C2 Lower half only | Drag zone restricted | |
| C3 Claude decides | | |

**User's choice:** B1, C1
**Notes:** Relative drag; no teleport on re-press

---

## Serve & aim launch

| Option | Description | Selected |
|--------|-------------|----------|
| D1 Tap to serve | Angle from paddle position | ✓ |
| D2 Drag-release vector | Pull then release aim | |
| D3 Both | Tap + drag-release | |
| E1 No aim line | Docked ball only | ✓ |
| E2 Thin aim line | Preview angle | |
| E3 Claude decides | | |

**User's choice:** D1, E1

---

## Pause / background resume

| Option | Description | Selected |
|--------|-------------|----------|
| F1 Countdown then auto-run | 3s then play | |
| F2 Tap then countdown | Explicit tap, then 3s countdown | ✓ |
| F3 Tap only | No numbered countdown | |
| G1 Pause/Resume/Retry | Minimal overlay | ✓ |
| G2 Resume only | Retry only on lose | |
| G3 Claude decides | | |

**User's choice:** F2, G1
**Notes:** Auto-pause on background; reset accumulator; never auto-resume after OS interruption — tap first, then 3s countdown

---

## Win / lose / bricks

| Option | Description | Selected |
|--------|-------------|----------|
| H1 Win/Lose + Retry | Minimal overlay | ✓ |
| H2 + lives continue UI | Extra mid-life messaging | |
| H3 Claude decides | | |
| I1 One hardcoded grid | Multi-HP + unbreakable | ✓ |
| I2 2–3 rotating stubs | Temporary variety | |
| I3 Claude decides | | |

**User's choice:** H1, I1

---

## Additional hard requirement

Touching the screen to move the paddle must not accidentally trigger serve or resume. Keep gameplay gestures and UI actions clearly separated. → CONTEXT D-11 / D-12

---

## Claude's Discretion

- Exact gain/smoothing numbers within snappy band
- Serve angle mapping details (aligned with Phase 2 clamps)
- Picture layer split, letterbox math, Resume control placement, countdown visual
- Hardcoded grid layout; whether to rename Spike* files

## Deferred Ideas

- Neon VFX → Phase 7
- Polished win/lose / HUD / persistence → Phase 6
- Level format → Phase 4
- Aim line / drag-release serve → not Phase 3
- Hardware FPS re-cert → Phase 1 waiver debt
