---
phase: "11"
slug: "endless-mode"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-28"
register_rows: 133
unique_ids: 74
---

# Phase 11 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

State B audit — the register was authored at plan time across all 21 PLAN files
(`register_authored_at_plan_time: true`), so this audit **verified mitigations** rather than
building a register retroactively. ASVS level 1, block on `high`.

## Read this before the register: the ID collision

The register is **133 rows carrying 74 distinct IDs**, and the duplication is *not* restatement.
Six gap-closure rounds **restarted the numbering three times**, so the same ID names different
threats in different plans:

| ID | In `11-01-PLAN.md` | In `11-09-PLAN.md` |
|---|---|---|
| `T-11-01` | DoS · `difficultyForWave` → `generate` · medium | Tampering · `telemetry.endless` in AsyncStorage · low |

The same holds for `T-11-02..12` (11-01..06 vs 11-09/10/11), `T-11-13..21`, `T-11-29..33`
(11-14 vs 11-15), `T-11-40..44` (11-16/17 vs 11-19), `T-11-45..49` (11-17 vs 11-20), and
`T-11-50..54` (11-17/18 vs 11-21). **40 IDs are used exactly twice; `T-11-SC` appears 21 times.**

**Deduping by ID drops roughly 50 distinct threats.** The orchestrator's first pass did exactly
that and handed the auditor a 74-row index with a 35/25/14 severity split; the auditor caught it
and audited all 133 rows keyed `T-11-NN @ plan`. The true totals are below. This correction is
recorded here rather than quietly fixed, because an index that looks clean while measuring the
wrong set is the defect class this phase spent six rounds on.

**True totals:** 69 high · 37 medium · 27 low · 100 mitigate · 33 accept.

**Verification method, per row:** **M** = closed by making a control fail (8 distinct mutations,
each reverted) · **E** = closed by an empirical probe or a re-run gate command · **R** = closed by
reading. **19 rows M · ~37 rows E · ~77 rows R.** At ASVS L1 reading is permitted; the split is
recorded so no reader mistakes 133 closures for 133 measurements.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| persisted blob → app | AsyncStorage is plaintext; on a rooted device the v4 blob is attacker-controllable. The main externally-influenced input. | `telemetry.endless`, `byMode.endless`, campaign bests, stars, unlocks |
| `__DEV__` gate → production build | The temporary endless entry point (D-05) must not survive the production bundle | The dev-row `Endless` control, deleted by Phase 14 |
| cert harness → shipped runtime | `runCertWorstCase` exists only for certification and must be unreachable in a production build | The worst-case level forcing path |
| documentation → future implementer | An ops doc a later reader trusts without re-deriving it | `docs/ops/ENDLESS-MODE.md` |

---

## Threat Register — all 133 rows CLOSED

Rows are grouped by the plan that authored them, because the ID alone does not identify a threat
in this phase. Evidence is the command run and what it printed.

| Plan | Rows | Method | Evidence |
|---|---|---|---|
| 11-01 | `T-11-01` med, `T-11-02`/`T-11-03` low | R | `ramp.ts:57-66` — `(wave\|0)`, clamps `<0→0` and `>D_MAX→D_MAX`; `apply.ts:28-30` caps at `world.brickX.length`; `rng.ts` carries the verbatim `SECURITY:` non-CSPRNG block |
| 11-02 | **`T-11-04`** high | **M** | Widening the store gate to admit endless → `TS2339: Property 'levelId' does not exist` ×3 + `TS7053`. **The compiler is the firewall.** |
| 11-02 | `T-11-05` med | **E** | 11 hostile endless shapes all degrade at `status: ok`: `'banana'→0`, `-5→0`, `3.9→3`, `NaN→0`, array/string/null→`{0,0}`. Fields degrade **independently** (`bestWave:'x', bestScore:4242` → `{0, 4242}`). No prototype pollution. |
| 11-02 | `T-11-06`/`T-11-07` low | R/E | Two scalars only; `RECENT_RUNS_BOUND = 50` |
| 11-03 | `T-11-08`/`09`/`10` | R | `waveRequest`/`waveApplied` pair at `useGameLoop.ts:349-350`, applied `:467-468` — **above** `simFrozen` at `:494` |
| 11-04 | `T-11-11`/`12`/`13` | R/E | Determinism header present; nothing from this phase left in the working tree |
| 11-05 | `T-11-14` high | R | `bakeGlowSprites(brickW, brickH)` at `PlayingHost.tsx:802`; fence in `tests/ui/PlayingHost.next-bake.test.ts:155` |
| 11-05 | **`T-11-15`** med | **M** | The guard at `PlayingHost.tsx:2535` is the required `typeof __DEV__ !== 'undefined' && __DEV__`. Replacing it with a bare `__DEV__` reds **2** cases in `tests/ui/PlayingHost.endless.test.ts` |
| 11-05 | `T-11-16`/`17`, **`T-11-18`** high | R / **M** | `levelError` route `:495-501`; `waveAdvanceInFlightRef` ×16; T-11-18 by the same compiler measurement as T-11-04 |
| 11-06 | `T-11-19`/`20`/`21` | **E** | `BOARD-GENERATOR.md:384,394` `SUPERSEDED 2026-09-25` with the original kept verbatim; `Device digest: OPEN`=1, `Expected and ACCEPTED`=1; `N-END-03` still `[ ]` |
| 11-07 | `T-11-07-01` high, **`T-11-07-03`** med | R / **M** | `recordInFlightEndlessRun()` is the **first statement** of `startEndlessRun` (`:1658`); dev-guard mutation |
| 11-08 | `T-11-08-01`/`02` high, `T-11-08-05` med | R | Mode-keyed basis before `evaluatePersonalBest`; `endlessBestScoreRef`/`endlessBestWaveRef` ×16; ops record amended in place |
| 11-09 | `T-11-01′`…`04′`, **`T-11-05′`** high | E/R / **M** | Degradation re-measured; `failEndlessStart` latches; watermarks republished; dev-guard mutation |
| 11-10 | `T-11-07′` high, **`T-11-10′`** high | R / **M** | The funnel is the first statement — five callers cannot bypass it; `modeRef.current = 'campaign'` writers pinned at 2 |
| 11-11 | `T-11-15′` high, **`T-11-18′`** high | **E** / **M** | SC-5 OPEN markers intact, `N-END-03` unticked; bake fence at 1; suite grew to 107/798 |
| 11-12 | `T-11-20′` high, **`T-11-23′`** high | **E** / **M** | `endless-host.test.ts:478-485` pins **every** `setResultBest` arm, not only the success one; every extraction carries an anti-vacuity guard and all 8 mutations produced real reds |
| 11-13 | `T-11-24`/`25`/`26` high | R | The latch is `applyChrome`'s first statement (`:1246-1248`), shape pinned as `if (runEndedRef.current) { return; }` at `endless-host.test.ts:823` |
| 11-14 | `T-11-29` high, **`T-11-30`** high | R / **M** | Reordering `endless` below the `level-03` test reds **3** cases including a behavioural one |
| 11-15 | `T-11-29″`…`31″` high, **`T-11-32″`** high | R / **M** | Latch hoisted above all five chrome writes; per-site clear-before-write binding asserted for all 5 reset sites (`:1620-1645`) — an aggregate count would survive a relocated clear, this does not |
| 11-16 | **`T-11-36`**, **`T-11-38`**, **`T-11-39`**, **`T-11-40`** | **M** ×4 | See the anti-drift section below |
| 11-17 | **`T-11-44`**, **`T-11-45`**, **`T-11-47`** high | **M** ×3 | Both red under the `runEnded`-deletion mutation; the previously-**vacuous** `.toMatch(/runEndedRef\.current/)` is repaired to guard **shape** (`:823`) plus a three-site count (`:768`) |
| 11-18 | `T-11-53`…`61` | E/R | `N-END-03` `[ ]` at `REQUIREMENTS.md:182`; 7 regression pins at base; exactly 1 requirements commit |
| 11-19 | **`T-11-41‴`**, **`T-11-42‴`** high | **M** | Three consumers all read one `certLevelPlan()`; 20-cell truth table |
| 11-20 | `T-11-46‴`/`47‴`/`48‴` | **E** | `MEASURED, not derived` = **0** repo-wide; `certApplied.value =` = **1**; `git diff da1c356..3b93309 -- src/runtime` **empty** |
| 11-21 | `T-11-50‴`/`52‴`/`53‴` | **E** | `git diff --name-only 6bb18bf..b7b74e7 -- src/` **empty** — no falsification mutation left behind |
| all | **`T-11-SC` ×21** | **E** | Measured below. Disposition mislabelled in 16 of 21 rows. |

*Status: all rows closed · Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`*

### `T-11-SC` — the disposition the orchestrator challenged

The register disposes this `accept` with the justification *"No packages are installed in this
phase."* **Measured, twice, by the auditor and independently by the orchestrator:**

```
git diff --stat dcfdd37..b7b74e7 -- package.json package-lock.json   → empty
git log  --oneline dcfdd37..b7b74e7 -- package.json package-lock.json → empty
git diff --stat b7b74e7..HEAD     -- package.json package-lock.json   → package.json | 3 ++-
```

**Not one commit in phase 11 touched either file.** The 3-line delta visible against HEAD is
entirely phase 12's (a fifth assert script plus its alias), already accounted for in
`12-SECURITY.md`. `package-lock.json` is untouched across both phases. **No dependency key moved.**

So the factual claim is true — and that is the problem. *"No packages were installed"* is a
**measurement**, not a risk anyone decided to live with. The register is internally inconsistent
about it in three ways:

| Severity / disposition | Rows |
|---|---|
| high / **accept** | 13 |
| high / **mitigate** | 5 |
| low / **accept** | 3 |

plus two SUMMARYs (11-20, 11-21) reporting it as *"not applicable"* — a fourth label. The phase's
own last three rounds had already corrected it to `mitigate`, as had 11-07 and 11-08 in round 1,
and as phase 12 did. **The 16 `accept` rows are the outliers.** Recorded here as
**`high` / `mitigate`, closed by measurement**, matching `T-12-SC`. Nothing was concealed.

### The anti-drift gate — broken, not read

This phase shipped a gate anchored on `grep -c 'grep'` that measured 1 on its own base and so
could never fail. The round-6 gate is not that:

| Mutation applied to the real tree | Result |
|---|---|
| `if (plan === 'force')` → `+ && !runEndedRef.current` | `expected 1 to be +0` — *"ZERO occurrences of the run-ended latch identifier in runCertWorstCase (measured base 1)"* |
| arm → `plan !== 'unreachable' && modeRef.current !== 'endless'` | **2** reds — the `modeRef` count gate **and** the arm-shape gate |
| delete `if (args.runEnded) return 'unreachable'` from the predicate | **5** reds across 2 files, including the cell-5 **behavioural** case |
| move the `endless` test below the `level-03` test | **3** reds, including *"while endless already on level-03… gap 2"* |

The gate's comments state their measured bases honestly (`runEndedRef` 1, `modeRef` 2 on the
round-5 tree) and explicitly distinguish discriminating gates from regression gates — the
third-consumer contract says outright that two of its four counts are regression gates at base 0,
*"stated plainly rather than presented as evidence they are not."*

### The firewall — both stores agree, and absence cannot pass trivially

| Injection | Result |
|---|---|
| `blob.bestScore = Math.max(…)` into **memoryStore**'s endless branch | **3 red**, memory block only; AsyncStorage sibling **green** |
| the same into **asyncStorageStore**'s endless branch | **3 red**, async block only; memory sibling **green** |

Symmetric and independently gated. `tests/storage.endless-firewall.test.ts:79-99` pairs every
absence assertion with a **landed-write** case, so a dropped endless write reds rather than
passing an absence suite trivially.

### The persisted blob — corrupt endless cannot take campaign with it

```
CORRUPT -> {"bestScore":500,"bestByLevel":{"level-01":{"score":500,"stars":3}},"unlocked":["level-01"],"status":"ok"}
CLEAN   -> {"bestScore":500,"bestByLevel":{"level-01":{"score":500,"stars":3}},"unlocked":["level-01"],"status":"ok"}
campaign-side IDENTICAL? true
```

A first pass showed a campaign-side delta; the clean-record control proves it was entirely the
`unlocked` sanitizer's own pre-existing rule, not endless bleed — the same artefact phase 12's
audit hit.

---

## Accepted Risks Log

| Risk ID | Threat Refs | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-11-01 | `T-11-03`@11-01, `T-11-07-05`@11-07 | Seed predictability **is the contract**. `src/levelgen/rng.ts` carries an explicit `SECURITY:` block — not a CSPRNG, never reuse for a token, nonce, key or session id. Nothing in this phase does. | Locked at plan time; confirmed by audit | 2026-09-28 |
| AR-11-02 | `T-11-07`@11-02, `T-11-07-02`@11-07, `T-11-08-03`@11-08 | Local endless-record tampering. Offline single-player, plaintext AsyncStorage, no server to validate against and no leaderboard to protect (PROJECT.md: no backend in MVP, offline-first). Corruption degrades to zeros in isolation — measured. | Locked at plan time; confirmed by audit | 2026-09-28 |
| AR-11-03 | `T-11-06′`@11-09, `T-11-12′`@11-10, `T-11-19′`@11-11 | Spoofing is **not applicable** — the app ships no identity, no auth and no network call (ARCH-02). | Locked at plan time | 2026-09-28 |
| AR-11-04 | `T-11-08-04`@11-08 | Panel overflow at extreme values; computed, never observed. Outstanding as `11-UAT.md` item 3. **See Finding 3 — the magnitude is unbounded, not merely "unbounded wave".** | Locked at plan time; magnitude flagged by audit | 2026-09-28 |
| AR-11-05 | `T-11-02`@11-01, `T-11-06`@11-02, `T-11-11`@11-04, `T-11-28`@11-13, `T-11-34`@11-15, `T-11-44‴`, `T-11-49‴`, `T-11-54‴` | Residual DoS / tampering / information-disclosure surfaces with no new path opened by this phase; each has a standing green check named in its register row. | Locked at plan time | 2026-09-28 |

*Accepted risks do not resurface in future audit runs.*

---

## Register-Accuracy Findings

No control is missing. Every one of these is a **traceability defect** — a register or a document
naming a control that is absent, weaker, or somewhere else. Phase 12's audit found six such in a
29-threat register; this one has five in a 133-row register.

| # | Finding | Disposition |
|---|---------|-------------|
| 1 | **`docs/ops/ENDLESS-MODE.md:261` and `:485` cite an expression round 6 deleted** — `runCertWorstCase` "opens that branch on `!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03'`". `certLevelPlanFor` replaced it, and `endless-host.test.ts:1609-1615` now pins both identifiers at **0** at that exact address. `grep -c certLevelPlan docs/ops/ENDLESS-MODE.md` → **0**. It does **not** re-open `T-11-29`/`37`/`53`/`54`: `plan === 'force'` holds exactly when that three-term condition held, so the operator-facing content is still true — only the source pointer is stale. | Already declared as **`11-UAT.md` item 4** (owner decision pending). Not closed here. Two more rounds of drift would make it indistinguishable from a false mechanism claim. |
| 2 | **`T-11-SC`'s disposition, severity and SUMMARY label disagree four ways** (detailed above). | Recorded here as `high` / `mitigate`, closed by measurement. |
| 3 | **`safeCounter` has no upper bound.** Measured: `bestScore: Number.MAX_VALUE` survives the endless read path intact (`1.7976931348623157e+308`) because it is finite and non-negative. This does **not** breach `T-11-05`'s mitigation — every field does pass through `safeCounter`. It is the input to AR-11-04. | Recorded. The accepted risk's magnitude is unbounded, which the original acceptance did not state. |
| 4 | **Stale coordinates** — `T-11-24` cites `PlayingHost.tsx:929` (the latch is now `:1246-1248` after 11-15's hoist); `T-11-29″` cites `:936-940`; `T-11-36` cites `:1683-1686` (the arm is now `:2430`); `T-11-44` cites `:1742-1745`. Every named symbol exists; only the numbers drifted. | Recorded. The phase's standing rule is to cite symbols, not line numbers. |
| 5 | **Five SUMMARYs carry no `## Threat Flags` section at all** — `11-01`, `11-07`, `11-12`, `11-14`, `11-19`. The other sixteen declare "None". | Process gap, not a surface gap. The audit verified the register covers each of those plans' changes independently. |

### Inherited, not phase-11's

`sanitizeAggregateMap` is **uncapped on read** — re-measured here: 5 000 keys injected into
`byMode.endless` survive with `status: ok`, exactly as in `byMode.daily`. Provenance is `ddbbec3`
(phase 09-02); already ledgered as **WINDOWS #27** by phase 12's audit. Phase 11's register never
made that call for `byMode.endless`: `T-11-06` claims only *"no new unbounded collection is
introduced"*, which is **true** — phase 11 writes that map under the constant
`ENDLESS_TELEMETRY_KEY`, so its own write path cannot grow it. The read-side gap is real and
pre-existing.

### Dependency on unverified human items — checked explicitly

**No threat's mitigation depends on the 4 outstanding `11-UAT.md` items or the 2
behaviour-unverified `11-VERIFICATION.md` items.** The SC-5 family (`T-11-20`, `T-11-15′`,
`T-11-33`, `T-11-43`, `T-11-56`) closes *because* the device reading remains recorded OPEN — those
threats forbid a fabricated passing reading, and `N-END-03` is `[ ]`. `T-11-08-04` is `accept`;
its human check is belt-and-braces, not the closure basis.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-28 | 133 rows (74 unique IDs) | 133 | 0 | gsd-security-auditor (State B, first audit; 19 rows closed by making a control fail) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer) — 100 mitigate, 33 accept, 0 transfer
- [x] Accepted risks documented in Accepted Risks Log — AR-11-01 … AR-11-05
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**What this sign-off does NOT claim.** 133 rows closed, but only **19 by making a control fail**
and ~37 by an empirical probe; the remaining ~77 were closed by reading, which ASVS L1 permits.
It does not cover the **4 outstanding `11-UAT.md` items** or the **2 behaviour-unverified items**
in `11-VERIFICATION.md` — the audit confirmed no threat's closure depends on them, but they remain
open on their own terms. It records rather than resolves the stale `ENDLESS-MODE.md` source
pointer (UAT item 4), the unbounded magnitude behind AR-11-04, and the uncapped `byMode.*` read
path inherited from phase 09.

**Approval:** verified 2026-09-28
