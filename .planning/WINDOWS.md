---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-09-25T14:10:00.820Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 11 | deviation | tests/endless.wave-loop.test.ts |  | Rule 2: wave-2 board compiled via compileGeneratedLevel instead of loadAndCompile so the new export is not shipped unexercised (11-01) | open |  | 2026-09-25T14:10:00.820Z |  |

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
  }
]
````
