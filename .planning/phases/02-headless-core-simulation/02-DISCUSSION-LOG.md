# Phase 2: Headless Core Simulation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 02-headless-core-simulation
**Areas discussed:** Paddle bounce / english, Speed envelope & tunneling, World shape (multi-ball ready), Brick / collision API

---

## Area: Paddle bounce / english

**Q:** Classic Breakout english vs softer mapping vs other?
**Options presented:**
1. Classic Breakout — strong edge angles, speed preserved, hard clamps (recommended)
2. Softer english — less skill expression
3. Other
**Selected:** 1 — Classic Breakout
**Notes:** Configurable angle clamps; classic feel priority.

---

## Area: Speed envelope & tunneling

**Q:** How to define max speed and tunneling bar?
**Options presented:**
1. Named designed-max-speed constant; property test at 2× (recommended)
2. Relative-only tests without absolute design speed
3. Other
**Selected:** 1
**Notes:** Define maximum designed ball speed; validate swept collisions at 2× that speed.

---

## Area: World shape (multi-ball ready)

**Q:** N-ball + event ring now vs single-ball until Phase 5?
**Options presented:**
1. SoA N-ball capacity + event ring; one ball active in Phase 2 (recommended)
2. Hard single-ball; multi-ball later
3. Other
**Selected:** 1
**Notes:** Reserve N-ball and event ring from the beginning; activate only one ball in Phase 2.

---

## Area: Brick / collision API

**Q:** Multi-HP / unbreakable metadata now vs destroy-on-hit only?
**Options presented:**
1. Hit result + multi-HP + unbreakable fields; levels in Phase 4 (recommended)
2. Destroy-on-hit only; HP later
3. Other
**Selected:** 1
**Notes:** Support multi-HP and unbreakable brick metadata in the collision API; defer full level implementation to Phase 4.

---

## Batch confirmation

User replied `1,1,1,1` and restated priorities: classic Breakout control feel, deterministic physics, multi-ball extensibility, flexible collision API for later brick types.

---

*End of discussion log*
