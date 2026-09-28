---
phase: "13"
slug: "achievements"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-29"
register_rows: 24
unique_ids: 16
---

# Phase 13 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

State B audit — no `13-SECURITY.md` existed, but the register was authored at plan time across
all five PLAN files. This audit therefore **verified mitigations** rather than inventing a
register. ASVS level 1, block on `high`.

**The register is NOT deduped by id.** All 24 rows appear, one per reference, because three ids
carry more than one threat and one id is reused for a threat that already had a different number
(see Finding 1). Phase 11's "74 unique threats" was a dedupe-by-id collapse of a 133-row register;
that is not repeated here.

**Verification exceeded L1.** L1 permits closing a threat by reading. **10 of 24 rows were closed
by making a control fail.** Each row states which method closed it, so this file records honestly
what was proven versus what was read. Evidence method: **M** = closed by making a control fail ·
**E** = closed by an empirical probe against the real code path · **R** = closed by reading.

All probe files (`tests/__audit_probe*.test.ts`, `src/services/achievements/__purity_probe.ts`)
were written and deleted within this audit. Post-audit gates, re-measured by the orchestrator:
`npm test` exit **0** at **112 files / 870 passed | 1 skipped (871)**, `npm run typecheck` exit 0,
`npm run lint` exit 0 at `✖ 3 problems (0 errors, 3 warnings)` — the measured baseline, unchanged.

> **Count correction, recorded rather than quietly applied.** The auditor reported
> `register_rows: 25` and a disposition split of `12 mitigate / 11 accept / 2 transfer`. The
> orchestrator enumerated the rows and measured **24 rows, 12 mitigate / 10 accept / 2 transfer**,
> 16 unique ids — plan 13-04 contributes no `T-13-SC` row, which is where the extra came from. The
> figures in this file are the measured ones. This is noted because an off-by-one in a threat count
> is the same species as Finding 1 below, and as phase 11's 74-vs-133 collapse: a register is only
> as good as the arithmetic over it.

---

## The posture this phase inherits

Stated, not re-derived, and **not reported as an open threat**:

- **There is no server, no account, no leaderboard and no store.** `PROJECT.md` rules the category
  out ("no backend in MVP", "offline-first product", "MVP must be fully playable without
  network"). An achievement is a local fact about one device's telemetry and it **guards nothing**
  — no asset, no currency, no entitlement. An unlock can be granted by hand on a rooted device and
  that is *accepted* (T-13-03 / T-13-04, inheriting AR-11-02 and AR-12-02).
- **AsyncStorage is plaintext.** `safeCounter` bounds a counter DOWNWARD but not upward. Measured
  again this audit: `bestScore`/`bricksBroken`/`bestWave`/`longestStreak` at `Number.MAX_VALUE`
  survive the read path **intact** and fire **7 of the 12** predicates. That is inside D-16's
  accepted tamper model (T-12-06 — the id phase 12 mis-cited as T-12-05 at four sites before
  repairing it; this phase cites **T-12-06** correctly at its one read site, verified below).

What this audit actually tested — the six things that are **not** accepted:

| # | Property | Verdict |
|---|---|---|
| 1 | Nothing may throw on a hostile blob | **holds** — 24 hostile blob shapes and 22 hostile snapshots, 0 throws, `status: 'ok'` throughout |
| 2 | A hostile blob yields FEWER achievements, never more | **holds** — 15 hostile snapshots → max **0** unlocks against a clean **11**; 0 over-reports |
| 3 | The collection is bounded on READ as well as write, drop-then-trim | **holds** — keep-first shipped; 12 real + 5 000 pad → 12 surviving with garbage FIRST *and* LAST |
| 4 | A corrupt achievements field degrades ALONE | **holds** — paired control, 10 sibling non-defaults proved first and byte-identical to a clean read |
| 5 | The id is minted only in the catalog; `parseBlob.ts` restates none | **holds** — all 12 ids grepped across `src/` + `app/`: zero occurrences outside `catalog.ts` |
| 6 | The display name reaching `<Text>` is catalog-authored | **holds** — host maps id → catalog `name`; layer boundary red-proved |

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| persisted blob → app | AsyncStorage is plaintext; on a rooted device the v4 blob is attacker-controllable. **The only externally-influenced input this phase reads.** | `telemetry.achievements.unlocked` (`{ id, at }[]`), plus every counter a predicate reads: `lifetime.*`, `byMode.*`, `endless.bestWave`, `daily.longestStreak` |
| stored achievement id → rendered `Text` | A stored string could otherwise reach a `Text` inside a 320px panel with no length bound | the `id` field of each stored unlock |
| `src/services` → `src/runtime` | A display string crosses here. `eslint.config.js` `boundaries/dependencies` is the ONLY mechanism holding it; no unit test observes it | `readonly string[]` of display names, into both result panels |
| memory blob ↔ freshly-hydrated disk blob | `mergeTelemetryBlobs` reconciles two independently-sanitized records; a claim from one must not attach to the other's id | whole `{ id, at }` entries |
| documentation → future contributor | An ops document that overstates a control is how a later phase inherits a gate that does not exist. This project has produced that failure four times | `docs/ops/ACHIEVEMENTS.md`, `13-VALIDATION.md`, the register itself |

---

## Threat Register

24 rows, one per `T-13-*` reference across the five PLAN files. The `@plan` suffix disambiguates
the reused ids. **Citations name symbols, not line numbers** — this repo's line-number citations
have drifted three times.

| Threat ID | Category | Component | Severity | Disposition | Mitigation & how it was established | Status |
|-----------|----------|-----------|----------|-------------|--------------------------------------|--------|
| T-13-01 @13-01 | Tampering | stored unlock id → `ResultOverlay` `Text` | high | mitigate | **M + E** — `publishUnlockedAchievements` (`PlayingHost.tsx`) walks `ACHIEVEMENT_CATALOG` and emits `a.name`, testing the returned set for membership; the stored string is never forwarded. **M**: relaxing `isKnownAchievementId` to `typeof raw === 'string'` reds **4** cases across both stores and the parser. **E**: a 4 000-char id, `__proto__`, `toString` and `<Text>evil</Text>` are all dropped and no prefix of any survives anywhere in the parsed blob. `numberOfLines={1}` is the weaker backstop and is recorded as such, never as the gate. | closed |
| T-13-02 @13-01 | Tampering | `telemetry.achievements.unlocked` size, WRITE side | medium | mitigate | **E** — `mergeAchievementUnlocks` and the record merge in `telemetry.ts` both `slice(0, ACHIEVEMENT_UNLOCK_BOUND)` (64, `types.ts`). Measured: 5 000 ids through the write path → exactly **64** stored. | closed |
| T-13-03 @13-01 | Tampering | threshold predicates over `safeCounter`-bounded fields | low | **accept** | **E** — the acceptance is now measured at its exact boundary. `Number.MAX_VALUE` survives the read path intact and fires **7/12** predicates. By contrast `1e999`→`Infinity`, JSON `null`, a negative and a string each fire **0** — `counter` folds them to 0 and `isGenuineZero` rejects them. So what is accepted is a *plausible large finite hand-written value*, not "any garbage". → **AR-13-01** | closed (accepted) |
| T-13-04 @13-01 | Tampering | `longestStreak` / `totalDaysPlayed` read by future catalog entries | low | **accept** | **R** — no catalog entry in plan 13-01 read either field; 13-02 is where the first reader lands and it restates the row. → **AR-13-02** | closed (accepted) |
| T-13-05 @13-01 | Elevation of Privilege | the achievements write inside `recordRunEnd` | high | mitigate | **M** — the block sits after every `args.mode === …` gate in BOTH hand-mirrored stores. Planting `blob.bestByLevel[args.levelId]` and `blob.bestScore = …` inside it emits `TS2339: Property 'levelId' does not exist on type 'RecordRunEndArgs'` ×2 plus `TS7053` ×2. **The firewall is the compiler.** Runtime half: the *touches no campaign state* case, asserted separately per store with a pre-seeded non-default. | closed |
| T-13-06 @13-01 | Denial of Service | a throwing predicate on the run-end path | medium | mitigate | **E** — `holds` in `evaluate.ts` wraps each call in `try`/`catch` and tests `=== true`, not truthiness. Measured against a hostile catalog: a throwing predicate, one returning `1`, one returning `'yes'`, a `null` predicate, a `null` entry and a non-string id are **all** skipped; only the genuinely qualifying entry returns. Under-reporting direction. | closed |
| T-13-SC @13-01 | Tampering (supply chain) | npm dependency surface | — | **accept** | **E** — `git diff` over the phase-13 range is **empty for `package-lock.json`**: zero dependency change, no install ran, no registry was contacted. `package.json` carries **exactly one changed line** — `scripts.test` gained `&& node scripts/assert-purity.mjs`, the runner committed in this same pass to close the auditor's own finding. **The auditor recorded this row as "not one line, not even a script" and the orchestrator then made that false in the act of closing Finding 2; the wording is corrected here rather than left standing.** The dependency surface — which is what this threat is about — is untouched. → **AR-13-05** | closed (accepted) |
| T-13-03 @13-02 | Tampering | the twelve threshold predicates | low | **accept** | **E** — restated at the point where all twelve thresholds land. Same measurement as T-13-03 @13-01; the total readers' block comment in `catalog.ts` names the upward-unbounded counter at the site. → **AR-13-01** | closed (accepted) |
| T-13-04 @13-02 | Tampering | `daily.longestStreak`, read by entry 12 | low | **accept** | **R** — `daily-streak-7`'s JSDoc names the accepted model **at the read site** and cites **T-12-06**, which is the correct id (phase 12's four-site T-12-05 mis-citation did **not** recur). It also records the rejected alternative — deriving the streak from the trimmed history, which would read a 500-day streak as 400. → **AR-13-02** | closed (accepted) |
| T-13-07 @13-02 | Denial of Service | a predicate iterating an attacker-grown `byMode` map | low | **accept** | **E** — `valuesOf` in `catalog.ts` names WINDOWS #27 at the site and drops non-object cells. Entries 7, 8, 10 and 11 iterate the maps once per run end, never per frame. Measured: 200 000 hostile entries through `parseProgressResult` complete in **36 ms**. Capping the map is #27's fix, not this phase's. **This is the same threat 13-05 re-filed as T-13-02 — see Finding 1.** → **AR-13-04** | closed (accepted) |
| T-13-SC @13-02 | Tampering (supply chain) | npm dependency surface | — | **accept** | **E** — same measurement: `package-lock.json` untouched across the phase range. → **AR-13-05** | closed (accepted) |
| T-13-01 @13-03 | Tampering | `sanitizeAchievementUnlock` — the stored id | high | mitigate | **M** — `isKnownAchievementId` (imported from the module that MINTS the ids) gates the entry; `KNOWN_IDS` is **derived** at module load from `ACHIEVEMENT_CATALOG.map(a => a.id)`, never hand-written. **Verified structurally**: each of the 12 ids grepped across `src/` and `app/` returns **zero** occurrences outside `catalog.ts` — the parser restates nothing. **M**: relaxing the predicate reds 4 cases. Case-sensitive and whitespace-exact (`'BRICKS-1000'` and `'bricks-1000 '` both dropped). | closed |
| T-13-02 @13-03 | Denial of Service | `sanitizeAchievementRecord` — size, READ side | medium | mitigate | **M + E** — order is **drop → de-duplicate (earliest wins) → bound**, and `slice(0, ACHIEVEMENT_UNLOCK_BOUND)` is **keep-first** (13-03's deviation from the plan's `slice(-N)`; keep-first is what ships, matching the two write sites, because an unlock is permanent under D-17). **M**: moving the bound before the drop loop reds **3** cases across both stores and the parser. **E**: the arrangement that actually discriminates — 12 real ids + 5 000 pad with garbage **LAST** → 12 surviving, and garbage **FIRST** → 12 surviving. 200 000 entries → bounded, 36 ms, no exhaustion. | closed |
| T-13-08 @13-03 | Tampering | `mergeAchievementRecords` — timestamp provenance | medium | mitigate | **E** — whole `{ id, at }` entries are keyed into a `Map` and merged as units; earliest `at` wins. On read, three duplicates of one id (`at` 5000/100/9999) collapse to a single entry at **100**, and the losing timestamps appear **nowhere** in the record (a containment-only assertion would pass against an incoming-wins copy). Across a blob merge: `bricks-1000`→100, `combo-25`→777, `rally-60`→55 — earliest per id, disjoint ids kept, no evidence crossed. No `assert-*.mjs` guards this and none is claimed (WINDOWS #26). | closed |
| T-13-09 @13-03 | Tampering | `sanitizeAchievementUnlock` — the stored timestamp | low | **accept** | **E** — the two-rules-in-one-sanitizer asymmetry verified in both directions: 8 malformed `at` values (`'banana'`, `-5`, `null`, `{}`, `[]`, `1e999`, …) all **default to 0 and KEEP the entry**; and an arbitrary finite non-negative `at` — including year-2100 and `MAX_SAFE_INTEGER` — is accepted verbatim. Dropping would un-earn an achievement the player earned (D-17/D-21); the only consumer is Phase 14's recency order. → **AR-13-03** | closed (accepted) |
| T-13-SC @13-03 | Tampering (supply chain) | npm dependency surface | — | **accept** | **E** — same measurement: `package-lock.json` untouched across the phase range. → **AR-13-05** | closed (accepted) |
| T-13-10 @13-04 | Denial of Service | `achievementLines` → panel height | high | mitigate | **M ×3** — the constant CLAMPS: `return laid.slice(0, ACHIEVEMENT_LINES_MAX)` in `achievementLines.ts`. (1) Deleting the slice reds exactly 1 case — measured across the **whole suite**, `1 failed | 869 passed`. (2) Setting the constant to **1** reds **11** cases in **3** files (8 `achievementLines` / 2 `ResultOverlay.achievements` / 1 `DailyResultOverlay`), independently reproducing the verifier's corrected figure. (3) **The instrument itself was tested**: the guard is a source scan, so the pattern was planted in a `//` comment *and* a `/* */` comment with the real slice removed — the scan **still reds**, proving it strips comments before matching. This was the code review's WR-02, fixed in `99afd8b`. | closed |
| T-13-11 @13-04 | Spoofing | a stored string rendered as an achievement name | high | mitigate | **M** — both panels' props are `readonly string[]` of DISPLAY names (`unlockedAchievements?: readonly string[]`, defaulting to `[]`). `grep -rnE "^import .*(services\|storage)" src/runtime/` → **0**. **M**: planting a `services/achievements` import into `achievementLines.ts` yields `error There is no policy allowing dependencies from elements of type "runtime" to elements of type "services"  boundaries/dependencies`. As the plan requires, **no unit test observes the layer rule and nothing here claims one does** — `npm run lint` is the only mechanism. | closed |
| T-13-12 @13-04 | Repudiation | a suppression that fires for the wrong reason | medium | mitigate | **M + R** — every absence case carries a positive control in the same case, and `'mid'` is the paired opposite of `'start'`. Incidentally re-proved this audit: the constant→1 mutation red the case *"a mid-run wave-build failure saved the run, so the block IS present"*, i.e. the positive control asserts real rendered content and moves when content moves — it cannot pass on "the component rendered nothing". | closed |
| T-13-13 @13-05 | Repudiation | `docs/ops/ACHIEVEMENTS.md` and `13-VALIDATION.md` | high | mitigate | **E + R** — every claimed control names its enforcing command, and where nothing enforces, the document says so. Verified item by item: the ops doc states *"`npm run lint` enforces that block but does not observe whether it still exists"* and names the `__purity_probe` gate as the evidence for D-03/D-20; **this audit re-ran the probe and measured `purity_probe_errors=5`** (probe deleted afterwards), so the block is live and the document's attribution is correct. The three-site table marks `sanitizeTelemetry` **"NO — absent from that list"**, i.e. the parser is *not* compiler-forced. Accepted cost 8 states `assert-streak-evidence.mjs` does **not** cover the achievements merge, citing WINDOWS #26 — and the script's own output confirms it names only `resolveStreakStart` / `reconcileStreakStart`. `13-VALIDATION.md` names `boundaries/dependencies` as *"the only thing"* stopping the layer violation, ticks only true boxes, and leaves `status: draft` with a reason. See Finding 2 for the one durability gap. | closed |
| T-13-14 @13-05 | Tampering | `ACHIEVEMENT_LINES_MAX` on an unverified inset | high | mitigate | **E + R** — the mitigation is *stating the assumption rather than papering over it*, and it is present at all three required places. `achievementLines.ts`'s own JSDoc: *"The 26px of spare rests on a bottom safe-area inset of zero, which is UNVERIFIED."* WINDOWS #28 is **open**, carries the reproduction (320×568 via Display Zoom), demands the inset be **read** not inferred, and names the blast radius — **which this audit independently re-measured as 11 across 3 files, matching #28's corrected figure**. The ops doc repeats it in the measured-arithmetic section and Limit 2. The phase **ships with the assumption outstanding and says so**; the reading is a human item, not a missing control. | closed (residual named) |
| T-13-02 @13-05 | Denial of Service | `sanitizeAggregateMap` | medium | **transfer** | **R + E** — transfer target verified present and open: WINDOWS **#27** (provenance `ddbbec3`, phase 09-02 — inherited, not a phase-13 regression), plus `docs/ops/ACHIEVEMENTS.md` Accepted cost 4, which states explicitly that **the achievements bound does not close #27** — different collection, different file. **E**: the amplification is real but contained — 200 000 keys parse in 36 ms, and a `__proto__`-keyed `byMode` cell (code review IN-05, also pre-phase-13) grants **zero** achievements and leaves `Object.prototype` untouched, because `valuesOf`'s `Object.values` never reads the prototype chain. **This row's id is wrong — see Finding 1; the correct id is T-13-07.** | closed (transferred) |
| T-13-15 @13-05 | Elevation of Privilege | Dynamic Type clipping `Menu` off the panel | medium | **transfer** | **R** — transfer target verified present, **open, and not marked fixed**: WINDOWS **#29**, recorded as D-18 with a due point of **Phase 14**, which owns the three components `maxFontSizeMultiplier` would touch. Ops doc Accepted cost 7 carries the arithmetic (ceiling 1.433 → 1.102 against iOS xLarge ≈1.118) and states the clipping is the **expected** outcome to confirm, not a new defect to file. | closed (transferred) |
| T-13-SC @13-05 | Tampering (supply chain) | npm dependency surface | — | **accept** | **E** — same measurement: `package-lock.json` untouched, zero packages added anywhere in the phase. `package.json`'s one changed line is this pass's `assert-purity.mjs` runner. → **AR-13-05** | closed (accepted) |

*Status: closed · closed (accepted) · closed (transferred) · open · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` (`high`) count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party or another owner)*

**Measured split: 12 mitigate · 10 accept · 2 transfer = 24.** Plan 13-04 contributes no
`T-13-SC` row.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Inherits | Accepted By | Date |
|---------|------------|-----------|----------|-------------|------|
| AR-13-01 | `T-13-03`@13-01, `T-13-03`@13-02 | **A tampered counter unlocks permanently.** `safeCounter` bounds downward only; `Number.MAX_VALUE` survives the read path intact and fires 7 of 12 predicates. Under D-17 the unlock never goes away. No server, no leaderboard, no asset — an offline single-player achievement has no adversary but the player. Measured boundary: only *plausible finite* values launder; `Infinity`, `NaN`, negatives and strings all fire nothing. | **AR-11-02**, **AR-12-02** (T-12-06) | Locked at discuss-phase (D-16 / D-17); confirmed and bounded by audit | 2026-09-29 |
| AR-13-02 | `T-13-04`@13-01, `T-13-04`@13-02 | **`daily.longestStreak` is read AS STORED and never recomputed.** Hand-writable on a rooted device. The rejected alternative is worse, not safer: deriving the streak from the 400-entry trimmed history makes a real 500-day streak read as 400 — the exact failure phase 12 re-opened D-16 mid-phase to eliminate. Named at the read site in `daily-streak-7`'s JSDoc, citing T-12-06. | **AR-12-02** (T-12-06), verbatim per D-16 | Locked at discuss-phase (D-16); audit confirmed the citation is correct | 2026-09-29 |
| AR-13-03 | `T-13-09`@13-03 | **A hand-written unlock timestamp is accepted** if finite and non-negative, so a tampered blob can claim an unlock happened at an arbitrary past or future moment (measured: year 2100 and `MAX_SAFE_INTEGER` both accepted verbatim). The only consumer is Phase 14's recency ORDER. Dropping the entry would un-earn an achievement the player did earn (D-17/D-21), which is strictly worse. | **AR-11-02**, **AR-12-02** | Locked at plan time (D-21) | 2026-09-29 |
| AR-13-04 | `T-13-07`@13-02 (re-filed by 13-05 as `T-13-02` — Finding 1) | **Four predicates iterate an uncapped `byMode` map.** Entries 7, 8, 10 and 11 make WINDOWS #27 slightly more expensive to exploit and do not create it. Accepted rather than mitigated: one linear pass over an already-parsed in-memory object, once when a run ends, never per frame — measured at 36 ms for 200 000 entries. Capping the map is #27's fix and not this phase's to take. | inherited from phase 09-02 (`ddbbec3`) via WINDOWS #27 | Locked at plan time; audit measured the cost | 2026-09-29 |
| AR-13-05 | `T-13-SC` ×4 (plans 13-01, 13-02, 13-03, 13-05) | **No package-manager install ran anywhere in this phase and none was permitted.** Verified as an empty `git diff` for `package-lock.json` across the entire phase range — zero dependencies added, removed or moved, no registry contacted. `package.json` changed by one line (`scripts.test` gained the `assert-purity.mjs` runner); that is a local script, not a dependency, and the lock file proves it pulled nothing. There is no install task for a package-legitimacy gate to guard and no such gate is claimed. If a later plan proposes a package: pin via `npx expo install`, never bare `npm install`. | — | Locked at plan time (`13-UI-SPEC.md` § Registry Safety) | 2026-09-29 |

### Inherited accepted risks this phase relies on and does not re-open

- **AR-11-02** (`11-SECURITY.md`) — local record tampering. Offline single-player, plaintext
  AsyncStorage, no server to validate against, no leaderboard to protect.
- **AR-12-02** / **T-12-06** (`12-SECURITY.md`) — a player editing the blob. D-16 inherits this
  disposition verbatim. **Note for future readers:** phase 12 mis-cited this as **T-12-05** at four
  shipped sites before repairing it; T-12-05 is *seed predictability* and does not address
  tampering. Phase 13 cites **T-12-06** correctly at its one read site (`daily-streak-7`'s JSDoc)
  — the defect did not recur.

---

## Register-Accuracy Findings

No mitigation is missing. All three findings are **traceability defects** — the species that bit
this phase seven times across five plans and four times in the code review, and that matters
because the next reader trusts the citation and stops looking.

| # | Finding | Disposition |
|---|---------|-------------|
| 1 | **`T-13-02` is used for three different threats, and the third use is a collision, not a restatement.** 13-01's T-13-02 is the unlock collection's WRITE bound; 13-03's is the same collection's READ bound — a legitimate two-sided pair. But **13-05's T-13-02 is `sanitizeAggregateMap`**, a different collection in a different file, whose threat 13-02 had already registered as **T-13-07** (`accept`). 13-05 renumbered it to an occupied id *and* changed its disposition to `transfer`. This is phase 12's T-12-05/T-12-06 defect in a new place, caught before it could mislead. **The correct id for that row is `T-13-07`.** Verified by the orchestrator against both plan files: the two rows describe the same `sanitizeAggregateMap` uncapped-on-read threat and both point at WINDOWS #27, so nothing is unguarded. | Recorded here. The register lives in PLAN files, which are historical artifacts; **this file is the correction of record.** A reader looking up "T-13-02" must expect three threats. |
| 2 | **T-13-13's `runtime ↛ services` statement lives only in the phase-local `13-VALIDATION.md`, not in the durable ops document.** `13-05-SUMMARY.md` states that "**both** documents name the ENFORCING command for every control they claim," specifically naming lint as the only observer of the layer rule. That sentence is true of `13-VALIDATION.md` (which calls `boundaries/dependencies` "the only thing" stopping the import) and vacuously true of `docs/ops/ACHIEVEMENTS.md`, which never mentions the layer rule at all — so it claims no control it fails to name, and T-13-13's literal rule is satisfied. But the ops document is the artifact a future contributor reads; the planning file is history. | **Closed by the orchestrator** — the fact is now written into the ops document's purity section, one sentence from where it already makes the same distinction for the `__purity_probe` gate. |
| 3 | **The auditor's own row and disposition counts were off by one** (25 rows / 11 accept against a measured 24 / 10). Corrected in the frontmatter and in the register's footer, and recorded rather than silently applied — see the note at the top of this file. | Recorded and corrected. |

### Notes on controls that are honest about their own reach

Recorded because this phase's recurring failure was a control naming an enforcement it does not
perform, and in each of these cases it **does not**:

- **The `ACHIEVEMENT_LINES_MAX` source scan strips comments before matching.** Verified by planting
  the exact pattern in a `//` comment *and* a `/* */` comment with the real slice deleted — the
  scan still reds. Plan 13-01 shipped the opposite defect (a `numberOfLines` grep that counted its
  own explanation) and this instrument is the lesson applied.
- **`catalog.ts`'s prose deliberately avoids the `byMode['level-03']` map-index form**, because a
  text-level check for "no predicate names a `byMode` key literally" cannot tell a paragraph from
  an AST node. The comment says so at the site.
- **The `__purity_probe` gate now HAS a committed runner.** The auditor found it had none — the
  command existed only inside `13-01-PLAN.md`, so the sole observer of the D-03/D-20 purity block's
  *existence* had to be reconstructed from a planning artifact, the same shape as phase 12's
  Finding 1. Closed by the orchestrator as `scripts/assert-purity.mjs`, wired into `npm test` as
  the sixth `assert-*.mjs`. It red-proofs itself: it asserts the probe yields **5** eslint errors
  and would fail at 0 (block deleted or its glob moved) or 4 (a selector dropped).
- **The `numberOfLines={1}` backstop is pinned only by one-shot per-file plan greps** (asserting 1
  in `ResultOverlay.tsx` and 1 in `DailyResultOverlay.tsx` — both still correct at HEAD, verified).
  Nothing re-runs them. Acceptable because T-13-01 explicitly names this the *weaker backstop* and
  not the gate; the gate is the catalog mapping, which is mutation-proved.

### Code-review Info findings with a security dimension, re-measured

- **IN-05 — a stored `__proto__` key in `byMode`** (pre-phase-13, phase 09, WINDOWS #27).
  Independently confirmed contained: a `__proto__`-keyed campaign cell claiming
  `runsWon: 9999, livesLost: 0` grants **zero** achievements — not `flawless-clear`, not
  `campaign-25`, not `endless-runs-20` — and `Object.prototype` is untouched. `valuesOf`'s
  `Object.values` never walks the prototype chain.
- **IN-04 — `mergeAchievementUnlocks` persists ids without `isKnownAchievementId`.** Confirmed
  real: the write path stores `'not-a-real-id'` verbatim, and 5 000 junk ids reach the stored
  collection capped at 64. It is **not exploitable**, and the layering is why: the only production
  caller passes `newlyUnlockedAchievements` output, which is catalog-derived; the host maps ids
  through `ACHIEVEMENT_CATALOG` before any render; and the next cold read drops every one of them
  (measured: write 5 000 → 64 stored → **0** after a cold read). The read-side gate is the one
  that holds, which is the declared design.

---

## WINDOWS #35 / code review WR-03 — does it have a security dimension?

**Plainly: no.** An unlock earned on an `abandoned` run is persisted and never announced —
`handleMenuPress` records the run (which evaluates and stores the unlock) then `onMenu()`
navigates away, and D-02's delta is one-shot. The verifier quantified **7 of the 12 entries** as
crossable that way, in all three modes, because `mergeRunIntoTelemetry` increments `runsPlayed`
unconditionally.

Assessed against each STRIDE category and found empty:

- **Integrity** — none. The unlock *is* stored, correctly, with a real timestamp; D-17's one-way
  rule holds. Nothing is lost and nothing is wrong in the blob.
- **Availability** — none. No throw, no unbounded growth, no path degraded.
- **Repudiation** — none in the security sense. There is no counterparty and no dispute to
  adjudicate; the player is the only party and the record is accurate.
- **Direction of failure** — it **under-reports to the player**, which is the safe direction this
  entire phase deliberately chose (`evaluate.ts`, `catalog.ts`'s total readers, `achievementLines`,
  every v4 read path). An adversary — who is the device owner — gains nothing by abandoning.

It is a **correctness/UX gap**: the phase goal's verb is "tells them", and in this state it does
not. Tracked as WINDOWS #35 (open) and `docs/ops/ACHIEVEMENTS.md` Limit 2b, deferred to Phase 14
as an **inherited obligation on that phase's discuss/plan stage** — explicitly not a mitigation
Phase 14 already provides, since its SC-3 as written would leave an abandon-earned unlock
indistinguishable. It is correctly excluded from this register and **does not count toward
`threats_open`**.

---

## Security Audit Trail

| Audit Date | Register Rows | Unique IDs | Closed | Open | Run By |
|------------|---------------|------------|--------|------|--------|
| 2026-09-29 | 24 | 16 | 24 | 0 | gsd-security-auditor (State B, first audit; 10 rows closed by making a control fail). Row/disposition counts, Finding 1's id collision and the supply-chain range diff independently re-measured by the orchestrator; Finding 2 closed and the `__purity_probe` runner committed in the same pass. |

---

## Sign-Off

- [x] All 24 rows have a disposition — 12 mitigate, 10 accept, 2 transfer
- [x] Accepted risks documented — AR-13-01 … AR-13-05, with AR-11-02 / AR-12-02 / T-12-06 inheritance stated
- [x] Transfer targets verified present **and open** — WINDOWS #27, WINDOWS #29
- [x] Every `T-13-*` id cited in this file resolves to the threat intended; the one that does not is Finding 1
- [x] `threats_open: 0` confirmed at `block_on: high`
- [x] Implementation unmodified by the audit itself — every probe reverted; the only source change in this pass is the `assert-purity.mjs` runner closing the auditor's own finding
- [x] `status: verified` set in frontmatter

**What this sign-off does NOT claim.** It covers the 24-row register authored at plan time,
verified against the implementation at HEAD. It does **not** cover the phase's **human-only
items**, none of which is reachable by any test in this repository: jsdom performs no layout and
supplies no safe-area insets, no physical device was available, and the iOS Simulator is not
acceptable evidence for an inset claim. **WINDOWS #28 in particular — the bottom safe-area inset
that the phase's central number assumes to be zero — remains an unverified assumption, and
`ACHIEVEMENT_LINES_MAX` must drop to 1 with 11 tests across 3 files if it is not.** A passing
`npm test` is not evidence for any part of that. It does not re-open the five accepted risks, it
does not close WINDOWS #27 or #29, and it records rather than resolves WINDOWS #35.

**Approval:** verified 2026-09-29
