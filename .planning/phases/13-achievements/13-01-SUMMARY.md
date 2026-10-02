---
phase: 13-achievements
plan: 01
subsystem: storage
tags: [achievements, telemetry, asyncstorage, react-native, eslint, vitest]

# Dependency graph
requires:
  - phase: 09-run-telemetry-storage-v4
    provides: the v4 `TelemetryBlob`, its sixteen aggregate fields, `recordRunEnd` and the two hand-mirrored stores
  - phase: 11-endless-mode
    provides: `EndlessRecord`, `ResultOverlay`'s endless arm, `showRunLines` and `waveBuildFailureKind`
  - phase: 12-daily-challenge
    provides: `DailyRecord`, the additive-v4-field precedent, `mergeDailyRecord(s)`, the both-stores firewall harness and `PlayingHost`'s single-publication-site idiom
provides:
  - "`src/services/achievements/` — the catalog as data, a pure evaluator, and the read-path id predicate"
  - "`AchievementSnapshot` — a read-only telemetry view that imports no storage type (D-20)"
  - "`TelemetryBlob.achievements` — an additive v4 field with no version bump (D-13), reaching all three of D-23's sites"
  - "`mergeAchievementUnlocks` (per-run fold) and the earliest-wins record merge (D-22)"
  - "`RecordRunEndResult` — `recordRunEnd`'s widened return carrying this write's newly-unlocked ids (D-19)"
  - "`src/runtime/overlays/achievementLines.ts` — the shared pure classifier and its two-line cap"
  - "The unlock block on `ResultOverlay`, and the id-to-display-name mapping in the `app` tier"
  - "An AST-level purity block for `src/services/achievements/**`, observed by the `__purity_probe` gate"
affects: [13-02 catalog expansion, 13-03 read-path sanitizer and merge battery, 13-04 daily panel and UI battery, 13-05 device verification, 14-achievements-screen]

actuals:
  tokens: 26122
  tasks: 1
  # MEASURED with `git rev-list --count <plan_head_before>..HEAD` at close-out: the task
  # commit plus this SUMMARY's own metadata commit. Re-running that command returns the
  # same number.
  commits: 2
plan_head_before: afae144cc4fb4d8e28770ac9563a37a016e361e9

tech-stack:
  added: []
  patterns:
    - "Structurally-compatible read-only snapshot view instead of a storage import (the `src/render/overlayMetrics.ts` shape, applied to a policy module for the first time)"
    - "A widened `recordRunEnd` return as the carrier for a per-write delta the post-write blob cannot express"
    - "Keyed-collection merge with an EARLIEST-wins tiebreak — the inversion of `mergeDailyRecords`"
    - "An eslint purity block whose own presence is observed by a probe gate, not inferred from a green lint"
    - "A standalone pure classifier module inside `src/runtime/overlays/` (a new file shape for this tree)"

key-files:
  created:
    - src/services/achievements/catalog.ts
    - src/services/achievements/evaluate.ts
    - src/services/achievements/index.ts
    - src/runtime/overlays/achievementLines.ts
    - tests/achievements.record.test.ts
    - tests/ui/ResultOverlay.achievements.test.tsx
  modified:
    - src/services/storage/types.ts
    - src/services/storage/telemetry.ts
    - src/services/storage/memoryStore.ts
    - src/services/storage/asyncStorageStore.ts
    - src/services/storage/index.ts
    - src/runtime/overlays/ResultOverlay.tsx
    - src/runtime/GameScreen.tsx
    - app/_components/PlayingHost.tsx
    - eslint.config.js
    - tests/ui/PlayingHost.daily-run.test.tsx

key-decisions:
  - "The React `key` for an unlock line pairs `line.kind` with the render index rather than using `kind` alone — the two-name case renders two `'name'` lines and `kind` alone collides, and the text is not usable either because the classifier deliberately never de-duplicates."
  - "`handleRunEnded`'s dependency array stays on ONE line with its first three entries in order: `tests/ui/PlayingHost.endless-host.test.ts` slices the callback body out with a regex anchored on exactly that shape, and breaking the literal across lines reds five of its cases at once."
  - "The unlock-write bound keeps the EARLIEST entries (`slice(0, N)`), not the newest — the recent-run ring keeps the newest because it is a window on recent activity, whereas an unlock is permanent (D-17) and dropping the oldest would un-earn what the player has held longest."
  - "Prose in `ResultOverlay.tsx` deliberately avoids spelling the single-line-clamp attribute, because the gate that pins it to one occurrence is a grep and a grep cannot tell a comment from an AST node."

patterns-established:
  - "A named control must have an observing command, and the command must be the one whose output MOVES with the control's presence — `npm run lint` exits 0 against a clean achievements directory whether or not the purity block exists, so the `__purity_probe` gate is the control and the lint run is not."
  - "A comment that names a banned construct is safe against an AST-level gate and UNSAFE against a grep-level one; say which kind guards the rule at the site."

requirements-completed: [N-ACH-01, N-ACH-02, N-ACH-03]

coverage:
  - id: D1
    description: "A run whose telemetry crosses a catalog threshold persists the unlock with a timestamp AND reports its id on `recordRunEnd`'s widened return, in one write with no extra storage read — asserted separately against both hand-mirrored stores."
    requirement: "N-ACH-02"
    verification:
      - kind: integration
        ref: "tests/achievements.record.test.ts#a qualifying run unlocks, persists and reports it on the widened return (D-14 / D-19)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Finishing the same qualifying run a second time returns an empty delta and leaves the stored timestamp unchanged — idempotency as a set difference, not a per-achievement flag."
    requirement: "N-ACH-02"
    verification:
      - kind: integration
        ref: "tests/achievements.record.test.ts#the same qualifying run a second time reports nothing and moves no timestamp (SC-2 / D-02 / D-17)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A run that crosses no threshold returns an empty delta and writes no unlock entry — the paired positive control that keeps every absence assertion non-vacuous."
    requirement: "N-ACH-02"
    verification:
      - kind: integration
        ref: "tests/achievements.record.test.ts#a run that crosses nothing reports nothing and writes nothing"
        status: pass
    human_judgment: false
  - id: D4
    description: "The same achievement unlocks under campaign, endless AND daily — the evaluation sits outside every mode gate."
    requirement: "N-ACH-02"
    verification:
      - kind: integration
        ref: "tests/achievements.record.test.ts#every mode unlocks the same achievement — the evaluation is outside every mode gate (SC-5 / D-12)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The achievements write leaves `bestByLevel`, `unlocked` and `bestScore` byte-identical to their pre-call (non-default) values, and leaves `bestByLevel` empty on a fresh store."
    requirement: "N-ACH-02"
    verification:
      - kind: integration
        ref: "tests/achievements.record.test.ts#the achievements write touches no campaign state (T-13-05 / SC-5)"
        status: pass
      - kind: integration
        ref: "tests/achievements.record.test.ts#a qualifying daily run on a FRESH store leaves bestByLevel empty"
        status: pass
    human_judgment: false
  - id: D6
    description: "`ResultOverlay` renders `Unlocked · {name}` from a display-name string array, renders one name plus `and {n−1} more` at n ≥ 3, and renders nothing at all when the array is empty."
    requirement: "N-ACH-03"
    verification:
      - kind: automated_ui
        ref: "tests/ui/ResultOverlay.achievements.test.tsx#one unlock renders one line, after the records and before the controls"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/ResultOverlay.achievements.test.tsx#no unlocks render NO block — an absence, not an empty state"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/ResultOverlay.achievements.test.tsx#three unlocks render one name and a count, capped at two lines (D-05 AMENDED)"
        status: pass
    human_judgment: false
  - id: D7
    description: "`achievementLines()` returns at most `ACHIEVEMENT_LINES_MAX = 2` entries for any input — the cap is a property of the component, not a promise by the host."
    requirement: "N-ACH-03"
    verification:
      - kind: automated_ui
        ref: "tests/ui/ResultOverlay.achievements.test.tsx#three unlocks render one name and a count, capped at two lines (D-05 AMENDED)"
        status: pass
    human_judgment: false
  - id: D8
    description: "`PlayingHost` maps the returned ids to catalog display names at ONE site and hands `GameScreen` a plain string array; a run that unlocks nothing republishes an empty array rather than a stale one."
    requirement: "N-ACH-03"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#the ids recordRunEnd returns reach the panel as catalog display NAMES (13-01 / N-ACH-03 / D-19)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#a run that unlocks nothing hands the panel an empty array, not a stale one (D-02)"
        status: pass
    human_judgment: false
  - id: D9
    description: "`src/runtime` imports no `src/services` module, and the achievement policy imports no storage module and reads no clock or RNG — the latter enforced at AST level by a new eslint block whose own presence is observed."
    requirement: "N-ACH-01"
    verification:
      - kind: other
        ref: "npm run lint (exit 0) + grep -rnE \"^import .*(services|storage)\" src/runtime/ | wc -l == 0"
        status: pass
      - kind: other
        ref: "__purity_probe gate — writes a probe carrying all five banned constructs, counts eslint error lines, deletes it: purity_probe_errors=5"
        status: pass
    human_judgment: false
  - id: D10
    description: "A device check at 320x568pt must confirm the campaign-win `ResultOverlay` with a 2-line unlock block fits inside the safe area with `Menu` reachable without scrolling, AND must confirm the bottom safe-area INSET is zero — 548 usable assumes it, and a non-zero inset drives `ACHIEVEMENT_LINES_MAX` to 1."
    requirement: "N-ACH-03"
    verification: []
    human_judgment: true
    rationale: "jsdom performs no layout and supplies no safe-area insets, so no render assertion in this repo is evidence for it. Registered as WINDOWS #28 (with #16, #17 and #29) and discharged by plan 13-05, never by a jsdom render."

# Metrics
duration: 62 min
completed: 2026-09-28
status: complete
---

# Phase 13 Plan 01: End-to-end achievement unlock Summary

**One real achievement — `bricks-1000` — wired from a catalog entry declared as data, through a pure predicate over a read-only telemetry view, to a single evaluation inside `recordRunEnd` outside every mode gate, to a timestamped union in the v4 blob, to a set difference carried out on a widened return, to `Unlocked · 1000 Bricks` on the result panel the player is already looking at.**

## Performance

- **Duration:** 62 min
- **Started:** 2026-09-28T20:44:00Z
- **Completed:** 2026-09-28T21:46:00Z
- **Tasks:** 1 (a `type="tracer"` task spanning sixteen files)
- **Files modified:** 16 (6 created, 10 modified)

## Accomplishments

- **The achievements policy exists and is provably pure.** `src/services/achievements/` holds the catalog as data (`Achievement`, `ACHIEVEMENT_CATALOG`, `ACHIEVEMENT_NAME_MAX`, `isKnownAchievementId`), the evaluator (`qualifyingAchievements`, `newlyUnlockedAchievements`) and a named-export barrel. It imports no storage type — `AchievementSnapshot` is a read-only structural view, the `src/render/overlayMetrics.ts` shape applied to a policy module for the first time in this tree (D-20).
- **The unlock persists, with its moment.** `TelemetryBlob.achievements` is an additive v4 field with no `PROGRESS_VERSION` bump (D-13), reaching all three of D-23's sites — `defaultTelemetryBlob`, `cloneTelemetryBlob` and `mergeTelemetryBlobs`. Two of the three were compiler-forced exactly as measured; the clone site is the one that would otherwise have had a campaign run silently erase the unlock set.
- **The delta crosses the store boundary.** `recordRunEnd` now returns `RecordRunEndResult` (D-19) — the first change to that signature since Phase 9 — because by the time it returns, the union is persisted and the set difference is gone. Both hand-mirrored stores were edited by hand and every claim about them is asserted separately.
- **The evaluation sits outside every mode gate**, and that is held behaviourally rather than structurally: three fresh stores drive one qualifying run each under campaign, endless and daily, and all three must report the id.
- **The panel tells the player.** `achievementLines()` is one pure classifier with a two-line cap that is a property of the component; `ResultOverlay` renders the block after the badge and before the controls, gated on the existing `showRunLines`, with zero new `StyleSheet` entries. `PlayingHost` maps ids to catalog display names at one site in the `app` tier, so the panel never receives a stored string (T-13-01).
- **The purity rule has an observing command.** The new `src/services/achievements/**` eslint block bans the clock, the RNG and the storage import at AST level — and the `__purity_probe` gate, which prints 5 with the block and 0 without, is what proves the block exists. A green `npm run lint` does not, and the code says so at the site rather than implying otherwise.

## Task Commits

1. **Task 1: End-to-end "the game notices one thing you did and tells you"** — `9230236` (feat)

_One commit: the plan records the storage-half / UI-half split as a known option and explicitly does NOT pre-authorise it. The context budget did not force it, so the tracer shipped whole._

## Files Created/Modified

- `src/services/achievements/catalog.ts` — `Achievement`, `AchievementSnapshot`, `ACHIEVEMENT_CATALOG` (one entry), `ACHIEVEMENT_NAME_MAX`, `isKnownAchievementId`
- `src/services/achievements/evaluate.ts` — `qualifyingAchievements` and `newlyUnlockedAchievements`, both pure and total
- `src/services/achievements/index.ts` — named-export barrel, no `export *`
- `src/runtime/overlays/achievementLines.ts` — `ACHIEVEMENT_LINES_MAX`, `AchievementLine`, `achievementLines`; zero imports
- `src/services/storage/types.ts` — `AchievementUnlock`, `AchievementRecord`, `defaultAchievementRecord`, `ACHIEVEMENT_UNLOCK_BOUND`, `RecordRunEndResult`, and `achievements` on `TelemetryBlob`
- `src/services/storage/telemetry.ts` — `mergeAchievementUnlocks` (exported), `mergeAchievementRecords` (module-private), and the clone/merge sites
- `src/services/storage/memoryStore.ts`, `src/services/storage/asyncStorageStore.ts` — the same behavioural edit, by hand, in two different mutation styles
- `src/services/storage/index.ts` — the new names re-exported; they are unreachable from a test until they are
- `src/runtime/overlays/ResultOverlay.tsx` — the `unlockedAchievements` prop and the unlock block
- `src/runtime/GameScreen.tsx` — the prop threaded to the `ResultOverlay` arm (the `DailyResultOverlay` arm is plan 13-04's)
- `app/_components/PlayingHost.tsx` — the state, the single derivation site, three value captures and one derivation
- `eslint.config.js` — the `src/services/achievements/**` purity block
- `tests/achievements.record.test.ts` — seven cases, run against both stores
- `tests/ui/ResultOverlay.achievements.test.tsx` — four cases under jsdom
- `tests/ui/PlayingHost.daily-run.test.tsx` — extended: `newlyUnlocked` on the shared mock, plus two new cases

## Decisions Made

- **The React key for an unlock line is `${line.kind}-${i}`, not `line.kind`.** The plan asked for `kind` as the key discriminant; at n = 2 that renders two `'name'` lines and the keys collide. The text is not usable as a key either, because the classifier deliberately never de-duplicates its input. `kind` is still read as the discriminant and never re-derived.
- **`handleRunEnded`'s dependency array stays on one line.** See Deviations — this is a shipped source-contract the plan did not name.
- **The write bound keeps the earliest entries.** `slice(0, ACHIEVEMENT_UNLOCK_BOUND)`, not `slice(-N)`. The recent-run ring keeps the newest because it is a window on recent activity; an unlock is permanent (D-17), so dropping the oldest would un-earn the achievements a player has held longest. Stated at the site.
- **Comment prose in `ResultOverlay.tsx` avoids spelling the single-line-clamp attribute.** The gate pinning it to exactly one occurrence is a grep, and a grep cannot tell a comment from an AST node — unlike the eslint blocks elsewhere in this tree. Writing it in prose put the count at 2. The same hazard is annotated in `telemetry.ts`, where the plan REQUIRES the banned `mergeAchievements(ids, timestamps)` signature to be named in prose as an anti-pattern: that paragraph now says outright that a check for it must read declarations, not file text.
- **The store test derives its expectations from the catalog** rather than listing an id or a threshold. `QUALIFYING_BRICKS = 1_000_000` is the `FAR_WAVE = 10000` idiom — far past any cumulative threshold D-09's catalog could set — and the expected id set is computed by running the catalog's own predicates. Three non-vacuity guards sit in a dedicated case: the catalog is non-empty, a big run crosses at least one threshold, and a fresh blob crosses none.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `handleRunEnded`'s dependency array must stay on one line**

- **Found during:** Task 1, at the full-suite gate
- **Issue:** Adding `publishUnlockedAchievements` to the dependency array and reformatting it across multiple lines red **five** cases in `tests/ui/PlayingHost.endless-host.test.ts` at once. That file is a source-contract suite: it slices `handleRunEnded`'s body out of the file text with a regex anchored on `\n {4}\[platform, store, levelId[^\]]*\],`. A multi-line literal breaks the anchor, the extractor returns nothing, and every assertion downstream of it fails — none of them about dependencies. The plan named the dependency-array edit but not this constraint on its shape.
- **Fix:** Restored the single-line form, `[platform, store, levelId, publishDailyPanel, publishUnlockedAchievements],`, with a comment at the site naming the extractor, its anchor and the five-case blast radius. The extractor tolerates additive growth by design — its own header says so — so the append is exactly the shape it expects.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** `npx vitest run tests/ui/PlayingHost.endless-host.test.ts` — 27 passed, and the full suite green at 109 files / 818 tests.
- **Committed in:** `9230236` (part of the task commit)

**2. [Rule 1 - Bug] Duplicate React keys on the two-name unlock block**

- **Found during:** Task 1, writing `ResultOverlay.tsx`
- **Issue:** The plan specifies `line.kind` as the `key`. At n = 2 the classifier returns two `{ kind: 'name' }` lines, so both `<Text>` elements would carry the key `name` — a duplicate-key warning and an unstable reconciliation, in the exact case the two-row budget exists for.
- **Fix:** `key={`${line.kind}-${i}`}`. `kind` is still read as the discriminant and never re-derived from the text; the index disambiguates. The comment at the site records why the text is not usable as a key (the classifier deliberately never de-duplicates).
- **Files modified:** `src/runtime/overlays/ResultOverlay.tsx`
- **Verification:** `npx vitest run tests/ui/ResultOverlay.achievements.test.tsx` — 4 passed, including the two-line cap case.
- **Committed in:** `9230236` (part of the task commit)

**3. [Rule 1 - Bug] The `numberOfLines` gate was self-invalidated by its own explanatory comment**

- **Found during:** Task 1, at the structural gates
- **Issue:** `grep -c 'numberOfLines={1}'` printed **2**, not 1. The second occurrence was the JSDoc paragraph the plan asks for — the one recording the attribute as a deliberate deviation. Unlike the eslint blocks in this tree, a grep cannot tell a comment from an AST node, so the prose explaining the rule broke the gate that measures it. This is the same defect family the repo has shipped before, reached from the opposite direction.
- **Fix:** Rewrote the paragraph to name `numberOfLines` without the attribute form, and added the sentence saying why the prose is written that way — so the next reader does not "fix" it back.
- **Files modified:** `src/runtime/overlays/ResultOverlay.tsx`
- **Verification:** `grep -c 'numberOfLines={1}' src/runtime/overlays/ResultOverlay.tsx` prints `1`; `grep -rn 'numberOfLines' src/runtime/overlays/` shows the one real attribute and the one comment that does not spell it.
- **Committed in:** `9230236` (part of the task commit)

**4. [Rule 2 - Missing Critical] Two extra cases beyond the plan's case list**

- **Found during:** Task 1, writing the tests
- **Issue:** The plan's `tests/achievements.record.test.ts` case list asserts `bestByLevel` is `{}` after a qualifying daily run, and separately asks for the pre-seeded non-vacuity idiom (assert the preserved value is NON-DEFAULT first). Those two cannot both hold in one case: a store pre-seeded with a campaign win does not have an empty `bestByLevel`. Similarly, the host harness case proves a name is published but says nothing about what happens when nothing fires — and the "no reset anywhere else" claim in `PlayingHost` rests on exactly that.
- **Fix:** Split into two store cases (a pre-seeded preservation case with non-default guards on all three campaign values, plus a fresh-store case asserting the empty map) and added one host case (*a run that unlocks nothing hands the panel an empty array, not a stale one*). Also added a fixtures-are-non-vacuous case and a spoken-label case.
- **Files modified:** `tests/achievements.record.test.ts`, `tests/ui/ResultOverlay.achievements.test.tsx`, `tests/ui/PlayingHost.daily-run.test.tsx`
- **Verification:** 14 + 4 + 14 tests pass across the three files; the daily-run harness went from 12 cases to 14, so there is no case-count regression.
- **Committed in:** `9230236` (part of the task commit)

---

**Total deviations:** 4 auto-fixed (2 bugs, 1 blocking, 1 missing critical)
**Impact on plan:** No scope change. Three of the four are corrections to details the plan specified in good faith and that were wrong or under-specified when executed; the fourth adds coverage the plan's own non-vacuity rule requires. Every measured figure the plan supplied was confirmed exactly — including the two compiler-forced sets, the `__purity_probe` gate's 5-against-0, and the base suite at 107 files / 798 tests.

## Issues Encountered

- **Expo SDK 57 check (action step 12).** `AGENTS.md` binds any change under `src/runtime/**` or `app/**` to the versioned docs. `ctx7` is not installed in this environment and no MCP documentation tool was available, so the check was performed by fetching `https://docs.expo.dev/versions/v57.0.0/` directly (HTTP 200) and reading its SDK index. The result is what the plan predicted and nothing more: this change adds **no Expo API, no Expo module and no package**. The block is `Text` inside an existing panel, and `numberOfLines` is a core React Native `Text` prop. `package.json` confirms `expo ~57.0.24`, `react-native 0.86.3`, `react 19.2.3`. No `npm install` or `npx expo install` was run, as the plan forbids.
- **The `.planning/WINDOWS.md` ledger would not accept an append, for a pre-existing reason.** `gsd-tools windows append` refuses with `Ledger entry 24 has invalid kind: "accepted-cost"` — an existing entry uses a kind outside the verb's current vocabulary. That predates this plan and is out of scope for it (no entry 24 was written here), and ledger population is best-effort and never blocks execution. The two execution deviations that would have been recorded there are fully documented under **Deviations from Plan** above, and neither is a stub, a skipped test or an unrun verify — both are fixed and gated.
- **Requirements were NOT marked complete, correctly.** `requirements.ready-ids` returned `0/3`: N-ACH-01, N-ACH-02 and N-ACH-03 are each declared by sibling plans (13-02 through 13-05) that have no SUMMARY yet, so the shared-ID gate holds them until the last declaring plan finishes. They are recorded in this SUMMARY's `requirements-completed` and will flip when 13-05 closes.
- **The `mergeAchievements(ids, timestamps)` anti-pattern paragraph is grep-visible.** The plan requires the banned signature to be spelled out beside the copy, and an acceptance criterion says the file contains no such function. Verified at the declaration level instead of by grep — a script that strips comments and scans all 23 function declarations in `telemetry.ts` finds zero parameter lists carrying both an id array and a timestamp array. The paragraph now says a check must read declarations, not text.

## Known Stubs

None. Every line shipped in this plan is production code with real error handling on the one path it covers. Three things are deliberately ABSENT rather than stubbed, and each is named where a reader will look for it:

- **The read path.** `parseBlob.ts` is untouched, so on this commit a stored `achievements` field is discarded entirely by `sanitizeTelemetry` (which starts from `defaultTelemetryBlob()`). That is a **stricter** posture than the finished phase, not a weaker one, and it is stated in T-13-02 and in `tests/achievements.record.test.ts`'s header so nobody infers a read-side gate that does not yet exist. Plan 13-03 owns it.
- **`DailyResultOverlay`'s copy of the block.** Byte-identical to its phase base (verified); plan 13-04 owns it, and touching it here would collide with a sibling wave.
- **The other 7–11 catalog entries.** Plan 13-02. The one shipped entry is a real achievement, not a placeholder, and is unchanged by that expansion.

## Threat Flags

None. No new network endpoint, no auth path, no file access pattern and no schema change at a trust boundary beyond the one the plan's `<threat_model>` already registers (`telemetry.achievements`, T-13-01 through T-13-06). The mitigations assigned `mitigate` are all implemented: the id-to-name mapping at one host site (T-13-01), the write bound (T-13-02), the outside-the-campaign-gate placement plus its behavioural case (T-13-05), and the wrapped predicate call (T-13-06). No package-manager install ran (T-13-SC).

## Self-Check: PASSED

- All six created files exist on disk.
- Commit `9230236` exists in `git log`.
- All ten `<automated>` gates re-run after the final edit: three vitest files green (14 / 4 / 14), `npm run typecheck` exit 0 with no `error TS`, `npm run lint` exit 0 (`✖ 3 problems (0 errors, 3 warnings)` — the shipped base), `purity_probe_errors=5` with the probe removed afterwards, `StyleSheet` keys `18`, `numberOfLines={1}` count `1`, `src/runtime` service imports `0`, `npm test` exit 0 at **109 files / 818 tests** with all five `assert-*.mjs` scripts OK.
- Every acceptance criterion checked, including the ones with no command in the verify block: `DailyResultOverlay.tsx` unchanged (`git diff --stat` empty), `ResultOverlay.mode` still `'campaign' | 'endless'`, `achievementLines.ts` has zero `import` statements, both stores name `mergeAchievementUnlocks`, `PlayingHost` has exactly one id-to-name mapping site, and no function in `telemetry.ts` takes parallel id/timestamp arrays.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Wave 2 (plan 13-02, the catalog expansion to 8–12 entries) is unblocked. Everything it needs is in place and none of it changes shape: the `Achievement` type, the catalog array, `AchievementSnapshot` (which 13-02 widens field by field as its predicates need counters — the view deliberately names only `lifetime.bricksBroken` today), and the evaluator's catalog parameter.

Notes for the plans that follow:

- **13-02** will need to revisit two guards in `tests/achievements.record.test.ts` if it adds an entry that fires on a fresh blob (e.g. "play one run"): the *fixtures are non-vacuous* case asserts a default blob qualifies for nothing, and it will red loudly with a message saying so rather than shrinking silently.
- **13-03** owns the read path. `isKnownAchievementId` is exported and ready for `parseBlob.ts` to import across the module boundary, exactly as `isValidDateKey` is. D-21's split rule — bad id drops the entry, bad timestamp defaults and keeps it — has no in-repo precedent and must be written into the sanitizer's JSDoc.
- **13-04** adds the daily panel's block and the classifier's exhaustive battery. `achievementLines` is complete and total; nothing about it should change.
- **13-05** must discharge WINDOWS #16, #17, #28 and #29 on a device. **#28 is the binding one and is new**: it must confirm the bottom safe-area INSET is zero, not merely that the panel fits — the 26px of spare that makes a two-line cap legal assumes it, and a non-zero inset drives `ACHIEVEMENT_LINES_MAX` to 1.

---
*Phase: 13-achievements*
*Completed: 2026-09-28*
