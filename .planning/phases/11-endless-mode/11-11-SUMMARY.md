---
phase: 11-endless-mode
plan: 11
subsystem: ui
tags: [react, react-native, endless-mode, record-display, ops-doc, vitest, phase-gate]

# Dependency graph
requires:
  - phase: 11-endless-mode
    provides: "11-09's failEndlessStart(), which already published the ENDLESS watermarks on the failure path — the shape this plan makes uniform across the success path too"
  - phase: 11-endless-mode
    provides: "11-10's funnel-inside-startEndlessRun and toggleDevLevel-as-exit, which are what made the ops document's bolded invariant TRUE of the code and A-02 dischargeable"
provides:
  - "WR-04 closed: startEndlessRun publishes endlessBestScoreRef / endlessBestWaveRef, so the host `best` prop is an endless number for the WHOLE lifetime of an endless run, not only at the moments ResultOverlay happens to be mounted"
  - "The T-11-08-02 / WR-02 case corrected in place from `host-best=100` (which PINNED the defect) to `host-best=2400`, plus a not.toBe companion and a third assertion that the NEXT run's real overlay renders `Best · 2400`"
  - "A previousBestRef writer-region source contract whose own comment states what it does NOT prove, and why no behavioural probe of campaign-ref poisoning survives the fix"
  - "docs/ops/ENDLESS-MODE.md as a record that matches the code: both missing boundary rows, the single-enforcement-point sentence, the bolded invariant left standing beside a dated correction, A-02 DECIDED, and an SC-5 do-not-press note narrowed to the two controls still capable of ruining a reading"
  - "A measured round gate — suite counts, freeze diff, bake fence — including a reported instrument defect in the plan's own freeze command"
affects: [14-title-routes, 13-achievements]

# Actuals (#2632) — same estimateTokens scale (chars/4) as the plan's `estimate`,
# measured over the four files this plan actually changed at their post-change size.
# The plan estimated 76000 over the same four `files_modified`. Recorded unrounded.
actuals:
  tokens: 50021
  tasks: 3
  commits: 2
plan_head_before: ca6e2731221750b22d520eb02faa68f6f5cf8046

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "When a fix REMOVES the mechanism a probe depended on, drop the claim to the source-contract tier and say so in the test's own comment — do not restore a behavioural assertion the fix makes impossible"
    - "Keep a superseded claim visible beside a dated correction rather than rewriting it as though it had always held (the BOARD-GENERATOR.md § Limits treatment, applied a second time)"
    - "Narrow a hazard warning against the shipped source, control by control, instead of deleting it or leaving it stale"

key-files:
  created:
    - ".planning/phases/11-endless-mode/11-11-SUMMARY.md"
  modified:
    - "app/_components/PlayingHost.tsx"
    - "tests/ui/PlayingHost.endless-record.test.tsx"
    - "tests/ui/PlayingHost.endless-host.test.ts"
    - "docs/ops/ENDLESS-MODE.md"

key-decisions:
  - "startEndlessRun publishes BOTH watermarks, not just the score: `resultBestWave` is the endless-only counterpart on the same 11-UI-SPEC § Record Display Contract row, and publishing one half would leave the other showing the previous run's merged value into the next run"
  - "The campaign-ref claim moved to the source-contract tier rather than being re-engineered into a behaviour test. Once startEndlessRun stops republishing previousBestRef, its only remaining readers are campaign resets unreachable while modeRef is latched to endless, and the getBestForLevel effect re-reads and HEALS the ref on every levelId change — a poisoned value would be repaired before any campaign overlay could render it. The contract says this in its own comment instead of letting a reader mistake a writer count for display coverage"
  - "`Exactly two places` is asserted as two REGIONS, not two statements: the getBestForLevel mount effect carries both a success and a fail-soft assignment, which is one place. The contract is that every assignment in the file falls inside one of the two named campaign-only regions and none outside — stated that way because the literal statement count (3) would have made the criterion look unmet while the property held"
  - "The bolded `every path that discards a run records it first` sentence was LEFT STANDING with a dated correction beneath it, not rewritten. The document's § Limits exists to keep a superseded claim visible next to its correction; silently repairing the sentence would have erased the evidence that a reader was once entitled to trust it over the code"
  - "The SC-5 do-not-press note keeps the tier button as well as `Cert WC`. Verified against source: `cycleDevTier` fires `remountDevSession`, whose endless branch routes to `startEndlessRun()` — so the run being measured is recorded abandoned and restarted at wave 1, and the new budget re-bakes the glow atlas, forcing the exact cold path the reading exists to prove is not entered"
  - "The plan's freeze command (`git diff origin/main...HEAD -- src/core src/levelgen`) is REPORTED as an instrument defect, not satisfied by editing anything. origin/main predates Phase 10, which CREATED src/levelgen, so the command measures the whole branch. Against the actual phase base the freeze holds at 0 lines"

requirements-completed: []

coverage:
  - id: D1
    description: "The host's `best` prop is the ENDLESS watermark while the endless Results overlay is up — unchanged from 11-08, re-asserted as the first of three"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#a new endless run publishes the ENDLESS watermark as `best`, never the campaign level best (T-11-08-02 / WR-02 / WR-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "WR-04: after a Retry re-starts the run, `best` is STILL the endless watermark and specifically not the campaign level best — measured pre-fix at `host-best=100`"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#a new endless run publishes the ENDLESS watermark as `best`, never the campaign level best (T-11-08-02 / WR-02 / WR-04)"
        status: pass
    human_judgment: false
  - id: D3
    description: "And the NEXT run's REAL Results overlay renders `Best · 2400`, never `Best · 100` — the render claim, not the write claim, because proving the write and never the render is how the previous round's gap 3 shipped green"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#a new endless run publishes the ENDLESS watermark as `best`, never the campaign level best (T-11-08-02 / WR-02 / WR-04)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every `previousBestRef.current =` assignment in PlayingHost.tsx falls inside one of exactly two campaign-only regions, and startEndlessRun references the ref nowhere while publishing both endless watermarks"
    requirement: "N-END-02"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#previousBestRef is assigned only inside the two campaign-only regions, and startEndlessRun never touches it (WR-04)"
        status: pass
    human_judgment: false
  - id: D5
    description: "docs/ops/ENDLESS-MODE.md's run-boundary table lists EVERY control that can discard a run, including the __DEV__ `Endless` button and `Lv` / toggleDevLevel, and names startEndlessRun's first statement as the single enforcement point"
    requirement: "N-END-01"
    verification:
      - kind: command
        ref: "grep -c 'toggleDevLevel' docs/ops/ENDLESS-MODE.md -> 5; grep -c 'startEndlessRun' -> 8"
        status: pass
    human_judgment: false
  - id: D6
    description: "A-02 is recorded as DECIDED 2026-09-26 (owner) with the decision taken, the two options rejected, and the modeRef-writer consequence — not as a debt still owed"
    requirement: "N-END-01"
    verification:
      - kind: command
        ref: "grep -c 'DECIDED 2026-09-26' docs/ops/ENDLESS-MODE.md -> 3"
        status: pass
    human_judgment: false
  - id: D7
    description: "The SC-5 OPEN block survives intact — still OPEN, still p50 <= 16.7 ms / p95 <= 20 ms, still four failure signatures, still the 0.77x / 0.85x accepted-halo paragraph — with its do-not-press note NARROWED rather than deleted"
    verification:
      - kind: command
        ref: "grep -c 'Device digest: OPEN' -> 1; '16.7' -> 3; 'Expected and ACCEPTED' -> 1; 'Cert WC' -> 6"
        status: pass
    human_judgment: false
  - id: D8
    description: "SC-5 / the device half of N-END-03: no frame spike outside the Mid budget across an endless wave transition"
    verification: []
    human_judgment: true
    rationale: "No automated step in this repo can produce a frame on hardware. NOT claimed by this plan, NOT claimed by this round. N-END-03 stays unchecked, docs/ops/ENDLESS-MODE.md § Limits item 2 stays OPEN, and `no device available` remains a valid outcome. This plan only narrowed the discharge procedure's do-not-press note; it took no reading."
  - id: D9
    description: "Backstop (NOT discharged): a UI-state test at a 7-digit score and a 3-digit combo shows the 48px HUD row neither wrapping nor clipping"
    verification: []
    human_judgment: true
    rationale: "jsdom computes no layout, so `no wrap and no clipping` cannot be OBSERVED in any test this repo can run. The ~28-monospace-character fit 11-UI-SPEC derives is that document's own computation, not a rendering; asserting the character budget would convert a backstop into a false `covered`. Carried forward to human verification, unchanged, alongside 11-09's E1 panel-overflow twin."

# Metrics
duration: 10 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 11: WR-04 Closed and the Written Record Made True Summary

**`startEndlessRun` now publishes the endless watermarks instead of a campaign per-level best, so the host's `best` prop belongs to the mode the player is in at every moment of a run rather than only while the overlay happens to be mounted; the test that PINNED that defect as expected is corrected in place to a strictly stronger claim; and `docs/ops/ENDLESS-MODE.md` gains its two missing run boundaries, a dated correction beside the invariant it once overstated, A-02 as a decision rather than a debt, and an SC-5 warning narrowed to the two controls still able to ruin a reading.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-09-26T07:48:00Z
- **Completed:** 2026-09-26T07:58:00Z
- **Tasks:** 3
- **Files modified:** 4 (3 source/test + 1 ops doc); Task 3 wrote only this summary

## Accomplishments

- **WR-04 closed at the line the verifier named.** `startEndlessRun` published `previousBestRef.current` — a CAMPAIGN per-level best — into the host's `best` prop for the entire lifetime of the endless run it was starting. It was latent (`best` reaches `ResultOverlay` and nothing else, the overlay is unmounted while a run is live, and `handleRunEnded`'s endless arm always overwrites first) and the verifier correctly downgraded it to a Warning. The owner folded the fix in on 2026-09-26 because Phase 14's mid-run endless record surface converts it from latent to rendered. The line is now `setResultBest(endlessBestScoreRef.current)` + `setResultBestWave(endlessBestWaveRef.current)` — **both** halves, because `resultBestWave` is the endless-only counterpart on the same Record Display Contract row. The campaign branches of `onRetry` and `remountDevSession` are unchanged byte for byte.
- **The defect-pinning test was corrected, never deleted — and the correction is a strictly stronger statement.** `an endless run does not write the campaign personal best (T-11-08-02 / WR-02)` asserted `host-best=100` after a Retry press. That assertion pinned WR-04 as expected behaviour, and worse, the probe only WORKED because of the defect: the read-back observed `previousBestRef` solely because `startEndlessRun` republished it. The case keeps its name lineage and its load-bearing `campaignBest = 100`, and now asserts `host-best=2400`, a `not.toBe('host-best=100')` companion naming WR-04, and a third assertion that the NEXT run's **real** `ResultOverlay` renders `Best · 2400` and never `Best · 100`.
- **The trap the plan warned about was honoured, not worked around.** With WR-04 fixed there is no behavioural probe of campaign-ref poisoning left in this repo — `previousBestRef`'s only remaining readers are campaign resets unreachable while `modeRef` is latched to endless, and the `getBestForLevel` mount effect re-reads and HEALS the ref on every `levelId` change, so a poisoned value would be repaired before any campaign overlay could render it. The claim therefore moved to the source-contract tier, and the contract's own comment says that plainly **and** says what it does not prove: counting assignment sites proves the WRITE, never the RENDER, and nothing there may stand in for the driven case.
- **The ops document now describes the code.** Two boundary rows added (`__DEV__` `Endless`, `Lv` / `toggleDevLevel`), a sentence naming `startEndlessRun`'s first statement as the single enforcement point and why that placement survives Phase 14's promotion, the bolded invariant left **standing** with a dated correction beneath recording that its first conjunct was measurably false as originally shipped, A-02 moved from `OPEN; an owner decision is owed` to `DECIDED 2026-09-26 (owner)`, and the SC-5 do-not-press note narrowed against the shipped source rather than trimmed by memory.
- **The round gate is measured numbers, and it reports a defect in one of its own instruments rather than editing around it.**

## Task Commits

1. **Task 1: WR-04 — a new endless run publishes the endless watermark, not a campaign best** — `d827e24` (fix)
2. **Task 2: `docs/ops/ENDLESS-MODE.md` — make the written record match the shipped code** — `4e2023e` (docs)
3. **Task 3: Phase gate** — no source commit by design; its only artifact is this summary, committed as the plan's docs commit.

## Falsification Checks (run, not asserted)

| Task | Probe | Observed result |
|---|---|---|
| 1 | The plan's mandatory check: run Test 2 with `setResultBest(previousBestRef.current)` in place of the new lines. Executed as a **tests-first RED run** — the corrected cases and the new source contract were written and run BEFORE the source change, which is the defect-in-place state the check asks for, with no risk of an incomplete restore. | **RED exactly as predicted.** `tests/ui/PlayingHost.endless-record.test.tsx` failed on the case's own message: `startEndlessRun must publish the ENDLESS watermark (WR-04) — measured pre-fix: host-best=100 … expected 'host-best=100' to be 'host-best=2400'`. `tests/ui/PlayingHost.endless-host.test.ts` failed on `startEndlessRun must not reference previousBestRef at all (WR-04)`, printing the offending `setResultBest(previousBestRef.current);` line. **2 failed / 37 passed.** Applying the fix turned both green with no other change. |
| 1 | Implicit second half: does the new source contract discriminate, or is it vacuous? | It went **RED in the same run**, on its named assertion, before the fix existed. It is not a vacuous pin. |
| 2 | Both `<verify>` grep chains, run as written | All ten greps non-zero: `## Limits` 1, `Discharge procedure` 1, `0.77` 2, `Cert WC` 6, `DECIDED 2026-09-26` 3, `toggleDevLevel` 5, `Device digest: OPEN` 1, `16.7` 3, `Expected and ACCEPTED` 1, `startEndlessRun` 8. `npm run lint` exit 0. |
| 3 | The freeze command as the plan literally wrote it | **DID NOT behave as the plan predicts. Reported below rather than banked as a pass or a failure.** |

### Task 3's freeze instrument, investigated

The plan's `<verify>` runs `git diff --name-only origin/main...HEAD -- src/core src/levelgen` and fails when the line count is anything other than 0. It printed **8**:

```
src/core/rules/brickDamage.ts
src/levelgen/fingerprint.ts  generate.ts  grid.ts  index.ts  reachability.ts  rng.ts  schedule.ts
```

That is **not** a broken freeze. It is the wrong base:

- `origin/main` is `8788caa` (`Merge pull request #1 … gsd/post-mvp-and-telemetry`), which **predates Phase 10**. Phase 10 is what CREATED `src/levelgen`, so `origin/main...HEAD` necessarily lists every file in it.
- All eight were last touched on **2026-09-25** by Phase 10 / core commits (`f58652a docs(10-03)`, `411d938 test(10-02)`, `7539e61 fix(core)`), all before Phase 11 began.
- The **phase base** is `b99607b` (`chore(10): Phase 10 complete; advance to Phase 11`), which is exactly the parent of `5dae784`, the first commit that added `.planning/phases/11-endless-mode/`. That is also the base `11-VERIFICATION.md` § Behavioral Spot-Checks used.

Measured against the base the acceptance criterion actually names — *"the `src/core` / `src/levelgen` diff against the **phase base** is empty"*:

| Base | Command | Lines |
|---|---|---|
| Phase base | `git diff --name-only b99607b..HEAD -- src/core src/levelgen` | **0** |
| Verification revision | `git diff --name-only 33123b2..HEAD -- src/core src/levelgen` | **0** |
| Plan's literal command | `git diff --name-only origin/main...HEAD -- src/core src/levelgen` | 8 (whole-branch, pre-Phase-11) |

**The freeze holds.** Nothing was edited to make the number come out — per Task 3's own instruction, the instrument is reported and left alone. A future gate should use `b99607b` (or derive the base from the phase directory's first commit) rather than `origin/main`.

## Round Gate — measured

**1. Phase suite coverage GREW.** The verification's "11 files / 95 tests" set is reproducible exactly: all thirteen endless-surface test files minus `PlayingHost.bake-gate.test.ts` (4) and `PlayingHost.next-bake.test.ts` (5), which are Phase 8/10-era. At the verification revision those eleven summed to **95**; they now sum to **124**.

| Phase suite file | At `33123b2` | Now | Δ |
|---|---|---|---|
| `tests/endless.determinism.test.ts` | 5 | 5 | — |
| `tests/endless.ramp.test.ts` | 7 | 7 | — |
| `tests/endless.wave-loop.test.ts` | 8 | 8 | — |
| `tests/storage.endless-firewall.test.ts` | 10 | 10 | — |
| `tests/ui/GameScreen.test.tsx` | 6 | 6 | — |
| `tests/ui/PlayingHost.endless-host.test.ts` | 14 | 19 | +5 |
| `tests/ui/PlayingHost.endless-record.test.tsx` | 9 | 20 | +11 |
| `tests/ui/PlayingHost.endless-retry.test.tsx` | 10 | 17 | +7 |
| `tests/ui/PlayingHost.endless-run.test.tsx` | 6 | 6 | — |
| `tests/ui/PlayingHost.endless.test.ts` | 6 | 6 | — |
| `tests/ui/ResultOverlay.test.tsx` | 14 | 20 | +6 |
| **11 files** | **95** | **124** | **+29** |

**No file in `tests/ui/` has fewer cases than before this round** — every file was compared `33123b2` → HEAD and none decreased. Coverage grew; it was not shuffled.

**Whole repo:** `npx vitest run` → **97 files / 622 tests, 0 failed** (609 before the round, 621 after 11-10, +1 from this plan's source contract). `npm test` additionally runs the four standing `assert-*` guards: `assert-level-solvability: OK`, `assert-eas-profiles: OK`, `assert-brand-name: OK`, level fixtures OK.

**2. Types and lint.** `npm run typecheck` exit **0**. `npm run lint` exit **0**.

**3. The `src/core` / `src/levelgen` freeze.** **0 lines** against the phase base (see above). The round's entire non-`.planning` diff is seven files and contains nothing under `src/core` or `src/levelgen`:

```
app/_components/PlayingHost.tsx  docs/ops/ENDLESS-MODE.md  src/runtime/overlays/ResultOverlay.tsx
tests/ui/PlayingHost.endless-host.test.ts  tests/ui/PlayingHost.endless-record.test.tsx
tests/ui/PlayingHost.endless-retry.test.tsx  tests/ui/ResultOverlay.test.tsx
```

**4. The bake path is untouched.** `grep -c "bakeGlowSprites(brickW, brickH)" app/_components/PlayingHost.tsx` → **1**. The glow atlas is still keyed on brick dimensions alone, so `ENDLESS_BRICK_DIMS` remains owner-accepted debt scheduled for Phase 14 rather than an accidental fix. The only `ENDLESS_BRICK_DIMS` mentions in the repo are the two documentation references in `docs/ops/ENDLESS-MODE.md`.

**5. The four corrected cases are present and corrected.** `both startEndlessRun failure returns route through failEndlessStart… (A-01)`, `onRetry routes an endless Retry to startEndlessRun before the campaign retry() (gap 1)`, `remountDevSession routes the same way (gap 1, second half)`, `a Retry-time wave-build failure says tap Retry…` — all four found by name, plus this round's fifth, `…(T-11-08-02 / WR-02 / WR-04)`.

**6. Working tree.** `git status --porcelain` carries **no throwaway measurement or probe file**. All measurement output was read from stdout or written to the session scratchpad outside the repo; nothing was written into the working tree. Three entries remain and **none is this round's work** — they were present before this dispatch began and are GSD session bookkeeping, disclosed rather than silently absorbed:

```
 M .planning/config.json      (a trailing-newline-only change, made at session init)
?? .planning/milestone.lock   (untracked GSD runtime artifact)
?? .planning/state.json       (untracked GSD runtime artifact)
```

**7. `.planning/REQUIREMENTS.md` is byte-identical across the whole round.** `git diff 137c4b9..HEAD -- .planning/REQUIREMENTS.md` is **empty**. `N-END-01` `[x]`, `N-END-02` `[x]`, `N-END-03` `[ ]` with its dated caveat sub-bullet intact.

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — `startEndlessRun`'s `setResultBest(previousBestRef.current)` replaced by `setResultBest(endlessBestScoreRef.current)` + `setResultBestWave(endlessBestWaveRef.current)`, with a comment recording that the old publication was latent, exactly why Phase 14 makes it not latent, and that the campaign branches are deliberately untouched. One line out, two lines in; nothing else in the file changed.
- `tests/ui/PlayingHost.endless-record.test.tsx` — the `T-11-08-02 / WR-02` case corrected in place and renamed to say what it now proves, with a rewritten comment block explaining the tier change; three assertions where there were two, plus a third-run overlay assertion.
- `tests/ui/PlayingHost.endless-host.test.ts` — one new case beside the existing gap-2 contract, extracting three regions and asserting each non-empty before anything is asserted about its contents (11-09 Pattern 2), leading with what it does not prove (11-09 Pattern 1).
- `docs/ops/ENDLESS-MODE.md` — two boundary-table rows, the single-enforcement-point paragraph, the dated correction blockquote, the A-02 rewrite, and the narrowed SC-5 do-not-press note. § Limits is otherwise unchanged.
- `.planning/phases/11-endless-mode/11-11-SUMMARY.md` — this file, Task 3's only artifact.

## Decisions Made

See `key-decisions` in the frontmatter — six.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 1's acceptance criterion "assigned in exactly two places" is false when read as statements**

- **Found during:** Task 1
- **Issue:** `previousBestRef.current` is assigned by **three** statements: `= b` and the fail-soft `= 0` inside the `getBestForLevel` mount effect, and `= best` in `handleRunEnded`'s campaign arm. A contract asserting a literal count of 2 would have been unsatisfiable without deleting the fail-soft branch, which is load-bearing (E1 `error`: a storage failure must fall back without an error modal).
- **Fix:** The criterion's evident intent — the two campaign-only REGIONS the plan itself names in the same sentence — is asserted directly and more strongly: every `previousBestRef.current =` in the file must fall inside the `getBestForLevel` effect or the campaign arm, with `inSeedEffect + inCampaignArm === total`. A third writer anywhere in the file turns it red. The "two places means two regions" distinction is stated in the test's own comment so the next reader is not re-surprised.
- **Files modified:** `tests/ui/PlayingHost.endless-host.test.ts`
- **Verification:** The contract went RED before the fix and green after; `total` is asserted `> 0` first so the partition claim cannot pass vacuously.
- **Committed in:** `d827e24`

**2. [Rule 2 - Missing critical] The narrowed SC-5 note keeps the tier button, not `Cert WC` alone**

- **Found during:** Task 2
- **Issue:** The plan's prose focuses the narrowing on `Cert WC` ("`Cert WC` sets `levelId` to `level-03` and the tier to `mid` while mode is still endless") and its grep fence only requires `Cert WC` to survive. Read narrowly that would have removed the tier button from the warning. Checked against the shipped source, `cycleDevTier` is still hazardous: it changes `tierOverride`, which fires `remountDevSession`, whose 11-10 endless branch routes straight to `startEndlessRun()` — recording the run under measurement `abandoned` and restarting it at **wave 1** — while the new quality budget **re-bakes the glow atlas**, forcing the exact cold path SC-5 exists to prove is not entered at a transition.
- **Fix:** The narrowed set is the tier button **and** `Cert WC`, each with its own verified reason, as the plan's acceptance criterion requires ("states why each remaining control is hazardous"). `Cert WC`'s entry additionally records that its `level-03` half is *swallowed* by the compiled-push gate and leaves the cert inject deferred behind `certPendingRef`. Silently dropping a control that can still destroy a reading would have been the SC-5 prohibition in a new costume.
- **Files modified:** `docs/ops/ENDLESS-MODE.md`
- **Verification:** `grep -c "Cert WC"` → 6; both `<verify>` chains green; `npm run lint` exit 0.
- **Committed in:** `4e2023e`

**3. [Rule 1 - Bug] Task 3's freeze command measures the whole branch, not the phase**

- **Found during:** Task 3
- **Issue:** `git diff --name-only origin/main...HEAD -- src/core src/levelgen` prints 8, and the plan's `<fails_when>` declares anything other than 0 a broken freeze. `origin/main` predates Phase 10, which created `src/levelgen`.
- **Fix:** **None applied — by design.** Task 3 is a gate and explicitly may not repair what it measures. The discrepancy is investigated, attributed to commits dated 2026-09-25 that predate Phase 11, and reported above with the correct base (`b99607b`, the phase base, which the verification report also used) and its measured result of 0. No file was edited to change any number in this section.
- **Files modified:** none
- **Verification:** `git diff --name-only b99607b..HEAD -- src/core src/levelgen` → 0 lines; `33123b2..HEAD` → 0 lines; the round's whole non-`.planning` diff contains no `src/core` or `src/levelgen` path.
- **Committed in:** n/a — reported, not fixed.

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing-critical) + 1 measured and deliberately NOT fixed.
**Impact on plan:** No scope change. Deviation 1 converts an unsatisfiable literal count into the property the plan plainly meant; deviation 2 keeps a live hazard in a safety note the plan asked to narrow; deviation 3 is the gate doing its job — reporting a bad measurement instead of editing the thing it measures.

## Issues Encountered

- **The plan's freeze verify command is wrong for the claim it makes.** Detailed above. It is a gate-instrument defect, not a code defect, and not fixed by this plan (Task 3 may not repair what it measures). Any future phase gate should anchor on the phase directory's first commit (`git log --diff-filter=A -- .planning/phases/<dir>` → parent) rather than `origin/main`, which is what `code-review.md`'s structural pre-pass already does for the same reason.
- **Pre-existing working-tree entries.** `.planning/config.json` (trailing newline), `.planning/milestone.lock` and `.planning/state.json` were present before this dispatch and are untouched by it. Out of scope per the executor scope boundary; disclosed rather than absorbed.

## Scope Fences Honoured

- **SC-5 stays OPEN and unclaimed.** No task took, authored or inferred a device reading. `docs/ops/ENDLESS-MODE.md` § Limits item 2 is still headed `Device digest: OPEN`, still names p50 ≤ 16.7 ms and p95 ≤ 20 ms, still lists exactly four failure signatures, still carries the `Expected and ACCEPTED` stretched-halo paragraph with the 0.77x / 0.85x factors, and still says a reading that was not taken must not be written. `no device available` remains a valid outcome.
- **`N-END-03` NOT ticked.** Its unchecked box is correct — the frame-timing clause is the unmeasured SC-5 half. **`N-END-02` NOT reverted**, still `[x]`. `requirements.mark-complete` was deliberately **not** run: `N-END-01` and `N-END-02` were already `[x]` before this plan, and the only unchecked ID in the plan's `requirements` array is `N-END-03`. `requirements-completed` is `[]` — nothing changed state.
- **The bake path is frozen.** `bakeGlowSprites(brickW, brickH)` fence re-run and still 1; `ENDLESS_BRICK_DIMS` stays Phase 14 debt.
- **No production endless entry point, no permanent endless record surface, no election of a primary record.** The `devLevelSwitch` markup and its `typeof __DEV__ !== 'undefined' && __DEV__` guard have a zero-line diff this plan.
- **`src/core` and `src/levelgen` have a zero-line diff** against the phase base, as they have all phase.

## Flagged Assumptions (still flagged, none resolved)

- Both backstop truths stay **unresolved and routed to human verification**: 11-09's E1 Results-panel overflow and this plan's E3 HUD-row overflow. jsdom computes no layout, so `no wrap and no clipping` cannot be observed in any test this repo can run, and asserting 11-UI-SPEC's ≈28-character budget would convert a backstop into a false `covered`.
- The five spec-less-probe edge rows recorded once in `11-09-PLAN.md` remain flagged and unresolved; they are not repeated here and were not resolved by inference.
- 11-UI-SPEC § UI Considerations row E5 `error` is **partly** discharged and said so: A-02 resolves `Lv`, but the tier button and `Cert WC` are still not re-specified — this plan documents their hazard, it does not decide their behaviour.

## Verification

Plan-level chain, all green:

- `npx vitest run tests/ui/PlayingHost.endless-record.test.tsx tests/ui/PlayingHost.endless-host.test.ts tests/ui/PlayingHost.endless-retry.test.tsx` → **3 files, 56 tests passed**
- Full suite: `npx vitest run` → **97 files, 622 tests passed**, exit 0
- `npm run typecheck` → exit 0; `npm run lint` → exit 0
- Task 2's two grep chains → all ten greps non-zero
- `git diff --name-only b99607b..HEAD -- src/core src/levelgen` → 0 lines (phase base; the plan's `origin/main` variant is reported above as an instrument defect)
- `grep -c "bakeGlowSprites(brickW, brickH)" app/_components/PlayingHost.tsx` → 1
- `git diff 137c4b9..HEAD -- .planning/REQUIREMENTS.md` → empty
- No test file lost a case; the corrected case was rewritten in place.

## Known Stubs

None. The four changed files were scanned across this plan's diff range for hardcoded empty values, placeholder copy, `TODO` / `FIXME` / `XXX`, and `.skip(` / `.todo(` — zero hits.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or trust-boundary schema change. The plan's `<threat_model>` mitigations are implemented and asserted: **T-11-13** (information disclosure via `setResultBest` in `startEndlessRun`) by coverage `D2`/`D3`, which assert the post-Retry value is the endless watermark and specifically not the campaign number, on the rendered probe and the real overlay; **T-11-14** (an ops document asserting an invariant the code does not hold) by `D5`/`D6` plus the dated correction that keeps the superseded claim visible; **T-11-15** (a fabricated SC-5 reading) by `D7` — the OPEN block is intact and no task ticked `N-END-03`; **T-11-16** (test deletion masquerading as correction) by the per-file case-count table, where no file fell; **T-11-17** (the bake path) by the `bakeGlowSprites(brickW, brickH)` fence at 1; **T-11-18** (`__DEV__` affordances in production) untouched, with `tests/ui/PlayingHost.endless.test.ts`'s guard-count contract green inside the full run. **T-11-19** and **T-11-SC** are `accept` dispositions and unchanged — this plan installs no package and touches no network path.

## Next Phase Readiness

- **Phase 11's plan set is complete (11 of 11).** Next: `/gsd-verify-work 11` to re-audit the round, then the SC-5 device reading whenever hardware is available.
- **Carried open, unchanged:** the SC-5 device reading (human-gated; discharge procedure in `docs/ops/ENDLESS-MODE.md` § Limits item 2, do-not-press note now narrowed to the tier button and `Cert WC`), the two overflow backstops, and the five flagged edge-probe rows.
- **Noted for 14-title-routes:** the two Phase-14 hooks this plan created are both in `startEndlessRun`. Its first statement holds the record-before-discard invariant, and its watermark publication is now mode-correct — so a mid-run endless record surface can read the host's `best` / `bestWave` props directly without the campaign-poisoning caveat WR-04 imposed. Phase 14 still owes the three deferred decisions: the production entry point, a permanent record surface, and which of best wave / best score is *the* record.
- **Noted for the next phase gate:** anchor the `src/core` / `src/levelgen` freeze diff on the phase directory's first commit, not `origin/main`.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*

## Self-Check: PASSED

All four modified files and this SUMMARY exist on disk. Both task commits (`d827e24`, `4e2023e`)
are present in `git log --oneline --all`. `commits: 2` in the frontmatter is MEASURED —
`git rev-list --count ca6e273..HEAD` at SUMMARY-write time returned 2 (the two task commits;
Task 3's docs commit lands after the count, per the ledger contract).
