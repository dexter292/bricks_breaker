---
phase: 8
slug: showpiece-level-performance-certification-launch-baseline
status: draft
nyquist_compliant: false
wave_0_complete: true
# nyquist_compliant stays false until Plan 06 Task 2: automated green AND device Results filled (or explicit waiver with D-17 note). Device rows remain manual-mandatory.
created: 2026-09-21
plans:
  - 08-00-PLAN.md
  - 08-01-PLAN.md
  - 08-02-PLAN.md
  - 08-03-PLAN.md
  - 08-04-PLAN.md
  - 08-05-PLAN.md
  - 08-06-PLAN.md
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.1 (Node env) |
| **Config file** | `vitest.config.ts` (or project default) |
| **Quick run command** | `npm test -- tests/levels.compile.test.ts tests/vfx.particles.test.ts tests/core.purity.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30–45 seconds |

---

## Sampling Rate

- **After every task commit:** Quick run (+ any new tier/level/audio test touched)
- **After every plan wave:** `npm test` + eslint boundaries
- **Before `/gsd-verify-work`:** Full suite green **and** Pixel 6a Mid gfxinfo Results **and** iPhone Instruments notes **and** live privacy URL + store docs (D-27)
- **Max feedback latency:** 45 seconds (automated only)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-W0-01 | 00 | 0 | LVL-04 | T-08-01 | validateLevel fail-closed | unit | `npm test -- tests/levels.compile.test.ts` | ✅ | ✅ green |
| 08-W0-02 | 00 | 0 | PLT-03 | — | N/A | unit | `npm test -- tests/runtime.quality-tiers.test.ts` | ✅ | ✅ green |
| 08-W0-03 | 00 | 0 | PLT-03 | — | core blind to tier | unit | `npm test -- tests/core.purity.test.ts` | ✅ | ✅ green |
| 08-W0-04 | 00 | 0 | Soak | — | audio.release idempotent | unit | `npm test -- tests/audio.release.test.ts` | ✅ | ✅ green |
| 08-W0-05 | 00 | 0 | PLT-04 | T-08-03 | privacyManifests present | smoke | `node scripts/assert-privacy-manifest.mjs` | ✅ | ✅ green |
| 08-LVL | 01+ | 1+ | LVL-04 | T-08-01 | corrupt JSON rejected | unit | `npm test -- tests/levels.compile.test.ts` | ✅ | ✅ green |
| 08-TIER | 02+ | 2+ | PLT-03 | — | caps only in VFX | unit | `npm test -- tests/vfx.particles.test.ts` | ✅ | ✅ green |
| 08-CERT | last | last | PLT-03 | — | gfxinfo not RN monitor | manual-on-device | profiling + `adb dumpsys gfxinfo` | ✅ docs scaffolding | ⬜ pending device |
| 08-SOAK | last | last | PLT-03 | T-08-04 | no DEV harness in prod | manual-on-device | 100 cycles + 15 min | ✅ harness | ⬜ pending device |
| 08-STORE | last | last | PLT-04 | T-08-02 | policy matches deps | manual + curl | `curl -fsSI $URL` + docs checklist | ✅ | ✅ LIVE_URL 200 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky / debt*

**Plan 06 Task 1 gate (2026-09-22):** `npm test` 249/249 ✅ · `assert-privacy-manifest.mjs` ✅ · Results scaffolding `PENDING_DEVICE` in `docs/phase8-certification.md` · Phase 7 debt pointer + device-gate Phase 8 cross-link ✅. *(Prior 179/179 note was Wave-0 snapshot; do not treat as current.)*

**Phase gate notes:** Automated suite green. Device rows (Pixel Mid gfxinfo, iPhone Instruments, soak) remain **manual-mandatory**. LIVE_URL verified HTTPS 200 on GitHub Pages (2026-09-21). `nyquist_compliant: false` until Task 2 human approval with filled (or explicitly waived) Results.

---

## Wave 0 Requirements

- [x] Extend `tests/levels.compile.test.ts` — level-03 compile + structural checks; keep 01/02 fingerprints green
- [x] `tests/runtime.quality-tiers.test.ts` — memory heuristic + budgets + conservative null→Low
- [x] Extend VFX cap tests for trailMax/glowScale once API exists
- [x] `tests/audio.release.test.ts` (or extend mapping) — release clears / idempotent
- [x] Optional `scripts/assert-privacy-manifest.mjs` — `app.json` has `privacyManifests`
- [x] Docs stubs: `docs/phase8-certification.md`, `docs/store/*` placeholders
- [x] Install: `npx expo install expo-device`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pixel 6a Mid 60 FPS worst-case | PLT-03 | Device gfxinfo | Scripted level-03 worst-case; profiling build; ≥2× ≥30s; worse run; follow `docs/measurement-methodology.md` + `docs/phase8-certification.md` |
| iPhone Instruments + feel | PLT-03 | Physical device | Instruments report + render/touch/stability — install alone invalid |
| 100 Title↔Playing + 15 min soak | PLT-03 / D-19 | Device lifecycle | DEV harness; record memory/frame-time start/end |
| Live HTTPS privacy URL | PLT-04 | External host | `curl -fsSI` → HTTP/2 200 at https://dexter292.github.io/bricks_breaker/store/privacy-policy.html (2026-09-21) |
| Store paperwork completeness | PLT-04 | Human attestation | Data Safety, age rating, name clearance, originality in repo |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 45s (automated)
- [ ] `nyquist_compliant: true` set in frontmatter after device Results filled + Human UAT approved (Plan 06 Task 2)

**Approval:** pending Plan 06 device certification checkpoint
**Human UAT:** _(awaiting `approved` after Results fill — or blocker / waive with documented debt)_
