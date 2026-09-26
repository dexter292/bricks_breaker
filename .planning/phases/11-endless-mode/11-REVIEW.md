---
phase: 11-endless-mode
reviewed: 2026-09-26T13:30:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - app/_components/PlayingHost.tsx
  - src/runtime/GameScreen.tsx
  - src/runtime/overlays/ResultOverlay.tsx
  - tests/ui/PlayingHost.endless-retry.test.tsx
  - tests/ui/PlayingHost.endless-record.test.tsx
  - tests/ui/PlayingHost.endless-host.test.ts
  - tests/ui/PlayingHost.endless-run.test.tsx
  - tests/ui/PlayingHost.endless.test.ts
  - tests/ui/ResultOverlay.test.tsx
  - tests/ui/GameScreen.test.tsx
  - docs/ops/ENDLESS-MODE.md
findings:
  critical: 1
  warning: 5
  info: 6
  total: 12
status: issues_found
---

# Phase 11 (plans 11-07 / 11-08): Code Review Report

**Reviewed:** 2026-09-26T13:30:00Z
**Depth:** standard (incremental — `b29ccf9..HEAD`, +2562/−113)
**Files Reviewed:** 11
**Status:** issues_found

## Summary

The two recorded gaps are genuinely closed on the paths the plans name. Gap 2 in particular is
clean: the mode branch is first, `evaluatePersonalBest` is syntactically unreachable from the
endless arm, the watermark refs are separate, the post-merge read comes off the synchronous
`recordRunEnd` return, and `previousBestRef` is never written by an endless run. `npx tsc
--noEmit` is clean and all 87 UI tests pass.

Two things this review establishes against the areas flagged in the brief:

1. **The `waveBuildFailedWave` value-discrimination invariant holds.** Traced every writer.
   `waveRef` is initialised to `1`, assigned `1` in `startEndlessRun` before `advanceToWave(1)`,
   and otherwise assigned only inside `advanceToWave` *after* a successful compile, always to
   `waveRef.current + 1`. It can therefore never be `< 1`, so the mid-run value
   `waveRef.current + 1` is always `>= 2` and the Retry-time literal `1` never collides. The
   executor's reasoning is correct. See IN-01 for the fragility that remains.
2. **The remaining test assertions are not vacuous in the ways the brief worried about** — the
   region-extraction harnesses are guarded by "the harness itself is honest" cases, the
   falsification notes (e.g. `campaignBest = 0` at `endless-record.test.tsx:518`) are load-bearing,
   and the negative assertions sit beside positive ones on the same extracted region. Four
   lower-value soft spots are recorded as IN-02…IN-04 and IN-06.

What the round did **not** close is the class of defect it set out to fix. Gap 1 was "the
run-boundary resets were never made mode-aware". `onRetry` and `remountDevSession` were fixed;
`toggleDevLevel` and the `__DEV__` `Endless` button itself — both live controls on the same dev
row, both reachable mid-run — were not. And `startEndlessRun`'s own failure return mutates run
identity before it bails, which produces a resumable run that can never be recorded. Those are
CR-01, WR-01, WR-02 and WR-03 below, each confirmed by driving the real host rather than by
reading.

Out of scope as instructed and **not** reported: `ENDLESS_BRICK_DIMS` / the stretched halo (§
Limits item 7), SC-5's unmeasured device half, the `__DEV__`-only entry point, `N-END-03`
staying unchecked.

## Critical Issues

### CR-01: `startEndlessRun` mutates run identity before its failure return, leaving a resumable run that can never be recorded

**File:** `app/_components/PlayingHost.tsx:1115-1122` (with `1157-1176`, `1063-1078`)

**Issue:** The failure return inside `startEndlessRun` runs *after* two irreversible writes:

```ts
runSeedRef.current = Date.now() >>> 0;
waveRef.current = 1;
if (!advanceToWave(1)) {
  setWaveBuildFailedWave(1);
  return;              // <- everything below never runs
}
```

Everything that would make those writes coherent — `setWave`, `setResult(null)`,
`runEndedRef.current = false`, `retry()`, `setActive(true)` — is below the return.
`advanceToWave` writes `compiledSv` only on success, so the board actually in play is still the
wave-N board.

Reached from `onRetry`'s endless branch during a **paused live run**, the post-condition is:

| state | value |
|---|---|
| `runEndedRef.current` | `true` (set by `recordInFlightEndlessRun`, line 1008) |
| `waveRef.current` | `1` |
| `wave` (HUD state) | still `N` |
| `compiledSv.value` | still the wave-N board |
| `result` | `null` — no Results overlay, so the A-01 copy cannot render |
| `uiPhase` | `'paused'` — the Pause overlay is still up, `Resume` is live |

Verified empirically by driving the real host through the 11-07 harness (Pause → Retry at wave 2
with `compileGeneratedLevel` forced to fail): `result prop = null`, `uiPhase = paused`,
`wave readout = W2`, `board unchanged from wave2 = true`.

Three consequences follow, all silent:

1. **The run is unrecordable.** `runEndedRef.current` is latched `true`, so when the player
   resumes and eventually loses, `applyChrome`'s LOST branch skips `handleRunEnded` entirely and
   just calls `setResult('lose')` — the resumed run vanishes from telemetry, and the Results
   overlay it raises shows the *previous* run's metrics.
2. **The run rewinds.** `waveRef.current` is `1` while the wave-N board is in play, so the next
   `WON` calls `advanceToWave(2)` and `setWave(2)`: a run at wave 30 silently restarts its
   difficulty ramp and seed walk at wave 2.
3. **`waveRef` and `wave` diverge** (ref says 1, HUD says `W2`) because `waveRef` is assigned in
   two places — line 1116 and inside `advanceToWave` — and only the second keeps them in step.

**Fix:** make the run-identity writes atomic with the successful swap, and make the failure
return leave *nothing* changed. Move `waveRef.current = 1` out of `startEndlessRun` (it is
redundant — `advanceToWave` already assigns `waveRef.current = nextWave` on success), and snapshot
/ restore the seed:

```ts
const prevSeed = runSeedRef.current;
runSeedRef.current = Date.now() >>> 0;
if (!advanceToWave(1)) {
  runSeedRef.current = prevSeed;   // no half-applied run identity
  setWaveBuildFailedWave(1);
  return;
}
// advanceToWave already did waveRef.current = 1 + setWave(1)
```

and give the failure a reachable surface so a paused/mid-run caller is not left in a Pause
overlay with no signal — see WR-01. If `recordInFlightEndlessRun` has already latched
`runEndedRef`, the failure return must also decide what "the run already ended but did not
restart" means; the least surprising answer is to force the Results overlay up
(`setResult('lose'); setActive(false);`) so the only live control is the `Retry` the copy points
at.

## Warnings

### WR-01: the owner-decided `Wave 1 could not be built — tap Retry` copy is unreachable from two of the three `startEndlessRun` call sites

**File:** `app/_components/PlayingHost.tsx:1107-1110`, `1117-1122`; `src/runtime/overlays/ResultOverlay.tsx:105`; `src/runtime/GameScreen.tsx:117`

**Issue:** `setWaveBuildFailedWave(1)` fires **before** `modeRef.current = 'endless'` /
`setMode('endless')` (line 1123-1124), and the overlay nulls the value outside endless:

```ts
const failedWave = isEndless ? waveBuildFailedWave : null;   // ResultOverlay.tsx:105
```

`GameScreen` additionally mounts `ResultOverlay` only when `result != null`. So the copy renders
only when the caller was *already* in endless mode **and** a Results overlay was *already* on
screen — i.e. only the Results-`Retry` path. The other two callers get nothing:

- **First entry** (the `Endless` dev button, the only way into the mode): driven through the real
  host with a forced compile failure, the host ends with `result = null`, `mode = 'campaign'`,
  `waveBuildFailedWave = 1` and no wave readout. The button does nothing and says nothing — the
  "silent no-op" option the owner explicitly rejected on 2026-09-26.
- **`remountDevSession` / Pause → `Retry`** mid-run: `result` is `null`, so same silence (see
  CR-01).

The source-contract test at `PlayingHost.endless-host.test.ts:310-332` asserts that *both* early
returns call `setWaveBuildFailedWave(1)`, and `endless-record.test.tsx:598` renders the copy —
but only from the one path where it can reach the screen. The contract reads as proven; two
thirds of it is unreachable.

**Fix:** flip the mode and raise the overlay before the readiness/build gate, so the failure has a
surface regardless of entry point:

```ts
const failEndlessStart = () => {
  modeRef.current = 'endless';
  setMode('endless');
  setWaveBuildFailedWave(1);
  setResult('lose');     // the only overlay with a live Retry
  setActive(false);
};
if (!levelReady || levelError != null || !fxReady) { failEndlessStart(); return; }
```

### WR-02: the `__DEV__` `Endless` button discards a live endless run without recording it

**File:** `app/_components/PlayingHost.tsx:1094` (`startEndlessRun`), `1489-1497` (the Pressable)

**Issue:** `startEndlessRun` does not call `recordInFlightEndlessRun`. The `Endless` Pressable
stays mounted and tappable for the whole run (`devLevelSwitch` is rendered above the overlays at
`GameScreen.tsx:208-222`), so a second press mid-run re-mints the seed, resets `waveRef` to 1 and
clears `runEndedRef` — dropping the in-flight run on the floor.

Confirmed by driving the real host: from wave 2, pressing `Start an endless run` leaves the wave
readout at `W1` with `recordRunEnd` called **zero** times.

This is verbatim the defect gap 1 raised against `remountDevSession` ("it never calls
`handleRunEnded`, so an in-flight endless run is silently discarded"), left open on a sibling
path — and `docs/ops/ENDLESS-MODE.md` now asserts the opposite in bold: *"every path that
discards a run records it first"*. It does not inflate `bestWave` (the wave resets to 1), so it
is data loss rather than corruption.

**Fix:** put the funnel inside `startEndlessRun`, which is where the doc's invariant actually
belongs, and drop the now-redundant call from `onRetry` / `remountDevSession`:

```ts
const startEndlessRun = useCallback(() => {
  recordInFlightEndlessRun();   // no-op in campaign and for an already-ended run
  ...
```

Then add `recordInFlightEndlessRun` to the dependency array and declare it above
`startEndlessRun` (the TDZ note at line 1088-1092 applies to it too).

### WR-03: `toggleDevLevel` is the run-boundary reset gap 1 did not reach, and 11-08 raised the cost of the `modeRef` latch

**File:** `app/_components/PlayingHost.tsx:1260-1292` (with `1214-1242` `goNext`, `270-280`)

**Issue:** `toggleDevLevel` performs the same reset the other four boundaries do — `result` null,
`runEndedRef.current = false`, lives/score/combo/`simPhaseNum` reset, `uiPhase = 'playing'`,
wall-clock rebased — and is mode-blind: it neither records the in-flight endless run nor resets
`waveRef` / `runSeedRef` / `waveAdvanceInFlightRef` / `modeRef`. Same omission list as the two
functions 11-07 fixed. It is reachable mid-endless-run from the same dev row.

Its most damaging combination with a *pre-existing* condition is new this round. `setMode` /
`modeRef` are only ever written to `'endless'`, never back (recorded as A-02, still open), and
11-08 made `mode` drive overlay copy for the first time. So after `Lv` is pressed during an
endless run the host is a campaign level with `mode === 'endless'`: any Results overlay it raises
renders `Wave · {stale}` and `Best wave · {endless}`, suppresses the star row and `Next`, and
announces `Retry endless run from wave 1` on a campaign level. Clearing `runEndedRef` on top of
that also un-latches the double-record guard for a run already written.

Today the A-02 dead frame loop mostly masks this (the compiled-push gate early-returns, so
`setActive(true)` is never reached) — but `onResume`'s countdown *does* call `setActive(true)`
unconditionally at `line 1075`, which is a live route back into the stale board.

**Fix:** route `toggleDevLevel` (and `goNext`, for symmetry) through the same mode branch the
other two use, and make it an explicit *exit* from endless rather than an undefined state:

```ts
if (modeRef.current === 'endless') {
  recordInFlightEndlessRun();
  modeRef.current = 'campaign';
  setMode('campaign');
  waveRef.current = 1;
  setWave(1);
  waveAdvanceInFlightRef.current = false;
}
```
Writing `modeRef` back to `'campaign'` here is also the minimal discharge of A-02.

### WR-04: `startEndlessRun` republishes the campaign per-level best into the endless display state

**File:** `app/_components/PlayingHost.tsx:1132`

**Issue:** `setResultBest(previousBestRef.current)` sits in the endless run-start path.
`previousBestRef` is `store.getBestForLevel(levelId)` — a campaign level best — so for the whole
duration of an endless run the host's `best` prop *is* a campaign number. The write half of the
firewall is genuinely closed (`previousBestRef` is never assigned from endless, and the source
contract at `endless-host.test.ts:178-181` fences it); the **read** half is not, and this line is
the one `handleRunEnded`'s own comment at line 760-762 points at.

It is latent only because the Results overlay is unmounted while a run is live and
`handleRunEnded` always overwrites `resultBest` before `setResult` raises it. The new test
`an endless run does not write the campaign personal best`
(`endless-record.test.tsx:550-573`) pins the leak as intended behaviour —
`expect(...).toBe('host-best=100')` where `100` is `campaignBest`. Phase 14's production endless
chrome (any mid-run `Best` surface) turns this latent leak into a rendered campaign number.

**Fix:** publish the endless watermark, not the campaign one, and delete the coupling:

```ts
setResultBest(endlessBestScoreRef.current);
setResultBestWave(endlessBestWaveRef.current);
setResultWave(0);
```
and update the test probe to assert that `host-best` is the *endless* watermark after a Retry —
which is a strictly stronger statement of "the endless run did not poison the campaign ref" than
asserting the campaign number is displayed.

### WR-05: five near-identical run-boundary reset blocks, and the duplication is the root cause of gap 1

**File:** `app/_components/PlayingHost.tsx:1128-1146`, `1181-1198`, `1226-1241`, `1275-1291`,
`1319-1337`

**Issue:** `startEndlessRun`, `onRetry`, `goNext`, `toggleDevLevel` and `remountDevSession` each
carry a hand-copied ~14-line block (`clearCountdown` → `setCountdownNumeral(null)` →
`setResult(null)` → `setWaveBuildFailedWave(null)` → `setIsNewRecord(false)` →
`setResultStars(null)` → `setNextGateId(null)` → `runEndedRef` → three wall-clock refs → five
chrome setters → `setUiPhase('playing')`), differing only in whether they call
`setResultBest(previousBestRef.current)` and whether they end with `retry(); setActive(true);`.

This is not a style complaint: the verification report's root-cause sentence for gap 1 is "these
resets were never made mode-aware", and 11-07 fixed two of the five copies by hand. WR-03 is the
third copy, still unfixed, and any future field added to a run boundary has five sites to reach.

**Fix:** extract one helper and let each caller layer its differences on top:

```ts
const resetRunChrome = useCallback((opts: { best?: number } = {}) => {
  clearCountdown();
  setCountdownNumeral(null);
  setResult(null);
  setWaveBuildFailedWave(null);
  setIsNewRecord(false);
  setResultStars(null);
  setNextGateId(null);
  if (opts.best != null) setResultBest(opts.best);
  runEndedRef.current = false;
  runStartedAtRef.current = Date.now();
  runWallClockMsRef.current = 0;
  wallClockActiveRef.current = true;
  setLives(3); setScore(0); setCombo(1); setStallTier(0);
  setSimPhaseNum(SIM.DOCKED);
  setUiPhase('playing');
}, [clearCountdown]);
```

## Info

### IN-01: the `waveBuildFailedWave` value-only discrimination is sound but unfenced

**File:** `src/runtime/overlays/ResultOverlay.tsx:106-113`; `app/_components/PlayingHost.tsx:933`

**Issue:** The invariant (`1` ⇒ Retry-time, `>= 2` ⇒ mid-run) holds on every path today — traced
and confirmed above. But the only thing keeping it true is that `startEndlessRun` restarts at
wave 1, and `11-UI-SPEC.md` § Run boundaries explicitly contemplates the alternative ("If resuming
at wave N is ever wanted instead..."). The day that changes, a Retry-time failure becomes a
wave-N failure and the overlay starts telling the player `run saved` about a run that was never
saved — with no test failing, because the copy tests pass the prop directly.

**Fix:** make the discriminant explicit rather than inferred — `waveBuildFailedAt: { at: 'start' } |
{ at: 'mid'; wave: number } | null` — or, minimally, add a `__DEV__` invariant at the writer:
`if (__DEV__ && waveRef.current < 1) console.error('[endless] waveRef below 1 breaks the wave-build-failure copy')`.

### IN-02: the compiled-push-effect contract extracts a ~225-line region, not the effect it names

**File:** `tests/ui/PlayingHost.endless-host.test.ts:335-337`

**Issue:** `/useEffect\(\(\) => \{\n([\s\S]*?)\n {2}\}, \[loadResult, fxReady, compiledSv, setActive, retry\]\);/`
is lazy in the capture but the match *starts* at the earliest position — the first
`useEffect(() => {` in the file (`PlayingHost.tsx:450`, the campaign-best preload). The captured
`body` therefore spans lines 451-676: the preload effect, the watermark seed effect, the uiPhase
effect, the bake effect and the compiled-push effect. It passes for the right reason today only
because no earlier effect contains either search string.

**Fix:** anchor the start on the effect's own first statement, or assert the region's size:
```ts
const m = code.match(/\/\/ Push compiled[\s\S]*?useEffect\(\(\) => \{\n([\s\S]*?)\n {2}\}, \[loadResult, fxReady, compiledSv, setActive, retry\]\);/);
```

### IN-03: the badge-style equality assertion is satisfied by construction

**File:** `tests/ui/ResultOverlay.test.tsx:232-268`

**Issue:** `waveBadges[0].getAttribute('class')).toBe(scoreStyle)` compares the class of the one
`styles.badge` node across two renders. `ResultOverlay` has no branch on *which* record fired —
`isNewRecord` is a single boolean and the badge has one static style — so the two classes cannot
differ for any input. The test reads as protection against "electing a primary record" (A-08) but
the only thing it can actually catch is the badge count.

**Fix:** either drop the style half (the `toHaveLength(1)` assertions carry the real content), or
make it a real guard by asserting the component receives no record-kind discriminant at all —
e.g. a source contract that `ResultOverlay`'s props contain no `recordKind` / `isWaveRecord`.

### IN-04: two ordering helpers, contradictory comments

**File:** `tests/ui/PlayingHost.endless-record.test.tsx:463-468` vs
`tests/ui/ResultOverlay.test.tsx:140-151`

**Issue:** `ResultOverlay.test.tsx` documents the advancing-cursor `indexOf` pattern as the
vacuity bug it removed ("made the returned array monotonic by construction... green no matter what
order the component rendered") and replaces it with independent `indexOf` calls.
`endless-record.test.tsx` then implements the ordering check with exactly the cursor pattern.

Both are in fact adequate for these unique line strings (a cursor search that overshoots returns
`-1` and fails), so neither test is broken — but one of the two comments is wrong, and a reader
following the `ResultOverlay` comment will conclude `endless-record.test.tsx`'s check is fake.

**Fix:** hoist one helper into a shared test util and delete the incorrect half of the comment.

### IN-05: a Retry-time build failure renders the previous run's metrics beside the failure copy

**File:** `app/_components/PlayingHost.tsx:1107-1122`; `src/runtime/overlays/ResultOverlay.tsx:142-149`

**Issue:** The two failure returns clear neither `resultWave` nor `resultBestWave` nor
`resultBest`, so on the one path where the copy is reachable (Results → `Retry`) the player sees
`Wave 1 could not be built — tap Retry` above `Wave · {previous run's wave}` / `Score · {previous
run's score}`, with nothing marking those numbers as belonging to a run that already ended. The
unit test `a Retry-time wave-build failure says tap Retry` bakes this in by asserting
`Wave · 7` alongside `waveBuildFailedWave: 1`.

**Fix:** either zero the run-scoped lines on the Retry-time failure, or (better) suppress `Wave ·`
and `Score ·` entirely when `failedWave <= 1`, since there is no run for them to describe.

### IN-06: planning narrative embedded in production source

**File:** `app/_components/PlayingHost.tsx` (throughout; e.g. `203-235`, `320-338`, `702-719`,
`988-1010`, `1080-1106`, `1161-1176`)

**Issue:** `PlayingHost.tsx` is now 1595 lines, a large fraction of which is prose narrating the
planning history — "Gap 2 was precisely the opposite order", "11-07 gap 1, second half", "decided
`retry-in-place` by the owner on 2026-09-26", "11-08 wired the READER", "11-07's scoped
`eslint-disable` ... is deleted with this change". These describe the *diff*, not the code, and
will be wrong the first time either changes; the `11-VERIFICATION.md` / `11-UI-SPEC.md` /
`docs/ops/ENDLESS-MODE.md` copies are already the durable record.

**Fix:** keep the invariant statements ("the mode branch happens before the comparison", the TDZ
note at 1088-1092, the `runWave`-is-a-ref note) and cut the before/after archaeology to a one-line
pointer at `docs/ops/ENDLESS-MODE.md § The run boundary and the record display`.

---

_Reviewed: 2026-09-26T13:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
