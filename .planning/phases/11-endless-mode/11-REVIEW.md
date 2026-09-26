---
phase: 11-endless-mode
reviewed: 2026-09-26T16:40:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - app/_components/PlayingHost.tsx
  - src/runtime/overlays/ResultOverlay.tsx
  - tests/ui/PlayingHost.endless-retry.test.tsx
  - tests/ui/PlayingHost.endless-record.test.tsx
  - tests/ui/PlayingHost.endless-host.test.ts
  - tests/ui/ResultOverlay.test.tsx
  - docs/ops/ENDLESS-MODE.md
findings:
  critical: 1
  warning: 7
  info: 5
  total: 13
status: issues_found
---

# Phase 11 (round 2): Code Review Report

**Reviewed:** 2026-09-26T16:40:00Z
**Depth:** standard (incremental — `d63e298..HEAD`, plans 11-09 / 11-10 / 11-11)
**Files Reviewed:** 7
**Status:** issues_found

## Summary

The three verifier-measured gaps are genuinely closed, and the three self-reported anomalies all
check out against the shipped source:

- **Anomaly 1 (11-10, the direct `modeRef.current = 'campaign'` write).** Confirmed. Deleting
  `modeRef.current = 'campaign'` from `toggleDevLevel` and keeping `setMode` leaves every
  behaviour case green and reddens exactly one source-contract case. The resulting contract is
  **not** vacuous — the extraction is non-empty-guarded and the `recordAt < modeRefAt` ordering
  pin is real. The device-side reasoning (`applyChrome` arrives over a `runOnJS` hop that can land
  before React's effect flush) is sound and is corroborated by CR-01 below, which demonstrates
  that a chrome mirror genuinely can land after the JS-side state transition.
- **Anomaly 2 (11-11, `previousBestRef` counted as two REGIONS).** Confirmed genuinely stronger.
  `inSeedEffect + inCampaignArm === total` is a closed-world claim over the whole file, not a
  count of two statements; `inCampaignArm` is pinned to exactly `1`. The only looseness is that
  `inSeedEffect` is `> 0` rather than `=== 2`. But the *invariant it stands for* is not closed —
  see WR-01.
- **Anomaly 3 (11-09, the success-path `setWaveBuildFailedWave(null)` clear).** Confirmed present
  and correct at `PlayingHost.tsx:1257`; deleting it turns a case red. It is, however, pinned at
  source tier only (WR-03).

Mutation probing (32 targeted mutants, all restored; `git diff` verified clean afterwards) shows
the new suite is mostly load-bearing: 26 of 32 mutants were killed, including the un-hoist of
`onRetry`'s endless branch, the deletion of the funnel from `startEndlessRun`, and the `>= 2`
boundary in `waveBuildFailureKind`. That is a real improvement over round 1.

What the round did **not** catch is concentrated in three places: a run-end state transition that
`applyChrome`'s endless branch does not guard (CR-01, reproduced and measured), the *other half*
of WR-04 that the fix did not fence (WR-01, reproduced and measured), and a small set of new
statements and new ops-doc claims that no test or source reads (WR-02 … WR-07). One new test
passes with a provably dead control.

`tsc --noEmit` and `eslint` are clean on all seven files; the four test files are 76/76 green.

## Critical Issues

### CR-01: A late or duplicate WON mirror resurrects an endless run that has already ENDED

**File:** `app/_components/PlayingHost.tsx:929-976`
**Issue:**
The endless WON intercept is the only run-boundary branch in `applyChrome` that does **not**
consult `runEndedRef`. Both campaign branches do (`:983`, `:990`), and so does every other
boundary in the file (`handleMenuPress`, `recordInFlightEndlessRun`, the mid-run failure arm).
The endless branch gates on `waveAdvanceInFlightRef` alone, which is released by any non-WON /
non-LOST mirror (`:977-981`) — including the very `DOCKED` mirror that follows a successful wave
transition.

So once an endless run has ended — by `LOST`, by the mid-run wave-build failure arm, or by the new
`failEndlessStart()` — a single further `WON` mirror re-enters the branch, generates and compiles a
new board, writes it into `compiledSv`, calls `advanceWave()` and moves `waveRef` / `wave`.

This is not hypothetical. The file's own Pitfall 5 note (`:286`) states that the WON mirror can
arrive twice, and `setActive(false)` is a JS→UI-runtime hop that an already-dispatched `runOnJS`
frame can outrun. Measured against the repo's own `PlayingHost.endless-retry.test.tsx` harness
(temporary probe, since removed):

```
start endless → advanceToWaveTwo() → deliverPhase(LOST, lives:0, score:2400)
  → result='lose', readout W2, recordRunEnd calls = 1
deliverPhase(WON)
  → PROBE RESULT readout=W3 advanceWaveCalls=1 boardChanged=true result=lose recordCalls=1
```

The player is left looking at a Results overlay that reads `Wave · 2` / `Out of lives` while the
dev readout says `W3`, a wave-3 board sits in `compiledSv`, and a wave swap has been requested on a
loop that is supposed to be stopped. Because `runEndedRef` is latched, the resurrected wave can
never be recorded — `handleRunEnded` is unreachable for it. This directly contradicts the "ONE
coherent state" post-condition asserted in
`tests/ui/PlayingHost.endless-record.test.tsx` and the ops-doc claim that every path that discards
a run records it first.

It also widens with this round: `failEndlessStart` creates a *new* ended-run state in which
`runEndedRef` is latched, `waveAdvanceInFlightRef` may be `false`, and `modeRef` is still
`'endless'` — i.e. a third entry into the same hole.

**Fix:** gate the endless branch on the same funnel every other boundary uses, and clear the
advance guard when the run ends:

```tsx
if (modeRef.current === 'endless' && mirror.phase === SIM.WON) {
  // A run that has already ended has no next wave — a late/duplicate WON must not
  // regenerate a board, bump advanceWave() or move waveRef (Pitfall 5).
  if (runEndedRef.current) {
    return;
  }
  if (!waveAdvanceInFlightRef.current) {
    ...
  }
  return;
}
```

and add `waveAdvanceInFlightRef.current = false;` to `failEndlessStart` (`:1151-1166`) so the two
ended-run states agree. A behavioural case belongs beside the existing
`'a wave that cannot be built ENDS the run'` case: deliver `LOST`, then a bare `WON`, and assert
`advanceWave` was not called and the readout did not move.

## Warnings

### WR-01: WR-04 is only half closed — the campaign per-level best still reaches `best` during a live endless run

**File:** `app/_components/PlayingHost.tsx:460-477` (the `getBestForLevel` effect), with
`tests/ui/PlayingHost.endless-host.test.ts:228-291` (the contract that cannot see it)
**Issue:**
WR-04's stated invariant is that the host `best` prop "belongs to the mode the player is in at
EVERY moment of an endless run, not only at the moments the overlay happens to be mounted"
(`PlayingHost.endless-record.test.tsx`, WR-04 block). The fix removed *one* writer —
`startEndlessRun`'s `setResultBest(previousBestRef.current)`. A second writer survives: the
`getBestForLevel` mount effect depends on `[store, levelId]` and calls `setResultBest(b)`
unconditionally, with no mode term.

Measured against the repo's own controlled-mount harness (temporary probe, since removed):

```
mountControlledAndStartEndless() → advanceToWaveTwo()   // live endless run, readout W2
rerenderWithLevel('level-04')
  → host-best = 7777  (CAMPAIGN_BEST_DEFAULT), mode = 'endless'
```

The round's own test suite already knows this happens — the `liveRunThenCloseTheGate` docblock in
`PlayingHost.endless-record.test.tsx` says the `levelId` change "pushes the CAMPAIGN level best
into `resultBest`" and treats it as a convenient fixture rather than as the same prohibition.

Production reachability in a dev build: `runCertWorstCase` calls `setLevelId('level-03')` while
`modeRef` is `'endless'` (`PlayingHost.tsx:1600-1611`) — see WR-07. The latency profile is
identical to the WR-04 the owner chose to fix now rather than bank as debt: nothing renders `best`
mid-run today, and Phase 14's mid-run endless record surface makes it visible.

The source contract cannot catch this, because it counts `previousBestRef.current =` assignments,
not `setResultBest(` call sites.

**Fix:** make the effect's *publish* mode-aware while keeping the ref write unconditional (the ref
is campaign state and must stay fresh):

```tsx
.then((b) => {
  if (cancelled) return;
  previousBestRef.current = b;
  // The ref is campaign state and always refreshes. The PROP is the player-facing
  // record line and belongs to the current mode (11-UI-SPEC § Record Display Contract).
  if (modeRef.current !== 'endless') {
    setResultBest(b);
  }
})
```

and widen the source contract from `previousBestRef.current =` to `setResultBest(` call sites, so
the second writer is fenced too.

### WR-02: `'leaves a LIVE Retry control on screen, not a decorative one'` passes with a provably dead control

**File:** `tests/ui/PlayingHost.endless-record.test.tsx:931-953`
**Issue:**
The case claims to prove the Retry is "Pressable, not merely rendered". It presses Retry while
compilation is still forced to fail, then asserts the same failure copy is still on screen. That
copy was **already** on screen before the press, so the assertion is satisfied by construction — a
dead control that "changes nothing" satisfies it exactly as well as a live one that re-attempted
and failed. The inline comment ("a dead control would throw or change nothing") names the hole and
then permits it.

Measured: with `src/runtime/overlays/ResultOverlay.tsx` mutated to `onPress={undefined}` on the
Retry `Pressable`, this case still passes (`Tests 1 passed | 19 skipped`).

This is precisely the failure mode the round was commissioned to hunt. (The sibling case in
`PlayingHost.endless-retry.test.tsx:851-889` does it right — it clears `failCompileFrom` and
asserts the second press actually recovers.)

**Fix:** assert something only a live press can produce. The harness already exposes the lever:

```tsx
const before = compileCalls;
await act(async () => { fireEvent.click(retryButton); await Promise.resolve(); });
expect(
  compileCalls,
  'a live Retry re-mints the seed and re-attempts the build — a dead control attempts nothing',
).toBeGreaterThan(before);
expect(
  recordRunEnd,
  'and it still writes no phantom run for a start that never began (T-11-02)',
).toHaveBeenCalledTimes(0);
```

The second assertion also closes half of WR-03.

### WR-03: four properties whose consequences are described as behaviour are pinned by a source contract alone

**File:** `app/_components/PlayingHost.tsx:1162`, `:1257`, `:1470`, `:668-670`
**Issue:**
The round's own standard is stated repeatedly: "a source contract standing in for a driven one is
exactly how the previous round's gap 3 shipped green." Mutation probing shows four statements where
that standard is not met — deleting each leaves **all 66 behaviour cases green** and reddens only a
source-contract case:

| Deleted statement | Only test that goes red | Consequence the code comment claims |
|---|---|---|
| `runEndedRef.current = true` (`failEndlessStart`, `:1162`) | `both startEndlessRun failure returns route through failEndlessStart (A-01)` | "a later Retry writes a phantom `{wave:1, score:0, abandoned}` run" — a fabricated row in the data Phase 13 reads |
| `setWaveBuildFailedWave(null)` (success path, `:1257`) | same case | "a successful Retry after a failed start runs a real run whose eventual loss still reads *could not be built*" |
| `waveRef.current = 1` (`toggleDevLevel`, `:1470`) | `toggleDevLevel exits endless (A-02)` | "the ref and the HUD diverge" |
| the endless early-return in the compiled-push effect (`:668-670`) | `the compiled-push effect is a no-op during an endless run (SC-5)` | "overwrites the live generated board and calls `retry()`" — destroying lives, score and combo |

The first two are reachable from the existing harness in a handful of lines. The phantom-run one is
one assertion away (see WR-02's fix). The failure-copy one needs: fail the first start, clear
`failCompileFrom`, press Retry, deliver `LOST`, and assert `result-slot` reads `Out of lives` and
not `could not be built` — the record file already drives every step of that sequence in
`'the run that FOLLOWS a failed start is a real, recordable run'` and simply stops before rendering
the loss.

**Fix:** drive the two reachable ones behaviourally and keep the source contracts as the ordering
fence. For the remaining two, say so explicitly in the block comment the way 11-10 did for
`modeRef.current = 'campaign'` — the honest disclosure pattern already exists in this file.

### WR-04: a failed restart erases the acknowledgement of the run it just recorded

**File:** `app/_components/PlayingHost.tsx:1159`, with `src/runtime/overlays/ResultOverlay.tsx:150`
**Issue:**
`startEndlessRun` now calls `recordInFlightEndlessRun()` first, which routes into `handleRunEnded`
and sets `setResultWave(runWave)` and `setIsNewRecord(record)` for the run that just ended. If the
start then fails, `failEndlessStart()` runs in the same batch and overwrites `setIsNewRecord(false)`
(`:1159`), while `waveBuildFailureKind` returns `'start'` and `showRunLines` suppresses the `Wave ·`
and `Score ·` lines (`ResultOverlay.tsx:150`).

Net effect: a deep endless run that was abandoned *and set a new record* is recorded to storage
correctly, and then presented to the player with no wave, no score and no `New Record` badge —
only `Wave 1 could not be built — tap Retry`. This is the same class of harm the mid-run
`ENDLESS_WAVE_FLOOR` tripwire message warns about ("suppress the Wave and Score lines for a run
that exists"), arriving from the other direction.

Reachable today through the very path 11-10's hoist tests drive: live run at wave 2 → Pause →
Retry with the gate closed. The three cases in
`'Retry with the readiness gate CLOSED'` assert the copy and the watermarks and never look at
`isNewRecord`.

Mutation evidence that none of this is covered: deleting `setIsNewRecord(false)` (`:1159`), deleting
`setResultStars(null)` + `setNextGateId(null)` (`:1160-1161`), deleting `setActive(false)`
(`:1165`) and deleting `clearCountdown()` + `setCountdownNumeral(null)` (`:1154-1155`) each leave
all 76 tests green. The `clearCountdown()` survivor matters most: without it, a pending resume
countdown's third timer fires `setUiPhase('playing'); setActive(true)` (`:1100-1104`) and restarts
the frame loop behind an ended run's overlay — reachable by pressing the dev tier button during a
resume countdown.

**Fix:** either let the recorded run keep its badge (drop the unconditional `setIsNewRecord(false)`
and let `handleRunEnded`'s value stand when the funnel fired), or state in the JSDoc that a failed
restart deliberately suppresses the ended run's presentation and add a case pinning it. Either way,
add coverage for `setActive(false)` and `clearCountdown()` — the mid-run failure case already
asserts `setActive.mock.calls.at(-1)?.[0] === false`; the failed-start cases should do the same.

### WR-05: the readiness-gate failure renders a copy that misstates the cause, and offers a remedy that cannot work on one of its two paths

**File:** `app/_components/PlayingHost.tsx:1216-1219`
**Issue:**
`startEndlessRun` routes `!levelReady || levelError != null || !fxReady` to the same
`failEndlessStart()` as `!advanceToWave(1)`, so the player is told
`Wave 1 could not be built — tap Retry` when in fact **no wave was attempted at all**. The
contract copy has two bodies (11-UI-SPEC § Endless copy); this is a third case folded into one of
them.

Two sub-cases, with different severities:

- `fxReady` false (glow bake still in flight — reachable in production by pressing `Endless`
  during the bake window). The copy is wrong but the remedy works: a later Retry passes the gate.
- `levelError != null` / `levelReady` false. **The remedy can never work.** Inside endless,
  `levelId` cannot change: `goNext` requires `nextGateId`, which `handleRunEnded`'s endless arm
  always sets to `null`; `runCertWorstCase` is dev-only; and `toggleDevLevel` *exits* endless. So
  `loadResult.ok` is frozen and every Retry press reproduces the identical overlay forever — a
  dead-end loop wearing the copy the owner chose precisely to avoid "a dead-looking Retry button".

The three `'Retry with the readiness gate CLOSED'` cases establish this state and none of them
presses Retry a second time, so the loop is untested in the direction that would expose it.

**Fix:** give the readiness path its own post-condition. Minimum: pass the cause through so the
body can distinguish "not ready yet" from "could not be built", e.g.
`failEndlessStart(reason: 'not-ready' | 'build-failed')` with the `'not-ready'` body naming a
remedy that exists. If the two-body contract must hold, then at least gate the readiness branch so
it does not latch `modeRef` / `runEndedRef` on the `levelError` sub-case, which is the sub-case with
no exit.

### WR-06: the ops doc's SC-5 note states a false mechanism for the tier button, contradicting a comment added in the same round

**File:** `docs/ops/ENDLESS-MODE.md:412-418`
**Issue:**
The new do-not-press rationale says the tier button's "new quality budget **re-bakes the glow
atlas** — forcing the very bake cold path this reading exists to prove is *not* entered at a
transition."

That is false. The bake effect's dependency array is
`[audio, haptics, glowAtlasSv, loadResult, loadKey]` (`PlayingHost.tsx:656`) — no tier, no
`vfxBudget` — and `bakeGlowSprites(brickW, brickH)` (`:604`) takes only brick dimensions. A tier
change cannot re-bake the atlas.

The same round says so in the opposite direction, in a test comment:
`tests/ui/PlayingHost.endless-retry.test.tsx:566-569` — "The glow-bake effect does not depend on
the tier (its array ends `loadResult, loadKey`), so the press cannot flip `fxReady`". The two new
artifacts contradict each other, and the doc block is explicitly labelled "verified against the
shipped source rather than inherited from the earlier note."

The warning itself is still correct on other grounds — `remountDevSession` → `startEndlessRun`
records and restarts the run you are measuring, and `useGameLoop` reallocates pools on a budget
change. Only the glow-atlas clause is wrong.

**Fix:** replace the re-bake clause with the real mechanism (run restart + `useGameLoop` pool
reallocation), and cross-reference the test comment so the two stay in step.

### WR-07: the ops doc's `Cert WC` claim is false, and `Cert WC` can discard an endless run without recording it

**File:** `docs/ops/ENDLESS-MODE.md:419-424`, with `app/_components/PlayingHost.tsx:1600-1660`
**Issue:**
Two separate problems in the same bullet.

**(a) The doc claim is false.** "The cert inject itself is left deferred behind `certPendingRef`,
waiting on a campaign-shaped remount that the endless branch does not perform." The deferred-inject
effect (`PlayingHost.tsx:1625-1650`) gates on
`!levelReady || levelError != null || !fxReady || levelId !== 'level-03' || tierOverride !== 'mid'`
— there is **no mode term**. `runCertWorstCase` sets both `levelId` and `tierOverride`
unconditionally, so once the re-bake lands the inject fires into the live endless run. Nothing is
"waiting on a campaign-shaped remount".

**(b) A genuine unrecorded discard.** `runCertWorstCase` does not call
`recordInFlightEndlessRun()` and does not exit endless. When `tierOverride` is already `'mid'` —
reachable, since the tier button is the control immediately beside it — only the `setLevelId`
half runs, so `remountDevSession` never fires and the funnel is never reached. The endless run
survives with a changed `levelId`, the campaign best is pushed into `best` (WR-01), and the cert
worst case is injected into it. That is a fourth un-mode-aware run-boundary-shaped control, of the
same family as the `toggleDevLevel` one A-02 just closed, and it sits under the ops doc's bolded
claim that "every path that discards a run records it first".

**Fix:** correct the doc bullet to state what the effect actually does, and either add
`recordInFlightEndlessRun()` to `runCertWorstCase` or add a mode term to the deferred-inject gate.
A one-line source contract (`runCertWorstCase` must be listed among the funnel's callers, or must
early-return in endless) would keep this from drifting again.

## Info

### IN-01: `ENDLESS_WAVE_FLOOR` tripwire is unreachable by construction

**File:** `app/_components/PlayingHost.tsx:951-957`
**Issue:** `waveRef` is initialised to `1` (`:283`) and is written in exactly two places —
`advanceToWave` with `nextWave >= 1` (`:911`) and `toggleDevLevel` with the literal `1` (`:1470`).
`waveRef.current < ENDLESS_WAVE_FLOOR` is therefore dead in every reachable state. Replacing the
condition with `false && …` leaves all 76 tests green. The JSDoc discloses this honestly ("NO test
in this repo can drive this red"), so this is recorded rather than objected to.
**Fix:** none required. If it survives to Phase 14, consider `console.assert`-style phrasing or a
`// istanbul ignore` marker so a future coverage gate does not flag it as untested branch weight.

### IN-02: `failEndlessStart` does not clear `waveAdvanceInFlightRef`

**File:** `app/_components/PlayingHost.tsx:1151-1166`
**Issue:** The two other run-end paths handle the advance guard — the mid-run failure arm clears it
(`:939`) and `startEndlessRun`'s success path clears it (`:1281`). `failEndlessStart` does not, so a
failed restart pressed while an advance is in flight leaves the guard latched until the next
successful start. Harmless today because the run has ended; it becomes load-bearing once CR-01 is
fixed.
**Fix:** add `waveAdvanceInFlightRef.current = false;` beside `runEndedRef.current = true;`.

### IN-03: `toggleDevLevel` does not republish `best` on the endless → campaign exit

**File:** `app/_components/PlayingHost.tsx:1447-1490`
**Issue:** The two campaign resets both call `setResultBest(previousBestRef.current)`
(`onRetry:1341`, `remountDevSession:1546`). The new endless→campaign exit does not, so between the
press and the `getBestForLevel` promise resolving, `best` still carries the endless watermark while
`mode` is `'campaign'`. It self-heals because `setLevelId` always changes the id
(`PLAYABLE_LEVEL_ORDER` has five entries), and the overlay is unmounted during the window.
**Fix:** for symmetry with the other two resets, add `setResultBest(previousBestRef.current);`
after the mode flip, or note in the JSDoc that the reload is relied on.

### IN-04: the ops-doc run-boundary table row for the tier change is now stale

**File:** `docs/ops/ENDLESS-MODE.md:257`
**Issue:** "`__DEV__` tier change (`remountDevSession`) | Records `abandoned`, then routes to
`startEndlessRun()`" describes round 1's shape. Since 11-10, `remountDevSession` records nothing —
it routes first, and `startEndlessRun`'s first statement is the funnel. The very next paragraph
(added in the same commit) says so in bold, so the table row now contradicts the prose beneath it.
**Fix:** reword to "Routes to `startEndlessRun()`, which records `abandoned` at the wave reached"
to match the `Endless` button and `Lv` rows added alongside it.

### IN-05: `codeOnly()` strips only `//` comments, leaving `/** … */` blocks in the matched text

**File:** `tests/ui/PlayingHost.endless-host.test.ts:25-27`
**Issue:** `PlayingHost.tsx` is roughly one-third JSDoc, and those blocks survive `codeOnly`. The
direction of risk is asymmetric — a `not.toMatch()` contract goes falsely *red* (safe), but a
positive `.toMatch()` contract could be satisfied by prose rather than code. No current assertion
is propped up this way as far as I could determine, but the guard is one docblock rewrite away from
becoming wrong, and one contract's own message already claims more than the helper delivers
("codeOnly strips `//` only, so these patterns match code forms, never the prose", `:344-347`).
**Fix:** strip block comments too, and re-run — note that doing so naively breaks several region
anchors, so the extraction regexes will need to be re-verified at the same time:

```ts
function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}
```

---

## Review method (for the record)

- All seven files read in full; `tsc --noEmit` and `eslint` clean.
- 32 targeted mutants applied to `PlayingHost.tsx` / `ResultOverlay.tsx`, each run against all four
  test files and reverted immediately; `git diff` confirmed clean after every batch. Six survivors,
  all reported above.
- Three temporary probe test files created inside `tests/ui/` to measure CR-01, WR-01 and WR-02,
  each deleted immediately after; `git status` confirmed clean.
- No source file was left modified by this review.

**Explicitly NOT reported, per the phase's own disclosures:** SC-5 / `N-END-03`'s unmeasured
frame-timing half; `ENDLESS_BRICK_DIMS` and the stretched brick halo (Phase 14 debt); the
`__DEV__`-only endless entry point; `failEndlessStart`'s A-02-disclosed mode latch; and the SC-5
do-not-press note still covering `Cert WC` and the tier button (only the *mechanism* stated for
those two is objected to, in WR-06 / WR-07 — not the warning itself).

_Reviewed: 2026-09-26T16:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
