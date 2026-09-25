---
phase: C2
slug: level-select-stars-replay
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-24
---

# Phase C2 — Validation Strategy

> Per-phase validation contract for N-LVL-02, N-PROG-03 (lives-based), N-PROG-04.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.1 (+ @testing-library/react for UI) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/storage.progress-v3.test.ts tests/ui/SelectScreen.test.tsx tests/ui/PlayingHost.next-bake.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Quick run command above
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** Full suite green + C1 UAT approved before v3 persist + cert arm smoke before ceiling re-run
- **Max feedback latency:** 45 seconds

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| N-PROG-03 | `computeStars` clamp 1–3 | unit | `npx vitest run tests/storage.progress-v3.test.ts` | ✅ |
| N-PROG-03 | Win max(stars); lose no stars write | unit | same | ✅ |
| N-PROG-03 | v1→v3 / v2→v3 preserve unlocked + scores | unit | same | ✅ |
| N-PROG-03 | Corrupt v3 → defaults; watermark safe | unit | same | ✅ |
| N-LVL-02 | Select three row states + locked ignore + mount snapshot | UI | `npx vitest run tests/ui/SelectScreen.test.tsx` | ✅ |
| N-LVL-02 | Title → Select → Playing → Menu → Title | UI | `npx vitest run tests/ui/GameHost.test.tsx` | ✅ Plan 02/03 |
| N-PROG-04 | Win Next gated; hidden on level-06; lose no Next | UI | `npx vitest run tests/ui/ResultOverlay.test.tsx` | ✅ |
| Bake D-03 | `setActive(true)` last after levelId change | UI/unit | `npx vitest run tests/ui/PlayingHost.next-bake.test.ts` | ✅ Plan 03 |
| D-15 | `loadLevelById` requires id | unit | `npx vitest run tests/runtime.loadLevel.test.ts` | ✅ Plan 03 |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| C2-W0-stars | 00 | 0 | N-PROG-03 | T-C2-01 | Pure clamp / omit stars until win | unit | `npx vitest run tests/storage.progress-v3.test.ts` | ✅ | ✅ Wave 0 |
| C2-W0-select | 00 | 0 | N-LVL-02 | T-C2-02 | Stub suite reserved | UI stub | `npx vitest run tests/ui/SelectScreen.test.tsx` | ✅ | ✅ Wave 0 |
| C2-W0-bake | 00 | 0 | D-03 | T-C2-01 | Stub suite reserved | UI stub | `npx vitest run tests/ui/PlayingHost.next-bake.test.ts` | ✅ | ✅ Wave 0 |
| C2-W0-result | 00 | 0 | N-PROG-04 | T-C2-02 | Stub suite reserved | UI stub | `npx vitest run tests/ui/ResultOverlay.test.tsx` | ✅ | ✅ Wave 0 |
| C2-03-levelId | 03 | 3 | N-PROG-04 / D-15 | T-C2-10 | Required levelId; Next bake-safe; recordRunEnd blob | unit/UI | `npx vitest run tests/runtime.loadLevel.test.ts tests/ui/PlayingHost.next-bake.test.ts tests/ui/GameHost.test.tsx` | ✅ | ✅ Plan 03 code |
| C2-03-docs | 03 | 3 | N-PROG-03 | D-16 | PROGRESS-STORAGE v3 + cert-arm / ceiling notes | docs | `rg` ops notes + `npm test` | ✅ | ✅ Plan 03 docs |
| C2-03-uat | 03 | 3 | N-LVL-02 / N-PROG-03/04 | D-16 | Device UAT + cert arm smoke | manual | Device checklist | — | ⏳ Awaiting human |

---

## Wave 0 Requirements

- [x] `tests/storage.progress-v3.test.ts` — migrate, stars merge, corrupt
- [x] `src/services/storage/stars.ts` (or equiv) — `computeStars` / merge / row state
- [x] `tests/ui/SelectScreen.test.tsx`
- [x] `tests/ui/PlayingHost.next-bake.test.ts` — setActive-last (Plan 03 GREEN)
- [x] Update `tests/ui/GameHost.test.tsx` for Select
- [x] Update `tests/runtime.loadLevel.test.ts` — no default id (Plan 03)
- [x] ResultOverlay / GameScreen Next + stars coverage
- [ ] Plan gate: **C1 device UAT approved** before v3 write-through
- [ ] Plan 03: **Human device UAT + cert-arm smoke** (Manual-Only rows below)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| C1 ProgressStore durable on device | Precondition | AsyncStorage native | Complete C1-02 UAT before enabling v3 migration ship |
| Cert harness still arms after play-path change | D-16 | Instruments / device | One CERT session confirm inject after remount — **before** A1 ceiling re-run. See `docs/ops/PROGRESS-STORAGE.md` ops note. |
| Post-C2 ceiling Cert WC | RELEASE-GATES §6 | Hardware | **One** re-run after C2 chrome lands — do not measure twice |
| Select visual three-states | N-LVL-02 | Aesthetic | Smoke on device: locked / ☆☆☆ / ★★★ + best |
| Select + stars + Next + cert arm (Plan 03 Task 3) | N-LVL-02 / N-PROG-03 / N-PROG-04 / D-16 | Device UAT | Follow C2-03-PLAN Task 3 how-to-verify; append `Human UAT: approved YYYY-MM-DD` when done |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
