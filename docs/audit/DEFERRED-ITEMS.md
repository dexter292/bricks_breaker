# Deferred Items — Audit Ledger

**Last updated:** 2026-09-22 (soak harness PASS on sim; D2/D4 iOS closed; SFX/console/trademark docs)

Orphan deferred items that need an explicit owner and Results surface before MVP close.

| ID | Item | Origin | Owner | Status | Notes |
|----|------|--------|-------|--------|-------|
| **D2** | SC-2 release-build worklet mutation (profiling/release, iOS + Android) | Phase 1 waiver (`device-gate-results.md`); F-20 | **Phase 8 Plan 06** — dedicated Results row in `docs/phase8-certification.md` | **PARTIAL** | Android **WAIVED**. iOS Release **PASS** 2026-09-22 |
| **D4** | iOS profiling SC-2 re-run after HUD font fix | `01-04-SUMMARY.md`, `device-gate-results.md`; F-20 | **Phase 8 Plan 06** — dedicated Results row | **CLOSED 2026-09-22** | PASS via physical Instruments + SpaceMono/PERF_OVERLAY session; see `phase8-certification.md` |
| **D13** | `tsc --noEmit` errors (~6 known; incl. overlay `absoluteFillObject` runtime bug) | Phase 6 deferred-items; F-44 | **T1.2 code fix** + **`npm run typecheck`** in Phase 8 gate (`08-06-PLAN.md`) | **CLOSED 2026-09-21** | Overlay scrim fixed (T1.2); `npm run typecheck` green; script remains in Plan 06 gate |
| **F-45** | Ball speed ramp deferred | Owner decision 2026-09-21 | Post-MVP backlog | **DEFERRED** | No ramp in MVP; LVL-04 duration target softened — see REMEDIATION-PLAN T3.4 |
| **F-23** | Tier-3 "prefer steeper" rotation contract | RE-AUDIT-04 / NG-1 / NH-7 | — | **SUPERSEDED** | Replaced by NG-1 escalating ±nudge (8°/16°/24°…cap 30°) + dual angle floors. Nudge may flatten toward mid-band when parity opposes steepening — **intentional**, not a regression. See `stall.ts` `applyTier3AngleNudge` + `tests/rules.stall.test.ts` (NG-1). Old F-23 "prefer steeper" assertion removed on purpose. |
| **F-43** | Component-contract coverage (not UI-thread/worklet) | CODE-REVIEW / RE-AUDIT-02…07 | Post-MVP for PlayingHost | **PARTIAL** | Vitest aliases `react-native` → `react-native-web`; `@testing-library/react` + jsdom cover HudStrip / CountdownOverlay / LevelErrorOverlay. This is **component-contract** coverage — not UI-thread or worklet-loop coverage. Mounting PlayingHost / GameScreen / Title still deferred (heavy mocks). |
| **NF-18f** | Duplicate `useFonts` (Title `GameHost` + `PlayingHost`) | RE-AUDIT-06 | — | **ACCEPTED** | Intentional: Title vs Playing hosts each load SpaceMono for their surface. `expo-font` caches; second call is cheap. Not a leak. |
| **Store email / NJ-3** | App Store / Play support contact email | NJ-3 / NK-7 / store submit | Owner | **CLOSED 2026-09-22** | Published `dexter@lkfnb.com` as primary Contact in privacy policy (md/html) + `SECURITY.md`; HOSTING verify greps the email |
| **WP-6** | Device certification rows (`PENDING_DEVICE`) | Phase 8 Plan 06 | Hardware gate | **PARTIAL** | iOS D-16/D2/D4 PASS; soak harness PASS on **Simulator** (physical re-run owed). Pixel/Android **WAIVED**. PLT-03 Android **not claimed** |
| **Trademark** | Store name legal opinion | store docs | Legal / owner | **DEFERRED (soft-launch risk accepted)** | 2026-09-22: exact-title ASC collision documented in `name-clearance.md` (Gosiha “Neon brick breaker”). Formal counsel **not obtained**. Soft launch OK; paid UA / ™ claim blocked until opinion or rename |
| **F-40 SFX provenance** | Store originality | CODE-REVIEW | Owner | **CLOSED 2026-09-22** | `assets/sfx/README.md` — PCM format, ARR app-bundle license, no third-party pack |
| **Console entry** | ASC / Play form submit | PLT-04 / D-26 | Operator | **PREPARED** | Paste-ready checklist in `docs/store/CONSOLE-ENTRY.md`; console fields **not clicked** yet |

## Gate references

- Automated phase gate (Plan 06 Task 1): `npm test` (+ worklet closure assert) + `npm run typecheck` + `node scripts/assert-privacy-manifest.mjs`
- Device gate (Plan 06 Task 2): human fill of `PENDING_DEVICE` rows including D2/D4 dedicated rows

## Related

- `.planning/STATE.md` — Deferred Items table
- `.planning/phases/08-showpiece-level-performance-certification-launch-baseline/08-06-PLAN.md` — `<deferred_items>` block
- `docs/audit/REMEDIATION-PLAN.md` — T3.4 / T8.2
