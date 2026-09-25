---
phase: 4
slug: level-format-brick-types
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.1 |
| **Config file** | `vitest.config.ts` (`environment: 'node'`, includes `src/core/**/*.test.ts`, `tests/**/*.test.ts`) |
| **Quick run command** | `npm run test:core` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds (quick); ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:core`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green + manual level switch / invalid overlay checks
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-W0-01 | 00 | 0 | LVL-01 | T-04-01 | schemaVersion 1 accept; unsupported reject with path | unit | `npx vitest run tests/levels.validate.test.ts` | ❌ W0 | ⬜ pending |
| 04-W0-02 | 00 | 0 | LVL-01 | T-04-01 | Unknown char / bad row length / space-in-row rejected | unit | `npx vitest run tests/levels.validate.test.ts` | ❌ W0 | ⬜ pending |
| 04-W0-03 | 00 | 0 | LVL-01 | T-04-02 | Valid level-01/02 compile brickCount > 0 | unit | `npx vitest run tests/levels.compile.test.ts` | ❌ W0 | ⬜ pending |
| 04-W0-04 | 00 | 0 | LVL-01 | T-04-03 | Failed validate never mutates World SoA / hashWorld | unit | `npx vitest run tests/levels.apply.test.ts` | ❌ W0 | ⬜ pending |
| 04-W0-05 | 00 | 0 | LVL-01 | — | level-01 vs level-02 structural fingerprint differs | unit | `npx vitest run tests/levels.compile.test.ts` | ❌ W0 | ⬜ pending |
| 04-W0-06 | 00 | 0 | LVL-02 | — | HP 3/2/1 distinct crack stroke plans | unit | `npx vitest run tests/levels.damage-cues.test.ts` | ❌ W0 | ⬜ pending |
| 04-W0-07 | 00 | 0 | LVL-03 | — | Unbreakable flag + steel channel in level-02 | unit | `npx vitest run tests/levels.compile.test.ts` | ❌ W0 | ⬜ pending |
| 04-W0-08 | 00 | 0 | LVL-03 | — | Win with only steel left → WON | unit | `npx vitest run tests/rules.win.test.ts` | ✅ | ⬜ pending |
| 04-* | * | * | Cross | T-04-01 | core purity with new levels modules | unit | `npx vitest run tests/core.purity.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Executor fills Task ID / Plan / Wave as plans are authored; Wave 0 stubs must exist before feature tasks that claim those automated commands.*

---

## Wave 0 Requirements

- [ ] `tests/levels.validate.test.ts` — LVL-01 rejection/acceptance (+ fixtures)
- [ ] `tests/levels.compile.test.ts` — compile packing + flags + layout fingerprint
- [ ] `tests/levels.apply.test.ts` — SoA fill + spatial grid + no-mutate-on-failure
- [ ] `tests/levels.damage-cues.test.ts` — crack stroke-plan helper (pure)
- [ ] `tests/fixtures/levels/invalid-*.json` — unsupported version, bad row length, unknown char, space in row
- [ ] Replace `tests/levels.phase3-grid.test.ts` to use `assets/levels/level-01.json` pipeline
- [ ] Optional pure helper `src/core/levels/damageCues.ts` for crack counts without Skia

*Existing infrastructure (Vitest, win/purity tests) covers LVL-03 win + core purity; Wave 0 adds level pipeline gaps.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Boot level-01; `__DEV__` switch to level-02; both play; steel bounces | LVL-01 / LVL-03 | Needs device/sim host | Launch app; play level-01; switch to level-02; confirm corridor feel + unbreakable bounce |
| Inject broken JSON in dev → overlay + no playfield | LVL-01 | Host error UI | Point switch at invalid fixture / break a char; confirm console + on-screen error; World not playing |
| Crack cues readable without color alone | LVL-02 | Visual accessibility | Damage a multi-HP brick; confirm crack/chip change visible on grayscale-ish inspection |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
