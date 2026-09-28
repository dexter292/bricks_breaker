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

  WHAT THE DRY RUN ESTABLISHED — the procedure has now been run end to end, and ALL FOUR
  WAVE TRANSITIONS W1->W2->W3->W4->W5 were reached, which is the full range the discharge
  procedure asks for:
  1. Step 1 works. The `Endless` control in the `__DEV__` dev row starts an endless run and
     the `W{n}` readout appears beside it and advances correctly at every transition.
  2. Generated boards render and RAMP: wave 1 sparse, wave 5 dense with brick types absent
     from wave 1 (magenta, and grey slashed armoured bricks). SC-2's ramp is visible.
  3. The run loop is sound across ~4 minutes of continuous play: score 0 -> 33,110, combo
     multiplier reaching x7, lives awarded on wave clear (3 -> 5), no crash.
  4. Signature (a) black playfield: NOT OBSERVED, at any point, including on the screenshot
     taken immediately after each of the four transitions.
  5. Signature (c) `[audio] preload soft-fail`: ZERO occurrences across **62,081** captured
     device-log lines spanning all four transitions. Zero JS errors, zero red boxes.
  6. Signature (b) audio hiccup: audio queues start and stop normally per brick hit; not
     judgeable on a simulator and not judged.
  7. § Limits item 7's squashed glow halo: NOT ASSESSABLE at this render. Neither confirmed
     nor denied — recorded as unassessed rather than as absent.
  8. The endless Results overlay is ENDLESS-SCOPED at the surface: `Wave`, `Score`,
     `Best · 11090`, `Best wave · 2`, Retry + Menu. `Best · 11090` is the endless record, NOT
     the campaign `Best · 127420` the Title screen shows. SC-5's firewall is visible to the
     eye, not only to the firewall suite.
  9. Belongs to WINDOWS #18, not here: the dev row overflows at 402 pt, clipped at the LEFT
     (`high` where `auto high` belongs) while `Cert WC`, `Endless`, `Daily`, `W{n}` and
     `Crash` stay fully visible and tappable. Confirms from the opposite direction what
     phase 12's UAT item 7 note warned — the row already overflowed before `Daily` existed —
     and adds a fact nobody had: the `W{n}` readout ITSELF widens the row while endless is
     active, so the overflow is worst during exactly the run SC-5 measures.

  HOW THE WAVES WERE REACHED, STATED PLAINLY. Manual play could not do it: the control loop
  (screenshot -> decide -> tap) round-trips in ~1.3 s while the ball crosses the playfield in
  ~1-1.8 s, so the paddle cannot track it; three runs ended on wave 1. The waves were reached
  with a HARNESS AFFORDANCE — `PADDLE_WIDTH` and its three sibling assignment sites
  (`allocate.ts`, `reset.ts`, and `rules/effects.ts`'s per-step `baseW`, which resets the
  width every tick) temporarily widened 72 -> 360 logical, making the paddle span the full
  playfield so the ball cannot be lost. Paddle width is not an input to the glow-bake path
  (plan 11-05 re-keyed `loadKey` onto BRICK dimensions) nor to audio preload, so it does not
  touch what signatures (a) and (c) are about. It IS nonetheless a modified build, and this
  record says so rather than presenting the observation as coming from the shipped tree.
  REVERTED immediately after: `git diff` over `src/ app/ tests/ scripts/` is EMPTY and the
  full suite is green at 107 files / 798 tests on the restored tree.

  SECOND PASS, 2026-09-28 — THE PERF OVERLAY ARMED. The first pass missed that the
  procedure's "arm the perf overlay" step is a shipped project dev flag, not a source change:
  `PERF_OVERLAY = process.env.EXPO_PUBLIC_PERF_OVERLAY === '1'` (`src/devflags.ts`), which
  feeds `drawOverlayFlag` in `PlayingHost.tsx`. Because `EXPO_PUBLIC_*` is inlined at BUNDLE
  time, a second Metro was started on port 8082 carrying the flag and the dev client pointed
  at it by deep link; the user's own Metro on 8081 was left untouched. This is the instrument
  the discharge procedure names, used as it is meant to be used.

  READINGS, all four transitions W1->W2->W3->W4->W5 traversed in one continuous run:

  | Point | p95 | p99 | frames>16.7ms | sprites |
  |---|---|---|---|---|
  | campaign level-01, before endless | 16.67 | 16.67 | **3 / 152** | 256 |
  | wave 2 (after 1st transition) | 16.67 | 16.67 | **3 / 3,980** | 256 |
  | wave 3 (after 2nd) | 16.67 | 16.67 | **3 / 12,809** | 256 |
  | wave 4 (after 3rd) | 16.67 | 16.67 | **3 / 20,515** | 256 |
  | wave 5 (after 4th) | 16.67 | 16.67 | **3 / 28,682** | 256 |

  `worklet tick PASS` at every reading. Final score 30,030, 5 lives, no crash.

  THE RESULT: the over-budget counter NEVER MOVED. It is the same 3 frames at 28,682 samples
  that were already there at 152 samples on campaign level-01 BEFORE endless started. Endless
  play and all four wave transitions added **zero** dropped frames. p95 and p99 sat on the
  16.67 ms display interval throughout, so the distribution shows no deviation even at the
  99th percentile. `sprites` held at 256 with no growth across waves.

  WHY THIS IS EVIDENCE, AND EXACTLY HOW FAR IT GOES. SC-5's real question is whether the
  glow-bake / audio-preload COLD PATH re-fires at a wave transition. That is a question about
  WORK, and work that re-fires would add over-budget frames on any hardware. None were added
  across four transitions and ~28.5k frames. Combined with signature (a) not observed and
  ZERO `preload soft-fail` lines in 62,081 device-log lines, three of the four failure
  signatures are now observed-negative AT REAL TRANSITIONS rather than argued from source.

  WHAT IT STILL DOES NOT DO — unchanged, and the reason test 1 stays blocked. A Mac has far
  more headroom than a mid-tier phone: a cold path costing ~10 ms on device might cost ~1 ms
  here and never cross 16.7 ms, so an absence of dropped frames on this hardware cannot
  establish `p50 <= 16.7 ms, p95 <= 20 ms` ON DEVICE. The measurement narrows the risk
  substantially; it does not close it. `Device digest` stays OPEN and N-END-03 stays `[ ]`.

  A by-product worth keeping: the paddle has a MOVEMENT SPEED CAP. A slow continuous
  `touch_path` tracks 1:1 (commanded 135 pt, reached 132) while a fast jump is clipped
  (commanded 100 pt, reached 155). Anyone automating this surface needs to know that.

  WHAT IS STILL MISSING, WHICH IS THE WHOLE POINT: signature (d), the frame-time budget
  (p50 <= 16.7 ms, p95 <= 20 ms). A simulator cannot produce it — it runs on the Mac's CPU,
  does not emulate the GPU, and has no thermal throttling, so it would read green whether or
  not the defect exists. Signatures (a) and (c) are now observed-negative at four real
  transitions, which narrows the risk but does not close it: they are the visible and logged
  symptoms of the bake/preload cold path re-firing, and (d) is the measurement SC-5 is about.

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
