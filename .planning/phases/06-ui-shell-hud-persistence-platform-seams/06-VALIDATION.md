---
phase: 6
slug: ui-shell-hud-persistence-platform-seams
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-20
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
| 06-W0-01 | 00 | 0 | RUN-04 | T-06-01 | Parse/reject corrupt JSON → 0 | unit stub | `npm test -- tests/storage.personal-best.test.ts` | ✅ | ⬜ pending (it.todo) |
| 06-W0-02 | 00 | 0 | ARCH-02 | T-06-02 | No-op seams callable | unit stub | `npm test -- tests/platform.seams.test.ts` | ✅ | ⬜ pending (it.todo) |
| 06-01-01 | 01 | 1 | RUN-04 | T-06-01 | evaluatePersonalBest strict `>`; parse fail soft | unit | `npm test -- tests/storage.personal-best.test.ts` | ✅ after W0 | ⬜ pending (GREEN placeholder) |
| 06-01-02 | 01 | 1 | RUN-04 | T-06-01 | AsyncStorage adapter `@nbb/personal-best/v1` | unit + tsc | `npm test -- tests/storage.personal-best.test.ts` | ✅ after W0 | ⬜ pending (GREEN placeholder) |
| 06-02-01 | 02 | 1 | ARCH-02 | T-06-02/05 | noop onRunEnded no-throw; no UI/SDK | unit | `npm test -- tests/platform.seams.test.ts` | ✅ after W0 | ⬜ pending (GREEN placeholder) |
| 06-02-02 | 02 | 1 | ARCH-02 | T-06-02 | defaultPlatformServices barrel | unit | `npm test -- tests/platform.seams.test.ts` | ✅ after W0 | ⬜ pending (GREEN placeholder) |
| 06-03-01 | 03 | 2 | RUN-03 | T-06-04/05 | Title cold start; PlayingHost extract | tsc + rg | `npx tsc --noEmit -p .` | ✅ host exists | ⬜ pending |
| 06-03-02 | 03 | 2 | RUN-03 | — | Menu on Pause/Results; no confirm | tsc + rg | `npx tsc --noEmit -p .` | ✅ overlays | ⬜ pending |
| 06-04-01 | 04 | 3 | PLT-02 | T-06-04 | HudStrip 48px / rgba(18,18,31,0.8) | rg | `rg HudStrip src/runtime` | ❌ | ⬜ pending |
| 06-04-02 | 04 | 3 | PLT-02 | T-06-04 | playfieldTop = insets.top + 48 | rg + tsc | `npx tsc --noEmit -p .` | ✅ GameScreen | ⬜ pending |
| 06-05-01 | 05 | 4 | RUN-04 | T-06-01 | Results Score/Best/New Record | tsc + rg | `npx tsc --noEmit -p .` | ✅ ResultOverlay | ⬜ pending |
| 06-05-02 | 05 | 4 | RUN-04, ARCH-02 | T-06-01/02/04 | preload + cold path persist + onRunEnded | unit + tsc | `npm test -- tests/storage.personal-best.test.ts tests/platform.seams.test.ts` | ✅ after W0 | ⬜ pending |
| 06-05-03 | 05 | 4 | RUN-03, RUN-04, PLT-02, ARCH-02 | T-06-05 | Full shell UAT | manual + unit | `npm test -- tests/storage… platform…` | manual | ⬜ pending |
| — | — | — | D-08 | T-06-04 | No per-frame React regression | unit | `npm test` | ✅ | ⬜ pending |

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

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Best survives force-quit | RUN-04 | Native AsyncStorage | Play run → set high score → force-quit → relaunch → Title shows Best |
| HUD strip + safe-area | PLT-02 | Visual / device | Notched iPhone + Android: strip under notch; playfield below strip; overlays inset |
| Airplane mode full loop | ARCH-02 | Offline product | Title → Play → Pause/Retry/Menu → Results with Best; no network calls |
| Instant Retry / Menu | RUN-03 | UX | One tap Retry from Pause/Results; no confirmation dialog; Menu → Title |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
