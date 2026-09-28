---
phase: "13"
slug: "achievements"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-28"
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **No `13-RESEARCH.md` exists** — research was deliberately skipped because this phase has no
> unknown outside the repo. This file was therefore written by the orchestrator from the shipped
> test infrastructure and `13-CONTEXT.md`, not seeded from a researcher's § Validation
> Architecture. Task IDs are filled by the planner.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.1 — already installed, nothing to add |
| **Config file** | `vitest.config.ts` — `environment: 'node'`, include `['src/core/**/*.test.ts', 'tests/**/*.test.ts', 'tests/**/*.test.tsx']`, `resolve.alias` maps `react-native` → `react-native-web` |
| **UI environment** | per-file docblock `@vitest-environment jsdom` — **not** global |
| **Quick run command** | `npx vitest run tests/achievements` |
| **Full suite command** | `npm test` (`vitest run` + **five** `assert-*.mjs` scripts) |
| **Measured runtime** | ~10s for `vitest run` at 107 files / 798 tests (measured 2026-09-28) |

**Three gates are load-bearing this phase and are not optional:**

- `npm run typecheck` — the catalog is data with a declared type; a predicate with the wrong
  snapshot shape is a compile error, not a test failure.
- `npm run lint` — `boundaries/dependencies` in `eslint.config.js` is **the only thing** stopping
  `ResultOverlay` / `DailyResultOverlay` importing `src/services` (D-08). No unit test observes
  it. This is stated as fact, not as a gate someone should assume exists.
- `npm test` — it chains five `assert-*.mjs` scripts, including `assert-streak-evidence.mjs`
  added on 2026-09-28.

---

## Bindings measured before this phase starts

Stated here so a plan cannot restate them wrongly. Each was measured in this session.

| Binding | Value | Why it matters |
|---|---|---|
| A `-t`-filtered vitest gate | binds on the presence of **`passed`** | The exit code is 0 for a non-matching filter, and a *matching* filter on a multi-case file prints `Tests 2 passed \| 22 skipped (24)` — so neither the exit code nor the word `skipped` discriminates |
| `npm run lint` base | exit 0, `✖ 3 problems (0 errors, 3 warnings)` | Bind lint gates on the **exit code**; eslint prints `0 errors` on every clean run |
| `npm test` base | exit 0, **107 files / 798 tests** | If it is red before a task starts, stop and report — do not attribute it to the task |
| `npx vitest run tests/achievements` before Wave 0 | exit 1, `No test files found` | A green run of this command is itself the evidence the files now exist |

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/achievements && npm run typecheck`
- **After every plan wave:** `npm test && npm run typecheck && npm run lint`
- **Before `/gsd-verify-work`:** full suite green, and every device-verification item below
  either resolved or explicitly routed to human verification
- **Max feedback latency:** ~10s (`vitest run`), ~5s (`tests/achievements` quick run)

---

## Per-Task Verification Map

Task IDs are assigned by the planner.

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | N-ACH-01 | N/A | unit | `npx vitest run tests/achievements.catalog.test.ts -t "every entry is data"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-01 | predicate is pure | unit (source contract) | `npx vitest run tests/achievements.catalog.test.ts -t "no clock no storage"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-01 | N/A | unit | `npx vitest run tests/achievements.catalog.test.ts -t "ids unique"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-01 (D-11) | N/A | unit | `npx vitest run tests/achievements.catalog.test.ts -t "name within 16 chars"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-02 | N/A | unit | `npx vitest run tests/achievements.evaluate.test.ts -t "same snapshot twice"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-02 | idempotent by set difference | unit | `npx vitest run tests/achievements.evaluate.test.ts -t "does not re-fire"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-02 (D-04) | N/A | unit | `npx vitest run tests/achievements.evaluate.test.ts -t "retroactive"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-02 | hostile snapshot degrades | unit | `npx vitest run tests/achievements.evaluate.test.ts -t "hostile snapshot"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-02 (D-13) | additive field, no version bump | integration | `npx vitest run tests/storage.progress-v4.test.ts -t "achievements"` | ✅ | ⬜ pending |
| TBD | TBD | TBD | N-ACH-02 (D-15) | unknown id dropped on read | integration | `npx vitest run tests/achievements.record.test.ts -t "unknown id"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-02 (D-15) | **degrades alone** — campaign/endless/daily untouched | integration | `npx vitest run tests/achievements.record.test.ts -t "degrades alone"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-02 (D-14) | timestamp persists | integration | `npx vitest run tests/achievements.record.test.ts -t "timestamp"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-02 | **both hand-mirrored stores agree** | integration | `npx vitest run tests/achievements.record.test.ts --reporter=verbose` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-03 (D-05) | cap is a component property | unit (node) | `npx vitest run tests/ui/achievementLines.test.ts -t "caps at two"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-03 (D-05) | N/A | unit (node) | `npx vitest run tests/ui/achievementLines.test.ts -t "and n more"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-03 (D-06) | N/A | integration (jsdom) | `npx vitest run tests/ui/ResultOverlay.achievements.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-ACH-03 (D-06) | N/A | integration (jsdom) | `npx vitest run tests/ui/DailyResultOverlay.test.tsx -t "achievement"` | ✅ | ⬜ pending |
| TBD | TBD | TBD | N-ACH-03 (D-08) | **panel takes scalars, not a storage type** | lint | `npm run lint` | ✅ | ⬜ pending |
| TBD | TBD | TBD | N-ACH-03 (D-12) | catalog covers all three modes | unit | `npx vitest run tests/achievements.catalog.test.ts -t "three modes"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SC-4 (D-07) | suppression on the no-run states | integration (jsdom) | `npx vitest run tests/ui/ResultOverlay.achievements.test.tsx -t "no run"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Non-vacuity rule, inherited from phases 11 and 12 and not optional here.** Every absence
assertion must be paired with a positive control proving the thing it asserts the absence of can
actually appear. An achievements suite that only asserts "campaign bests untouched" passes
trivially when the achievement write was dropped altogether — the exact trap
`tests/storage.daily-firewall.test.ts` was rebuilt to close.

---

## Wave 0 Requirements

Every file below is new. **No framework install is needed.**

- [ ] `tests/achievements.catalog.test.ts` — N-ACH-01: data shape, purity, unique ids, the 16-char name budget, three-mode coverage
- [ ] `tests/achievements.evaluate.test.ts` — N-ACH-02: determinism, idempotency as a set difference, retroactive unlock, hostile snapshot
- [ ] `tests/achievements.record.test.ts` — the read/write path: unknown id dropped, timestamps, independent degradation, **both stores asserted separately**
- [ ] `tests/ui/achievementLines.test.ts` — the shared pure classifier: cap at 2, the `and n more` form, ordering. **`.ts` under the node environment, not jsdom** — corrected 2026-09-28 from the `certLevelPlan` precedent the pattern map found: a pure classifier needs no DOM, and typing it jsdom would have bought a renderer it never uses
- [ ] `tests/ui/ResultOverlay.achievements.test.tsx` — the campaign/endless panel block and its suppression states

Extended rather than created:
- [ ] `tests/storage.progress-v4.test.ts` — an achievements sanitizer block mirroring the daily one
- [ ] `tests/ui/DailyResultOverlay.test.tsx` — the same block on the daily panel

---

## Manual-Only Verifications

Four items no test in this repository can reach. **jsdom performs no layout and supplies no
safe-area insets**, so no `render()` assertion is evidence for any of them.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| **`ResultOverlay` vertical fit — the binding case** | N-ACH-03 | The whole row budget derives from it, and no prior phase registered a backstop for this panel | 320×568pt, campaign win, 3 stars + `New Record` + `Retry` + `Next` + `Menu`, with 2 achievement rows. **Confirm the safe-area INSETS, not just that it fits** — 548px usable assumes a bottom inset of zero; if it is non-zero the 26px spare goes negative and `ACHIEVEMENT_LINES_MAX` must drop to 1. (WINDOWS #28) |
| `DailyResultOverlay` vertical fit with the block added | N-ACH-03 | Same; extends the already-open backstop | 320×568pt, fully-populated daily panel + 2 achievement rows, `Menu` visible without scrolling. **WINDOWS #17 is ANNOTATED, not superseded** — its 456px is 2px low and its "11 rows" is a defensive bound, real max 10 |
| Horizontal fit of a 16-character achievement name | N-ACH-03 | Font metrics computed, never observed on a rendered panel | 320px panel, longest catalog name at the 16-char budget — no wrap, no clipping. Extends WINDOWS #16 |
| Dynamic Type at iOS xLarge | N-ACH-03 | Not reachable under jsdom | 320×568pt with text size raised one step above default (≈1.118 against a computed ceiling of 1.102). **Expected to clip** — this is D-18's recorded deferral, due at Phase 14, not a new defect to file (WINDOWS #29) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 70s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
