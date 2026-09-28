---
schema_version: 1
open_count: 30
waived_count: 0
fixed_count: 4
total_count: 34
last_updated: 2026-09-28T15:10:38.059Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 11 | deviation | tests/endless.wave-loop.test.ts |  | Rule 2: wave-2 board compiled via compileGeneratedLevel instead of loadAndCompile so the new export is not shipped unexercised (11-01) | open |  | 2026-09-25T14:10:00.820Z |  |
| 2 | 11 | deviation | src/services/storage/memoryStore.ts |  | Plan 11-02 Task 3: plan action text and acceptance criterion contradicted (ternary discriminant); resolved with the equivalent 'endless' discriminant to keep one campaign gate per store | open |  | 2026-09-25T14:27:08.710Z |  |
| 3 | 11 | deviation | src/services/storage/telemetry.ts |  | Plan 11-02 Task 1: acceptance criterion AC7 expected grep count 1 for 'endless' in mergeRunIntoTelemetry but the function indexes byMode[args.mode] dynamically; actual 0 satisfies the intent more strongly, no source change | open |  | 2026-09-25T14:27:15.115Z |  |
| 4 | 11 | deviation | src/runtime/useGameLoop.ts |  | onFrame dependency array required waveRequest/waveApplied/ticksBanked (react-hooks/exhaustive-deps) — auto-fixed, Rule 3 | open |  | 2026-09-25T14:40:25.863Z |  |
| 5 | 11 | deviation | app/_components/PlayingHost.tsx |  | Task 3's __DEV__ entry Pressable and W{n} readout landed in Task 2's commit — without a consumer, 'wave' and 'startEndlessRun' are unused symbols and lint warns, which both tasks' acceptance criteria forbid (Rule 3) | open |  | 2026-09-25T15:12:29.666Z |  |
| 6 | 11 | deviation | tests/ui/PlayingHost.endless-host.test.ts |  | Added a test file the plan did not list: Task 2 is behaviour-adding with no test file of its own, and the TDD RED gate needs a failing target test (Rule 2) | open |  | 2026-09-25T15:12:29.779Z |  |
| 7 | 11 | deviation | tests/ui/PlayingHost.endless-run.test.tsx |  | Added a behavioural endless-run suite beyond the plan's file list — the plan pinned SC-1 only by absence-greps (Rule 2) | open |  | 2026-09-25T15:12:29.896Z |  |
| 8 | 11 | stub | app/_components/PlayingHost.tsx | 209 | waveBuildFailedWave is written but not read until 11-08 renders the wave-build-failure body; carries an eslint-disable for no-unused-vars | fixed |  | 2026-09-26T04:52:59.617Z | 2026-09-26T05:14:10.420Z |
| 9 | 11 | deviation | tests/ui/PlayingHost.endless-host.test.ts |  | Task 2 source contract (b) scoped to the failure preamble, not the whole startEndlessRun body — the literal plan wording would have required deleting the success-path setWaveBuildFailedWave(null) clear, a user-visible copy defect | open |  | 2026-09-26T07:29:19.613Z |  |
| 10 | 11 | deviation | .planning/phases/11-endless-mode/11-11-PLAN.md |  | Phase gate freeze command uses origin/main...HEAD, which predates Phase 10 and so lists all of src/levelgen; correct base is the phase base b99607b (diff 0). Reported by 11-11 Task 3, not fixed (a gate may not repair what it measures). | open |  | 2026-09-26T08:01:01.198Z |  |
| 11 | 11 | unrun-verify | docs/ops/ENDLESS-MODE.md |  | SC-5 device reading remains OPEN — no frame measurement taken; discharge procedure improved only | open |  | 2026-09-26T09:53:22.231Z |  |
| 12 | 11 | unrun-verify | docs/ops/ENDLESS-MODE.md |  | SC-5 device frame-budget reading remains UNMEASURED: 11-20 repaired the instructions for taking it and explicitly did not take it; no automated step in this repo can drive onFrame | open |  | 2026-09-26T15:20:54.093Z |  |
| 13 | 11 | deviation | app/_components/PlayingHost.tsx |  | 11-20 base disagreement: plan measured the falsified clause at 1 here on 6bb18bf; wave 9 (07907f3) had already deleted it, so the phase-wide enumeration is 5 on the executed tree, not 6 | open |  | 2026-09-26T15:20:54.201Z |  |
| 14 | 12 | stub | src/services/storage/parseBlob.ts |  | sanitizeTelemetry does not read telemetry.daily from the raw blob, so a stored daily history is discarded on hydrate (closed by plan 12-04's sanitizeDailyRecord) | fixed |  | 2026-09-28T01:48:07.356Z | 2026-09-28T04:15:33.124Z |
| 15 | 12 | unrun-verify | src/services/storage/telemetry.ts |  | mergeDailyRecord and mergeDailyRecords have no executing test — the jsdom harness mocks the storage module (guard is plan 12-03's tests/daily.record.test.ts) | fixed |  | 2026-09-28T01:48:07.463Z | 2026-09-28T03:08:57.659Z |
| 16 | 12 | unrun-verify | src/runtime/overlays/DailyResultOverlay.tsx |  | 12-UI-SPEC E1 overflow (horizontal): a 7-digit score, 4-digit streak and 5-digit days-played must show no wrap and no clipping in the shipped 320px panel. jsdom performs no layout, so no test in this phase is evidence for it — device verification, owned by 12-06. EXTENDED 2026-09-28 by phase 13: the same horizontal budget now also bounds every achievement DISPLAY NAME at 16 characters. Derived and re-derived: 320 - 48 padding = 272px; SpaceMono advance 0.612 em at 16px = 9.792px; floor(272 / 9.792) = 27 chars; the 'Unlocked . ' prefix is 11. A wrong budget here silently reshapes the catalog D-09 defines. PHASE-13 ANNOTATION 2026-09-28 (plan 13-05 T3) — NOT discharged, LEFT OPEN. REPRODUCTION: in the shipped 320px panel, view `Unlocked . {name}` with a display name of exactly SIXTEEN characters. The shipped catalog's longest name is `Flawless Clear` at 14, so confirming at 14 does NOT verify the 16-character budget — the check must temporarily lengthen one catalog entry's name to exactly 16, or this entry stays open with that reason recorded. EXPECTED: one line, no wrap, no truncation. CONSEQUENCE IF NO: the budget is the contract the twelve-entry catalog was authored against, so a smaller real budget silently reshapes the catalog (D-09). It is also load-bearing VERTICALLY: a name that wraps adds 24px silently, and 24px is most of the 26px of vertical spare the two-row cap bought (see #28) — so a horizontal miss becomes a clipped `Menu`. The paired control that needs no layout is green (`name within 16 chars` in tests/achievements.catalog.test.ts); this is the half that needs layout, and nothing in this repository can run it — jsdom performs no layout. | open |  | 2026-09-28T03:58:52.704Z |  |
| 17 | 12 | unrun-verify | src/runtime/overlays/DailyResultOverlay.tsx |  | 12-UI-SPEC E1 overflow (vertical): the fully-populated 11-row Daily Result panel must fit inside the safe area on a 320x568pt viewport with the Menu CTA visible without scrolling. Computed at 456px, never observed on a device — owned by 12-06. ANNOTATED 2026-09-28 by phase 13's UI pass, NOT superseded: (a) the 456px figure is 2px LOW — the CTA was counted at 60 (16 + minHeight 44) when menuButton carries borderWidth 1 on all edges, making it 62; the corrected figure is 458. (b) The '11-row' premise is a defensive bound, not the real maximum: showBadge requires streak >= 2 while the streak-ended line renders only where the current streak is 1, so they are mutually exclusive and the contracted maximum is 10 rows. The component would still render both, because DailyResultOverlay folds endedStreakLength and streak independently — which is why 11 is budgeted against rather than claimed away. Both corrections verified independently by gsd-ui-checker. PHASE-13 ANNOTATION 2026-09-28 (plan 13-05 T3) — NOT discharged, LEFT OPEN, still not superseded. PHASE-13 FIGURES: with a two-line unlock block added, the daily panel is 490px against the contracted 10-row maximum, or 522px against the defensive 11-row bound; both are inside 548 usable. REPRODUCTION: 320x568pt — reachable only through Display Zoom on a 375x667 device (iPhone 8 / SE 2nd gen / SE 3rd gen), because IPHONEOS_DEPLOYMENT_TARGET is 16.4 and iOS 16 will not install on a natively 320x568 device. Open a fully-populated DailyResultOverlay for a closed date (score, streak, best streak, days played, record badge) with a two-line unlock block present. EXPECTED: `Menu` visible and tappable without scrolling. CONSEQUENCE IF NO: 12-UI-SPEC forbids scrolling on this panel, so a clipped `Menu` is a control the player cannot reach, not a cosmetic overflow. The same zero-bottom-inset assumption #28 records applies here too — this panel has 26px of spare at the defensive bound. | open |  | 2026-09-28T03:59:12.456Z |  |
| 18 | 12 | unrun-verify | app/_components/PlayingHost.tsx |  | 12-UI-SPEC E5 overflow: the __DEV__ dev row must be fully on-screen and tappable on a 375pt viewport. Computed at ~431-475px with Daily added; the row already clipped at its two default tier states BEFORE this phase. Dev-only surface, deleted by Phase 14 — owned by 12-06. RESOLVED 2026-09-28 by commit eec2137: the backstop came back POSITIVE on an iPhone 17 simulator at 402pt — the row clipped at the LEFT, cutting off Lv and the tier button, while Daily stayed reachable. Root cause was the one 12-UI-SPEC E5 already named: the slot had no left bound, so an absolutely-positioned box with right alone grew leftwards off-screen. Fixed by bounding the slot left as well and letting the row wrap, so every control is reachable at any width. Verified on the simulator in both campaign and endless. Three sibling display defects found in the same session are fixed in the same commit: the metrics overlay drew under the dev row, had no backdrop over bricks, and the W{n} readout was a bare label on the brick field. | fixed |  | 2026-09-28T03:59:12.560Z | 2026-09-28T19:05:00.000Z |
| 19 | 12 | deviation | app/_components/PlayingHost.tsx |  | The daily panel's Streak line is derived by currentDailyStreak (the write side's own exact derivation) rather than by streakFrom over the trimmed window, which plan 12-05 and 12-03's handoff both prescribed. MEASURED: streakFrom returns 400 against a stored longestStreak of 450, which both misreports the streak and silently stops the record badge firing for a player on their best-ever run. | open |  | 2026-09-28T03:59:12.664Z |  |
| 20 | 12 | unrun-verify | docs/ops/DAILY-CHALLENGE.md |  | Device item 1 (12-VALIDATION Manual-Only): Android Hermes date-key + nextLocalMidnightMs on a 23h DST day. Only the Apple slice of the SDK 57 Hermes artifact was executable; the Android engine is a separate compilation against bionic tzdata and was NEVER executed. Routed to a device check by plan 12-06. | open |  | 2026-09-28T04:15:32.571Z |  |
| 21 | 12 | unrun-verify | docs/ops/DAILY-CHALLENGE.md |  | Device item 2: Android Intl/ICU4J locale invariance. The five-locale measurement was taken on the Apple Hermes slice; the ICU4J layer was read, not executed. Routed to a physical Android device by plan 12-06. | open |  | 2026-09-28T04:15:32.685Z |  |
| 22 | 12 | unrun-verify | docs/ops/DAILY-CHALLENGE.md |  | Device item 3: the per-runtime timezone cache ON DEVICE. Reproduced only by setenv+tzset in a desktop harness; a real OS timezone change is a different mechanism and was not observable. If a device check shows the date re-derives without a relaunch, NARROW the Limits paragraph in docs/ops/DAILY-CHALLENGE.md, do not delete it. | open |  | 2026-09-28T04:15:32.795Z |  |
| 23 | 12 | unrun-verify | src/runtime/overlays/DailyResultOverlay.tsx |  | Device item 4: a real local-midnight rollover with the Daily Result panel open. No test can advance a device wall clock across midnight while the runtime lives. Confirm the countdown never renders a negative value and omits at or below zero. The re-derivation half of clock-policy rule 5 is UNIMPLEMENTED: the review fix for WR-04 deleted the write-only localTodayRef, so nothing re-derives the local date on rollover while the panel is open. Wiring it means swapping a read-only panel out from under the player, which is a design decision on the Phase 14 Title surface, not a review fix. Do not check for it here. | open |  | 2026-09-28T04:15:32.904Z |  |
| 24 | 12 | unrun-verify | docs/ops/DAILY-CHALLENGE.md |  | Device item 8: NO HUMAN HAS PLAYED A DAILY BOARD. Nothing in docs/ops/DAILY-CHALLENGE.md was calibrated by one, and its front matter says so. Play a full daily board to a win and to a loss on consecutive days and confirm the streak, best-streak and days-played figures move as the policy states. | open |  | 2026-09-28T04:15:33.015Z |  |
| 25 | 12 | deviation | src/services/storage/telemetry.ts |  | ACCEPTED COST. Accepted cost 4 (docs/ops/DAILY-CHALLENGE.md): a carried currentStreakStart is credible only when the surviving window is saturated at DAILY_HISTORY_BOUND. Sub-saturated means never trimmed, so the stored dates are the whole evidence. Consequence: a SATURATED window damaged at its oldest end becomes sub-saturated and under-reports a genuine long streak until the next close (measured 450 -> 399 -> 451, self-repairing). Under-report is the chosen direction; the rule refuses nothing a legitimate write can produce, only what damage produces. Residual inside the accepted T-12-06 tamper model: 399 genuine consecutive dates beside a hand-written totalDaysPlayed of 3000 reads 399, then the next close writes longestStreak 2710. | open |  | 2026-09-28T13:40:00.000Z |  |
| 26 | 12 | unmet-truth | scripts/assert-streak-evidence.mjs |  | FALSE GATE CLAIM. assert-streak-evidence.mjs reaches only a consumer's OWN BODY. It reads the consumer region's text, not the provenance of the identifier that region receives, so a cross-wire performed one function away is invisible. MEASURED (phase-12 verification round 3): two plants walked past it, both typechecking cleanly and both fully restoring the 2592-streak defect - a non-consumer helper building the frankenrecord and handing over a bare identifier, and a non-consumer helper mutating both records in place. The property still held: both red the behavioural case 'judges each copy's claim on that copy's own evidence, never on the union's' in tests/daily.record.test.ts, and vitest runs before the assert scripts, so npm test fails either way. Open work: extend the guard to the claimant's provenance. The script's own header and docs/ops/DAILY-CHALLENGE.md Limit 9 were narrowed to claim only what the guard reaches. | open |  | 2026-09-28T14:20:00.000Z |  |
| 27 | 12 | unmet-truth | src/services/storage/parseBlob.ts |  | UNREGISTERED THREAT. sanitizeAggregateMap is UNCAPPED ON READ. MEASURED by the phase-12 security audit: 5000 keys injected into telemetry.byMode.daily of a hostile blob survive parseProgressResult with status: ok. Phase 12's write-side fence (byMode.daily keyed on the single constant DAILY_TELEMETRY_KEY) is real and mutation-proved, but nothing trims the map on read. PROVENANCE: parseBlob.ts sanitizeAggregateMap was authored in ddbbec3 (phase 09-02) and applies identically to campaign and endless - inherited, NOT a phase-12 regression. Note the asymmetry inside the same file: recentRuns IS re-bounded on read, and so is daily.history; byMode.* is not. Self-inflicted on a rooted device, so it sits inside T-12-06's accepted posture - but no threat register ever made that call, and T-12-01's own text names this sanitizer as the amplifier. Decide it explicitly rather than by inheritance. | open |  | 2026-09-28T17:05:00.000Z |  |
| 28 | 13 | unrun-verify | src/runtime/overlays/ResultOverlay.tsx |  | LAYOUT BACKSTOP. Phase-13 UI-SPEC backstop 1, NEW AND BINDING: ResultOverlay vertical fit at 320x568pt in the campaign-win worst case (3 stars + New Record + Retry + Next + Menu) with 2 achievement rows added = 522px against 548 usable, 26px spare. This panel binds the whole phase-13 row budget and NO PRIOR PHASE EVER REGISTERED A BACKSTOP FOR IT — every prior layout backstop targeted the daily panel, whose contracted maximum is 426px. CRITICAL: the 548 usable figure assumes a BOTTOM SAFE-AREA INSET OF ZERO, which is unverified. The device check must confirm the INSETS, not merely that it fits — if the bottom inset is non-zero the 26px spare goes negative and ACHIEVEMENT_LINES_MAX must drop to 1. PHASE-13 ANNOTATION 2026-09-28 (plan 13-05 T3) — NOT discharged, LEFT OPEN. REPRODUCTION: build to a 320x568pt viewport, reachable ONLY through Display Zoom on a 375x667 device (iPhone 8 / SE 2nd gen / SE 3rd gen), because IPHONEOS_DEPLOYMENT_TARGET is 16.4 and iOS 16 will not install on any natively 320x568 device. Reach a CAMPAIGN WIN showing three stars, `New Record`, `Retry`, `Next` and `Menu`, with a TWO-LINE unlock block present. TWO QUESTIONS, and the second is the one that matters: (1) is `Menu` fully visible and tappable with no scrolling; (2) WHAT IS THE BOTTOM SAFE-AREA INSET. Read it — log `useSafeAreaInsets()` temporarily — do NOT infer it from the panel appearing to fit. CONSEQUENCE IF THE INSET IS NON-ZERO: the 548 usable figure assumes a bottom inset of zero, so a non-zero inset takes the computed 26px of spare NEGATIVE regardless of how the panel looked, and ACHIEVEMENT_LINES_MAX (src/runtime/overlays/achievementLines.ts) must drop from 2 to 1. TWO TESTS MOVE WITH IT, in the same change: the `caps at two` case in tests/ui/achievementLines.test.ts and the three-name panel case in tests/ui/ResultOverlay.achievements.test.tsx. The copy shape does NOT move: one name plus `and {n-1} more` simply applies from n >= 2 instead of n >= 3. WHY NOTHING IN THIS PHASE CLOSED IT: no physical device was available and the iOS Simulator is not acceptable evidence for an inset claim (phase 11 established that for its own frame-timing claim); jsdom performs no layout and supplies no safe-area insets, so no `render()` assertion is evidence for any part of this. A passing npm test is NOT evidence and must never be recorded as such. Routed to the end-of-phase human batch via plan 13-05 Task 3's <verify><human-check>, and stated in docs/ops/ACHIEVEMENTS.md on its own pages so a reader need not open this ledger to learn that the phase's central number is an assumption. | open |  | 2026-09-28T19:40:00.000Z |  |
| 29 | 13 | deviation | src/runtime/overlays/ResultOverlay.tsx |  | OWNER DECISION, DEFERRED. Phase-13 UI-SPEC: Dynamic Type ceiling. allowFontScaling defaults to true and an explicit lineHeight scales with it (both measured in the installed RN tree), so adding two rows drops the campaign-win panel's text-multiplier ceiling from 1.433 to 1.102 - from clipping at the first accessibility size to clipping one step above default, since iOS xLarge is about 1.118. PRE-EXISTING in kind (the panel already clips at AX1 today) and confined to 320x568, reachable only via Display Zoom. Lever is maxFontSizeMultiplier across three shipped components, so it is not phase 13's to pull. Recorded as decision D-18 with a DUE POINT: Phase 14, which owns those components. Do not let this sit as an open note without an owner. PHASE-13 ANNOTATION 2026-09-28 (plan 13-05 T3) — NOT discharged, LEFT OPEN, and NOT to be marked fixed. REPRODUCTION: 320x568pt (Display Zoom, as #28) with the system text size raised ONE step above default — iOS xLarge, approximately 1.118 against a computed ceiling of 1.102. EXPECTED: the panel IS EXPECTED TO CLIP. Confirming the clipping is the CORRECT outcome. It is not a new defect to file and not a regression to fix here: it is D-18's recorded deferral, DUE at Phase 14, which owns the three shipped components maxFontSizeMultiplier would touch. CONSEQUENCE: none for this phase. Record what was seen with a date and leave this entry OPEN against Phase 14. Marking it fixed would record a deferral as a repair, and filing a NEW window for the same clipping would make the ship gate count one debt twice — do neither. | open |  | 2026-09-28T19:40:00.000Z |  |
| 30 | 13 | deviation | src/services/achievements/catalog.ts |  | Entry 1's predicate was routed through the new total readers despite the plan saying it was unchanged — a uniform degradation direction beat a literal 'unchanged' contract | open |  | 2026-09-28T14:05:37.218Z |  |
| 31 | 13 | deviation | tests/achievements.record.test.ts |  | Plan 13-01's store suite had two premises invalidated by the mode-aware catalog (lifetime-only fixture; spotless seeding run); both repaired and 13-03 must preserve them through its rewrite | open |  | 2026-09-28T14:05:37.325Z |  |
| 32 | 13 | unmet-truth | src/runtime/GameScreen.tsx |  | COVERAGE GAP, named not papered over. The achievements prop threaded to BOTH arms of the showResult route has NO behavioural test. MEASURED by plan 13-05 T2: grep -cin achiev tests/ui/GameScreen.test.tsx prints 0. The only automated observers are npm run typecheck (the prop must exist on ResultOverlay and DailyResultOverlay and both arms must accept it - a real gate, since 13-01 could not wire an arm to a prop the component did not declare) and npm run lint (the runtime -> services boundary). Both panel suites render the overlays DIRECTLY, not through GameScreen. So the claim 'the prop reaches both arms' is compiler-checked and behaviourally unobserved, and 13-VALIDATION.md's row for it is marked with a qualified status for that reason rather than a green tick. Closing it means a GameScreen-level render case, which no plan in phase 13 owned. | open |  | 2026-09-28T15:10:37.830Z |  |
| 33 | 13 | unmet-truth | .planning/phases/13-achievements/13-VALIDATION.md |  | GATES THAT COULD NOT FAIL, found and corrected at phase close. Two of the twenty seeded per-task map rows named cases in the WRONG FILE: 'npx vitest run tests/achievements.record.test.ts -t "unknown id"' and the same with -t "degrades alone". Neither case name exists in that file - the unknown-id drop and the independent-degradation claim both live in tests/storage.progress-v4.test.ts, where plan 13-03 T1 put the sanitizer battery. As written each would have printed Tests 24 skipped (24) at EXIT 0: the same silent non-binding plan 13-03 measured through wrong CASE, reached here through wrong FILE. A third row (-t "achievements" for the D-13 no-migration claim) matched a whole describe body rather than the claim, and a fourth (-t "timestamp") swept in three unrelated cases. All four corrected to the EXECUTED commands with the correction noted in the file. Open work: no gate anywhere in this repo checks that a -t filter in a planning artifact actually binds to a case that exists. | open |  | 2026-09-28T15:10:37.944Z |  |
| 34 | 13 | deviation | .planning/phases/13-achievements/13-05-PLAN.md |  | Plan 13-05 Task 3's presence gate invokes 'gsd-tools windows list', which DOES NOT EXIST - the windows verb offers status, append, waive, fixed only. As written the command errored to stderr (suppressed by 2>/dev/null), printed 0, and so FAILED the gate it was written to pass. Executed instead against 'windows status --raw', asserting both presence and open-ness of #16/#17/#28/#29 (4/4 present, 4/4 open), which is strictly more than the gate asked for. Recorded because a planning artifact naming a non-existent subcommand is the same defect family as a -t filter that does not bind. | open |  | 2026-09-28T15:10:38.059Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "11",
    "file": "tests/endless.wave-loop.test.ts",
    "line": null,
    "description": "Rule 2: wave-2 board compiled via compileGeneratedLevel instead of loadAndCompile so the new export is not shipped unexercised (11-01)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-25T14:10:00.820Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "11",
    "file": "src/services/storage/memoryStore.ts",
    "line": null,
    "description": "Plan 11-02 Task 3: plan action text and acceptance criterion contradicted (ternary discriminant); resolved with the equivalent 'endless' discriminant to keep one campaign gate per store",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-25T14:27:08.710Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "11",
    "file": "src/services/storage/telemetry.ts",
    "line": null,
    "description": "Plan 11-02 Task 1: acceptance criterion AC7 expected grep count 1 for 'endless' in mergeRunIntoTelemetry but the function indexes byMode[args.mode] dynamically; actual 0 satisfies the intent more strongly, no source change",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-25T14:27:15.115Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "11",
    "file": "src/runtime/useGameLoop.ts",
    "line": null,
    "description": "onFrame dependency array required waveRequest/waveApplied/ticksBanked (react-hooks/exhaustive-deps) — auto-fixed, Rule 3",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-25T14:40:25.863Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 5,
    "kind": "deviation",
    "phase": "11",
    "file": "app/_components/PlayingHost.tsx",
    "line": null,
    "description": "Task 3's __DEV__ entry Pressable and W{n} readout landed in Task 2's commit — without a consumer, 'wave' and 'startEndlessRun' are unused symbols and lint warns, which both tasks' acceptance criteria forbid (Rule 3)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-25T15:12:29.666Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "11",
    "file": "tests/ui/PlayingHost.endless-host.test.ts",
    "line": null,
    "description": "Added a test file the plan did not list: Task 2 is behaviour-adding with no test file of its own, and the TDD RED gate needs a failing target test (Rule 2)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-25T15:12:29.779Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 7,
    "kind": "deviation",
    "phase": "11",
    "file": "tests/ui/PlayingHost.endless-run.test.tsx",
    "line": null,
    "description": "Added a behavioural endless-run suite beyond the plan's file list — the plan pinned SC-1 only by absence-greps (Rule 2)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-25T15:12:29.896Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 8,
    "kind": "stub",
    "phase": "11",
    "file": "app/_components/PlayingHost.tsx",
    "line": 209,
    "description": "waveBuildFailedWave is written but not read until 11-08 renders the wave-build-failure body; carries an eslint-disable for no-unused-vars",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-26T04:52:59.617Z",
    "resolved_at": "2026-09-26T05:14:10.420Z",
    "milestone": "v1.2"
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "11",
    "file": "tests/ui/PlayingHost.endless-host.test.ts",
    "line": null,
    "description": "Task 2 source contract (b) scoped to the failure preamble, not the whole startEndlessRun body — the literal plan wording would have required deleting the success-path setWaveBuildFailedWave(null) clear, a user-visible copy defect",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-26T07:29:19.613Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 10,
    "kind": "deviation",
    "phase": "11",
    "file": ".planning/phases/11-endless-mode/11-11-PLAN.md",
    "line": null,
    "description": "Phase gate freeze command uses origin/main...HEAD, which predates Phase 10 and so lists all of src/levelgen; correct base is the phase base b99607b (diff 0). Reported by 11-11 Task 3, not fixed (a gate may not repair what it measures).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-26T08:01:01.198Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 11,
    "kind": "unrun-verify",
    "phase": "11",
    "file": "docs/ops/ENDLESS-MODE.md",
    "line": null,
    "description": "SC-5 device reading remains OPEN — no frame measurement taken; discharge procedure improved only",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-26T09:53:22.231Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 12,
    "kind": "unrun-verify",
    "phase": "11",
    "file": "docs/ops/ENDLESS-MODE.md",
    "line": null,
    "description": "SC-5 device frame-budget reading remains UNMEASURED: 11-20 repaired the instructions for taking it and explicitly did not take it; no automated step in this repo can drive onFrame",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-26T15:20:54.093Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 13,
    "kind": "deviation",
    "phase": "11",
    "file": "app/_components/PlayingHost.tsx",
    "line": null,
    "description": "11-20 base disagreement: plan measured the falsified clause at 1 here on 6bb18bf; wave 9 (07907f3) had already deleted it, so the phase-wide enumeration is 5 on the executed tree, not 6",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-26T15:20:54.201Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 14,
    "kind": "stub",
    "phase": "12",
    "file": "src/services/storage/parseBlob.ts",
    "line": null,
    "description": "sanitizeTelemetry does not read telemetry.daily from the raw blob, so a stored daily history is discarded on hydrate (closed by plan 12-04's sanitizeDailyRecord)",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-28T01:48:07.356Z",
    "resolved_at": "2026-09-28T04:15:33.124Z",
    "milestone": "v1.2"
  },
  {
    "id": 15,
    "kind": "unrun-verify",
    "phase": "12",
    "file": "src/services/storage/telemetry.ts",
    "line": null,
    "description": "mergeDailyRecord and mergeDailyRecords have no executing test — the jsdom harness mocks the storage module (guard is plan 12-03's tests/daily.record.test.ts)",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-28T01:48:07.463Z",
    "resolved_at": "2026-09-28T03:08:57.659Z",
    "milestone": "v1.2"
  },
  {
    "id": 16,
    "kind": "unrun-verify",
    "phase": "12",
    "file": "src/runtime/overlays/DailyResultOverlay.tsx",
    "line": null,
    "description": "12-UI-SPEC E1 overflow (horizontal): a 7-digit score, 4-digit streak and 5-digit days-played must show no wrap and no clipping in the shipped 320px panel. jsdom performs no layout, so no test in this phase is evidence for it — device verification, owned by 12-06. EXTENDED 2026-09-28 by phase 13: the same horizontal budget now also bounds every achievement DISPLAY NAME at 16 characters. Derived and re-derived: 320 - 48 padding = 272px; SpaceMono advance 0.612 em at 16px = 9.792px; floor(272 / 9.792) = 27 chars; the 'Unlocked . ' prefix is 11. A wrong budget here silently reshapes the catalog D-09 defines. PHASE-13 ANNOTATION 2026-09-28 (plan 13-05 T3) — NOT discharged, LEFT OPEN. REPRODUCTION: in the shipped 320px panel, view `Unlocked . {name}` with a display name of exactly SIXTEEN characters. The shipped catalog's longest name is `Flawless Clear` at 14, so confirming at 14 does NOT verify the 16-character budget — the check must temporarily lengthen one catalog entry's name to exactly 16, or this entry stays open with that reason recorded. EXPECTED: one line, no wrap, no truncation. CONSEQUENCE IF NO: the budget is the contract the twelve-entry catalog was authored against, so a smaller real budget silently reshapes the catalog (D-09). It is also load-bearing VERTICALLY: a name that wraps adds 24px silently, and 24px is most of the 26px of vertical spare the two-row cap bought (see #28) — so a horizontal miss becomes a clipped `Menu`. The paired control that needs no layout is green (`name within 16 chars` in tests/achievements.catalog.test.ts); this is the half that needs layout, and nothing in this repository can run it — jsdom performs no layout.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T03:58:52.704Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 17,
    "kind": "unrun-verify",
    "phase": "12",
    "file": "src/runtime/overlays/DailyResultOverlay.tsx",
    "line": null,
    "description": "12-UI-SPEC E1 overflow (vertical): the fully-populated 11-row Daily Result panel must fit inside the safe area on a 320x568pt viewport with the Menu CTA visible without scrolling. Computed at 456px, never observed on a device — owned by 12-06. ANNOTATED 2026-09-28 by phase 13's UI pass, NOT superseded: (a) the 456px figure is 2px LOW — the CTA was counted at 60 (16 + minHeight 44) when menuButton carries borderWidth 1 on all edges, making it 62; the corrected figure is 458. (b) The '11-row' premise is a defensive bound, not the real maximum: showBadge requires streak >= 2 while the streak-ended line renders only where the current streak is 1, so they are mutually exclusive and the contracted maximum is 10 rows. The component would still render both, because DailyResultOverlay folds endedStreakLength and streak independently — which is why 11 is budgeted against rather than claimed away. Both corrections verified independently by gsd-ui-checker. PHASE-13 ANNOTATION 2026-09-28 (plan 13-05 T3) — NOT discharged, LEFT OPEN, still not superseded. PHASE-13 FIGURES: with a two-line unlock block added, the daily panel is 490px against the contracted 10-row maximum, or 522px against the defensive 11-row bound; both are inside 548 usable. REPRODUCTION: 320x568pt — reachable only through Display Zoom on a 375x667 device (iPhone 8 / SE 2nd gen / SE 3rd gen), because IPHONEOS_DEPLOYMENT_TARGET is 16.4 and iOS 16 will not install on a natively 320x568 device. Open a fully-populated DailyResultOverlay for a closed date (score, streak, best streak, days played, record badge) with a two-line unlock block present. EXPECTED: `Menu` visible and tappable without scrolling. CONSEQUENCE IF NO: 12-UI-SPEC forbids scrolling on this panel, so a clipped `Menu` is a control the player cannot reach, not a cosmetic overflow. The same zero-bottom-inset assumption #28 records applies here too — this panel has 26px of spare at the defensive bound.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T03:59:12.456Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 18,
    "kind": "unrun-verify",
    "phase": "12",
    "file": "app/_components/PlayingHost.tsx",
    "line": null,
    "description": "12-UI-SPEC E5 overflow: the __DEV__ dev row must be fully on-screen and tappable on a 375pt viewport. Computed at ~431-475px with Daily added; the row already clipped at its two default tier states BEFORE this phase. Dev-only surface, deleted by Phase 14 — owned by 12-06. RESOLVED 2026-09-28 by commit eec2137: the backstop came back POSITIVE on an iPhone 17 simulator at 402pt — the row clipped at the LEFT, cutting off Lv and the tier button, while Daily stayed reachable. Root cause was the one 12-UI-SPEC E5 already named: the slot had no left bound, so an absolutely-positioned box with right alone grew leftwards off-screen. Fixed by bounding the slot left as well and letting the row wrap, so every control is reachable at any width. Verified on the simulator in both campaign and endless. Three sibling display defects found in the same session are fixed in the same commit: the metrics overlay drew under the dev row, had no backdrop over bricks, and the W{n} readout was a bare label on the brick field.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-28T03:59:12.560Z",
    "resolved_at": "2026-09-28T19:05:00.000Z",
    "milestone": "v1.2"
  },
  {
    "id": 19,
    "kind": "deviation",
    "phase": "12",
    "file": "app/_components/PlayingHost.tsx",
    "line": null,
    "description": "The daily panel's Streak line is derived by currentDailyStreak (the write side's own exact derivation) rather than by streakFrom over the trimmed window, which plan 12-05 and 12-03's handoff both prescribed. MEASURED: streakFrom returns 400 against a stored longestStreak of 450, which both misreports the streak and silently stops the record badge firing for a player on their best-ever run.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T03:59:12.664Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 20,
    "kind": "unrun-verify",
    "phase": "12",
    "file": "docs/ops/DAILY-CHALLENGE.md",
    "line": null,
    "description": "Device item 1 (12-VALIDATION Manual-Only): Android Hermes date-key + nextLocalMidnightMs on a 23h DST day. Only the Apple slice of the SDK 57 Hermes artifact was executable; the Android engine is a separate compilation against bionic tzdata and was NEVER executed. Routed to a device check by plan 12-06.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T04:15:32.571Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 21,
    "kind": "unrun-verify",
    "phase": "12",
    "file": "docs/ops/DAILY-CHALLENGE.md",
    "line": null,
    "description": "Device item 2: Android Intl/ICU4J locale invariance. The five-locale measurement was taken on the Apple Hermes slice; the ICU4J layer was read, not executed. Routed to a physical Android device by plan 12-06.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T04:15:32.685Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 22,
    "kind": "unrun-verify",
    "phase": "12",
    "file": "docs/ops/DAILY-CHALLENGE.md",
    "line": null,
    "description": "Device item 3: the per-runtime timezone cache ON DEVICE. Reproduced only by setenv+tzset in a desktop harness; a real OS timezone change is a different mechanism and was not observable. If a device check shows the date re-derives without a relaunch, NARROW the Limits paragraph in docs/ops/DAILY-CHALLENGE.md, do not delete it.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T04:15:32.795Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 23,
    "kind": "unrun-verify",
    "phase": "12",
    "file": "src/runtime/overlays/DailyResultOverlay.tsx",
    "line": null,
    "description": "Device item 4: a real local-midnight rollover with the Daily Result panel open. No test can advance a device wall clock across midnight while the runtime lives. Confirm the countdown never renders a negative value and omits at or below zero. The re-derivation half of clock-policy rule 5 is UNIMPLEMENTED: the review fix for WR-04 deleted the write-only localTodayRef, so nothing re-derives the local date on rollover while the panel is open. Wiring it means swapping a read-only panel out from under the player, which is a design decision on the Phase 14 Title surface, not a review fix. Do not check for it here.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T04:15:32.904Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 24,
    "kind": "unrun-verify",
    "phase": "12",
    "file": "docs/ops/DAILY-CHALLENGE.md",
    "line": null,
    "description": "Device item 8: NO HUMAN HAS PLAYED A DAILY BOARD. Nothing in docs/ops/DAILY-CHALLENGE.md was calibrated by one, and its front matter says so. Play a full daily board to a win and to a loss on consecutive days and confirm the streak, best-streak and days-played figures move as the policy states.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T04:15:33.015Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 25,
    "kind": "deviation",
    "phase": "12",
    "file": "src/services/storage/telemetry.ts",
    "line": null,
    "description": "ACCEPTED COST. Accepted cost 4 (docs/ops/DAILY-CHALLENGE.md): a carried currentStreakStart is credible only when the surviving window is saturated at DAILY_HISTORY_BOUND. Sub-saturated means never trimmed, so the stored dates are the whole evidence. Consequence: a SATURATED window damaged at its oldest end becomes sub-saturated and under-reports a genuine long streak until the next close (measured 450 -> 399 -> 451, self-repairing). Under-report is the chosen direction; the rule refuses nothing a legitimate write can produce, only what damage produces. Residual inside the accepted T-12-06 tamper model: 399 genuine consecutive dates beside a hand-written totalDaysPlayed of 3000 reads 399, then the next close writes longestStreak 2710.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T13:40:00.000Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 26,
    "kind": "unmet-truth",
    "phase": "12",
    "file": "scripts/assert-streak-evidence.mjs",
    "line": null,
    "description": "FALSE GATE CLAIM. assert-streak-evidence.mjs reaches only a consumer's OWN BODY. It reads the consumer region's text, not the provenance of the identifier that region receives, so a cross-wire performed one function away is invisible. MEASURED (phase-12 verification round 3): two plants walked past it, both typechecking cleanly and both fully restoring the 2592-streak defect - a non-consumer helper building the frankenrecord and handing over a bare identifier, and a non-consumer helper mutating both records in place. The property still held: both red the behavioural case 'judges each copy's claim on that copy's own evidence, never on the union's' in tests/daily.record.test.ts, and vitest runs before the assert scripts, so npm test fails either way. Open work: extend the guard to the claimant's provenance. The script's own header and docs/ops/DAILY-CHALLENGE.md Limit 9 were narrowed to claim only what the guard reaches.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T14:20:00.000Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 27,
    "kind": "unmet-truth",
    "phase": "12",
    "file": "src/services/storage/parseBlob.ts",
    "line": null,
    "description": "UNREGISTERED THREAT. sanitizeAggregateMap is UNCAPPED ON READ. MEASURED by the phase-12 security audit: 5000 keys injected into telemetry.byMode.daily of a hostile blob survive parseProgressResult with status: ok. Phase 12's write-side fence (byMode.daily keyed on the single constant DAILY_TELEMETRY_KEY) is real and mutation-proved, but nothing trims the map on read. PROVENANCE: parseBlob.ts sanitizeAggregateMap was authored in ddbbec3 (phase 09-02) and applies identically to campaign and endless - inherited, NOT a phase-12 regression. Note the asymmetry inside the same file: recentRuns IS re-bounded on read, and so is daily.history; byMode.* is not. Self-inflicted on a rooted device, so it sits inside T-12-06's accepted posture - but no threat register ever made that call, and T-12-01's own text names this sanitizer as the amplifier. Decide it explicitly rather than by inheritance.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T17:05:00.000Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 28,
    "kind": "unrun-verify",
    "phase": "13",
    "file": "src/runtime/overlays/ResultOverlay.tsx",
    "line": null,
    "description": "LAYOUT BACKSTOP. Phase-13 UI-SPEC backstop 1, NEW AND BINDING: ResultOverlay vertical fit at 320x568pt in the campaign-win worst case (3 stars + New Record + Retry + Next + Menu) with 2 achievement rows added = 522px against 548 usable, 26px spare. This panel binds the whole phase-13 row budget and NO PRIOR PHASE EVER REGISTERED A BACKSTOP FOR IT — every prior layout backstop targeted the daily panel, whose contracted maximum is 426px. CRITICAL: the 548 usable figure assumes a BOTTOM SAFE-AREA INSET OF ZERO, which is unverified. The device check must confirm the INSETS, not merely that it fits — if the bottom inset is non-zero the 26px spare goes negative and ACHIEVEMENT_LINES_MAX must drop to 1. PHASE-13 ANNOTATION 2026-09-28 (plan 13-05 T3) — NOT discharged, LEFT OPEN. REPRODUCTION: build to a 320x568pt viewport, reachable ONLY through Display Zoom on a 375x667 device (iPhone 8 / SE 2nd gen / SE 3rd gen), because IPHONEOS_DEPLOYMENT_TARGET is 16.4 and iOS 16 will not install on any natively 320x568 device. Reach a CAMPAIGN WIN showing three stars, `New Record`, `Retry`, `Next` and `Menu`, with a TWO-LINE unlock block present. TWO QUESTIONS, and the second is the one that matters: (1) is `Menu` fully visible and tappable with no scrolling; (2) WHAT IS THE BOTTOM SAFE-AREA INSET. Read it — log `useSafeAreaInsets()` temporarily — do NOT infer it from the panel appearing to fit. CONSEQUENCE IF THE INSET IS NON-ZERO: the 548 usable figure assumes a bottom inset of zero, so a non-zero inset takes the computed 26px of spare NEGATIVE regardless of how the panel looked, and ACHIEVEMENT_LINES_MAX (src/runtime/overlays/achievementLines.ts) must drop from 2 to 1. TWO TESTS MOVE WITH IT, in the same change: the `caps at two` case in tests/ui/achievementLines.test.ts and the three-name panel case in tests/ui/ResultOverlay.achievements.test.tsx. The copy shape does NOT move: one name plus `and {n-1} more` simply applies from n >= 2 instead of n >= 3. WHY NOTHING IN THIS PHASE CLOSED IT: no physical device was available and the iOS Simulator is not acceptable evidence for an inset claim (phase 11 established that for its own frame-timing claim); jsdom performs no layout and supplies no safe-area insets, so no `render()` assertion is evidence for any part of this. A passing npm test is NOT evidence and must never be recorded as such. Routed to the end-of-phase human batch via plan 13-05 Task 3's <verify><human-check>, and stated in docs/ops/ACHIEVEMENTS.md on its own pages so a reader need not open this ledger to learn that the phase's central number is an assumption.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T19:40:00.000Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 29,
    "kind": "deviation",
    "phase": "13",
    "file": "src/runtime/overlays/ResultOverlay.tsx",
    "line": null,
    "description": "OWNER DECISION, DEFERRED. Phase-13 UI-SPEC: Dynamic Type ceiling. allowFontScaling defaults to true and an explicit lineHeight scales with it (both measured in the installed RN tree), so adding two rows drops the campaign-win panel's text-multiplier ceiling from 1.433 to 1.102 - from clipping at the first accessibility size to clipping one step above default, since iOS xLarge is about 1.118. PRE-EXISTING in kind (the panel already clips at AX1 today) and confined to 320x568, reachable only via Display Zoom. Lever is maxFontSizeMultiplier across three shipped components, so it is not phase 13's to pull. Recorded as decision D-18 with a DUE POINT: Phase 14, which owns those components. Do not let this sit as an open note without an owner. PHASE-13 ANNOTATION 2026-09-28 (plan 13-05 T3) — NOT discharged, LEFT OPEN, and NOT to be marked fixed. REPRODUCTION: 320x568pt (Display Zoom, as #28) with the system text size raised ONE step above default — iOS xLarge, approximately 1.118 against a computed ceiling of 1.102. EXPECTED: the panel IS EXPECTED TO CLIP. Confirming the clipping is the CORRECT outcome. It is not a new defect to file and not a regression to fix here: it is D-18's recorded deferral, DUE at Phase 14, which owns the three shipped components maxFontSizeMultiplier would touch. CONSEQUENCE: none for this phase. Record what was seen with a date and leave this entry OPEN against Phase 14. Marking it fixed would record a deferral as a repair, and filing a NEW window for the same clipping would make the ship gate count one debt twice — do neither.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T19:40:00.000Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 30,
    "kind": "deviation",
    "phase": "13",
    "file": "src/services/achievements/catalog.ts",
    "line": null,
    "description": "Entry 1's predicate was routed through the new total readers despite the plan saying it was unchanged — a uniform degradation direction beat a literal 'unchanged' contract",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T14:05:37.218Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 31,
    "kind": "deviation",
    "phase": "13",
    "file": "tests/achievements.record.test.ts",
    "line": null,
    "description": "Plan 13-01's store suite had two premises invalidated by the mode-aware catalog (lifetime-only fixture; spotless seeding run); both repaired and 13-03 must preserve them through its rewrite",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T14:05:37.325Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 32,
    "kind": "unmet-truth",
    "phase": "13",
    "file": "src/runtime/GameScreen.tsx",
    "line": null,
    "description": "COVERAGE GAP, named not papered over. The achievements prop threaded to BOTH arms of the showResult route has NO behavioural test. MEASURED by plan 13-05 T2: grep -cin achiev tests/ui/GameScreen.test.tsx prints 0. The only automated observers are npm run typecheck (the prop must exist on ResultOverlay and DailyResultOverlay and both arms must accept it - a real gate, since 13-01 could not wire an arm to a prop the component did not declare) and npm run lint (the runtime -> services boundary). Both panel suites render the overlays DIRECTLY, not through GameScreen. So the claim 'the prop reaches both arms' is compiler-checked and behaviourally unobserved, and 13-VALIDATION.md's row for it is marked with a qualified status for that reason rather than a green tick. Closing it means a GameScreen-level render case, which no plan in phase 13 owned.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T15:10:37.830Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 33,
    "kind": "unmet-truth",
    "phase": "13",
    "file": ".planning/phases/13-achievements/13-VALIDATION.md",
    "line": null,
    "description": "GATES THAT COULD NOT FAIL, found and corrected at phase close. Two of the twenty seeded per-task map rows named cases in the WRONG FILE: 'npx vitest run tests/achievements.record.test.ts -t \"unknown id\"' and the same with -t \"degrades alone\". Neither case name exists in that file - the unknown-id drop and the independent-degradation claim both live in tests/storage.progress-v4.test.ts, where plan 13-03 T1 put the sanitizer battery. As written each would have printed Tests 24 skipped (24) at EXIT 0: the same silent non-binding plan 13-03 measured through wrong CASE, reached here through wrong FILE. A third row (-t \"achievements\" for the D-13 no-migration claim) matched a whole describe body rather than the claim, and a fourth (-t \"timestamp\") swept in three unrelated cases. All four corrected to the EXECUTED commands with the correction noted in the file. Open work: no gate anywhere in this repo checks that a -t filter in a planning artifact actually binds to a case that exists.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T15:10:37.944Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 34,
    "kind": "deviation",
    "phase": "13",
    "file": ".planning/phases/13-achievements/13-05-PLAN.md",
    "line": null,
    "description": "Plan 13-05 Task 3's presence gate invokes 'gsd-tools windows list', which DOES NOT EXIST - the windows verb offers status, append, waive, fixed only. As written the command errored to stderr (suppressed by 2>/dev/null), printed 0, and so FAILED the gate it was written to pass. Executed instead against 'windows status --raw', asserting both presence and open-ness of #16/#17/#28/#29 (4/4 present, 4/4 open), which is strictly more than the gate asked for. Recorded because a planning artifact naming a non-existent subcommand is the same defect family as a -t filter that does not bind.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T15:10:38.059Z",
    "resolved_at": null,
    "milestone": "v1.2"
  }
]
````
