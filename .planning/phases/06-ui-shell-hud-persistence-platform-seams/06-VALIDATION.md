---
phase: 6
slug: ui-shell-hud-persistence-platform-seams
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 06-W0-01 | 00 | 0 | RUN-04 | T-06-01 | Parse/reject corrupt JSON → 0 | unit stub | `npm test -- tests/storage.personal-best.test.ts` | ❌ W0 | ⬜ pending |
| 06-W0-02 | 00 | 0 | ARCH-02 | — | No-op seams callable | unit stub | `npm test -- tests/platform.seams.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1+ | RUN-03 | — | Shell Title↔Playing transitions (if reducer) | unit | `npm test -- tests/shell.navigation.test.ts` | ❌ optional | ⬜ pending |
| TBD | TBD | 1+ | RUN-04 | T-06-01 | Personal best compare + store | unit | `npm test -- tests/storage.personal-best.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1+ | ARCH-02 | T-06-02 | onRunEnded no-throw; no SDK | unit | `npm test -- tests/platform.seams.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1+ | D-08 | — | No per-frame React regression | unit | `npm test` | ✅ | ⬜ pending |

*Planner fills concrete Task IDs when PLAN.md files are written.*

---

## Wave 0 Requirements

- [ ] `tests/storage.personal-best.test.ts` — stubs for RUN-04 (compare, memory store, corrupt → 0)
- [ ] `tests/platform.seams.test.ts` — stubs for ARCH-02 (`onRunEnded` no-op)
- [ ] Optional `tests/shell.navigation.test.ts` — pure shellPhase transitions if reducer extracted
- [ ] Install `@react-native-async-storage/async-storage@2.2.0` via `npx expo install`
- [ ] ESLint: allow `app` → `services`

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
