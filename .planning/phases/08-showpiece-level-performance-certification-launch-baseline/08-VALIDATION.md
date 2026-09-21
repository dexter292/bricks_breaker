---
phase: 8
slug: showpiece-level-performance-certification-launch-baseline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-21
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
| 08-W0-01 | 00 | 0 | LVL-04 | T-08-01 | validateLevel fail-closed | unit | `npm test -- tests/levels.compile.test.ts` | ❌ W0 | ⬜ pending |
| 08-W0-02 | 00 | 0 | PLT-03 | — | N/A | unit | `npm test -- tests/runtime.quality-tiers.test.ts` | ❌ W0 | ⬜ pending |
| 08-W0-03 | 00 | 0 | PLT-03 | — | core blind to tier | unit | `npm test -- tests/core.purity.test.ts` | ✅ | ⬜ pending |
| 08-W0-04 | 00 | 0 | Soak | — | audio.release idempotent | unit | `npm test -- tests/audio.release.test.ts` | ❌ W0 | ⬜ pending |
| 08-W0-05 | 00 | 0 | PLT-04 | T-08-03 | privacyManifests present | smoke | `node scripts/assert-privacy-manifest.mjs` | ❌ W0 | ⬜ pending |
| 08-LVL | 01+ | 1+ | LVL-04 | T-08-01 | corrupt JSON rejected | unit | `npm test -- tests/levels.compile.test.ts` | ❌ W0 | ⬜ pending |
| 08-TIER | 02+ | 2+ | PLT-03 | — | caps only in VFX | unit | `npm test -- tests/vfx.particles.test.ts` | ✅ partial | ⬜ pending |
| 08-CERT | last | last | PLT-03 | — | gfxinfo not RN monitor | manual-on-device | profiling + `adb dumpsys gfxinfo` | ❌ docs | ⬜ pending |
| 08-SOAK | last | last | PLT-03 | T-08-04 | no DEV harness in prod | manual-on-device | 100 cycles + 15 min | ❌ harness | ⬜ pending |
| 08-STORE | last | last | PLT-04 | T-08-02 | policy matches deps | manual + curl | `curl -fsSI $URL` + docs checklist | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Extend `tests/levels.compile.test.ts` — level-03 compile + structural checks; keep 01/02 fingerprints green
- [ ] `tests/runtime.quality-tiers.test.ts` — memory heuristic + budgets + conservative null→Low
- [ ] Extend VFX cap tests for trailMax/glowScale once API exists
- [ ] `tests/audio.release.test.ts` (or extend mapping) — release clears / idempotent
- [ ] Optional `scripts/assert-privacy-manifest.mjs` — `app.json` has `privacyManifests`
- [ ] Docs stubs: `docs/phase8-certification.md`, `docs/store/*` placeholders
- [ ] Install: `npx expo install expo-device`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pixel 6a Mid 60 FPS worst-case | PLT-03 | Device gfxinfo | Scripted level-03 worst-case; profiling build; ≥2× ≥30s; worse run; follow `docs/measurement-methodology.md` + `docs/phase8-certification.md` |
| iPhone Instruments + feel | PLT-03 | Physical device | Instruments report + render/touch/stability — install alone invalid |
| 100 Title↔Playing + 15 min soak | PLT-03 / D-19 | Device lifecycle | DEV harness; record memory/frame-time start/end |
| Live HTTPS privacy URL | PLT-04 | External host | `curl -fsSI $URL`; policy matches MVP data practices |
| Store paperwork completeness | PLT-04 | Human attestation | Data Safety, age rating, name clearance, originality in repo |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s (automated)
- [ ] `nyquist_compliant: true` set in frontmatter after plans land

**Approval:** pending
