---
phase: 6
slug: ui-shell-hud-persistence-platform-seams
status: uat_passed
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-20
uat_approved: 2026-09-20
notes: Phase 6 human UAT approved; leave nyquist_compliant for verify-work gate
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.1 (Node environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- tests/storage.personal-best.test.ts tests/platform.seams.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted storage/platform tests (or full `npm test` if fast)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite green + manual UAT checklist
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-W0-01 | 00 | 0 | RUN-04 | T-06-01 | Parse/reject corrupt JSON → 0 | unit stub | `npm test -- tests/storage.personal-best.test.ts` | ✅ | ✅ green |
| 06-W0-02 | 00 | 0 | ARCH-02 | T-06-02 | No-op seams callable | unit stub | `npm test -- tests/platform.seams.test.ts` | ✅ | ✅ green |
| 06-01-01 | 01 | 1 | RUN-04 | T-06-01 | evaluatePersonalBest strict `>`; parse fail soft | unit | `npm test -- tests/storage.personal-best.test.ts` | ✅ | ✅ green |
| 06-01-02 | 01 | 1 | RUN-04 | T-06-01 | AsyncStorage adapter `@nbb/personal-best/v1` | unit + tsc | `npm test -- tests/storage.personal-best.test.ts` | ✅ | ✅ green |
| 06-02-01 | 02 | 1 | ARCH-02 | T-06-02/05 | noop onRunEnded no-throw; no UI/SDK | unit | `npm test -- tests/platform.seams.test.ts` | ✅ | ✅ green |
| 06-02-02 | 02 | 1 | ARCH-02 | T-06-02 | defaultPlatformServices barrel | unit | `npm test -- tests/platform.seams.test.ts` | ✅ | ✅ green |
| 06-03-01 | 03 | 2 | RUN-03 | T-06-04/05 | Title cold start; PlayingHost extract | tsc + rg | `npx tsc --noEmit -p .` | ✅ host exists | ✅ green |
| 06-03-02 | 03 | 2 | RUN-03 | — | Menu on Pause/Results; no confirm | tsc + rg | `npx tsc --noEmit -p .` | ✅ overlays | ✅ green |
| 06-04-01 | 04 | 3 | PLT-02 | T-06-04 | HudStrip 48px / rgba(18,18,31,0.8) | rg | `rg HudStrip src/runtime` | ✅ | ✅ green |
| 06-04-02 | 04 | 3 | PLT-02 | T-06-04 | playfieldTop = insets.top + 48 | rg + tsc | `npx tsc --noEmit -p .` | ✅ GameScreen | ✅ green |
| 06-05-01 | 05 | 4 | RUN-04 | T-06-01 | Results Score/Best/New Record | tsc + rg | `npx tsc --noEmit -p .` | ✅ ResultOverlay | ✅ green |
| 06-05-02 | 05 | 4 | RUN-04, ARCH-02 | T-06-01/02/04 | preload + cold path persist + onRunEnded | unit + tsc | `npm test -- tests/storage.personal-best.test.ts tests/platform.seams.test.ts` | ✅ | ✅ green |
| 06-05-03 | 05 | 4 | RUN-03, RUN-04, PLT-02, ARCH-02 | T-06-05 | Full shell UAT | manual + unit | `npm test -- tests/storage… platform…` | manual | ✅ UAT approved 2026-09-20 |
| — | — | — | D-08 | T-06-04 | No per-frame React regression | unit | `npm test` | ✅ | ✅ green |

**Notes (Plan 05 Task 3):** Wave 0 + storage/platform automated commands green. Human UAT approved 2026-09-20 (Title/Retry/Menu/Results/HUD/airplane/pause/Stall). Force-quit Best durability still prefers native rebuild (`npx expo run:ios|android`).

---

## Wave 0 Requirements

- [x] `tests/storage.personal-best.test.ts` — stubs for RUN-04 (compare, memory store, corrupt → 0)
- [x] `tests/platform.seams.test.ts` — stubs for ARCH-02 (`onRunEnded` no-op)
- [ ] Optional `tests/shell.navigation.test.ts` — pure shellPhase transitions if reducer extracted
- [x] Install `@react-native-async-storage/async-storage@2.2.0` via `npx expo install`
- [x] ESLint: allow `app` → `services`

*Existing: Vitest Node suite covers core; do not add jest-expo unless necessary.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Best survives force-quit | RUN-04 | Native AsyncStorage | Play run → set high score → force-quit → relaunch → Title shows Best | ✅ checked (UAT; durable Best needs native rebuild if soft-fail path) |
| HUD strip + safe-area | PLT-02 | Visual / device | Notched iPhone + Android: strip under notch; playfield below strip; overlays inset | ✅ checked |
| Airplane mode full loop | ARCH-02 | Offline product | Title → Play → Pause/Retry/Menu → Results with Best; no network calls | ✅ checked |
| Instant Retry / Menu | RUN-03 | UX | One tap Retry from Pause/Results; no confirmation dialog; Menu → Title | ✅ checked |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter *(left for verify-work gate)*

**Approval:** phase UAT passed 2026-09-20
