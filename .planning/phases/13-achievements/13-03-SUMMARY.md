---
phase: 13-achievements
plan: 03
subsystem: database
tags: [achievements, storage, parseBlob, sanitizer, telemetry, vitest, tamper]

# Dependency graph
requires:
  - phase: 13-achievements
    provides: "plan 13-01's `AchievementUnlock` / `AchievementRecord` / `defaultAchievementRecord` / `ACHIEVEMENT_UNLOCK_BOUND` in `types.ts`, the `achievements` field on `TelemetryBlob`, `cloneTelemetryBlob`'s and `mergeTelemetryBlobs`' two of D-23's three sites, `mergeAchievementUnlocks`, `mergeAchievementRecords`, and the parameterised both-stores suite in `tests/achievements.record.test.ts`"
  - phase: 13-achievements
    provides: "plan 13-02's twelve-entry `ACHIEVEMENT_CATALOG` and `isKnownAchievementId` — the closed set this plan's parser validates against without restating it; and its two in-place repairs to `tests/achievements.record.test.ts`, both of which this plan preserved"
  - phase: 12-daily-challenge
    provides: "`sanitizeDailyHistoryEntry` / `sanitizeDailyRecord` and their JSDoc — the shape, the trim-after-drop ordering, the fixture-not-derived rule and the `sanitizeTelemetry` independence contract this record copies one field over"
  - phase: 09-run-telemetry-storage-v4
    provides: "`sanitizeTelemetry`'s independence contract, the local `safeCounter(raw: unknown)`, `sanitizeRunLogEntry`'s drop-on-invalid-timestamp rule (the WRONG analog here, and why), and the `RECENT_RUNS_BOUND` read-bound idiom"
provides:
  - "`sanitizeAchievementUnlock` and `sanitizeAchievementRecord` in `parseBlob.ts`, wired into `sanitizeTelemetry` — the read path that makes SC-3 true rather than intended"
  - "D-21's pair of failure rules inside one entry sanitizer, with its reason written at the site: a bad id DROPS the entry, a bad timestamp DEFAULTS and KEEPS it"
  - "Drop, then de-duplicate-earliest, then bound — the order stated as contract, with the trim-after-drop reason carried from the daily record"
  - "A read bound that trims in the SAME direction as both shipped write sites, so all three agree that an unlock held longest is never the one dropped"
  - "Nine parser cases in `tests/storage.progress-v4.test.ts` — a sibling of the daily block, not a rewrite of it"
  - "Five store-level cases in `tests/achievements.record.test.ts`, each asserted separately against both hand-mirrored stores, extending rather than rewriting the file 13-02 repaired"
  - "D-22 asserted as COMMUTATIVITY rather than as a single merge, because a single-order assertion was MEASURED to pass against the exact incoming-wins defect it exists to forbid"
  - "A measured fact for every later plan in this phase: vitest's `-t` filter is case-SENSITIVE"
affects: [13-04 daily panel and host wiring, 13-05 device verification and tree-wide gate, 14-achievements-screen]

# Actuals (#2632) — same estimateTokens scale as the plan's `estimate`: chars/4 over the
# realized diff, NOT a harness token count. MEASURED:
#   git diff ee1e158..HEAD | grep '^+' | wc -c  ->  43 484 chars  ->  10 871
# The plan estimated 74 000 at `confidence: low`. The over-estimate is large, real, and is
# NOT rounded toward the estimate. The same cause 13-02 recorded applies again and more
# strongly: what the plan priced was the reasoning — three traps with no in-repo precedent,
# each needing a paragraph of JSDoc — and the reasoning is what it got. What it over-counted
# was the amount of CODE two sanitizers and fourteen cases need. `sanitizeAchievementRecord`
# is nineteen lines of body under seventy lines of comment, and that ratio is the plan's
# own instruction rather than an overrun.
actuals:
  tokens: 10871
  tasks: 2
  # MEASURED with `git rev-list --count <plan_head_before>..HEAD` at close-out: the two task
  # commits. This SUMMARY's own metadata commit lands after the count is taken, exactly as
  # in 13-01 and 13-02, so re-running the command after the docs commit returns 3.
  commits: 2
plan_head_before: ee1e1586a0c1c969a4fb08416b97e575e52a627b

tech-stack:
  added: []
  patterns:
    - "Two different failure rules inside ONE entry sanitizer, with the asymmetry justified at the site by what each degradation COSTS — a bad id costs the achievement, a bad timestamp costs a sort order — rather than by a style preference"
    - "A read bound whose DIRECTION is inherited from the write sites it backstops, so a collection cannot disagree with itself about which end is expendable"
    - "Commutativity as the assertion form for a merge tiebreak: an order-dependent rule and an order-independent one agree in whichever argument order happens to favour the right answer, so only asserting BOTH orders binds the rule"
    - "A cross-module import edge from the parser to the module that MINTS a closed set, so the parser can never hold a stale copy of it (second instance, after `isValidDateKey`)"
    - "A deliberately-broken-implementation probe run against a new assertion BEFORE trusting it, and thrown away afterwards — the measurement that caught this plan's own vacuous case"

key-files:
  created: []
  modified:
    - src/services/storage/parseBlob.ts
    - tests/storage.progress-v4.test.ts
    - tests/achievements.record.test.ts

key-decisions:
  - "The read bound keeps the FIRST entries (`slice(0, …)`), not the last. The plan specified `slice(-…)`; that is the recent-run ring's direction and it contradicts both shipped sites, whose own comments reject it for this collection with D-17's reason — dropping the oldest would un-earn the achievements the player has held longest. It also breaks the plan's own test fixture, which only discriminates trim-first from drop-first under keep-first."
  - "D-22 is asserted as COMMUTATIVITY over both argument orders, not as a single merge. MEASURED: the case exactly as the plan specified it PASSED against a deliberately inverted incoming-wins merge, because `mergeTelemetryBlobs` iterates memory-then-incoming and incoming-wins therefore returns whichever copy is passed second — which, with the earlier copy as `incoming`, is the earliest. Earliest-wins is commutative and incoming-wins is not; that is what binds the rule."
  - "Every new store-level claim was probed against a deliberately broken merge or clone before being trusted, and the probe was thrown away. Three of the four probes red the intended case and nothing else; the fourth (a clone that drops the field outright) also reds plan 13-01's cases, which is recorded honestly rather than claimed as this plan's own coverage."
  - "The memory store's cold-start case is an explicit `it.skip` whose NAME carries the reason. It is not a gap: a store constructed from a blob in RAM has no second set of bytes to re-open, so an assertion there would report green while proving nothing about persistence."
  - "`tests/achievements.record.test.ts` was EXTENDED, not rewritten. Plan 13-02's two repaired premises — the fixture modelling the `byMode.campaign` region, and the firewall seeding run losing a life — are byte-identical after this plan; the diff removes neither line. The harness signature changed from two positional parameters to one `StoreFlavor` object, and 13-01's five case bodies are untouched."
  - "The bound's unreachability is stated rather than faked. De-duplication caps a legitimate set at the catalog's twelve, far under the bound's 64, so no test can make the `slice` fire. That is precisely what the bound is for — the fence that survives a relaxation of the id check — and the case says so instead of inventing a sixty-fifth achievement."

patterns-established:
  - "When a plan specifies a trim direction, check it against every sibling site that already trims the same collection. A direction that disagrees with its own write path is a defect even when the plan states it."
  - "A merge-tiebreak assertion must be run against the inverted rule before it is trusted. Fixture ORDER, not just fixture values, decides whether an order-dependent defect is visible — and the arrangement that reads most naturally is the one that hides it."
  - "A text-level test filter can fail on CASE alone. `-t` matched nothing and exited 0 on a name spelling the filtered word in capitals; the exit code and the word `skipped` were both non-discriminating, exactly as this phase already measured for a non-matching filter."

requirements-completed: [N-ACH-02]

coverage:
  - id: D1
    description: "An unlock written before an app kill is still there after the next cold start — the field survives `parseProgressResult` instead of being discarded by `defaultTelemetryBlob()`. Asserted at the parser as a round trip AND at the store as a genuine relaunch: a second store closure over the same persisted bytes, with the bytes themselves checked as the intermediate control."
    requirement: "N-ACH-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#round trip: a stored achievements entry parses back with its id and its timestamp intact — the read half of SC-3"
        status: pass
      - kind: integration
        ref: "tests/achievements.record.test.ts#an unlock survives a cold start — a SECOND store over the same persisted bytes hydrates it (N-ACH-02 / SC-3 / D-13)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A v4 blob written BEFORE the achievements field existed parses with `status: 'ok'`, the field defaulted, and every campaign, endless and daily field intact — no `PROGRESS_VERSION` bump, no migration (D-13). The absence is asserted on the fixture first, so the case is about the missing key rather than about a value."
    requirement: "N-ACH-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#an existing v4 blob written before the achievements record existed parses with the field defaulted and every campaign, endless and daily field intact — no version bump, no migration (D-13)"
        status: pass
    human_judgment: false
  - id: D3
    description: "An unknown achievement id is DROPPED on read and a malformed timestamp DEFAULTS while the entry is KEPT — two different failure rules inside one entry sanitizer (D-15 / D-17 / D-21). Both halves asserted in one case across eight malformed timestamp shapes plus the two non-finite numerics, with a well-formed control proving the zeroes are a degradation rather than a sanitizer that zeroes everything."
    requirement: "N-ACH-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#drops a stored achievements entry whose id the catalog never minted, and keeps its siblings (T-13-01 / D-15)"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#KEEPS an achievements entry whose timestamp is malformed and defaults the timestamp to 0 — the id drops, the timestamp degrades (D-15 / D-17 / D-21)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A fully corrupt achievements field degrades to `defaultAchievementRecord()` ALONE: `unlocked`, `bestByLevel`, `bestScore`, the lifetime aggregate, the endless record and the daily history all survive it — each proved NON-DEFAULT first, in the same case, so it cannot pass because they were empty to begin with."
    requirement: "N-ACH-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#a fully corrupt achievements field leaves unlocked, bestByLevel, bestScore, the endless record and the daily history intact (D-15 / SC-5)"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#a missing or non-object achievements record parses to the default without making the enclosing blob corrupt (D-15)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The stored collection is bounded on READ as well as on write, with drop-then-trim ORDER preserved: three real unlocks survive seventy entries of padding garbage, where trimming first would evict them and leave nothing. Duplicate ids collapse to one entry keeping the earliest timestamp, which is what makes the bound structurally unreachable while the id check stands — stated in the case rather than faked."
    requirement: "N-ACH-02"
    verification:
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#applies the achievements bound AFTER the drop loop, so padding garbage cannot push real unlocks out of the window (T-13-02)"
        status: pass
      - kind: unit
        ref: "tests/storage.progress-v4.test.ts#collapses duplicate achievements ids to one entry, keeping the EARLIEST timestamp (D-14 / D-22)"
        status: pass
      - kind: integration
        ref: "tests/achievements.record.test.ts#a hostile blob cannot grow the stored collection past the catalog's size — the cardinality alarm (T-13-02)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Reconciling memory against freshly-hydrated disk unions the two unlock sets by WHOLE ENTRY and keeps the EARLIEST timestamp for a shared id, asserted in BOTH argument orders because a single order was measured to pass against an incoming-wins merge. The later timestamp of the shared pair appears nowhere in the merged collection, and disjoint ids each keep their own timestamp so no record's evidence can attach to another's claim."
    requirement: "N-ACH-02"
    verification:
      - kind: integration
        ref: "tests/achievements.record.test.ts#the reconcile keeps the earliest timestamp for a shared id — memory against freshly-hydrated disk (D-22)"
        status: pass
      - kind: integration
        ref: "tests/achievements.record.test.ts#the reconcile does not cross one id with another id's timestamp — the phase-12 evidence-crossing defect in its narrow achievements form"
        status: pass
    human_judgment: false
  - id: D7
    description: "A campaign run recorded AFTER an unlock does not erase the unlock set — `cloneTelemetryBlob` carries the field (D-23), proved behaviourally through the real store and not only by the compiler. The unlock is asserted to have LANDED first, which is the positive control that makes the survival claim non-vacuous."
    requirement: "N-ACH-02"
    verification:
      - kind: integration
        ref: "tests/achievements.record.test.ts#a campaign run recorded AFTER an unlock does not erase the unlock set (D-23)"
        status: pass
    human_judgment: false
  - id: D8
    description: "Both hand-mirrored stores satisfy every store-level claim above, asserted separately: all five new cases sit inside plan 13-01's parameterised suite body, so each runs once against `createMemoryProgressStore()` and once against the AsyncStorage-backed store. The one case that is degenerate for a store with no disk is an explicit skip with its reason in the test name."
    requirement: "N-ACH-02"
    verification:
      - kind: integration
        ref: "npx vitest run tests/achievements.record.test.ts (Test Files 1 passed / Tests 23 passed | 1 skipped (24))"
        status: pass
    human_judgment: false
  - id: D9
    description: "The parser imports `isKnownAchievementId` from the module that MINTS the ids, exactly once, and restates no id of its own — so a catalog change cannot leave a stale copy in the read path (T-13-01)."
    requirement: "N-ACH-02"
    verification:
      - kind: other
        ref: "grep -cE \"^import .*from '\\.\\./achievements'\" src/services/storage/parseBlob.ts -> 1 (base: 0)"
        status: pass
      - kind: other
        ref: "no literal from ACHIEVEMENT_CATALOG's twelve ids appears anywhere in parseBlob.ts (checked id-by-id against the catalog source) -> 0"
        status: pass
    human_judgment: false
  - id: D10
    description: "The thresholds and the achievement set the read path now preserves are unchanged and still unvalidated against a human — this plan neither tuned nor pinned one, and its own gates say nothing about whether the twelve achievements feel right to play for."
    verification: []
    human_judgment: true
    rationale: "Inherited from 13-02's D7 and unchanged by this plan: no human has ever played this game (still true in 11-UAT.md and 12-UAT.md), so nothing here can assert that a threshold is well-chosen. This plan's subject is whether an unlock SURVIVES, not whether it was worth earning. Plan 13-05 routes the tuning question to a human and 13-UAT.md is where the answers land."

# Metrics
duration: 13 min
completed: 2026-09-28
status: complete
---

# Phase 13 Plan 03: The read path — a stored unlock that survives a cold start Summary

**`sanitizeAchievementRecord` closes the achievements read path with two different failure rules inside one entry sanitizer — a bad id drops the entry, a bad timestamp defaults and keeps it, because D-17 makes an unlock one-way — and fourteen cases prove an unlock survives an app kill, degrades alone, cannot be grown by a tampered blob, and cannot have its timestamps walked forward by a reconcile; the D-22 case earns that last claim only because a throwaway probe caught the version the plan specified passing against the exact defect it forbids.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-28T14:13:00Z
- **Completed:** 2026-09-28T14:26:00Z
- **Tasks:** 2
- **Files modified:** 3 (0 created, 3 modified)

## Accomplishments

- **The read path exists.** Before this plan `sanitizeTelemetry` started from `defaultTelemetryBlob()` and never looked at a stored achievements field, so plan 13-01's write was discarded on the next cold start. `out.achievements = sanitizeAchievementRecord(telemetry.achievements)` is one line beside the daily one; everything else here is what makes that line safe.
- **D-21's pair, with the reason at the site.** A bad id drops the entry; a bad `at` takes the local `safeCounter`'s zero and keeps it. `sanitizeRunLogEntry` in the same file drops on a non-finite timestamp and is the WRONG analog, so the JSDoc names it and says why: degrading the timestamp costs a sort order only Phase 14 reads, degrading the id costs the achievement.
- **Drop, de-duplicate-earliest, bound — in that order, and in the same DIRECTION as both write sites.** The plan asked for the ring's `slice(-…)`; both shipped sites use `slice(0, …)` and one of them explicitly rejects `slice(-…)` for this collection. Corrected, with the disagreement recorded.
- **D-22 asserted as commutativity, after a probe caught the specified form being vacuous.** The plan's own fixture arrangement let an incoming-wins merge return the earliest timestamp anyway. Both argument orders are now asserted; the case reds in both store instantiations against the inverted rule.
- **Every new store-level claim probed against a deliberately broken implementation, then the probe thrown away.** Not a convention this repo had; it is what turned three assertions from plausible into measured.
- **`npm test` green at 111 files / 848 tests** (847 passed, 1 skipped — the explicit memory-store cold-start skip), up from the phase base of 111/829.

## Task Commits

1. **Task 1: `sanitizeAchievementRecord` — drop the id, default the timestamp, bound after the drop** — `e669f20` (feat)
2. **Task 2: Both stores, the reconcile and the clone — the three claims a parser test cannot make** — `c86bb30` (test)

**Plan metadata:** see the `docs(13-03)` commit that follows this file.

_The plan flagged Task 1 `tdd="true"` and the orchestrator resolved TDD-applicability to false, so no RED gate was manufactured. The plan's `<action>` asked for the test block first and a watched RED anyway, and that is what happened: with only the describe block written, `-t "achievements"` reported `Tests 5 failed | 4 passed | 46 skipped (55)` — the five persistence cases red on a defaulted record, and the four that passed are exactly the ones (non-vacuity, default-degrade, independence, no-migration) that pass BECAUSE the field was always defaulted. That split is the plan's own prediction._

## Files Created/Modified

- `src/services/storage/parseBlob.ts` — `sanitizeAchievementUnlock` and `sanitizeAchievementRecord` beside the daily pair, the `isKnownAchievementId` import edge, the assignment in `sanitizeTelemetry`, and a FOURTH paragraph on its JSDoc (the first three untouched)
- `tests/storage.progress-v4.test.ts` — a `sanitizeAchievementRecord` describe block, a sibling of the daily one, with a `parseWithAchievements` harness that puts a known campaign payload, endless record and daily record behind every case. 46 → 55 cases
- `tests/achievements.record.test.ts` — extended with five store-level cases inside plan 13-01's parameterised body, the harness signature widened to a `StoreFlavor` object, and the header's "NOT evidence about" paragraph rewritten rather than left stale. 14 → 24 cases

## Decisions Made

See `key-decisions` in the frontmatter. The three that a later reader is most likely to undo:

1. **The read bound keeps the first entries.** All three sites that trim this collection now agree. A "cleanup" that unifies the read bound onto the recent-run ring's `slice(-…)` would make the read path drop the achievements the player has held longest — the one direction D-17 forbids.
2. **The D-22 case asserts both argument orders.** Deleting one of them restores a case that passes against an incoming-wins merge. The measurement that says so is in the case's own JSDoc.
3. **The bound is structurally unreachable and the case says so.** Anyone "fixing" that by seeding sixty-five known ids will find the catalog has twelve. The bound is the fence that survives a relaxation of the id check, not a capacity limit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The read bound trims in the plan's stated direction only if the collection disagrees with itself — corrected to `slice(0, …)`**

- **Found during:** Task 1 (writing the sanitizer)
- **Issue:** The plan's `<action>` and its acceptance criterion both specify `slice(-ACHIEVEMENT_UNLOCK_BOUND)`. Two independent reasons that is wrong, both measurable in the shipped tree. (a) Both sites that already trim this collection use `slice(0, …)`, and `mergeAchievementUnlocks`' own comment REJECTS the other form by name: *"`slice(0, …)` and NOT `slice(-…)`: the recent-run ring keeps the NEWEST because it is a window on recent activity, whereas an unlock is permanent (D-17) and dropping the oldest would un-earn the achievements the player has held longest."* A read bound in the opposite direction makes the parser un-earn exactly what the write path protected. (b) The plan's own test fixture contradicts it: the trim-after-drop case is specified as *"the leading ones are garbage and the trailing ones are real"*, which discriminates drop-first from trim-first only under keep-FIRST. Under `slice(-64)` a trim-first bug keeps the trailing real entries and the case passes against the defect it exists to catch.
- **Fix:** `out.unlocked = [...byId.values()].slice(0, ACHIEVEMENT_UNLOCK_BOUND)`, with a JSDoc paragraph naming both shipped sites, stating the D-17 reason, and recording that the plan said otherwise so the next reader finds a decision rather than a discrepancy.
- **Files modified:** `src/services/storage/parseBlob.ts`
- **Verification:** the trim-after-drop case passes with three real unlocks surviving 70 padding entries; `npx vitest run tests/storage` green at 6 files / 127 tests.
- **Committed in:** `e669f20` (part of the Task 1 commit)

**2. [Rule 1 - Bug] `13-VALIDATION.md`'s `-t "earliest"` row did not bind — vitest's `-t` filter is case-SENSITIVE**

- **Found during:** Task 2 (running the plan's second verify)
- **Issue:** The case was first named *"…keeps the EARLIEST timestamp…"*, matching the plan's own emphasis. MEASURED: `npx vitest run tests/achievements.record.test.ts -t "earliest"` then printed `Test Files 1 skipped (1)` / `Tests 24 skipped (24)` and **exited 0**. This is the exact trap the plan's base table names — *"a non-matching filter exits 0"* — arriving through CASE rather than through a wrong word, which the table does not cover. The gate would have reported success while observing nothing, and D-22 is the claim the plan says no shipped test would otherwise catch.
- **Fix:** the case name spells `earliest` in lower case, with a comment recording the measurement so a later rename does not silently unbind the gate again.
- **Files modified:** `tests/achievements.record.test.ts`
- **Verification:** `-t "earliest"` now prints `Tests 2 passed | 22 skipped (24)` — `passed` present, and 2 is one case in each of the two store instantiations, which is what the plan's `fails_when` requires.
- **Committed in:** `c86bb30` (part of the Task 2 commit)

**3. [Rule 2 - Missing Critical] The D-22 case exactly as specified PASSED against an incoming-wins merge — re-stated as commutativity**

- **Found during:** Task 2, at a throwaway probe run before trusting the new case
- **Issue:** The plan specifies the case precisely: two blobs sharing one unlocked id at different timestamps, differing on a second id each, handed to `mergeTelemetryBlobs`; assert all three ids, assert the shared id carries the earlier timestamp, then assert the later timestamp appears nowhere. Written that way it passed against a deliberately inverted `mergeAchievementRecords` (the earliest-wins guard replaced by `if (true)`, i.e. last-writer-wins). The reason is the argument ORDER, not the assertions: `mergeTelemetryBlobs` iterates `[...memory.unlocked, ...incoming.unlocked]`, so an incoming-wins loop returns whichever copy is passed SECOND — and the natural fixture arrangement puts the earlier timestamp on `incoming`, where incoming-wins and earliest-wins give the same answer. The plan warned that a containment-only assertion would pass against an incoming-wins copy; the measured hole is wider than that, because the TIMESTAMP assertion passes too.
- **Fix:** the case now merges in BOTH argument orders and requires the same answer from each. Earliest-wins is commutative; incoming-wins is not, so the pair cannot be satisfied by any order-dependent tiebreak. The measurement is written into the case's own JSDoc.
- **Files modified:** `tests/achievements.record.test.ts`
- **Verification:** re-probed with the same inversion — the case now reds in BOTH store instantiations (`Tests 2 failed | 22 skipped (24)`); probe reverted, `git status` confirms `telemetry.ts` unmodified.
- **Committed in:** `c86bb30` (part of the Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical)
**Impact on plan:** No scope change, no new file, and no change to the plan's file list. All three are corrections to details the plan specified in good faith, and two of them are corrections to the plan's own falsifiability rather than to its intent — the trim direction and the merge-order fixture each made a case unable to fail against the defect it names. Every other measured base the plan supplied was confirmed exactly: `tests/storage.progress-v4.test.ts` green at 46 before and 55 after, `npx vitest run tests/storage` at 6 files / 118 tests before and 127 after, the `'../achievements'` import count 0 before and 1 after, typecheck exit 0 with no `error TS`, lint exit 0 at `✖ 3 problems (0 errors, 3 warnings)`, and — as the plan predicted — `parseBlob.ts` compiling clean throughout, so nothing but the vitest cases would have noticed if the sanitizer had never been wired in.

## Issues Encountered

- **The 13-02 executor's two premises were preserved, and this is the one thing it asked by name.** Its deviation 2 recorded that plan 13-01's store suite needed two repairs and that *"13-03 rewrites that file and must preserve both."* The file was EXTENDED rather than rewritten: the fixture still models the `byMode.campaign` region and the firewall seeding run still loses a life. Verified directly — `git diff ee1e158..HEAD -- tests/achievements.record.test.ts | grep '^-'` matches neither line, so neither premise was touched at all. The only structural change is the harness signature (two positional parameters → one `StoreFlavor` object), which leaves all five of 13-01's case bodies byte-identical.
- **The probe measurements, reported in full rather than selectively.** Four throwaway inversions were run against the new cases. Three isolate cleanly: incoming-wins reds only the D-22 case (2 failures); a whole-collection timestamp reduce reds only the cross-wiring case (2 failures); resetting `achievements` inside `mergeRunIntoTelemetry` — the NARROW D-23 form, a subsequent run erasing the set — reds the D-23 case, the cardinality case and 13-01's idempotency case (6 failures). The fourth, a `cloneTelemetryBlob` that drops the field outright, reds nine cases including plan 13-01's persistence case. So the plan's claim that *"no test names `cloneTelemetryBlob` directly"* is accurate about NAMING, but 13-01's suite already caught the crudest form of the defect; what this plan's D-23 case adds is the narrower one, where the field is written correctly and then reset by the NEXT run. Recorded this way because the opposite framing — claiming this plan closed a gap 13-01 had already half-closed — would overstate it.
- **Nothing required an Expo or React Native lookup, as the dispatch predicted.** This plan touches one storage module and two node-environment suites, adds no package, imports no Expo or React Native module and renders nothing. No `npm install` or `npx expo install` ran.
- **`npm test` was run and is reported, unlike in 13-02.** The plan's `<verification>` asks for it here. Exit 0, `Test Files 111 passed (111)` / `Tests 847 passed | 1 skipped (848)`, and all five `assert-*.mjs` scripts OK — including `assert-streak-evidence`, which explicitly reports *"parseBlob does not restate the rule"*, so this plan's edits to that file did not regrow a second evidence source. Nothing named a file under `src/runtime/**` or `tests/ui/**`, so there was no sibling-attributed failure to route. Plan 13-05 still owns the authoritative tree-wide gate.
- **Requirements were not marked complete, correctly.** `requirements.ready-ids` holds N-ACH-02 because sibling plans also declare it and have no SUMMARY yet. It is recorded in this SUMMARY's `requirements-completed` and flips when the last declaring plan closes.

## Known Stubs

None. Both sanitizer functions are shipping code on the live read path, and all fourteen new cases assert properties of shipped behaviour. Four things are deliberately ABSENT or deliberately unreachable rather than stubbed, each stated at its site:

- **The `slice(0, ACHIEVEMENT_UNLOCK_BOUND)` fence is structurally unreachable while the unknown-id drop stands.** De-duplication caps a legitimate set at the catalog's twelve, well under 64. That is what the bound is FOR — the cap that survives a future relaxation of the id check — and the trim case asserts `toBeLessThanOrEqual` and says plainly that no test can make it fire, rather than inventing a sixty-fifth achievement to force it.
- **The memory store's cold-start case is an explicit `it.skip`,** with the reason in the test name. It is not deferred work: the store has no disk, so there is nothing a second closure could re-open. Recorded here for visibility because a `skipped` line in a suite summary is exactly the kind of thing that later reads as an unfinished test. Not filed in `.planning/WINDOWS.md`: the ledger's `skipped-test` kind is for a skip *left behind*, and this one is a designed non-applicability the plan itself specified — filing it would block `/gsd-ship` on a non-defect.
- **No `assert-*.mjs` script guards the merge tiebreak,** and none is claimed. The plan's threat register says the same, citing WINDOWS #26: `assert-streak-evidence.mjs` reaches only a consumer's own body and would not see a cross-wire one function away. The two vitest cases are the guard.
- **WINDOWS #27 is NOT closed.** `sanitizeAggregateMap` in this same file still has no key cap and still copies every key it finds on every parse. This plan did not touch it. It is named at three sites — the bound's comment in `parseBlob.ts`, the cardinality case's failure message, and the header of `tests/achievements.record.test.ts` — precisely so the achievements bound is not read as having closed it.

## Threat Flags

None. No new network endpoint, no auth path, no file access pattern and no schema change at a trust boundary — the `achievements` field crossed the parse boundary in plan 13-01 and this plan is the first code to READ it, which is the plan's own threat model rather than a new surface. All four dispositions in the plan's register are discharged as written:

- **T-13-01 (mitigate, high)** — the stored id is validated by `isKnownAchievementId` imported from the module that mints it; `parseBlob.ts` contains no literal achievement id (checked id-by-id against the catalog source). Asserted by the unknown-id case, whose hostile fixture is a hard literal and is itself asserted not to be a real id.
- **T-13-02 (mitigate, medium)** — bounded on read after the drop loop, with the cardinality alarm asserting 256 seeded entries yield at most the catalog's twelve, in both stores.
- **T-13-08 (mitigate, medium)** — whole `{ id, at }` entries keyed and merged as units, earliest wins, proved by the commutativity case and the disjoint-ids case.
- **T-13-09 (accept, low)** — a hand-written finite non-negative `at` is still accepted, by design, and the accepted reason is unchanged: the only consumer is Phase 14's recency order, there is no server, and the alternative un-earns an achievement (D-17/D-21).
- **T-13-SC (accept)** — no package-manager install ran and no package was added.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **SC-3 is met at the storage layer.** An unlock written today survives an app kill, a blob written by yesterday's build reads clean with the field defaulted, a hand-edited blob loses exactly the entries it invented, and a reconcile cannot walk a timestamp forward. Both hand-mirrored stores agree, separately.
- **Phase 14 can read `telemetry.achievements.unlocked` and trust three things:** every id in it is one the catalog minted, every `at` is a non-negative integer, and the collection holds at most one entry per id. The display ORDER is not storage's — `13-UI-SPEC.md` makes it catalog declaration order, derived in the host.
- **Wave-3 sibling 13-04 was untouched.** Nothing under `src/runtime/**` or `tests/ui/**` was read or written, and the full-suite run named no file under either path.
- **Open for plan 13-05:** the authoritative tree-wide gate (new totals measured here as 111 files / 848 tests for its baseline), the `__purity_probe` eslint-block presence check, the twelve threshold values that no human has yet judged, and WINDOWS #27, which this plan deliberately did not close.

---
*Phase: 13-achievements*
*Completed: 2026-09-28*

## Self-Check: PASSED

- `src/services/storage/parseBlob.ts`, `tests/storage.progress-v4.test.ts`, `tests/achievements.record.test.ts` all present on disk.
- Commits `e669f20` and `c86bb30` both found in `git log --oneline --all`.
- `git rev-list --count ee1e158..HEAD` = **2**, matching the `commits: 2` recorded above.
- Every `<acceptance_criteria>` item from both tasks re-run and passing; both plan-level `<verification>` blocks re-run and reported.
