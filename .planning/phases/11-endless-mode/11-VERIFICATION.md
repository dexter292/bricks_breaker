---
phase: 11-endless-mode
verified: 2026-09-25T15:48:00Z
status: gaps_found
score: 3/6 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/phases/11-endless-mode/11-01-PLAN.md"
  - ".planning/phases/11-endless-mode/11-01-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-02-PLAN.md"
  - ".planning/phases/11-endless-mode/11-02-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-03-PLAN.md"
  - ".planning/phases/11-endless-mode/11-03-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-04-PLAN.md"
  - ".planning/phases/11-endless-mode/11-04-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-05-PLAN.md"
  - ".planning/phases/11-endless-mode/11-05-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-06-PLAN.md"
  - ".planning/phases/11-endless-mode/11-06-SUMMARY.md"
  - "app/_components/PlayingHost.tsx"
  - "docs/ops/BOARD-GENERATOR.md"
  - "docs/ops/ENDLESS-MODE.md"
  - "src/runtime/loadLevel.ts"
  - "src/runtime/useGameLoop.ts"
  - "src/runtime/worldRequests.ts"
  - "src/services/endless/index.ts"
  - "src/services/endless/ramp.ts"
  - "src/services/storage/asyncStorageStore.ts"
  - "src/services/storage/index.ts"
  - "src/services/storage/memoryStore.ts"
  - "src/services/storage/parseBlob.ts"
  - "src/services/storage/telemetry.ts"
  - "src/services/storage/types.ts"
covered_digest: "v1:sha256:228d74f056e6f69867a3f4410b61f7bdc5d871971030729350a0b8b3ca10d5da"
behavior_unverified: 1
overrides_applied: 0
gaps:
  - truth: "The endless record is a record worth chasing — telemetry.endless.bestWave reflects a wave some single run actually reached (phase goal / N-END-02)"
    status: failed
    reason: >-
      Verified independently against source, not taken from the review. `onRetry` is
      reachable from the endless lose overlay and resets lives/score without resetting
      the run's wave, seed or mode, so `bestWave` climbs one wave per Retry with lives
      refilled and waves 1..N never replayed. The inflated number is persisted to
      AsyncStorage through `mergeEndlessRecord` -> `persist(memory)`, so the corruption
      is durable. `remountDevSession` has the identical omission and additionally drops
      the in-flight run without recording it.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          `onRetry` (895-920): guard `!levelReady || levelError != null || !fxReady` is
          satisfied during an endless run because all three derive from the campaign
          `loadResult` that is still loaded behind the run (323-324). The body resets
          `runEndedRef`, lives, score, combo and calls `retry()`, which reaches
          `applyRetryWorldReset(w, compiled.value)` (useGameLoop.ts:413-416) against the
          generated board in `compiledSv` and sets `world.lives = 3` (src/core/reset.ts:44).
          It never touches `waveRef` (228), `runSeedRef` (230), `modeRef`/`setMode` (225-226)
          or `waveAdvanceInFlightRef` (232) — the only site that sets those is
          `startEndlessRun` (1048-1072).
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          `remountDevSession` (1014-1038): same omission, and it never calls
          `handleRunEnded`, so an in-flight endless run is silently discarded while
          `waveRef` carries into the next loss.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          Secondary symptom of the same root cause: `waveAdvanceInFlightRef` is not
          cleared by either reset, so a Retry that follows a failed `advanceToWave`
          leaves the guard latched `true` (779-787) and the next WON is swallowed —
          an SC-1 break, reachable only after a generated-board compile failure.
    missing:
      - "Make the run-boundary resets mode-aware: an endless Retry is a NEW run — route `onRetry` to `startEndlessRun()` when `modeRef.current === 'endless'`"
      - "Apply the same routing to `remountDevSession`, and record the in-flight run as `abandoned` before restarting so the run is not silently dropped"
      - "If resuming at wave N is ever wanted instead, it must not feed `recordRunEnd` — carry a `runStartWaveRef` and record `wave - (runStartWave - 1)`, or refuse to raise `bestWave` from a resumed run"
      - "A test that drives Retry from the endless lose overlay and asserts wave returns to 1 and the seed is re-minted — no current test exercises Retry in endless at all"
  - truth: "Endless records are stored separately from campaign progress; playing endless cannot unlock, lock, or alter a campaign level's best or stars (SC-3 / N-END-02)"
    status: partial
    reason: >-
      The persistence-layer firewall is verified and genuinely structural — the storage
      half of this criterion holds. The UI half does not: `handleRunEnded` computes and
      writes the campaign per-level personal best for an endless run, so an endless run
      alters a campaign level's best as the player sees it for the rest of the mount.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          `handleRunEnded` (597-645) calls `evaluatePersonalBest(runScore, previousBestRef.current)`
          BEFORE branching on mode. `previousBestRef` is loaded from
          `store.getBestForLevel(levelId)` (385-402) — a campaign level best. For an
          endless run this (a) shows the campaign level's PB as "BEST" on the endless
          Results overlay, (b) fires "NEW RECORD" when an endless score beats an
          unrelated campaign score, and (c) at 638-640 writes the endless score into
          `previousBestRef.current`, which `onRetry` (906) and `remountDevSession` (1024)
          then re-display as the campaign best.
      - path: "app/_components/PlayingHost.tsx"
        issue: >-
          `telemetry.endless` has no reader anywhere in `app/` or `src/` (grepped:
          stores and tests only), so the record the endless player just set is the one
          number never shown to them. Display placement is legitimately Phase 14's
          (ENDLESS-MODE.md § Limits item 4); showing the WRONG number today is not.
    missing:
      - "A separate endless watermark ref seeded from `getSnapshot().telemetry.endless.bestScore`, selected before the `evaluatePersonalBest` call"
      - "Branch the write-back at 638-640 on mode so `previousBestRef` is never poisoned by an endless run"
deferred:
  - truth: "A player can start an endless run from a production entry point"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 success criterion 1: 'Title offers campaign, endless and daily as distinct
      entries'. The `__DEV__`-only entry is the sanctioned Phase 11 scope (11-05 D-05; the
      Pressable at PlayingHost.tsx:1234-1242 carries a comment saying Phase 14 deletes it),
      and ENDLESS-MODE.md § Limits item 4 records the same. Not a Phase 11 gap.
behavior_unverified_items:
  - truth: "Wave transitions do not stall the loop: the next board is ready without a frame spike that breaks the Mid budget (SC-5 / N-END-03)"
    test: >-
      Launch a dev build; arm the perf overlay; press the `Endless` button in the
      `__DEV__` dev row on the playing HUD; play waves 1 through 5; watch each
      transition specifically — the moment the last brick of a board breaks and the
      next board appears. Do not press `Lv`, `Cert WC` or the tier button during the
      reading (see WR-02 below — those paths are broken after endless is entered).
    expected: >-
      No visible black playfield at a transition; no audio hiccup; no
      `[audio] preload soft-fail` line in the log mid-run; frame times stay inside
      the Mid budget across each transition (p50 <= 16.7 ms, p95 <= 20 ms).
    why_human: >-
      No automated step in this repo can produce a frame on hardware. Everything proven
      so far shows only that the bake/audio-preload COLD PATH IS NOT ENTERED at a
      transition — a source-level argument plus a jsdom observation. The 0.56 ms
      generate+compile figure is a Node microbenchmark scaled by a 15.5x Hermes ratio
      that itself came from a simulator, not a device.
---

# Phase 11: Endless Mode Verification Report

**Phase Goal:** A player can start a run that keeps producing boards until they lose, with a record worth chasing
**Verified:** 2026-09-25T15:48:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

The phase built the machinery and built it well. The wave policy, the board-swap seam,
the determinism argument and the storage firewall are all real, and I confirmed each by
reading the source rather than the summaries. What does not hold is the second half of
the goal sentence. "A record worth chasing" requires that the record mean something, and
`telemetry.endless.bestWave` can be inflated indefinitely by pressing Retry — durably,
into AsyncStorage. The defect is not in the endless machinery; it is in the two
pre-existing run-boundary resets that were never made mode-aware.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC-1 — Clearing a board advances to the next generated one within the same run; lives, score and combo carry over; the run ends only when lives reach zero | ✓ VERIFIED | `applyWaveAdvance` (`src/runtime/worldRequests.ts:61-96`) touches none of `lives`, `score`, `combo`, `rngGameplay`, `rngCosmetic`; it clears the effect SoA (64-69) above `world.tick = 0` (94), which is the ordering the absolute-tick consumers in `src/core/rules/effects.ts` require. Host intercept at `PlayingHost.tsx:779-787` precedes the campaign WON branch and returns early, so `handleRunEnded`/`setActive(false)` are unreachable on an endless win. Behaviorally exercised, not just present: `tests/endless.wave-loop.test.ts` drives a real `World` through the real core across multiple waves with a bot and asserts carry-over, "never ends on a cleared wave", and "LOST is the only terminating phase"; `tests/runtime.wave-advance.test.ts` pins every carried and cleared field including the effect-vs-tick ordering. All pass. |
| 2 | SC-2 — Difficulty rises with wave number through the generator's difficulty input, with the ramp written down rather than tuned by feel in code | ✓ VERIFIED | `difficultyForWave` (`src/services/endless/ramp.ts:57-66`) steps one per wave from 0 and clamps at `D_MAX`, which is imported from the `src/levelgen` barrel rather than restated. The ramp is written down as a prose table in `docs/ops/ENDLESS-MODE.md:26-45` with the clamp rationale (D-01) beside it. `tests/endless.ramp.test.ts` proves the walk, the clamp out to wave 10 000, and that degenerate input stays in range. |
| 3 | SC-3 — Endless records stored separately from campaign progress; playing endless cannot unlock, lock, or alter a campaign level's best or stars | ✗ FAILED (partial) | Storage half VERIFIED and structural: `RecordRunEndArgs` is a discriminated union whose endless arm has no `levelId`, so the campaign write is unreachable, not merely skipped (`memoryStore.ts:95-135`, `asyncStorageStore.ts:376-424`); `sanitizeTelemetry` (`parseBlob.ts:415-446`) degrades a corrupt `telemetry.endless` alone; `tests/storage.endless-firewall.test.ts` proves byte-identity of `unlocked`/`bestByLevel`/`bestScore` across an endless win for BOTH stores. UI half FAILS: `handleRunEnded` (597-645) reads and then overwrites the campaign per-level PB for an endless run. See gap 2. |
| 4 | SC-4 — A seeded endless run is reproducible end to end; the same seed and inputs replay to the same wave | ✓ VERIFIED | `tests/endless.determinism.test.ts` replays two 12-wave runs at seed 777 and asserts identical `hashWorld` both before and after every swap, identical final score/lives/wave, field-by-field world identity, and divergence at wave 1 for seed 778 — with an explicit non-vacuity guard that the reference run actually scored. `applyWaveAdvance` leaves both RNG streams untouched (asserted separately at boundaries). The SC text itself says "the same seed **and inputs**", and the headless fixed-input policy is exactly that scope; `docs/ops/ENDLESS-MODE.md` § Limits item 1 states the device limitation in writing rather than overclaiming. |
| 5 | SC-5 — Wave transitions do not stall the loop: the next board is ready without a frame spike that breaks the Mid budget | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Structural half holds and I confirmed it: the wave block sits above the `simFrozen` computation in the frame callback (`useGameLoop.ts:449-467`) so substepping resumes on the same frame with no `setActive` call anywhere in a transition; `loadKey` is brick dimensions only (`PlayingHost.tsx:344-346`) and `levelId` never changes during an endless run, so the bake/preload cold path is not re-entered. Device frame reading NOT TAKEN — routed to human verification. |
| 6 | Phase goal — the endless record is worth chasing: `telemetry.endless.bestWave` reflects a wave some single run actually reached | ✗ FAILED | Retry from the endless lose overlay resumes on the wave-N board with three fresh lives and no reset of wave/seed/mode, so the persisted `bestWave` climbs one per Retry. Chain verified end to end in source — see gap 1. |

**Score:** 3/6 truths verified (1 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | A production entry point into endless | Phase 14 | Phase 14 SC-1: "Title offers campaign, endless and daily as distinct entries". The `__DEV__`-only entry is sanctioned Phase 11 scope (D-05), the Pressable carries a comment saying Phase 14 deletes it, and ENDLESS-MODE.md § Limits item 4 records the same. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/services/endless/ramp.ts` | Wave→difficulty ramp + per-wave seed | ✓ VERIFIED | 75 lines, two pure functions, `D_MAX` imported not restated, no approximated `Math`. Imported by `PlayingHost.tsx:743-744`. |
| `src/services/endless/index.ts` | Policy barrel | ✓ VERIFIED | Sole export surface; `PlayingHost` imports through it, no deep import (LC-16 holds). |
| `src/runtime/worldRequests.ts` | `applyWaveAdvance` board-swap seam | ✓ VERIFIED | Mode-agnostic `(World, CompiledLevel \| null)`; effect clear above `tick = 0`; consumed by `useGameLoop.ts:460`. |
| `src/runtime/useGameLoop.ts` | Wave request/apply pair + cumulative tick bank | ✓ VERIFIED | `waveRequest`/`waveApplied` block at 456-467 banks `w.tick` before the advance and deliberately does NOT zero the per-run counters; the retry block at 413-437 does zero `ticksBanked`. Both read directly. |
| `src/runtime/loadLevel.ts` | `compileGeneratedLevel` | ✓ VERIFIED | Lives in the runtime tier so `app/` never imports `src/core` (LC-04/LC-02 hold). |
| `src/services/storage/*` | Endless record + both-store firewall | ✓ VERIFIED | `EndlessRecord` inside `TelemetryBlob`, running maxima taken independently, both stores gated, parse sanitizer isolates the sub-object. |
| `docs/ops/ENDLESS-MODE.md` | Ramp table, tick decision, SC-4 scoping, SC-5 open assumption | ✓ VERIFIED | 327 new lines. Ramp table at 26-45; `world.tick` decision with its measurement at 83-134; SC-4 scoping at Limits item 1; SC-5 OPEN block with failure signatures and discharge procedure at Limits item 2. |
| `docs/ops/BOARD-GENERATOR.md` | § Limits item 2 amended in place | ✓ VERIFIED | Original paragraph preserved verbatim under a dated SUPERSEDED marker; correction carries the 500-seed measurement; the first paragraph ("No human play calibrated the dial constants") survives untouched, as the plan's key link required. |
| Test suites (10 files, 99 tests) | Wave loop, ramp, determinism, firewall, host | ⚠️ PARTIAL | All pass, and the determinism and multi-wave suites are substantive and non-vacuous. But `tests/ui/PlayingHost.endless-run.test.tsx:165` replaces `useGameLoop` wholesale and no test drives Retry, level-switch or the compile-failure path in endless — which is exactly where every remaining defect lives. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `applyWaveAdvance` effect clear | `world.tick = 0` | Statement ordering | ✓ WIRED | Clear at `worldRequests.ts:64-69`, assignment at 94. `effectUntilTick` is absolute; reversing these would make a live expand permanent. Pinned by a dedicated test. |
| `PlayingHost.advanceToWave` | `compiledSv` then `advanceWave()` | Shared-value write ordering | ✓ WIRED | `compiledSv.value = compiled.compiled` at 758, `advanceWave()` at 783 — both issued from the same JS-thread callback, so the UI runtime observes them in order. |
| `seedForWave` | `src/levelgen` barrel | `import { D_MAX, hashSeed, mixSeed } from '../../levelgen'` | ✓ WIRED | Barrel import, no deep path. |
| `handleRunEnded` endless arm | `store.recordRunEnd` → `mergeEndlessRecord` → persist | Discriminated union | ✓ WIRED | Reaches AsyncStorage. Wired correctly — which is precisely why gap 1 is durable rather than cosmetic. |
| Endless WON branch | ahead of campaign WON branch | Early return | ✓ WIRED | 779-787 precedes 793; verified by reading, not only by the source-contract test. |
| Compiled-push gate effect | suppressed during endless | `modeRef.current` read | ⚠️ PARTIAL | Suppression works (560-562), but `modeRef` is never set back to `'campaign'` — see WR-02. The gate effect is permanently dead after the first endless entry. |
| `bakeGlowSprites` dimensions | the board actually drawn | `loadResult.compiled.w[0]/h[0]` | ✗ HOLLOW | The bake reads the CAMPAIGN level's brick size, never the generated board's — see WR-01. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `PlayingHost` wave HUD | `wave` | `setWave(nextWave)` in `advanceToWave` (761) | Yes | ✓ FLOWING |
| `PlayingHost` endless board | `compiledSv.value` | `compileGeneratedLevel(generate(seedForWave(...), difficultyForWave(...)))` (741-758) | Yes | ✓ FLOWING |
| `useGameLoop` `ticksPlayed` | `ticksBanked.value + w.tick` (503) | Live world tick + per-wave bank | Yes | ✓ FLOWING |
| Endless Results "BEST" | `resultBest` | `previousBestRef` = `store.getBestForLevel(levelId)` — a CAMPAIGN best | No — wrong source for the mode | ✗ DISCONNECTED (WR-03) |
| Endless record display | `telemetry.endless` | nothing reads it in `app/` or `src/` | No consumer at all | ⚠️ STATIC (write-only; display is Phase 14 scope) |
| Glow atlas sprite size | `brickW`/`brickH` at bake (480-490) | `loadResult.compiled` — the campaign level, not the generated board | No | ✗ DISCONNECTED (WR-01) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 11 suites pass | `npx vitest run` on the 10 phase test files | 10 files / 99 tests passed | ✓ PASS |
| Whole workspace green | `npx vitest run` (once) | 95 files / 558 tests passed, 9.6 s | ✓ PASS |
| Types clean | `npx tsc --noEmit` | exit 0, no output | ✓ PASS |
| Lint clean | `npx eslint .` | no output, 0 problems | ✓ PASS |
| `src/core` / `src/levelgen` freeze held | `git diff b99607b..HEAD -- src/core src/levelgen \| wc -l` | 0 | ✓ PASS |
| Generated lattice vs level-01 brick size | `grep GRID src/levelgen/grid.ts` / `grep brickW assets/levels/level-01.json` | 32x14 vs 44x18 | ✗ FAIL — confirms WR-01 |
| Endless Retry restarts the run | no such test exists; no runnable device path | — | ? SKIP — root cause of gap 1 going unnoticed |
| Wave-transition frame time on device | not runnable in this repo | — | ? SKIP — routed to human verification |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist in this repo and neither the plans nor the summaries
declare a probe. Step 7c: SKIPPED (no probes declared or discoverable).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| N-END-01 | 11-01, 11-03, 11-04, 11-05, 11-06 | Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives | ✓ SATISFIED | Truth 1. Every clause holds at the sim layer with real behavioral tests and at the host layer with the WON intercept. |
| N-END-02 | 11-02, 11-05, 11-06 | Endless records stored separately — endless play cannot alter campaign unlocks, bests or stars | ✗ BLOCKED | Separation is real and structural (truth 3, storage half). But the record itself is corruptible (gap 1) and the UI reads/writes the campaign PB for an endless run (gap 2). The `[x]` on line 178 of REQUIREMENTS.md should be reverted until gap 1 is closed. |
| N-END-03 | 11-01, 11-03, 11-04, 11-05, 11-06 | A seeded endless run is reproducible end to end; wave transitions cause no frame spike outside the Mid budget | ⚠️ NEEDS HUMAN | Reproducibility half SATISFIED (truth 4). Frame-budget half UNMEASURED and correctly disclosed — see the disclosure assessment below. |

No orphaned requirements: REQUIREMENTS.md maps exactly N-END-01/02/03 to this phase and
all three appear in plan frontmatter.

#### Assessment of the SC-5 disclosure (asked for explicitly)

The disclosure is **adequate and correctly placed**, and I am not treating the checked box
as satisfaction. Three things make it adequate rather than a fig leaf:

1. It is at the point of claim. The caveat is a sub-bullet directly under N-END-03 in
   REQUIREMENTS.md, so a reader scanning the requirement cannot reach the `[x]` without
   reaching the caveat. It says which half is unproven, not just "partially verified".
2. It is falsifiable, not hedged. The OPEN block in `docs/ops/ENDLESS-MODE.md` § Limits
   item 2 names the budget (p50 <= 16.7 ms, p95 <= 20 ms), names four concrete failure
   signatures, and states that any of them is "a gap-closure signal — a code fix, not a
   documentation edit". It also explicitly refuses a fabricated pass ("Do not write a
   passing reading that was not taken") and admits the 15.5x Hermes ratio came from a
   simulator.
3. It is tracked where work gets picked up: `.planning/STATE.md` § Pending Todos line 209,
   in the same idiom Phase 10's A1 used and which was actually discharged that way.

One correction to the record: the discharge procedure tells the reader to press `Endless`
in the dev row, and WR-02 below means that the same dev row's `Lv` and tier buttons leave
the loop permanently stopped once endless has been entered. The procedure should carry a
"do not press these during the reading" note, or WR-02 should be fixed first, or the
reading risks being confounded by a different defect.

The `[x]` on N-END-03 itself is defensible only because the caveat is inseparable from it.
The `[x]` on **N-END-02** is not — gap 1 makes the endless record wrong, and nothing
discloses that. It should be unchecked.

### Anti-Patterns Found

No `TBD`, `FIXME`, `XXX`, `HACK` or `PLACEHOLDER` markers exist in any file this phase
modified. The debt-marker gate passes cleanly.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/_components/PlayingHost.tsx` | 895-920, 1014-1038 | Run-boundary reset is not mode-aware | 🛑 Blocker | Durably inflates `telemetry.endless.bestWave`. Gap 1. |
| `app/_components/PlayingHost.tsx` | 597-645 | Cross-mode read/write of the campaign PB | 🛑 Blocker | Endless Results shows and then poisons the campaign best. Gap 2. |
| `app/_components/PlayingHost.tsx` | 344-346, 480-490 | Atlas baked from the campaign level while the generated board is drawn (WR-01) | ⚠️ Warning | Confirmed: `GRID` is 32x14 (`src/levelgen/grid.ts:32-41`), level-01 is 44x18. Every endless brick entered from level-01 draws a 52x26 halo squashed into 40x22 — a non-uniform 0.77x/0.85x stretch on every brick of every wave. Does NOT break SC-5 (the bake still fires once per run, which is the SC-5 property), but it is a visible fidelity regression on the only path endless is reachable from. |
| `app/_components/PlayingHost.tsx` | 552-579, 1061-1062 | `modeRef` latches to `endless` for the mount lifetime (WR-02) | ⚠️ Warning | Confirmed: line 1061 is the only writer and it only ever writes `'endless'`. The compiled-push gate effect early-returns forever after, so `toggleDevLevel` and `runCertWorstCase` bake, flip `fxReady`, and then never reach `setActive(true)` — a permanently stopped frame loop behind a live HUD, the R-24 failure mode the surrounding comments warn about. Both triggers are `__DEV__`-gated, but the dev row is the only way to reach endless at all, and it is where the SC-5 device reading will be taken. |
| `app/_components/PlayingHost.tsx` | 740-766, 779-787 | Compile-failure path is loud but not terminal (WR-04) | ⚠️ Warning | Confirmed: on `advanceToWave` returning false, `applyChrome` returns without `handleRunEnded` or `setActive(false)`, and nothing else can stop the loop because of WR-02. The frame callback keeps running on a frozen `WON` world, `keepAwake` stays mounted, and `levelError != null` makes both `onResume` (879) and `onRetry` (896) return immediately — a modal with two dead buttons in front of a live sim. Requires a generator compile failure to reach, hence Warning. |
| `src/services/endless/ramp.ts` | 57-66 | `(wave \| 0) - 1` wraps at 2^31 (IN-01) | ℹ️ Info | `difficultyForWave(2147483648)` returns 0, contradicting the "folds to the nearest end" claim in both the doc block and ENDLESS-MODE.md. Unreachable in play. |
| `tests/storage.progress-v4.test.ts` | 1-16 | Stale header claims every case is `it.todo` (IN-02) | ℹ️ Info | Zero `it.todo` remain; a reader trusting the header would skip a live suite. |
| `src/services/storage/index.ts` | 29 | `ENDLESS_TELEMETRY_KEY` re-export has no non-test consumer (IN-03) | ℹ️ Info | Harmless; noted alongside the fact that `telemetry.endless` is write-only across the whole codebase today. |

### Human Verification Required

#### 1. SC-5 device frame reading (endless wave transition)

**Test:** Launch a dev build; arm the perf overlay; press the `Endless` button in the
`__DEV__` dev row on the playing HUD; play waves 1 through 5; watch each transition
specifically — the moment the last brick of a board breaks and the next board appears.
Do not press `Lv`, the tier button, or `Cert WC` during the reading (WR-02 leaves the
loop stopped after any of those once endless has been entered).
**Expected:** No visible black playfield at a transition; no audio hiccup; no
`[audio] preload soft-fail` in the log mid-run; frame times inside the Mid budget across
each transition (p50 <= 16.7 ms, p95 <= 20 ms).
**Why human:** No automated step in this repo can produce a frame on hardware. The proof
so far is that the bake/preload cold path is not *entered* — a source-level argument plus
a jsdom observation — and the 0.56 ms generate+compile figure is a Node microbenchmark
scaled by a simulator-derived Hermes ratio. "No device available" is a valid outcome:
leave the OPEN block in `docs/ops/ENDLESS-MODE.md` § Limits item 2 as it stands.

#### 2. Decision requested — is WR-01 in scope for gap closure?

**Test:** Owner decision, not a device test. WR-01 (endless renders stretched glow halos,
confirmed by measurement above) does not break any of the five success criteria, but it is
a visible fidelity regression on the only path endless can be reached from, and it will be
present during the SC-5 device reading above.
**Expected:** Either fold the `ENDLESS_BRICK_DIMS` fix into the gap-closure round, or
record it as accepted debt with a pointer to Phase 14.
**Why human:** Scope judgement about visual quality against an unstated bar — not
derivable from the roadmap.

### Gaps Summary

Two gaps, one root cause each, both in `app/_components/PlayingHost.tsx`. Neither is in the
endless machinery the phase set out to build.

**Gap 1 — the run boundary is not mode-aware.** `onRetry` and `remountDevSession` were
written for campaign, where "reset the world and the counters" *is* a new run. In endless a
run additionally owns a seed, a wave number and a mode, and neither reset touches any of
them. The consequence is not a cosmetic one: the guard on `onRetry` is satisfied during an
endless run because it interrogates the campaign level still loaded behind the run, the
reset refills lives against the wave-N generated board sitting in `compiledSv`, and the
next loss records wave N+1 through a path that reaches AsyncStorage. `bestWave` therefore
measures "deepest wave reached across a chain of free resumes", which no single run
produced. The phase goal's own words are "a record worth chasing"; a record that rewards
tapping Retry is not one. The same omission silently discards an in-flight run on a DEV
tier change.

**Gap 2 — the mode firewall stops at the storage layer.** The persistence half of SC-3 is
some of the strongest work in the phase: the discriminated union makes the campaign write
unreachable rather than merely skipped, and `tsc` is the gate that says so. But
`handleRunEnded` compares and writes the campaign per-level best *before* it branches on
mode, so an endless run displays a campaign PB as its BEST, can fire NEW RECORD against an
unrelated number, and leaves the campaign best poisoned in memory for the rest of the
mount. Nothing persists, so SC-3's narrowest reading survives; the criterion's plain
meaning does not.

Both gaps share a diagnosis worth stating for the closure plan: **the test suite cannot see
either of them.** `tests/ui/PlayingHost.endless-run.test.tsx` mocks `useGameLoop` wholesale
and drives only the happy path — entry, WON, double-WON, guard release, zero lives. Retry,
the level switch and the compile failure are untested in endless, and those three paths
contain every defect found here. A green 558-test suite is not evidence about them, and the
closure round should add coverage for the Retry path specifically rather than only fixing
the branch.

Three warnings sit behind the gaps and share the same soil (WR-01 wrong bake source,
WR-02 permanent mode latch, WR-04 non-terminal failure path). None breaks a success
criterion on its own. WR-02 deserves attention before the SC-5 device reading is taken,
because it degrades the exact dev harness that reading runs in.

What is genuinely done, and done well: the ramp and its written record, the mode-agnostic
board-swap seam with its load-bearing effect-clear ordering, the cumulative tick bank, the
determinism suite, the both-store firewall, and an ops document whose Limits section is
more honest than most verification reports. The `src/core` / `src/levelgen` freeze held
exactly — zero diff lines.

---

_Verified: 2026-09-25T15:48:00Z_
_Verifier: Claude (gsd-verifier)_
