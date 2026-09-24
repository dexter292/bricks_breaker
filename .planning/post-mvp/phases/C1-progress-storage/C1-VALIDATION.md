---
phase: C1
slug: progress-storage
status: planned
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-24
notes: Nyquist contract for N-PROG-01 / N-PROG-02; Wave 0 stubs land in C1-00
---

# Phase C1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Covers **N-PROG-01** (unlock chain + offline persist) and **N-PROG-02** (per-level best).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.1 (Node environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/storage.progress-v2.test.ts tests/storage.personal-best.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/storage.progress-v2.test.ts tests/storage.personal-best.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite green + manual UAT checklist below
- **Max feedback latency:** 30 seconds

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| N-PROG-01 | `level-01` clear unlocks `level-03` (not `level-02`) | unit | `npx vitest run tests/storage.progress-v2.test.ts` | ❌ → Wave 0 |
| N-PROG-01 | Lose does **not** unlock | unit | same | ❌ → Wave 0 |
| N-PROG-01 | Corrupt v2 → defaults; memory watermark not clobbered | unit | same | ❌ → Wave 0 |
| N-PROG-01 | v1-only migrate seeds `bestScore`, unlocked=`['level-01']` | unit | same | ❌ → Wave 0 |
| N-PROG-01 | Catalog order = `01→03→04→05→06`; next after `06` is null | unit | same | ❌ → Wave 0 |
| N-PROG-02 | `recordLevelBest` strict `>`; rollup `bestScore` = max | unit | same + personal-best | ❌ → Wave 0 |
| N-PROG-02 | Equal/lower score does not overwrite level best | unit | same | ❌ → Wave 0 |
| — | Singleton ProgressStore identity (Title↔Playing) | unit | same | ❌ → Wave 0 |
| N-PROG-02 | Results uses per-level previousBest (host wire) | rg + optional UI | Plan 02 verify | host review |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| C1-W0-01 | 00 | 0 | N-PROG-01 | T-C1-01 | Catalog + unlockNext pure | unit stub→green | `npx vitest run tests/storage.progress-v2.test.ts` | ❌ | pending |
| C1-W0-02 | 00 | 0 | N-PROG-01/02 | T-C1-01 | Parse/migrate stubs | unit stub | same | ❌ | pending |
| C1-01-01 | 01 | 1 | N-PROG-01/02 | T-C1-01 | parseProgress + migrate v1→v2 | unit | same | pending | pending |
| C1-01-02 | 01 | 1 | N-PROG-01/02 | T-C1-02/03 | ProgressStore memory + AsyncStorage + flush | unit | same | pending | pending |
| C1-02-01 | 02 | 2 | N-PROG-01/02 | T-C1-03 | PlayingHost win→unlock; win\|lose→level best | rg + vitest | `npx vitest run tests/storage.progress-v2.test.ts tests/ui/GameHost.test.tsx` | pending | pending |
| C1-02-02 | 02 | 2 | N-PROG-02 | T-C1-03 | Title rollup getBest; Results per-level Best | rg + vitest | same | pending | pending |

---

## Wave 0 Requirements

- [ ] `tests/storage.progress-v2.test.ts` — stubs/cases for unlock, migrate, parse fail-soft, rollup
- [ ] `src/services/storage/types.ts` — `PROGRESS_KEY` / `ProgressBlob` / `ProgressStore` contracts
- [ ] `src/services/storage/catalog.ts` — `PLAYABLE_LEVEL_ORDER` + `nextLevelId`
- [ ] Existing `tests/storage.personal-best.test.ts` remains green (legacy v1 parse + `evaluatePersonalBest`)

*Do not add jest-expo for storage. No AsyncStorage 3.x upgrade.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Unlock + best survive force-quit | N-PROG-01/02 | Native AsyncStorage | Win level-01 → force-quit → relaunch → progress still has unlock + level best (inspect via Title rollup / DEV or later C2 select) | ⬜ |
| Lose does not unlock next | N-PROG-01 | Device flow | Lose on level-01 → confirm next stays locked in store (until C2 UI: use DEV/logs/`getSnapshot` in __DEV__) | ⬜ |
| Results New Record is per-level | N-PROG-02 | UX | Beat a weak level best below global PB → badge fires; fail to beat global on another level → no false global badge | ⬜ |
| Title Best = max rollup | N-PROG-02 | UX | Set highs on two levels → Menu → Title shows max | ⬜ |
| Airplane / offline | N-PROG-01 | Product | Full Title→Play→Win→Menu with no network | ⬜ |

---

## Out of Scope (do not validate in C1)

- Level select lock chrome / stars / replay (**C2**)
- Aimed serve (**B0 Won’t-Do**)
- Sentry DSN verify (**N-OPS-01**)
- Default start-level change to `level-01` (locked: keep `level-03` until C2)

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter *(left for verify-work gate)*
- [ ] `wave_0_complete: true` after Plan 00

**Approval:** pending execution
