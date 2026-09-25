---
phase: 11-endless-mode
reviewed: 2026-09-25T15:35:41Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - app/_components/PlayingHost.tsx
  - src/runtime/loadLevel.ts
  - src/runtime/useGameLoop.ts
  - src/runtime/worldRequests.ts
  - src/services/endless/index.ts
  - src/services/endless/ramp.ts
  - src/services/storage/asyncStorageStore.ts
  - src/services/storage/index.ts
  - src/services/storage/memoryStore.ts
  - src/services/storage/parseBlob.ts
  - src/services/storage/telemetry.ts
  - src/services/storage/types.ts
  - tests/endless.determinism.test.ts
  - tests/endless.ramp.test.ts
  - tests/endless.wave-loop.test.ts
  - tests/helpers/balanceBot.ts
  - tests/runtime.wave-advance.test.ts
  - tests/storage.endless-firewall.test.ts
  - tests/storage.progress-v4.test.ts
  - tests/ui/PlayingHost.endless-host.test.ts
  - tests/ui/PlayingHost.endless-run.test.tsx
  - tests/ui/PlayingHost.endless.test.ts
  - tests/ui/PlayingHost.next-bake.test.ts
  - docs/ops/ENDLESS-MODE.md
  - docs/ops/BOARD-GENERATOR.md
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-09-25T15:35:41Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

The four contracts the phase brief singled out all hold, and I verified each against
source rather than against the prose:

- `applyWaveAdvance` (`src/runtime/worldRequests.ts:61-96`) clears `effectType` /
  `effectUntilTick` / `effectCount` at lines 64-69, well above `world.tick = 0` at line 94.
  I grepped every absolute-tick consumer in `src/core` — `effects.ts:114,144,171,195` are
  the only ones, and they all read the SoA that was just cleared. The ordering is correct
  and complete.
- The host writes `compiledSv.value` (PlayingHost.tsx:758) before `advanceWave()`
  (PlayingHost.tsx:783), and both are shared-value writes issued from the same JS-thread
  callback, so the UI runtime observes them in that order.
- Nothing in either store's `recordRunEnd` reaches `bestByLevel`, `unlocked` or `bestScore`
  from the endless arm (`memoryStore.ts:100-135`, `asyncStorageStore.ts:380-424`), and
  `sanitizeTelemetry` / `sanitizeEndlessRecord` (`parseBlob.ts:337-346, 415-446`) degrade a
  corrupt `telemetry.endless` to `defaultEndlessRecord()` without touching a sibling.
  The persistence-layer firewall is sound.
- `bakeGlowSprites` really does read only `(brickW, brickH)` (its whole body is
  `bakeGlowSprites.ts:95-108`, colors are module constants), so `loadKey` does not
  under-key the *atlas*. But the value it is keyed on comes from the wrong place during an
  endless run — see WR-01.

The defects that remain cluster in the host, not in the policy or the storage layer. One of
them writes a wrong number into persistent storage (CR-01); the rest are host state-machine
gaps that the mocked jsdom behaviour test cannot see because it replaces `useGameLoop`
wholesale and never exercises the Retry / level-switch / compile-failure paths.

## Critical Issues

### CR-01: Endless "Retry" resumes at the reached wave with free lives, inflating the persisted `telemetry.endless.bestWave`

**File:** `app/_components/PlayingHost.tsx:895-920` (with `617-635`, `740-766`)
**Issue:**
`onRetry` is wired to the Result overlay unconditionally
(`GameScreen.tsx:165-175` → `onRetry={onRetry}`), and it is reachable after an endless
loss: its guard is `!levelReady || levelError != null || !fxReady`, all of which are
satisfied by the *campaign* level that is still loaded behind the endless run.

`onRetry` resets `runEndedRef`, lives, score, combo and calls `retry()` — which applies
`applyRetryWorldReset(w, compiled.value)` against whatever generated board is currently in
`compiledSv`. It does **not** touch `runSeedRef`, `waveRef`, `setWave`,
`waveAdvanceInFlightRef` or `mode`.

Concrete failure:

1. Player starts an endless run, dies on wave 18. `recordRunEnd({mode:'endless', wave:18, …})`
   writes `bestWave = 18`.
2. Player taps Retry. The world resets to 3 lives on the **wave-18 board**; the HUD still
   reads `W18`; `waveRef.current` is still 18.
3. Player clears it → `advanceToWave(19)` → dies. `recordRunEnd({wave:19})` writes
   `bestWave = 19`.
4. Repeat indefinitely. `telemetry.endless.bestWave` climbs one wave per Retry while
   waves 1..18 are never replayed and lives are refilled on every attempt.

`EndlessRecord.bestWave` is documented as "deepest wave index ever reached in an endless
run" (`types.ts:125-137`) — this makes it the deepest wave reached across a chain of
free resumes, a number no single run produced. It is written through `mergeEndlessRecord`
into AsyncStorage, so the corruption is durable. `bestScore` is not affected (the sim score
does zero on `resetWorld`), which is exactly why the inconsistency is easy to miss.

Secondary symptom of the same omission: `waveAdvanceInFlightRef` is also not reset, so if
the retry follows a failed `advanceToWave` the guard stays latched `true` and the very next
WON is silently swallowed.

**Fix:** make Retry mode-aware — an endless retry is a new run, not a resumed one:

```ts
const onRetry = useCallback(() => {
  if (!levelReady || levelError != null || !fxReady) {
    return;
  }
  if (modeRef.current === 'endless') {
    // A new run means a new seed and wave 1 — resuming at wave N with fresh
    // lives would record a bestWave no single run reached (N-END-02).
    startEndlessRun();
    return;
  }
  // …existing campaign body unchanged…
}, [/* + startEndlessRun */]);
```

If resuming is genuinely wanted later, it must not feed `recordRunEnd` — carry a separate
`runStartWaveRef` and record `wave - (runStartWave - 1)`, or refuse to raise `bestWave`
from a resumed run at all.

## Warnings

### WR-01: The glow atlas is baked at the campaign level's brick size, never the generated board's

**File:** `app/_components/PlayingHost.tsx:344-346, 480-490`
**Issue:**
`loadKey` and the bake inputs both derive from `loadResult`, i.e. `loadLevelById(levelId)` —
the *campaign* level. During an endless run the board actually in `compiledSv` comes from
`compileGeneratedLevel(generate(...))` and always uses the frozen lattice
`brickW: 32, brickH: 14` (`src/levelgen/grid.ts:32-41`). Level-01 — the default `levelId`
and the one the `__DEV__` entry is pressed from in practice — is `brickW: 44, brickH: 18`.

So every endless run entered from level-01 renders 52×26 halo sprites (44+2·4 by 18+2·4)
stretched by `drawImageRect` into a 40×22 destination (`recordSprites.ts:324-333`), i.e. a
non-uniform 0.77×/0.85× squash of the baked pad ring on every brick of every wave. The same
mismatch applies entering from level-04 (36×16) and level-05 (36×15); only level-03 and
level-06 happen to match the lattice.

This is a *consequence* of the D-14 re-key being correct, not a reason to revert it: the key
is right for the atlas, but the source of the dimensions is wrong for the mode. The bake
firing once per run (the SC-5 property) is preserved by the fix below, because every
generated board shares one lattice.

**Fix:** derive the bake dimensions and the key from the board that will actually be drawn:

```ts
// The atlas must follow the board in `compiledSv`, not the catalog level behind it.
const activeDims = modeRef.current === 'endless'
  ? ENDLESS_BRICK_DIMS            // one fixed lattice — bake still fires once per run
  : loadResult.ok
    ? { w: loadResult.compiled.w[0], h: loadResult.compiled.h[0] }
    : null;
const loadKey = activeDims ? `${activeDims.w}x${activeDims.h}` : `err:${levelId}`;
```

`ENDLESS_BRICK_DIMS` should be exported from the `src/levelgen` barrel (derived from
`GRID`) rather than restated, for the same reason `ramp.ts` refuses to restate `D_MAX`.

### WR-02: `mode` latches to `endless` for the lifetime of the mount, killing the campaign gate effect

**File:** `app/_components/PlayingHost.tsx:552-579` (with `971-1002`, `1108-1132`)
**Issue:**
`modeRef.current` / `mode` are set to `'endless'` in `startEndlessRun` and are never set
back. The compiled-push gate effect returns early forever after
(`if (modeRef.current === 'endless') return;`), which means it can no longer push a board
into `compiledSv`, call `retry()`, or call `setActive(true)`.

Every remaining path that relies on the gate effect to re-arm the loop is therefore dead
once endless has been entered. The clearest one:

- Press `Endless`, then press the `Lv` dev button. `toggleDevLevel` changes `levelId` →
  `loadKey` flips (e.g. `32x14` → `36x16`) → `fxReady` false → the bake effect runs
  `setActiveRef.current(false)` → bake → `setBakedKey` → `fxReady` true → **the gate effect
  early-returns**, so `setActive(true)` never fires.

Result: a permanently stopped frame callback with a live HUD (lives/score/uiPhase were all
reset to a fresh-run state by `toggleDevLevel`) — precisely the R-24 failure mode the
surrounding comments warn about. `runCertWorstCase` reaches the same state, because it sets
`levelId` to `'level-03'`.

Both entry points are `__DEV__`-gated this phase, which is why this is a warning and not a
blocker, but the dev harness is the only way to reach endless at all right now, so this is
the configuration the SC-5 device discharge procedure in `docs/ops/ENDLESS-MODE.md` will be
run in.

**Fix:** leave endless whenever the campaign level identity changes. Add an explicit
`exitEndless()` that sets `modeRef.current = 'campaign'` / `setMode('campaign')` and clears
`genIssues`, and call it at the top of `toggleDevLevel`, `goNext` and `runCertWorstCase`.
Leaving the *dependency array* of the gate effect alone (the ref read is deliberate) is
still correct — the effect will re-run on the `loadResult` change that follows.

### WR-03: An endless run reads and writes the campaign per-level personal best on the Results screen

**File:** `app/_components/PlayingHost.tsx:597-645`
**Issue:**
`handleRunEnded` computes `evaluatePersonalBest(runScore, previousBestRef.current)` before
it branches on mode. `previousBestRef` is loaded by the effect at lines 385-402 from
`store.getBestForLevel(levelId)` — a **campaign** level best. For an endless run that means:

- `setResultBest(best)` shows the campaign level's PB (or the endless score) as "BEST" on
  the endless Results overlay;
- `setIsNewRecord(record)` fires "NEW RECORD" when the endless score beats a *campaign
  level's* score — two unrelated quantities;
- line 638-640 then writes the endless score into `previousBestRef.current`, poisoning the
  in-memory campaign best for the rest of the mount. `onRetry` (line 906) and
  `remountDevSession` (line 1024) both re-display it via `setResultBest(previousBestRef.current)`.

The storage-side firewall holds — nothing is persisted — but the UI half of SC-3 leaks in
both directions. Compounding it, the record that *is* written, `telemetry.endless`, is never
read anywhere in `app/` or `src/` (I grepped: only the stores and tests touch it), so the
number the player just set is the one number they are not shown.

**Fix:** keep a separate endless watermark and branch before the comparison:

```ts
const endlessBestRef = useRef(0);   // seeded from getSnapshot().telemetry.endless.bestScore
const previous = modeRef.current === 'endless'
  ? endlessBestRef.current
  : previousBestRef.current;
const { best, isNewRecord: record } = evaluatePersonalBest(runScore, previous);
…
if (record) {
  if (modeRef.current === 'endless') endlessBestRef.current = best;
  else previousBestRef.current = best;
}
```

### WR-04: A mid-run board compile failure leaves the loop running and every recovery button inert

**File:** `app/_components/PlayingHost.tsx:740-766, 779-787` (with `552-562`, `878-893`)
**Issue:**
When `advanceToWave` fails it calls `setGenIssues(compiled.issues)` and returns `false`;
`applyChrome` then returns without calling `handleRunEnded` or `setActive(false)`. Because
the gate effect early-returns in endless mode (WR-02), **nothing** in the file can call
`setActive(false)` for this state. The frame callback keeps running, `keepAwake` stays
mounted (`uiPhase === 'playing' && result == null`), and the world sits frozen in `WON`.

The player's exits are also degraded: `levelError != null` makes `onResume` (line 879) and
`onRetry` (line 896) return immediately, so the Pause overlay renders a Resume and a Retry
button that silently do nothing. The only working exit is Menu (Android back twice, or
pause → Menu), which at least records the run as `abandoned` through `handleMenuPress`.

The header comment calls this path "loud and terminal", which is the intent — but terminal
should mean stopped, not "still burning the frame loop and the screen-wake lock behind a
modal with two dead buttons".

**Fix:** make the failure path terminal in fact:

```ts
if (advanceToWave(waveRef.current + 1)) {
  advanceWave();
} else {
  // Terminal for this run: stop the loop, bank the run, and let the error UI
  // stand in front of a stopped sim rather than a live one.
  setActive(false);
  if (!runEndedRef.current) {
    runEndedRef.current = true;
    handleRunEnded(mirror.score, 'lose', mirror.lives, snapshotRunStats());
  }
  setResult('lose');
}
return;
```

### WR-05: `wave`/`mode`/seed state is not reset by the DEV tier remount, silently discarding a run

**File:** `app/_components/PlayingHost.tsx:1014-1038, 1094-1102`
**Issue:**
`remountDevSession` (fired whenever `tierOverride` changes) clears `runEndedRef`, resets
lives/score and calls `retry()`. In endless that restarts the sim on the current generated
board with three lives while `waveRef`, `runSeedRef`, `mode` and `waveAdvanceInFlightRef` all
carry over, and the run in progress is never recorded — the same two-headed problem as
CR-01 (inflated `bestWave` on the eventual loss) plus a silently dropped run.

**Fix:** route it through the same mode-aware reset as CR-01 — if
`modeRef.current === 'endless'`, record the in-flight run as `abandoned` and call
`startEndlessRun()` instead of `retry()`.

## Info

### IN-01: `difficultyForWave` folds a `|0`-overflowing wave to the easy end, contradicting its own contract

**File:** `src/services/endless/ramp.ts:57-66`
**Issue:** `(wave | 0) - 1` wraps for `wave >= 2**31`: `difficultyForWave(2147483648)`
returns `0`, not `D_MAX`. The doc block and `docs/ops/ENDLESS-MODE.md` both claim degenerate
input "folds to the nearest end of the range", and the property suite only covers wave 10 000.
Unreachable in play (2³¹ waves), so this is a documentation-accuracy item, not a bug.
**Fix:** clamp before coercing — `const step = wave >= D_MAX + 1 ? D_MAX : (wave | 0) - 1;`
— or narrow the doc claim to "within the representable wave range".

### IN-02: Stale file header in `tests/storage.progress-v4.test.ts`

**File:** `tests/storage.progress-v4.test.ts:1-16`
**Issue:** The header states "Every case is an `it.todo` on purpose: this file is created
BEFORE the v4 schema… exists". Zero `it.todo` cases remain; the file is now a live suite that
this phase extended with endless-record coverage. A reader trusting the header would skip it.
**Fix:** rewrite the header to describe what the file now asserts (v4 parse/migrate/store,
including the N-END-02 endless record).

### IN-03: `ENDLESS_TELEMETRY_KEY` is re-exported from the storage barrel but has no non-test consumer

**File:** `src/services/storage/index.ts:29`
**Issue:** Both stores import the constant from `./types` directly; the barrel re-export is
consumed only by `tests/storage.endless-firewall.test.ts` and
`tests/storage.progress-v4.test.ts`. Harmless and arguably intentional (Phase 14 will read
`byMode.endless`), but worth noting alongside WR-03 — `telemetry.endless` itself is currently
write-only across the whole of `app/` and `src/`.
**Fix:** none required this phase; drop or keep deliberately when Phase 14 wires the display.

---

_Reviewed: 2026-09-25T15:35:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
