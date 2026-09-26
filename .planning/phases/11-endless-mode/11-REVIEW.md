---
phase: 11-endless-mode
reviewed: 2026-09-26T10:02:06Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app/_components/PlayingHost.tsx
  - docs/ops/ENDLESS-MODE.md
  - tests/ui/PlayingHost.endless-host.test.ts
  - tests/ui/PlayingHost.endless-record.test.tsx
  - tests/ui/PlayingHost.endless-retry.test.tsx
findings:
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-09-26T10:02:06Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Round 3 of gap closure. Four changes are under review: the mode term on the
`getBestForLevel` publication (11-12), the `runEndedRef` term on the endless WON
branch plus the `waveAdvanceInFlightRef` clear in `failEndlessStart` (11-13), the
mode term on `runCertWorstCase`'s level half (11-14), and the re-measured
`docs/ops/ENDLESS-MODE.md`.

Baseline checks all green and were run, not assumed: `npx tsc --noEmit` is clean,
the three endless suites pass (67 tests), `eslint` reports 0 errors / 2 warnings
(both newly introduced, IN-01).

Three of the four code changes do what they claim. Two defects were found by
driving the real host through scratch probes (both probes were deleted after
measurement; no source file was modified):

1. **The 11-13 latch stops at the wave, not at the chrome.** An endless run that has
   ended still repaints its own Results overlay from post-boundary mirrors. Measured:
   `Score · 2400` → `Score · 9999` while `recordRunEnd` had already banked 2400, on an
   overlay simultaneously showing `Best · 2400` and `New Record`. Same producer
   (a straggler mirror) that 11-13 accepted as real for the wave walk. CR-01.
2. **11-14's gate strands a one-shot flag.** Pressing `Cert WC` during an endless run
   with the tier not already Mid arms `certPendingRef` for a deferred injection whose
   preconditions can never be met while endless. Measured: the injection then fires
   unbidden on a later, unrelated campaign session. WR-01.

Both new gap-3 drives in `PlayingHost.endless-retry.test.tsx` deliver the straggler
mirror carrying the *same* score as the boundary mirror, which is why CR-01 is
invisible to them (WR-04).

No security findings. The only randomness (`Date.now() >>> 0` run seed) is correctly
documented as a difficulty input and explicitly disclaimed as non-CSPRNG
(`ENDLESS-MODE.md` § Limits 5); there is no injection, deserialization, credential or
path surface in this scope. `safeWatermark` correctly hardens the persisted-blob → UI
boundary.

## Critical Issues

### CR-01: An ended endless run keeps repainting its own Results overlay — displayed score diverges from the recorded score

**File:** `app/_components/PlayingHost.tsx:934-946` (chrome writes at 936-940, the new
latch at 976)

**Issue:** 11-13 added `if (runEndedRef.current) { return; }` to the endless WON branch
so that an ended run stays ended. The guard sits at line 976 — *below* the five
unconditional chrome writes at the top of `applyChrome`:

```ts
const applyChrome = useCallback((mirror: ChromeMirror) => {
  setSimPhaseNum(mirror.phase);
  setLives(mirror.lives);
  setScore(mirror.score);      // <- runs for every post-boundary mirror
  setCombo(mirror.combo);
  setStallTier(mirror.stallTier);
  if (modeRef.current === 'endless' && mirror.phase === SIM.WON) {
    if (runEndedRef.current) { return; }   // 11-13's latch
```

`score` / `lives` are the props `GameScreen` hands to the real `ResultOverlay`
(`src/runtime/GameScreen.tsx:192-195`), so a mirror that arrives after the run
boundary rewrites the finished run's displayed numbers while `recordRunEnd` has
already banked the boundary values.

Measured on the real host through this repo's own `PlayingHost.endless-record`
harness (scratch probe, since deleted): endless run at wave 2, `LOST` at score 2400,
then **one** straggler `WON` mirror at score 9999:

```
recorded: {"mode":"endless","wave":2,"score":2400,"outcome":"lose",...}
overlay after loss:      Lose … Wave · 2  Score · 2400  Best · 2400  Best wave · 2  New Record
overlay after straggler: Lose … Wave · 2  Score · 9999  Best · 2400  Best wave · 2  New Record
host score prop: 9999
```

The result is exactly the class 11-13's own comment names as the defect it closes —
"an overlay that contradicts the readout behind it": the player is shown a score of
9999 sitting above a `Best · 2400` and a `New Record` badge, for a run filed at 2400.
`lives`, `combo`, `stallTier` and `simPhaseNum` mutate on the same path.

Reachability is the *same* producer 11-13 accepted as real when it wrote the wave-walk
fix (`tests/ui/PlayingHost.endless-retry.test.tsx`, the gap-3 preamble: "a straggler
frame that was in flight when the loop stopped"). If that producer is real enough to
walk the wave, it is real enough to rewrite the score. The defect is display-tier —
nothing false reaches `telemetry.endless` — but it is player-visible and it is a hole
in the precise claim this round shipped.

**Fix:** an ended run's chrome must not move at all. Hoist the latch to the first
statement of `applyChrome`, above the chrome writes:

```ts
const applyChrome = useCallback((mirror: ChromeMirror) => {
  // ONE latch, EVERY boundary — including the chrome. A run that has ended owns its
  // final score, lives and combo; a straggler mirror may not rewrite them.
  if (runEndedRef.current) {
    return;
  }
  setSimPhaseNum(mirror.phase);
  ...
```

This is safe against lock-out: every path that begins or resumes a run clears
`runEndedRef` *before* re-arming the loop — `startEndlessRun` (clears, then `retry()`
+ `setActive(true)`), `onRetry`'s campaign branch, `goNext`, `toggleDevLevel`,
`remountDevSession` — and `handleMenuPress` unmounts the host. If the HUD behind the
overlay is wanted live for some reason, the alternative is a `resultScore` /
`resultLives` state snapshotted at the boundary and passed to `ResultOverlay` instead
of the live `score` / `lives`; do not leave the overlay reading mutable chrome.

## Warnings

### WR-01: `runCertWorstCase` strands `certPendingRef`, and the deferred injection later fires on an unrelated campaign run

**File:** `app/_components/PlayingHost.tsx:1676-1687` (and the consumer effect at
1691-1720)

**Issue:** 11-14 gates the level half on the mode but leaves the deferral bookkeeping
untouched:

```ts
if (modeRef.current !== 'endless' && levelId !== 'level-03') { setLevelId('level-03'); defer = true; }
if (tierOverride !== 'mid') { setTierOverride('mid'); defer = true; }
if (defer) { certPendingRef.current = true; return; }
```

Press `Cert WC` during an endless run with the tier **not** already Mid: the level half
is now gated, so `levelId` stays (say) `level-01`, but the tier half still sets
`defer = true` and latches `certPendingRef.current = true`. The consumer effect
requires `levelId === 'level-03' && tierOverride === 'mid'`, and nothing in endless can
ever satisfy the first term — so the flag is never cleared, and the press injects
nothing at all. Before 11-14 the level half supplied the missing precondition and the
deferred injection fired; the gate removed the trigger but not the latch.

The flag survives the run. Measured on the real host (scratch probe, since deleted):
endless run at wave 2 → press `Cert WC` (tier unset) → 0 injections, run restarts at
wave 1 as documented → then walk `Lv` four times (`level-01 → 04 → 05 → 06 →
level-03`, `PLAYABLE_LEVEL_ORDER`) with `tierOverride` still Mid → **1
`injectCertWorstCase` call** on a campaign run that never pressed the button. Note
`levelId` is GameHost-controlled (`app/_components/GameHost.tsx:195-199`), so the
level walk survives a Menu round trip too.

**Fix:** do not arm a deferral whose preconditions are unreachable.

```ts
if (defer) {
  // While endless the level half is gated, so the deferred effect's
  // `levelId === 'level-03'` precondition can never be met — arming it here strands
  // the one-shot and fires it on a later campaign session.
  certPendingRef.current = modeRef.current !== 'endless';
  return;
}
```

### WR-02: `ENDLESS-MODE.md`'s re-measured `Cert WC` guidance is false for one of the two branches it enumerates

**File:** `docs/ops/ENDLESS-MODE.md:433-448` (and the boundary-table row at 261)

**Issue:** the SC-5 do-not-press block states, as a re-measurement dated 2026-09-26:

> **`Cert WC`** (`runCertWorstCase`) still **injects the worst-case ball, particle and
> shake load onto the board under measurement**, which alone disqualifies any frame
> time captured across it

That is true only of the tier-already-Mid branch. In the tier-unset branch — the very
branch the next two sub-bullets describe — `defer` is set, the function returns before
`injectCertWorstCase()`, and (per WR-01) the deferred injection is stranded rather than
delivered. So the press injects **nothing** onto the board under measurement, and the
injection instead appears later, on a board the reader is not measuring. The
boundary-table row at line 261 has the same shape: it asserts "It still injects the
worst-case load onto the live board" for the tier-Mid case (correct) and says nothing
about the tier-unset case leaving an armed one-shot behind.

This matters because the document's stated purpose is that a later reader "finds it
already worked through rather than rediscovering it", and this block was explicitly
re-measured this round.

**Fix:** split the claim per branch and disclose the stranded deferral (after WR-01 is
fixed, the second half of the correction becomes "nothing is armed"):

```markdown
> - **the tier half**, when the tier is not already `mid`, sets it to `mid` … and the
>   press injects **nothing** on this path: `runCertWorstCase` returns at its `defer`
>   branch before `injectCertWorstCase()`. The worst-case load is injected only when
>   the tier is ALREADY `mid`, which is the bullet below.
```

### WR-03: `toggleDevLevel` republishes the *outgoing* level's campaign best as the *incoming* level's `Best`

**File:** `app/_components/PlayingHost.tsx:1548` (`setResultBest(previousBestRef.current)`,
added by 11-12 Task 2)

**Issue:** `toggleDevLevel` calls `setLevelId(next)` at line 1509 and then publishes
`previousBestRef.current` at 1548. That ref holds `getBestForLevel(levelId)` for the
level being **left** — the preload effect's re-run for the new level is asynchronous
(it is the whole premise of the fix). So between the press and the next storage read,
the host renders one campaign level's personal best as another campaign level's
`Best ·`. The value published is mode-correct and level-wrong.

It is latent today for exactly the reason 11-11's WR-04 was latent before it was
fixed: `best` only reaches `ResultOverlay`, and `toggleDevLevel` sets `result` to
`null` in the same commit. The 11-11 comment block argues at length that a latent
wrong-record publication is worth fixing now because Phase 14 adds a mid-run record
surface; the same argument applies verbatim here.

The new test cannot see it: the storage mock is
`getBestForLevel: (id: LevelId) => getBestForLevelImpl(id)` where every implementation
ignores `id` and returns the single module-level `campaignBest`
(`tests/ui/PlayingHost.endless-record.test.tsx:339-341`), so `level-01`'s best and
`level-04`'s best are the same number by construction.

**Fix:** cache per level rather than per mount, and publish the entry for the level
being switched **to**:

```ts
const bestByLevelRef = useRef<Partial<Record<LevelId, number>>>({});
// in the preload effect, alongside previousBestRef.current = b:
bestByLevelRef.current[levelId] = b;
// in toggleDevLevel, computing `next` before setLevelId:
setResultBest(bestByLevelRef.current[next] ?? 0);
```

and make the test mock honour its argument (`getBestForLevelImpl = (id) => id === 'level-01' ? 7777 : 123`)
so the level term is actually observed.

### WR-04: the new gap-3 drives cannot observe post-boundary chrome mutation

**File:** `tests/ui/PlayingHost.endless-retry.test.tsx:886-905, 911-946, 960-1022`

**Issue:** all three new gap-3 cases deliver the post-boundary straggler with the
*same* score as the boundary mirror — `deliverPhase(SIM.LOST, { lives: 0, score: 2400 })`
followed by `deliverPhase(SIM.WON, { score: 2400 })`. Every assertion is therefore
about the wave readout, `advanceWave`, `boardFingerprint()` and `recordRunEnd`; none
can see that `applyChrome` unconditionally rewrote `score`, `lives`, `combo` and
`simPhaseNum` from the straggler (CR-01). The cases prove what they claim, but they
leave the neighbouring half of "an ended run stays ended" unmeasured, which is the
same blind spot the round-2 verifier called out for source-only contracts.

**Fix:** give the straggler a distinguishable payload and assert the run's own numbers
are frozen — this is the drive that makes CR-01 red:

```ts
await deliverPhase(SIM.LOST, { lives: 0, score: 2400 });
await deliverPhase(SIM.WON, { lives: 3, score: 9999 });
expect(hostProps.current?.score, 'an ended run owns its final score').toBe(2400);
expect(hostProps.current?.lives).toBe(0);
```

(and the rendered-text sibling in `PlayingHost.endless-record.test.tsx`:
`expect(overlayText()).toContain('Score · 2400')`).

## Info

### IN-01: two new lint warnings introduced by this round's test code

**File:** `tests/ui/PlayingHost.endless-host.test.ts:367, 372`

**Issue:** `npx eslint` on the four changed source/test files reports 0 errors and
exactly 2 warnings, both added this round:
`Array type using 'ReadonlyArray<T>' is forbidden. Use 'readonly T[]' instead
(@typescript-eslint/array-type)` — the `endlessOnly` / `campaignOnly` declarations.

**Fix:** `const endlessOnly: readonly (readonly [string, string])[] = [...]`, or run
`eslint --fix` on the file.

### IN-02: the source file now carries a formatting constraint imposed by a test regex

**File:** `app/_components/PlayingHost.tsx:1642-1645`

**Issue:** `runCertWorstCase` documents that it may use `//` comments only, because
`codeOnly()` in `tests/ui/PlayingHost.endless-host.test.ts:28-30` strips line comments
but not block comments, so a `/** */` note could satisfy or falsify a structural
contract with prose. That is a real hazard, but the remedy puts the burden on every
future author of that function instead of on the instrument.

**Fix:** strip block comments in the instrument as well, then delete the constraint
from the source:
`src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')`.

### IN-03: `PlayingHost.tsx` is a 1,898-line file whose component body is a single ~1,600-line function

**File:** `app/_components/PlayingHost.tsx:189-1790`

**Issue:** 652 of 1,898 lines (34 %) are comments, much of it planning narrative
(round numbers, review IDs, rejected alternatives) rather than API documentation. The
endless subsystem — `mode`/`modeRef`, `wave`/`waveRef`, `runSeedRef`,
`waveAdvanceInFlightRef`, `runEndedRef`, `advanceToWave`, `startEndlessRun`,
`failEndlessStart`, `recordInFlightEndlessRun` — is a cohesive unit spread across
~700 lines of an already-large host, and three of this phase's defects (the walking
wave, the unguarded publication, the un-mode-aware `Cert WC`) were each "one missing
term in one branch" of it.

**Fix:** extract a `useEndlessRun({ store, compiledSv, advanceWave, retry, setActive })`
hook owning the refs, the boundary funnel and `advanceToWave`, returning
`{ mode, wave, startRun, failStart, recordInFlight, onChrome }`. The source-contract
tests get a far smaller and more stable surface to anchor regexes against as a side
effect.

### IN-04: the per-run reset block is copy-pasted across five callbacks

**File:** `app/_components/PlayingHost.tsx:1347-1356, 1410-1419, 1454-1463, 1560-1569, 1608-1617`

**Issue:** the identical ten-line "new run" block (wall-clock refs, `setLives(3)`,
`setScore(0)`, `setCombo(1)`, `setStallTier(0)`, `setSimPhaseNum(SIM.DOCKED)`,
`setUiPhase('playing')`) appears verbatim in `startEndlessRun`, `onRetry`, `goNext`,
`toggleDevLevel` and `remountDevSession`, each preceded by a near-identical
chrome-clearing block. The phase's own history records `toggleDevLevel` as "the third
un-mode-aware copy of the run-boundary reset, with the same omission list as the two
already fixed" — i.e. this duplication has already produced defects, and a sixth
copy will produce another.

**Fix:** one `beginNewRun()` helper (plus `clearEndOfRunChrome()`), called from all
five sites; the only per-site difference is whether `retry()` / `setActive(true)`
follow, which the caller keeps.

---

_Reviewed: 2026-09-26T10:02:06Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
