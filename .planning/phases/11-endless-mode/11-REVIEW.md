---
phase: 11-endless-mode
reviewed: 2026-09-26T21:40:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - app/_components/PlayingHost.tsx
  - docs/ops/ENDLESS-MODE.md
  - tests/ui/PlayingHost.endless-host.test.ts
  - tests/ui/PlayingHost.endless-retry.test.tsx
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-09-26T21:40:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Round 5 under review is one source conjunct (`!runEndedRef.current &&` leading
`runCertWorstCase`'s level half), three instruments, and a docs/records pass.

The three verification requests from the dispatch were all executed against source
rather than accepted:

1. **WR-03 is genuinely repaired.** I re-ran the exact round-4 mutation — all three
   `if (!runEndedRef.current)` inside `applyChrome` replaced with `if (true)` — and the
   suite went RED at `tests/ui/PlayingHost.endless-host.test.ts:726` on the new
   `GUARD_SHAPE` regex. The old `.toMatch(/runEndedRef\.current/)` could not do this.
   The `.toBe(3)` independent count is a second, non-enumeration kill. Note honestly what
   this costs: the mutation reds exactly **1 of 648** tests, and that one is a source-text
   contract. The test file states this itself and does not oversell it.
2. **The new enumeration does bind sites to resets.** I ran the claimed relocation
   mutation — deleted `runEndedRef.current = false;` from `onRetry`'s campaign branch and
   inserted a duplicate into `startEndlessRun`, holding the file-wide count at 5. Assertion
   4 went RED (`onRetry must clear the run-ended latch inside its OWN body ... expected -1
   to be greater than or equal to 0`). Binding is real, not counting.
3. **The stated behaviour change is not acceptable as characterised, and the neighbouring
   half is open again.** See CR-01 and WR-01.

**On the five-round pattern.** I was asked to weigh it explicitly rather than manufacture
it. It recurs, and in its sharpest form yet: round 4 closed a stranded-deferral defect in
`runCertWorstCase` and wrote the generalised rule into the source — *"do not arm a latch
whose discharge preconditions the same change has made unreachable"* (PlayingHost.tsx:1785-1786).
Round 5 added a conjunct **thirty-four lines above that comment** which makes one more
discharge precondition unreachable, and left the arming term untouched. I proved the
consequence with a driven probe rather than inferring it: one press from a mounted campaign
lose panel with the tier not yet Mid fires **one worst-case injection on a later campaign
session that never pressed the button** (CR-01). That is round-4 WR-01, verbatim, on the
campaign branch.

A second half of the same press is also mis-stated in three artifacts written this round
(WR-01): `injectCertWorstCase()` does not "inject into a world whose loop is already
stopped" — it bumps a SharedValue request that the stopped frame callback cannot consume,
so the load is **queued** and discharges on the first frame of the next run.

Apart from the cert seam, the round-5 work is sound. The `applyChrome` latch, the
five-site reset enumeration, the `getBestForLevel` mock repair and the `WR-02` case with
its anti-vacuity control are all correct, and the doc corrections to `GameHost.tsx:68` /
`:196` / `catalog.ts:14-19` check out against source line-for-line.

## Critical Issues

### CR-01: The new conjunct strands a cert one-shot on an ended CAMPAIGN run — round-4 WR-01 reintroduced on the neighbouring branch

**File:** `app/_components/PlayingHost.tsx:1771-1778` (the new guard) and
`app/_components/PlayingHost.tsx:1806` (the un-updated arming term)

**Issue:**

`runCertWorstCase` sets `defer` from two independent halves and then arms a one-shot with
a term that only knows about the *mode*:

```ts
if (!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03') {
  setLevelId('level-03');
  defer = true;
}
if (tierOverride !== 'mid') { setTierOverride('mid'); defer = true; }
if (defer) {
  certPendingRef.current = modeRef.current !== 'endless';   // line 1806
  return;
}
```

The deferred consumer effect (`PlayingHost.tsx:1815-1836`) requires **both**
`levelId === 'level-03'` **and** `tierOverride === 'mid'`.

Round 5's new leading conjunct creates a fourth way for the level half to be skipped —
*the run has ended* — and that path does **not** satisfy `modeRef.current !== 'endless'`'s
negation, so `certPendingRef` is armed anyway while `levelId` never becomes `level-03`.
The one-shot survives indefinitely and fires on whatever later campaign session first
reaches `level-03`.

Exact precondition: **campaign mode, run ENDED (Results panel mounted), `levelId !==
'level-03'`, `tierOverride !== 'mid'`.**

**Measured, not derived.** Driven through the real host with the file's own harness
(temporary probe case appended to `tests/ui/PlayingHost.endless-retry.test.tsx`, then
reverted):

```
mountOnly()                          -> campaign, level-01, tier Auto
deliverPhase(SIM.LOST, {lives:0, score:2400})   -> lose panel mounted
press(CERT)                          -> level label still level-01
                                        injectCertWorstCase = 0   (nothing at the press)
4x pressLevelSwitch()                -> level-01 -> 04 -> 05 -> 06 -> level-03
                                        injectCertWorstCase = 1   <-- STRANDED DEFERRAL FIRED
```

This is the same shape round 4 measured for the endless branch and closed, and the same
shape the source comment at lines 1785-1786 states as a rule:

> *"The rule this is an instance of: do not arm a latch whose discharge preconditions the
> same change has made unreachable."*

`docs/ops/ENDLESS-MODE.md` is also now wrong by omission: the round-5 clauses at line 261
and lines 481-497 tell an operator that a press from a mounted Results overlay "moves no
level and starts no loop", and the round-4 block above them tells them the branch "leaves
nothing behind on either" sub-branch and "the operator does not have to think about it".
For the campaign-ended branch it leaves exactly one armed injection behind.

**Fix:** arm the deferral only when the level half actually established the discharge
precondition. Track it explicitly so the fix does not depend on reading `levelId`, which
is still the pre-`setLevelId` render value at this point:

```ts
let defer = false;
let levelForced = false;
if (!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03') {
  setLevelId('level-03');
  levelForced = true;
  defer = true;
}
if (tierOverride !== 'mid') {
  setTierOverride('mid');
  defer = true;
}
if (defer) {
  // Arm only if the consumer effect's level precondition is (or is about to be)
  // satisfied. A press whose level half was suppressed — by endless mode OR by the
  // run-ended latch — must arm NOTHING, or it strands a one-shot on a later session.
  certPendingRef.current =
    modeRef.current !== 'endless' && (levelForced || levelId === 'level-03');
  return;
}
```

Then pin it with a driven case in `tests/ui/PlayingHost.endless-retry.test.tsx` — the
probe above is directly reusable — and correct the two `ENDLESS-MODE.md` clauses.

Note that ASSERTION 3 in `tests/ui/PlayingHost.endless-host.test.ts:1519-1522` will red on
the obvious alternative fix (`&& !runEndedRef.current` on line 1806) because it pins the
`runEndedRef` occurrence count in this function at exactly 1 — see WR-02. The
`levelForced` form above avoids that collision.

## Warnings

### WR-01: "injects directly into a world whose loop is already stopped" is false — the injection is QUEUED and lands on the next run

**File:** `app/_components/PlayingHost.tsx:1760-1761` (source comment),
`docs/ops/ENDLESS-MODE.md:261` and `:492-493`,
`tests/ui/PlayingHost.endless-retry.test.tsx:1834-1837` (assertion message)

**Issue:**

Three artifacts written this round assert that with `defer` false the press "injects the
worst-case load **directly** into a world whose loop is already stopped", and the test's
message says "MEASURED, not derived". What was measured is the **mock call count** of
`injectCertWorstCase`, which is mocked to `vi.fn()` at
`tests/ui/PlayingHost.endless-retry.test.tsx:324`. That count cannot see where the load
goes.

Tracing the real implementation:

- `injectCertWorstCase` only bumps a request counter —
  `certRequest.value = certRequest.value + 1` (`src/runtime/useGameLoop.ts:784-788`).
- The request is consumed **only inside `onFrame`**, at
  `src/runtime/useGameLoop.ts:440-448` (`if (certRequest.value !== certApplied.value)`).
- `onFrame` runs only while the frame callback is active. After a run ends, `applyChrome`
  has called `setActive(false)` (`PlayingHost.tsx:1087`, `:1103`, `:1110`).
- Nothing else ever writes `certApplied` — grep gives only lines 335, 441 and the dep array
  at 656. In particular the retry-reset block (`useGameLoop.ts:413-437`) does **not** clear
  it.

So the pending request survives and is consumed on the **first frame after the next
`setActive(true)`** — and because the reset block at line 413 runs *above* the cert block
at line 440 in the same frame, it lands on top of the freshly reset world. Worse,
`applyCertWorstCaseInject` (`src/runtime/worldRequests.ts:131-141`) then sees
`simPhase === DOCKED` and calls `applyServe(world, 360)` with `simPhase = PLAYING`: the
next campaign run auto-serves out of its docked state with 3 balls, particles near the Mid
cap and shake punched. The serve hint (`PlayingHost.tsx:1849-1853`) is bypassed.

This is a second instance of the same pattern as CR-01 at a different seam, and it is the
half the round-5 measurement structurally could not see.

**Fix:** two parts.

1. Correct the claim in all three places. The accurate sentence is: *"with `defer` false
   the press bumps `certRequest`; the loop is stopped, so nothing consumes it until the
   next `setActive(true)`, at which point the load lands on the first frame of the next
   run."*
2. Either guard the injection site or clear the request at reset. The minimal source fix
   is to discard a stale request when a run resets, alongside the existing per-run state:

```ts
// src/runtime/useGameLoop.ts, inside the resetRequest block (~line 414)
resetApplied.value = resetRequest.value;
// A cert inject requested while the loop was stopped belongs to the run that is
// being discarded — never to the run being started.
certApplied.value = certRequest.value;
applyRetryWorldReset(w, compiled.value);
```

Alternatively, refuse to inject at all from an ended run by making the whole of
`runCertWorstCase` return early on `runEndedRef.current` rather than guarding only the
level half — but that changes the control's contract and needs an owner decision, since
"gate the tier half" was explicitly rejected on 2026-09-26.

### WR-02: ASSERTION 3's `runEndedRef`-occurrence-count-of-1 actively blocks the repair for CR-01

**File:** `tests/ui/PlayingHost.endless-host.test.ts:1519-1522`

**Issue:**

```ts
expect(
  (certBodyA.match(/runEndedRef/g) ?? []).length,
  'EXACTLY ONE occurrence of the run-ended latch identifier in runCertWorstCase. A second
   means either a second unguarded route or a comment that leaked a counted literal ...',
).toBe(1);
```

The rationale is sound for its stated threat (a second *unguarded route*), but the
assertion cannot distinguish "a second unguarded route" from "a second **guard**". The
most obvious repair for CR-01 — `certPendingRef.current = modeRef.current !== 'endless' &&
!runEndedRef.current;` — is a correct second guard, and it reds this contract with a
message that misdiagnoses it. A contract that goes red on the fix for a live defect in the
same function is a maintenance hazard, not a safety net.

**Fix:** count guard *sites* rather than identifier occurrences, so a second correct guard
is admissible and a second bare read is not. For example:

```ts
expect(
  (certBodyA.match(/!runEndedRef\.current/g) ?? []).length,
  'every read of the run-ended latch in runCertWorstCase must be a NEGATED guard term — a
   bare, un-negated read means a route that consults the latch without being gated by it',
).toBe((certBodyA.match(/runEndedRef/g) ?? []).length);
```

...plus a separate upper bound if an absolute cap is still wanted. At minimum, widen the
message so the next author is told the count may legitimately move.

### WR-03: ASSERTION 5 pins the two terms of `showPauseOverlay` independently — the connecting operator is unasserted

**File:** `tests/ui/PlayingHost.endless-host.test.ts:1554-1568`

**Issue:**

Member 7 of the enumeration rests on `showPauseOverlay` being a **conjunction**:
`!hasLevelError && uiPhase === 'paused' && result == null` (`src/runtime/GameScreen.tsx:110-111`).
The doc comment at `:1428-1447` is explicit that `result == null` is the load-bearing term
and that `uiPhase === 'paused'` "on its own excludes NOTHING". But the assertions are two
independent `.toMatch()` calls on individual terms; nothing pins the `&&`.

I ran the mutation. Rewriting the line to `!hasLevelError || uiPhase === 'paused' || result == null`
leaves **this contract green** — the whole `endless-host` file stays green. The dispatch's
premise that "a sibling structural gate greps the conjunction as one literal" does not hold:
I grepped the test tree for `showPauseOverlay` and there is no such gate
(`tests/ui/PlayingHost.endless-host.test.ts` lines 1435, 1556, 1559, 1563, 1567, 1569, 1573
are the only hits repo-wide).

The mutation *is* killed — by two pre-existing behavioural cases in
`tests/ui/GameScreen.test.tsx` ("result win: shows Win / Retry from ResultOverlay" and
"result lose: Retry + Menu only, no Next"). So this is an instrument gap, not an uncovered
behaviour. But the round-5 contract claims to derive member 7 from the *full* render
condition, and it derives it from two disconnected fragments of that condition.

**Fix:** assert the conjunction as one structural fact, cheaply and whitespace-tolerantly:

```ts
expect(
  pauseCond,
  'the three terms of showPauseOverlay must be CONJOINED — `result == null` only excludes
   an ended run if it is an AND-term. An `&&` -> `||` rewrite leaves both term assertions
   above green while making PauseOverlay reachable on an ended run',
).toMatch(
  /!hasLevelError\s*&&\s*uiPhase === 'paused'\s*&&\s*result == null/,
);
```

## Info

### IN-01: `noBlocks(codeOnly(...))` ordering is load-bearing and undocumented at the call site

**File:** `tests/ui/PlayingHost.endless-host.test.ts:1461-1476`

**Issue:** `codeOnly` (line 25-27) strips `//` to end-of-line; `noBlocks` strips
`/* ... */`. The pipeline is `noBlocks(codeOnly(src))`, and that order is required rather
than incidental: `app/_components/PlayingHost.tsx:1347` contains the literal `/**` inside a
`//` line comment (the backticked path ``src/levelgen/**``). Stripping blocks first would
open a phantom block comment there and swallow every line up to the next `*/` — which is
inside `startEndlessRun`, one of the three bodies ASSERTION 4 extracts. The bodies would
still be non-empty, so the `.not.toBe('')` vacuity guards would not catch it. The comment
at :1462-1465 explains *why blocks are stripped* but not *why line comments must be
stripped first*.

**Fix:** add a line to that comment naming the order as load-bearing and citing
`PlayingHost.tsx:1347` as the reason, or make `noBlocks` skip block-open markers that sit
to the right of a `//` on the same line.

### IN-02: `setLevelId` is described as a "stable useState setter" — it is not

**File:** `app/_components/PlayingHost.tsx:1808-1809`

**Issue:**

```ts
// setLevelId / setTierOverride are stable useState setters — listed so R-24
// deps at this cert-arm site stay explicit (exhaustive-deps must not be ignored here).
}, [levelId, tierOverride, injectCertWorstCase, setLevelId, setTierOverride]);
```

`setTierOverride` is a `useState` setter and is stable. `setLevelId` is not — it is a
custom `useCallback` declared at `PlayingHost.tsx:252-263` with dependency array
`[levelId, onLevelIdChange]`, so its identity changes on every `levelId` change. No
behavioural consequence (`levelId` is already the first dependency, so the callback
rebuilds regardless), but the stated justification for listing it is wrong and a future
author may act on it.

**Fix:** amend to *"`setTierOverride` is a stable useState setter; `setLevelId` is the
local useCallback at the top of this file and is keyed on `levelId`, which is already
listed."*

### IN-03: the `Cert WC` row of the run-boundary table is now a ~1,400-word single table cell

**File:** `docs/ops/ENDLESS-MODE.md:261`

**Issue:** Round 5 appended a fifth "Extended ..." clause to a Markdown table cell that
already carried four rounds of amendment. The cell now contains the round-4 re-scoping,
the round-5 extension, a full condition transcription and a test-case name, all on one
logical line. Every other row in the table is one sentence. It will not render legibly and
the next amendment has nowhere to go.

**Fix:** reduce the cell to its one-sentence current behaviour (*"A boundary only through
its tier half, and only when the forced tier is not already `mid`; the level half fires
only on a live campaign run below `level-03`"*) and move the dated amendment history to a
`### Cert WC — amendment history` subsection below the table, where the existing
`> **Correction, 2026-09-26.**` and `> **The Cert WC counterexample...**` blocks already
live.

---

_Reviewed: 2026-09-26T21:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
