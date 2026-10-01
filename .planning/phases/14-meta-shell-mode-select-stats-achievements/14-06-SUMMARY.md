---
phase: 14-meta-shell-mode-select-stats-achievements
plan: 06
type: execute
status: complete
---

# 14-06 Summary: shell wiring — Title's seven rows, the two new phases, dev-row deletion

## What shipped

**Task 1 — SC-5 as early returns.** `GameHost.tsx`'s `ShellPhase` union widened to
`'title' | 'select' | 'playing' | 'stats' | 'achievements'`. Two new branches
(`StatisticsScreen`, `AchievementsScreen`) added as early returns ABOVE the final
`PlayingHost` return, each `onBack={() => setShellPhase('title')}`. The soak invariant
comment extended to name all four non-playing phases.

**Task 2 — Title's seven rows.** `TitleScreen.tsx` rebuilt: brand → best →
Campaign/Endless/Daily (filled) → Statistics/Achievements (outlined). `GameHost`'s
single title effect widened from a `getBest()`-only call to one `getSnapshot()` call,
populating `best`, `dailyPlayedToday` (via `hasResultFor`), `dailyStreak` (via
`currentDailyStreak`) and `unseenCount` — one clock read, one snapshot call, one
phase-gated effect, unchanged from the shipped shape.

**Task 3 — dev-row deletion.** Deleted the `__DEV__` `Endless` and `Daily` Pressables
and the `W{n}` wave readout (plus its orphaned `devReadout` style, invisible to lint)
from `PlayingHost.tsx`. Fixed a resulting lint warning: the `wave` `useState` value had
no remaining reader once its readout was deleted — changed to `const [, setWave] =
useState(1)`, keeping the setter (every wave-advance call site still re-renders) while
dropping the now-dead binding.

## Unplanned but required: five test files not in this plan's file list

Deleting the two dev-row controls broke **every test that drove an endless/daily run
through them** — `tests/ui/PlayingHost.endless-run.test.tsx`,
`PlayingHost.endless-retry.test.tsx`, `PlayingHost.endless-record.test.tsx`,
`PlayingHost.daily-run.test.tsx`, and `PlayingHost.endless.test.ts` (none of which were
in this plan's `files_modified` — the same class of omission found in 14-01). Fixed by
migrating every mount helper from "press the dev button" to "switch `entryMode` via
`rerender` after mount, then flush the deferred-dispatch effect" — the same production
path 14-01 wired. Readiness, previously detected by the dev button's mere presence, is
now detected by `waitFor(() => expect(setActive).toHaveBeenCalledWith(true))` — the
cold-path gate's own signal.

Three categories of further fallout, each handled on its own terms:

1. **The `W{n}` readout's own assertions** (`screen.getByText('W1')` etc., ~35
   occurrences across 3 files) — removed. In every case the underlying behavior was
   already independently proven by a surviving assertion in the same test
   (`advanceWave` call count, `boardFingerprint()`, `recordRunEnd` args, host prop
   mirrors) — the readout assertion was a redundant visible-UI confirmation of a fact
   the test already established another way.

   **Caught a self-inflicted regex bug before it shipped:** the first stripping pass
   used `(?:toBeTruthy\(\)|not\.toBeNull\(\))` as its only valid statement-closers,
   missing the bare `.toBeNull()` form several cases use. On
   `PlayingHost.endless-retry.test.tsx` this made the lazy regex skip past a
   non-matching closer and consume forward across an unrelated 4985-character span —
   deleting an entire sibling `describe` block (`Cert WC carries a mode term`) along
   with its local constants (`TIER_AUTO`, `LV_03`, `CERT`, …). Caught immediately by
   the resulting `ReferenceError`s on the next test run; the file was reverted to
   `HEAD` and reprocessed with the corrected regex (verified by a pre-flight scan
   confirming every match was under 300 characters before any destructive replace was
   applied again).

2. **Two UI-reachability-eliminated tests removed**
   (`PlayingHost.endless-retry.test.tsx`): "a second press of the `__DEV__` Endless
   button records the run it discards" and its sibling "that second press starts a
   genuinely NEW run". Both tested `startEndlessRun`'s funnel against a SECOND
   invocation reached from the same live mounted instance with no unmount in between —
   reachable only because the old dev row stayed mounted and tappable for the whole
   run. The new Title entry can only be pressed while `PlayingHost` is unmounted (D-01:
   Title and Playing are mutually exclusive phases), so a second invocation on a live
   instance's latched `entryDispatchedRef` has no surviving trigger. The funnel's own
   one-shot-latch correctness is still covered by
   `tests/ui/PlayingHost.endless-host.test.ts`'s source contract. One further
   accessibility-label test for the deleted readout (`getByLabelText('Wave 1')`) was
   removed for the same reason — the label it asserted no longer exists.

3. **One genuinely-reachable "re-enter after Menu" case migrated to a real
   remount** (`PlayingHost.daily-run.test.tsx`, "a run that unlocks nothing hands the
   panel an empty array"): pressing Menu then Daily again on a new day IS
   production-reachable (Menu unmounts `PlayingHost` via `GameHost`; a second Title tap
   mounts a fresh instance) — unlike the endless case above. Fixed with a new
   `remountIntoDaily()` helper that does a real `cleanup()` + fresh `render(...,
   { entryMode: 'daily' })`, mirroring exactly how `GameHost` mounts `PlayingHost` the
   first time Title's Daily button is tapped (entryMode already set before mount, never
   switched after).

`PlayingHost.endless.test.ts`'s two now-obsolete source-contract cases ("the endless
entry lives inside the dev row", "the wave number renders in the same dev row") were
replaced with one narrower case asserting the dev row is still a single
`__DEV__`-guarded region, and a comment recording the removal's reason.

## Measured counts (source scans)

```
hostMounts=1 finalReturns=1 hostAfterLastReturn=true phases=2
titleEffectFound=true snapshotCalls=1 clockReads=1 hasResultFor=1 currentDailyStreak=1 titleEffects=1
pressables=5 texts=9 clamped=7 scrollTokens=0 brandLiteral=0
texts=4 endlessEntryRefs=7 dailyEntryRefs=5 waveReadout=0 devSwitchStyles=6 crashStillThere=3
depArrayAnchorMatches=1
```

`TitleScreen.tsx` measured `texts=9` and `PlayingHost.tsx` measured `texts=4` —
recorded for 14-07's twelve-file total (7 `src/runtime` files from 14-04, plus
`TitleScreen.tsx`, `SelectScreen.tsx`, `StatisticsScreen.tsx`,
`AchievementsScreen.tsx`, and `GameHost.tsx` if it renders `Text` directly, still
14-07's to measure).

## Red-proofs observed

1. **SC-5 (Task 1).** Temporarily added a `<PlayingHost .../>` element inside the
   `stats` branch. Re-ran `-t 'no PlayingHost'`: **1 failed** (`PlayingStub` found when
   it should be absent). Re-ran the source scan: `hostMounts=2 finalReturns=1
   hostAfterLastReturn=false phases=2`. Both instruments red. Restored; re-ran to
   confirm 5/5 passed and `hostMounts=1 hostAfterLastReturn=true`.

## Verification (all green)

- `npx vitest run tests/ui/GameHost.test.tsx` — 5 passed (`no PlayingHost`, `Back`,
  the rebuilt flow case, the entry-mode case, the extended CERT/SOAK case)
- `npx vitest run tests/ui/TitleScreen.test.tsx` — 3 passed (`seven rows`, `daily meta`,
  `new`)
- `npx vitest run tests/ui/PlayingHost.endless-host.test.ts` — 29 passed (28 pre-existing
  + `dev row deletions`)
- `npx vitest run tests/ui` — 24 files / 241 tests passed
- `npm test` — **115 files / 908 tests passed**, all 8 assert scripts `OK`
- `npm run lint -- --max-warnings 0` — clean
- `npm run typecheck` — clean
- `git diff --quiet HEAD -- package-lock.json` — clean
