---
phase: 02-headless-core-simulation
verified: 2026-09-20T03:56:32Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
gaps: []
---

# Phase 2: Headless Core Simulation Verification Report

**Phase Goal:** Ball and paddle physics are correct, deterministic, and provably free of tunneling before any pixels exist
**Verified:** 2026-09-20T03:56:32Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Roadmap success criteria (phase contract). Plan-level must_haves from 02-00…02-05 are supporting detail under Artifacts / Key Links.

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1   | The world advances only in fixed timesteps with a frame clamp and max-substep cap; the same inputs delivered in different frame chunkings produce an identical end state (golden-replay hash) | ✓ VERIFIED | `FIXED_DT`/`MAX_SUBSTEPS`/`MAX_FRAME_TIME` in `src/core/constants.ts` + host loop in `useSpikeLoop.ts` (`dt` clamped, accumulator + maxSubsteps, no partial leftover step). Golden-replay + PROP-DETERM in `tests/physics.golden-replay.test.ts` assert identical `hashWorld` / ball / brickHp / RNG across chunkings. Spot-check: suite green. |
| 2   | A property test fires balls at 2× the intended maximum speed through a dense brick grid with zero tunneling and zero missed collisions against paddle, walls, and bricks | ✓ VERIFIED | `PROP-TUNNEL` in `tests/physics.tunneling.prop.test.ts` (`numRuns: 100`, `speed = 2 * MAX_BALL_SPEED`, dense unbreakable grid, dual oracle: center not inside solid brick; free-segment crossings yield brick event or earlier TOI stop; side/top escape requires `WALL_HIT`). Full CCD path includes paddle via `stepWorld`; paddle AABB also covered by `tests/physics.sweep.test.ts`. Spot-check: prop test green (~327ms). |
| 3   | Bounce direction is a function of the paddle-relative contact point, with clamps that prevent near-horizontal and near-vertical trajectories, verified by tests at the clamp edges | ✓ VERIFIED | `resolvePaddleEnglish` in `src/core/physics/resolve.ts` maps `t∈[-1,1]` → ±62° clamp, preserves speed, enforces min vertical / upward `vy`. Unit clamp-edge cases in `tests/physics.paddle.test.ts`; PROP-CLAMP / PROP-SPEED in tunneling prop suite. Wired from `stepWorld` on paddle hits. |
| 4   | No React state is written during simulation, and `Math.random()` or wall-clock reads inside the simulation directory fail the build — all randomness comes from two seeded streams | ✓ VERIFIED | `src/core/**` has no React imports / `setState`. Dual `rngGameplay`/`rngCosmetic` on World (`allocate.ts` / `mulberry32.ts`). ESLint `no-restricted-syntax` bans `Math.random` / `Date.now` / `performance.now` under `src/core/**`; `tests/core.purity.test.ts` regex gate. Host mutates SharedValues only (not React state every physics frame). `eslint src/core` exit 0. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `package.json` | fast-check@4.10.2 + @fast-check/vitest@0.5.0 | ✓ VERIFIED | Pinned in `devDependencies` |
| `eslint.config.js` | D-13 RNG/clock bans + nested `src/core/**` boundaries | ✓ VERIFIED | `files: ['src/core/**/*.{ts,tsx}']` + restricted globals/syntax; boundaries `src/core/**` |
| `tests/core.purity.test.ts` | Regex purity gate | ✓ VERIFIED | Platform imports + RNG/clock walk |
| `src/core/types.ts` | World / Intent / Hit / flags | ✓ VERIFIED | SoA World + dual RNG slots |
| `src/core/allocate.ts` | Prealloc World SoA | ✓ VERIFIED | Dual RNG + event ring + effect reserve |
| `src/core/rng/mulberry32.ts` | Seeded streams | ✓ VERIFIED | `nextU32` / `nextFloat` on slot |
| `src/core/events/ring.ts` | Fixed-capacity pushEvent | ✓ VERIFIED | Drop-newest + overflow |
| `src/core/hash.ts` | FNV-1a hashWorld | ✓ VERIFIED | Used by golden-replay |
| `src/core/physics/sweep.ts` | sweepCircleAabb TOI + normal | ✓ VERIFIED | ~219 lines, face/corner normals |
| `src/core/physics/broadphase.ts` | Grid cell candidates | ✓ VERIFIED | No quadtree; cell walk |
| `src/core/physics/integrate.ts` | advanceBall | ✓ VERIFIED | Wired from step |
| `src/core/physics/resolve.ts` | reflect + paddle english | ✓ VERIFIED | PHYS-04 clamps |
| `src/core/step.ts` | stepWorld CCD entry | ✓ VERIFIED | Walls/paddle/bricks, multi-HP, Intent finite guard, event ring |
| `src/core/index.ts` | Barrel exports | ✓ VERIFIED | Re-exports physics + stepWorld |
| `src/runtime/useSpikeLoop.ts` | Fixed-dt host (clamp/substeps) | ✓ VERIFIED | `allocateWorld` + `stepWorld(FIXED_DT)` |
| `tests/physics.world-shape.test.ts` | SoA / RNG shape | ✓ VERIFIED | Exists |
| `tests/physics.sweep.test.ts` | PHYS-02 unit sweeps | ✓ VERIFIED | Walls/paddle/brick @ max speed |
| `tests/physics.paddle.test.ts` | PHYS-04 clamps | ✓ VERIFIED | Edge ±1 + speed + degenerate inbound |
| `tests/physics.bricks.test.ts` | Multi-HP / unbreakable | ✓ VERIFIED | HP-2 break path; unbreakable; once-per-step damage |
| `tests/physics.tunneling.prop.test.ts` | PROP-TUNNEL/SPEED/CLAMP | ✓ VERIFIED | Nyquist run counts 100/50/50 |
| `tests/physics.golden-replay.test.ts` | PROP-DETERM / chunking | ✓ VERIFIED | Fixed + prop partitions |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `eslint.config.js` | `src/core/**/*` | no-restricted-syntax RNG/clock | ✓ WIRED | Config + purity test both gate |
| `tests/core.purity.test.ts` | `src/core` | walk + regex | ✓ WIRED | Green in suite |
| `src/core/allocate.ts` | `types.ts` | dual RNG + ring fields | ✓ WIRED | Returns full World |
| `useSpikeLoop.ts` | `src/core` | `allocateWorld` + `stepWorld` | ✓ WIRED | Fixed-dt host loop |
| `tests/physics.paddle.test.ts` | `resolve.ts` | `resolvePaddleEnglish` | ✓ WIRED | Imports + asserts |
| `resolve.ts` | `constants.ts` | clamp literals (62°) | ✓ WIRED | Worklet inlines match exports |
| `src/core/index.ts` | `physics/*` | re-exports | ✓ WIRED | sweep/resolve/integrate/broadphase |
| `step.ts` | `sweep.ts` | earliest TOI / CCD | ✓ WIRED | Walls, paddle, bricks |
| `step.ts` | `resolve.ts` | paddle english vs reflect | ✓ WIRED | Kind-dispatched |
| `step.ts` | `events/ring.ts` | `pushEvent` | ✓ WIRED | Hits / break / ball-out |
| `physics.tunneling.prop.test.ts` | `src/core` | `stepWorld` @ 2× speed | ✓ WIRED | Prop suite |
| `physics.golden-replay.test.ts` | `hash.ts` | `hashWorld` equality | ✓ WIRED | Chunk identity |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `stepWorld` | ball / brick SoA | Caller World + Intent + `dt` | Mutates live typed arrays; events into ring | ✓ FLOWING |
| `resolvePaddleEnglish` | `vx`/`vy` out | Impact `t` + inbound speed | Computed angles (not stubs) | ✓ FLOWING |
| Golden-replay | `hashWorld` | Full World bit mix | Distinct seeds differ; same seed+intents match | ✓ FLOWING |
| PROP-TUNNEL | oracles | Post-`stepWorld` pose + events | Asserts against simulated state | ✓ FLOWING |

Headless phase: no UI components rendering dynamic data. Spike host still blanks playfield (Phase 3) — intentional.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full suite | `PATH=…/node@24/bin:$PATH npm test` | 8 files, 31 tests passed (~492ms) | ✓ PASS |
| Prop + golden | `vitest run tests/physics.tunneling.prop.test.ts tests/physics.golden-replay.test.ts` | 6 passed (PROP-TUNNEL ~327ms) | ✓ PASS |
| Core ESLint | `eslint src/core/**/*.{ts,tsx} --max-warnings 0` | exit 0 | ✓ PASS |
| Core purity (no RNG/clock) | `rg 'Math.random\|Date.now\|performance.now' src/core` | no matches | ✓ PASS |

Note: system default `node` (Homebrew 25) is broken (`libsimdjson.29.dylib`); Node 24 was used for spot-checks. Orchestrator evidence on main matches these results.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| **PHYS-02** | 02-02, 02-04, 02-05 | Swept deterministic collision; no tunneling at designed max (proven at 2×) | ✓ SATISFIED | `sweep.ts` + `stepWorld` CCD; sweep/bricks unit tests; PROP-TUNNEL |
| **PHYS-03** | 02-02, 02-05 | Unit + property tests (extreme speeds / dense grids) | ✓ SATISFIED | 6 physics test files + fast-check props (100/50/50/20 runs) |
| **PHYS-04** | 02-03, 02-05 | Paddle-relative bounce + clamps / non-degenerate | ✓ SATISFIED | `resolvePaddleEnglish`; paddle unit + PROP-CLAMP/SPEED |
| **PHYS-06** | 02-00, 02-01, 02-04, 02-05 | Fixed timestep; no React writes every physics frame; determinism | ✓ SATISFIED | Host clamp/substeps; golden-replay; purity lint/tests; SharedValues not `setState` |

**Orphaned requirements:** none — PHASE 2 maps exactly PHYS-02, PHYS-03, PHYS-04, PHYS-06; all appear in plan frontmatter.

**Doc lag (non-blocking):** `.planning/REQUIREMENTS.md` checklist still has PHYS-04 / PHYS-06 unchecked and Traceability still says Pending for those IDs, while PHYS-02/03 are marked Complete. Implementation satisfies all four; checklist/traceability should be updated by the orchestrator when closing the phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TODO/FIXME/placeholder stubs under `src/core` | — | — |
| `tests/` | — | No dedicated unit test for non-finite `Intent.paddleX` (T-02-01 guard exists in `step.ts`; sweep T-02-01 covers geometry only) | ℹ️ Info | Error path implemented but under-tested — not a goal blocker |
| PROP-TUNNEL | — | Explicit oracles emphasize bricks/walls; paddle non-tunneling is via full `stepWorld` + separate sweep unit coverage rather than a paddle-specific prop oracle | ℹ️ Info | SC2 still met; denser paddle tunneling prop would be belt-and-suspenders |

### Human Verification Required

None. Phase goal is headless / Node-provable; automated suite and lint gates cover the contract. (Play feel and on-device gestures are Phase 3.)

### Gaps Summary

No actionable gaps. Phase goal achieved: deterministic fixed-dt CCD simulation with paddle english, multi-HP/unbreakable brick rules, dual seeded PRNG purity gates, 2×-speed tunneling properties, and golden-replay identity — all verified against the codebase (not SUMMARY claims alone).

---

_Verified: 2026-09-20T03:56:32Z_
_Verifier: Claude (gsd-verifier)_
