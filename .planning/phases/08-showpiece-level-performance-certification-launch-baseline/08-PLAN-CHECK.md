# Phase 08 Plan Check

**Checked:** 2026-09-21  
**Phase:** 08-showpiece-level-performance-certification-launch-baseline  
**Plans verified:** 7 (`08-00` … `08-06`)  
**Status:** FAILED — 1 blocker(s), 1 warning(s), 2 info

---

## Goal-Backward Summary

Phase goal (ROADMAP): One authored challenge level, certified at 60 FPS on real hardware, with store-compliance paperwork ready.

| Success criterion | Covering plans | Status |
|-------------------|----------------|--------|
| 1. Hand-authored ~2–3 min showpiece with acts/plateaus + replay desire | 08-01 (level-03 + boot), 08-06 (human UAT) | Covered |
| 2. Release/profiling 60 FPS worst-case on mid-range device (gfxinfo/Instruments, not RN monitor) | 08-03 (harness + protocol), 08-06 (Results + gate) | Covered |
| 3. Low/Mid/High VFX caps; `core/` blind to tier | 08-02 | Covered |
| 4. Mount/unmount soak — no loop leaks / frame-time drift | 08-04 (harness + audio asserts), 08-06 (device soak Results) | Covered |
| 5. Live HTTPS privacy + Play Data Safety + age + iOS privacyManifest + name + originality | 08-05, 08-06 (URL still live) | Covered |

**Requirement IDs in plan frontmatter:** LVL-04 ✓ · PLT-03 ✓ · PLT-04 ✓

**CONTEXT D-01…D-27:** All referenced in plan actions/objectives. Deferred ideas excluded (no production level-select, no ad/IAP SDKs, no store submit, no music/haptics). UI hint `no` honored — only `__DEV__`-gated controls planned.

**Threat models:** Present on all seven plans; HIGH-pattern threats (corrupt level JSON, DEV elevation, privacy over-claim) mitigated.

---

## Dimension Results

| # | Dimension | Result |
|---|-----------|--------|
| 1 | Requirement coverage | ✅ PASS |
| 2 | Task completeness | ✅ PASS (all auto tasks: files/action/verify/done + read_first + acceptance_criteria) |
| 3 | Dependency correctness | ✅ PASS (acyclic; waves consistent; 01∥05 after 00; 06 waits on 03/04/05) |
| 4 | Key links planned | ✅ PASS |
| 5 | Scope sanity | ℹ️ INFO — Plan 00 ~16 files (Wave 0 stubs); Plan 02 ~10 files (warning band) |
| 6 | Verification derivation | ✅ PASS (user-observable truths) |
| 7 | Context compliance | ✅ PASS (D-01…D-27 mapped; deferred excluded) |
| 7b | Scope reduction | ✅ PASS (no silent “v1 / stub instead of decision” reductions) |
| 7c | Architectural tier | ✅ PASS (matches RESEARCH responsibility map) |
| 8 | Nyquist compliance | ✅ PASS (VALIDATION.md present; Wave 0 + `<automated>` wired) |
| 9 | Cross-plan data contracts | ✅ PASS |
| 10 | `.cursor/rules/` | ✅ PASS (Expo SDK 57 docs / `npx expo install`; Vitest; no forbidden libs) |
| 11 | Research resolution | ❌ FAIL — Open Questions not marked RESOLVED |
| 12 | Pattern compliance | ℹ️ INFO — Plans 03–06 lean on inline shared patterns; PATTERNS.md not always in `<context>` |

### Dimension 8 detail

| Task | Plan | Wave | Automated Command | Status |
|------|------|------|-------------------|--------|
| 1–2 | 00 | 0 | expo-device pin + file stubs; vitest stub suite | ✅ |
| 1–2 | 01 | 1 | `levels.compile` + `runtime.loadLevel` + fixture git diff | ✅ |
| 1–2 | 02 | 2 | quality-tiers + particles + core.purity | ✅ |
| 1–2 | 03 | 3 | rg CERT/__DEV__/eas hygiene + purity; rg protocol docs | ✅ |
| 1–2 | 04 | 4 | `audio.release` + SOAK rg / eas hygiene | ✅ |
| 1–2 | 05 | 1 | assert-privacy-manifest + LIVE_URL curl | ✅ |
| 1–2 | 06 | 5 | full `npm test` + assert + Results scaffolding; UAT rg | ✅ |

Sampling: no 3 consecutive implementation tasks without `<automated>` → ✅  
Wave 0 stubs planned in 08-00 → ✅  
Watch-mode / >45s automated gates → ✅ none  

---

## Plan Summary

| Plan | Tasks | Files≈ | Wave | depends_on | Requirements | Status |
|------|-------|--------|------|------------|--------------|--------|
| 00 | 2 | 16 | 0 | — | LVL-04, PLT-03, PLT-04 | Valid (stub-heavy) |
| 01 | 2 | 5 | 1 | 00 | LVL-04 | Valid |
| 02 | 2 | 10 | 2 | 00, 01 | PLT-03 | Valid |
| 03 | 2 | 5 | 3 | 01, 02 | PLT-03 | Valid |
| 04 | 2 | 3 | 4 | 00, 01, 03 | PLT-03 | Valid |
| 05 | 2 | 9 | 1 | 00 | PLT-04 | Valid |
| 06 | 2 | 4 | 5 | 03, 04, 05 | PLT-03, PLT-04 | Valid |

---

## Coverage Summary

| Requirement | Plans | Status |
|-------------|-------|--------|
| LVL-04 | 00, 01 | Covered |
| PLT-03 | 00, 02, 03, 04, 06 | Covered |
| PLT-04 | 00, 05, 06 | Covered |

| Decision | Plan(s) | Status |
|----------|---------|--------|
| D-01…D-08 showpiece / boot / DEV switch | 01 | Covered |
| D-09…D-13 quality tiers | 02 (+ 03/06 reinforce D-13) | Covered |
| D-14…D-18 cert protocol | 03, 06 | Covered |
| D-19…D-23 soak | 04, 06 | Covered |
| D-24…D-27 store baseline | 05, 06 | Covered |

---

## Structured Issues

```yaml
issues:
  - plan: null
    dimension: research_resolution
    severity: blocker
    description: >
      08-RESEARCH.md still has "## Open Questions" without (RESOLVED) suffix and without
      per-item RESOLVED markers. Dimension 11 requires questions closed before execution.
      Plans already lock answers (A1 thresholds in 08-03; DEV Cert WC in 08-03; host
      discretion in 08-05) but RESEARCH was not updated.
    fix_hint: >
      Edit 08-RESEARCH.md: rename to "## Open Questions (RESOLVED)" and mark each item
      RESOLVED with the locked answer (1=A1 p50≤16.7/p95≤20 or ≤5% jank in phase8-certification.md;
      2=DEV Cert WC Pressable one-shot inject per 08-03; 3=static HTTPS host TBD by human at
      Plan 05 Task 2). Same fix pattern as Phase 02 plan-check clearance.
    file: .planning/phases/08-showpiece-level-performance-certification-launch-baseline/08-RESEARCH.md

  - plan: "06"
    dimension: context_compliance
    severity: warning
    description: >
      Plan 06 Task 2 refers to "D-04 preliminary" for substitute-Android waiver language.
      In Phase 8 CONTEXT, D-04 is deterministic physics / Act 3 fairness. Substitute Android
      is D-17 (and Phase 1 historical D-04). Wrong ID risks executor confusion at the gate.
    task: 2
    fix_hint: >
      In 08-06-PLAN.md Task 2 action/acceptance, replace "D-04 preliminary" with
      "D-17 preliminary (substitute Android)" and keep "MVP still requires Pixel re-cert".
    file: .planning/phases/08-showpiece-level-performance-certification-launch-baseline/08-06-PLAN.md

  - plan: "00"
    dimension: scope_sanity
    severity: info
    description: >
      Plan 00 lists ~16 files_modified (Wave 0 stubs + docs). At blocker threshold on paper,
      but work is mechanical stub/install — same acceptance pattern as Phase 02 Wave plans
      with large file sets. No split required unless executor context pressure appears.
    metrics:
      tasks: 2
      files: 16
    fix_hint: "None required — optional: move store doc stubs solely under Plan 05 files list"

  - plan: "02"
    dimension: scope_sanity
    severity: info
    description: "Plan 02 touches ~10 files (warning band) for tier+VFX wiring — cohesive PLT-03 slice"
    metrics:
      tasks: 2
      files: 10
    fix_hint: "None required"
```

---

## Recommendation

**1 blocker** must be fixed before `/gsd-execute-phase 08`:

1. Mark `08-RESEARCH.md` Open Questions as **(RESOLVED)** with the three locked answers already implied by Plans 03/05.
2. (Warning) Fix Plan 06 D-04 → D-17 wording.

After revision, re-run plan-check. Execution path is otherwise sound: Wave 0 → showpiece ∥ store → tiers → cert harness → soak → device gate.

---

## VERIFICATION FAILED
