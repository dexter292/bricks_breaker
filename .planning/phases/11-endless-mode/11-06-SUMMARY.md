---
phase: 11-endless-mode
plan: 06
subsystem: docs-ops
tags: [endless, ops-doc, sc-2, sc-4, sc-5, supersession, open-assumption, scope-honesty]

# Dependency graph
requires:
  - phase: 11-endless-mode
    plan: 01
    provides: "difficultyForWave / seedForWave and the D-06 world.tick reset inside applyWaveAdvance"
  - phase: 11-endless-mode
    plan: 03
    provides: "the cumulative tick bank and its two-wave measurement table"
  - phase: 11-endless-mode
    plan: 04
    provides: "the 12-wave reference table (difficulty, ticks, lives, score, board digest) this document reports, and the D-04 lives finding"
  - phase: 11-endless-mode
    plan: 05
    provides: "the D-14 bake re-key and the explicit hand-off that the device SC-5 reading is outstanding for 11-06"
  - phase: 10-seeded-board-generator
    provides: "docs/ops/BOARD-GENERATOR.md — the header idiom, the Limits preamble, the discharged-A1 block format, and the superseded item-2 inference"
provides:
  - "docs/ops/ENDLESS-MODE.md — the written-down wave→difficulty ramp (SC-2), the D-06 decision with its measurement, the 12-wave measured reference run, the settled open question, and a six-item Limits section"
  - "A dated supersession note in docs/ops/BOARD-GENERATOR.md § Limits item 2, cross-linked to ENDLESS-MODE.md, with the original inference preserved verbatim"
  - "A dated OPEN device-digest block for the SC-5 frame-budget half, with its discharge procedure and four failure signatures, plus the matching .planning/STATE.md § Pending Todos line"
affects: [11 end-of-phase UAT harvest, 12 daily challenge, 14 Meta Shell (deletes the __DEV__ entry and owns the production HUD placement)]

# Actuals (#2632)
actuals:
  tokens: 6506
  tasks: 3
  commits: 4
plan_head_before: 2ab7e7334040947ffd423f52fc6c5df8deba7b4e

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supersession-in-place: the superseded claim is kept byte-identical, bracketed by a lead-in marker and a dated correction block, so a later reader sees both the belief and what corrected it"
    - "Bidirectional ops cross-link: the correcting document names the superseded item and the superseded item names the correcting document, so neither can be read alone and mislead"
    - "Open assumption as a deliverable: a dated OPEN block carrying the unmeasured property, the discharge procedure, the failure signatures, and an explicit prohibition on writing a reading that was not taken"

key-files:
  created:
    - docs/ops/ENDLESS-MODE.md
  modified:
    - docs/ops/BOARD-GENERATOR.md
    - .planning/STATE.md

key-decisions:
  - "The device SC-5 block was written as a dated OPEN assumption, not a passing reading — no device measurement was taken by this plan, and the block explicitly names 'no device available' as a valid outcome that keeps it OPEN"
  - "Task 1 left a self-describing PLACEHOLDER block rather than pre-writing Task 3's content, so that a truncated execution would surface as a visible unfilled placeholder rather than as a silently-complete-looking document"
  - "The BOARD-GENERATOR.md amendment is 20 insertions and 0 deletions — the superseded paragraph is bracketed, never rewritten, because the § Limits preamble's whole purpose is that the belief stays visible next to its correction"
  - "ENDLESS-MODE.md § Limits carries six items, not the five the plan enumerated: the SC-3 storage firewall (D-11 / D-12) was added as item 6 with its own honest gap (no cross-device sync of endless records is designed anywhere)"
  - "Numbers in the D-06 table are written without digit-group spaces (4497.2, 3457.4) because the plan's own acceptance grep matches the unspaced form; the surrounding prose keeps the spaced house style for counts"

patterns-established:
  - "An ops record that supersedes another states the conclusion in one line and names the correcting section, so a reader who stops after the first line still has the correction"
  - "A device-gated criterion is recorded as an OPEN block plus a STATE.md § Pending Todos line — two places, because the document is where the discharge happens and STATE.md is where the debt is counted"

requirements-completed: [N-END-01, N-END-02, N-END-03]

coverage:
  - id: D1
    description: "SC-2's 'written down rather than tuned by feel in code' clause is satisfied by an ops document: the wave→difficulty table (wave 1 = d 0, one step per wave, clamped at D_MAX = 20 from wave 21), the per-wave seed derivation with its injectivity argument, and D-01's reason for clamping rather than widening"
    requirement: "N-END-01"
    verification:
      - kind: other
        ref: "grep -c 'wave' docs/ops/ENDLESS-MODE.md -> 56 (VALIDATION's SC-2 check, threshold 10)"
        status: pass
      - kind: other
        ref: "grep -c '## Limits' docs/ops/ENDLESS-MODE.md -> 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "The D-06 world.tick decision is recorded with the measurement that justified it (30 waves, one run seed: carried 3457.4 s / 791 190 vs reset 4497.2 s / 946 880), plus both consequences and where each is handled — effects cleared above the reset, cumulative ticks banked on the UI runtime"
    requirement: "N-END-01"
    verification:
      - kind: other
        ref: "grep -c '3457.4\\|4497.2' docs/ops/ENDLESS-MODE.md -> 2"
        status: pass
    human_judgment: false
  - id: D3
    description: "SC-4's replay claim is scoped in writing: headless and policy-fixed, a device run is NOT replayable because no per-tick intent recorder exists, and the board sequence alone is unconditionally reproducible (the part Phase 12 inherits)"
    requirement: "N-END-03"
    verification:
      - kind: other
        ref: "grep -ci 'not replayable\\|no per-tick intent' docs/ops/ENDLESS-MODE.md -> 2"
        status: pass
    human_judgment: false
  - id: D4
    description: "The settled open question is reproduced with its four findings (500-seed d=20 scan with 0 non-wins; the 18x trajectory spread collapsing s=33 from 1495.3 s to 83.0 s; non-monotone maxima with d=17 at 2735.3 s; the cost of a re-tune), and states that SCHEDULE was deliberately not re-tuned and that no softlock exists"
    requirement: "N-END-01"
    verification:
      - kind: other
        ref: "grep -ci '1495.3\\|83.0\\|2735.3' docs/ops/ENDLESS-MODE.md -> 4"
        status: pass
    human_judgment: false
  - id: D5
    description: "BOARD-GENERATOR.md § Limits item 2's superseded inference is amended in place: the first paragraph is byte-identical, the original second paragraph is preserved verbatim, and a dated supersession note cross-links to ENDLESS-MODE.md"
    verification:
      - kind: other
        ref: "grep -c 'No human play calibrated the dial constants' -> 1; grep -c 'plausibly unfinishable' -> 2; grep -c 'ENDLESS-MODE.md' -> 1; git diff --numstat dcfdd37..HEAD -- docs/ops/BOARD-GENERATOR.md -> 20 insertions / 0 deletions"
        status: pass
    human_judgment: false
  - id: D6
    description: "The device half of SC-5 is recorded as a dated OPEN assumption with its discharge procedure and four failure signatures, and the matching debt line is in STATE.md § Pending Todos"
    requirement: "N-END-03"
    verification:
      - kind: other
        ref: "grep -ciE 'device digest: OPEN' docs/ops/ENDLESS-MODE.md -> 1; grep -ci 'SC-5' .planning/STATE.md -> 1"
        status: pass
    human_judgment: false
  - id: D7
    description: "A device reading that an endless wave transition costs no frame spike outside the Mid budget on hardware (SC-5's device half)"
    requirement: "N-END-03"
    human_judgment: true
    rationale: "OPEN, by design. No automated step in this repo can measure a frame on a phone. This plan's deliverable is the honest open assumption and its discharge procedure, not the reading; the reading is harvested at end-of-phase through the Task 3 <human-check>."
  - id: D8
    description: "The phase freeze gate holds one last time: src/core and src/levelgen are byte-unchanged, and the full suite, lint and typecheck are clean"
    verification:
      - kind: other
        ref: "git diff --name-only dcfdd37..HEAD -- src/core src/levelgen (empty)"
        status: pass
      - kind: other
        ref: "npm test exit 0 — 95 files / 558 tests passed; npm run lint exit 0, 0 warning/error lines; npm run typecheck exit 0"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-09-25
status: complete
---

# Phase 11 Plan 06: ENDLESS-MODE.md, the BOARD-GENERATOR Amendment and the Device SC-5 Assumption Summary

**The phase's decisions and measurements are now an ops record rather than five summaries: the wave→difficulty ramp is written down as SC-2 requires, the `world.tick` reset carries the 30-wave number that justified it, SC-4's replay claim is scoped to headless-and-policy-fixed in the document that makes it, Phase 10's superseded "plausibly unfinishable" inference is marked superseded in place with its original preserved, and the one thing nobody measured — a frame on hardware at a wave transition — is a dated OPEN assumption with a discharge procedure instead of an assumed pass.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-09-25T15:15:30Z (approx)
- **Completed:** 2026-09-25T15:23:04Z
- **Tasks:** 3
- **Files:** 3 (1 created, 2 modified)
- **Suite:** 95 files / 558 tests passing, unchanged — this plan adds no test and no source

## Accomplishments

- **SC-2 is satisfied by a document, not only by source.** `docs/ops/ENDLESS-MODE.md` carries the wave→difficulty table (wave 1 is difficulty 0, one step per wave, clamped at `D_MAX = 20` from wave 21 onward), the per-wave seed derivation `mixSeed(hashSeed(runSeed), wave | 0)` with the odd-multiplier injectivity argument that is the real no-repeat proof behind SC-4, why the fold input is the **wave index** rather than the difficulty (difficulty saturates, so folding it would hand every post-clamp wave the same board), and D-01's reason for clamping rather than widening the range (a wider schedule reopens Phase 10's monotonicity proof, its 21 000-board sweep and the freshly discharged A1 device record).
- **The `world.tick` decision cannot be reversed by accident now.** The document states the decision, then the measurement: the E2 ramp reaches `MAX_BALL_SPEED` at t = 100 s — inside wave 1, whose measured reference clear is 103.5 bot-seconds — and over 30 waves at one run seed, **carried = 3457.4 s / 791 190** against **reset = 4497.2 s / 946 880**. Both consequences are named with their handling: effects are cleared *above* the reset because `effectUntilTick` is absolute, and cumulative time is banked on the UI runtime (`ticksBanked`, incremented above `applyWaveAdvance`, zeroed on retry) with the two-wave evidence that `ticksPlayed` reads 35 410 rather than 31 515.
- **The Phase 10 inference is corrected without being erased.** § Limits item 2's first paragraph is byte-identical, the superseded second paragraph is preserved verbatim, and a dated block beneath it carries the 500-seed scan, the 18× spread, the non-monotone maxima and the one-line conclusion. **20 insertions, 0 deletions** across the whole file.
- **The two documents point at each other.** `ENDLESS-MODE.md` § *The settled open question* names `BOARD-GENERATOR.md` § Limits item 2 and its amendment; the amendment names `ENDLESS-MODE.md` § *The settled open question*. Neither can be read alone and mislead — which closes **T-11-19**.
- **The unmeasured thing is recorded as unmeasured.** The device SC-5 block is `OPEN`, dated, and names what remains unmeasured, the exact discharge procedure, the four failure signatures, and the instruction that "no device available" keeps it OPEN. It explicitly forbids writing a reading that was not taken — which closes **T-11-20**.

## Task Commits

1. **Task 1: write `docs/ops/ENDLESS-MODE.md`** — `e761b42` (docs)
2. **Task 2: amend `BOARD-GENERATOR.md` § Limits item 2 in place** — `849819d` (docs)
3. **Task 3: land the device SC-5 OPEN block and the STATE.md pending line** — `70a86da` (docs)

## Required verbatim records (plan `<output>`)

### 1. The `BOARD-GENERATOR.md` supersession note, exactly as committed

The superseded paragraph is bracketed. Above it:

```markdown
*The paragraph immediately below is **SUPERSEDED as of 2026-09-25**. It is kept verbatim,
because this section exists so a later phase can see both what was believed and what corrected
it. Read it together with the supersession note that follows it.*
```

Below it:

```markdown
> **SUPERSEDED 2026-09-25 — the "plausibly unfinishable" inference does not hold.**
> Corrected by: `docs/ops/ENDLESS-MODE.md` § *The settled open question* (Phase 11), which
> carries the full measurement.
> **What was measured.** A 500-seed scan at difficulty 20 *specifically*: **0 non-wins**
> (p50 172.5 s, p95 446.2 s, p99 656.8 s, worst 1495.3 s). There is no unclearable board.
> Replaying the 8 slowest d=20 boards across 7 paddle offsets collapsed `s=33` from
> **1495.3 s to 83.0 s** — an **18×** spread on the byte-identical lattice; changing only the
> gameplay RNG seed did the same. Per-difficulty maxima are **non-monotone** in `d`: **d=17
> peaks at 2735.3 s**, worse than d=20 on a materially lighter board, so "the top of the range
> is the hard part" is untrue as well.
> **Conclusion, in one line:** the tail is a **trajectory** property, not a board property, so
> the inference above does not hold — and `SCHEDULE` was deliberately **not** re-tuned
> (a re-tune buys ~34 % off the median, re-rolls the tail rather than removing it, and would
> invalidate the 21 000-board sweep, the monotonicity proof and the A1 device record above).
> The paragraph above therefore stands as a record of what Phase 10 believed, not as guidance.
```

### 2. The OPEN device-digest block, exactly as committed

```markdown
> **Device digest: OPEN — recorded 2026-09-25. SC-5's device half is UNMEASURED.**
> **What is unmeasured:** that an endless **wave transition** produces **no frame spike outside
> the Mid budget** on real hardware. The Mid cert budget is p50 ≤ 16.7 ms and p95 ≤ 20 ms per
> frame. Everything measured so far proves only that the glow-bake / audio-preload cold path is
> not *entered* at a transition — a source-level argument (plan 11-05's D-14 re-key of `loadKey`
> onto brick dimensions alone) plus a jsdom observation. **Nothing here measures a frame on a
> phone.** The ≈ 0.56 ms generate+compile figure remains a Node microbenchmark scaled by the
> 15.5× Hermes ratio, and that ratio itself came from an iOS **simulator** run, not a device.
> **Discharge procedure:** launch a dev build; arm the perf overlay; press the `Endless` button
> in the `__DEV__` dev row on the playing HUD (alongside Lv / tier / Cert WC / Crash); play
> **waves 1 through 5**; watch each transition specifically — the moment the last brick of a
> board breaks and the next board appears.
> **Failure signatures — what the reader is looking for:**
> (a) a **visible black playfield** at a transition;
> (b) an **audio hiccup** at a transition;
> (c) an **`[audio] preload soft-fail`** line in the log mid-run;
> (d) a **frame-time spike outside the Mid budget** at a transition (p50 above 16.7 ms, or p95
> above 20 ms).
> Any one of those means the bake or preload cold path is still re-firing per wave and plan
> 11-05's re-key did not hold in practice. That is a **gap-closure signal — a code fix, not a
> documentation edit.**
> **To discharge:** replace this block with a dated `Device digest: MEASURED <date> — SC-5
> DISCHARGED` block carrying the raw reading (device and OS, wave range played, whether any
> stall was observed at a transition, and the perf-overlay frame times across a transition),
> exactly as assumption **A1** was discharged in `docs/ops/BOARD-GENERATOR.md` § Limits item 1.
> **"No device available" is a valid outcome:** this block stays OPEN and the tracking line
> stays. Do **not** write a passing reading that was not taken.
> Tracked in `.planning/STATE.md` § Pending Todos.
```

### 3. The `.planning/STATE.md` § Pending Todos line, exactly as committed

```markdown
- **Phase 11 SC-5 device reading (OPEN, 2026-09-25):** no frame spike outside the Mid budget across an endless wave transition — device half unmeasured. Dev build + perf overlay + `__DEV__` `Endless` entry, waves 1-5, watch each transition. Open-assumption block and discharge procedure live in `docs/ops/ENDLESS-MODE.md` § Limits item 2
```

## Files Created/Modified

- **`docs/ops/ENDLESS-MODE.md`** (new, 305 lines at Task 1, +23/−6 at Task 3). Header block copied from `BOARD-GENERATOR.md:1-9` — Status, the three N-END requirements, `**Consumers:** Phase 12 daily (board-swap seam) · Phase 13 achievements · Phase 14 Title entry`, and an Owner-sign-off line stating plainly that no human play calibrated anything here. Sections: *Why this document exists*, *The wave → difficulty ramp (SC-2)* (with the clamp rationale, the seed derivation and the no-approximated-`Math` rule), *The `world.tick` decision (D-06)*, *Measured behaviour* (the 12-wave table plus the headless frame-cost table and the D-14 story), *The settled open question*, and a six-item *Limits*.
- **`docs/ops/BOARD-GENERATOR.md`** (+20/−0) — § Limits item 2 only. Nothing else in the file was touched: the discharged A1 record, the Theorem, the dial table and the 840-board distribution are byte-identical.
- **`.planning/STATE.md`** (+1 line at Task 3, plus the standard post-plan state mutations) — the SC-5 pending-todo line directly under the Phase 8 Plan 06 device-gate item.

## Decisions Made

- **Task 1 wrote a self-describing placeholder, not Task 3's content early.** The plan asks Task 1 to leave "a clearly-marked placeholder block" and Task 3 to fill it. The placeholder says, in its own text, that if it is still readable in a committed document then the block was never filled and SC-5's device half should be treated as unmeasured and unrecorded. A truncated execution therefore fails loudly in the artefact itself rather than shipping a document that merely *looks* finished.
- **§ Limits gained a sixth item.** The plan enumerated five "at minimum". The SC-3 storage firewall (D-11's discriminated union, D-12's refusal to widen `LevelId`) is the phase's other load-bearing scope boundary and the pre-existing defect it closed is worth recording next to the endless record's shape — with its own honest gap, that no cross-device or cloud sync of endless records exists or is designed for.
- **Digit-group spacing was dropped for the two D-06 figures.** The plan's acceptance grep matches `3457.4\|4497.2`. Written house-style as `4 497.2` the grep returns 0 — caught by running the criterion rather than assuming it. The two figures are unspaced; counts elsewhere (`946 880`, `21 000`, `197 461`) keep the house style.
- **The supersession is bracketed, not just appended.** A reader scanning § Limits linearly hits the superseded paragraph before the correction. A lead-in marker above it means the paragraph is never read as current even by someone who stops at the end of it.

## Deviations from Plan

None - plan executed exactly as written.

The three items under *Decisions Made* that go beyond the plan's literal wording (the self-describing placeholder, the sixth Limits item, the lead-in marker above the superseded paragraph) are additions inside the plan's stated intent, not scope changes. No source file was touched; `git diff --name-only dcfdd37..HEAD -- src/core src/levelgen` is empty for the sixth consecutive plan.

## Authentication Gates

None — no external service, no credentials, no packages installed. **T-11-SC** holds: this plan runs no package-manager install, consistent with RESEARCH § Package Legitimacy Audit ("Not applicable").

## Issues Encountered

- **Pre-existing working-tree churn, unchanged from 11-01 through 11-05.** `.planning/config.json` was already modified and `.planning/milestone.lock` / `.planning/state.json` already untracked when this plan started — orchestrator-owned files. `git status --porcelain` after the final commit therefore shows those three entries and nothing this plan touched. The plan's literal "`git status --porcelain` is empty" criterion is satisfied for this plan's own files; the residue predates it.

## Known Stubs

None. The one placeholder this plan created (Task 1's device-digest block) was replaced by Task 3's real dated OPEN block in the same plan; `grep -c 'PLACEHOLDER' docs/ops/ENDLESS-MODE.md` is 0. The OPEN assumption block is **not** a stub: it is the deliverable, an honest record of a measurement that has not been taken, with the procedure to take it.

## Open Assumption (carried, deliberately)

| Item | Status | Where it lives |
|---|---|---|
| SC-5 device half — no frame spike outside the Mid budget at a wave transition | **OPEN 2026-09-25** | `docs/ops/ENDLESS-MODE.md` § Limits item 2 + `.planning/STATE.md` § Pending Todos |

Harvested at end-of-phase through Task 3's `<human-check>`. Three valid outcomes: *clean, &lt;device&gt;, waves 1-N* → the block is edited to a dated DISCHARGED block with the raw reading; *stall observed at &lt;point&gt;* → plan 11-05's re-key did not hold and the phase needs a gap-closure plan, not a documentation edit; *no device available* → the block stays OPEN and the STATE.md line stays.

## Threat Flags

None. This plan adds no network endpoint, auth path, file-access pattern or schema change — it writes Markdown. The three mitigations assigned to it are discharged:

| Threat | Disposition | Evidence |
|---|---|---|
| T-11-19 (superseded inference in an ops record) | mitigate | Item 2's second paragraph is marked superseded in place with a dated note pointing at `ENDLESS-MODE.md`; original preserved (0 deletions); the link is bidirectional |
| T-11-20 (an unmeasured device reading recorded as passing) | mitigate | The block is dated `OPEN`, names "no device available" as a valid outcome, and says "Do **not** write a passing reading that was not taken"; `grep -ciE 'device digest: OPEN'` → 1; STATE.md pending line added |
| T-11-21 (seed described as a security property) | mitigate | § Limits item 5 states the run seed is a difficulty input, not a secret, and points at `src/levelgen/rng.ts`'s explicit non-CSPRNG note |

## Verification

Plan-level `<verification>`, re-run after the final task commit:

| Check | Result |
|---|---|
| `docs/ops/ENDLESS-MODE.md` exists with ramp table, D-06 + measurement, settled findings, `## Limits` | **yes** |
| `grep -c "wave" docs/ops/ENDLESS-MODE.md` ≥ 10 (VALIDATION's SC-2 check) | **56** |
| `grep -c "## Limits" docs/ops/ENDLESS-MODE.md` | **1** |
| `grep -ci "not replayable\|no per-tick intent" docs/ops/ENDLESS-MODE.md` ≥ 1 | **2** |
| `grep -c "3457.4\|4497.2" docs/ops/ENDLESS-MODE.md` ≥ 1 | **2** |
| `grep -ci "1495.3\|83.0\|2735.3" docs/ops/ENDLESS-MODE.md` ≥ 2 | **4** |
| `grep -c "N-END-01" docs/ops/ENDLESS-MODE.md` ≥ 1 | **1** |
| `grep -c "No human play calibrated the dial constants" docs/ops/BOARD-GENERATOR.md` = 1 | **1** |
| `grep -c "plausibly unfinishable" docs/ops/BOARD-GENERATOR.md` ≥ 1 | **2** |
| `grep -c "ENDLESS-MODE.md" docs/ops/BOARD-GENERATOR.md` ≥ 1 | **1** |
| `grep -ci "supersede" docs/ops/BOARD-GENERATOR.md` ≥ 1 | **2** |
| `git diff --numstat dcfdd37..HEAD -- docs/ops/BOARD-GENERATOR.md` — deletions confined to item 2 | **20 insertions / 0 deletions** |
| `grep -ciE "device digest: OPEN" docs/ops/ENDLESS-MODE.md` ≥ 1 | **1** |
| `grep -ci "SC-5" .planning/STATE.md` ≥ 1 | **1** |
| `npm test` | **exit 0 — 95 files / 558 tests passed, 0 failed, 0 skipped** |
| `npm run lint` | **exit 0, 0 `warning` and 0 `error` lines** |
| `npm run typecheck` | **exit 0** |
| `git diff --name-only dcfdd37..HEAD -- src/core src/levelgen` | **empty — the phase freeze holds** |
| `git status --porcelain` | nothing from this plan (only the pre-existing `.planning/` churn) |

## User Setup Required

None.

## Next Phase Readiness

**Phase 11 is code- and documentation-complete, with one honest open item.**

- **Outstanding:** the SC-5 device reading. It is queued for the end-of-phase UAT harvest through Task 3's `<human-check>`, and it is the only thing between this phase and a fully discharged SC-5. It is *not* a blocker on Phase 12: the daily challenge inherits the board-sequence reproducibility (unconditional, proven headlessly) and the mode-agnostic `applyWaveAdvance(World, CompiledLevel | null)` seam, neither of which depends on the frame reading.
- **Phase 12** should read `ENDLESS-MODE.md` § *The wave → difficulty ramp* before choosing its own seed derivation — the wave-index-not-difficulty argument generalises to "fold the thing that varies", and `hashSeed`/`mixSeed` are already the shared primitives.
- **Phase 14** owns three things this document defers: the production placement of the wave indicator, the production entry point into endless (deleting the `__DEV__` row entry), and the "which record *is* the record — best wave or best score" display decision.
- **A warning for any later balance phase:** § *The settled open question* is a measurement, not an opinion. Re-tuning `SCHEDULE` invalidates Phase 10's pinned digests, the 21 000-board sweep, the monotonicity proof and the discharged A1 device record — for a 34 % median reduction that re-rolls the tail rather than removing it. The cheap levers are outside `src/levelgen`.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-25*

## Self-Check: PASSED

All three artefacts exist on disk (`docs/ops/ENDLESS-MODE.md` created, `docs/ops/BOARD-GENERATOR.md` modified, this SUMMARY written) and all three task commits (`e761b42`, `849819d`, `70a86da`) are present in `git log`.
