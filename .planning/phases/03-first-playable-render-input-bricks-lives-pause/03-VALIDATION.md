---
phase: 3
slug: first-playable-render-input-bricks-lives-pause
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.1 (+ fast-check for existing physics props) |
| **Config file** | `vitest.config.ts` (`environment: 'node'`, includes `src/core/**/*.test.ts`, `tests/**/*.test.ts`) |
| **Quick run command** | `npm run test:core` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds (quick); ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:core`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green + manual AppState 60s + gesture checklist
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-W0-01 | 00 | 0 | PHYS-01 | T-03-01 | Finite/clamped paddle X | unit | `npx vitest run tests/input.paddle-intent.test.ts` | ❌ W0 | ⬜ pending |
| 03-W0-02 | 00 | 0 | PHYS-01 / PHYS-05 | T-03-02 | Pan never sets launch/resume | unit | `npx vitest run tests/input.gesture-gates.test.ts` | ❌ W0 | ⬜ pending |
| 03-W0-03 | 00 | 0 | PHYS-05 | — | Dock + english launch clamps | unit | `npx vitest run tests/rules.serve.test.ts` | ❌ W0 | ⬜ pending |
| 03-W0-04 | 00 | 0 | RUN-02 | — | Lives decrement / lose | unit | `npx vitest run tests/rules.lives.test.ts` | ❌ W0 | ⬜ pending |
| 03-W0-05 | 00 | 0 | RUN-02 | — | Win on last breakable | unit | `npx vitest run tests/rules.win.test.ts` | ❌ W0 | ⬜ pending |
| 03-W0-06 | 00 | 0 | RUN-02 | — | Grid has multi-HP + unbreakable | unit | `npx vitest run tests/levels.phase3-grid.test.ts` | ❌ W0 | ⬜ pending |
| 03-W0-07 | 00 | 0 | PLT-01 | T-03-03 | Freeze / accumulator reset | unit | `npx vitest run tests/runtime.freeze.test.ts tests/runtime.accumulator-reset.test.ts` | ❌ W0 | ⬜ pending |
| 03-* | * | * | Existing physics | T-03-01 | Non-finite intent ignored | unit | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Executor fills Task ID / Plan / Wave columns as plans are authored; Wave 0 stubs must exist before feature tasks that claim those automated commands.*

---

## Wave 0 Requirements

- [ ] `tests/rules.serve.test.ts` — PHYS-05 dock/launch
- [ ] `tests/rules.lives.test.ts` — RUN-02 life loss / lose
- [ ] `tests/rules.win.test.ts` — RUN-02 win vs unbreakable
- [ ] `tests/levels.phase3-grid.test.ts` — D-20 grid shape
- [ ] `tests/input.paddle-intent.test.ts` — pure relative-drag helper
- [ ] `tests/input.gesture-gates.test.ts` — launch/resume gate predicates
- [ ] `tests/runtime.freeze.test.ts` — freeze contract helper
- [ ] `tests/runtime.accumulator-reset.test.ts` — no catch-up after long stall
- [ ] Extract pure helpers (`computeRelativePaddleX`, `shouldAcceptServeTap`, `resetAccumulator`, `countBreakableAlive`) so Node tests do not need RNGH/Skia

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AppState background 60s mid-rally → auto-pause; Resume → 3s countdown; no physics jump | PLT-01 | Needs real AppState / device lifecycle | Background app mid-rally ≥60s; return; confirm frozen; tap Resume; wait countdown; confirm no teleport/catch-up |
| Snappy relative drag; never teleport on re-press; aim a brick in ≤1 min | PHYS-01 / PHYS-05 | Feel + gesture host | Drag playfield; lift and re-press elsewhere; serve and aim at a chosen brick within first minute |
| Pause overlay Resume vs playfield pan never accidental-serve/resume | PHYS-01 / PLT-01 | RNGH host behavior | While docked: pan without launch; while paused: pan playfield without resume; Resume only via overlay control |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
