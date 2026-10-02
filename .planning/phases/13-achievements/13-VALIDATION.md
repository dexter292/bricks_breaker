---
phase: "13"
slug: "achievements"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# Left at `draft` deliberately: the per-task map below was FILLED IN by plan 13-05 Task 2 from
# the four sibling SUMMARYs and from commands re-executed on the landed tree, but only
# `/gsd-validate-phase` §6 may set `validated`. Filling the map is not the same act as validating
# the phase, and claiming otherwise here would be the "a gate that does not exist" failure this
# project has produced three times.
status: draft
# TRUE, and scoped: every row in § Per-Task Verification Map now carries an EXECUTED automated
# command with a status measured on 2026-09-28 against the tree with all four sibling plans
# landed. It does NOT cover § Manual-Only Verifications — those four items have no automated
# command anywhere in this repository (jsdom performs no layout and supplies no safe-area
# insets), they are `backstop`-classified by 13-UI-SPEC.md, and they are routed to the
# end-of-phase human batch rather than sampled. Read the sign-off before citing this flag.
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-28"
filled_in: "2026-09-28"
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **No `13-RESEARCH.md` exists** — research was deliberately skipped because this phase has no
> unknown outside the repo. This file was therefore written by the orchestrator from the shipped
> test infrastructure and `13-CONTEXT.md`, not seeded from a researcher's § Validation
> Architecture. Task IDs were filled in by plan **13-05 Task 2**, from the four sibling SUMMARYs
> and from every command re-executed on the landed tree.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.1 — already installed, nothing to add |
| **Config file** | `vitest.config.ts` — `environment: 'node'`, include `['src/core/**/*.test.ts', 'tests/**/*.test.ts', 'tests/**/*.test.tsx']`, `resolve.alias` maps `react-native` → `react-native-web` |
| **UI environment** | per-file docblock `@vitest-environment jsdom` — **not** global |
| **Quick run command** | `npx vitest run tests/achievements` |
| **Full suite command** | `npm test` (`vitest run` + **five** `assert-*.mjs` scripts) |
| **Measured runtime** | pre-phase: ~10s for `vitest run` at 107 files / 798 tests. **Re-measured 2026-09-28 at phase close: `Duration 10.24s` at 112 files / 869 tests; the quick run is `259ms`. Re-measured again after the code-review fixes: 112 files / 871 tests** |

**Three gates are load-bearing this phase and are not optional:**

- `npm run typecheck` — the catalog is data with a declared type; a predicate with the wrong
  snapshot shape is a compile error, not a test failure.
- `npm run lint` — `boundaries/dependencies` in `eslint.config.js` is **the only thing** stopping
  `ResultOverlay` / `DailyResultOverlay` importing `src/services` (D-08). No unit test observes
  it. This is stated as fact, not as a gate someone should assume exists.
- `npm test` — it chains five `assert-*.mjs` scripts, including `assert-streak-evidence.mjs`
  added on 2026-09-28.

**A fourth gate was needed and is recorded here because it is not obvious.** `npm run lint`
ENFORCES the `src/services/achievements/**` purity block (D-03 / D-20) but **does not observe
whether that block still exists** — measured twice, both directions, on this tree. The command
that observes its presence is the `__purity_probe` gate: a throwaway probe file written into
`src/services/achievements/`, linted, and deleted in one command. See the DURING-phase bindings
below for the measured numbers.

---

## Bindings measured before this phase starts

Stated here so a plan cannot restate them wrongly. Each was measured in this session.

| Binding | Value | Why it matters |
|---|---|---|
| A `-t`-filtered vitest gate | binds on the presence of **`passed`** | The exit code is 0 for a non-matching filter, and a *matching* filter on a multi-case file prints `Tests 2 passed \| 22 skipped (24)` — so neither the exit code nor the word `skipped` discriminates |
| `npm run lint` base | exit 0, `✖ 3 problems (0 errors, 3 warnings)` | Bind lint gates on the **exit code**; eslint prints `0 errors` on every clean run |
| `npm test` base | exit 0, **107 files / 798 tests** | If it is red before a task starts, stop and report — do not attribute it to the task |
| `npx vitest run tests/achievements` before Wave 0 | exit 1, `No test files found` | A green run of this command is itself the evidence the files now exist |

## Bindings measured DURING this phase, each by the plan that hit it

Added at phase close. These are not restatements of the table above — each one is a way a gate in
this phase was measured to be **unable to fail**, which is why it is recorded as a binding rather
than as an anecdote.

| Binding | Measured by | The measurement |
|---|---|---|
| `-t` is case-**SENSITIVE**, and a case mismatch is indistinguishable from success | 13-03 (deviation 2), re-measured on three files by 13-04 | `-t "earliest"` against a case named `EARLIEST` printed `Tests 24 skipped (24)` and **exited 0**. 13-04's controls: `-t "CAPS AT TWO"` → `13 skipped (13)`, `-t "NO RUN"` → `8 skipped (8)`, `-t "ACHIEVEMENT"` → `27 skipped (27)`, all exit 0. The table above covers a wrong WORD; this covers wrong CASE, and the failure is silent either way |
| A grep gate cannot tell a comment from an AST node — **four instances this phase** | 13-01 (deviation 3), 13-02 (pre-empted), 13-03, 13-04 | `grep -c 'numberOfLines={1}'` printed **2** because the JSDoc explaining the attribute spelled it; a `byMode` map-index form in `catalog.ts` prose would have tripped the "no predicate names a key literally" check; `grep -cE "react\|testing-library\|safe-area" tests/ui/achievementLines.test.ts` prints **1** from an assertion message, not an import. **A gate over an import surface must read `^import` lines; a gate over a rule must read declarations** |
| `npm run lint` is green with the purity block **ABSENT** | 13-01, re-measured by 13-05 Task 2 in both directions | With the block shipped: `purity_probe_errors=5`. With lines 163–229 deleted on a scratch copy of `eslint.config.js`: `purity_probe_errors=0`. `npm run lint` exits 0 either way. The shipped config was not mutated — `git diff --exit-code -- eslint.config.js` clean, scratch copy deleted |
| Three of four `TelemetryBlob` sites are compiler-forced; the parser is not | pre-phase measurement, confirmed by 13-01 and 13-03 | Adding the field reds `defaultTelemetryBlob` (`types.ts`), `mergeTelemetryBlobs` and `cloneTelemetryBlob` (`telemetry.ts`). `sanitizeTelemetry` (`parseBlob.ts`) is **absent** from that list, which is exactly how the write path shipped in 13-01 with the read path still missing and every gate green |

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/achievements && npm run typecheck`
- **After every plan wave:** `npm test && npm run typecheck && npm run lint`
- **Before `/gsd-verify-work`:** full suite green, and every device-verification item below
  either resolved or explicitly routed to human verification
- **Max feedback latency:** MEASURED at phase close — `259ms` (`tests/achievements` quick run),
  `10.24s` (`vitest run`, 112 files), well inside the 70s budget

**What actually happened, recorded rather than assumed.** The per-wave combination was NOT run by
every plan, by design: 13-02 declined it (a tree-wide run for a two-file change, duplicating
13-05's), 13-04 declined it and ran `tests/ui/` whole in its place, 13-03 DID run `npm test` and
reported 111 files / `847 passed | 1 skipped (848)`. The **authoritative** tree-wide run with all
four siblings landed is 13-05 Task 2's, below. A full-suite run inside a shared wave observes a
sibling's half-applied edits, which is the reason for the deferral.

---

## Per-Task Verification Map

**Filled in by 13-05 Task 2.** Every command below was **EXECUTED on 2026-09-28** against the tree
with 13-01 through 13-04 landed, and the Status column is that run's result — not the plan's
prediction. Where a plan's executed command differs from the command this map predicted, the
**executed** command is recorded and the change is noted beneath the table: an index that names a
command nobody ran is worse than no index.

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command (EXECUTED) | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| T1 | 13-02 | 2 | N-ACH-01 | N/A | unit (node) | `npx vitest run tests/achievements.catalog.test.ts -t "every entry is data"` | ✅ | ✅ `1 passed \| 5 skipped (6)` |
| T1 | 13-02 | 2 | N-ACH-01 | predicate is pure | unit (source contract) | `npx vitest run tests/achievements.catalog.test.ts -t "no clock no storage"` | ✅ | ✅ `1 passed \| 5 skipped (6)` |
| T1 | 13-02 | 2 | N-ACH-01 | N/A | unit (node) | `npx vitest run tests/achievements.catalog.test.ts -t "ids unique"` | ✅ | ✅ `1 passed \| 5 skipped (6)` |
| T1 | 13-02 | 2 | N-ACH-01 (D-11) | N/A | unit (node) | `npx vitest run tests/achievements.catalog.test.ts -t "name within 16 chars"` | ✅ | ✅ `1 passed \| 5 skipped (6)` |
| T2 | 13-02 | 2 | N-ACH-02 | N/A | unit (node) | `npx vitest run tests/achievements.evaluate.test.ts -t "same snapshot twice"` | ✅ | ✅ `1 passed \| 4 skipped (5)` |
| T2 | 13-02 | 2 | N-ACH-02 | idempotent by set difference | unit (node) | `npx vitest run tests/achievements.evaluate.test.ts -t "does not re-fire"` | ✅ | ✅ `1 passed \| 4 skipped (5)` |
| T2 | 13-02 | 2 | N-ACH-02 (D-04) | N/A | unit (node) | `npx vitest run tests/achievements.evaluate.test.ts -t "retroactive"` | ✅ | ✅ `1 passed \| 4 skipped (5)` |
| T2 | 13-02 | 2 | N-ACH-02 | hostile snapshot degrades | unit (node) | `npx vitest run tests/achievements.evaluate.test.ts -t "hostile snapshot"` | ✅ | ✅ `1 passed \| 4 skipped (5)` |
| T1 | 13-03 | 3 | N-ACH-02 (D-13) | additive field, no version bump | integration | `npx vitest run tests/storage.progress-v4.test.ts -t "written before the achievements record existed"` **(command corrected — note A)** | ✅ | ✅ `1 passed \| 54 skipped (55)` |
| T1 | 13-03 | 3 | N-ACH-02 (D-15) | unknown id dropped on read | integration | `npx vitest run tests/storage.progress-v4.test.ts -t "never minted"` **(file corrected — note B)** | ✅ | ✅ `1 passed \| 54 skipped (55)` |
| T1 | 13-03 | 3 | N-ACH-02 (D-15) | **degrades alone** — campaign/endless/daily untouched | integration | `npx vitest run tests/storage.progress-v4.test.ts -t "a fully corrupt achievements field"` **(file corrected — note B)** | ✅ | ✅ `1 passed \| 54 skipped (55)` |
| T1 | 13-01 | 1 | N-ACH-02 (D-14) | timestamp persists | integration | `npx vitest run tests/achievements.record.test.ts -t "unlocks, persists and reports it"` **(command corrected — note C)** | ✅ | ✅ `2 passed \| 22 skipped (24)` — one per store |
| T2 | 13-03 | 3 | N-ACH-02 (D-22) | **merge keeps the EARLIEST timestamp**, asserted as commutativity | integration | `npx vitest run tests/achievements.record.test.ts -t "earliest"` **(row added — note D)** | ✅ | ✅ `2 passed \| 22 skipped (24)` |
| T1 + T2 | 13-01, 13-03 | 1, 3 | N-ACH-02 | **both hand-mirrored stores agree** | integration | `npx vitest run tests/achievements.record.test.ts --reporter=verbose` | ✅ | ✅ `23 passed \| 1 skipped (24)` — the skip is note E |
| T1a | 13-04 | 3 | N-ACH-03 (D-05) | cap is a component property | unit (node) | `npx vitest run tests/ui/achievementLines.test.ts -t "caps at two"` **(type verified — note F)** | ✅ | ✅ `2 passed \| 11 skipped (13)` |
| T1a | 13-04 | 3 | N-ACH-03 (D-05) | N/A | unit (node) | `npx vitest run tests/ui/achievementLines.test.ts -t "and n more"` | ✅ | ✅ `1 passed \| 12 skipped (13)` |
| T1 + T2 | 13-01, 13-04 | 1, 3 | N-ACH-03 (D-06) | N/A | integration (jsdom) | `npx vitest run tests/ui/ResultOverlay.achievements.test.tsx` | ✅ | ✅ `8 passed (8)` — 4 from 13-01, 4 from 13-04 |
| T1b + T2 | 13-04 | 3 | N-ACH-03 (D-06) | N/A | integration (jsdom) | `npx vitest run tests/ui/DailyResultOverlay.test.tsx -t "achievement"` | ✅ | ✅ `3 passed \| 24 skipped (27)` |
| T1 | 13-01 | 1 | N-ACH-03 (D-08) | **panel takes scalars, not a storage type** | lint | `npm run lint` | ✅ | ✅ exit **0**, `✖ 3 problems (0 errors, 3 warnings)` — note G |
| T1 | 13-01 | 1 | N-ACH-01 (D-03 / D-20) | **the purity block still EXISTS** | lint probe | the `__purity_probe` gate (write probe → `npx eslint` → `rm -f`) | ✅ | ✅ `purity_probe_errors=5` **(row added — note H)** |
| T1 | 13-02 | 2 | N-ACH-03 (D-12) | catalog covers all three modes | unit (node) | `npx vitest run tests/achievements.catalog.test.ts -t "three modes"` | ✅ | ✅ `1 passed \| 5 skipped (6)` |
| T2 | 13-04 | 3 | SC-4 (D-07) | suppression on the no-run states | integration (jsdom) | `npx vitest run tests/ui/ResultOverlay.achievements.test.tsx -t "no run"` | ✅ | ✅ `1 passed \| 7 skipped (8)` |
| T1 | 13-01 | 1 | N-ACH-02 (D-01 / D-12) | **evaluation sits outside every mode gate** — the tracer's primary end-to-end | integration | `npx vitest run tests/achievements.record.test.ts -t "every mode unlocks the same achievement"` **(row added — note I)** | ✅ | ✅ `2 passed \| 22 skipped (24)` |
| T1 | 13-01 | 1 | N-ACH-02 (D-19) | the host receives the delta and never a stale array | integration (jsdom) | `npx vitest run tests/ui/PlayingHost.daily-run.test.tsx` **(row added — note I)** | ✅ | ✅ `14 passed (14)` |
| T1, T1b | 13-01, 13-04 | 1, 3 | N-ACH-03 (D-06) | the prop reaches **both** arms of the `showResult` route | typecheck ONLY | `npm run typecheck` **(row added — note J; the gap is real and named)** | ✅ | ⚠️ exit **0**, but see note J |
| T1 | 13-01 | 1 | N-ACH-02 | the storage barrel re-exports the new names | integration + typecheck | `npx vitest run tests/achievements.record.test.ts` (imports through `../src/services/storage`) **(row added — note I)** | ✅ | ✅ `23 passed \| 1 skipped (24)` |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ green-but-qualified · ⚠️ flaky*

### Notes on the corrections above

**A — the D-13 row's filter was widened to a phrase that binds.** The predicted filter was
`tests/storage.progress-v4.test.ts -t "achievements"`. That matches the `sanitizeAchievementRecord`
describe block and therefore its whole nine-case body, not the no-migration claim the row is about.
Replaced with the case's own phrase. The predicted form was not vacuous, only imprecise.

**B — two rows named the wrong FILE, and as written they were vacuous.** The map predicted
`tests/achievements.record.test.ts -t "unknown id"` and `… -t "degrades alone"`. **Neither case name
exists in that file** — the unknown-id drop and the independent-degradation claim both live in
`tests/storage.progress-v4.test.ts`, where 13-03 Task 1 put the sanitizer's own battery. Both
predicted commands would have printed `Tests 24 skipped (24)` at **exit 0**: the exact silent
non-binding the case-sensitivity binding above describes, reached through a wrong file rather than
wrong case. Corrected to the executed commands.

**C — the D-14 row's `-t "timestamp"` was replaced with the case that actually asserts
persistence.** `-t "timestamp"` binds (three cases × two stores), but it sweeps in the idempotency
case and the cross-wiring case alongside the persistence one, so a green result did not say which
claim held. The narrower filter names the case that persists and reports a timestamp.

**D — a row was ADDED for D-22.** The map had no row for the merge tiebreak, which is the one claim
13-03 records as catchable by no other shipped test. It also earned its own binding: the case as the
plan specified it was **measured passing against a deliberately inverted, last-writer-wins merge**,
and only asserting BOTH argument orders binds the rule.

**E — the one skipped test in the whole tree is a designed non-applicability, not deferred work.**
`tests/achievements.record.test.ts` skips the cold-start case **for the memory store only**, with
the reason in the test name: the store has no disk, so a second store over the same bytes is the
same object in RAM and the case would pass without asserting persistence. The AsyncStorage store's
equivalent case runs and passes. It is deliberately **not** filed in `.planning/WINDOWS.md` — the
`skipped-test` kind is for a skip *left behind*, and filing this would block `/gsd-ship` on a
non-defect. **Do not "fix" it.**

**F — the `achievementLines` row's test type was ALREADY correct, and this is recorded rather than
restated as a fix.** The pattern map flagged it as mistyped `unit (jsdom)`. On the seeded file it
already read `unit (node)`, and the § Wave 0 Requirements bullet below already carried the
correction with its `certLevelPlan` reasoning. Verified independently against the shipped file
rather than trusted: `head -3 tests/ui/achievementLines.test.ts | grep -c 'vitest-environment jsdom'`
prints **0**, and line 2 of that file reads `@vitest-environment node`. The subject is a pure
function with no React and no DOM, `vitest.config.ts` runs `node` by default, and the shipped
precedent is `tests/ui/certLevelPlan.test.ts`. Every `achievementLines` row is typed `unit (node)`.

**G — bind the lint rows on the EXIT CODE, never on the substring `error`.** eslint prints
`0 errors` on every clean run. The 3 warnings are the shipped base and were not cleared, because
four gates in this phase bind against that number. **One correction to the dispatch's own figure:**
the three warnings are **not** all in `tests/ui/PlayingHost.endless-host.test.ts` — measured, two
are there (`386:24`, `391:25`) and the third is in `tests/daily.date-key.test.ts` (`106:18`). All
three are the same `@typescript-eslint/array-type` rule. The count of 3 is unchanged.

**H — a row was ADDED for the purity block's own existence,** because the D-08 lint row above does
**not** cover it and no unit test does either. `npm run lint` enforces the block and is green with
it absent; the probe is the only command whose output moves. Recorded as its own row so a later
reader cannot take the green lint row as evidence for D-03 / D-20.

**I — four rows were ADDED for coverage the map did not anticipate,** as the pattern map found:
`src/runtime/GameScreen.tsx` (note J), `src/services/storage/index.ts`,
`tests/ui/PlayingHost.daily-run.test.tsx` (the host-wiring target) and
`tests/achievements.record.test.ts`'s three-mode case (the tracer's primary end-to-end).

**J — `src/runtime/GameScreen.tsx`'s achievements threading has NO behavioural test, and this row
says so rather than implying one.** MEASURED: `grep -cin "achiev" tests/ui/GameScreen.test.tsx`
prints **0**. The only automated observers are `npm run typecheck` (the prop must exist on
`ResultOverlay` and on `DailyResultOverlay` and both arms must accept it — which is a real gate:
13-01 could not wire an arm to a prop the component did not declare) and `npm run lint` (the
boundary). The two panel suites render the overlays **directly**, not through `GameScreen`. So the
claim "the prop reaches both arms of the `showResult` route" is compiler-checked and
behaviourally unobserved. Status is ⚠️ rather than ✅ for that reason. Closing it means a
`GameScreen`-level render case, which no plan in this phase owned.

**Non-vacuity rule, inherited from phases 11 and 12 and not optional here.** Every absence
assertion must be paired with a positive control proving the thing it asserts the absence of can
actually appear. An achievements suite that only asserts "campaign bests untouched" passes
trivially when the achievement write was dropped altogether — the exact trap
`tests/storage.daily-firewall.test.ts` was rebuilt to close. **Honoured:** 13-04 red-proved eleven
mutations and put a positive control inside each absence case; 13-03 probed four deliberately
broken implementations before trusting its new cases and threw the probes away; 13-02 made its
hostile-snapshot non-vacuity guard a property of the SET of variants so adding a variant cannot
make the loop toothless.

---

## Wave 0 Requirements

Every file below was new. **No framework install was needed.** All seven verified present on disk
at phase close (`[ -f ]` on each).

- [x] `tests/achievements.catalog.test.ts` — N-ACH-01: data shape, purity, unique ids, the 16-char name budget, three-mode coverage. **Shipped with 6 cases** (13-02 T1)
- [x] `tests/achievements.evaluate.test.ts` — N-ACH-02: determinism, idempotency as a set difference, retroactive unlock, hostile snapshot. **Shipped with 5 cases**, including a `throwing predicate` case beyond the plan's list (13-02 T2)
- [x] `tests/achievements.record.test.ts` — the read/write path: unknown id dropped, timestamps, independent degradation, **both stores asserted separately**. Created by 13-01 T1 with 14 cases, two premises repaired by 13-02 T1, extended to **24 cases** by 13-03 T2
- [x] `tests/ui/achievementLines.test.ts` — the shared pure classifier: cap at 2, the `and n more` form, ordering. **`.ts` under the node environment, not jsdom** — corrected 2026-09-28 from the `certLevelPlan` precedent the pattern map found: a pure classifier needs no DOM, and typing it jsdom would have bought a renderer it never uses. **Shipped with 13 cases** (13-04 T1a), node environment verified by measurement (note F). **14 as of the code review**: WR-02's fix added a comment-stripping source scan, because the cap constant is a no-op at its shipped value and no black-box case can observe it
- [x] `tests/ui/ResultOverlay.achievements.test.tsx` — the campaign/endless panel block and its suppression states. 4 cases from 13-01 T1, 4 more from 13-04 T2, **8 total**

Extended rather than created:
- [x] `tests/storage.progress-v4.test.ts` — an achievements sanitizer block mirroring the daily one. 46 → **55 cases** (13-03 T1)
- [x] `tests/ui/DailyResultOverlay.test.tsx` — the same block on the daily panel. 23 → **27 cases** (13-04 T1b, T2)

---

## Manual-Only Verifications

Four items no test in this repository can reach. **jsdom performs no layout and supplies no
safe-area insets**, so no `render()` assertion is evidence for any of them — and **none of them was
discharged by any plan in this phase.** `workflow.human_verify_mode` is `end-of-phase` on this
project, so plan 13-05 Task 3 defers them through `<verify><human-check>` blocks that the verifier
harvests into `13-UAT.md` and a human answers in one batch. No row below is deleted because a
jsdom test now exists near it, and no row is marked done.

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| **`ResultOverlay` vertical fit — the binding case** | N-ACH-03 | The whole row budget derives from it, and no prior phase registered a backstop for this panel | 320×568pt, campaign win, 3 stars + `New Record` + `Retry` + `Next` + `Menu`, with 2 achievement rows. **Confirm the safe-area INSETS, not just that it fits** — 548px usable assumes a bottom inset of zero; if it is non-zero the 26px spare goes negative and `ACHIEVEMENT_LINES_MAX` must drop to 1. Reachable only via Display Zoom on an iPhone 8 / SE 2nd / SE 3rd (deployment target 16.4) | **WINDOWS #28 — OPEN. Routed to end-of-phase human verification.** Not discharged; nothing automated in this repo can discharge it |
| `DailyResultOverlay` vertical fit with the block added | N-ACH-03 | Same; extends the already-open backstop | 320×568pt, fully-populated daily panel + 2 achievement rows, `Menu` visible without scrolling. **WINDOWS #17 is ANNOTATED, not superseded** — its 456px is 2px low (corrected to 458) and its "11 rows" is a defensive bound, real contracted max 10. Phase-13 figures: 490px contracted, 522px against the 11-row bound | **WINDOWS #17 — OPEN. Routed to end-of-phase human verification.** Not discharged |
| Horizontal fit of a 16-character achievement name | N-ACH-03 | Font metrics computed, never observed on a rendered panel | 320px panel, `Unlocked · {name}` with a **16-character** name — the shipped catalog's longest is `Flawless Clear` at **14**, so the check must temporarily lengthen one name to 16; confirming at 14 does **not** verify the budget. Extends WINDOWS #16 | **WINDOWS #16 — OPEN. Routed to end-of-phase human verification.** Not discharged. The paired control that needs no layout (`name within 16 chars`) is green; this is the half that needs layout |
| Dynamic Type at iOS xLarge | N-ACH-03 | Not reachable under jsdom | 320×568pt with text size raised one step above default (≈1.118 against a computed ceiling of 1.102). **Expected to clip** — this is D-18's recorded deferral, due at Phase 14, not a new defect to file (WINDOWS #29) | **WINDOWS #29 — OPEN, owner decision, DUE Phase 14. Routed to end-of-phase human verification.** Confirming the clipping is the CORRECT outcome; marking it fixed would record a deferral as a repair |

---

## Validation Sign-Off

Ticked only where true. Each unticked box carries its reason on the line below it, rather than
being quietly ticked to make the file look finished.

- [x] **All tasks have `<automated>` verify or Wave 0 dependencies** — every task across 13-01
      (1), 13-02 (2), 13-03 (2), 13-04 (3) and 13-05 (3) carried at least one `<automated>` block,
      and all of them were re-executed at each plan's close-out.
- [x] **Sampling continuity: no 3 consecutive tasks without automated verify** — no task in the
      phase lacks one, so the run of zero is never reached.
- [x] **Wave 0 covers all MISSING references** — all five created files and both extended files
      exist on disk and are green; see § Wave 0 Requirements, each box verified with `[ -f ]`.
- [x] **No watch-mode flags** — every command in this file is `vitest run`, `npx eslint`, or an
      `npm run` script. Verified by reading the map: no `--watch`, no bare `vitest`.
- [x] **Feedback latency < 70s** — MEASURED at phase close: `259ms` for the quick run and
      `10.24s` for `vitest run` at 112 files. `npm test` adds five `assert-*.mjs` scripts on top
      and still completes well inside the budget.
- [x] **`nyquist_compliant: true` set in frontmatter** — set, **and scoped in the frontmatter
      comment rather than left bare.** It means: every row in § Per-Task Verification Map carries
      an executed automated command with a status measured on the landed tree. It does **not**
      mean the four § Manual-Only items are covered — they have no automated command anywhere in
      this repository and are routed to a human. Two qualifications a reader should carry:
      (a) one row is ⚠️ rather than ✅ because `GameScreen`'s threading is compiler-checked and
      behaviourally unobserved (note J), and (b) three of the original twenty rows named a command
      that would not have bound — two of them vacuously, at exit 0 — and were corrected here
      (notes A, B, C). The flag describes the map as it now reads, not as it was seeded.

**Not ticked, because it is not this file's to tick:**

- [ ] `status: validated` — only `/gsd-validate-phase` §6 sets it. Plan 13-05 Task 2 filled this
      map in; that is a different act from validating the phase, and conflating the two is the
      "claimed a gate that does not exist" failure this project has produced three times.

**The authoritative tree-wide gate, run once by 13-05 Task 2 with all four siblings landed:**

| Gate | Result | Base |
|---|---|---|
| `npm run typecheck` | exit **0**, `error TS` count **0** | exit 0 |
| `npm run lint` | exit **0**, `✖ 3 problems (0 errors, 3 warnings)` | 3 warnings — unchanged |
| `__purity_probe` | **`purity_probe_errors=5`**; probe file removed; `0` on a scratch config with the block deleted | 5 with the block, 0 without |
| `npm test` | exit **0**, `Test Files 112 passed (112)`, `Tests 868 passed \| 1 skipped (869)`, all five `assert-*.mjs` OK. **Post-code-review: `Tests 870 passed \| 1 skipped (871)`** — the two added cases are WR-02's source scan and WR-01's cross-mode leak case | pre-phase 107 files / 798 tests |
| `npx vitest run tests/achievements` | `Test Files 3 passed (3)`, `Tests 34 passed \| 1 skipped (35)` | exit 1, `No test files found` |

**Approval:** the automated half is complete and green. The four device and layout items above are
**outstanding** and routed to the end-of-phase human batch; this phase ships knowing which of its
numbers is still an assumption.
