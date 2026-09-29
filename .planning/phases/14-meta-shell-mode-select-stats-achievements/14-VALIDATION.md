---
phase: "14"
slug: "meta-shell-mode-select-stats-achievements"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-29"
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `14-RESEARCH.md` § Validation Architecture. Every number below was measured
> on 2026-09-29, not estimated; the three verified independently by the orchestrator before
> this file was written are marked **✓orch**.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest **5.0.1** ✓orch + `@testing-library/react` **16.3.3** ✓orch + jsdom **29.1.1** ✓orch |
| **Config file** | `vitest.config.ts` — `resolve.alias { 'react-native': 'react-native-web' }`, `environment: 'node'`, `include: ['src/core/**/*.test.ts','tests/**/*.test.ts','tests/**/*.test.tsx']` |
| **jsdom opt-in** | **per-file docblock** `/** @vitest-environment jsdom */` (the shipped `tests/ui/*.test.tsx` shape). Source-contract tests stay on `@vitest-environment node`. |
| **Quick run command** | `npx vitest run tests/ui` — 21 files / 218 tests / **3.53 s** |
| **Full suite command** | `npm test` — vitest (112 files / 881 passed, 1 skipped) **then** eight assert scripts; **13.7 s** wall |
| **Lint (in the loop, not a phase gate)** | `npm run lint -- --max-warnings 0` — **exit 0, no output** ✓orch |
| **Estimated runtime** | ~14 s full, ~3.5 s quick |

**Why lint is inside the per-commit loop for this phase and not only at the gate:** three of the
rules this phase will touch are severity-`error` and **invisible to a passing test** —
`react-hooks/set-state-in-effect` (which is interprocedural here and rejects the obvious
`useEffect(() => startDailyRun(), [])` routing for Title's Daily entry),
`react-hooks/refs`, and the `src/services/achievements/**` purity block. Lint is also the only
observer of `boundaries/dependencies` for the new `textScale` import.

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/ui` (3.53 s) **and** `npm run lint -- --max-warnings 0`
- **After every task commit that touches `src/services/storage/**`:** additionally
  `npx vitest run tests/storage.progress-v4.test.ts tests/daily.record.test.ts tests/achievements.record.test.ts`
  — the new `unseen` field has **four** obligated sites and the fourth
  (`sanitizeAchievementRecord` in `parseBlob.ts`) is the one `tsc` cannot see, so the compiler
  is not a sufficient sampler for it
- **After every plan wave:** `npm run typecheck && npm test` — typecheck **first**, because sites
  1–3 of the new field are compiler-caught and a `TS2741` is cheaper to read than a failing
  behavioural case
- **Before `/gsd-verify-work`:** full `npm test` green **and** `npm run lint -- --max-warnings 0`
  green **and** all six backstops recorded with dates
- **Max feedback latency:** 3.53 s (quick) / 13.7 s (full)

**Gate binding rule — measured, and the reason this line exists:** bind every gate on the word
`passed` (`… | grep -qE 'Tests +[0-9]+ passed'`). `vitest -t` is a **case-sensitive regex**: an
unmatched pattern prints `N skipped` and **exits 0**. Escape parentheses in any `-t` pattern.
Never bind on the exit code and never on the word `skipped`.

**Red-proof rule:** each of the three `MAX_FONT_SCALE` source assertions must be proven to fail
before it is trusted, following `scripts/assert-no-disabled-tests.mjs`'s shape (a self-check that
plants the pattern and proves both directions before the real scan). This is not ceremony:
§ Pitfall 4 of RESEARCH.md found that UI-SPEC assertion 3 is **red on arrival for the wrong
reason** — `src/services/storage/types.ts:69` carries `<Text>evil</Text>` inside a doc comment,
making the true counts **11 files / 57 occurrences**, not 10 / 56 ✓orch.

---

## Per-Task Verification Map

> Task IDs are assigned by the planner at §8. The rows below are the **instrument** half of the
> contract — each is keyed to a requirement or success criterion now, and the planner keys each to
> a task. A plan that adds a task not reachable from any row below has an unsampled behaviour.

| # | Plan | Wave | Requirement / SC | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---|------|------|------------------|------------|-----------------|-----------|-------------------|-------------|--------|
| V-01 | TBD | TBD | N-UI-01 / SC-1 | — | N/A | unit (jsdom) | `npx vitest run tests/ui/TitleScreen.test.tsx -t 'seven rows'` | ❌ W0 (file exists, case new) | ⬜ pending |
| V-02 | TBD | TBD | N-UI-01 / SC-1 | — | N/A | unit (jsdom) | `npx vitest run tests/ui/TitleScreen.test.tsx -t 'daily meta'` | ❌ W0 | ⬜ pending |
| V-03 | TBD | TBD | N-UI-01 | — | N/A | unit (jsdom) | `npx vitest run tests/ui/GameHost.test.tsx -t 'entry mode'` | ❌ W0 (file exists) | ⬜ pending |
| V-04 | TBD | TBD | N-UI-01 / D-11 | T-14 (magnitude) | `{n} new` reveals only a count already on screen | unit (jsdom) | `npx vitest run tests/ui/TitleScreen.test.tsx -t 'new'` | ❌ W0 | ⬜ pending |
| V-05 | TBD | TBD | N-STAT-03 / SC-2 | — | N/A | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'row order'` | ❌ W0 (**new file**) | ⬜ pending |
| V-06 | TBD | TBD | N-STAT-03 / SC-2 | — | N/A | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'endless meta'` | ❌ W0 | ⬜ pending |
| V-07 | TBD | TBD | N-STAT-03 / **SC-2 core** | — | N/A | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'reads once'` | ❌ W0 | ⬜ pending |
| V-08 | TBD | TBD | N-STAT-03 / SC-2 | — | N/A | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'idempotent'` | ❌ W0 | ⬜ pending |
| V-09 | TBD | TBD | N-STAT-03 | — | Absent map entry is not an error state | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx -t 'zero'` | ❌ W0 | ⬜ pending |
| V-10 | TBD | TBD | SC-3 / D-08 | — | N/A | unit (jsdom) | `npx vitest run tests/ui/AchievementsScreen.test.tsx -t 'locked description'` | ❌ W0 (**new file**) | ⬜ pending |
| V-11 | TBD | TBD | SC-3 / D-10 | — | N/A | unit (jsdom) | `npx vitest run tests/ui/AchievementsScreen.test.tsx -t 'catalog order'` | ❌ W0 | ⬜ pending |
| V-12 | TBD | TBD | D-11 / D-12 | — | N/A | unit (jsdom) | `npx vitest run tests/ui/AchievementsScreen.test.tsx -t 'marker'` | ❌ W0 | ⬜ pending |
| V-13 | TBD | TBD | D-12 | — | One write per mount | unit (jsdom) | `npx vitest run tests/ui/AchievementsScreen.test.tsx -t 'writes once'` | ❌ W0 | ⬜ pending |
| V-14 | TBD | TBD | D-12 | — | One write per run-end preserved | unit (node) | `npx vitest run tests/achievements.record.test.ts -t 'unseen'` | ❌ W0 (file exists) | ⬜ pending |
| V-15 | TBD | TBD | D-13 | — | Missing field parses `ok`, no version bump | unit (node) | `npx vitest run tests/storage.progress-v4.test.ts -t 'unseen'` | ❌ W0 (file exists) | ⬜ pending |
| V-16 | TBD | TBD | D-14 | T-14 (unbounded array) | drop → dedupe → **bound**, keep-first; unknown id dropped | unit (node) | `npx vitest run tests/storage.progress-v4.test.ts -t 'unseen bound'` | ❌ W0 | ⬜ pending |
| V-17 | TBD | TBD | D-14 / site 2 | — | `cloneTelemetryBlob` preserves the field | unit (node) | `npx vitest run tests/daily.record.test.ts -t 'unseen'` | ❌ W0 | ⬜ pending |
| V-18 | TBD | TBD | D-14 / site 3 | — | `mergeTelemetryBlobs` preserves the field | unit (node) | `npx vitest run tests/daily.record.test.ts -t 'reconcile unseen'` | ❌ W0 | ⬜ pending |
| V-19 | TBD | TBD | N-UI-02 / SC-4 | — | No ads/shop/login string | unit (jsdom) + source | `npx vitest run tests/ui/StatisticsScreen.test.tsx tests/ui/AchievementsScreen.test.tsx -t 'shell contract'` | ❌ W0 | ⬜ pending |
| V-20 | TBD | TBD | N-UI-02 / SC-4 | — | N/A | source contract | `npx vitest run tests/ui/shellColorFences.test.ts` | ❌ W0 (**new file**) | ⬜ pending |
| V-21 | TBD | TBD | N-UI-02 / **SC-5 core** | — | N/A | unit (jsdom) | `npx vitest run tests/ui/GameHost.test.tsx -t 'no PlayingHost'` | ❌ W0 (file exists) | ⬜ pending |
| V-22 | TBD | TBD | N-UI-02 / SC-5 | — | N/A | source contract | `npx vitest run tests/ui/GameHost.test.tsx -t 'CERT'` | ✅ exists — **extend** | ⬜ pending |
| V-23 | TBD | TBD | N-UI-02 / SC-5 / D-04 | — | N/A | unit (jsdom) | `npx vitest run tests/ui/GameHost.test.tsx -t 'Back'` | ❌ W0 | ⬜ pending |
| V-24 | TBD | TBD | D-18 / WINDOWS #29 | — | N/A | source contract (3 assertions, each red-proofed) | `npx vitest run tests/ui/textScale.gate.test.ts` | ❌ W0 (**new file**) | ⬜ pending |
| V-25 | TBD | TBD | Error states | — | Read failure renders zeros/all-locked, **no** error copy | unit (jsdom) | `npx vitest run tests/ui/StatisticsScreen.test.tsx tests/ui/AchievementsScreen.test.tsx -t 'read failure'` | ❌ W0 | ⬜ pending |
| V-26 | TBD | TBD | Dev-row removal | — | `__DEV__` Endless/Daily controls gone | source contract | `npx vitest run tests/ui/PlayingHost.endless-host.test.ts` | ✅ exists — anchor must still match | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling logic.** Each success criterion with both a source-placement half and a behavioural half
is observed by **two independent instruments** — the rule
`tests/ui/PlayingHost.endless-host.test.ts` was written on. SC-1/SC-2/SC-3 sample at ≥2× their
single change frequency (per task commit); SC-4/SC-5's source halves sample on **every** commit,
because a render-tree regression is invisible inside a passing behavioural case.

**Two rows are load-bearing and must not be softened:** V-07 (`getSnapshot()` called exactly once
per mount — a counting spy, not an eyeball) *is* SC-2, and V-21 (`PlayingHost` absent from the
render tree in the `'stats'` and `'achievements'` branches, with `PlayingHost` stubbed to emit a
sentinel) *is* SC-5. Neither criterion has any other automated observer.

---

## Wave 0 Requirements

- [ ] `tests/ui/StatisticsScreen.test.tsx` — **new file**; N-STAT-03, SC-2, error states
- [ ] `tests/ui/AchievementsScreen.test.tsx` — **new file**; SC-3, D-08, D-10, D-11, D-12
- [ ] `tests/ui/textScale.gate.test.ts` — **new file**; three assertions, comment-stripped,
      `.tsx`-scoped, occurrence-counted, **all three red-proofed**
- [ ] `tests/ui/shellColorFences.test.ts` — **new file**; the three colour fences as source contracts
- [ ] `tests/ui/TitleScreen.test.tsx` — **extend**, and **fix** the shipped
      `getByRole('button', { name: 'Start game' })` query at line 26, which the seven-row Title removes ✓orch
- [ ] `tests/ui/GameHost.test.tsx` — **extend**; the same `'Start game'` query at line 104 ✓orch, the two
      new branches, entry-mode dispatch, the `Back` edges, and the soak/CERT source cases
- [ ] `tests/storage.progress-v4.test.ts` — **extend**; D-13 default, D-14 read path, bound, `unlocked` intersection
- [ ] `tests/daily.record.test.ts` — **extend**; the `cloneTelemetryBlob` and `mergeTelemetryBlobs` sites, both stores
- [ ] `tests/achievements.record.test.ts` — **extend**; abandoned-vs-announced write, both stores parameterised separately
- [ ] Framework install: **none needed** — all three tools installed at the versions above and the suite is green

*No `conftest`-equivalent is needed: this suite has no shared fixture file. The
`vi.mock('react-native-safe-area-context', …)` stub is repeated per file by convention — copy it,
do not extract it, or 21 files change for one refactor.*

---

## Manual-Only Verifications

jsdom performs no layout and supplies no safe-area insets, so **every height, width, line-count,
visible-entry-count and character-budget claim in `14-UI-SPEC.md` is human-only**. These are
`unrun-verify` windows, not test gaps — each must be registered in `WINDOWS.md` by this phase.

| # | Behavior | Requirement | Why Manual | Test Instructions |
|---|----------|-------------|-----------|-------------------|
| B1 | Title vertical fit — 7 rows, 468 of 548 at `m=1`, 517.2 at the cap; all seven visible and tappable, no scroll | N-UI-01 / D-03 | jsdom performs no layout | 320×568 via Display Zoom on a physical 375×667 device. **Machine half:** assert Title is not a `ScrollView`/`FlatList` and has no `contentContainerStyle` |
| B2 | Brand wraps to exactly two lines at 320 pt, still two at the cap | N-UI-02 | Wrap claims are the class this project has repeatedly got wrong | As B1. **Machine half:** `DISPLAY_NAME` is read from `app/_brand.ts`, never a literal (`assert-brand-name.mjs` covers the drift half) |
| B3 | Statistics vertical fit — 458 of 548, 522.4 at the cap, no scroll | N-STAT-03 / D-03 | As B1 | As B1. **Machine half (V-05):** exactly three lifetime rows and exactly seven `By mode` rows — the row count the budget is computed from, so a row-count regression is caught even though the height is not |
| B4 | Achievements scroll — `Back` visible and tappable at maximum scroll; first two entries complete; last entry not clipped | SC-3 / D-03 | As B1 | As B1. **Machine half, and it is the load-bearing one:** assert at the render tree that `Back` and the heading are **outside** the `ScrollView` subtree. That is the whole content of the rule D-03 inherits, and it *is* observable in jsdom |
| B5 | `MAX_FONT_SCALE = 1.2` discharges WINDOWS #29 — binding `ResultOverlay` campaign-win case shows `Menu` fully at `xxxLarge` **and** at an AX size, at 320×568 | D-18 / #29 | **Partially machine-reachable.** The Dynamic Type *direction* is simulator-driven: `xcrun simctl ui UAT-SE3 content_size <size>` at 375×667. The **320×568 reading #29's annotation demands is not** | Drive `content_size` at 375×667 for the direction; the 320-pt width needs B1's device. **Do not close #29 on a green `npm test`** — that is the false-gate failure this project has already shipped three times |
| B6 | Horizontal budgets at Label 14 — Daily meta at a 5-digit streak (227.8 of 240), `By mode` meta at 20 chars (177.7), name + `Unlocked` (221.6 of 272) | N-UI-01 / N-STAT-03 / SC-3 | As B1 | **Machine half:** `numberOfLines={1}` on every fixed-width row (source contract). Record **which failure direction occurred** — a truncation shortens copy at no height cost; a **wrap** grows the row by 20 px, and Title has 30.8 pt spare at the cap, so one wrapped meta survives and two do not |

**WINDOWS #35 is annotated, not opened.** It is discharged by shipping the mark: its *appearance*
rides B4 and its *logic* rides V-12/V-13/V-14. It is a placement obligation, not a layout claim.

**The 320×568 route was falsified as tightly as it can be, twice.** The
`iPhone SE (1st generation)` device *type* exists, but `simctl create` against the only installed
runtime returns `403 Incompatible device` (binding reason: `IPHONEOS_DEPLOYMENT_TARGET = 16.4`
against the available runtimes), and `simctl ui` exposes no display-zoom option. #28's
physical-hardware route holds. Record the residual narrowly — "the 320×568 viewport was never
rendered" is true and useful; "blocked on hardware" is neither.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers all ❌ references above
- [ ] No watch-mode flags
- [ ] Feedback latency < 14 s
- [ ] Every `-t` pattern regex-escaped, and every gate bound on the word `passed`
- [ ] All three `textScale.gate` assertions red-proofed before being trusted
- [ ] All six backstops registered in `WINDOWS.md` with the machine/human split above
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
