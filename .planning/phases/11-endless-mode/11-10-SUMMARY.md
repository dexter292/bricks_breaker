---
phase: 11-endless-mode
plan: 10
subsystem: ui
tags: [react, react-native, endless-mode, run-boundary, telemetry, vitest, testing-library]

# Dependency graph
requires:
  - phase: 11-endless-mode
    provides: "11-09's failEndlessStart() — and specifically its runEndedRef latch, added so that moving the funnel inside startEndlessRun could not manufacture a phantom {wave:1, score:0, abandoned} record for a start that never began"
  - phase: 11-endless-mode
    provides: "11-08's endless Results reader and the real-ResultOverlay harness in tests/ui/PlayingHost.endless-record.test.tsx, which is what let the hoist be measured as RENDERED copy rather than as a written value"
provides:
  - "The abandon funnel as startEndlessRun's FIRST statement: all five callers now record the run they replace, including the __DEV__ `Endless` button the verifier measured at recordRunEnd calls = 0. startEndlessRun is what Phase 14 promotes to the production entry point, so the invariant now outlives the dev row"
  - "The endless branch HOISTED above the readiness gate in onRetry and remountDevSession: a Retry against a closed gate now ends and REPORTS the run through failEndlessStart instead of returning silently — the silent-noop the owner rejected, closed on two more paths"
  - "toggleDevLevel as an explicit EXIT from endless (A-02, owner 2026-09-26): record, then modeRef/setMode/waveRef/setWave/waveAdvanceInFlightRef"
  - "The FIRST and only writer returning modeRef to 'campaign' — the compiled-push gate effect is no longer dead for the life of the mount after a first endless entry"
  - "A measured account of what a jsdom behaviour test CANNOT see about modeRef: the mirroring effect flushes inside act(), so the direct ref write is pinned as a source contract that states so in its own comment"
affects: [11-11, 14-title-routes, 13-achievements]

# Actuals (#2632) — same estimateTokens scale (chars/4) as the plan's `estimate`,
# measured over the four files actually changed at their post-change size. The plan
# estimated 82000 over four files_modified and all four were genuinely touched.
# Recorded unrounded.
actuals:
  tokens: 47293
  tasks: 2
  commits: 2
plan_head_before: 201220810374cb6212d4b52f346b87d25403830a

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Put an invariant in the function whose MEANING it is, not at the call sites — five callers reading one rule beats two of five callers each carrying a copy"
    - "When a falsification probe does not go red, narrow it by bisection until something does, then pin the un-discriminated line as a source contract that says why it is one"
    - "Probe the source contract too: a contract written to cover an unobservable line is worth nothing unless deleting that line turns it red"

key-files:
  created: []
  modified:
    - "app/_components/PlayingHost.tsx"
    - "tests/ui/PlayingHost.endless-host.test.ts"
    - "tests/ui/PlayingHost.endless-record.test.tsx"
    - "tests/ui/PlayingHost.endless-retry.test.tsx"

key-decisions:
  - "The funnel is the FIRST statement of startEndlessRun, above the readiness gate — not merely somewhere inside it. It reads waveRef.current to decide the wave it records, so any statement able to move the wave (failEndlessStart, the seed mint, advanceToWave) must follow it. Pinned by a first-non-comment-line contract, not a substring match"
  - "The redundant calls were DELETED from onRetry and remountDevSession rather than left as harmless no-ops. Leaving them would still have been correct — the latch absorbs the second call — but it would keep the invariant readable at three sites, which is the exact condition that let two of five callers be missed"
  - "The hoist's deliberate behaviour change is measured against the REAL ResultOverlay in tests/ui/PlayingHost.endless-record.test.tsx, not reasoned about. The previous round's gap 3 escaped because a source-contract test proved the WRITE and never the RENDER; a hoist justified by argument alone would have repeated it exactly"
  - "The readiness lever is a rejected catalog levelId via a controlled-levelId re-render, and it is the ONLY available lever: setBakedKey runs synchronously before the bake effect's first await, so no mid-bake window exists to occupy. Lv was rejected as the lever because Task 2 makes it an EXIT from endless, which would measure a different path"
  - "Task 2's prescribed falsification check DID NOT go red and is reported as such. Deleting modeRef.current = 'campaign' alone leaves all 17 behaviour cases green, because the mirroring effect flushes inside act() before a jsdom test can deliver the next frame. The stronger probe (delete BOTH mode writers) does turn Test 3 red with the verifier's own measured message, and the ref write is pinned separately as a source contract"

patterns-established:
  - "Pattern 4: a falsification probe that stays green is a finding, not a failure to report. Bisect it — which subset of the change IS load-bearing for this case — and let the answer decide whether the test needs strengthening or the line needs a source contract"
  - "Pattern 5: extract a shared settle-and-press sequence rather than duplicating it across mount helpers, so a controlled and an uncontrolled mount cannot drift in what they wait for"

requirements-completed: []

coverage:
  - id: D1
    description: "A second press of the __DEV__ `Endless` button mid-run records the run it discards — {mode:'endless', wave:2, outcome:'abandoned'} exactly once, before the readout returns to W1 (measured pre-fix: 0 calls, W2 → W1)"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#a second press of the __DEV__ Endless button records the run it discards (gap 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "That second press starts a genuinely NEW run — a different board, advanceWave not called, and the subsequent loss records wave 1 rather than carrying the wave forward"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#that second press starts a genuinely NEW run — the wave does not carry forward (gap 1)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The runEndedRef latch survived the move: a Retry from the endless lose overlay records nothing extra, so the funnel cannot double-record now that it runs on every startEndlessRun"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#Retry from the endless lose overlay records nothing extra — the funnel latch survived the move (T-11-11)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The invariant lives at ONE site: startEndlessRun opens with recordInFlightEndlessRun(), calls it exactly once, and declares it; onRetry and remountDevSession neither call it nor list it, and both still route to startEndlessRun"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#startEndlessRun opens with the abandon funnel, above every write (gap 1)"
        status: pass
    human_judgment: false
  - id: D5
    description: "In both onRetry and remountDevSession the endless branch precedes the readiness gate, routes to startEndlessRun and returns, and keeps no second copy of the invariant"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#onRetry routes an endless Retry to startEndlessRun before the campaign retry() (gap 1)"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#remountDevSession routes the same way (gap 1, second half)"
        status: pass
    human_judgment: false
  - id: D6
    description: "THE HOIST, measured: with an endless run live at wave 2 and all three readiness terms false, Pause → Retry records the in-flight run once at wave 2 abandoned, renders `Wave 1 could not be built — tap Retry` inside result-slot, leaves result at 'lose', and shows the endless watermarks with no campaign digits. Pre-hoist every one of those is different"
    requirement: "N-END-01"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#records the in-flight run exactly once, at the wave it REACHED (measured pre-hoist: 0 calls)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#puts the decided copy on the REAL overlay, not nothing at all (A-01, gap 3 on a third path)"
        status: pass
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-record.test.tsx#shows the ENDLESS watermarks even though the level switch reloaded the campaign best"
        status: pass
    human_judgment: false
  - id: D7
    description: "Pressing `Lv` at wave 2 of a live endless run records {mode:'endless', wave:2, outcome:'abandoned'} exactly once (measured pre-fix: 0 calls)"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#records the in-flight run before discarding it (measured pre-fix: 0 calls)"
        status: pass
    human_judgment: false
  - id: D8
    description: "After that press no W{n} readout survives — the readout is gated on mode === 'endless', so its absence is the RENDERED proof the mode changed"
    requirement: "N-END-01"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#leaves the mode — no W{n} readout survives the press"
        status: pass
    human_judgment: false
  - id: D9
    description: "The NEXT loss after the exit is filed under the CAMPAIGN arm with a levelId and no wave — the assertion that actually discriminates the fix (measured pre-fix: {mode:'endless', wave:2} for a campaign level)"
    requirement: "N-END-02"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#hands the NEXT loss to the CAMPAIGN arm, not the endless one (T-11-08)"
        status: pass
    human_judgment: false
  - id: D10
    description: "Campaign behaviour is unchanged: pressing `Lv` in campaign mode records nothing, and the R-26 loop-arming contract still holds untouched"
    requirement: "N-END-01"
    verification:
      - kind: automated_ui
        ref: "tests/ui/PlayingHost.endless-retry.test.tsx#pressing Lv in CAMPAIGN mode records nothing — campaign behaviour is unchanged"
        status: pass
      - kind: unit
        ref: "tests/ui/PlayingHost.bake-gate.test.ts#toggleDevLevel does not arm the loop itself (R-26)"
        status: pass
    human_judgment: false
  - id: D11
    description: "toggleDevLevel's exit shape is pinned at source: funnel first, both mode writers present, record before the mode leaves, waveRef/setWave/guard cleared, no setActive(true) and no retry(), and it is the ONLY writer returning modeRef to campaign"
    requirement: "N-END-01"
    verification:
      - kind: unit
        ref: "tests/ui/PlayingHost.endless-host.test.ts#toggleDevLevel exits endless: records first, writes BOTH mode writers, arms nothing (A-02)"
        status: pass
    human_judgment: false
  - id: D12
    description: "SC-5 / the device half of N-END-03: no frame spike outside the Mid budget across an endless wave transition, now also across a `Lv` exit from endless"
    verification: []
    human_judgment: true
    rationale: "No automated step in this repo can produce a frame on hardware. Carried forward unchanged; the discharge procedure lives in docs/ops/ENDLESS-MODE.md § Limits item 2 and 11-11 narrows its do-not-press note. This plan does not claim it and N-END-03 stays unchecked."

# Metrics
duration: 9 min
completed: 2026-09-26
status: complete
---

# Phase 11 Plan 10: The Abandon Funnel Moves Inside startEndlessRun Summary

**`recordInFlightEndlessRun()` is now the first statement of `startEndlessRun`, so all five callers record the run they replace instead of two of five; the endless branch is hoisted above the readiness gate in `onRetry` and `remountDevSession` so a Retry against a closed gate ends and reports the run rather than returning silently; and `toggleDevLevel` becomes the owner-decided explicit exit from endless — the first writer in the file that ever returns `modeRef` to `'campaign'`.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-26T07:34:26Z
- **Completed:** 2026-09-26T07:44:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- **Gap 1's durable half closed at the seam, not at the call sites.** Round 1 wired the funnel at two of the five `startEndlessRun` callers. The two it missed included the `__DEV__` `Endless` button itself, which binds `onPress={startEndlessRun}` and stays mounted and tappable for the whole run: the verifier drove a live run to wave 2, pressed it, and measured the readout going `W2` → `W1` with `recordRunEnd` called **zero** times while `docs/ops/ENDLESS-MODE.md:265-266` asserted in bold that no such path existed. The call is now the **first statement** of `startEndlessRun` — above the readiness gate and above every write, because the funnel reads `waveRef.current` to decide the wave it records — and the redundant copies are deleted from `onRetry` and `remountDevSession` along with their dependency-array entries. Leaving them would still have been *correct* (the latch absorbs a second call) but would keep the invariant readable at three sites, which is exactly the condition that let two of five callers be missed.
- **The hoist ships exercised, not argued.** Moving the endless branch above `!levelReady || levelError != null || !fxReady` deliberately converts *nothing happens, the run stays resumable* into *the in-flight run is recorded abandoned at the wave it reached and the decided copy renders*. Three cases drive the REAL host with all three readiness terms genuinely false and read the result off the REAL `ResultOverlay` inside `result-slot`. This is the round's most important case precisely because the previous round's gap 3 escaped by proving a WRITE and never a RENDER.
- **A-02 decided and implemented.** `Lv` during an endless run records the run, then exits: `modeRef` / `setMode` / `waveRef` / `setWave` / `waveAdvanceInFlightRef`. The discriminating assertion is not the missing `W{n}` readout — that could be argued from `setMode` alone — but that the **next loss is filed under the campaign arm** with a `levelId` and no `wave`, where the verifier measured `{mode:'endless', wave:2}` for a campaign level.
- **The compiled-push gate effect is alive again.** `modeRef` had no writer back to `'campaign'` anywhere in the file, so a single endless entry left that effect early-returning for the remainder of the mount and `Lv` switched the level behind a stopped frame loop. `toggleDevLevel` is now the first and only such writer, and a source contract asserts the count is exactly one so a second writer forces the claim to be rewritten.
- **The `runEndedRef` phantom-record fence is preserved and asserted.** Now that the funnel runs on *every* `startEndlessRun`, the shared latch is the only thing between a Retry and a double-record. `Retry from the endless lose overlay records nothing extra` asserts it directly, and 11-09's `failEndlessStart` latch keeps a Retry after a failed start from writing a phantom `{wave:1, score:0}` run.
- **All three mandatory falsification probes were RUN.** Two produced the predicted RED. The third did not, and that is reported below with the bisection that establishes what is and is not observable — rather than quietly recorded as passed.

## Task Commits

1. **Task 1: Move the abandon funnel inside `startEndlessRun`, where the invariant belongs** — `d2d0475` (fix)
2. **Task 2: `toggleDevLevel` becomes an explicit exit from endless (A-02, owner-decided)** — `7e6e72b` (feat)

## Falsification Checks (all three run; one did not go red, and that is the finding)

| # | Probe | Observed result |
|---|---|---|
| 1 | Delete `recordInFlightEndlessRun();` from `startEndlessRun` | **RED as predicted.** 3 of 13 retry cases failed, Test 1 on exactly the named assertion: `expected "vi.fn()" to be called 1 times, but got 0 times`. The other two (`a DEV tier change…`, `Pause then Retry…`) confirm the moved call is now load-bearing for the paths that gave up their own copies. Restored, suite green. |
| 2 | Re-instate the pre-hoist order in `onRetry` (readiness gate back above the endless branch) | **RED as predicted, and correctly scoped.** All **3** hoist cases failed — one on `0 calls` and two on `Unable to find an element by: [data-testid="result-slot"]`, i.e. the overlay never mounted at all — which is verbatim the measured pre-hoist post-condition. All **13** retry cases (Tests 1–3 included) stayed **green**, which is the proof that the hoist block is the only case measuring the reorder rather than the outcome. Restored, suite green. |
| 3 | Delete `modeRef.current = 'campaign';` from `toggleDevLevel`, expecting Test 3 RED | **DID NOT GO RED.** All 17 behaviour cases stayed green. See the bisection below. |

### Probe 3, bisected

The plan predicted Test 3 (the campaign-arm loss) would fail. It did not, so the change was bisected rather than the result accepted:

| Variant | Test 2 (readout) | Test 3 (campaign arm) |
|---|---|---|
| Delete `modeRef.current = 'campaign'` only | green | **green** |
| Delete `setMode('campaign')` only | **RED** | green |
| Delete **both** | **RED** | **RED**, with the case's own message: `expected the CAMPAIGN arm — measured pre-fix: {mode:'endless', wave:2} for a campaign level` |

**Why:** the mirroring effect `useEffect(() => { modeRef.current = mode }, [mode])` flushes inside the `act()` wrapper around every press, so by the time a jsdom test can deliver the next frame the ref already reads `'campaign'`. The test drives every frame itself, so the same-commit window the direct write exists to cover **never opens here**. That window is real on device: `applyChrome` arrives over a `useAnimatedReaction` → `runOnJS` hop that can land between the synchronous `toggleDevLevel` call and React's post-render effect flush, and a frame in that window would take the endless branch for a run that has already exited.

**What was done about it, rather than just disclosed:** the criterion's evident intent — *Test 3 genuinely discriminates the exit, Test 2 alone is weaker* — is **met**, by the both-writers variant. The un-discriminated line is pinned separately as a source contract (`toggleDevLevel exits endless: records first, writes BOTH mode writers, arms nothing (A-02)`) whose own comment states in full what it does not prove and why (11-09 Pattern 1). **That contract was itself probed:** deleting `modeRef.current = 'campaign'` turns it RED on the named assertion, so it is not a vacuous pin.

## Defect-Pinning Tests Corrected (never deleted)

Two existing cases pinned the round-1 shape and went red under this plan's source change. Both were **rewritten in place**:

| Test | File | Was | Now |
|---|---|---|---|
| `onRetry routes an endless Retry…` | `tests/ui/PlayingHost.endless-host.test.ts` | Required the branch to read `recordInFlightEndlessRun(); startEndlessRun(); return;` — i.e. it pinned the funnel at the CALLER, which is the defect | Pins the shipping contract: the branch routes to `startEndlessRun` and returns, carries **no** funnel reference, and sits **above** the readiness gate |
| `remountDevSession routes the same way` | `tests/ui/PlayingHost.endless-host.test.ts` | Same caller-side regex | Same correction, same three additions |

**Case counts (baseline → now, none decreased):** `PlayingHost.endless-retry.test.tsx` 10 → 17 · `PlayingHost.endless-host.test.ts` 16 → 18 · `PlayingHost.endless-record.test.tsx` 17 → 20.

## Files Created/Modified

- `app/_components/PlayingHost.tsx` — `recordInFlightEndlessRun()` as `startEndlessRun`'s first statement plus its dependency; the call and the dependency deleted from `onRetry` and `remountDevSession`; the endless branch hoisted above the readiness gate in both; `toggleDevLevel` rewritten as the A-02 exit with a JSDoc recording the decision, the only-writer claim and the Phase-14 deletion note
- `tests/ui/PlayingHost.endless-host.test.ts` — two caller contracts corrected in place; a `depsOf()` extractor; a first-non-comment-statement contract for `startEndlessRun`; the `toggleDevLevel` exit contract with its explicit not-proven note
- `tests/ui/PlayingHost.endless-retry.test.tsx` — a `mountOnly()` helper; 3 gap-1 cases (mid-run `Endless` press, new-run-not-resumed, lose-overlay Retry records nothing extra); a 4-case `Lv exits endless (A-02)` describe block
- `tests/ui/PlayingHost.endless-record.test.tsx` — a `loadLevelById` readiness lever independent of `failCompileFrom`, reset in all three `beforeEach` blocks; a `settleAndStartEndless()` extraction shared by the uncontrolled and the new controlled mount; the 3-case hoist describe block driven against the real `ResultOverlay`

## Decisions Made

See `key-decisions` in the frontmatter — five, all carried into STATE.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 2's prescribed falsification check does not discriminate what the plan assumed it would**

- **Found during:** Task 2
- **Issue:** The plan's acceptance criterion says *delete `modeRef.current = 'campaign';` and confirm Test 3 FAILS*. Run as written, all 17 behaviour cases stayed green. Accepting that as a pass would have left the line unfalsified and the criterion silently unmet — the precise failure mode this round exists to stop.
- **Fix:** Bisected (table above) to establish that the ref write is not behaviourally observable in jsdom while the pair of mode writers plainly is, then (a) recorded the both-writers variant as the probe that meets the criterion's intent, and (b) added a source contract pinning the ref write, whose comment states what it does not prove and why the write is still load-bearing on device. The contract was itself probed red.
- **Files modified:** `tests/ui/PlayingHost.endless-host.test.ts`
- **Verification:** `toggleDevLevel exits endless…` RED on deleting `modeRef.current = 'campaign'`, green on restore; full suite 621 passed.
- **Committed in:** `7e6e72b`

**2. [Rule 3 - Blocking] `mountAndStartEndless` could not be both byte-identical and non-duplicating**

- **Found during:** Task 1
- **Issue:** The plan asks the new controlled-mount helper to *reuse `mountAndStartEndless`'s existing wait-and-press sequence rather than duplicating it* and, one sentence later, to leave `mountAndStartEndless` *byte-identical*. Both cannot hold: the new helper renders its own controlled element, so it cannot call the uncontrolled helper.
- **Fix:** Extracted the post-render sequence into `settleAndStartEndless()` and had `mountAndStartEndless` delegate to it. The load-bearing half of the instruction — that `mountAndStartEndless` stays **uncontrolled**, so no existing case silently changes what `toggleDevLevel` does to it — is honoured exactly, and is now stated in a comment at the helper.
- **Files modified:** `tests/ui/PlayingHost.endless-record.test.tsx`
- **Verification:** All 17 pre-existing cases in that file unchanged and green; the file's total rose 17 → 20.
- **Committed in:** `d2d0475`

**3. [Rule 1 - Bug] The live-run precondition in the hoist harness read the wrong prop**

- **Found during:** Task 1
- **Issue:** `liveRunThenCloseTheGate` asserted `hostProps.current?.wave === 2` to confirm the run was live. That prop is `resultWave`, written only at run END, so it reads 0 mid-run and all three hoist cases failed on their own precondition.
- **Fix:** Assert the dev-row readout `W2` instead — the value actually gated on the live wave — with a comment naming the distinction so the next reader does not repeat it.
- **Files modified:** `tests/ui/PlayingHost.endless-record.test.tsx`
- **Verification:** Cases green, and probe 2 confirms they are not green vacuously.
- **Committed in:** `d2d0475`

**4. [Rule 3 - Blocking] `levelError` was not on the harness's `HostProps`**

- **Found during:** Task 1
- **Issue:** The hoist cases prove the readiness gate is genuinely closed rather than assuming the lever worked, which requires reading `levelError` back. `tsc` rejected it — the type in the record harness never listed it.
- **Fix:** Added `levelError?: unknown` to that file's `HostProps` with a comment saying why it is read back.
- **Files modified:** `tests/ui/PlayingHost.endless-record.test.tsx`
- **Verification:** `npm run typecheck` exit 0.
- **Committed in:** `d2d0475`

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 blocking).
**Impact on plan:** No scope change. Deviation 1 is the substantive one — it converts an unmet acceptance criterion into a measured account plus a probed source contract, rather than a green tick over an unfalsified line.

## Issues Encountered

None beyond the deviations above. The tree is green at **both** task commits — unlike 11-09, Task 1's source change and its corrected contracts land in the same commit, so there is no transient-red range in this plan to bisect around.

## Scope Fences Honoured

- **SC-5 is not claimed and `N-END-03` stays `[ ]`.** No automated step here can produce a frame on hardware. `requirements.mark-complete` was deliberately NOT run: `N-END-01` and `N-END-02` were already `[x]` before this plan, and the only unchecked ID in the plan's `requirements` array is `N-END-03`, whose unchecked box is CORRECT. `requirements-completed` is `[]` — nothing changed state.
- **`N-END-02` untouched at `[x]`.**
- **The bake path is frozen.** `ENDLESS_BRICK_DIMS` / `bakeGlowSprites(brickW, brickH)` untouched — owner-accepted Phase 14 debt.
- **No production endless entry point**, no permanent endless record surface, no election of a primary record. The `devLevelSwitch` markup and its `typeof __DEV__ !== 'undefined' && __DEV__` guard have a zero-line diff.
- **`src/core` and `src/levelgen` have a zero-line diff**, verified by `git diff --stat` over the plan range.
- **The ops-doc corrections belong to 11-11.** `docs/ops/ENDLESS-MODE.md` is untouched by this plan — its bold invariant is now TRUE of the code, but retiring A-02's OPEN status, adding the two missing boundary-table rows and narrowing the SC-5 do-not-press note are 11-11's scope, not this plan's.

## Flagged Assumptions (still flagged, none resolved)

The 11-UI-SPEC § UI Considerations row E5 `error` stays **unresolved**: this plan resolves the `Lv` control by owner decision, but the row itself is not re-run, and the tier button and `Cert WC` are NOT re-specified. `Cert WC` in particular still forces `levelId` to `level-03` and the tier to mid while mode is endless, so it remains hazardous during an SC-5 reading — 11-11 narrows the ops note to name it. The five spec-less-probe edge rows recorded once in `11-09-PLAN.md` remain flagged and unresolved.

## Verification

Plan-level chain, all green:

- `npx vitest run tests/ui/PlayingHost.endless-retry.test.tsx tests/ui/PlayingHost.endless-host.test.ts tests/ui/PlayingHost.endless-record.test.tsx tests/ui/PlayingHost.endless-run.test.tsx tests/ui/PlayingHost.endless.test.ts tests/ui/PlayingHost.bake-gate.test.ts tests/ui/PlayingHost.next-bake.test.ts` → **7 files, 76 tests passed**
- Full suite: `npx vitest run` → **97 files, 621 tests passed** (baseline 609; +12 = 7 retry, 2 host, 3 record)
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0
- No test file lost a case; the two corrected cases were rewritten in place.
- Both plan-mandated falsification checks for Task 1 produced a RED before restore; Task 2's produced the documented non-red, bisected and covered above.

## Known Stubs

None. The four changed files were scanned across the plan's diff range for hardcoded empty values, placeholder copy, `TODO`/`FIXME`, and skipped/todo tests — zero hits.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or trust-boundary schema change. The plan's `<threat_model>` mitigations are implemented and asserted: `T-11-07` (funnel inside `startEndlessRun`, argument-level assertion) by coverage `D1`/`D4`; `T-11-08` (campaign run must not reach the endless arm) by `D9`, which narrows the union by throwing; `T-11-09` (the dead compiled-push gate) by `D11`'s only-writer count; `T-11-10` (`__DEV__` row in production) untouched, with `PlayingHost.endless.test.ts`'s guard-count contract green in the chain; `T-11-11` (double-record) by `D3`.

## Next Phase Readiness

- **Ready for 11-11**, which owes the ops-doc corrections this plan's code has now earned: `docs/ops/ENDLESS-MODE.md` § The run boundary and the record display can restate the "every path records first" invariant because the code holds it, the boundary table needs rows for the `__DEV__` `Endless` button and `toggleDevLevel`, A-02's OPEN status can retire, and the SC-5 do-not-press note narrows to name `Cert WC` specifically rather than the whole dev row.
- **Carried open, unchanged:** the SC-5 device reading (human-gated), the E1 320px-panel overflow backstop, and the five flagged edge-probe rows.
- **Noted for 14-title-routes:** `startEndlessRun` is now the single site holding the record-before-discard invariant. Promoting it to the production entry point carries the invariant with it — but a Retry against a closed readiness gate now ENDS the run, which is correct for a dev row and worth re-deciding when a real Title route exists.

---
*Phase: 11-endless-mode*
*Completed: 2026-09-26*

## Self-Check: PASSED

All four modified source/test files and the SUMMARY exist on disk. Both task commits
(`d2d0475`, `7e6e72b`) are present in `git log --oneline --all`. `commits: 2` in the
frontmatter is MEASURED — `git rev-list --count 2012208..HEAD` at SUMMARY-write time
returned 2 (the two task commits; this docs commit lands after the count, per the
ledger contract).
