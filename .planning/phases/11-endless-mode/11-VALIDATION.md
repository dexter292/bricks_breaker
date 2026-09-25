---
phase: 11
slug: endless-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-25
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

- [ ] `tests/endless.ramp.test.ts` — SC-2, SC-4 seed uniqueness
- [ ] `tests/runtime.wave-advance.test.ts` — SC-1 field-by-field carry/clear contract
- [ ] `tests/endless.wave-loop.test.ts` — SC-1 / N-END-01 multi-wave integration through real `stepRun`
- [ ] `tests/endless.determinism.test.ts` — SC-4 / N-END-03
- [ ] `tests/storage.endless-firewall.test.ts` — SC-3 / N-END-02
- [ ] `docs/ops/ENDLESS-MODE.md` — SC-2's "written down" clause, plus the landing site for the device SC-5 reading

No framework install needed. `tests/helpers/balanceBot.ts` already supplies `runBotOnLevel`
for object-form levels, which is the one helper the integration tests need.

---

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

- [ ] All tasks have an `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
