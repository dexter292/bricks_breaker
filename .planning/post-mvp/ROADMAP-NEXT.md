# ROADMAP-NEXT — Post-MVP

**Status:** ✅ **FULL LOCK** — D1…D7 locked 2026-09-24  
**Date:** 2026-09-24  
**Baseline:** HEAD `f445e0c` · MVP close `2aaa9cf`  
**Authority:** `docs/audit/DECISIONS-2026-09-24.md` + `DECISIONS-FULL-LOCK-2026-09-24.md`  
**Does not replace:** `.planning/ROADMAP.md` (v1 phases 1–8)  
**Do not execute phases** until owner instructs start (scope locked; execution gated separately).

**Assumption label:** Effort bands assume 1 senior engineer + owner playtest; calendar weeks are order-of-magnitude, not commitments.

---

## Overview

Post-MVP is a **new milestone cycle**. Release posture: **iOS-first** (D2=B). First public campaign: **exactly 5 levels** (D4). Display name: **rename before ASC** (D1=B). Aimed serve: **conditional on A3 cohort** (D3=C). No monetization SDK pre-launch (D5=A). Content baseline **E1a** runs parallel from Milestone A (D7 / R-13).

```
A Hardening ──┬──► B Gameplay ──► C Progression ──► D Polish
              │         │                │
              └── E1a ──┴── E1b ─────────┴──► E2 Balance
                              └──────────────────► F Store → G Post
```

| Priority class | What |
|----------------|------|
| **Must before public iOS release** | A gates + F paperwork; rename; crash reporting; G2.13/G2.17; **5 levels via E1a** |
| **Should in first public** | Progression (C) + polish (D) + E1b verb teaching |
| **Defer** | Android cert, editor, laser, bosses, ads SDK, sticky, accounts |

---

## Milestone map

| Milestone | Goal | Approx effort* |
|-----------|------|----------------|
| **A** Hardening & Release Gates | Ceiling cert, soak, playtest+D3 data, rename, ops | 1–3 weeks |
| **B** Gameplay Expansion | Explosive + power-ups (+ B0 if cohort supports) | 2–4 weeks |
| **C** Level Progression | Unlock, select, per-level PB, stars | 1.5–3 weeks |
| **D** Visual & Audio Polish | Juice + brand under new name | 1.5–3 weeks |
| **E** Content | **E1a // A**; **E1b after B**; E2 balance | E1a from day 1 |
| **F** Store Launch | ASC + TestFlight + submit | 1–2 weeks + review |
| **G** Post-Launch | Meta / monetization design / Android return | Data-driven |

\*Instruments + store review dominate calendar. Floor mid-tier still missing (R-10).

---

## Milestone A — MVP Hardening & Release Gates

**Goal:** Honest iOS evidence, soak, playtest (incl. D3 data), rename path, ops — **no new gameplay systems**.

### Phase A1 — iOS Ceiling Certification
| Field | Content |
|-------|---------|
| **Goal** | Close N-PLT-02 **ceiling** under new protocol |
| **Scope** | Cert WC Mid on iPhone 16 Pro, **profiling**, ≥2×≥30s, worse run |
| **Out of scope** | Floor mid-tier (`NOT RUN` deliverable); Android; features |
| **Acceptance** | p50≤16.7ms **and** (p95≤20ms **or** jank≤5%) **and** Hangs=0 on `display-surface-swap` Δ (forced Mid); floor deliverable stays `NOT RUN` |
| **Parallel?** | With A2/A3/A4/**E1a** |
| **Progress** | **Done / PASS** 2026-09-24 — owner locked §5 (60 FPS + jank OR). Worse run p50≈8.9 / p95≈16.1 / Hangs 0. G2.16 ceiling closed. Floor still R-10 |

### Phase A2 — Physical Soak & Automated Regression Floor
| Field | Content |
|-------|---------|
| **Goal** | Physical soak + suite green + F-43 |
| **Scope** | N-PLT-03; N-QA-01; **N-QA-03** |
| **Acceptance** | No crash; no sustained degradation; contract tests green |
| **Parallel?** | Yes with A1/A3/A4/E1a |
| **Progress** | **Done** — N-QA-03; N-QA-01 green at `33ad226`; N-PLT-03 physical soak **PASS** 2026-09-24 (dev-client) |

### Phase A3 — Playtest Cohort & Branding Gate
| Field | Content |
|-------|---------|
| **Goal** | Human feedback + rename shortlist + **D3 recommendation** |
| **Scope** | ≥5 playtests; N-BRAND-01 string; **serve-agency question required** (N-QA-02) |
| **Deliverables** | Playtest notes; name in name-clearance; **D3 recommendation from cohort data** |
| **Acceptance** | Cohort done; name written; **serve-agency answered by ≥5** |
| **Parallel?** | Yes; unblocks D2 Brand early |
| **Progress** | **SKIPPED** 2026-09-24 — owner skipped cohort; no ≥5 Q4 data. Form/runbook remain for optional later. **N-BRAND-01 string still TBD** (no rename pulse). **D3 → B0 Won’t-Do** (see B0) |

### Phase A4 — Operational Readiness
| Field | Content |
|-------|---------|
| **Goal** | N-OPS-01…03 |
| **Acceptance** | Real crash in dashboard; OTA-or-resubmit text signed; SDK cadence dated |
| **Gates** | N-OPS-01 → G1; N-OPS-02 → G2 |
| **Parallel?** | Yes with A1–A3/E1a |
| **Progress** | N-OPS-02/03 **Done**. N-OPS-01 code wired (DSN-off); **owner deferred** dashboard verify 2026-09-24 — resume via `./scripts/set-sentry-dsn.sh` before G1 |

---

## Milestone B — Gameplay Expansion

### Phase B0 — Aimed Serve (conditional — gated on A3 cohort, D3=C)
| Field | Content |
|-------|---------|
| **Goal** | N-PHYS-01 if cohort supports |
| **Scope** | Intent aim; dock policy; clamps; tests |
| **Out of scope** | Fireball; sticky |
| **Decision point after A3** | implement (→ B0) / Won’t-Do (→ close PHYS-05 debt) / defer to G |
| **Parallel?** | With B1/B2 **if** greenlit |
| **Progress** | **Won’t-Do** 2026-09-24 — A3 cohort skipped → no serve-agency data; keep **tap-only** serve; close PHYS-05 aimed debt honestly (N-PHYS-01 not Complete) |

### Phase B1 — Schema & Explosive Bricks
| Field | Content |
|-------|---------|
| **Goal** | N-BRK-01 |
| **Out of scope** | Moving bricks; bosses |
| **Acceptance** | Deterministic cascade; Mid particle budget documented |
| **Parallel?** | With B2 after enum reserved; with B0 if active |
| **Progress** | **Done** 2026-09-24 — `explosive` schema + `BrickFlags.EXPLOSIVE`; 8-neighbor cascade; Mid budget in `docs/ops/EXPLOSIVE-BRICKS.md`; 1-row lattice fix in `apply.ts` |

### Phase B2 — Power-up Pack (Extra Life, Slow, Exclusion)
| Field | Content |
|-------|---------|
| **Goal** | N-PWR-01, N-PWR-02, N-PWR-04 |
| **Out of scope** | Laser, shield, **sticky** |
| **Parallel?** | With B1; with B0 if active |
| **Progress** | **Done** 2026-09-24 — extra life (cap 5); slow 8s @0.5 scale; drop table 40/40/12/8; SLOW↔FIREBALL exclusion reserved; `docs/ops/POWERUPS-B2.md` |

### Phase B3 — Fireball Pierce
| Field | Content |
|-------|---------|
| **Goal** | N-PWR-03 only |
| **Deps** | B2 drop table |
| **Risks** | Highest physics risk |
| **Parallel?** | **No** — serialize on physics hot path |
| **Progress** | **Done** 2026-09-24 — pierce breakables / bounce steel; 8s; drop 10%; golden hash identity; `docs/ops/FIREBALL-B3.md` |

---

## Milestone C — Level Progression

### Phase C1 — Progress Storage & Unlock Model
| Field | Content |
|-------|---------|
| **Goal** | Offline progress for **5-level** catalog |
| **Scope** | N-PROG-01, N-PROG-02; storage v2 |
| **Parallel?** | With E1a/E1b data |
| **Plans** | 3 plans |
| **Progress** | **Done** 2026-09-24 — ProgressStore `@nbb/progress/v2`; unlock-on-win; per-level Results Best; Title rollup; `docs/ops/PROGRESS-STORAGE.md` |

Plans:
- [x] `C1-00-PLAN.md` — Wave 0: ProgressBlob/ProgressStore contracts, catalog + unlock pure, Vitest stubs
- [x] `C1-01-PLAN.md` — Wave 1: parse/migrate + ProgressStore memory/AsyncStorage singleton
- [x] `C1-02-PLAN.md` — Wave 2: PlayingHost/GameHost wire + ops doc + device smoke

### Phase C2 — Level Select + Stars + Replay
| Field | Content |
|-------|---------|
| **Goal** | N-LVL-02, N-PROG-03, N-PROG-04 |
| **Deps** | C1 (**device UAT before v3 migration**) |
| **Acceptance** | Unlock/replay/stars correct for 5 levels |
| **Plans** | 4 plans |
| **Progress** | **Done** 2026-09-25 — Select + stars (lives) + Next; Progress v3; Human UAT approved |

Plans:
- [x] `C2-00-PLAN.md` — Wave 0: stars helpers + LevelBest types + Vitest stubs (progress-v3 / Select / Next-bake / Results)
- [x] `C2-01-PLAN.md` — Wave 1: C1 UAT gate + ProgressBlob v3 parse/migrate/store + recordRunEnd
- [x] `C2-02-PLAN.md` — Wave 2: SelectScreen + ShellPhase select + ResultOverlay stars/Next chrome
- [x] `C2-03-PLAN.md` — Wave 3: required levelId + Next bake checklist + docs + device UAT / cert-arm smoke

---

## Milestone D — Visual & Audio Polish

### Phase D1 — Juice & Presentation Pass
| Field | Content |
|-------|---------|
| **Goal** | N-FX-01…03 |
| **Deps** | Prefer after B; **ceiling Cert WC re-run after C2 BEFORE D1** (B3) — **§5c PASS 2026-09-25**; freeze Mid |
| **Acceptance** | Ball readable; no regression vs A1; `hashWorld` unchanged; golden-replay green |
| **Plans** | 4 plans |
| **Progress** | **Done** 2026-09-25 — juice + haptics UAT approved; **post-D1 Cert WC still required** (§5d) |

Plans:
- [x] `D1-00-PLAN.md` — Wave 0: ghost/squash SoA + memory haptics coalesce + Nyquist stubs
- [x] `D1-01-PLAN.md` — Wave 1: brick ghosts + paddle squash consume/step/draw (N-FX-01)
- [x] `D1-02-PLAN.md` — Wave 2: expo-haptics ~57.0.3 + expo service soft-fail (N-FX-03)
- [x] `D1-03-PLAN.md` — Wave 3: PlayingHost wire + ops docs + N-FX-02 harness locks + Human UAT approved 2026-09-25

### Phase D2 — Brand Surfaces
| Field | Content |
|-------|---------|
| **Goal** | N-BRAND-02 under renamed display name |
| **Deps** | A3 name string |
| **Parallel?** | Yes early after A3 |

---

## Milestone E — Content & Playtesting

### Phase E1a — Baseline Authorship (R-13 / D7)
| Field | Content |
|-------|---------|
| **Goal** | Author **3 new** levels using **only shipped verbs**; reach **N-LVL-01 = 5**; ship **N-LVL-03** lint |
| **Order** | **Implement N-LVL-03 lint first** (prove red on `level-02`), **then** author the 3 levels under the lint — do not author first and bolt lint on after |
| **Scope** | Hand-authored JSON (multi-HP, steel, existing pickups); solvability lint in validate or CI assert; **`level-02` must fail lint** (negative fixture) |
| **Deps** | **None** — schema v1 + shipped verbs enough |
| **Acceptance** | Lint tool self-checks red on `level-02`; 5 playable LevelIds; lint **green** on 5 ship levels |
| **Parallel?** | **Yes — from Milestone A day 1** (A1/A2/A3/A4 + E1a) |
| **Risk** | E1b may retouch layouts when new verbs land — accepted (JSON cheaper than G2.10 single-point risk) |
| **Progress** | **Done** — N-LVL-03 lint + levels 01/03/04/05/06 ship; `level-02` negative fixture; R-16 parity closed |

### Phase E1b — Verb Enrichment
| Field | Content |
|-------|---------|
| **Goal** | Retouch/add layouts teaching explosive + new power-ups |
| **Deps** | B1/B2 (and B3 if fireball used in teaching boards) |
| **Acceptance** | Playtest notes; lint still green on ship set |
| **Parallel?** | With C/D |

### Phase E2 — Balance Pass
| Field | Content |
|-------|---------|
| **Goal** | N-CNT-01…03 |
| **Deps** | E1a (+ E1b if done) + cohort |
| **Acceptance** | Owner sign-off on curve |

---

## Milestone F — Store Launch

### Phase F1 — Store Package & External Testing
| Field | Content |
|-------|---------|
| **Goal** | ASC + TestFlight ready |
| **Scope** | N-STORE-01…04; screenshots under **new name**; no ads SDK (G2.17) |
| **Deps** | RELEASE-GATES G1/G2 Must |
| **Acceptance** | External builds out; crash triage via N-OPS-01 |

### Phase F2 — Public Submit (iOS)
| Field | Content |
|-------|---------|
| **Goal** | Submit to ASC |
| **Deps** | F1 + owner go/no-go |
| **Acceptance** | Binary in review; listing live when approved |

---

## Milestone G — Post-Launch Expansion

Candidates: achievements; cosmetics; daily challenge; monetization **design then SDK** (D5=A clear); sticky; laser/moving/boss; Android return; editor if authoring pain proven (≥15–20 levels).

---

## Open ledger (do not hide)

| ID | Status |
|----|--------|
| **R-10** | Floor mid-tier iOS NOT RUN — ceiling-only |
| **R-12** | Tier resolver RAM-only — N-TIER-01 Documented; **owner pick pending** (`QUALITY-TIER.md` lean #3+#6) |
| **Display name string** | TBD — A3 / G2.15 |
| **D3 final** | Pending A3 cohort data |
| **N-OPS-01** | Pending owner Sentry DSN + dashboard event |

---

## Parallelism summary

| Can parallel | Cannot parallel |
|--------------|-----------------|
| **A1/A2/A3/A4 + E1a** | B3 with other physics-heavy work |
| B0 (if greenlit) + B1 + B2 | F2 before G2 Must |
| C1 data + E1b authoring | Claiming floor FPS without floor device |
| D2 brand after name string | Marking PHYS-05 Complete before A3 |

---

## Mapping to GSD

Roadmap scope is **locked**. When owner says start:
1. Keep Approved rows in REQUIREMENTS-NEXT.md  
2. Point STATE at this roadmap  
3. discuss → research → plan per phase (Standard granularity)  
4. **Do not auto-start A1** until instructed  

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-24 | Initial PROPOSED from post-MVP research |
| 2026-09-24 | Applied DECISIONS round 1: D1=B, D2=B, D4=5, R-02 A4, A1 ceiling, B0/B3 split |
| 2026-09-24 | **FULL LOCK** round 2: D3=C, D5=A, D6=A+N-LVL-03, D7+E1a/E1b |
| 2026-09-24 | Progress sync: A2/E1a Done; A4 ops partial; A1 LC-07-clean pending Instruments; A3 cohort 0/5 |
| 2026-09-24 | **A1 PASS** — owner locked ceiling bar §5 (60 FPS + jank OR); G2.16 closed; floor still NOT RUN |
| 2026-09-24 | **N-OPS-01 deferred** — owner skip Sentry DSN for now; A3 cohort still OPEN; G1.9 not waived |
| 2026-09-24 | **B1 Done** — N-BRK-01 explosive bricks (schema, cascade, Mid particle budget doc); A3 cohort still 0/5 |
| 2026-09-24 | **B2 Done** — N-PWR-01/02/04 extra life + slow + drop table/exclusion; fireball still B3 |
| 2026-09-24 | **B3 Done** — N-PWR-03 fireball pierce; drop table 36/36/10/10/8; Milestone B gameplay pack complete (B0 still gated on A3) |
| 2026-09-24 | **A3 SKIPPED** (owner) → **B0 Won’t-Do** tap-only; next **C1** GSD plan |
| 2026-09-24 | **C1 Planned** — 3 plans (Wave 0 contracts → store/migrate → host wire) in `post-mvp/phases/C1-progress-storage/` |
| 2026-09-24 | **C1 Done** — ProgressStore v2 + migrate; PlayingHost unlock-on-win + per-level Best; Title rollup; ops doc |
| 2026-09-25 | **C2 Done** — Level Select + lives-stars (N-PROG-03) + Next/replay; Progress v3; Human UAT approved; ceiling re-run still pending (§6) |
| 2026-09-25 | **D1 Context** — Mid freeze; cert after C2 before D1; haptics+batch; brick/paddle juice VFX-only; parallax deferred |
| 2026-09-25 | **Ceiling re-run PASS** post B+C2 (owner) — D1 B3 gate cleared |
| 2026-09-25 | **D1-03 code/docs** — PlayingHost haptics fan-out; `docs/ops/HAPTICS.md`; Mid freeze + §5c second-Cert note; N-FX-02 harness locks; Nyquist true — device smoke pending |
| 2026-09-25 | **D1 Done** — Human UAT approved (juice + haptics feel); zero-alloc draw scratch + lint fix; **post-D1 Cert WC still required** (§5d) |
