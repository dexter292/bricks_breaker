---
phase: 9
slug: run-telemetry-storage-v4
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-25
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `09-RESEARCH.md` § Validation Architecture.

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

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-00-01 | 00 | 0 | N-STAT-01 | — | N/A | unit (stub) | `npx vitest run tests/telemetry.reduce-run-events.test.ts` | ❌ W0 | ⬜ pending |
| 09-00-02 | 00 | 0 | N-STAT-02 | — | N/A | unit (stub) | `npx vitest run tests/storage.progress-v4.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-01 | 01 | 1 | N-STAT-01 | — | Counters derive from the event ring, not ad-hoc UI call sites | unit (headless `stepRun`) | `npx vitest run tests/telemetry.reduce-run-events.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | N-STAT-01 | — | Per-power-up-type counts, largest cascade, longest rally, wall-clock ms attributed correctly | unit | `npx vitest run tests/telemetry.reduce-run-events.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | N-STAT-02 | — | v3 → v4 loses no score, star or unlock | unit (golden fixture) | `npx vitest run tests/storage.progress-v4.test.ts -t "v3 fixture round-trips"` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 2 | N-STAT-02 | — | Corrupt or **partial** v4 degrades to defaults; telemetry corruption must not wipe `unlocked`/`bestByLevel` | unit | `npx vitest run tests/storage.progress-v4.test.ts -t "corrupt"` | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 2 | N-STAT-01 (SC-2) | — | Lifetime + per-`(mode, levelId)` aggregates survive an app kill (re-instantiate store from persisted string) | unit | `npx vitest run tests/storage.progress-v4.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-04 | 02 | 2 | N-STAT-02 | — | Ring buffer never exceeds its bound; oldest entry is evicted | unit | `npx vitest run tests/storage.progress-v4.test.ts -t "ring"` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 3 | Roadmap SC-5 | — | `hashWorld` byte-identical; golden replay unchanged | unit (existing) | `npx vitest run tests/physics.golden-replay.test.ts tests/physics.hash-canonical.test.ts` | ✅ exists | ⬜ pending |
| 09-03-02 | 03 | 3 | Roadmap SC-5 | — | `src/core/**` untouched; no `services/` import from core or runtime | static | `git diff --stat -- src/core` (must be empty) + `npm run lint` | ✅ existing tooling | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/telemetry.reduce-run-events.test.ts` — stubs for N-STAT-01 (all counters, incl. the chosen cascade-attribution algorithm)
- [ ] `tests/storage.progress-v4.test.ts` — stubs for N-STAT-02 (migration losslessness, partial-corruption fail-soft, aggregation, ring-buffer bound)
- [ ] A realistic **v3 fixture blob** representing an existing player — several unlocked levels, starred bests, `bestScore > 0` — for the round-trip test
- [ ] No framework install needed — Vitest is already configured

**Resolved from research:** the golden-replay/hash files the research left as "verify in
Wave 0" are `tests/physics.golden-replay.test.ts` and `tests/physics.hash-canonical.test.ts`.
Both exist; no discovery task is needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Abandoned-run flush on exit-to-Menu | N-STAT-01 (D-02) | The `onMenu` path involves RN component lifecycle and AsyncStorage; the headless harness cannot observe unmount ordering | Run on simulator: start a level, break several bricks, Pause → Menu. Re-enter, open a debug read of the store (or relaunch and inspect), confirm one `abandoned` run is recorded with non-zero bricks broken |
| Wall-clock play time excludes pause | N-STAT-01 (D-09) | Requires real elapsed time and a real AppState background transition | Play ~30s, pause 30s, resume ~30s, end run. Recorded wall-clock ms should be ≈60s, not ≈90s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 25s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
