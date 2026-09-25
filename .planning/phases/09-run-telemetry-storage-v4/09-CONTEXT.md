# Phase 9: Run Telemetry & Storage v4 - Context

**Gathered:** 2026-09-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Record what actually happens during a run, and persist it through a lossless
`ProgressBlob` v3 → v4 migration.

**Delivers (N-STAT-01, N-STAT-02):**
- Deterministic per-run counters derived from the existing event ring
- Lifetime aggregates plus a bounded log of recent runs
- Storage v4 schema + migration that preserves every existing best score, star and unlock
- Fail-soft parse for v4, matching the contract v2/v3 already follow

**Does not deliver (this phase):**
- Statistics screen (**Phase 14** — N-STAT-03)
- Achievements catalog or unlock evaluation (**Phase 13** — N-ACH-*)
- Board generation (**Phase 10**), endless (**11**), daily challenge (**12**)
- Any change to `hashWorld`, core simulation, or the drop table

</domain>

<decisions>
## Implementation Decisions

### What counts as a run
- **D-01:** **Every retry is a new run.** Phase 6 locked RUN-03 (instant retry, no
  confirmation), so retries are frequent and cheap — counting each one keeps "attempts"
  honest and keeps within-run achievements ("clear without dying") naturally scoped.
- **D-02:** **Abandoned runs are recorded**, with an outcome distinct from win/lose.
  Rationale: a player who plays five minutes then exits to Menu must not see "0 bricks
  broken". Counters accumulated up to the exit still count toward lifetime totals; the
  separate outcome keeps win-counting achievements from mis-firing.
- **D-03:** Run outcomes are therefore a closed set: `win | lose | abandoned`.

### Schema shape
- **D-04:** **v4 is mode-aware from the start.** Stats key on `(mode, levelId)` with
  `mode: 'campaign' | 'endless' | 'daily'`; only `campaign` is written in this phase.
  Phases 11 and 12 then add a mode value instead of forcing a v5 and a v6 migration.
- **D-05:** **Aggregate lifetime totals plus a bounded ring buffer of recent runs.** Each
  log entry stays small — mode, level id, outcome, score, ticks, timestamp. The bound is
  fixed and enforced on write so the blob cannot grow without limit.
  Rationale: E2 had to build a throwaway bot because nothing in the app recorded real
  runs. This is the durable fix, and it is what makes "how have I been playing lately"
  answerable in Phase 14.

### Counters recorded per run
- **D-06:** Base set (from ROADMAP): bricks broken, best combo, power-ups caught, lives
  lost, ticks played, outcome.
- **D-07:** Plus **per-power-up-type counts** — multiball / expand / extra life / slow /
  fireball counted separately, not as one total. Needed for per-verb achievements, and it
  is the observed drop distribution that N-CNT-02 currently has no data for.
- **D-08:** Plus **largest explosive cascade** (bricks destroyed in a single chain). E1b
  made explosive the campaign's teaching verb; this is the number worth showing off.
- **D-09:** Plus **wall-clock play time (ms)**, separate from `ticks × FIXED_DT`. Ticks
  measure simulated time and exclude pause; wall-clock answers "hours played" honestly.
  Both are stored — they are different questions.
- **D-10:** Plus **longest rally**, defined as *consecutive paddle hits without losing a
  life*. This is deliberately **not** best combo (consecutive brick hits without paddle
  contact), which D-06 already covers — a survival streak, not an aggression streak. The
  planner must not collapse these into one field.

### Carried forward (already locked — do not re-litigate)
- **C1 D-09:** Parse is fail-soft — corrupt or partial data degrades to defaults, never
  throws into gameplay. v4 follows the same contract.
- **C1 D-10:** Writes are async and non-blocking; memory merge is synchronous and the
  persist is fired and not awaited.
- **C1 D-11:** No storage reads and no React state writes on the simulation or render hot
  path.
- **C2:** `recordRunEnd` is the established end-of-run entry point; telemetry should ride
  it rather than adding a parallel call site.
- **Roadmap SC-5:** telemetry *reads* events — `hashWorld` and core stay untouched.

### Claude's Discretion
- Exact ring-buffer bound (a round number in the tens; justify it against blob size).
- Exact TypeScript shape of the v4 blob beyond the fields above.
- Whether counters accumulate in a JS-side reducer draining the event ring, or are folded
  into the existing `PlayingHost` event fan-out — provided the hot-path and
  core-untouched constraints hold.
- Whether `PersonalBestBlob` v1 remains a separate migrate source or is finally folded in.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` § "Phase 9: Run Telemetry & Storage v4" — goal + 5 success criteria
- `.planning/REQUIREMENTS.md` § "v1.2 Requirements" — N-STAT-01, N-STAT-02 (and N-STAT-03
  for Phase 14, which consumes this phase's output)

### Storage (the thing being migrated)
- `src/services/storage/types.ts` — `ProgressBlob` v3, `LevelBest`, `ProgressStore` interface
- `src/services/storage/parseBlob.ts` — the fail-soft parse contract v4 must match;
  `sanitizeUnlocked` also performs the E2 ladder heal
- `src/services/storage/migrateProgress.ts` — existing v1→v3 and v2→v3 migration shape
- `docs/ops/PROGRESS-STORAGE.md` — C1 storage operations doc
- `.planning/post-mvp/phases/C1-progress-storage/C1-CONTEXT.md` — D-08…D-11 storage locks

### Event source (where counters come from)
- `src/core/types.ts` — `EventCode` (WALL_HIT, PADDLE_HIT, BRICK_HIT, BRICK_BREAK,
  BALL_OUT, POWERUP_CATCH, LIFE_LOST, WIN, LOSE) and `BrickFlags`
- `src/core/events/ring.ts` — event ring structure and drain semantics
- `src/core/stepRun.ts` — per-step rule ordering; where events are produced each tick
- `docs/layer-contract.md` — LC-04: `app/` may import `runtime/`, `render/`, `services/`;
  core must not depend on services

### Verbs being counted
- `docs/ops/POWERUPS-B2.md` + `docs/ops/FIREBALL-B3.md` — the five pickup types and the
  drop table D-07 wants observed data for
- `docs/ops/EXPLOSIVE-BRICKS.md` — cascade semantics behind D-08's "largest chain"
- `docs/ops/BALANCE-E2.md` — why run data is missing today; the bot that stood in for it

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProgressStore` (`memoryStore.ts` / `asyncStorageStore.ts`): already has the
  memory-merge-then-void-persist pattern, a soft-fail memory fallback when the native
  module is missing, and an optional `flush()` for AppState background.
- `recordRunEnd({ levelId, score, outcome, livesRemaining })`: the existing end-of-run
  entry point. It already receives outcome and lives — telemetry extends this call rather
  than introducing a second one.
- `parseProgressResult` / `migrateOrDefault`: the versioned parse-and-migrate pair to
  extend, including the `status: 'ok' | 'absent' | 'corrupt'` result shape.
- Event ring drain helpers used by `src/vfx/consumeEvents.ts` — the established read-only
  consumer pattern for events, and the model telemetry should follow.

### Established Patterns
- Storage is versioned by key (`@nbb/progress/v3`), and legacy keys are **never deleted** —
  they stay as migrate-on-read sources. v4 continues this.
- `PLAYABLE_LEVEL_ORDER` is the single source of truth for campaign order and ids; stats
  keyed by level must not hard-code the order (E2 reordered it once already).
- Services are importable from `app/` only; `runtime/` and `core/` must not reach into
  services (enforced by ESLint boundaries).
- Assert scripts wired into `npm test` are the repo's idiom for contract guards.

### Integration Points
- `PlayingHost` already fans out events once per batch to JS (D1 haptics work) — the
  natural seam for a telemetry reducer without adding a second `scheduleOnRN`.
- `GameHost` owns shell phase and the `ProgressStore` instance; it is where a run's
  start/abandon boundary is observable (D-02 needs the exit-to-Menu transition).

</code_context>

<specifics>
## Specific Ideas

- The motivating example for D-05 is concrete: during E2 the only way to get run data was
  a throwaway headless bot (`tests/helpers/balanceBot.ts`). Recent-run logging should make
  that unnecessary next time, and should be shaped so a future balance pass can read it.
- D-10's "longest rally" was chosen *after* being told it overlaps best combo; it is
  therefore intentionally the survival metric (paddle hits without a life lost), not a
  second name for combo.

</specifics>

<deferred>
## Deferred Ideas

- **Statistics screen / how any of this is displayed** → Phase 14 (N-STAT-03). This phase
  records; it renders nothing.
- **Achievement definitions and unlock rules** → Phase 13. Telemetry is the substrate.
- **Daily streak storage** → Phase 12. D-04's mode dimension leaves room for it, but the
  streak rules (and the clock-change policy) are Phase 12's decision.
- **Reset-stats affordance** → Phase 14 UI question, if wanted at all.
- **Using observed drop counts to retune the drop table** → N-CNT-02, still blocked on a
  human cohort. D-07 only makes the data exist.

</deferred>

<notes_for_later_phases>
## Notes for later phases

- **largestCascade / largestCascadeEver attribution (added during plan revision, 2026-09-25):**
  The planner evaluated two cascade-attribution algorithms (see RESEARCH.md Pitfall 1) and
  chose **grid-adjacency grouping** (RESEARCH.md's recommended option) as the primary
  algorithm, not the cheaper substep-level heuristic — because D-08's `largestCascade` feeds
  a **Phase 13 achievement trigger**, and for a trigger, overcounting (firing an unearned
  unlock) is the harmful direction, not undercounting. Grid-adjacency is exact for every real
  playable level (all of them use the lattice broadphase). A narrow fallback exists only for
  a hypothetical non-lattice ("dense/legacy fixture") board, which is not a shape any shipped
  campaign/generated level takes — that fallback path can only *undercount* (each break in a
  non-lattice context is treated as its own singleton group), never overcount. **Phase 13 does
  not need to tolerate an overcount bias in `largestCascadeEver`** — the schema field
  (`src/services/storage/types.ts`) carries a short comment recording this for whoever designs
  the achievement thresholds, but no bias-tolerance is required.
</notes_for_later_phases>
