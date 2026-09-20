# Phase 2: Headless Core Simulation - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Ball and paddle physics that are correct, deterministic, and provably free of tunneling — proven in Node under Vitest — before any pixels or gestures exist.

Delivers: `World` as preallocated SoA (extending/replacing the Phase 1 spike stub); fixed-timestep step with frame clamp + max-substep cap; swept circle-vs-AABB against walls, paddle, and brick grid; classic Breakout paddle-relative bounce with configurable angle clamps; multi-HP + unbreakable brick metadata in the collision/hit API; N-ball capacity + event ring with a single active ball; two seeded PRNG streams; golden-replay hash + tunneling property tests; lint/build failure on `Math.random()` / wall-clock in `core/`.

Does **not** deliver: Skia rendering of the sim, paddle gestures, level file format/authoring, serve/lives/win-lose UI, score/combo rules, power-up gameplay, neon VFX, or multi-ball activation in play.

</domain>

<decisions>
## Implementation Decisions

### Paddle bounce / english
- **D-01:** Classic Breakout paddle bounce — impact position along paddle width maps strongly to outgoing angle (skill expression).
- **D-02:** Preserve speed on paddle bounce (no energy loss that softens aim); clamp outgoing angle with **configurable** constants (research default band ~±60–65° / min vertical component — exact numbers are planner/researcher discretion within that classic feel).
- **D-03:** Degenerate near-horizontal and near-vertical trajectories must be prevented by clamps; verified by tests at clamp edges (PHYS-04).

### Speed envelope & tunneling
- **D-04:** Define an explicit **maximum designed ball speed** constant in `core/` (logical units / second).
- **D-05:** Swept collision must be validated by a property test that fires balls at **2×** that designed max through a dense brick grid with zero tunneling and zero missed collisions against paddle, walls, and bricks (PHYS-02 / PHYS-03).
- **D-06:** Fixed timestep (continue Phase 1 / research direction of `FIXED_DT = 1/120` unless tunneling tests force a documented change); frame clamp + max-substep cap; never integrate leftover accumulator as a partial step; no React state writes during simulation (PHYS-06).

### World shape (multi-ball ready)
- **D-07:** Reserve **N-ball capacity** in SoA from the start (fixed pool, active count); Phase 2 activates **exactly one** ball.
- **D-08:** Ship a fixed-capacity **event ring** in `core/` for collision / brick-hit / bounce records (consumers in later phases); simulation does not call services directly.
- **D-09:** Reserve a slot/list in world state for future power-up effects (empty / unused in Phase 2) so Phase 5 does not reshape the hot path.

### Brick / collision API
- **D-10:** Collision hit results and brick metadata support **multi-HP** and **unbreakable** (structural) bricks — reflect without HP loss; never count toward win condition (win logic may stub/defer).
- **D-11:** Defer full level format, authoring, validation, and migrations to **Phase 4**; Phase 2 uses inline/test-constructed grids that exercise the same brick fields the future runtime level will fill.
- **D-12:** Broadphase: treat the brick **grid as the acceleration structure** (no quadtree); swept circle-vs-AABB with explicit corner handling and iteration cap (research).

### Determinism & purity (locked with user priority)
- **D-13:** Two seeded PRNG streams (gameplay vs cosmetic); simulation never uses `Math.random()` or wall-clock reads — fail the build / tests if present under `src/core/`.
- **D-14:** Golden-replay: same seed + recorded intents chunked differently must yield identical end-state hash.
- **D-15:** Keep Phase 1 layer contract: `core/` imports nothing from React, Skia, Reanimated, or platform APIs; `'worklet'`-safe pure TS.

### Claude's Discretion
- Exact numeric values for paddle clamp degrees, designed max speed, ball radius, paddle size, `FIXED_DT` confirmation vs 1/120, N-ball capacity (e.g. 5–8), event ring size, and SoA field layout — must satisfy D-01…D-15 and PHYS-* success criteria
- Whether spike `SpikeWorld` is evolved in place or replaced by a new `World` type with a thin migration of the harness later
- Hash algorithm for golden-replay (must be stable across Node runs)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & phase scope
- `.planning/PROJECT.md` — Core value; feel mix 40/30/30; Arkanoid / Brick Breaker Maker as feel reference
- `.planning/REQUIREMENTS.md` — **PHYS-02**, **PHYS-03**, **PHYS-04**, **PHYS-06**
- `.planning/ROADMAP.md` — Phase 2 goal and success criteria
- `.planning/STATE.md` — Current position; Phase 1 simulator waiver / D-04 hardware debt (does not change Phase 2 headless scope)

### Prior phase decisions
- `.planning/phases/01-foundation-thread-boundary-spike/01-CONTEXT.md` — D-11…D-14 layer/hot-path rules; logical field size precedent
- `docs/layer-contract.md` — LC-* crossings; `core/` purity

### Research (mandatory)
- `.planning/research/SUMMARY.md` — Phase 2 deliverables; swept collision; PRNG; N-ball; event ring
- `.planning/research/ARCHITECTURE.md` — `core/` module map (`sweep`, `resolve`, `ring`, `mulberry32`); step loop sketch; Pitfalls avoided
- `.planning/research/PITFALLS.md` — Tunneling, gesture/frame-rate trap, silent non-determinism, multi-ball chaos
- `.planning/research/STACK.md` — Vitest + fast-check; custom physics (no matter-js)

### Existing code
- `src/core/` — Phase 1 spike stub (`SpikeWorld`, `allocateWorld`, `stepStub`) to extend or replace
- `src/runtime/useSpikeLoop.ts` — Accumulator / max-substep host pattern (runtime stays out of Phase 2 deliverable, but informs step API)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/allocate.ts` / `types.ts` / `step.ts` — Spike SoA stub; Phase 2 replaces stub integrator with real physics while keeping allocate-once + `'worklet'` style
- `src/core/constants.ts` — Logical 360×640 playfield precedent
- Vitest + ESLint purity rules already gate `core/`

### Established Patterns
- SoA typed arrays + UI-runtime mutation contract from Phase 1
- Fixed-timestep accumulator in `useSpikeLoop` (runtime); Phase 2 exposes pure `stepWorld(world, intent, dt)` for Node tests

### Integration Points
- Phase 3 will host `stepWorld` inside `useFrameCallback` and wire `paddleIntent`
- Phase 4 fills brick grid from level data into the same brick metadata fields
- Phase 5 activates multi-ball / power-ups against reserved capacity and event ring

</code_context>

<specifics>
## Specific Ideas

- Classic Breakout paddle bounce with **configurable** angle clamps (not hard-coded magic without names)
- Designed max ball speed constant; swept validation at **2×** that speed
- N-ball capacity + event ring from day one; **one** active ball in Phase 2
- Multi-HP + unbreakable metadata in collision API; full levels wait for Phase 4
- Feel reference: classic Arkanoid / Brick Breaker Maker (PROJECT.md) — arcade punch over soft physics

</specifics>

<deferred>
## Deferred Ideas

- Relative-drag paddle input, serve/aim launch, lives, win/lose screens — Phase 3
- Level format, validation, migrations, authored layouts — Phase 4
- Score, combo, multi-ball activation, paddle-expand, anti-stall rules — Phase 5
- HUD event mirrors, pause UI — Phase 6
- Neon VFX consuming the event ring — Phase 7
- Hardware 60 FPS re-cert (Pixel 6a / physical iOS) — MVP debt from Phase 1 waiver (D-04/D-05)

</deferred>

---

*Phase: 02-headless-core-simulation*
*Context gathered: 2026-09-20*
