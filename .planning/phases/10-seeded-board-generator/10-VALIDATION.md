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
| **Full suite command** | `npm test` (vitest + assert-worklet-closures + assert-level-solvability + assert-eas-profiles + assert-brand-name — **unchanged**, see the 10-02-04 decision below) |
| **Estimated runtime** | quick < 5 s · full ~30 s |

Baseline at phase start: **82 test files / 451 tests green**, typecheck and lint clean.

Research measured the sweep cost directly: 105 000 boards in 3.4 s through the pure
reachability check, 8 400 boards in 352 ms through the full `validate` + `compile` +
`checkSolvability` path. A 21 000-board sweep is affordable in `npm test`.

**fast-check is deliberately NOT used here.** The repo uses it for physics properties, but
an enumerated seed loop is faster and exactly reproducible — a shrinking search adds nothing
when the input space is already a finite, enumerable `(seed, difficulty)` grid.

---

## Decision: the `.mjs` CI twin (original task 10-02-04) — resolved at plan time

**`scripts/assert-generated-solvability.mjs` is deliberately NOT created.** Recorded in full in
`10-03-PLAN.md` §objective. Summary:

- R-16's obligation is that *both* implementations of the solvability lint agree on the same
  artefacts. `tests/levels.solvability-parity.test.ts:10-25` proves a `.ts` test can import
  `scripts/lib/levelSolvability.mjs` directly, so both implementations can see the generated
  corpus **in-process, from the live `generate`**, with no checked-in fixture.
- A standalone `.mjs` script cannot import TypeScript (the `scripts/lib/*.mjs` header rule, and
  Node's ESM resolver rejects this repo's extensionless relative imports under type stripping).
  It would therefore need either a second `generate` written in ESM — a third algorithm needing
  a third parity test, which RESEARCH's "Don't Hand-Roll" table warns against — or a checked-in
  board corpus that goes stale the moment Phase 11 re-tunes `SCHEDULE`.
- `npm test` runs `vitest run` first, so the gate remains in the full-suite chain either way.

The parity assertion therefore lives in `tests/levelgen.sweep.test.ts` as a dedicated R-16
`describe` block over the **same `SWEEP_SEEDS` x 21 corpus the main sweep uses** — 1 000 x 21 =
**21 000 boards**, not a subsample. RESEARCH Open Question 3 resolves to "run the same N in
both: the parity value comes from *both* implementations seeing the same corpus", and the
`.mjs` path measures 0.033 ms per board, so the whole corpus costs under a second. This figure
is authoritative and matches `10-03-PLAN.md` task 1's behavior block, must_haves and success
criteria. `package.json` is unchanged.

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/levelgen.*.test.ts` (target < 5 s)
- **After every wave:** `npx vitest run && npx tsc --noEmit && npx eslint src/levelgen`
- **Phase gate:** full `npm test` green **and** `git diff --name-only -- src/core` empty
- **Max feedback latency:** ~30 s

---

## Per-Task Verification Map

Re-homed 2026-09-25 to match the six PLAN.md files. Every original contract survives; the
task ids now key on `10-{plan}-{task}` as written, and the original 10-02-04 resolves to the
R-16 vitest block per the decision above.

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 10-00-01 | 00 | 0 | N-GEN-01 / SC-1 / SC-6 | No ambient input and no cross-layer import in `src/levelgen/**`; the folder is registered in the boundaries matrix (it is silently exempt until then) | lint (negative probe) | `npx eslint src/levelgen/__probe.ts` must exit non-zero, then `npm run lint` | ❌ W0 | ⬜ pending |
| 10-00-02 | 00 | 0 | N-GEN-01 / SC-3 | Integer-only PRNG with no thread directive; `below()` terminates on power-of-two `n`; `GRID` fits 360x640 | unit + lint | `npm run typecheck && npx eslint src/levelgen` | ❌ W0 | ⬜ pending |
| 10-00-03 | 00 | 0 | N-GEN-01 | rng determinism, seed normalisation over hostile inputs, grid bounds | unit | `npx vitest run tests/levelgen.determinism.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-01 | 01 | 0 | Regression / N-GEN-03 | `balanceBot` split keeps the campaign contract; nothing written to `assets/levels/` | unit | `npx vitest run tests/balance.curve-e2.test.ts` | ✅ exists | ⬜ pending |
| 10-01-02 | 01 | 0 | N-GEN-02 / N-GEN-03 | Sweep/schedule/winnability scaffolds with `SWEEP_SEEDS` exported | unit (stubs) | `npx vitest run tests/levelgen.sweep.test.ts tests/levelgen.schedule.test.ts tests/levelgen.winnability.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | N-GEN-01/02/03 | **TRACER** — 525 boards pass `validateLevel` + `loadAndCompile` + `checkSolvability`, are mirror-symmetric and schedule-exact; `generate` never calls the lint | integration | `npx vitest run tests/levelgen.sweep.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | N-GEN-03 / SC-5 | Max 8-connected `E` cluster ≤ 4 (peak sparks 72 < `particleCap` 128), weight-neutral; schedule monotone and capacity-safe | unit | `npx vitest run tests/levelgen.sweep.test.ts tests/levelgen.schedule.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | N-GEN-02 / N-GEN-03 / SC-3 / SC-5 | 21 000 boards: reachability `[]`, validate + compile ok, bounds, charset, `brickTypes` deep-equality, exact weight, steel ≤ budget **and** the `.mjs` twin agrees (R-16, resolves the original 10-02-04) | integration | `npx vitest run tests/levelgen.sweep.test.ts` | ✅ exists | ✅ green |
| 10-03-02 | 03 | 2 | N-GEN-01 / SC-1 | Repeat calls `JSON.stringify`-identical and non-aliasing; fixed corpus pinned by a Node SHA-256 **and** an engine-portable u32 fingerprint; `difficulty` clamped | unit | `npx vitest run tests/levelgen.determinism.test.ts` | ✅ exists | ✅ green |
| 10-04-01 | 04 | 3 | SC-2 backstop | A stratified 30-board sample is actually **winnable**, not merely lint-clean | integration | `npx vitest run tests/levelgen.winnability.test.ts` | ❌ W0 | ⬜ pending |
| 10-04-02 | 04 | 3 | Evidence integrity | `docs/ops/BOARD-GENERATOR.md` records the proof, the dials, both digests and a `## Limits` section naming what was NOT measured | doc gate | `grep -c "## Limits" docs/ops/BOARD-GENERATOR.md` | ❌ W0 | ⬜ pending |
| 10-05-01 | 05 | 4 | A1 falsification | **Hermes produces the same fingerprint as Node**; the probe is inert in unarmed builds | manual + device | `__DEV__` + `EXPO_PUBLIC_LEVELGEN_PROBE=1` probe logs `[levelgen]` on device; compare to the pinned u32 fingerprint | ❌ W0 | ⬜ pending |
| 10-05-02 | 05 | 4 | SC-6 / phase gate | `src/core` byte-unchanged; no thread directive in `src/levelgen/**`; full suite green | gate | `git diff --name-only origin/main...HEAD -- src/core` empty, then `npx eslint src/levelgen && npm run typecheck && npm test` | ✅ tooling | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 is two parallel plans — `10-00` (config + primitives) and `10-01` (helpers + scaffolds).
They share no files, so they run in the same wave.

- [ ] `eslint.config.js` — register the `levelgen` boundaries element **and** the ambient-input `no-restricted-syntax` block (extended with `Math.pow`/`**`/trig). **A new `src/` folder is silently exempt from the layer matrix until registered** — research probed this and confirmed `src/levelgen → anything` produced no error while `runtime → services` correctly errored. Registering it is what closes the hole. *(10-00 task 1)*
- [ ] `docs/layer-contract.md` — LC-15 `levelgen → core`, LC-16 `app → levelgen`, LC-17 banned crossings *(10-00 task 1)*
- [ ] `src/levelgen/rng.ts`, `grid.ts`, `index.ts` — the integer PRNG (no thread directive, no float path, no power-of-two hang) and the one fixed lattice *(10-00 task 2)*
- [ ] `tests/levelgen.determinism.test.ts` — live rng/seed/grid cases + 4 `it.todo` pins *(10-00 task 3)*
- [ ] `tests/helpers/balanceBot.ts` — object-accepting `levelStaticsOf` / `runBotOnLevel` split (both currently read from `assets/levels/${id}.json`), with `tests/balance.curve-e2.test.ts` unchanged and green *(10-01 task 1)*
- [ ] `tests/levelgen.sweep.test.ts`, `levelgen.schedule.test.ts`, `levelgen.winnability.test.ts` — stubs with `SWEEP_SEEDS` exported *(10-01 task 2)*

The remaining `src/levelgen/` modules (`schedule.ts`, `reachability.ts`, `generate.ts`) are
**not** Wave 0 scaffolds: they are the Wave 1 tracer (`10-02` task 1), written and proven
end-to-end in one slice rather than stubbed.

`scripts/assert-generated-solvability.mjs` and its `package.json` chain entry are **removed from
Wave 0** — see the 10-02-04 decision above.

No framework install needed. This phase adds zero dependencies.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hermes byte-identity (assumption **A1**) | N-GEN-01 | Byte-identity was measured across Node processes only; Hermes is the RN 0.86 / Expo 57 engine and was never observed. If it diverges, Phase 12's daily challenge hands different boards to device and CI — the one thing a daily mode cannot tolerate | Plan `10-05` task 1 ships the probe: `EXPO_PUBLIC_LEVELGEN_PROBE=1 npx expo start` on a dev build, read the `[levelgen]` log line, compare against the **u32 corpus fingerprint** pinned in `tests/levelgen.determinism.test.ts` (not the SHA-256 — `node:crypto` does not exist on Hermes, which is why `src/levelgen/fingerprint.ts` exists). If they differ, halve `CORPUS_SEEDS` until the diverging board is isolated. Carried as a `<verify><human-check>` so the end-of-phase harvest lands it in `10-UAT.md` |
| Board feel | — | The dial constants are calibrated against authored weight and bot clear time, never against human play (the E2 cohort was skipped) | Play a low, a mid and a high difficulty board. This is a judgement call, not a gate — **no test may pin the literal dial constants** |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a Wave 0 dependency — all 13 plan tasks carry one
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (see the re-homed list above)
- [x] No watch-mode flags — every command is `vitest run`, never `vitest`
- [x] Feedback latency < 30 s — quick loop < 5 s, full sweep < 30 s, `npm test` ~30 s
- [ ] `nyquist_compliant: true` set in frontmatter — for the validation step to flip

**Approval:** map re-homed to the six PLAN.md files 2026-09-25; the 10-02-04 `.mjs` question is
resolved above rather than deferred to the executor.


---

## Task-ID scheme (reconciled 2026-09-25, after Wave 0)

The executor for 10-01 flagged that the plans and the map above disagree on a few task IDs
(`10-02-03`/`10-02-04`, `10-03-03`/`10-03-04`). **The PLAN files are authoritative.** Where a
row above cites an ID that no plan defines, read it as naming the *behaviour*, not the task —
every behaviour listed is still covered, it is the numbering that drifted when 10-02-04's
`.mjs` twin was resolved away into 10-03's in-process parity block.

10-05-02's todo-coverage audit should enumerate task IDs from the plan files, not from this
document.

## Phase gate base (corrected 2026-09-25)

Gate 1 in `10-05-PLAN.md` compares `src/core` against the **phase base
`64a0b0ca9b7c8fff4c137fb6385e66870df4cf13`**, not `origin/main`. The branch carries one
deliberate pre-phase core commit (`7539e61`, the Metro web/SSR TDZ fix), so an `origin/main`
comparison fails a gate Phase 10 has not violated. Measured at the Wave 0 merge:
`64a0b0c..HEAD -- src/core` is empty; `origin/main...HEAD -- src/core` reports one file.
