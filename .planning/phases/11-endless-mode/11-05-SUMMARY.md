---
phase: 11-endless-mode
plan: 05
subsystem: app-host
tags: [endless, playing-host, glow-bake, react-native, source-contract, vitest, tdd]

# Dependency graph
requires:
  - phase: 11-endless-mode
    plan: 01
    provides: "difficultyForWave / seedForWave behind src/services/endless, compileGeneratedLevel, applyWaveAdvance"
  - phase: 11-endless-mode
    plan: 02
    provides: "RecordRunEndArgs — the campaign|endless discriminated union whose endless arm has no levelId"
  - phase: 11-endless-mode
    plan: 03
    provides: "advanceWave() on GameLoopHandle, the waveRequest/waveApplied pair, the cumulative tick bank"
  - phase: 10-seeded-board-generator
    provides: "generate(seed, difficulty) through the levelgen barrel"
provides:
  - "The endless host: mode/wave state, the WON intercept ahead of the campaign WON branch, advanceToWave, startEndlessRun"
  - "The endless arm of recordRunEnd wired at the single existing run-boundary funnel"
  - "loadKey re-keyed on brick dimensions alone (D-14) — the SC-5 mitigation, and a strict campaign improvement"
  - "The temporary __DEV__ endless entry + W{n} readout on the dev row (D-05 / D-13)"
  - "tests/ui/PlayingHost.endless.test.ts, tests/ui/PlayingHost.endless-host.test.ts, tests/ui/PlayingHost.endless-run.test.tsx"
affects: [11-06 ENDLESS-MODE ops doc and the device SC-5 reading, 12 daily challenge, 14 Title entry (deletes the __DEV__ entry)]

# Actuals (#2632)
actuals:
  tokens: 12541
  tasks: 3
  commits: 5
plan_head_before: f5a642dfb9e73069fd82691e95f8c89002fca961

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bake key = the identity of the thing baked (brick dimensions), not the identity of the thing that asked for it (the level)"
    - "An early-return branch placed AHEAD of an existing branch to make that branch unreachable in one mode, with the ordering pinned by a source contract"
    - "Behavioural host test that drives the real useAnimatedReaction bridge: the Reanimated mock keeps one SharedValue per hook slot so effect identities stay stable"

key-files:
  created:
    - tests/ui/PlayingHost.endless.test.ts
    - tests/ui/PlayingHost.endless-host.test.ts
    - tests/ui/PlayingHost.endless-run.test.tsx
  modified:
    - app/_components/PlayingHost.tsx
    - tests/ui/PlayingHost.next-bake.test.ts

key-decisions:
  - "D-14 implemented: loadKey's success branch is `${compiled.w[0]}x${compiled.h[0]}` — the level id and compiled.brickCount are gone. brickCount moves every wave (32 bricks at d=0 to 128 at d=20), so the old key flipped fxReady false at every board swap and re-entered setActive(false) -> bakeGlowSprites -> a 2500 ms audio-preload race. That cold path, not the 0.56 ms of generation, was the real SC-5 risk."
  - "D-10 implemented: endless is host-local state entered by the __DEV__ button; no mode prop, no GameHost change. Phase 14 deletes one button and adds one prop rather than unpicking a half-built shell."
  - "D-13 implemented: the wave renders as W{n} in the __DEV__ dev row, reusing styles.devSwitchLabel. No new style was needed and src/runtime/GameScreen.tsx has a zero-line diff."
  - "The in-flight guard is cleared by a mode-agnostic `phase !== WON && phase !== LOST` branch rather than an endless-only one — the campaign path sets it never, so a narrower guard would only add a condition to read."
  - "handleRunEnded reads modeRef, not the mode state: it is reached from the memoised applyChrome, where a state read is the value from whenever the callback was last built."
  - "genIssues folds into levelError (`genIssues ?? (loadResult.ok ? null : loadResult.issues)`) so a generated board that fails to compile reaches the SAME LevelErrorOverlay a bad catalog level does (Pitfall 6)."
  - "advanceToWave writes compiledSv BEFORE advanceWave() bumps the request — 11-03's carry-forward. The frame callback applies whatever compiledSv holds when it notices the bump, so the reverse order swaps in the previous board."
  - "startEndlessRun calls retry(); every subsequent transition calls advanceWave() and never retry(), because retry() at a wave boundary destroys the lives/score/combo SC-1 exists to carry."

patterns-established:
  - "A new consumer of a SharedValue inside a memoised callback needs a ref mirror, not a state read — applyChrome is the standing example"
  - "Source contracts over PlayingHost extract a REGION first (applyChrome, the dev row, the wave branch); a whole-file negative assertion is either vacuous or wrong"
  - "A Reanimated mock must keep one SharedValue object per hook slot — a fresh object per render moves effect dependency identities and re-runs the bake effect every render"

requirements-completed: [N-END-01, N-END-02, N-END-03]

coverage:
  - id: D1
    description: "Clearing a board in endless generates and swaps in the next one instead of ending the run — handleRunEnded is never reached on a WON (SC-1 / N-END-01)"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-run.test.tsx#clearing a board swaps in the next one instead of ending the run (SC-1 / N-END-01)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#the endless WON branch precedes the campaign WON branch and returns early (SC-1)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless.test.ts#a cleared board never ends an endless run (SC-1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A WON mirror delivered twice before the advance lands advances exactly one wave, and the guard releases on the next live phase (Pitfall 5)"
    requirement: "N-END-01"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-run.test.tsx#a WON delivered twice before the advance lands advances exactly one wave (Pitfall 5)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-run.test.tsx#the guard releases once the mirror reports a live phase, so wave 3 follows (Pitfall 5)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#waveAdvanceInFlightRef is a ref, set in the branch and cleared off WON/LOST (Pitfall 5)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A lost endless run records once through the single existing run-boundary funnel with the endless arm and the wave reached; no campaign state moves (SC-3 / N-END-02)"
    requirement: "N-END-02"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-run.test.tsx#zero lives records once through the endless arm with the wave reached (N-END-02 / SC-3)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#the endless run records through the endless arm of the union, with the wave (N-END-02)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#an endless run skips the campaign star / next-gate follow-up (SC-3)"
        status: pass
      - kind: other
        ref: "npm run typecheck — the endless arm has no levelId, so the campaign write is unreachable by narrowing (D-11)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A wave transition triggers no glow re-bake, no audio preload and no setActive: the bake key is invariant across every wave (SC-5 / N-END-03)"
    requirement: "N-END-03"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.next-bake.test.ts#loadKey success branch is brick dimensions only — no level id, no brick count (D-14 / SC-5)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless.test.ts#the glow bake key is brick dimensions only (D-14 / SC-5)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless.test.ts#the endless wave advance never touches the gate or the campaign level id (SC-5)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-run.test.tsx#clearing a board swaps in the next one instead of ending the run (SC-1 / N-END-01) — asserts setActive was never called with false across the transition"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#the compiled-push effect is a no-op during an endless run, gated by ref (SC-5)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The bake re-key does not regress campaign: mount still pauses for the cold path then arms, and a controlled levelId switch still re-bakes"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.next-bake.test.ts#mount still pauses for the cold path and arms once afterwards (D-14 regression)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.next-bake.test.ts#a controlled levelId switch still re-bakes (D-14 regression)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.bake-gate.test.ts (4 sibling R-24 / R-26 contracts, unbroken)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The endless entry renders only under __DEV__ and is absent otherwise, and the wave number renders in the same row (D-05 / D-13)"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless.test.ts#the endless entry lives inside the one __DEV__-guarded dev row (D-05)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless.test.ts#the dev row uses the full __DEV__ guard idiom, never a bare __DEV__ (D-05)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless.test.ts#the wave number renders in the same dev row (D-13)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-run.test.tsx#the entry starts a run on a generated board and shows wave 1 (D-05 / D-13)"
        status: pass
    human_judgment: false
  - id: D7
    description: "A compile failure on a generated board surfaces the existing level-error UI and logs under __DEV__; it never falls through into the run-end branch (Pitfall 6)"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#a generated-board compile failure is loud and never falls through to run end (Pitfall 6)"
        status: pass
    human_judgment: true
    rationale: "Pinned structurally — advanceToWave's failure path sets genIssues, logs under the full __DEV__ guard and returns false, and genIssues provably reaches levelError. The branch is not exercised behaviourally because every generated board is compilable by theorem and by Phase 10's 21 000-board sweep; forcing the failure would require mocking compileGeneratedLevel, which would test the mock."
  - id: D8
    description: "Starting an endless run mints a fresh run seed in the app tier, so two runs are not the same board sequence (N-END-03 / Pitfall 7)"
    requirement: "N-END-03"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.endless-run.test.tsx#two runs are not the same board sequence — the seed is minted per run (N-END-03)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#the run seed is minted in the app tier and the layer boundaries hold (Pitfall 7 / LC-04)"
        status: pass
    human_judgment: false
  - id: D9
    description: "The phase freeze and the layer boundaries hold: src/core, src/levelgen and src/runtime/GameScreen.tsx are byte-unchanged, and the app zone imports no src/core"
    verification:
      - kind: other
        ref: "git diff --name-only dcfdd37..HEAD -- src/core src/levelgen (empty)"
        status: pass
      - kind: other
        ref: "git diff --name-only dcfdd37..HEAD -- src/runtime/GameScreen.tsx (empty)"
        status: pass
      - kind: other
        ref: "npm run lint — boundaries/dependencies and the LC-07 no-restricted-syntax rule, 0 errors 0 warnings"
        status: pass
      - kind: other
        ref: "node scripts/assert-worklet-closures.mjs (121 files)"
        status: pass
    human_judgment: false
  - id: D10
    description: "A device reading that a wave transition costs no visible stall (SC-5 on hardware)"
    verification: []
    human_judgment: true
    rationale: "Outstanding — deferred to plan 11-06. Everything above proves the cold path is not ENTERED; nothing here measures a frame on a phone. The 0.56 ms Hermes-scaled generation estimate is still an estimate."

# Metrics
duration: 20min
completed: 2026-09-25
status: complete
---

# Phase 11 Plan 05: Endless Host Wiring Summary

**Endless is playable: the `__DEV__` entry starts a seeded run, a cleared board generates and swaps in the next one inside the same run instead of ending it, a lost run records through the endless arm of the store union with the wave reached — and the glow bake is re-keyed on brick dimensions alone so no wave transition re-enters the multi-hundred-millisecond bake/preload cold path.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-25T22:53Z (approx — first commit 22:59)
- **Completed:** 2026-09-25T23:12Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- **The phase became a thing a person can play.** Press `Endless` on the dev row and the host mints a run seed, generates wave 1, arms the loop, and from then on every cleared board produces the next one on the same live `World` with lives, score and combo carried. `handleRunEnded` is unreachable on a WON in endless — proven three ways: by the ordering of the branch in source, by the absence of the call inside the extracted branch, and by an actual run in which `recordRunEnd` is not called after a WON.
- **The real SC-5 risk is closed at its cause.** `loadKey` embedded `compiled.brickCount`, which moves every wave as difficulty ramps (32 bricks at d=0 to 128 at d=20). Every board swap would therefore have flipped `fxReady` false and re-entered `setActive(false)` → `bakeGlowSprites` → an awaited audio preload with a 2500 ms race — three orders of magnitude worse than the 0.56 ms of generation everyone was watching. The key is now the brick dimensions, which is the only thing the atlas depends on, so the bake fires once per endless run. It is also a strict campaign improvement: two levels with the same brick size no longer re-bake an identical atlas.
- **SC-3 is enforced by the type system and observed at runtime.** `handleRunEnded` selects the endless arm of `RecordRunEndArgs` by `modeRef.current`; that arm has no `levelId`, so the campaign write is unreachable rather than merely skipped, and `tsc` is the gate. The behavioural suite confirms the recorded args carry `mode: 'endless'`, `wave: 2`, and no `levelId` at all.
- **The endless run is driven through the host's own bridge in a test.** `tests/ui/PlayingHost.endless-run.test.tsx` renders the real `PlayingHost` with real `generate` and real `compileGeneratedLevel`, presses the real entry, and delivers chrome mirrors through the captured `useAnimatedReaction` callbacks — exactly what the UI runtime does when `chromeSeq` bumps. Boards, wave numbers and record writes are all observed, not asserted by absence.
- **The phase freeze held for the fifth plan running.** `src/core`, `src/levelgen` and `src/runtime/GameScreen.tsx` all have a zero-line diff since `dcfdd37`. Lint is 0 errors / 0 warnings, `tsc --noEmit` is clean, and the full suite is **95 files / 558 tests passing** (up from 92 / 535).

## Task Commits

1. **Task 1 (TDD RED): failing D-14 contract that loadKey is brick dimensions only** — `50355e1` (test)
2. **Task 1 (TDD GREEN): key the glow bake on brick dimensions alone** — `b10393d` (feat)
3. **Task 2 (TDD RED): failing endless-host contracts for the WON intercept and record** — `890a884` (test)
4. **Task 2 (TDD GREEN): endless run state, the WON intercept and the endless record** — `3b03eb1` (feat)
5. **Task 3: pin the `__DEV__` entry, and drive a real endless run** — `8c2bf5a` (test)

No REFACTOR commits — both GREEN implementations landed in their final shape.

## TDD Gate Compliance

| Task | Gate | Commit | Evidence |
|---|---|---|---|
| 1 | RED | `50355e1` | `npx vitest run tests/ui/PlayingHost.next-bake.test.ts --reporter=tap` exit 1; target test *"loadKey success branch is brick dimensions only — no level id, no brick count (D-14 / SC-5)"* failed on the `brickCount` assertion. `gsd-tools check tdd-red-evidence` → **RED_EVIDENCE_OK** (`target_test_failed`). |
| 1 | GREEN | `b10393d` | Same command exit 0; 5 passed in that file, 9 across it and `bake-gate`. |
| 2 | RED | `890a884` | `npx vitest run tests/ui/PlayingHost.endless-host.test.ts --reporter=tap` exit 1; 8 tests, 1 pass, 7 fail; target test *"the endless WON branch precedes the campaign WON branch and returns early (SC-1)"* failed because the guard did not exist. `gsd-tools check tdd-red-evidence` → **RED_EVIDENCE_OK**. |
| 2 | GREEN | `3b03eb1` | Same command exit 0; 8 passed. |
| 3 | — | `8c2bf5a` | Test-only task (`<files>` after the Task-2 deviation contains no non-test source file), so the behaviour-adding predicate is false and the RED gate does not apply. Committed as `test(11-05)`. |

**RED evidence note (tooling, third plan running):** `check tdd-red-evidence` parses a flat node:test TAP summary. Vitest's TAP reporter nests describes and emits no `# tests / # pass / # fail` lines, so each record's `output` is the vitest leaf `ok` / `not ok` lines renumbered flat with those three counts appended mechanically from the same run. The transcription helper lived in the session scratchpad, never in the repo. Record keys are camelCase (`exitCode`, `targetTest`, `targetFile`) — a snake_case record classifies as `invalid_record`.

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — the whole plan's production surface. New imports: `generate` from the levelgen barrel, `difficultyForWave` / `seedForWave` from the endless barrel, `compileGeneratedLevel` and `ValidationIssue` folded into the existing `loadLevel` import. New host state and refs (exact names, as the plan's output spec asks):

  | Name | Kind | Why |
  |---|---|---|
  | `mode` | `useState<'campaign' \| 'endless'>` | drives the `W{n}` readout; the only render-visible piece |
  | `modeRef` | `useRef` | read from `applyChrome`, `handleRunEnded` and the compiled-push effect, all of which see stale state |
  | `wave` | `useState<number>` | the `W{n}` readout |
  | `waveRef` | `useRef` | the authoritative wave for callbacks and for the record write |
  | `runSeedRef` | `useRef` | minted `Date.now() >>> 0` at run start, app tier (Pitfall 7) |
  | `waveAdvanceInFlightRef` | `useRef` | the Pitfall 5 idempotency guard; declared, set, and cleared — 5 references in the file |
  | `genIssues` | `useState<ValidationIssue[] \| null>` | folds into `levelError` so a failed generated compile reaches the existing overlay |

  New callbacks: `advanceToWave(nextWave): boolean` (generate → compile → `compiledSv` → `waveRef`/`setWave`, or `setGenIssues` + `__DEV__` log + `false`) and `startEndlessRun()` (mint seed → `advanceToWave(1)` → the `remountDevSession` chrome reset → `retry()` → `setActive(true)`). Modified in place: the `loadKey` derivation and its doc comment, the compiled-push effect's endless early return, `handleRunEnded`'s union selection and campaign-follow-up gate (and the now-corrected comment that claimed campaign was the only mode written), `applyChrome`'s endless branch and guard release, and the dev row.
- `tests/ui/PlayingHost.next-bake.test.ts` — `advanceWave` added to the `useGameLoop` mock (the existing defensive comment extended rather than duplicated), `bakeGlowSprites` turned into a counting spy, and three cases: the D-14 source contract plus two regressions.
- `tests/ui/PlayingHost.endless-host.test.ts` (new, node env) — 8 source contracts for Task 2, the first of which is a harness-honesty check so the other seven cannot pass vacuously.
- `tests/ui/PlayingHost.endless.test.ts` (new, node env) — the six contracts Task 3 specified, exactly.
- `tests/ui/PlayingHost.endless-run.test.tsx` (new, jsdom) — 6 behavioural cases driving a real endless run.

## Regex anchors used for region extraction

The plan's output spec asks for these explicitly. All operate on `codeOnly(...)` output (`//` comments stripped):

| Region | Anchor |
|---|---|
| `applyChrome` body | `/const applyChrome = useCallback\(\s*\(mirror: ChromeMirror\) => \{([\s\S]*?)\n {4}\},\n {4}\[/` |
| The endless wave-advance branch | `/if \(\s*modeRef\.current === 'endless'[\s\S]*?SIM\.WON\s*\)\s*\{([\s\S]*?)\n {8}return;/` |
| The in-flight guard release | `/if \(\s*mirror\.phase !== SIM\.WON &&\s*mirror\.phase !== SIM\.LOST\s*\)\s*\{([\s\S]*?)\}/` |
| `handleRunEnded` body | `/const handleRunEnded = useCallback\(([\s\S]*?)\n {4}\[platform, store, levelId\],/` |
| `advanceToWave` body | `/const advanceToWave = useCallback\(([\s\S]*?)\n {4}\[/` |
| The compiled-push effect | `/useEffect\(\(\) => \{\n([\s\S]*?)\n {2}\}, \[loadResult, fxReady, compiledSv, setActive, retry\]\);/` |
| The `__DEV__` dev row | `/const devLevelSwitch =([\s\S]*?)\n {4}\) : null;/` |
| The `loadKey` success branch | ``/const loadKey = loadResult\.ok\s*\?([\s\S]*?)\s*:\s*`err:/`` |

Two of these needed correcting during the run: the wave branch terminates at `\n {8}return;` (the body of a `useCallback` argument sits two levels deeper than an eyeballed guess), and the compiled-push effect's closing brace is at two spaces, not four. Both were harness bugs in the RED tests, fixed without touching a contract.

## Did the wave indicator need a new style?

**No.** `<Text style={styles.devSwitchLabel}>{\`W${wave}\`}</Text>` renders legibly in the dev row on its own — same colour, family, size and line height as the four `Pressable` labels beside it. No entry was added to the `StyleSheet`.

## Decisions Made

- **The in-flight guard release is mode-agnostic.** `if (mirror.phase !== SIM.WON && mirror.phase !== SIM.LOST)` rather than an endless-only condition. Campaign never sets the ref, so an endless-only guard would add a condition a reader has to check for no behavioural difference.
- **`genIssues` folds into `levelError` rather than getting its own overlay.** One error surface for "the board you were about to play is not playable", regardless of whether it came from a catalog require or from `generate`. The alternative would have duplicated `LevelErrorOverlay`'s wiring for a branch that Phase 10's 21 000-board sweep says will essentially never fire.
- **`startEndlessRun` reverts nothing on a failed first compile.** It mints the seed and calls `advanceToWave(1)`; on failure it returns before touching `modeRef`, so the host stays in campaign with the error overlay showing. Setting the mode first and rolling it back would have created a window in which the compiled-push effect's endless guard was live with no generated board behind it.
- **Task 3's `ENTRY_LABEL` contract is the attribute form, not the bare phrase.** `codeOnly` strips `//` comments but not JSDoc, and `startEndlessRun`'s own doc comment opens with the same five words — a bare-phrase count would read 2 for a perfectly correct file. The contract is `accessibilityLabel="Start an endless run"`.
- **The behavioural suite stubs `__DEV__` true.** The entry is `__DEV__`-gated, which is the point; a harness that left `__DEV__` undefined would render no dev row and every case would fail on a missing button rather than on a behaviour.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 3's JSX landed in Task 2's commit**

- **Found during:** Task 2 (GREEN)
- **Issue:** Task 2 creates `wave` state and `startEndlessRun`; Task 3 creates their only consumers (the `Pressable` and the `W{n}` `Text`). With Task 2 committed alone, `npm run lint` printed two `@typescript-eslint/no-unused-vars` warnings — which Task 2's *and* Task 3's acceptance criteria both explicitly forbid ("`npm run lint` prints no `warning` and no `error` lines"). There is no ordering of the two tasks as written that leaves both commits lint-clean.
- **Fix:** The dev-row entry, the `W{n}` readout and the D-05 "Phase 14 deletes this" comment moved into Task 2's GREEN commit, verbatim as Task 3 specified them. Task 3 kept its own source-contract file, unchanged in scope and count.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** `npm run lint` 0 errors / 0 warnings at every commit from `b10393d` onward; the Task 3 region gate (`sed -n '/const devLevelSwitch =/,/) : null;/p' | grep -c "typeof __DEV__ !== 'undefined' && __DEV__"` → `1`, and the same region contains both the entry label and the readout) passes.
- **Commit:** `3b03eb1`

---

**2. [Rule 2 - Missing critical] Task 2 had no test file, so the TDD RED gate had nowhere to land**

- **Found during:** Task 2 (RED)
- **Issue:** Task 2 is `tdd="true"`, carries a six-item `<behavior>` block and modifies a non-test source file — the behaviour-adding predicate is true, so the RED gate applies. But its `<files>` lists only `app/_components/PlayingHost.tsx`. Written as specified, the largest task in the plan would have shipped with all of its evidence deferred into Task 3, and there would have been no failing target test to authorize GREEN.
- **Fix:** Created `tests/ui/PlayingHost.endless-host.test.ts` — 7 source contracts over Task 2's own behaviours (branch ordering, the in-flight guard, the union arm, the campaign-follow-up skip, the compile-failure path, the compiled-push guard, the app-tier seed and the layer boundaries), plus a harness-honesty case. Deliberately disjoint from Task 3's six, so `PlayingHost.endless.test.ts` stayed at exactly the specified count.
- **Files modified:** `tests/ui/PlayingHost.endless-host.test.ts` (new)
- **Verification:** RED at `890a884` (exit 1, target test failed, `RED_EVIDENCE_OK`); 8 passing at `3b03eb1`.
- **Commit:** `890a884`

---

**3. [Rule 2 - Missing critical] SC-1 was pinned only by absence**

- **Found during:** Task 3
- **Issue:** Every contract the plan specified for the phase's load-bearing truth — "clearing a board in endless generates and swaps in the next one instead of ending the run" — is a grep for something *not* being present in a source region. A regex that stops matching for an unrelated formatting reason makes all of those pass silently, and none of them would notice if `advanceWave()` swapped in the previous board, if the wave counter skipped, or if `recordRunEnd` fired on a win.
- **Fix:** Added `tests/ui/PlayingHost.endless-run.test.tsx` — the real host, the real `generate`, the real `compileGeneratedLevel`, the real `useAnimatedReaction` bridge; press the entry and deliver mirrors. 6 cases covering run start, the wave swap, double-delivery idempotency, guard release, the endless record write, and per-run seed freshness.
- **Files modified:** `tests/ui/PlayingHost.endless-run.test.tsx` (new)
- **Verification:** 6 passing; `npx vitest run tests/ui/` 52 passing, 0 failed.
- **Commit:** `8c2bf5a`

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 missing critical).
**Impact on plan:** No scope change to the product. One task boundary moved (Task 3's ~20 lines of JSX into Task 2's commit, forced by the shared lint gate) and two test files were added beyond the plan's file list, both to close gaps the plan's own criteria left open. Every acceptance criterion in all three tasks passes as written, with the single documented exception that Task 3's host edit was already present when Task 3 began.

## Authentication Gates

None.

## Issues Encountered

- **Vitest's TAP is still not readable by `check tdd-red-evidence`.** Third plan in a row; see the note under TDD Gate Compliance. Worth a tooling fix outside this phase.
- **`@testing-library/react` double-invokes mount effects in this setup.** The bake count on mount is 2, not 1, with no `StrictMode` in `vitest.config.ts` or the render call. The Task 1 regression tests were written against *relative* counts (mount count vs. post-switch count) rather than pinning the React-dev artifact at a literal.
- **`level-01` and `level-03` do not share brick dimensions** (44×18 vs 32×14), so the "same key, still re-bakes" case originally drafted for Task 1 was factually wrong. It became the stronger and true assertion: the re-bake produces a *different* atlas, which is D-14's semantics stated directly.
- **Pre-existing working-tree churn.** `.planning/config.json` modified and `.planning/milestone.lock` / `.planning/state.json` untracked before this plan started (orchestrator-owned). `git status --porcelain` is clean for everything this plan touched.

## Known Stubs

None. No `TODO`, `FIXME` or placeholder text was introduced. The `__DEV__` endless entry is *temporary by decision* (D-05), not a stub: it is fully wired, fully tested, and carries a source comment naming its Phase 14 deletion.

## Threat Flags

None. Every register entry this plan owns (T-11-14 glow-bake DoS, T-11-15 `__DEV__` entry in a release build, T-11-16 an invalid generated board, T-11-17 double-recorded wave, T-11-18 endless writing campaign state) is mitigated and pinned; see the coverage block above. No new network endpoint, auth path, file access or schema change at a trust boundary was introduced.

## Verification

| Check | Result |
|---|---|
| `npm test` (vitest + 4 assert scripts) | exit **0** |
| `npx vitest run` | **95 files / 558 tests passed**, 0 failed (baseline 92 / 535) |
| `npx vitest run tests/ui/` | 14 files / **52 tests passed**, 0 failed |
| `npm run lint` | **0 errors, 0 warnings** — incl. `boundaries/dependencies` and the LC-07 `no-restricted-syntax` rule scoped to this file |
| `npm run typecheck` | exit **0** |
| `node scripts/assert-worklet-closures.mjs` | OK (121 files) |
| `git diff --name-only dcfdd37..HEAD -- src/core src/levelgen` | empty |
| `git diff --name-only dcfdd37..HEAD -- src/runtime/GameScreen.tsx` | empty |
| `grep -cE "from '\.\./\.\./src/core'" app/_components/PlayingHost.tsx` | `0` |
| `grep -c "from '../../src/levelgen'"` / `"from '../../src/services/endless'"` | `1` / `1` |
| `grep -c 'waveAdvanceInFlightRef' app/_components/PlayingHost.tsx` | `5` (≥ 3 required) |
| Ordering gate: endless WON guard vs campaign WON branch | line **779** < line **793** |
| `sed -n '/const loadKey = loadResult.ok/,/^    : /p' \| grep -c 'brickCount'` | `0` |
| `sed -n '/const loadKey = loadResult.ok/,/^    : /p' \| grep -c 'compiled.w\[0\]'` | `1` |
| Dev-row region gate (`grep -c` full `__DEV__` guard) | `1`, and the region holds both the entry label and the `W{n}` readout |
| `git status --porcelain` | clean for every file this plan touched |

## Outstanding for plan 11-06

**The device SC-5 reading is still open.** Everything above proves the bake/preload cold path is not *entered* at a wave transition — that is a structural argument plus a jsdom observation, and it is the part that was actually at risk. What no test here measures is a frame on hardware: the 0.56 ms Hermes-scaled cost of `generate` + `compileGeneratedLevel` remains a Node measurement scaled by a factor, and no gfxinfo or Instruments capture of an endless wave boundary exists. Plan 11-06 owns that reading, and `docs/ops/ENDLESS-MODE.md` should record the production placement of the wave indicator as a Phase 14 decision (D-13).

## Next

Ready for `11-06` — the `docs/ops/ENDLESS-MODE.md` ops document and the device SC-5 reading.

## Self-Check: PASSED

All three created test files and both modified files exist on disk; all five task commits (`50355e1`, `b10393d`, `890a884`, `3b03eb1`, `8c2bf5a`) are present in `git log --all`. Plan-level `<verification>` re-run in full at the table above: `npm test` exit 0, lint 0/0, typecheck 0, `tests/ui/` 52 passing, both freeze diffs empty.
