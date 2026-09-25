# D1 Plan Check — Juice & Presentation Pass

**Checked:** 2026-09-25  
**Phase dir:** `.planning/post-mvp/phases/D1-juice-presentation/`  
**Plans:** `D1-00` … `D1-03` (4)  
**Method:** Goal-backward revision gate (gsd-plan-checker)  
**Verdict:** **PASSED** (0 blockers; 3 warnings)

---

## Phase Goal (source of truth)

| Source | Content |
|--------|---------|
| ROADMAP-NEXT D1 | Goal **N-FX-01…03**; Mid freeze; §5c Cert PASS before D1 |
| Acceptance | Ball readable; no A1 regression; `hashWorld` unchanged; golden-replay green |
| REQUIREMENTS-NEXT | N-FX-01 break presentation; N-FX-02 harness/locks (no delayed Results/confetti); N-FX-03 haptics OS note + coalesce + no reduce-motion AND |

---

## Special Focus Checklist

| Focus | Status | Where planned |
|-------|--------|---------------|
| **Mid freeze** (`particleCap` 128, glowScale 1, no particle/fill bumps) | ✅ | D1-00 behavior + quality-tiers verify; D1-01 acceptance; D1-02/03 QUALITY-TIER docs |
| **VFX-only / no World writes** | ✅ | D-15 in 00–01 interfaces; no `src/core/` edits; ghost SoA on `VfxState` |
| **`hashWorld` unchanged** | ✅ | Golden-replay + hash-canonical in D1-01/03; no `hash.ts` edits |
| **Haptic coalesce** (≤1/batch, life > break) | ✅ | D1-00 memory + D1-02 expo `coalesceHapticRank` |
| **No OS System Haptics query** | ✅ | D-09 avoid lists; threat T-D1-03/10/14; HAPTICS.md in 03 |
| **No reduce-motion AND** | ✅ | D-10; rg bans `useVfxIntensity` / `AccessibilityInfo` under haptics |
| **`paddleW` safe** | ✅ | D-17; punch/draw-only; assert no `paddleW=` in vfx; World identity tests |
| **§5c no blocking Cert** | ✅ | All plans note PASS; D1-03 Task 3 = **device feel** checkpoint, not Instruments Cert |
| **`threat_model`** | ✅ | Present on D1-00, 01, 02, 03 (STRIDE registers) |
| **`acceptance_criteria`** | ✅ | All `auto` tasks have `<acceptance_criteria>`; checkpoint has criteria + resume |

---

## Coverage Summary

| Requirement | Plans | Tasks | Status |
|-------------|-------|-------|--------|
| N-FX-01 | 00, 01, 03 | Ghost SoA → consume/step/draw → golden + UAT | Covered |
| N-FX-02 | 03 | Docs-only harness locks (D-06/D-07); no timed fades/confetti | Covered |
| N-FX-03 | 00, 02, 03 | Memory coalesce → expo-haptics → PlayingHost fan-out + HAPTICS.md | Covered |
| FC-F04 (CONTEXT D-17) | 00, 01, 03 | Squash SoA → punch/draw → device feel | Covered |
| Mid / A1 / hashWorld | 00–03 | Caps asserts + golden-replay | Covered |

**Locked decisions D-01…D-17:** Each referenced in plan actions; deferred ideas only appear in Avoid lists (no scope creep). No silent v1/stub reductions of locked decisions.

---

## Plan Summary

| Plan | Wave | depends_on | Tasks | Files (declared) | Structure | Status |
|------|------|------------|-------|------------------|-----------|--------|
| 00 | 0 | [] | 2 | 12 | valid | Valid |
| 01 | 1 | D1-00 | 2 | 6 | valid | Valid |
| 02 | 2 | D1-00 | 2 | 5 | valid | Valid |
| 03 | 3 | D1-01, D1-02 | 3 (2 auto + 1 human non-Cert) | 10 | valid | Valid |

**Dependency graph:** Acyclic. 01 ∥ 02 after 00; 03 after both. No same-wave file conflicts.

**Key links:** Ghost spawn → draw under ball; playBatch → audio + haptics (≤1 `scheduleOnRN`); docs → OS/coalesce/cert policy — all task-wired.

---

## Dimension Results

| # | Dimension | Result |
|---|-----------|--------|
| 1 | Requirement coverage | ✅ PASS |
| 2 | Task completeness | ✅ PASS (`gsd-tools verify plan-structure` all valid) |
| 3 | Dependency correctness | ⚠️ WARN — see W1 |
| 4 | Key links planned | ✅ PASS |
| 5 | Scope sanity | ✅ PASS (2–3 tasks/plan; under thresholds) |
| 6 | Verification derivation | ✅ PASS (user-observable truths; golden/Mid gates) |
| 7 | Context compliance | ✅ PASS (D-01…17 honored; deferred excluded) |
| 7b | Scope reduction | ✅ PASS (no fake v1/stub of locked decisions) |
| 7c | Architectural tier | ✅ PASS (matches RESEARCH responsibility map) |
| 8 | Nyquist compliance | ⚠️ WARN — see W2; VALIDATION.md exists; Wave 0 planned; all tasks have `<automated>` |
| 9 | Cross-plan data contracts | ✅ PASS (shared event codes / VfxState additive; no conflicting transforms) |
| 10 | `.cursor/rules/` | ✅ PASS (SDK 57 `expo-haptics`, Vitest, VFX≠World) |
| 11 | Research resolution | ⚠️ WARN — see W3 |
| 12 | Pattern compliance | ✅ PASS (analogs cited; shared patterns applied) |

### Dimension 8 detail (Nyquist)

| Task | Plan | Wave | Automated Command | Status |
|------|------|------|-------------------|--------|
| Ghost/squash SoA | 00 | 0 | vitest brick-ghosts + paddle-squash + particles + quality-tiers | ✅ |
| Memory haptics + VALIDATION W0 | 00 | 0 | vitest coalesce + W0 flag rg | ✅ |
| Consume/step | 01 | 1 | vitest ghosts/squash/particles/shake | ✅ |
| Draw + golden | 01 | 1 | vitest + golden-replay + hash-canonical + tiers | ✅ |
| Pin expo-haptics | 02 | 2 | node package.json pin check | ✅ |
| Expo service | 02 | 2 | vitest coalesce + rg bans | ✅ |
| PlayingHost fan-out | 03 | 3 | rg scheduleOnRN/playFromBatch + vitest | ✅ |
| Ops docs / Nyquist close | 03 | 3 | file/rg + combined vitest | ✅ |
| Device smoke (checkpoint) | 03 | 3 | same combined vitest (non-Cert human gate) | ✅ |

Sampling: each wave ≥2/2 or 3/3 with automated verify → ✅  
Wave 0 test files: planned in D1-00 (`brick-ghosts`, `paddle-squash`, `batch-coalesce`) → ✅  
VALIDATION.md: **exists** → gate OK (filenames currently stale; D1-00 Task 2 aligns them)

---

## Warnings (non-blocking)

```yaml
issues:
  - id: W1
    dimension: dependency_correctness
    severity: warning
    description: "D1-02 declares wave: 2 but depends_on only D1-00 (wave 0); expected wave = max(deps)+1 → 1. Graph is still acyclic; 02 could legally parallel 01."
    plan: "D1-02"
    fix_hint: "Either set wave: 1 for parallel juice∥haptics after 00, or add depends_on: [D1-01] if serial install-after-draw is intentional."

  - id: W2
    dimension: nyquist_compliance
    severity: warning
    description: "VALIDATION sampling estimates ~40s quick / 60s max feedback (>30s guideline). Automated verifies are Vitest unit/smoke, not E2E — acceptable but slightly slow."
    plan: null
    fix_hint: "Prefer per-task narrow vitest file lists (already mostly done); optional: note latency OK for this phase."

  - id: W3
    dimension: research_resolution
    severity: warning
    description: "D1-RESEARCH.md ## Open Questions has recommendations (omit mute; omit shell helpers; flat ghost fill) that plans follow, but section is not marked (RESOLVED)."
    plan: null
    file: "D1-RESEARCH.md"
    fix_hint: "Rename to '## Open Questions (RESOLVED)' and tag each item RESOLVED — no plan content change required."
```

---

## Structured Issues

```yaml
issues: []  # no blockers
warnings:
  - W1  # wave vs depends_on for D1-02
  - W2  # feedback latency
  - W3  # Open Questions formal RESOLVED marker
blocker_count: 0
warning_count: 3
```

---

## Recommendation

Plans will achieve D1 goal (N-FX-01…03, Mid freeze, ball readable, `hashWorld` identity, no blocking §5c Cert). Warnings are optional polish before `/gsd-execute-phase D1`.

**Next:** `/gsd-execute-phase D1` (or post-mvp D1 path used by this repo).
