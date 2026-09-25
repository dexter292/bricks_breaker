# Phase 5: Run Rules — Score, Combo, Power-ups, Anti-Stall - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

The run rewards skillful control and risk-taking, and no rally can dead-end: score + combo, multi-ball and paddle-expand pickups caught on the paddle, last-ball life loss, and deterministic visible anti-stall.

Delivers (all in `core/` with unit tests; thin SharedValue chrome only where SC requires visibility): scoring with hit + destroy bonus × combo; combo +1 on consecutive brick hits / reset on paddle contact; breakable BREAK → gameplay-RNG drop (~20%) of multi-ball or paddle-expand only; AABB catch on paddle / miss removes; +2 balls on multi-ball catch (respect `maxBalls`, fixed angular offsets); paddle expand 1.5× for 10s with duration refresh (no width stack); life only when `activeBallCount → 0`; life reset clears pickups/expand and docks one ball while preserving score + brick progress; stall after 8s sim without breakable damage with tiered deterministic escalation + minimal `Stall!` indicator.

Does **not** deliver: polished HUD / menus / high-score persistence (Phase 6); neon VFX / particles / destruction anim / audio (Phase 7); paddle-shrink or random bounce jitter (forbidden); advanced stall animations.

</domain>

<decisions>
## Implementation Decisions

### Score & combo (RUN-01)
- **D-01:** Award points on **every brick hit**, with a **larger bonus on BREAK**; apply the **current combo multiplier** to both.
- **D-02:** Combo **+1** per consecutive brick hit; **reset when any ball contacts the paddle**. Scoring remains **deterministic** under multi-ball (including simultaneous hits).
- **D-03:** Phase 5 shows minimal chrome: **`Score · N`** and a **small combo indicator** via SharedValue mirrors (same pattern as Lives). HUD polish deferred to Phase 6.
- **D-04:** Scoring constants live as **configurable `core/` constants** with unit tests for multi-HP hits, destroy bonuses, combo increment, paddle reset, and simultaneous multi-ball hits.

### Drop rules (PWR-01 / PWR-02)
- **D-05:** Roll **gameplay RNG only on breakable BREAK** — no pickups on intermediate hits.
- **D-06:** Pickup types this phase: **multi-ball** and **paddle-expand** only.
- **D-07:** Multi-ball catch spawns **+2 balls**, respecting `maxBalls`; **do not** replace existing balls or reset their trajectories.
- **D-08:** Paddle-expand: width **×1.5 for 10 seconds**; collecting another expand **refreshes duration** without stacking width; **clamp** expanded paddle within playfield.
- **D-09:** Default drop chance **20%** (configurable in the **15–25%** band). Pickup generation uses the **gameplay RNG** stream only. Unit tests: drop generation, ball-cap, effect expire/refresh, replay determinism.

### Catch & multi-ball life (PWR-01 / PWR-03)
- **D-10:** Catch via **AABB pickup vs paddle** each sim step — **no** magnetic attraction / auto-collect.
- **D-11:** Pickup falling **below the playfield** is removed.
- **D-12:** Deduct **exactly one life** only when **`activeBallCount` reaches 0** after the step. Losing individual balls while others remain must **not** reduce lives.
- **D-13:** On life reset (lives remaining): **clear falling pickups**, **expire expand**, restore normal paddle width, **dock exactly one ball**; **preserve score and destroyed-brick progress**.
- **D-14:** Spawn +2 from the **paddle** with **fixed deterministic angular offsets**; respect `maxBalls`; avoid near-horizontal; preserve existing balls/velocities. Unit tests: catch, miss, multi-ball life-loss, life-reset cleanup, deterministic spawn.

### Anti-stall (PHYS-07)
- **D-15:** Stall when **no breakable brick receives damage for 8 seconds of active simulation time**. Pause, countdown, and background time **must not** advance the stall timer.
- **D-16:** Deterministic tiers: **visible warning → mild speed increase → controlled angle correction** away from near-horizontal. **No random bounce jitter.** Respect designed **max ball speed** and bounce-angle clamps.
- **D-17:** Minimal chrome: **`Stall!` + current tier**. Advanced animations / neon → Phase 7.
- **D-18:** Reset stall timer + escalation when a **breakable brick is hit or destroyed** (any active ball). Wall/paddle collisions **do not** reset. Stall is tracked at **run level**. Unit tests: thresholds, resets, pause/resume, multi-ball, replay consistency.

### Claude's Discretion
- Exact point values for hit vs BREAK base scores
- Exact combo display formatting
- Exact drop table weights between multi-ball vs expand (within 20% total)
- Exact spawn angle offsets (must stay inside PHYS-04 clamps)
- Exact stall tier magnitude (speed Δ, angle nudge) within max-speed / clamp rules
- Pickup visual (flat Skia shape only — no neon)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` — Phase 5 goal + success criteria 1–5
- `.planning/REQUIREMENTS.md` — RUN-01, PWR-01, PWR-02, PWR-03, PHYS-07
- `.planning/PROJECT.md` — Core value; anti-features (no paddle-shrink, no random stall jitter)
- `.planning/STATE.md` — Current milestone position

### Prior phase decisions
- `.planning/milestones/v1.0-phases/02-headless-core-simulation/02-CONTEXT.md` — D-07 N-ball pool; D-08 event ring; D-09 effects reserve; D-13 dual PRNG
- `.planning/milestones/v1.0-phases/03-first-playable-render-input-bricks-lives-pause/03-CONTEXT.md` — lives/win/lose; pause freeze; SharedValue chrome mirrors
- `.planning/milestones/v1.0-phases/04-level-format-brick-types/04-CONTEXT.md` — levels pipeline (drops attach to BREAK events)

### Architecture / pitfalls
- `.planning/research/SUMMARY.md` — Phase run-rules deliverable; effects as data + stackPolicy
- `.planning/research/ARCHITECTURE.md` — effects list; derived paddle width; last-ball life
- `.planning/research/PITFALLS.md` — multi-ball chaos; power-up state explosion; no random jitter
- `docs/layer-contract.md` — core purity / worklet boundaries

### Existing code
- `src/core/types.ts` — `activeBallCount`, `effectType` / `effectUntilTick` reserves
- `src/core/constants.ts` — max balls / effects / speeds
- `src/core/step.ts` / `rules/lives.ts` / `physics/resolve.ts` — integrate score/effects/stall
- `src/core/rng/mulberry32.ts` — gameplay stream for drops
- `app/_components/GameHost.tsx` / `GameScreen.tsx` — Score/combo/Stall chrome mirrors

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- N-ball SoA + `activeBallCount` — activate multi-ball without reshaping World
- `effectCount` / `effectType` / `effectUntilTick` — fill for expand (and future effects)
- Event ring (`BRICK_HIT` / `BRICK_BREAK` / `PADDLE_HIT` / `BALL_OUT`) — drive score, drops, combo reset, stall reset
- Dual PRNG — drops on gameplay stream only
- Lives chrome SharedValue pattern — clone for Score / combo / Stall

### Established Patterns
- Derive paddle width from base + active effects (never assign absolute width ad hoc)
- Life evaluated once per step from ball count
- Pause / AppState freeze must not advance stall timer (same freeze gate as physics)

### Integration Points
- `stepWorld` / `stepRun`: score, combo, pickups, effects expire, stall tiers
- `recordSprites`: flat pickup rects + expanded paddle; no neon
- GameHost / GameScreen: minimal Score · N, combo, Stall! mirrors

</code_context>

<specifics>
## Specific Ideas

- Skill-first scoring: consecutive brick control raises combo; paddle touch is the intentional reset.
- Power-ups should feel worth chasing without breaking aim (expand refresh, not width stack; +2 balls without wiping velocities).
- Anti-stall must be honest and visible — player sees the escape, never silent random jitter.

</specifics>

<deferred>
## Deferred Ideas

- Polished HUD, menus, local high score — Phase 6 (RUN-04)
- Neon VFX, particles, audio for catch/break — Phase 7
- Additional pickup types (slow, sticky, laser) — backlog
- Magnetic catch — rejected for Phase 5

None beyond explicit deferrals above — discussion stayed in phase scope.

</deferred>

---

*Phase: 05-run-rules-score-combo-power-ups-anti-stall*
*Context gathered: 2026-09-20*
