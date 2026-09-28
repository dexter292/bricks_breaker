---
phase: 12-daily-challenge
verified: 2026-09-28T18:55:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/WINDOWS.md"
  - ".planning/phases/12-daily-challenge/12-01-PLAN.md"
  - ".planning/phases/12-daily-challenge/12-01-SUMMARY.md"
  - ".planning/phases/12-daily-challenge/12-02-PLAN.md"
  - ".planning/phases/12-daily-challenge/12-02-SUMMARY.md"
  - ".planning/phases/12-daily-challenge/12-03-PLAN.md"
  - ".planning/phases/12-daily-challenge/12-03-SUMMARY.md"
  - ".planning/phases/12-daily-challenge/12-04-PLAN.md"
  - ".planning/phases/12-daily-challenge/12-04-SUMMARY.md"
  - ".planning/phases/12-daily-challenge/12-05-PLAN.md"
  - ".planning/phases/12-daily-challenge/12-05-SUMMARY.md"
  - ".planning/phases/12-daily-challenge/12-06-PLAN.md"
  - ".planning/phases/12-daily-challenge/12-06-SUMMARY.md"
  - ".planning/phases/12-daily-challenge/12-CONTEXT.md"
  - ".planning/phases/12-daily-challenge/12-REVIEW.md"
  - ".planning/phases/12-daily-challenge/12-SECURITY.md"
  - ".planning/phases/12-daily-challenge/12-UAT.md"
  - "src/services/platform/index.ts"
  - ".planning/phases/12-daily-challenge/12-UI-SPEC.md"
  - ".planning/phases/12-daily-challenge/12-VALIDATION.md"
  - "app/_components/PlayingHost.tsx"
  - "docs/ops/DAILY-CHALLENGE.md"
  - "eslint.config.js"
  - "package.json"
  - "scripts/assert-streak-evidence.mjs"
  - "src/runtime/GameScreen.tsx"
  - "src/runtime/appStatePause.ts"
  - "src/runtime/overlays/DailyResultOverlay.tsx"
  - "src/runtime/useGameLoop.ts"
  - "src/services/daily/dateKey.ts"
  - "src/services/daily/index.ts"
  - "src/services/daily/streak.ts"
  - "src/services/storage/asyncStorageStore.ts"
  - "src/services/storage/index.ts"
  - "src/services/storage/memoryStore.ts"
  - "src/services/storage/parseBlob.ts"
  - "src/services/storage/telemetry.ts"
  - "src/services/storage/types.ts"
  - "tests/daily.board.test.ts"
  - "tests/daily.clock-policy.test.ts"
  - "tests/daily.date-key.test.ts"
  - "tests/daily.record.test.ts"
  - "tests/daily.streak.test.ts"
  - "tests/storage.daily-firewall.test.ts"
  - "tests/storage.progress-v4.test.ts"
  - "tests/ui/DailyResultOverlay.test.tsx"
  - "tests/ui/PlayingHost.daily-run.test.tsx"
covered_digest: "v1:sha256:e79a18d1fbcdbbfb4c8d58e13d357a7122552d8b73deeffa7ca33f232bbc9a93"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  previous_head: 4c4b25f
  current_head: 55696b6
  gaps_closed:
    - >-
      SC-3 fifth site — the merge judged a carried claim on the UNION's window while
      using each side's own counter, so a sub-saturated damaged record borrowed a
      healthy partner's saturation. Closed STRUCTURALLY rather than by a new condition:
      `carriedStartIsCredible(claimant: DailyRecord, derivedStart: DerivedStart)` now
      takes one record, so a call site cannot assemble evidence from two. VERIFIED by
      192,080-shape instrumented composition sweep and 98,000-shape evidence-bound
      sweep, both clean. merge(A,B) and merge(B,A) both read 450.
  gaps_remaining: []
  regressions: []
  round_4_at_11f507a:
    scope: >-
      Documentary only. `git diff cd74b73..11f507a` touches four files: the guard script
      (every changed line a comment or blank — VERIFIED by filtering the diff),
      `docs/ops/DAILY-CHALLENGE.md`, `.planning/WINDOWS.md`, and this report. NO file
      under `src/`, `app/`, `tests/`, `eslint.config.js` or `package.json` changed, so no
      behavioural change was possible. Confirmed anyway: all five `assert-*.mjs` green,
      the behavioural case that holds the rule passes, daily suites **7 files / 132
      tests** — byte-identical to the `cd74b73` measurement.
    round_5_at_b8ca754:
      scope: >-
        Non-behavioural. `git diff 11f507a..b8ca754 -- src/ app/ tests/ scripts/
        eslint.config.js package.json` is ONE WORD inside ONE block comment in
        `src/services/daily/streak.ts` — `T-12-05` → `T-12-06`. VERIFIED by reading the
        diff, not the commit message. Everything else is `12-SECURITY.md`, `12-UAT.md`,
        `WINDOWS.md` #27 + counters, and two doc corrections.
      human_items_closed: >-
        All 8. `12-UAT.md` status `complete`, 8 passed / 0 issues / 0 skipped / 0
        blocked, items verbatim from this report's `human_verification` block. NOTE ON
        THE NATURE OF THAT EVIDENCE: each entry records a bare `result: pass` with no
        device model, measured value or screenshot. The pass rests on a human's
        testimony, NOT on anything the verifier or the coordinator measured — which is
        exactly what these eight items required, because jsdom performs no layout and no
        test can advance a device wall clock. Recorded as testimony, not as measurement.
      security_audit: >-
        `12-SECURITY.md` `status: verified`, `threats_open: 0`, 29/29 closed at ASVS L1,
        8 closed by making a control fail. It independently re-derived the gate-escape
        boundary (3 plants: the two built inside a consumer's body caught, the one built
        in a top-level helper MISSED, behavioural case red in all three) — matching this
        report's round-3 measurement exactly, and confirming `11f507a`'s narrowing was
        scoped correctly. It confirmed all three streak-residual placements with 8,000
        hostile fuzz trials, 0 violations, worst laundering excess 0.
      threat_id_correction_verified: >-
        SPOT-CHECKED against the threat table at `12-01-PLAN.md:472-473`: T-12-05 is
        Spoofing / date-derived seed PREDICTABILITY; T-12-06 is Repudiation / a player
        editing the blob to fabricate a streak. The three streak residuals are blob
        tampering, so T-12-06 is correct and the four shipped citations were wrong. The
        one surviving T-12-05 citation (`dateKey.ts:69`, "every device must draw the same
        board for the same date") is about predictability and is correctly left alone.
        THIS REPORT CARRIED THE SAME ERROR in three places, inherited from the phase's
        own usage, and has been corrected in this revision.
      new_findings_spot_checked: >-
        `sanitizeAggregateMap` uncapped on read — REPRODUCED independently: 5,000 keys
        injected into each of `byMode.daily`, `byMode.endless` and `byMode.campaign`
        all survive `parseProgressResult` at `status: ok`, while `recentRuns` IS
        re-bounded to 50 in the same parse. The asymmetry is real and identical across
        all three modes, so it is inherited from phase 09-02 (`ddbbec3`), not a phase-12
        regression, and it is unreachable by play because the write side always keys on
        the constant (mutation-proved). Correctly ledgered as WINDOWS #27 and correctly
        NOT treated as a phase-12 gap — but note phase 12's own store comments already
        named this hole as the reason the write-side constant matters, so the phase knew
        and deferred rather than discovered.
      windows_counters_reverified: >-
        27 rows / 24 open / 0 waived / 3 fixed, ids 1..27 contiguous, no duplicates,
        frontmatter matching the JSON array. Recounted independently.
    advisories_closed:
      - >-
        Guard claim narrowed rather than extended. The script header now carries a
        `## What this guard does NOT catch (MEASURED, phase-12 verification round 3)`
        section naming both escapes, that they typecheck cleanly and fully restore the
        2592 defect, that the behavioural case is what held the property, and that
        vitest runs before the assert scripts. `docs/ops/DAILY-CHALLENGE.md` Limit 9
        carries the same narrowing in the doc's voice. VERDICT UNCHANGED — see below.
      - >-
        `WINDOWS.md` entry 26 records the boundary as `false-gate-claim`, with both
        escapes, the measurement, what held the property, and the open work. Entry 25
        untouched, correctly.
      - >-
        Frontmatter counters recomputed. VERIFIED independently from three sources —
        frontmatter, the rendered table, and the JSON array — all agree at
        total 26 / open 23 / waived 0 / fixed 3; ids 1..26 contiguous with no duplicates;
        `last_updated` equals the latest `recorded_at`. The arithmetic is right.
gaps: []
deferred: []
advisory: []  # all three from round 3 closed in 11f507a — see re_verification.round_4_at_11f507a
unverified_prohibitions:
  - statement: >-
      The clock policy MUST NOT become an anti-cheat mechanism — no accusation copy, no
      lockout, no "suspicious clock" state, no punitive streak reset, no penalty for a
      clock or timezone change (12-04).
    status: unresolved
    verification: judgment
    judge_verdict: >-
      NON-AUTHORITATIVE LLM-judge: HOLDS, and this is the best-instrumented of the three.
      A standing source guard in the `forwards` case of `tests/daily.clock-policy.test.ts`
      scans the comment-stripped daily policy tree for
      `(watermark|highestDate|lastSeenDate|clockTamper)[A-Za-z]*\s*[:=]` and requires no
      match, and it carries its OWN non-vacuity control on line 296
      (`expect('const lastSeenDateKey = "2026-09-27";').toMatch(ANTI_CHEAT_DECLARATION)`)
      — so the matcher is proven to fire on the thing it looks for. Re-checked at
      `b8ca754`: unchanged. No accusation copy, lockout or penalty branch in the panel
      or the host. DISCHARGED at `15b3783`: the security audit registered this as
      **T-12-18** (Tampering — a watermark or anti-cheat branch creeping in), mitigated
      and closed by the comment-stripped scan, proved by making the control fail. It now
      has a threat ID and a red-proved control, which is what it lacked.
    flag: "DISCHARGED by T-12-18 — no further action"
  - statement: >-
      The daily streak surface MUST NOT use shaming, guilt or loss-aversion framing, and
      MUST NOT carry any offer to restore, protect, freeze or buy back a streak — no
      rewarded ad, no in-app purchase, no streak-freeze item (12-05).
    status: unresolved
    verification: judgment
    judge_verdict: >-
      NON-AUTHORITATIVE LLM-judge: HOLDS on the surface as it exists today. Every
      rendered string in `DailyResultOverlay.tsx` is a fixed English literal plus
      integers. No recovery, restore, freeze, purchase or ad affordance exists anywhere
      in the component, and no loss-aversion copy. Inherently un-closable by test: this
      is a prohibition about a whole surface, and a test can only cover the surface as it
      exists now — which the phase itself states. NOT covered by the UAT round and NOT
      covered by the security audit; `12-05-PLAN.md` still reads `status: unresolved`.
      RESOLVED at `55696b6` by the project owner against the complete shipped string
      set. VERIFIER RE-CHECK: the monetisation grep over the overlay, `src/services/daily/`
      and the host returns only the prohibition's own doc comment and two unrelated
      prose uses of "buy"; the single real hit is `platform.purchases.onRunEnded` at
      `PlayingHost.tsx:1150`, whose adapter is `noopPurchases` — an empty method body —
      reached via `defaultPlatformServices()` at `PlayingHost.tsx:401`. (The closure note
      calls that function `createPlatform`; its real name is `defaultPlatformServices` —
      substance correct, name slightly off.) The FACTUAL half is therefore measured; the
      aesthetic half remains the owner's judgement, recorded as such in
      `evidence_provenance`.
    flag: "RESOLVED 55696b6"
  - statement: >-
      The panel MUST NOT display a streak length it cannot derive from the stored dates;
      when the backward walk reaches the window floor while still consecutive the line is
      omitted, and the lifetime longest streak is never substituted (12-05).
    status: unresolved
    verification: judgment
    judge_verdict: >-
      NON-AUTHORITATIVE LLM-judge: HOLDS for the ENDED-streak line, which is what the
      prohibition names — `endedStreakLength` returns `null` at the window floor and
      never reads `longestStreak`. The adjacent concern I raised in the two previous
      rounds is now resolved on the derivation side: across 98,000 merge shapes and 320
      single-record shapes the displayed current streak never exceeds the record's own
      evidence. What remains is only T-12-06 tampering (blob editing), judged correct below. A reviewer
      should still decide whether the prohibition's INTENT covers the current-streak line
      as well as the ended-streak line. The derivation half is now about as strongly
      evidenced as a judgment prohibition can be — my 98,000 merge shapes and 320
      read-path shapes, plus the security audit's independent 8,000 hostile fuzz trials,
      all at 0 violations. What is left is the surface half, which no test closes.
      RESOLVED at `55696b6` — and this one is discharged STRUCTURALLY rather than by
      judgement, which is the strongest of the three closures. VERIFIER RE-CHECK:
      `streakEndedCopy(endedLength: number | null | undefined)` takes ONE argument, so
      `longestStreak` is not in the signature and substitution is inexpressible, not
      merely forbidden; it returns `null` on null, non-finite and `< 2`. Its only
      production call site is `streakEndedCopy(endedStreakLength)` at
      `DailyResultOverlay.tsx:255`. `longestStreak` appears in the panel at exactly four
      places — the prop declaration, the destructure, the badge equality, and the
      `Best streak ·` row with its own accessibility label — and is never passed to the
      ended-streak path. This rests on a type signature, not on testimony.
    flag: "RESOLVED 55696b6"
human_verification: []  # all closed — see evidence_provenance
# ===========================================================================
# EVIDENCE PROVENANCE — read this before citing anything below as "verified".
# A `passed` status is a routing signal, not a claim that every line was measured.
# Eleven closures are recorded here by KIND so no later reader mistakes ticks for
# measurements. The eight device items in particular were chosen BECAUSE nothing in
# this repository can reach them.
# ===========================================================================
evidence_provenance:
  measured_by_verifier:
    note: >-
      Re-derived in this process across five rounds — mutation of every gate, three
      hand-built plants against the anti-drift guard, and sweeps of 192,080 / 98,000 /
      320 shapes. Plus the security audit's independent 8,000 hostile fuzz trials.
    covers: "SC-1, SC-2, SC-3, SC-4, SC-5; prohibition (c); the factual half of prohibition (b)"
  measured_by_control:
    note: >-
      Prohibition (a) — registered as T-12-18 by the security audit and closed by a
      comment-stripped scan proved by making the control fail, not by reading it.
    covers: "prohibition (a)"
  human_testimony_not_measured:
    count: 8
    record: ".planning/phases/12-daily-challenge/12-UAT.md"
    note: >-
      The eight device items. `12-UAT.md` records a bare `result: pass` for each with NO
      device model, measured value or screenshot. Neither the verifier nor the
      coordinator observed any of them. This is the correct and only available evidence
      — jsdom performs no layout, no test can advance a device wall clock across
      midnight, the Android Hermes slice was never executed, and no human had played a
      daily board — but it is testimony, and a later reader must not read it as
      measurement. If any of these is ever contradicted on a device, it is the testimony
      that is wrong, not a regression.
  human_judgement:
    count: 1
    note: >-
      Prohibition (b)'s AESTHETIC half — that the shipped copy carries no shaming, guilt
      or loss-aversion framing. The project owner judged this from a written summary of
      the string set rather than from a rendered panel. Its FACTUAL half (no
      monetisation vocabulary anywhere in the daily source; all platform adapters no-op)
      was independently re-verified by the verifier and belongs under
      `measured_by_verifier`.
---

# Phase 12: Daily Challenge Verification Report

**Phase Goal:** Every player gets the same board on the same day, once, and has a streak they would be annoyed to lose
**Verified:** 2026-09-28T18:55:00Z
**Status:** human_needed
**Re-verification:** Yes — round 6 (final). `gaps_found` 4/5 `8576958` → `gaps_found` 4/5 `4c4b25f` → `human_needed` 5/5 `cd74b73` → `human_needed` 5/5 `11f507a` → `human_needed` 5/5 `b8ca754` → **`passed` 5/5 at `55696b6`**.
**Tree verified:** HEAD `55696b6`, working tree unchanged (`git status` identical before and after; all mutation and gate-plant work ran in a disposable `git worktree` under the scratchpad, since removed)

## Verdict

**PASSED.** The phase goal is achieved, all five success criteria are verified, and nothing is outstanding: `gaps: []`, `advisory: []`, `human_verification: []`, all three prohibitions resolved, security `verified` at 29/29 with `threats_open: 0`, UAT `complete` at 8/8.

The last thing I was holding is genuinely cleared, and I checked the resolutions rather than the fields:

- **(a) anti-cheat** — discharged before this round by the security audit's T-12-18 registration and its red-proved control. `55696b6` makes the plan say so, which is bookkeeping catching up with reality.
- **(b) no shaming / no monetised streak recovery** — the factual half I re-verified myself: the monetisation grep over the overlay, `src/services/daily/` and the host returns only the prohibition's own doc comment and two unrelated prose uses of "buy"; the one real hit, `platform.purchases.onRunEnded` at `PlayingHost.tsx:1150`, resolves to `noopPurchases` — a literally empty method — through `defaultPlatformServices()` at `PlayingHost.tsx:401`. The aesthetic half is the owner's judgement, and is recorded as judgement.
- **(c) never display an underivable streak** — **discharged structurally, and this is the strongest closure of the three.** `streakEndedCopy` takes one argument; `longestStreak` is not in its signature, so substituting the lifetime value is *inexpressible*, not merely forbidden. Its sole production call site passes `endedStreakLength`. `longestStreak` appears in the panel at exactly four places, none of them the ended-streak path. This rests on a type signature, not on anyone's word.

### A `passed` status is a routing signal, not a claim that everything was measured

The coordinator asked whether `passed` would obscure the evidence provenance, and offered to keep `human_needed` instead. It would obscure it only if the report let it, so the report does not: a machine-readable `evidence_provenance` block in the frontmatter splits every closure by kind, and here it is in plain terms.

**Not sixteen ticks, and not sixteen measurements — four different kinds of evidence:**

| Kind | Count | What it covers |
|---|---|---|
| Measured by the verifier | — | SC-1..SC-5, prohibition (c), the factual half of (b). Five rounds of gate mutation, three plants against the anti-drift guard, sweeps of 192,080 / 98,000 / 320 shapes, plus the audit's independent 8,000 fuzz trials |
| Measured by a control | 1 | Prohibition (a) — T-12-18, closed by making the control fail |
| **Human testimony, not measured** | **8** | The device items. `12-UAT.md` records a bare `result: pass` for each — **no device model, no measured value, no screenshot.** Neither I nor the coordinator observed any of them |
| Human judgement | 1 | Prohibition (b)'s aesthetic half, judged from a written summary rather than a rendered panel |

The eight are testimony **because that is the only evidence they admit** — jsdom performs no layout, no test can advance a device wall clock across midnight, the Android Hermes slice was never executed, and no human had played a daily board. That is the right evidence for them, and it is not weaker for being named. But if one of those eight is ever contradicted on a device, the correct conclusion is that the testimony was wrong — not that something regressed.

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | The board is derived from the local calendar date alone — same date, same board, on any device, with no network call | ✓ VERIFIED | Re-broken at `cd74b73`: UTC getters red **8 tests**. |
| SC-2 | The day's result is recorded once per date, and re-opening on the same date shows that result rather than regenerating a fresh attempt | ✓ VERIFIED | Re-broken: `mergeDailyRecord` → no-op reds **6 of 12** firewall cases. |
| SC-3 | A streak counter increases on consecutive played dates and resets on a gap, computed from stored dates rather than an incrementing counter that a crash could corrupt | ✓ VERIFIED | Fifth site closed structurally. Three independent sweeps clean. See below. |
| SC-4 | Device clock changes are handled by an explicit, written policy — the behaviour on a backwards clock jump is a decision recorded in the phase, not an accident | ✓ VERIFIED | Limit 9 now records the composition's cost and all three declined sites with their measurements. |
| SC-5 | Daily results never touch campaign progress or endless records | ✓ VERIFIED | Re-broken: daily write touching `bestScore` in memoryStore reds **3**, store-scoped. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

---

## The fifth site — closed structurally, and audited as a shape

The previous round's gap was a signature problem, and it was fixed as one rather than patched. `carriedStartIsCredible` now takes `(claimant: DailyRecord, derivedStart: DerivedStart)`. A record's window, counter and claim can no longer arrive from different places because they can no longer arrive separately. The floor is a branded type minted only inside `runStartInWindow`, so passing a claim where the floor belongs — which would admit everything — is a compile error.

I audited the shape rather than only the numbers. The write path (`mergeDailyRecord`) assembles one `pending: DailyRecord` from one source and asks about that. The merge path assembles `pending` from the union and asks about that. Neither reaches across.

**Every probe re-measured at `cd74b73`:**

| Probe | Measured |
|-------|----------|
| A alone / B alone | **450** / **2** |
| merge(A,B) / merge(B,A) | **450** / **450**, both carrying A's genuine start `2025-11-12` |
| 3 dates + `totalDaysPlayed: 3000` + start `2020-01-01` | **3** |
| same, through `parseProgressResult` with 100 entries dropped | `status: ok`, **3** |
| 2 dates + `totalDaysPlayed: 2` | **2** |
| legitimate 450-day player | **450**, window 400, longest 450 |
| crossing the bound | **400 / 401 / 402 / 403** — no discontinuity |
| damaged window | **450 → 399 → 451**, self-repairing |
| 399 genuine + `totalDaysPlayed: 3000` | **399** |
| two-device continuation | **550** |

All match the coordinator's independent measurements.

### The composition claim — verified by instrumentation, not by reading

The judgement call flagged for scrutiny was asking two existing questions in order instead of adding a union-aware third predicate. Its soundness rests on question 2 never moving a start earlier. I instrumented both question boundaries directly (temporary export in the worktree, reverted) and swept every shape I could construct: `|a|`, `|b|` ∈ {0,1,2,399,400,401,450} × offsets {0,50,200,450,1000} × 7 start values each side (including malformed and out-of-range) × 4 counters each side.

**192,080 shapes. q2 left the start unchanged in 191,772, moved it LATER (tighter) in 308, and moved it EARLIER in ZERO.**

The 308 is the important half of that result: question 2 is not a no-op, so it is genuinely load-bearing, and it only ever tightens. The composition is downward-only, as claimed. Analytically this follows because q2's only candidate is q1's own output, and q2 can return only that or the pending record's derived start — which is never earlier.

I also checked the invariant the phase names as holding for every legitimately-written record:

- **Merge path:** 98,000 shapes — **zero** cases where the merged streak exceeds the merged `totalDaysPlayed`.
- **Single-record read path:** 320 shapes — **zero** cases where the streak exceeds `max(totalDaysPlayed, window)`.

---

## The anti-drift gate — I walked past it twice

The coordinator's suggestion to try walking past it rather than re-reading it was the right instruction, and it paid.

| Plant | Shape | Gate | Defect live? |
|-------|-------|------|--------------|
| 1 | Non-consumer helper `evidenceFor(claimant, windowKeys)` returns `{ ...claimant, history: windowKeys.map(...) }`; consumer maps through it, then passes a **bare identifier** and touches fields only through it | **exit 0 — MISSED** | **Yes — merge(A,B) = 2592**, start `2020-01-01` |
| 2 | Frankenrecord assembled **inside** the consumer (`const claimant = { ...record, history: a.history }`) — the coordinator's own red-proof shape | **exit 1 — CAUGHT**, precise diagnostic | n/a |
| 3 | Non-consumer helper mutates both records' `history` in place; call site left textually pristine | **exit 0 — MISSED** | **Yes — merge(A,B) = 2592** |

Both escapes typecheck cleanly and fully reintroduce the fifth-site defect.

**Why it misses them.** The gate inspects the *consumer region's text*: bare-identifier argument, and evidence fields reached only through that identifier. It does not constrain the **provenance** of that identifier. Any cross-wire performed one function away is invisible — which is the same lesson the gate's own source records having already learned once, for consumers:

> a guard that watched only `reconcileStreakStart` waved through the identical cross-wiring planted one function up in `resolveStreakStart` ... So the consumers are discovered rather than listed.

The generalisation stopped one level short. Consumers are discovered; the *producers* of what they pass are not.

**Why this was an advisory and not a gap.** Both escapes are caught by the behavioural regression case `judges each copy's claim on that copy's own evidence, never on the union's`, which reds in each case — and `npm test` runs vitest before the assert scripts, so the build fails first. Defence in depth holds. The structural fix is sound; what was wrong was the *claim* made for the weaker guard.

### Resolved at `11f507a` — narrowed, not extended, and that is the right call

I offered two acceptable resolutions: narrow the claim, or extend the gate to the claimant's provenance. `11f507a` took the first. **My verdict is unchanged, and I want to be explicit that this is not tolerance.**

The advisory was never that the guard was too weak — it was that the guard *claimed more than it reached*. A guard with an honest boundary is not a defect; a guard with a false boundary is, because the next reader trusts it and stops looking. What shipped records the boundary in three places, in my own measurements' terms:

- The script header's new `## What this guard does NOT catch (MEASURED, phase-12 verification round 3)` section names both plants, states that they typecheck cleanly and fully restore the 2592 defect, identifies the behavioural case as what actually held the property, and notes that vitest runs first so `npm test` fails either way. It says in terms: *do not read this guard as the thing that makes the rule safe; read it as the thing that catches the cheap in-body regression early.*
- `docs/ops/DAILY-CHALLENGE.md` Limit 9 carries the same narrowing — `fails the build if a call site re-crosses them **within a consumer's own body**` — and closes with "Extending the guard to the claimant's provenance is named, deferred work, not a thing already done."
- `WINDOWS.md` entry 26 ledgers it as `false-gate-claim` with the open work attached.

Extending the gate to provenance is real design work — it means following a value backwards across function boundaries — and doing it on a phase that is otherwise finished would be the riskier choice. Deferring it *with the boundary written down and ledgered* is what the phase's own posture calls for everywhere else, and it is what I would have chosen.

---

## The three named-and-declined sites — judged

Asked to say if any is corruption rather than accepted blob tampering. **I agree with all three placements**, and the reasoning below is mine, reached before reading the document's own.

**1. `totalDaysPlayed` merged by `max(a, b, |union|)`.** REPRODUCED: an honest 450-day copy meeting one carrying `totalDaysPlayed: 3000` comes away carrying 3000; its streak still reads **450** and the next close still writes **451**. Only the *ceiling* moved. **Tampering, correctly placed.** Corruption cannot produce the input: the sanitizer drops evidence, it cannot *raise* a counter, so an ungenuine 3000 must have been hand-written. And a raised ceiling alone cannot inflate anything — converting it into an inflated streak requires a *second* hand-written field, the carried start, at which point it is plainly T-12-06. The stated reason for not fencing it is also correct and load-bearing: `max` is the only reason a 450-day player's count survives a 400-entry window, which is D-16's entire purpose, so fencing it means first deciding whether a lifetime counter may cross devices. That is a design decision, not a review fix.

**2. `longestStreak` merged by max with no evidence test.** REPRODUCED: 2 stored dates beside `longestStreak: 3000` reads 3000, no merge needed. **Tampering, correctly placed.** Same argument — corruption drops, it does not invent — and this value is a pure display scalar that feeds no derivation. The displayed *current* streak beside it correctly reads 2, which is the number that matters and is fenced independently.

**3. `endedStreakLength` (D-17) deliberately unfenced.** **Correct by construction, not merely by decision.** Its only input is the stored date window; it reads no carried scalar, so there is nothing available to launder. The omission-at-the-floor behaviour is the right failure mode and is separately gated.

---

## Gates re-measured at `cd74b73`, re-confirmed at `11f507a`

| Gate | Mutation | Result |
|------|----------|--------|
| Daily suites baseline | — | **7 files / 132 tests passing** — byte-identical at `cd74b73` and `11f507a` |
| SC-1 local-date derivation | `localDateKey` → UTC getters | **8 RED** |
| SC-2 write-first | `mergeDailyRecord` → no-op | **6 RED** |
| SC-3 saturation gate | delete the `ownKeys.length < DAILY_HISTORY_BOUND` check | **3 RED** (was 2 last round — the new merge case adds one) |
| SC-5 firewall | daily write touches `bestScore`, memoryStore only | **3 RED**, store-scoped |
| WR-01 eslint banned primitives | `toISOString` + `86400000` in a daily file | **2 errors, exit 1** |
| All five assert scripts | — | worklet-closures, level-solvability, eas-profiles, brand-name, streak-evidence — **all OK**, re-run at `11f507a` |

Coordinator-reported and consistent with the above: `npm test` exit 0 at 107 files / 798 tests; typecheck exit 0; lint exit 0 at `✖ 3 problems (0 errors, 3 warnings)`.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | `TBD` / `FIXME` / `XXX` | — | **None.** Zero debt markers across all phase-modified source, test, script and doc files, re-scanned at `cd74b73` including the new assert script. |

---

## Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| N-DAILY-01 | 12-01, 12-02, 12-06 | ✓ SATISFIED | SC-1 verified and re-broken at new HEAD. `[x]` at `REQUIREMENTS.md:187`. |
| N-DAILY-02 | 12-01, 12-03, 12-04, 12-05, 12-06 | ✓ SATISFIED | Both clauses now hold. "recorded once per date and shown on re-open" was verified in round 1; "a streak computed from stored dates, not an incrementable counter" is now verified across three independent sweeps. `[x]` at `:188`. |
| N-DAILY-03 | 12-01, 12-02, 12-04, 12-05, 12-06 | ✓ SATISFIED | Written policy is SC-4's artifact; the campaign/endless firewall is mutation-proved. `[x]` at `:189`. |

**No orphaned requirements.** The `### Daily Challenge` section has **no traceability table rows** — identical in shape to the N-END section, so `requirements.mark-complete` returning `table_unmatched` here is expected and the checkbox is the only surface. All three are `[x]`.

Carried forward from previous rounds, still open and now the last piece of bookkeeping I would ask for: unlike N-END-01/02, the three N-DAILY rows carry **no closure evidence sub-bullet**. With N-DAILY-02 now fully satisfied after three rounds of gap closure, the "what closed it, by instrument" note this file's convention calls for is worth writing while the evidence is fresh.

---

## Validation and Ledger Bookkeeping

`12-VALIDATION.md` unchanged and still judged **honest** — `status: draft` with `nyquist_compliant: true` is the conservative reading of two fields that mean different things, documented in its own frontmatter, and its sign-off ends with an explicit "What this sign-off does NOT claim".

**On `WINDOWS.md`** — both round-3 findings are resolved at `11f507a`, and I re-checked the arithmetic rather than taking it on report. Counted independently from three places that could disagree:

| Source | total | open | waived | fixed |
|--------|-------|------|--------|-------|
| frontmatter | 26 | 23 | 0 | 3 |
| the rendered table | 26 | 23 | 0 | 3 |
| the JSON array (authoritative) | 26 | 23 | 0 | 3 |

Ids run 1..26 contiguous with no duplicates, and `last_updated` (`2026-09-28T14:20:00.000Z`) equals the latest `recorded_at` rather than trailing it. **The arithmetic is right**, and since `/gsd-ship` gates on `open_count`, that now reads a true number.

Entry 25 is **not** superseded — Limit 9 extends it ("Accepted cost 4 now applies per copy at the merge") rather than replacing it, and its `450 → 399 → 451` measurement reproduces exactly. Entry 26 is new and correctly scoped: it ledgers the guard's boundary as a `false-gate-claim`, names both escapes and the measurement, records that the behavioural case is what held the property, and attaches the open work.

All eight manual items remain `open` `unrun-verify` (#16-18, #20-24), none credited to a passing `render()` assertion.

---

## Summary

Three rounds, five sites, one rule. The first four were each patched as a new condition at a new place; this round stopped patching and changed the signature so the evidence and the claim cannot be separated at a call site. That is the right shape of fix, and it survived every sweep I could aim at it — 192,080 instrumented composition shapes, 98,000 merge shapes, 320 read-path shapes, all clean, plus the full probe table matching the coordinator's independent measurements.

The one thing I would not let stand as written was the claim made for the anti-drift gate. It is a real guard with a real diagnostic, and it catches the shape it was red-proofed against — but I walked past it twice in three attempts, and both escapes put the 2592-streak defect back. It watches consumers and not the producers that feed them. The behavioural test is what actually holds the line, and the documentation now says so, in the script header, in Limit 9 and in `WINDOWS.md` entry 26. The guard was narrowed rather than extended, which is the right call and which I would have made the same way: the finding was a false boundary, not a weak one, and a boundary written down and ledgered is the phase's own posture everywhere else.

**Round 4 changed nothing behavioural and could not have.** The diff is one comment block, one doc section, one ledger row and four integers; no file under `src/`, `app/`, `tests/`, `eslint.config.js` or `package.json` moved, and every changed line in the guard script is a comment or blank — verified by filtering the diff, not by reading the commit message. Re-confirmed regardless: five assert scripts green, 7 files / 132 tests, identical to `cd74b73`.

**Round 5 closed the eight.** `12-UAT.md` is `complete` at 8/8, 0 issues — and the report records that this rests on a human's testimony rather than on measurement, because that is what those eight items always required. The security audit independently re-derived my gate-escape boundary (three plants, only the top-level-helper one missed) and confirmed all three streak-residual placements with 8,000 hostile fuzz trials at 0 violations, which is stronger evidence for them than I produced myself. It also found two things I did not: `sanitizeAggregateMap` uncapped on read — which I reproduced independently at 5,000 keys per mode, with `recentRuns` re-bounded to 50 in the same parse, confirming it is inherited from phase 09 rather than a phase-12 regression — and an unregistered threat ID on `DAILY_STREAK_WALK_CAP`. Both are ledgered.

**One correction to this report itself.** The audit's finding that four shipped sites cited T-12-05 (seed predictability) for accepted blob tampering (T-12-06) applied to *this document too*, in three places, inherited from the phase's own usage. Corrected in this revision; the threat table at `12-01-PLAN.md:472-473` is the authority, and `dateKey.ts`'s surviving T-12-05 is about predictability and correctly untouched.

**Round 6 closed the last two.** Both prohibition resolutions carry inline reasoning rather than a bare relabel, and I verified the load-bearing facts of each myself: (c) by reading the signature and every `longestStreak` use in the panel, (b) by re-running the monetisation grep and following `platform.purchases` to an empty no-op. `grep -c "status: unresolved"` across all six plans is now zero. No source file changed in this round or the last; the diff is two planning documents.

**Nothing stands between this phase and shipping.** Five rounds found five escapes of a single rule — "a streak may not exceed the evidence for it" — at the write site, the read site, the sanitize site, the bound itself, and the two-copy merge; plus one false gate claim. All are closed, the last of them structurally rather than by another condition, and the closure survived every sweep I could aim at it. What remains open in the ledger is inherited (`sanitizeAggregateMap`, phase 09) or deliberately deferred with the decision written down, and the report says which evidence is measurement and which is testimony so that a later reader inherits the doubt as well as the result.

---

_Verified: 2026-09-28T18:55:00Z_
_Verifier: Claude (gsd-verifier)_
