---
schema_version: 1
open_count: 23
waived_count: 0
fixed_count: 3
total_count: 26
last_updated: 2026-09-28T14:20:00.000Z
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
| 16 | 12 | unrun-verify | src/runtime/overlays/DailyResultOverlay.tsx |  | 12-UI-SPEC E1 overflow (horizontal): a 7-digit score, 4-digit streak and 5-digit days-played must show no wrap and no clipping in the shipped 320px panel. jsdom performs no layout, so no test in this phase is evidence for it — device verification, owned by 12-06. | open |  | 2026-09-28T03:58:52.704Z |  |
| 17 | 12 | unrun-verify | src/runtime/overlays/DailyResultOverlay.tsx |  | 12-UI-SPEC E1 overflow (vertical): the fully-populated 11-row Daily Result panel must fit inside the safe area on a 320x568pt viewport with the Menu CTA visible without scrolling. Computed at 456px, never observed on a device — owned by 12-06. | open |  | 2026-09-28T03:59:12.456Z |  |
| 18 | 12 | unrun-verify | app/_components/PlayingHost.tsx |  | 12-UI-SPEC E5 overflow: the __DEV__ dev row must be fully on-screen and tappable on a 375pt viewport. Computed at ~431-475px with Daily added; the row already clipped at its two default tier states BEFORE this phase. Dev-only surface, deleted by Phase 14 — owned by 12-06. | open |  | 2026-09-28T03:59:12.560Z |  |
| 19 | 12 | deviation | app/_components/PlayingHost.tsx |  | The daily panel's Streak line is derived by currentDailyStreak (the write side's own exact derivation) rather than by streakFrom over the trimmed window, which plan 12-05 and 12-03's handoff both prescribed. MEASURED: streakFrom returns 400 against a stored longestStreak of 450, which both misreports the streak and silently stops the record badge firing for a player on their best-ever run. | open |  | 2026-09-28T03:59:12.664Z |  |
| 20 | 12 | unrun-verify | docs/ops/DAILY-CHALLENGE.md |  | Device item 1 (12-VALIDATION Manual-Only): Android Hermes date-key + nextLocalMidnightMs on a 23h DST day. Only the Apple slice of the SDK 57 Hermes artifact was executable; the Android engine is a separate compilation against bionic tzdata and was NEVER executed. Routed to a device check by plan 12-06. | open |  | 2026-09-28T04:15:32.571Z |  |
| 21 | 12 | unrun-verify | docs/ops/DAILY-CHALLENGE.md |  | Device item 2: Android Intl/ICU4J locale invariance. The five-locale measurement was taken on the Apple Hermes slice; the ICU4J layer was read, not executed. Routed to a physical Android device by plan 12-06. | open |  | 2026-09-28T04:15:32.685Z |  |
| 22 | 12 | unrun-verify | docs/ops/DAILY-CHALLENGE.md |  | Device item 3: the per-runtime timezone cache ON DEVICE. Reproduced only by setenv+tzset in a desktop harness; a real OS timezone change is a different mechanism and was not observable. If a device check shows the date re-derives without a relaunch, NARROW the Limits paragraph in docs/ops/DAILY-CHALLENGE.md, do not delete it. | open |  | 2026-09-28T04:15:32.795Z |  |
| 23 | 12 | unrun-verify | src/runtime/overlays/DailyResultOverlay.tsx |  | Device item 4: a real local-midnight rollover with the Daily Result panel open. No test can advance a device wall clock across midnight while the runtime lives. Confirm the countdown never renders a negative value and omits at or below zero. The re-derivation half of clock-policy rule 5 is UNIMPLEMENTED: the review fix for WR-04 deleted the write-only localTodayRef, so nothing re-derives the local date on rollover while the panel is open. Wiring it means swapping a read-only panel out from under the player, which is a design decision on the Phase 14 Title surface, not a review fix. Do not check for it here. | open |  | 2026-09-28T04:15:32.904Z |  |
| 24 | 12 | unrun-verify | docs/ops/DAILY-CHALLENGE.md |  | Device item 8: NO HUMAN HAS PLAYED A DAILY BOARD. Nothing in docs/ops/DAILY-CHALLENGE.md was calibrated by one, and its front matter says so. Play a full daily board to a win and to a loss on consecutive days and confirm the streak, best-streak and days-played figures move as the policy states. | open |  | 2026-09-28T04:15:33.015Z |  |
| 25 | 12 | accepted-cost | src/services/storage/telemetry.ts |  | Accepted cost 4 (docs/ops/DAILY-CHALLENGE.md): a carried currentStreakStart is credible only when the surviving window is saturated at DAILY_HISTORY_BOUND. Sub-saturated means never trimmed, so the stored dates are the whole evidence. Consequence: a SATURATED window damaged at its oldest end becomes sub-saturated and under-reports a genuine long streak until the next close (measured 450 -> 399 -> 451, self-repairing). Under-report is the chosen direction; the rule refuses nothing a legitimate write can produce, only what damage produces. Residual inside the accepted T-12-05 tamper model: 399 genuine consecutive dates beside a hand-written totalDaysPlayed of 3000 reads 399, then the next close writes longestStreak 2710. | open |  | 2026-09-28T13:40:00.000Z |  |
| 26 | 12 | false-gate-claim | scripts/assert-streak-evidence.mjs |  | assert-streak-evidence.mjs reaches only a consumer's OWN BODY. It reads the consumer region's text, not the provenance of the identifier that region receives, so a cross-wire performed one function away is invisible. MEASURED (phase-12 verification round 3): two plants walked past it, both typechecking cleanly and both fully restoring the 2592-streak defect - a non-consumer helper building the frankenrecord and handing over a bare identifier, and a non-consumer helper mutating both records in place. The property still held: both red the behavioural case 'judges each copy's claim on that copy's own evidence, never on the union's' in tests/daily.record.test.ts, and vitest runs before the assert scripts, so npm test fails either way. Open work: extend the guard to the claimant's provenance. The script's own header and docs/ops/DAILY-CHALLENGE.md Limit 9 were narrowed to claim only what the guard reaches. | open |  | 2026-09-28T14:20:00.000Z |  |

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
    "description": "onFrame dependency array required waveRequest/waveApplied/ticksBanked (react-hooks/exhaustive-deps) \u2014 auto-fixed, Rule 3",
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
    "description": "Task 3's __DEV__ entry Pressable and W{n} readout landed in Task 2's commit \u2014 without a consumer, 'wave' and 'startEndlessRun' are unused symbols and lint warns, which both tasks' acceptance criteria forbid (Rule 3)",
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
    "description": "Added a behavioural endless-run suite beyond the plan's file list \u2014 the plan pinned SC-1 only by absence-greps (Rule 2)",
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
    "description": "Task 2 source contract (b) scoped to the failure preamble, not the whole startEndlessRun body \u2014 the literal plan wording would have required deleting the success-path setWaveBuildFailedWave(null) clear, a user-visible copy defect",
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
    "description": "SC-5 device reading remains OPEN \u2014 no frame measurement taken; discharge procedure improved only",
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
    "description": "mergeDailyRecord and mergeDailyRecords have no executing test \u2014 the jsdom harness mocks the storage module (guard is plan 12-03's tests/daily.record.test.ts)",
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
    "description": "12-UI-SPEC E1 overflow (horizontal): a 7-digit score, 4-digit streak and 5-digit days-played must show no wrap and no clipping in the shipped 320px panel. jsdom performs no layout, so no test in this phase is evidence for it \u2014 device verification, owned by 12-06.",
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
    "description": "12-UI-SPEC E1 overflow (vertical): the fully-populated 11-row Daily Result panel must fit inside the safe area on a 320x568pt viewport with the Menu CTA visible without scrolling. Computed at 456px, never observed on a device \u2014 owned by 12-06.",
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
    "description": "12-UI-SPEC E5 overflow: the __DEV__ dev row must be fully on-screen and tappable on a 375pt viewport. Computed at ~431-475px with Daily added; the row already clipped at its two default tier states BEFORE this phase. Dev-only surface, deleted by Phase 14 \u2014 owned by 12-06.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-28T03:59:12.560Z",
    "resolved_at": null,
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
    "kind": "accepted-cost",
    "phase": 12,
    "file": "src/services/storage/telemetry.ts",
    "line": null,
    "description": "Accepted cost 4 (docs/ops/DAILY-CHALLENGE.md): a carried currentStreakStart is credible only when the surviving window is saturated at DAILY_HISTORY_BOUND. Sub-saturated means never trimmed, so the stored dates are the whole evidence. Consequence: a SATURATED window damaged at its oldest end becomes sub-saturated and under-reports a genuine long streak until the next close (measured 450 -> 399 -> 451, self-repairing). Under-report is the chosen direction; the rule refuses nothing a legitimate write can produce, only what damage produces. Residual inside the accepted T-12-05 tamper model: 399 genuine consecutive dates beside a hand-written totalDaysPlayed of 3000 reads 399, then the next close writes longestStreak 2710.",
    "status": "open",
    "reason": null,
    "recorded_at": "2026-09-28T13:40:00.000Z",
    "resolved_at": null,
    "milestone": "v1.2"
  },
  {
    "id": 26,
    "kind": "false-gate-claim",
    "phase": 12,
    "file": "scripts/assert-streak-evidence.mjs",
    "line": null,
    "description": "assert-streak-evidence.mjs reaches only a consumer's OWN BODY. It reads the consumer region's text, not the provenance of the identifier that region receives, so a cross-wire performed one function away is invisible. MEASURED (phase-12 verification round 3): two plants walked past it, both typechecking cleanly and both fully restoring the 2592-streak defect - a non-consumer helper building the frankenrecord and handing over a bare identifier, and a non-consumer helper mutating both records in place. The property still held: both red the behavioural case 'judges each copy's claim on that copy's own evidence, never on the union's' in tests/daily.record.test.ts, and vitest runs before the assert scripts, so npm test fails either way. Open work: extend the guard to the claimant's provenance. The script's own header and docs/ops/DAILY-CHALLENGE.md Limit 9 were narrowed to claim only what the guard reaches.",
    "status": "open",
    "reason": null,
    "recorded_at": "2026-09-28T14:20:00.000Z",
    "resolved_at": null,
    "milestone": "v1.2"
  }
]
````
