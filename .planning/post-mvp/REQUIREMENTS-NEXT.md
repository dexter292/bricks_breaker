# REQUIREMENTS-NEXT — Post-MVP

**Status:** **FULL LOCK** — D1…D7 locked 2026-09-24 (`docs/audit/DECISIONS-FULL-LOCK-2026-09-24.md`)  
**Date:** 2026-09-24  
**Namespace:** `N-*` IDs — **do not overwrite** v1 PHYS/LVL/RUN/PWR/FX/PLT/ARCH IDs  
**Authority:** `docs/audit/DECISIONS-2026-09-24.md` + `DECISIONS-FULL-LOCK-2026-09-24.md`

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Proposed** | Candidate; not committed |
| **Approved** | Owner accepted into a milestone |
| **Deferred** | Explicitly postponed |
| **Inherited open** | v1 debt still tracked |

---

## 0. Inherited open (v1 debts)

| ID | Statement | Status | Gate |
|----|-----------|--------|------|
| PLT-03 | Stable 60 FPS on named mid-range **Android** (gfxinfo) | **Deferred (iOS-first, D2=B 2026-09-24)** — Android out of scope for this release; do not claim Complete | Future Android release |
| — | Android physical install smoke | **Deferred (D2=B)** | Future Play track |
| — | Physical iOS soak (100 + 15 min + mem/frame) | Inherited open | G2.3 |
| PHYS-05 aimed | Drag-to-aim launch | **Deferred — pending A3 cohort (D3=C)**; do not Complete / Won’t-Do yet | A3 → B0 decision |
| LVL-04 cohort | ≥5 first-time playtests | Soft open — covered by N-QA-02 | G2.11 |
| — | ASC console forms entered | Prepared ≠ done; Play deferred | G2.4 (ASC) |
| — | Display name | **MUST rename before listing (D1=B)** — string TBD | **G2** |

---

## 1. Hardening & release (Milestone A)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| **N-PLT-01** | Android install smoke | **Deferred** | D2=B — no Play track this release |
| **N-PLT-02** | iOS **ceiling** lock PASS on iPhone 16 Pro per `measurement-methodology.md` (profiling, ≥2×≥30s, worse run, Mid Cert WC); iOS **floor** lock on a named mid-tier (A13–A15, 60 Hz) — **floor NOT RUN, must not claim** | **Approved** | Ceiling-only until floor hardware exists (R-10) |
| **N-PLT-03** | Physical iOS soak: 100 Title↔Playing + 15 min continuous; no crash; mem/frame notes recorded | **Approved** | |
| **N-QA-01** | Automated gates remain green: `tsc`, lint, 267+ tests, worklet/skia/privacy asserts | **Approved** | |
| **N-QA-02** | First-time player cohort ≥5 completes playtest form covering controls clarity, desire to replay, pain points, **and** serve-agency: *"Khi bóng gắn vào paddle đầu mỗi lượt, bạn có muốn điều khiển hướng phóng không? (có / không / không để ý)"* | **Approved** | D3=C — "không để ý" is decisive |
| **N-QA-03** | Component-contract coverage for PlayingHost / GameScreen / Title mount paths (F-43) — not UI-thread/worklet proof | **Done** (TitleScreen / GameScreen / GameHost+PlayingHost stub) | Phase A2 — code complete; physical soak still open |
| **N-BRAND-01** | Display-name rename decision recorded; `app.config.js` `name` + Title/icon updated before ASC listing | **Approved** | D1=B; exact string TBD |
| **N-OPS-01** | Crash reporting integrated; confirmed receipt of a real crash from a distributed build | **Approved** | **Must → G1** |
| **N-OPS-02** | Post-ship update strategy written: OTA (`expo-updates` + `runtimeVersion`) **or** explicit resubmit-only | **Approved** | **Must → G2** (decision OK without integrating OTA) |
| **N-OPS-03** | SDK upgrade cadence with time trigger + owner (e.g. evaluate Expo 58 within 4 weeks of stable) | **Approved** | **Should** |
| **N-TIER-01** | Quality-tier resolver risk (R-12): document or fix so 4 GB iPhones are not silently given Mid budgets only proven on A18 Pro | **Documented (owner pick pending)** | See `docs/ops/QUALITY-TIER.md`; R-12 open until mitigation chosen; before G2 marketing |

---

## 2. Gameplay expansion (Milestone B)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| **N-PHYS-01** | Aimed docked serve (drag-to-aim; tap = vertical) | **Deferred — pending A3 cohort (D3=C)** | B0 only if cohort supports; else Won’t-Do or defer G |
| **N-BRK-01** | Explosive brick type; AoE; deterministic + unit-tested | **Approved** | |
| **N-PWR-01** | Extra-life pickup; hard cap; rare drops | **Approved** | |
| **N-PWR-02** | Timed slow-ball; clean expire; hashWorld tested | **Approved** | |
| **N-PWR-03** | Timed fireball/pierce; golden-replay updated | **Approved** | Highest physics risk — phase B3 alone |
| **N-PWR-04** | Drop table + mutual exclusion | **Approved** | |
| **N-PWR-05** | Sticky paddle | **Deferred** | Unified R-05 — not in v1.x set |

**Out of scope for B:** laser, shield, moving bricks, bosses, sticky.

---

## 3. Progression & levels (Milestone C)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| **N-LVL-01** | Campaign ships with **exactly 5** authored playable levels (schema + migrations if bumped) | **Approved** | D4; **3 baseline via E1a** with shipped verbs only; E1b enriches after B |
| **N-LVL-02** | Level select with lock/unlock | **Approved** | |
| **N-LVL-03** | Solvability / reachability lint: every breakable brick reachable (not steel-enclosed on all approachable sides); warn if steel corridor narrower than `2 × (BALL_RADIUS + SEPARATION_EPS)`; CI runs on `assets/levels/*.json`; **`level-02` must fail (negative fixture)** | **Approved** | D6=A / R-14 — self-check must go red on level-02 |
| **N-PROG-01** | Clear unlocks next; offline across kills | **Approved** | Storage v2 |
| **N-PROG-02** | Per-level best score on Results | **Approved** | |
| **N-PROG-03** | Stars 1–3 from documented criteria | **Approved** | |
| **N-PROG-04** | Cleared levels replayable | **Approved** | |

**Out of scope for C:** player-facing editor, cloud sync, daily challenge.

---

## 4. Visual & audio polish (Milestone D)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| **N-FX-01** | Break presentation upgrade; Mid budgets; ball readable | **Approved** | |
| **N-FX-02** | Transitions + win/lose commercial baseline; Retry instant | **Approved** | |
| **N-FX-03** | Haptics; respect OS off | **Approved** | |
| **N-AUD-01** | Ambient loop + mute | **Deferred** | |
| **N-BRAND-02** | Icon, splash, Title match renamed display name | **Approved** | Dep: N-BRAND-01 string chosen |

---

## 5. Content & balance (Milestone E)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| **N-CNT-01** | Difficulty curve validated by playtest | **Approved** | |
| **N-CNT-02** | Drop rates / star thresholds tuned | **Approved** | |
| **N-CNT-03** | Ball speed ramp (F-45) evaluate ship/reject | **Approved** | |

---

## 6. Store launch (Milestone F)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| **N-STORE-01** | **ASC** listing filled (privacy, age, screenshots, description). Play forms deferred (D2=B) | **Approved** | |
| **N-STORE-02** | TestFlight (external) crash triage with N-OPS-01 tooling | **Approved** | |
| **N-STORE-03** | Production build: no Cert/Soak/DEV chrome | **Approved** | |
| **N-STORE-04** | RELEASE-GATES green or owner-waived | **Approved** | |

---

## 7. Post-launch (Milestone G) — design basket

| ID | Requirement | Status |
|----|-------------|--------|
| **N-META-01** | Local achievements | Deferred |
| **N-META-02** | Cosmetics earn/IAP | Deferred |
| **N-META-03** | Daily seeded challenge (offline) | Deferred |
| **N-META-04** | Rewarded continue design + optional SDK | **Deferred — design doc only; no SDK integration before first ASC approval (D5=A)** |
| **N-META-05** | Laser / moving bricks / bosses | Deferred |
| **N-META-06** | Sticky paddle (promote from N-PWR-05) | Deferred |
| **N-META-07** | Android smoke + PLT-03 when returning to Android | Deferred |

---

## 8. Traceability

| Milestone | Requirement IDs |
|-----------|-----------------|
| A Hardening | N-PLT-02…03, N-QA-01…03, N-BRAND-01, N-OPS-01…03, N-TIER-01 |
| B Gameplay | N-PHYS-01 (if A3 cohort supports), N-BRK-01, N-PWR-01…04 |
| C Progression | N-LVL-01…03, N-PROG-01…04 |
| D Polish | N-FX-01…03, N-BRAND-02 |
| E Content | N-CNT-01…03 (+ E1a/E1b deliver N-LVL-01 + N-LVL-03) |
| F Store | N-STORE-01…04 |
| G Post | N-META-* |

Gameplay/content scope for first public is **Approved** under D1…D7. **N-TIER-01** is **Documented (owner pick pending)** — R-12 still open until mitigation chosen (`docs/ops/QUALITY-TIER.md`).
