---
phase: 13-achievements
reviewed: 2026-09-28T23:40:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - app/_components/PlayingHost.tsx
  - src/runtime/GameScreen.tsx
  - src/runtime/overlays/DailyResultOverlay.tsx
  - src/runtime/overlays/ResultOverlay.tsx
  - src/runtime/overlays/achievementLines.ts
  - src/services/achievements/catalog.ts
  - src/services/achievements/evaluate.ts
  - src/services/achievements/index.ts
  - src/services/storage/asyncStorageStore.ts
  - src/services/storage/index.ts
  - src/services/storage/memoryStore.ts
  - src/services/storage/parseBlob.ts
  - src/services/storage/telemetry.ts
  - src/services/storage/types.ts
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-09-28T23:40:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

All fourteen files in `git diff 9230236^..HEAD` were read in full. Every hunk in
`PlayingHost.tsx` and `telemetry.ts` in this range is phase-13 work (verified by hunk headers);
the one finding that lands on older code (`sanitizeAggregateMap`, IN-05) is labelled as such.

**Every claim below was executed, not inferred.** Where a claim concerned runtime behaviour I ran
a throwaway probe suite against the real modules and then deleted it; the measured output is
quoted inline. `npx tsc --noEmit` exits 0 on this tree.

The storage read path is the strongest part of this phase and it does what its comments say.
Measured, against the real `parseProgressResult`:

- input `unlocked: [{id:'combo-25',at:5000},{id:'combo-25',at:10},{id:'not-a-real-id',at:1},{id:'rally-60',at:'garbage'},null,7,'x']`
  → output `[{"id":"combo-25","at":10},{"id":"rally-60","at":0}]`. Unknown id **dropped**,
  malformed timestamp **defaulted and kept**, duplicate resolved **earliest-wins** (D-21, D-22).
- `achievements: "BOOM"` → `status: 'ok'`, `achievements: {unlocked:[]}`, and `bestScore`,
  `unlocked`, `bestByLevel`, the endless record and the daily history all intact. The field
  degrades **alone**.
- the hostile-yields-fewer invariant holds: an all-zero snapshot qualifies for `[]`, and a
  snapshot carrying `Infinity` / `NaN` / negative / `undefined` in the fields twelve predicates
  read also qualifies for `[]`. `counter`, `isGenuineZero` and `valuesOf` are genuinely total and
  every one of the twelve predicates routes through them.
- `cloneTelemetryBlob` carries `achievements` (D-23's third site), and the entries are copied by
  value — a measured write followed by a clone preserves `[{"id":"combo-25","at":1234}]`.
- `evaluate.ts` is total as documented: `holds` uses `=== true`, so a truthy non-boolean is not a
  qualification, and a throwing predicate costs its own entry only.
- the two panels' unlock blocks are byte-identical JSX from one `achievementLines` call, and
  `achievementLines` preserves order, never sorts, never dedupes and does not mutate its input
  (measured: `['A','B','C']` intact after the call).

The four findings that follow are real defects, and three of the four are the same failure mode the
phase brief names — **an instrument that measures something other than what it is named for**. One
of them (WR-02) sits directly on the phase's own single open risk.

## Warnings

### WR-01: `startDailyRun`'s closed-date branch is a third run-absent state, and it is not suppressed

**Symbol:** the read-only closed-date branch inside `startDailyRun` (`app/_components/PlayingHost.tsx`), against `publishUnlockedAchievements` / `unlockedAchievementNames`, and `isClosed` in `DailyResultOverlay`

**Issue:** `publishUnlockedAchievements`'s JSDoc closes with an enumeration:

> *Called unconditionally on every run end, which is why there is no reset anywhere else. … A run
> that ends WITHOUT recording is the endless Retry-time wave-build failure, and the panel
> suppresses the block there structurally on its existing `showRunLines`.*

`docs/ops/ACHIEVEMENTS.md` states the same enumeration as closed: *"Two suppression states … the
`'start'` wave-build failure … and on a daily board failure."* Both enumerations are incomplete.
There is a **third** state in which the result panel renders and `recordRunEnd` never ran: the
D-02 read-only branch at the top of `startDailyRun`, reached when today's date is already closed.
That branch republishes every other panel-scoped value — `setDailyBoardFailed(false)`,
`publishDailyPanel`, `setScore`, `setIsNewRecord(false)`, `setResultStars(null)`,
`setNextGateId(null)`, `setWaveBuildFailedWave(null)` — and does **not** touch
`unlockedAchievementNames`. It then sets `result` to the stored outcome, so `kind` is `'win'` or
`'lose'`, so `isClosed` is `true`, so the block renders whatever the previous run left in state.

Both existing suppressions work — I traced `failEndlessStart` (`waveBuildFailedWave = 1` →
`failureKind === 'start'` → `showRunLines` false) and `failDailyBoard` (`isClosed` false). It is
only this third state that leaks, and it leaks precisely because `isClosed` answers "is the date
closed", not "did a run just record" — the two coincide everywhere except here.

**Failure scenario (inputs → wrong output).** Dev build, today's daily already played and closed.
1. Play a campaign level; the run breaks the player's 1000th brick. `handleRunEnded` →
   `publishUnlockedAchievements(['bricks-1000'])` → `unlockedAchievementNames = ['1000 Bricks']`.
   `ResultOverlay` correctly shows `Unlocked · 1000 Bricks`.
2. Without leaving the mount, tap the `Daily` control in the dev row (it renders at `zIndex: 20`
   above the result scrim, by design, so it is tappable while the panel is up).
3. `startDailyRun` takes the closed-date branch. `DailyResultOverlay` renders for the stored date
   with `isClosed` true.
4. **Wrong output:** the daily panel shows `Unlocked · 1000 Bricks` — an unlock earned by a
   *campaign* run, rendered on a panel describing a *daily* run that finished earlier in the day
   and unlocked nothing. Re-opening the same closed date again repeats it indefinitely.

Reachability today is the `__DEV__` dev row, which is also the **only** entry daily has in this
milestone — so this is not an exotic path, it is the only path. At Phase 14, which ships the real
Title route into this same branch, it becomes production-reachable.

**Fix:** publish the empty set in the branch that renders a panel for a run it did not record,
alongside the six resets already there:

```tsx
if (hasResultFor(dailyRecordRef.current.history.map((e) => e.date), dateKey)) {
  const record = dailyRecordRef.current;
  const stored = record.history.find((e) => e.date === dateKey);
  dailyDateRef.current = dateKey;
  setDailyDateKey(dateKey);
  setDailyBoardFailed(false);
  publishDailyPanel(record, dateKey);
  // No run recorded on this path (D-02: a closed date is read-only), so the unlock block
  // must not inherit the previous run's names. The third run-absent state — the two the
  // panels suppress structurally are the endless `'start'` failure and `failDailyBoard`.
  publishUnlockedAchievements([]);
  setScore(stored?.score ?? 0);
  ...
```

`publishUnlockedAchievements` is already in `startDailyRun`'s dependency set transitively via
`publishDailyPanel`? — it is not; add it to the `useCallback` dependency array. Then correct the
"Two suppression states" sentence in `docs/ops/ACHIEVEMENTS.md` and the closing paragraph of
`publishUnlockedAchievements`'s JSDoc to say three states, two structural and one explicit.

---

### WR-02: `achievementLines` never reads `ACHIEVEMENT_LINES_MAX` — the cap is a literal, so the prescribed remedy for WINDOWS #28 is a no-op

**Symbol:** `achievementLines` and `ACHIEVEMENT_LINES_MAX` (`src/runtime/overlays/achievementLines.ts`)

**Issue:** `achievementLines`'s own JSDoc asserts:

> *It returns at most `ACHIEVEMENT_LINES_MAX` entries for ANY input, including a 50-element
> array, **because the cap is a property of the component and not a promise by the host.***

The function body never references the constant. The cap is the literal branch structure
(`if (n === 1) … if (n === 2) … return [first, overflow]`). `grep -rn ACHIEVEMENT_LINES_MAX` over
`src/`, `app/`, `tests/` returns the declaration, two mentions inside its own prose, and three
lines in `tests/ui/achievementLines.test.ts` — **no production read at all**. The constant is
documentation that happens to be typed.

This matters because D-05's reversibility clause, `13-UI-SPEC.md`, `13-05-SUMMARY.md` and WINDOWS
#28 all state the remedy for the phase's one open risk in terms of that constant:

> *`ACHIEVEMENT_LINES_MAX` (src/runtime/overlays/achievementLines.ts) **must drop from 2 to 1***
> — WINDOWS #28
> *"reversible — the cap is a single constant"* — D-05
> *"`ACHIEVEMENT_LINES_MAX`, which is a single constant with two tests attached"* — 13-05-SUMMARY

It is not a single constant. Editing it changes nothing that renders.

**Failure scenario (inputs → wrong output).** The device check that plan 13-05 left OPEN comes back
with a non-zero bottom safe-area inset at 320×568pt. A maintainer executes the recorded remedy
verbatim: set `ACHIEVEMENT_LINES_MAX = 1`. Measured today, `achievementLines(['A','B'])` returns
**2** lines, and it continues to return 2 after that edit. Both panels still render two 32px rows,
the campaign-win worst case stays at 522px against a now-under-548 usable height, and `Menu` clips
on a non-scrolling panel — the exact failure the constant exists to prevent, with the constant
reading `1`.

The mitigating factor, stated plainly: `tests/ui/achievementLines.test.ts` asserts
`toBe(ACHIEVEMENT_LINES_MAX)` on the reached bound, so that edit reds the suite rather than
shipping silently, and 13-05-PLAN anticipates the red. The defect is that the red is the *only*
thing standing between the recorded remedy and a clipped control, and the remedy as written is
described as sufficient on its own.

**Fix:** make the constant load-bearing so the documented one-line edit is true:

```ts
export function achievementLines(
  names: readonly string[],
): readonly AchievementLine[] {
  const clean = (Array.isArray(names) ? names : []).filter(
    (n): n is string => typeof n === 'string' && n.trim() !== '',
  );
  const n = clean.length;
  if (n === 0) {
    return [];
  }
  const named = (name: string): AchievementLine => ({
    kind: 'name',
    text: `${PREFIX}${name}`,
    label: `Achievement unlocked: ${name}`,
  });
  // Every name fits: one row each, no overflow row needed.
  if (n <= ACHIEVEMENT_LINES_MAX) {
    return clean.map(named);
  }
  // Otherwise the LAST allowed row is the overflow count, so the block is never taller
  // than the cap. At a cap of 1 this is `and {n - ...} more` alone, which 13-UI-SPEC's
  // "never a bare count" rule forbids — so a cap of 1 must keep one name and drop the
  // overflow row, which is what WINDOWS #28 describes ("one name plus `and {n-1} more`
  // simply applies from n >= 2").
  const namedRows = Math.max(1, ACHIEVEMENT_LINES_MAX - 1);
  const rest = n - namedRows;
  return [
    ...clean.slice(0, namedRows).map(named),
    ...(ACHIEVEMENT_LINES_MAX > 1
      ? [{
          kind: 'overflow' as const,
          text: `and ${rest} more`,
          label: `And ${rest} more achievements unlocked`,
        }]
      : []),
  ];
}
```

At `ACHIEVEMENT_LINES_MAX = 2` this is behaviourally identical to today for every input
(verify: n=1 → one name; n=2 → two names; n=3 → name + `and 2 more`). At `1` it yields one name
and no overflow row, which is what #28 prescribes. If that shape is not wanted, the minimum
acceptable fix is to delete the "returns at most `ACHIEVEMENT_LINES_MAX`" sentence, strike
"a single constant" from D-05/13-05-SUMMARY, and amend WINDOWS #28 to name the three branch
literals that move with the constant.

---

### WR-03: an achievement unlocked by an `abandoned` run is persisted and then never announced, permanently

**Symbol:** `handleMenuPress` and `recordInFlightEndlessRun` (`app/_components/PlayingHost.tsx`) against `newlyUnlockedAchievements` (`src/services/achievements/evaluate.ts`) and the evaluation block in both stores' `recordRunEnd`

**Issue:** Evaluation sits outside every mode gate and outside every outcome gate — correct per
D-01/D-12, and `mergeRunIntoTelemetry` does increment `runsPlayed`, `bricksBroken`,
`livesLost`, `pickup*` and the running maxima on an `abandoned` run (D-09). So an abandon can
cross a threshold, and it persists the unlock. But an abandon does not raise a result panel:
`handleMenuPress` records and then calls `onMenu()`, navigating away; `recordInFlightEndlessRun`
records and the caller immediately restarts.

D-02's idempotency is a **set difference**, which means the announcement is one-shot by
construction. Once the id is in the stored set, `newlyUnlockedAchievements` returns `[]` for it on
every subsequent run, forever. So the unlock is not merely delayed — under D-01 + D-02 together
there is no later run end at which it can be announced.

I searched `13-CONTEXT.md`, all five SUMMARYs, `13-PATTERNS.md` and `docs/ops/ACHIEVEMENTS.md`:
the only `abandoned` note in the phase's artifacts is about the daily history, and D-04's
"Consequence of D-01" paragraph covers only the Title screen immediately after install. This cost
is not recorded anywhere, so it reads as an oversight rather than a decision.

**Failure scenario (inputs → wrong output).** Player has 49 finished runs. They start run 50,
pause, and tap Menu.
1. `handleMenuPress` → `runEndedRef = true` → `handleRunEnded(score, 'abandoned', …)`.
2. `mergeRunIntoTelemetry` takes `lifetime.runsPlayed` to 50.
3. `newlyUnlockedAchievements` returns `['runs-50']`; `mergeAchievementUnlocks` persists it with
   a real `at`.
4. `publishUnlockedAchievements(['runs-50'])` sets `unlockedAchievementNames = ['50 Runs']`.
5. `onMenu()` fires; the host unmounts; **no panel ever renders those names.**
6. Every later run end computes the delta against a stored set that now contains `runs-50`, so
   `[]`. The player is never told, on any surface this phase ships.

**Fix:** two options, and the cheap one is sufficient for this phase.

Cheapest, and it keeps D-01's single call site: carry the un-announced delta forward instead of
discarding it, so the next panel that *does* render says it. In `PlayingHost`:

```tsx
// An abandon records but raises no panel (`handleMenuPress` navigates away,
// `recordInFlightEndlessRun` restarts), and D-02's set difference is one-shot — so an
// id dropped here can never be announced again. Carry it to the next panel instead.
const pendingUnlockIdsRef = useRef<readonly string[]>([]);

const publishUnlockedAchievements = useCallback(
  (ids: unknown, announce: boolean) => {
    const returned = Array.isArray(ids) ? ids : [];
    const fresh = returned.filter((id): id is string => typeof id === 'string');
    const all = [...pendingUnlockIdsRef.current, ...fresh];
    if (!announce) {
      pendingUnlockIdsRef.current = all;
      return;
    }
    pendingUnlockIdsRef.current = [];
    const wanted = new Set(all);
    setUnlockedAchievementNames(
      ACHIEVEMENT_CATALOG.filter((a) => wanted.has(a.id)).map((a) => a.name),
    );
  },
  [],
);
```

called with `announce: outcome !== 'abandoned'` from `handleRunEnded`. Note the mid-run
wave-build failure records `'abandoned'` while *showing* a panel, so that call site needs
`announce: true` explicitly — which is exactly the kind of split the phase's one-flag rule warns
about, so prefer passing the flag from the two funnels rather than deriving it from `outcome`.

Alternative, if the above is judged too much machinery for this phase: record the cost explicitly
in `docs/ops/ACHIEVEMENTS.md` and in the phase's deviations, as D-04's Title-screen consequence
was recorded, so a later round finds a decision rather than a defect.

---

### WR-04: `campaign-25`'s player-facing `description` does not describe what its predicate measures, and as written it is unachievable

**Symbol:** the `campaign-25` entry's `description` and `predicate` (`src/services/achievements/catalog.ts`)

**Issue:** `description: 'Win 25 campaign levels'`, against
`predicate: (s) => sumOf(s.byMode.campaign, (c) => c.runsWon) >= 25`. That sums `runsWon` across
the `byMode.campaign` cells, i.e. it counts campaign **wins**, not distinct levels cleared. The
entry's own JSDoc is explicit and correct about this — *"summed wins is the right metric here
rather than distinct levels cleared: replaying one level twenty-five times IS persistence"* — and
also records that **five levels are playable** (`PLAYABLE_LEVEL_ORDER`). The description was not
moved to match the metric the JSDoc argues for.

The consequence is not cosmetic. The string is the only text a player ever sees for this
achievement (the name `25 Clears` is what the unlock block shows; the description is Phase 14's
screen copy and this phase's stored contract), and read literally it asks for 25 campaign levels
in a game that has 5. There is no reading of the shipped catalog under which the stated goal is
attainable, and D-11 requires every threshold to be routed to human verification as authored —
so 13-05's human reviewer is asked to judge a bar stated in units the code does not use.

**Failure scenario (inputs → wrong output).** Player clears all five levels once each
(`sum(runsWon) = 5`) and then replays `level-01` twenty times (`sum(runsWon) = 25`). The unlock
fires and the description claims they won 25 campaign levels; they won 5 distinct levels 25 times.
Inversely, a player who reads the description reasonably concludes the achievement is
unobtainable and stops pursuing it — the description names a target the game cannot present.

**Fix:** move the copy to the metric the predicate and its JSDoc already agree on:

```ts
    id: 'campaign-25',
    name: '25 Clears',
    description: 'Win 25 campaign runs, replays included',
```

Check `13-UI-SPEC.md`'s description budget before committing the string. Do **not** change the
predicate: the JSDoc's argument for summed wins is sound and the id is contract.

## Info

### IN-01: the `onRetry` prop lost its JSDoc when `unlockedAchievements` was inserted above it

**Symbol:** the `Props` type in `src/runtime/overlays/DailyResultOverlay.tsx`

**Issue:** Before this phase, the block comment *"The board-failure variant's `Retry`. Omitted
elsewhere, and — following the shipped `onNext` precedent — the control is absent rather than
gated off …"* sat immediately above `onRetry?: (() => void) | null;` (verified against
`git show 9230236^:src/runtime/overlays/DailyResultOverlay.tsx`). Plan 13-04 inserted
`unlockedAchievements` and its own JSDoc **between** that comment and the member it documented.
`onRetry` now has no attached documentation, and the orphaned paragraph reads as a preamble to an
achievements prop it has nothing to do with. In a file whose entire discipline is "the comment is
the contract", this is worth one line to repair.

**Fix:** move the `onRetry` paragraph back down so it is the last comment before
`onRetry?: (() => void) | null;`.

### IN-02: `mergeAchievementRecords` is set-commutative but not array-commutative

**Symbol:** `mergeAchievementRecords` (`src/services/storage/telemetry.ts`)

**Issue:** 13-03 restated D-22 as commutativity after finding the plan's own test passed against
an incoming-wins implementation. The implementation is genuinely order-independent **in the pair
set** — measured:

```
A = [combo-25@100, rally-60@50]   B = [rally-60@20, bricks-1000@9]
merge(A,B) → [combo-25@100, rally-60@20, bricks-1000@9]
merge(B,A) → [rally-60@20, bricks-1000@9, combo-25@100]
deep-equal → false
```

Same ids, same timestamps, different array order, because `byId` insertion order follows
`[...a.unlocked, ...b.unlocked]`. No user-visible consequence: display order is derived from
`ACHIEVEMENT_CATALOG` in `publishUnlockedAchievements`, and `13-UI-SPEC` makes declaration order
contract precisely so stored order carries nothing. Worth knowing because a future reconcile test
written as a deep-equality assertion over the two argument orders will fail for a reason that is
not a defect.

**Fix:** no code change. If a commutativity test is added, assert over a sorted projection or over
a `Map`, and say in the JSDoc that commutativity holds for the id→timestamp mapping and not for
array position.

### IN-03: `achievementLines` filters on `trim()` but renders the untrimmed name

**Symbol:** `achievementLines` (`src/runtime/overlays/achievementLines.ts`)

**Issue:** the filter is `typeof n === 'string' && n.trim() !== ''`, and the kept value is
interpolated raw. Measured: `achievementLines(['  Padded  '])` →
`text: "Unlocked ·   Padded  "`, `label: "Achievement unlocked:   Padded  "`. The JSDoc's
"whitespace-only entries are dropped" is accurate; the padded-but-not-empty case just is not
normalised. Not reachable from production input — names come from `ACHIEVEMENT_CATALOG`, which the
catalog test bounds at `ACHIEVEMENT_NAME_MAX` — but the function's stated contract is totality
over hostile input, and this is the one hostile input it passes through rather than folding.

**Fix:** `.map((n) => n.trim())` after the filter, and note it in the totality paragraph.

### IN-04: `mergeAchievementUnlocks` persists ids without `isKnownAchievementId`

**Symbol:** `mergeAchievementUnlocks` (`src/services/storage/telemetry.ts`), exported from `src/services/storage/index.ts`

**Issue:** the write path filters only `typeof id !== 'string' || id === ''`. Measured:
`mergeAchievementUnlocks(defaultTelemetryBlob(), ['combo-25','bogus',''], 1234)` →
`[{"id":"combo-25","at":1234},{"id":"bogus","at":1234}]`, and `cloneTelemetryBlob` carries
`bogus` forward. No live exposure: the only two callers pass `newlyUnlockedAchievements` output,
which is catalog-derived, and `publishUnlockedAchievements` drops any id with no catalog entry
before a name reaches a `Text` — so `parseBlob.ts`'s claim that *"no string the catalog has never
minted can reach a rendered `Text`"* is true today. But `13-PATTERNS.md`'s rule is that the
collection *"must have the bound or the id validation and must not have neither"*, and on the
write side it has the bound only. The function is public API on the storage barrel, so Phase 14 is
one careless call away from persisting an arbitrary attacker-supplied string, up to 64 entries.

**Fix:** either add `isKnownAchievementId(id)` to the write-side filter (the import already exists
elsewhere in this layer and introduces no cycle — `src/services/achievements` imports nothing),
or amend the JSDoc to say the write side is bounded but *not* validated and that the read path is
the only id gate.

### IN-05: `sanitizeAggregateMap` lets a stored `__proto__` key become the map's prototype — PRE-PHASE-13 hunk

**Symbol:** `sanitizeAggregateMap` (`src/services/storage/parseBlob.ts`) — **not** phase-13 code; it predates this diff and is named in this phase's comments only as a counter-example (WINDOWS #27)

**Issue:** the loop does `out[key] = sanitizeAggregate(entry)` over `Object.keys(map)`. For the
own property `__proto__` that JSON.parse produces, plain assignment hits `Object.prototype`'s
accessor and **sets the prototype** of `out` instead of adding an own key. Measured against real
`parseProgressResult` with `byMode.campaign = {"__proto__":{"runsWon":9,"livesLost":0}}`:

```
STATUS ok
OWN KEYS []                      <- the key vanished from the map
PROTO POLLUTED runsWon 9         <- campaign.runsWon now resolves through the prototype
OBJ PROTO CLEAN undefined        <- global Object.prototype is NOT affected
QUALIFY []                       <- no achievement was granted by it
```

Contained, and phase 13's own reader is the reason it stays contained: `valuesOf` uses
`Object.values`, which returns own enumerable properties only, so the injected aggregate never
reaches a predicate. `mergeAggregateMaps` uses `Object.entries`, same. Recording it because it is
the sharpest edge in a file this phase now imports a closed-set predicate into, and because the
mitigation is currently accidental.

**Fix (in the older hunk, on its own change):** skip the three dangerous keys, or build the map
with a null prototype.

```js
  for (const key of Object.keys(map)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
```

### IN-06: all three `slice(0, ACHIEVEMENT_UNLOCK_BOUND)` sites trim by array position while all three comments justify the direction by timestamp age

**Symbols:** `sanitizeAchievementRecord` (`parseBlob.ts`), `mergeAchievementUnlocks` and `mergeAchievementRecords` (`telemetry.ts`)

**Issue:** 13-03's correction of the plan's `slice(-N)` to `slice(0, N)` is right, and the three
sites agree with each other — that part checks out. What the three comments claim is stronger than
what the code does: *"dropping the oldest would un-earn the achievements the player has held
longest"* describes a trim by `at`, and `slice(0, N)` trims by array index. The two coincide only
because `mergeAchievementUnlocks` appends, so the stored array happens to be in unlock order; a
hand-reordered blob would have the bound keep whichever entries the attacker put first.

No failure scenario exists today, which is why this is Info and not a Warning: the unknown-id drop
plus the dedupe cap the surviving collection at the catalog's size, measured at **12**, against a
bound of **64** — I could not construct any input, hostile or otherwise, that reaches the slice.
`types.ts` says as much ("structurally unreachable while step 1 stands").

**Fix:** no code change while the bound is unreachable. If the unknown-id drop is ever relaxed
"for forward compatibility" — the exact edit all three comments warn about — the slice becomes
live and must sort by `at` first, or the comments must stop claiming it preserves the oldest.

### IN-07: on the AsyncStorage cold path the retroactive flood costs a second run, not the one D-04 documents

**Symbol:** `recordRunEnd`'s `wasHydrated` branch in `src/services/storage/asyncStorageStore.ts`, against the evaluation block at its tail

**Issue:** when `recordRunEnd` runs before hydration completes, it evaluates against
`memory.telemetry`, which at that moment is `defaultTelemetryBlob()` plus this one run — disk
history has not been folded in yet. So D-04's retroactive set does not qualify and nothing is
announced; the persist is correctly chained behind `ensureHydrated()` and
`mergeAchievementRecords` unions the disk set, so nothing is lost and no over-announce occurs.
The player simply needs a *second* finished run, where D-04's "Consequence of D-01" paragraph
promises one. Hosts await `getSnapshot`/`getBest` first, so the path is rare by design.

**Fix:** no code change — hardening it would need the extra read D-01 rejected. Worth one sentence
in D-04's consequence paragraph or in `docs/ops/ACHIEVEMENTS.md`, since the phase records the
one-run cost as exact.

---

_Reviewed: 2026-09-28T23:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---

## Resolution (orchestrator, 2026-09-28)

Every Warning was re-verified against the source by the orchestrator before any action was taken;
all four held. None was accepted on the reviewer's word.

| # | Verified how | Disposition |
|---|---|---|
| **WR-02** | `grep -rn ACHIEVEMENT_LINES_MAX src/ app/` → the only production occurrences are the declaration and two JSDoc mentions. `achievementLines()` caps via `n === 1` / `n === 2` branches. | **FIXED in code.** The constant now clamps: `return laid.slice(0, ACHIEVEMENT_LINES_MAX)`. Red-proved three ways — clamp removed reds 1 case; a literal `slice(0, 2)` reds the new source scan with the intended message; **the constant set to 1 reds 8 cases**, where before the fix only the assertion naming the number moved. Guarded by a comment-stripping source scan, because at the shipped value of 2 the clamp is a no-op and *no black-box case can observe it* — which is exactly why the omission survived four plans and two checker rounds. Ledger #36 (fixed). |
| **WR-01** | Read `startDailyRun`'s closed-date branch: it neutralises 11 other panel scalars and not `unlockedAchievementNames`, and `publishUnlockedAchievements`' JSDoc enumerates only two run-absent states. | **FIXED in code**, with a test. `setUnlockedAchievementNames([])` added to the branch; the JSDoc's enumeration corrected to three-of-which-one-acts. New case `tests/ui/PlayingHost.daily-run.test.tsx -t "WR-01"`, red-proved: without the fix, `expected [ '1000 Bricks' ] to deeply equal []`. |
| **WR-04** | Read the entry: JSDoc argues correctly for summed `runsWon`; `description` said "Win 25 campaign **levels**"; `PLAYABLE_LEVEL_ORDER` holds five. | **FIXED in code.** Now "Win 25 campaign runs". Ledger #37 (fixed). |
| **WR-03** | Read `handleMenuPress`: records `'abandoned'` (which publishes) then `onMenu()` navigates away. D-02's delta is one-shot. | **NOT fixed — ledgered, by decision.** Ledger #35 (open), plus `docs/ops/ACHIEVEMENTS.md` Limit 2b. The fix is a placement decision, not a one-liner: no Menu-route surface states run outcomes, and inventing a toast would be this phase's first notification-shaped UI, which D-05 and § What the player sees were written against. Belongs with Phase 14's screen. The alternative — suppressing the unlock so it can be re-earned — is worse: it contradicts D-17's one-way rule and makes identical play produce different results depending on how the player left the screen. |

### One correction to WR-01 as filed

The reviewer framed it as re-opening a closed **date**. It is not reachable that way:
`startDailyRun` derives `dateKey` from `Date.now()` and can only ever open *today*. The defect is
cross-**mode** — which is what the reviewer's own reproduction described (campaign unlock → press
`Daily`). The first version of the test written for it asserted a yesterday-shaped fixture and
failed on its own premise (`expected '2026-09-27' to be '2026-09-26'`); it was rewritten to play
a real campaign run for its positive control. The fix itself was unaffected.

### Post-fix gates

`npm test` exit 0 at **112 files / 870 passed | 1 skipped (871)** — two cases up from the
phase-close baseline of 869. `npm run typecheck` exit 0. `npm run lint` exit 0 at the measured
`✖ 3 problems (0 errors, 3 warnings)`. Ledger `ok: true` at 31 open / 0 waived / 6 fixed / 37
total. All probe mutations reverted; `diff` against the pre-mutation copies confirms both touched
source files byte-identical to their fixed state.

The seven Info findings are left as recorded, including the one the reviewer correctly attributed
to a **pre-phase-13 hunk** (`sanitizeAggregateMap`'s `__proto__` key, measured contained by
`valuesOf`'s `Object.values` — it grants no achievement). It is phase 09 inheritance and already
sits in the ledger as #27.
