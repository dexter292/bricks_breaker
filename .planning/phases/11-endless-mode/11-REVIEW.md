---
phase: 11-endless-mode
reviewed: 2026-09-26T23:55:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - app/_components/certLevelPlan.ts
  - app/_components/PlayingHost.tsx
  - docs/ops/ENDLESS-MODE.md
  - tests/runtime.cert-request.test.ts
  - tests/ui/certLevelPlan.test.ts
  - tests/ui/GameScreen.test.tsx
  - tests/ui/PlayingHost.endless-host.test.ts
  - tests/ui/PlayingHost.endless-retry.test.tsx
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 11: Code Review Report (round 6)

**Reviewed:** 2026-09-26T23:55:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found (0 BLOCKER / 4 WARNING / 5 INFO)

## Summary

Round 6 is the first round of this phase where the headline claims survive a hostile
check. All four things the brief asked me to verify at source rather than accept, I
verified by reading the shipped code and by running falsification mutations against the
full suite (`99 files / 663 tests`, `tsc --noEmit` clean, `eslint` clean on all four
source/test files; working tree restored after every mutation).

**What checks out — stated plainly, because it does:**

1. **CR-01 is closed, and closed at the arm.** Driving the cell that produced it —
   campaign / run ENDED / tier AUTO / `level-01`, press `Cert WC`, then walk `Lv` — gives
   `inject=0` at the press and `0` across all four walk steps including `level-03`.
   Reverting the arm to the round-5 form (`certPendingRef.current = modeRef.current !==
   'endless'`) reds exactly one case, the new cell-5 case, behaviourally. That is a
   discriminating behavioural gate, not a source-count gate.
2. **The predicate's equivalence to the shipped three-term condition is real.**
   `certLevelPlanFor` returns `'force'` iff `mode !== 'endless' && levelId !== 'level-03'
   && !runEnded` — the round-5 condition term for term, so 11-16's endless suppression and
   11-17's ENDED-run guard survive unchanged. The declared falsification holds: moving the
   run-ended test above the `level-03` test reds cell 7 behaviourally (`inject` 1 → 0)
   while cell 5 stays green, exactly as 11-19-SUMMARY claims.
3. **`tests/runtime.cert-request.test.ts` pins what it claims.** I re-read every link in
   `src/runtime/useGameLoop.ts`: the injector's whole body is `certRequest.value =
   certRequest.value + 1` (:787); the sole `applyCertWorstCaseInject(` is at :442 inside
   `onFrame`; registration is `useFrameCallback(onFrame, false)` (:685); `certApplied.value
   =` occurs exactly once (:441) inside the consume block (:440) and nowhere resets it at a
   run boundary; the reset consume (:413) and its `applyRetryWorldReset(` (:415) both
   precede the cert consume. The corrected "QUEUED, applies on the first frame of the next
   run, onto the freshly reset world" sentences in `ENDLESS-MODE.md` are true of the
   shipped code, and the "cannot produce a frame" disclaimer is accurate.
4. **11-21's negative render case is not decoration.** Applying the round-5 verifier's
   surviving mutant (`&&` → `||` on `showPauseOverlay`, `src/runtime/GameScreen.tsx:110-111`)
   now reds both new cases. Measured: `2 failed | 149 passed` across `tests/ui`.

**What does not check out.** The pattern the brief named has not disappeared; it has moved
from the code into the instruments and the ops doc. Three of the four warnings below are
measured, not argued:

- The ops doc that plan 11-20 was written to de-falsify still carries, in **two** places
  and in the very table cell 11-20 edited, a verbatim source citation for a condition that
  11-19 deleted — and which a test added in the same round now pins at **zero** occurrences
  at that address (**WR-01**).
- The one-shot's discharge clear can be deleted with all 663 tests green, under an
  assertion whose own message says deleting it is caught (**WR-02**).
- A fourth term can still be added at two of the three call sites without a single test
  going red — the structural claim holds for the arm only (**WR-03**).

None of these is a correctness or security defect in shipped behaviour, so none is a
BLOCKER. All four are the same class of defect this phase has been paying for since round
1, and all four are cheap to close.

## Warnings

### WR-01: `ENDLESS-MODE.md` still cites, twice, a source condition that 11-19 deleted and 11-19's own test now forbids

**File:** `docs/ops/ENDLESS-MODE.md:261`, `docs/ops/ENDLESS-MODE.md:484-485`

**Issue:** Both locations tell the reader that the level half's terms live inside
`runCertWorstCase`, and line 484-485 gives the address explicitly:

> As shipped, the level half fires **only when all three of these hold** … —
> `runCertWorstCase` in `app/_components/PlayingHost.tsx` opens that branch on
> `!runEndedRef.current && modeRef.current !== 'endless' && levelId !== 'level-03'`.

Line 261's table row repeats the same parenthetical: `(… in `runCertWorstCase`)`.

As of 11-19 that expression does not exist in `runCertWorstCase`. It opens on `if (plan ===
'force')`, and the terms live in `app/_components/certLevelPlan.ts`. Worse, this is not a
harmless lag: `tests/ui/PlayingHost.endless-host.test.ts` now asserts **zero** occurrences
of `runEndedRef` and **zero** of `modeRef` inside that function, with the message "add the
term to the predicate, never to this call site". A maintainer who follows the ops doc to
`runCertWorstCase`, finds nothing, and re-creates the documented expression there reds the
build — the doc now actively points at the anti-pattern.

Plan 11-20 edited *both* of these locations (the table row inline, and the lines
immediately following 484-485) to strike the false "stopped world" clause, and left the
stale citation standing in each. `certLevelPlan.ts` and `certLevelPlanFor` appear nowhere
in `docs/` at all — so the doc has no pointer to where the condition actually lives.

This is the same defect class 11-20 existed to remove, in the same file, in the same
paragraphs, one round later.

**Fix:** Re-point both citations at the predicate and name the module. Suggested replacement
for the 484-485 sentence:

```markdown
>       `level-03`** — since `11-19` those three terms are not written in
>       `runCertWorstCase` at all. They live in ONE pure predicate,
>       `certLevelPlanFor` in `app/_components/certLevelPlan.ts`, which returns
>       `'force'` exactly when `mode !== 'endless' && levelId !== 'level-03' &&
>       !runEnded`; `runCertWorstCase` opens the branch on `plan === 'force'`.
>       Do NOT restore the inline expression:
>       `tests/ui/PlayingHost.endless-host.test.ts` pins `runEndedRef` and `modeRef`
>       at ZERO occurrences inside that function, and a term added at the call site
>       reaches only one of the predicate's three consumers.
```

and the same substitution for the parenthetical at :261. Consider adding a one-line
`certLevelPlan.ts` entry to whatever file index this doc keeps, so the module is reachable
from `docs/`.

---

### WR-02: the one-shot's discharge clear can be deleted with the entire suite green, under an assertion that claims otherwise

**File:** `tests/ui/PlayingHost.endless-host.test.ts:1678-1681` (asserts), `app/_components/PlayingHost.tsx:1892` (subject)

**Issue:** The third-consumer case asserts:

```ts
expect(
  (body.match(/certPendingRef\.current = false/g) ?? []).length,
  'and at least one clear of the one-shot (measured base 1, the discharge clear). Part B adds the self-cancel clear beside it; deleting either leaves a latch nothing resets',
).toBeGreaterThanOrEqual(1);
```

The message names the failure it catches — "deleting **either** leaves a latch nothing
resets" — but `toBeGreaterThanOrEqual(1)` is green with either one deleted, because there
are now two. **Measured:** deleting the discharge clear at `PlayingHost.tsx:1892` (the
`certPendingRef.current = false;` immediately above `const t = setTimeout(...)`) leaves
`99 files / 663 tests` **all passing**.

That deletion is not cosmetic. With the clear gone, `certPendingRef` stays `true` after the
discharge, so the "one-shot" re-arms on every subsequent run of the effect — every `Lv`
press, every tier change, every `fxReady` flip queues another 50 ms `injectCertWorstCase()`.
That is a strictly worse version of the hazard this whole line of work exists to close, and
it is the one mutation the assertion advertises as covered.

**Fix:** Make the count exact, and name both clears:

```ts
expect(
  (body.match(/certPendingRef\.current = false/g) ?? []).length,
  'EXACTLY TWO clears of the one-shot: the self-cancel clear (Part B) and the discharge clear above the setTimeout. Measured base 1, now 2. One means a clear was deleted — if it is the discharge clear the one-shot stops being one-shot and re-arms on every later run of this effect; three means a third route nobody has classified',
).toBe(2);
```

A behavioural companion is cheap here too: in `tests/ui/PlayingHost.endless-retry.test.tsx`,
after the cell-7 discharge, press `Lv` once and assert `injectCertWorstCase` is still
`toHaveBeenCalledTimes(1)`.

---

### WR-03: the anti-drift instrument is identifier-specific, not shape-specific — a fourth term can still be added at two of the three call sites

**File:** `tests/ui/PlayingHost.endless-host.test.ts:1513-1546`, `:1660-1686`; `app/_components/PlayingHost.tsx:1748-1752` (level half), `:1878` (self-cancel)

**Issue:** The round's structural claim is that the decision is written once so a fourth
term "reaches every decision site by construction". The instruments enforce that for
`runEndedRef` and `modeRef` only — the two identifiers that happened to drift in rounds
3-5. Everything else is unconstrained at two of the three consumers:

- level half: `.toMatch(/if\s*\(\s*plan\s*===[\s\S]*?\)\s*\{[\s\S]*?setLevelId\(/)` — a
  non-greedy match that accepts any number of extra conjuncts.
- self-cancel: `(body.match(/certLevelPlan\(\)/g) ?? []).length === 1` — counts the
  consultation, never pins the comparison, so extra disjuncts are free.
- arm: `.toMatch(/certPendingRef\.current = plan !== 'unreachable';/)` — an exact literal.
  This one *is* shape-pinned, and it is the only one.

**Measured:** applying both of these simultaneously —

```ts
if (plan === 'force' && !waveAdvanceInFlightRef.current) {   // level half
if (certLevelPlan() === 'unreachable' || waveAdvanceInFlightRef.current) {   // self-cancel
```

— leaves `99 files / 663 tests` **all passing**. That is, verbatim, the divergence shape
("one consumer learns a term the others do not") that this round was commissioned to make
structurally impossible, reproduced in one edit with no instrument objecting.

The prose is careful — `certLevelPlan.ts:29-30` says the test "pins that no consumer
re-tests **these terms** inline", which is exactly true — but the source instruction two
files away ("do not add a term at this call site") is unenforced, and the round-level claim
is broader than the guarantee.

**Fix:** Pin the *shape* of the two loose sites, the way the arm already is:

```ts
expect(
  certBodyA,
  'the level half tests the stored plan and NOTHING ELSE — a fourth term belongs in certLevelPlanFor, where all three consumers see it',
).toMatch(/if \(plan === 'force'\) \{\n\s*setLevelId\('level-03'\);/);

expect(
  body,
  "the self-cancel tests the predicate's answer and NOTHING ELSE — same rule as the level half",
).toMatch(/if \(certLevelPlan\(\) === 'unreachable'\) \{/);
```

Both are exact-literal and both survive a prettier re-wrap of surrounding code, since
neither spans a wrappable expression. If that is judged too brittle, state the residual
plainly in the summary instead of letting the round-level "by construction" claim stand
unqualified.

---

### WR-04: the self-cancel's stated mechanism does not match how the effect is scheduled

**File:** `app/_components/PlayingHost.tsx:1856-1882`

**Issue:** Two justifications in this comment block are not true of the code they justify.

1. *"If the session has gone endless or its run has ended **since the press**, the answer is
   `'unreachable'` and this one-shot can no longer discharge … so drop it here."* Neither
   transition is a dependency of this effect. `modeRef` and `runEndedRef` are refs, and the
   dep array is `[certLevelPlan, levelReady, levelError, fxReady, levelId, tierOverride,
   injectCertWorstCase]`. Going endless (`startEndlessRun` / `failEndlessStart`) or ending a
   run (`applyChrome`'s LOST branch) changes none of them, so the effect body does **not**
   run at the moment the arm becomes unreachable. The clause only samples opportunistically,
   when `levelId` / `tierOverride` / readiness happen to change — and at those moments the
   plan is almost never `'unreachable'`, because `certPendingRef === true` implies `levelId
   === 'level-03'` in every non-racing path, which forces `'ready'` in campaign. An arm that
   outlives its reachability with no subsequent dep change is *not* dropped.

2. *"The tier-change effect is declared ABOVE this one, so React runs `remountDevSession`
   first within the same commit and its campaign branch has already cleared the run-ended
   latch by the time this body runs."* That effect early-returns when
   `tierOverrideRef.current === tierOverride` (press with the tier already `mid` — no
   remount at all), and `remountDevSession`'s campaign branch itself early-returns on
   `!levelReady || levelError != null || !fxReady` (`PlayingHost.tsx:1659-1661`), which is
   the state immediately after any `levelId` change. So the latch is frequently **not**
   cleared when this body runs.

The behaviour is nonetheless correct, because the *second* justification in the same
paragraph — `'ready'` is returned from the `level-03` test regardless of the latch — is the
one that actually carries every case. The defect is that a future maintainer reasoning from
the first two sentences will conclude the clause provides a guarantee it does not, which is
the precise failure mode 11-20 was written to remove from `ENDLESS-MODE.md`.

**Fix:** Say what it is. Replace the two claims with:

```
    // WHAT THIS CLAUSE CAN AND CANNOT SEE. `modeRef` and `runEndedRef` are refs and
    // are NOT dependencies of this effect, so going endless or ending a run does not
    // by itself re-run this body. The clause is an opportunistic re-check taken
    // whenever a listed dep changes, not a watcher on the transitions it names. It
    // cannot drop an arm on a session that changes nothing else afterwards.
    //
    // WHY IT CANNOT CANCEL A LEGITIMATE DISCHARGE. Not the effect ordering — the
    // tier effect early-returns when the tier was already `mid`, and
    // `remountDevSession`'s campaign branch early-returns on `!fxReady`, which is the
    // state right after a levelId change. The reason is the predicate: an armed
    // one-shot implies `levelId === 'level-03'`, and the `level-03` test answers
    // `'ready'` ahead of the run-ended test, so a campaign discharge is robust to
    // both the latch and the ordering.
```

## Info

### IN-01: the self-cancel is behaviourally unobservable — measured

**File:** `app/_components/PlayingHost.tsx:1878-1881`
**Issue:** Deleting the whole `if (certLevelPlan() === 'unreachable') { … }` clause leaves
`662 / 663` tests green; the only failure is the source-count gate in
`PlayingHost.endless-host.test.ts` that counts `certLevelPlan()` occurrences. So the
"pinned at source, not claimed proven" label the round applied is **honest** — I could not
find a harness in this repo capable of driving the positive direction either. Recorded as
the measurement behind that judgement, not as a defect.
**Fix:** None required. If Phase 14 adds a harness that can flip `mode` while an arm is
pending, this is the first clause that deserves a behavioural case.

---

### IN-02: residual stranded-arm path, narrowed to a sub-frame race

**File:** `app/_components/PlayingHost.tsx:1884-1890`
**Issue:** An arm set with `plan === 'force'` is discharged only once `fxReady` flips after
the re-bake triggered by `setLevelId('level-03')`. If `goNext` or `toggleDevLevel` moves
`levelId` off `level-03` inside that window, the predicate answers `'force'` (both clear
`runEndedRef`), so the self-cancel does not fire, the `levelId !== 'level-03'` gate returns,
and the one-shot waits for a later walk back to `level-03` — the CR-01 symptom, on a much
narrower path. The window is one async tick (the bake IIFE's `setBakedKey`), so this is not
reachable by a human presser and no test drives it.
**Fix:** If it is ever worth closing, the natural shape is for the self-cancel to also drop
an arm whose `levelId` has moved away from the discharge level while the arm is live
(`plan === 'force' && certPendingRef.current` at effect time means the level move the press
performed has since been undone).

---

### IN-03: on cell 5 the `Cert WC` press is now a session remount with no cert load, and nothing says so at press time

**File:** `app/_components/PlayingHost.tsx:1834-1841`, `docs/ops/ENDLESS-MODE.md:501-507`
**Issue:** Campaign / run ENDED / below `level-03` / tier AUTO: the level half is refused,
the tier half fires, `defer` is true, the arm is now correctly suppressed — so the press
wipes the Results panel, restarts the session through `remountDevSession`, and applies no
worst-case load at all. A second press then works, because the remount cleared the latch. The
doc's § Limits item does record this ("arms nothing but still restarts the session through
the tier half"), so this is not undocumented; it is simply an operator sharp edge that the
UI does not surface, on a control whose only purpose is to apply the load.
**Fix:** Optional. A `__DEV__` `console.log('[cert] press deferred nothing — run had
already ended; press again on the restarted run')` on the `plan === 'unreachable' && defer`
path would cost one line and close the silence.

---

### IN-04: the truth table's oracle mirrors the implementation branch for branch

**File:** `tests/ui/certLevelPlan.test.ts:46-65`
**Issue:** `expectedPlan` is described as "written out rather than computed", but it is the
same four-branch cascade as `certLevelPlanFor` in the same order — so the 20-cell case
proves consistency between two copies of one decision rather than against an independent
statement of the contract. A future edit that changes both together passes.
**Fix:** Mitigated already, and I verified the mitigation: the three named-cell assertions
at the end are independent literals and **do** red on an order swap (measured). Worth one
sentence in the file header saying so, so nobody reads the 20-cell case as the load-bearing
one.

---

### IN-05: the table's domain is derived from the catalog, but the predicate's domain is the `LevelId` union

**File:** `tests/ui/certLevelPlan.test.ts:33-40, 78-87`
**Issue:** The set-equality case compares `TABLE_LEVELS` against `PLAYABLE_LEVEL_ORDER`. The
parameter type is `LevelId` (`src/core/levels/levelIds.ts:8-13`), a five-member union that
today coincides with the catalog exactly. A `LevelId` added to the union without a catalog
entry would escape the truth table with the set-equality case still green — the same hole,
one level up, that this file's header says a hand-written list would have.
**Fix:** Cheap and total: make the drift a *type* error rather than a runtime one.

```ts
const TABLE_LEVELS = [
  'level-01', 'level-03', 'level-04', 'level-05', 'level-06',
] as const satisfies readonly LevelId[];
// Exhaustiveness over the TYPE: a sixth LevelId makes this line red at tsc time.
type _TableCoversLevelId =
  Exclude<LevelId, (typeof TABLE_LEVELS)[number]> extends never ? true : never;
const _tableCoversLevelId: _TableCoversLevelId = true;
```

---

_Reviewed: 2026-09-26T23:55:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
