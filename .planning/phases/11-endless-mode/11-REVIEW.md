---
phase: 11-endless-mode
reviewed: 2026-09-26T11:39:55Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app/_components/PlayingHost.tsx
  - docs/ops/ENDLESS-MODE.md
  - tests/ui/PlayingHost.endless-host.test.ts
  - tests/ui/PlayingHost.endless-record.test.tsx
  - tests/ui/PlayingHost.endless-retry.test.tsx
findings:
  critical: 0
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 11: Code Review Report (round 4)

**Reviewed:** 2026-09-26T11:39:55Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found
**Diff base:** `1693fcab9e340d74dfcd837eb1a10911d027c9b1`

## Summary

Two changes are under review: 11-15 (hoist `if (runEndedRef.current) { return; }` to the
first statement of `applyChrome`, delete the now-unreachable inner copy) and 11-16 (add a
run-mode term to `runCertWorstCase`'s deferral arm, re-scope the `Cert WC` injection claim
in `ENDLESS-MODE.md`).

**Round-3 CR-01 is genuinely fixed, verified at source and by mutation — not accepted on
the plan's word.** `applyChrome` line 991 is the first statement of the callback body; every
subsequent write in that function, including the five mirror-sourced chrome writes at
994–998, is below it and the guard body is a bare `return`. Deleting lines 991–993 turns
**9 test cases across 3 files** red (measured in this review, not quoted from the plan), and
those failures include both the prop-channel and the rendered-overlay channel. The branch
this review was asked to check specifically — `waveAdvanceInFlightRef.current = false` at
line 1095, now unreachable once the latch holds — **is** benign, and I traced it
independently rather than taking the planner's word: the ref is read only inside
`modeRef.current === 'endless'` (line 1003), and the only path that puts `modeRef` back to
`'endless'` is `startEndlessRun`, which clears both refs together at 1407–1408. The three
campaign clearers that leave `waveAdvanceInFlightRef` alone (1471, 1515, 1669) are all
campaign-only and cannot reach a reader of it, because `toggleDevLevel` (1621) — the only
endless→campaign writer — clears it.

**But the round-4 pattern the brief asked me to weigh holds for a fourth time, in two
independent places.** Each round has fixed the half that was named and left the adjacent
half standing, and the mechanism is structural, not a lapse of attention:

1. **11-16 gated `Cert WC`'s level half on the run MODE, not on run-ENDED state.** With the
   tier already Mid and a campaign Results overlay mounted, `setLevelId('level-03')` at 1743
   fires with no reset of `result` or `runEndedRef` — the only one of the four `setLevelId`
   sites in this file that omits the reset. The compiled-push gate then calls `retry()` and
   `setActive(true)` on a live sim behind a still-mounted overlay, and **11-15's hoist is
   what makes that silent**: pre-hoist the HUD repainted (wrong but visible); post-hoist the
   latch freezes it (WR-01).
2. **11-12 closed the `getBestForLevel` repaint for endless only.** The guard at 476/486 is
   a MODE test, not a run-ended test, so the campaign half of the exact defect 11-12's own
   comment describes ("repainted a MOUNTED endless Results overlay's `Best ·` … measured
   4200 → 7777") is still open for campaign, and WR-01 is a concrete route to it (WR-02).

The root cause of the pattern is WR-06: the run-boundary reset exists in **five near-identical
copies**, and 11-15's own safety argument is an audit of all five ("keep it if you add a
sixth"). An invariant that has to be re-proved at five sites is an invariant that will be
half-fixed again.

Finally, the new source contract in `endless-host.test.ts` that claims every run-boundary
branch "consults" the latch is **vacuous for three of its four branches** — I replaced all
three remaining `if (!runEndedRef.current)` guards with `if (true)` and the entire suite
(16 files, 139 cases) stayed green, because the regex matches the `runEndedRef.current = true`
*assignment* on the next line (WR-03). This is the same "instrument pointed one symbol away
from the defect" the test file itself names three times in its own prose.

No security findings. Nothing in this diff touches an injection, credential, crypto or
deserialization surface; `runSeedRef = Date.now() >>> 0` is already documented as a
non-secret difficulty input (A-03, § Limits item 5) and is unchanged.

## Narrative Findings (AI reviewer)

### Warnings

#### WR-01: `runCertWorstCase`'s level half restarts the sim without clearing the ended-run state — and the 11-15 hoist now hides it

**File:** `app/_components/PlayingHost.tsx:1742-1745` (with `:676-703`, `:991-993`)

**Issue:** `setLevelId('level-03')` at 1743 is the only one of this file's four `setLevelId`
sites that does not also clear `result` and `runEndedRef`. `goNext` (1508–1516),
`toggleDevLevel` (1578–1621) and the `setTierOverride`→`remountDevSession` route all do.
On the branch where the tier is **already** `'mid'`, the level half fires alone: no
`remountDevSession` runs, so nothing resets the overlay.

Reachable sequence, all inside `__DEV__` (the dev row renders at `zIndex: 20` **above** the
result scrim — `src/runtime/GameScreen.tsx:206-221` — so `Cert WC` is tappable from a mounted
Results overlay):

1. Campaign run on `level-01` ends → `runEndedRef = true`, `result = 'lose'`, overlay up.
2. Operator has previously forced the tier to Mid.
3. Press `Cert WC` → level half fires, tier half no-ops → `setLevelId('level-03')`,
   `defer = true`, `certPendingRef = true`, return. **`result` and `runEndedRef` untouched.**
4. `loadResult`/`loadKey` change → re-bake → `fxReady` true → the compiled-push effect
   (676–703) runs `compiledSv.value = level-03`, `retry()`, `setActive(true)`.
5. A `level-03` simulation is now live with `runEndedRef.current === true`, so **every**
   chrome mirror returns at line 991. The HUD is frozen on the dead `level-01` run's lives
   and score; the mounted overlay still reads `Lose / Out of lives`; and the deferred
   one-shot then injects the worst-case ball/particle/shake load onto that invisible sim.

Pre-11-15 this state was wrong but *observable* — the chrome repainted. The hoist is correct
in itself; the defect is that this producer of ended-run state was never brought under the
same latch, so the fix converted a visible incoherence into a silent one. Note also that a
loss on that hidden `level-03` run reaches no telemetry at all, because `applyChrome` returns
above the campaign LOST branch.

**Fix:** either gate the level half on run-ended state as well as run mode, or give it the
same reset the other three `setLevelId` sites carry. The minimal version:

```ts
if (modeRef.current !== 'endless' && levelId !== 'level-03') {
  // A level change is a run boundary like every other one in this file: the
  // compiled-push effect will retry() + setActive(true) on the new board, and a
  // stale `runEndedRef` would latch applyChrome over a LIVE sim (11-15).
  setResult(null);
  setWaveBuildFailedWave(null);
  runEndedRef.current = false;
  setLevelId('level-03');
  defer = true;
}
```

(If a full reset is not wanted here, the alternative is to refuse the press while
`result != null` — but that is a behaviour decision, not a review call.)

---

#### WR-02: the `getBestForLevel` preload publishes `setResultBest` with no run-ended guard — the campaign half of the gap-1 class

**File:** `app/_components/PlayingHost.tsx:460-493` (specifically `:476-478` and `:486-488`)

**Issue:** 11-12 closed this for endless by wrapping the publication in
`if (modeRef.current !== 'endless')`. That is a **mode** guard; the defect it fixes is a
**run-ended** defect. The comment at 471–475 states the symptom exactly — "unguarded, this
line repainted a MOUNTED endless Results overlay's `Best ·` with a campaign per-level best
(measured 4200 → 7777) whenever the read landed late" — and the campaign arm of the same
branch is still unguarded against it.

Concretely, via WR-01's step 3: `levelId` becomes `level-03` while the `level-01` Results
overlay is mounted and `runEndedRef` is true. The effect re-runs for `level-03`, resolves,
and `setResultBest(b)` repaints `Best ·` on the mounted panel with **another level's**
personal best, under the `New Record` badge the `level-01` run earned. The `.catch` arm at
486–488 is worse in the same position: a storage failure repaints it to `Best · 0`.

This is a narrower window than the endless case was (it needs a `levelId` change or a slow
first read while an overlay is mounted), but it is the same class and the same line, and the
fix costs one term.

**Fix:**

```ts
// The publication belongs to the mode the player is in AND to a run that is
// still live: a mounted Results panel's `Best ·` is a record, not a cache read.
if (modeRef.current !== 'endless' && !runEndedRef.current) {
  setResultBest(b);
}
```

(and the matching term on the `.catch` arm).

---

#### WR-03: three now-dead latch guards remain in `applyChrome`, and the contract that claims to pin them is vacuous — proved by mutation

**File:** `app/_components/PlayingHost.tsx:1077`, `:1098`, `:1105`;
`tests/ui/PlayingHost.endless-host.test.ts:698-702`

**Issue:** With the guard hoisted to 991, control cannot reach 1077, 1098 or 1105 with
`runEndedRef.current === true` — nothing between 991 and those lines writes the ref
(`advanceToWave` and `advanceWave` do not; `handleRunEnded` is only called inside these very
gates). So all three `if (!runEndedRef.current)` tests are **always true**: dead conditions.

11-15's stated reason for deleting the fourth copy is that "an inner copy could not be killed
by any mutation and would contradict the 'ONE latch, EVERY boundary' design". That reasoning
applies verbatim to these three, which were kept. The treatment is inconsistent with its own
justification.

Worse, the contract that is supposed to protect them cannot see the difference. Lines
698–702 assert `expect(body).toMatch(/runEndedRef\.current/)` per branch — satisfied by the
`runEndedRef.current = true;` **assignment** sitting one line below each guard. **Measured in
this review:** replacing all three guards with `if (true)` leaves the whole suite green
(16 files, 139 cases, 0 failures). The assertion proves a symbol is present, not that a guard
exists — the exact failure shape this file's own prose names at rounds 2, 3 and 4.

**Fix:** pick one and make the contract match it.
- Delete the three dead conditions (keeping the `runEndedRef.current = true;` assignments),
  and re-point the enumeration at what actually holds: each branch **sets** the latch.
- Or keep them as defence-in-depth and say so in the comment at 1035–1044 (which currently
  argues the opposite), and tighten the assertion to
  `.toMatch(/if \(!runEndedRef\.current\) \{/)` so the guard, not the assignment, is pinned.

---

#### WR-04: `level-03` is documented as "the shipped default level" — it is not, and the SC-5 operator is told the wrong sub-branch is common

**File:** `docs/ops/ENDLESS-MODE.md:456`; `tests/ui/PlayingHost.endless-retry.test.tsx:1672-1674`

**Issue:** Both places assert `level-03` is the shipped default `LevelId`. The default is
`level-01` (`app/_components/GameHost.tsx:68`, `useState<LevelId>('level-01')`);
`level-03` is forced **only** under `CERT_HARNESS` (`GameHost.tsx:196`,
`levelId={CERT_HARNESS ? 'level-03' : activeLevelId}`), i.e. `EXPO_PUBLIC_CERT=1`.

This matters operationally, not just pedantically. The block it sits in is the SC-5 discharge
procedure, which instructs the reader to "launch a dev build; arm the perf overlay" —
`EXPO_PUBLIC_PERF_OVERLAY=1`, a **different** flag from `EXPO_PUBLIC_CERT`
(`src/devflags.ts:20-23`). The operator taking that reading is on `level-01`, i.e. the
*first* sub-branch, and the document tells them the second one is "the common case". A doc
whose whole purpose is that the next reader finds the reasoning already worked through should
not invert which branch they are standing in.

**Fix:** in `ENDLESS-MODE.md:456`, replace "the shipped default level, so the common case"
with something true, e.g. "the level a `CERT_HARNESS` build forces (`GameHost.tsx:196`); on
an ordinary dev build the session starts at `level-01`, so this sub-branch is reached by
walking `Lv` to it". Apply the same correction to the test comment, and drop the unverifiable
"Phase 08 D-06" citation or replace it with the source reference.

---

#### WR-05: the deferred cert one-shot is consumed before it fires and its own cleanup can cancel it

**File:** `app/_components/PlayingHost.tsx:1782-1809`

**Issue:** The effect clears `certPendingRef.current = false` at 1795, **then** arms a 50 ms
`setTimeout` at 1796, and returns a cleanup that clears that timer. If any dependency
(`levelReady`, `levelError`, `fxReady`, `levelId`, `tierOverride`) changes inside that 50 ms
window, React runs the cleanup — cancelling the pending injection — and the re-run
early-returns at 1783 because the flag has already been consumed. The one-shot is then
silently lost: nothing fires, nothing logs, and `certPendingRef` is false.

This is the mirror image of the defect 11-16 just fixed. 11-16's own stated rule is "do not
arm a latch whose discharge preconditions the same change has made unreachable"; the
neighbouring rule — do not consume a latch before the work it guards has actually happened —
is unaddressed. The new C1 case (`a CAMPAIGN press below level-03 still arms the deferral and
discharges it exactly once`) cannot see this, because `settle()` runs the timers with no
intervening dep change.

I did not find a deterministic 50 ms-window dep change on the current code, so this is latent
rather than live — but it is one added dependency or one fast double-press away.

**Fix:** consume the flag where the work happens, not where the timer is armed:

```ts
const t = setTimeout(() => {
  certPendingRef.current = false;
  injectCertWorstCase();
}, 50);
return () => clearTimeout(t);
```

---

#### WR-06: five duplicated run-boundary reset blocks — this is the structural cause of the "fix one half, leave the neighbour" pattern

**File:** `app/_components/PlayingHost.tsx` — `startEndlessRun` `:1385-1419`, `onRetry`
campaign arm `:1463-1483`, `goNext` `:1503-1525`, `toggleDevLevel` `:1587-1631`,
`remountDevSession` campaign arm `:1658-1682`

**Issue:** `startEndlessRun`, `onRetry` (campaign arm), `goNext`, `toggleDevLevel` and
`remountDevSession` (campaign arm) each contain a near-identical ~14-statement reset:
`clearCountdown` / `setCountdownNumeral(null)` / `setResult(null)` /
`setWaveBuildFailedWave(null)` / `setIsNewRecord(false)` / `setResultStars(null)` /
`setNextGateId(null)` / `runEndedRef.current = false` / the three wall-clock refs /
`setLives(3)` / `setScore(0)` / `setCombo(1)` / `setStallTier(0)` /
`setSimPhaseNum(SIM.DOCKED)` / `setUiPhase('playing')`. `failEndlessStart` (1266–1293) is a
sixth, partial copy. They differ in four places only: which `Best` is republished, whether
`waveAdvanceInFlightRef` is cleared, whether `retry()`/`setActive(true)` are called, and
whether `mode` moves.

11-15's safety argument is explicitly an audit of all five ("Every one of the five sites that
clears this latch writes its own chrome immediately afterwards … keep it if you add a
sixth"). That is a correctness property the language cannot enforce and that a reviewer must
re-derive by hand every round. It is the same shape as the five `setLevelId` sites in WR-01,
of which exactly one omits the reset — which is precisely how WR-01 survived 11-16.

Weighing the pattern as asked: rounds 2, 3 and 4 each shipped a fix that was correct and
each left an adjacent producer of the same state unguarded. The common factor is not
inattention; it is that "what a run boundary means" is written out five to six times instead
of once.

**Fix:** extract the shared body, e.g.

```ts
/** THE run-boundary reset. Every caller that begins a run routes here — one place
 *  where "a new run" is defined, so a sixth caller cannot get a subset of it. */
const beginRun = useCallback((opts: { best: number; bestWave?: number }) => {
  clearCountdown();
  setCountdownNumeral(null);
  setResult(null);
  setWaveBuildFailedWave(null);
  setIsNewRecord(false);
  setResultStars(null);
  setNextGateId(null);
  setResultBest(opts.best);
  if (opts.bestWave != null) setResultBestWave(opts.bestWave);
  runEndedRef.current = false;
  waveAdvanceInFlightRef.current = false;
  runStartedAtRef.current = Date.now();
  runWallClockMsRef.current = 0;
  wallClockActiveRef.current = true;
  setLives(3); setScore(0); setCombo(1); setStallTier(0);
  setSimPhaseNum(SIM.DOCKED);
  setUiPhase('playing');
}, [clearCountdown]);
```

The callers keep their own mode/level/`retry()` specifics above and below it. This also lets
the existing source contract assert the property once ("the latch is cleared in exactly one
place, and chrome is written below it") instead of enumerating five sites.

---

### Info

#### IN-01: the new cert term can clear an already-armed deferral

**File:** `app/_components/PlayingHost.tsx:1773`

**Issue:** `certPendingRef.current = modeRef.current !== 'endless'` changes this line from
"arm" to "arm or disarm". An endless press with the tier not yet Mid now writes `false` over
a flag a prior campaign press may have set. The window is narrow (it needs `tierOverride`
cycled away from `'mid'` between the two presses), but the assignment expresses a side effect
the plan did not intend.

**Fix:** `if (modeRef.current !== 'endless') { certPendingRef.current = true; }` — same
guarantee, no new clearing behaviour. If the source-contract regex at
`endless-host.test.ts:1386` / `:1390` is what forced the expression form, change the regex.

---

#### IN-02: absolute source line numbers baked into assertion messages

**File:** `tests/ui/PlayingHost.endless-host.test.ts:733`

**Issue:** "Measured pre-fix, the guard was at source line 976 and the first write at 936".
Those indices describe a file revision that no longer exists and cannot be checked by anyone
reading the failure later.

**Fix:** state the property ("the guard sat below all five mirror-sourced writes") and cite
the plan/verification id rather than line numbers.

---

#### IN-03: `isNewRecord` can fire against a watermark that has not been read yet

**File:** `app/_components/PlayingHost.tsx:746-755` (endless), `:796-800` (campaign)

**Issue:** `endlessBestScoreRef` / `endlessBestWaveRef` are 0 until the mount-time
`getSnapshot()` resolves (508–526), and `previousBestRef` is 0 until `getBestForLevel`
resolves. A run that ends inside that window compares against 0, so
`record = runScore > 0 || runWave > 0` is unconditionally true and the overlay shows
`New Record` beside a `Best ·` read post-merge from the returned blob. Nothing is
mis-persisted (`asyncStorageStore.recordRunEnd` chains the write behind hydration and
`mergeHighWatermark` takes the max), so this is display-only, and the window is short enough
that a real run is unlikely to close inside it.

**Fix:** track whether the watermark read has landed (`watermarksLoadedRef`) and suppress the
badge — not the `Best ·` line — until it has.

---

#### IN-04: comment-to-code ratio at the 11-15 site

**File:** `app/_components/PlayingHost.tsx:936-990`

**Issue:** 55 comment lines introduce a 3-line statement; `applyChrome` (934–1114) is roughly
150 lines of commentary around 30 lines of code, and much of it is round-by-round history
(what 11-13 did, what was measured pre-fix, which alternative was rejected) rather than what
the code does. History of this depth belongs in `ENDLESS-MODE.md`, which already carries it.
The practical cost is real: the `//`-only constraint at this site exists solely because the
prose is large enough to collide with the source-contract regexes that scan the file.

**Fix:** keep the load-bearing paragraphs (the "clear BEFORE write" pairing at 968–974 and
the telemetry-scope note at 976–980, both of which a future editor must not violate) and move
the measured-pre-fix narrative and the rejected alternative to the ops doc, referenced by id.

---

_Reviewed: 2026-09-26T11:39:55Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
