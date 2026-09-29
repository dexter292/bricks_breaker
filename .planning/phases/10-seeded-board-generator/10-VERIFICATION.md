---
phase: 10-seeded-board-generator
verified: 2026-09-29T01:58:31Z
status: human_needed
score: 6/6 success criteria hold — 0 falsified, 5 re-proved by mutation in this process
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/ROADMAP.md"
  - ".planning/WINDOWS.md"
  - ".planning/phases/10-seeded-board-generator/10-00-PLAN.md"
  - ".planning/phases/10-seeded-board-generator/10-00-SUMMARY.md"
  - ".planning/phases/10-seeded-board-generator/10-01-PLAN.md"
  - ".planning/phases/10-seeded-board-generator/10-01-SUMMARY.md"
  - ".planning/phases/10-seeded-board-generator/10-02-PLAN.md"
  - ".planning/phases/10-seeded-board-generator/10-02-SUMMARY.md"
  - ".planning/phases/10-seeded-board-generator/10-03-PLAN.md"
  - ".planning/phases/10-seeded-board-generator/10-03-SUMMARY.md"
  - ".planning/phases/10-seeded-board-generator/10-04-PLAN.md"
  - ".planning/phases/10-seeded-board-generator/10-04-SUMMARY.md"
  - ".planning/phases/10-seeded-board-generator/10-05-PLAN.md"
  - ".planning/phases/10-seeded-board-generator/10-05-SUMMARY.md"
  - ".planning/phases/10-seeded-board-generator/10-CONTEXT.md"
  - ".planning/phases/10-seeded-board-generator/10-PATTERNS.md"
  - ".planning/phases/10-seeded-board-generator/10-RESEARCH.md"
  - ".planning/phases/10-seeded-board-generator/10-SECURITY.md"
  - ".planning/phases/10-seeded-board-generator/10-VALIDATION.md"
  - "app/_components/GameHost.tsx"
  - "app/_components/PlayingHost.tsx"
  - "docs/ops/BOARD-GENERATOR.md"
  - "eslint.config.js"
  - "package.json"
  - "scripts/assert-level-solvability.mjs"
  - "scripts/assert-levelgen-thread.mjs"
  - "scripts/assert-worklet-closures.mjs"
  - "scripts/lib/levelSolvability.mjs"
  - "src/devflags.ts"
  - "src/levelgen/fingerprint.ts"
  - "src/levelgen/generate.ts"
  - "src/levelgen/grid.ts"
  - "src/levelgen/index.ts"
  - "src/levelgen/reachability.ts"
  - "src/levelgen/rng.ts"
  - "src/levelgen/schedule.ts"
  - "tests/helpers/balanceBot.ts"
  - "tests/levelgen.determinism.test.ts"
  - "tests/levelgen.schedule.test.ts"
  - "tests/levelgen.sweep.test.ts"
  - "tests/levelgen.winnability.test.ts"
  - "tests/levels.solvability-parity.test.ts"
covered_digest: "v1:sha256:f8bf6a356e913046a46544459c5ebcf5ba59765d47b9b7b9a67819d33cf691b2"
behavior_unverified: 1
overrides_applied: 0
re_verification: null  # FIRST verification of this phase. It shipped three phases ago.

# ---------------------------------------------------------------------------
# GAPS. Every one is an EVIDENCE-FIDELITY defect: a stated instrument that does
# not perform the check its wording claims, or a claimed artifact that does not
# exist. NONE of them falsifies a success criterion, and nothing is unguarded —
# in each case the property still holds and, where a guard is claimed, a real
# guard exists elsewhere. They are recorded as `blocking: false` for that
# reason, which is why this report is `human_needed` and not `gaps_found`.
# A reader who holds instrument fidelity to a blocking standard should read the
# status as `gaps_found`; the facts below are identical either way.
# ---------------------------------------------------------------------------
gaps:
  - truth: >-
      10-03-PLAN must_haves: "Both implementations of the solvability lint — the TypeScript
      one and the scripts/lib .mjs CI twin — agree on the generated corpus, extending the
      R-16 parity evidence from six shipped assets to the generated distribution."
    status: partial
    blocking: false
    severity: medium
    reason: >-
      The FACT is true and asserted; the EVIDENTIAL half is vacuous. The R-16 block compares
      only `checkMjs(level).ok === checkTs(level).ok`, and every one of the 21 000 generated
      boards is solvable, so it evaluates `true === true` 21 000 times. REPRODUCED
      INDEPENDENTLY in this process: gutting `scripts/lib/levelSolvability.mjs`'s
      `checkSolvability` to a constant `{ ok: true, unreachableBreakables: [],
      corridorWarnings: [] }` left the WHOLE sweep file green at 10 passed (10). Measured
      from the other direction too: under the reachability-invariant mutation, which makes
      real boards unsolvable, the parity case ALSO stayed green (1 failed | 9 passed) —
      because both implementations agree on an unsolvable board just as they agree on a
      solvable one. The corpus is extended; the discriminating power is not.
    artifacts:
      - path: "tests/levelgen.sweep.test.ts"
        issue: >-
          The `solvability parity over the generated corpus (R-16, resolves 10-02-04)` block
          compares one boolean field. Its own header claims it "extends the same evidence to
          the generated distribution — 21 000 boards the authored corpus never reaches."
    missing:
      - "Compare the full result shape (`unreachableBreakables`, `corridorWarnings`), not `ok` alone"
      - "Or include at least one deliberately unsolvable board in the parity block's input"
      - "Or narrow the header's claim to what the block actually establishes"
    not_unguarded: >-
      RE-PROVED HERE. Under the same gutted-twin mutation
      `tests/levels.solvability-parity.test.ts` reds (`level-02.json ok: expected true to be
      false`) and `scripts/assert-level-solvability.mjs` exits 1 (`negative fixture
      level-02.json did not fail reachability`). Both carry a real negative fixture. Note
      for attribution: NEITHER of those files is phase 10's — both predate its base.

  - truth: >-
      10-05-SUMMARY / T-10-22: "The probe ships, the `human-check` is harvested into the
      phase UAT, and the ops doc carries a PENDING marker."
    status: failed
    blocking: false
    severity: medium
    reason: >-
      There is no `10-UAT.md`. This phase has no UAT artifact of any kind and never had one.
      The half of the mitigation that IS durable — the ops-document marker — exists and has
      since been discharged with a real measured value, so the A1 assumption is not carried
      as a silent fact. What is missing is the artifact the summary names.
    artifacts:
      - path: ".planning/phases/10-seeded-board-generator/10-05-SUMMARY.md"
        issue: "Names an artifact that does not exist; cited as mitigation evidence for T-10-22."
    missing:
      - "Either a `10-UAT.md` carrying the two Manual-Only items, or a correction beside the claim"

  - truth: >-
      T-10-14: "silent sweep shrink is mitigated by a SWEEP_SEEDS floor assertion AND an
      `it.todo` count asserted at 0."
    status: partial
    blocking: false
    severity: low
    reason: >-
      The floor assertion exists and is real — RE-PROVED HERE: dropping `SWEEP_SEEDS` to 20
      reds with `SC-2 demands a large sweep, not a handful of samples: expected 20 to be
      greater than or equal to 1000`. The second declared half does not exist: zero
      `it.todo` occurrences AND zero todo-count assertion across every phase-10 test file
      (re-measured). An `it(...)` converted to `it.todo(...)` would be reported as a todo,
      not as a failure. Same species as this repo's eleven previous instrument-fidelity
      defects: an artifact naming a gate that was never built.
    artifacts:
      - path: ".planning/phases/10-seeded-board-generator/10-03-PLAN.md"
        issue: "T-10-14 register row declares an enforcement with no implementation."
    missing:
      - "Either assert the todo count, or strike the clause from the register row"

  - truth: >-
      `docs/ops/BOARD-GENERATOR.md` § Limits item 1 heading: "A1 — Hermes byte-identity —
      is UNMEASURED."
    status: failed
    blocking: false
    severity: low
    reason: >-
      Still present at HEAD and still contradicted by the block directly beneath it, which
      reads `MEASURED 2026-09-25 — A1 DISCHARGED`, `0x2e8f6c23`, matching the Node pin. A
      reader skimming headings gets the opposite of the truth. This is the SAFE direction —
      the doc understates what is proven — and is the inverse of this repo's usual defect,
      but a heading that contradicts its own body is still wrong, and § Limits is precisely
      the section a later phase reads to learn what it may not assume.
    artifacts:
      - path: "docs/ops/BOARD-GENERATOR.md"
        issue: "§ Limits item 1 heading contradicts its own body."
    missing:
      - >-
        Narrow the heading to the residual that IS open — the PHYSICAL-DEVICE run, as
        distinct from the iOS-simulator run that was taken

  - truth: >-
      REQUIREMENTS.md records this phase's outcome — N-GEN-01, N-GEN-02, N-GEN-03.
    status: failed
    blocking: false
    severity: low
    reason: >-
      All three are `[ ]` UNCHECKED at HEAD, while every LATER completed phase's
      requirements carry `[x]` plus a dated evidence note (N-END-01/02, N-DAILY-01/02/03,
      N-ACH-01/02/03). Phase 10's three are the only requirements of a roadmap-complete
      phase left unticked, which is consistent with the fact that this is the phase's FIRST
      verification — ticking happens here. Known repo mechanism: `mark-complete` and
      `phase.complete` both fail to mark `N-*` ids, so the checkbox is the only surface and
      it has to be edited by hand.
    artifacts:
      - path: ".planning/REQUIREMENTS.md"
        issue: "N-GEN-01/02/03 unchecked for a completed, now-verified phase."
    missing:
      - "Tick all three with an evidence note in the shape the N-END/N-DAILY entries use"

  - truth: >-
      `.planning/WINDOWS.md` carries this phase's deviations.
    status: partial
    blocking: false
    severity: low
    reason: >-
      RE-MEASURED at HEAD: frontmatter `open_count: 30 / waived_count: 0 / fixed_count: 7 /
      total_count: 37`, arithmetically consistent, and ZERO rows carry phase `10` (the phase
      column filtered on `10` returns nothing). The one entry that concerns this phase is
      `#10`, filed under phase 11. Six plans filing zero ledger entries — against 13, 14 and
      10 for the three phases that followed — is recorded as an observation. Nothing in this
      verification needed a window that was missing, which is why it is `partial` and not
      `failed`.
    artifacts:
      - path: ".planning/WINDOWS.md"
        issue: "No phase-10 attribution; #10 is the only related row and is filed under phase 11."
    missing:
      - "Nothing actionable — recorded so a later reader does not infer phase 10 was deviation-free"

deferred: []

advisory:
  - finding: >-
      `scripts/assert-levelgen-thread.mjs` — the gate committed YESTERDAY to close T-10-24 —
      draws two `import/no-duplicates` lint warnings of its own (`'node:fs' imported multiple
      times`), from its two separate `node:fs` imports.
    category: other
    reason: >-
      Warnings, not errors; `npm run lint` still exits clean. Noted because it is the source
      of my measurement differing from the orchestrator's baseline (see below) and because a
      one-line merge of the two imports removes it.
    evidence_status: "re-measured this process"
  - finding: >-
      MEASUREMENT DISCREPANCY WITH THE BASELINE, stated rather than reconciled. The
      orchestrator recorded `npm run lint` at `3 problems (0 errors, 3 warnings)`. I measure
      `5 problems (0 errors, 5 warnings)` at the same HEAD (`a2a17c2`), twice. The five are:
      2 in `scripts/assert-levelgen-thread.mjs`, 1 in `tests/daily.date-key.test.ts`, 2 in
      `tests/ui/PlayingHost.endless-host.test.ts`. The two-warning delta is exactly the
      phase-10 gate script, which suggests the baseline reading predates `729abd3`. NONE of
      the five is in a phase-10 source file; `npx eslint src/levelgen` is 0 problems.
    category: other
    reason: "Recorded per instruction to say so when readings differ."
    evidence_status: "re-measured this process, twice"
  - finding: >-
      `difficultyForWave` in `src/services/endless/ramp.ts` carries the SAME `| 0` wrap shape
      as the clamp AR-10-03 describes — `(wave | 0) - 1`, so `wave = 2**32 + 3` yields
      difficulty 2 rather than `D_MAX`. This does not weaken AR-10-03's reasoning; it is
      unreachable for a different reason (the wave counter would have to reach 4.3 billion
      within one run). Recorded so a future reader does not cite "the shipped caller clamps
      first" as a wrap-proof argument.
    category: architectural
    reason: "Observation about the accepted risk's containment argument, not a new defect."
    evidence_status: "re-measured this process (arithmetic reproduced in node)"
  - finding: >-
      SC-6's first half was UNGUARDED for the three phases that consumed this generator.
      `scripts/assert-levelgen-thread.mjs` landed `729abd3` on 2026-09-29 — three days after
      the phase shipped and only because the security audit went looking. Throughout phases
      11, 12 and 13 the property held and nothing enforced it. RE-PROVED HERE that the two
      gates the phase cited were blind to it.
    category: architectural
    reason: >-
      Now closed. Recorded because the closure is one day old and the phase's own SUMMARY
      still records the row as mitigated by the two blind gates.
    evidence_status: "re-measured this process"

behavior_unverified_items:
  - truth: >-
      SC-6, second half — "Generating a board allocates nothing on the render or simulation
      hot path."
    test: >-
      Run an endless wave transition and a daily entry on a physical device with an
      allocation/GC profiler attached (or the RN perf monitor), and observe the JS heap and
      frame timing across the transition.
    expected: >-
      No allocation attributable to `generate` on the UI/worklet thread, and no frame spike
      outside the Mid budget at the transition.
    why_human: >-
      NO INSTRUMENT ANYWHERE MEASURES ALLOCATION. The structural half of this criterion is
      real, gated and re-proved here — generation cannot run on the worklet (three
      independent guards, all red-proved below). But `generate` itself allocates freely (a
      `Uint8Array`, a candidate array, a `string[][]`, 16 joined strings, two fresh objects
      per call), and the claim that none of it lands on the hot path rests on WHERE it is
      called, not on a measurement of WHAT it allocates. The only cost figure in the repo is
      phase 11's timing measurement (0.0362 ms Node, ~0.56 ms Hermes-scaled), which is time,
      not allocation, and is not phase 10's. `N-END-03`'s frame-budget half is recorded as
      UNMEASURED in REQUIREMENTS.md for the same reason.

coincidental_reliance_items: []

human_verification:
  - test: >-
      Play three generated boards — one low difficulty, one mid, one high (e.g. the endless
      ramp at waves 1, 10 and 21, or `generate(seed, d)` at d = 0, 10, 20).
    expected: >-
      Each board is clearable by a human in a tolerable time and does not feel unfair,
      degenerate or tedious.
    why_human: >-
      THIS IS THE MOST IMPORTANT ITEM IN THIS REPORT. No human has ever played a generated
      board. The E2 playtest cohort (A3) was skipped by the owner, so the dial constants in
      `SCHEDULE` were calibrated against authored weight and PERFECT-BOT clear time only.
      The bot is a measuring instrument, not a player model: it tracks the lowest live ball
      and never misses, so its clear time is a FLOOR on human time. The 840-board scan
      recorded p50 108 s, p95 259 s, p99 416 s and a worst case of 1 495 s of simulated BOT
      play — which means the top of the range is plausibly far too long for a person to
      finish. That is a balance finding, not a correctness one, and it is the single
      dimension on which the phase goal's clause "as safe to play as a hand-authored one"
      is NOT established: the authored levels have a human behind them and the generated
      ones do not. Listed in `10-VALIDATION.md` § Manual-Only Verifications as "Board feel"
      and never taken.
  - test: >-
      Run the A1 determinism probe on PHYSICAL hardware — `EXPO_PUBLIC_LEVELGEN_PROBE=1 npx
      expo start`, open on a real device, read the `[levelgen]` log line.
    expected: "`u32=0x2e8f6c23` — identical to the Node pin and to the simulator reading."
    why_human: >-
      The one Hermes observation on record was taken on the iPhone 17 SIMULATOR, which runs
      the same Hermes build on host x86/arm hardware. The ops document says so honestly and
      volunteers that a physical run "has not been observed either way." Nothing in this
      repository can reach Hermes, so no gate can ever close this. The arithmetic is
      integer-only by design and a divergence would be surprising — but phase 12's daily
      challenge is the consumer that cannot tolerate device and CI handing players different
      boards for the same date, so the residual is worth an hour whenever a device is in
      front of someone.
  - test: >-
      Observe a wave transition and a daily entry on a physical device with the RN perf
      monitor or an allocation profiler running.
    expected: "No frame spike outside the Mid budget; no UI-thread allocation from generation."
    why_human: >-
      The device half of SC-6 (see `behavior_unverified_items`). Also the still-open half of
      `N-END-03`. jsdom performs no layout and no test in this repo runs a frame loop against
      real hardware.

# ===========================================================================
# EVIDENCE PROVENANCE — read this before citing anything below as "verified".
# A `6/6` score is not six measurements of one kind. It is four kinds of
# evidence, and one of the four columns is EMPTY when it should not be.
# ===========================================================================
evidence_provenance:
  measured_by_verifier:
    note: >-
      Nine mutations and four probes, each run in a disposable `git worktree` under the
      scratchpad, every one reverted, worktree removed, main tree confirmed byte-identical to
      session start. MUTATIONS — (1) `if (true || allNonSteelReachable(...))` → solvability
      sweep RED at `s=8 d=20`, 2 unreachable; (2) `checkSolvability` in the `.mjs` twin gutted
      to a constant → sweep file GREEN 10/10 (vacuity proof) while
      `tests/levels.solvability-parity.test.ts` REDS and `scripts/assert-level-solvability.mjs`
      exits 1; (3) `GRID.originX` 2 → 40 → per-board playfield case RED (`expected 396 to be
      less than or equal to 360`), GRID-level case RED, and BOTH determinism pins RED; (4)
      density dial reversed with the envelope intact → monotonicity suite GREEN (the envelope,
      not the test, is what holds it); (5) `envelope` and `cumulativeMax` made identity +
      reversed density → `bricks` and `totalHp` monotonicity cases RED at d=1; (6) `take =
      entry.hb - 1` → exact-weight equality RED at `s=0 d=0` (30 vs 32); (7) stage-3
      `capExplosiveClusters` call removed → cluster cap RED at `s=22 d=2` with a cluster of 6;
      (8) `HP3 '3'` → `'Z'` → FOUR independent sweep cases RED; (9) `SWEEP_SEEDS` 1000 → 20 →
      floor assertion RED. PROBES — a 9-construct ambient-input file under `src/levelgen` drew
      exactly 10 eslint errors; a self-contained `'worklet'` planted in `src/levelgen/grid.ts`
      RED `assert-levelgen-thread.mjs` at exit 1 naming `grid.ts:62` while
      `assert-worklet-closures.mjs` stayed at "OK (130 files)" and `npx eslint src/levelgen`
      drew zero — the same directive inside a COMMENT left the new gate at exit 0; a worklet in
      `src/runtime` CALLING `generate` was caught twice over (`worklet calls generate from
      ../levelgen (not a worklet)` AND the boundaries matrix); and the difficulty clamp
      arithmetic re-derived in node over the full Number domain.
    covers: "SC-1 (Node/V8 half), SC-2, SC-3, SC-4 (over [0, D_MAX]), SC-5, SC-6 (structural half)"
  measured_by_control:
    note: >-
      Standing gates in `npm test`, re-run by me at HEAD: `vitest run` 112 files / 873 passed
      | 1 skipped (874) chaining SEVEN `assert-*.mjs`, exit 0. Two of those gates prove
      themselves: `assert-levelgen-thread.mjs` runs a two-direction self-check (a directive in
      code must be caught, the same text in prose must not) and an anti-vacuity floor (fewer
      than five files in scope is a failure) BEFORE it scans; `assert-level-solvability.mjs`
      carries a negative fixture (`level-02.json: FAIL as expected (8 unreachable) —
      self-check OK`). The two determinism pins are themselves a cross-process control: a
      literal SHA-256 and a literal u32 that any fresh process must reproduce.
    covers: "SC-1, SC-2, SC-5, SC-6 (directive absence)"
  measured_by_prior_audit_not_re_run_here:
    note: >-
      `10-SECURITY.md` (2026-09-29, 30 rows, 25 unique ids, `threats_open: 0`) closed 11 of
      30 rows by MAKING A CONTROL FAIL. I independently reproduced six of those measurements
      (the invariant mutation, the twin gutting, the cluster-cap removal, the charset
      mutation, the sweep floor, the eslint ambient probe, and both worklet plants). I did NOT
      re-run: the boundaries-element deletion (T-10-02), the `>>> 0` hang on `below()`
      (T-10-03 — it hangs rather than reds, and CI would fail by wall clock), the 380-hostile-
      seed cross product (T-10-04), the aliasing detector's throw (T-10-17), or the
      `EXPLOSIVE_CLUSTER_CAP` 4 → 3 double-pin red (T-10-15). Those rest on the audit's
      record, which this verification found accurate everywhere it overlapped.
    covers: "the security posture; the hostile-input and aliasing properties"
  human_testimony_not_measured:
    count: 1
    record: "docs/ops/BOARD-GENERATOR.md § Limits item 1"
    note: >-
      ONE item, and it is the A1 Hermes reading: `[levelgen] corpus fingerprint
      u32=0x2e8f6c23 seeds=200 boards=4200 ms=1331`, iPhone 17 simulator, iOS 26.5, Expo SDK
      57 dev client. A person ran that probe and pasted that line. Nothing in this repository
      can re-derive it — Hermes is the one execution environment no gate here reaches — so it
      is testimony, correctly recorded, and it is the ONLY entry in this column.
  human_judgement:
    count: 0
    note: >-
      EMPTY, AND THAT IS ITSELF A FINDING. Phase 12 closed one item by owner judgement and
      eight by owner testimony. Phase 10 has neither, because it has no UAT artifact and no
      human has ever played one of its boards. The E2 playtest cohort (A3) was skipped, so
      every dial constant in `SCHEDULE` — density, HP mix, steel, explosive — rests on
      authored-weight arithmetic and perfect-bot clear time. The phase goal says a generated
      board must be "as safe to play as a hand-authored one." On every machine-checkable
      dimension it is MORE verified than a hand-authored one (21 000 boards through
      validate + compile + solvability, versus six authored files). On the one dimension
      where a hand-authored board's evidence is a person having played it, this column is
      where that evidence would live, and it is empty.
---

# Phase 10: Seeded Board Generator — Verification Report

**Phase Goal:** A board can be generated from a seed and a difficulty number, and is as safe to play as a hand-authored one
**Verified:** 2026-09-29T01:58:31Z
**Status:** `human_needed`
**Re-verification:** No — **this is the phase's FIRST verification.** It shipped three phases ago (2026-09-25) and phases 11 and 12 have both been built on top of it. There is no prior VERIFICATION.md and no UAT artifact.
**Tree verified:** HEAD `a2a17c2`, working tree unchanged. All mutation and probe work ran in a disposable `git worktree` under the scratchpad, since removed; `git status` after is byte-identical to `git status` before (`M .planning/config.json`, `?? .planning/milestone.lock`, `?? .planning/state.json` — and nothing else).

## Verdict

**The goal is achieved. All six success criteria hold, none is falsified, and five of the six were re-proved in this process by making the relevant assertion fail.** What is outstanding is not a defect in the generator: it is that nobody has ever played one of its boards.

Two things must be said separately, because collapsing them into a tick is how this project has accumulated twelve instrument-fidelity defects in four phases:

1. **Every criterion is true.** I mutated the generator nine ways and each mutation red the specific assertion that owns the corresponding criterion. The generator is genuinely, structurally safe — more machine-verified than the hand-authored campaign it is measured against.
2. **Three of the criteria's stated evidence does not establish what it claims.** SC-2's neighbouring parity block is vacuous (proved twice, in both directions). SC-4's "verified across the range" is true over the declared integer domain `[0, D_MAX]` and false over the full `Number` domain. SC-6's first half was enforced by nothing at all until a gate committed *yesterday*, one day before this report, and only because the security audit went looking.

**Why `human_needed` rather than `gaps_found`.** Six gaps are recorded below and every one is an evidence-fidelity defect — a stated instrument that does not perform its claimed check, or a named artifact that does not exist. Not one of them makes a success criterion false, and in every case where a guard is claimed, a real guard exists elsewhere and was red-proved here. Phases 11 and 12 have already shipped on this generator and are both verified. Holding the phase at `gaps_found` would assert that something is broken; nothing is. What is genuinely open is human: **three items nobody has taken, one of which — a person playing a generated board — is the exact clause of the phase goal that no machine in this repository can reach.**

## Goal Achievement

### Success Criteria

| # | Criterion | Status | Evidence, and how it was established |
|---|-----------|--------|--------------------------------------|
| 1 | `generate(seed, difficulty)` returns a `LevelFileV1` and is **pure** — same arguments, byte-identical output across processes | ✓ VERIFIED | **Purity: control-measured, re-proved.** A probe file under `src/levelgen` carrying `Math.random`, `Date.now`, `performance.now`, `Math.pow/sin/cos/exp/log` and `**` drew **exactly 10 eslint errors** (`performance.now` fires both `no-restricted-globals` and `no-restricted-syntax`), each naming N-GEN-01. **Cross-process byte-identity: verifier-measured in two independent OS processes** — `npm test` in the main tree and `vitest run tests/levelgen.determinism.test.ts` in a separate worktree both reproduced the literal pins `9e3748c8…` (SHA-256 over 4 200 boards) and `2e8f6c23` (u32). The pins are falsifiable: a single `GRID.originX` change red **both** with the full regeneration warning. **Not claimed:** Hermes. See SC-1 note below. |
| 2 | Every generated board passes `checkSolvability` with **zero unreachable breakables**, over a **large sweep** | ✓ VERIFIED | **Verifier-measured, both halves.** The assertion is falsifiable: `if (true \|\| allNonSteelReachable(...))` reds `checkSolvability reports zero unreachable breakables over the sweep` at `s=8 d=20` with 2 unreachable cells. "Large" is falsifiable too: `SWEEP_SEEDS` 1000 → 20 reds the floor with `SC-2 demands a large sweep, not a handful of samples`. 21 000 boards (1 000 seeds × 21 difficulties), each through `validateLevel`, `loadAndCompile` and `checkSolvability`. **Its neighbouring parity claim is a different thing and is vacuous — gap 1.** |
| 3 | Every board fits the 360×640 playfield — the `level-04`/`level-05` bug cannot recur | ✓ VERIFIED | **Verifier-measured, red-proved in two independent places.** `GRID.originX` 2 → 40 (right edge 396) reds BOTH the per-board sweep case (`s=0 d=0 right edge: expected 396 to be less than or equal to 360`) and the GRID-level case in the determinism suite. Bounds are computed from `LOGICAL_WIDTH`/`LOGICAL_HEIGHT` off `src/core`, not from local literals — which is the specific thing that failed for `level-04`/`level-05`, where the guard existed in exactly one place. **Stated honestly:** the mechanism is stronger than the sweep implies and the sweep is weaker than it looks. D-02 gives every board ONE frozen lattice, so the 21 000-iteration loop re-tests the same eight numbers 21 000 times. What makes the failure class impossible is the single lattice plus the fresh-copy rule, not the width of the loop. |
| 4 | Difficulty is a **single monotone input** — non-decreasing brick count and total HP, verified **across the range** | ✓ VERIFIED **over the declared domain**, with a documented non-monotonicity outside it | **Verifier-measured as a two-link chain, both links red-proved.** Link 1, the table: making `envelope`/`cumulativeMax` identity with a reversed density dial reds both `bricks is non-decreasing across the full 0..D_MAX range` and `totalHp is non-decreasing…` at `d=1` (62 vs 64; 72 vs 74). Link 2, the transfer to actual boards: `take = entry.hb - 1` reds `authored weight equals the schedule exactly for every (seed, difficulty)` at `s=0 d=0`. Chained, generated-board monotonicity follows for every `(seed, d)`. **Range verified: the integer domain `[0, D_MAX]`**, which is what `schedule.ts` declares difficulty to be. **Outside it the clamp is non-monotone and I re-measured it:** `2**31 → 0`, `2**32 → 0`, `MAX_SAFE_INTEGER → 0`, `Infinity → 0` — the EASIEST board, not the hardest — because `\| 0` wraps mod 2³² before `Math.max(0, Math.min(D_MAX, …))`. Unreachable from both shipped callers (verified: `difficultyForWave` clamps into `[0, D_MAX]` in its own body; `DAILY_DIFFICULTY = 10 as const`). Recorded as **AR-10-03**. **A third link is worth naming:** monotonicity is enforced BY CONSTRUCTION, not by the test — reversing the primary density dial with the envelope intact leaves the suite green, because the running maxima flatten it. That is a correct green (the property still holds), but it means the suite's discriminating power is against removal of the envelope machinery, not against mis-tuning. |
| 5 | Only shipped verbs (multi-HP, steel, explosive); Mid-tier particle budget respected; **no new brick type** | ✓ VERIFIED | **Verifier-measured, red-proved twice.** Charset: `HP3 '3'` → `'Z'` reds **four independent** sweep cases (validate/compile, solvability, authored weight, and the charset/`brickTypes` deep-equal). Particle budget: deleting the stage-3 `capExplosiveClusters` call reds `no 8-connected explosive cluster exceeds the cap` at `s=22 d=2` with a cluster of **6** — the exact figure RESEARCH measured on the unconstrained generator, so the assertion is calibrated against a real defect. The sweep's cluster labelling is a second, independently written implementation, not the generator's own. **The budget arithmetic's inputs are real — I checked the constants rather than the comment:** `DESTROY_SPARKS_AT_1 = 12` (`src/vfx/types.ts`), Mid `particleCap: 128` (`src/runtime/resolveQualityTier.ts`). 4 × round(12 × 1.25) + 12 = 72 ≤ 128. **Stated honestly: no test counts emitted particles.** The cap on clusters is enforced; the budget claim is a derivation over verified constants, backstopped independently by the particle pool's own hard cap with FIFO eviction. |
| 6 | Generation **allocates nothing on the render or simulation hot path**; runs once per board, **off the worklet** | ⚠️ SPLIT — structural half ✓ VERIFIED; allocation half PRESENT, BEHAVIOUR UNVERIFIED | **Structural half: verifier-measured, and stronger than the phase ever claimed.** Three independent guards, all red-proved here. (a) `assert-levelgen-thread.mjs` — a self-contained `'worklet'` planted in `src/levelgen/grid.ts` exits 1 naming `grid.ts:62`; the same text inside a comment exits 0; the script self-checks both directions and refuses to scan fewer than five files. (b) The complement — a worklet CALLING `generate` — is caught by `assert-worklet-closures.mjs` (`worklet calls generate from ../levelgen (not a worklet)`), which **nothing in the phase's artifacts claims**. (c) The boundaries matrix bars `runtime`, `render`, `vfx` and `input` from importing `levelgen` at all: my probe drew `There is no policy allowing dependencies from elements of type "runtime" to elements of type "levelgen"`. Only `app` and `services` may reach the barrel. Both shipped call sites are JS-thread: `advanceToWave` (inside a `runOnJS`'d callback) and the daily entry handler. **Allocation half: nothing measures it.** See `behavior_unverified_items`. **And see the advisory:** guard (a) landed `729abd3` on 2026-09-29 — this criterion was enforced by nothing for the three phases that consumed it. |

**Score: 6/6 criteria hold.** 5 re-proved by mutation in this process; SC-6 counts as holding on its structural half with its allocation half routed to a person.

### SC-1, stated precisely

SC-1 as worded — *byte-identical output across processes* — is fully verified and I measured it in two independent processes. The **cross-engine** extension beyond that wording rests on **one human's simulator reading**, recorded in the ops document, and is the only entry in the human-testimony column of `evidence_provenance`. A physical-device run has never been observed either way. That extension is not required by SC-1; it IS required by phase 12's daily challenge, which is why it is a human-verification item rather than a footnote.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/levelgen/generate.ts` | The three-stage pure generator | ✓ VERIFIED | `generate` exported; stages 1–3 present; nine mutations here each propagated to a specific red, so it is the live code path. |
| `src/levelgen/schedule.ts` | `D_MAX`, `SCHEDULE`, `envelope` | ✓ VERIFIED | Integer-only dials; monotonicity is an algebraic identity over three running maxima, red-proved when the maxima are removed. |
| `src/levelgen/reachability.ts` | `allNonSteelReachable` | ✓ VERIFIED | Called from stage 1 on the FULL mask after both cells of a mirrored pair are set; short-circuiting it reds the sweep. |
| `src/levelgen/rng.ts` | Integer mulberry32 + FNV-1a, `below`, `shuffleInPlace` | ✓ VERIFIED | 16 determinism cases green in a separate process; carries the `SECURITY:` "explicitly NOT a CSPRNG" block. |
| `src/levelgen/grid.ts` | The one frozen lattice + `BRICK_TYPES` | ✓ VERIFIED | `Object.freeze`d; bounds arithmetic in the header matches the measured values; mutating it reds three cases. |
| `src/levelgen/fingerprint.ts` | `CORPUS_SEEDS`, `corpusFingerprint()` | ✓ VERIFIED | Engine-portable u32; consumed by the determinism pin AND by the device probe in `GameHost.tsx`. |
| `src/levelgen/index.ts` | The barrel | ✓ VERIFIED | The path both consumers and the device probe use (LC-16). |
| `tests/levelgen.sweep.test.ts` | The 21 000-board contract sweep | ⚠️ VERIFIED with one vacuous block | 9 of its 10 cases red under at least one mutation here. The tenth — the R-16 parity block — red under none. Gap 1. |
| `tests/levelgen.determinism.test.ts` | Pins, clamping, aliasing detector | ✓ VERIFIED | 16 passed in an independent process; both pins red under a one-constant change. |
| `tests/levelgen.schedule.test.ts` | Monotonicity over `0..D_MAX` | ✓ VERIFIED | Red-proved; see SC-4 for the honest limit on its discriminating power. |
| `tests/levelgen.winnability.test.ts` | 30-board stratified bot sample | ✓ VERIFIED, and correctly scoped | Asserts `WON` **and** `bricksRemaining === 0`, pins its own width at 30. Its header already says `WON` is necessary, not sufficient. **Do not read it as a backstop for reachability** — the audit measured, and this report accepts, that under an invariant-disabled mutation the sweep reds at `s=8 d=20` while this sample, which *includes* `s=8 d=20`, still returns `WON`. The two are genuinely independent. `maxTicks` is **1 800** simulated seconds, not the 420 the register declared — changed deliberately because 420 sat at the measured p99; the shipped number is better against the threat than the declared one. |
| `scripts/assert-levelgen-thread.mjs` | T-10-24 standing gate | ✓ VERIFIED | Red-proved both directions here. Seventh `assert-*.mjs` in `npm test`. **One day old.** |
| `docs/ops/BOARD-GENERATOR.md` | The ops document | ⚠️ VERIFIED with a stale heading | § Limits carries all four required items (A1, the skipped A3 cohort, the deliberate absence of `assert-generated-solvability.mjs`, the clear-time tail) plus a full device-probe procedure with both outcome branches. Item 1's heading contradicts its own body — gap 4. |
| `.planning/phases/10-seeded-board-generator/10-UAT.md` | Claimed by `10-05-SUMMARY` / T-10-22 | ✗ MISSING | Does not exist and never did. Gap 2. |

### Key Link Verification

| From | To | Via | Status | How established |
|---|---|---|---|---|
| `generate.ts` | `reachability.ts` | stage 1 checks the invariant on the full mask after both mirrored cells are set | ✓ WIRED | Short-circuiting the call reds the sweep at `s=8 d=20`. Not a grep. |
| `generate.ts` | `schedule.ts` | exact per-difficulty counts from `SCHEDULE[d]`; the seed picks only *which* cells | ✓ WIRED | `take = entry.hb - 1` reds exact-weight equality at `s=0 d=0`. |
| `sweep.test.ts` | `src/core/levels/solvability.ts` | `checkSolvability` over generated boards — the lint is the net, never inside `generate` | ✓ WIRED | Red-proved. Also confirmed `generate` calls neither `validateLevel` nor `checkSolvability` (D-03 by construction). |
| `sweep.test.ts` | `scripts/lib/levelSolvability.mjs` | R-16 twin parity over the generated corpus | ⚠️ IMPORTED, NOT DISCRIMINATING | The import is real and live. The assertion it feeds is vacuous — gutting the twin leaves the file 10/10 green. Gap 1. |
| `fingerprint.ts` | `generate.ts` | folds FNV-1a over `JSON.stringify` of a fixed 4 200-board corpus | ✓ WIRED | The u32 pin reds under a `GRID` change. |
| `GameHost.tsx` | `fingerprint.ts` | `__DEV__` + `LEVELGEN_PROBE` double-gated one-shot mount effect | ✓ WIRED | Gates correctly **ordered** — both returns precede the first `Date.now()` and `corpusFingerprint()`. `assert-eas-profiles` green: *production env clean*. |
| `PlayingHost.tsx` | `src/levelgen` (barrel) | `generate` at the endless wave transition and the daily entry | ✓ WIRED, JS THREAD | Both sites are inside `useCallback` bodies on the RN JS thread; the endless one runs inside a `runOnJS`'d callback. Once per board. |
| `src/runtime/**` (worklets) | `src/levelgen` | — | ✓ CORRECTLY ABSENT AND GATED | Probe confirmed: forbidden by the boundaries matrix AND caught by the worklet closure guard. |

### Data-Flow Trace (Level 4)

| Artifact | Value | Source | Produces real data | Status |
|---|---|---|---|---|
| `generate()` → `cells` | the board's 16 row strings | stage 1 steel mask + stage 2 schedule fill + stage 3 demotion | Yes — every one of 21 000 boards compiles, validates and is solvable | ✓ FLOWING |
| `generate()` → `grid` | the lattice | `{ ...GRID }`, a fresh spread per call | Yes, and provably non-aliased: mutating board N leaves N+1 byte-identical | ✓ FLOWING |
| `generate()` → `brickTypes` | the five verb definitions | fresh object literal per call | Yes — deep-equals `BRICK_TYPES` on every board | ✓ FLOWING |
| `PlayingHost.advanceToWave` | the next wave's compiled board | `generate(seedForWave(...), difficultyForWave(...))` → `compileGeneratedLevel` → `compiledSv.value` | Yes — phase 11's wave-loop suite drives the real transition | ✓ FLOWING |
| `PlayingHost` daily entry | today's board | `generate(dateKey, DAILY_DIFFICULTY)` | Yes — phase 12's daily suites drive it, and it is `passed`-verified | ✓ FLOWING |
| `GameHost` probe line | the on-device u32 | `corpusFingerprint()` over 4 200 real boards | Yes, when armed; nothing when not | ✓ FLOWING |

### Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
|---|---|---|---|
| Whole suite green at HEAD | `npm test` | exit 0 — **112 files / 873 passed \| 1 skipped (874)**, seven `assert-*.mjs` | ✓ PASS (matches baseline exactly) |
| Types clean | `npm run typecheck` | exit 0, no output | ✓ PASS |
| Lint clean | `npm run lint` | **5 problems (0 errors, 5 warnings)** — see advisory; baseline said 3 | ✓ PASS (0 errors) with a recorded discrepancy |
| Generator layer clean | `npx eslint src/levelgen` | 0 problems | ✓ PASS |
| Sweep in isolation | `npx vitest run tests/levelgen.sweep.test.ts` | 10 passed (10), 8.7 s | ✓ PASS |
| Determinism in a separate process | `npx vitest run tests/levelgen.determinism.test.ts` (separate worktree) | 16 passed (16) — both pins reproduced | ✓ PASS |
| Difficulty clamp over the Number domain | `node -e` re-deriving `Math.max(0, Math.min(20, x\|0))` | `-5→0`, `999→20`, `1e20→20`, `2**31→0`, `2**32→0`, `MAX_SAFE_INTEGER→0`, `Infinity→0`, `NaN→0` | ✓ PASS, non-monotone as AR-10-03 records |

### Probe Execution

This repository has no `scripts/*/tests/probe-*.sh` convention; its runnable checks are the seven `assert-*.mjs` chained by `npm test`, each of which I executed.

| Gate | Result | Status |
|---|---|---|
| `assert-worklet-closures.mjs` | `Worklet closure guard OK (130 files)` | PASS |
| `assert-level-solvability.mjs` | ship levels pass; `level-02` fails as expected — negative fixture holds | PASS |
| `assert-eas-profiles.mjs` | production env clean; profiling SOAK unset | PASS |
| `assert-brand-name.mjs` | consistent; old name absent | PASS |
| `assert-streak-evidence.mjs` | 2 consumers, each judging one record | PASS |
| `assert-purity.mjs` | `purity_probe_errors=5` | PASS |
| `assert-levelgen-thread.mjs` | `OK (T-10-24 — 0 'worklet' directives across 7 src/levelgen files…)` | PASS |

### Requirements Coverage

| Requirement | Description | Implementation status | Checkbox at HEAD |
|---|---|---|---|
| **N-GEN-01** | `generate` is pure; identical arguments → byte-identical output across processes | ✓ SATISFIED — purity gate re-proved (10 errors); pins reproduced in two processes and red-proved | ✗ `[ ]` UNCHECKED |
| **N-GEN-02** | Zero unreachable breakables and 360×640 fit, over a sweep | ✓ SATISFIED — both red-proved; sweep floor red-proved | ✗ `[ ]` UNCHECKED |
| **N-GEN-03** | Monotone difficulty; shipped verbs only; Mid particle budget | ✓ SATISFIED over `[0, D_MAX]` — all three halves red-proved | ✗ `[ ]` UNCHECKED |

No orphaned requirements: `REQUIREMENTS.md` maps exactly these three to phase 10 and all three appear in the plans' `requirements` fields. The unchecked boxes are gap 5 — and they are the expected state, because ticking is what verification does and this phase had never been verified.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|---|---|---|---|
| — | `TBD` / `FIXME` / `XXX` across `src/levelgen/**`, the four phase-10 test files, the ops document and the gate script | — | **None. Zero debt markers.** The single `XXX` grep hit is `0xXXXXXXXX` inside a sample log line in the device-probe procedure — a format placeholder, not a debt marker. |
| `scripts/assert-levelgen-thread.mjs` | `'node:fs' imported multiple times` ×2 | ℹ️ Info | Lint warnings, 0 errors. Recorded as an advisory; a one-line merge removes them. |
| `tests/levelgen.sweep.test.ts` | a 21 000-iteration loop whose assertion is satisfiable by construction | ⚠️ Warning | Gap 1. Not a stub — the import is live and the corpus is real — but the block adds no discriminating power. |

### Gaps Summary

Six gaps, none blocking, all of one species: **an artifact naming an enforcement that is absent, weaker, or located elsewhere.** This project has now produced that defect thirteen times in four phases, and the reason it matters is written into `10-SECURITY.md`'s own trust-boundary table: *the next reader trusts the citation and stops looking.*

1. **The 21 000-board parity block is vacuous.** Proved twice, in both directions. Nothing is unguarded — the twin's real guards carry a negative fixture and I red-proved both. What is lost is the sweep header's claim to extend parity evidence to the generated distribution.
2. **`10-05-SUMMARY` cites a UAT artifact that does not exist.** The durable half of the same mitigation — the ops-doc marker — is real and has been discharged.
3. **T-10-14's `it.todo`-count gate was never built.** Its sibling, the `SWEEP_SEEDS` floor, is real and red-proved.
4. **`BOARD-GENERATOR.md` § Limits item 1's heading contradicts its body.** Safe direction; still wrong; still in the section later phases read to learn what they may not assume.
5. **N-GEN-01/02/03 are unticked** while every later completed phase's requirements carry `[x]` plus an evidence note.
6. **Zero WINDOWS rows for phase 10** across six plans, against 13/14/10 for the phases that followed. Observation, not an actionable defect.

And one thing that is not a gap at all but is the most important sentence in this report: **the phase goal's clause "as safe to play as a hand-authored one" is established on every machine-checkable dimension and on none of the human ones.** A generated board is, verifiably, more lint-tested than any of the six authored levels. It has also never been played.

---

_Verified: 2026-09-29T01:58:31Z_
_Verifier: Claude (gsd-verifier) — nine mutations, four probes, all reverted; worktree removed; main tree confirmed unchanged._

---

## Disposition (orchestrator, 2026-09-29)

All six gaps are recorded and none is resolved here; they are evidence-fidelity defects, none
falsifying a criterion. Two notes.

**The lint reading was right and mine was wrong.** This report measured 5 warnings where I supplied
3. Two were in `scripts/assert-levelgen-thread.mjs` — the gate I committed in `729abd3` hours
earlier, with a duplicated `node:fs` import. Fixed in `7f80a30`, together with the three older ones,
because chasing them found that `.github/workflows/ci.yml` runs
`npm run lint -- --max-warnings 0` — **not** the plain `npm run lint` whose exit 0 I had been
calling the clean baseline all session. The CI form exited **1** on this tree, and CI last ran
2026-09-25, so phases 10–13 had accumulated behind a gate nothing had exercised.

**SC-6's split verdict is the right shape and is left as written.** The structural half is closed
and, as this report found, is stronger than the phase's own artifacts claim — three guards, all
red-proved, including the boundaries matrix barring `runtime → levelgen`, which no artifact
mentions. The allocation half has **no instrument anywhere**, so `behavior_unverified` is accurate
and must not be read as a tick.

`evidence_provenance.human_judgement` being `count: 0` is the finding, not a formatting artifact:
**nobody has ever played a generated board.** The E2 cohort (A3) was skipped and the dials rest on
perfect-bot clear time whose p99 is 416 s. That is the clause of the goal — *"as safe to play as a
hand-authored one"* — no machine in this repository can reach.

Post-disposition gates: `npm test` exit **0** at **112 files / 874 passed | 1 skipped (875)**;
`npm run typecheck` exit 0; `npm run lint -- --max-warnings 0` exit **0**; the five `assert:*`
scripts exit 0; coverage **83.94%** lines against the 40% floor. Verdict **unchanged:
`human_needed`**.
