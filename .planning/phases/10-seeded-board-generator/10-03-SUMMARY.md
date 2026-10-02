---
phase: 10-seeded-board-generator
plan: 03
subsystem: testing
tags: [level-generation, determinism, fnv-1a, sha-256, mutation-testing, parity, hermes, sweep]

# Dependency graph
requires:
  - phase: 10-seeded-board-generator
    provides: "10-02 — generate(seed, difficulty), SCHEDULE / D_MAX, allNonSteelReachable, and the 525-board tracer sweep this plan widens"
  - phase: 10-seeded-board-generator
    provides: "10-01 — levelStaticsOf(raw, scoreHit) and the sweep/determinism it.todo scaffolds"
  - phase: 10-seeded-board-generator
    provides: "10-00 — the frozen GRID lattice, hashSeed's FNV-1a fold, and the src/levelgen eslint purity block"
  - phase: 04-levels
    provides: "validateLevel / loadAndCompile / checkSolvability, and scripts/lib/levelSolvability.mjs — the R-16 CI twin"
provides:
  - "the 21 000-board contract sweep: reachability, validate+compile, playfield bounds, charset, brickTypes deep-equality, exact weight, steel budget, explosive cluster cap"
  - "R-16 twin parity extended from the six shipped assets to the generated distribution, in-process, with no fixture and no third flood-fill"
  - "corpusFingerprint() / CORPUS_SEEDS — an engine-portable u32 digest over a fixed 4 200-board corpus, importable by the app tier via the barrel"
  - "two pinned digests (SHA-256 9e3748c8…, u32 0x2e8f6c23) measured identical in four independent processes including one --jitless"
  - "the settled answer to 10-02's carried mirror-ordering question, with the adjacency rule's real role measured and documented in source"
affects: [10-04, 10-05, 11-endless, 12-daily]

# Actuals (#2632)
actuals:
  tokens: 11900
  tasks: 2
  commits: 5
plan_head_before: f87261ad7345e28619b5fc12f37152cdec259678

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pinned golden digests as the regression trap for a pure generator, with a failure message that names the three possible causes and forbids a casual regeneration"
    - "A portable digest as a shared module rather than test-local code, because a device probe and a CI test must compute the same number on engines with different built-ins"
    - "Mutation decomposition: run the mutation, then vary one protective factor at a time until it bites, so the SUMMARY can name what the guard actually is"
    - "Cross-pipeline determinism evidence — vitest/vite and an esbuild bundle under `node --jitless` are different module pipelines, which makes agreement stronger evidence than a repeat run"

key-files:
  created:
    - src/levelgen/fingerprint.ts
  modified:
    - src/levelgen/index.ts
    - src/levelgen/generate.ts
    - tests/levelgen.sweep.test.ts
    - tests/levelgen.determinism.test.ts
    - .planning/phases/10-seeded-board-generator/10-VALIDATION.md

key-decisions:
  - "The half-WIDTH-mask reachability check is sound, not catastrophic — the catastrophic one is the pre-mirror ordering, and the two were being conflated in RESEARCH, the plan and the generator header"
  - "wouldTouchSteel is load-bearing, not polish: it keeps columns 4 and 5 steel-free on 0 of 105 000 boards, which is what makes the mirror ordering unfalsifiable"
  - "The memoised corpus() is kept over the plan's 'one wide loop', so 21 000 boards are generated once and every property is asserted against the same object while each property keeps its own failing test name"
  - "The pins are not RESEARCH §Q5's digest and the test says why — §Q5 hashed a prototype predating the shipped candidate ordering and stage 3"
  - "The T-10-09 / T-10-11 hardening cases moved from the sweep file to the determinism file, taking 10-02's explicit offer to choose, with the NaN and string-seed cases they lacked"

patterns-established:
  - "A digest pin carries a REGENERATION_WARNING as its expect message, stating what a mismatch means for downstream seed-keyed history, not just that a number changed"
  - "A mutation that cannot be made to fail is reported as a proof obligation plus the factor that discharges it, never as 'the test passed'"

requirements-completed: [N-GEN-01, N-GEN-02, N-GEN-03]

coverage:
  - id: D1
    description: "21 000 generated boards (1 000 seeds x 21 difficulties) pass validateLevel and loadAndCompile on the real core pipeline"
    requirement: "N-GEN-02"
    verification:
      - kind: integration
        ref: "tests/levelgen.sweep.test.ts#every board in the sweep passes validateLevel and loadAndCompile (10-02-01 / 10-02-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "checkSolvability reports zero unreachable breakables across all 21 000 boards — D-03 proven at the width SC-2 demands, not at a tracer sample"
    requirement: "N-GEN-02"
    verification:
      - kind: integration
        ref: "tests/levelgen.sweep.test.ts#checkSolvability reports zero unreachable breakables over the sweep (10-02-01)"
        status: pass
      - kind: other
        ref: "Mutation control: invariant removed from stage 1 => 's=8 d=20: expected [ …(2) ] to deeply equal []' at 21 000 boards"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every generated board fits the 360x640 playfield by the campaign's own bounds expression, against LOGICAL_WIDTH / LOGICAL_HEIGHT rather than literals"
    requirement: "N-GEN-02"
    verification:
      - kind: unit
        ref: "tests/levelgen.sweep.test.ts#every board fits inside the 360x640 playfield (10-02-03)"
        status: pass
      - kind: other
        ref: "grep -vE '^[[:space:]]*(//|\\*|/\\*)' tests/levelgen.sweep.test.ts | grep -cE 'toBeLessThanOrEqual\\([0-9]+\\)' => 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Only the six shipped chars appear in cells and brickTypes deep-equals the E1b definitions on every board — no new brick type"
    requirement: "N-GEN-03"
    verification:
      - kind: unit
        ref: "tests/levelgen.sweep.test.ts#cell charset and brickTypes deep-equal the declared alphabet on every board (10-03-03)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Authored weight equals SCHEDULE[d] exactly, and steel never exceeds 2 * steelPerHalf, over all 21 000 boards"
    requirement: "N-GEN-03"
    verification:
      - kind: unit
        ref: "tests/levelgen.sweep.test.ts#authored weight equals the schedule exactly for every (seed, difficulty) (10-03-02)"
        status: pass
      - kind: unit
        ref: "tests/levelgen.sweep.test.ts#steel never exceeds the scheduled budget, and a shortfall is tolerated (D-06 / D-08)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The scripts/lib .mjs CI twin and the TypeScript lib agree on the same 21 000-board generated corpus (R-16 extended from six shipped assets to the generated distribution)"
    requirement: "N-GEN-02"
    verification:
      - kind: integration
        ref: "tests/levelgen.sweep.test.ts#the scripts/lib .mjs twin agrees with the TS lib on the same SWEEP_SEEDS corpus (10-02-04)"
        status: pass
      - kind: integration
        ref: "tests/levels.solvability-parity.test.ts#TS lib and CI mjs agree on every assets/levels/*.json"
        status: pass
    human_judgment: false
  - id: D7
    description: "A fixed 4 200-board corpus is pinned by a Node SHA-256 and by an engine-portable u32 fingerprint, both reproducible across processes"
    requirement: "N-GEN-01"
    verification:
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#the fixed corpus hashes to the pinned SHA-256 digest"
        status: pass
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#the fixed corpus u32 fingerprint matches the pinned Hermes-portable value"
        status: pass
      - kind: other
        ref: "Four independent processes: 2x `vitest run`, esbuild-bundled `node`, `node --jitless` — all four printed 9e3748c8… / 2e8f6c23"
        status: pass
    human_judgment: false
  - id: D8
    description: "The sweep cannot silently shrink: SWEEP_SEEDS is asserted against its floor inside the test and the board count is logged"
    verification:
      - kind: unit
        ref: "tests/levelgen.sweep.test.ts#generates the full SWEEP_SEEDS x (D_MAX + 1) corpus and cannot silently shrink (10-03-01)"
        status: pass
    human_judgment: false
  - id: D9
    description: "The mutate-then-regenerate aliasing detector and the difficulty clamp cases (including NaN and the string-seed path) are live"
    verification:
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#generate(seed, difficulty) called twice returns identical JSON.stringify output"
        status: pass
      - kind: unit
        ref: "tests/levelgen.determinism.test.ts#difficulty is clamped to [0, D_MAX] for hostile callers"
        status: pass
    human_judgment: false
  - id: D10
    description: "The mirror-ordering question 10-02 carried forward is settled: the adjacency rule, not the sweep, is the guard — and the source comments now say so"
    verification:
      - kind: other
        ref: "Mutation decomposition at 105 000 boards, table in this SUMMARY; commit f58652a"
        status: pass
    human_judgment: true
    rationale: "That the corrected header prose accurately states the corridor argument — and that a future reader will act on it rather than delete the rule anyway — is a review judgment. The measurements behind it are reproducible; the wording is not testable."

# Metrics
duration: 34 min
completed: 2026-09-25
status: complete
---

# Phase 10 Plan 03: Full-Corpus Sweep and Pinned Determinism Summary

**21 000 generated boards now pass the complete structural, reachability, bounds, verb-set and exact-weight contract with both implementations of the solvability lint agreeing on every one of them; a fixed 4 200-board corpus is pinned by a Node SHA-256 and an engine-portable u32 fingerprint that four independent processes agree on; and the mirror-ordering question 10-02 handed forward is settled by measurement rather than left open.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-09-25T19:54Z (local +08:00)
- **Completed:** 2026-09-25T20:28Z (local +08:00)
- **Tasks:** 2 (5 commits — 1 test-only, 1 docs, 1 RED, 1 GREEN, 1 refactor)
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments

- **SC-2 is now a swept property, not a sample.** `corpus()` runs `SWEEP_SEEDS` (1 000) x 21 = **21 000 boards**, and every one is asserted against nine properties: `validateLevel` ok, `loadAndCompile` ok, `unreachableBreakables` empty, playfield bounds, row length, mirror symmetry, cell charset, `brickTypes` deep-equality, exact `bricks`/`totalHp`, steel ≤ budget, and max 8-connected `E` cluster ≤ 4. 8.4 s.
- **The sweep cannot silently shrink.** `expect(SWEEP_SEEDS).toBeGreaterThanOrEqual(SWEEP_SEEDS_FLOOR)` runs inside the test, so RESEARCH Pitfall 7 (drop N for a watch loop, never restore it) fails the suite rather than quietly reducing the evidence. Board count and steel-shortfall count are logged.
- **R-16 extended from six shipped assets to 21 000 generated boards**, in-process, with no fixture, no third flood-fill and no change to `package.json`. `scripts/assert-generated-solvability.mjs` deliberately does not exist; the reasoning is in `10-VALIDATION.md` §Decision, in `10-03-PLAN.md` §objective, and now in the test file's own `describe` comment.
- **Both digests are pinned and agreed across four processes.** Not just two — a `vitest`/vite run and an esbuild-bundled `node --jitless` run are *different module pipelines*, which is stronger evidence than a repeat of the same one.
- **`corpusFingerprint` exists as shared source rather than test code**, because plan 10-05's `__DEV__` probe must compute the same number on Hermes, where there is no crypto built-in. It imports no platform built-in at all, and its header says in as many words that it is a determinism fingerprint and **not** a security digest.
- **The carried mirror-ordering question is settled** — see the section below. It required correcting two statements that were wrong in RESEARCH, in this plan, and in `generate.ts`'s own header.

## Task Commits

1. **Task 1: widen the contract sweep to 21 000 boards and add R-16 twin parity** — `315fe26` (test)
2. **Deviation: correct which half-board check is catastrophic; stop calling the adjacency rule polish** — `f58652a` (docs, comments only)
3. **Task 2 (RED): the four generator pins, against a throwing fingerprint stub** — `2f9d17a` (test)
4. **Task 2 (GREEN): engine-portable corpus fingerprint and both pinned digests** — `966b469` (feat)
5. **Task 2 (REFACTOR): move the T-10-09 / T-10-11 hardening cases to their subject-matter home** — `dbdac1c` (refactor)

Task 1 has no RED/GREEN split: it changes only `tests/levelgen.sweep.test.ts`, so there is no production code to drive and the deliverable *is* the assertion set. It was mutation-checked instead — see below.

_Base for the measured commit count: `f87261ad7345e28619b5fc12f37152cdec259678`; `git rev-list --count f87261a..HEAD` → `5`._

## The pinned corpus — exact definition, for plans 10-04 and 10-05

Copy these verbatim. **Plan 10-04** puts them in `docs/ops/BOARD-GENERATOR.md`; **plan 10-05** compares the on-device value against the u32 one (Hermes cannot compute the SHA-256).

| Field | Value |
|---|---|
| `CORPUS_SEEDS` | **200** |
| `D_MAX` | **20** (so `d` runs `0..20`, 21 values) |
| Boards | **4 200** |
| Nesting order | `s` **outer** `0..CORPUS_SEEDS-1`, `d` **inner** `0..D_MAX` |
| Element | `JSON.stringify(generate(s, d))` |
| SHA-256 input | those 4 200 strings concatenated with no separator |
| **SHA-256** | `9e3748c89bc4d15f0c7c9e61b79d70f2ba58c327651ca81077dc7adf9572c4ea` |
| **u32 fingerprint** | `0x2e8f6c23` = `781151267` |
| u32 algorithm | FNV-1a over `charCodeAt`, offset `2166136261`, prime `16777619`, `Math.imul(h, prime) >>> 0` per char, folded continuously across the whole corpus (not per board) |

**The SHA-256 is deliberately not RESEARCH §Q5's `0ffbfdb7…`, and this is not a regression.** §Q5 hashed a prototype generator that predates the shipped candidate ordering and stage 3. What §Q5 established is that four-way cross-process agreement is *achievable*; which digest it lands on is a property of the generator that actually shipped. The test file carries this note so a future reader does not chase it.

Cross-process evidence, all at the GREEN commit:

| Process | SHA-256 | u32 |
|---|---|---|
| `npx vitest run` (run 1) | `9e3748c8…` | `2e8f6c23` |
| `npx vitest run` (run 2) | `9e3748c8…` | `2e8f6c23` |
| esbuild bundle → `node` | `9e3748c8…` | `2e8f6c23` |
| esbuild bundle → `node --jitless` | `9e3748c8…` | `2e8f6c23` |

`--jitless` could not be run through vitest at all (`ReferenceError: WebAssembly is not defined` — vite itself needs it), which is why the last two rows go through an esbuild bundle. That turned out to be better evidence, not worse: two different module pipelines producing the same bytes rules out a transform-level artefact as well as a JIT-level one.

## Settling the carried question: which half-board check is catastrophic

10-02's SUMMARY handed this forward explicitly, so it gets a direct answer rather than a hedge. **The plan's framing was wrong, and so was `generate.ts`'s header.** Two different mutations were being called "checking the half-board", and only one of them is a defect.

All rows below are **105 000 boards** (5 000 seeds x 21) unless stated, measured with a throwaway probe that was deleted afterwards (`git status --porcelain` empty).

| # | Mutation | Adjacency rule | Steel dial | Boards with unreachable breakables |
|---|---|---|---|---|
| — | shipped generator | on | 7/half | **0** |
| M3 | invariant removed entirely | on | 7/half | **fails the committed 21 000 sweep**, `s=8 d=20` |
| M1 | `allNonSteelReachable` over a half-**width** mask | on | 7/half | 0 |
| M2 | same | **off** | 7/half | 0 |
| M2′ | same | **off** | 20/half | 0 |
| M4 | check **before** the mirror `b` is committed | on | 7/half | 0 |
| M4 | same | on | 20/half | 0 |
| M4 | same | **off** | 7/half | **291** (max 126 on one board, first `s=0 d=13`) |
| M4 | same | **off** | 20/half | **16 610** |

Three conclusions, and each changes something.

**1. The half-WIDTH-mask check is sound, and no sweep at any width will ever catch it.** This is a theorem, not an absence of evidence. The half's flood seeds from the half's bottom-row non-steel cells — all of which are full-board bottom-row non-steel cells — and every 4-move inside the half is a legal full-board move, so the half's flood is a **subset** of the full board's. Meanwhile the half's right edge is a wall where the full board has an opening, so the half condition is strictly harder to satisfy. If the half check passes, the full check passes; by mirror symmetry the same covers the right half. M1/M2/M2′ returning 0 is what soundness looks like, not what a missing guard looks like. Chasing it at a wider N would have been wasted compute.

**2. The pre-mirror ordering IS a real defect** — RESEARCH's 20-unreachable counterexample was about *this*, not about a half-width mask. It produces 291 failures per 105 000 at ship settings once the adjacency rule is removed, and the committed 21 000-board sweep would expect roughly 58 of those. So the sweep **is** a working guard on the ordering, conditionally.

**3. The condition is `wouldTouchSteel`, and it is load-bearing.** Because the rule rejects a pair at `cols/2-1` / `cols/2` (orthogonally adjacent to itself on an even-width board), **columns 4 and 5 carry steel on 0 of 105 000 boards** — against ~64 000 occurrences per column with the rule off. That leaves a permanently open two-wide vertical corridor from row 0 to the bottom row, which makes the two halves reachability-independent: a left-half cell reaches the flood through the left half alone, so committing the right-half mirror cannot change its answer. The steel-column histograms for M4-with-adjacency and the shipped generator are **byte-identical at both dial settings**, which is that independence showing up as data.

So, answering 10-02's question in its own terms: **the sweep is not a guard on the mirror ordering; the adjacency rule is.** It is no longer documented as polish anywhere — commit `f58652a` rewrites both the `wouldTouchSteel` header and the module header with the measurements and the explicit instruction that anyone removing the rule must re-run the ordering mutation first. `generate.ts`'s claim that "checking the half-board is the documented catastrophic failure" is replaced by a statement of which check is which.

The code keeps the full-board ordering regardless. It is the form whose soundness needs no symmetry argument, and it costs nothing.

## Files Created/Modified

- `src/levelgen/fingerprint.ts` — **created (79 lines).** `CORPUS_SEEDS = 200` and `corpusFingerprint(seedCount = CORPUS_SEEDS)`. Imports only `./generate` and `./schedule`; no platform built-in of any kind, because Hermes has none. FNV-1a constants redeclared locally with the same cross-reference comment `rng.ts` uses, since `src/core/hash.ts`'s mixers are `'worklet'`-marked.
- `src/levelgen/index.ts` — **modified.** Re-exports both, with the LC-16 reason stated: the device probe is app-tier and may only reach the barrel.
- `src/levelgen/generate.ts` — **modified, comments only.** The two corrections above. `git diff -U0 | grep -vE '^[+-][[:space:]]*(\*|//|/\*)'` is empty.
- `tests/levelgen.sweep.test.ts` — **modified.** Corpus widened to 21 000; floor assertion; three todos filled (bounds, charset/`brickTypes`, R-16 parity); steel-budget case added; the two duplicated hardening cases moved out. 0 todos remain.
- `tests/levelgen.determinism.test.ts` — **modified.** Four todos filled; both pins; the `corpusJson` builder that mirrors the fingerprint's nesting order; the `REGENERATION_WARNING` message. 0 todos remain. Also fixes the `@typescript-eslint/array-type` warning 10-02 flagged for the next editor.
- `.planning/phases/10-seeded-board-generator/10-VALIDATION.md` — **modified.** Rows 10-03-01 and 10-03-02 marked `✅ exists | ✅ green`.

## Decisions Made

- **The memoised `corpus()` is kept rather than the plan's literal "one wide loop".** The plan's stated requirement — 21 000 boards generated once, every property asserted against the same object — is exactly what the memo already does, and it is what 10-02 established. A single loop would additionally collapse nine independent properties into one test name, so the first failure would mask the rest. Memory cost is ~30 MB, which is not a constraint here.
- **`checkTs` is deep-imported from `src/core/levels/solvability` even though `../src/core` re-exports it.** Parity is a claim about two *implementations*, so each side is named by its own module, exactly as `tests/levels.solvability-parity.test.ts` does. The redundancy is the point.
- **The pins' `expect` message is a paragraph, not a label.** A digest mismatch is never "just update the number": every one of the three possible causes rewrites every board for every existing seed, which retroactively invalidates any daily-challenge history keyed on a seed, and makes plan 10-05's recorded on-device value stale. The message says that.
- **`SWEEP_SEEDS_FLOOR` is a second constant rather than a literal `1000` in the assertion.** Someone editing `SWEEP_SEEDS` sees a named floor to argue with; a literal inside the `expect` invites editing both in one motion.
- **The steel assertion is an inequality plus a parity check.** `steel <= 2 * steelPerHalf` because an exhausted candidate list is a correct outcome, and `steel % 2 === 0` because a mirrored pair is always two cells — that second half catches a symmetry break the inequality would not.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree forked from `origin/main` rather than the phase branch**

- **Found during:** Pre-execution base check
- **Issue:** The harness forked this worktree from `8788caa`, so it contained no Phase 10 work at all — no `src/levelgen/`, no plan file.
- **Fix:** `git merge --ff-only f87261ad7345e28619b5fc12f37152cdec259678`, which succeeded outright as 10-02 predicted. No merge commit, so the plan base is the orchestrator's HEAD exactly.
- **Verification:** `git rev-parse HEAD^{tree}` equals `git rev-parse f87261a^{tree}` (`08dec700…`) before the first edit. No `reset --hard`, `clean`, `update-ref` or `stash` was used.
- **Committed in:** n/a (fast-forward)

**2. [Rule 2 - Missing Critical] Corrected two load-bearing source comments that were actively wrong**

- **Found during:** The carried mutation investigation
- **Issue:** `generate.ts` documented "checking the half-board is the documented catastrophic failure" (false for the half-width mask, which is provably sound) and documented `wouldTouchSteel` as "polish" (it is the sole reason the mirror ordering is currently unfalsifiable). Both errors point a future maintainer in a harmful direction: the first invites chasing a non-defect, the second invites deleting a rule whose removal produces 291 unreachable boards per 105 000. My prompt required specifically that the adjacency rule not be left documented as polish.
- **Fix:** Rewrote both comment blocks with the measured numbers and an explicit instruction to re-run the ordering mutation before removing the rule. Comments only — the non-comment diff is empty and the 21 000-board sweep is unchanged at 12 passed.
- **Files modified:** `src/levelgen/generate.ts`
- **Verification:** `git diff -U0 src/levelgen/generate.ts | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -vE '^[+-][[:space:]]*(\*|//|/\*)'` → empty. Sweep, typecheck and `npx eslint src/levelgen` all clean afterwards.
- **Committed in:** `f58652a`

**3. [Rule 1 - Bug] Moved the T-10-09 / T-10-11 cases out of the sweep file**

- **Found during:** Task 2
- **Issue:** 10-02 landed the clamp and aliasing cases in `tests/levelgen.sweep.test.ts` and said in its SUMMARY exactly why, offering 10-03 the choice of deleting or filling the matching determinism todos. This plan's Task 2 `<behavior>` block requires those same contracts in the determinism file, with NaN and string-seed cases the sweep versions lacked. Filling them without removing the originals leaves two copies of one contract and no way to tell which is authoritative — the state in which one gets updated and the other silently rots.
- **Fix:** Removed the duplicated `describe` from the sweep file; the determinism file's superset is now the single home. Sweep header updated to point there and to record why 10-02 parked them.
- **Files modified:** `tests/levelgen.sweep.test.ts`
- **Verification:** 26 passed across the two files, versus 12 + 16 with two duplicates. No assertion lost.
- **Committed in:** `dbdac1c`

**4. [Rule 1 - Bug] Fixed the pre-existing `array-type` lint warning in a file this plan edits**

- **Found during:** Task 2
- **Issue:** `tests/levelgen.determinism.test.ts:102` used `Array<number | string>`. A warning, not an error — 10-02 flagged it out of scope and handed it to whoever next edited the file. That is this plan.
- **Fix:** `(number | string)[]`. `npm run lint` now reports **zero** problems repo-wide.
- **Committed in:** `2f9d17a`

---

**Total deviations:** 4 auto-fixed (1 blocking, 1 missing critical, 2 bugs)
**Impact on plan:** No scope change. Deviation 1 was a precondition for reading the plan; deviation 2 was required by the plan's own carried finding; deviations 3 and 4 both close items 10-02 explicitly deferred to this plan.

## TDD notes

Plan frontmatter is `type: execute`, so the plan-level gate sequence does not apply, but both tasks carry `tdd="true"`.

**Task 1 is test-only** — `<files>` is `tests/levelgen.sweep.test.ts` alone. Under the `task.is-behavior-adding` predicate it is exempt: no non-test source file is touched, so there is no behaviour to drive and a RED phase would be theatre. Its meaningfulness was established by mutation instead (the M3 control fails the widened sweep at `s=8 d=20`), which is a stronger check than a manufactured RED would have been.

**Task 2 ran RED-first** with a throwing stub rather than an absent export, following 10-02's pattern: importing a name that does not exist fails the whole file at collection and discovers zero tests, which is the `INVALID_RED` condition (#3770).

| Task | RED evidence |
|---|---|
| 2 | 16 tests discovered, 2 failing: `Error: corpusFingerprint(200): not implemented (RED)` and the SHA-256 placeholder mismatch. No collection error. |

**Honest note on that RED, recorded because it would be easy to overstate:** only 2 of the 4 pins failed. The repeat-call/aliasing case and the clamping case passed immediately, because `generate` already satisfies them — they are characterization pins on shipped behaviour, not tests for behaviour this task adds. The aliasing one is nonetheless the only detector for RESEARCH Pitfall 3, whose signature failure is an ordering-dependent pass/fail between test files rather than anything that throws.

**REFACTOR** produced a real commit (`dbdac1c`), the de-duplication above.

## Issues Encountered

- **Vitest suppresses `console.log` under this repo's reporter configuration.** The board count and steel-shortfall logs are real and correct but invisible in a default `npx vitest run`; they appear under `--disable-console-intercept`. The plan's acceptance criterion ("the run logs a board count of at least 21000") is satisfied by the code and by that invocation, not by the default one. 10-02 hit the same thing. Worth a one-line fix in `vitest.config.ts` at some point, but that is a repo-wide reporter change and outside this plan's scope boundary.
- **`node --jitless` cannot run through vitest** — vite's own loader needs WebAssembly. Worked around by bundling with esbuild and running the bundle directly, which strengthened the evidence rather than weakening it (see above).
- **Expo:** `AGENTS.md` pins Expo SDK 57 and requires reading the versioned docs before writing code. Confirmed by inspection rather than assumed: the files touched here import only `vitest`, `node:crypto` (test-only), `../src/core`, `../scripts/lib/levelSolvability.mjs`, `./helpers/balanceBot` and each other. No Expo API is reachable from `src/levelgen`, and the eslint boundaries block would reject one. No doc lookup was required.

## Verification Results

| Check | Result |
|---|---|
| `npx vitest run tests/levelgen.sweep.test.ts tests/levelgen.determinism.test.ts` | **26 passed / 0 todo** |
| `npx vitest run tests/levelgen.sweep.test.ts` | 10 passed, **8.4 s** (well under the 30 s timeout) |
| Boards exercised in the sweep | **21 000** (`[sweep] boards exercised: 21000`) |
| Steel-budget shortfalls | **0 boards / 0 cells** of 21 000 |
| `npx vitest run tests/levelgen.determinism.test.ts` x 2 consecutive processes | 16 passed both times |
| `npx vitest run tests/levels.solvability-parity.test.ts` | 2 passed |
| `npm run typecheck` | exit 0 |
| `npx eslint src/levelgen` | exit 0 |
| `npm run lint` | exit 0, **0 warnings** (was 1 pre-existing) |
| `npm test` (full gate incl. the 4 assert scripts) | **exit 0** — 86 files passed / 1 skipped; **485 passed / 1 todo**; `assert-level-solvability: OK` |
| `grep -c "it.todo" tests/levelgen.sweep.test.ts` | `0` |
| `grep -c "it.todo" tests/levelgen.determinism.test.ts` | `0` |
| `grep -c "levelSolvability.mjs" tests/levelgen.sweep.test.ts` | `1` (≥ 1 required) |
| `grep -c "LOGICAL_WIDTH" tests/levelgen.sweep.test.ts` | `2` (≥ 1 required) |
| `grep -vE "^[[:space:]]*(//\|\*\|/\*)" tests/levelgen.sweep.test.ts \| grep -cE "toBeLessThanOrEqual\([0-9]+\)"` | `0` |
| `grep -c "SWEEP_SEEDS" tests/levelgen.sweep.test.ts` | `11` (≥ 3 required) |
| `grep -cE "[0-9a-f]{64}" tests/levelgen.determinism.test.ts` | `1` |
| `grep -c "corpusFingerprint" tests/levelgen.determinism.test.ts` | `6` |
| `grep -vE "^[[:space:]]*(//\|\*\|/\*)" src/levelgen/fingerprint.ts \| grep -cE "node:\|require\("` | `0` |
| `grep -rn "'worklet';" src/levelgen \| wc -l` | `0` |
| `git diff --name-only -- src/core` | empty |
| `git diff --name-only 64a0b0ca9b7c8fff4c137fb6385e66870df4cf13..HEAD -- src/core` | empty (phase base, per 10-VALIDATION's correction) |
| `git status --porcelain` | empty at return |

Test counts moved from the 479 + 8 todo baseline exactly as accounted: 7 todos filled (3 sweep + 4 determinism), 1 case added (steel budget), 2 duplicates removed → 485 passed / 1 todo. The single remaining todo is `tests/levelgen.winnability.test.ts`, owned by plan 10-04.

## Threat Flags

None. The only new module is a pure function over two integers with no network, filesystem, credential or user-input surface. `src/core/**` is byte-unchanged against the phase base. The one security-adjacent statement worth repeating is already in the source: `corpusFingerprint` is 32 bits of FNV-1a and must never authenticate a board, a score or a daily-challenge submission — it exists to make an *accidental* change loud.

Threat-register dispositions from the plan, all `mitigate`, all discharged:

| Threat ID | Mitigation shipped |
|---|---|
| T-10-14 (silent sweep shrink) | `SWEEP_SEEDS_FLOOR` asserted inside the test; board count logged; 0 todos in the file |
| T-10-15 (undetected PRNG / ordering drift) | Two pinned digests over a fixed corpus, with a failure message naming the three causes and the downstream consequence |
| T-10-16 (a third lint implementation drifting) | No third flood-fill and no fixture: parity asserted in-process against the existing `.mjs` twin |
| T-10-17 (aliased `grid` / `brickTypes`) | The mutate-then-regenerate detector, now in the determinism file where it is not duplicated |
| T-10-SC (package installs) | Zero packages installed. Gate not triggered. |

## Known Stubs

**None in shipped source.** `src/levelgen/fingerprint.ts` is complete; the RED throwing stub was replaced within the same task and does not survive in `HEAD`.

One `it.todo` remains in the phase — `tests/levelgen.winnability.test.ts`'s stratified 30-board bot sample — which is a plan-mandated scaffold owned by 10-04, not residue from this plan. Both files this plan owns are at zero.

Two throwaway probe test files (`tests/zz-probe.test.ts`, `tests/zz-pins.test.ts`) were used for the mutation table and the digest extraction. Both were deleted; `git status --porcelain` is empty and neither appears in any commit.

`.planning/WINDOWS.md` was again not created, for the reason 10-01 and 10-02 both recorded: it does not exist in this repo, and seeding a shared new `.planning/` file from inside a worktree is a merge hazard. The equivalent information is in this section and in `10-VALIDATION.md`.

## User Setup Required

None — this plan installs zero packages, changes no `package.json` entry, and touches no Expo API or external service.

## Next Phase Readiness

- **Plan 10-04 (winnability + the ops record) is unblocked.** It needs the corpus table above verbatim for `docs/ops/BOARD-GENERATOR.md`, and its `## Limits` section should name three things that were **not** measured: Hermes (A1, still open), human play feel (the E2 cohort was skipped, so the dials have no human baseline), and the mirror ordering's independence from `wouldTouchSteel` — which is now known to be a dependency, not an independence.
- **Plan 10-05 (the A1 device probe) is unblocked and has its target.** Compare the on-device value against **`0x2e8f6c23`** over `CORPUS_SEEDS = 200`, `d` in `0..20`, `s` outer. `corpusFingerprint` is on the barrel, so the app tier can import it without breaking LC-16. Do **not** have the probe compute a SHA-256; Hermes cannot.
- **A1 remains the one open assumption in the phase.** Four Node processes agreeing — including one with the JIT disabled and one through a different bundler — is the strongest Node-side evidence available, and it is still not a Hermes observation. Phase 12's daily challenge is the mode that cannot tolerate A1 being false.
- **Standing warning for Phase 11's dial re-tune, now with a second item.** Changing numbers in `src/levelgen/schedule.ts` is free — the envelopes make monotonicity structural and no test pins a literal dial. What is **not** free: the PRNG, the candidate ordering, or the stage sequence, any of which flips both digests and invalidates every existing seed. Newly added to that list: **`wouldTouchSteel` may not be removed as cosmetics.** It is what makes the mirror ordering safe, and its removal produces 291 unreachable boards per 105 000 at current dial settings — which the 21 000-board sweep would catch, but only after the fact.

## Self-Check: PASSED

- All 6 key files verified present on disk (`[ -f ]`).
- All 5 commits verified reachable from HEAD: `315fe26`, `f58652a`, `2f9d17a`, `966b469`, `dbdac1c`.
- `commits: 5` is **measured** via `git rev-list --count f87261ad7345e28619b5fc12f37152cdec259678..HEAD`, not narrated. `actuals.tokens: 11900` is chars/4 over the five changed files (47 730 bytes), against an estimate of 70 000 — a 5.9x overshoot in the same direction as 10-02's, which is worth carrying into future estimates for test-heavy plans in this phase.
- Every task-level acceptance criterion re-run and passing (table above); the plan-level `<verification>` block re-run and clean.
- No changes to `STATE.md` or `ROADMAP.md`; `src/core/**` byte-unchanged against the phase base.
- `scripts/assert-generated-solvability.mjs` confirmed absent; `package.json` confirmed unchanged.

---
*Phase: 10-seeded-board-generator*
*Completed: 2026-09-25*
