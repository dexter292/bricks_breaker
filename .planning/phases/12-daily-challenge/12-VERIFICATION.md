---
phase: 12-daily-challenge
verified: 2026-09-28T15:10:00Z
status: human_needed
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
covered_digest: "v1:sha256:143812de818c4ac1086854855e0099f40f7e5479789635a02eda6c8b7e411dbf"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  previous_head: 4c4b25f
  current_head: cd74b73
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
gaps: []
deferred: []
advisory:
  - finding: >-
      `scripts/assert-streak-evidence.mjs` is walk-past-able by the exact class of edit
      it exists to catch, and its own stated claim — "fails the build if a call site
      re-crosses them" (`docs/ops/DAILY-CHALLENGE.md` Limit 9) — is therefore
      overstated. I planted three cross-wires; the gate caught one and waved through
      two, and BOTH escapes fully reintroduced the fifth-site defect (merge(A,B) read
      2592 instead of 450, carrying `2020-01-01`). The gate inspects the CONSUMER
      region's text — bare-identifier argument, and evidence fields reached only through
      that identifier. It does not constrain the PROVENANCE of that identifier, so any
      cross-wire performed one function away is invisible. ESCAPE 1: a non-consumer
      helper `evidenceFor(claimant, windowKeys)` returning `{ ...claimant, history:
      windowKeys.map(...) }`, consumed as
      `.map((record) => evidenceFor(record, unionKeys)).filter((claimant) =>
      carriedStartIsCredible(claimant, start)).map((claimant) =>
      claimant.currentStreakStart)` — bare identifier, single-identifier field access,
      gate exit 0, typechecks clean. ESCAPE 2: a non-consumer helper mutating both
      records' `history` in place before a textually pristine call site — gate exit 0.
      CONTROL: the coordinator's own shape (frankenrecord assembled INSIDE the consumer,
      `const claimant = { ...record, history: a.history }`) is CAUGHT, with a precise
      diagnostic — so the gate is not useless, its boundary is just narrower than
      claimed.
    category: other
    reason: >-
      This is the same lesson the gate's own source records having learned once — "a
      guard that watched only `reconcileStreakStart` waved through the identical
      cross-wiring planted one function up ... So the consumers are discovered rather
      than listed." The generalisation stopped one level short: consumers are
      discovered, but the producers of the values they pass are not. Either extend the
      gate to the provenance of the claimant identifier, or narrow the claim in Limit 9
      and in the gate's own header to what it actually enforces.
    evidence_status: >-
      NOT BLOCKING, and deliberately filed as advisory rather than a gap. Both escapes
      are caught by the behavioural regression case `tests/daily.record.test.ts >
      mergeDailyRecords reconcile > judges each copy's claim on that copy's own
      evidence, never on the union's`, which reds in each case. `npm test` runs vitest
      BEFORE the assert scripts, so the build still fails. The structural fix is sound;
      the weaker of its two guards is weaker than advertised.
  - finding: >-
      `.planning/WINDOWS.md` frontmatter counters are stale relative to its own rows.
      Counted directly: 25 rows, 22 `open`, 3 `fixed`. Frontmatter claims
      `total_count: 24`, `open_count: 21`, `fixed_count: 3`, and `last_updated:
      2026-09-28T04:15:33.124Z` predates entry 25's own `recorded_at` of
      `2026-09-28T13:40:00.000Z`. Entry 25 was appended without bumping the counters.
      With `workflow.windows_enforce` enabled, `/gsd-ship` blocks on `open_count`, so a
      counter that under-reports by one is a gate reading a stale number.
    category: other
    reason: >-
      Reported rather than fixed — I was instructed not to edit `WINDOWS.md`. Re-run
      `gsd-tools windows` so the counters and `last_updated` match the rows.
    evidence_status: "counted directly from the table at cd74b73"
  - finding: >-
      The `totalDaysPlayed` ceiling laundering is documented as Limit 9's closing
      paragraph in `docs/ops/DAILY-CHALLENGE.md` but has no `WINDOWS.md` row, where the
      file's own convention is that a named permanent residual gets one — entry 25
      ledgers accepted cost 4 on exactly that convention. This is a newly named,
      permanent, deliberately unfenced residual carrying a deferred design decision
      ("whether a lifetime counter may cross devices at all"), which is precisely what
      the ledger is for.
    category: other
    reason: >-
      Confirming the coordinator's question: entry 25 is NOT superseded — Limit 9
      extends it ("Accepted cost 4 now applies per copy at the merge") rather than
      replacing it, and its 450 -> 399 -> 451 measurement still reproduces exactly. But
      "nothing needs changing there" is not quite right: the counters are stale, and by
      the file's own convention Limit 9's residual is a missing row.
    evidence_status: "cross-read WINDOWS.md entry 25 against DAILY-CHALLENGE.md Limit 9"
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
      `cd74b73`: unchanged. No accusation copy, lockout or penalty branch in the panel or
      the host.
    flag: "unverified-prohibition — human review recommended"
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
      exists now — which the phase itself states.
    flag: "unverified-prohibition — human review recommended"
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
      evidence. What remains is only T-12-05 tampering, judged correct below. A reviewer
      should still decide whether the prohibition's INTENT covers the current-streak line
      as well as the ended-streak line.
    flag: "unverified-prohibition — human review recommended"
human_verification:
  - test: >-
      Android Hermes date-key and `nextLocalMidnightMs` on a 23-hour DST day. Set the
      device zone to America/Santiago and the date to 2026-09-05 23:58 local; confirm the
      daily date advances to 2026-09-06 at 01:00 local and the countdown reads ~2 minutes
      beforehand.
    expected: "The Android ICU4J/bionic slice agrees with the measured Apple Hermes slice."
    why_human: >-
      Every engine measurement in the phase comes from the Apple slice of the SDK 57
      Hermes artifact. The Android slice was never executed. (WINDOWS #20)
  - test: >-
      Android Intl/ICU4J locale invariance. On a physical Android device set a
      non-Gregorian locale (`th-TH` or `fa-IR`) and confirm the rendered daily date is
      unchanged.
    expected: "The same `YYYY-MM-DD` key on every locale."
    why_human: "The five-locale measurement was taken on the Apple Hermes slice. (WINDOWS #21)"
  - test: >-
      The per-runtime timezone cache ON DEVICE. With the app foregrounded, change the
      device timezone across a date boundary and observe whether `Daily · {date}` changes
      without an app relaunch.
    expected: >-
      Per the documented limit, it does NOT change until relaunch. If it does change,
      NARROW the Limits paragraph in `docs/ops/DAILY-CHALLENGE.md` — do not delete it.
    why_human: >-
      Reproduced only by setenv+tzset in a desktop harness. A real OS timezone change is
      a different mechanism (a system notification) and was not observable. (WINDOWS #22)
  - test: >-
      A real local-midnight rollover with the Daily Result panel open on a physical
      device. Confirm the countdown never renders a negative value and omits itself at or
      below zero.
    expected: "Countdown omits at or below zero; no negative duration ever renders."
    why_human: >-
      No test can advance a device wall clock across midnight while the runtime lives.
      DO NOT check that the date re-derives — that half of clock-policy rule 5 is
      UNIMPLEMENTED by decision. The `12-VALIDATION.md` row says so explicitly,
      matching WINDOWS #23 and Limit 8. (WINDOWS #23)
  - test: >-
      Daily Result panel horizontal fit at extreme values — a 7-digit score, a 4-digit
      streak and a 5-digit days-played in the shipped 320px panel.
    expected: "No wrap and no clipping."
    why_human: >-
      jsdom performs no layout. The 27-character budget is computed from a measured
      0.612 em advance and has never been observed on a rendered panel. A passing
      `render()` assertion must not be recorded as having verified this. (WINDOWS #16)
  - test: >-
      Daily Result panel vertical fit — the fully-populated 11-row panel on a 320x568 pt
      viewport.
    expected: "The `Menu` control is visible without scrolling and the panel sits inside the safe area."
    why_human: >-
      jsdom supplies no safe-area insets. The 456px computed content height leaves
      headroom on paper only. (WINDOWS #17)
  - test: >-
      The `__DEV__` dev row at 375 pt — confirm the `Daily` control is fully on-screen
      and tappable in the non-wrapping row.
    expected: "`Daily` fully on-screen and tappable."
    why_human: >-
      Computed at ~431-475 px. NOTE: the row is ALREADY past 375 pt in its two default
      tier states BEFORE this phase added anything — a check that does not know that will
      misattribute the clipping to `Daily`. (WINDOWS #18)
  - test: "Play a daily board as a human."
    expected: "The difficulty, the window and the streak rules feel right."
    why_human: >-
      NO HUMAN HAS PLAYED A DAILY BOARD. Nothing in `docs/ops/DAILY-CHALLENGE.md` was
      calibrated by one, and its front matter says so. `DAILY_DIFFICULTY = 10` and
      `DAILY_HISTORY_BOUND = 400` are judgements, not measurements. (WINDOWS #24)
---

# Phase 12: Daily Challenge Verification Report

**Phase Goal:** Every player gets the same board on the same day, once, and has a streak they would be annoyed to lose
**Verified:** 2026-09-28T15:10:00Z
**Status:** human_needed
**Re-verification:** Yes — round 3. `gaps_found` 4/5 at `8576958` → `gaps_found` 4/5 at `4c4b25f` → **`human_needed` 5/5 at `cd74b73`**.
**Tree verified:** HEAD `cd74b73`, working tree unchanged (`git status` identical before and after; all mutation and gate-plant work ran in a disposable `git worktree` under the scratchpad, since removed)

## Verdict

**The phase goal is achieved, and every automated must-have is verified.** No gaps remain. The remaining eight items are device- and human-only, honestly declared by the phase, and are the sole reason this reads `human_needed` rather than `passed`.

Saying it plainly, as asked: **I found no seventh site.** I looked for one with a 192,080-shape instrumented sweep of the merge composition, a 98,000-shape sweep of the evidence bound, a 320-shape sweep of the single-record read path, and three hand-designed plants against the anti-drift gate. The streak derivation never exceeded the evidence in any of them.

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

**Why this is an advisory and not a gap.** Both escapes are caught by the behavioural regression case `judges each copy's claim on that copy's own evidence, never on the union's`, which reds in each case — and `npm test` runs vitest before the assert scripts, so the build fails first. Defence in depth holds. The structural fix is sound; what is wrong is the *claim* made for the weaker guard, in Limit 9 and in the script's own header. Narrow the claim or extend the gate to the claimant's provenance.

---

## The three named-and-declined sites — judged

Asked to say if any is corruption rather than T-12-05 tampering. **I agree with all three placements**, and the reasoning below is mine, reached before reading the document's own.

**1. `totalDaysPlayed` merged by `max(a, b, |union|)`.** REPRODUCED: an honest 450-day copy meeting one carrying `totalDaysPlayed: 3000` comes away carrying 3000; its streak still reads **450** and the next close still writes **451**. Only the *ceiling* moved. **Tampering, correctly placed.** Corruption cannot produce the input: the sanitizer drops evidence, it cannot *raise* a counter, so an ungenuine 3000 must have been hand-written. And a raised ceiling alone cannot inflate anything — converting it into an inflated streak requires a *second* hand-written field, the carried start, at which point it is plainly T-12-05. The stated reason for not fencing it is also correct and load-bearing: `max` is the only reason a 450-day player's count survives a 400-entry window, which is D-16's entire purpose, so fencing it means first deciding whether a lifetime counter may cross devices. That is a design decision, not a review fix.

**2. `longestStreak` merged by max with no evidence test.** REPRODUCED: 2 stored dates beside `longestStreak: 3000` reads 3000, no merge needed. **Tampering, correctly placed.** Same argument — corruption drops, it does not invent — and this value is a pure display scalar that feeds no derivation. The displayed *current* streak beside it correctly reads 2, which is the number that matters and is fenced independently.

**3. `endedStreakLength` (D-17) deliberately unfenced.** **Correct by construction, not merely by decision.** Its only input is the stored date window; it reads no carried scalar, so there is nothing available to launder. The omission-at-the-floor behaviour is the right failure mode and is separately gated.

---

## Gates re-measured at `cd74b73`

| Gate | Mutation | Result |
|------|----------|--------|
| Daily suites baseline | — | **7 files / 132 tests passing** |
| SC-1 local-date derivation | `localDateKey` → UTC getters | **8 RED** |
| SC-2 write-first | `mergeDailyRecord` → no-op | **6 RED** |
| SC-3 saturation gate | delete the `ownKeys.length < DAILY_HISTORY_BOUND` check | **3 RED** (was 2 last round — the new merge case adds one) |
| SC-5 firewall | daily write touches `bestScore`, memoryStore only | **3 RED**, store-scoped |
| WR-01 eslint banned primitives | `toISOString` + `86400000` in a daily file | **2 errors, exit 1** |
| All five assert scripts | — | worklet-closures, level-solvability, eas-profiles, brand-name, streak-evidence — **all OK** |

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

**On `WINDOWS.md`, which I was asked to confirm:** entry 25 is **not** superseded — Limit 9 extends it ("Accepted cost 4 now applies per copy at the merge") rather than replacing it, and its `450 → 399 → 451` measurement reproduces exactly. But "nothing needs changing there" is not quite right, on two counts, both filed as advisories above: the frontmatter counters are stale against the file's own rows (25/22/3 counted vs 24/21/3 claimed, with `last_updated` predating entry 25's `recorded_at`), and by the file's own convention Limit 9's newly named permanent residual — the `totalDaysPlayed` ceiling laundering with its deferred design decision — is a missing row.

All eight manual items remain `open` `unrun-verify` (#16-18, #20-24), none credited to a passing `render()` assertion.

---

## Summary

Three rounds, five sites, one rule. The first four were each patched as a new condition at a new place; this round stopped patching and changed the signature so the evidence and the claim cannot be separated at a call site. That is the right shape of fix, and it survived every sweep I could aim at it — 192,080 instrumented composition shapes, 98,000 merge shapes, 320 read-path shapes, all clean, plus the full probe table matching the coordinator's independent measurements.

The one thing I would not let stand as written is the claim made for the anti-drift gate. It is a real guard with a real diagnostic, and it catches the shape it was red-proofed against — but I walked past it twice in three attempts, and both escapes put the 2592-streak defect back. It watches consumers and not the producers that feed them. The behavioural test is what actually holds the line, and the documentation should say so.

**What I could not verify:** the same eight device and human items, carried forward verbatim. jsdom performs no layout, no test can advance a device wall clock across midnight, the Android engine slice was never executed, and no human has played a daily board. Honestly declared, correctly routed, and not held against the phase. Three judgment-tier prohibitions remain flagged rather than absorbed.

---

_Verified: 2026-09-28T15:10:00Z_
_Verifier: Claude (gsd-verifier)_
