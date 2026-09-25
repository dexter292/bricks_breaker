---
phase: 10-seeded-board-generator
plan: 00
subsystem: levelgen
tags: [eslint, eslint-plugin-boundaries, mulberry32, prng, determinism, fnv-1a, vitest, layer-contract]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "eslint boundaries layer matrix, docs/layer-contract.md, src/core/rng/mulberry32.ts, src/core/hash.ts, LOGICAL_WIDTH/LOGICAL_HEIGHT"
  - phase: 04-levels
    provides: "LevelFileV1 / BrickTypeDef schema and level-03's proven lattice"
provides:
  - "src/levelgen registered as a boundaries element — the layer matrix now applies to it (was silently exempt)"
  - "N-GEN-01 ambient-input lint block scoped to src/levelgen/**, including the implementation-approximated Math ban"
  - "LC-15 / LC-16 / LC-17 recorded in docs/layer-contract.md"
  - "makeRng / below / shuffleInPlace / hashSeed / mixSeed — integer-only, hang-proof, no thread directive"
  - "GRID — the one fixed lattice (D-02), proven to fit 360x640"
  - "BRICK_TYPES — the frozen five-key E1b template"
  - "src/levelgen/index.ts — the barrel Phase 11/12 import surface"
  - "tests/levelgen.determinism.test.ts — 12 live cases + the 4 generator pins as it.todo"
affects: [10-01, 10-02, 10-03, 10-04, 10-05, 11-endless, 12-daily, 14-mode-shell]

actuals:
  tokens: 7600
  tasks: 3
  commits: 3
plan_head_before: 6f139edb9ec6ae999d6b1665fd2d0da337976597

tech-stack:
  added: []
  patterns:
    - "New src/ layers must be registered in boundaries/elements or they are exempt from the whole matrix"
    - "Integer-only PRNG on the JS cold path — no 'worklet' directive, no float draws"
    - "Lint rule messages open with their contract id (N-GEN-01:), matching the D-13/LC-07 house convention"

key-files:
  created:
    - src/levelgen/rng.ts
    - src/levelgen/grid.ts
    - src/levelgen/index.ts
    - tests/levelgen.determinism.test.ts
  modified:
    - eslint.config.js
    - docs/layer-contract.md

key-decisions:
  - "Registration proven by a levelgen -> runtime probe reporting boundaries/dependencies, never by grepping the config"
  - "below()'s rejection limit stays a plain Number — u32-coercing it hangs the suite on every power-of-two n"
  - "hashSeed normalises a non-finite number to 0 rather than letting NaN reach the PRNG state"
  - "GRID reuses level-03's already-proven lattice rather than inventing a new one"
  - "BRICK_TYPES is deep-frozen so the Pitfall 3 shared-reference mutation throws instead of silently corrupting later boards"

patterns-established:
  - "Mutation-check before claiming a test bites: break the implementation, observe the failure, restore"
  - "Test headers state what determinism is NOT covered (Hermes) rather than implying full coverage"

requirements-completed: [N-GEN-01, N-GEN-02]

coverage:
  - id: D1
    description: "src/levelgen is registered in the eslint boundaries matrix — a levelgen -> runtime import is now rejected, closing the silent-exemption hole RESEARCH Pitfall 5 probed"
    requirement: "N-GEN-01"
    verification:
      - kind: other
        ref: "npx eslint src/levelgen/__probe3.ts (levelgen -> runtime import) => exit 1, rule boundaries/dependencies"
        status: pass
    human_judgment: false
  - id: D2
    description: "Ambient input and implementation-approximated Math are banned inside src/levelgen/** with N-GEN-01-prefixed messages"
    requirement: "N-GEN-01"
    verification:
      - kind: other
        ref: "npx eslint src/levelgen/__probe.ts (Math.random) => exit 1, message opens 'N-GEN-01:'"
        status: pass
      - kind: other
        ref: "npx eslint src/levelgen/__probe4.ts (Math.pow/sin/cos/exp/log and **) => 6 errors, all N-GEN-01"
        status: pass
    human_judgment: false
  - id: D3
    description: "makeRng is a deterministic integer-only stream: same seed, same u32 sequence, never a float"
    requirement: "N-GEN-01"
    verification:
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#yields the same u32 sequence for the same seed from two separate closures"
        status: pass
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#never produces a float — every draw is an integer in [0, 2^32)"
        status: pass
    human_judgment: false
  - id: D4
    description: "below() terminates in bounded time for every power-of-two n — the Fisher-Yates hang trap cannot recur"
    requirement: "N-GEN-01"
    verification:
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#below() terminates and stays in range for every power-of-two n"
        status: pass
    human_judgment: false
  - id: D5
    description: "hashSeed normalises number | string seeds, including NaN, +/-Infinity, -1, 1e20 and '', to a finite u32 without poisoning the PRNG state"
    requirement: "N-GEN-01"
    verification:
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#maps every hostile seed to a finite u32"
        status: pass
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#a normalised hostile seed drives a usable PRNG state (no NaN propagation)"
        status: pass
    human_judgment: false
  - id: D6
    description: "GRID is the one fixed lattice (D-02) and fits 360x640 by the campaign's own bounds expression"
    requirement: "N-GEN-02"
    verification:
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#fits inside the 360x640 playfield by the campaign bounds expression"
        status: pass
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#has an even column count so every mirrored placement is a clean pair (D-01)"
        status: pass
    human_judgment: false
  - id: D7
    description: "LC-15 / LC-16 / LC-17 lock the levelgen crossings in prose alongside the config"
    verification: []
    human_judgment: true
    rationale: "That the prose rows accurately describe the policies actually installed in eslint.config.js is a review judgment; a grep proves the rows exist, not that they are correct."

duration: 16 min
completed: 2026-09-25
status: complete
---

# Phase 10 Plan 00: Governance + Integer Primitives Summary

**`src/levelgen` registered in the eslint layer matrix (it was silently exempt), plus an integer-only mulberry32 with a hang-proof rejection sampler and level-03's proven lattice frozen as the one fixed grid**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-25T11:13:00Z
- **Completed:** 2026-09-25T11:29:01Z
- **Tasks:** 3
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments

- **Closed the governance hole before any generator logic existed.** A new `src/` folder matches no `boundaries/elements` entry, so `src/levelgen` was exempt from the entire one-way layer matrix despite `default: 'disallow'`. It is now a registered element with an LC-15 policy (`levelgen -> levelgen | core` only), and the `app` and `services` policies were widened to reach the barrel (LC-16).
- **Made N-GEN-01's purity checkable by a command.** A `files`-scoped block bans `FORBIDDEN_IN_CORE` imports, the `performance` global, `Math.random` / `Date.now` / `performance.now`, and — new for this phase — `Math.pow/sin/cos/exp/log` and the `**` operator, because those are implementation-approximated and a last-bit difference crossing a `Math.floor` boundary changes a brick count.
- **Landed the two primitives everything else stands on:** a local mulberry32 returning u32 only, and `GRID` frozen at level-03's already-proven lattice.
- **Pinned all of it with 12 live cases** plus the four generator pins recorded as `it.todo` for plan 10-03. Suite runs in 210 ms.

## Task Commits

1. **Task 1: Register src/levelgen in the eslint layer matrix and the layer contract** — `b0c6679` (feat)
2. **Task 2: rng.ts + grid.ts + index.ts — integer primitives and the one fixed lattice** — `91fbd68` (feat)
3. **Task 3: tests/levelgen.determinism.test.ts — live rng/seed cases plus it.todo pins** — `9a5ee0c` (test)

## Files Created/Modified

- `eslint.config.js` — levelgen boundaries element, LC-15 policy, LC-16 widening of `app`/`services`, and the N-GEN-01 ambient-input block (+101 lines)
- `docs/layer-contract.md` — LC-15 and LC-16 allowed rows, LC-17 banned row, `npx eslint src/levelgen` added to the verify block
- `src/levelgen/rng.ts` — `makeRng` / `below` / `shuffleInPlace` / `hashSeed` / `mixSeed`; no `'worklet'`, no float draws, CSPRNG-misuse warning in the header
- `src/levelgen/grid.ts` — frozen `GRID` (D-02) with the fit arithmetic in the header, and the deep-frozen five-key `BRICK_TYPES` template
- `src/levelgen/index.ts` — the barrel; 10-02 adds `generate` / `SCHEDULE` / `D_MAX`
- `tests/levelgen.determinism.test.ts` — 12 live cases, 4 `it.todo` pins

## Evidence the registration is actually live

This is the part the plan called load-bearing, so the evidence is recorded verbatim rather than summarised:

```
src/levelgen/__probe3.ts
  1:31  error  There is no policy allowing dependencies from elements of type
               "levelgen" to elements of type "runtime"   boundaries/dependencies
✖ 1 problem (1 error, 0 warnings)          probe3-exit=1
```

`src/runtime`, `src/render` and `src/services` appear nowhere in `FORBIDDEN_IN_CORE`, so this crossing is one **only** the boundaries plugin can catch — which is exactly why it proves the element registration is live. A React Native probe would have failed on `no-restricted-imports` whether or not the element existed, and a `grep` over `eslint.config.js` is a string assertion, not evidence. The ambient-input block was proven separately (`probe1-exit=1`, message opening `N-GEN-01:`), as were all six Pitfall-6 selectors. All probe files were deleted; `git status --porcelain src/levelgen` is empty.

## Decisions Made

- **The `E` key is written unquoted (`E:`) in `BRICK_TYPES`** while `'1'/'2'/'3'` are quoted — numeric-looking keys need quoting, letters do not.
- **`hashSeed` maps a non-finite number to `0`.** Any fixed finite fallback collides with some legal seed; `0` is the most predictable choice and is documented. What matters is that `NaN` never reaches the PRNG state, where it would silently poison every subsequent draw rather than failing.
- **`mixSeed` XORs two `Math.imul` products with odd constants.** Multiplication by an odd constant is injective mod 2^32, so adjacent difficulties provably cannot collide — asserted across `d = 0..20` for four seeds rather than spot-checked.
- **`BRICK_TYPES` is deep-frozen, not just frozen.** A shallow freeze still permits `BRICK_TYPES['2'].hp = 5`, which is precisely the Pitfall 3 silent-corruption path.
- **Tests deep-import `../src/levelgen/rng` rather than the barrel.** Tests sit outside the element matrix, so this is legal, and it keeps the barrel an honest statement of what Phase 11/12 may use instead of a list widened for test convenience.

## Deviations from Plan

**1. [Rule 3 - Blocking] Worktree forked from a stale base**

- **Found during:** Pre-execution base check
- **Issue:** The harness forked this worktree from `8788caa` (a `main` PR-merge commit) rather than the orchestrator's `64a0b0c`. HEAD was **8 commits behind** — missing the entire `.planning/phases/10-seeded-board-generator/` directory, so the plan itself did not exist in the worktree — and `git merge --ff-only` was impossible because HEAD was not an ancestor.
- **Analysis:** The single divergent commit `8788caa` is a merge whose **both parents are already ancestors** of `64a0b0c`, so it contributes zero unique content.
- **Fix:** A plain `git merge` of `64a0b0c` (not a force, not a reset — nothing discarded). Verified afterwards that the worktree tree hash is **byte-identical** to the orchestrator base: `95364b34254033781f7e12ba94609c57f00bb93a`.
- **Verification:** `git diff --stat 64a0b0c HEAD` empty; tree hashes equal.
- **Committed in:** `6f139ed` (merge commit, recorded as `plan_head_before`)

**2. [Rule 1 - Bug] `nextFloat` named in a comment tripped its own acceptance criterion**

- **Found during:** Task 2
- **Issue:** The `rng.ts` header explained that the float helper was deliberately not ported — by naming it. Task 2's criterion is a literal `grep -c "nextFloat" src/levelgen/rng.ts` = 0, so the explanation failed the check it was explaining.
- **Fix:** Reworded to "the float-returning helper that file also exports". Intent preserved, criterion satisfied.
- **Verification:** `grep -c nextFloat src/levelgen/rng.ts` → `0`; typecheck and eslint re-run clean.
- **Committed in:** `91fbd68` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** No scope change. Deviation 1 was a precondition for executing at all; deviation 2 was cosmetic wording.

## TDD notes (tasks 2 and 3 carry `tdd="true"`)

The plan splits the RED/GREEN pair across two tasks by design — Task 2 owns the modules, Task 3 owns the test file, and Task 3's `<behavior>` block says every case is drawn from Task 2's. The behaviour contract was therefore fixed before implementation, but the executable assertions necessarily land after it, so the commits read `feat` then `test` rather than `test` then `feat`. Plan frontmatter is `type: execute`, not `type: tdd`, so the plan-level gate sequence does not apply.

Because a test written after a passing implementation proves nothing on its own, each group was **mutation-checked** — the implementation was deliberately broken, the failure observed, and the file restored with `git checkout --`:

| Mutation | Observed |
|---|---|
| `below()` limit coerced with `>>> 0` (the Pitfall 2 trap) | Suite **hangs** — `--testTimeout=4000` cannot even interrupt it, because a synchronous infinite loop blocks the event loop. Exactly the documented signature. |
| `hashSeed` finiteness guard removed | `hashSeed(-1) lower bound: expected -1 to be greater than or equal to 0` |
| `GRID.cols` 10 → 11 | `GRID right edge: expected 394 to be less than or equal to 360`, plus the even-cols case |

The working tree was verified clean after each restore.

## Issues Encountered

- **The Pitfall 2 mutation check hung a background process for 3 minutes** before I killed it (`pkill` plus a `kill -9` on a surviving vitest worker). This is the hazard behaving as documented, not a defect — but it is worth knowing that this trap cannot be caught by a test timeout, only by not writing it. The canary case exists so a future edit reintroducing the coercion hangs CI loudly rather than passing quietly.

## Known placeholders

The four `it.todo` entries in `tests/levelgen.determinism.test.ts` are **plan-mandated contract placeholders owned by plan 10-03**, not stubs left behind by this plan: repeat-call `JSON.stringify` identity, the pinned SHA-256 over the fixed corpus, the Hermes-portable u32 fingerprint, and `difficulty` clamping to `[0, D_MAX]`. They cannot be filled here because `generate` does not exist until 10-02. No stubbed source code was shipped.

## Requirements note

`requirements-completed` copies the plan's frontmatter verbatim. N-GEN-01's *enforcement machinery* ships here, but both N-GEN-01 and N-GEN-02 are also declared by sibling plans in this phase and are only genuinely satisfied once `generate` exists (10-02) and the sweep passes (10-03/10-04). The shared-ID gate handles this correctly — neither flips to Complete until the last declaring plan finishes.

## Verification

```
npm test                                          -> exit 0
  Test Files  83 passed (83)      (baseline 82, +1 mine)
  Tests       463 passed | 4 todo (467)   (baseline 451, +12 mine)
npm run typecheck                                 -> exit 0
npm run lint                                      -> exit 0
npx eslint src/levelgen                           -> exit 0
npx vitest run tests/levelgen.determinism.test.ts -> 12 passed | 4 todo, 210ms
git status --porcelain src/levelgen               -> empty
```

`src/core/**` was not touched. `git diff --name-only 64a0b0c HEAD` lists exactly the six files this plan owns — no STATE.md, no ROADMAP.md, no sibling-plan files.

## User Setup Required

None — this plan installs zero packages (the T-10-SC disposition holds) and touches no Expo API, so AGENTS.md's SDK 57 doc requirement has no surface here. Confirmed rather than assumed: the six files import only `vitest`, `../src/core` types, and each other.

## Next Phase Readiness

- **Ready for 10-02 (the tracer).** `makeRng`, `below`, `shuffleInPlace`, `hashSeed`, `mixSeed`, `GRID` and `BRICK_TYPES` are exported from the barrel; 10-02 adds `generate`, `SCHEDULE` and `D_MAX` to `src/levelgen/index.ts`.
- **Ready for 10-03.** The four `it.todo` entries name the pins to fill.
- **Concern carried forward, not resolved here:** assumption A1 (Hermes byte-identity) remains unmeasured. The test header says so explicitly rather than implying coverage. Plan 10-05 owns the on-device falsification, and Phase 12's daily challenge is the mode that cannot tolerate A1 being false.
- **Live guard for later phases:** any new `src/` layer added from here on must be registered in `boundaries/elements`, or it inherits the same silent exemption this plan just closed.

## Self-Check: PASSED

- All 6 key files exist on disk (`[ -f ]` verified).
- All 3 task commits exist: `b0c6679`, `91fbd68`, `9a5ee0c`.
- `commits: 3` is measured via `git rev-list --count 6f139ed..HEAD`, not narrated.
- All task-level acceptance criteria re-run and passing; plan-level `<verification>` block re-run and clean.

---
*Phase: 10-seeded-board-generator*
*Completed: 2026-09-25*
