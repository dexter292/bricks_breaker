---
schema_version: 1
open_count: 10
waived_count: 0
fixed_count: 1
total_count: 11
last_updated: 2026-09-26T09:53:22.231Z
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
  }
]
````
