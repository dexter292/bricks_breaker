---
phase: 11-endless-mode
verified: 2026-09-28T09:46:44Z
status: human_needed
score: 26/28 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/phases/11-endless-mode/11-01-PLAN.md"
  - ".planning/phases/11-endless-mode/11-01-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-02-PLAN.md"
  - ".planning/phases/11-endless-mode/11-02-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-03-PLAN.md"
  - ".planning/phases/11-endless-mode/11-03-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-04-PLAN.md"
  - ".planning/phases/11-endless-mode/11-04-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-05-PLAN.md"
  - ".planning/phases/11-endless-mode/11-05-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-06-PLAN.md"
  - ".planning/phases/11-endless-mode/11-06-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-07-PLAN.md"
  - ".planning/phases/11-endless-mode/11-07-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-08-PLAN.md"
  - ".planning/phases/11-endless-mode/11-08-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-09-PLAN.md"
  - ".planning/phases/11-endless-mode/11-09-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-10-PLAN.md"
  - ".planning/phases/11-endless-mode/11-10-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-11-PLAN.md"
  - ".planning/phases/11-endless-mode/11-11-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-12-PLAN.md"
  - ".planning/phases/11-endless-mode/11-12-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-13-PLAN.md"
  - ".planning/phases/11-endless-mode/11-13-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-14-PLAN.md"
  - ".planning/phases/11-endless-mode/11-14-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-15-PLAN.md"
  - ".planning/phases/11-endless-mode/11-15-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-16-PLAN.md"
  - ".planning/phases/11-endless-mode/11-16-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-17-PLAN.md"
  - ".planning/phases/11-endless-mode/11-17-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-18-PLAN.md"
  - ".planning/phases/11-endless-mode/11-18-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-19-PLAN.md"
  - ".planning/phases/11-endless-mode/11-19-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-20-PLAN.md"
  - ".planning/phases/11-endless-mode/11-20-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-21-PLAN.md"
  - ".planning/phases/11-endless-mode/11-21-SUMMARY.md"
  - ".planning/phases/11-endless-mode/11-REVIEW.md"
  - ".planning/phases/11-endless-mode/11-SECURITY.md"
  - ".planning/phases/11-endless-mode/11-UAT.md"
  - ".planning/phases/11-endless-mode/11-UI-SPEC.md"
  - "app/_components/PlayingHost.tsx"
  - "app/_components/certLevelPlan.ts"
  - "docs/ops/ENDLESS-MODE.md"
  - "src/render/recordOverlay.ts"
  - "src/render/recordSprites.ts"
  - "src/runtime/GameScreen.tsx"
  - "src/runtime/useGameLoop.ts"
  - "src/services/storage/catalog.ts"
  - "tests/runtime.cert-request.test.ts"
  - "tests/ui/GameScreen.test.tsx"
  - "tests/ui/PlayingHost.endless-host.test.ts"
  - "tests/ui/PlayingHost.endless-record.test.tsx"
  - "tests/ui/PlayingHost.endless-retry.test.tsx"
  - "tests/ui/PlayingHost.endless.test.ts"
  - "tests/ui/certLevelPlan.test.ts"
covered_digest: "v1:sha256:7b50d7f06e8e03d3f7e4fbfd1e5fed9c7650bb21f2267a65daf67745a53af03a"
behavior_unverified: 2
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 26/28
  scope: >-
    ROUND 7 — a NARROW re-stamp, not a re-derivation. Commissioned because commit `eec2137`
    ("repair four dev-tool display defects found on the simulator") touched two files inside
    this report's `covered_files` and staled the round-6 stamp. The question asked was whether
    that commit disturbed anything phase 11 had verified. It did not — verdict and evidence in
    "The `eec2137` verdict" below. The round-6 findings (26/28, zero gaps, two behaviour-
    unverified) are carried forward unchanged, re-confirmed at HEAD by three mutation probes
    rather than by re-reading the round-6 text.
  gaps_closed: []
  gaps_remaining: []
  regressions: []
  advisories_closed:
    - >-
      WR-01 (the stale `ENDLESS-MODE.md` source pointer) is CLOSED, by owner decision recorded
      as UAT test 4 (Option A — patch the pointer in place). VERIFIED AT SOURCE BY ME, not read
      from the UAT note: the expression 11-19 deleted
      (`runEndedRef.current && modeRef.current ...`) now occurs **0 times across the whole of
      `docs/`** (measured over all 66 files, every count 0), and `certLevelPlan` occurs **3
      times** in `docs/ops/ENDLESS-MODE.md` where round 6 measured 0. This was the one residual
      falsehood behind round 6's flagged judgment-tier prohibition ("MUST NOT assert an
      invariant in `docs/ops/ENDLESS-MODE.md` that the shipped code does not hold"); with the
      pointer re-pointed, that prohibition now HOLDS in full rather than "held for the
      mechanism, not for one pointer".
deferred:
  - truth: "A player can start an endless run from a production entry point"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 success criterion 1: 'Title offers campaign, endless and daily as distinct
      entries'. The `__DEV__`-only entry is sanctioned Phase 11 scope (11-05 D-05) and
      ENDLESS-MODE.md § Limits item 4 records the same. Carried forward unchanged from rounds
      2-6.
  - truth: "A permanent endless record surface, and electing which of bestScore / bestWave is THE record"
    addressed_in: "Phase 14"
    evidence: >-
      Phase 14 SC-1/SC-2. ENDLESS-MODE.md § Limits item 4 records it, and 11-08 deliberately
      ships the endless Results overlay as the only endless-record reader without electing a
      primary record (A-08). Carried forward unchanged.
  - truth: "Endless bricks draw an unstretched glow halo (ENDLESS_BRICK_DIMS / A-04)"
    addressed_in: "Phase 14"
    evidence: >-
      Owner-decided accepted debt of 2026-09-26, recorded in ENDLESS-MODE.md § Flagged
      assumptions A-04 and § Limits item 7 with the measured 0.77x / 0.85x stretch. Carried
      forward. `eec2137` touches no bake key, no `loadKey` and no renderer geometry — its
      `recordSprites.ts` delta is one argument added to a call that only runs behind
      `drawOverlayFlag`.
advisory:
  - finding: >-
      SCOPE NOTE, and the most important thing in this round-7 stamp. `eec2137` is NOT the only
      commit to have entered this report's `covered_files` since the round-6 stamp of
      2026-09-26. **Phase 12 (daily challenge) feature work has landed in three of the four
      phase-11 implementation files**: `app/_components/PlayingHost.tsx` (7 commits),
      `src/runtime/GameScreen.tsx` (4), `app/_components/certLevelPlan.ts` (1) and
      `src/runtime/useGameLoop.ts` (1) — `f880fd0`, `1dd63d9`, `1e6b96e`, `5967066`, `28fe3d4`,
      `c3344c3` and siblings. The orchestrator's framing of this round ("the orchestrator caused
      that — not a phase-11 change", pointing at `eec2137` alone) is therefore incomplete, and I
      am saying so rather than accepting the narrow frame silently.
    category: architectural
    reason: >-
      ADVISORY rather than a gap, and here is the reasoning rather than a reassurance. What
      protects phase 11 against that drift is that nearly every phase-11 must-have is pinned by
      a source-contract or driven-render instrument, and **every one of those instruments is
      green at HEAD and still DISCRIMINATING** — which I established by mutation in this
      process, at HEAD, downstream of all Phase 12 work, not by re-reading round 6 (three probes,
      tabulated below; all three reproduced their recorded round-6 result exactly). The full
      workspace is green at HEAD at 107 files / 798 tests, up from round 6's 99 / 663. The
      must-haves that are NOT instrument-pinned are precisely the two behaviour-unverified
      truths, and those are already routed to human verification where they belong.
      What I did NOT do, and a future round may want to: re-derive phase 11's truths against the
      Phase 12 deltas term by term. My commission this round was `eec2137` and I kept to it.
      The residual exposure is a phase-11 behaviour that no phase-11 instrument pins AND that
      Phase 12 moved — I know of none, and the green discriminating suite is evidence against
      one, but it is not a proof and I will not dress it as one.
    evidence_status: "measured (git log over covered impl files since 2026-09-26T15:56:05Z; full suite green at HEAD; three discriminating mutation probes at HEAD)"
  - finding: >-
      UAT tests 2 and 3 carry `result: pass` with NO observation record attached. Test 2 is "the
      cert self-cancel's positive direction" (truth 15) and test 3 is "E1 / E3 overflow
      backstops" — the two items whose own `why_human` text reads "No harness in this repo can
      observe the positive direction of the drop" and "jsdom computes no layout". Neither entry
      records a device, a build, a value read, or what was seen. The asymmetry is what makes this
      worth naming: test 1, the same owner in the same session, carries a full dated transcript
      (device, viewport, build provenance, p95/p99 figures, sample counts, log-line counts, and
      an explicit statement of what it does NOT establish).
    category: other
    reason: >-
      ADVISORY, and deliberately NOT resolved unilaterally in either direction. I have not banked
      these into the score, because a bare `pass` on an item declared unobservable is not the
      "directly observed behaviour" that upgrading a PRESENT_BEHAVIOR_UNVERIFIED truth requires,
      and silently crediting it is exactly the over-claim this phase has spent six rounds
      striking. Equally I have not overruled the owner: the UAT file is the designated human
      sink, a human said pass, and re-litigating that from here would be its own overreach.
      CONSEQUENCE, stated plainly: truth 15 is **one attached observation away from 27/28**. If
      the owner attaches what was seen for UAT test 2 (dev build, the endless detour, zero
      injections on the later `level-03` session), truth 15 upgrades to VERIFIED and the score
      becomes 27/28. Recording an `overrides:` entry would do the same. Until then the score
      stays 26/28 and this sits here rather than inside the number.
      Note this changes NOTHING about status: SC-5 keeps the phase at `human_needed` either way.
    evidence_status: "measured (11-UAT.md: tests 2/3 carry result: pass with no observation block; test 1 carries a full transcript)"
  - finding: >-
      WR-02 — the discharge clear `certPendingRef.current = false;` is pinned only by a
      `toBeGreaterThanOrEqual(1)` count, and since 11-19 added the self-cancel clear there are
      TWO matches, so either can be deleted without moving the count below 1. Round 6 reproduced
      this by mutation (deletion left the whole workspace green).
    category: architectural
    reason: >-
      ADVISORY, carried forward from round 6 UNCHANGED and not re-measured this round — `eec2137`
      cannot reach it (the commit's only `PlayingHost.tsx` JSX delta is one `style` prop value on
      the wave readout, ~130 lines below this code, plus additive StyleSheet entries). The
      shipped code is correct; both clears are present. Closure remains: replace the count with
      two site-bound `.toMatch` assertions, then re-run the deletion; it must red.
    evidence_status: "carried from round 6 (measured there); not re-measured this round — out of commission scope"
  - finding: >-
      WR-03 — the level-half gate is a loose regex
      (`/if\s*\(\s*plan\s*===[\s\S]*?\)\s*\{[\s\S]*?setLevelId\(/`) that accepts extra conjuncts
      built from any identifier the anti-drift counts do not name. Round 6 reproduced it by two
      mutations, both leaving the workspace green.
    category: architectural
    reason: >-
      ADVISORY, carried forward from round 6 UNCHANGED, and this round adds one genuinely new
      data point in its favour rather than merely restating it. My probe 2 — adding
      `&& !runEndedRef.current` to the level half at `PlayingHost.tsx:2410` — DID red, at
      `endless-host.test.ts:1611`, on the `runEndedRef` identifier count (expected 0, received
      1). So the hole is narrower than "any extra conjunct": a conjunct built from `runEndedRef`
      or `modeRef` IS caught. It is a conjunct built from a THIRD identifier that escapes, which
      is what round 6's `waveAdvanceInFlightRef` mutation demonstrated. No present defect.
      Closure unchanged: pin the level-half gate to the exact literal `/if \(plan === 'force'\) \{/`,
      as the arm's gate already is.
    evidence_status: "carried from round 6; refined this round by probe 2 (identifier-named conjuncts ARE caught; a third-identifier conjunct is not)"
  - finding: >-
      WR-04 — the self-cancel's comment (`PlayingHost.tsx`) offers two mechanisms, neither true
      as stated; the comment's own next sentence states the true reason.
    category: other
    reason: >-
      ADVISORY, carried forward from round 6 unchanged. Not re-measured; `eec2137` does not touch
      that comment. Behaviour is correct.
    evidence_status: "carried from round 6 (confirmed at source there)"
  - finding: >-
      Carried and re-confirmed structurally: (a) five near-identical run-boundary reset blocks in
      `PlayingHost.tsx`; (b) `runCertWorstCase`'s deps comment still says "stable useState
      setters" when `setLevelId` is a `useCallback`; (c) the `Cert WC` cell of the run-boundary
      table in `ENDLESS-MODE.md` is ~1,700 words carrying five dated revisions plus a sixth from
      this round's WR-01 re-point, and the rewrite-versus-patch choice the owner answered with
      Option A explicitly did not foreclose the rewrite; (d) `codeOnly()` strips `//` but not
      `/** */`.
    category: architectural
    reason: "Each still true, each inert or fail-safe today. Recorded so they are not rediscovered as new."
    evidence_status: "structural only — no failing artifact"
  - finding: >-
      Lint at HEAD: `3 problems (0 errors, 3 warnings)` — up from round 6's 2. Two are the
      carried `ReadonlyArray<T>` warnings in `tests/ui/PlayingHost.endless-host.test.ts` (now at
      `:386` and `:391`, moved from `:367`/`:372` by intervening edits). The third is outside
      the phase-11 file set.
    category: other
    reason: "Re-measured by me at HEAD: `npm run lint` → 0 errors, 3 warnings. Cosmetic; `--fix` clears them."
    evidence_status: "measured at HEAD (npm run lint)"
behavior_unverified_items:
  - truth: >-
      SC-5 / N-END-03 — wave transitions do not stall the loop: the next board is ready without a
      frame spike that breaks the Mid budget
    test: >-
      Launch a dev build (NOT a `CERT_HARNESS` / profiling build — that one mounts on `level-03`
      and auto-arms the cert injection) ON A PHYSICAL DEVICE; arm the perf overlay; press the
      `Endless` button in the `__DEV__` dev row on the playing HUD; play waves 1 through 5; watch
      each transition specifically — the moment the last brick of a board breaks and the next
      board appears. DO NOT PRESS `Cert WC` AT ANY POINT: a press does not spend its worst-case
      load on the run that just ended, it QUEUES the load on `certRequest` and it lands on the
      FIRST FRAME OF YOUR NEXT RUN, including a `Retry` from the panel you are looking at. If
      `Cert WC` is pressed at all, restart the app and take the reading again. `Lv` is safe.
      `docs/ops/ENDLESS-MODE.md` § Limits item 2 states this correctly and, as of this round's
      WR-01 closure, its source pointer is correct too.
      NOTE FOR THIS ROUND: the perf overlay you will read this on was REPAIRED by `eec2137` —
      before that commit its first two lines rendered underneath the dev row and it had no
      backdrop over the brick field. The instrument is now legible; the reading is still untaken.
    expected: >-
      No visible black playfield at a transition; no audio hiccup; no `[audio] preload soft-fail`
      line in the log mid-run; frame times stay inside the Mid budget across each transition
      (p50 <= 16.7 ms, p95 <= 20 ms). The stretched glow halo on every brick is EXPECTED and
      ACCEPTED (A-04) — not a failure signature.
    why_human: >-
      No automated step in this repo can produce a frame on hardware; nothing here drives a
      Reanimated worklet. A SIMULATOR DRY RUN was recorded on 2026-09-28 (11-UAT.md test 1) and
      is explicitly NOT a reading: all four transitions W1→W2→W3→W4→W5 were traversed with the
      overlay armed, p95/p99 held at 16.67 ms throughout, and `frames>16.7ms` stayed at 3 from
      152 samples (campaign, pre-endless) to 3 / 28,682 at wave 5 — zero over-budget frames added
      by endless play or by any transition; signature (a) not observed and signature (c) measured
      0 `preload soft-fail` lines in 62,081 device-log lines. That NARROWS the risk and does not
      close it: **signature (d) is out of scope on a simulator** — a Mac has far more headroom
      than the Mid-tier phone the budget is written for — and the waves were only reachable via a
      temporary harness affordance (paddle widened 72→360 logical, reverted; `git diff` over
      source empty). `Device digest` stays OPEN and `N-END-03` stays `[ ]`.
  - truth: >-
      (11-19 truth 8) An arm cannot outlive its own reachability — the deferred-cert effect's
      self-cancel drops `certPendingRef` when the predicate answers `'unreachable'` at discharge
      time
    test: >-
      On a dev build: from a mounted campaign Results panel already at `level-03`, press
      `Cert WC` (this arms legitimately, cell 7), then leave to endless via the `Endless` dev
      button before the deferral discharges, then return to a campaign `level-03` session. The
      one-shot must NOT fire on that later session.
    expected: "Zero worst-case injections on the later session — the arm was dropped, not carried."
    why_human: >-
      Measured in round 6: deleting the entire self-cancel clause reds exactly ONE case — a
      SOURCE contract — and leaves the behaviour suite green. The clause is pinned at source
      only; its positive direction is unobservable by any harness in this repo. Gap 1's closure
      does NOT depend on it (cell 5 stayed green under the same deletion).
      STATUS THIS ROUND: 11-UAT.md test 2 reports `result: pass`, but with no observation record
      attached — see the second advisory. Held here rather than banked into the score; one
      attached observation (or an `overrides:` entry) moves this to VERIFIED and the score to
      27/28.
  - truth: >-
      (Backstop, 11-15 / 11-21) E1 — a 320px Results panel at a 7-digit score and a 4-digit wave
      shows no wrap and no clipping
    test: >-
      On a device or a layout-capable renderer, open an endless Results panel with
      `score = 9999999` and `wave = 1234` and inspect the `Score ·`, `Wave ·`, `Best ·` and
      `Best wave ·` lines at the shipped 320px panel width.
    expected: "Every line renders on one row, fully visible, with no ellipsis and no overflow."
    why_human: >-
      `verification: backstop`. jsdom computes no layout. 11-UI-SPEC's ~28-monospace-character
      fit is arithmetic, not a rendering. 11-UAT.md test 3 reports `pass` without an observation
      record — same treatment as above. Not counted in `behavior_unverified` (not one of the 28
      scored truths); listed so it is not lost.
  - truth: >-
      (Backstop, 11-21) E3 — a 48px HUD row at a 7-digit score and a 3-digit combo shows no wrap
      and no clipping
    test: "Same, against the playing HUD row at `score = 9999999` and `combo = 137`."
    expected: "The HUD row renders on one line at 48px with no wrap and no clipping."
    why_human: >-
      Same — jsdom computes no layout. Note the sibling E5 backstop on the same row DID come back
      positive on a device this round (the row clipped at the left on a 402pt viewport), which is
      what `eec2137` fixed — so this family of backstops is demonstrably not vacuous.
coincidental_reliance_items: []
human_verification:
  - test: >-
      SC-5 DEVICE READING — the one live item, and the only thing standing between this phase and
      `passed`. See `behavior_unverified_items[0]` for the full procedure. Requires a PHYSICAL
      DEVICE: 11-UAT.md test 1 is `blocked` / `physical-device`, correctly reclassified from
      `skipped` on 2026-09-28 (`skipped` said "passed over"; `blocked` says "cannot be done
      here"). The simulator dry run of the same date narrowed the risk on signatures (a) and (c)
      and cannot address signature (d) at all.
    expected: "p50 <= 16.7 ms and p95 <= 20 ms across each wave-1..5 transition, with none of the four failure signatures."
    why_human: "No automated step in this repo can produce a frame on hardware. `Device digest` is OPEN; `N-END-03` is `[ ]`."
  - test: >-
      ATTACH THE OBSERVATION for UAT test 2 (the cert self-cancel's positive direction) and UAT
      test 3 (the E1 / E3 overflow backstops) — or record an `overrides:` entry accepting them as
      they stand. Both currently read `result: pass` with no record of what was done or seen.
      Optional and NOT load-bearing for any gap; test 2's absence reds only a source contract.
    expected: "Either an observation record (build, steps, what was seen) or an explicit override. Resolving test 2 moves the score to 27/28; status is unaffected."
    why_human: "No harness in this repo can observe either; the UAT file is the designated sink and the owner owns the call."
  - test: >-
      FLAGGED PROHIBITIONS (judgment tier, all 11-19 / 11-20 / 11-21 statements). Verifier
      judgement, non-authoritative, RE-CHECKED THIS ROUND against `eec2137`: HELD for all of
      them, and now held MORE completely than in round 6 — the one half round 6 could not hold
      (the `ENDLESS-MODE.md` source pointer, WR-01) is closed and I verified its closure at
      source. Specifically re-checked this round: `runCertWorstCase`'s body is BYTE-IDENTICAL
      across `eec2137` (560 chars, `runEndedRef` 0, `modeRef` 0, `plan === 'force'` 1);
      `showPauseOverlay` is byte-identical at all three revisions; the `__DEV__` guard idiom
      `typeof __DEV__ !== 'undefined' && __DEV__` is intact and is still the ONE guard on the dev
      row; no instrument was weakened, deleted or re-pointed; `N-END-03` untouched at `[ ]`; no
      device reading was written. Owner spot-confirmed the round-6 set as UAT test 5 (`pass`).
    expected: "Spot-confirm or overrule the judgement for the `eec2137` delta."
    why_human: >-
      unverified-prohibition — human review recommended. Judgment tier by declaration; recorded
      here rather than silently absorbed into the score.
---

# Phase 11: Endless Mode — Verification Report (round 7, narrow re-stamp)

**Phase Goal:** A run that never runs out of board, escalating until the player misses
**Verified:** 2026-09-28T09:46:44Z
**Status:** human_needed
**Score:** 26/28 — unchanged
**Re-verification:** Yes — round 7, narrow. Commissioned by commit `eec2137`, not by a phase-11 change.

## The `eec2137` verdict

**`eec2137` disturbed nothing that phase 11 verified.** Every claim below is something I measured
in this process; none of it is read from the commit message or from a SUMMARY.

The commit is 4 files, +116/−26, and most of the insertion count is comment. Two of the four files
(`src/runtime/GameScreen.tsx`, `app/_components/PlayingHost.tsx`) are inside this report's
`covered_files`, which is why the stamp went stale.

### 1. `showPauseOverlay` (WR-02's pinned contract) — UNTOUCHED, and still discriminating

The orchestrator's pre-check was that
`git diff eec2137~1..eec2137 -- src/runtime/GameScreen.tsx | grep -iE "showPause|uiPhase|result"`
returns nothing. **I ran it myself: exit 1, no output.** I then widened it to the whole commit —
all four files, not just `GameScreen.tsx` — and it is *also* empty. Nothing in `eec2137` mentions
`showPauseOverlay`, `uiPhase` or `result` on any line.

Extracting the definition at all three revisions confirms it byte for byte:

```
eec2137~1 : const showPauseOverlay = !hasLevelError && uiPhase === 'paused' && result == null;
eec2137   : const showPauseOverlay = !hasLevelError && uiPhase === 'paused' && result == null;
HEAD      : const showPauseOverlay = !hasLevelError && uiPhase === 'paused' && result == null;
```

The whole `GameScreen.tsx` delta is a single `const padL = Math.max(insets.left, 16);` plus
`left: padL,` in the `devSwitchSlot` inline style — an absolutely-positioned box that previously
had `top` + `right` only and therefore grew leftwards off-screen.

**And the shipped negative cases still pass, and still discriminate** — probe 1 below.

### 2. The round-6 anti-drift gate — UNTOUCHED, and it still discriminates

`runCertWorstCase`'s body, extracted with the test's own `codeOnly` stripping, is **identical at
560 characters** before and after the commit, with every gated count unmoved:

| Measure | `eec2137~1` | HEAD |
|---|---|---|
| body length (comments stripped) | 560 | 560 |
| `runEndedRef` occurrences | 0 | 0 |
| `modeRef` occurrences | 0 | 0 |
| `plan === 'force'` | 1 | 1 |
| `const plan = certLevelPlan();` (file-wide) | 1 | 1 |

`certLevelPlanFor`'s three consumers are all present and untouched at HEAD — the level half
(`if (plan === 'force')`, `:2410`), the arm (`certPendingRef.current = plan !== 'unreachable';`,
`:2430`) and the deferred-cert effect's self-cancel (`certLevelPlan() === 'unreachable'`, `:2471`).
I broke it to confirm the gate reads the code rather than the assertion — probe 2 below.

### 3. The dev-row source contracts — the extraction still matches what it means to match

`tests/ui/PlayingHost.endless.test.ts` pulls the dev row out with
`/const devLevelSwitch =([\s\S]*?)\n {4}\) : null;/` and then counts guards inside it. A `style`
prop change and a StyleSheet addition *should* be invisible to that. I did not take "the suite is
green" as proof of it — I re-ran the extraction myself at both revisions:

| Measure | `eec2137~1` | HEAD |
|---|---|---|
| extractable | true | true |
| region length | 2353 | 2349 |
| `DEV_GUARD` (full idiom) count | 1 | 1 |
| `__DEV__` token count | 2 | 2 |
| `Endless` / `Lv` / `Cert WC` / `W{n}` readout present | all 4 | all 4 |
| `styles.*` referenced | devRow, devSwitch, devSwitchLabel | devRow, devSwitch, devSwitchLabel, **devReadout** |

Diffing the two extracted regions returns **exactly one hunk** — `style={styles.devSwitchLabel}` →
`style={styles.devReadout}` on the `W{n}` `Text`. Nothing else inside the guarded region moved. The
terminator did not shift, so the extraction is not truncating early and going vacuously green.

### 4. T-11-04 / T-11-15 / T-11-18 — the `__DEV__` guard form is intact and still the only gate

`T-11-15` records the required form as `typeof __DEV__ !== 'undefined' && __DEV__` at the dev-row
site and records its own falsification: replacing it with a bare `__DEV__` reds **2** cases in
`tests/ui/PlayingHost.endless.test.ts`. At HEAD the idiom is present at that site
(`PlayingHost.tsx:2535`), and the extraction above shows `DEV_GUARD == 1` with `__DEV__ == 2`
inside the row — i.e. every `__DEV__` token in the row belongs to the one full guard, and there is
exactly one guard. I reproduced T-11-15's mutation — probe 3 below.

**On the wrapping question specifically:** the row is now two lines on a 402pt viewport, and that
change is *purely* a style property (`flexWrap: 'wrap'`, `justifyContent: 'flex-end'`, `rowGap: 8`
added to `styles.devRow` in the StyleSheet). It is a layout behaviour, not a structural JSX move.
No control was added, removed, re-parented or lifted out. All seven controls plus the readout
remain children of the single guarded `devLevelSwitch` element, which is what the `DEV_GUARD == 1`
and `__DEV__ == 2` counts over the extracted region prove. **Wrapping did not move anything outside
the guard.** `T-11-04` and `T-11-18` are compiler-measured (`TS2339`/`TS7053` on widening the store
gate) and `npx tsc --noEmit` exits 0 at HEAD.

### 5. The two files NOT in `covered_files` — out of reach, and I checked rather than assumed

`src/render/recordOverlay.ts` and `src/render/recordSprites.ts` are not phase-11 surface: no
phase-11 artifact mentions them (grep over the whole phase directory returns nothing). The
`recordSprites.ts` delta is +1/−1 — `drawOverlay(canvas, metrics, hudFont)` gains an `hPx`
argument, where `hPx` was already computed 300 lines above — and it sits inside
`if (drawOverlayFlag && hudFont)`, so it cannot execute unless the perf overlay is armed. No
geometry, no `LOGICAL_W`/`LOGICAL_H`, no bake key, no simulation path.

They *are* now in `covered_files`, deliberately and for a reason worth stating: `recordOverlay.ts`
renders the p50/p95/p99 figures that **the SC-5 reading is taken from**. It is the SC-5 instrument.
A future change to it is a change to the measuring device for this phase's one open criterion, and
the stamp should go stale when that happens.

## Behavioural Spot-Checks — three discrimination probes, run at HEAD

Not "the suite is green". Each probe breaks the thing and checks the named guard notices.
All three reproduced their recorded round-6 result exactly.

| # | Probe | Command | Result | Status |
|---|-------|---------|--------|--------|
| — | Baseline, the 5 affected contract files | `npx vitest run` on the 5 files | 5 files / 80 tests passed | ✓ PASS |
| 1 | `showPauseOverlay` `&&` → `\|\|` | mutate `GameScreen.tsx:177`, run `tests/ui/GameScreen.test.tsx` | **2 failed / 8 passed** — exactly `playing + no result: no pause overlay` and `paused + a result: no pause overlay` | ✓ PASS — discriminates |
| 2 | Anti-drift gate: re-introduce an inline term | add `&& !runEndedRef.current` to the level half at `PlayingHost.tsx:2410`, run `endless-host` | **1 failed / 26 passed**, `AssertionError` at `endless-host.test.ts:1611`: *"ZERO occurrences of the run-ended latch identifier in runCertWorstCase … expected 1 to be +0"* | ✓ PASS — discriminates on the count, not on the assertion text |
| 3 | T-11-15: bare `__DEV__` | replace the idiom at `PlayingHost.tsx:2535` with `__DEV__ ?`, run `PlayingHost.endless.test.ts` | **2 failed / 4 passed** — the single-guard case and the full-idiom case, exactly the 2 T-11-15 records | ✓ PASS — reproduces the register's measurement |

All three mutations were reverted. `git status` at the end of this process shows only the two
pre-existing `.planning` entries present at session start (`M .planning/config.json`,
`?? .planning/state.json`); `git diff --quiet -- src/ app/ tests/` exits 0, so no mutation residue
survives.

## Gates at HEAD — re-measured first-hand

| Gate | Command | Result | Status |
|---|---|---|---|
| Full workspace | `npm test` | **exit 0 — 107 files / 798 tests passed**, and the five chained `assert-*.mjs` (worklet-closures, level-solvability, eas-profiles, brand-name, streak-evidence) all pass, which the chain's `&&` proves | ✓ PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint | `npm run lint` | `✖ 3 problems (0 errors, 3 warnings)` | ✓ PASS |

Round 6 measured 99 files / 663 tests; HEAD is 107 / 798.

## Observable Truths — carried, with the round-7 delta marked

Round 6's 28 load-bearing truths are carried forward. `eec2137` moved none of them. Only the rows
where something changed this round are re-stated; the rest are unchanged and were re-confirmed as
regressions by the green, *discriminating* suite at HEAD.

| # | Truth (SC) | Status | Round-7 note |
|---|---|---|---|
| 1 | Clearing a board advances to the next generated one in the same run; lives, score and combo carry over; the run ends only at zero lives | ✓ VERIFIED | Unchanged. `eec2137` touches no simulation, generator, runtime or storage path |
| 2 | Difficulty rises with wave number through the generator's difficulty input, with the ramp written down | ✓ VERIFIED | Unchanged |
| 3 | Endless records stored separately from campaign progress | ✓ VERIFIED | Unchanged. The display firewall's guard rides on the cert level half, whose body is byte-identical across `eec2137` |
| 4 | A seeded endless run is reproducible end to end | ✓ VERIFIED | Unchanged |
| 5 | Wave transitions do not stall the loop: no frame spike outside the Mid budget | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | **Still open, and correctly so.** The 2026-09-28 simulator dry run narrows signatures (a) and (c) to zero and cannot address signature (d) at all. `eec2137` *repaired the instrument* (the overlay drew under the dev row and had no backdrop) without taking the reading |
| 6 | No `__DEV__` control arms a one-shot whose discharge the same change made unreachable | ✓ VERIFIED | Unchanged; the gate re-confirmed discriminating by probe 2 |
| 7 | `ENDLESS-MODE.md` and its three code-adjacent siblings state the cert-press mechanism truthfully | ✓ VERIFIED — **advisory WR-01 now CLOSED** | The residual stale source pointer is gone. Measured by me: the deleted expression is **0 across all of `docs/`**; `certLevelPlan` is **3** in `ENDLESS-MODE.md` (was 0) |
| 8–14 | 11-19's predicate truths (one definition, three consumers, 20-cell table, cells 5 and 7 driven, 33 cases green) | ✓ VERIFIED | Unchanged. `runCertWorstCase` byte-identical; all three consumers present at `:2410`, `:2430`, `:2471` |
| 15 | An arm cannot outlive its own reachability — the self-cancel | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Source-pinned only. 11-UAT test 2 now reports `pass` but attaches no observation — **not banked into the score**; see advisory 2. One attached observation → 27/28 |
| 16–21 | 11-20's queueing-instrument truths | ✓ VERIFIED | Unchanged; truth 21's WR-01 caveat is discharged this round |
| 22–23 | `showPauseOverlay` acquires negative render cases, RED under the operator mutation | ✓ VERIFIED | **Re-proved at HEAD by probe 1** — the `&&`→`\|\|` mutation still reds exactly those two cases |
| 24–28 | 11-21's record truths (REQUIREMENTS coherence, N-END-01/02 re-tick, N-END-03 `[ ]`, evidence-gated edit) | ✓ VERIFIED | `N-END-03` re-confirmed `[ ]` at `.planning/REQUIREMENTS.md:182` |

**Score: 26/28 truths verified** (2 present, behaviour-unverified: SC-5's device half and 11-19's
self-cancel). **Unchanged from round 6, and that is the correct outcome** — `eec2137` moved nothing
in either direction.

## Does the simulator dry run change the score?

**No, and it should not.** This is the question the commission asked to be answered plainly.

The dry run is good evidence and it is honestly labelled in `11-UAT.md` as *not a reading*. It
traversed all four transitions with the overlay armed and found p95/p99 pinned at 16.67 ms and
`frames>16.7ms` unchanged at 3 from 152 samples through 3 / 28,682 at wave 5 — **zero over-budget
frames added by endless play or by any transition**. That is a real narrowing: failure signature
(a) was not observed and signature (c) measured 0 `preload soft-fail` lines across 62,081 device-log
lines.

What it cannot do is discharge SC-5. **Signature (d) is out of scope on a simulator** — a Mac has
far more thermal and CPU headroom than the Mid-tier phone the 16.7 ms budget is written for, so a
clean simulator trace is consistent with a device that misses. The waves were also only reachable
through a temporary harness affordance (paddle widened 72→360 logical, since reverted — `git diff`
over source is empty), which is disclosed rather than hidden. `Device digest` stays **OPEN**,
`N-END-03` stays **`[ ]`**, and truth 5 stays ⚠️ PRESENT_BEHAVIOR_UNVERIFIED.

A dry run that narrows risk without discharging the criterion is exactly the kind of evidence that
should move the *confidence* and not the *number*, and the UAT file already says so in its own words.

## Requirements Coverage

| Requirement | Description | Status | Round-7 evidence |
|---|---|---|---|
| N-END-01 | Clearing a board advances in the same run; lives/score/combo carry over; ends only at zero lives | ✓ SATISFIED | `[x]` at `REQUIREMENTS.md:177`, unchanged this round. `eec2137` touches no path it depends on |
| N-END-02 | Endless records stored separately; endless play cannot alter campaign unlocks, bests or stars | ✓ SATISFIED | `[x]` at `:179`, unchanged. The cert level half is byte-identical, so the WR-02 display-firewall guard is untouched |
| N-END-03 | Seeded endless run reproducible end to end; wave transitions cause no frame spike outside the Mid budget | ? NEEDS HUMAN | `[ ]` at `:182`, verified unchanged. Reproducibility half ✓; frame-budget half device-gated, blocked on hardware, never measured |

No orphaned requirements.

## Security Register (new since the round-6 stamp)

`11-SECURITY.md` now exists (`status: verified`, `threats_open: 0`, ASVS level 1, blocking on
`high`). It is a **State B** audit — the register was authored at plan time across all 21 PLANs, so
the audit verified mitigations rather than reconstructing a register retroactively. **133 register
rows carrying 74 distinct IDs**, all closed, 19 of them closed by making a control fail.

The row/ID gap is not restatement and is worth carrying in this report so it is not "corrected"
later by someone who assumes it is: six gap-closure rounds **restarted the numbering three times**,
so the same ID names different threats in different plans. Deduplicating by ID drops roughly 50
distinct threats — which the orchestrator's first index did, before the auditor caught it.

The three IDs this round was asked to re-check (`T-11-04`, `T-11-15`, `T-11-18`) are all intact at
HEAD; `T-11-15`'s own recorded falsification was reproduced as probe 3.

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|---|---|---|---|
| `tests/ui/PlayingHost.endless-host.test.ts` | Discharge clear pinned by a `>= 1` count that two clears both satisfy | 📋 Advisory | WR-02 — carried; unreachable by `eec2137` |
| `tests/ui/PlayingHost.endless-host.test.ts` | Level-half gate is a loose regex | 📋 Advisory | WR-03 — carried, narrowed by probe 2 |
| `app/_components/PlayingHost.tsx` | Self-cancel comment states two untrue mechanisms | 📋 Advisory | WR-04 — carried |
| `tests/ui/PlayingHost.endless-host.test.ts` `:386`, `:391` | `ReadonlyArray<T>` lint warning | ℹ️ Info | Carried, cosmetic |

`docs/ops/ENDLESS-MODE.md`'s stale source pointer (WR-01) has been **removed from this table** — it
is fixed and I verified the fix at source.

**Debt-marker gate:** no `TBD`, `FIXME` or `XXX` marker exists in any file `eec2137` modified. The
four files were scanned individually.

## Gaps Summary

**No gaps, and `eec2137` created none.**

The commission for this round was narrow and the answer is narrow: a commit that adds a left bound
to an absolutely-positioned dev slot, lets a dev row wrap, gives a debug readout a background
colour, and moves a metrics overlay off the top of the canvas **cannot reach a phase-11 must-have**,
and I established that by measurement rather than by inspection of the commit message. The two
contracts most exposed to it — `showPauseOverlay`, which lives in one of the two touched files, and
the `runEndedRef`/`modeRef` anti-drift gate, which lives in the other — are byte-identical across
the commit *and* were re-proved discriminating at HEAD by mutation. The dev-row extraction that a
`style` prop change could plausibly have broken still matches the same region, still finds exactly
one guard, and still finds all four controls inside it.

Two things did change since the round-6 stamp, and both are improvements to the record rather than
to the code. **WR-01 is closed** — the owner took Option A on UAT test 4, and the expression 11-19
deleted is now at 0 occurrences across all of `docs/` while `certLevelPlan` is named 3 times where
it was named 0. That was the one half of round 6's flagged documentation prohibition that could not
be held, so the prohibition now holds in full. And **`11-SECURITY.md` closed at `threats_open: 0`**
across 133 rows / 74 IDs.

**Two things I am flagging rather than absorbing.** First, `eec2137` is not the only commit to have
entered `covered_files` since 2026-09-26: Phase 12's daily-challenge work has landed in three of the
four phase-11 implementation files. I kept to my commission and did not re-derive phase 11 against
those deltas; what stands against them is that every phase-11 instrument is green at HEAD *and*
still discriminating, which I proved by mutation downstream of all of it. Second, UAT tests 2 and 3
report `pass` with no observation record, on the two items the report itself calls unobservable —
and the same owner in the same session attached a full transcript to test 1. I have neither banked
those into the score nor overruled the owner; truth 15 sits one attached observation away from
27/28 and the decision is the owner's.

**The phase goal is achieved, and the phase still cannot transition.** A run that never runs out of
board, escalating until the player misses: four of the five Success Criteria are verified, and the
fifth has its automatable half verified with its device half honestly open. Nothing in this round
changes that, and nothing in this round should. `passed` would require a frame from a physical
device, and no machine in this repository — and no simulator on this Mac — can produce one.

---

_Verified: 2026-09-28T09:46:44Z_
_Verifier: Claude (gsd-verifier), round 7 — narrow re-stamp scoped to commit `eec2137`_
