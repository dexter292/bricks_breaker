# Phase 12: Daily Challenge - Context

**Gathered:** 2026-09-27
**Status:** Ready for planning

<domain>
## Phase Boundary

One generated board per local calendar date, one recorded result for that date, and a
streak computed from the set of dates that have a result.

Delivered by this phase: the date→board derivation, the once-per-date result record, the
streak computation, and an explicit written clock-change policy (N-DAILY-03).

NOT this phase: the real entry point from the Title screen (Phase 14), achievements over
daily play (Phase 13), and any networked or cross-device comparison (PROJECT.md rules
that out entirely — no server, no account).

</domain>

<decisions>
## Implementation Decisions

### Date, clock and the one rule that covers them

- **D-01: A date is playable if and only if it has no stored result.** This single rule is
  the whole clock policy. It is what N-DAILY-03 requires to be written down, and it is
  written here rather than left to emerge from code.
- **D-02: Clock backwards → a date that already has a result is read-only.** Opening it
  shows the stored result; it cannot be replayed. Winding the clock back gains nothing.
- **D-03: Clock forwards → playable, and the streak breaks by itself.** A player who jumps
  a week ahead can play the new date, but the intervening dates have no stored result, so
  D-11's computation breaks the streak with no anti-cheat branch anywhere in the code.
- **D-04: Timezone travel is not distinguished from clock tampering.** The same rule (D-01)
  covers both. Offline and without a trusted time source the two are not distinguishable,
  so any special case would be a guess dressed as a policy.
- **D-05: No monotonic date watermark is stored.** The set of dates that have a result is
  the only state the policy reads. Rejected: a "highest date ever seen" field — it is a
  second thing that can corrupt independently, and SC-3's whole point is deriving state
  from stored dates rather than from a separate counter.
  — **Reversibility:** reversible — adding a watermark later is additive to the blob and
  changes no existing field.

### One attempt per date

- **D-06: One attempt.** Entering the day's board commits to it; there is no retry within
  the date. The roadmap goal asks for "a streak they would be annoyed to lose", and an
  unlimited retry makes nothing losable.
- **D-07: Win or lose closes the date. Abandoning does not.** Exiting mid-run leaves the
  date open, so a real interruption (a phone call) does not cost the day. This deliberately
  departs from Phase 9 D-02's treatment of `abandoned` as a real outcome — `abandoned` is
  still recorded in telemetry (D-09), it just does not close the date.
- **D-08: The practice hole is ACCEPTED and recorded, not closed.** Because the board is
  derived from the date, exiting before the final life and re-entering returns the *same*
  board. A determined player can therefore rehearse. There is no re-roll (the board never
  changes), only rehearsal. Closing it would mean making `abandoned` close the date, which
  costs every interrupted player their day. Named here so a later round finds a decision
  rather than a defect.
- **D-09: Telemetry records every attempt, under Phase 9's existing rules.** `byMode.daily`
  accumulates like `campaign` and `endless`, including runs that did not close the date.
  Lifetime statistics are a separate question from "the result of the day", and keeping
  them consistent across modes is what makes Phase 14's comparisons honest.

### The daily board

- **D-10: One board, not a wave sequence.** Clearing it wins, running out of lives loses.
  The roadmap goal and SC-1 both say "the board" in the singular. This reuses the campaign
  run path unchanged and does not touch Phase 11's wave loop.
  — **Reversibility:** costly — moving to a wave sequence later would change the shape of
  the stored daily result and every reader of it.
- **D-11: Difficulty is a fixed constant, mid-scale.** Every date uses the same difficulty
  on Phase 10's `0..20` scale. Scores are comparable across dates, and no player loses a
  streak because their date drew a hard board. Rejected: day-of-week ramps and
  date-derived random difficulty — both make streak loss partly a matter of luck.
- **D-12: No stars for daily — score and outcome only.** Star thresholds in `stars.ts` are
  authored per campaign level; a generated board has none. Inventing a formula would need
  its own calibration and a sweep to prove it is not absurd at either end of the scale.
  Keeping stars campaign-only also serves SC-5 directly.

### Streak

- **D-13: The streak counts dates PLAYED, not dates won.** Win or lose, a closed date keeps
  the streak. SC-3 says "consecutive played dates", and pairing a win requirement with
  D-06's single attempt would end a long streak on one unlucky board.
- **D-14: One missed date breaks it.** Two closed dates that are calendar-adjacent continue
  a streak; a gap of two or more days ends it. No grace day — "consecutive" then means what
  it says, and the computation is a walk over the sorted set of stored dates with no extra
  state.
- **D-15: Daily history is a bounded window of recent dates**, following Phase 9 D-05's
  reasoning for `RECENT_RUNS_BOUND` — the blob is read whole on every app open, so nothing
  in it may grow without limit.
- **D-16: Two unbounded scalars survive the window: longest streak ever, and total dates
  played.** Without these, trimming history would silently erase an achievement, and a
  streak longer than the window would read as the window length. They are updated when a
  date closes, never recomputed from the trimmed window.
  — **Reversibility:** one-way — once players have accumulated these numbers there is no
  way to reconstruct them from a trimmed history, so a later schema change must migrate
  them rather than recompute them.
- **D-17: Breaking a streak is stated, with the length that ended.** "Your 12-day streak
  ended" rather than a silent reset to 1. The loss is the point of the feature.

### Claude's Discretion

- How the local calendar date is turned into the seed for `generate(seed, difficulty)`.
  It must be pure, must depend on the local calendar date alone (SC-1), and must give the
  same board for the same date on any device.
- The exact fixed difficulty constant for D-11, and the exact window size for D-15.
  Both are single numbers; pick them with the same reasoning Phase 9 used for
  `RECENT_RUNS_BOUND` and state the reasoning.
- The stored shape of the daily result and the date key format, within Phase 9's existing
  v4 blob. `byMode.daily` already exists and is already sanitized.
- Where the streak and the countdown appear on screen, and the countdown's exact wording.
- The entry point. Phase 11 D-05 used a temporary `__DEV__` button on the HUD, deleted by
  Phase 14 when the real Title entry lands. The same treatment is the default here unless
  the UI-SPEC step decides otherwise; it must not appear in a production build.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

ROADMAP.md declares no `Canonical refs:` line for this phase, and the user named no
external document during discussion. The references below were found by scouting the
codebase and prior phase context.

### Prior-phase decisions this phase builds on
- `.planning/phases/09-run-telemetry-storage-v4/09-CONTEXT.md` — D-03 (`win | lose |
  abandoned` is a closed set), D-04 (v4 is mode-aware from the start; `daily` was reserved
  for this phase), D-05 (bounded ring buffer; the reasoning D-15 reuses).
- `.planning/phases/10-seeded-board-generator/10-CONTEXT.md` — D-01..D-08, the generator's
  determinism, fixed grid and difficulty dials.
- `.planning/phases/11-endless-mode/11-CONTEXT.md` — D-05 (the temporary `__DEV__` entry
  point pattern Phase 14 replaces).

### Ops documentation
- `docs/ops/BOARD-GENERATOR.md` — the generator's contract and its stated limits.
- `docs/ops/PROGRESS-STORAGE.md` — the v4 blob, its migration history and its bounds.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/levelgen/generate.ts:223` — `generate(seed: number | string, difficulty: number):
  LevelFileV1`. Deterministic, accepts a string seed directly, so a date string can be the
  seed with no numeric hashing step required.
- `src/services/storage/types.ts:44` — `GameMode = 'campaign' | 'endless' | 'daily'`. The
  `daily` arm already exists.
- `src/services/storage/types.ts:152` — `TelemetryBlob.byMode.daily` already declared and
  defaulted (`types.ts:188`).
- `src/services/storage/parseBlob.ts:314,432` — `'daily'` is already in `GAME_MODE_SET` and
  `byMode.daily` is already sanitized on read. No parser change is needed to store daily
  telemetry.
- `src/services/storage/telemetry.ts:61,231` — `byMode.daily` already clones and merges.

### Established Patterns
- **Mode-gating is already enforced.** `memoryStore.ts:96` and `asyncStorageStore.ts:376`
  both carry the guard whose comment reads "an endless **or daily** run" — SC-5 is largely
  held by code that already ships. The phase must verify this rather than assume it.
- **Bounded collections on write.** `telemetry.ts:157` applies
  `.slice(-RECENT_RUNS_BOUND)` at write time rather than trusting readers. D-15 should
  follow the same shape.
- `src/runtime/worldRequests.ts:56` states in a comment that Phase 12's daily challenge
  "reuses it verbatim" — the world-request path was deliberately left mode-agnostic.

### Integration Points
- The daily result record is new and needs a home in the v4 blob alongside
  `TelemetryBlob.endless` (`types.ts:155`), which is the closest analog: a mode-specific
  record written by exactly one merge function.
- `src/services/storage/watermark.ts` merges score/stars high-watermarks only. It knows
  nothing about time; D-16's two scalars need their own merge treatment and must not be
  folded into it without deciding what "merge" means for a streak.

</code_context>

<specifics>
## Specific Ideas

- D-17's wording came from the roadmap goal's own phrase, "a streak they would be annoyed
  to lose". The message should name the number that ended.
- The clock policy is deliberately one sentence (D-01). N-DAILY-03 asks for a written
  policy; a policy a reader cannot hold in their head is not one.

</specifics>

<deferred>
## Deferred Ideas

- **Streak freeze / grace day.** Considered and rejected at D-14 for this phase. If player
  feedback later shows one missed day is too harsh, it is an additive change — but it
  makes "consecutive" stop meaning consecutive, and that has to be said in the UI.
- **Stars or a second scoring axis for generated boards.** Rejected at D-12. Would need a
  threshold formula calibrated against a board sweep; that is its own piece of work.
- **Cross-device or social comparison of daily results.** Out of scope by PROJECT.md — no
  server, no account, no store.

</deferred>

---

*Phase: 12-Daily Challenge*
*Context gathered: 2026-09-27*
