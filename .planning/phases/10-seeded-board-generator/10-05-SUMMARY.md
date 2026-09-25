---
phase: 10-seeded-board-generator
plan: 05
subsystem: levelgen
tags: [determinism, hermes, device-probe, devflags, phase-gate, assumptions, ops-doc]
status: complete

# Dependency graph
requires:
  - phase: 10-seeded-board-generator
    provides: "10-00 — the LC-16 boundaries widening that lets the app tier import the levelgen barrel, and the levelgen purity lint"
  - phase: 10-seeded-board-generator
    provides: "10-03 — corpusFingerprint() / CORPUS_SEEDS on the barrel, and the u32 pin 0x2e8f6c23 the device value is compared against"
  - phase: 10-seeded-board-generator
    provides: "10-04 — docs/ops/BOARD-GENERATOR.md and the A1 blank in its Limits section"
  - phase: D-08-devflags
    provides: "src/devflags.ts — the EXPO_PUBLIC_* build-time flag seam and the CERT/SOAK production-profile convention"
provides:
  - "src/devflags.ts LEVELGEN_PROBE — the A1 probe arm, barred from both production and profiling profiles"
  - "app/_components/GameHost.tsx — a double-gated one-shot mount effect that computes the corpus fingerprint on the device's own JS engine and logs it under a [levelgen] tag"
  - "docs/ops/BOARD-GENERATOR.md § Device probe procedure — the arm command, the comparison table, and both outcomes including the bisection recipe for a mismatch"
  - "the phase gate result: src/core byte-unchanged across the whole phase, src/levelgen free of any UI-thread directive, npm test green at 87 files / 486 tests"
affects: [11-endless, 12-daily]

# Actuals (#2632)
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 6296dd502ac3de80f7f38d5ac27b36072c34f20b

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Double-gate a diagnostic that is expensive when armed: an env flag for intent plus __DEV__ for blast radius, with the cost computed only after both early returns"
    - "Ship the probe for an unfalsifiable-in-CI assumption and leave a labelled PENDING, rather than downgrading the assumption to a paragraph or upgrading it to a claim"
    - "Write the failure branch of a verification procedure before the observation exists — a mismatch recipe written after a mismatch is written under pressure"
    - "Measure a 'nothing changed' gate against the phase base commit, not against origin/main, when the branch legitimately carries pre-phase work in the guarded directory"

key-files:
  created: []
  modified:
    - src/devflags.ts
    - app/_components/GameHost.tsx
    - tests/ui/GameHost.test.tsx
    - docs/ops/BOARD-GENERATOR.md

key-decisions:
  - "LEVELGEN_PROBE is barred from the profiling EAS profile as well as production, unlike CERT_HARNESS — GameHost gates it on __DEV__ too, so arming it on profiling would ship reachable dead code with no way to observe its output"
  - "The probe compares against the u32 pin and never computes a SHA-256, because Hermes ships neither node:crypto nor Buffer — the reason corpusFingerprint exists as shared source rather than test-local code"
  - "The ops doc records the mismatch bisection procedure (halve CORPUS_SEEDS to the one diverging board, then diff that board's JSON between engines) and explicitly forbids re-pinning the digests to the device's value"
  - "Gate 1 measures src/core against the phase base 64a0b0c, not origin/main — the branch carries one deliberate pre-phase core commit (7539e61) and the origin/main form fails a gate Phase 10 has not violated"
  - "The A1 line stays PENDING. The probe is shipped; the observation is not, and no automated gate in this repo can supply it"

patterns-established:
  - "An assumption that no CI gate can reach is discharged by shipping the instrument plus a labelled PENDING that reads as unfinished, so the next phase inherits a blocked item rather than an inherited belief"

requirements-completed: [N-GEN-01]

coverage:
  - id: D1
    description: "A __DEV__-gated, env-armed probe computes corpusFingerprint() on the device's own JS engine and logs it with a [levelgen] tag, so assumption A1 can be falsified for the cost of one app launch"
    requirement: "N-GEN-01"
    verification:
      - kind: other
        ref: "npm run typecheck + npm run lint + npx eslint app/_components/GameHost.tsx src/devflags.ts — all exit 0, no boundaries violation on the app -> levelgen barrel import"
        status: pass
      - kind: other
        ref: "grep -c LEVELGEN_PROBE src/devflags.ts = 3; app/_components/GameHost.tsx = 3; grep -c '[levelgen]' GameHost.tsx = 1; grep -c src/levelgen/fingerprint GameHost.tsx = 0"
        status: pass
    human_judgment: true
    rationale: >-
      The probe's correctness as source is machine-checked, but the observation it exists to make
      is not. Hermes is the one execution environment no vitest run, CI runner or Node process
      reaches. Whether the device prints 0x2e8f6c23 is the open question and requires a human to
      build, launch and read the console. See ## A1 — PENDING below.
  - id: D2
    description: "The probe is inert in every unarmed build: no env flag, no log, no work, and nothing on the simulation or render hot path"
    requirement: "N-GEN-01"
    verification:
      - kind: unit
        ref: "tests/ui/GameHost.test.tsx — 2 tests pass with LEVELGEN_PROBE: false, the same count and the same tests as before the edit"
        status: pass
      - kind: other
        ref: "Source ordering: both early returns precede any call to corpusFingerprint(), so an unarmed build performs zero generation"
        status: pass
    human_judgment: false
  - id: D3
    description: "src/core is byte-unchanged for the whole phase, measured against the phase base rather than the working tree"
    verification:
      - kind: other
        ref: "git diff --name-only 64a0b0c..HEAD -- src/core = empty, exit 0; git log --oneline 64a0b0c..HEAD -- src/core = empty"
        status: pass
    human_judgment: false
  - id: D4
    description: "src/levelgen/** carries no UI-thread directive, imports nothing from runtime/render/React Native, and passes its layer lint"
    verification:
      - kind: other
        ref: "grep -rEn \"^[[:space:]]*'worklet';\" src/levelgen | wc -l = 0; npx eslint src/levelgen exit 0; Worklet closure guard OK (119 files)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The full npm test chain is green with the baseline preserved and no test removed or skipped"
    verification:
      - kind: integration
        ref: "npm test exit 0 — vitest 87 files / 486 tests passed, 0 failed, 0 skipped, 0 todo; plus assert-worklet-closures, assert-level-solvability, assert-eas-profiles, assert-brand-name"
        status: pass
    human_judgment: false

# Metrics
duration: 12 min
completed: 2026-09-25
---

# Phase 10 Plan 05: The A1 Device Probe and the Phase Gate Summary

**The one assumption this phase refused to carry now has an instrument pointed at it: a double-gated `__DEV__` probe computes the 4 200-board corpus fingerprint on the device's own JS engine and logs it for comparison against the u32 pin — and the phase closes with `src/core` byte-unchanged against its base, `src/levelgen` free of any UI-thread directive, and the full chain green at 87 files / 486 tests.**

Started 2026-09-25 ~12:21 UTC, ended 12:33 UTC. 2 tasks, 4 files modified, 2 commits.

## A1 — PENDING (read this first)

**Assumption A1 — that Hermes produces byte-identical generator output to Node — is still unmeasured, and this plan did not measure it.** It shipped the instrument. RESEARCH verified byte-identity across four processes and two module pipelines, one of them `--jitless`, but every one of them was V8. The generator has never executed on Hermes.

This matters because if A1 is false, Phase 12's daily challenge hands **different boards to device and CI under the same seed** — the leaderboard would compare scores on boards that were never the same board.

**What the orchestrator (or any human with a device) must run to close it:**

```bash
EXPO_PUBLIC_LEVELGEN_PROBE=1 npx expo start
```

`EXPO_PUBLIC_*` flags are inlined at bundle time, so the variable must be set for the **bundler** process; restart Metro if it was already running. Then open the app on a physical device or simulator and read the Metro / device console for the line tagged `[levelgen]`:

```
[levelgen] corpus fingerprint u32=0xXXXXXXXX seeds=200 boards=4200 ms=NNN (expected 0x2e8f6c23 — see docs/ops/BOARD-GENERATOR.md § Limits)
```

It fires once at shell mount, before Title renders anything interesting. Expect a visible pause — 4 200 boards is roughly 140 ms on Node and plausibly several times that on a low-end device.

**Compare the printed `u32` against `0x2e8f6c23` (`781151267`).** Against the **u32**, never the SHA-256 — Hermes ships no `node:crypto` and no `Buffer`, which is precisely why `corpusFingerprint` exists as shared source rather than test-local code. The corpus is `CORPUS_SEEDS = 200` seeds x `d` in `0..20`, `s` outer and `d` inner.

- **Match** → A1 is discharged. Replace the `PENDING` line and the blank in `docs/ops/BOARD-GENERATOR.md` § Limits with the observed value, the date, and the device/OS version. Phase 12's daily challenge is unblocked.
- **Mismatch** → the generator is **not** cross-engine deterministic. This blocks Phase 12. Do not work around it by having the device trust its own value. The bisection recipe is in the ops doc: halve `CORPUS_SEEDS` on both engines until the smallest diverging seed range is isolated, narrow to a single `s`/`d` pair, then diff that one board's `JSON.stringify(generate(s, d))` byte-for-byte. The doc also explicitly forbids re-pinning the digests to the device's value — both pins describe one generator, and a mismatch means the generator itself needs an engine-portable fix.

`docs/ops/BOARD-GENERATOR.md` § Limits item 1 still reads **PENDING**, deliberately. Until a device value replaces it, every determinism claim in that document is scoped to V8.

## Accomplishments

- **A `__DEV__` + env double-gated device probe (`app/_components/GameHost.tsx`).** One `useEffect` with an empty dependency array, mounted in the same cold-path slot the CERT log already uses. It returns before doing any work unless `LEVELGEN_PROBE` is set **and** `typeof __DEV__ !== 'undefined' && __DEV__`; only then does it call `corpusFingerprint()` and log the u32 as zero-padded 8-digit hex alongside `CORPUS_SEEDS`, the derived board count and the wall time. It renders nothing, sets no state, and never touches the game loop.
- **`LEVELGEN_PROBE` in `src/devflags.ts`,** carrying the same kind of EAS-profile note the file's header already gives for `CERT`/`SOAK` — with one deliberate difference recorded below.
- **The import goes through the `src/levelgen` barrel,** not `src/levelgen/fingerprint`. LC-16 (widened in plan 10-00) lets the app tier reach `levelgen`, and the barrel is the only surface Phase 11/12 may use. `npx eslint app/_components/GameHost.tsx` confirms no boundaries violation.
- **The ops doc now carries a `### Device probe procedure` block** with the arm command, the exact log line, a pin comparison table, and both outcomes written out — including the mismatch bisection recipe, written before any mismatch exists.
- **The phase gate ran and is green on all four counts,** with Gate 1 measured against the phase base rather than `origin/main` (see Deviations).

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | `__DEV__` device probe for the Hermes corpus fingerprint (assumption A1) | `50eb1ad` (feat) |
| 2 | Phase gate — core untouched, cold path clean, full suite green | this SUMMARY commit (docs) |

Task 2 writes no source by design: it is the aggregate assertion that the phase's non-negotiable constraints held all the way through, and its recorded output is this document.

## The phase gate — raw results

**Gate 1 — `src/core` byte-unchanged across the phase.** Measured against the phase base `64a0b0ca9b7c8fff4c137fb6385e66870df4cf13` (the branch HEAD when Wave 0 was dispatched), so an edit made in an early plan and reverted in a later one cannot hide:

```
$ git diff --name-only 64a0b0c..HEAD -- src/core
core-diff-status=0
core-diff-bytes=0                     # empty

$ git log --oneline 64a0b0c..HEAD -- src/core
                                      # empty — no commit in the phase touched src/core at all
```

Both scratch files were truncated to 0 bytes **before** either gate ran, and both gates ran unconditionally, so neither could read a stale file from an earlier run.

For contrast, the `origin/main` form the plan warned about:

```
$ git diff --name-only origin/main...HEAD -- src/core
src/core/rules/brickDamage.ts

$ git log --oneline origin/main..64a0b0c -- src/core
7539e61 fix(core): break the applyBrickHpDamage/explodeAtCell mutual recursion
```

The one file it reports is attributable in full to `7539e61`, a deliberate pre-phase commit (the Metro web/SSR TDZ fix) that landed **before** Wave 0 was dispatched. `git log 64a0b0c..HEAD -- src/core` being empty is the direct proof that Phase 10 itself contributed nothing to that diff.

**Gate 2 — the generator is a JS cold path.**

```
worklet-hits=0                        # grep -rEn "^[[:space:]]*'worklet';" src/levelgen
Worklet closure guard OK (119 files)  # scripts/assert-worklet-closures.mjs
```

The pattern is line-anchored, so the header comments in `fingerprint.ts` and `rng.ts` that *mention* the rule cannot match it. A supplementary check for `src/levelgen` imports of `react-native`, `react`, `runtime`, `render`, `input` or `vfx` returned none.

**Gate 3 — the layer matrix and the ambient-input ban.**

```
$ npx eslint src/levelgen
ESLINT_LEVELGEN=0
```

**Gate 4 — typecheck and the full chain.**

```
$ npm run typecheck
TYPECHECK=0

$ npm test
NPM_TEST=0
 Test Files  87 passed (87)
      Tests  486 passed (486)
Worklet closure guard OK (119 files)
assert-level-solvability: OK (ship levels pass; level-02 fails)
assert-eas-profiles: production env clean; profiling SOAK unset OK
assert-brand-name: OK ('Pulse Paddle' consistent; old name absent)
```

0 failed, 0 skipped, 0 todo. `assert-level-solvability` still prints its OK line with `level-02.json` failing as expected and every other shipped asset passing — nothing was added to `assets/levels/`. Repo-wide `npm run lint` exits 0 with no warnings.

## Key Decisions

**`LEVELGEN_PROBE` is barred from the profiling profile too, unlike `CERT_HARNESS`.** The devflags header already permits `EXPO_PUBLIC_CERT=1` on profiling, because Cert WC needs to arm with `__DEV__` false for an Instruments ceiling. The A1 probe has no such use: GameHost gates it on `__DEV__` as well, so arming it on profiling would ship a reachable 4 200-board loop that can never produce observable output. The flag's doc line says so explicitly, and `assert-eas-profiles` confirms the production env stays clean.

**The probe compares against the u32 and never computes a SHA-256.** This is not a simplification. Hermes ships neither `node:crypto` nor `Buffer`, which is the documented reason `corpusFingerprint` was built as shared source in 10-03 rather than four lines inside the determinism test. The SHA-256 pin remains the Node-side cross-check; the u32 is the only pin both engines can compute.

**The mismatch branch of the procedure was written before any mismatch exists.** A bisection recipe authored after a failing device run is authored under pressure, with Phase 12 already blocked. Writing it now also forced the explicit prohibition that matters most: do not re-pin the digests to whatever the device printed. Both digests describe one generator; a divergence means the generator needs an engine-portable fix, not a second set of numbers.

**Gate 1's base is the phase base, not `origin/main`.** Recorded as a decision rather than a mechanical detail because the two forms give opposite answers, and the wrong one fails a constraint the phase actually honoured. The reasoning is durable: any "this directory did not change" gate on a branch that legitimately carries pre-branch work in that directory must measure from the point the phase began.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] `tests/ui/GameHost.test.tsx` devflags mock lacked the new export**

- **Found during:** Task 1, at the first `npx vitest run tests/ui/GameHost.test.tsx`.
- **Issue:** The test mocks `../../src/devflags` with an explicit object literal (`{ SOAK_HARNESS: false, CERT_HARNESS: false }`), not a partial mock over `importOriginal`. Reading the new `LEVELGEN_PROBE` binding inside the mount effect threw `[vitest] No "LEVELGEN_PROBE" export is defined on the "../../src/devflags" mock`, failing 1 of the 2 tests.
- **Fix:** Added `LEVELGEN_PROBE: false` to the mock, with a comment stating why it must stay false — unarmed, exactly as an ordinary build, so no UI test ever generates a 4 200-board corpus.
- **Files modified:** `tests/ui/GameHost.test.tsx`
- **Verification:** `npx vitest run tests/ui/GameHost.test.tsx` → 2 passed (2), the same count and the same tests as before the edit, satisfying the plan's "no existing GameHost test may change" criterion.
- **Commit:** `50eb1ad`

### Plan corrections applied

**2. Gate 1's comparison base — corrected version followed.** The plan's Task 2 `<action>` text explicitly directs Gate 1 at the phase base `64a0b0c` and explicitly forbids `origin/main`; its `<verify>` command and two of its `<acceptance_criteria>` bullets still carried the original `origin/main...HEAD` form, as does the `<threat_model>` row for T-10-23 and the plan-level `<verification>` block. `.planning/phases/10-seeded-board-generator/10-VALIDATION.md` § "Phase gate base (corrected 2026-09-25)" is the authority and says the same as the `<action>` text. **Both forms were run and both are recorded above**, so the correction is visible rather than asserted: the phase-base form is empty (gate passes), the `origin/main` form reports one file, and `git log origin/main..64a0b0c -- src/core` attributes that file entirely to the pre-phase commit `7539e61`. The gate's intent — "Phase 10 changed nothing in `src/core`" — is satisfied, and T-10-23's mitigation (a transient mid-phase edit cannot hide) holds identically, since the base is still a fixed commit rather than the working tree.

**3. The plan's stated test baseline was stale.** Task 2's acceptance criteria expect "at least 86 test files and at least 451 passing tests" against an "82 baseline + 4 levelgen" derivation written before plans 10-03 and 10-04 landed their own test files. The actual green baseline on the merged tree is **87 files / 486 tests**, which the run met exactly — this plan adds no test file and removes none, so 87/486 before and 87/486 after. The criterion's floor is cleared; the derivation behind it was simply out of date. Recorded rather than silently passed, because a floor that is 35 tests below reality would not catch a regression.

**4. Scratch-file location.** The plan names `/tmp/p10-core-diff.txt` and `/tmp/p10-worklet.txt`. The session's scratchpad directory was used instead, per the environment's standing instruction to keep temporary files out of system temp. The semantics the acceptance criteria actually specify — both files truncated before either gate runs, both gates run unconditionally, neither can report a stale result — were preserved exactly and are evidenced above.

**Total deviations:** 1 auto-fixed blocker (Rule 3), 3 recorded plan corrections (0 behavioural changes to shipped source). **Impact:** none on the delivered artifacts. The blocker fix touched a test mock only and preserved the test count; the corrections changed which base a read-only gate measured from, and that base is the one the phase's own VALIDATION document specifies.

## Expo SDK 57 directive — discharged by inspection

AGENTS.md requires reading the versioned Expo docs at `https://docs.expo.dev/versions/v57.0.0/` before writing code that touches Expo APIs. **This plan touches none.** The probe's entire surface is:

- `__DEV__` — a React Native / Metro global, not an Expo API, and read through the same `typeof __DEV__ !== 'undefined' && __DEV__` guard form `PlayingHost.tsx` already uses.
- `process.env.EXPO_PUBLIC_LEVELGEN_PROBE` — read through the **existing** `src/devflags.ts` seam, which already reads four such flags the same way. The `EXPO_PUBLIC_` prefix is a bundler inlining convention, not a callable API, and no new pattern was introduced.
- `console.log` — a JS built-in.
- `useEffect` from React, in the same component that already mounts three other effects.

`src/levelgen/**` imports no Expo package at all, which `npx eslint src/levelgen` enforces. So the directive applies to nothing here beyond the engine question the probe itself answers — and that question is about Hermes, the runtime, not about an SDK surface a doc lookup could settle. Recorded explicitly because the plan's acceptance criteria required the confirmation.

## Known Stubs

| Item | File | Reason |
|------|------|--------|
| `**Device digest:** PENDING` and the blank on-device fingerprint line | `docs/ops/BOARD-GENERATOR.md` § Limits item 1 | **Intentional and load-bearing.** This is the artifact of an assumption that no automated gate in this repository can discharge — Hermes is not reachable from vitest, CI or Node. The marker is designed to read as unfinished so a later phase cannot mistake an inference for a fact. It is resolved by the device run described in **## A1 — PENDING** above, not by a future plan's code. T-10-22 (A1 silently carried as fact into Phase 12) is mitigated precisely by leaving it visible. |

No code stubs. No placeholder logic, no `TODO`/`FIXME`, no component wired to empty data. The probe is complete source that does real work when armed; what is absent is an observation, not an implementation.

## Threat Flags

None. The plan's register is discharged as follows and introduces no new security-relevant surface:

| Threat | Disposition | Evidence |
|--------|-------------|----------|
| T-10-21 (probe running in a shipped build) | mitigated | Double gate (`LEVELGEN_PROBE` **and** `__DEV__`) with both early returns preceding any computation; devflags doc line barring the flag from production *and* profiling; `assert-eas-profiles` green. |
| T-10-22 (A1 silently carried as fact) | mitigated | The probe ships, the `human-check` is harvested into the phase UAT, and the ops doc carries a `PENDING` marker plus an explicit "treat every determinism claim as scoped to V8" until it is replaced. |
| T-10-23 (`src/core` edit landing and being reverted mid-phase) | mitigated | Gate 1 diffs against a fixed base commit rather than the working tree; `git log 64a0b0c..HEAD -- src/core` is empty, so no commit in the phase touched it even transiently. |
| T-10-24 (generation code reaching the UI thread) | mitigated | Line-anchored directive scan = 0 hits, `assert-worklet-closures.mjs` OK across 119 files, `npx eslint src/levelgen` exit 0. |
| T-10-SC (package installs) | accepted, untriggered | Zero packages installed; `package.json` dependencies byte-unchanged. |

The shipped surface remains a pure function over two integers plus a `console.log`. No network, filesystem, credential or user-input path. The fingerprint's own header already states it is a determinism digest and **not** a security digest — 32 bits of FNV-1a, never to authenticate a board, a score or a daily-challenge submission.

## Issues Encountered

None beyond the Rule 3 blocker documented above, which was fixed within the same task.

## Next Phase Readiness

**Phase 10 is complete as source.** Its one open item is an observation, not work:

1. **Run the device probe** (command and comparison in **## A1 — PENDING** above) and fill the ops doc's PENDING line. This is the single item in the phase that no automated gate can supply, and it gates Phase 12's daily challenge.
2. **Phase 11 (endless) inherits two standing warnings** already recorded in 10-03 and 10-04 and consolidated in the ops doc: dial constants in `src/levelgen/schedule.ts` are free to re-tune because no test pins a literal value, but the PRNG, the candidate ordering, the stage sequence and `wouldTouchSteel` are **not** — any of them flips both digests and retroactively invalidates every existing seed. Phase 11 should also measure a single `generate` call's wall-clock cost on a low-end device (Limits item 5), which this plan's `ms=` field now makes easy to sample.
3. **Phase 12 (daily) must not start its seed-keyed history until A1 is discharged.** A daily challenge built on a V8-only determinism claim is the exact failure mode this plan exists to prevent.

## Self-Check: PASSED

- `src/devflags.ts` — FOUND, contains `LEVELGEN_PROBE` (3 occurrences)
- `app/_components/GameHost.tsx` — FOUND, contains `LEVELGEN_PROBE` (3), `[levelgen]` (1), barrel import `from '../../src/levelgen'` (1), deep `src/levelgen/fingerprint` import (0)
- `docs/ops/BOARD-GENERATOR.md` — FOUND, contains `PENDING` (2) and `Device probe procedure` (1)
- `tests/ui/GameHost.test.tsx` — FOUND, 2 tests passing, count unchanged
- Commit `50eb1ad` — FOUND in `git log`
- `npm test` exit 0; `npm run typecheck` exit 0; `npm run lint` exit 0; `npx eslint src/levelgen` exit 0
- `git diff --name-only 64a0b0c..HEAD -- src/core` — empty, status 0
- `git status --short` — clean, no untracked files, no deletions in the task commit
