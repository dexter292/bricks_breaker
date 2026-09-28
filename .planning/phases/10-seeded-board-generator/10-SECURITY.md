---
phase: "10"
slug: "seeded-board-generator"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-29"
register_rows: 30
unique_ids: 25
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

State B audit — no `10-SECURITY.md` existed, but the register was authored at plan time across
all six PLAN files. This audit therefore **verified mitigations** rather than inventing a
register. ASVS level 1, block on `high` (`workflow.security_block_on` is unset in
`.planning/config.json`; the default applies).

**The register is NOT deduped by id.** All **30** rows appear, one per reference: **24 numbered**
rows (`T-10-01` … `T-10-24`, each appearing exactly once) plus **6** `T-10-SC` supply-chain rows —
one in *every* plan, checked individually rather than assumed. **25 unique ids.** Phase 11's
"74 unique threats" was a dedupe-by-id collapse of a 133-row register; that is not repeated here.
Arithmetic: 5 + 3 + 5 + 4 + 3 + 4 = 24 numbered, + 6 `T-10-SC` = 30 rows = 23 mitigate + 7 accept
+ 0 transfer. By severity: 13 high + 8 medium + 9 low = 30.

**Verification exceeded L1.** L1 permits closing a threat by reading. **11 of 30 rows were closed
by making a control fail.** Evidence method per row: **M** = made a control fail · **E** = empirical
probe against the real code path · **R** = read.

> **`T-10-24` was found OPEN and blocking by this audit, and has since been CLOSED.**
> See *Resolution* at the end of this file. The audit's finding stands as written — all three
> enforcements its register row named were measured and none performed the claimed check — and the
> orchestrator independently reproduced that before closing it with a committed gate,
> `scripts/assert-levelgen-thread.mjs` (`729abd3`). The frontmatter reads `threats_open: 0` as of
> that commit; the register row below records both states.

---

## The posture this phase inherits

Stated, not re-derived, and **not reported as an open threat**:

- **There is no server, no account, no leaderboard and no store.** `PROJECT.md` rules the category
  out. A generated board **guards nothing** — no asset, no currency, no entitlement.
- **Seed predictability is not a vulnerability here and was not re-opened.** The daily seed is a
  local date string *on purpose* — that is what makes "the same board for everyone today" true with
  no server. Registered by phase 12 as **T-12-05** / **AR-12-01**, and **that disposition is phase
  12's, not this audit's.** Phase 10's own `T-10-05` is a different threat (`makeRng` being
  *mistaken* for a CSPRNG downstream) and is closed on its own evidence.
- **AsyncStorage is plaintext**; local record tampering is accepted (**AR-11-02**, **AR-12-02** /
  **T-12-06**). Note for future readers: phase 12 mis-cited that acceptance as T-12-05 at four
  shipped sites before repairing it. This file cites **T-12-05** only for predictability and
  **T-12-06** only for tampering.

What this audit actually tested — the five properties that are **not** accepted:

| # | Property | Verdict |
|---|---|---|
| 1 | A generated board must always compile and always be clearable | **holds** — and red-proved: one unknown-char mutation reds **4** independent sweep assertions; disabling the reachability invariant reds the solvability sweep at `s=8 d=20` |
| 2 | Determinism — same seed, same board, every device and version | **holds** — both pins red on a one-constant change; A1 discharged on Hermes at `0x2e8f6c23` |
| 3 | Nothing may throw on a hostile seed | **holds** — 380 hostile (seed × difficulty) combinations: **0 throws, 0 invalid boards** |
| 4 | Bounded work per `generate` call | **holds** — worst single call **1 ms** across the hostile set; 21 000 boards in 392 ms; no `while (!ok)` anywhere |
| 5 | The `.mjs` twin's agreement test actually binds | **partly — the sweep's parity block is VACUOUS.** See Finding 1. The twin's real guards are elsewhere and both red-proved |

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| caller → `generate` arguments | `seed` and `difficulty` are the **only** inputs to the whole phase, and no caller validates them. Phase 11 feeds a wave counter, phase 12 a date string | `seed: number \| string`, `difficulty: number` |
| `src/levelgen/**` → JS engine | Any ambient read (clock, entropy) or implementation-approximated `Math` call silently destroys N-GEN-01, and nothing outside `eslint.config.js` would catch it | `Math.random`, `Date.now`, `performance.now`, `Math.pow/sin/cos/exp/log`, `**` |
| generated board → simulation | The board reaches `loadAndCompile` → `applyCompiledLevel` → the worklet. An oversized grid or unknown cell char would reach the hot path | the whole `LevelFileV1`: `grid`, `brickTypes`, `cells` |
| generated board → VFX budget | Explosive clusters drive the particle pool; an unbounded cluster exceeds the Mid `particleCap` of 128 | the count and adjacency of `E` cells |
| TypeScript generator → `.mjs` CI twin | R-16. Two implementations of one rule — this repo's recurring drift shape | `checkSolvability` verdicts over the same boards |
| `EXPO_PUBLIC_LEVELGEN_PROBE` → shipped binary | `EXPO_PUBLIC_*` flags are build-time and land in the bundle; an armed production profile would run a 4 200-board loop at every launch | the flag, and `corpusFingerprint()`'s cost |
| device JS engine → pinned digest | Hermes is the one execution environment no automated gate in this repo can reach | the u32 corpus fingerprint |
| `src/levelgen` → UI thread | A `'worklet'` directive would move generation onto the render thread. **This was the open threat** | any workletized function in `src/levelgen` |
| documentation → future implementer | An ops document that overstates a control is how a later phase inherits a gate that does not exist. This project has produced that failure eleven times in three phases | `docs/ops/BOARD-GENERATOR.md`, the register itself |

---

## Threat Register

30 rows, one per `T-10-*` reference across the six PLAN files. **Citations name symbols, not line
numbers** — this repo's line citations have drifted four times.

| Threat ID | Category | Component | Severity | Disposition | Mitigation & how it was established | Status |
|-----------|----------|-----------|----------|-------------|--------------------------------------|--------|
| T-10-01 @10-00 | Tampering | `src/levelgen/**` ambient input | high | mitigate | **M** — a probe carrying `Math.random`, `Date.now`, `performance.now`, `Math.pow/sin/cos/exp/log` and `**` draws exactly **10 errors** (`performance.now` fires both `no-restricted-globals` and `no-restricted-syntax`). The probe's header **names all nine constructs in prose** and draws none of its own — comments are not AST nodes, verified rather than assumed. | closed |
| T-10-02 @10-00 | Elevation of Privilege | unregistered `src/` folder | high | mitigate | **M ×2** — a probe importing `../runtime/loadLevel` yields `There is no policy allowing dependencies from elements of type "levelgen" to elements of type "runtime"` (`boundaries/dependencies`), and `react-native` yields the `FORBIDDEN_IN_CORE` message. Then the stronger half: **deleting the `{ type: 'levelgen', pattern: 'src/levelgen/**' }` element made the boundaries error VANISH** (2 problems → 1), proving the registration is load-bearing and the folder would otherwise be exempt from the whole layer matrix. Config restored. | closed |
| T-10-03 @10-00 | Denial of Service | `below()` rejection loop | medium | mitigate | **M** — `lim` is a plain Number in `rng.ts` as declared. Re-introducing the reflexive `>>> 0` coercion **hung the process indefinitely** and it had to be killed at the OS level. Recorded honestly: under that mutation the suite does **not** red, it **hangs** — vitest's own `testTimeout` cannot fire on a synchronous infinite loop, so CI fails by wall-clock timeout, not by assertion. The gate holds, but its failure mode is a stall. | closed |
| T-10-04 @10-00 | Tampering | `NaN` / non-finite seed poisoning PRNG state | medium | mitigate | **E** — `hashSeed` normalises through `Number.isFinite` before `>>> 0`, so a non-finite seed folds to 0 instead of propagating `NaN`. Measured over a **380-combination** hostile cross product (20 seeds × 19 difficulties, including `NaN`, `±Infinity`, `1e308`, `MIN_SAFE_INTEGER`, `''`, a **200 000-char** string, `'\u0000￿'`, `'__proto__'`, and non-string `null`/`undefined`/`{}`/`[]`): **0 throws, 0 boards failing `validateLevel`**. | closed |
| T-10-05 @10-00 | Information Disclosure | `makeRng` mistaken for a CSPRNG in a later phase | low | mitigate | **R** — `rng.ts`'s `SECURITY:` header block states it is deterministic, "explicitly NOT a CSPRNG", and "Never reuse it for a token, nonce, key or session id". Independently restated at the two downstream sites that could have got it wrong: `fingerprint.ts` ("a determinism fingerprint, not a security digest") and phase 11's `ramp.ts` `SECURITY:` block, which cites `rng.ts` directly. The name `makeRng` does not read as security. | closed |
| T-10-SC @10-00 | Tampering (supply chain) | npm dependency surface | low | **accept** | **E** — `git diff` over the phase-10 range (`7539e61..b99607b`) is **empty for `package-lock.json` AND `package.json`**. Phase 10 added **no** script and **no** dependency; unlike phase 13 it did not touch `package.json` at all. → **AR-10-01** | closed (accepted) |
| T-10-06 @10-01 | Tampering | `scripts/assert-level-solvability.mjs` corpus | high | mitigate | **E** — `git status --porcelain assets/levels` is empty and the directory holds **exactly** the six authored files (`level-01` … `level-06`). No generated board was ever written to disk: the bot plays in-memory objects, so the CI solvability gate still asserts what it always asserted. | closed |
| T-10-07 @10-01 | Repudiation | second definition of authored weight | medium | mitigate | **R** — `levelStaticsOf` holds the single E2-locked body and takes a `LevelFileV1`; `levelStatics` delegates in one line. `readLevelFile` has **exactly one definition** and is outside the measurement path. Recorded honestly: the declared *occurrence cap* was a one-shot PLAN.md acceptance criterion and **nothing re-runs it** — the single-body property is verified at HEAD, not continuously enforced. | closed |
| T-10-08 @10-01 | Tampering | silent shrink of the sweep corpus | medium | mitigate | **R + M** — `SWEEP_SEEDS` is an exported named constant in `tests/levelgen.sweep.test.ts` as declared, and it genuinely governs `corpus()`'s loop bound. The floor assertion promised to plan 10-03 exists and is red-proved under T-10-14. | closed |
| T-10-09 @10-02 | Denial of Service | hostile / out-of-range `difficulty` | high | mitigate | **E** — `Math.max(0, Math.min(D_MAX, difficulty \| 0))` is the **first statement** of `generate`, exactly as declared, and `-5` / `999` map to the endpoints. The declared DoS is closed: across all 380 hostile combinations the index stayed inside `[0, D_MAX]`, no read went past `SCHEDULE`, and no loop ran long. **Residual, measured and not declared:** the clamp is **non-monotone** over the full Number domain, because `\| 0` wraps mod 2³² *before* the clamp — `Infinity`, `2**32` and `MAX_SAFE_INTEGER` all yield difficulty **0** (the *easiest* board), not `D_MAX`. Unreachable from both shipped callers. → Finding 2 / **AR-10-03** | closed |
| T-10-10 @10-02 | Denial of Service | unbounded placement loop | high | mitigate | **R + E** — stage 1 is a single pass over a fixed candidate list of `rowsUsed * (cols/2)` ≤ 16 × 5 = **80** entries, with no retry, no backtracking and no re-seed. **`while (!ok)` appears nowhere**: `src/levelgen` contains exactly three loop forms, each with a decreasing measure — `reachability.ts`'s BFS (monotone `head` over a queue bounded by `rows*cols` = 160), `generate.ts`'s `capExplosiveClusters` (each iteration demotes an `E` **and** its mirror, strictly reducing a finite non-negative count), and `rng.ts`'s rejection sampler (whose termination is the subject of T-10-03). Empirical: 21 000 boards in **392 ms**, worst single hostile call **1 ms**. | closed |
| T-10-11 @10-02 | Tampering | shared `grid` / `brickTypes` handed out by reference | high | mitigate | **M + E** — `grid: { ...GRID }` is a fresh spread and `brickTypes` a fresh object literal per call. **E**: mutating a returned board (`grid.cols = 999`, `grid.rows = 999`, `brickTypes['1'].hp = 4242`, adding a `ZZZ` key, overwriting `cells[0]`) leaves the next **two** calls byte-identical to the original. **M** is recorded at T-10-17, which is the detector's home. | closed |
| T-10-12 @10-02 | Denial of Service | explosive cascade exceeding `particleCap` 128 | medium | mitigate | **M** — deleting the stage-3 `capExplosiveClusters` call reds the sweep's **independently written** cluster labelling at `s=22 d=2` with a cluster of **6** — precisely the figure RESEARCH measured on the unconstrained generator, so the assertion is calibrated against a real defect, not a formality. The weight-equality case stayed **green** under the same mutation, independently confirming the register's claim that demotion is weight-neutral (`E` and `1` are both `hp: 1`). Independently re-measured over 1 260 boards: max cluster **4**, weight mismatches **0**. | closed |
| T-10-13 @10-02 | Tampering | prototype pollution via a `brickTypes` key | low | **accept** | **E** — the upstream claim is verified, not taken on trust. `validateLevel`'s `DANGEROUS_KEYS` set rejects **all three** of `__proto__`, `constructor` and `prototype` (measured individually; the first attempt mis-measured because `results['__proto__'] = …` sets a prototype rather than a key — re-run with a `Map` so all three were genuinely recorded), the validated map has prototype **`null`** (`Object.create(null)`), and `Object.prototype` was untouched. The generator emits exactly the five keys `1,2,3,E,X` with no own `__proto__`, and the sweep runs **every** board through `validateLevel`, keeping the guarantee live. → **AR-10-02** | closed (accepted) |
| T-10-SC @10-02 | Tampering (supply chain) | npm dependency surface | low | **accept** | **E** — same measurement: lock file and manifest both byte-unchanged across the phase range. → **AR-10-01** | closed (accepted) |
| T-10-14 @10-03 | Tampering | silent sweep shrink | medium | mitigate | **M** — dropping `SWEEP_SEEDS` to 20 reds with `SC-2 demands a large sweep, not a handful of samples: expected 20 to be greater than or equal to 1000`. Board count is logged (`[sweep] boards exercised: 21000`). **The third declared half — "`it.todo` count asserted at 0" — does not exist**: zero `it.todo` occurrences *and* zero todo-count assertion in any phase-10 test file. → Finding 3. Honest limit of the floor: `SWEEP_SEEDS` and `SWEEP_SEEDS_FLOOR` are two constants in the same file, so an edit lowering **both** would pass. | closed |
| T-10-15 @10-03 | Tampering | undetected PRNG / ordering drift | high | mitigate | **M** — changing one generator constant (`EXPLOSIVE_CLUSTER_CAP` 4 → 3) reds **both** pins simultaneously: the SHA-256 (`5048a453…` vs `9e3748c8…`) and the u32 (`722aa4d3` vs `2e8f6c23`). The failure message names the three possible causes, the downstream consequence for daily history keyed on a seed, and demands deliberate regeneration — verbatim as declared. Both pins are also documented in `docs/ops/BOARD-GENERATOR.md` § Determinism. | closed |
| T-10-16 @10-03 | Repudiation | third implementation of the lint drifting from the other two | medium | mitigate | **R** — the decision holds in shipped form: there is **no** third flood-fill, **no** ESM `generate` and **no** checked-in corpus, and the rationale is durably recorded in `tests/levelgen.sweep.test.ts`'s R-16 block header rather than only in the plan. The *threat as worded* — a third implementation — is genuinely closed because no third implementation exists. **But the parity assertion that block performs is vacuous** — see Finding 1. The twin's real guards are `tests/levels.solvability-parity.test.ts` and `scripts/assert-level-solvability.mjs`, both red-proved. | closed |
| T-10-17 @10-03 | Tampering | aliased `grid` / `brickTypes` surviving to Phase 11 | high | mitigate | **M** — replacing `grid: { ...GRID }` with the module constant by reference reds the mutate-then-regenerate detector with `TypeError: Cannot assign to read only property 'cols'`. Noted for accuracy: the freeze on `GRID` converts the aliasing bug into a **throw**, so the detector reds by exception rather than by digest mismatch — which is what `grid.ts`'s header says it is for, and is a stronger signal than a silent drift. | closed |
| T-10-18 @10-04 | Denial of Service | a structurally unclearable board reaching Phase 11 | medium | mitigate | **R + M** — the 30-board stratified sample exists as declared (5 seeds each at `d` = 0, 5, 10, 15 plus 10 at `D_MAX`), asserts `WON` **and** `bricksRemaining === 0`, and pins its own width with `expect(boards).toBe(30)`. **Measured reach, recorded rather than assumed:** under the invariant-disabled mutation the sweep red at `s=8 d=20` while this sample — which **includes** `s=8` at `d=20` — still reported `WON` with 0 remaining. The bot is therefore genuinely independent of the reachability gate and **must not be read as a backstop for it**; the file's own header already says `WON` is necessary, not sufficient. → Finding 4 | closed |
| T-10-19 @10-04 | Denial of Service | bot hang masking a defect | low | mitigate | **R** — both halves of the mechanism are present: a bounded `maxTicks` and a 60 s `it` timeout, with the file's JSDoc correctly identifying the `it` timeout as the hang guard (it bounds *wall* time) and `maxTicks` as the simulated-time bound. **The declared constant is wrong**: the register says 420 simulated seconds, the shipped value is **1 800** — changed deliberately and documented, because 420 sat *at the measured p99* and would have false-TIMEOUTed roughly one clearable board in a hundred. → Finding 5 | closed |
| T-10-20 @10-04 | Repudiation | an unmeasured assumption recorded as a fact | high | mitigate | **R** — all three required items are present in `docs/ops/BOARD-GENERATOR.md` § Limits, checked individually: A1 (limit 1), the **skipped E2 human playtest cohort (A3)** (limit 2), and the **deliberate non-existence of `scripts/assert-generated-solvability.mjs`** (limit 4), which even anticipates the reader who will notice the asymmetry with `assert-level-solvability.mjs`. Two further limits (3, 5) exceed the requirement. One stale heading — Finding 6. | closed |
| T-10-SC @10-03 | Tampering (supply chain) | npm dependency surface | low | **accept** | **E** — same measurement. → **AR-10-01** | closed (accepted) |
| T-10-SC @10-04 | Tampering (supply chain) | npm dependency surface | low | **accept** | **E** — same measurement. Plan 10-04 touched only a test and a Markdown file. → **AR-10-01** | closed (accepted) |
| T-10-21 @10-05 | Denial of Service | probe running in a shipped build | high | mitigate | **R** — the double gate is real and correctly **ordered**: `if (!LEVELGEN_PROBE) return;` then `if (typeof __DEV__ === 'undefined' \|\| !__DEV__) return;`, both **before** the first `Date.now()` and before `corpusFingerprint()`. Unarmed builds compute nothing. `src/devflags.ts`'s header bars `EXPO_PUBLIC_LEVELGEN_PROBE` from the **production** profile *and*, unlike `CERT_HARNESS`, from **profiling** — with the reason stated (arming it where `__DEV__` is false would ship a reachable 4 200-board loop that can never produce observable output). `assert-eas-profiles.mjs` green: *production env clean*. The UI test mocks the flag to `false`, so no jsdom run generates a corpus. | closed |
| T-10-22 @10-05 | Repudiation | A1 silently carried as fact into Phase 12 | high | mitigate | **R** — the marker mechanism worked and has since been **discharged**: `docs/ops/BOARD-GENERATOR.md` § Limits now carries `Device digest: MEASURED 2026-09-25 — A1 DISCHARGED`, on-device u32 `0x2e8f6c23` = `781151267`, **matching the Node pin exactly**, with the raw log line and the observation environment recorded. It also volunteers the residual honestly — it was the iOS **simulator**, not physical hardware, and says a physical run "has not been observed either way". **Half of the declared mitigation is unverifiable here**: it also claims a `human-check` "harvested into the phase UAT", and this phase has **no UAT artifact**. Per the audit's scope no inference is drawn from that absence in either direction and none of its content is claimed. → Finding 7 | closed |
| T-10-23 @10-05 | Tampering | an `src/core` edit landing and being reverted mid-phase | high | mitigate | **E** — the property holds, verified from **two** independent bases: `git diff` for `src/core` is **empty** both from the true phase base (`7539e61`, the parent of the first phase-10 commit) and from the base the SUMMARY cites (`64a0b0c`, "Phase 10 is planned"), each measured to the phase-end commit `b99607b`. A commit-log walk confirms no phase-10 commit touched `src/core` even transiently. **The base the register declares is wrong**: `origin/main`'s merge base (`8788caaf`) **predates phase 10**, so that form reports `src/core/rules/brickDamage.ts` — which landed in `7539e61`, *before* the phase. Already ledgered by phase 11 as **WINDOWS #10**, still open and still accurate at HEAD; independently reproduced here. | closed |
| T-10-24 @10-05 | Elevation of Privilege | generation code reaching the UI thread | high | mitigate | **M — all three declared enforcements measured, none performed the claimed check.** The *property* held at audit time: **0** line-anchored `'worklet'` directives in `src/levelgen` (the 5 textual hits are all prose in headers). But: **(1)** the "line-anchored absence check" had **no committed runner** — `scripts/` and `package.json` contained **zero** references to `src/levelgen`; it was a one-shot PLAN.md verify command. **(2)** `assert-worklet-closures.mjs` gives **partial** coverage only: a planted self-contained `'worklet'` in `src/levelgen/grid.ts` left it at **exit 0, "Worklet closure guard OK (130 files)"**, while a `'worklet'` that *calls a non-worklet local* reds it at **exit 1** naming the file — its rule is worklet-call-graph correctness, not directive absence. **(3)** `npx eslint src/levelgen` drew **zero** errors on **both** planted directives; the layer matrix stops *imports*, not the directive. **CLOSED 2026-09-29** by `scripts/assert-levelgen-thread.mjs` (`729abd3`) after the orchestrator independently reproduced (2) and (3) — see *Resolution*. → **Finding 8** | closed (was open/blocking at audit time) |
| T-10-SC @10-05 | Tampering (supply chain) | npm dependency surface | low | **accept** | **E** — same measurement: zero packages installed anywhere in the phase, `package.json` dependencies byte-unchanged. **Note added at closure:** `package.json` has since gained one `scripts.test` line wiring `assert-levelgen-thread.mjs`. That is a local script, not a dependency, and `package-lock.json` remains untouched. → **AR-10-01** | closed (accepted) |

*Status: closed · closed (accepted) · open · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` (`high`) count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party or another owner)*

**Measured split: 23 mitigate · 7 accept · 0 transfer = 30 rows, 25 unique ids.**
**30 closed as of `729abd3` · 0 open.** At audit time it was 29 closed / 1 open (blocking).

---

## Accepted Risks Log

What the two consuming phases — **11 (endless)** via `difficultyForWave`/`seedForWave`, and
**12 (daily)** via `generate(dateKey, DAILY_DIFFICULTY)` — inherit **from this phase**.

| Risk ID | Threat Ref | Rationale | Inherited by | Accepted By | Date |
|---------|------------|-----------|--------------|-------------|------|
| AR-10-01 | `T-10-SC` ×6 (plans 10-00 … 10-05) | **No package-manager install ran anywhere in this phase and none was permitted.** Verified as an empty `git diff` for **both** `package-lock.json` and `package.json` across the whole phase range — zero dependencies added, removed or moved, no registry contacted, and (unlike phase 13) not even a script line. There is no install task for a package-legitimacy gate to guard and no such gate is claimed. If a later plan proposes a package: pin via `npx expo install`, never bare `npm install`. | 11, 12 | Locked at plan time in all six plans (RESEARCH § Standard Stack: "this phase adds **zero** dependencies") | 2026-09-29 |
| AR-10-02 | `T-10-13`@10-02 | **Prototype pollution through a `brickTypes` key is mitigated UPSTREAM, not in the generator.** `generate` emits a fixed five-key literal and performs no key validation of its own; the guarantee is `validateLevel`'s `DANGEROUS_KEYS` rejection plus its `Object.create(null)` map, and it stays live because the sweep runs every board through `validateLevel`. Measured this audit: all three dangerous keys rejected, validated map prototype `null`, `Object.prototype` untouched. **A consumer that compiles a generated board WITHOUT `validateLevel` does not inherit this protection.** Both shipped consumers go through the compile path. | 11, 12 | Locked at plan time (10-02) | 2026-09-29 |
| AR-10-03 | `T-10-09`@10-02 (residual measured by this audit, not declared at plan time) | **`generate`'s difficulty clamp is a backstop, not a total function, and it is non-monotone.** Because `\| 0` wraps modulo 2³² *before* `Math.max(0, Math.min(D_MAX, …))`, a huge or infinite difficulty folds to the **easiest** board rather than the hardest: measured `Infinity → 0`, `2**32 → 0`, `MAX_SAFE_INTEGER → 0`, while `-5 → 0`, `999 → 20` and `1e20 → 20` behave as declared. **Accepted, not mitigated**, because (a) the declared DoS is genuinely closed — the index is always in range and the work always bounded — and (b) neither shipped caller can reach it: phase 11's `difficultyForWave` clamps into `[0, D_MAX]` in its own body first, and phase 12 passes the constant `DAILY_DIFFICULTY = 10`. `docs/ops/ENDLESS-MODE.md` already frames `generate`'s clamp correctly as "a backstop against a hostile caller, not this module's correctness argument". **A third consumer that trusts the clamp alone and passes a computed value inherits this.** | any future consumer | Measured and accepted by this audit | 2026-09-29 |
| AR-10-04 | `T-10-05`@10-00 | **Nothing this phase produces may protect anything.** `makeRng`/`hashSeed`/`mixSeed` are a deterministic mulberry32 + FNV-1a and explicitly **not** a CSPRNG; `corpusFingerprint` is **32 bits** of FNV-1a and is a determinism digest, **not** an authenticator — it must never authenticate a board, a score or a daily submission. Stated at all three sites (`rng.ts`, `fingerprint.ts`, and phase 11's `ramp.ts`). **Seed predictability itself is phase 12's disposition, registered as `T-12-05` / `AR-12-01`, and this audit did not re-open it.** | 11, 12 | Locked at plan time (10-00); re-confirmed by audit | 2026-09-29 |

### Inherited accepted risks this phase relies on and does not re-open

- **AR-11-02** (`11-SECURITY.md`) and **AR-12-02** / **T-12-06** (`12-SECURITY.md`) — local record
  tampering on plaintext AsyncStorage. A generated board guards nothing, so no phase-10 control
  depends on the blob's integrity.
- **AR-12-01** / **T-12-05** (`12-SECURITY.md`) — the daily seed is a local calendar date and is
  **fully predictable by design**. That is what makes "the same board for everyone today" true with
  no server. Phase 10 supplies the generator underneath it; the disposition is phase 12's.

---

## Register-Accuracy Findings

One mitigation was **missing** (Finding 8, the threat that was open; since closed). The other seven
are **traceability defects** — a register, comment or summary naming an enforcement that is absent,
weaker, or differently located than the real one. That species has now been caught **twelve times
in four phases**, and it matters because the next reader trusts the citation and stops looking.

| # | Finding | Disposition |
|---|---------|-------------|
| 1 | **The sweep's R-16 parity block is VACUOUS over the generated corpus.** It asserts only `checkMjs(level).ok === checkTs(level).ok`, and every one of the 21 000 generated boards is solvable, so it compares `true === true` 21 000 times. **Proved**: gutting `scripts/lib/levelSolvability.mjs`'s `checkSolvability` to a one-line `return { ok: true, unreachableBreakables: [], corridorWarnings: [] }` left that case **green**. The sweep header's claim — *"extends the same evidence to the generated distribution — 21 000 boards the authored corpus never reaches"* — extends the **corpus** but not the **evidence**, because the corpus contains no board on which the two implementations could disagree in the direction that matters (a twin that never reports a defect). **Nothing is unguarded**: the same mutation reds `tests/levels.solvability-parity.test.ts` (`level-02.json ok: expected true to be false`) and `scripts/assert-level-solvability.mjs` (exit **1**, *"negative fixture level-02.json did not fail reachability"*). Both of those carry a genuine **negative fixture** and compare `unreachableBreakables` and `corridorWarnings`, not just `ok`. | Recorded, **open**. The parity block should either compare the full result shape or include at least one deliberately unsolvable board; as written it adds no discriminating power. The twin's real guards are sound and red-proved, so nothing is unguarded today. |
| 2 | **`T-10-09`'s clamp is non-monotone and nothing says so.** `Infinity`, `2**32` and `MAX_SAFE_INTEGER` all produce difficulty **0**, the easiest board, because `\| 0` wraps before the clamp. Unreachable from both shipped callers, and `ENDLESS-MODE.md` correctly calls the clamp "a backstop… not this module's correctness argument" — but no artifact states the wrap, and a third consumer reading "`generate` clamps its own difficulty argument" would reasonably expect `Infinity → D_MAX`. | Recorded as **AR-10-03**. Not an open threat: the declared DoS (out-of-range index, unbounded loop) is closed and empirically bounded. |
| 3 | **`T-10-14`'s "`it.todo` count asserted at 0" does not exist.** Zero `it.todo` occurrences *and* zero todo-count assertion across every phase-10 test file. `10-03-SUMMARY.md` restates it as "0 todos in the file" — which is a **true one-shot measurement**, not a gate. A future edit converting an `it(...)` to `it.todo(...)` would be reported as a todo, not a failure, and nothing would object. The threat itself (silent sweep shrink) is closed by the floor assertion, which **is** red-proved. | Recorded. Same species as phase 13's `ACHIEVEMENT_LINES_MAX` and phase 12's Finding 1: an artifact naming a gate that was never built. |
| 4 | **`T-10-18`'s bot sample is not a backstop for the reachability invariant, and the two gates are genuinely independent.** Measured: with stage 1's invariant check disabled, the sweep red at `s=8 d=20` (2 unreachable breakables) while the 30-board sample — which **includes** `s=8` at `d=20` — still returned `WON` with `bricksRemaining === 0`. The most likely reason is that `checkSolvability` is a *conservative 4-connected paper* model while the explosive cascade is **8-connected**, so the physics can destroy a cell the flood cannot reach. | Recorded. No control is missing — the file's header already states `WON` is necessary, not sufficient, and assigns reachability to the sweep. Worth knowing that clearability evidence does **not** substitute for the invariant. |
| 5 | **`T-10-19`'s declared `maxTicks` of 420 simulated seconds is not what shipped — 1 800 is.** Changed deliberately and documented at length: 420 sat *at the measured p99* of an 840-board scan (p50 108 s, p95 259 s, p99 416 s, worst 1 495 s) and would have reported roughly one clearable board in a hundred as broken. The hang guard is the 60 s `it` timeout, which bounds wall time; a board burning the full simulated budget costs ~180 ms. The shipped choice is **better** against the declared threat than the declared number. | Recorded. The register is the historical artifact; this file is the correction of record. |
| 6 | **`BOARD-GENERATOR.md` § Limits item 1 still reads "A1 — Hermes byte-identity — is UNMEASURED"** while the block directly beneath it says `MEASURED 2026-09-25 — A1 DISCHARGED`. A reader skimming headings gets the opposite of the truth. This is the **safe** direction (the doc understates what is proven) and is the inverse of the usual defect here, but it is still a heading that contradicts its own body. | Recorded. Narrow the heading to name the residual that is genuinely open — the **physical-device** run, as distinct from the simulator run that was taken. |
| 7 | **`T-10-22` and `10-05-SUMMARY.md` both claim a `human-check` "harvested into the phase UAT", and this phase has no UAT artifact.** Per this audit's scope no inference is drawn from that absence in either direction and none of its content is claimed. The half of the mitigation that *is* durable — the ops-doc marker — is verified, and has since been discharged with a real measured device value. | Recorded, unresolved. The claim is simply unverifiable from the artifacts present. |
| 8 | **`T-10-24`'s three named enforcements were each measured and none performed the claimed check — this was the open threat.** (a) The "line-anchored absence check for the thread directive" had **no committed runner**: `scripts/` and `package.json` referenced `src/levelgen` **zero** times. (b) `assert-worklet-closures.mjs` is a genuinely sound, self-red-proofing guard — it self-tests against known-good and known-bad fixtures and explicitly fails if the bad fixture yields no violations — but its rule is *"a worklet must not call a non-worklet helper"*: a planted **self-contained** `'worklet'` in `src/levelgen/grid.ts` left it at **exit 0 / "OK (130 files)"**, while one calling a local helper red at **exit 1**. (c) `npx eslint src/levelgen` drew **zero** errors on **both** planted directives — the layer matrix blocks reanimated/react-native *imports* (M-proved), not the directive. `10-05-SUMMARY.md` records this row as "mitigated — Line-anchored directive scan = 0 hits, `assert-worklet-closures.mjs` OK across 119 files, `npx eslint src/levelgen` exit 0", which conflates *the property currently holding* with *a gate enforcing it*; the file count is also stale (119 → 130). | **CLOSED 2026-09-29** — see *Resolution*. |

### Unregistered surface found during the audit

**None.** All four SUMMARYs that carry a `## Threat Flags` section (10-02 … 10-05) declare
**"None"**, and each backs it with a reason — `generate` is a pure function over two arguments with
no network, filesystem, credential or user-input surface. Independently confirmed: the phase's
entire added surface is `src/levelgen/*.ts` (7 files), 4 test files, 1 ops document, and one
`__DEV__`-gated `console.log`. `10-00-SUMMARY.md` and `10-01-SUMMARY.md` carry **no** Threat Flags
section at all — recorded as *not declared* rather than *declared none*, and no unmapped surface was
found in either plan's output.

### A correction to this audit's own premise

**`scripts/assert-level-solvability.mjs` and `scripts/lib/levelSolvability.mjs` are NOT phase 10's.**
Both predate it: the assert script and its `npm test` wiring landed in `135f7ed` (2026-09-24,
E1a campaign lint) and the `.mjs` twin in `a6ecf17` (2026-09-24, R-16) — the day *before* phase
10's base commit. `git diff` confirms phase 10 **never touched either file**, and added **no**
script of its own; every phase-10 gate lived inside `vitest run`. This matters for ownership: the
twin's drift risk that `T-10-16` reasons about is **inherited infrastructure**, and what phase 10
contributed to it is the in-process parity block that Finding 1 shows to be vacuous.

### WINDOWS ledger

**At audit time, no entry in `.planning/WINDOWS.md` carried phase `10`.** Measured: 37 data rows —
13 phase-11, 14 phase-12, 10 phase-13 — with frontmatter (31 open / 0 waived / 6 fixed / 37 total)
**arithmetically consistent**. The one entry that *concerns* this phase is **#10**, filed under
phase **11**, recording that the phase-gate freeze command's `origin/main...HEAD` base predates
phase 10 and that the correct base gives diff 0. It is **still accurate at HEAD** and was
independently reproduced by this audit (see `T-10-23`). Phase 10 filing zero ledger entries across
six plans — against 13, 14 and 10 for the phases that followed — is noted as an observation, not a
finding; nothing in this audit needed a window that was missing.

---

## Security Audit Trail

| Audit Date | Register Rows | Unique IDs | Closed | Open | Run By |
|------------|---------------|------------|--------|------|--------|
| 2026-09-29 | 30 | 25 | 29 | 1 | gsd-security-auditor (State B, first audit; 11 rows closed by making a control fail, 1 threat left open with a named closing action) |
| 2026-09-29 | 30 | 25 | **30** | **0** | orchestrator — reproduced Finding 8's two measurements independently, then closed `T-10-24` with a committed, red-proofed gate (`729abd3`). Findings 1–7 recorded, not resolved. |

**Post-audit gates, re-measured after every probe and mutation was reverted:** `npm test` exit **0**
at **112 files / 870 passed | 1 skipped (871)**, with all six `assert-*.mjs` green. `npx tsc
--noEmit` clean. `npx eslint src/levelgen` **0 problems**. The six phase-10 suites: **37 passed
(37)**.

**Post-resolution gates (`729abd3`):** `npm test` exit **0** at **112 files /
873 passed | 1 skipped (874)** with **seven** `assert-*.mjs`, the seventh being
`assert-levelgen-thread.mjs`. The three-case rise is phase 09's `sanitizeAggregateMap` bound
landing in the same pass (`a1fdba3`), not a phase-10 change.

**Mutations and probes used by the audit, all reverted:** the `src/levelgen` eslint probe (9 banned
constructs, then a crossing import); **deletion of the `levelgen` boundaries element** from
`eslint.config.js`; the `>>> 0` coercion on `below()`'s `lim`; `EXPLOSIVE_CLUSTER_CAP` 4 → 3;
removal of the stage-3 call; `HP3` `'3'` → `'Z'`; `if (true || allNonSteelReachable(...))`;
`grid: { ...GRID }` → `grid: GRID`; `SWEEP_SEEDS` 1000 → 20; gutting
`scripts/lib/levelSolvability.mjs`'s `checkSolvability`; two planted `'worklet'` directives in
`src/levelgen/grid.ts`; and three temporary test files. `git status` confirmed clean afterwards.
**No implementation file was modified by the audit itself.**

### Instrument-fidelity note for future auditors of this repo

**`vitest -t` is a REGEX, and this phase's test names contain parentheses.** Pasting a test's
literal name filters **nothing**: `-t 'below() terminates and stays in range for every power-of-two
n'` printed `Tests 16 skipped (16)` at **exit 0**, because `below()` compiles to `below` plus an
empty capture group and the name is `below() terminates`. The escaped form `-t 'below\(\)
terminates'` printed `Tests 1 passed | 15 skipped (16)`. This is a **new** instance of the
already-known `-t` hazard (exit code is 0 for a non-matching filter; `skipped` appears in both the
matching and non-matching cases) — the additional trap is that the filter is a regex, so bind on
the presence of **`passed`** *and* escape regex metacharacters in the name.

---

## Resolution — `T-10-24` closed (orchestrator, 2026-09-29)

The audit's finding was accepted only after being reproduced. Planting a self-contained
`'worklet'` in `src/levelgen/grid.ts`:

```
assert-worklet-closures.mjs  →  "Worklet closure guard OK (130 files)"   exit 0
npx eslint src/levelgen      →  (no output)                              exit 0
```

Both gates pass the exact construct T-10-24 forbids. Confirmed.

**Closed by `scripts/assert-levelgen-thread.mjs`**, the seventh `assert-*.mjs` in `npm test`
(`729abd3`). Design notes, because two of them are this repo's own lessons:

- **Line-anchored**, matching only a line whose entire content is a `'worklet'` directive
  statement. `src/levelgen`'s headers explain this very rule and contain five textual
  occurrences; a check that flagged them would be a check that forbids documenting itself — the
  defect phase 13 shipped twice with a `numberOfLines` grep that counted its own JSDoc.
- **The instrument tests itself in both directions.** Its self-check plants the pattern in code
  *and* in a comment and requires the first to be caught and the second not to be; either
  outcome failing exits 1 before the real scan runs.
- **Anti-vacuity floor**: fewer than five files in scope is a failure, so a glob that stops
  matching cannot pass silently.

Red-proved on the real tree: the directive both old gates passed reds this one at exit 1 naming
`grid.ts:62`; the same text inside a comment leaves it at exit 0.

**Findings 1–7 remain recorded and unresolved.** The most valuable of them is Finding 1 — the
21 000-board parity block is vacuous — and it is not urgent because the twin's real guards
(`tests/levels.solvability-parity.test.ts` and `scripts/assert-level-solvability.mjs`) both carry a
negative fixture and were both red-proved. What it costs is the sweep header's claim to extend
parity evidence to the generated distribution, which is an over-claim.

---

## Sign-Off

- [x] All 30 rows have a disposition — 23 mitigate, 7 accept, 0 transfer
- [x] Row, id and severity counts enumerated and reconciled — 24 numbered + 6 `T-10-SC` = 30 rows, 25 unique ids, 13 high / 8 medium / 9 low
- [x] Supply-chain rows checked **per plan** rather than assumed — all six plans carry one
- [x] Accepted risks documented — AR-10-01 … AR-10-04, with AR-11-02 / AR-12-02 (T-12-06) / AR-12-01 (T-12-05) inheritance stated
- [x] Every `T-10-*` and cross-phase id cited in this file resolves to the threat intended; `T-12-05` is cited only for predictability and `T-12-06` only for tampering
- [x] Transfer targets — none; 0 transfer rows
- [x] Implementation unmodified by the audit — every probe and mutation reverted, `git status` confirmed
- [x] **`threats_open: 0`** — `T-10-24` closed by `729abd3` after independent reproduction

**What this sign-off does NOT claim.** It covers the 30-row register authored at plan time, verified
against the implementation at HEAD.

- It does **not** claim the `.mjs` twin's agreement is proved over the **generated** distribution.
  It is proved over the six shipped assets and by a negative fixture in `npm test`; the 21 000-board
  parity block is vacuous (Finding 1).
- It does **not** claim any content of a UAT or VERIFICATION artifact. This phase has neither, and
  their absence is treated as evidence of nothing in either direction.
- It does **not** claim A1 is discharged on **physical hardware**. The measured Hermes run was the
  iOS **simulator**; the ops document says so and neither the audit nor the resolution improved on it.
- It does **not** claim the dial constants are calibrated. The E2 human playtest cohort (A3) was
  skipped, no human has played a generated board, and the 840-board scan's clear-time tail (p99
  416 s, worst 1 495 s of *bot* play, which is a floor on human time) is a **balance** finding for
  phase 11's retune, not a security one.
- It does **not** re-open seed predictability (`T-12-05` / `AR-12-01`) or local record tampering
  (`T-12-06` / `AR-12-02`), and it opens no new threat outside the register.
- It records rather than resolves Findings 1–7.
- A passing `npm test` is not evidence for any part of the above.

**Approval:** verified 2026-09-29 (`threats_open: 0` as of `729abd3`)
