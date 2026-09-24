# MVP CLOSE REPORT (TEMPORARY)

**Date:** 2026-09-24  
**HEAD:** `2aaa9cf`  
**Product:** Neon Brick Breaker (`com.dexter292.bricksbreaker`)  
**Decision:** Owner **temporary MVP close** for internal ship / soft playtest — **not** App Store / Play public submit.

---

## 1. Executive verdict

| Field | Value |
|-------|--------|
| **Verdict** | **TEMPORARY MVP CLOSED** |
| **Ship posture** | iOS internal / sideload / soft playtest |
| **Public store submit** | **NOT AUTHORIZED** until debts in §6 cleared |
| **Automated gates** | **PASS** — `tsc` 0 · **267/267** tests (59 files) · worklets / privacy / skia asserts green (prior runs) |
| **PLT-03 Android mid-range** | **WAIVED** (no Pixel 6a) — **not claimed Complete** |
| **PHYS-05 aimed launch** | **ACCEPTED AS TAP-ONLY** for this temporary close (aimed deferred post-MVP) |

> One sentence: **Playable iOS MVP with honest waivers; Android FPS gate and store submit remain open.**

---

## 2. Requirements roll-up (27)

| ID | Requirement (short) | Status | Evidence class |
|----|---------------------|--------|----------------|
| PHYS-01 | Relative-drag paddle | **PASS** | Code + unit/gesture tests; device feel on iPhone |
| PHYS-02 | Swept deterministic CCD | **PASS** | Core + property / golden tests |
| PHYS-03 | Physics unit / property tests | **PASS** | Vitest suite |
| PHYS-04 | Paddle-relative angle clamps | **PASS** | Dual floors + tests |
| PHYS-05 | Docked launch | **PASS (tap-only)** | Docked + vertical serve; **aimed deferred** (owner temp close) |
| PHYS-06 | Fixed timestep; no RN/frame | **PASS** | Worklet loop + purity |
| PHYS-07 | Deterministic anti-stall | **PASS** | Escalation + tests |
| LVL-01 | Versioned level format | **PASS** | JSON schema / validate / compile |
| LVL-02 | Multi-HP bricks + cues | **PASS** | Levels + render cues |
| LVL-03 | Unbreakable bricks | **PASS** | Level data + rules |
| LVL-04 | Showpiece level-03 | **PASS*** | Shipped; duration band softened (T3.4); human cohort playtest still light |
| RUN-01 | Score + combo | **PASS** | Rules + tests |
| RUN-02 | Lives + win/lose UI | **PASS** | Runtime + overlays |
| RUN-03 | Instant retry | **PASS** | Reset-request / F-01 fixed |
| RUN-04 | Local high score | **PASS** | AsyncStorage + memory fallback |
| PWR-01 | Multi-ball | **PASS** | Rules + tests |
| PWR-02 | Paddle expand | **PASS** | Rules + tests |
| PWR-03 | Catch-only pickups | **PASS** | Rules + tests |
| FX-01 | Ball trail / reduce-motion | **PASS** | VFX + tests |
| FX-02 | Neon FX + budgets | **PASS*** | Code budgets; Android frame-budget gate **WAIVED** |
| FX-03 | Modular SFX | **PASS** | Mapping + release tests; provenance closed |
| PLT-01 | Pause / OS freeze / countdown | **PASS** | Freeze + AppState path |
| PLT-02 | Letterbox + safe area | **PASS** | Layout contract |
| PLT-03 | 60 FPS mid-range device | **WAIVED** | No Pixel 6a; iOS D-16 companion only |
| PLT-04 | Store baseline **prepared** | **PASS** | Privacy live + forms in-repo; console **not entered** |
| ARCH-01 | Separation + worklet path | **PASS** | Boundaries + iOS worklet evidence |
| ARCH-02 | Ads/IAP/account seams | **PASS** | Offline MVP seams |

\* = accepted with documented soft spot for temporary close.

### Counts

| Bucket | Count |
|--------|------:|
| PASS | 24 |
| PASS with soft spot (*) | 2 (LVL-04, FX-02) |
| WAIVED (temp MVP) | 1 (PLT-03) |
| **Total** | **27** |

---

## 3. Device & performance evidence

| Gate | Platform | Result | Notes |
|------|----------|--------|-------|
| Install + render | iPhone 16 Pro | **PASS** | Physical |
| Cert WC + Instruments (D-16) | iPhone 16 Pro | **PASS** | Display ~8.33 ms (120 Hz); Hangs 0 (multi Cert WC) |
| Release sideload (offline) | iPhone 16 Pro | **PASS** | No Metro / cable |
| SC-2 worklet (D2) | iOS Release | **PASS** | Android **WAIVED** |
| SC-2 after HUD font (D4) | iOS | **PASS** | Instruments + SpaceMono |
| Soak 100 + 15 min | iPhone 17 Pro **Simulator** | **PASS (harness)** | Physical soak **owed** when device online |
| Pixel 6a gfxinfo (D-15 / PLT-03) | Android | **WAIVED** | No device |
| Android install smoke | Android | **WAIVED** | Never installed |

Authoritative tables: [`docs/phase8-certification.md`](../phase8-certification.md), [`docs/device-gate-results.md`](../device-gate-results.md).

---

## 4. Automated quality gates (2026-09-24)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | **0** |
| `npx vitest run` | **267 / 267** (59 files) |
| Worklet closure assert | **OK** (prior) |
| Skia version assert | **OK** (prior) |
| Privacy manifest assert | **OK** (prior) |
| Live privacy Contact | `dexter@lkfnb.com` |
| CI workflow | 9 steps (typecheck / lint / test / asserts / coverage / web export) |

---

## 5. Store / compliance

| Item | Status |
|------|--------|
| Privacy policy HTTPS + email | **READY** |
| SFX provenance (F-40) | **CLOSED** — ARR app-bundle (`assets/sfx/README.md`) |
| Play Data Safety answers | **PREPARED** in-repo |
| Age rating answers | **PREPARED** |
| ASC / Play console fields entered | **NO** — operator (`docs/store/CONSOLE-ENTRY.md`) |
| Trademark opinion | **DEFERRED** — soft-launch risk accepted |
| Display-name collision | **FLAG** — App Store already has “Neon brick breaker” (Gosiha); rename before paid UA / if rejected |

---

## 6. Explicitly open after temporary MVP close

| ID | Item | Blocks |
|----|------|--------|
| PLT-03 | Pixel / mid-range Android gfxinfo | Public performance claim / tick Complete |
| Soak physical | Re-run soak on iPhone 16 Pro | Stronger leak evidence |
| PHYS-05 aimed | Drag-to-aim launch | Spec fidelity / future requirement text |
| Android smoke | Any Android install | Play internal testing |
| Console submit | ASC + Play forms | Store listing |
| Trademark / rename | Counsel or differentiated title | Paid UA / trademark claim |
| LVL-04 cohort | ≥5 first-time playtests | Marketing confidence |
| PHYS-05 ledger hygiene | Keep tap-only wording synced | Avoid over-claim |

---

## 7. Deferred / accepted ledger (summary)

| ID | Status |
|----|--------|
| D2 Android | WAIVED |
| D2 iOS / D4 | PASS / CLOSED |
| D13 tsc | CLOSED |
| F-40 SFX | CLOSED |
| F-45 speed ramp | DEFERRED post-MVP |
| F-23 steeper stall | SUPERSEDED |
| F-43 PlayingHost mount tests | PARTIAL post-MVP |
| NF-18f dual useFonts | ACCEPTED |
| Trademark | DEFERRED soft-launch |
| Console entry | PREPARED not submitted |
| WP-6 | PARTIAL (Android + physical soak) |
| Pixel D-15 | WAIVED |

Full detail: [`DEFERRED-ITEMS.md`](./DEFERRED-ITEMS.md).

---

## 8. What “temporary MVP closed” means

**In scope now**
- Ship / share **iOS** builds for internal playtest
- Treat gameplay + physics + FX + persistence as **done enough**
- Keep documentation honest about waivers

**Out of scope until debts cleared**
- Claiming **PLT-03 Complete**
- App Store / Play **public** release
- Paid user acquisition under exact title without rename/counsel

---

## 9. Sign-off

| Role | Statement | Date |
|------|-----------|------|
| Owner | Temporary MVP close accepted with §6 debts | 2026-09-24 |
| Evidence baseline | HEAD `2aaa9cf` + Phase 8 / store docs | 2026-09-24 |

_Related: [FINAL-ACCEPTANCE-REPORT.md](./FINAL-ACCEPTANCE-REPORT.md) · [phase8-certification.md](../phase8-certification.md) · [CONSOLE-ENTRY.md](../store/CONSOLE-ENTRY.md)_
