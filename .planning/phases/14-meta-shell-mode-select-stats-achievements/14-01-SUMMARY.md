---
phase: 14-meta-shell-mode-select-stats-achievements
plan: 01
type: execute
status: complete
---

# 14-01 Summary: Title → Endless tracer

## What shipped

- `PlayingHost.tsx` exports `type EntryMode = 'campaign' | 'endless' | 'daily'` and takes a
  required `entryMode` prop. A new deferred, once-only, readiness-gated `useEffect`
  (guarded by `entryDispatchedRef`, dispatching through `setTimeout`/`clearTimeout`) starts
  `startEndlessRun()` or `startDailyRun()` once `levelReady && levelError == null && fxReady`.
- `GameHost.tsx` holds `entryMode` state, resets it to `'campaign'` in the same `onMenu`
  handler that returns to Title (D-04), forces `'campaign'` under `CERT_HARNESS` (mirroring
  the existing `levelId` guard), and wires `TitleScreen`'s new `onEndless` to
  `setEntryMode('endless') + setShellPhase('playing')`.
- `TitleScreen.tsx` gained a required `onEndless` prop and one new `Pressable`
  (`accessibilityLabel="Play endless mode"`, label `Endless`, `marginTop: 16`) below the
  shipped `Play` control, which is untouched.
- Test fixtures updated: `tests/ui/GameHost.test.tsx` (mock + new case), `tests/ui/TitleScreen.test.tsx`
  (new case), `tests/ui/PlayingHost.endless-host.test.ts` (new source-contract case), and five
  pre-existing `PlayingHost` mount helpers across `PlayingHost.daily-run.test.tsx`,
  `PlayingHost.endless-record.test.tsx`, `PlayingHost.endless-retry.test.tsx`,
  `PlayingHost.endless-run.test.tsx`, `PlayingHost.next-bake.test.ts` — all 12 call sites
  across those 5 files needed `entryMode: 'campaign'` added once the prop became required
  (not in the plan's stated file list; found by running the full `tests/ui` suite per the
  plan's own Task 1 verify step).

## Red-proof observation (Task 2 acceptance criterion)

Removed `levelReady` from the entry-dispatch effect's dependency array
(`app/_components/PlayingHost.tsx`), leaving `[entryMode, levelError, fxReady,
startEndlessRun, startDailyRun]`, then re-ran:

```
npx vitest run tests/ui/PlayingHost.endless-host.test.ts -t 'entry dispatch'
```

Result: **1 failed** —

```
AssertionError: dependency array must name levelReady — omitting it is the cold-start
defect: a []-dependency effect fires once, no-ops on a not-yet-ready host, and never fires
again: expected false to be true
```

The dependency array was then restored to
`[entryMode, levelReady, levelError, fxReady, startEndlessRun, startDailyRun]` and the same
command was re-run to confirm it returns to `1 passed`.

## `npx vitest run tests/ui` — before/after

- **Before** (baseline, pre-plan): 21 files / 218 tests passing.
- **After** (both tasks, entryMode threaded through all five pre-existing mount fixtures):
  **21 files / 221 tests passing** (+1 `GameHost.test.tsx` entry-mode case, +1
  `TitleScreen.test.tsx` Endless-entry case, +1 `PlayingHost.endless-host.test.ts` source
  contract).

## Full verification (all green)

- `npx vitest run tests/ui` — 21 files / 221 tests passed
- `npm test` — 112 files / 884 tests passed (1 pre-existing skip), all 8 assert scripts
  printed their `OK` line
- `npm run lint -- --max-warnings 0` — exit 0, no output
- `npm run typecheck` — exit 0, no output
- dependency-array anchor scan (`handleRunEnded`) — `depArrayAnchorMatches=1`
- `git diff --quiet HEAD -- package-lock.json` — clean, no package installed

## Deviations from the plan

- Five pre-existing test files not in the plan's `files_modified` list
  (`PlayingHost.daily-run.test.tsx`, `PlayingHost.endless-record.test.tsx`,
  `PlayingHost.endless-retry.test.tsx`, `PlayingHost.endless-run.test.tsx`,
  `PlayingHost.next-bake.test.ts`) needed `entryMode: 'campaign'` added at their 12
  `createElement(PlayingHost, …)` call sites, because `entryMode` is a required prop and
  these files mount `PlayingHost` directly rather than through `GameHost`. Surfaced
  immediately by the plan's own `npx vitest run tests/ui` verify step (35 failed on first
  run); fixed by adding the literal to each call site, no behavioural change to any of those
  tests.
