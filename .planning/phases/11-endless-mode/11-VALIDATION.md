---
phase: 11
slug: endless-mode
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-25
plans_mapped: 2026-09-25
---

# Phase 11 — Validation Strategy

> Source: `11-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.1 (`environment: 'node'`) |
| **Config file** | `vitest.config.ts` — new files in `tests/` match the existing glob, no config change |
| **Quick run command** | `npx vitest run tests/endless.*.test.ts tests/runtime.wave-advance.test.ts` |
| **Full suite command** | `npm test` (vitest + the four assert scripts) |
| **Baseline to preserve** | **87 files / 486 tests, 0 todo**; `npm run lint` **0 warnings repo-wide**; `npm run typecheck` exit 0 |

**Operational note the planner must inherit:** Vitest suppresses `console.log` under this
repo's reporter config — plans 10-02, 10-03 and 10-04 each hit it. Any measurement output must
be written with `node:fs` to the scratchpad, and any throwaway measurement test must be
deleted before the plan's verification block runs `git status --porcelain`.

---

## Sampling Rate

- **After every task commit:** vitest on the touched file(s), plus `npm run lint` and
  `npm run typecheck`. The repo baseline is 0 warnings — 10-04 treated introducing one as a
  regression, and so should this phase.
- **After every wave:** `npm test` — the full chain. `assert-worklet-closures.mjs` is the gate
  that would catch a `SimPhase.DOCKED` module reference inside a new worklet.
- **Phase gate:** `npm test` green, `git status --porcelain` empty,
  `git diff --name-only <phase-base>..HEAD -- src/core src/levelgen` empty, plus the device
  SC-5 reading recorded in `docs/ops/ENDLESS-MODE.md`.

---

## Per-Task Verification Map

| Req / SC | Behavior | Test Type | Automated Command | File Exists |
|---|---|---|---|---|
| SC-1 / N-END-01 | Clearing a board advances to the next; lives, score, combo carry | integration | `npx vitest run tests/endless.wave-loop.test.ts` | ❌ W0 |
| SC-1 | The run ends **only** at zero lives — a cleared board never ends an endless run | integration | same file | ❌ W0 |
| SC-1 / D-04 | No wave boundary grants a life (load-bearing); `MAX_LIVES` holds in a run that actually gains one (exercised, not assumed) | integration | same file | ❌ W0 |
| SC-1 / D-03 | `applyWaveAdvance` clears effects, pickups and extra balls; leaves `lives`/`score`/`combo`/`rngGameplay` untouched; `simPhase === DOCKED` | unit | `npx vitest run tests/runtime.wave-advance.test.ts` | ❌ W0 |
| SC-2 / N-END-01 | `difficultyForWave` steps +1 per wave, clamps at `D_MAX`, never exceeds it out to wave 10 000 | unit | `npx vitest run tests/endless.ramp.test.ts` | ❌ W0 |
| SC-2 | The ramp is **written down** — `docs/ops/ENDLESS-MODE.md` carries the wave→difficulty table | grep | `grep -c "wave" docs/ops/ENDLESS-MODE.md` | ❌ W0 |
| SC-3 / N-END-02 | An endless run does **not** change `bestByLevel`, `unlocked` or `bestScore` | unit | `npx vitest run tests/storage.endless-firewall.test.ts` | ❌ W0 |
| SC-3 / N-END-02 | `telemetry.endless.bestWave` / `.bestScore` take running maxima, survive a parse round-trip; a corrupt endless record degrades **telemetry only** | unit | `npx vitest run tests/storage.progress-v4.test.ts` (extend) | ✅ exists |
| SC-4 / N-END-03 | Same run seed + same policy ⇒ identical `hashWorld` at every wave boundary and identical final score; a different seed diverges | integration | `npx vitest run tests/endless.determinism.test.ts` | ❌ W0 |
| SC-4 | `seedForWave` yields distinct seeds and distinct board ids over ≥ 60 consecutive waves | unit | `npx vitest run tests/endless.ramp.test.ts` | ❌ W0 |
| SC-5 / N-END-03 | The generated board reaches the world **without re-running the glow bake** — the bake key is invariant across waves | unit | `npx vitest run tests/ui/PlayingHost.next-bake.test.ts` (extend) | ✅ exists |
| SC-5 | **No frame spike outside the Mid budget across a wave transition** | **device** | — | **device-only** |
| D-05 | The endless entry renders under `__DEV__` and is absent otherwise | unit | `npx vitest run tests/ui/PlayingHost.*.test.ts` | ✅ pattern exists |
| repo-wide | `src/core/**` and `src/levelgen/**` byte-unchanged | gate | `git diff --name-only <phase-base>..HEAD -- src/core src/levelgen` empty | n/a |

---

## Headless vs device

| SC | Headless? | Why |
|----|-----------|-----|
| SC-1 | **Fully** | Research prototyped 30 waves through the real `stepRun`, lives/score/combo carried, 0 stuck waves |
| SC-2 | **Fully** | A pure integer function plus a doc grep |
| SC-3 | **Fully** | Both stores are plain TypeScript; `createMemoryProgressStore` needs no native module |
| SC-4 | **Headless, scoped** | The determinism property is provable in Node exactly as measured. A *device* run is not replayable — there is no per-tick intent recorder. **The plan must state that scope rather than imply user-facing replay.** |
| SC-5 | **Split** | Generation is headless (0.036 ms Node measured, ~0.56 ms Hermes-scaled). The frame-budget half is inherently a device measurement |

---

## Wave 0 Requirements

- [x] `tests/endless.ramp.test.ts` — SC-2, SC-4 seed uniqueness → **plan `11-01` Task 2**
- [x] `tests/runtime.wave-advance.test.ts` — SC-1 field-by-field carry/clear contract → **plan `11-01` Task 3**, extended by **`11-03` Task 2**
- [x] `tests/endless.wave-loop.test.ts` — SC-1 / N-END-01 multi-wave integration through real `stepRun` → **plan `11-01` Task 1** (tracer), expanded by **`11-04` Task 1**
- [x] `tests/endless.determinism.test.ts` — SC-4 / N-END-03 → **plan `11-04` Task 2**
- [x] `tests/storage.endless-firewall.test.ts` — SC-3 / N-END-02 → **plan `11-02` Task 3**
- [x] `docs/ops/ENDLESS-MODE.md` — SC-2's "written down" clause, plus the landing site for the device SC-5 reading → **plan `11-06` Tasks 1 and 3**
- [x] `tests/ui/PlayingHost.endless.test.ts` — D-05 / SC-1 / SC-5 source contracts → **plan `11-05` Task 3** (not in the original list; added because D-05 and the SC-5 source contract needed a home)

No framework install needed. `tests/helpers/balanceBot.ts` already supplies `runBotOnLevel`
for object-form levels, which is the one helper the integration tests need.

---

---

## Plan & Wave Map (added at planning, 2026-09-25)

Every row in the Per-Task Verification Map above is owned by exactly one plan task. There is
no separate "Wave 0" plan: every test file is created by the same `tdd="true"` task that
creates the code it guards, which is the repo's established shape and keeps a test and its
subject in one reviewable commit.

| Plan | Wave | Depends on | Owns | Requirements |
|---|---|---|---|---|
| `11-01` | 1 | — | `src/services/endless/` (ramp + barrel), `applyWaveAdvance`, `compileGeneratedLevel`, `lowestLiveBall` export; creates `tests/endless.ramp.test.ts`, `tests/runtime.wave-advance.test.ts`, `tests/endless.wave-loop.test.ts` | N-END-01, N-END-03 |
| `11-02` | 1 | — | `EndlessRecord` + sanitizer + running-max merge, the `recordRunEnd` union and the mode gate in **both** stores (**defect 1**); creates `tests/storage.endless-firewall.test.ts`, extends `tests/storage.progress-v4.test.ts` | N-END-02 |
| `11-03` | 2 | `11-01` | `useGameLoop` wave request/apply pair, `advanceWave` on the handle, the cumulative tick bank (D-06); extends `tests/runtime.wave-advance.test.ts` | N-END-01, N-END-03 |
| `11-04` | 2 | `11-01` | Multi-wave SC-1 integration and the SC-4 determinism suite; extends `tests/endless.wave-loop.test.ts`, creates `tests/endless.determinism.test.ts` | N-END-01, N-END-03 |
| `11-05` | 3 | `11-01`, `11-02`, `11-03` | Bake-key re-key (**defect 2**), `PlayingHost` endless state + WON intercept + record write, the `__DEV__` entry and wave indicator; extends `tests/ui/PlayingHost.next-bake.test.ts`, creates `tests/ui/PlayingHost.endless.test.ts` | N-END-01, N-END-02, N-END-03 |
| `11-06` | 4 | `11-04`, `11-05` | `docs/ops/ENDLESS-MODE.md`, the `BOARD-GENERATOR.md` §Limits amendment, the dated OPEN device-SC-5 block | N-END-01, N-END-02, N-END-03 |

**Same-wave file disjointness:** wave 1's two plans and wave 2's two plans share no
`files_modified` entry. `tests/runtime.wave-advance.test.ts` (11-01 → 11-03) and
`tests/endless.wave-loop.test.ts` (11-01 → 11-04) are each extended in a strictly later wave
than the one that creates them.

### Known-defect coverage

| Defect | Fixed by | Proven by |
|---|---|---|
| 1 — `recordRunEnd` writes campaign data for every mode | `11-02` Task 3 (discriminated union + `args.mode === 'campaign'` gate in `memoryStore.ts` and `asyncStorageStore.ts`) | `tests/storage.endless-firewall.test.ts`, one describe per store, plus a `@ts-expect-error` case that makes `npm run typecheck` the compile-time gate |
| 2 — the glow-bake key changes every wave | `11-05` Task 1 (re-key `loadKey` on brick dimensions alone) | `tests/ui/PlayingHost.next-bake.test.ts` source contract + jsdom `setActiveCalls` regression, duplicated in `tests/ui/PlayingHost.endless.test.ts` so the contract survives either file being rewritten |

### D-04 (no life mechanic) — which half of the guard is load-bearing

D-04 decided to build nothing, which leaves no artifact to test. `11-04` Task 1 splits its
guard in two and the plan says which is which, because the halves are not equal:

| Case | Load-bearing? | Why |
|---|---|---|
| **6a** — lives immediately after each `applyWaveAdvance` equal lives immediately before it | **yes** | A later per-N-waves grant breaks this on the first boundary it fires. This is the regression guard. |
| **6b** — lives never exceed `MAX_LIVES` | only if exercised | Under the clean driver the bot never misses, so lives can sit at 3 all run and the 8 % extra-life drop may never fire — the cap would then pass for reasons unrelated to D-04. 6b therefore asserts a life gain occurred **before** asserting the cap, and `11-04`'s SUMMARY records the wave at which it happened. |

### `world.tick` decision

Decided in the plans, not deferred: **`world.tick` restarts each wave** (`11-01` objective,
D-06), with cumulative simulated time banked on the **UI runtime** inside the wave-advance
request block (`11-03` objective) rather than in an app-tier ref — the app-tier bank would
depend on delivery ordering between two independent `useAnimatedReaction`s. Recorded with its
measurement in `docs/ops/ENDLESS-MODE.md` (`11-06` Task 1).

### SC-5 split, as planned

- Headless half — the bake key no longer moves across a wave, and the wave apply block sits
  above the `simFrozen` computation so no `setActive` call is involved: `11-03` Task 1
  (line-order gate) and `11-05` Tasks 1 and 3 (source contracts).
- Device half — recorded by `11-06` Task 3 as a **dated OPEN assumption** with its discharge
  procedure, and queued for the end-of-phase UAT harvest through that task's `<human-check>`.
  `workflow.human_verify_mode` is unset in `.planning/config.json`, so the `end-of-phase`
  default applies and no mid-flight checkpoint task is emitted.

### D-05 (`__DEV__` entry) — the gate that actually moves

The dev row is a **single** `typeof __DEV__ !== 'undefined' && __DEV__` guard wrapping all its
`Pressable`s (`app/_components/PlayingHost.tsx:994-1041`), and `11-05` Task 3 adds the endless
entry *inside* it. A whole-file occurrence count therefore cannot detect the entry — it stays
at 8 — so `11-05` Task 3's criterion is scoped to the extracted `devLevelSwitch` region and
asserts the region holds exactly one guard **and** contains the entry's `accessibilityLabel`
and the wave indicator. `tests/ui/PlayingHost.endless.test.ts` Tests 1-2 are what prove the
guard idiom itself.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No frame spike across a wave transition | SC-5 / N-END-03 | Frame cost is a device property. The real risk is **not** generation (0.56 ms) but the glow-bake + audio-preload cold path: `loadKey` embeds `compiled.brickCount`, which moves every wave across the ramp, so a naive swap flips `fxReady` false and re-bakes behind `setActive(false)` — hundreds of ms | Run endless on the simulator through at least waves 1→5 with the perf overlay armed. Watch for a stall at each transition. Record the reading in `docs/ops/ENDLESS-MODE.md` |

---

## Known defects this phase must fix (found by research, verified by the orchestrator)

1. **`recordRunEnd` writes campaign data for every mode.** `memoryStore.ts:105-120` calls
   `applyLevelBest(...)` unconditionally and `unlockAfterClearPure(...)` on any win, with no
   reference to `args.mode`. An endless win would write a campaign best and unlock a campaign
   level — a direct SC-3 violation. Needs a `mode === 'campaign'` gate in **both** stores, and
   `tests/storage.endless-firewall.test.ts` is what proves it.
2. **The glow-bake key changes every wave.** See the manual verification above. This is the
   SC-5 risk; generation is not.

---

## Validation Sign-Off

- [x] All tasks have an `<automated>` verify — every task in all six plans carries one
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has one)
- [x] Wave 0 covers all MISSING references — each MISSING test file is created by the `tdd="true"` task that needs it, in the same commit
- [x] No watch-mode flags — every command is `npx vitest run` or `npm test`
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** plan-mapped 2026-09-25 — all six sign-off boxes satisfied by the six plans above.
