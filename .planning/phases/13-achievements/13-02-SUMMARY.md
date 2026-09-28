---
phase: 13-achievements
plan: 02
subsystem: api
tags: [achievements, catalog, telemetry, vitest, purity, eslint]

# Dependency graph
requires:
  - phase: 13-achievements
    provides: "plan 13-01's `src/services/achievements/` — the `Achievement` type, the one-entry catalog, `AchievementSnapshot`, the evaluator's trailing catalog parameter, and the `src/services/achievements/**` eslint purity block"
  - phase: 09-run-telemetry-storage-v4
    provides: "`TelemetryAggregate`'s sixteen counters, the three `byMode` maps and their key constants — the ENTIRE input surface these twelve predicates read"
  - phase: 11-endless-mode
    provides: "`EndlessRecord.bestWave`, and `difficultyForWave(wave) = wave - 1` clamped — the ramp relationship entry 9's threshold is anchored on"
  - phase: 12-daily-challenge
    provides: "`DailyRecord.longestStreak` / `totalDaysPlayed` (D-16's two unbounded scalars), `DAILY_TELEMETRY_KEY`'s single-key decision, and `DAILY_DIFFICULTY = 10`'s JSDoc — the model D-11 asks every threshold to copy"
provides:
  - "`ACHIEVEMENT_CATALOG` at twelve entries — D-09's ceiling, one tier, no ladder"
  - "Five cumulative entries that cannot be failed and seven skill-gated ones that are earned (D-10), with the split documented above the array and deliberately not encoded"
  - "Campaign-only, endless-only and daily-only predicates (D-12 / SC-5), proved behaviourally rather than claimed"
  - "`AchievementSnapshot` widened to the twelve counters the twelve predicates read, still importing no storage type (D-20)"
  - "Three total readers — `counter`, `isGenuineZero`, `valuesOf` — that make a hostile blob yield FEWER achievements than a clean one and never more"
  - "`tests/achievements.catalog.test.ts` — six cases quantified over the exported catalog"
  - "`tests/achievements.evaluate.test.ts` — five cases covering SC-2's two halves, D-04's flood, totality and predicate containment"
  - "The all-zero anchor as a shipped design constraint: no entry qualifies on a snapshot in which nothing has happened"
affects: [13-03 read-path sanitizer and merge battery, 13-04 daily panel and classifier battery, 13-05 device verification and threshold review, 14-achievements-screen]

# Actuals (#2632) — same estimateTokens scale as the plan's estimate: chars/4 over the
# realized diff, NOT a harness token count. MEASURED:
#   git diff <plan_head_before>..HEAD | grep '^+' | wc -c  ->  69 988 chars  ->  17 497
# The plan estimated 62 000 at `confidence: low`. The over-estimate is real and is not
# rounded toward the estimate: the plan's own risk paragraph expected twelve thresholds of
# `DAILY_DIFFICULTY`-shaped prose plus two suites from scratch, and the prose is what it
# expected — what it over-counted was the amount of CODE twelve data entries need, which is
# one array element each.
actuals:
  tokens: 17497
  tasks: 2
  # MEASURED with `git rev-list --count <plan_head_before>..HEAD` at close-out: the two task
  # commits. This SUMMARY's own metadata commit lands after the count is taken, exactly as
  # in 13-01, so re-running the command after the docs commit returns 3.
  commits: 2
plan_head_before: ba53588bbbf496b0a0b7037dc1fb3ecfbebf8c00

tech-stack:
  added: []
  patterns:
    - "Total readers at the policy boundary with an asymmetric pair: `counter` folds garbage DOWN where a larger value qualifies, `isGenuineZero` refuses garbage where an exact zero qualifies — the same rule cannot express both directions"
    - "A keyless read of a keyed storage map (`Object.values` behind `valuesOf`), so a policy module reads three maps without restating any of the three key constants D-20 forbids importing"
    - "A threshold JSDoc that states its anchors AND states plainly where no anchor exists, rather than inventing a plausible-sounding one"
    - "A non-vacuity guard over a SET of degenerate variants (`at least one must cost something`) rather than pinned to one variant, so adding a variant cannot quietly make the loop toothless"

key-files:
  created:
    - tests/achievements.catalog.test.ts
    - tests/achievements.evaluate.test.ts
  modified:
    - src/services/achievements/catalog.ts
    - tests/achievements.record.test.ts

key-decisions:
  - "All twelve predicates read through the same three total readers, including the entry plan 13-01 shipped — the plan asked for entry 1 to be left unchanged, but a mixed array in which eleven predicates fold a non-finite counter to zero and one accepts `Infinity` as a qualification is an over-reporting hole in exactly one row, and the next reader copies whichever entry they look at first."
  - "`daily.history` dropped from `AchievementSnapshot`. No shipped predicate reads it and the view's own contract is that it names the subset that IS read; a field carried there that nothing reads is a schema obligation with no beneficiary."
  - "Plan 13-01's `tests/achievements.record.test.ts` needed two premises repaired, not rewritten: its telemetry fixture now models the `byMode.campaign` region its cases actually drive, and its firewall seeding run loses one life. Both premises were true against a one-entry `lifetime` catalog and false against a mode-aware one."
  - "The cumulative / skill-gated split (D-10) is documented above the array and NOT encoded as a `kind` field. Nothing in this phase renders it and Phase 14 has not asked for it; adding a field so a test can assert a property the comment already states is a gate invented for its own sake, and the comment says so."
  - "Exactly one threshold in the catalog claims a published anchor — `Wave 10`, against `DAILY_DIFFICULTY`'s documented reasoning and the generator's table — and the off-by-one is stated accurately (wave 10 is difficulty 9; wave 11 is the daily board's difficulty) rather than rounded into a tidier sentence. The other eleven say plainly that no anchor exists."
  - "No test in either suite names a real achievement id or display name, in an assertion OR in a fixture. A fixture naming an id is the hand-written-list defect wearing a fixture's clothes."

patterns-established:
  - "A degradation DIRECTION must be uniform across a data table, or the table has a hole in exactly one row and the hole is invisible to a reader who checks any other row."
  - "When a plan says 'leave X unchanged' and X is one row of a table whose other rows are being given a new invariant, the invariant wins and the deviation is recorded — an inconsistent table is a trap for the next reader, not a preserved contract."
  - "Prose must not spell a form that a text-level check also counts. Applied preemptively here to a map-index form (`byMode.<map>[...]`) after plan 13-01 shipped the same defect against a grep-based attribute gate."

requirements-completed: [N-ACH-01, N-ACH-03]

coverage:
  - id: D1
    description: "`ACHIEVEMENT_CATALOG` holds twelve entries — a single tier inside D-09's 8..12, with no bronze/silver/gold ladder."
    requirement: "N-ACH-01"
    verification:
      - kind: unit
        ref: "tests/achievements.catalog.test.ts#catalog size — inside D-09's 8..12, a range and not an equality"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every entry is DATA: a non-empty string id, name and description, and a predicate that is a function of arity 1 — N-ACH-01's \"declared as data, pure predicate over a telemetry snapshot\" reduced to something assertable."
    requirement: "N-ACH-01"
    verification:
      - kind: unit
        ref: "tests/achievements.catalog.test.ts#every entry is data — an id, a name, a description and a unary pure predicate"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every achievement id is unique and no two entries share a description."
    requirement: "N-ACH-01"
    verification:
      - kind: unit
        ref: "tests/achievements.catalog.test.ts#ids unique — and so are the descriptions"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every display name in the exported catalog is at most `ACHIEVEMENT_NAME_MAX` characters, asserted by quantifying over the exported data and reading the constant from the module; the longest shipped name is `Flawless Clear` at 14."
    requirement: "N-ACH-03"
    verification:
      - kind: unit
        ref: "tests/achievements.catalog.test.ts#name within 16 chars — every display name fits the exported budget"
        status: pass
    human_judgment: false
  - id: D5
    description: "The achievement policy reads no clock, no RNG and imports no storage module — a source-level scan that strips comments before matching, alongside the AST-level eslint block that is the primary enforcer."
    requirement: "N-ACH-01"
    verification:
      - kind: unit
        ref: "tests/achievements.catalog.test.ts#no clock no storage — the source-level second reader of D-03 and D-20"
        status: pass
      - kind: other
        ref: "npm run lint (exit 0)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The catalog covers all three modes, proved BEHAVIOURALLY: a snapshot whose only populated region is campaign qualifies something, likewise endless and likewise daily, anchored by an all-zero snapshot that qualifies nothing."
    requirement: "N-ACH-01"
    verification:
      - kind: unit
        ref: "tests/achievements.catalog.test.ts#three modes — campaign, endless and daily each reach at least one entry (D-12 / SC-5)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Twelve thresholds, each carrying in JSDoc what the number is, the reasoning that produced it, the anchors it sits between where any exist, and that it is a JUDGEMENT rather than a measurement — with exactly one claiming a published anchor and eleven saying plainly that none exists."
    requirement: "N-ACH-01"
    verification: []
    human_judgment: true
    rationale: "D-11: no human has ever played this game (recorded as still true in both 11-UAT.md and 12-UAT.md), so there is no distribution any assertion could compare a threshold against. The presence of the reasoning is mechanically checkable and was checked (all twelve entry JSDocs contain the judgement statement); whether 25 is the right combo, whether 60 returns is a minute of play, and whether `Perfect Daily` is too harsh for a single-key daily aggregate are exactly the questions plan 13-05 routes to a human. 13-UAT.md is where the answers land."
  - id: D8
    description: "`qualifyingAchievements` is deterministic: the same snapshot yields the same set in the same order, and a structurally identical but distinct snapshot yields the identical set — so SC-2 is a claim about the value, not about object identity."
    requirement: "N-ACH-01"
    verification:
      - kind: unit
        ref: "tests/achievements.evaluate.test.ts#same snapshot twice — the same set, in the same order, and by VALUE not by identity"
        status: pass
    human_judgment: false
  - id: D9
    description: "`newlyUnlockedAchievements` is idempotent as a set difference: an already-stored qualifying set yields an empty delta, an empty stored set yields everything, and dropping one id brings back exactly that id."
    requirement: "N-ACH-01"
    verification:
      - kind: unit
        ref: "tests/achievements.evaluate.test.ts#does not re-fire — an already-unlocked id yields an empty delta, and the empty set yields everything"
        status: pass
    human_judgment: false
  - id: D10
    description: "D-04's retroactive flood: a snapshot carrying years of telemetry across all three modes with an empty unlocked set yields many ids at once, and their catalog indices are strictly increasing — declaration order, which is what the UI-SPEC's `n >= 3` case depends on."
    requirement: "N-ACH-01"
    verification:
      - kind: unit
        ref: "tests/achievements.evaluate.test.ts#retroactive — a player with years of telemetry and an empty unlocked set unlocks many at once, in catalog declaration order (D-04)"
        status: pass
    human_judgment: false
  - id: D11
    description: "Totality in the under-reporting direction: nine degenerate snapshots and four degenerate unlocked sets each yield no throw and no id the clean reading lacks, with a guard requiring at least one variant to cost something."
    requirement: "N-ACH-01"
    verification:
      - kind: unit
        ref: "tests/achievements.evaluate.test.ts#hostile snapshot — degenerate input yields FEWER ids and never throws"
        status: pass
    human_judgment: false
  - id: D12
    description: "A predicate that throws costs its own achievement and nothing else, proved through the evaluator's trailing catalog parameter with no module mock — alongside a non-callable predicate being skipped, a truthy non-boolean not qualifying, and the default catalog surviving the call."
    requirement: "N-ACH-01"
    verification:
      - kind: unit
        ref: "tests/achievements.evaluate.test.ts#throwing predicate — it costs its own achievement and nothing else"
        status: pass
    human_judgment: false
  - id: D13
    description: "The catalog expansion did not reach plan 13-01's store suite from a distance: its derived positive control and its \"a run that crosses nothing reports nothing\" case are both still green, over both hand-mirrored stores."
    requirement: "N-ACH-01"
    verification:
      - kind: integration
        ref: "npx vitest run tests/achievements.record.test.ts (Test Files 1 passed / Tests 14 passed)"
        status: pass
    human_judgment: false

# Metrics
duration: 18 min
completed: 2026-09-28
status: complete
---

# Phase 13 Plan 02: The catalog — twelve achievements as data Summary

**Twelve single-tier achievements declared as data — five that cannot be failed and seven that are earned — reaching campaign, endless and daily through predicates that read only their own mode's state, with every one of the twelve thresholds carrying the argument that produced it and saying plainly that it is a judgement about a game no human has played.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-28T13:44:00Z
- **Completed:** 2026-09-28T14:02:00Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- **The catalog is full and it is a design act, not a fill-in.** `ACHIEVEMENT_CATALOG` goes from one entry to twelve — the top of D-09's range, one tier, no ladder. The declaration order is authored (lifetime, then campaign, then endless, then daily, most worth naming first inside each group) because the UI-SPEC makes that order the panel's order and its `n >= 3` case names the FIRST entry: the sequence decides which achievement a player who unlocks four at once actually reads.
- **Every threshold carries its reasoning, and exactly one of them claims an anchor.** Each JSDoc copies `DAILY_DIFFICULTY`'s model: what the number is, the reasoning, the anchors it sits between, that it is a JUDGEMENT and not a measurement because no human has played this game, and what a re-tune costs (nothing — the catalog is data). `Wave 10` is the one entry with a real published anchor, and the relationship is stated accurately rather than tidily: the endless ramp is `wave - 1`, so wave 10 is difficulty 9 and wave 11 is exactly the difficulty every daily board is fixed at. The other eleven say outright that no anchor exists — `60 Rally` goes further and names the second, unmeasured judgement its first one rests on (a paddle-contact cadence nothing in the repo records).
- **D-12 is satisfied behaviourally, not by reading `lifetime` twelve times.** `flawless-clear` and `campaign-25` read only `byMode.campaign`; `endless-wave-10` and `endless-runs-20` read only the endless region; `daily-perfect` and `daily-streak-7` read only the daily region. The proof is three snapshots that each populate exactly one region, anchored by an all-zero snapshot that qualifies nothing — and that anchor is a shipped design constraint, not just a case: three later plans assert absence against it.
- **The two conservative entries say why they under-report, at the site.** `byMode` aggregates are per-key ACROSS runs, so "won it and never lost a life on it" is strictly stronger than "cleared it once cleanly" — chosen, because a lifetime best invented out of an aggregate is a worse failure than one that arrives late. `daily-perfect` adds the fact a reader would otherwise get wrong: `byMode.daily` is keyed by a SINGLE constant (phase 12's D-15), so its aggregate spans every date the player has ever played, which makes it HARDER than its campaign twin rather than equivalent.
- **The degradation direction is uniform across all twelve rows.** Three total readers — `counter` folds a non-finite, negative or absent value to zero where a larger value qualifies; `isGenuineZero` refuses garbage where an exact zero qualifies; `valuesOf` drops non-object map cells and needs no key literal. A hostile blob therefore yields FEWER achievements than a clean one and never more, and the suite asserts that over nine degenerate snapshots rather than assuming it.
- **Both suites quantify over the export and name no id, no display name and no threshold.** A hand-written list would go on passing while a thirteenth achievement escaped it, and a pinned threshold would red the moment plan 13-05's human review legitimately re-tunes one — which would make the review expensive and therefore make it not happen.

## Task Commits

1. **Task 1: The catalog — 12 entries, three modes, every threshold carrying its reasoning** — `555884d` (feat)
2. **Task 2: The evaluator suite — SC-2's two halves, D-04's flood, and totality** — `712825e` (test)

Task 1 is marked `tdd="true"` in the plan and the RED was real: written against plan 13-01's single-entry catalog, `tests/achievements.catalog.test.ts` failed exactly the two cases the plan predicted — `catalog size` (`expected 1 to be greater than or equal to 8`) and `three modes` (`expected 0 to be greater than 0`) — while the other four passed as the regression cover they are. The entries were added only after that run.

## Files Created/Modified

- `src/services/achievements/catalog.ts` — twelve entries with their reasoning; `AchievementCounters` widened from one field to twelve; `AchievementSnapshot` widened and `daily.history` dropped; three new total readers (`counter`, `isGenuineZero`, `valuesOf`, `sumOf`); the array comment recording the order contract, the D-10 split, the refused `kind` field and the id-permanence rule
- `tests/achievements.catalog.test.ts` — six cases: `every entry is data`, `ids unique`, `name within 16 chars`, `no clock no storage`, `three modes`, `catalog size`. `@vitest-environment node`, no jsdom, no mocks
- `tests/achievements.evaluate.test.ts` — five cases: `same snapshot twice`, `does not re-fire`, `retroactive`, `hostile snapshot`, `throwing predicate`. Hand-built snapshot fixtures, not derived from `defaultTelemetryBlob()`
- `tests/achievements.record.test.ts` — plan 13-01's suite, two premises repaired (see Deviations). Not rewritten; 14 cases before and 14 after
- `src/services/achievements/index.ts` — **deliberately untouched.** The barrel already exports everything both new suites import, and the plan says to leave it alone rather than make a cosmetic edit

## Decisions Made

- **All twelve predicates read through the same total readers, including entry 1.** See Deviations — the plan asked for entry 1 to be left unchanged and the invariant won.
- **`daily.history` is no longer part of `AchievementSnapshot`.** Nothing reads it, and the view's own JSDoc claims to name the subset that is read. Verified safe first: the only two references to `AchievementSnapshot` outside its own directory are comments in the two stores, and structural compatibility is unaffected because `TelemetryBlob` having a field the view omits is exactly the direction that typechecks.
- **The cumulative / skill-gated split is documented, not encoded.** Cumulative: `bricks-1000`, `runs-50`, `pickups-100`, `campaign-25`, `endless-runs-20`. Skill-gated: `combo-25`, `rally-60`, `cascade-12`, `flawless-clear`, `endless-wave-10`, `daily-perfect`, `daily-streak-7`. Five and seven. The comment states why there is no `kind` field, so the omission reads as a decision.
- **`100 Pickups` is one entry summing five counters rather than five entries.** Five near-identical "collect N of kind X" achievements is the tiering D-09 rejected wearing a different hat — five thresholds to justify and five panel lines saying the same thing — and summing means a player who favours one power-up is not penalised for ignoring another.
- **`20 Endless` is deliberately lower than `50 Runs`.** Endless is one mode of three, so a mode-specific cumulative entry must be reachable by a player who splits their time. The ratio carries the argument; neither number is anchored.
- **Prose in `catalog.ts` avoids the map-index form.** The paragraph explaining that a campaign cell's `livesLost` spans the player's whole history originally wrote `byMode.campaign['level-03'].livesLost`, which is the exact form a text-level check for "no predicate names a `byMode` key literally" would count. Rewritten to name the cell without the index form, with a sentence saying why so nobody restores it. This is 13-01's `numberOfLines` defect, reached preemptively.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] The degradation direction had to be uniform, so entry 1's read was routed through the same helper as its eleven siblings**

- **Found during:** Task 1 (writing the eleven new predicates)
- **Issue:** The plan says *"Entry 1 is the one plan 13-01 shipped and is unchanged."* Read literally that leaves `(s) => s.lifetime.bricksBroken >= 1000` beside eleven predicates that fold a non-finite counter to zero. `safeCounter` bounds a stored counter DOWNWARD and not upward — the phase-11 audit measured `Number.MAX_VALUE` surviving the read path intact — and nothing on the read path rejects `Infinity`. So on the mixed array, a tampered `bricksBroken: Infinity` qualifies and a tampered `bestComboEver: Infinity` does not: an over-reporting hole in exactly one row of twelve, invisible to a reader who checks any other row, and the row the next author is most likely to copy because it is first.
- **Fix:** Introduced three total readers with their reasoning stated as a DIRECTION rather than a style (`counter` for every `>=` comparison, `isGenuineZero` for the two entries that qualify on an exact zero — where folding garbage to `0` would GRANT an achievement out of corruption, the one direction this tree refuses — and `valuesOf` for the keyless map reads). Entry 1's `id`, `name`, `description`, JSDoc and threshold are untouched; only the read is routed through `counter`, which changes behaviour solely for non-finite and negative stored values, and solely in the safe direction.
- **Files modified:** `src/services/achievements/catalog.ts`
- **Verification:** `tests/achievements.evaluate.test.ts -t "hostile snapshot"` asserts no hostile variant returns an id the clean reading lacks, with a guard requiring at least one variant to cost something; `tests/achievements.record.test.ts` still green over both stores, so the change is invisible to every finite value.
- **Committed in:** `555884d` (part of the Task 1 commit)

**2. [Rule 1 - Bug] Plan 13-01's store suite had two premises that a mode-aware catalog makes false**

- **Found during:** Task 1, at the `tests/achievements.record.test.ts` gate — which the plan names precisely because *"the catalog expansion can break it from a distance"*. It did, in two ways, six cases red across the two stores.
- **Issue:** (a) `qualifyingTelemetry()` set one `lifetime` counter and nothing else, so `EXPECTED_IDS` was derived from a fixture describing only part of the run the cases actually drive. The real campaign win also produces `byMode.campaign[level-01]` with `runsWon: 1, livesLost: 0`, which now qualifies `flawless-clear` — so the store persisted 2 unlocks where the fixture predicted 1 and two `toHaveLength(EXPECTED_IDS.length)` assertions failed. (b) The firewall case's seeding run is a campaign WIN with `livesRemaining: 2` and no lives lost, and its comment asserts *"this run unlocks nothing"* on the strength of its bricks being below the threshold. A spotless campaign win is now itself an achievement, so the seed unlocked `flawless-clear` and the case's own guard red — correctly, because the case would otherwise have been measuring the seed rather than the daily run.
- **Fix:** (a) The fixture now models the `byMode.campaign` region of the run its cases drive — one win on `PLAYABLE_LEVEL_ORDER[0]`, no lives lost — with a JSDoc paragraph recording that plan 13-01's one-`lifetime`-counter fixture described the whole evaluation then and does not now, so a future reader does not simplify it back. (b) The seeding run loses one life (`runStats({ bricksBroken: 10, livesLost: 1 })`), with a comment recording that this is load-bearing rather than incidental, and that `stars` derives from `livesRemaining` so the per-level best the case preserves is unchanged. Neither fix names an id or a threshold. The file was repaired, not rewritten — 14 cases before and 14 after — and plan 13-03, which rewrites it, is in wave 3 behind this plan.
- **Files modified:** `tests/achievements.record.test.ts`
- **Verification:** `npx vitest run tests/achievements.record.test.ts` — `Test Files 1 passed (1)` / `Tests 14 passed (14)`, over both hand-mirrored stores.
- **Committed in:** `555884d` (part of the Task 1 commit)

**3. [Rule 2 - Missing Critical] `daily.history` removed from the snapshot view, and the grep-visible map-index form kept out of prose**

- **Found during:** Task 1 (widening `AchievementSnapshot`)
- **Issue:** Two small things the plan's widening instruction does not name. `daily.history` was declared by plan 13-01 and is read by no shipped predicate, while the view's own JSDoc claims to name only the subset that is read — so the type carried a schema obligation with no beneficiary, and every test fixture had to build it. Separately, the paragraph explaining `flawless-clear`'s across-runs semantics spelled a `byMode` map-index form in prose, which is precisely the shape a text-level check for *"no predicate names a `byMode` key as a string literal"* would count — 13-01's `numberOfLines` defect from the other direction.
- **Fix:** Dropped `daily.history` after verifying the only outside references to `AchievementSnapshot` are two comments in the stores and that omitting a field `TelemetryBlob` has is the direction that typechecks. Rewrote the paragraph to name the cell without the index form, with a sentence recording why, so it is not restored.
- **Files modified:** `src/services/achievements/catalog.ts`
- **Verification:** `npm run typecheck` exit 0 (the stores' call sites are where structural compatibility is checked); `grep -cE "byMode\.(campaign|endless|daily)\[" src/services/achievements/catalog.ts` prints `0`.
- **Committed in:** `555884d` (part of the Task 1 commit)

**4. [Rule 2 - Missing Critical] Assertions beyond the plan's case list, required by `13-VALIDATION.md`'s own non-vacuity rule**

- **Found during:** Task 2 (writing the evaluator suite)
- **Issue:** Three of the plan's cases would have passed for the wrong reason as specified. The `hostile snapshot` case asserts the hostile result is *"never LARGER"* than the clean one — which `<=` satisfies when the corruption costs nothing at all, so the under-reporting claim would have gone untested. The `does not re-fire` case's empty-vs-everything pair proves firing happens but says nothing about whether the difference is EXACT. And the `throwing predicate` case's local catalog covers a throw but not the two other ways a hostile entry can be malformed, both of which `evaluate.ts` already claims to handle in prose.
- **Fix:** Added a non-vacuity guard requiring at least one hostile variant to qualify for STRICTLY fewer — recorded as a property of the SET of variants rather than pinned to one, so adding a variant cannot quietly make the loop toothless. Added an exactness assertion to `does not re-fire` (holding all but the first id brings back exactly the first, in catalog order, with no id named). Added two probe entries to the local catalog: a non-callable predicate, and one returning a number rather than a boolean — the latter asserting the `=== true` check rather than a truthiness test, so a predicate accidentally returning a count cannot unlock on everything-but-zero. Also added a case-closing assertion that passing a local catalog does not replace the default, since a sticky catalog would leak between the two store call sites.
- **Files modified:** `tests/achievements.evaluate.test.ts`
- **Verification:** `npx vitest run tests/achievements.evaluate.test.ts` — 5 passed; the non-vacuity guard is itself an assertion and fails if no variant costs anything.
- **Committed in:** `712825e` (part of the Task 2 commit)

---

**Total deviations:** 4 auto-fixed (1 bug, 3 missing critical)
**Impact on plan:** No scope change and no new file beyond the plan's four. Three of the four are corrections to details the plan specified in good faith — one of which (entry 1 unchanged) was a contract that had become a trap once eleven siblings acquired a new invariant; the fourth adds the coverage the phase's own non-vacuity rule requires. Every measured base the plan supplied was confirmed exactly: typecheck exit 0 with no `error TS`, lint exit 0 at `✖ 3 problems (0 errors, 3 warnings)`, the predicted two-case RED against the single-entry catalog, and the `-t` filter printing `Tests 1 passed | 4 skipped (5)` — `passed` present, exit code and the word `skipped` both non-discriminating exactly as measured.

## Issues Encountered

- **Nothing required an Expo or React Native lookup, as the plan predicted.** `AGENTS.md` binds any change under `src/runtime/**` or `app/**` to the versioned SDK docs; this plan touches `src/services/achievements/catalog.ts` and three files under `tests/`, adds no package, imports no Expo or React Native module, and renders nothing. No `npm install` or `npx expo install` ran.
- **`npm test` was deliberately not run, per the plan's own `<verification>`.** Plan 13-05 owns the authoritative full-suite run; a tree-wide run here would pay a full suite for a two-file change and duplicate 13-05's. The four files this plan touches were each gated directly, plus plan 13-01's store suite as the from-a-distance check. **Two new test files were added, so the suite's file/test counts move from 109/818 — plan 13-05's run is where the new totals are measured.**
- **The `__purity_probe` gate was not re-run here, and the plan says why.** A green `npm run lint` proves this plan's catalog code does not violate the eslint purity block; it does not prove the block exists, because lint exits 0 either way against a clean directory. The gate that observes the block's presence is 13-01's probe and 13-05 re-runs it. The portable second reader of the same rule now exists as a vitest case (`no clock no storage`), which is what `13-VALIDATION.md` budgets a case for.
- **Requirements were not marked complete, correctly.** `requirements.ready-ids` holds N-ACH-01 and N-ACH-03 because sibling plans 13-03, 13-04 and 13-05 also declare them and have no SUMMARY yet. They are recorded in this SUMMARY's `requirements-completed` and flip when the last declaring plan closes.

## Known Stubs

None. Every entry in the catalog is a real shipping achievement with a real predicate and a real argument for its threshold, and both new suites assert properties of shipped code. Three things are deliberately ABSENT rather than stubbed:

- **No `kind` field on `Achievement`.** The D-10 split is documented above the array instead, with the reason stated there so it reads as a decision.
- **No `AchievementId` literal union.** Refused for the reasons plan 13-01 recorded and left in place (a module cycle, and D-15 needs a runtime membership check a compile-time union cannot perform).
- **No threshold constant is exported or pinned by a test.** That is the point of D-11: plan 13-05 re-tunes freely at no code cost.

## Threat Flags

None. No new network endpoint, no auth path, no file access pattern and no schema change at a trust boundary. The plan's `<threat_model>` rows are all `accept` and each is now recorded where it binds: T-13-03's upward-unbounded counters are named in the total readers' block comment; T-13-04 is named in `daily-streak-7`'s own JSDoc, as the plan requires, together with the truncating alternative D-16 rejects; T-13-07's uncapped `byMode` iteration is named at `valuesOf` with the WINDOWS #27 reference. T-13-SC holds: no package-manager install ran and no package was added.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Wave 3 is unblocked, and the catalog is final before anything else reads it — which is why plans 13-03 and 13-04 were moved behind this one during revision.

- **13-03 (read path).** `isKnownAchievementId` now validates twelve ids instead of one, derived at module load, so the expansion moved that gate for free. Note that 13-03 rewrites `tests/achievements.record.test.ts`: the two premises repaired here (the `byMode.campaign`-modelling fixture and the life-losing seeding run) must survive that rewrite or the same six cases will red again for the same reason. D-21's split rule still has no in-repo precedent.
- **13-04 (daily panel and classifier).** `achievementLines` is untouched and complete. The catalog's declaration order is now a twelve-element contract the panel depends on, and the longest display name is `Flawless Clear` at 14 of the 16 available characters — two characters of margin, so a future rename has very little room before it wraps.
- **13-05 (device verification and the threshold review).** This is the plan that matters most to this one. **All twelve thresholds are judgements and the whole set is routed there** — the three to look at hardest are `rally-60` (it rests on an unmeasured paddle-contact cadence, stated at the site), `daily-perfect` (hardest entry in the catalog, because `byMode.daily` is a single aggregate spanning every date, so one lost life ever closes it permanently) and `flawless-clear` (deliberately under-reports, and the JSDoc says so). 13-05 also still owns WINDOWS #16, #17, #28 and #29, and re-runs the `__purity_probe` gate and the authoritative `npm test`.

---
*Phase: 13-achievements*
*Completed: 2026-09-28*

## Self-Check: PASSED

- Both created files exist on disk; both modified files exist and are committed.
- Commits `555884d` and `712825e` exist in `git log`.
- All four plan-level `<verification>` items re-run after the final edit:
  `npx vitest run tests/achievements.catalog.test.ts tests/achievements.evaluate.test.ts`
  prints `Test Files  2 passed (2)` / `Tests  11 passed (11)`;
  `npx vitest run tests/achievements.record.test.ts` prints `Test Files  1 passed (1)` /
  `Tests  14 passed (14)`; `npm run typecheck` exit 0 with no `error TS`; `npm run lint`
  exit 0 at `✖ 3 problems (0 errors, 3 warnings)` — bound on the exit code, never on the
  substring `error`.
- Both task `<verify>` blocks re-run in full, including the `-t` filter gate:
  `npx vitest run tests/achievements.evaluate.test.ts -t "does not re-fire"` prints
  `Tests  1 passed | 4 skipped (5)`, which contains `passed` — the only one of the three
  candidate bindings that discriminates, exactly as the plan measured.
- Every acceptance criterion checked, including the ones with no command in a verify block:
  twelve entries; twelve display names measured against the budget with the longest
  `Flawless Clear` at 14; zero duplicate ids and zero duplicate descriptions; every
  predicate of arity 1; zero `import` statements in `catalog.ts`; zero `kind` properties;
  all twelve entry JSDocs containing the judgement statement (checked per entry by parsing
  the array, not by a file-wide count); zero grep-visible `byMode.<map>[` forms; both suites
  opening with `@vitest-environment node` and importing no jsdom helper, no
  `@testing-library/react` and no `vi.mock`; both suites naming no real achievement id or
  display name anywhere, in an assertion or a fixture; `ACHIEVEMENT_NAME_MAX` read from the
  module rather than written as a number; and `src/services/achievements/index.ts`
  unmodified (`git status --short` empty for that path).
- The RED was observed before the GREEN: `catalog size` and `three modes` failed against
  plan 13-01's single-entry catalog with the predicted messages, and the other four cases
  passed, before any entry was added.
