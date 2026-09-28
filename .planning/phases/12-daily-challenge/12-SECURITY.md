---
phase: "12"
slug: "daily-challenge"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-28"
---

# Phase 12 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

State B audit — the register was authored at plan time across all six PLAN files
(`register_authored_at_plan_time: true`), so this audit **verified mitigations** rather than
building a register retroactively. ASVS level 1, block on `high`.

**Verification exceeded L1.** L1 permits closing a threat by reading. 8 of 29 were closed by
**making a control fail** — mutating the implementation, observing the specific tests or the
compiler go red, and reverting. Each row below says which method closed it, so the file records
honestly what was proven versus what was read.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| persisted blob → app | AsyncStorage is plaintext; on a rooted or jailbroken device the v4 blob is attacker-controllable. **The only externally-influenced input this phase reads.** | The whole v4 `ProgressBlob`: daily history, the three D-16 scalars, campaign bests, stars, unlocks, endless record |
| device wall clock → app | The clock is user-settable and there is no trusted time source — PROJECT.md rules out a server | `Date.now()` on the daily start path and in the countdown |
| `__DEV__` gate → production build | A development-only entry point must not survive the production bundle | The temporary `Daily` dev-row control (deleted wholesale by Phase 14) |
| documentation → future implementer | A written policy a later reader trusts without re-deriving it | `docs/ops/DAILY-CHALLENGE.md`, the threat register itself |

---

## Threat Register

`T-12-03` was removed by plan 12-03 as a duplicate of `T-12-11`; the gap in the numbering is
expected. Evidence method: **M** = closed by making a control fail · **E** = closed by an
empirical probe against the real code path · **R** = closed by reading.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-12-01 | Tampering | `byMode.daily` map key selection, both stores | high | mitigate | **M** — per-date key at `memoryStore.ts:144` reds 2 cases in `tests/storage.daily-firewall.test.ts`, memory-store block only, sibling green; repeated independently at `asyncStorageStore.ts:424`. Stores gated separately. *Register cites an absent control — see Finding 1.* | closed |
| T-12-02 | Elevation of Privilege | `recordRunEnd` campaign write path | high | mitigate | **M** — widening the store's mode gate to admit `daily` emits `TS2339: Property 'levelId' does not exist on type '{ mode: "daily"; … }'` ×3 plus `TS7053`. The firewall is the compiler. | closed |
| T-12-04 | Information Disclosure | the `__DEV__` `Daily` entry | medium | mitigate | **R** — the whole dev row, including the `Daily` Pressable, sits inside `typeof __DEV__ !== 'undefined' && __DEV__` (`PlayingHost.tsx:2535`), the required form. | closed |
| T-12-05 | Spoofing | date-derived seed predictability | low | **accept** | **R** — predictability is the feature. `rng.ts` states the generator is not a CSPRNG and must never back a token, nonce, key or session id; nothing in this phase does. | closed (accepted) |
| T-12-06 | Repudiation | a player editing the blob to fabricate a streak | low | **accept** | **R** — offline single-player, no server to validate against, no leaderboard to protect (PROJECT.md). **This is the disposition the three declared residuals rest on.** | closed (accepted) |
| T-12-07 | Elevation of Privilege | daily write reaching campaign state | high | mitigate | **M** — injecting `blob.bestScore = Math.max(...)` into each store's daily block reds the byte-identity case **and** its landed-write companion, per store. Absence cannot pass trivially. | closed |
| T-12-08 | Denial of Service (via Tampering) | daily aggregate-map cardinality | high | mitigate | **M** — the 40-date cardinality alarm reds in both stores under a per-date key. | closed |
| T-12-09 | Spoofing | locale-derived date key (SC-1) | high | mitigate | **M** — appending `Intl.`, `toISOString()`, `toLocaleDateString()` and `86_400_000` to `src/services/daily/streak.ts` yields `✖ 5 problems (5 errors)`, all four banned primitives firing from `eslint.config.js:176-209`. *Real control differs from the register — Finding 3.* | closed |
| T-12-10 | Denial of Service | `process.env.TZ` leaking across vitest workers | medium | mitigate | **R** — all three TZ-pinned specs capture `ORIG_TZ` at module scope and restore in `afterEach`. | closed |
| T-12-11 | Denial of Service | unbounded daily history on read | high | mitigate | **E** — 10 000-entry hostile history through `parseProgressResult` → 400 surviving. | closed |
| T-12-12 | Tampering | the D-16 scalars | medium | mitigate | **E** — `longestStreak: 'banana'` → 0; `totalDaysPlayed: -5` → 0. `safeCounter` is monotone non-increasing and can never raise a value. | closed |
| T-12-13 | Tampering | malformed stored date keys | high | mitigate | **E** — `'not-a-date'` and `'2026-13-45'` both dropped by `isValidDateKey` on the read path, integer range checks with no parse round trip. | closed |
| T-12-14 | Repudiation | losing dates on a two-blob reconcile | medium | mitigate | **R** — shipped `max(a, b, \|union\|)` is **≥** a pure union, so it cannot lose dates. *Register wording hides the `max` term — Finding 4.* | closed |
| T-12-15 | Denial of Service | oversized date key | high | mitigate | **E** — a 4 000-char key is dropped and no 32-char prefix of it survives anywhere in the record. | closed |
| T-12-16 | Denial of Service | trim-before-drop on read | high | mitigate | **E** — built the arrangement that actually discriminates (garbage **last**): 400 real + 40 garbage → 400 surviving. Trim-before-drop would have yielded 360. | closed |
| T-12-17 | Tampering | daily corruption bleeding into campaign | high | mitigate | **E + control** — a fully corrupt daily record parses `status: ok` with `bestScore`, `bestByLevel`, `endless` and `lifetime` all intact; re-run with a clean daily record proves the one field that differs is the unlocked sanitizer's own pre-existing rule, not daily bleed. | closed |
| T-12-18 | Tampering | a watermark or anti-cheat branch creeping in | medium | mitigate | **E** — comment-stripped scan of `src/services/daily/**`, `telemetry.ts` and `parseBlob.ts` for `watermark\|highestDate\|tamper\|suspicious` → **0** in code. | closed |
| T-12-19 | Repudiation | a read failure handing a second attempt | low | **accept** | **R** — documented as accepted cost 2 and in `sanitizeDailyHistoryEntry`'s own doc comment. | closed (accepted) |
| T-12-20 | Elevation of Privilege | `src/runtime` reaching `src/services` | high | mitigate | **M** — adding a `src/services/daily` import to `DailyResultOverlay.tsx` yields `error  There is no policy allowing dependencies from elements of type "runtime" to elements of type "services"`. The overlay's real import list is exactly two. | closed |
| T-12-21 | Spoofing | a wall-clock nonce on the daily start path | high | mitigate | **R** — Retry routes to `startDailyRun`, which calls `generate(dateKey, DAILY_DIFFICULTY)`; the board is a pure function of the date key. Same-fingerprint case shipped. | closed |
| T-12-22 | Information Disclosure | campaign values reaching the daily panel | high | mitigate | **R** — the panel's `Props` body is 12 fields, all daily-scoped: no per-level best, no campaign PB, no endless record, no star count. SC-5 checkable at the signature. | closed |
| T-12-23 | Denial of Service | the 60-second countdown interval | medium | mitigate | **R** — one `setInterval(…, 60_000)` gated on `dailyPanelOpen`, cleared in cleanup, body is a fresh clock read rather than a decrement. No per-second timer. | closed |
| T-12-24 | Tampering | a second `AppState` subscription / auto-resume | medium | mitigate | **E** — comment-stripped: exactly **1** `AppState.addEventListener` in `src/`+`app/`; the `active` branch scans **0** physics, accumulator or phase handles. | closed |
| T-12-25 | Denial of Service | `LevelErrorOverlay` on a daily board failure | medium | mitigate | **E** — comment-stripped `LevelErrorOverlay` occurrences in code: **0**. The board-failure variant renders Retry then Menu. | closed |
| T-12-26 | Repudiation | accepted costs not written down | medium | mitigate | **R** — all three required decisions present as numbered items. *Numbering defect — Finding 5, now fixed.* | closed |
| T-12-27 | Spoofing | a `-t` gate that cannot fail | high | mitigate | **E** — reproduced: `npx vitest run tests/daily.record.test.ts -t "zzz-no-such-case"` prints `Tests 25 skipped (25)` and **exits 0**. Recorded in `12-VALIDATION.md`; the three layout backstops carry device steps. | closed |
| T-12-28 | Repudiation | a sign-off claiming more than was measured | medium | mitigate | **R** — every sign-off line carries its measurement, and a *"What this sign-off does NOT claim"* block names the eight open human items. | closed |
| T-12-29 | Information Disclosure | a documented limit being deleted rather than narrowed | medium | mitigate | **R** — the ops doc says the paragraph "should be **narrowed, not deleted**", repeated in WINDOWS #22. | closed |
| T-12-SC | Tampering (supply chain) | npm dependency surface | high | mitigate | **E** — `git diff 2723b02..HEAD -- package-lock.json` is **empty**. `package.json` differs by 2 lines, both in `scripts` (the fifth assert script and its alias). No dependency key moved. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-12-01 | T-12-05 | Date-derived seed predictability **is the feature** — every device must draw the same board for the same date (SC-1). The generator is explicitly not a CSPRNG and backs no token, nonce, key or session id. | Locked at discuss-phase (D-11); confirmed by audit | 2026-09-28 |
| AR-12-02 | T-12-06 | Blob tampering. Offline single-player, plaintext AsyncStorage, no server to validate against and no leaderboard to protect (PROJECT.md). D-05 rejects a monotonic watermark for the same reason. **The three declared streak residuals below all rest on this disposition.** | Locked at discuss-phase (D-05); audit confirmed the corruption/tampering line | 2026-09-28 |
| AR-12-03 | T-12-19 | A read failure treats the date as having no stored result — the *playable* direction — so a transient fault can hand a player a second attempt. The alternative fails closed and costs an honest player their day. | Locked at plan time; documented as accepted cost 2 | 2026-09-28 |

### The three streak residuals, and why they sit under AR-12-02

The audit was asked to confirm or reject this placement and **confirmed** it, on the ground that
corruption *drops* evidence and cannot raise a counter — so an ungenuine value must have been
written by hand:

1. `totalDaysPlayed` merges by `max(a, b, |union|)` with no evidence test, so a hand-written count
   launders onto an honest record. Not fenced because `max` is the only reason a 450-day player's
   count survives a 400-entry window — D-16's whole purpose. Fencing it first requires deciding
   whether a lifetime counter may cross devices, which is a design decision.
2. `longestStreak` merges by max with no evidence test at all — 2 dates beside
   `longestStreak: 3000` reads 3000 with no merge needed.
3. `endedStreakLength` (D-17) is deliberately unfenced, and is correct **by construction**: it
   reads no carried scalar, so there is nothing to launder.

**Fuzzing behind that judgement** — 8 000 hostile trials against records with random gaps, garbage
keys and counters to 5 000: single-record 4 000 trials, **0 violations**; merge 2 000 pairs,
**0 violations**; laundering 2 000 pairs, merged never exceeded `max(a, b, |union|)`, worst excess
**0**. All five historical escapes measured individually and closed: 2 dates + `totalDaysPlayed: 2`
→ **2** (was 2463); 3 dates + 3000 → **3** (was 2463); a legitimate 450-day player merged with a
hostile 2-date copy → **450** (was 2709).

The line the phase drew is the right one: the **corruption-reachable** path into the one-way
`longestStreak` — sanitizer drops evidence, window floors, carried claim admitted, inflated streak
persisted — was treated as unacceptable and closed structurally. Only the directly-hand-written
path remains, and that is what AR-12-02 accepts.

---

## Register-Accuracy Findings

No control is missing; every one of these is a **traceability defect** — a register or a comment
naming a control that is absent, weaker, or differently located than the real one. That species
bit this phase three separate times, and it matters because the next reader trusts the citation
and stops looking.

| # | Finding | Disposition |
|---|---------|-------------|
| 1 | **T-12-01's `mitigation_plan` cites a control that does not exist** — a "comment-stripped `telemetryKey`-region gate". `grep -rn telemetryKey` outside the two store bodies returns only planning documents. It was a one-shot PLAN.md verify-block command that nothing re-runs. Commit `a12bee2` corrected the two stores' comments; the register itself was never corrected. The threat is genuinely closed, by `tests/storage.daily-firewall.test.ts`. | Recorded here. The register lives in PLAN files, which are historical artifacts; this file is the correction of record. |
| 2 | **The accepted-risk ID was wrong at four shipped sites.** `streak.ts`, two places in `docs/ops/DAILY-CHALLENGE.md`, and WINDOWS #25 all cited **T-12-05** for accepted *blob tampering*. T-12-05 is *seed predictability*, whose justification does not address tampering at all. The correct ID is **T-12-06**, which appeared in **no** shipped artifact while three residuals depended on it. | **FIXED** this audit. `dateKey.ts`'s T-12-05 citation was left alone — it correctly refers to predictability. |
| 3 | **T-12-09's register cites the same non-existent grep gate.** The real control is the `eslint.config.js:176-209` block, which the code review built *after* four shipped comments already claimed it existed. A **stronger** control than declared, in a different place. | Recorded here. |
| 4 | **T-12-14's register says the count "reconciles by union rather than by maximum."** Shipped code is `Math.max(a, b, \|union\|)` — strictly better against the declared threat, but the phrasing hides the `max` term, which is the exact mechanism of residual 1 above. | Recorded here. |
| 5 | **`docs/ops/DAILY-CHALLENGE.md` § Accepted costs claimed "Nine named" and listed four**, with 5-9 under `## Limits` and two cross-references pointing at the wrong section. Exactly the failure mode T-12-26 and the documentation trust boundary exist to prevent. | **FIXED** this audit. |
| 6 | **Stale coordinates** — T-12-01 cites `memoryStore.ts:118-119` (now 140-145) and `asyncStorageStore.ts:401-402` (now 420-425); T-12-04 cites `PlayingHost.tsx:1069` (guard now at 2535); `12-VALIDATION.md` records 787 tests (now 798). Every named symbol exists; only the numbers drifted. | Recorded. The phase's standing rule is to cite symbols rather than line numbers. |

### Unregistered surfaces found during the audit

Both are recorded in `.planning/WINDOWS.md` rather than added to the register, since the register
is the plan-time artifact:

- **`sanitizeAggregateMap` is uncapped on read** (WINDOWS #27). Measured: 5 000 keys injected into
  `telemetry.byMode.daily` survive `parseProgressResult` with `status: ok`. Phase 12's write-side
  fence is real and mutation-proved, but nothing trims the map on read. **Provenance: authored in
  `ddbbec3` (phase 09-02)**, applies identically to `campaign` and `endless` — inherited, not a
  phase-12 regression. Note the asymmetry in the same file: `recentRuns` **is** re-bounded on read,
  and so is `daily.history`; `byMode.*` is not. Self-inflicted on a rooted device, so it sits
  inside AR-12-02's posture — but no register ever made that call, and T-12-01's own text names
  this sanitizer as the amplifier.
- **`DAILY_STREAK_WALK_CAP`** mitigates a surface the mid-phase D-16 amendment introduced (an
  attacker-writable `currentStreakStart` producing an unbounded loop) and carries **no threat ID**.
  Verified working: `'0001-01-01'` with `totalDaysPlayed: 999999` on a saturated window →
  streak 400 in 11 ms, **discarding** the stored start rather than saturating at the cap, which is
  the stated posture — saturating would invent a century of play.

### `scripts/assert-streak-evidence.mjs` — the guard's boundary is honest

Three plants, each typechecking cleanly. The script caught the two built inside a consumer's body
and **missed** the one built in a top-level helper and passed as a bare identifier. In all three
the behavioural case in `tests/daily.record.test.ts` went red, and `vitest` runs before the assert
scripts, so `npm test` fails either way. The script's header and `docs/ops/DAILY-CHALLENGE.md`
Limit 9 were narrowed in `11f507a` to claim only what the guard reaches; this audit confirms that
narrowing is accurate. Extending it to the claimant's provenance is ledgered as open work
(WINDOWS #26).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-28 | 29 | 29 | 0 | gsd-security-auditor (State B, first audit; 8 closed by making a control fail) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer) — 26 mitigate, 3 accept, 0 transfer
- [x] Accepted risks documented in Accepted Risks Log — AR-12-01, AR-12-02, AR-12-03
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**What this sign-off does NOT claim.** It covers the threat register authored at plan time,
verified against the implementation at HEAD. It does not cover the **eight device- and human-only
items** in `12-UAT.md`, none of which is reachable by any test in this repository — no human has
played a daily board, the Android engine slice was never executed, and jsdom performs no layout.
It does not re-open the three accepted risks. And it records, rather than resolves, the uncapped
`byMode.*` read path inherited from phase 09.

**Approval:** verified 2026-09-28
