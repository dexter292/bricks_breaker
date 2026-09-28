---
phase: 13-achievements
verified: 2026-09-28T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/phases/13-achievements/13-01-PLAN.md"
  - ".planning/phases/13-achievements/13-01-SUMMARY.md"
  - ".planning/phases/13-achievements/13-02-PLAN.md"
  - ".planning/phases/13-achievements/13-02-SUMMARY.md"
  - ".planning/phases/13-achievements/13-03-PLAN.md"
  - ".planning/phases/13-achievements/13-03-SUMMARY.md"
  - ".planning/phases/13-achievements/13-04-PLAN.md"
  - ".planning/phases/13-achievements/13-04-SUMMARY.md"
  - ".planning/phases/13-achievements/13-05-PLAN.md"
  - ".planning/phases/13-achievements/13-05-SUMMARY.md"
  - ".planning/phases/13-achievements/13-CONTEXT.md"
  - ".planning/phases/13-achievements/13-PATTERNS.md"
  - ".planning/phases/13-achievements/13-REVIEW.md"
  - ".planning/phases/13-achievements/13-UI-SPEC.md"
  - ".planning/phases/13-achievements/13-VALIDATION.md"
  - "app/_components/PlayingHost.tsx"
  - "docs/ops/ACHIEVEMENTS.md"
  - "docs/ops/PROGRESS-STORAGE.md"
  - "eslint.config.js"
  - "src/runtime/GameScreen.tsx"
  - "src/runtime/overlays/DailyResultOverlay.tsx"
  - "src/runtime/overlays/ResultOverlay.tsx"
  - "src/runtime/overlays/achievementLines.ts"
  - "src/services/achievements/catalog.ts"
  - "src/services/achievements/evaluate.ts"
  - "src/services/achievements/index.ts"
  - "src/services/storage/asyncStorageStore.ts"
  - "src/services/storage/index.ts"
  - "src/services/storage/memoryStore.ts"
  - "src/services/storage/parseBlob.ts"
  - "src/services/storage/telemetry.ts"
  - "src/services/storage/types.ts"
covered_digest: "v1:sha256:e3a02c038d7e1b2f980e5b0a34e1b75adb84bbe2d552934c882b08d206b5ef1a"
behavior_unverified: 0
overrides_applied: 0
gaps: []
deferred:
  - truth: "An achievement earned on an `abandoned` run is announced to the player. Measured by this verifier: 7 of the 12 catalog entries can be newly unlocked by an abandoned run — combo-25, rally-60, cascade-12, pickups-100, bricks-1000, runs-50 and endless-runs-20 — in all three modes. The unlock is persisted and, because D-02's delta is a one-shot set difference, can never be announced at any later run end."
    addressed_in: "Phase 14"
    evidence: "Phase 14 Success Criterion 3: 'An achievements screen shows locked and unlocked entries with their descriptions, and locked entries do not spoil the condition where that would ruin the surprise.' WINDOWS #35 and docs/ops/ACHIEVEMENTS.md Limit 2b both name Phase 14's Achievements screen as the placement. SEE WARNING W2 — Phase 14 SC-3 as written does not require a newly-unlocked marker, so the deferral target is weaker than the deferral's own premise."
advisory:
  - finding: "WINDOWS #28 (status open) still says 'TWO TESTS MOVE WITH IT' for the ACHIEVEMENT_LINES_MAX remedy. Verifier-measured post-WR-02-fix: setting the constant to 1 reds 11 cases across 3 files — 8 in tests/ui/achievementLines.test.ts, 2 in tests/ui/ResultOverlay.achievements.test.tsx, 1 in tests/ui/DailyResultOverlay.test.tsx. #28 names 2 of the 11 and omits DailyResultOverlay.test.tsx entirely. The same two-case figure is carried by 13-05-PLAN's human-check block and 13-05-SUMMARY. WINDOWS #36 and ACHIEVEMENTS.md say 'eight', which is the classifier file's count alone."
    category: other
    reason: "The WR-02 fix (99afd8b) made the constant load-bearing but the ledger entry a maintainer executes the remedy from was not re-synced. Direction of error is loud, not silent — the suite reds. Resolves by amending #28 to name the three files and the measured 11."
    evidence_status: "verifier-measured (mutation run, both directions, source restored byte-identical)"
  - finding: "Phase 14 SC-3 does not contractually carry WR-03's deferral. WINDOWS #35 and ACHIEVEMENTS.md Limit 2b defer the abandon-path announcement to 'Phase 14's Achievements screen, where a newly-unlocked marker has somewhere to live'. Phase 14's SC-3 requires locked and unlocked entries with descriptions and says nothing about a newly-unlocked marker."
    category: architectural
    reason: "A Phase 14 that satisfies its own success criteria verbatim can still leave an abandon-earned unlock permanently indistinguishable from any other. This is the phase's own recurring shape — a named mitigation that nothing requires. Resolves by amending Phase 14 SC-3, or by stating in #35 that the marker is an additional Phase-14 obligation SC-3 does not cover."
    evidence_status: "read from .planning/ROADMAP.md Phase 14 and .planning/WINDOWS.md #35"
  - finding: "AchievementSnapshot's JSDoc states 'this view's whole contract is that it names the subset that is read' and drops daily.history on exactly that rule, yet the type carries endless.bestScore, which no shipped predicate reads. Measured: bestScore occurs in catalog.ts only at the type declaration and in one prose line."
    category: other
    reason: "Zero runtime cost — the only producer is the whole TelemetryBlob, so no store supplies anything extra — but the type breaks its own stated invariant by its own reasoning, and a later reader trusting the sentence would conclude a predicate reads bestScore. Resolves by dropping the field or amending the sentence."
    evidence_status: "verifier-measured grep over src/ and app/"
  - finding: "13-VALIDATION.md is stale relative to the post-code-review tree. Its authoritative gate table records `npm test` at 868 passed | 1 skipped (869) and the achievementLines row at `2 passed | 11 skipped (13)`. Measured now: 870 passed | 1 skipped (871), and tests/ui/achievementLines.test.ts holds 14 cases."
    category: other
    reason: "cf9ccba touched only WINDOWS.md, 13-REVIEW.md and docs/ops/ACHIEVEMENTS.md, so the per-task index was never re-synced after the review round added the WR-01 host case and the WR-02 source scan. Every -t command in the map still binds (all 14 re-run by this verifier); only the counts drifted."
    evidence_status: "verifier-measured (npm test exit 0; per-file case enumeration)"
  - finding: "Deviation count discrepancy. The dispatch brief states fourteen recorded deviations; the five SUMMARYs record seventeen (13-01: 4, 13-02: 4, 13-03: 3, 13-04: 3, 13-05: 3). Fourteen is the count with the three Rule-3 blocking gate-binding deviations excluded."
    category: other
    reason: "Stated explicitly rather than silently adopted. No artifact is wrong; the two counts measure different sets."
    evidence_status: "verifier-measured (Deviations from Plan sections of all five SUMMARYs)"
human_verification:
  - test: "Build to a 320x568pt viewport — Display Zoom on an iPhone 8 / SE 2nd gen / SE 3rd gen, since IPHONEOS_DEPLOYMENT_TARGET is 16.4 and no device is natively 320x568. Reach a CAMPAIGN WIN showing three stars, `New Record`, `Retry`, `Next` and `Menu`, with a two-line unlock block present. Then log `useSafeAreaInsets()` and READ the bottom inset."
    expected: "`Menu` fully visible and tappable with no scrolling, AND a bottom safe-area inset of ZERO. If the inset is non-zero the computed 26px of spare goes negative regardless of how the panel looked, and ACHIEVEMENT_LINES_MAX must drop from 2 to 1. ELEVEN test cases move in that change, across THREE files — 8 in tests/ui/achievementLines.test.ts, 2 in tests/ui/ResultOverlay.achievements.test.tsx, 1 in tests/ui/DailyResultOverlay.test.tsx (verifier-measured; WINDOWS #28 still says two). The copy shape does not move: one name plus `and {n-1} more` applies from n >= 2."
    why_human: "WINDOWS #28, open and binding — this is the panel the whole phase-13 row budget was computed against. jsdom performs no layout and supplies no safe-area insets, so no render() assertion in this repository is evidence for fit, clipping or an inset. The iOS Simulator is not acceptable evidence for an inset claim (phase 11 established that on the record). A green npm test is NOT evidence and must never be recorded as such."
  - test: "Same 320x568pt viewport. Open a fully-populated DailyResultOverlay — a closed date with a score, a streak, a best streak, days played and the record badge — with a two-line unlock block present."
    expected: "`Menu` visible and tappable without scrolling. Computed at 490px against the contracted 10-row maximum, or 522px against the defensive 11-row bound, both inside 548 usable."
    why_human: "WINDOWS #17, open since phase 12 and ANNOTATED by this phase rather than superseded (its stored 456px is 2px low and its 11 rows is a defensive bound against a real contracted maximum of 10). jsdom cannot observe any of it."
  - test: "In the shipped 320px panel, view `Unlocked · {name}` with a SIXTEEN-character display name. The catalog's longest shipped name is `Flawless Clear` at 14, so temporarily lengthen one entry's name to exactly 16 — confirming at 14 does not verify the budget."
    expected: "One line, no wrap and no truncation. Budget: 320 maxWidth − 24 padding each side = 272px; SpaceMono advance 0.612 em; at Body 16px that is 9.792px/char; floor(272/9.792) = 27; the `Unlocked · ` prefix is 11; 27 − 11 = 16."
    why_human: "WINDOWS #16, extended by this phase. The paired control that needs no layout is green (verifier-run: `-t \"name within 16 chars\"` → 1 passed, reading ACHIEVEMENT_NAME_MAX from the module); this is the half that needs layout. It is load-bearing vertically too — a wrapped name silently adds 24px of the 26px of spare."
  - test: "Same 320x568pt viewport with the system text size raised ONE step above default (iOS xLarge, approximately 1.118 against a computed ceiling of 1.102)."
    expected: "The panel is EXPECTED TO CLIP. Confirming the clip is the CORRECT outcome — it is D-18's recorded deferral, due at Phase 14, which owns the three shipped components `maxFontSizeMultiplier` would touch. Annotate WINDOWS #29 and leave it OPEN. Marking it fixed would record a deferral as a repair."
    why_human: "WINDOWS #29 is an owner decision with a due point, not a test. allowFontScaling defaults to true and explicit lineHeight scales with it; jsdom cannot reach any of this."
  - test: "Read docs/ops/ACHIEVEMENTS.md § Before you re-tune: four questions for the owner, in front of the catalog, and answer all four for the twelve thresholds."
    expected: "A dated record of the review's outcome, even if nothing moves — 'reviewed, no change' is a fact and its absence is indistinguishable from the review never happening. Re-tuning a threshold or renaming an entry is free (the catalog is data, SC-1); changing an ID is NOT — a shipped id is permanent, so any id rename must happen before a build ships."
    why_human: "D-11: all twelve thresholds are JUDGEMENTS, not measurements. No human has played this game — 11-UAT.md and 12-UAT.md both record that as still true — so there is no distribution to derive from. Eleven of the twelve have no published anchor. Verified that no artifact presents any threshold as calibrated: every occurrence of 'calibrat' in the phase's source and ops document is a negation."
---

# Phase 13: Achievements Verification Report

**Phase Goal:** The game notices what the player did and tells them, entirely offline
**Verified:** 2026-09-28
**Status:** human_needed
**Re-verification:** No — initial verification (no prior 13-VERIFICATION.md existed)

## Evidence Provenance

Every figure below is labelled by how it was obtained. Nothing in this report rests on a
SUMMARY.md claim.

| Tier | What it means | Used for |
|---|---|---|
| **verifier-measured** | This verifier ran the command in its own process and read the output | all five gates, all 14 cited `-t` commands, the `__purity_probe` gate, three source mutations, one throwaway behavioural probe |
| **control-measured** | A deliberate mutation was applied, the failure watched, and the source restored byte-identical (`git diff --exit-code` clean) | the ACHIEVEMENT_LINES_MAX clamp, both directions; the comment-stripping source scan |
| **human testimony** | Recorded by a human in an artifact; not re-observable here | none relied on |
| **human judgement** | An owner decision, not a measurement | the twelve thresholds (D-11), WINDOWS #29's Dynamic Type ceiling (D-18), WR-03's placement disposition |

### Verifier-measured gate baseline

Re-measured independently of the orchestrator's figures. **All four match exactly.**

| Gate | Orchestrator baseline | This verifier | Agrees |
|---|---|---|---|
| `npm test` | exit 0, 112 files / 870 passed \| 1 skipped (871) | exit 0, `Test Files 112 passed (112)`, `Tests 870 passed \| 1 skipped (871)`, all five `assert-*.mjs` OK | ✓ |
| `npm run typecheck` | exit 0 | exit 0, `error TS` count 0 | ✓ |
| `npm run lint` | exit 0, `✖ 3 problems (0 errors, 3 warnings)` | exit 0, `✖ 3 problems (0 errors, 3 warnings)` — `106:18` in `tests/daily.date-key.test.ts`, `386:24` and `391:25` in `tests/ui/PlayingHost.endless-host.test.ts`, all `@typescript-eslint/array-type` | ✓ |
| `__purity_probe` | `purity_probe_errors=5` | `purity_probe_errors=5` — one `no-restricted-imports` plus four `no-restricted-syntax` (`Date.now`, `new Date`, `Math.random`, `performance.now`), none from the probe's comment naming all five. Probe deleted; `git status` clean for `src/services/achievements/` | ✓ |
| `windows status --raw` | `ok: true`, 31 open / 0 waived / 6 fixed / 37 total | `ok: true`, `open_count: 31`, `waived_count: 0`, `fixed_count: 6`, `total_count: 37` | ✓ |

The one skipped test is `tests/achievements.record.test.ts`'s cold-start case **for the memory
store only**, with the reason in the test name (no disk, so a second store over the same bytes is
the same object in RAM). The AsyncStorage equivalent runs and passes — confirmed in the verbose
enumeration below. Deliberate, documented, not a gap.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria SC-1..SC-5)

| # | Truth | Status | Evidence |
|---|---|---|---|
| SC-1 | Achievements are declared as data — id, description, and a pure predicate over the telemetry snapshot — so adding one does not mean editing game code | ✓ VERIFIED | Twelve entries in `ACHIEVEMENT_CATALOG` (`catalog.ts`), each `{id, name, description, predicate}`. **The strongest single reading in this phase:** measured, NO achievement id string occurs anywhere in `src/` or `app/` outside `catalog.ts` — `KNOWN_IDS` is derived (`ACHIEVEMENT_CATALOG.map(a => a.id)`), `publishUnlockedAchievements` maps by filtering the catalog, and the panels take strings. A thirteenth entry touches `catalog.ts` and nothing else. Purity is AST-enforced and the block's own presence is probe-observed, not assumed. `-t "every entry is data"`, `-t "no clock no storage"`, `-t "ids unique"`, `-t "catalog size"` all bind |
| SC-2 | Evaluation is deterministic and idempotent: re-evaluating an unlocked achievement does not re-fire it, and evaluating the same snapshot twice yields the same set | ✓ VERIFIED | Two mechanisms, each with its own passing behavioural case. Determinism: `qualifyingAchievements` is a pure function of (snapshot, catalog); `-t "same snapshot twice"` → 1 passed. Idempotency: `newlyUnlockedAchievements` is a set difference, not a per-achievement flag; `-t "does not re-fire"` → 1 passed, and at the store level `the same qualifying run a second time reports nothing and moves no timestamp (SC-2 / D-02 / D-17)` passes for **both** hand-mirrored stores |
| SC-3 | Unlocks persist across app kills and survive the storage migration contract | ✓ VERIFIED | `an unlock survives a cold start — a SECOND store over the same persisted bytes hydrates it` passes on the AsyncStorage store (verifier-run verbose enumeration). Additive field, no version bump — `PROGRESS_VERSION` is still `4`, and `-t "written before the achievements record existed"` → 1 passed. D-23's three sites verified in source AND behaviourally: `cloneTelemetryBlob` copies entries by value, `mergeTelemetryBlobs` routes through `mergeAchievementRecords`, `sanitizeTelemetry` calls `sanitizeAchievementRecord`; `a campaign run recorded AFTER an unlock does not erase the unlock set (D-23)` passes for both stores |
| SC-4 | An unlock is surfaced to the player at a point that does not interrupt a live rally | ✓ VERIFIED **on its text** — see the Deferred Item for the goal-level hole | Structural, per D-07: the block renders only inside `showResult`, which only exists once the run has ended, so there is no rally to interrupt. Both panels render it (`ResultOverlay.achievements.test.tsx` 8 cases; `DailyResultOverlay.test.tsx -t "achievement"` 3 cases). All three run-absent states hold: `-t "no run"` passes, and the WR-01 leak is fixed and red-proved (`PlayingHost.daily-run.test.tsx -t "WR-01"` → 1 passed). **SC-4 does not claim universality of surfacing**, and the abandon path does not surface — recorded as a deferred item, not as an SC failure |
| SC-5 | The catalog covers the shipped verbs and all three modes (campaign, endless, daily), not just score thresholds | ✓ VERIFIED | `-t "three modes"` binds, and it is not satisfied by the letter alone: `byMode.campaign` (campaign-25), `byMode.endless` (endless-runs-20), `byMode.daily`, the endless record (`bestWave`) and the daily record (`longestStreak`) are each read by a predicate. **"Not just score thresholds" holds maximally — measured, NO predicate reads any score field at all.** Verbs covered: bricks, combo, rally, cascade, pickups, runs, lives (flawless), waves, streak. Evaluation sits outside every mode gate: `-t "every mode unlocks the same achievement"` → 2 passed, one per store |

**Score:** 5/5 truths verified (0 present-but-behaviour-unverified). Five human-verification items
outstanding, none of which any command in this repository can discharge.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|---|---|---|
| 1 | An achievement earned on an `abandoned` run is announced. **Verifier-measured reach, which no artifact carries: 7 of 12 entries are crossable on an abandon** — `combo-25`, `rally-60`, `cascade-12`, `pickups-100`, `bricks-1000`, `runs-50`, `endless-runs-20` — in all three modes, via a throwaway probe over `recordRunEnd` with `outcome: 'abandoned'` (probe deleted, tree clean). The remaining five need a win or a streak and cannot fire on an abandon. `mergeRunIntoTelemetry` increments `runsPlayed` unconditionally, which is why `runs-50` and `endless-runs-20` are reachable. Under D-02 the delta is one-shot, so it can never fire later | Phase 14 | Phase 14 SC-3 ships an achievements screen showing unlocked entries with descriptions. WINDOWS #35 (open) and ACHIEVEMENTS.md Limit 2b both name it as the placement, with the reasoning recorded and the worse alternative (suppressing the unlock so it can be re-earned, contradicting D-17) rejected explicitly. **Caveat W2 applies: Phase 14 SC-3 does not require a newly-unlocked marker** |

**Is deferring it compatible with the phase's stated goal?** Partially, and the boundary is worth
stating. The goal's verb is "notices what the player did AND tells them". On the abandon path the
game notices and persists — verified — and never tells, on any surface this milestone has shipped
so far. What makes the deferral defensible is that the unlock is *durable*: it is stored with a
real timestamp, it is in the set Phase 14's screen reads, and no information is lost. What makes
it incomplete is that the deferral's own premise ("a newly-unlocked marker has somewhere to live")
is not a Phase 14 requirement. Phase 14 can satisfy SC-3 verbatim and still leave the abandon-earned
unlock indistinguishable. That is a scope note for Phase 14, not a phase-13 blocker.

### Advisory Findings

| # | Finding | Category | Why Advisory |
|---|---|---|---|
| W1 | WINDOWS #28's remedy says "TWO TESTS MOVE WITH IT". Measured: **eleven** cases across **three** files (8 / 2 / 1), and #28 omits `DailyResultOverlay.test.tsx` entirely | other | The enforcement now EXISTS and is stronger than described. The error direction is loud — the suite reds — so nothing can ship silently. But #28 is the live entry a maintainer executes from, and it was not re-synced by the WR-02 fix |
| W2 | Phase 14 SC-3 does not contractually carry WR-03's deferral | architectural | Affects Phase 14's scope, not phase 13's code. Exactly the phase's recurring shape: a named mitigation that nothing requires |
| W3 | `AchievementSnapshot` carries `endless.bestScore`, which no shipped predicate reads, against its own JSDoc rule that the view "names the subset that is read" | other | Zero runtime cost — the sole producer is the whole `TelemetryBlob`, so no store supplies anything extra. It is the type breaking its own stated invariant, by the reasoning it used to drop `daily.history` |
| W4 | `13-VALIDATION.md` is stale post-review: 869 vs the measured 871, and a 13-case row for a now-14-case file | other | Every `-t` command in the map still binds (all 14 re-run). Only the counts drifted, because `cf9ccba` touched three files and not this one |
| W5 | Deviation count: dispatch says fourteen, the SUMMARYs record seventeen (4/4/3/3/3) | other | Stated explicitly rather than quietly adopted. Fourteen is the count excluding the three Rule-3 blocking gate-binding deviations. No artifact is wrong |

## The Instrument-Fidelity Sweep

The dispatch named this as the highest-value check: after WR-02, does **any other artifact still
carry a claim of that shape** — a constant, gate or comment that names an enforcement which does
not exist? Swept exhaustively over every exported constant introduced or touched by this phase,
plus every test file and command named in a phase-13 source comment.

### Constants: which are load-bearing in production

| Constant | Production reads | Claim made about it | Verdict |
|---|---|---|---|
| `ACHIEVEMENT_LINES_MAX` | **1** — `return laid.slice(0, ACHIEVEMENT_LINES_MAX)` in `achievementLines` | "This constant CLAMPS the output — downward only"; WINDOWS #28's remedy is "drops from 2 to 1" | ✓ **TRUE as of the WR-02 fix**, and control-measured three ways below. Scope mis-stated in #28 — see W1 |
| `ACHIEVEMENT_UNLOCK_BOUND` | **3** — `mergeAchievementUnlocks`, `mergeAchievementRecords` (`telemetry.ts`), `sanitizeAchievementRecord` (`parseBlob.ts`), all `slice(0, …)` keeping the FIRST entries | "All three sites that trim this collection agree on that direction" (keep-earliest, per D-17) | ✓ TRUE — three sites found, all keep-first |
| `ACHIEVEMENT_NAME_MAX` | **0** | Both panels say, of `numberOfLines={1}`: "It is the backstop, **not** the gate — the gate is the catalog-length assertion over `ACHIEVEMENT_NAME_MAX`" | ✓ **TRUE, and this is the important negative result.** A zero-production-read constant is only the WR-02 defect when an artifact claims it enforces at runtime. Here the artifacts name a TEST as the gate, that test exists, it reads the constant from the module (`a.name.length > ACHIEVEMENT_NAME_MAX`), and `-t "name within 16 chars"` binds. The catalog is static data, so a test-time assertion is a real gate on the shipped set |
| `ACHIEVEMENT_CATALOG` | **3** — `evaluate.ts` (default arg, twice), `KNOWN_IDS` derivation, `publishUnlockedAchievements` | "the stored key, minted HERE and nowhere else"; `KNOWN_IDS` "derived, not hand-written" | ✓ TRUE — derivation confirmed at source, and no id literal exists outside `catalog.ts` |

**Result: no second WR-02.** Every named enforcement in this phase's production code either exists
in production or is correctly and explicitly identified as a test-tier gate whose test binds.

### Named test files and commands

Fourteen distinct test paths are named in phase-13 source comments and ops prose. **All fourteen
exist on disk** (`[ -f ]` on each). All 14 `-t` commands cited by `13-VALIDATION.md` were re-run:
**every one prints `passed`**, so none is the silent non-binding (wrong file, wrong case, or
exit-0-on-no-match) that this phase measured four times.

### Control-measured red-proofs of the WR-02 fix

Three mutations, each applied to `src/runtime/overlays/achievementLines.ts` and then reverted;
`git diff --exit-code` clean after each.

| Mutation | Measured result | What it proves |
|---|---|---|
| `ACHIEVEMENT_LINES_MAX = 1` | **11 failed / 38 passed** across `achievementLines.test.ts` (8), `ResultOverlay.achievements.test.tsx` (2), `DailyResultOverlay.test.tsx` (1) | The constant genuinely governs rendered rows. WINDOWS #28's remedy is now real |
| `slice(0, ACHIEVEMENT_LINES_MAX)` → `slice(0, 2)` | **1 failed / 13 passed** — only `the constant CLAMPS the output — a source-level scan, because at 2 the clamp is a no-op` | The comment-stripping source scan is the sole observer at the shipped value, exactly as claimed, and it discriminates a literal from the constant |
| clamp removed entirely (`return laid`) | **1 failed / 13 passed** — the same source scan | The guard also catches deletion, not just substitution |

This is the strongest closure in the phase: it rests on watched failures in both directions, not
on a green run. By contrast the four device claims rest on nothing that can fail here at all.

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/services/achievements/catalog.ts` | Catalog as data, 12 entries, snapshot type, name bound, `isKnownAchievementId` | ✓ VERIFIED | 12 entries in D-09's 8..12; `KNOWN_IDS` derived; imported by `evaluate.ts`, `parseBlob.ts`, `PlayingHost.tsx` |
| `src/services/achievements/evaluate.ts` | `qualifyingAchievements`, `newlyUnlockedAchievements`, pure and total | ✓ VERIFIED | Both imported by both stores. `holds()` uses `=== true`, so a non-boolean predicate cannot unlock; a throwing predicate under-reports |
| `src/services/achievements/index.ts` | Named-export barrel | ✓ VERIFIED | Re-exports both functions and four catalog names; `parseBlob.ts` imports through it |
| `src/runtime/overlays/achievementLines.ts` | One shared pure classifier with a load-bearing cap | ✓ VERIFIED | Imported by BOTH panels; clamp control-measured above |
| `src/runtime/overlays/ResultOverlay.tsx` | Unlock block on the campaign/endless panel | ✓ VERIFIED | 8 passing cases including two suppression states with positive controls |
| `src/runtime/overlays/DailyResultOverlay.tsx` | The same block above the countdown | ✓ VERIFIED | 3 passing cases under `-t "achievement"` |
| `src/runtime/GameScreen.tsx` | `unlockedAchievements` threaded to BOTH arms of the result route | ⚠️ WIRED, behaviourally unobserved AT THIS SEAM | Inspected: the prop reaches `DailyResultOverlay` and `ResultOverlay` in the same ternary, defaulted `= []`. Measured: `grep -cin achiev tests/ui/GameScreen.test.tsx` → **0**. `13-VALIDATION.md` note J declares this honestly. The chain is covered in two overlapping halves — host→`GameScreen` props are asserted in `PlayingHost.daily-run.test.tsx` (which mocks `GameScreen` and captures props), and panel→markup is asserted directly — leaving only `GameScreen`'s own ternary compiler-checked. Low risk, and self-declared rather than papered over |
| `src/services/storage/{memoryStore,asyncStorageStore}.ts` | Evaluation inside `recordRunEnd`, outside every mode and outcome gate | ✓ VERIFIED | Both call `newlyUnlockedAchievements(blob.telemetry, …ids)` then `mergeAchievementUnlocks(…, Date.now())` and return the delta. Behaviourally: 23 passing cases, each store asserted separately |
| `src/services/storage/parseBlob.ts` | `sanitizeAchievementUnlock` / `sanitizeAchievementRecord`, D-15/D-21/D-22 | ✓ VERIFIED | Drop-unknown-id + default-malformed-timestamp asymmetry present; drop → de-dup earliest → bound-keeping-first; independence asserted (`-t "a fully corrupt achievements field"`) |
| `src/services/storage/telemetry.ts` | Clone, merge, write bound | ✓ VERIFIED | `cloneTelemetryBlob` copies entries by value (D-23's third site); `mergeAchievementRecords` keys whole entries |
| `eslint.config.js` | `src/services/achievements/**` purity block | ✓ VERIFIED | Probe-observed at 5 errors by this verifier. The block's own presence is invisible to `npm run lint`, which the config says in its own comment |
| `docs/ops/ACHIEVEMENTS.md` | The phase's ops document | ✓ VERIFIED | 15 sections including § Limits with 2b (WR-03) and § four questions for the owner. Precise on the WR-02 fix. Every threshold framed as uncalibrated |
| `docs/ops/PROGRESS-STORAGE.md` | The v4 achievements field documented | ✓ VERIFIED | Shape, bound, degrade rules and the "clone and merge will tell you, the parser will not" sentence present |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `recordRunEnd` (both stores) | `newlyUnlockedAchievements` | direct call on the merged telemetry, outside every mode/outcome gate | ✓ WIRED | Verified in both files; `-t "every mode unlocks the same achievement"` passes per store |
| `recordRunEnd` | `PlayingHost.handleRunEnded` | `RecordRunEndResult.newlyUnlocked` (D-19's widened return) | ✓ WIRED | `PlayingHost.tsx:1229` passes the returned ids into `publishUnlockedAchievements` |
| `publishUnlockedAchievements` | `unlockedAchievementNames` | `ACHIEVEMENT_CATALOG.filter(…).map(a => a.name)` — ids never cross as strings | ✓ WIRED | T-13-01's mitigation, single site. `PlayingHost.daily-run.test.tsx` asserts the captured prop holds NAMES |
| `PlayingHost` | `GameScreen` | `unlockedAchievements={unlockedAchievementNames}` | ✓ WIRED | Asserted behaviourally via the captured-props mock |
| `GameScreen` | both overlays | the `showResult` ternary | ⚠️ WIRED (static) | Present on both arms by inspection; typecheck-enforced; no render case at this seam |
| both overlays | `achievementLines` | `achievementLines(unlockedAchievements).map(...)` | ✓ WIRED | One classifier, two consumers; `line.kind` read, never re-derived |
| `parseBlob` | `src/services/achievements` | `import { isKnownAchievementId }` | ✓ WIRED | The parser does not restate the closed id set |
| `startDailyRun` closed-date branch | `setUnlockedAchievementNames([])` | explicit reset — the third run-absent state | ✓ WIRED | WR-01 fix, red-proved by the review and re-run green here |

## Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---|---|
| `ResultOverlay` / `DailyResultOverlay` | `unlockedAchievements` | `recordRunEnd` → `newlyUnlocked` → catalog name map → `GameScreen` prop | Yes — measured end to end by the probe: a qualifying run returns ids and the persisted set grows | ✓ FLOWING |
| `telemetry.achievements.unlocked` | stored entries | `mergeAchievementUnlocks(blob, ids, Date.now())` | Yes — `{id, at}` with a real instant; survives a cold start on the AsyncStorage store | ✓ FLOWING |
| `AchievementSnapshot.endless.bestScore` | — | present on the blob, read by no predicate | N/A — nothing consumes it | ℹ️ UNREAD (W3) |

## Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
|---|---|---|---|
| Full suite | `npm test` | exit 0, 112 files, 870 passed \| 1 skipped (871), five `assert-*.mjs` OK | ✓ PASS |
| Types | `npm run typecheck` | exit 0, 0 `error TS` | ✓ PASS |
| Boundary (D-08) | `npm run lint` | exit 0, 3 warnings (the measured base, unchanged) | ✓ PASS |
| Purity block exists (D-03/D-20) | `__purity_probe`: write probe → `npx eslint` → `rm -f` | `purity_probe_errors=5`; probe removed; tree clean | ✓ PASS |
| Ledger | `windows status --raw` | `ok: true`, 31 open / 0 waived / 6 fixed / 37 | ✓ PASS |
| All 14 cited `-t` filters | `npx vitest run <file> -t "<phrase>"` ×14 | every one prints `passed`; none vacuous | ✓ PASS |
| Both stores agree | `npx vitest run tests/achievements.record.test.ts --reporter=verbose` | `23 passed \| 1 skipped (24)` — 12 cases per store, the skip documented | ✓ PASS |
| WR-01 fix | `npx vitest run tests/ui/PlayingHost.daily-run.test.tsx -t "WR-01"` | `1 passed \| 14 skipped (15)` | ✓ PASS |
| Cap is load-bearing | `ACHIEVEMENT_LINES_MAX = 1`, three UI files | 11 failed / 38 passed, then restored clean | ✓ PASS (red-proof) |
| Source scan discriminates | `slice(0, 2)` literal, then clamp deleted | 1 failed each, the scan case; restored clean | ✓ PASS (red-proof) |
| Abandon-path reach | throwaway probe: 60 `abandoned` runs per mode through `recordRunEnd` | 7 of 12 ids unlock on an abandon, in all three modes; probe deleted, tree clean | ✓ PASS (quantifies the deferred item) |
| Device / layout | — | **NOT RUNNABLE.** jsdom performs no layout and supplies no safe-area insets; no physical iOS device in this session; the Simulator is not acceptable evidence | ? SKIP → human |

## Probe Execution

No `scripts/*/tests/probe-*.sh` exists in this repository (`find scripts -path '*/tests/probe-*.sh'`
→ empty). This phase's probe-equivalent is the `__purity_probe` gate, executed above by this
verifier in its own process at `purity_probe_errors=5`, plus the four control mutations. The reverse
direction (0 errors against a config with the block removed) is recorded by plan 13-05 and the
orchestrator; this verifier re-measured only the forward direction, and did not mutate the shipped
`eslint.config.js`.

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| N-ACH-01 | Achievements declared as data — id, description, pure predicate — so adding one needs no game-code edit | ✓ SATISFIED | SC-1 above. No id literal outside `catalog.ts`; purity AST-enforced and probe-observed |
| N-ACH-02 | Evaluation deterministic and idempotent; unlocks persist across app kills under the storage migration contract | ✓ SATISFIED | SC-2 and SC-3 above, both with passing behavioural cases per store |
| N-ACH-03 | An unlock is surfaced without interrupting a live rally; the catalog covers all three modes, not just score thresholds | ⚠️ SATISFIED with the device half outstanding | SC-4 and SC-5 above. The rendered block is asserted on both panels; the layout claims behind it (#16, #17, #28, #29) are unmeasurable here and routed to a human |

`.planning/REQUIREMENTS.md` reads all three as `[x]`. That is defensible for N-ACH-01 and
N-ACH-02. For **N-ACH-03** the checkbox is ahead of the evidence: the surfacing half is proven, the
layout half is four open backstops. Per this project's known constraint that `N-*` ids have no
traceability rows and the checkbox is the only surface, the correction belongs in the human batch,
not in a silent edit.

No orphaned requirements: `grep -E "Phase 13" .planning/REQUIREMENTS.md` maps no id that the five
plans did not claim.

## Anti-Patterns Found

Scanned every source file changed in `9230236^..HEAD`.

| File | Pattern | Severity | Impact |
|---|---|---|---|
| — | `TBD` / `FIXME` / `XXX` in any phase-13 file | — | **NONE FOUND.** The debt-marker gate is clean |
| `src/services/achievements/catalog.ts` | `AchievementSnapshot.endless.bestScore` declared, no predicate reads it | ℹ️ Info | W3 — the type contradicts its own stated "names the subset that is read" rule |
| `.planning/WINDOWS.md` #28 | "TWO TESTS MOVE WITH IT" | 📋 Advisory | W1 — understates a now-measured 11 across 3 files |
| `.planning/phases/13-achievements/13-VALIDATION.md` | post-review counts stale (869 vs 871; 13-case row for a 14-case file) | 📋 Advisory | W4 — index counts drifted; every command in it still binds |

Explicitly checked and NOT flagged: the `return []` forms in `evaluate.ts` and `achievementLines`
are declared totality folds with the under-reporting direction asserted, not empty stubs; the
`= []` default on `GameScreen.unlockedAchievements` is overwritten by the host's `useState`
publication on every run end; the single `skipped` test carries its non-applicability reason in the
test name and is deliberately not ledgered.

## Human Verification Required

Five items. **Four of them are device readings no command in this repository can take, and the
fifth is an owner judgement.** Nothing else stands between this phase and `passed`.

### 1. WINDOWS #28 — `ResultOverlay` vertical fit AND the bottom safe-area inset (the binding one)

**Test:** Build to 320×568pt — Display Zoom on an iPhone 8 / SE 2nd / SE 3rd, the only route since
the deployment target is iOS 16.4. Reach a campaign win with three stars, `New Record`, `Retry`,
`Next`, `Menu` and a two-line unlock block. Then log `useSafeAreaInsets()` and READ the bottom
inset — do not infer it from the panel appearing to fit.
**Expected:** `Menu` fully visible and tappable with no scrolling, AND a bottom inset of ZERO.
**If the inset is non-zero:** the computed 26px of spare goes negative regardless of how the panel
looked, and `ACHIEVEMENT_LINES_MAX` drops from 2 to 1. **Eleven cases move, across three files** —
8 in `tests/ui/achievementLines.test.ts`, 2 in `tests/ui/ResultOverlay.achievements.test.tsx`,
1 in `tests/ui/DailyResultOverlay.test.tsx`. WINDOWS #28 currently says two; correct it.
**Why human:** jsdom performs no layout and supplies no insets. The Simulator is not acceptable
evidence for an inset claim. A green `npm test` is not evidence and must never be recorded as such.

### 2. WINDOWS #17 — `DailyResultOverlay` vertical fit with the block

**Test:** Same viewport; a fully-populated closed-date daily panel plus a two-line unlock block.
**Expected:** `Menu` visible and tappable without scrolling. 490px contracted, 522px against the
defensive 11-row bound, both inside 548 usable.
**Why human:** open since phase 12, annotated by this phase rather than superseded.

### 3. WINDOWS #16 — horizontal fit of a 16-character name

**Test:** In the shipped 320px panel, render `Unlocked · {name}` with a **16-character** name. The
longest shipped name is `Flawless Clear` at 14, so lengthen one temporarily; confirming at 14 does
not verify the budget.
**Expected:** one line, no wrap, no truncation.
**Why human:** the paired control that needs no layout is green here; this is the half that needs a
renderer. A wrapped name silently adds 24px of the 26px of spare.

### 4. WINDOWS #29 — Dynamic Type at iOS xLarge (expected to CLIP)

**Test:** Same viewport, system text size one step above default (~1.118 against a computed ceiling
of 1.102).
**Expected:** **the panel clips, and that is the correct outcome.** Confirm it, annotate #29, leave
it OPEN. It is D-18's recorded deferral, due at Phase 14, which owns the three components
`maxFontSizeMultiplier` would touch. Marking it fixed would record a deferral as a repair.
**Why human:** an owner decision with a due point, not a test.

### 5. D-11 — the twelve thresholds, as judgements

**Test:** Answer the four questions in `docs/ops/ACHIEVEMENTS.md` § *Before you re-tune*, in front
of the catalog.
**Expected:** a dated record of the outcome even if nothing moves — "reviewed, no change" is a fact
and its absence is indistinguishable from the review never happening. Re-tuning a threshold or
renaming an entry is free; **changing an ID is not — a shipped id is permanent, so an id rename
must happen before any build ships.**
**Why human:** no human has played this game (`11-UAT.md` and `12-UAT.md` both record it), so there
is no distribution to derive from and eleven of the twelve thresholds have no published anchor.
Verified that no artifact presents any threshold as calibrated — every occurrence of "calibrat" in
the phase's source and ops document is a negation.

## Gaps Summary

**No blockers. Nothing to close before Phase 14 begins.**

The phase goal — *the game notices what the player did and tells them, entirely offline* — holds for
every run that ends in a win or a loss, and it holds by mechanism rather than by convention: SC-1's
"data" is real because no achievement id exists outside the catalog; SC-2's two halves are a pure
function and a set difference, each with its own passing case; SC-3's cold start is asserted against
a second store over the same persisted bytes; SC-4 is structural because the panel cannot exist
during a rally; SC-5 reads five distinct mode-scoped fields and not one score.

Three things are genuinely open, and none of them is a phase-13 defect to fix now:

1. **The device half is entirely unmeasured** (#16, #17, #28, #29). The phase's central number —
   two rows — rests on a bottom safe-area inset nobody has read. That is stated on the ops
   document's own pages, which is the right place for it. #29 is expected to clip by decision.
2. **The abandon path notices and never tells** — quantified here for the first time at 7 of 12
   entries, in all three modes, on the mainstream pause→Menu route. Durable (persisted with a
   timestamp, in the set Phase 14 reads), ledgered (#35), and deferred with its reasoning. The one
   thing to carry forward: Phase 14's SC-3 does not require the newly-unlocked marker that the
   deferral's own premise names.
3. **All twelve thresholds are judgements.** Framed that way everywhere — checked, not assumed.

On the dispatch's central question — whether any other artifact still carries a WR-02-shaped claim,
a named enforcement that does not exist — **the answer is no, in the code.** The sweep over all four
phase constants, all fourteen named test paths and all fourteen cited `-t` commands came back clean:
`ACHIEVEMENT_NAME_MAX` has zero production reads but every artifact that mentions it correctly names
a *test* as its gate, and that test exists and binds. The four residual fidelity findings are all in
the planning and ledger layer (W1, W3, W4, W5), and every one of them errs in the loud direction.

---

*Verified: 2026-09-28*
*Verifier: Claude (gsd-verifier)*

---

## Disposition of this report's five findings (orchestrator, after the report was written)

Recorded here because acting on W1–W5 edited files inside this verification's own `covered_files`,
which mechanically re-stales it. That is expected and is not a second round: these are this
report's own consequences. Commits `fa29be1` and `3143bc4`.

**W1 — my figure was wrong, and the verifier's is right.** I recorded the blast radius of setting
`ACHIEVEMENT_LINES_MAX` to 1 as eight cases. I had run only
`tests/ui/achievementLines.test.ts`. Re-measured across the whole suite: **11 failures in 3
files** — 8 in `achievementLines.test.ts`, 2 in `ResultOverlay.achievements.test.tsx`, 1 in
`DailyResultOverlay.test.tsx`. WINDOWS #28 said *two* and omitted the daily panel entirely.
Corrected in #28, in #36 and in `docs/ops/ACHIEVEMENTS.md`, both the *measured arithmetic*
section and Limit 2. #28 is the entry a maintainer executes the change from, so it was the one
that mattered most.

**W2 — accepted; the deferral named a mitigation nothing requires.** Phase 14's SC-3 as written
requires only locked/unlocked entries with descriptions, so a Phase 14 satisfying its own criteria
verbatim leaves an abandon-earned unlock indistinguishable. Recorded in #35 and the ops document
as an **inherited obligation on Phase 14's discuss stage**, not something that phase provides. The
verifier's quantification — **7 of the 12 entries** crossable on an abandon, all three modes,
because `mergeRunIntoTelemetry` increments `runsPlayed` unconditionally — is now in both, since no
artifact carried it.

**W3 — fixed.** `endless.bestScore` removed from `AchievementSnapshot`; four fixture sites updated.
The view's rule that it names only what is read is the rule that justified dropping
`daily.history` in 13-02, and a rule applied to one field and not the one beside it is not a rule.

**W4 / W5 — fixed.** `13-VALIDATION.md`'s suite figure and the 13-case row updated. On the
deviation count: the verifier's **17** is correct as a count of recorded deviations; the *fourteen*
in the dispatch excluded the three Rule-3 blocking ones. The dispatch figure was the narrower one
and was not labelled as such.

**WR-03 / #35 stays open** and remains the one substantive gap in the phase.

### Post-disposition gates

`npm test` exit **0** at **112 files / 870 passed | 1 skipped (871)**. `npm run typecheck` exit 0.
`npm run lint` exit 0 at `✖ 3 problems (0 errors, 3 warnings)`. `windows status` → `ok: true`,
31 open / 0 waived / 6 fixed / 37 total. Verdict **unchanged: `human_needed`** — nothing here
touched the five human items, and nothing here could.
