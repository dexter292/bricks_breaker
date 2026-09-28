# Phase 13: Achievements - Context

**Gathered:** 2026-09-28
**Status:** Ready for planning

<domain>
## Phase Boundary

A catalog of achievements declared as **data** — id, description, and a pure predicate over a
telemetry snapshot — evaluated at run end, persisted in the v4 blob, and surfaced on the result
panel the player is already looking at.

Delivered by this phase: the catalog format, the evaluation function, the persisted unlock set,
and the result-panel surface that tells the player what they just earned.

NOT this phase: the Achievements **screen** (Phase 14 — this phase writes the data that screen
reads), any networked or cross-device comparison (PROJECT.md rules it out — no server, no
account, no store), and any reward attached to an unlock (there is no currency and no shop).

</domain>

<decisions>
## Implementation Decisions

### When evaluation runs, and how idempotency is held

- **D-01: Evaluation runs at run end ONLY**, inside the same `recordRunEnd` write, against the
  telemetry snapshot that write has just merged. One call site, one snapshot, no extra storage
  read.
  — Rejected: evaluating again on app open/hydrate. It would catch a retroactive unlock without
  needing a run, but it puts **one rule in two places** — the exact shape that cost phase 11 six
  gap-closure rounds and phase 12 five separate leaks of a single rule. The cost of rejecting it
  is stated in D-04 and accepted.
- **D-02: Idempotency is a set difference, not a flag per achievement.** Evaluate every predicate
  against the snapshot, diff the resulting id set against the stored unlocked set, announce only
  the difference, persist the union. Re-evaluating an unlocked achievement produces an id already
  in the set, so nothing fires — SC-2 holds by construction rather than by a guard someone has to
  remember.
- **D-03: The evaluator is a pure function of (catalog, snapshot, unlocked set).** No clock, no
  storage read, no randomness. N-ACH-01 requires the predicate be pure; making the whole
  evaluator pure is what makes SC-2's "evaluating the same snapshot twice yields the same set"
  testable without a harness.

### Retroactive unlocks

- **D-04: A player who already has telemetry unlocks retroactively, and IS told.** The first
  `recordRunEnd` after installing this build evaluates the whole catalog against whatever
  telemetry already exists and announces everything that qualifies.
  — Rejected: marking them earned silently. A player with `Best · 127420` and thousands of bricks
  broken has done the work; the phase goal is that the game *notices what the player did*, not
  what they did since Tuesday.
  — Rejected: counting only from install. It needs a stored "count from here" boundary AND it
  tells a long-time player they have broken zero bricks while the telemetry in their own device
  says otherwise.
  — **Consequence of D-01:** retroactive unlocks cannot appear until the player finishes one run.
  On the Title screen immediately after install, nothing has changed yet. Accepted.
- **D-05: Many unlocks at once show at most THREE, plus a count of the rest.** "Unlocked 3
  achievements … and 12 more". Applies to a retroactive flood and equally to a strong run that
  earns four at once.
  — Rejected: listing them all with a scroll. `12-UI-SPEC` specifies the result panel as
  **non-scrolling** — `Menu` must be reachable without scrolling — so a scroll path re-opens a
  locked layout constraint.
  — Rejected: a bare count with no names. That tells the player something happened without
  telling them what, which is the silent option wearing one extra line.
  — **Reversibility:** reversible — the cap is a single constant and the panel rows are already
  a bounded list.
  — **AMENDED 2026-09-28, on measured grounds, following the phase-12 `AMENDED D-16` precedent
  (commit `39d709e`). The cap is TWO, not three.** `13-UI-SPEC.md` summed both shipped panels
  from their `StyleSheet.create` values and the `gsd-ui-checker` re-derived every figure
  independently: the binding case is a **campaign win** on `ResultOverlay` (48 pad + 40 heading +
  40 body + 32 Score + 32 Best + 32 stars + 44 badge + 64 Retry + 64 Next + 62 Menu = **458px**)
  against **548px usable** at 320x568pt. Three added rows is `458 + 3x32 = 554` — over by
  exactly 6px, which clips `Menu`, and 12-UI-SPEC forbids scrolling. Two rows is 522 with 26px
  spare. D-05's shape survives intact — name some, count the rest, never a bare count, never a
  scroll — only the number moves, and D-05's own reversibility clause anticipated exactly this.
  — **The binding panel is `ResultOverlay`, not `DailyResultOverlay`.** The orchestrator briefed
  the UI researcher that the daily panel was the risk, on the strength of WINDOWS #17. That was
  wrong: daily's contracted maximum is 426px and only reaches 458 through a defensive bound.
  No prior phase ever registered a backstop for the campaign-win panel, which is also the run
  most likely to unlock something.
  — **The 26px of spare rests on an UNVERIFIED inset assumption.** 548 usable assumes a bottom
  safe-area inset of zero at 320x568. If it is not zero, the spare goes negative and the cap is
  ONE. The device backstop must confirm the insets, not merely the fit.

### Where an unlock is surfaced

- **D-06: On the result panel that already exists** — `ResultOverlay.tsx` for campaign and
  endless, `DailyResultOverlay.tsx` for daily. No new surface, no toast layer, no queue.
- **D-07: SC-4 is satisfied STRUCTURALLY, not by timing.** "Does not interrupt a live rally" is
  true because the result panel only exists once the run has ended — there is no rally left to
  interrupt. A toast layer would have made SC-4 depend on getting the timing right, which is a
  weaker guarantee and a new state machine.
- **D-08: The panels take achievement data as SCALARS AND STRINGS via props**, never a storage
  type. `eslint.config.js` `boundaries/dependencies` forbids `src/runtime` importing
  `src/services`, and no unit test observes that boundary — `npm run lint` is the only thing
  holding it. Phase 12 learned this on `DailyResultOverlay`; the same prop discipline applies.

### The catalog

- **D-09: 8–12 achievements, a single tier.** No bronze/silver/gold.
  — Reasoning: SC-1 makes the catalog **data**, so a 20th achievement later needs no code edit —
  starting small locks nothing. Starting large locks this phase into calibrating 20–30 thresholds
  for a game **no human has played**, which both `11-UAT.md` and `12-UAT.md` record as still
  true.
  — Rejected: tiering. It multiplies the thresholds needing justification and adds a ladder that
  must be shown sane at both ends — the same reasoning D-12 of phase 12 used to refuse stars on
  generated boards.
- **D-10: The catalog mixes cumulative milestones and skill-gated achievements.** Cumulative
  (bricks broken, days played, runs played) cannot be failed, only waited out; skill-gated (clear
  a level without losing a life, reach wave N, a rally of N) is what makes an achievement worth
  having.
- **D-11: Every skill threshold is a JUDGEMENT, not a measurement, and says so.** No human has
  played this game, so there is no distribution to derive from. Thresholds are recorded the way
  phase 12 recorded `DAILY_DIFFICULTY = 10` — with the reasoning stated — and routed to human
  verification rather than presented as calibrated.
- **D-12: The catalog covers all three modes** (SC-5). `byMode.campaign`, `byMode.endless` and
  `byMode.daily` all exist and are all sanitized; a catalog that only reads `lifetime` would
  satisfy the letter of SC-5 and not its point.

### Storage

- **D-13: An additive field in the v4 blob — no version bump, no migration.** Exactly the phase-12
  precedent: `daily` was added to `TelemetryBlob` with a default, its own independent sanitizer,
  and no `PROGRESS_VERSION` change, so an older v4 blob parses clean with the field defaulted.
- **D-14: Unlock TIMESTAMPS are stored, not just ids.** Phase 14's Achievements screen will want
  a recency order, and a timestamp not captured at unlock time cannot be reconstructed afterwards
  for anything already unlocked.
  — **Reversibility:** one-way for the data — the timestamps of past unlocks cannot be recovered
  if the field is added later, which is the whole reason to add it now.
- **D-15: The unlock set degrades DOWNWARD on read, like every other v4 field.** An unknown id is
  dropped, a malformed timestamp defaults, and a corrupt achievements field must not make the
  enclosing blob read as corrupt — the independence contract `sanitizeTelemetry` already states.

### What the achievements are allowed to trust

- **D-16: Achievements read `longestStreak` and `totalDaysPlayed` as stored, and the phase records
  that this INHERITS T-12-06's accepted tamper model.** Both are hand-writable on a rooted device
  — `11-SECURITY.md` and `12-SECURITY.md` both close that as an accepted risk, not a defect,
  because there is no server, no leaderboard and no asset being protected.
  — Rejected: refusing to build on them and deriving everything from the trimmed history. A streak
  longer than the 400-entry window would then read as the window length — **precisely the failure
  D-16 of phase 12 was re-opened mid-phase to eliminate**, reappearing on a new surface.
- **D-18: The Dynamic Type ceiling is an OWNER DECISION with a due point, not an open note.**
  `allowFontScaling` defaults to `true` in React Native and an explicit `lineHeight` scales with
  it, both measured in the installed tree. Adding two rows drops the campaign-win panel's text
  multiplier ceiling from **1.433 to 1.102** — from clipping at the first accessibility size to
  clipping one step above default, since iOS xLarge is approximately 1.118. The lever is
  `maxFontSizeMultiplier` and it touches three shipped components, so it is not this phase's to
  pull. It is deferred deliberately, and the deferral is bounded: the exposure exists only at
  320x568, reachable only through Display Zoom, which is itself correlated with a raised text
  size. **Due at Phase 14**, which owns the shell those three components live in.
  — **Reversibility:** reversible — `maxFontSizeMultiplier` is a prop.

- **D-17: An unlock is itself one-way.** Nothing un-earns an achievement, so a tampered blob at
  install time grants permanently under D-04. Named here so a later round finds a decision rather
  than a defect.

### Resolved from Claude's Discretion by the pattern map

Both were listed as discretionary above; the pattern map turned each into a real fork, so each is
recorded as a decision rather than left to an executor.

- **D-19: `recordRunEnd` widens its return to carry the newly-unlocked ids alongside the blob.**
  The delta D-02 computes cannot otherwise cross the store boundary: `recordRunEnd` returns
  `ProgressBlob` and nothing else (`types.ts`), and once the union is persisted the set difference
  is gone. The store already holds both the old set and the new one at the moment it computes
  them, so returning the delta costs nothing and reads nothing extra.
  — Rejected: the host pre-reading storage and diffing. It needs an extra read, which D-01
  explicitly avoided, and it opens a race between the read and the write.
  — The change is additive and **compiler-enforced across both hand-mirrored stores**, which is
  the same mechanism that made phase 12's `daily` arm safe. There has been no return-type change
  since Phase 9; that is a reason to be deliberate, not a reason to take the worse option.
  — **Reversibility:** costly — every caller of `recordRunEnd` sees the new shape.

- **D-20: the evaluator declares its own structurally-compatible snapshot type and imports NO
  storage type.** No `src/services/<mode>/` module has ever imported one — verified across every
  import in `daily/` and `endless/`. The shipped precedent for exactly this situation is
  `src/render/overlayMetrics.ts`, whose header reads *"Structurally compatible with `SpikeMetrics`
  in runtime/ — no runtime import (LC-03)"*. Achievements copies that: a read-only view declared
  locally, structural compatibility checked by the compiler at the call site.
  — Keeps the catalog and evaluator pure and dependency-free, which is what makes N-ACH-01's
  "pure predicate" testable without a storage harness.

### Corrections the pattern map found, which bind the planner

- **D-21: on an invalid stored unlock the ID drops but the TIMESTAMP defaults.** Two different
  failure rules inside one entry sanitizer, and there is no precedent for the pair. The reason is
  D-17: an unlock is one-way, so dropping an entry because its timestamp is malformed would
  **un-earn an achievement the player did earn**. Degrading the timestamp costs a sort order;
  degrading the id costs the achievement.
- **D-22: the unlock merge keys whole entries and takes the EARLIEST timestamp, not "incoming
  wins".** `mergeDailyRecords` resolves by incoming-wins; copying that here would silently
  corrupt D-14's recency order on every reconcile. The cross-wiring hazard is narrower than
  phase 12's — an id is its own evidence, so only the timestamp can be mispaired — but a merge
  that unions ids and then reduces over all timestamps attaches one record's evidence to
  another's claim, which is the phase-12 defect in a new place.
- **D-23: the new field MUST be added to `cloneTelemetryBlob` as well as to the sanitizer and the
  merge.** A field missing there is erased by every other mode's run-end write — a three-site
  obligation, not two.

### Claude's Discretion

- The catalog's exact membership and every threshold value, within D-09's 8–12 and D-11's
  "state the reasoning".
  The stored shape of the unlock record and the field name inside the v4 blob.
  The wording of the unlock line(s) on the result panel, within D-05's cap.
  Where the catalog and evaluator modules live (`src/services/achievements/` is the obvious
  neighbour to `src/services/daily/` and `src/services/endless/`).
  Whether the diff in D-02 is computed inside the storage layer or handed to it.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

ROADMAP.md declares no `Canonical refs:` line for this phase. The references below were found by
scouting the codebase and prior phase context.

### Prior-phase decisions this phase builds on
- `.planning/phases/09-run-telemetry-storage-v4/09-CONTEXT.md` — D-01..D-10: what telemetry
  records and why. The 16 aggregate fields are this phase's entire input surface.
- `.planning/phases/12-daily-challenge/12-CONTEXT.md` — D-13..D-17 and the **AMENDED D-16**
  (commit `39d709e`): the daily streak values, their one-way rating, and the `currentStreakStart`
  third member added mid-phase.
- `.planning/phases/12-daily-challenge/12-UI-SPEC.md` — the result-panel contract this phase adds
  a block to, including the non-scrolling rule and the 320x568pt vertical backstop.

### Security posture inherited
- `.planning/phases/11-endless-mode/11-SECURITY.md` — AR-11-02 (local record tampering accepted).
- `.planning/phases/12-daily-challenge/12-SECURITY.md` — AR-12-02 and the three declared streak
  residuals. **D-16 above inherits this disposition; read it before assuming a number is trusted.**

### Ops documentation
- `docs/ops/PROGRESS-STORAGE.md` — the v4 blob, its migration history and its bounds.
- `docs/ops/DAILY-CHALLENGE.md` — the daily record's shape and its nine named accepted costs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `src/services/storage/types.ts` — `TelemetryAggregate` already carries the 16 fields a catalog
  needs: `runsPlayed`, `runsWon`, `runsLost`, `runsAbandoned`, `bricksBroken`, `bestComboEver`,
  `pickupMultiball`, `pickupExpand`, `pickupExtraLife`, `pickupSlow`, `pickupFireball`,
  `livesLost`, `longestRallyEver`, `largestCascadeEver`, `ticksPlayed`, `wallClockMsTotal` —
  per mode and in `lifetime`. **No new telemetry field should be needed.** If a proposed
  achievement needs one, that is a signal to change the achievement, not the blob.
- `EndlessRecord` (`bestWave`, `bestScore`) and `DailyRecord` (`history`, `longestStreak`,
  `totalDaysPlayed`, `currentStreakStart`) cover the mode-specific verbs.
- `src/services/daily/` and `src/services/endless/` are the shape to copy for a new
  `src/services/achievements/` — pure modules with a named-export barrel, no storage import.

### Established patterns
- **Additive v4 field with its own sanitizer** — `sanitizeDailyRecord` in `parseBlob.ts`, wired
  into `sanitizeTelemetry`, added with no version bump. D-13 follows it exactly.
- **Panels take scalars** — `DailyResultOverlay`'s prop signature is daily-derived scalars only,
  which is what makes SC-5 checkable at the signature instead of by tracing a branch. D-08
  follows it.
- **`safeCounter` bounds downward but NOT upward** (`telemetry.ts`) — the phase-11 audit measured
  `bestScore: Number.MAX_VALUE` surviving the read path intact. A threshold predicate will
  therefore fire on an absurd stored value; that sits inside D-16's accepted model.

### Integration points
- `recordRunEnd` in both hand-mirrored stores (`memoryStore.ts`, `asyncStorageStore.ts`) is where
  D-01 puts evaluation. **They are maintained in parallel by hand** — phase 11 and phase 12 both
  had to prove the two agree, and the firewall suites assert each store separately. Expect the
  same obligation here.
- `ResultOverlay.tsx` and `DailyResultOverlay.tsx` are the two panels of D-06. They are separate
  components with separate prop signatures; the unlock block will exist in both.

</code_context>

<specifics>
## Specific Ideas

- The phase goal's verb is **"tells them"**. D-06 and D-05 exist to keep that half of the goal in
  this phase rather than deferring it to Phase 14's screen.
- SC-2's two halves have different mechanisms: determinism comes from D-03 (a pure function) and
  idempotency from D-02 (a set difference). Neither is a guard anyone has to remember to write.

</specifics>

<deferred>
## Deferred Ideas

- **The Achievements screen.** Phase 14 owns it. This phase writes the data it reads, including
  D-14's timestamps.
- **Tiered achievements (bronze/silver/gold).** Rejected at D-09 for this phase; additive later
  because the catalog is data.
- **Rewards attached to an unlock.** No currency, no shop, no cosmetics exist — PROJECT.md rules
  the whole category out.
- **Cross-device or social comparison of achievements.** Out of scope by PROJECT.md.

</deferred>

---

*Phase: 13-Achievements*
*Context gathered: 2026-09-28*
