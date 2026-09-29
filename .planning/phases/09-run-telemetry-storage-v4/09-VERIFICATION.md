---
phase: 09-run-telemetry-storage-v4
verified: 2026-09-29T10:05:00Z
status: human_needed
score: 5/5 must-haves verified (every one carries an unguarded half — read the annotations, not the number)
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/ROADMAP.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-00-PLAN.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-00-SUMMARY.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-01-PLAN.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-01-SUMMARY.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-02-PLAN.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-02-SUMMARY.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-03-PLAN.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-03-SUMMARY.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-04-PLAN.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-04-SUMMARY.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-CONTEXT.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-SECURITY.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-UAT.md"
  - ".planning/phases/09-run-telemetry-storage-v4/09-VALIDATION.md"
  - "app/_components/PlayingHost.tsx"
  - "docs/ops/PROGRESS-STORAGE.md"
  - "src/runtime/publishRunStatsMirror.ts"
  - "src/runtime/runStats.ts"
  - "src/runtime/useGameLoop.ts"
  - "src/services/storage/asyncStorageStore.ts"
  - "src/services/storage/index.ts"
  - "src/services/storage/memoryStore.ts"
  - "src/services/storage/migrateProgress.ts"
  - "src/services/storage/parseBlob.ts"
  - "src/services/storage/telemetry.ts"
  - "src/services/storage/types.ts"
  - "src/services/storage/watermark.ts"
  - "tests/constants.parity.test.ts"
  - "tests/storage.progress-v4.test.ts"
  - "tests/telemetry.reduce-run-events.test.ts"
  - "tests/telemetry.runstats-mirror.test.ts"
covered_digest: "v1:sha256:6cedaa56d06ce5f3bff5356b7d2ca8d107dc088c5f63c21eb5109d47ba1a598b"
behavior_unverified: 1
overrides_applied: 0

# ---------------------------------------------------------------------------
# Every criterion below HOLDS. Five of them also have a half that NOTHING would
# catch the removal of — each proved here by deleting the property and watching
# the full 112-file suite stay green. `5/5` is the holding score, not a coverage
# score. Do not cite it without the annotations.
# ---------------------------------------------------------------------------

gaps:
  - truth: >-
      SC-1 — the host→storage join. The counters the phase exists to record actually
      reach `recordRunEnd`.
    status: partial
    reason: >-
      The property HOLDS (device UAT read real non-zero counters off the on-disk blob
      after 59afd98). But NO test exercises the join. VERIFIER-MEASURED: replacing
      `snapshotRunStats`'s body with `buildRunStatsInput(createRunStatsMirror(), ...)` —
      an all-zero mirror, i.e. the EXACT observable outcome of the device defect this
      phase's own UAT found (`bricksBroken: 0`, `ticks: 2`, `livesLost: 0`) — leaves the
      full suite at 112 files / 873 passed | 1 skipped (874), GREEN. The regression guard
      that exists (`tests/telemetry.runstats-mirror.test.ts`, "PlayingHost reads counters
      from the mirror ref, not from the SharedValue") is a comment-stripped REGEX over
      `PlayingHost.tsx` matching the literal strings `runStats.value` / `cloneRunStats(`.
      A functionally identical zeroing that does not use those strings passes it.
      Separately measured: the host suites DO spy on `recordRunEnd` and inspect
      `mock.calls[0][0]`, but `grep -rn "stats:" tests/ui/` returns ZERO — no host test
      asserts anything about the `stats` field's content.
    artifacts:
      - path: "app/_components/PlayingHost.tsx"
        issue: "`snapshotRunStats` / `buildRunStatsInput` — the single derivation site, with no behavioural test over its output"
      - path: "tests/telemetry.runstats-mirror.test.ts"
        issue: "the only regression guard for the one defect that shipped is a source-text regex, not a behavioural assertion"
    missing:
      - "A host test asserting that `recordRunEnd` receives NON-ZERO stats after a run that emitted BRICK_BREAK / LIFE_LOST events — the assertion whose absence let the original defect ship"
      - "UAT gap-item 2 as literally written ('drive a run through pause → menu via the reset-request path') was never implemented: `grep -rln 'resetRequest' tests/` returns only tests/runtime.cert-request.test.ts"

  - truth: >-
      SC-2 / SC-4 — `recentRuns` is bounded at the memory/disk reconcile and on read, so
      a tampered or re-hydrated blob cannot grow the ring.
    status: partial
    reason: >-
      Both bounds are PRESENT and CORRECT in shipped code. Neither is guarded.
      VERIFIER-MEASURED, two separate full-suite runs: (1) deleting
      `.slice(-RECENT_RUNS_BOUND)` from `mergeTelemetryBlobs` → 112 files / 873 passed |
      1 skipped, GREEN. (2) changing `out.recentRuns = entries.slice(-RECENT_RUNS_BOUND)`
      to `out.recentRuns = entries` in `sanitizeTelemetry` → GREEN. The ONLY assertion
      over the merge bound is `expect(merged.recentRuns.length).toBeLessThanOrEqual(RECENT_RUNS_BOUND)`
      inside "mergeTelemetryBlobs sums cumulative, maxes *Ever, unions byMode keys and
      bounds recentRuns by timestamp" — READ IN FULL this verification: the merged array
      it runs against has length 2. `2 <= 50` passes whether the bound exists or not.
      **A criterion whose only evidence is an assertion that cannot fail is not verified**,
      and the test's own name claims the bound it does not test. This matters to SC-2
      specifically because `mergeTelemetryBlobs` is on the hydrate path — every cold start
      that reconciles memory against disk goes through it.
    artifacts:
      - path: "src/services/storage/telemetry.ts"
        issue: "`mergeTelemetryBlobs` — bound present, unguarded; its only assertion is unfalsifiable at length 2"
      - path: "src/services/storage/parseBlob.ts"
        issue: "`sanitizeTelemetry` — read-side `recentRuns` bound present, unguarded"
    missing:
      - "A `mergeTelemetryBlobs` case built from >RECENT_RUNS_BOUND entries so the assertion can fail — the existing one is the WINDOWS #33 / #26 defect family"
      - "A read-path case feeding >RECENT_RUNS_BOUND valid entries through `parseProgressResult`"

  - truth: >-
      SC-4 — a malformed telemetry field degrades ALONE, without discarding its SIBLING
      telemetry fields.
    status: partial
    reason: >-
      The property HOLDS at HEAD — VERIFIER-MEASURED independently this run with a
      throwaway probe (`tests/__verify09_probe.test.ts`, written and deleted): a 12-value
      non-default baseline established FIRST as an anti-vacuity control, then each of the
      six telemetry fields (`lifetime`, `byMode`, `endless`, `daily`, `achievements`,
      `recentRuns`) corrupted ALONE to the string `'BANANA'`. 7/7 passed — in every case
      `status` stayed `ok`, every sibling kept its non-default value, and `bestScore` /
      `bestByLevel.stars` survived. It is unguarded. VERIFIER-MEASURED: inserting an early
      `return out` in `sanitizeTelemetry` when `telemetry.lifetime` is malformed — so a bad
      `lifetime` silently discards `byMode`, `endless`, `daily`, `achievements` AND
      `recentRuns` — leaves the full suite at 112 files / 873 passed | 1 skipped, GREEN.
      More precise than the security audit's "ZERO test coverage": the DAILY-vs-siblings
      and ACHIEVEMENTS-vs-siblings directions ARE covered (two named cases in
      `tests/storage.progress-v4.test.ts`). What has no coverage is `lifetime`, `byMode`
      and `recentRuns` as the CORRUPTED field. `sanitizeTelemetry`'s doc comment claims
      this independence four times and `docs/ops/PROGRESS-STORAGE.md` calls it "provably
      untouched" — "provably" is doing work the tests do not do.
    artifacts:
      - path: "src/services/storage/parseBlob.ts"
        issue: "`sanitizeTelemetry` — sibling independence holds by code structure (field-by-field assignment onto a default), guarded by nothing for 3 of 6 fields"
    missing:
      - "A parametrised case over all six telemetry fields with a non-default baseline — the probe written and deleted during this verification is the shape; it took 45 lines and passes today"

  - truth: >-
      SC-5 — `src/core` stays frozen. The phase's declared gate is a standing control.
    status: partial
    reason: >-
      The OUTCOME holds: `git diff --stat 3bf0933..f814dae -- src/core` is EMPTY
      (re-measured). But the register's mitigation — "Task 2's `git diff --stat --
      src/core` gate blocks phase completion if violated" — describes a command typed into
      a plan, not an artifact. VERIFIER-MEASURED: `grep -rn "git diff" scripts/ tests/
      src/ app/ .github/ | grep -i core` returns ZERO; `.github/workflows/ci.yml` has no
      core-freeze step among its ten. The gate's absence was demonstrated INSIDE this
      phase: `3f20563` used `git add -A` and swept a 159-line rewrite of
      `src/core/rules/brickDamage.ts` into a commit whose own message asserted the diff
      was empty; a human caught it and `9a6a448` reverted it. Separately, the register
      names `assert-worklet-closures` as SC-5's read-only control. VERIFIER-REPRODUCED: it
      is not. With `world.combo = 0;` planted in `reduceRunTelemetry`, `node
      scripts/assert-worklet-closures.mjs` prints `Worklet closure guard OK (130 files)`
      and exits 0, and `npx tsc --noEmit` exits 0 too.
    artifacts:
      - path: "scripts/"
        issue: "no `assert-core-freeze.mjs` — the phase has nine sibling assert scripts and this is not one of them"
    missing:
      - "A standing core-freeze assertion, of the same shape as the eight `assert-*.mjs` already in the `npm test` chain"

  - truth: >-
      SC-2 — `EVENT_RING_CAPACITY`, the constant the per-substep reducer's scratch bound
      is derived from, is pinned to its exported value.
    status: partial
    reason: >-
      VERIFIER-REPRODUCED. `grep -rn EVENT_RING_CAPACITY src app` finds NO production
      importer — only `src/core/constants.ts` (the export) and `src/core/index.ts` (the
      re-export). `src/runtime/runStats.ts` hard-codes `128` TWICE, each with a comment
      naming the constant it is not reading (`CASCADE_SCRATCH_LEN` and the reducer's local
      `ringCap`). `tests/constants.parity.test.ts` is this repo's exact idiom for pinning
      duplicated worklet literals and pins five of them (`MAX_CCD_ITERATIONS`,
      `SEPARATION_EPS`, `SERVE_SPEED`, `STALL_TIER3_REPEAT_TICKS`,
      `STALL_ANGLE_NUDGE_DEG`) — not this one. This is phase 13's `ACHIEVEMENT_LINES_MAX`
      defect in a new place. The failure direction is SAFE (raising the core constant
      would leave the scratch at 128 and `largestCascade` would UNDERcount, which is
      T-09-12's declared safe direction), so this is correctness drift, not memory safety.
    artifacts:
      - path: "src/runtime/runStats.ts"
        issue: "`CASCADE_SCRATCH_LEN = 128` and `const ringCap = 128` — two hand-copied literals, zero importers of the constant they name"
      - path: "tests/constants.parity.test.ts"
        issue: "pins five literals; the missing row is one line in a file that already has the pattern"
    missing:
      - "One `constants.parity` row pinning `CASCADE_SCRATCH_LEN` / `ringCap` against the exported `EVENT_RING_CAPACITY`"

  - truth: >-
      SC-3 / SC-4 — `docs/ops/PROGRESS-STORAGE.md` describes the v4 contract this phase
      shipped.
    status: failed
    reason: >-
      VERIFIER-CONFIRMED (T-09-A3). `git log --oneline -- docs/ops/PROGRESS-STORAGE.md` is
      exactly three commits — `a83fd6c` (C1, v2), `af65da9` (C2, v3), `35216e9` (phase
      13-05). **Phase 09 wrote zero lines of it**, despite shipping the v4 blob, the v3→v4
      chain, the 16-field aggregate, `RECENT_RUNS_BOUND` and the whole fail-soft contract.
      Its header still reads "Status: C2 ProgressBlob **v3** live"; its § Storage keys
      table still lists `@nbb/progress/v3` as canonical with no v4 row; § Migrate still
      says "Prefer valid **v3**"; § Fail-soft still describes v3. Phase 13 had to open its
      own section with the disclaimer "The sections above describe the **v3**
      `ProgressBlob`". This is not a broken promise — `grep -n "PROGRESS-STORAGE\|docs/ops"`
      over all five PLAN and all five SUMMARY files returns zero, so no plan ever
      undertook it — but it is the documentation trust boundary on which THREE later
      phases built, and it is the direct mechanism by which WINDOWS #27 sat unowned for
      three phases.
    artifacts:
      - path: "docs/ops/PROGRESS-STORAGE.md"
        issue: "§ Storage keys / § Migrate / § Fail-soft describe v3; the v4 read path this phase authored is documented only inside phase 13's appended section"
    missing:
      - "§ Storage keys: a `@nbb/progress/v4` row and `PROGRESS_VERSION = 4`"
      - "§ Migrate: the v4 link and `v3ToV4`, and that a corrupt v4 cannot block the older fallbacks"
      - "§ Fail-soft: `safeCounter`'s downward-only direction, `RECENT_RUNS_BOUND`, `AGGREGATE_MAP_BOUND`, and the sibling-degrade rule — with the word 'provably' removed or earned"

  - truth: >-
      N-STAT-01 and N-STAT-02 are marked satisfied in REQUIREMENTS.md.
    status: failed
    reason: >-
      Both are `- [ ]` unchecked at HEAD while ROADMAP.md marks Phase 9 `[x]` complete.
      This is NOT the repo-wide tooling defect it resembles: phase 12's three `N-DAILY-*`
      and phase 13's three `N-ACH-*` ARE `[x]`. Phase 09's two (and phase 10's three) are
      not. Bookkeeping, not implementation — recorded so the traceability surface is not
      quietly wrong.
    artifacts:
      - path: ".planning/REQUIREMENTS.md"
        issue: "N-STAT-01 / N-STAT-02 unchecked; the checkbox is the only traceability surface in this file"
    missing:
      - "Tick N-STAT-01 and N-STAT-02"

behavior_unverified_items:
  - truth: >-
      SC-1 — a completed run contributes its real counters to storage (the UI-runtime →
      JS-thread → `recordRunEnd` join).
    test: >-
      On a device or simulator: fresh launch → Play → Level 01 → launch → destroy at least
      one brick, lose at least one life, keep the ball rallying for several paddle hits →
      Pause → Menu. Then read the real AsyncStorage blob out of the app container
      (`.../Application Support/com.dexter292.bricksbreaker/RCTAsyncLocalStorage_V1`)
      rather than any in-app display.
    expected: >-
      Exactly one new `abandoned` entry in `telemetry.recentRuns`, and in
      `telemetry.lifetime`: `bricksBroken >= 1`, `livesLost >= 1`, `longestRally >= 1`,
      `bestCombo >= 2`, `ticks` in the low thousands for ~10s of play. Specifically NOT
      the all-zero signature (`bricksBroken: 0`, `ticks: 2`).
    why_human: >-
      No test exercises this join — PROVED, not assumed: zeroing `snapshotRunStats`'s
      output leaves all 874 tests green. Reanimated's in-place-mutation propagation
      behaviour across the UI-runtime/JS bridge is the mechanism that failed here once
      already, and jsdom has no second runtime to reproduce it. The only existing evidence
      is `09-UAT.md` — one human's testimony on an iPhone 17 simulator, recorded in a file
      that also contains one genuine defect and one retracted measurement error.

human_verification:
  - test: "The SC-1 device re-measurement described in behavior_unverified_items above."
    expected: "Non-zero counters on the on-disk blob."
    why_human: "The UI-runtime → JS bridge has no jsdom analogue; this is the join the suite cannot see."
  - test: >-
      DECISION, not a measurement: four properties HOLD but nothing guards them — the
      `mergeTelemetryBlobs` bound, the read-side `recentRuns` bound, the sibling-field
      degrade-alone property for `lifetime`/`byMode`/`recentRuns`, and the `src/core`
      freeze. Each was proved unguarded in this verification by removing it and watching
      112 files / 873 passed | 1 skipped stay green. Decide which get a gate now versus
      which are accepted with the gap written down.
    expected: >-
      An explicit disposition per property. 'Tracked' is not 'bounded' — that distinction
      is what let WINDOWS #27 sit for three phases, and the same shape is present here
      four more times.
    why_human: "Prioritisation against remaining v1.2 scope (phases 11 and 14 are still open) is a judgement call, not a measurement."
  - test: >-
      DECISION: `docs/ops/PROGRESS-STORAGE.md` still documents v3 in its § Storage keys,
      § Migrate and § Fail-soft sections. Phase 14 (N-STAT-03) is the statistics screen
      that will read this phase's blob, and it also inherits T-09-A2 — an unfenced,
      unbounded-length `recentRuns[].levelId` (a 4 000-character id survives) that phase 12
      fenced as T-12-15 and phase 13 as T-13-01.
    expected: "Either the doc is brought to v4 now, or a register row is opened against Phase 14 so it arrives fenced."
    why_human: "Cross-phase scoping decision."

# ===========================================================================
# EVIDENCE PROVENANCE — read this before citing anything above as "verified".
# `human_needed` is a routing signal. Every claim below is tagged by KIND so no
# later reader mistakes a tick for a measurement. This phase's recurring failure
# mode is instrument fidelity — a control that names an enforcement it does not
# perform, caught twelve times in four phases and four more times here — so the
# question answered per criterion is HOW a closure was established, not whether
# it was claimed.
# ===========================================================================
evidence_provenance:
  measured_by_verifier:
    note: >-
      Re-derived in this process. TEN mutations applied to the real tree and every one
      reverted; ONE probe file written and deleted (`tests/__verify09_probe.test.ts`).
      Reds proved: v3ToV4 emptied of `bestByLevel` → 4 reds (SC-3); `AGGREGATE_MAP_BOUND`
      break removed → 1 red (SC-2 read bound); `world.combo = 0;` planted in the reducer
      → 1 red; `world.brickHp[0] = 99` planted → 17 reds (SC-5 reaches typed-array
      elements, not just scalars). Greens proved — i.e. UNGUARDED: `mergeTelemetryBlobs`
      bound deleted → green; `sanitizeTelemetry` read bound deleted → green;
      `sanitizeTelemetry` early-return on malformed `lifetime` → green; `snapshotRunStats`
      zeroed → green. Property measured directly: sibling-degrade-alone across all six
      telemetry fields with a 12-value non-default anti-vacuity baseline, 7/7. Git facts
      re-measured: `3bf0933..f814dae -- src/core` empty; `hashWorld` (`src/core/hash.ts`)
      has no commit in the phase range.
    covers: "SC-1 (code chain), SC-2, SC-3, SC-4, SC-5, and all seven gaps"
  measured_by_control:
    note: >-
      `npm test` exit 0 at 112 files / 873 passed | 1 skipped (874), chaining eight
      `assert-*.mjs`. `npm run typecheck` exit 0. These are the gates; they are reported
      as what they are — a green suite is the BASELINE against which the mutations above
      were read, and on its own it says nothing about the four unguarded properties, each
      of which it passes.
    covers: "regression baseline only"
  human_testimony_not_measured:
    count: 2
    record: ".planning/phases/09-run-telemetry-storage-v4/09-UAT.md"
    note: >-
      Both UAT checkpoints. Taken on an **iPhone 17 simulator (iOS 26.5)** under a Metro
      dev bundle — NOT a physical device, so thermal, memory-pressure and real-storage
      behaviour are out of scope of this evidence. Neither the verifier nor any control
      observed them. The file's own history argues for reading it carefully rather than
      citing it: checkpoint 1 FAILED first (counters crossing UI→JS as zeros, a genuine
      defect, fixed in `59afd98` and re-measured non-zero), and checkpoint 2 was recorded
      as FAILED and then RETRACTED — "my measurement error, not an app defect", a `sleep 20`
      between tool calls mislabelled as 20s of play. The retraction is itself the better
      evidence: it was replaced with shell-bracketed wall-clock stamps (27.0s play / 25.0s
      paused / 60.7s elapsed vs. 34 820 ms recorded) and a `[DIAG] setActive -> false`
      Metro trace across the pause. That is a measurement. The counter values are not
      re-derivable by anything in this repository.
    covers: "SC-1's host→storage join; SC-2's real on-disk survival"
  human_judgement:
    note: >-
      Three items in `human_verification` are decisions, not measurements: which of the
      four unguarded properties to gate, whether to bring the ops doc to v4, and whether
      to fence T-09-A2 before Phase 14 renders `recentRuns[].levelId`.
    covers: "disposition of the unguarded set"
  inherited_not_re_derived:
    note: >-
      `09-SECURITY.md`'s full 14-row register was NOT re-audited here. Six of its findings
      WERE independently reproduced by this verification (Findings 1, 3, 4, 5, 6 and
      T-09-A3) and all six matched. Its performance numbers (0.0139 ms/call worst case),
      its 30-hostile-input fail-soft sweep, and its 11.2x/25x inflation measurements are
      cited, not re-measured.
    covers: "the security register's arithmetic and its perf/fuzz measurements"
---

# Phase 9: Run Telemetry & Storage v4 — Verification Report

**Phase Goal:** The app records what happens during a run, so achievements, statistics and
future balance work read real numbers instead of a throwaway bot.

**Verified:** 2026-09-29 · at HEAD `a2a17c2`
**Status:** `human_needed`
**Re-verification:** No — initial verification, four phases after the phase shipped.

---

## The one-paragraph answer

The goal is achieved. Telemetry is real, it is derived from the event ring by a single
reducer, it aggregates lifetime and per level id, it persists, the v3→v4 migration is
lossless and fixture-tested, corrupt v4 degrades instead of throwing, and `src/core` and
`hashWorld` came through the phase with a zero net delta. Phases 11, 12 and 13 have all
been reading it successfully, which is itself a form of evidence.

What this report adds to the SUMMARYs is the second half of each sentence. **Five of the
criteria hold on a property that nothing in the 112-file suite would catch the removal
of** — proved here by removing each one and watching the suite stay green. That includes
the join SC-1 is actually about: the counters reaching storage. The phase's own UAT caught
that join broken once; today, re-breaking it to the identical observable outcome passes all
874 tests. The code is right. The instruments around it are thinner than the artifacts
claim, in the specific way this project has now been caught on sixteen times.

---

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| SC-1 | Deterministic counters from the event ring, not ad-hoc UI call sites | ✓ VERIFIED **· join unguarded** | Reducer is single-sited and mutation-proved (15 cases, 17 reds under a typed-array plant). Negative claim searched four independent ways — see below. Join proved by device testimony only. |
| SC-2 | Aggregated lifetime + per level id, survive an app kill | ✓ VERIFIED **· two bounds unguarded** | `TelemetryBlob.lifetime` + `byMode.campaign[levelId]`; dedicated SC-2 round-trip case; AsyncStorage hydrate-chain suite; device read of the real on-disk blob. |
| SC-3 | v3→v4 lossless; a v3 fixture round-trips in a test | ✓ VERIFIED **· fully guarded** | `v3ToV4` is a pure structural copy; `buildV3Fixture` case exists; emptying `bestByLevel` reds **4** cases. The only criterion with no unguarded half. |
| SC-4 | Corrupt/partial v4 degrades to defaults rather than throwing | ✓ VERIFIED **· sibling half unguarded** | Top-level and telemetry-vs-progress halves mutation-proved. Sibling-vs-sibling half measured to HOLD across all six fields; guarded for 3 of 6. |
| SC-5 | `hashWorld` and core simulation untouched | ✓ VERIFIED **· no standing gate** | `3bf0933..f814dae -- src/core` empty; `hashWorld` no commit in range; read-only contract reds under both a scalar and a typed-array plant. |

**Score:** 5/5 truths hold · **1 behaviour-unverified** (SC-1's join) · 0 failed.

---

## SC-1 — counters from the ring, not from ad-hoc call sites

### The positive half: the chain, end to end

Every counter has exactly one origin and one path:

```
world.evCode/evA/evB/evCount   (the event ring)
  └─ reduceRunTelemetry(world, stats)          src/runtime/runStats.ts
       ← ONE production call site: useGameLoop.ts, inside the substep loop,
         after stepRun and alongside consumeEventsForVfx / appendEventsForAudio
  └─ publishRunStatsMirror(mirror, stats, ticksPlayed)   dirty-checked, bumps runStatsSeq
  └─ useAnimatedReaction on runStatsSeq → runOnJS(applyRunStatsMirror)  (field-by-field copy)
  └─ snapshotRunStats() → buildRunStatsInput(mirror, readRunWallClockMs())
       ← ONE derivation site, ONE call site
  └─ store.recordRunEnd({ ..., stats })   three arms: campaign / endless / daily
```

The six named counters resolve as: `bricksBroken` (BRICK_BREAK events), `bestCombo`
(`world.combo` running max, deliberately ungated by `evCount`), power-ups caught
(POWERUP_CATCH split five ways by `evA`), `livesLost` (LIFE_LOST events — explicitly **not**
`startingLives - world.lives`, because the extra-life pickup raises `world.lives` mid-run),
`ticksPlayed` (`ticksBanked + world.tick`, riding the mirror), and `outcome` (a run-boundary
fact passed to `handleRunEnded`, correctly not a ring event).

Determinism: the reducer is a pure function of `(world, stats)`. Its seven module-level
typed-array scratch buffers are reinitialised per call for every index `< breakCount` and
read only below that bound, so nothing leaks across calls. Zero allocation on the 120Hz
path — no `new`, `[]`, `{}` or `.push` in the function body.

### The negative half: "not from ad-hoc call sites" — what I searched, and how a violation would have shown

A negative claim is only as good as the search. Four independent searches, each of which
would surface a different shape of violation:

| Search | What a violation would look like | Result |
|---|---|---|
| Writes to any of the 11 `RunStats` counter fields anywhere in `src/` + `app/` (regex over `+=`, `-=`, `++`, `=`) | A UI component or overlay incrementing a counter itself | **Only** `publishRunStatsMirror.ts` — ten lines of mechanical `mirror.X = stats.X` mirror copy. Zero elsewhere. |
| Files reading the event ring (`evCode` / `evCount`) | A UI file counting events on its own | 12 files: 7 in `src/core` (the ring's owners), `useGameLoop.ts`, `runStats.ts`, and the two established VFX/audio drains. **No file under `app/` reads the event ring at all.** |
| Calls to `mergeRunIntoTelemetry` / `bumpAggregate` / `mergeAggregates` outside `src/services/storage/` | UI-side aggregation bypassing the store | **Zero.** |
| Construction of a `RunStatsInput` outside `buildRunStatsInput` | A second, divergent derivation of the persisted shape | **Zero.** `buildRunStatsInput` is field-by-field on purpose (never a spread), so `rallyCurrent` cannot leak into the persisted shape and `longestRally`/`bestCombo` cannot be collapsed. |

SC-1's negative claim holds on all four.

### The join — where SC-1 is thin

This is the finding that matters most, because it is the exact defect this phase already
shipped once.

**Measured:** replacing `snapshotRunStats`'s body with
`buildRunStatsInput(createRunStatsMirror(), readRunWallClockMs())` — an all-zero mirror,
reproducing the precise observable signature the UAT recorded (`bricksBroken: 0`,
`ticks: 2`, `livesLost: 0`, `bestCombo: 1`) — leaves the full suite at **112 files / 873
passed | 1 skipped (874), green**. Reverted.

Why nothing catches it:
- The reducer tests exercise `reduceRunTelemetry` directly against a synthetic world.
- The mirror tests exercise `publishRunStatsMirror` directly.
- The storage tests exercise `recordRunEnd` with hand-built `stats`.
- The host tests DO spy on `recordRunEnd` and inspect `mock.calls[0][0]` — but
  `grep -rn "stats:" tests/ui/` returns **zero**. No host test asserts anything about the
  `stats` field's content.
- The regression guard written after the defect —
  `tests/telemetry.runstats-mirror.test.ts` → "PlayingHost reads counters from the mirror
  ref, not from the SharedValue" — is a comment-stripped **regex** over `PlayingHost.tsx`
  asserting `not.toMatch(/runStats\.value/)` and `not.toMatch(/cloneRunStats\(/)`. It pins
  the literal text of the old defect. A functionally identical zeroing passes it.

Each piece is tested. The join is not. Its only evidence is `09-UAT.md`.

UAT gap-item 2 as literally written — "add a regression test that drives a run through
pause → menu via the reset-request path, not just the reducer in isolation" — was not
implemented: `grep -rln "resetRequest" tests/` returns only `tests/runtime.cert-request.test.ts`.
A different and narrower guard was built instead.

---

## SC-2 — lifetime + per level id, surviving an app kill

**Aggregation — holds.** `TelemetryBlob.lifetime` is a 16-field `TelemetryAggregate`;
`byMode.campaign` is `Partial<Record<string, TelemetryAggregate>>` keyed by level id
(`byMode.endless` and `byMode.daily` hold one constant key each). `mergeRunIntoTelemetry`
bumps both on every run, with sum-vs-max semantics per field (`bricksBroken` sums,
`bestComboEver` / `longestRallyEver` / `largestCascadeEver` take running maxima).

**Survival — holds.** Three independent strands:
1. `tests/storage.progress-v4.test.ts` → "lifetime + per-level aggregates survive an app
   kill (SC-2)" — records two runs, serialises, re-parses through the real
   `parseProgressResult`, re-instantiates a store, and asserts identical lifetime and
   per-level aggregates *plus* that the relaunched store accumulates **on top of** the
   restored counters rather than starting a fresh tally (73 → 80 bricks). Non-vacuous.
2. The AsyncStorage-backed suite covers the real device path separately: reads the v4 key
   first, migrates through v3 when absent, falls through to v2/v1 on a corrupt v4, persists
   synchronously on `recordRunEnd`, single-flights overlapping first reads so
   `mergeTelemetryBlobs` never double-counts, and is idempotent on re-read.
3. Device: the UAT read the real blob out of the app container.

Note on strand 1: it round-trips `JSON.stringify(blob)`, which is exactly what
`asyncStorageStore`'s `persist()` hands to `setItem` — so the simulation is faithful to the
real write, though it does not itself cross `AsyncStorage`.

**The unguarded half.** The hydrate path runs through `mergeTelemetryBlobs`, whose
`recentRuns` bound is unguarded, and whose apparent guard cannot fail. Full detail in the
`gaps` block; the short version is that the assertion
`expect(merged.recentRuns.length).toBeLessThanOrEqual(RECENT_RUNS_BOUND)` runs against a
merged array of length **2**, and `2 <= 50` holds with or without the bound. The read-side
bound in `sanitizeTelemetry` is likewise unguarded across the whole suite.

**Closed yesterday, and genuinely closed.** `AGGREGATE_MAP_BOUND = 64` (commit `a1fdba3`,
WINDOWS #27 / `T-09-A1`) bounds `sanitizeAggregateMap` on read, applied keep-first AFTER the
non-object drop so padding garbage cannot evict a real level's aggregate. **Verified by
making it fail:** removing the `if (kept >= AGGREGATE_MAP_BOUND) break;` reds exactly one
case, the 20 000-key one. This is phase 09's code fixed by a later pass, and it is the one
place in the v4 read path where degradation previously went upward.

---

## SC-3 — v3→v4 lossless, with a fixture round-trip

The only criterion with no unguarded half.

`v3ToV4` is a pure structural copy: `unlocked` spread, `bestByLevel` shallow-copied (so
`{ score, stars }` survives intact), `bestScore` and `updatedAt` carried, `telemetry` seeded
from `defaultTelemetryBlob()`. `migrateOrDefault` prefers a valid v4 and otherwise delegates
to the untouched v3/v2/v1 chain and lifts the result — so a corrupt v4 can never block the
older fallbacks.

The fixture round-trip the criterion names exists: "absent/corrupt v4 + valid v3
(`buildV3Fixture`) heals into v4 losing zero unlocked/bestByLevel/bestScore entries — v3ToV4
is lossless".

**Verified by making it fail:** replacing `bestByLevel: { ...v3.bestByLevel }` with `{}` reds
**4** cases, including the lossless one by name and the AsyncStorage-level
"absent v4 migrates through v3 and writes the healed blob to the v4 key". Reverted.

---

## SC-4 — corrupt or partial v4 degrades rather than throwing

**Holds.** `parseProgressResult` gates the top level field by field and returns
`{ status: 'corrupt', progress: defaultProgressBlob() }` on any structural failure, with a
`try`/`catch` around the parse. `sanitizeTelemetry` starts from `defaultTelemetryBlob()` and
assigns field by field, so a v4 blob written before a field existed defaults cleanly with no
version bump. `safeCounter` degrades any non-finite or negative value to 0 and floors the
rest — downward only, which is the declared direction.

**Guarded, where it is guarded.** The two halves the security audit mutation-proved — the
top-level `blob.v !== 4` gate and telemetry-vs-progress independence — are genuinely gated.

**The sibling half: holds, unguarded.** I measured the property directly rather than
inheriting it. A throwaway probe established a 12-value non-default baseline FIRST as an
anti-vacuity control (the first attempt failed on my own fixture — `unlocked: ['level-01',
'level-02']` heals to `['level-01']` under the pre-existing E2 ladder heal in
`sanitizeProgressV3`, which is correct v3 behaviour and not a telemetry defect; fixture
corrected and re-run). Then each of the six telemetry fields corrupted ALONE: **7/7 passed** —
`status` stayed `ok`, every sibling kept its non-default value, and the enclosing progress
fields survived, in all six cases. Probe deleted.

Then the converse: inserting an early `return out` in `sanitizeTelemetry` when
`telemetry.lifetime` is malformed — so one bad field silently discards `byMode`, `endless`,
`daily`, `achievements` and `recentRuns` — leaves the full suite **green**. Reverted.

Sharper than the audit's "zero coverage": the `daily`-vs-siblings and
`achievements`-vs-siblings directions ARE covered by two named cases. `lifetime`, `byMode`
and `recentRuns` as the corrupted field are not.

---

## SC-5 — `hashWorld` and core simulation untouched

Both halves of this are negative claims. Here is what was searched and how a violation would
have shown.

**Net delta.** `git diff --stat 3bf0933..f814dae -- src/core` (milestone open → phase close)
is **empty**. `git log --oneline 3bf0933..f814dae -- src/core/hash.ts` returns nothing —
`hashWorld` was last touched at `55e42c0`, long before v1.2. Re-measured this run.

**An `src/core` change IS present at HEAD — correctly attributed, and not a phase-09 escape.**
`git diff --stat 3bf0933..HEAD -- src/core` shows a 159-line `src/core/rules/brickDamage.ts`
change. It is commit `7539e61`, authored 17 minutes AFTER `f814dae` closed the phase, as its
own standalone commit with a stated reproduction: starting the dev server surfaced
`ReferenceError: Cannot access 'applyBrickHpDamage' before initialization` — a TDZ access from
the `applyBrickHpDamage`/`explodeAtCell` mutual recursion under Metro's ESM→CJS transform,
which neither Vitest nor the iOS Hermes bundle exercises. `git merge-base --is-ancestor`
confirms it is not in the phase range. This is a deliberate, evidence-backed, separately
committed core change by the human — not telemetry participating in the sim.

**Telemetry does not participate in the sim.** `reduceRunTelemetry` runs after `stepRun`
inside the substep loop, reads 20 `world.*` fields and writes zero, never calls `clearEvents`,
and nothing it produces feeds back into the world. Guarded by a real behavioural control:
the whole-world value-snapshot case "never writes to any world.* field". **Verified by making
it fail, twice:** `world.combo = 0;` planted in the reducer reds exactly that case; a
typed-array write `world.brickHp[0] = 99` reds **17** cases — so the guard reaches array
elements, not just scalars. Both reverted.

**The control the register names is not the control.** With `world.combo = 0;` planted,
`node scripts/assert-worklet-closures.mjs` prints `Worklet closure guard OK (130 files)` and
exits **0**; `npx tsc --noEmit` exits **0** too (`World` is mutable by design). Reproduced
independently here. The script's own contract is about worklet directives on called
functions; it says nothing about mutation. The threat is closed — by a different, stronger
control, in a different place.

**The freeze has no standing gate.** `grep -rn "git diff" scripts/ tests/ src/ app/ .github/
| grep -i core` → **zero**. `.github/workflows/ci.yml` has ten steps and none is a
core-freeze check. The register's mitigation ("Task 2's `git diff --stat -- src/core` gate
blocks phase completion if violated") describes a command typed into a plan. Its absence was
demonstrated inside this phase: `3f20563` used `git add -A` and swept the brickDamage rewrite
into a bookkeeping commit whose own message asserted the diff was empty; `9a6a448` backed it
out, its message recording why the gate passed — "I ran it before that commit existed."
Caught by a human reading commit contents, not by a gate.

---

## Behavioural Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full gate green at HEAD | `npm test` | exit 0 · 112 files / 873 passed \| 1 skipped (874) · 8 assert scripts OK | ✓ PASS |
| Types clean | `npm run typecheck` | exit 0 | ✓ PASS |
| Lint | `npm run lint` | `✖ 5 problems (0 errors, 5 warnings)` | ⚠️ see discrepancy below |
| SC-3 guard discriminates | `v3ToV4` bestByLevel emptied → `npx vitest run tests/storage.progress-v4.test.ts` | 4 failed / 54 passed | ✓ PASS (reds) |
| SC-2 read-bound guard discriminates | `AGGREGATE_MAP_BOUND` break removed → `npx vitest run` | 1 failed / 872 passed | ✓ PASS (reds) |
| SC-5 read-only guard discriminates (scalar) | `world.combo = 0;` planted → `npx vitest run` | 1 failed / 872 passed | ✓ PASS (reds) |
| SC-5 read-only guard reaches typed arrays | `world.brickHp[0] = 99` planted → file run | 17 failed / 2 passed | ✓ PASS (reds) |
| SC-5 named control does NOT discriminate | `world.combo = 0;` planted → `node scripts/assert-worklet-closures.mjs` | `OK (130 files)`, exit 0 | ✗ instrument does not reach the claim |
| `mergeTelemetryBlobs` bound guarded? | bound deleted → `npx vitest run` | 112 passed / 873 passed | ✗ UNGUARDED |
| read-side `recentRuns` bound guarded? | bound deleted → `npx vitest run` | 112 passed / 873 passed | ✗ UNGUARDED |
| sibling degrade-alone guarded? | early-return planted → `npx vitest run` | 112 passed / 873 passed | ✗ UNGUARDED |
| sibling degrade-alone HOLDS? | probe: 6 fields corrupted alone vs non-default baseline | 7/7 passed | ✓ PASS (property holds) |
| SC-1 join guarded? | `snapshotRunStats` zeroed → `npx vitest run` | 112 passed / 873 passed | ✗ UNGUARDED |

No `-t` filter was used anywhere in this verification; every measurement above is a full-file
or full-suite run, read on the `passed`/`failed` counts rather than on an exit code.

### Discrepancy against the supplied baseline — stated rather than quietly adopted

`npm run lint` measures **5 problems (0 errors, 5 warnings)** at HEAD, not the 3 I was given.
Attributed by file: 1 in `tests/daily.date-key.test.ts` and 2 in
`tests/ui/PlayingHost.endless-host.test.ts` — those are the 3 of the supplied baseline — plus
**2 new ones in `scripts/assert-levelgen-thread.mjs`** (`'node:fs' imported multiple times`,
`import/no-duplicates`), which is the phase-10 script added yesterday in commit `729abd3`.
The delta is phase 10's, not phase 09's. It still matters to phase 09, because
`09-SECURITY.md` records that CI runs `npm run lint -- --max-warnings 0` fail-fast BEFORE
`npm test`: the warning count that would break the next push to `main` is now 5, not 3.

`npm test` and `npm run typecheck` both reproduce the supplied baseline exactly
(112 / 873 passed | 1 skipped / exit 0, and exit 0).

---

## Requirements Coverage

| Requirement | Description | Implementation status | Checkbox at HEAD |
|---|---|---|---|
| N-STAT-01 | Deterministic counters from the event ring, aggregated lifetime and per level id | ✓ SATISFIED (join proven by device testimony only) | ✗ `- [ ]` unticked |
| N-STAT-02 | v3→v4 lossless for every best score, star and unlocked level; corrupt v4 degrades instead of throwing | ✓ SATISFIED | ✗ `- [ ]` unticked |

Not the repo-wide tooling defect it resembles: phase 12's `N-DAILY-01..03` and phase 13's
`N-ACH-01..03` are all `[x]`. Phase 09's two are not (phase 10's three are not either).

No orphaned requirements: `grep -E "Phase 9" .planning/REQUIREMENTS.md` maps no id to this
phase that a plan did not claim.

---

## Anti-Patterns Found

| File | Symbol | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/runtime/runStats.ts` | `CASCADE_SCRATCH_LEN`, `ringCap` | Constant hand-copied twice, named in a comment, imported by nobody | ⚠️ Warning | Correctness drift; safe failure direction (undercount) |
| `tests/telemetry.runstats-mirror.test.ts` | "PlayingHost reads counters from the mirror ref" | Source-text regex standing in for a behavioural guard | ⚠️ Warning | Pins the old defect's literal text, not its behaviour |
| `tests/storage.progress-v4.test.ts` | "mergeTelemetryBlobs … bounds recentRuns by timestamp" | Assertion that cannot fail (`2 <= 50`) under a name that claims a bound | ⚠️ Warning | WINDOWS #33 / #26 family |
| `docs/ops/PROGRESS-STORAGE.md` | § Storage keys / § Migrate / § Fail-soft | Documentation describing a superseded version | ⚠️ Warning | The trust boundary three later phases read |

**Debt markers:** zero `TBD` / `FIXME` / `XXX` in any file this phase modified.

---

## Gaps Summary

Nothing is broken. Every success criterion holds, and three phases of downstream work have
been reading this phase's storage successfully. What this verification found is a consistent
gap between what the artifacts *claim is enforced* and what is *actually enforced* — the same
instrument-fidelity failure this project has been caught on twelve times in four phases, and
four more times here.

Ranked by what it would cost to be wrong:

1. **SC-1's host→storage join has no test.** This is the exact defect that shipped, was caught
   only by a human reading the on-disk blob on a simulator, and is today guarded by a regex
   over the literal string `runStats.value`. Zeroing the counters passes 874 tests. Every
   achievement, statistic and future balance decision in this milestone reads these numbers.
   One host assertion closes it.
2. **Four properties hold that nothing guards** — the `mergeTelemetryBlobs` bound (whose only
   assertion cannot fail), the read-side `recentRuns` bound, sibling degrade-alone for three of
   six telemetry fields, and the `src/core` freeze (which already escaped once, in this phase).
   All four were proved unguarded here by removing them.
3. **`docs/ops/PROGRESS-STORAGE.md` still documents v3.** Phase 09 wrote zero lines of it. That
   is the mechanism by which WINDOWS #27 sat unowned across three phases, and Phase 14 is next
   in line — inheriting both the stale doc and `T-09-A2`'s unbounded `recentRuns[].levelId`.
4. **Two requirement checkboxes are unticked** while the roadmap marks the phase complete.

The correct next step is not a re-plan. It is a small, targeted gap-closure pass — one host
assertion, three test cases that can actually fail, one `constants.parity` row, one doc
section — plus a human decision on which of the unguarded properties earn a standing gate.

---

## Verifier Hygiene

Ten mutations applied to the real tree; every one reverted. One probe file
(`tests/__verify09_probe.test.ts`) written and deleted. Confirmed after the last probe:
`git status --porcelain` reads `M .planning/config.json`, `?? .planning/milestone.lock`,
`?? .planning/state.json` — **byte-identical to the state at the start of this verification**
— and `git diff -- src app tests scripts docs eslint.config.js package.json` is **empty**.
Final `npm test` re-run after reverting: exit 0.

All citations in this report name **symbols, commands and commit hashes, never line numbers** —
this repository's line citations have drifted four times, most recently in this phase's own
`types.ts`.

---

_Verified: 2026-09-29 · at HEAD `a2a17c2`_
_Verifier: Claude (gsd-verifier)_

---

## Disposition (orchestrator, 2026-09-29)

Acting on this report edited files inside its own `covered_files`, which mechanically re-stales it.
That is this report's own consequence, not a second round.

### The new finding — the host→storage join — is real and is now pinned

**Reproduced before being accepted, and my first attempt was wrong.** I mutated
`snapshotRunStats` to call a `defaultRunStatsMirror()` that does not exist; it threw a
`ReferenceError` and red 55 tests across 4 files. That measured nothing and was discarded rather
than reported as a refutation. The valid form — replacing each field of `buildRunStatsInput`'s
return literal with `0`, `void raw;` to keep the compiler quiet — typechecks clean and leaves
**112 files / 873 passed | 1 skipped green**, exactly as the verifier reported.

**Closed by `814565a`**, a case in `tests/ui/PlayingHost.daily-run.test.tsx`. Two things had to be
built for it, and both are why the join went untested for four phases:

- **Nothing in jsdom drives the UI→JS hop.** The host reads a ref refreshed by a
  `useAnimatedReaction` on `runStatsSeq`; the worklet never runs. A `publishRunStats` helper now
  fires that reaction the way the worklet's seq bump does.
- **The `useGameLoop` mock rebuilt `runStatsOut` on every render**, so no test could reach it.
  Hoisted to module scope beside `setActive`.

The case asserts **transport, not non-emptiness**: seven distinct values must arrive unchanged
*and* a counter the run never incremented must stay `0`, so mapping every field to a constant would
not pass it. Red-proved both ways — zeroing `bricksBroken` alone reds it with the intended message,
and the full seven-field zeroing that previously left the suite green now reds exactly one test of
875.

### The lint reading was mine, and it was wrong in a way that mattered

This report measured **5** warnings against the **3** I supplied. Both numbers were right about
different trees: two warnings were in `scripts/assert-levelgen-thread.mjs`, which I had committed
hours earlier with a duplicated `node:fs` import. Fixed in `7f80a30`.

Chasing the other three found the larger problem, and it is a correction to something I repeated to
four subagents this session. I have been calling `✖ 3 problems (0 errors, 3 warnings)` at exit 0
"the clean baseline". That is true of `npm run lint`. **It is not the command CI runs:**
`.github/workflows/ci.yml` runs `npm run lint -- --max-warnings 0`, which **exits 1** on this tree.
CI last ran 2026-09-25 at the phase-09 merge; both warning sites landed after it, so phases 10–13
accumulated behind a gate nothing had exercised. All three were `ReadonlyArray<T>` annotations on
local consts, none inside the region `PlayingHost.endless-host.test.ts`'s source-contract extractor
slices out — checked before editing rather than trusting `--fix`. Every CI step now passes,
including the coverage floor at **83.94%** lines against 40%.

### Recorded, not resolved

- The four unguarded-but-holding properties this report measured — the `mergeTelemetryBlobs` bound
  (whose only assertion is a `toBeLessThanOrEqual(RECENT_RUNS_BOUND)` against a length of **2**, a
  gate that cannot fail), the read-side `recentRuns` bound, the sibling degrade-alone property for
  `lifetime`/`byMode`/`recentRuns`, and the `src/core` freeze. Each holds; nothing would catch its
  removal. The verdict stays `human_needed` on that basis and the annotations above the score are
  the part to read.
- `EVENT_RING_CAPACITY` has no production importer while `runStats.ts` hard-codes `128` twice —
  the same shape as phase 13's `ACHIEVEMENT_LINES_MAX`, which was found the same way.
- `docs/ops/PROGRESS-STORAGE.md` still describes **v3** in § Storage keys / § Migrate / § Fail-soft
  (`T-09-A3`: phase 09 wrote zero lines of it).
- `N-STAT-01` / `N-STAT-02` are unticked in `REQUIREMENTS.md`, and this report is right that it is
  **not** the known tooling defect, since phases 12 and 13 ids are ticked.

### Post-disposition gates

`npm test` exit **0** at **112 files / 874 passed | 1 skipped (875)**. `npm run typecheck` exit 0.
`npm run lint -- --max-warnings 0` exit **0**. Verdict **unchanged: `human_needed`**.
