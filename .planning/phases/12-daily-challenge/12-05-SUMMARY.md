---
phase: 12-daily-challenge
plan: 05
subsystem: ui
tags: [daily, streak, countdown, react-native, appstate, jsdom, vitest, tdd]

requires:
  - phase: 12-01
    provides: DailyResultOverlay, the GameScreen daily route, PlayingHost's daily mode branch and startDailyRun
  - phase: 12-03
    provides: streakFrom, endedStreakLength, hasResultFor, DailyRecord's three surviving members
  - phase: 12-02
    provides: nextLocalMidnightMs
provides:
  - "src/runtime/overlays/DailyResultOverlay.tsx — the full S2/S3/S4 panel plus countdownForm and streakEndedCopy as exported pure classifiers"
  - "currentDailyStreak on src/services/storage/telemetry.ts — the read side's exact current-streak derivation, shared with the write side"
  - "subscribeAppStateAutoPause onForeground + UseGameLoopOptions.onOsForeground — one AppState subscription, not two"
  - "PlayingHost: the closed-date read path, four abandoned exits, the same-board daily retry, failDailyBoard and exitDailyToCampaign"
  - "PauseOverlay mode discriminant — one mode-dependent spoken label"
affects: [12-06, 13, 14]

actuals:
  tokens: 28864
  tasks: 3
  commits: 5
plan_head_before: 09e779d569c4ece225ab08a0c345653850729874

tech-stack:
  added: []
  patterns:
    - "Exported pure classifier over scalars instead of a JSX ternary, so the visible line and the spoken label cannot disagree about which case they are in"
    - "One derivation site for a panel fed by two paths — publishDailyPanel serves both the just-finished and the re-opened render"
    - "A recurring timer is scoped to the surface that reads it, never mounted unconditionally"
    - "Two questions about dates get two refs: the run's own date, and what date it is now"

key-files:
  created:
    - tests/ui/DailyResultOverlay.test.tsx
  modified:
    - src/runtime/overlays/DailyResultOverlay.tsx
    - src/runtime/overlays/PauseOverlay.tsx
    - src/runtime/GameScreen.tsx
    - src/runtime/appStatePause.ts
    - src/runtime/useGameLoop.ts
    - src/services/storage/telemetry.ts
    - src/services/storage/index.ts
    - app/_components/PlayingHost.tsx
    - tests/ui/PlayingHost.daily-run.test.tsx
    - tests/ui/GameScreen.test.tsx
    - tests/ui/PlayingHost.endless-host.test.ts

key-decisions:
  - "currentDailyStreak exported from telemetry.ts and used for the panel's Streak line, against the plan's and 12-03's handoff's prescribed streakFrom. MEASURED on this tree: at 450 consecutive closes streakFrom over the trimmed window returns 400 while the stored longestStreak reads 450 — the panel would state a streak the player does not have AND the record badge would stop firing for someone on their best-ever run, which is the exact failure D-16 was re-opened to eliminate, re-entering through the read side."
  - "The 60-second countdown interval is scoped to the Daily Result panel being open, red-proved on this tree rather than taken from the plan: induced unconditionally it throws `Aborting after running 10000 timers` across four host specs no plan in this phase owns."
  - "dailyNextBoundaryMs is pinned to the shown date's midnight at publish time and is NOT re-derived on each refresh. That is what makes UI-SPEC rule 5 fall out for free — the remainder can actually reach zero and the line omits itself, rather than counting down to a second tomorrow forever."
  - "localTodayRef is a second, separate ref from dailyDateRef. The plan instructed the foreground callback to 'update the ref the panel reads from'; doing that literally would move a live run's date off the key its board was generated from, an outright SC-1 break."
  - "exitDailyToCampaign is a named exit rather than an inline branch inside remountDevSession, because that function's own shipped source contract forbids it keeping a second copy of the abandon invariant."
  - "The in-flight abandon funnel was WIDENED to admit daily rather than duplicated, which wires all four daily exits at one site. Its endless-flavoured name is kept: renaming it would rewrite four shipped source contracts for a word."

patterns-established:
  - "A gate that measures a dependency array measures the wrong thing: bound the body, pin the leading dependencies, tolerate additive growth."
  - "When a count-based source contract is extended, bind the PROPERTY behind the count as well — here, every modeRef write to campaign must be adjacent to its setMode."
  - "An absence assertion needs a non-vacuity control beside it: the closed-date case is paired with an open-date case proving the generator does run."

requirements-completed: [N-DAILY-02, N-DAILY-03]

coverage:
  - id: D1
    description: "The Daily Result panel renders its eleven contract rows in the locked order, from scalars alone."
    requirement: "N-DAILY-02"
    verification:
      - kind: unit
        ref: "tests/ui/DailyResultOverlay.test.tsx#DailyResultOverlay — the closed-date panel (12-05) > renders the eleven contract rows in the locked order"
        status: pass
    human_judgment: false
  - id: D2
    description: "The countdown has three fixed forms with both components floored, is not clamped at 24 hours, and omits entirely on a non-positive or non-finite remainder."
    verification:
      - kind: unit
        ref: "tests/ui/DailyResultOverlay.test.tsx#countdownForm (12-UI-SPEC § The countdown line, 12-05) > a 25-hour remainder renders 25 hours — not clamped and not special-cased"
        status: pass
      - kind: unit
        ref: "tests/ui/DailyResultOverlay.test.tsx#countdownForm (12-UI-SPEC § The countdown line, 12-05) > omits on zero, on a negative, on NaN and on a non-finite remainder"
        status: pass
    human_judgment: false
  - id: D3
    description: "The streak-ended line renders only from an already-derived length, co-renders with a win heading, and never substitutes the lifetime longest streak (D-17)."
    requirement: "N-DAILY-02"
    verification:
      - kind: unit
        ref: "tests/ui/DailyResultOverlay.test.tsx#DailyResultOverlay — the closed-date panel (12-05) > omits the streak-ended line when no ended length is supplied, and never substitutes the lifetime longest streak"
        status: pass
      - kind: unit
        ref: "tests/ui/DailyResultOverlay.test.tsx#DailyResultOverlay — the closed-date panel (12-05) > a win heading and a streak-ended line co-render — winning today after a two-week gap is exactly that"
        status: pass
    human_judgment: false
  - id: D4
    description: "The record badge fires iff the current streak is at least 2 and equals the lifetime longest, and is stable across re-opens on the same date."
    verification:
      - kind: unit
        ref: "tests/ui/DailyResultOverlay.test.tsx#DailyResultOverlay — the closed-date panel (12-05) > the badge fires when the streak is at least 2 and equals the lifetime longest"
        status: pass
      - kind: unit
        ref: "tests/ui/DailyResultOverlay.test.tsx#DailyResultOverlay — the closed-date panel (12-05) > the badge is absent on a first-ever daily, where streak and longest are both 1"
        status: pass
    human_judgment: false
  - id: D5
    description: "On a closed date Menu is the only control: no Retry, no star row, no lifetime-best score line, even when a caller supplies them (D-06 / D-12 / SC-5)."
    requirement: "N-DAILY-03"
    verification:
      - kind: unit
        ref: "tests/ui/DailyResultOverlay.test.tsx#DailyResultOverlay — the closed-date panel (12-05) > on a closed date Menu is the only control — no Retry, no star row and no lifetime-best score line, even when a caller supplies an onRetry"
        status: pass
      - kind: other
        ref: "grep -cE \"^import\" src/runtime/overlays/DailyResultOverlay.tsx -> 2; comment-stripped layer grep -> 0; npx eslint (boundaries rule) -> exit 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "The streak surface carries no shaming, guilt or loss-aversion framing and no offer to restore, protect, freeze or buy back a streak."
    verification:
      - kind: unit
        ref: "tests/ui/DailyResultOverlay.test.tsx#DailyResultOverlay — the closed-date panel (12-05) > carries no shaming, guilt or loss-aversion framing and no offer to restore, protect, freeze or buy back a streak"
        status: pass
    human_judgment: false
  - id: D7
    description: "A closed date is read-only: the panel renders from the stored record, the board generator is not called and no write occurs (D-02 / SC-2)."
    requirement: "N-DAILY-02"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#PlayingHost daily run boundaries (12-05) > a closed date is READ-ONLY: it renders the stored panel, generates no board and writes nothing (D-02 / SC-2)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#PlayingHost daily run boundaries (12-05) > the closed date panel renders the STORED scalars, through the same path the just-finished panel takes (SC-2)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#PlayingHost daily run boundaries (12-05) > an open date is still playable and still starts a run — the closed-date branch is not a blanket block"
        status: pass
    human_judgment: false
  - id: D8
    description: "All four exit paths record the in-flight daily run as abandoned and leave the date OPEN (D-07 / D-09)."
    requirement: "N-DAILY-02"
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#PlayingHost daily run boundaries (12-05) > pause then Retry records the run as abandoned and restarts the SAME board, leaving the date open (D-08 / D-09)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#PlayingHost daily run boundaries (12-05) > pause then Menu records the run as abandoned and leaves the date open (D-07)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#PlayingHost daily run boundaries (12-05) > a dev-row level press during a live daily run records it as abandoned and exits daily (D-09)"
        status: pass
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#PlayingHost daily run boundaries (12-05) > a dev session remount during a live daily run records it as abandoned and exits daily (D-09)"
        status: pass
    human_judgment: false
  - id: D9
    description: "A daily Retry regenerates the SAME date-derived board — the deliberate inverse of the endless seed re-mint (D-08 / SC-1)."
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#PlayingHost daily run boundaries (12-05) > pause then Retry records the run as abandoned and restarts the SAME board, leaving the date open (D-08 / D-09) — asserts boardFingerprint() unchanged"
        status: pass
    human_judgment: false
  - id: D10
    description: "A board that cannot be built keeps the date OPEN, renders the board-failure variant with Retry and Menu, and never uses the level-error overlay."
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#PlayingHost daily run boundaries (12-05) > a board that cannot be built keeps the date OPEN and renders the failure variant, never the level-error overlay"
        status: pass
      - kind: unit
        ref: "tests/ui/GameScreen.test.tsx#GameScreen > routes a daily board failure to the daily panel with Retry, not to the level-error overlay"
        status: pass
      - kind: other
        ref: "sed 's://.*::' app/_components/PlayingHost.tsx | grep -c LevelErrorOverlay -> 0"
        status: pass
    human_judgment: false
  - id: D11
    description: "The pause Retry says it restarts today's board during a daily run, and still says level in campaign."
    verification:
      - kind: unit
        ref: "tests/ui/GameScreen.test.tsx#GameScreen > the pause Retry says it restarts today BOARD during a daily run, and still says level in campaign"
        status: pass
      - kind: other
        ref: "grep -c 'Retry level' src/runtime/overlays/PauseOverlay.tsx -> 1 (one ternary branch, not two hardcoded labels)"
        status: pass
    human_judgment: false
  - id: D12
    description: "The countdown refreshes on mount, on foreground and on a 60-second interval that is live ONLY while the panel is open, from a single clock read each time."
    verification:
      - kind: integration
        ref: "tests/ui/PlayingHost.daily-run.test.tsx#PlayingHost daily run boundaries (12-05) > the countdown instant refreshes on the 60-second tick while the panel is open, and no interval runs while it is closed"
        status: pass
      - kind: other
        ref: "red-proof: inducing an unconditional interval throws 'Aborting after running 10000 timers' across four host specs; scoped, 20 files / 183 tests pass"
        status: pass
    human_judgment: false
  - id: D13
    description: "One AppState subscription in the app, whose foreground branch reaches no physics handle, no active flag, no UI phase and no accumulator (PLT-01 / T-03-03)."
    verification:
      - kind: other
        ref: "grep -rc 'AppState.addEventListener' src/ app/ -> exactly one line, src/runtime/appStatePause.ts:1"
        status: pass
      - kind: other
        ref: "region-scoped comment-stripped gate over appStatePause.ts -> 0 physics/UI-phase identifiers"
        status: pass
    human_judgment: false
  - id: D14
    description: "The HUD strip gains no daily field, no date, no streak and no countdown."
    verification:
      - kind: other
        ref: "git diff --quiet 09e779d -- src/runtime/HudStrip.tsx -> exit 0 (unmodified across the whole plan)"
        status: pass
    human_judgment: false
  - id: D15
    description: "A UI-state check at a 7-digit score, 4-digit streak and 5-digit days-played shows no wrap and no clipping in the shipped 320px panel."
    verification: []
    human_judgment: true
    rationale: "12-UI-SPEC E1 overflow is an explicit device BACKSTOP. jsdom performs no layout, so no assertion in this plan's suite is evidence about wrapping or clipping. The 27-character budget is computed from the measured 0.612 em advance, never observed on a rendered panel. Recorded in .planning/WINDOWS.md entry 16."
  - id: D16
    description: "The fully-populated 11-row Daily Result panel fits inside the safe area on a 320x568pt viewport with the Menu CTA visible without scrolling."
    verification: []
    human_judgment: true
    rationale: "12-UI-SPEC E1 vertical overflow is an explicit device BACKSTOP. The 456px maximum content height is arithmetic over measured style values; the safe-area insets are device-supplied and jsdom supplies none. Recorded in .planning/WINDOWS.md entry 17."
  - id: D17
    description: "The __DEV__ dev row with the Daily control is fully on-screen and tappable on a 375pt-wide viewport."
    verification: []
    human_judgment: true
    rationale: "12-UI-SPEC E5 overflow is an explicit device BACKSTOP, and the row already clipped at its two default tier states BEFORE this phase added anything. Computed at ~431-475px, never observed on a device. Recorded in .planning/WINDOWS.md entry 18."

duration: 26 min
completed: 2026-09-28
status: complete
---

# Phase 12 Plan 05: The Daily Result Panel and the Run Boundaries Summary

**The panel a player actually reads — streak, best-ever, days played, what streak they just lost and when tomorrow's board arrives — rendered from the stored record on both the just-finished and the re-opened path, plus the four exits that leave a date open and the one that keeps it that way when the board cannot be built.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-09-28T03:32:45Z
- **Completed:** 2026-09-28T03:58:48Z
- **Tasks:** 3 (two TDD, one standard)
- **Files created/modified:** 12 (1 created, 11 modified)
- **Suite:** 106 files / 753 tests at base → **107 files / 787 tests**, `npm test` exit 0 with all four `assert-*.mjs` scripts passing

## Accomplishments

- **The panel is a pure function of the stored record, structurally rather than by intent.** One function, `publishDailyPanel`, computes the scalars for both the just-finished path and the closed-date re-open. There is no second derivation site for the two renders to disagree about, which is what SC-2 actually asks for.
- **Both derivations are exported pure classifiers with their own cases**, following the shipped `waveBuildFailureKind` precedent — so the visible countdown line and its spoken label can never land in different cases, and the streak-ended sentence has one place it can be got wrong instead of two.
- **The measured streak defect was caught before it shipped.** The plan and 12-03's handoff both prescribed `streakFrom` over the stored keys for the `Streak · {n}` line. Measured against the real modules at 450 consecutive closes, that returns **400** while the stored `longestStreak` reads **450** — the panel would state a streak the player does not have, and the `streak === longestStreak` badge would stop firing for a player who is on their best-ever run and extending it daily. Fixed by exporting the write side's own exact derivation so the two cannot diverge again.
- **The interval hazard was red-proved on this tree, not inherited.** Inducing the unconditional form throws `Aborting after running 10000 timers` across four host specs no plan in this phase owns; the scoped form passes 20 files / 183 tests. The scoping is load-bearing and now has a test that would notice if it stopped being.
- **All four abandoned exits are wired at ONE site.** The in-flight funnel was widened to admit daily rather than duplicated, so pause Menu, pause Retry, a dev-row control and a dev session remount all inherit the same obligation — which is the shape `11-VERIFICATION.md` gap 1 exists to prevent regressing.

## Task Commits

1. **Task 1: DailyResultOverlay — the full panel** — `679b639` (test, RED) → `1dd63d9` (feat, GREEN). No REFACTOR: the implementation is the researched shape and had no cleanup to make.
2. **Task 2: The foreground refresh** — `1e6b96e` (feat). Not a TDD task in the plan; its gates are source-shape and suite-wide, and the interval scoping was red-proved by induction rather than by a new case.
3. **Task 3: Daily run boundaries in the host** — `ca7bfa9` (test, RED) → `5967066` (feat, GREEN). No REFACTOR.

**Commits measured, not narrated:** `git rev-list --count 09e779d..HEAD` = **5** at SUMMARY-write time (this plan's metadata commit lands on top).

## Files Created/Modified

- `src/runtime/overlays/DailyResultOverlay.tsx` — the 11-row panel, `countdownForm`, `streakEndedCopy`, the board-failure variant, and both `status: unresolved` prohibitions written into the file header
- `src/runtime/overlays/PauseOverlay.tsx` — a `mode` discriminant changing exactly one spoken label
- `src/runtime/GameScreen.tsx` — seven flat daily scalar props, the `dailyBoardFailed` route, and `mode` threaded to the pause overlay
- `src/runtime/appStatePause.ts` — optional `onForeground`; both assertions rewritten to state the never-resume invariant
- `src/runtime/useGameLoop.ts` — `onOsForeground` threaded into the one existing subscription and its dependency array
- `src/services/storage/telemetry.ts` — `currentDailyStreak`, the exported read-side counterpart of the write-side derivation
- `src/services/storage/index.ts` — exports it
- `app/_components/PlayingHost.tsx` — `publishDailyPanel`, `failDailyBoard`, `exitDailyToCampaign`, the closed-date read path, the daily retry funnel, the foreground callback and the panel-scoped interval
- `tests/ui/DailyResultOverlay.test.tsx` — **new**, 23 cases
- `tests/ui/PlayingHost.daily-run.test.tsx` — 2 → 11 cases, harness extended with the pause and panel controls and one shared stored-record fixture
- `tests/ui/GameScreen.test.tsx` — the pause label and the board-failure route
- `tests/ui/PlayingHost.endless-host.test.ts` — three source contracts extended to cover the third mode

## Decisions Made

The two that changed shipped behaviour away from the plan are in the frontmatter. Four more this executor owned:

1. **`dailyNextBoundaryMs` is pinned, not refreshed.** Re-deriving it from `now` on every tick — the obvious reading — would make the remainder permanently positive, so the countdown could never expire and UI-SPEC rule 5 ("a non-positive remainder is never displayed") would be unreachable code. Pinning it to the shown date's midnight makes rule 5 fall out of the arithmetic.
2. **Two refs for two questions about dates.** `dailyDateRef` is the run's own date; `localTodayRef` is what date it is now. The plan's foreground instruction, followed literally, would have moved the first.
3. **`GameScreen`'s daily props are seven flat scalars, not one object.** Flatness is what makes SC-5 checkable by reading the type — an object prop puts the "no campaign PB, no endless record, no stars" guarantee one indirection away from the reader.
4. **The dev-row wrap remedy was NOT applied.** It is optional dev ergonomics in the UI-SPEC, changes no production surface, and the E5 backstop stands unchanged either way. Skipping it keeps this plan's diff to the surfaces it owns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The prescribed streak derivation under-reports past the bounded window**

- **Found during:** Task 1, while wiring the host's daily arm
- **Issue:** The plan's `key_links` and 12-03's handoff both prescribe `streakFrom` over the stored keys for the `Streak · {n}` line. `streakFrom` walks the **trimmed** window, so it saturates at `DAILY_HISTORY_BOUND`. **MEASURED against the real modules over 450 consecutive closes: `history` 400, `totalDaysPlayed` 450, `longestStreak` 450, `streakFrom(window)` 400.** The panel would render `Streak · 400` for a player whose streak is 450, and because the badge rule is `streak === longestStreak`, it would also stop congratulating that player permanently — from day 401 onward, on every day of their best-ever run. That is the failure D-16 was re-opened at 12-03's blocking checkpoint to eliminate, re-entering through the read side.
- **Fix:** Exported `currentDailyStreak(record)` from `src/services/storage/telemetry.ts`, reusing the module-private `resolveStreakStart` + `streakLengthFrom` that `mergeDailyRecord` ALREADY calls to produce `longestStreak`. One function, one answer: write and read are now the same computation over the same inputs. Not a new behaviour, not a schema change, and the self-correction contract (every discard path falls back to the window-derived start, under-reporting and never inflating) applies unchanged. `endedStreakLength` is deliberately untouched — an ENDED run has no stored start to carry, so the window genuinely is all the evidence there is, and its omission at the floor is correct.
- **Files modified:** `src/services/storage/telemetry.ts`, `src/services/storage/index.ts`, `app/_components/PlayingHost.tsx`
- **Verification:** reproduced by simulation before the fix; full suite green after (107 files / 787 tests), including 12-03's own 41 daily cases
- **Committed in:** `1dd63d9`

**2. [Rule 3 - Blocking] The new prop surface broke the shipped consumer**

- **Found during:** Task 1, at the typecheck gate
- **Issue:** Task 1's acceptance criterion requires the scoped typecheck to print `0`, but adding the panel's required props left `GameScreen.tsx:211` missing six of them (`error TS2740`), which in turn left `tests/ui/GameScreen.test.tsx`'s `baseProps` no longer satisfying `GameScreenProps`.
- **Fix:** Threaded the seven daily scalars end to end — `PlayingHost` → `GameScreen` → the panel — and populated them from the returned blob in the daily arm of `handleRunEnded`. Real wiring rather than a placeholder: Task 3 extends the same `publishDailyPanel` call to the closed-date path rather than replacing it. `baseProps` gained the six fields with the same comment 12-01 wrote for `dailyDateKey`, stating why they are required rather than defaulted.
- **Files modified:** `src/runtime/GameScreen.tsx`, `app/_components/PlayingHost.tsx`, `tests/ui/GameScreen.test.tsx`
- **Verification:** `npm run typecheck` exit 0
- **Committed in:** `1dd63d9`

**3. [Rule 3 - Blocking] Five source contracts pinned a dependency array they were not about**

- **Found during:** Task 1, at the scoped vitest gate
- **Issue:** `tests/ui/PlayingHost.endless-host.test.ts` extracts `handleRunEnded`'s body with a regex closing on the literal `\n    [platform, store, levelId],`. Adding one dependency (`publishDailyPanel`, the single daily-panel derivation site) red **five** cases at once, none of which is about dependencies.
- **Fix:** Closed the five extractors on `[platform, store, levelId[^\]]*],` — the first three dependencies are still anchored in order, so the extractor cannot latch onto a different callback, but additive growth no longer reds a body assertion. The rationale is written into the docblock above the first extractor. This narrows what the regex MEASURES to what it is for; none of the five cases' actual claims was weakened.
- **Files modified:** `tests/ui/PlayingHost.endless-host.test.ts`
- **Verification:** all 27 cases in that file pass; the five body assertions are unchanged
- **Committed in:** `1dd63d9`

**4. [Rule 1 - Bug] The plan's foreground instruction would break SC-1**

- **Found during:** Task 2
- **Issue:** The plan's action says the foreground callback should "re-derive the local date key from a fresh clock read and, if it differs from the key held in the daily ref, **update the ref** and the state the panel reads from". `dailyDateRef` is the date of the run **in flight** — the board was generated from it and `handleRunEnded` records the result under it. Moving it on a rollover would record a run against a date whose board it was not, and would repaint a mounted panel's `Daily · {date}` with a date that is not the one the score belongs to. Both are SC-1 breaks.
- **Fix:** Added a second, separately named ref, `localTodayRef`, holding "what local calendar date is it now" — the sole D-01 input, written by the two events that can answer it from a fresh clock read (the entry press and the foreground). Both refs carry a doc comment naming which question they answer and why they are not one value. The panel's countdown still expires correctly on a rollover, because `dailyNextBoundaryMs` stays pinned to the shown date's midnight.
- **Files modified:** `app/_components/PlayingHost.tsx`
- **Verification:** the same-board case and the countdown-tick case both green; full suite green
- **Committed in:** `1e6b96e`

**5. [Rule 3 - Blocking] Three more source contracts went false at the daily dev-row exit**

- **Found during:** Task 3
- **Issue:** `remountDevSession`'s new daily branch called the abandon funnel directly and wrote `modeRef.current = 'campaign'`. Two shipped contracts forbid the first ("it must not keep a second copy of the invariant (gap 1)", and its dependency array must not list the funnel) and a third pins the campaign-mode-writer count at exactly 1.
- **Fix:** Extracted `exitDailyToCampaign`, a NAMED exit that owns the invariant, so `remountDevSession` routes to it exactly as it routes to `startEndlessRun` for endless — both contracts hold verbatim, unchanged. The third contract's own assertion message says "if a second appears, the A-02 note above needs rewriting", so it was rewritten: the count moves 1 → 2, the second writer is named with the reason it exists, **and the count no longer stands alone** — the property behind it is now bound too (every `modeRef.current = 'campaign'` must be ADJACENT to its `setMode('campaign')`, which is the divergence A-02 is actually about).
- **Files modified:** `app/_components/PlayingHost.tsx`, `tests/ui/PlayingHost.endless-host.test.ts`
- **Verification:** all 27 cases in that file pass, including the two left verbatim
- **Committed in:** `5967066`

**6. [Rule 1 - Bug] Four `<verify>` gates bound on a condition no passing run can meet**

- **Found during:** Tasks 1 and 3
- **Issue:** Both `-t`-filtered gates treat the word `skipped` as failure. A **matching** filter on a multi-case file always prints it: `Tests  1 passed | 22 skipped (23)`. Identical to 12-02's, 12-03's and 12-04's deviation on the same clause.
- **Fix:** Bound on the presence of `passed`. Red-proved on both files: a deliberately non-matching filter prints a summary with no `passed` in it and still exits **0**, so the exit code cannot discriminate either.
- **Files modified:** none — a verification-procedure correction
- **Verification:** `closed date` → `1 passed | 22 skipped`; `abandoned` → `4 passed | 7 skipped`

**7. [Rule 1 - Bug] Two test assertions were green for the wrong reason**

- **Found during:** Tasks 1 and 3, in the GREEN phases
- **Issue:** (a) The board-failure line-order case listed `Retry` among the ordered strings, but the failure BODY contains the word (`… — tap Retry`), so `indexOf` matched the sentence rather than the control. (b) The closed-date case asserted `compiledBoard()` is null, but the campaign board is in `compiledSv` from mount, so a bare not-null check would have been green against an implementation that swapped in a daily board.
- **Fix:** (a) The two controls are ordered by ROLE via their accessibility labels, which is stronger than a text-position check and cannot match prose. (b) The campaign fingerprint is captured BEFORE the press and asserted unchanged after it. Both carry the reason in place.
- **Files modified:** `tests/ui/DailyResultOverlay.test.tsx`, `tests/ui/PlayingHost.daily-run.test.tsx`
- **Committed in:** `1dd63d9`, `5967066`

---

**Total deviations:** 7 auto-fixed (3 bugs in the plan's own instructions or measurements, 3 blocking, 1 verification-procedure)
**Impact on plan:** No scope creep and zero packages added. Two files outside `files_modified` were touched — `src/services/storage/telemetry.ts`/`index.ts` for deviation 1, and `tests/ui/GameScreen.test.tsx`/`PlayingHost.endless-host.test.ts` for deviations 2, 3 and 5 — and none of them is a file plan 12-04 declares, so the wave guard held. Every test change EXTENDS a contract to cover the third mode; none relaxes one.

## Findings

**The `<parallel_wave_gate_hygiene>` premise did not hold, harmlessly.** The plan scopes its typecheck and lint gates because it expected to share wave 4 with 12-04. 12-04 ran sequentially and finished first, so the tree was quiescent throughout. The scoped expressions were run as written (and printed `0`), and the tree-wide `npm test` was ALSO run because the dispatch brief authorised it: **exit 0, 107 files / 787 tests, all four `assert-*.mjs` scripts passing.** Plan 12-06 Task 2's gate remains the binding one.

**The lint base is 3 warnings, confirmed again.** `npm run lint` exits 0 printing `✖ 3 problems (0 errors, 3 warnings)` both before and after this plan. Two warnings this plan introduced (duplicate type imports in the daily-run spec) were removed before the Task 3 commit rather than left as a new floor.

**Three cases were already green at Task 3's RED**, and that is recorded rather than glossed, because a green-on-first-run case has the same shape as a vacuous one. They are: pause → Menu (`handleMenuPress` already records an abandoned run for *any* mode — it never gated on mode, so daily inherited it for free), the open-date non-vacuity control, and the countdown tick (Task 2 had already shipped the interval). All three are pre-existing behaviour asserted here for the first time.

## TDD Gate Compliance

| Task | Ships source? | RED | GREEN | REFACTOR | Status |
|---|---|---|---|---|---|
| 1 — the panel | yes | ✓ `679b639` | ✓ `1dd63d9` | — none needed | Pass |
| 2 — the foreground refresh | yes | n/a (`tdd` not set in plan) | ✓ `1e6b96e` | — | n/a |
| 3 — the run boundaries | yes | ✓ `ca7bfa9` | ✓ `5967066` | — none needed | Pass |

Both REDs were **machine-verified, not asserted**:

- Task 1: `RED_EVIDENCE_OK` / `target_test_failed`, exit 1, 23 tests 5 pass 18 fail, target `tests/ui/DailyResultOverlay.test.tsx > DailyResultOverlay — the closed-date panel (12-05) > renders the eleven contract rows in the locked order`.
- Task 3: `RED_EVIDENCE_OK` / `target_test_failed`, exit 1, 21 tests 13 pass 8 fail, target `tests/ui/PlayingHost.daily-run.test.tsx > PlayingHost daily run boundaries (12-05) > a closed date is READ-ONLY: it renders the stored panel, generates no board and writes nothing (D-02 / SC-2)`.

Both records were built under `bash` with camelCase keys, the `tap-flat` reporter, full `tests/…`-prefixed target names, and mechanically computed `# tests` / `# pass` / `# fail` summary lines appended — the five traps the dispatch brief names.

## Known Stubs

**None in the rendered product.** The panel carries no placeholder text, no empty slot and no disabled control; every line the contract omits is absent rather than stubbed, and every control the open/closed rule forbids does not render.

Three DECLARED backstops ship unverified, all three owned by plan 12-06 and all three recorded in `.planning/WINDOWS.md` (entries 16, 17, 18):

| Backstop | Why no test here is evidence | Owner |
|---|---|---|
| E1 overflow, horizontal — a 7-digit score / 4-digit streak / 5-digit days-played shows no wrap or clipping in the 320px panel | jsdom performs no layout; the 27-character budget is arithmetic over the measured 0.612 em advance | 12-06, device |
| E1 overflow, vertical — the 11-row panel fits a 320×568pt safe area with Menu visible unscrolled | the 456px height is arithmetic; safe-area insets are device-supplied and jsdom supplies none | 12-06, device |
| E5 overflow — the dev row is fully on-screen at 375pt | computed ~431–475px with `Daily` added; the row already clipped at both default tier states before this phase | 12-06, device |

**A passing `render()` assertion in `tests/ui/DailyResultOverlay.test.tsx` must not be recorded as having verified any of these** — the file's own header says so, and `12-UI-SPEC.md § Measurement Provenance` states it in the same terms.

## Broken-windows Ledger

Four entries appended to `.planning/WINDOWS.md`: the three device backstops above (`unrun-verify`, 16–18), plus one `deviation` (19) recording that the panel's streak line is derived by `currentDailyStreak` rather than by the `streakFrom` both the plan and 12-03's handoff prescribed, with the 400-vs-450 measurement, so a later reader finds a decision rather than an unexplained divergence from two documents.

No stub and no skipped test was introduced. Every `<verify>` in this plan was run.

## Threat Flags

None — no new network endpoint, auth path, file access pattern or schema at a trust boundary. Every register row this plan owns is mitigated:

- **T-12-20** (overlay reaching storage): two gates in Task 1 plus `npx eslint`, which is the only mechanism that observes the boundary rule at all. Import count `2`, comment-stripped layer grep `0`, lint exit 0.
- **T-12-21** (daily retry re-minting the seed): the retry funnel routes to `startDailyRun`, which regenerates from the stored date key; asserted by a same-fingerprint case that is the deliberate inverse of the endless one.
- **T-12-22** (a campaign or endless number on the daily panel): the prop list carries none of the four forbidden fields, verified by reading the comment-stripped type body.
- **T-12-23** (a live timer behind a result panel): one 60-second interval, cleared on unmount, scoped to the panel being open, computing from a fresh clock read rather than decrementing a stored value.
- **T-12-24** (a second AppState subscription drifting): repo-wide gate prints exactly one occurrence; the region-scoped gate prints `0` physics handles in the foreground branch.
- **T-12-25** (the level-error overlay trapping a player): the comment-stripped host grep prints `0`, and the failure variant renders Retry then Menu.
- **T-12-SC**: zero packages added — neither `package.json` nor `package-lock.json` was touched.

## Issues Encountered

The 400-vs-450 streak divergence is the substantive one and is recorded as deviation 1. It was found by simulating the plan's prescribed derivation against the real modules before trusting it, rather than by shipping it and waiting for a player past day 400 — which is why it became a one-function fix instead of a silent misreport with no test that could notice.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for 12-06.** The tree is quiescent and green at 107 files / 787 tests with `npm test` exit 0, so 12-06 Task 2's full-suite gate starts from a known-good base. The three device backstops above are the items 12-06's verification round owns; none of them is discoverable from this suite, and all three are in the ledger.
- **One handoff for 12-06 and for the phase verifier.** `currentDailyStreak` is now the read-side streak derivation and `streakFrom` is no longer the panel's source. Any later document or plan repeating the "`Streak · {n}` comes from `streakFrom`" sentence from 12-03's handoff is describing the pre-fix design; `12-CONTEXT.md`'s D-16 amendment is unaffected, because this change implements it rather than altering it.
- **For Phase 14 (`N-UI-01`).** The `__DEV__` `Daily` control, the dev row it sits in and the `PauseOverlay` `mode` prop's `'daily'` arm are the surfaces Phase 14 replaces or deletes. The panel itself is production and stays.

No blockers.

---
*Phase: 12-daily-challenge*
*Completed: 2026-09-28*

## Self-Check: PASSED

The created file and the SUMMARY exist on disk; all eleven modified files carry changes in `git diff --name-only 09e779d..HEAD`; all five task commits (`679b639`, `1dd63d9`, `1e6b96e`, `ca7bfa9`, `5967066`) are reachable from HEAD and `git rev-list --count 09e779d..HEAD` measures **5**, matching `actuals.commits`. Every `<acceptance_criteria>` row from all three tasks was re-run and passes, and the plan-level `<verification>` is green end to end: `tests/ui/` 19 files / 187 tests with no failed file, both `-t` filters binding to real cases, the overlay at exactly 2 imports with 0 layer references and 0 clock calls, `ResultOverlay.mode` still two-valued, exactly one `AppState.addEventListener` in the repository, the region-scoped foreground gate at 0, `HudStrip.tsx` unmodified against the phase base, and `npm run typecheck` / `npm run lint` / `npm test` all exit 0.
