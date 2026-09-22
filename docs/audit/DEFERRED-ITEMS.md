# Deferred Items — Audit Ledger

**Last updated:** 2026-09-22 (RE-AUDIT-05 doc/code remediation: F-23 SUPERSEDED note, D2/D4 Results rows)

Orphan deferred items that need an explicit owner and Results surface before MVP close.

| ID | Item | Origin | Owner | Status | Notes |
|----|------|--------|-------|--------|-------|
| **D2** | SC-2 release-build worklet mutation (profiling/release, iOS + Android) | Phase 1 waiver (`device-gate-results.md`); F-20 | **Phase 8 Plan 06** — dedicated Results row in `docs/phase8-certification.md` | **OPEN** | p50/p95/jank schema cannot represent this gate; must record PASS/FAIL per platform/build profile |
| **D4** | iOS profiling SC-2 re-run after HUD font fix | `01-04-SUMMARY.md`, `device-gate-results.md`; F-20 | **Phase 8 Plan 06** — dedicated Results row | **OPEN** | Untracked follow-up from Phase 1; Instruments re-run required |
| **D13** | `tsc --noEmit` errors (~6 known; incl. overlay `absoluteFillObject` runtime bug) | Phase 6 deferred-items; F-44 | **T1.2 code fix** + **`npm run typecheck`** in Phase 8 gate (`08-06-PLAN.md`) | **CLOSED 2026-09-21** | Overlay scrim fixed (T1.2); `npm run typecheck` green; script remains in Plan 06 gate |
| **F-45** | Ball speed ramp deferred | Owner decision 2026-09-21 | Post-MVP backlog | **DEFERRED** | No ramp in MVP; LVL-04 duration target softened — see REMEDIATION-PLAN T3.4 |
| **F-23** | Tier-3 "prefer steeper" rotation contract | RE-AUDIT-04 / NG-1 / NH-7 | — | **SUPERSEDED** | Replaced by NG-1 escalating ±nudge (8°/16°/24°…cap 30°) + dual angle floors. Nudge may flatten toward mid-band when parity opposes steepening — **intentional**, not a regression. See `stall.ts` `applyTier3AngleNudge` + `tests/rules.stall.test.ts` (NG-1). Old F-23 "prefer steeper" assertion removed on purpose. |
| **F-43** | Component/runtime boundary tests (`@testing-library/*`, `jest-expo`) | CODE-REVIEW / RE-AUDIT-02…05 | Post-MVP / device-adjacent | **DEFERRED** | Vitest covers core; UI-thread + RN mount harness still needs separate Expo test runner. CI now runs `test`+`lint`+`typecheck`+`assert:*` (`.github/workflows/ci.yml`). Worklet guard self-checks known-good/known-bad fixtures (NJ-1). |
| **WP-6** | Device certification rows (`PENDING_DEVICE`) | Phase 8 Plan 06 | Hardware gate | **OPEN** | Cannot close in CI; fill `docs/phase8-certification.md` on device (D2/D4 rows present) |
| **Trademark** | Store name legal opinion | store docs | Legal / owner | **DEFERRED** | Outside code remediation |

## Gate references

- Automated phase gate (Plan 06 Task 1): `npm test` (+ worklet closure assert) + `npm run typecheck` + `node scripts/assert-privacy-manifest.mjs`
- Device gate (Plan 06 Task 2): human fill of `PENDING_DEVICE` rows including D2/D4 dedicated rows

## Related

- `.planning/STATE.md` — Deferred Items table
- `.planning/phases/08-showpiece-level-performance-certification-launch-baseline/08-06-PLAN.md` — `<deferred_items>` block
- `docs/audit/REMEDIATION-PLAN.md` — T3.4 / T8.2
