# RELEASE GATES — Post-MVP

**Status:** Active checklist — FULL LOCK aligned 2026-09-24  
**Baseline debts:** `docs/audit/MVP-CLOSE-REPORT.md` §6 — remain open until evidence closes them  
**Authority:** `docs/audit/DECISIONS-2026-09-24.md`  
**Rule:** Temporary MVP close ≠ public release. WAIVED ≠ PASS ≠ OUT OF SCOPE. Do not invent numbers.

---

## Gate levels

| Level | Meaning | Authorized when green |
|-------|---------|------------------------|
| **G0** Internal iOS playtest | Already authorized at MVP close | Sideload / TestFlight internal |
| **G1** External testing | Wider testers (TestFlight external) | See §2 |
| **G2** Public **iOS** store release | Anyone can download on iOS | See §3 |
| **G3** Paid user acquisition | Spend on ads under product name | See §4 |

**Platform posture (D2=B):** Public release for this cycle is **iOS-only**. Android is **deferred / OUT OF SCOPE**, not abandoned. Do not tick PLT-03 Complete. Play Console entry is prepared but not required for G2.

---

## 1. Carried open debts

| Debt | Evidence required | Blocks | Status |
|------|-------------------|--------|--------|
| **PLT-03** Android mid-range gfxinfo | Named Android + protocol PASS | Future Android release / dual-store FPS claims | **OUT OF SCOPE (iOS-first D2=B)** — do not claim Complete |
| **Android smoke** | Physical Android install | Future Play track | **OUT OF SCOPE (D2=B)** |
| **Physical soak** | iPhone 100+15 min + mem/frame | G2.3 | **PASS** (dev-client 2026-09-24; not release RSS) |
| **PHYS-05 aimed** | Implement or Won’t-Do **after A3 cohort** (D3=C) | Spec hygiene | **DEFERRED — pending A3** |
| **LVL-04 cohort** | ≥5 first-time playtests | G2.11 | **OPEN (soft)** |
| **Console entry ASC** | ASC forms submitted | G2.4 | **PREPARED only** |
| **Console entry Play** | Play forms | Future Android | **PREPARED — deferred** |
| **Display name rename** | New `name` in app.config + listing | **G2** | **MUST — rename before listing (D1=B)**; string TBD |
| **iOS ceiling Cert** | Protocol PASS on 16 Pro profiling | G2 / N-PLT-02 | **NOT PASS (export 2026-09-24)** — Hangs 0; swap Δ p95≈16 ms; G2.16 open |
| **iOS floor Cert** | Named mid-tier 60 Hz | N-PLT-02 claim floor | **NOT RUN (R-10)** |
| **R-12 tier resolver** | Fix or document | G2 marketing honesty | **OPEN** — see `docs/ops/QUALITY-TIER.md` |

---

## 2. Gate G1 — External testing (iOS)

**Must**

| # | Criterion | Evidence |
|---|-----------|----------|
| G1.1 | Automated: `tsc`, lint, vitest green on RC commit | CI / local log |
| G1.2 | iOS Release or TestFlight build plays offline | Device note |
| G1.3 | If Android testers ever added: Android smoke PASS | N/A under D2=B |
| G1.4 | Retry / Pause / Results verified on device | Checklist |
| G1.5 | Privacy URL live + support email reachable | Fetch + mail |
| G1.6 | No known Critical gameplay blockers | Owner ack |
| **G1.9** | **N-OPS-01** — crash reporting live; real crash received from distributed build | Dashboard |

**Should**

| # | Criterion |
|---|-----------|
| G1.7 | Playtest cohort started |
| G1.8 | Display-name candidate shortlisted (final string before G2) |

**Not required for G1:** PLT-03; iOS ceiling re-cert; paid UA clearance; full 5-level campaign.

---

## 3. Gate G2 — Public iOS release

**Must**

| # | Criterion | Evidence |
|---|-----------|----------|
| G2.1 | All G1 Must | — |
| G2.2 | **iOS-only posture documented**; Android “coming later / uncertified” — **PLT-03 not Complete** | This file + REQUIREMENTS |
| G2.3 | Physical iOS soak PASS (**dev-client**; release RSS must not be claimed from this evidence) — or owner-signed residual risk | Soak Results |
| G2.4 | **ASC** listing complete (privacy, age, screenshots, description). Play optional/deferred | Console |
| G2.5 | Production build QA: no Cert/Soak/DEV chrome | Visual QA |
| G2.6 | SFX provenance ARR / documented | `assets/sfx/README.md` |
| G2.7 | Originality attestation accurate | store docs |
| G2.8 | External crash triage empty or accepted (**requires N-OPS-01**) | Tracker |
| G2.9 | RELEASE-GATES owner sign-off | This file |
| **G2.13** | **No FPS claims** in listing/marketing beyond devices actually measured. Ceiling-only evidence ⇒ **do not state FPS** in store copy | Listing review |
| **G2.14** | **N-OPS-02** — OTA or explicit resubmit-only strategy written | Doc |
| G2.15 | **Display name renamed** (D1=B) — no exact-title collision with Gosiha “Neon brick breaker” | `name-clearance.md` + `app.config.js` |
| **G2.17** | **First submit binary has no ads/IAP/analytics SDK**; privacy manifest keeps `NSPrivacyCollectedDataTypes: []` unless crash reporting DSN is enabled for that build (N-OPS-01 Sentry is **ops**, not ads — disclose in privacy policy when DSN on) (D5=A) | `app.config.js` + binary audit |

**Should**

| # | Criterion |
|---|-----------|
| G2.10 | Campaign of **exactly 5** levels (D4) — single-level messaging only if owner reopens D4 |
| G2.11 | Playtest cohort ≥5 completed |
| G2.12 | Brand icon/splash final under new name |
| G2.16 | iOS **ceiling** Cert WC PASS under new protocol (N-PLT-02) |
| G2.18 | N-TIER-01 / R-12 addressed or residual risk signed |
| G2.19 | **N-LVL-01** = 5 playable levels; **N-LVL-03** lint green on ship set / red on level-02 |

**Must not claim:** “60 FPS on mid-range Android” · “60 FPS on all iPhones” · floor performance without floor device evidence.

---

## 4. Gate G3 — Paid UA

| # | Criterion |
|---|-----------|
| G3.1 | Renamed display name live (D1=B already required at G2); counsel optional for ™ claims |
| G3.2 | G2 complete on platforms being advertised (iOS) |
| G3.3 | Privacy / ads disclosures updated if monetization shipped |

---

## 5. Performance certification contract

Authoritative: `docs/measurement-methodology.md` + `docs/phase8-certification.md`

| Row | Device | Pass lock | Status |
|-----|--------|-----------|--------|
| **iOS ceiling** | iPhone 16 Pro, Mid Cert WC, `profiling` | p50 ≤ 8.33 ms **and** p95 ≤ 11 ms **and** Hangs = 0 | Runnable; prior D-16 ≠ this PASS |
| **iOS floor** | Named mid-tier A13–A15 60 Hz | p50 ≤ 16.7 ms **and** (p95 ≤ 20 ms **or** jank ≤ 5%) | **NOT RUN** |
| **Android mid** | Pixel 6a class | gfxinfo A1 lock | **OUT OF SCOPE (D2=B)** |

Hygiene: ≥2 runs × ≥30 s; worse run; simulator never counts; RN Perf Monitor alone invalid.

Legend: **WAIVED ≠ PASS ≠ OUT OF SCOPE ≠ NOT RUN**.

---

## 6. Feature freeze rule

New gameplay (Milestone B+) must not ship to **G2** until:

1. **Cert WC re-run on the shipping platform** (iOS ceiling row at minimum) if physics/VFX budgets changed, **and**  
2. Golden-replay / purity tests green for sim changes  

Hardening (A) does not add verbs — by design.

---

## 7. Sign-off block (fill at ship)

| Role | Gate | Name | Date | Notes |
|------|------|------|------|-------|
| Owner | G1 | | | |
| Owner | G2 | | | iOS-only |
| Owner | G3 | | | |

---

## 8. Related documents

- `docs/audit/DECISIONS-2026-09-24.md`  
- `PRODUCT-DIRECTION.md` · `ROADMAP-NEXT.md` · `REQUIREMENTS-NEXT.md`  
- `docs/measurement-methodology.md` · `docs/phase8-certification.md`  
- `docs/store/name-clearance.md` · `docs/audit/MVP-CLOSE-REPORT.md`
