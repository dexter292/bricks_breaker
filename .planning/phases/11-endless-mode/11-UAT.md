---
status: partial
phase: 11-endless-mode
source: [11-VERIFICATION.md]
started: 2026-09-27T00:00:00Z
updated: 2026-09-27T00:00:00Z
---

## Current Test

[testing paused — 4 items outstanding]

Paused 2026-09-27 at the user's request to move on to Phase 12. Test 1 was skipped
(no device reading taken); tests 2, 3, 4 and 5 were never presented and remain
[pending], deliberately — no decision was recorded on the reader's behalf.
Resume with `/gsd-verify-work 11`; it picks up at test 2.

## Tests

### 1. SC-5 device reading — wave transitions stay inside the Mid budget
expected: p50 <= 16.7 ms and p95 <= 20 ms across each wave-1..5 transition, with none of the four failure signatures. Full procedure in `docs/ops/ENDLESS-MODE.md` § SC-5. This is the first round whose procedure carries no verifier correction — the do-not-press warning and the "restart the app and take the reading again" instruction are both present, both survive verbatim, and the reason given for them is now true of the shipped code.
why_human: No automated step in this repo can produce a frame on hardware.
result: skipped
reason: User skipped — no device reading taken this session. SC-5 / N-END-03 stays undischarged.

### 2. The cert self-cancel's positive direction
expected: Zero injections on a later campaign `level-03` session after an intervening endless detour.
why_human: No harness in this repo can observe the positive direction of the drop.
note: OPTIONAL and explicitly NOT load-bearing for gap 1 — belt-and-braces added by 11-19 beyond what the gap required. Its absence reds only a source contract; cell 5 stays green without it.
result: [pending]

### 3. E1 / E3 overflow backstops
expected: No wrap, no clipping, at the stated extreme values.
why_human: jsdom computes no layout.
result: [pending]

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
result: [pending]

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
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 4
skipped: 1
blocked: 0

## Gaps
