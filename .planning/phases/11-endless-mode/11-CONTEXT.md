# Phase 11: Endless Mode - Context

**Gathered:** 2026-09-25
**Status:** Ready for planning

<domain>
## Phase Boundary

A run that keeps producing boards until the player loses, with a record worth chasing.

**Delivers (N-END-01, N-END-02, N-END-03):**
- Wave loop: clearing a board advances to the next generated one inside the same run
- A written-down wave → difficulty ramp
- Endless records stored separately from campaign progress
- A seeded endless run that replays to the same wave
- A temporary `__DEV__` entry point so the mode is playable before Phase 14

**Does not deliver (this phase):**
- The real Title entry, mode select, or any production shell chrome (**Phase 14**)
- Daily challenge (**Phase 12**), achievements (**Phase 13**)
- Changes to `generate()` or its `SCHEDULE` — Phase 10 is closed
- Campaign behaviour of any kind

</domain>

<decisions>
## Implementation Decisions

### Wave → difficulty ramp
- **D-01: Difficulty clamps at 20; the seed changes every wave.** Waves 1→21 walk
  `difficulty 0..20` one step per wave; wave 21 onward stays at 20 with a fresh seed, so
  boards keep changing without the difficulty contract growing. Chosen over extending
  `D_MAX` specifically because that would re-open Phase 10 — a wider `SCHEDULE` needs its
  monotonicity proof and its 21 000-board sweep redone.
- **D-02: One wave is one difficulty step** (not a slower 2–3 wave ramp). With Phase 10's
  measured p50 of 108 s per board, a slower ramp puts the interesting difficulty an hour into
  a session.

### Wave transitions
- **D-03: Timed effects and multiball end with the wave; the ball re-docks.** Expand, slow and
  fireball expire, extra balls are dropped, and the new board starts from the existing
  dock-and-tap serve path. Lives, score and combo carry (roadmap SC-1).
  Rationale: a ball in flight across a board swap is an awkward state — position, velocity and
  brick lattice all change at once — and the dock path already exists and is tested.

### Lives
- **D-04: No new life mechanic.** Endless uses the campaign rules unchanged — lives start at 3,
  the 8 % extra-life drop is the only source, and `MAX_LIVES = 5` still caps it. A per-N-waves
  life grant was considered and rejected: it is a new, uncalibrated mechanic, and the cap is
  what stops a long run becoming unlosable.

### Entry point
- **D-05: A temporary `__DEV__` button**, alongside the existing Lv / Auto high / Cert WC /
  Crash dev buttons on the HUD. Phase 14 replaces it with the real Title entry and this one is
  deleted then. It must not appear in a production build.

### Claude's Discretion
- How the per-wave seed is derived from the run seed and wave index. It must be pure and
  deterministic so SC-4 holds (same run seed + same inputs ⇒ same wave sequence), and it must
  not reuse one seed across waves.
- The shape of the endless record in storage, within Phase 9's existing v4
  `(mode, levelId)` telemetry keying — `mode: 'endless'` already exists.
- What the HUD shows for wave number, and where.
- Whether board N+1 is generated eagerly during wave N or on transition, provided SC-5 holds.

</decisions>

<constraints_from_measurement>
## A consequence of D-01 that the plan must confront

Phase 10 measured its own output with a perfect bot over 840 boards:

| p50 | p95 | p99 | worst |
|-----|-----|-----|-------|
| 108 s | 259 s | 416 s | **1495 s** |

and recorded a deliberate, unasserted finding: **a bot that never misses needs 1495 s on the
worst board, and bot time is a *floor* on human time — so the top-of-range boards are
plausibly unfinishable by a real player.**

D-01 clamps endless at difficulty 20 forever. That means every wave from 21 on is drawn from
the hardest band — exactly the band that finding is about. A player who reaches wave 21 may
face an unbounded sequence of boards they cannot clear, which is a wall, not a difficulty
curve.

Phase 10's Wave 3 explicitly anticipated this: *"the tail itself is a Phase 11 balance signal,
deliberately left unasserted"*, and the dial constants were left unpinned precisely so this
phase could re-tune them. So the plan must either:

1. re-tune the dial constants at the top of the range and show the tail come down, or
2. establish that the wall is acceptable and say why — for an endless mode, "you eventually
   cannot clear a board" is a defensible ending condition if the run ends on lives rather than
   on a stall.

**Do not leave this unexamined.** It is the difference between an endless mode that ends when
the player misses and one that ends when the generator hands them something impossible.
Note that re-tuning `SCHEDULE` means re-running Phase 10's monotonicity proof and sweep — they
are the guard on any dial change, not an obstacle to it.

</constraints_from_measurement>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` § "Phase 11: Endless Mode" — goal + 5 success criteria
- `.planning/REQUIREMENTS.md` § "v1.2 Requirements" → N-END-01, N-END-02, N-END-03

### What this phase consumes
- `src/levelgen/` — `generate(seed, difficulty)`, `SCHEDULE`, the fixed grid. **Closed; do not modify.**
- `docs/ops/BOARD-GENERATOR.md` — the theorem, the dial table, the measured clear-time
  distribution, the `## Limits` section, and the discharged A1 record
- `.planning/phases/10-seeded-board-generator/10-04-SUMMARY.md` — the 840-board clear-time
  measurement and why the tail was left unasserted
- `src/services/storage/types.ts` + `telemetry.ts` — the v4 blob, `mode: 'endless'` already exists
- `docs/ops/PROGRESS-STORAGE.md`

### The run loop being extended
- `src/core/stepRun.ts` — per-step rule order (**`src/core` must not change**)
- `app/_components/PlayingHost.tsx` — run boundaries, `recordRunEnd`, the existing dev buttons
- `src/runtime/useGameLoop.ts` — `retry()` / reset-request path, the world reset
- `src/runtime/loadLevel.ts` — how a compiled level reaches the world today
- `docs/layer-contract.md` — LC-04 and the new LC-15/16/17 levelgen rows

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `applyCompiledLevel(world, compiled)` already swaps a board into a live world — the wave
  transition is a board swap plus a counter, not a new mechanism.
- The dock-and-tap serve path (`processDocked`) is what D-03 reuses; it is already the path
  taken after every life loss.
- Phase 9's `recordRunEnd({ levelId, score, outcome, livesRemaining, stats })` is the run-end
  seam; endless needs a mode and a wave number alongside it.
- The `__DEV__` HUD buttons in `PlayingHost` are the established pattern for D-05.

### Established Patterns
- `PLAYABLE_LEVEL_ORDER` is campaign-only and must stay that way — SC-3 forbids endless
  touching campaign unlocks, bests or stars.
- Storage writes are async and non-blocking: synchronous memory merge, `void` persist.
- Nothing may allocate on the simulation or render hot path. Generation is a JS cold path.

### Integration Points
- Phase 12 (daily) will reuse the same wave/board-swap machinery with a date-derived seed, so
  keep the board-swap seam separable from the endless-specific ramp.
- Phase 13 (achievements) reads the telemetry this phase writes under `mode: 'endless'`.

</code_context>

<specifics>
## Specific Ideas

- D-01 was chosen partly as a scope fence: clamping keeps Phase 10's proofs intact, where
  extending `D_MAX` would reopen a closed phase's monotonicity and sweep obligations.

</specifics>

<deferred>
## Deferred Ideas

- **Title entry, mode select and any real shell chrome** → Phase 14. D-05's dev button is
  explicitly temporary and must be deleted there.
- **Daily challenge** → Phase 12, which reuses this phase's board-swap seam.
- **Achievements over endless play** → Phase 13.
- **Which record is "the" record** (best wave vs best score) as a display decision → Phase 14.
  This phase stores both, per N-END-02.
- **Extending `generate`'s difficulty range** → not planned; D-01 exists to avoid it.

</deferred>
