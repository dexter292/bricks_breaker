# PRODUCT DIRECTION — Post-MVP

**Status:** **FULL LOCK** — D1…D7 locked 2026-09-24 (`docs/audit/DECISIONS-FULL-LOCK-2026-09-24.md`)  
**Date:** 2026-09-24  
**Precedents locked:** `.planning/PROJECT.md` feel mix 40/30/30; offline-first; no Maker/Shatter asset copy; RN+Expo+Skia+custom physics stack

---

## 1. Vision

Ship a premium offline arcade brick-breaker (display name **TBD — rename before ASC listing**, D1=B): one tight control loop, readable neon spectacle, a **5-level** campaign, and light meta-progression that rewards skill without pay-to-win.

**North star (unchanged):** A run must feel arcade-punchy, skillful, and spectacular at stable 60 FPS — physics and clarity beat spectacle when they conflict.

**Post-MVP shift:** From “one showpiece MVP” → “shippable **iOS-first** product with campaign depth + release gates closed,” then expand retention/monetization only after live play data. Android remains deferred (D2=B), not abandoned.

---

## 2. Approved vs proposed

### Already approved (do not reopen without cause)

| Decision | Source |
|----------|--------|
| Stack: RN + Expo + Skia + custom deterministic physics | PROJECT.md |
| Feel mix ~40% punch / 30% physics toy / 30% spectacle | PROJECT.md |
| Relative-drag paddle; no absolute finger-follow | PHYS-01 / Out of Scope |
| No random bounce jitter; deterministic anti-stall | PHYS-07 |
| Catch-only power-ups; no auto-collect | PWR-03 |
| No paddle-shrink / punishing power-downs | REQUIREMENTS Out of Scope |
| Offline MVP; ads/IAP/accounts as seams only | ARCH-02 |
| Data-driven levels; editor deferred past v1 | LVL-01 / TOOL-01 |
| Original branding/assets only | Constraint |
| Temporary MVP close with PLT-03 waived + tap-only serve | MVP-CLOSE-REPORT |
| **D2 = B — iOS-first; Android deferred** | DECISIONS-2026-09-24 |
| **D1 = B — rename display name before ASC listing** | DECISIONS-2026-09-24 |
| **D4 = 5 authored playable levels** (exactly) | DECISIONS-2026-09-24 |
| **R-02 — N-OPS-01 Must@G1; N-OPS-02 Must@G2; N-OPS-03 Should** | DECISIONS-2026-09-24 |
| **iOS perf: ceiling (16 Pro) runnable; floor mid-tier NOT RUN** | DECISIONS-2026-09-24 §3 |
| **D3 = C — aimed serve deferred until after A3 cohort** | DECISIONS-FULL-LOCK-2026-09-24 |
| **D5 = A — no monetization SDK before first ASC approval** | DECISIONS-FULL-LOCK-2026-09-24 |
| **D6 = A — defer editor; ship solvability lint (N-LVL-03)** | DECISIONS-FULL-LOCK-2026-09-24 |
| **D7 = keep A→G + E1a/E1b split (R-13)** | DECISIONS-FULL-LOCK-2026-09-24 |

### Locked product shape

| Topic | Locked |
|-------|--------|
| Display name | **Rename before listing** — exact string TBD (owner) |
| First public content | **Exactly 5** levels (2 exist → author **3**; E1a baseline // A) |
| Platform | **iOS-first**; Android OUT OF SCOPE this release |
| Aimed serve | **Deferred to post-A3 cohort** (D3=C) — not Complete / not Won’t-Do yet |
| Power-up set for v1.x | Extra life, slow-ball, fireball; sticky deferred |
| Brick set for v1.x | Explosive + existing multi-HP/steel |
| Progression | Offline unlock + stars; no accounts |
| Monetization | **Design-only; no SDK** until post first ASC approval (D5=A) |
| Level editor | **Deferred G+**; solvability lint in E1 (D6=A) |

### Still open (not decisions — execution / hardware)

| Item | Owner |
|------|--------|
| Exact display-name string | Owner (A3) |
| R-10 floor mid-tier device | Hardware |
| R-12 / N-TIER-01 | Dev before G2 marketing |
| D3 final after cohort | A3 data → implement / Won’t-Do / defer G |

---

## 3. Gameplay direction

**Retain:** Classic paddle niche, skillful bounce angles, risk/reward multi-ball, readable ball.

**Deepen without complexity tax:**
1. Brick verbs (explode, tough, channel)
2. Few strong power-ups with timers + mutual exclusion
3. Level craft — 5 hand-authored levels
4. Aimed serve **only if A3 cohort supports** (D3=C); own phase B0 — not bundled with fireball

**Avoid for first public:** Bosses, laser, moving-brick swarms, endless as primary loop, social/online.

---

## 4. Visual & audio identity

**Inspiration (intent only):** Shatter neon energy + Maker readable layouts — not their assets.

**Pillars:** Deep navy field; high-contrast ball/paddle; Mid particle budgets; bold Title wordmark under **new** display name; unique icon.

**Audio:** Modular SFX first; ambient loop optional later.

---

## 5. Progression & retention (offline-first)

| Layer | First public | Later |
|-------|--------------|-------|
| Campaign unlock | Linear across **5** levels | Chapters |
| Stars | 1–3 from lives + score | Challenges |
| Local stats | Clears, best per level | Achievements |
| Cosmetics / daily / online | Defer | Post-launch |

---

## 6. Decision log (2026-09-24)

### D1 — Product display name — **LOCKED = B**
Rename display name **before** creating ASC listing. Bundle/package/slug unchanged. Exact string: owner TBD in `docs/store/name-clearance.md`.

### D2 — Platform — **LOCKED = B**
iOS-first public release. Android deferred (not abandoned). Do not tick PLT-03 Complete. Do not claim mid-range Android FPS.

### D3 — Aimed launch — **LOCKED = C (defer to post-A3 cohort)**
Do **not** mark PHYS-05 Complete or Won’t-Do until cohort runs. A3 playtest form **must** include the serve-agency question (see N-QA-02). After data: implement (→ B0) / Won’t-Do / defer to G.

**Why not A now:** B0 sits after A3; deciding early throws away free evidence from ≥5 first-time players.

### D4 — First public content — **LOCKED = 5**
Exactly five authored playable levels. E1a (3 baseline with shipped verbs) may run parallel to Milestone A (R-13 / D7).

### D5 — Monetization — **LOCKED = A (design-only until post-launch)**
No ads/IAP/analytics SDK in first ASC binary. Privacy manifest stays empty collected-data types. Seams (ARCH-02) remain no-ops. Design docs OK in G.

### D6 — Level editor — **LOCKED = A (defer editor; ship solvability lint)**
No in-app editor before ≥15–20 levels prove pain. **N-LVL-03** solvability/reachability lint required in E1; `level-02` is negative fixture (must fail lint).

### D7 — Milestone order — **LOCKED = keep A→G (+ E1a/E1b)**
Hardening → Gameplay → Progression → Polish → Store → Post-launch. Content baseline **E1a** parallel from A; verb enrichment **E1b** after B.

### R-10 / R-12 — Performance honesty
- Ceiling gate on iPhone 16 Pro only (see measurement-methodology).
- Floor mid-tier iOS **NOT RUN** — cannot claim floor FPS.
- **R-12** open: quality-tier RAM heuristic may give mid-tier iPhones Mid budgets certified only on A18 Pro — needs owner/dev before G2 marketing.

---

## 7. Success metrics (assumptions)

| Stage | Signal |
|-------|--------|
| Internal | Cohort ≥5 newcomers: controls &lt;30s; want ≥1 replay |
| Soft launch | Crash reporting live (N-OPS-01); iOS ceiling Cert WC per protocol |
| Public | Listing under **new** name; no FPS claims beyond measured devices |
| Post-launch | Monetization from live data |

Time estimates in ROADMAP-NEXT are **assumption-labeled**, not commitments.
