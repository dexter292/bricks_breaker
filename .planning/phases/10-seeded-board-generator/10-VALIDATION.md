---
phase: 10
slug: seeded-board-generator
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-25
---

# Phase 10 — Validation Strategy

> Per-phase validation contract. Source: `10-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.1 (`environment: 'node'`) |
| **Config file** | `vitest.config.ts` — new files in `tests/` match the existing glob, no config change |
| **Quick run command** | `npx vitest run tests/levelgen.sweep.test.ts tests/levelgen.determinism.test.ts` |
| **Full suite command** | `npm test` (vitest + assert-worklet-closures + assert-level-solvability + assert-eas-profiles + assert-brand-name + the new assert-generated-solvability) |
| **Estimated runtime** | quick < 5 s · full ~30 s |

Baseline at phase start: **82 test files / 451 tests green**, typecheck and lint clean.

Research measured the sweep cost directly: 105 000 boards in 3.4 s through the pure
reachability check, 8 400 boards in 352 ms through the full `validate` + `compile` +
`checkSolvability` path. A 21 000-board sweep is affordable in `npm test`.

**fast-check is deliberately NOT used here.** The repo uses it for physics properties, but
an enumerated seed loop is faster and exactly reproducible — a shrinking search adds nothing
when the input space is already a finite, enumerable `(seed, difficulty)` grid.

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/levelgen.*.test.ts` (target < 5 s)
- **After every wave:** `npx vitest run && npx tsc --noEmit && npx eslint src/levelgen`
- **Phase gate:** full `npm test` green **and** `git diff --name-only -- src/core` empty
- **Max feedback latency:** ~30 s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 10-00-01 | 00 | 0 | N-GEN-01/02/03 | N/A | unit (stubs) | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ W0 | ⬜ pending |
| 10-00-02 | 00 | 0 | Regression | `balanceBot` refactor keeps the campaign contract | unit | `npx vitest run tests/balance.curve-e2.test.ts` | ✅ exists | ⬜ pending |
| 10-01-01 | 01 | 1 | N-GEN-01 | Repeat calls `JSON.stringify`-identical | unit | `npx vitest run tests/levelgen.determinism.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | N-GEN-01 / SC-1 | Fixed corpus hashes to a pinned SHA-256 | unit | `npx vitest run tests/levelgen.determinism.test.ts -t 'golden hash'` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | SC-1 | No ambient input — `Math.random`/`Date.now`/`performance.now`/`Math.pow`/`**`/trig banned in `src/levelgen/**` | lint | `npx eslint src/levelgen` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | N-GEN-02 | `unreachableBreakables` is `[]` over the full sweep | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | N-GEN-02 | Every board passes `validateLevel` + `loadAndCompile` | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 2 | SC-3 | `right ≤ 360` and `bottom ≤ 640`, per board | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-04 | 02 | 2 | N-GEN-02 | The `.mjs` CI twin agrees over the same corpus (R-16 discipline) | integration | `node scripts/assert-generated-solvability.mjs` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 3 | N-GEN-03 | Schedule `bricks`/`totalHp` non-decreasing over `0..D_MAX` | unit | `npx vitest run tests/levelgen.schedule.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 | 3 | N-GEN-03 | `levelStaticsOf(generate(s,d))` **equals** `SCHEDULE[d]` — weight is seed-independent | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-03 | 03 | 3 | N-GEN-03 / SC-5 | Only `1/2/3/E/X/.` in cells; `brickTypes` deep-equals the E1b definitions | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-04 | 03 | 3 | SC-5 | Max 8-connected `E` cluster ≤ 4 (peak sparks 72 < `particleCap` 128) | unit | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 4 | SC-2 backstop | A stratified sample of boards is actually **winnable**, not merely lint-clean | integration | `npx vitest run tests/levelgen.winnability.test.ts` | ❌ W0 | ⬜ pending |
| 10-04-02 | 04 | 4 | SC-6 | `src/levelgen/**` has no `'worklet'`; worklet-closures stays green | lint | `node scripts/assert-worklet-closures.mjs` | ✅ exists | ⬜ pending |
| 10-04-03 | 04 | 4 | SC-6 | `git diff --name-only -- src/core` empty for the whole phase | gate | `test -z "$(git diff --name-only origin/main...HEAD -- src/core)"` | ✅ tooling | ⬜ pending |
| 10-04-04 | 04 | 4 | A1 falsification | **Hermes produces the same digest as Node** | manual + device | `__DEV__` probe hashes the pinned corpus on device; compare to the pinned SHA-256 | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/levelgen/` module skeleton (`index.ts`, `generate.ts`, `grid.ts`, `schedule.ts`, `rng.ts`, `reachability.ts`)
- [ ] `eslint.config.js` — register the `levelgen` boundaries element **and** the ambient-input `no-restricted-syntax` block. **A new `src/` folder is silently exempt from the layer matrix until registered** — research probed this and confirmed `src/levelgen → anything` produced no error while `runtime → services` correctly errored. Registering it is what closes the hole.
- [ ] `docs/layer-contract.md` — add the LC-15 row for `levelgen → core`
- [ ] `tests/helpers/balanceBot.ts` — object-accepting `levelStaticsOf` / `runBotOnLevel` split (both currently read from `assets/levels/${id}.json`), with `tests/balance.curve-e2.test.ts` unchanged and green
- [ ] `tests/levelgen.sweep.test.ts`, `levelgen.determinism.test.ts`, `levelgen.schedule.test.ts`, `levelgen.winnability.test.ts` — stubs
- [ ] `scripts/assert-generated-solvability.mjs` + its entry in the `package.json` `test` chain

No framework install needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hermes byte-identity (assumption **A1**) | N-GEN-01 | Byte-identity was measured across Node processes only; Hermes is the RN 0.86 / Expo 57 engine and was never observed. If it diverges, Phase 12's daily challenge hands different boards to device and CI — the one thing a daily mode cannot tolerate | Add a `__DEV__`-only probe that hashes the same pinned corpus on device and logs the digest. Compare against the SHA-256 pinned in `tests/levelgen.determinism.test.ts`. If they differ, bisect the corpus to find the diverging board |
| Board feel | — | The dial constants are calibrated against authored weight and bot clear time, never against human play (the E2 cohort was skipped) | Play a low, a mid and a high difficulty board. This is a judgement call, not a gate — **no test may pin the literal dial constants** |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
