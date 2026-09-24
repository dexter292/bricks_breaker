# C2 Plan Check — Level Select + Stars + Replay

**Checked:** 2026-09-25  
**Phase:** C2-level-select-stars-replay  
**Plans verified:** C2-00, C2-01, C2-02, C2-03 (4)  
**Verdict:** **PASS**

Plans will achieve **N-LVL-02**, **N-PROG-03** (lives-based), and **N-PROG-04** for the 5-level catalog without diluting CONTEXT locks. No blockers requiring plan revision before `/gsd-execute-phase`.

---

## Goal-Backward Analysis

### Phase goal (from ROADMAP-NEXT)

> Unlock/replay/stars correct for **5** levels — N-LVL-02, N-PROG-03, N-PROG-04.

### What must be TRUE

| Truth | Covered by | Status |
|-------|------------|--------|
| C1 device UAT before any `@nbb/progress/v3` write-through | C2-01 Task 1 blocking checkpoint | ✅ |
| `v: 3`; `bestByLevel[id]={score, stars?}`; lives clamp 1–3 on win; lose no stars | C2-00 stars helpers; C2-01 parse/migrate/store | ✅ |
| Select 5 rows; locked / ☆☆☆ / cleared+Best; Best only when cleared | C2-00 `selectRowState`; C2-02 SelectScreen | ✅ |
| Title→Select→Playing; Menu→Title; Playing unmounts | C2-02 ShellPhase | ✅ |
| CERT/SOAK never insert Select | C2-02 + C2-03 re-verify + SOAK ops | ✅ |
| Win Results: stars + Retry/Next?/Menu; lose Retry+Menu; Next omitted not disabled | C2-02 chrome; C2-03 blob gate | ✅ |
| Next = toggleDevLevel checklist; never `setActive(true)` | C2-03 Task 1 | ✅ |
| Four levelId call sites named + fixed | C2-03 D-15 sites 1–4 | ✅ |
| setActive-last behavioral test (mock useGameLoop) | C2-00 stub → C2-03 GREEN | ✅ |
| Docs v3 + cert arm smoke + one post-C2 ceiling note | C2-03 Task 2–3 | ✅ |
| **Not** toast/preview, score bands, chapters, aimed serve | Avoid blocks all plans | ✅ |

### Requirement → plan map

| Requirement | Plans `requirements:` | Implementing work |
|-------------|----------------------|-------------------|
| **N-PROG-03** | 00, 01, 03 | stars pure → v3 migrate/store/`recordRunEnd` → blob→Results + ops |
| **N-LVL-02** | 00, 02, 03 | row-state contract → SelectScreen + shell → levelId + UAT |
| **N-PROG-04** | 00, 02, 03 | Next chrome stubs → ResultOverlay gate → PlayingHost Next bake-safe |

No roadmap requirement for this phase is missing from frontmatter.

---

## Dimension Results

| # | Dimension | Result | Notes |
|---|-----------|--------|-------|
| 1 | Requirement coverage | ✅ PASS | All three IDs in ≥1 plan; tasks map to unlock/select/stars/replay |
| 2 | Task completeness | ✅ PASS | gsd-tools `valid: true` all plans; every task has read_first + acceptance_criteria + verify/done |
| 3 | Dependency correctness | ✅ PASS | `[]` → C2-00 → C2-01 → C2-02 → C2-03; waves 0–3; acyclic |
| 4 | Key links planned | ✅ PASS | store↔v3; Select↔getSnapshot; Title↔select; Result↔onNext; Next↔gate; handleRunEnded↔blob |
| 5 | Scope sanity | ✅ PASS | 2 / 2 / 2 / 3 tasks; files within budget |
| 6 | Verification derivation | ✅ PASS | Truths user-observable; artifacts support truths |
| 7 | Context compliance | ✅ PASS | D-01…D-24 honored; deferred ideas excluded via Avoid |
| 7b | Scope reduction | ✅ PASS | No fake “v1 simplified” stars/Next; omit-stars-until-win matches discretion |
| 7c | Architectural tier | ✅ PASS | Matches RESEARCH map: storage services / shell / UI / no sim |
| 8 | Nyquist compliance | ✅ PASS | VALIDATION.md present; every task `<automated>`; Wave 0 stubs; no `--watch` |
| 9 | Cross-plan data contracts | ✅ PASS | LevelBest / ProgressBlob v3 / recordRunEnd locked 00→01→03; Result props 02→03 |
| 10 | `.cursor/rules` | ✅ PASS | AsyncStorage 2.2.0; Vitest; no MMKV; offline |
| 11 | Research resolution | ⚠️ WARNING | Open Questions answered by CONTEXT + plans but section not marked `(RESOLVED)` |
| 12 | Pattern compliance | ✅ PASS | Plans cite PATTERNS / TitleScreen / compareBest / toggleDevLevel analogs |

### Dimension 8 detail

| Task | Plan | Wave | Automated Command | Status |
|------|------|------|-------------------|--------|
| T1 stars + progress-v3 GREEN/todos | 00 | 0 | vitest progress-v3 + progress-v2 | ✅ |
| T2 UI stubs + VALIDATION Wave 0 | 00 | 0 | file exists + vitest stubs | ✅ |
| T1 C1 UAT gate | 01 | 1 | rg Human UAT (checkpoint) | ✅ |
| T2 v3 parse/migrate/store | 01 | 1 | vitest progress-v3/v2/personal-best | ✅ |
| T1 Select + ShellPhase | 02 | 2 | vitest Select + GameHost + rg | ✅ |
| T2 ResultOverlay stars/Next | 02 | 2 | vitest ResultOverlay + GameScreen | ✅ |
| T1 levelId + Next + bake | 03 | 3 | vitest loadLevel/next-bake/bake-gate/GameHost/v3 | ✅ |
| T2 ops docs + npm test | 03 | 3 | rg docs + `npm test` | ✅ |
| T3 device UAT | 03 | 3 | vitest phase suites (checkpoint) | ✅ |

Sampling: Wave 0 2/2 · Wave 1 2/2 · Wave 2 2/2 · Wave 3 3/3 → ✅  
Wave 0 test files planned → ✅  
Overall Nyquist: ✅ PASS

**threat_model:** present on C2-00, C2-01, C2-02, C2-03 → ✅

---

## Context Compliance (locked decisions)

| Decision | Honored? | Where |
|----------|----------|-------|
| D-01 CERT/SOAK bypass Select | ✅ | C2-02 shell; C2-03 SOAK ops + UAT |
| D-02 No path calls setActive itself | ✅ | C2-03 Next checklist |
| D-03 setActive-last behavioral test | ✅ | C2-00 stub → C2-03 GREEN (Next-focused; see W3) |
| D-04…D-06 v3 nested shape | ✅ | C2-00 types; C2-01 flip |
| D-07…D-09 lives-only stars; N-PROG-03 amend | ✅ | computeStars; C2-03 docs |
| D-10 Select mount + Results from returned blob | ✅ | C2-02 mount; C2-03 recordRunEnd |
| D-11…D-13 Next gate + checklist | ✅ | C2-02 omit; C2-03 wire |
| D-14 Play→Select; required levelId | ✅ | C2-02; C2-03 |
| D-15 four call sites | ✅ | Named in C2-03 interfaces + Task 1 |
| D-16 cert arm smoke before ceiling | ✅ | C2-03 Task 2–3 |
| D-17…D-21 Select three-state + Back + ignore | ✅ | C2-00 rowState; C2-02 UI |
| D-22 Menu→Title | ✅ | C2-02 |
| D-23 Best only when cleared | ✅ | selectRowState + Select behavior |
| D-24 CERT force level-03 / chip | ✅ | C2-03 keep force |

Deferred (toast/preview, score bands→E2, chapters, thumbnails, cloud, double ceiling measure) do not appear as deliverables.

### Especially-checked locks (orchestrator)

| Lock | Status |
|------|--------|
| C1 UAT before v3 device write | ✅ C2-01 Task 1 blocking |
| Next mirrors toggleDevLevel; no setActive on Next | ✅ C2-03 |
| CERT/SOAK bypass select | ✅ C2-02/03 |
| Four named levelId call sites | ✅ C2-03 D-15 |
| setActive-last behavioral test | ✅ C2-03 |
| Three select row states; Best only when cleared | ✅ C2-00/02 |
| N-PROG-03 lives-only; v3 nested | ✅ C2-00/01 |
| threat_model present | ✅ all 4 plans |
| read_first + acceptance_criteria every task | ✅ 9/9 tasks |

---

## Gaps & Warnings (non-blocking)

### W1 — RESEARCH Open Questions not formally closed
**Dimension:** research_resolution  
**Severity:** warning  

Section is `## Open Questions` without `(RESOLVED)`. CONTEXT already locked answers (D-22 Menu→Title, D-23 Best only when cleared, D-24 cert/chip). RESEARCH Q1 still claims “CONTEXT does not lock Menu target” — stale vs D-22.

**Fix (optional):** Mark `## Open Questions (RESOLVED)` and prefix each with `RESOLVED:`; fix Q1 prose to cite D-22.

### W2 — `files_modified` misses test files listed in tasks
**Dimension:** task_completeness  
**Severity:** warning  

| Plan | In `<files>` but not `files_modified` |
|------|----------------------------------------|
| C2-02 Task 2 | `tests/ui/GameScreen.test.tsx` |
| C2-03 Task 1 | `tests/ui/GameHost.test.tsx` |

Executor will still touch them via `<files>`; frontmatter drift only.

**Fix:** Add those paths to `files_modified`.

### W3 — D-03 wording covers Next / select start / DEV; automated focus is Next
**Dimension:** context_compliance / verification_derivation  
**Severity:** warning (info-leaning)  

CONTEXT D-03 lists Next **and** select start **and** DEV toggle. Plan 03 behavioral test is **Next-driven**; DEV remains on existing `PlayingHost.bake-gate.test.ts`; select→play remounts PlayingHost so mount bake path applies. Acceptable risk split; not diluted delivery.

**Optional polish:** One sentence in C2-03 Task 1 that select remount + DEV bake-gate source contracts satisfy the other two D-03 paths.

---

## Structured Issues

```yaml
issues:
  - dimension: research_resolution
    severity: warning
    plan: null
    description: "C2-RESEARCH.md Open Questions lack (RESOLVED) markers; Q1 prose contradicts CONTEXT D-22. Plans already implement Menu→Title, Best-only-when-cleared, CERT force."
    fix_hint: "Mark section '## Open Questions (RESOLVED)' with inline RESOLVED; sync Q1 to D-22 — doc-only."

  - dimension: task_completeness
    severity: warning
    plan: "02/03"
    description: "files_modified omits tests/ui/GameScreen.test.tsx (02) and tests/ui/GameHost.test.tsx (03) that appear in task <files>."
    fix_hint: "Add paths to frontmatter files_modified for accurate wave file lists."

  - dimension: context_compliance
    severity: warning
    plan: "03"
    description: "D-03 names Next/select-start/DEV for setActive-last; Task 1 automated behavior emphasizes Next-driven change (DEV/select covered by bake-gate + remount)."
    fix_hint: "Optional: explicitly map the three D-03 paths to next-bake vs bake-gate vs remount in Task 1 action."
```

**Blockers:** 0  
**Warnings:** 3  
**Info:** 0  

---

## Required Plan Revisions

**None.** Plans are execution-ready for N-LVL-02 + N-PROG-03 + N-PROG-04.

Optional hygiene (does not block execute):

1. Mark RESEARCH Open Questions `(RESOLVED)` and fix Q1 vs D-22.  
2. Align `files_modified` with task `<files>`.  
3. Optional D-03 three-path mapping note in C2-03 Task 1.

---

## Plan Summary

| Plan | Tasks | Wave | Depends | Status |
|------|-------|------|---------|--------|
| C2-00 | 2 | 0 | — | Valid — stars + LevelBest + Nyquist stubs |
| C2-01 | 2 | 1 | C2-00 | Valid — C1 UAT gate + ProgressBlob v3 |
| C2-02 | 2 | 2 | C2-01 | Valid — Select + shell + Results chrome |
| C2-03 | 3 | 3 | C2-02 | Valid — levelId/Next bake + docs + device UAT |

---

## Recommendation

**PASS** — proceed to `/gsd-execute-phase C2` (Wave 0 → 1 → 2 → 3). Plans deliver unlock/replay/stars for 5 levels without diluting C1-UAT gate, bake invariant, CERT/SOAK law, or lives-only v3 stars.

---

*Checker: gsd-plan-checker · Revision gate · 2026-09-25*
