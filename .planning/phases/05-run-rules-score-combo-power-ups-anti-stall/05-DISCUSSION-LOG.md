# Phase 5: Run Rules — Score, Combo, Power-ups, Anti-Stall - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 05-run-rules-score-combo-power-ups-anti-stall
**Areas discussed:** Score & combo, Drop rules, Catch & multi-ball life, Anti-stall

**User priorities:** Skill-rewarding score/combo; balanced power-ups; deterministic anti-stall; all logic in `core/` with unit tests; no advanced HUD / neon / audio in Phase 5.

---

## Score & combo

| Option | Description | Selected |
|--------|-------------|----------|
| Hit/BREAK × combo | | |
| BREAK only | | |
| Hit + larger BREAK bonus × combo | | ✓ |

**User's choice:** Points on every hit + larger destroy bonus; both × combo.

| Option | Description | Selected |
|--------|-------------|----------|
| +1 per hit; reset on paddle | | ✓ |
| Cap at ×N | | |
| Soft time decay | | |

**User's choice:** +1 consecutive; reset on any paddle contact; deterministic multi-ball.

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal Score · N + combo SharedValues | | ✓ |
| World/tests only | | |
| You decide | | |

**User's choice:** Minimal chrome; polish Phase 6; configurable core constants + unit tests.

---

## Drop rules

| Option | Selected |
|--------|----------|
| Drop only on BREAK | ✓ |
| Multi-ball + expand only | ✓ |
| +2 balls on catch (no replace/reset) | ✓ |
| Expand 1.5× / 10s refresh, no width stack | ✓ |
| ~20% in 15–25% band | ✓ |

**Notes:** Gameplay RNG only; tests for drop, cap, expire/refresh, replay.

---

## Catch & multi-ball life

| Option | Selected |
|--------|----------|
| AABB paddle catch, no magnet | ✓ |
| Miss below field → remove | ✓ |
| Life only when activeBallCount → 0 | ✓ |
| Life reset: clear pickups/expand, dock 1; keep score/bricks | ✓ |
| Spawn +2 fixed angular offsets from paddle | ✓ |

**Notes:** Unit tests for catch, miss, life-loss, cleanup, deterministic spawn.

---

## Anti-stall

| Option | Selected |
|--------|----------|
| No breakable damage for 8s active sim | ✓ |
| Tier: warning → speed → angle nudge | ✓ |
| Minimal Stall! + tier chrome | ✓ |
| Reset on HIT/BREAK any ball; not wall/paddle | ✓ |

**Notes:** Pause/countdown/background do not advance timer; no random jitter; respect max speed/clamps; unit tests for thresholds, pause, multi-ball, replay.

---

## Claude's Discretion

- Exact point values, drop type weights, spawn angle numbers, stall tier magnitudes, flat pickup art

## Deferred Ideas

- Phase 6 HUD/high score; Phase 7 neon/audio; extra pickup types; magnetic catch
