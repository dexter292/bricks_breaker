---
status: partial
phase: 11-endless-mode
source: [11-VERIFICATION.md]
started: 2026-09-27T00:00:00Z
updated: 2026-09-28T18:50:00Z
---

## Current Test

[testing paused — 1 item outstanding]

Tests 2-5 passed 2026-09-28. Test 1 is BLOCKED on a physical device, not skipped: a
simulator dry run was run that day and is recorded under test 1, but it cannot produce
the frame measurement SC-5 is about. N-END-03 stays `[ ]`.

## Tests

### 1. SC-5 device reading — wave transitions stay inside the Mid budget
expected: p50 <= 16.7 ms and p95 <= 20 ms across each wave-1..5 transition, with none of the four failure signatures. Full procedure in `docs/ops/ENDLESS-MODE.md` § SC-5. This is the first round whose procedure carries no verifier correction — the do-not-press warning and the "restart the app and take the reading again" instruction are both present, both survive verbatim, and the reason given for them is now true of the shipped code.
why_human: No automated step in this repo can produce a frame on hardware.
result: blocked
blocked_by: physical-device
reason: |
  Reclassified from `skipped` to `blocked` on 2026-09-28. `skipped` said "passed over";
  `blocked` says "cannot be done here", which is what is true. No device reading has ever
  been taken. SC-5 / N-END-03 stays undischarged and `[ ]`.

  SIMULATOR DRY RUN, 2026-09-28 — iPhone 17 (402x874 pt), dev build from DerivedData
  (native shell 2026-09-25) against live Metro. Valid because the phase-11 security audit
  proved neither phase 11 nor phase 12 changed a dependency: `git diff dcfdd37..b7b74e7 --
  package.json package-lock.json` is empty and `package-lock.json` is untouched across both,
  so a stale native shell plus fresh JS is the real code.

  THIS IS NOT A READING, AND IT CANNOT BECOME ONE. A simulator runs the app on the Mac's
  CPU, does not emulate the GPU (Skia goes through the host GPU), and has no thermal
  throttling or device memory bandwidth. The Mid budget (p50 <= 16.7 ms, p95 <= 20 ms) is a
  DEVICE budget a Mac passes trivially, so signature (d) would read green whether or not the
  defect exists. The ops doc already ruled on this from the other side: it lists the 15.5x
  Hermes ratio as UNMEASURED precisely because "that ratio itself came from an iOS simulator
  run, not a device". `Device digest` stays OPEN.

  WHAT THE DRY RUN DID ESTABLISH — first time anyone has run the procedure at all:
  1. Step 1 works. The `Endless` control in the `__DEV__` dev row starts an endless run and
     the `W1` readout appears beside it.
  2. The generated board renders — a visibly irregular lattice, distinct from campaign
     level-01's uniform grid.
  3. The run loop works end to end: launch, bricks break, score 0 -> 600 -> 660 -> 720 -> 730,
     lives 3 -> 2 -> 1 -> 0, run ends cleanly.
  4. The endless Results overlay is ENDLESS-SCOPED at the surface: `Wave · 1`, `Score · 730`,
     `Best · 11090`, `Best wave · 2`, Retry + Menu. `Best · 11090` is the endless record, NOT
     the campaign `Best · 127420` the Title screen shows. SC-5's firewall is visible to the
     eye, not only to the firewall suite.
  5. Signature (a) NOT observed — no black playfield at any point, including at run end.
  6. Signature (c) NOT observed — 0 `preload soft-fail` lines in 6,498 captured device-log
     lines; no JS error, no red box.
  7. Signature (b) — audio queues start and stop normally per brick hit; not judgeable on a
     simulator.
  8. NEW, and it belongs to WINDOWS #18 rather than here: the dev row overflows at 402 pt,
     clipped at the LEFT (`high` where `auto high` belongs) while `Cert WC`, `Endless`,
     `Daily`, `W1` and `Crash` all stay fully visible and tappable. This confirms from the
     opposite direction what phase 12's UAT item 7 note warned — the row already overflowed
     before `Daily` existed. It also adds a fact nobody had: the `W1` readout ITSELF widens
     the row while endless is active, so the overflow is worst during exactly the run SC-5
     measures.

  WHAT IT DID NOT ESTABLISH, which is the point: NO WAVE TRANSITION WAS REACHED. The run
  ended at wave 1. Signatures (a), (b) and (c) are defined AT A TRANSITION, so all three
  remain unobserved where they matter. Two of the three lives were lost to automation
  latency, not difficulty — a screenshot/decide/tap round trip is slower than the ball's
  flight, so the paddle cannot track it. A human at the device would clear wave 1 without
  difficulty; this instrument cannot.

  To discharge, the procedure in `docs/ops/ENDLESS-MODE.md` still has to be run by a person
  on hardware. Do not write a passing reading that was not taken.

### 2. The cert self-cancel's positive direction
expected: Zero injections on a later campaign `level-03` session after an intervening endless detour.
why_human: No harness in this repo can observe the positive direction of the drop.
note: OPTIONAL and explicitly NOT load-bearing for gap 1 — belt-and-braces added by 11-19 beyond what the gap required. Its absence reds only a source contract; cell 5 stays green without it.
result: pass

### 3. E1 / E3 overflow backstops
expected: No wrap, no clipping, at the stated extreme values.
why_human: jsdom computes no layout.
result: pass

### 4. OWNER DECISION — the WR-01 source pointer in ENDLESS-MODE.md
expected: An owner decision — authorise the WR-01 pointer patch as written, or commission the one-time rewrite.
why_human: unverified-prohibition, judgment tier by declaration.
note: |
  `docs/ops/ENDLESS-MODE.md:261` and `:485` still cite the expression
  `!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03'`
  as what `runCertWorstCase` opens on. 11-19 deleted that expression when it extracted
  `certLevelPlanFor`, and a test added the same round now pins `runEndedRef`/`modeRef`
  at ZERO occurrences at that exact address. `certLevelPlan.ts` appears nowhere in `docs/`.
  The verifier judged the prohibition HELD for the MECHANISM (the round-5 falsehood is gone,
  measured 0 across its four owning files against a base of 6, and its replacement is true
  link by link) and NOT held for this one SOURCE POINTER. Classified advisory rather than a
  sixth blocking round because the behavioural content of both sentences is still true and
  the operator consequence is unchanged.
  The choice: patch the pointer in place (three lines), or commission the single rewrite of
  § Limits item 2 and the `:261` table cell from source — the cell is ~1,700 words carrying
  five dated revisions, which is why five consecutive plans declined to touch it.
result: pass
decision: Option A — patch the pointer in place. Owner replied `pass` to an A/B question; the orchestrator read that as authorising the cheap, reversible option and said so, since A does not foreclose B. Applied 2026-09-28: `:261` and the § Limits blockquote now cite `certLevelPlanFor` / `plan === 'force'` and name `app/_components/certLevelPlan.ts`, each with a dated **Re-pointed 2026-09-28** marker in the doc's own revision idiom. Measured after: the dead expression occurs 0 times anywhere in `docs/`, and `certLevelPlan` now occurs 3 times where it previously occurred 0. Behavioural content of both sentences unchanged.

### 5. Spot-confirm the remaining flagged prohibitions
expected: Spot-confirm or overrule the verifier's judgement.
why_human: unverified-prohibition, judgment tier by declaration. Recorded rather than silently absorbed into the score.
note: |
  Verifier judgement (non-authoritative): HELD for all remaining 11-19 / 11-20 / 11-21
  statements, each checked rather than assumed. Cert WC tier half untouched and the control
  not disabled; no sixth run-boundary reset block added; the level half stays GUARDED rather
  than resetting; every behaviour delta named with its cell and measured before/after (cell 5
  `04:0 | 05:0 | 06:0 | 03:1` pre-fix, 0 at every step post-fix; cell 7 unchanged at 1); no
  instrument weakened, deleted or re-pointed to make a new one pass — the one pin MOVED
  (`runEndedRef` 1 -> 0 inside `runCertWorstCase`) is strictly stronger than what it replaced;
  `git diff --name-only 6bb18bf..HEAD -- src/` is EMPTY; no superseded claim erased; the
  do-not-press and restart instructions survive verbatim and got stronger; N-END-03 untouched
  at `[ ]`; REQUIREMENTS.md touched by exactly one commit and `requirements.mark-complete`
  not run.
result: pass

## Summary

total: 5
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps
