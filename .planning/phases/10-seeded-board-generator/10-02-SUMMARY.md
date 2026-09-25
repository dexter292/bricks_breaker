---
phase: 10-seeded-board-generator
plan: 02
subsystem: levelgen
tags: [tracer, level-generation, reachability, flood-fill, determinism, monotonicity, particle-budget, tdd]

# Dependency graph
requires:
  - phase: 10-seeded-board-generator
    provides: "10-00 — makeRng / below / shuffleInPlace / hashSeed / mixSeed, the frozen GRID lattice, the levelgen eslint boundaries registration and the N-GEN-01 purity block"
  - phase: 10-seeded-board-generator
    provides: "10-01 — levelStaticsOf(raw, scoreHit), the object-taking authored-weight instrument, and the sweep/schedule it.todo scaffolds"
  - phase: 04-levels
    provides: "validateLevel / loadAndCompile / checkSolvability — the real core pipeline the tracer runs every board through"
provides:
  - "generate(seed, difficulty) -> LevelFileV1 — the phase's actual deliverable, the entry point Phases 11 and 12 both call"
  - "SCHEDULE / D_MAX / ScheduleEntry / envelope — the integer dial table and its monotonicity machinery"
  - "allNonSteelReachable(steel, cols, rows) — the generator's own invariant flood, deliberately stronger than the lint"
  - "the 525-board tracer sweep proving validate + compile + solvability + symmetry + exact weight end to end"
  - "the SC-5 explosive cluster cap and its independent test-side labelling"
affects: [10-03, 10-04, 10-05, 11-endless, 12-daily]

# Actuals (#2632)
actuals:
  tokens: 9700
  tasks: 2
  commits: 4
plan_head_before: 74a8237d8b38a26e7580b4fd42b15d5a5471f32c

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Invariant-preserving incremental placement: a single pass over a fixed candidate list, accept-or-drop, never retry — which is why it is not the generate-and-repair D-03 rejects"
    - "Exact integer counts from a table + seed chooses only which cells => the derived property is an equality, not a statistical inequality"
    - "Running-max envelopes so monotonicity is structural and a future tuner cannot break it by editing a number"
    - "Weight-free post-passes: because E and 1 are both hp 1, an E->1 demotion is a free knob on cluster shape"

key-files:
  created:
    - src/levelgen/schedule.ts
    - src/levelgen/reachability.ts
    - src/levelgen/generate.ts
  modified:
    - src/levelgen/index.ts
    - tests/levelgen.sweep.test.ts
    - tests/levelgen.schedule.test.ts

key-decisions:
  - "The invariant is checked on the FULL board after both cells of a mirrored pair are set, and the pair is accepted or reverted together — never the half"
  - "The steel-adjacency rule also rejects the centre seam automatically, because a pair at cols/2-1 and cols/2 is orthogonally adjacent to itself"
  - "Stage 3 demotes the last-in-scan-order member of an oversized cluster plus its mirror, so the cap consumes no rng draw and stays seed-reproducible"
  - "The T-10-09 clamping and T-10-11 aliasing cases were landed in the sweep file rather than the determinism file, so plan 10-03 keeps unambiguous ownership of its four pins"
  - "generate contains no executable reference to checkSolvability or validateLevel — verified by a comment-stripped grep, not by inspection"

patterns-established:
  - "RED via throwing stubs rather than absent exports: a missing named export fails the whole file at collection and discovers zero tests, which is INVALID_RED"
  - "Every sweep assertion carries a `s=${s} d=${d}` label as the second expect argument — at 525+ boards that is the difference between a usable failure and a needle hunt"

requirements-completed: [N-GEN-01, N-GEN-02, N-GEN-03]

coverage:
  - id: D1
    description: "generate(seed, difficulty) returns a LevelFileV1 that passes validateLevel and loadAndCompile on the real core pipeline, over 525 boards spanning every difficulty"
    requirement: "N-GEN-01"
    verification:
      - kind: integration
        ref: "tests/levelgen.sweep.test.ts#every board in the sweep passes validateLevel and loadAndCompile (10-02-01 / 10-02-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "checkSolvability reports zero unreachable breakables on every generated board — the D-03 by-construction claim, proven against the real lint"
    requirement: "N-GEN-02"
    verification:
      - kind: integration
        ref: "tests/levelgen.sweep.test.ts#checkSolvability reports zero unreachable breakables over the sweep (10-02-01)"
        status: pass
      - kind: other
        ref: "Mutation check: invariant flood removed from stage 1 => 's=0 d=13: expected [ { row: 1, col: 4, char: 2 }, ...(1) ] to deeply equal []'"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every board is left-right mirror symmetric and every row is exactly GRID.cols wide (D-01)"
    requirement: "N-GEN-02"
    verification:
      - kind: unit
        ref: "tests/levelgen.sweep.test.ts#each board is left-right mirror symmetric (D-01)"
        status: pass
    human_judgment: false
  - id: D4
    description: "levelStaticsOf(generate(s, d)) equals SCHEDULE[d] exactly for bricks and totalHp — authored weight is seed-independent by construction"
    requirement: "N-GEN-03"
    verification:
      - kind: unit
        ref: "tests/levelgen.sweep.test.ts#authored weight equals the schedule exactly for every (seed, difficulty) (10-03-02)"
        status: pass
    human_judgment: false
  - id: D5
    description: "SCHEDULE is non-decreasing in bricks and totalHp across the whole 0..D_MAX range, fits the half board, and satisfies n1 >= nE >= 0 — with no literal dial constant pinned anywhere"
    requirement: "N-GEN-03"
    verification:
      - kind: unit
        ref: "tests/levelgen.schedule.test.ts#bricks is non-decreasing across the full 0..D_MAX range (10-03-01)"
        status: pass
      - kind: unit
        ref: "tests/levelgen.schedule.test.ts#totalHp is non-decreasing across the full 0..D_MAX range (10-03-01)"
        status: pass
      - kind: unit
        ref: "tests/levelgen.schedule.test.ts#every difficulty fits the half board (10-03-01)"
        status: pass
      - kind: other
        ref: "grep -cE 'toBe\\([0-9]+\\)' tests/levelgen.schedule.test.ts => 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "No board carries an 8-connected explosive cluster larger than 4, and the cap is weight-neutral and symmetry-preserving"
    verification:
      - kind: unit
        ref: "tests/levelgen.sweep.test.ts#no 8-connected explosive cluster exceeds the cap (10-03-04)"
        status: pass
      - kind: other
        ref: "RED before stage 3: 's=22 d=2: expected 6 to be less than or equal to 4' — the same cluster-of-6 RESEARCH measured"
        status: pass
    human_judgment: false
  - id: D7
    description: "Hostile difficulty is clamped to [0, D_MAX] and the returned board never aliases module state (T-10-09 / T-10-11)"
    verification:
      - kind: unit
        ref: "tests/levelgen.sweep.test.ts#clamps difficulty to [0, D_MAX] rather than trusting the caller (T-10-09)"
        status: pass
      - kind: unit
        ref: "tests/levelgen.sweep.test.ts#returns JSON-identical output for repeated calls and never aliases its own output"
        status: pass
    human_judgment: false
  - id: D8
    description: "The three deliberate divergences of reachability.ts from the lint are documented with why each may not be relaxed, so a future reader cannot 'optimise' the proof away"
    verification: []
    human_judgment: true
    rationale: "That the prose accurately states why the stronger success condition buys content-independence is a review judgment; a grep proves the comment exists, not that it is right."

# Metrics
duration: 20 min
completed: 2026-09-25
status: complete
---

# Phase 10 Plan 02: The Tracer — One Board Through Every Layer Summary

**`generate(seed, difficulty)` now produces a symmetric, schedule-exact, lint-clean `LevelFileV1` end to end on the real `validateLevel` → `loadAndCompile` → `checkSolvability` pipeline for 525 boards, with steel placed one mirrored pair at a time under a full-board reachability invariant the generator maintains itself and never asks the lint about.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-25T19:30Z (local +08:00)
- **Completed:** 2026-09-25T19:50Z (local +08:00)
- **Tasks:** 2 (4 commits — RED/GREEN per task)
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- **D-03 is now a property of the code rather than an intention.** Stage 1 accepts steel one mirrored pair at a time, setting **both** `(r, c)` and `(r, cols-1-c)` and only then flooding the **full** `rows × cols` mask, accepting or reverting as a pair. 525 boards spanning every difficulty report zero unreachable breakables against the real `checkSolvability`, and `generate` contains no executable reference to the lint or the validator.
- **The invariant flood is deliberately stronger than the lint, and the file says why.** `allNonSteelReachable` requires *every non-steel cell* reachable, not merely every breakable. That extra strength is exactly what buys content-independence via Lemma 1 — an unreachable empty cell becomes an unreachable *brick* the moment stage 2 fills it — and it is the single most likely thing a future reader would "optimise" back to the weaker form. Three divergences from `solvability.ts` are enumerated in the header with why each may not be relaxed.
- **Authored weight is seed-independent by construction, so the sweep asserts an equality.** Exact counts come from `SCHEDULE[d]`; the seed only chooses *which* cells. `levelStaticsOf(generate(s, d), SCORE_HIT).bricks` and `.totalHp` equal the table for all 525 boards.
- **Monotonicity is an algebraic identity, not an observation.** `hb`, `n2`, `n3` are running maxima, and `totalHp = 2·(hb + n2 + 2·n3)` is a non-negative integer combination of three non-decreasing sequences. `bricks = 2·hb` is non-decreasing directly.
- **The SC-5 particle budget is now enforced.** Stage 3 caps the maximum 8-connected explosive cluster at 4 (peak 72 sparks against the Mid `particleCap` of 128), demoting in mirrored pairs so symmetry survives and to `'1'` so weight survives.
- **The three hostile-input mitigations are asserted, not assumed:** difficulty clamping (T-10-09), no unbounded loop anywhere (T-10-10, structural), and no output aliasing (T-10-11).

## Task Commits

1. **Task 1 (RED): the tracer sweep, the dial table, stubbed behaviour** — `411d938` (test)
2. **Task 1 (GREEN): the three-stage generator and its invariant flood** — `709492e` (feat)
3. **Task 2 (RED): explosive cluster cap and the schedule monotonicity guard** — `bf76771` (test)
4. **Task 2 (GREEN): stage 3 caps the 8-connected explosive cluster at 4** — `83c7315` (feat)

No REFACTOR commits: neither GREEN needed cleanup, and the TDD contract commits REFACTOR only when changes are made.

_Base for the measured commit count: `74a8237d8b38a26e7580b4fd42b15d5a5471f32c`; `git rev-list --count 74a8237..HEAD` → `4`._

## The schedule, printed from `SCHEDULE` (not hand-typed)

Produced by a throwaway vitest case that serialised `SCHEDULE` to disk and was deleted afterwards (`git status --porcelain` empty). `nE` is **per half board**; the full-board explosive count is twice it, which is how to compare against RESEARCH §Q4's table.

| d | rowsUsed | bricks | totalHp | nE (half) | steelPerHalf |
|---|---|---|---|---|---|
| 0 | 8 | 32 | 36 | 3 | 0 |
| 1 | 8 | 34 | 40 | 3 | 0 |
| 2 | 8 | 36 | 42 | 3 | 0 |
| 3 | 9 | 42 | 54 | 3 | 1 |
| 4 | 9 | 44 | 56 | 3 | 1 |
| 5 | 10 | 50 | 68 | 3 | 1 |
| 6 | 10 | 52 | 72 | 3 | 2 |
| 7 | 10 | 54 | 78 | 3 | 2 |
| 8 | 11 | 62 | 94 | 3 | 2 |
| 9 | 11 | 64 | 96 | 3 | 3 |
| 10 | 12 | 72 | 116 | 3 | 3 |
| 11 | 12 | 74 | 118 | 2 | 3 |
| 12 | 12 | 76 | 126 | 2 | 4 |
| 13 | 13 | 86 | 148 | 2 | 4 |
| 14 | 13 | 88 | 156 | 2 | 4 |
| 15 | 14 | 98 | 178 | 1 | 5 |
| 16 | 14 | 100 | 186 | 1 | 5 |
| 17 | 14 | 104 | 200 | 1 | 5 |
| 18 | 15 | 114 | 222 | 1 | 6 |
| 19 | 15 | 116 | 230 | 0 | 6 |
| 20 | 16 | 128 | 260 | 0 | 7 |

The `bricks` and `totalHp` columns reproduce RESEARCH §Q4's independently-computed table **exactly**, end to end (32/36 → 128/260), which is a useful cross-check that the implementation matches the design rather than a re-derivation of it. Calibration against the campaign holds as RESEARCH described: `d = 0` matches `level-01`'s 32 bricks, `d ≈ 13` matches `level-03`'s 94-brick showpiece, `d = 20` exceeds the hardest shipped board by ~36 %.

**Steel budget shortfalls over the tracer corpus: 0 / 525 boards.** The design tolerates a shortfall (steel carries zero authored weight) but does not need to.

A `d = 20, s = 0` board, for orientation — note the symmetric steel, the absence of orthogonally adjacent steel, and the fully used 16-row band:

```
21X....X12
32.2112.23
221X22X122
X32122123X
3133113313
3132222313
X33.33.33X
3121111213
31.3113.13
213.33.312
X2.3223.2X
32..11..23
2122222212
12X2332X21
322X11X223
3211331123
```

## Files Created/Modified

- `src/levelgen/schedule.ts` — **created.** `D_MAX = 20`, `ScheduleEntry`, `envelope()`, six dial series and the frozen 21-row `SCHEDULE`. Header carries the monotonicity identity, the D-08 correction (explosive is weight-**neutral**), and the standing instruction that no test may pin a literal dial value.
- `src/levelgen/reachability.ts` — **created.** `allNonSteelReachable(steel, cols, rows)`. Flood shape copied line-for-line from `solvability.ts:151-191` so the three divergences are the only differences.
- `src/levelgen/generate.ts` — **created.** Clamp → stage 1 steel → stage 2 content → stage 3 cluster cap → fresh emit.
- `src/levelgen/index.ts` — **modified.** Now re-exports `generate`, `SCHEDULE`, `D_MAX`, `envelope` and the `ScheduleEntry` type. `allNonSteelReachable` is deliberately **not** exported: it is stage 1's internal predicate, not part of the Phase 11/12 surface.
- `tests/levelgen.sweep.test.ts` — **modified.** 5 todos converted to live cases over a 525-board tracer corpus, plus the corpus-size case and the two hardening cases. 3 todos remain for 10-03.
- `tests/levelgen.schedule.test.ts` — **modified.** All 3 todos converted, plus a range case and an `n1 >= nE >= 0` / identity case. No literal dial constant is pinned.

## Decisions Made

- **The corpus is built lazily inside each `it`, never at module scope.** A throw at module scope fails the whole *file* and discovers zero tests — indistinguishable from a suite that was never written, and the `INVALID_RED` condition. Memoised so the 525-board generation cost is paid once.
- **The steel-adjacency rule rejects the centre seam for free.** On an even-width board a pair at `cols/2-1` and `cols/2` is orthogonally adjacent *to itself*, so the polish predicate rejects it without a special case. That turns out to matter more than expected — see the mutation table below.
- **Stage 3 draws nothing from the rng.** The victim is the last-in-scan-order member of the first oversized cluster in a fixed row-major labelling, so the cap is reproducible without consuming a draw and therefore cannot shift the stream for anything downstream.
- **`allNonSteelReachable` stays out of the barrel.** Exporting it would invite Phase 11 to call it on a finished board, which is the lint's job, not this predicate's.
- **The T-10-09/T-10-11 cases went in the sweep file, not the determinism file.** `tests/levelgen.determinism.test.ts`'s four `it.todo` pins are explicitly owned by plan 10-03 (see its header and 10-00's SUMMARY), and editing a sibling plan's file from this one would blur that ownership. Two of those todos are now redundant with the sweep cases; 10-03 can either delete them or fill them with the corpus-level pins (SHA-256 digest, Hermes fingerprint) that are the real reason the file exists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree forked from `origin/main` rather than the phase branch**

- **Found during:** Pre-execution base check
- **Issue:** The harness forked this worktree from `8788caa` (a GitHub PR-merge commit on `main`), so the worktree was missing all of Wave 0 — `src/levelgen/`, the eslint registration, and the three test scaffolds — and `10-02-PLAN.md` itself did not exist in it.
- **Fix:** `git merge --ff-only 74a8237d8b38a26e7580b4fd42b15d5a5471f32c`. Unlike both Wave 0 executors, **the fast-forward succeeded outright** (they had to fall back to a plain merge), because by then the phase branch already contained `8788caa` as an ancestor via commit `547a809`. No merge commit was created, so the plan base is the orchestrator's HEAD exactly. No `reset --hard`, `clean`, `update-ref` or `stash` was used.
- **Verification:** `git rev-parse HEAD` → `74a8237…` before the first edit; `git rev-list --count 74a8237..HEAD` → 4, all mine.
- **Committed in:** n/a (fast-forward, no commit)

**2. [Rule 2 - Missing Critical] Added the T-10-09 / T-10-11 hardening cases, for which the scaffold had no landing site**

- **Found during:** Task 1
- **Issue:** Task 1's `<behavior>` block requires that `generate(7, 3)` called twice be `JSON.stringify`-identical, that mutating the first result not change the second, and that `generate(1, -5)` / `generate(1, 999)` clamp to the endpoints. The threat register names these as the *whole* mitigation for T-10-09 (unclamped difficulty → out-of-range table index) and T-10-11 (shared `grid`/`brickTypes` handed out by reference → determinism dies silently, with no error anywhere). The sweep scaffold from 10-01 had no todo for either, and the determinism file's matching todos are owned by 10-03 — so both mitigations would have shipped unasserted.
- **Fix:** Added a `tracer determinism and input hardening (T-10-09 / T-10-11)` describe to `tests/levelgen.sweep.test.ts` with exactly those three assertions and nothing more.
- **Files modified:** `tests/levelgen.sweep.test.ts`
- **Verification:** Both cases were RED against the throwing stub and are GREEN against the implementation. The aliasing case mutates `a.grid.cols` and `a.brickTypes['1']` and then re-generates, which is the only formulation that actually detects a shared reference.
- **Committed in:** `411d938` (RED) and `709492e` (GREEN)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** No scope change. Deviation 1 was a precondition for reading the plan at all; deviation 2 asserts contracts the plan's own behaviour block and threat register already demanded.

## TDD notes (both tasks carry `tdd="true"`)

Plan frontmatter is `type: execute`, not `type: tdd`, so the plan-level gate sequence does not apply; both tasks were nonetheless run RED-first.

**RED used throwing stubs rather than absent exports.** Importing a non-existent named export makes vitest fail the whole *file* at collection — zero tests discovered — which is the `INVALID_RED` condition (#3770) and would not have authorised GREEN. `generate` and `allNonSteelReachable` were shipped in the RED commit as functions that throw with their arguments in the message, so every case was discovered and failed on its own call.

`src/levelgen/schedule.ts` was written in full in the RED commit rather than stubbed, because it is **data the test must reference to express the assertion at all** — the weight case asserts equality against `SCHEDULE[d]`, and a stubbed table would have made that assertion vacuous rather than failing. The commit message records this.

| Task | RED evidence |
|---|---|
| 1 | 7 live tests discovered, 7 failing on `generate(0, 0): not implemented (RED)`; 4 todos still skipped; no collection error |
| 2 | `s=22 d=2: expected 6 to be less than or equal to 4` — precisely the cluster-of-6 RESEARCH measured on the unconstrained prototype |

### Mutation checks, and one result worth carrying forward

The reachability claim is the phase's load-bearing proof, so it was mutation-checked rather than asserted. Each mutation was applied to the committed `generate.ts`, run, and restored with `git checkout -- src/levelgen/generate.ts`.

| Mutation | Result over the 525-board corpus |
|---|---|
| Invariant check removed entirely (accept every candidate pair) | **FAILS** — `s=0 d=13: expected [ { row: 1, col: 4, char: '2' }, …(1) ] to deeply equal []` |
| Steel-adjacency polish disabled, invariant intact | **PASSES** — confirms the invariant, not the polish, is the safety mechanism |
| Invariant checked before the mirror is committed | PASSES at 525 boards |
| Invariant checked on the **half** board only | PASSES at 525 boards |

**The last two are the finding to carry forward, and they cut against a natural reading of the plan.** The plan calls the half-board check "the documented catastrophic failure", and RESEARCH demonstrated it with a **hand-constructed** left-wall staircase reaching the centre seam (0 unreachables as a half, 20 once mirrored). But with the steel-adjacency rule in place, *no such staircase is reachable by this generator*: the rule rejects any steel at column `cols/2-1`, because its mirror at `cols/2` is orthogonally adjacent — so a half-board barrier can never touch the seam, and mirroring can never complete it into a wall-to-wall cut. With adjacency disabled as well, 525 random boards at `steelPerHalf ≤ 7` over a 16×5 half still did not produce one.

So the full-board check is justified by the **theorem**, not by this corpus falsifying the alternative. That is a weaker empirical footing than the other mutations and should be recorded honestly rather than papered over: the code is correct for the reason the proof gives, and a future edit that moves the check to the half-board would **not** be caught by the sweep at this width. Two consequences worth acting on:

- Plan 10-03's 21 000-board sweep is the natural place to re-run the half-board mutation; it may well bite there, and if it does the evidence is worth pinning.
- The steel-adjacency rule is documented as "polish, explicitly not a substitute for the invariant" — which remains true of the *proof*, but it is now known to be doing real defensive work on the seam. Anyone removing it should re-run the half-board mutation first.

## Threat Flags

None. `generate` is a pure function over two arguments with no network, filesystem, credential or user-input surface; the only new trust boundary the plan anticipated (caller-supplied `difficulty`) is clamped and asserted. `src/core/**` is byte-unchanged.

## Known Stubs

**No stub exists in shipped source.** `src/levelgen/{schedule,reachability,generate}.ts` are complete; the RED-phase throwing stubs were replaced within the same task and do not survive in `HEAD`.

Eight `it.todo` entries remain across the phase, all plan-mandated scaffolds owned by later plans, not residue from this one:

| File | Todos | Owner |
|---|---|---|
| `tests/levelgen.sweep.test.ts` | 3 — playfield bounds (10-02-03), charset/`brickTypes` (10-03-03), R-16 `.mjs` parity (10-02-04) | 10-03 |
| `tests/levelgen.determinism.test.ts` | 4 — repeat-call identity, pinned SHA-256, Hermes u32 fingerprint, clamping | 10-03 |
| `tests/levelgen.winnability.test.ts` | 1 — stratified 30-board bot sample | 10-04 |

`.planning/WINDOWS.md` was again not created, for the reason 10-01 recorded: it does not exist in this repo, and seeding a shared new `.planning/` file from inside a worktree is a merge hazard. The equivalent information is in this table and in `10-VALIDATION.md`.

## Issues Encountered

- **Vitest suppresses `console.log` under this repo's config**, so the "print the schedule from `SCHEDULE`, not hand-typed" acceptance criterion was satisfied by a throwaway test case that serialised the table to the scratchpad with `node:fs`. The file was deleted afterwards and `git status --porcelain` is empty.
- **`npm run lint` reports one pre-existing warning** — `tests/levelgen.determinism.test.ts:102 Array type using 'Array<T>' is forbidden` — in a Wave 0 file this plan never touched (`git diff 74a8237..HEAD -- tests/levelgen.determinism.test.ts` is empty). It is a warning, `npm run lint` exits 0, and fixing it is outside this plan's scope boundary. Flagged for whoever next edits that file.
- **Expo:** AGENTS.md pins Expo SDK 57 and requires consulting the versioned docs before writing code that touches Expo APIs. Confirmed by inspection rather than assumed: the six files import only `vitest`, `../src/core` (types and the level pipeline), `./helpers/balanceBot`, and each other. No Expo API is reachable from `src/levelgen`, and the eslint boundaries block would reject one. No doc lookup was required.

## Verification Results

| Check | Result |
|---|---|
| `npx vitest run tests/levelgen.sweep.test.ts tests/levelgen.schedule.test.ts` | **13 passed / 3 todo**, 285 ms |
| Boards exercised end to end | **525** (25 seeds × 21 difficulties), well under the 5 s budget |
| `npm run typecheck` | exit 0 |
| `npx eslint src/levelgen` | exit 0 |
| `npm run lint` | exit 0 (1 pre-existing warning, not mine) |
| `npm test` (full gate incl. the 4 assert scripts) | **exit 0** — 86 files passed / 1 skipped; 479 passed / 8 todo; `assert-level-solvability: OK (ship levels pass; level-02 fails)` |
| `grep -vE "^[[:space:]]*(//\|\*\|/\*)" src/levelgen/generate.ts \| grep -cE "checkSolvability\|validateLevel"` | `0` |
| `grep -rEn "^[[:space:]]*'worklet';" src/levelgen \| wc -l` | `0` |
| `grep -vE "^[[:space:]]*(//\|\*\|/\*)" src/levelgen/schedule.ts \| grep -cE "Math\.(pow\|sin\|cos\|exp\|log)"` | `0` |
| `grep -c "allNonSteelReachable" src/levelgen/generate.ts` | `2` (≥ 1 required) |
| `grep -cE "toBe\([0-9]+\)" tests/levelgen.schedule.test.ts` | `0` |
| `grep -c "toBeGreaterThanOrEqual" tests/levelgen.schedule.test.ts` | `5` (≥ 3 required) |
| `git diff --name-only -- src/core` | empty |
| `git diff --name-only 74a8237..HEAD -- src/core` | empty |
| `git status --porcelain` | empty |

Test counts moved from the baseline as expected: 8 `it.todo` entries converted to live cases (5 sweep + 3 schedule) plus 5 new cases = 13 new tests, and 16 − 8 = 8 todos remaining.

## User Setup Required

None — this plan installs zero packages (the T-10-SC disposition holds) and touches no Expo API or external service.

## Next Phase Readiness

- **Plan 10-03 (the full-corpus sweep) is unblocked.** Widening is a one-token change: the live cases loop over `corpus()`, which is parameterised by `TRACER_SEEDS`; swapping it for the already-exported `SWEEP_SEEDS = 1000` gives 21 000 boards. Add the `expect(SWEEP_SEEDS).toBeGreaterThanOrEqual(1000)` floor there, and expect roughly 40× the current 285 ms.
- **Plan 10-04 (winnability) is unblocked.** `runBotOnLevel` takes a plain object, and `generate` now produces one.
- **Concern handed to 10-03, stated plainly:** the half-board mutation does **not** fail at 525 boards (see the mutation table). Re-run it at `SWEEP_SEEDS` width; if it bites, pin the evidence, and if it still does not, record that the full-board ordering rests on the theorem alone so nobody later mistakes the sweep for a guard on it.
- **Concern carried forward from 10-00, still unresolved:** assumption A1 (Hermes byte-identity) remains unmeasured. `generate` is now the thing whose byte-identity matters, and plan 10-05 owns the on-device falsification. Phase 12's daily challenge is the mode that cannot tolerate A1 being false.
- **Note for Phase 11's dial re-tune:** change numbers in `src/levelgen/schedule.ts` freely; the envelopes make monotonicity structural and no test pins a literal. What is **not** free to change is candidate ordering, the PRNG, or the stage sequence — any of those changes every board for every existing seed, which invalidates Phase 12's daily-challenge history.

## Self-Check: PASSED

- All 6 key files verified present on disk (`[ -f ]`).
- All 4 task commits verified reachable from HEAD: `411d938`, `709492e`, `bf76771`, `83c7315`.
- `commits: 4` is **measured** via `git rev-list --count 74a8237d8b38a26e7580b4fd42b15d5a5471f32c..HEAD`, not narrated.
- Every task-level acceptance criterion re-run and passing; the plan-level `<verification>` block re-run and clean.
- Working tree clean; no changes to `STATE.md`, `ROADMAP.md`, or `src/core/**`.

---
*Phase: 10-seeded-board-generator*
*Completed: 2026-09-25*
