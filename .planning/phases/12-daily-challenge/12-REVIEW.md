---
phase: 12-daily-challenge
reviewed: 2026-09-28T12:35:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - app/_components/PlayingHost.tsx
  - app/_components/certLevelPlan.ts
  - src/runtime/GameScreen.tsx
  - src/runtime/appStatePause.ts
  - src/runtime/overlays/DailyResultOverlay.tsx
  - src/runtime/overlays/PauseOverlay.tsx
  - src/runtime/useGameLoop.ts
  - src/services/daily/dateKey.ts
  - src/services/daily/index.ts
  - src/services/daily/streak.ts
  - src/services/storage/asyncStorageStore.ts
  - src/services/storage/index.ts
  - src/services/storage/memoryStore.ts
  - src/services/storage/parseBlob.ts
  - src/services/storage/telemetry.ts
  - src/services/storage/types.ts
  - tests/daily.board.test.ts
  - tests/daily.clock-policy.test.ts
  - tests/daily.date-key.test.ts
  - tests/daily.record.test.ts
  - tests/daily.streak.test.ts
  - tests/storage.daily-firewall.test.ts
  - tests/storage.progress-v4.test.ts
  - tests/ui/DailyResultOverlay.test.tsx
  - tests/ui/GameScreen.test.tsx
  - tests/ui/PlayingHost.daily-run.test.tsx
  - tests/ui/PlayingHost.endless-host.test.ts
  - tests/ui/certLevelPlan.test.ts
  - docs/ops/DAILY-CHALLENGE.md
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-09-28T12:35:00Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Tree state at review: `npm run typecheck` clean, `npx eslint .` 0 errors / 3 pre-existing
`array-type` warnings, `npx vitest run` 107 files / 787 tests passing.

Five of the eight areas named in the review brief were checked and hold:

- **The daily/campaign firewall (SC-5).** `memoryStore.ts:156-172` and
  `asyncStorageStore.ts:443-462` (file-absolute 143-162 within `recordRunEnd`) are line-for-line
  equivalent, including the `win | lose` narrowing that keeps `abandoned` from closing a date,
  and including the cold/hot persist split which is the only place they legitimately differ.
  `tests/storage.daily-firewall.test.ts` runs one suite body against both stores and pairs every
  absence assertion with a presence assertion. No divergence found.
- **One streak derivation.** `currentDailyStreak` (`telemetry.ts:278`) is the only read-side
  derivation; grep over `src/` and `app/` confirms nothing else re-derives it. Measured against
  the shipped code over 450 consecutive closes: stored `longestStreak` 450, read-side
  `currentDailyStreak` 450, badge predicate `streak === longestStreak` true. The 400-vs-450
  recurrence WINDOWS #19 describes is closed on the executed tree.
- **The single `AppState` subscription.** `appStatePause.ts:44` is still the repo's only
  `AppState.addEventListener`; the `active` branch invokes `onForeground` only and touches no
  physics handle, active flag, UI phase or accumulator; `useGameLoop.ts:797-799` returns
  `sub.remove()`. `onOsForeground` is `useCallback(…, [])` so the added dependency cannot churn
  the subscription.
- **The 60-second interval.** `PlayingHost.tsx:722-735` scopes it to `mode === 'daily' && result
  != null` and clears it in the effect cleanup, so it is torn down on unmount, on the panel
  closing and on remount. No leak.
- **Layer boundaries and `DAILY_HISTORY_BOUND`.** `DailyResultOverlay.tsx` imports only
  `react-native` and `react-native-safe-area-context`; every daily value arrives as a flat scalar
  prop, so `boundaries/dependencies` is not merely satisfied but unreachable. `byMode.daily` is
  keyed on `DAILY_TELEMETRY_KEY` in both stores and the 40-distinct-dates alarm proves the map
  stays single-keyed. The read-side trim at `parseBlob.ts:487` is applied *after* entry
  rejection, which is the correct order.

The remaining three areas produced findings. The Critical one is in
`currentStreakStart` sanitization (brief item 3): the under-reporting guarantee holds against
*malformed* and *future-dated* starts but not against a start that is merely **inconsistent with
the record's own `totalDaysPlayed`**, and that gap writes an inflated value into a D-16 one-way
scalar.

Findings already recorded in `.planning/WINDOWS.md` (16-24) are not re-reported here. In
particular the panel/dev-row overflow items, the four Android/device measurements, and the
`currentDailyStreak`-vs-`streakFrom` derivation deviation are all logged and were not counted
again.

## Critical Issues

### CR-01: A `currentStreakStart` inconsistent with `totalDaysPlayed` inflates the displayed streak and writes the inflated value into the one-way `longestStreak`

**File:** `src/services/storage/parseBlob.ts:462-473` (`sanitizeStreakStart`) and
`src/services/storage/telemetry.ts:229-242` (`resolveStreakStart`)

**Issue:**
`sanitizeStreakStart` applies exactly three rejections — malformed key, no surviving dates, and
a start later than the newest surviving date — and then deliberately carries anything older:

```ts
// parseBlob.ts:472
return raw <= newest ? raw : '';
```

`resolveStreakStart` accepts it whenever the surviving window is consecutive end to end, fenced
only by `DAILY_STREAK_WALK_CAP` (36 525 days):

```ts
// telemetry.ts:241
return inclusiveDaySpan(storedStart, newest) > 0 ? storedStart : start;
```

The cap catches `0001-01-01` (~740 000 days), which is what `tests/daily.record.test.ts:304`
asserts. It catches nothing between the history bound and 100 years. Neither function consults
`totalDaysPlayed`, even though it is a member of the same record and a hard upper bound: a
streak counts closed dates, and every closed date increments `totalDaysPlayed` on first close,
so **`currentStreak <= totalDaysPlayed` is an invariant of every legitimately-written record.**

MEASURED against the fixture this repo's own test blesses as a control
(`tests/storage.progress-v4.test.ts:641`, `expect(startFor('2020-01-01')).toBe('2020-01-01')` —
2 history entries, `totalDaysPlayed: 2`, `longestStreak: 2`):

```
carried start = 2020-01-01 | totalDaysPlayed = 2 | stored longestStreak = 2
panel Streak  = 2462
after one more close: longestStreak = 2463 | totalDaysPlayed = 3
```

The player is shown `Streak · 2462`, `Best streak · 2463`, `Days played · 3` — a confident wrong
number, which `12-UI-SPEC.md` names as the failure worse than a silent omission. And
`longestStreak` is a D-16 one-way scalar: once 2463 is persisted, no later release can repair it,
only migrate it.

This is **not** tamper-only, so `T-12-05` does not cover it. Any entry-level rejection in
`sanitizeDailyHistoryEntry` creates the same asymmetry, because the history is dropped
entry-by-entry while `currentStreakStart` survives wholesale. MEASURED against a blob whose 20
oldest entries lost their `outcome` field (a truncated write, or an older build's entry shape)
and one entry survives:

```
surviving history 1 | start 2024-01-01 | totalDaysPlayed 30 | longestStreak 30
panel would show Streak · 1001
AFTER CLOSE longestStreak = 1002 | totalDaysPlayed = 31
```

`sanitizeStreakStart`'s own header states the contract it breaks here: *"Every rejection here
therefore falls back to `''` … short, and never longer than the truth."* The accepted path does
the opposite. `12-CONTEXT.md` D-16's amendment states it too: *"must degrade an invalid start in
the under-reporting direction."*

**Fix:** bound the carried start by the count of dates ever closed, in both bodies. The record
already carries the number, so no new field and no migration is needed.

```ts
// parseBlob.ts — sanitizeDailyRecord already has out.totalDaysPlayed by this point
out.currentStreakStart = sanitizeStreakStart(
  record.currentStreakStart,
  out.history,
  out.totalDaysPlayed,
);

function sanitizeStreakStart(
  raw: unknown,
  history: readonly DailyHistoryEntry[],
  totalDaysPlayed: number,
): string {
  if (!isValidDateKey(raw) || history.length === 0) {
    return '';
  }
  let newest = '';
  for (const entry of history) {
    if (entry.date > newest) {
      newest = entry.date;
    }
  }
  if (raw > newest) {
    return '';
  }
  // A run can never be longer than the number of dates ever closed. A start that
  // claims otherwise is inconsistent with its own record — discard it, which
  // under-reports and never inflates.
  const span = inclusiveDaySpan(raw, newest); // share the helper, or re-derive locally
  return span > 0 && span <= totalDaysPlayed ? raw : '';
}
```

```ts
// telemetry.ts:229 — same bound on the write side, so a record that reaches the
// merge from anywhere but the parser is fenced too.
function resolveStreakStart(
  sortedKeys: readonly string[],
  storedStart: string,
  totalDaysPlayed: number,
): string {
  const { start, floored } = runStartInWindow(sortedKeys);
  if (start === '' || !floored) {
    return start;
  }
  if (!isValidDateKey(storedStart) || storedStart >= start) {
    return start;
  }
  const newest = sortedKeys[sortedKeys.length - 1]!;
  const span = inclusiveDaySpan(storedStart, newest);
  return span > 0 && span <= safeCounter(totalDaysPlayed) ? storedStart : start;
}
```

Both call sites (`mergeDailyRecord:146`, `currentDailyStreak:280`, `reconcileStreakStart:496`)
have the record in hand. Note the merge-side lossy topology already documented at
`telemetry.ts:437-442` under-counts `totalDaysPlayed`, never over-counts, so this bound can only
ever be *conservative* — it cannot discard a legitimate start.

Add the missing assertion beside the blessed control at
`tests/storage.progress-v4.test.ts:641`: a carried start must not imply a streak larger than
`totalDaysPlayed`.

## Warnings

### WR-01: The banned-primitive grep gate over `src/services/daily/*.ts` does not exist — four shipped comments and the ops doc say it does

**File:** `src/services/daily/dateKey.ts:56-57`, `src/services/daily/streak.ts:42-43`,
`docs/ops/DAILY-CHALLENGE.md:117-118`, `tests/daily.date-key.test.ts:91-92`

**Issue:** The SC-1-critical ban on `Intl.`, `toLocale*`, `toISOString` and `86400000` inside
`src/services/daily/**` is described in the present tense as enforced:

> `streak.ts:43` — "Plan 12-01's comment-stripped grep gate over `src/services/daily/*.ts`
> **enforces** the first two."
> `docs/ops/DAILY-CHALLENGE.md:118` — "The module **bans** `Intl.`, `toLocale*`, `toISOString`
> and the literal `86400000` **by a comment-stripped grep gate**…"

No such gate is in the repo. Verified three ways:

- `eslint.config.js` carries `no-restricted-syntax` / `no-restricted-globals` blocks for
  `src/core/**` (lines 36-77) and `src/levelgen/**` (lines 79-158) only. There is no block for
  `src/services/**` or `src/services/daily/**`.
- `scripts/` contains no assertion script naming the daily tree, and `package.json` has no
  corresponding `assert:*` entry.
- The only source-text gates in the suite are `NETWORK_PRIMITIVES`
  (`tests/daily.board.test.ts:66`, fetch/XHR/WebSocket/axios) and `ANTI_CHEAT_DECLARATION`
  (`tests/daily.clock-policy.test.ts:148`, watermark/highestDate/lastSeenDate/clockTamper).
  Neither mentions a date primitive. `grep -rn "Intl\|toISOString\|86_400_000" tests/` finds the
  tokens only inside `tests/daily.date-key.test.ts` as *controls the real function must differ
  from*, never as a scan over module source.

12-01's gate was a one-shot command in a plan's verify block. Nothing re-runs it. The code today
is correct, but the failure it guards is precisely the one `dateKey.ts:40-45` calls *"invisible
on an en-US simulator"* — and the comments actively tell a future editor that a standing gate is
watching when none is.

**Fix:** add the rule where its two siblings already live, in `eslint.config.js`, so
`npm run lint` carries it:

```js
{
  // N-DAILY-01 / SC-1: the local date key must not come from a locale, from UTC, or
  // from a fixed-length day — each was MEASURED wrong (12-RESEARCH § Findings 2, 3c, 3e).
  files: ['src/services/daily/**/*.ts'],
  rules: {
    'no-restricted-globals': [
      'error',
      { name: 'Intl', message: 'N-DAILY-01: ECMA-402 gave five different keys across five device locales under this project\'s own Hermes — a Thai and a US device would draw different boards on the same date.' },
    ],
    'no-restricted-syntax': [
      'error',
      { selector: "MemberExpression[object.name='Intl']", message: 'N-DAILY-01: no ECMA-402 in the daily date policy.' },
      { selector: "CallExpression[callee.property.name=/^toLocale/]", message: 'N-DAILY-01: no locale-formatting Date method — the key must be the same string on every device.' },
      { selector: "CallExpression[callee.property.name='toISOString']", message: 'N-DAILY-01: UTC serialisation is a calendar day wrong for a third of every day in Santiago.' },
      { selector: "Literal[value=86400000]", message: 'N-DAILY-01: a local day is 23 or 25 hours on a DST boundary — step the day through the local-field Date constructor, never by a fixed duration.' },
    ],
  },
},
```

Then correct the four comments to name the enforcing mechanism, or drop the enforcement claim.

### WR-02: Tautological assertion — the countdown boundary pinning is not pinned by the case that says it is

**File:** `tests/ui/PlayingHost.daily-run.test.tsx:956-959`

**Issue:**

```ts
expect(
  lastScreenProps.dailyNextBoundaryMs,
  'and the boundary stays pinned to the shown date, so the remainder can actually reach zero',
).toBe(lastScreenProps.dailyNextBoundaryMs);
```

`expect(x).toBe(x)` passes for every value including `undefined` and `NaN`. The property it
claims to pin — that the 60-second refresh moves `dailyNowMs` but leaves `dailyNextBoundaryMs`
alone — is `12-UI-SPEC.md § Clock policy` rule 5 and is what
`docs/ops/DAILY-CHALLENGE.md:236-240` calls load-bearing (re-deriving the boundary on each
refresh would make the remainder permanently positive and the line could never omit itself). It
is currently unpinned: a change that re-derived `dailyNextBoundaryMs` inside the interval would
leave this suite green.

The same case's first half is weak for the same reason: it advances 180 s before the panel opens
and then asserts only `lastScreenProps.result` is `null`, which would hold whether or not an
interval had fired. Capturing `dailyNowMs` across that window is what would observe it.

**Fix:**

```ts
await deliverPhase(SIM.WON, { score: 1200 });
const atPublish = lastScreenProps.dailyNowMs;
const boundaryAtPublish = lastScreenProps.dailyNextBoundaryMs;
expect(atPublish).toBe(DAY_A_NOON);

now.mockReturnValue(DAY_A_NOON + 180_000);
await act(async () => {
  vi.advanceTimersByTime(180_000);
  await Promise.resolve();
});
now.mockRestore();

expect(lastScreenProps.dailyNowMs).toBe(DAY_A_NOON + 180_000);
expect(
  lastScreenProps.dailyNextBoundaryMs,
  'the boundary stays pinned across the refresh, so the remainder can actually reach zero',
).toBe(boundaryAtPublish);
```

And for the closed-panel half, snapshot `lastScreenProps.dailyNowMs` before the 180 s advance and
assert it is unchanged after.

### WR-03: The countdown boundary is derived from `Date.now()`, not from the date the panel is showing — a run that crosses local midnight advertises a board that is already available

**File:** `app/_components/PlayingHost.tsx:952-955` (`publishDailyPanel`)

**Issue:**

```ts
setDailyEndedStreakLength(endedStreakLength(keys, date));
const at = Date.now();
setDailyNowMs(at);
setDailyNextBoundaryMs(nextLocalMidnightMs(at));
```

`date` (the panel's `YYYY-MM-DD`) is in scope and unused for the boundary. On the just-finished
path, `publishDailyPanel` is called with `runDate = dailyDateRef.current` — the date the run
*started* on, which `PlayingHost.tsx:316-324` is explicit must never move. A run begun at 23:58
and finished at 00:01 therefore renders `Daily · <yesterday>` beside
`New board in 23h 59m`, while the new date is in fact open and playable right now. The date
arithmetic is right (the result is correctly recorded under `runDate`, so SC-1 holds); only the
countdown lies.

The documentation already describes the intended behaviour, and it is not what the code does:

- `PlayingHost.tsx:690-693` — "It is **pinned to the local midnight that ends the date the PANEL
  is showing**, set once when the panel is published."
- `docs/ops/DAILY-CHALLENGE.md:236` — "`dailyNextBoundaryMs` is **pinned to the shown date's
  midnight at publish time**."

Blast radius is bounded (display only, requires crossing local midnight mid-run, self-corrects on
the next entry), which is why this is a Warning rather than a Critical — but `12-UI-SPEC.md`'s
own standard is that a confident wrong number is worse than a silent omission, and this is one.

**Fix:** derive the boundary from the shown date rather than from the clock, so the code matches
both comments:

```ts
// The boundary that ends the date the PANEL is showing — local noon on that date stepped
// to the next local midnight, so a run that crossed midnight does not advertise a board
// the player can already play. Midday anchor for the reason `previousDateKey` uses one.
const y = Number(date.slice(0, 4));
const m = Number(date.slice(5, 7));
const d = Number(date.slice(8, 10));
const shownDateNoon = new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
setDailyNextBoundaryMs(nextLocalMidnightMs(shownDateNoon));
```

Guard on `isValidDateKey(date)` and fall back to `nextLocalMidnightMs(at)` if it fails, so the
function stays total. Add a case to `tests/ui/PlayingHost.daily-run.test.tsx` driving a run whose
`Date.now()` crosses local midnight between start and `deliverPhase(SIM.WON)`.

### WR-04: `localTodayRef` is write-only — three write sites, zero reads, and its declaration claims it is the sole input to D-01

**File:** `app/_components/PlayingHost.tsx:331` (declaration), written at `:699`, `:729`, `:1833`

**Issue:** `grep -n "localTodayRef" app/_components/PlayingHost.tsx` returns five hits: the
declaration, two doc references, and three assignments. Nothing reads it. It is dead state that
`no-unused-vars` cannot see, because it *is* used — assigned.

That matters because of what the declaration says about it:

> `:314` — "What local calendar date it is RIGHT NOW — **the sole input to D-01**."
> `:682` — "re-derive what local calendar date it is, into `localTodayRef`. **That is the D-01
> input**."

D-01 is actually evaluated at `:1850`, against a `const dateKey` computed locally inside
`startDailyRun` from its own single clock read. So the ref carries no decision, and the
foreground refresh at `:697-701` accomplishes nothing beyond `setDailyNowMs(at)`.

The consequence for behaviour is the unimplemented half of `12-UI-SPEC.md § Clock policy` rule 5:
when the date rolls over with the panel open, the countdown correctly omits itself (the boundary
is pinned), but nothing re-derives the date or replaces the panel with the playable entry state —
because the value that would drive that is never read. That is a degradation a player recovers
from by pressing Menu and re-entering, so it is not itself a Critical; the finding is the dead
write plus the false claim about it, which will mislead Phase 14, the phase that owns the real
Title entry and the "daily entry shows whether today has been played" sentence (`N-UI-01`).

**Fix:** pick one. Either delete the ref and its three writes and cut the two doc paragraphs
(smallest change, honest about what the phase shipped) — or give it its reader, which is what the
UI-SPEC rule describes:

```ts
// The panel is showing a date that is no longer today, and today has no stored result:
// D-01 says today is playable, so the read-only panel for a past date must not persist.
useEffect(() => {
  if (!dailyPanelOpen || dailyBoardFailed) {
    return;
  }
  const today = localTodayRef.current;
  if (today === '' || today === dailyDateKey) {
    return;
  }
  if (!hasResultFor(dailyRecordRef.current.history.map((e) => e.date), today)) {
    exitDailyToCampaign();
  }
}, [dailyPanelOpen, dailyBoardFailed, dailyDateKey, dailyNowMs, exitDailyToCampaign]);
```

Whichever is chosen, WINDOWS #23's device item 4 ("confirm … that the date re-derives") should be
re-worded to match, since on the current tree the date does not re-derive.

## Info

### IN-01: The `streak` prop's doc names `streakFrom` — the derivation 12-05 removed

**File:** `src/runtime/overlays/DailyResultOverlay.tsx:178`

**Issue:**

```ts
/** `streakFrom` over the stored keys — the run ending at this date (D-13 / D-14). */
streak: number;
```

The host supplies `currentDailyStreak(record)` (`PlayingHost.tsx:944`), not `streakFrom`.
`streakFrom` over the stored keys is exactly the derivation that measured 400 against a stored
`longestStreak` of 450 and silently stopped the record badge firing — the defect WINDOWS #19
records and `telemetry.ts:256-266` documents at length. The stale line sits on the prop that
recurrence would re-break, and is the one place a reader looking at the panel would find a
derivation named.

**Fix:** `/** `currentDailyStreak` over the stored record — the run ending at this date (D-13 / D-14). `streakFrom` is NOT the source: it walks the trimmed window and saturates at DAILY_HISTORY_BOUND, see `telemetry.ts` `currentDailyStreak`. */`

---

_Reviewed: 2026-09-28T12:35:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
