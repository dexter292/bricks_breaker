# Deferred Items — Audit Ledger

**Last updated:** 2026-09-24 (D1/D2/D4 applied — see `DECISIONS-2026-09-24.md`)

Orphan deferred items that need an explicit owner and Results surface before MVP close.

| ID | Item | Origin | Owner | Status | Notes |
|----|------|--------|-------|--------|-------|
| **D2** | SC-2 release-build worklet mutation (profiling/release, iOS + Android) | Phase 1 waiver (`device-gate-results.md`); F-20 | **Phase 8 Plan 06** — dedicated Results row in `docs/phase8-certification.md` | **PARTIAL** | Android **WAIVED**. iOS Release **PASS** 2026-09-22 |
| **D4** | iOS profiling SC-2 re-run after HUD font fix | `01-04-SUMMARY.md`, `device-gate-results.md`; F-20 | **Phase 8 Plan 06** — dedicated Results row | **CLOSED 2026-09-22** | PASS via physical Instruments + SpaceMono/PERF_OVERLAY session; see `phase8-certification.md` |
| **D13** | `tsc --noEmit` errors (~6 known; incl. overlay `absoluteFillObject` runtime bug) | Phase 6 deferred-items; F-44 | **T1.2 code fix** + **`npm run typecheck`** in Phase 8 gate (`08-06-PLAN.md`) | **CLOSED 2026-09-21** | Overlay scrim fixed (T1.2); `npm run typecheck` green; script remains in Plan 06 gate |
| **F-45** | Ball speed ramp deferred | Owner decision 2026-09-21 | Post-MVP backlog | **DEFERRED** | No ramp in MVP; LVL-04 duration target softened — see REMEDIATION-PLAN T3.4 |
| **F-23** | Tier-3 "prefer steeper" rotation contract | RE-AUDIT-04 / NG-1 / NH-7 | — | **SUPERSEDED** | Replaced by NG-1 escalating ±nudge (8°/16°/24°…cap 30°) + dual angle floors. Nudge may flatten toward mid-band when parity opposes steepening — **intentional**, not a regression. See `stall.ts` `applyTier3AngleNudge` + `tests/rules.stall.test.ts` (NG-1). Old F-23 "prefer steeper" assertion removed on purpose. |
| **F-43** | Component-contract coverage (not UI-thread/worklet) | CODE-REVIEW / RE-AUDIT-02…07 | Post-MVP for PlayingHost | **CLOSED (N-QA-03)** | TitleScreen / GameScreen / GameHost Title↔Playing (PlayingHost stubbed). Still not UI-thread or worklet-loop coverage. |
| **NF-18f** | Duplicate `useFonts` (Title `GameHost` + `PlayingHost`) | RE-AUDIT-06 | — | **ACCEPTED** | Intentional: Title vs Playing hosts each load SpaceMono for their surface. `expo-font` caches; second call is cheap. Not a leak. |
| **Store email / NJ-3** | App Store / Play support contact email | NJ-3 / NK-7 / store submit | Owner | **CLOSED 2026-09-22** | Published `dexter@lkfnb.com` as primary Contact in privacy policy (md/html) + `SECURITY.md`; HOSTING verify greps the email |
| **WP-6** | Device certification rows | Phase 8 / post-MVP A1 | Hardware gate | **PARTIAL** | iOS ceiling **PASS** (§5 / 60 FPS bar 2026-09-24). Floor **NOT RUN** (R-10). Physical soak **PASS**. Android **OUT OF SCOPE (D2=B)** |
| **Trademark** | Store name | store docs | Owner | **MUST rename before ASC (D1=B)** | String TBD in `name-clearance.md`; G2 blocker |
| **R-12** | Quality tier RAM heuristic | DECISIONS-2026-09-24 | Post-MVP N-TIER-01 | **OPEN** | 4 GB iPhones get Mid budgets certified only on A18 Pro — see `docs/ops/QUALITY-TIER.md` |
| **R-15** | Store forms vs bundled Sentry | A4 / store docs | Owner + docs | **CLOSED 2026-09-24** | `CONSOLE-ENTRY.md` + `play-data-safety.md` now split DSN-off vs DSN-on; privacy policy already disclosed optional Sentry |
| **N-OPS-01** | Sentry DSN + dashboard crash proof | A4 / CRASH-REPORTING | Owner | **DEFERRED 2026-09-24** | Code wired DSN-off; owner skipped signup. **G1.9 still required** before G1 — resume `set-sentry-dsn.sh` |
| **R-16** | Dual reachability (TS lib vs CI script) | PHASE-VERIFY-A2-A4 | Dev | **CLOSED 2026-09-24** | Shared `scripts/lib/levelSolvability.mjs` + `tests/levels.solvability-parity.test.ts` |
| **R-17** | Soak mem start/end ambiguous | PHASE-VERIFY-A2-A4 | Docs | **CLOSED 2026-09-24** | Title-comparable footprints + peak column/note |
| **R-18** | Soak ledger missing pre-fix red | PHASE-VERIFY-A2-A4 | Docs | **CLOSED 2026-09-24** | phase8 Notes cite disposed HostFunction before `5144984` |
| **R-19** | G2.3 soak wording vs __DEV__-only harness | PHASE-VERIFY-A2-A4 | Docs | **CLOSED 2026-09-24** | G2.3 + RELEASE-GATES say dev-client; no release RSS claim |
| **F-40 SFX provenance** | Store originality | CODE-REVIEW | Owner | **CLOSED 2026-09-22** | `assets/sfx/README.md` — PCM format, ARR app-bundle license, no third-party pack |
| **Console entry** | ASC / Play form submit | PLT-04 / D-26 | Operator | **PREPARED** | ASC in use for iOS-first; Play deferred (D2=B) |
| **PHYS-05 aimed** | Aim drag-to-aim vs tap serve | FINAL / REQUIREMENTS | Owner | **WON’T-DO 2026-09-24** | A3 cohort skipped → B0 Won’t-Do; keep tap-only; N-PHYS-01 not Complete |
| **A3 cohort** | ≥5 playtests + D3 | N-QA-02 | Owner | **SKIPPED 2026-09-24** | Form remains optional; no Q4 data |
## Gate references

- Automated phase gate (Plan 06 Task 1): `npm test` (+ worklet closure assert) + `npm run typecheck` + `node scripts/assert-privacy-manifest.mjs`
- Device gate (Plan 06 Task 2): human fill of `PENDING_DEVICE` rows including D2/D4 dedicated rows

## Related

- `.planning/STATE.md` — Deferred Items table
- `.planning/milestones/v1.0-phases/08-showpiece-level-performance-certification-launch-baseline/08-06-PLAN.md` — `<deferred_items>` block
- `docs/audit/REMEDIATION-PLAN.md` — T3.4 / T8.2
