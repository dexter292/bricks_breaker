---
phase: 9
slug: run-telemetry-storage-v4
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-25
updated: 2026-09-25
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `09-RESEARCH.md` § Validation Architecture; task/wave numbering finalized during
> planning to match the 5 plans actually produced (00–04). See `09-01-PLAN.md` through
> `09-04-PLAN.md` for the full per-task `<action>`/`<verify>`/`<acceptance_criteria>` detail —
> this file tracks sampling cadence and status, not implementation detail.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (`vitest.config.ts`, `environment: 'node'`) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/telemetry.reduce-run-events.test.ts tests/storage.progress-v4.test.ts` |
| **Full suite command** | `npm test` (vitest + assert-worklet-closures + assert-level-solvability + assert-eas-profiles + assert-brand-name) |
| **Estimated runtime** | ~2s quick · ~25s full |

Baseline at phase start: **79 test files / 403 tests green**, typecheck and lint clean.

`tests/helpers/balanceBot.ts` is the proven pattern for this phase's hardest claim: it
drives `stepRun` headlessly in Node with explicit seeds, no RN or Skia. Telemetry counter
assertions use the same harness shape.

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/telemetry.reduce-run-events.test.ts tests/storage.progress-v4.test.ts`
- **After every plan wave:** `npm test`
- **Before `/gsd:verify-work`:** full suite green, typecheck and lint clean
- **Max feedback latency:** ~25 seconds

---

## Plan / Wave Structure (finalized)

| Plan | Wave | Depends On | Files | Requirement(s) |
|------|------|------------|-------|----------------|
| 09-00 | 0 | — | `tests/telemetry.reduce-run-events.test.ts`, `tests/storage.progress-v4.test.ts` | N-STAT-01, N-STAT-02 |
| 09-01 | 1 | 09-00 | `src/runtime/runStats.ts` (new), `src/runtime/useGameLoop.ts`, telemetry test file | N-STAT-01 |
| 09-02 | 1 | 09-00 | `src/services/storage/{types,parseBlob,migrateProgress,watermark,telemetry(new),index}.ts`, `tests/storage.progress-v3.test.ts` | N-STAT-01, N-STAT-02 |
| 09-03 | 2 | 09-02 | `src/services/storage/{memoryStore,asyncStorageStore}.ts`, storage-v4 test file | N-STAT-01, N-STAT-02 |
| 09-04 | 3 | 09-01, 09-03 | `app/_components/PlayingHost.tsx` | N-STAT-01, N-STAT-02 |

09-01 and 09-02 run in the same wave (both depend only on 09-00, zero file overlap — runtime vs.
services — so they execute in parallel).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-00-01 | 00 | 0 | N-STAT-01 | — | it.todo scaffold names every N-STAT-01 counter, incl. the chosen cascade heuristic | unit (stub) | `npx vitest run tests/telemetry.reduce-run-events.test.ts` | ❌ W0 creates it | ⬜ pending |
| 09-00-02 | 00 | 0 | N-STAT-02 | — | it.todo scaffold + buildV3Fixture() for the round-trip test | unit (stub) | `npx vitest run tests/storage.progress-v4.test.ts` | ❌ W0 creates it | ⬜ pending |
| 09-01-01 | 01 | 1 | N-STAT-01 | T-09-01 | reduceRunTelemetry is read-only (no world.* write), bestCombo read from world.combo, cascade heuristic locked | unit | `npx vitest run tests/telemetry.reduce-run-events.test.ts -t "ring-walk basics\|per-pickup-type\|lives lost\|explosive cascade\|zero core mutation"` | ❌ W1 creates it | ⬜ pending |
| 09-01-02 | 01 | 1 | N-STAT-01 | T-09-02 | runStatsSv lazily allocated, drained once per substep, reset on retry, zero new scheduleOnRN hops | unit + typecheck | `npx vitest run tests/telemetry.reduce-run-events.test.ts -t "headless integration smoke"; npm run typecheck` | ❌ W1 creates it | ⬜ pending |
| 09-01-03 | 01 | 1 | N-STAT-01 | — | All telemetry counter behaviors asserted and green | unit | `npx vitest run tests/telemetry.reduce-run-events.test.ts` | ❌ W1 creates it | ⬜ pending |
| 09-02-01 | 02 | 1 | N-STAT-01, N-STAT-02 | T-09-04 | v4 schema + renamed v3-legacy types/consts/defaults; recordRunEnd contract extended | static (typecheck) | `npm run typecheck` | ❌ W1 creates it | ⬜ pending |
| 09-02-02 | 02 | 1 | N-STAT-02 | T-09-04, T-09-05, T-09-06 | parse/migrate/watermark renamed-and-extended; telemetry-only corruption never wipes progress; recentRuns bounded on write | unit | `npx vitest run tests/storage.progress-v3.test.ts` | ✅ exists (renamed in place) | ⬜ pending |
| 09-03-01 | 03 | 2 | N-STAT-01, N-STAT-02 | T-09-08 | Both stores persist v4 recordRunEnd; hydrate chain reads v4→v3→v2→v1 | static (typecheck/lint) | `npm run typecheck; npm run lint` | ✅ existing files extended | ⬜ pending |
| 09-03-02 | 03 | 2 | N-STAT-02 (SC-2/SC-3/SC-4) | — | v3→v4 lossless round-trip; corrupt/partial fail-soft; lifetime/per-level aggregates survive re-instantiation; ring buffer bound enforced | unit | `npx vitest run tests/storage.progress-v4.test.ts` | ❌ Plan 00 creates it | ⬜ pending |
| 09-04-01 | 04 | 3 | N-STAT-01, N-STAT-02 | T-09-10 | PlayingHost wires recordRunEnd (win/lose/abandon) through the single extended call site + single onMenu funnel | unit + typecheck/lint | `npm run typecheck && npm run lint && npx vitest run tests/telemetry.reduce-run-events.test.ts tests/storage.progress-v4.test.ts` | ✅ existing file extended | ⬜ pending |
| 09-04-02 | 04 | 3 | Roadmap SC-5 | T-09-11 | `hashWorld` byte-identical; `src/core/**` untouched; no illegal `services/` import from core/runtime | static + unit (existing) | `git diff --stat -- src/core` (must be empty) + `npx vitest run tests/physics.golden-replay.test.ts tests/physics.hash-canonical.test.ts` + `npx eslint src/core src/runtime` + `npm test` | ✅ existing tooling | ⬜ pending |
| 09-04-03 | 04 | 3 | N-STAT-01 (D-02, D-09) | — | Abandoned-run flush on exit-to-Menu; wall-clock excludes pause | checkpoint:human-verify | manual (see Manual-Only Verifications below) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/telemetry.reduce-run-events.test.ts` — stubs for N-STAT-01 (all counters, incl. the chosen cascade-attribution algorithm) — created by Plan 00 Task 1
- [ ] `tests/storage.progress-v4.test.ts` — stubs for N-STAT-02 (migration losslessness, partial-corruption fail-soft, aggregation, ring-buffer bound) + `buildV3Fixture()` — created by Plan 00 Task 2
- [ ] No framework install needed — Vitest is already configured

**Resolved from research:** the golden-replay/hash files the research left as "verify in
Wave 0" are `tests/physics.golden-replay.test.ts` and `tests/physics.hash-canonical.test.ts`.
Both exist; no discovery task is needed (verified again as part of Plan 04 Task 2's SC-5 sweep).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Gated By |
|----------|-------------|------------|-------------------|----------|
| Abandoned-run flush on exit-to-Menu | N-STAT-01 (D-02) | The `onMenu` path involves RN component lifecycle and AsyncStorage; the headless harness cannot observe unmount ordering | Run on simulator: start a level, break several bricks, catch a power-up, Pause → Menu (and separately, Android hardware back). Re-enter, inspect `store.getSnapshot()`, confirm exactly one `abandoned` run recorded with non-zero bricks broken for each path | Plan 09-04, Task 3 |
| Wall-clock play time excludes pause | N-STAT-01 (D-09) | Requires real elapsed time and a real AppState background transition | Play ~30s, pause 30s, resume ~30s, end run. Recorded wall-clock ms should be ≈60s, not ≈90s | Plan 09-04, Task 3 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a Wave 0 dependency (Task 3 of Plan 04 is a
      `checkpoint:human-verify` with its own automated regression check plus a manual gate — this
      is the accepted pattern for the phase's two non-automatable behaviors)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (both new test files scaffolded before any
      implementation task)
- [x] No watch-mode flags
- [x] Feedback latency < 25s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** plans created — pending execution (`/gsd:execute-phase 09-run-telemetry-storage-v4`)
