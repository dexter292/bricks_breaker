# CURRENT STATE — Neon Brick Breaker (Post-MVP Baseline)

**Document status:** Research baseline for post-MVP planning  
**Written:** 2026-09-24  
**Authoritative HEAD:** `f445e0c` (`docs: temporary MVP close with full requirements report`)  
**MVP close baseline (owner):** `2aaa9cf` (ancestor of HEAD; one docs commit later)  
**Do not treat:** temporary MVP close = production / public-store ready

---

## 1. Product posture

| Field | Value |
|-------|--------|
| Verdict | **TEMPORARY MVP CLOSED** (owner 2026-09-24) |
| Authorized | iOS internal / soft playtest / sideload |
| Public path | **iOS-first (D2=B)** — Android deferred OUT OF SCOPE for this release |
| **Not** authorized yet | Public ASC submit until G2; paid UA until G3; FPS marketing without measured devices |
| Display name | Must **rename before ASC (D1=B)** — string TBD |
| Campaign target | **Exactly 5** levels (D4) — 2 ship today (01, 03) |
| Stack | Expo ~57.0.24 · RN 0.86 · Skia 2.12.0 · Reanimated 4.5 · custom 120 Hz sim |
| Bundle ID | `com.dexter292.bricksbreaker` |

**Sources:** `docs/audit/MVP-CLOSE-REPORT.md`, `docs/audit/DECISIONS-2026-09-24.md`, `.planning/STATE.md`, `docs/store/name-clearance.md`

> **Stale-doc warning:** `docs/audit/RELEASE-READINESS.md` and early `EXECUTIVE-SUMMARY.md` (2026-09-21) list Critical findings (F-01 Retry, F-09 overlays, etc.) that were remediations through RE-AUDIT-02…08. Prefer MVP-CLOSE + DEFERRED-ITEMS + HEAD code over those snapshots.

---

## 2. What is shipped (verified at HEAD)

### Gameplay / simulation
- Deterministic World SoA; fixed timestep `1/120`; max substeps 5
- Swept CCD (paddle / walls / bricks); paddle-relative bounce with dual angle floors
- Docked serve + **tap-only** launch (aimed deferred — honest in `serve.ts`)
- Multi-HP bricks (1–3) + unbreakable steel (`X`); damage cues (color + hatch/crack)
- Score + combo; lives 3; win/lose; pause + OS freeze + countdown resume
- Multi-ball + paddle expand (catch-only drops); deterministic anti-stall tiers
- Showpiece `level-03` (default); `level-01` playable; `level-02` fixture-only (unwinnable steel gate)

### Presentation / product shell
- Title → Playing; HUD (score / combo / lives / stall / pause)
- Pause / Retry / Results (best + New Record); letterbox + safe area
- Neon VFX: glow atlas, trails, particles, shake; quality tiers low/mid/high
- Modular SFX (7 cues); ARR provenance closed (F-40)
- Offline personal-best (`@nbb/personal-best/v1`)
- Platform seams: ads / IAP / accounts = `onRunEnded` no-ops

### Quality gates (automated)
| Gate | Status at HEAD |
|------|----------------|
| `tsc --noEmit` | 0 errors |
| Vitest | **267 / 267** (59 files) — independently re-run 2026-09-24 (`TEST-RUN-VERIFICATION`) |
| Worklet / Skia / privacy asserts | Green |
| CI | 9-step workflow (no native EAS build in CI) |

### Device evidence
| Gate | Status |
|------|--------|
| iPhone 16 Pro install + Release sideload | PASS |
| iOS Instruments Cert WC (D-16) | PASS (Display ~8.33 ms @ 120 Hz; Hangs 0) |
| D2 iOS Release worklet | PASS |
| D4 iOS after HUD font | PASS (dev-build / Instruments; formal EAS profiling IPA optional debt) |
| Soak harness | PASS on **Simulator** only; physical soak owed |
| Pixel 6a / Android mid-range gfxinfo (PLT-03) | **OUT OF SCOPE (D2=B)** — do not claim Complete |
| Android install smoke | **OUT OF SCOPE (D2=B)** — never run; deferred |
| iOS ceiling Cert (new protocol) | **NOT RUN** — prior D-16 = observation only |
| iOS floor mid-tier | **NOT RUN (R-10)** — no device |

---

## 3. Architecture (reusable)

| Layer | Path | Notes |
|-------|------|--------|
| Core sim | `src/core/` | Pure TS; worklet-safe; Node-testable; no RN/Skia |
| Physics | `src/core/physics/` | Sweep / broadphase / resolve |
| Rules | `src/core/rules/` | serve, lives, win, scoring, pickups, effects, multiball, stall |
| Levels | `src/core/levels/` | schema v1 → validate → migrate → compile → apply |
| Events | `src/core/events/ring.ts` | Fixed codes; overflow drops newest |
| Runtime | `src/runtime/` | Game loop, HUD, overlays, quality tier |
| Render | `src/render/` | SkPicture immediate-mode |
| VFX | `src/vfx/` | Budgeted particles/trails/shake |
| Input | `src/input/` | Relative-drag gesture → Intent |
| Services | `src/services/` | Audio, storage, platform no-ops |
| App shell | `app/_components/` | GameHost / Title / PlayingHost |

**Caps (design):** maxBalls 8 · MAX_BRICKS 256 · EVENT_RING 128 · MAX_PICKUPS/EFFECTS 16 · particleCap mid 128 / high 192

**Proven patterns to keep:** SoA + event ring + hashWorld golden replay; fail-closed level pipeline; quality-tier VFX budgets; boundary ESLint; worklet-closure assert.

---

## 4. Partial / temporary acceptances

| Item | Status | Implication |
|------|--------|-------------|
| PHYS-05 | Tap-only accepted for temp MVP | Aimed launch is product debt / optional vNext |
| PLT-03 | Waived, not Complete | Cannot claim mid-range Android 60 FPS |
| LVL-04 | level-03 shipped; duration band softened; cohort playtest light | Marketing confidence weak |
| FX-02 | Budgets in code; Android frame-budget gate waived | Spectacle vs FPS unproven on mid Android |
| WP-6 | Partial | Physical soak + Android still open |
| F-43 | **Done (N-QA-03)** | TitleScreen / GameScreen / GameHost mount contracts (PlayingHost stubbed) |
| D4 nuance | PASS on dev Instruments | Formal profiling IPA optional |

---

## 5. Open debts (still true at HEAD)

From `MVP-CLOSE-REPORT.md` §6 + `DEFERRED-ITEMS.md` — verified not closed by newer commits:

| ID | Item | Blocks |
|----|------|--------|
| **PLT-03** | Android mid-range gfxinfo | Future Android / dual-store FPS claim | **OUT OF SCOPE (D2=B)** |
| **Android smoke** | Any physical Android install | Future Play | **OUT OF SCOPE (D2=B)** |
| **Soak physical** | 100 cycle + 15 min on iPhone + mem/frame | G2.3 | **OPEN** |
| **iOS ceiling** | Profiling Cert WC per new protocol | N-PLT-02 | **NOT RUN** |
| **iOS floor** | Named mid-tier 60 Hz | Floor claims | **NOT RUN (R-10)** |
| **PHYS-05 aimed** | Drag-to-aim launch | Spec / D3 | **DEFERRED** |
| **LVL-04 cohort** | ≥5 first-time playtests | G2.11 | **OPEN** |
| **Console ASC** | Forms entered | G2.4 | **PREPARED** |
| **Rename** | Display name before listing | **G2 (D1=B)** | **MUST — string TBD** |
| **F-43** | PlayingHost contract tests | Quality | **CLOSED via N-QA-03** (shell + GameScreen; PlayingHost stubbed) |
| **R-12** | Tier resolver RAM-only | G2 marketing | **OPEN → N-TIER-01** |
| **F-45** | Ball speed ramp | Post-MVP backlog | **DEFERRED** |

**Not reopened without regression evidence:** F-01 Retry, F-09 overlays, F-08 event clear, F-40 SFX, D13 tsc, NJ-3 support email, etc. (closed in remediation chain).

---

## 6. Technical limits for expansion

| Limit | Impact |
|-------|--------|
| Bricks are **static** AABB + lattice broadphase | Moving bricks need velocity SoA + spatial invalidation |
| One brick contact ends CCD per ball/step | Multi-hit / pierce (fireball) needs explicit ball flags + CCD policy change |
| No projectile / beam system | Laser paddle is new subsystem |
| Serve is vertical-only; dock snaps `ballX=paddleX` | Aimed / sticky need Intent + dock policy change |
| Persistence = personal best only | Progress / unlocks / stars need storage schema v2+ |
| `LevelId` = 01 \| 03 playable | Campaign needs level catalog + select UI |
| Schema v1 only; unsupported version rejected | New brick behaviors → schema bump + migration |
| Worklets cannot close over `constants.ts` | New literals must be inlined/duplicated in worklet bodies |
| VFX budgets unvalidated on mid Android | New spectacle must stay under Mid caps until PLT-03 passes |
| No backend | Daily challenge / online leaderboards need product justification |

**Architecture rewrite (Unity etc.) is not indicated.** Core sim quality is high; extend SoA/events/schema rather than replace stack.

---

## 7. Content inventory

| Asset | Role |
|-------|------|
| `level-01.json` | Short / teaching layout |
| `level-02.json` | Compile/regression fixture — **not** ship content |
| `level-03.json` | Showpiece (3-act Neon Gauntlet) |
| 7× `.wav` SFX | ARR app-bundle |
| SpaceMono HUD font | Shipped |
| Expo template images in `assets/images/` | Unused template residue (attestation caveat) |

---

## 8. v1 requirements roll-up (27)

| Bucket | Count |
|--------|------:|
| PASS | 24 |
| PASS with soft spot (LVL-04, FX-02) | 2 |
| WAIVED temp MVP (PLT-03) | 1 |

v2 backlog already named in `.planning/REQUIREMENTS.md`: FX-04…06, LVL-05, AUD-01, META-01/02, TOOL-01/02 — **not committed** for post-MVP until re-prioritized here.

---

## 9. Recommended reading order for next agents

1. This file  
2. `docs/audit/MVP-CLOSE-REPORT.md`  
3. `docs/audit/DEFERRED-ITEMS.md`  
4. `.planning/REQUIREMENTS.md` (v1 checked + v2 list)  
5. `docs/layer-contract.md` + `src/core/types.ts`  
6. Sibling post-mvp docs: PRODUCT-DIRECTION → FEATURE-CANDIDATES → REQUIREMENTS-NEXT → ROADMAP-NEXT → RELEASE-GATES
