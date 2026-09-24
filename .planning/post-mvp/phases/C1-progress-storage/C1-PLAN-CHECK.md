# C1 Plan Check — Progress Storage & Unlock Model

**Checked:** 2026-09-24  
**Phase:** C1-progress-storage  
**Plans verified:** C1-00, C1-01, C1-02 (3)  
**Verdict:** **PASS**

Plans will achieve **N-PROG-01** (clear unlocks next; offline across kills) and **N-PROG-02** (per-level Results best) without C2 UI or aimed serve. No blockers requiring plan revision before `/gsd-execute-phase`.

---

## Goal-Backward Analysis

### Phase goal (from ROADMAP-NEXT)

> Offline progress for **5-level** catalog — scope N-PROG-01, N-PROG-02; storage v2.

### What must be TRUE

| Truth | Covered by | Status |
|-------|------------|--------|
| Playable order is `01→03→04→05→06` (no `level-02`) | C1-00 catalog + unlock pure + tests | ✅ |
| `level-01` always unlocked; clear unlocks **next in catalog** | C1-00 `unlockAfterClear` / `nextLevelId`; C1-01 store method; C1-02 win-only host call | ✅ |
| Lose does **not** unlock | C1-02 `outcome === 'win'` gate + rg verify + manual UAT | ✅ |
| Progress survives kill when AsyncStorage works | C1-01 `@nbb/progress/v2` + flush; C1-02 device smoke | ✅ |
| Per-level best on WON **or** LOST if score > stored | C1-01 `recordLevelBest` strict `>`; C1-02 every end-of-run | ✅ |
| Results Best / New Record vs **active level** | C1-02 `getBestForLevel(levelId)` preload + evaluate | ✅ |
| Title Personal Best = rollup max | C1-01 `bestScore` rollup; C1-02 GameHost `getBest()` | ✅ |
| v1 migrate seeds global only; unlocks default | C1-01 `migrateOrDefault` | ✅ |
| Fail-soft / non-blocking / no hot-path I/O | C1-01 parse + singleton; C1-02 void.catch + flush on pause | ✅ |
| Docs for catalog + unlock rules | C1-02 `docs/ops/PROGRESS-STORAGE.md` | ✅ |
| **Not** level select / stars / aimed serve | Explicit Avoid + out-of-scope in all plans | ✅ |

### Requirement → plan map

| Requirement | Plans `requirements:` | Implementing work |
|-------------|----------------------|-------------------|
| **N-PROG-01** | 00, 01, 02 | Catalog/unlock → persist/migrate → PlayingHost win→`unlockAfterClear` |
| **N-PROG-02** | 00, 01, 02 | `bestByLevel` + rollup → Results per-level wire + Title `getBest` |

No roadmap requirement for this phase is missing from frontmatter.

---

## Dimension Results

| # | Dimension | Result | Notes |
|---|-----------|--------|-------|
| 1 | Requirement coverage | ✅ PASS | Both IDs in all three plans; tasks map to unlock + per-level best |
| 2 | Task completeness | ✅ PASS | gsd-tools `valid: true` for all plans; auto tasks have files/action/verify/done |
| 3 | Dependency correctness | ✅ PASS | `[]` → `C1-00` → `C1-01`; waves 0/1/2; acyclic |
| 4 | Key links planned | ✅ PASS | Store↔AsyncStorage; host↔`recordLevelBest`/`unlockAfterClear`; Title↔`getBest`; preload↔`getBestForLevel` |
| 5 | Scope sanity | ✅ PASS | 2 / 2 / 3 tasks; ~5–6 files each; within budget |
| 6 | Verification derivation | ✅ PASS | Truths user-observable; artifacts support truths |
| 7 | Context compliance | ✅ PASS | D-01…D-11 implemented; deferred C2/stars/aimed serve excluded via Avoid |
| 7b | Scope reduction | ✅ PASS | No fake “v1 simplified” delivery; D-06 Results per-level done in C1 as intended |
| 7c | Architectural tier | ✅ PASS | Matches RESEARCH map: services for blob/rules/persist; hosts for end-of-run; no sim/storage |
| 8 | Nyquist compliance | ✅ PASS | `C1-VALIDATION.md` present; every task has `<automated>`; Wave 0 creates test file; no `--watch` |
| 9 | Cross-plan data contracts | ✅ PASS | Shared `ProgressBlob` / `ProgressStore` contracts locked in 00; 01 implements; 02 consumes |
| 10 | `.cursor/rules` | ✅ PASS | AsyncStorage 2.2.0 only; Vitest for storage; no MMKV; offline / no cloud |
| 11 | Research resolution | ⚠️ WARNING | Open Questions answered in prose + adopted by plans, but section not marked `(RESOLVED)` |
| 12 | Pattern compliance | ⚠️ WARNING | Plans follow RESEARCH names; PATTERNS file names drift (see gaps) |

### Dimension 8 detail

| Task | Plan | Wave | Automated Command | Status |
|------|------|------|-------------------|--------|
| T1 catalog/unlock + progress-v2 suite | 00 | 0 | `npx vitest run tests/storage.progress-v2.test.ts` | ✅ |
| T2 VALIDATION Wave 0 | 00 | 0 | rg + vitest | ✅ |
| T1 parse + migrate | 01 | 1 | vitest progress-v2 + personal-best | ✅ |
| T2 ProgressStore singleton | 01 | 1 | same | ✅ |
| T1 host wire | 02 | 2 | vitest + rg PlayingHost/GameHost | ✅ |
| T2 ops doc | 02 | 2 | file + rg + `npm test` | ✅ |
| T3 human smoke | 02 | 2 | vitest (checkpoint) + manual how-to-verify | ✅ |

Sampling: Wave 0 2/2 · Wave 1 2/2 · Wave 2 3/3 verified → ✅  
Wave 0 test file planned → ✅  
Overall Nyquist: ✅ PASS

---

## Context Compliance (locked decisions)

| Decision | Honored? | Where |
|----------|----------|-------|
| D-01 Catalog `01→03→04→05→06` | ✅ | C1-00 `PLAYABLE_LEVEL_ORDER` |
| D-02 Unlock next in order | ✅ | C1-00/01 unlock helpers |
| D-03 Permanent offline + fail-soft | ✅ | C1-01 store + C1-02 smoke |
| D-04 Unlock on WON only | ✅ | C1-02 win branch |
| D-05 Per-level on win\|lose | ✅ | C1-01/02 `recordLevelBest` |
| D-06 Results this-level best | ✅ | C1-02 per-level preload (discretion locked in) |
| D-07 Title = max rollup | ✅ | `bestScore` + GameHost `getBest` |
| D-08 `@nbb/progress/v2` + v1 seed | ✅ | C1-00 key; C1-01 migrate |
| D-09 Fail-soft parse | ✅ | C1-01 `parseProgressResult` |
| D-10 Async writes + flush | ✅ | C1-01/02 |
| D-11 No hot-path storage | ✅ | Cold-path only |
| D-12 Stars → C2 | ✅ | Avoid / out of scope (not cited by ID) |
| D-13 Level select → C2 | ✅ | Avoid / keep default `level-03` |
| D-14 No aimed serve | ✅ | Avoid blocks |

Deferred ideas (C2 UI, brand, Sentry, E1b, aimed serve) do not appear as deliverables.

---

## Gaps & Warnings (non-blocking)

### W1 — RESEARCH Open Questions not formally closed
**Dimension:** research_resolution  
**Severity:** warning  

Section is `## Open Questions` without `(RESOLVED)`. Substantive answers already exist and plans lock them:

1. Keep default `level-03` (C1-02)  
2. Ship `getSnapshot()` (C1-00 interface)  
3. Keep v1 key after migrate (C1-01)

**Fix (optional, before execute):** Rename to `## Open Questions (RESOLVED)` and prefix each answer with `RESOLVED:`.

### W2 — PATTERNS.md filename drift vs plans
**Dimension:** pattern_compliance  
**Severity:** warning  

| PATTERNS | Plans / RESEARCH / VALIDATION (canonical) |
|----------|-------------------------------------------|
| `catalogOrder.ts` | `catalog.ts` |
| `tests/storage.progress.test.ts` | `tests/storage.progress-v2.test.ts` |
| `docs/ops/PROGRESS-UNLOCK.md` | `docs/ops/PROGRESS-STORAGE.md` |

Executor should follow **PLAN file paths**, not PATTERNS alternate names. Optional: align PATTERNS table to plan names to avoid confusion.

### W3 — Unlock durability hard to observe on device without C2
**Dimension:** verification_derivation  
**Severity:** warning (info-leaning)  

N-PROG-01 unlock persistence is unit-tested + host rg-gated; Title only shows rollup score. Manual UAT step 3/4 for unlock relies on “DEV/logs/`getSnapshot`” but no plan task adds a `__DEV__` log.

**Optional polish:** In C1-02 Task 1, one-line `__DEV__` `console.log` of `unlocked` after win (or document that unit tests + Title rollup durability are the smoke proxy until C2).

### W4 — VALIDATION “lose does not unlock” mapped as unit
**Dimension:** nyquist mapping hygiene  
**Severity:** info  

Lose-not-unlock is correctly a **host** rule (store has no outcome). Coverage = Plan 02 rg + manual UAT, not a pure store unit. Acceptable; optional VALIDATION wording tweak.

### W5 — `tests/runtime.loadLevel.test.ts` PLAYABLE sync
**Dimension:** key_links / single source of truth  
**Severity:** info  

PATTERNS asks to keep loadLevel PLAYABLE array in sync with catalog export. Plans put catalog in `storage/catalog.ts` and rewire PlayingHost DEV cycle, but do not task updating `tests/runtime.loadLevel.test.ts`. Low risk if LevelId union unchanged; optional Assert import of `PLAYABLE_LEVEL_ORDER` in that test later.

---

## Structured Issues

```yaml
issues:
  - dimension: research_resolution
    severity: warning
    plan: null
    description: "C1-RESEARCH.md Open Questions lack (RESOLVED) markers; plans already adopt recommendations (keep level-03 default, getSnapshot, keep v1 key)."
    fix_hint: "Mark section '## Open Questions (RESOLVED)' with inline RESOLVED on each item — doc-only, not a plan rewrite."

  - dimension: pattern_compliance
    severity: warning
    plan: "00/01/02"
    description: "PATTERNS.md File Classification uses catalogOrder.ts / progress.test.ts / PROGRESS-UNLOCK.md; plans correctly use catalog.ts / progress-v2 / PROGRESS-STORAGE.md."
    fix_hint: "Align PATTERNS names to plan paths OR add one-line note in PATTERNS that plan paths win."

  - dimension: verification_derivation
    severity: warning
    plan: "02"
    description: "Device smoke for unlock persistence has no observable chrome until C2; getSnapshot exists but is not surfaced in __DEV__."
    fix_hint: "Optional: __DEV__ log of unlocked after win in PlayingHost Task 1."
```

**Blockers:** 0  
**Warnings:** 3  
**Info:** 2  

---

## Required Plan Revisions

**None.** Plans are execution-ready for N-PROG-01 + N-PROG-02.

Optional hygiene (does not block execute):

1. Mark RESEARCH Open Questions `(RESOLVED)`.  
2. Align PATTERNS filenames to plan paths.  
3. Optional `__DEV__` unlock snapshot log for human UAT.

---

## Plan Summary

| Plan | Tasks | Wave | Depends | Status |
|------|-------|------|---------|--------|
| C1-00 | 2 | 0 | — | Valid — contracts + catalog/unlock + Wave 0 tests |
| C1-01 | 2 | 1 | C1-00 | Valid — parse/migrate + ProgressStore singleton |
| C1-02 | 3 | 2 | C1-01 | Valid — host wire + ops doc + human smoke |

---

## Recommendation

**PASS** — proceed to `/gsd-execute-phase C1` (or execute Wave 0 → 1 → 2). Plans deliver offline unlock + per-level best without sneaking C2 UI or aimed serve.

---

*Checker: gsd-plan-checker · Revision gate · 2026-09-24*
