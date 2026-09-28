---
phase: "09"
slug: "run-telemetry-storage-v4"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-29"
register_rows: 14
unique_ids: 14
audit_authored_rows: 3
---

# Phase 9 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

State B audit — no `09-SECURITY.md` existed, but a `<threat_model>` block was authored at plan time
in each of the five PLAN files. This audit **verified mitigations** rather than inventing a
register. ASVS level 1, block on `high`.

**The register is 14 rows, one per `T-09-*` reference, and is NOT deduped.** It happens to carry
**14 distinct ids** as well: `T-09-00` … `T-09-13`, each appearing exactly once, in exactly one
plan. That is unusual for this repository — phase 11's register was 133 rows over 74 ids and
phase 13's 24 rows over 16 — and it is stated as a measurement, not assumed. Enumerated:

| Plan | Ids contributed | Count |
|---|---|---|
| `09-00-PLAN.md` | `T-09-00` | 1 |
| `09-01-PLAN.md` | `T-09-01`, `T-09-02`, `T-09-03`, `T-09-12` | 4 |
| `09-02-PLAN.md` | `T-09-04`, `T-09-05`, `T-09-06`, `T-09-07`, `T-09-13` | 5 |
| `09-03-PLAN.md` | `T-09-08`, `T-09-09` | 2 |
| `09-04-PLAN.md` | `T-09-10`, `T-09-11` | 2 |
| **total** | | **14** |

**No plan carries a supply-chain row, and none was added.** Checked, not assumed:
`grep -n "T-09-SC"` over all five PLAN files returns **zero**, unlike `T-11-SC` (21 rows),
`T-12-SC` (1) and `T-13-SC` (4). The measurement those rows would have recorded was taken anyway
and is clean — `git diff --stat 3bf0933..f814dae -- package.json package-lock.json` is **empty**
and `git log` over the same range for the same two paths is **empty**: not one commit in phase 9
touched either file. It is reported here as a measurement rather than as a register row, because
inventing a row the plans never wrote would misrepresent the register.

**Verification exceeded L1.** L1 permits closing a threat by reading. **8 of the 14 rows were
closed by making a control fail**; the other 6 by an empirical probe or a re-run gate command.
**No row was closed by reading alone.** 15 distinct mutations were applied to the real tree and
every one reverted; 3 probe files (`tests/__audit09_probe{,2,3}.test.ts`) were written and deleted
inside this audit. Evidence method per row: **M** = closed by making a control fail · **E** =
closed by an empirical probe against the real code path · **R** = closed by reading.

**Verdict: OPEN_THREATS.** One blocking threat, and it is not one of the 14 — it is the
unregistered surface phase 09 authored and three later phases transferred to. See
*The unregistered surfaces* below.

---

## The posture this phase implements

Stated, not re-derived, and **not reported as an open threat**:

- **There is no server, no account, no leaderboard and no store.** `PROJECT.md` rules the category
  out ("no backend in MVP", "offline-first product", "Ads, IAP, subscriptions, user accounts,
  cloud sync — architecture-aware only"). Re-measured structurally this audit: a comment-stripped
  scan of every `.ts`/`.tsx` in `src/` + `app/` for `fetch`, `XMLHttpRequest`, `WebSocket`,
  `axios` and `sendBeacon` call sites returns **zero**. Nothing this phase stores guards an asset,
  a currency or an entitlement.
- **AsyncStorage is plaintext**, so on a rooted device the v4 blob is attacker-controllable. Local
  record tampering is an ACCEPTED risk. **Phase 09 is where that acceptance is implemented** —
  AR-11-02, AR-12-02 (`T-12-06`) and AR-13-01…05 are all downstream of `safeCounter`,
  `sanitizeAggregateMap`, `sanitizeTelemetry` and the v4 blob authored here. This audit's job was
  to verify the acceptance is bounded the way those three registers claim, not to re-litigate it.
- **`safeCounter` bounds a counter DOWNWARD but not upward.** Re-measured here at its exact
  boundary and recorded as **AR-09-02**, which is the risk the phase-11 and phase-13 audits each
  measured independently.

What this audit actually tested — the five things that are **not** accepted:

| # | Property | Verdict |
|---|---|---|
| 1 | Nothing may throw on a hostile or malformed blob | **holds** — 30 hostile inputs through `parseProgressResult`, **0 throws**, `progress.v === 4` in every case, `Object.prototype` untouched |
| 2 | A malformed field must degrade ALONE | **holds** — proven with a 12-field non-default baseline established FIRST, so the check is not vacuous. But see Finding 4: the *sibling-field* half of this property has **zero test coverage** |
| 3 | Migration from v3/v2/v1 must not lose or invent data, and must not throw on a version that never existed | **holds** — lossless on real catalog ids, no invention, 8 impossible versions all fail soft, a corrupt v4 does not block the older links |
| 4 | Unbounded stored collections | **FAILS for `byMode.*`** — and the read path does not merely fail to cap it, it **inflates it 11.2×**. This is the phase's own live defect (WINDOWS #27), opened here at `high` as **`T-09-A1`** |
| 5 | Downward degradation is the declared direction | **holds everywhere except `byMode.*`**, which is the one place the direction inverts — measured, 2.86 MB in → 31.9 MB out |

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| persisted blob → app | AsyncStorage is plaintext; on a rooted device the v4 blob is attacker-controllable. **The only externally-influenced input this phase reads, and the one it authored for every later phase.** | the whole v4 `ProgressBlob`: `unlocked`, `bestByLevel`, `bestScore`, `updatedAt`, and all six `telemetry` sub-objects |
| legacy v3 / v2 / v1 keys → v4 blob | Three additional attacker-controllable inputs that are never deleted (migrate-on-read sources, by design, for rollback safety) | `@nbb/progress/v3`, `@nbb/progress/v2`, `@nbb/personal-best/v1` |
| memory blob ↔ freshly-hydrated disk blob | `mergeHighWatermark` reconciles two independently-sanitized records, and its telemetry half **SUMS** lifetime counters — so a re-entrant hydrate double-counts permanently | whole `ProgressBlob`, whole `TelemetryBlob` |
| UI-runtime `World` → JS-thread telemetry | Cross-thread, same trusted process. The reducer runs inside the 120Hz worklet and must be strictly read-only against `World`, or it corrupts the deterministic simulation | 20 `world.*` reads; zero writes |
| `src/runtime` / `src/core` → `src/services` | The frame loop must not be able to reach storage at all (LC-04). `eslint.config.js` `boundaries/dependencies` is the only mechanism | nothing — the point is that nothing crosses |
| documentation → future implementer | An ops document a later reader trusts without re-deriving it. This is the boundary phases 11, 12 and 13 each named, and the one phase 09 **never registered** | `docs/ops/PROGRESS-STORAGE.md`, the schema comments in `types.ts`, the register itself |

---

## Threat Register — 14 plan-time rows

**Citations name symbols, not line numbers** — this repo's line citations have drifted three times.
Every id cited below was resolved against the PLAN file that authored it; none resolves to a
different threat than the one it names (contrast phase 12's four-site `T-12-05`/`T-12-06`
mis-citation and phase 13's `T-13-02`/`T-13-07` collision).

| Threat ID | Plan | Category | Component | Severity | Disposition | Mitigation & how it was established | Status |
|-----------|------|----------|-----------|----------|-------------|--------------------------------------|--------|
| T-09-00 | 09-00 | N/A | test scaffold only | low | **accept** | **E** — verified rather than taken on trust. All four of plan 00's commits (`7604b6b`, `0e6dd79`, `877b74c`, `7343051`) were listed with `git show --stat` and **none touches a single file under `src/` or `app/`**. The claim "no production code touched this plan" is true. → **AR-09-04** | closed (accepted) |
| T-09-01 | 09-01 | Tampering | `reduceRunTelemetry` read-only contract | medium | mitigate | **M ×2** — property holds, but **the declared control does not perform the declared enforcement** (Finding 1). Comment-stripped: **0** `world.*` writes against **20** `world.*` reads in `runStats.ts`. The real control is the behavioural case *"never writes to any world.\* field"* in `tests/telemetry.reduce-run-events.test.ts`, which snapshots the whole world by value and carries its own anti-vacuity guard. **M**: planting `world.combo = 0;` reds exactly that case; planting a typed-array write `world.brickHp[0] = 99` reds it too, so the gate reaches array elements, not just scalars. `assert-worklet-closures.mjs` — the control the register names — printed `Worklet closure guard OK (130 files)` and **exit 0** under both mutations. | closed |
| T-09-02 | 09-01 | Denial of Service (perf) | per-substep reducer + O(breakCount²) grid-adjacency grouping on the 120Hz path | medium | mitigate | **E** — the claim is a performance budget, so it was measured, not read. Comment-stripped, `reduceRunTelemetry` contains **no** `new`, `[]`, `{}` or `.push` — all seven scratch buffers are module-level typed arrays. Worst case built deliberately (128 mutually adjacent explosive breaks, so no `continue` short-circuits the inner loop): **0.0139 ms/call**, ×`MAX_SUBSTEPS` = 5 ⇒ **0.07 ms/frame against an 8.33 ms 120Hz budget, 0.8%**. Typical case (1 break): **0.00006 ms/call**. The "no new `scheduleOnRN` hop (LC-07 unchanged)" clause is better than claimed — `scheduleOnRN`/`runOnJS` in `useGameLoop.ts` measured **2** before the phase (`3bf0933`) and **0** at its close (`f814dae`) and at HEAD: a delta of **−2**. Counters cross by dirty-checked `publishRunStatsMirror` + seq bump, not a JS hop. | closed |
| T-09-03 | 09-01 | Information Disclosure | local-only counters, no PII | low | **accept** | **E** — the acceptance was checked rather than inherited. The whole `TelemetryAggregate` is 16 numeric counters; `RunLogEntry` is `{ mode, levelId, outcome, score, ticks, timestamp }`. No identifier, no device id, no free-text. **Zero** network call sites repo-wide (comment-stripped scan, above), so no counter can leave the device. → **AR-09-01** | closed (accepted) |
| T-09-12 | 09-01 | Integrity (achievement-trigger correctness) | `largestCascade` grid-adjacency grouping | medium | mitigate | **M** — the declared reason grid-adjacency was chosen over the cheaper substep heuristic is that **overcounting** an achievement trigger is the harmful direction. Mutation applied: the 8-neighbour Chebyshev test was short-circuited so every break in a substep merges into one group — the exact rejected heuristic. **2 reds**, one of which names the decision verbatim: *"two non-adjacent BRICK_BREAK events in the same substep land in separate groups and must NOT merge into one cascade (the overcount plan-check rejected…)"*. The non-lattice fallback is verified to be undercount-only structurally: `_cascadeHasLattice[i] === 0` takes a `continue` in both union passes, so such a break can only ever form its own singleton group. Phase 13's thresholds need no overcount tolerance, as `09-CONTEXT.md` promised. | closed |
| T-09-04 | 09-02 | Tampering | `parseProgressResult` (v4) | high | mitigate | **M ×2 + E** — all three declared clauses proved separately. **E**: 30 hostile inputs (`null`, `''`, `'{'`, `'[]'`, eight impossible `v` values, six shapes with every telemetry field set to a scalar, `bestScore: NaN`, `1e999`, two `__proto__`-bearing blobs) yield **0 throws**, `progress.v === 4` in all 30, and `Object.prototype.polluted` is **undefined**. **M**: relaxing `blob.v !== 4` to `typeof blob.v !== 'number'` reds *"structurally corrupt top-level JSON degrades the whole blob to defaults and never throws"*. **M**: making `sanitizeTelemetry` throw on a non-object reds *"corrupt telemetry sub-object alone degrades ONLY telemetry…"* — so the Pitfall-4 telemetry/progress independence is genuinely gated. See Finding 4 for the half that is not. | closed |
| T-09-05 | 09-02 | Tampering | `migrateOrDefault` (v4) | high | mitigate | **M ×2 + E** — **E**: lossless on **real** catalog ids. A v3 blob with two unlocked levels and two per-level bests migrates to `unlocked: ["level-01","level-04"]` with both bests, score and `updatedAt` preserved byte-for-byte; the full 5-level ladder migrates with 5 unlocked and 5 bests intact; `telemetry` is **exactly** `defaultTelemetryBlob()` in every case — nothing invented. v2→v4 lifts `number` → `{ score }` and omits stars as specified; v1→v4 seeds `bestScore` only. Eight impossible v4 payloads (`v: 5 / 0 / "4" / 4.5 / -3`, `not json`, `''`, `'null'`) all fail soft to a default v4 blob. **M**: `v3ToV4` emptied of `bestByLevel` reds **4** cases including the one named *"v3ToV4 is lossless"*. **M**: changing the fallback guard so a corrupt v4 short-circuits the chain reds **2**, including *"corrupt v4 does not prevent the v3 fallback from running"*. `v3ToV4` is a pure structural copy as declared. | closed |
| T-09-06 | 09-02 | Denial of Service | `recentRuns` unbounded growth | high | mitigate | **M (one of two declared sites)** — `RECENT_RUNS_BOUND = 50`. **M**: deleting `.slice(-RECENT_RUNS_BOUND)` from `mergeRunIntoTelemetry` reds *"recentRuns never exceeds RECENT_RUNS_BOUND entries; oldest is evicted first (FIFO)"* at `expected … length of 50 but got 60`. **E**: the read side also holds and discriminates drop-from-trim — 10 000 valid entries + 40 junk yields **50** with the garbage LAST *and* **50** with it FIRST, keeping scores 9951–10000, so the drop loop runs before the trim. **Two caveats, both recorded as findings**: the register's own words are *"not left to the reader"*, yet the shipped code **does** re-bound on read (Finding 2 — stronger than declared); and of the two write sites the register names, the `mergeTelemetryBlobs` half is **unguarded** — removing its bound reds nothing anywhere (Finding 3). | closed |
| T-09-07 | 09-02 | Information Disclosure | telemetry counters | low | **accept** | **E** — same measurement as T-09-03 at the storage layer. This is a legitimate restatement across two components (reducer vs. persisted blob), not a duplicate id: the register's Component column distinguishes them and the plans are different. → **AR-09-01** | closed (accepted) |
| T-09-13 | 09-02 | Regression (rename blast radius) | every consumer of the renamed/bumped v3→v4 identifiers | medium | mitigate | **E** — and the declared gate turns out to be **standing**, not one-shot, which is better than the register claims. `npm run typecheck` exits **0** at HEAD. `grep -rn` for `PROGRESS_KEY_V3`, `migrateOrDefaultV3`, `mergeHighWatermarkV3`, `parseProgressV3Result` and `ProgressBlobV3` outside `src/services/storage/` returns **zero** — no consumer was left on a v3 identifier. `.github/workflows/ci.yml` runs `npm run typecheck` on every push to `main` and every pull request, and **it executed green on `8788caa`**, the merge commit that brought phase 9 into `main` (`gh run view 36113954199` → `success`). So the blast-radius check ran as a real CI gate against this phase's shipped tree, dated. | closed |
| T-09-08 | 09-03 | Tampering | `ensureHydrated` fallback chain | high | mitigate | **M ×2** — the fail-soft half: planting a throw at the top of `hydrateOnce` reds **7** cases (*"reads the v4 key first…"*, *"absent v4 migrates through v3…"*, *"corrupt v4 still falls through to the v2 then v1 links"*, *"recordRunEnd returns the merged blob synchronously…"*, *"re-reading an already-hydrated store is idempotent"*, and both single-flight cases). The never-clobber half: `hydrateOnce` folds disk into memory only through `mergeHighWatermark`, whose telemetry half SUMS — so replacing the single-flight `hydrating ??= hydrateOnce()` with a bare call reds **2**, including *"overlapping first reads hydrate once — mergeTelemetryBlobs never double-counts the persisted blob"*. **E**: `mergeHighWatermark` verified non-lowering in **both** directions — `high←low` and `low←high` both yield `bestScore 9000`, `{score:9000,stars:3}`, 5 unlocked, `updatedAt 5000`, `endless {40, 8000}`, `bricksBroken 4242`. Symmetric; a stale disk read cannot lower a known watermark. | closed |
| T-09-09 | 09-03 | Denial of Service | a write on every run end | low | **accept** | **M + R** — the acceptance rests on there being no per-frame write, and that is enforced structurally rather than by convention. **M**: planting `import { PROGRESS_KEY } from '../services/storage'` into `src/runtime/runStats.ts` yields `error  There is no policy allowing dependencies from elements of type "runtime" to elements of type "services"  boundaries/dependencies`. The frame loop **cannot** reach storage; `grep AsyncStorage src/runtime/useGameLoop.ts` → **0**. Payload growth is bounded by `RECENT_RUNS_BOUND` per T-09-06. → **AR-09-03** | closed (accepted) |
| T-09-10 | 09-04 | Repudiation | `handleMenuPress` double-fire | medium | mitigate | **M** — `handleMenuPress` is the single abandon funnel and gates on the same `runEndedRef` the WON/LOST branches latch. Removing the `if (!runEndedRef.current)` guard reds *"Menu after the run already ended records nothing extra — the funnel cannot double-record"*, so the case discriminates rather than passing on an empty render. Both exit-to-Menu paths (`GameScreen onMenu`, the Android hardware-back handler) route through it; `recordInFlightEndlessRun` (phase 11) shares the identical latch. | closed |
| T-09-11 | 09-04 | Tampering | `src/core` untouched guarantee | medium | mitigate | **E — the property holds at HEAD; the declared control does not exist, and it demonstrably FAILED inside this very phase.** `git diff --stat 3bf0933..f814dae -- src/core` is **empty**, so the net phase delta on the simulation core is zero. But the register's mitigation is *"Task 2's `git diff --stat -- src/core` gate blocks phase completion if violated"*, and it did not: commit `3f20563` used `git add -A` and swept in a **159-line rewrite of `src/core/rules/brickDamage.ts`** that no plan asked for, while that commit's own message asserted the diff was empty. It was caught by a human reading the commit contents and reverted in `9a6a448`. There is **no standing gate**: `grep -rn "git diff.*src/core"` over `scripts/`, `tests/`, `src/` and `app/` returns **zero**, and `.github/workflows/ci.yml` has no core-freeze step. See Finding 5. | **open — below `high` threshold (non-blocking)** |

*Status: closed · closed (accepted) · open · open — below `high` threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` (`high`) count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party or another owner)*

**Measured arithmetic over the 14 rows, so the counts can be checked rather than trusted:**

| Split | Figures | Sum |
|---|---|---|
| Disposition | 10 mitigate · 4 accept · 0 transfer | 14 ✓ |
| Severity | 4 high (`04`, `05`, `06`, `08`) · 6 medium (`01`, `02`, `10`, `11`, `12`, `13`) · 4 low (`00`, `03`, `07`, `09`) | 14 ✓ |
| Status | 13 closed · 1 open | 14 ✓ |
| Method | 8 **M** · 6 **E** · **0 R** | 14 ✓ |

`T-09-11` is the single open plan-time row. At `block_on: high` it does **not** count toward
`threats_open`. Stated plainly rather than hidden behind the threshold: at `block_on: medium` it
**would** block. It is rated medium because the asset at risk is deterministic-simulation
correctness, not the confidentiality or integrity of anything an attacker wants — there is no
server, no asset and no adversary but the developer — and because the end state is measurably
clean. The likelihood term is *not* theoretical: the escape happened once, in this phase.

---

## The unregistered surfaces — 3 audit-authored rows

These carry an **`A` prefix** so they can never be mistaken for a plan-time id. That is deliberate:
phase 13's `T-13-02` was reused for a third, different threat that already had the number
`T-13-07`, and phase 12 cited `T-12-05` at four shipped sites where `T-12-06` was correct. A new
row minted by an audit into the plan-time numbering is how that defect starts.

| Threat ID | Category | Component | Severity | Disposition | Finding & how it was established | Status |
|-----------|----------|-----------|----------|-------------|-----------------------------------|--------|
| **T-09-A1** | **Denial of Service (via Tampering)** | **`sanitizeAggregateMap` — uncapped AND inflating on read (WINDOWS #27, provenance `ddbbec3`, plan 09-02)** | **high** | **mitigate** | **E — see the full measurement below. CLOSED 2026-09-29** by `AGGREGATE_MAP_BOUND = 64`, applied keep-first AFTER the non-object drop (`a1fdba3`), after the orchestrator independently re-measured the inflation at **25x** on a valid v4 blob. See *Resolution*. | **closed (was OPEN — BLOCKING at audit time)** |
| T-09-A2 | Tampering / Information Disclosure | `sanitizeRunLogEntry` — `levelId` has no length bound | medium | mitigate | **E** — `sanitizeRunLogEntry` requires `typeof levelId === 'string'` and rejects `''`, and correctly takes **no** catalog-membership check (v4 is mode-aware by D-04, and endless/daily legitimately store non-`LevelId` keys). What is missing is an **upper length bound**. Measured: a **4 000-character** `levelId` survives into `recentRuns` intact, as do `<Text>evil</Text>`, `__proto__` and `level-9999`. This is the same surface phase 12 fenced as **T-12-15** (*"`12-UI-SPEC.md` renders the stored key VERBATIM… so a 4 000-character `date` would otherwise reach a `Text` inside a 320px panel"*) and phase 13 fenced as **T-13-01**. It is **not a live defect today** — nothing renders `recentRuns`. **Phase 14 (N-STAT-03) is the statistics screen that will**, and it will inherit an unfenced string with no register row telling it so. | open — below `high` threshold (non-blocking) |
| T-09-A3 | Repudiation (documentation trust boundary) | `docs/ops/PROGRESS-STORAGE.md` was never extended to v4 | medium | mitigate | **E** — `git log -- docs/ops/PROGRESS-STORAGE.md` is exactly three commits: `a83fd6c` (C1, v2), `af65da9` (C2, v3), `35216e9` (**13-05**). **Phase 09 wrote zero lines of it**, despite shipping the v4 blob, the v3→v4 chain, the 16-field aggregate, `RECENT_RUNS_BOUND` and the whole fail-soft v4 contract. Its § Storage keys / § Migrate / § Fail-soft sections still describe v3, which is why phase 13 had to open its own section with the disclaimer *"The sections above describe the **v3** `ProgressBlob`"*. **This is not a broken promise** — `grep -n "PROGRESS-STORAGE\|docs/ops"` over all five PLAN and all five SUMMARY files returns **zero**, so no plan ever undertook it. It is an unregistered gap on the one trust boundary phases 11, 12 and 13 each named and phase 09's register did not, and it is the direct mechanism by which **#27 sat unowned for three phases**. | open — below `high` threshold (non-blocking) |

### `T-09-A1` — `sanitizeAggregateMap`, measured honestly

WINDOWS #27's own text ends *"Decide it explicitly rather than by inheritance."* This audit is the
owner's audit — the provenance is `ddbbec3`, plan 09-02 — so here is the decision and the numbers
behind it.

**The defect is not only that the map is uncapped. The read path INFLATES it.** Each surviving key
is passed to `sanitizeAggregate`, which starts from `defaultTelemetryAggregate()` and writes all
**16** counter fields — so a sparse hostile cell `{"runsPlayed":1}` (~22 bytes) is expanded into a
full 16-field object (~250 bytes) on every parse.

| Hostile `byMode.campaign` keys | Raw blob bytes | Parsed blob bytes | Inflation | Keys kept | Status | Parse |
|---|---|---|---|---|---|---|
| 1 | 623 | 887 | 1.42× | 1 | `ok` | 0.3 ms |
| 100 | 2 891 | 29 291 | **10.1×** | 100 | `ok` | 0.3 ms |
| 5 000 | 124 491 | 1 444 491 | **11.6×** | 5 000 | `ok` | 3.7 ms |
| 50 000 | 1 289 491 | 14 489 491 | **11.2×** | 50 000 | `ok` | 34.8 ms |
| **109 926** | **2 857 493 (~2.86 MB)** | **31 877 957 (~31.9 MB)** | **11.2×** | 109 926 | `ok` | 67 ms |

- **The inflation survives hydration and is what gets written back.** `mergeHighWatermark` — the
  function `hydrateOnce` uses — preserves all **109 926** keys and a **31 877 357-byte** campaign
  map. That is the record the next `persist()` hands to `setItem`.
- **The inflation is one-shot, not compounding.** Re-parsing the written-back blob yields the same
  31 877 957 bytes: a fixed point. This is stated because "compounding" would be the stronger
  claim and it is **not** what was measured.
- **All three maps are affected identically** — 5 000 keys injected into `campaign`, `endless` and
  `daily` each survive at 5 000, `status: ok`. 200 000 keys × 3 maps = **600 000** aggregates in
  525 ms.
- **There is no key-length cap either.** A **4 000-character** `byMode` key survives verbatim.
- **No prototype pollution.** A `__proto__`-keyed `byMode` cell leaves `Object.prototype` untouched
  (`Object.keys`/`Object.values` never walk the chain) — independently confirming phase 13's IN-05.
- **The write side is not the problem, and the scope is the read side only.** `mergeRunIntoTelemetry`
  writes `byMode[args.mode][args.levelId]`, so key cardinality is bounded by the *caller*: phase 09
  writes only `campaign` with catalog ids (≤ 5 keys), phase 11 writes the constant
  `ENDLESS_TELEMETRY_KEY`, phase 12 writes the constant `DAILY_TELEMETRY_KEY`. Every phase's
  write-side claim was true. **The read-side gap is the whole of it**, and it is phase 09's.

**Why `high`, and why open rather than accepted.** Four reasons, none of which re-opens AR-11-02 or
AR-12-02:

1. **It is the only place in the v4 read path where degradation goes UPWARD.** Every other field is
   monotone non-increasing — measured this audit: hostile `lifetime` sums to **0** against a clean
   **12**; a clean blob round-trips byte-identically. `byMode.*` grows 11.2×. `sanitizeTelemetry`'s
   own doc comment and `docs/ops/PROGRESS-STORAGE.md` both say v4 degrades *"downward, like every
   other v4 field"*; for this collection that sentence is false, in the same document that names
   `sanitizeAggregateMap` as the counter-example two paragraphs earlier.
2. **The consequence class is the one the phase explicitly refuses to accept.** The fail-soft
   contract exists because *"a throw on hydrate takes out the app's cold start, and that is
   availability."* A 31.9 MB allocation at cold start is the same consequence class, and it is
   **strictly worse** than a throw, because the `try`/`catch` in `hydrateOnce` cannot catch an OOM.
3. **The asymmetry has no defence.** Inside the very same function, `recentRuns` is re-bounded on
   read, `daily.history` is re-bounded on read, and `achievements.unlocked` is dropped-then-bounded
   on read. `byMode.*` alone is not. `sanitizeAchievementRecord`'s own comment names this sanitizer
   as the trap it was written against. The fix is one bound, of a shape the file already contains
   three times.
4. **Nobody owns it.** Three registers transfer to #27 — `T-13-02`@13-05 as an explicit `transfer`,
   AR-13-04, and phase 11's *"inherited, pre-existing"* note — all on the basis that it is
   *tracked*. It is tracked. It was never *decided*. The accepted tamper model says the player may
   lie about their score; it does not say the player may brick their own cold start, and no AR in
   `11-SECURITY.md`, `12-SECURITY.md` or `13-SECURITY.md` claims otherwise.

**What this row does NOT claim.** No OOM and no cold-start hang was observed. The measurements were
taken in jsdom on a desktop with a multi-gigabyte heap; **the inflation factor and the absolute
parsed size are measured, the device-level failure is inferred.** Parse time at a 2.86 MB attacker
budget is 67 ms, which is not itself a hang. The severity rests on reasons 1–4, not on an
unmeasured crash.

**The fix, for whoever takes it:** a key cap in `sanitizeAggregateMap` of the same shape the three
sibling collections use. Note that the sibling precedent is **drop-then-bound**, and that
`recentRuns` keeps the newest (`slice(-N)`) while `achievements.unlocked` keeps the first
(`slice(0, N)`) for stated reasons — whoever caps this map must say which it chose and why. It also
needs a **key-length** bound, which no sibling currently has and which `T-09-A2` needs too.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Inherited by | Accepted By | Date |
|---------|------------|-----------|--------------|-------------|------|
| AR-09-01 | `T-09-03`@09-01, `T-09-07`@09-02 | **Local record tampering, and local counters with no PII.** Offline single-player, plaintext AsyncStorage, no server to validate against and no leaderboard to protect (`PROJECT.md`: no backend in MVP, offline-first, MVP fully playable without network). Zero network call sites repo-wide, so no counter can leave the device. The stored fields are 16 numeric counters plus `{ mode, levelId, outcome, score, ticks, timestamp }` — no identifier, no free text. **This is the acceptance phase 09 implements and the three later registers are downstream of.** | **AR-11-02** (`T-11-07`@11-02 et al.), **AR-12-02** / **T-12-06**, **AR-13-01…03** | Locked at plan time (C1 D-09 carried); confirmed and re-measured by audit | 2026-09-29 |
| AR-09-02 | residual behind AR-09-01 — **no plan-time row names it** | **`safeCounter` bounds a counter DOWNWARD but not upward.** Re-measured at its exact boundary this audit: `bricksBroken: Number.MAX_VALUE` survives the read path **intact** at `1.7976931348623157e+308`, and `bestWave: MAX_SAFE_INTEGER` survives at `9007199254740991`, because both are finite and non-negative. By contrast `-5`→**0**, `'banana'`→**0**, `1e999`(→`Infinity`)→**0**, `3.9`→**3** (floored, never raised). So what is accepted is a **plausible large finite hand-written value**, not "any garbage". Downstream: this is the input to **AR-13-01** (`Number.MAX_VALUE` fires 7 of 12 achievement predicates, permanently under D-17) and to **AR-11-04**, whose *magnitude* the phase-11 audit flagged as unbounded. **Phase 09 authored `safeCounter`; this is where the acceptance belongs, and no phase-09 plan wrote it down.** | **AR-11-04**, **AR-13-01** | Not locked at plan time — **recorded and bounded by this audit**, matching the independent measurements in `11-SECURITY.md` Finding 3 and `13-SECURITY.md` | 2026-09-29 |
| AR-09-03 | `T-09-09`@09-03 | **One AsyncStorage write per run end.** Matches the pre-existing write-per-run-end cadence; no per-frame write is even reachable, because `boundaries/dependencies` forbids `src/runtime` → `src/services` (mutation-proved). Payload growth bounded by `RECENT_RUNS_BOUND = 50` (~120 bytes/entry ≈ 6 KB against the ~2 MB Android CursorWindow ceiling `types.ts` names). The write is fired and not awaited (C1 D-10) and soft-fails to a `pendingWrite` for the AppState flush. | — | Locked at plan time | 2026-09-29 |
| AR-09-04 | `T-09-00`@09-00 | **Plan 00 is test scaffold only**, so it carries no threat model of its own. Verified rather than assumed: none of its four commits touches `src/` or `app/`. | — | Locked at plan time; verified by audit | 2026-09-29 |

*Accepted risks do not resurface in future audit runs.*

### What the later phases inherit FROM this one

Stated explicitly, because three registers make measurements about this phase's code that are
really assertions about **its** contract:

- **`11-SECURITY.md` AR-11-02** (local endless-record tampering) and **Finding 3** (*"`safeCounter`
  has no upper bound… `bestScore: Number.MAX_VALUE` survives the endless read path intact"*) are
  both statements about `safeCounter` and `sanitizeTelemetry`, authored here. Both re-measured and
  **confirmed** this audit. Finding 3's observation that this *"does not breach `T-11-05`'s
  mitigation — every field does pass through `safeCounter`"* is correct: the control is present and
  working as designed; the design is upward-unbounded, which is now **AR-09-02**.
- **`12-SECURITY.md` AR-12-02 / `T-12-06`** (a player editing the blob) rests on AR-09-01.
  Phase 12's own audit correctly traced `sanitizeAggregateMap`'s provenance to `ddbbec3`
  (phase 09-02) and ledgered it as **#27** rather than claiming it. That attribution is confirmed.
  Note for future readers, carried forward from that file: phase 12 mis-cited this acceptance as
  **T-12-05** (*seed predictability*) at four shipped sites before repairing it to **T-12-06**; any
  phase-09 artifact that needs to cite the downstream tamper acceptance must cite **T-12-06**.
- **`13-SECURITY.md` AR-13-01** (`Number.MAX_VALUE` fires 7/12 predicates), **AR-13-02**
  (`daily.longestStreak` read as stored), **AR-13-03** (a hand-written unlock timestamp),
  **AR-13-04** (four predicates iterating an uncapped `byMode` map) and **AR-13-05** all rest on
  this phase's read path. AR-13-04's *"Capping the map is #27's fix and not this phase's to take"*
  is correct — and **#27's fix is this phase's**, which is why `T-09-A1` is opened here rather than
  transferred onward for a fourth time.
- **`13-SECURITY.md`'s `T-13-02`@13-05 `transfer`** names WINDOWS #27 as its target and requires it
  to be *present and open*. It still is, and this file does not close it. The transfer remains
  valid; what changes is that the threat now has an owning register row (`T-09-A1`) instead of only
  a ledger entry.
- **Phase 14 (N-STAT-03)** inherits `T-09-A2` — an unfenced, unbounded-length `recentRuns[].levelId`
  — and `T-09-A3`, an ops document that still describes v3.

---

## Register-Accuracy Findings

No plan-time mitigation is *missing* except `T-09-11`'s. Findings 1–6 are the species this project
has been caught on eleven times in the last three phases: **a control that names an enforcement it
does not perform**. It matters because the next reader trusts the citation and stops looking.

| # | Finding | Disposition |
|---|---------|-------------|
| 1 | **`T-09-01` cites a control that does not perform the named enforcement.** The register's mitigation is *"Read-only access enforced by review + `assert-worklet-closures`"*. That script's own header states its contract: *"worklet bodies must not call imported (or same-file) functions that lack a `'worklet'` directive."* It says nothing about mutation. **Measured**: with `world.combo = 0;` planted inside `reduceRunTelemetry`, `node scripts/assert-worklet-closures.mjs` prints `Worklet closure guard OK (130 files)` and exits **0**; `npx tsc --noEmit` also exits 0, since `World` is mutable by design. The threat is genuinely closed — by the behavioural case *"never writes to any world.\* field"* in `tests/telemetry.reduce-run-events.test.ts`, a whole-world value snapshot with its own anti-vacuity guard, which reds under both a scalar and a typed-array write. **A stronger control than declared, in a different place** — exactly phase 12's Finding 3. | Recorded here. The register lives in PLAN files, which are historical artifacts; **this file is the correction of record.** |
| 2 | **`T-09-06`'s register says the bound is *"not left to the reader"* — but the shipped code DOES re-bound on read.** `sanitizeTelemetry` ends `out.recentRuns = entries.slice(-RECENT_RUNS_BOUND)`, with the comment *"Bound on read as well as on write — a tampered blob cannot grow the ring."* Strictly better than declared against the declared threat, but the register's phrasing tells a reader the read path is unprotected, which would send anyone hardening the parser to the wrong place. Same shape as phase 12's Finding 4. | Recorded here. |
| 3 | **Half of `T-09-06`'s declared two-site mitigation is unguarded, and the assertion that looks like its guard cannot fail.** The register names *"`mergeRunIntoTelemetry`/`mergeTelemetryBlobs`"*. The first is mutation-proved (1 red). Deleting `.slice(-RECENT_RUNS_BOUND)` from **`mergeTelemetryBlobs`** reds **nothing** — measured across `storage.progress-v4`, `achievements.record` and `daily.record`. The only assertion over it is `expect(merged.recentRuns.length).toBeLessThanOrEqual(RECENT_RUNS_BOUND)` against a merged length of **2**: it passes at 2 ≤ 50 whether the bound exists or not. **A gate that cannot fail** — the defect family behind WINDOWS #33 and #26. Separately, the **read-side** bound (Finding 2) is also unguarded: removing it reds nothing across the **whole 112-file suite**. | Recorded. Both bounds are present and correct in shipped code; neither has a guard that would catch their removal. |
| 4 | **The sibling-field half of the degrade-alone property has ZERO test coverage, and this is the vacuity trap the objective named.** `T-09-04`'s *telemetry-vs-progress* independence is genuinely gated (mutation-proved, 1 red). But `sanitizeTelemetry`'s doc comment claims *field-vs-sibling-field* independence four separate times (*"Each of its fields degrades on its own too — a broken `bestWave` does not discard a good `bestScore`"*; *"cannot take campaign unlocks, bests, stars or the endless record down with it"*), and `docs/ops/PROGRESS-STORAGE.md` calls it *"provably untouched"*. **Measured**: inserting an early `return out` when `telemetry.lifetime` is malformed — so a bad `lifetime` silently discards `endless`, `daily`, `achievements` and `recentRuns` — passes the **entire suite at 112 files / 870 passed \| 1 skipped (871)**, the exact measured baseline. The property **does hold at HEAD**: verified empirically with a 12-field non-default baseline established FIRST, then each of the six fields corrupted alone — in all six cases every sibling kept its non-default value and `status` stayed `ok`. But it holds by code structure, not by any gate, and the word *"provably"* is doing work the tests do not do. | Recorded. The property is true and measured; nothing would catch its regression. |
| 5 | **`T-09-11`'s gate does not exist, and its absence was demonstrated inside this phase.** *"Task 2's `git diff --stat -- src/core` gate blocks phase completion if violated"* describes a one-shot command typed into a plan, not an artifact. `grep -rn "git diff.*src/core"` over `scripts/`, `tests/`, `src/` and `app/` → **0**; no CI step. It failed live: `3f20563` swept in a 159-line `src/core/rules/brickDamage.ts` rewrite while asserting the diff was empty, and `9a6a448`'s message records why the gate passed — *"I ran it before that commit existed."* Caught by a human, not a gate. | **Kept OPEN** as the one open plan-time row, rather than closed on the clean net diff. Non-blocking at `block_on: high`; **it would block at `block_on: medium`**, and that is stated rather than left implicit. |
| 6 | **`EVENT_RING_CAPACITY` is read by nothing in production, and `T-09-02`'s bound is a hand-copied literal with no parity row.** The constant is exported from `src/core/constants.ts` and re-exported from `src/core/index.ts`; `grep -rn EVENT_RING_CAPACITY src app` finds **no importer**. `runStats.ts` instead hard-codes `128` **twice** — `const CASCADE_SCRATCH_LEN = 128; // EVENT_RING_CAPACITY (src/core/constants.ts)` and, inside the reducer, `const ringCap = 128; // EVENT_RING_CAPACITY — scratch bound, defensive only` — and the test file hard-codes it a third time. `tests/constants.parity.test.ts` exists and is precisely this repo's idiom for pinning duplicated worklet literals against their exported constant; it pins five such literals (`MAX_CCD_ITERATIONS`, `SEPARATION_EPS`, `SERVE_SPEED`, `STALL_TIER3_REPEAT_TICKS`, `STALL_ANGLE_NUDGE_DEG`) and **does not pin this one**. This is phase 13's `ACHIEVEMENT_LINES_MAX` defect — *"the single place the number lives"*, read by nothing — in a new place. **The failure direction is safe**: raising `EVENT_RING_CAPACITY` in core would leave the scratch arrays at 128 and `breakCount < ringCap` would clamp, so `largestCascade` would silently **undercount**, which is T-09-12's declared safe direction, and typed-array out-of-range writes are dropped by JS rather than overflowing. So it is a correctness-drift risk, not memory safety. | Recorded. The parity row it is missing is one line in a file that already has five. |
| 7 | **Four of five SUMMARYs carry no `## Threat Flags` section at all** — `09-00`, `09-01`, `09-03`, `09-04`. Only `09-02-SUMMARY.md` has one, declaring *"None"* and citing *"T-09-04 through T-09-07, T-09-13"* — which resolves correctly to exactly plan 09-02's five ids. Same process gap as phase 11's Finding 5 (five of twenty-one). **This is why the two unregistered surfaces below `T-09-A1` reached three later phases silently**: the executor had no place to declare them. | Process gap, not a surface gap. The audit verified the register covers each plan's changes independently, and found the three surfaces the flags would have caught. |
| 8 | **No stale coordinates to report.** Unlike phases 11, 12 and 13 — each of which had a "stale coordinates" finding — the phase-09 register cites **no line numbers at all**; every mitigation names a symbol or a command. Recorded because it is the standing rule those three audits each asked for, and this register already follows it. | Recorded as a positive. |

### Id resolution — checked, and clean

Every id cited in this file was resolved against the PLAN file that authored it. Findings:

- **No collisions.** 14 references, 14 distinct ids, each used exactly once.
- **`T-09-03` and `T-09-07` are the same threat class under two ids** (information disclosure ·
  local counters · `accept`) in two plans. This is a **legitimate restatement across components**,
  not the phase-13 defect: the register's Component column distinguishes them (`reduceRunTelemetry`
  vs. the persisted telemetry blob), they sit in different plans, and both map to one AR
  (**AR-09-01**). Flagged so a reader who greps `T-09-03` is not surprised to meet the same
  rationale at `T-09-07`.
- **`T-09-08` restates `T-09-04`/`T-09-05` at the store layer** by its own text (*"Reuses the
  already-hardened fail-soft parse/migrate chain (Plan 02)"*), correctly under a new id for a new
  component (`ensureHydrated`). Verified independently rather than closed by reference: its
  single-flight and fail-soft halves each have their own mutation.
- **`09-02-SUMMARY.md`'s id range is correct** — *"T-09-04 through T-09-07, T-09-13"* is exactly
  plan 09-02's set. No mis-citation of phase 12's or phase 13's kind.

---

## Post-audit gate state

Re-measured after every mutation was reverted and all three probe files deleted:

| Gate | Result |
|---|---|
| `npx vitest run` (excluding a concurrent session's probe, see below) | **112 files / 870 passed \| 1 skipped (871)** — the measured baseline, unchanged |
| all six `assert-*.mjs` in the `npm test` chain | `worklet-closures`, `level-solvability`, `eas-profiles`, `brand-name`, `streak-evidence`, `purity` — **exit 0** each |
| `npm run typecheck` | **exit 0** |
| `npm run lint` | **`✖ 3 problems (0 errors, 3 warnings)`** — the measured baseline. Attributed by file: 1 in `tests/daily.date-key.test.ts`, 2 in `tests/ui/PlayingHost.endless-host.test.ts`. No warning traceable to this audit |
| `git status --porcelain` | `M .planning/config.json`, `?? .planning/milestone.lock`, `?? .planning/state.json` — **byte-identical to the pre-audit state.** `git diff -- src app docs scripts tests` is **empty** |

**A concurrent session was active in this checkout throughout the audit**, as
`gsd-concurrent-session-hazard` warns. It held an in-flight mutation in `src/levelgen/generate.ts`
(`if (true || allNonSteelReachable(...))`) and an untracked `tests/__audit10_probe.test.ts`, both of
which appeared and disappeared during this audit and **neither of which this audit touched or
reverted**. Two consequences, recorded so nothing is misattributed: a transient
`tests/levelgen.sweep.test.ts` failure observed during one full-suite run was theirs, verified by
re-running that file against a clean phase-09 tree (10 passed); and the 6 extra lint warnings and
6 extra tests seen at one point were theirs. Both sessions' artifacts are gone at the time of
writing.

**One standing-gate caveat, attributed correctly.** `.github/workflows/ci.yml` runs
`npm run typecheck` → `npm run lint -- --max-warnings 0` → `npm test` → the assert scripts, in that
order, fail-fast. `npm run typecheck` therefore still executes today, which is what `T-09-13`
depends on — **and CI ran green on `8788caa`**, the merge commit that brought phase 9 into `main`
(`gh run view 36113954199` → `success`, 2026-09-25). But at HEAD the tree carries **3 lint
warnings**, so `--max-warnings 0` would fail and every step **after** it — `npm test`, all six
assert scripts, the coverage floor, the Expo web export — would never run. `gh run list` shows
**no CI run since 2026-09-25**: phases 10 through 13 have never been through it. This is **not a
phase-09 finding** — phase 09's tree was clean and its gate executed — but it bears on any later
claim of the form "CI enforces X", including in this file, and the three warnings should be cleared
before the next push to `main`.

---

## Security Audit Trail

| Audit Date | Register Rows | Unique IDs | Audit-Authored | Closed | Open (blocking) | Open (non-blocking) | Run By |
|------------|---------------|------------|----------------|--------|-----------------|---------------------|--------|
| 2026-09-29 | 14 | 14 | 3 | 13 | **1** (`T-09-A1`, high) | 3 (`T-09-11`, `T-09-A2`, `T-09-A3`, all medium) | gsd-security-auditor (State B, first audit; 8 of 14 plan-time rows closed by making a control fail, 0 closed by reading alone; 15 mutations applied and reverted; 3 probe files written and deleted) |

---

## Resolution — `T-09-A1` closed (orchestrator, 2026-09-29)

WINDOWS #27's own text ended *"Decide it explicitly rather than by inheritance."* It had sat open
since plan 09-02 while phases 11, 12 and 13 each **transferred** a threat to it — `13-SECURITY.md`'s
`T-13-07` / `T-13-02` row among them — on the understanding that it was tracked. **Tracked is not
bounded**, and this audit is what said so out loud.

The finding was accepted only after being re-measured independently, on a valid v4 blob built from
`defaultProgressBlob()` rather than a hand-written literal (a first attempt used a partial shape and
came back `status: 'corrupt'` with a defaulted map — an invalid measurement, discarded rather than
reported):

| | stored | parsed | ratio | keys kept | status |
|---|---|---|---|---|---|
| **before** `a1fdba3` | 229 KB | **5.79 MB** | **25.2x** | 20 000 of 20 000 | `ok` |
| **after** `a1fdba3` | 229 KB | **18.9 KB** | 0.08x | **64** of 20 000 | `ok` |

A 305x reduction in the hostile case. The ratio differs from the audit's 11.2x purely because of
stored key-name length — shorter keys shrink the stored side and inflate the ratio — so the two
measurements are the same defect, not a disagreement.

**Closed by `AGGREGATE_MAP_BOUND = 64`** in `src/services/storage/types.ts`, applied in
`sanitizeAggregateMap`:

- **The bound cannot cost a real player anything.** Every legitimate key comes from a closed
  domain: `byMode.campaign` is keyed by `LevelId`, which has exactly **five** members
  (`src/core/levels/levelIds.ts`), and `byMode.endless` / `byMode.daily` hold a single constant key
  each — `DAILY_TELEMETRY_KEY`'s own comment already existed to keep that map from growing per
  date. 64 is thirteen times the largest legitimate map. A third test case **asserts that headroom**
  rather than only arguing it, so a campaign grown past the bound reds a test before a player
  silently loses a level aggregate.
- **Applied keep-first, AFTER the non-object drop** — never to `Object.keys(map)` before it — so
  padding garbage cannot push a real level's aggregate out of the window. Same drop-then-trim order,
  for the same reason, as `sanitizeAchievementRecord`.
- **It trims, it does not reject.** `status` stays `ok`: a hostile blob that made the app refuse to
  load its own progress would be a worse outcome than one that loses invented keys, which is C1
  D-09's fail-soft rule.

Both directions red-proved: removing the bound reds the 20 000-key case; rewriting it as
**trim-then-drop** (`Object.keys(map).slice(0, BOUND)`) reds the ordering case specifically — the
subtle defect the ordering exists to prevent, and the one a green suite would otherwise hide.

Also repaired in the same commit: `types.ts` cited this function as `parseBlob.ts:383-399` while it
sat near line 670 — the **fourth** citation drift found in this repo. Now cited by symbol, with the
drift named at the site.

**`T-09-11`, `T-09-A2` and `T-09-A3` remain open and non-blocking**, as the audit recorded. `T-09-A2`
is the one to carry forward: `recentRuns[].levelId` has no length bound, a 4 000-character id
survives, and **Phase 14's statistics screen is what will render it** — the same surface phase 12
fenced as T-12-15 and phase 13 as T-13-01, arriving unfenced with no register row to warn it.

---

## Sign-Off

- [x] All 14 plan-time rows have a disposition — **10 mitigate, 4 accept, 0 transfer** (sums to 14)
- [x] Severity assigned to every row — **4 high, 6 medium, 4 low** (sums to 14)
- [x] Register enumerated one row per reference, **not deduped by id**; ids counted independently (14 refs → 14 distinct ids, no collisions)
- [x] Supply-chain rows **checked, not assumed** — no plan carries one, none added; the measurement taken anyway and clean
- [x] Accepted risks documented — **AR-09-01 … AR-09-04**, with what AR-11-02 / AR-12-02 (`T-12-06`) / AR-11-04 / AR-13-01…05 inherit from this phase stated explicitly
- [x] Every id cited in this file resolves to the threat intended; the two legitimate restatements are named so a reader is not surprised
- [x] Implementation, documentation and scripts **unmodified by the audit** — `git diff -- src app docs scripts tests` empty, confirmed with `git status` before reporting
- [x] `threats_open: 0` — **met as of `a1fdba3`.** At audit time it was 1 (`T-09-A1`, high, at `block_on: high`); the row above records both states
- [x] `status: verified` — set at closure. The audit itself returned `status: open` / `OPEN_THREATS`, correctly

**What this sign-off does NOT claim.**

It covers the 14-row register authored at plan time across the five PLAN files, verified against the
implementation at HEAD (`a58efcb`), plus three surfaces the register never named.

It does **not** claim `threats_open: 0`. **`T-09-A1` is open at `high` and blocks**, and it is
deliberately *not* folded into AR-09-01's accepted posture: the accepted tamper model covers a
player lying about a value, and this is an availability property no AR in `11-SECURITY.md`,
`12-SECURITY.md` or `13-SECURITY.md` ever covered — which is precisely what WINDOWS #27's own
closing sentence asked someone to decide.

It does **not** claim to have observed an OOM or a cold-start hang. For `T-09-A1` the **inflation
factor (11.2×) and the absolute parsed size (2.86 MB → 31.9 MB) are measured**; the device-level
failure is inferred from them, and the severity rests on the four stated reasons, not on an
unmeasured crash.

It does **not** claim the 14 plan-time rows are all guarded against regression. Four are not, and
each is named: the `mergeTelemetryBlobs` bound and the read-side `recentRuns` bound (Finding 3,
both provably invisible to the whole suite), the sibling-field degrade-alone property (Finding 4,
invisible to all 112 files), and the `src/core` freeze (Finding 5, no gate at all). The properties
hold at HEAD and were measured to hold; nothing would catch their removal.

It does **not** cover the human and device items behind this phase. `09-UAT.md` is `status: passed`
on an iPhone 17 simulator (iOS 26.5), after one genuine defect (counters crossing UI→JS as zeros,
fixed in `59afd98`) and one retracted measurement error on checkpoint 2. No physical device was
used, and no test in this repository drives `onFrame`, so the 0.0139 ms worst-case reducer figure is
a desktop measurement, not a device one.

It does **not** close WINDOWS #27 — it **opens the register row that owns it** — and it does not
close `T-09-11`, `T-09-A2` or `T-09-A3`. It records rather than resolves Findings 1–8, and it does
not re-open AR-09-01, AR-09-03 or AR-09-04. **AR-09-02 is new**: the upward-unbounded `safeCounter`
was accepted in effect by three later phases and written down by none of them, including this one,
until now.

**Approval:** verified 2026-09-29 — the audit returned `OPEN_THREATS` and withheld approval; approval follows the closure of `T-09-A1` in `a1fdba3`, not a re-reading of the evidence
