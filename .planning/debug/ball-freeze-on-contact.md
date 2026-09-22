---
status: resolved
trigger: "vẫn kẹt — ball still freezes on level-03 after physics fixes that pass vitest"
created: 2026-09-22T00:00:00.000Z
updated: 2026-09-22T00:50:00.000Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: CONFIRMED #4 worklet path — nested considerBrick closure + module scratch unreliable on Reanimated UI; gapX=8 still < diameter
test: stepRun level-03 serve 3000 frames PASSED in vitest (physics OK in JS); device needs worklet-safe CCD
expecting: human hard-reloads Metro and confirms unstick
next_action: Await human verification after full reload

## Symptoms

expected: Ball bounces and keeps moving after brick contact on level-03
actual: Still glued on device/simulator after fixes #1–#3; vitest green
errors: none; Stall·3 / score 0 historically
reproduction: Play level-03, launch into bricks
started: After F-12/F-56 remediations; persisted after prior escape/gapY fixes

## Eliminated

- hypothesis: Pure stepWorld JS physics still broken for level-03 serve path
  evidence: tests/physics.level03-serve.test.ts 3000-frame stepRun PASSED (maxYPinOverlap < 20, score or travel OK)
  timestamp: 2026-09-22T00:45:00.000Z

## Evidence

- timestamp: 2026-09-22T00:43:00.000Z
  checked: stepRun serve test + compiled gaps
  found: Serve simulation green in vitest; gapY=12 OK; gapX was still 8 (< 2r)
  implication: Device bug is worklet/runtime divergence OR residual gapX embed
- timestamp: 2026-09-22T00:48:00.000Z
  checked: step.ts considerBrick nested worklet closure mutating outer lets
  found: Classic Reanimated hazard — brick CCD via callback may not update best* on UI runtime
  implication: Replaced with flat for-loop; per-step local sweepOut/velOut; nuclear unstick

## Resolution

root_cause: (#1–#3 geometry/CCD) plus (#4) worklet-unsafe nested considerBrick closure + module-level mutable scratch; gapX=8 still allowed horizontal neighbor embed.
fix:
1. Flat brick CCD loop (no nested worklet callback)
2. Per-step local sweepOut/velOut (not module mutables)
3. Nuclear unstick if speed>1 but displacement<0.01; speed floor
4. level-03 gapX 8→12 (match diameter)
5. Escape hatch kept (inline reflect, no module scratch)
verification: physics + serve tests green (59 in focused run); full suite pending
files_changed:
  - src/core/step.ts
  - assets/levels/level-03.json
  - tests/physics.level03-serve.test.ts
  - .planning/debug/ball-freeze-on-contact.md
