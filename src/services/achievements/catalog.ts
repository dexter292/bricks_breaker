/**
 * The achievement catalog (N-ACH-01 / SC-1 / D-03 / D-09 / D-11 / D-20).
 *
 * Achievements are DATA: an id, a display name, a description, and a pure predicate over
 * a read-only telemetry view. Nothing in this file reads a clock, a store or a random
 * number, and nothing in it renders. Its guards are `tests/achievements.catalog.test.ts`
 * (the shape, the name budget, the purity scan, the three-mode coverage and the all-zero
 * anchor), `tests/achievements.evaluate.test.ts` (what the evaluator does with it) and
 * `tests/achievements.record.test.ts` (the store write end to end).
 *
 * ## What is contract
 *
 * Three things, and only these three.
 *
 * The **id set** is contract: an id is minted here and nowhere else, it is the key the v4
 * blob stores, and `isKnownAchievementId` below is the runtime gate the read path uses to
 * drop one it does not recognise (D-15, wired in plan 13-03).
 *
 * The **declaration order** is contract: it is the display order the panel renders in
 * (`13-UI-SPEC.md` § Ordering is contract). Not recency — under D-04's retroactive flood
 * every unlock carries the SAME timestamp, so a recency sort would make the named
 * achievement vary between two runs of one snapshot, which breaks SC-2 at the surface the
 * player actually sees. Not alphabetical — that re-orders whenever a name is edited.
 *
 * That the catalog is **data** is contract (SC-1): a thirteenth entry is a new element in
 * the array below and needs no edit anywhere else. `ACHIEVEMENT_CATALOG` holds D-09's
 * twelve as of plan 13-02 — the ceiling of its 8-12 range, chosen so the phase fills the
 * catalog rather than leaving a partial one behind.
 *
 * ## What is borrowed
 *
 * The sixteen `TelemetryAggregate` field names belong to `src/services/storage/types.ts`
 * and are NOT restated here as a duplicate schema. `AchievementSnapshot` below is a
 * read-only VIEW naming only the subset the shipped predicates read — the
 * `src/render/overlayMetrics.ts` shape, whose own header reads *"Structurally compatible
 * with `SpikeMetrics` in runtime/ — no runtime import (LC-03)"*. Same construction, same
 * reason (D-20): no import, compatibility checked by the compiler at the call site.
 *
 * ## Why totality lives in this body
 *
 * The hostile caller is a tampered blob. AsyncStorage is plaintext, and `safeCounter`
 * bounds a counter DOWNWARD but not upward — the phase-11 audit measured
 * `bestScore: Number.MAX_VALUE` surviving the read path intact — so an absurd stored value
 * reaches a predicate and is accepted. That sits inside D-16's accepted tamper model
 * (T-13-03): there is no server, no leaderboard and no asset being protected. What must
 * NOT happen is a throw, and `evaluate.ts` is where that is folded; the three readers
 * below are what keep a garbage CELL from reading as a qualification.
 *
 * ## No clock, no RNG, no storage import
 *
 * D-03 makes the evaluator a pure function of (catalog, snapshot, unlocked set), which is
 * what makes SC-2's "the same snapshot twice yields the same set" testable with no
 * harness at all. `Date.now`, `new Date`, `Math.random`, `performance.now` and any import
 * of the storage module are banned in this directory and the ban is enforced at AST level
 * by the `src/services/achievements/**` block in `eslint.config.js` — not by this
 * paragraph. Comments are not AST nodes, so naming the four constructs here does not
 * self-invalidate the rule. The block's own PRESENCE is observed by the `__purity_probe`
 * gate in plan 13-01's verify block, which counts 5 eslint errors with the block
 * configured and 0 without: `npm run lint` alone exits 0 against a clean directory either
 * way and is therefore no evidence the block exists. The portable SECOND reader of the
 * same rule is `tests/achievements.catalog.test.ts -t "no clock no storage"`, a text-level
 * scan that strips comments before matching for exactly the reason this paragraph is safe
 * against the lint block and would not be safe against a grep.
 *
 * SECURITY: nothing here protects anything. An unlock guards no asset and can be granted
 * by hand on a rooted device (T-13-03 / T-13-04, inheriting AR-11-02 and AR-12-02).
 */

/**
 * The counters a predicate may read, as a read-only view of `TelemetryAggregate`.
 *
 * Deliberately the SUBSET the shipped predicates actually read, not all sixteen: the
 * sixteen names belong to `src/services/storage/types.ts` and restating them here would be
 * a second schema to keep in step. Plan 13-01 named one field because one predicate read
 * one field; plan 13-02 widened it to the twelve its twelve predicates read, and left
 * `runsLost`, `runsAbandoned`, `ticksPlayed` and `wallClockMsTotal` out because nothing
 * reads them. A thirteenth achievement that needs a thirteenth field adds it here; it does
 * not widen this to `TelemetryBlob`.
 */
export type AchievementCounters = {
  /** Runs finished, any outcome. Cumulative — it sums across runs and never falls. */
  readonly runsPlayed: number;
  /** Runs finished as a win. Cumulative. */
  readonly runsWon: number;
  /** Lives lost. Cumulative, so a per-level aggregate is a claim across EVERY run of that level. */
  readonly livesLost: number;
  /** Bricks destroyed. Cumulative — it sums across runs and never falls. */
  readonly bricksBroken: number;
  /** Running max: consecutive brick hits without paddle contact (storage D-06) — an aggression streak. */
  readonly bestComboEver: number;
  /** Running max: consecutive paddle hits without losing a life (storage D-10) — a survival streak, a different question from the combo. */
  readonly longestRallyEver: number;
  /** Running max: the largest single chain reaction, grid-adjacency-grouped (storage D-08). Can only ever UNDERcount. */
  readonly largestCascadeEver: number;
  /** Cumulative pickup collections, one counter per kind. Summed by one entry, never five. */
  readonly pickupMultiball: number;
  readonly pickupExpand: number;
  readonly pickupExtraLife: number;
  readonly pickupSlow: number;
  readonly pickupFireball: number;
};

/**
 * The read-only telemetry view a predicate is handed (D-20).
 *
 * Structurally compatible with `TelemetryBlob` and **imports nothing** — compatibility is
 * checked by the compiler at the call site in each store, exactly as
 * `src/render/overlayMetrics.ts` is checked against `SpikeMetrics`. MEASURED: a
 * `TelemetryBlob` satisfies this type with zero `tsc` errors, so the shape is a contract
 * and not an aspiration.
 *
 * **The inverse obligation, stated so it is not "fixed" later.** Widening this to
 * `TelemetryBlob` itself would put a storage type inside a policy module for the first
 * time in this tree — no `src/services/<mode>/` module has ever imported one — and would
 * make every catalog test need a storage harness. That is exactly what makes N-ACH-01's
 * "pure predicate" untestable, which is why the duplication of a handful of field names
 * is the cheaper side of the trade.
 *
 * **The three `byMode` maps are read by their VALUES and never by a key literal.** Their
 * keys are `ENDLESS_TELEMETRY_KEY`, `DAILY_TELEMETRY_KEY` and a `LevelId` — all three are
 * storage constants D-20 forbids importing, and a hand-copied `'endless'` here would be
 * the same constant written in two places, which is the defect family this project has
 * closed three times. `valuesOf` below needs neither, so no predicate names a key.
 *
 * `daily.history` is deliberately absent: plan 13-01 declared it, no shipped predicate
 * reads it, and this view's whole contract is that it names the subset that is read. A
 * field carried here that nothing reads is a schema obligation with no beneficiary.
 */
export type AchievementSnapshot = {
  readonly lifetime: AchievementCounters;
  readonly byMode: {
    readonly campaign: Readonly<Partial<Record<string, AchievementCounters>>>;
    readonly endless: Readonly<Partial<Record<string, AchievementCounters>>>;
    readonly daily: Readonly<Partial<Record<string, AchievementCounters>>>;
  };
  readonly endless: {
    readonly bestWave: number;
    readonly bestScore: number;
  };
  readonly daily: {
    readonly longestStreak: number;
    readonly totalDaysPlayed: number;
  };
};

/** One catalog entry — data, not code (SC-1). */
export type Achievement = {
  /**
   * The stored key, minted HERE and nowhere else. It is what
   * `telemetry.achievements.unlocked` holds and what `isKnownAchievementId` validates on
   * the read path (plan 13-03). Changing a shipped id un-earns that achievement for every
   * player who already has it, because the stored entry no longer matches the catalog.
   */
  readonly id: string;
  /**
   * The PANEL display string — the `{name}` in `Unlocked · {name}`. Bounded at
   * `ACHIEVEMENT_NAME_MAX`; a longer one wraps and costs a row the panel does not have.
   */
  readonly name: string;
  /**
   * The Achievements screen's one-line explanation (Phase 14). Rendered by NOTHING in this
   * phase, and written now anyway: writing it later means re-deriving a threshold's intent
   * from its predicate, which is the reading D-11 exists to make unnecessary.
   */
  readonly description: string;
  /**
   * Holds iff the snapshot qualifies. Pure and total: no clock, no storage, no randomness
   * (D-03). A predicate that throws is treated as NOT qualifying by `evaluate.ts` — the
   * under-reporting direction.
   */
  readonly predicate: (s: AchievementSnapshot) => boolean;
};

/**
 * The display-name budget, in characters — the arithmetic, not the assertion
 * (`13-UI-SPEC.md` § The 16-character name budget).
 *
 * The panel's text width is `320` `maxWidth` less `24` padding on each side, so `272px`.
 * SpaceMono is monospaced at `0.612 em` — `unitsPerEm` 1000 with every `hmtx` advance 612,
 * parsed from the shipped `assets/fonts/SpaceMono-Regular.ttf`. At Body `16px` that is
 * `16 x 0.612 = 9.792px` per character, and `floor(272 / 9.792) = 27` characters per line.
 * `Unlocked · ` is 11 characters. `27 - 11 = 16`.
 *
 * **Load-bearing for the VERTICAL budget, not just for tidiness.** A 17-character name
 * wraps to a second visual line and silently adds 24px, and 24px is most of the 26px of
 * spare height the whole two-row reduction bought (D-05 AMENDED). The failure is not a
 * ragged line; it is `Menu` clipped off the bottom of a non-scrolling panel.
 *
 * Two controls, and only one of them is here. The quantified assertion over the exported
 * catalog is `explicit` evidence that needs no layout and is
 * `tests/achievements.catalog.test.ts -t "name within 16 chars"`; the longest shipped name
 * is `Flawless Clear` at 14. The horizontal claim itself — that a 16-character name
 * renders on one line on a real 320px panel — is a DEVICE backstop (WINDOWS #16, extended
 * by this phase) and no jsdom render is evidence for it. `numberOfLines={1}` on the unlock
 * lines is the weaker backstop, not the gate.
 */
export const ACHIEVEMENT_NAME_MAX = 16 as const;

/*
 * ---------------------------------------------------------------------------------------
 * Three total readers. Every predicate below goes through them, and the reason is a
 * DIRECTION rather than a style.
 *
 * `evaluate.ts` already wraps each predicate in a `try`, so a throw costs that entry alone
 * — but a throw is not the only way a tampered blob can lie. `safeCounter` bounds a stored
 * counter downward and NOT upward (measured in the phase-11 audit: `Number.MAX_VALUE`
 * survived the read path intact), and nothing on the read path rejects a non-finite number
 * or a non-object map cell. Read raw, `Infinity` would satisfy every `>=` threshold in this
 * array and `NaN` would satisfy none of them — inconsistent, and the first of those two is
 * the wrong direction. These readers make garbage read as ZERO everywhere a larger value
 * qualifies, and as NOT-QUALIFYING everywhere an exact zero qualifies, so a hostile
 * snapshot yields FEWER achievements than a clean one and never more. That is the same
 * direction `src/services/daily/streak.ts` states about itself and the same direction
 * `evaluate.ts` folds a throw in, and `tests/achievements.evaluate.test.ts -t "hostile
 * snapshot"` asserts it rather than assuming it.
 * ---------------------------------------------------------------------------------------
 */

/**
 * A counter as a number a `>=` threshold may be compared against, or `0`.
 *
 * `NaN`, `+/-Infinity`, a negative, a string and a missing field all read as `0` — the
 * under-reporting direction. Not `Number(raw)`: that coerces `''` and `null` to `0`
 * silently and `'1e400'` to `Infinity`, which is the failure this exists to stop.
 */
function counter(raw: unknown): number {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/**
 * Whether a counter is GENUINELY zero — a real number equal to zero.
 *
 * The inverse of `counter` and it cannot be expressed with it. The flawless entries
 * qualify on `livesLost === 0`, so folding garbage to `0` there would GRANT an achievement
 * out of corruption — over-reporting, the one direction this tree refuses. `NaN`, a
 * negative and a missing field are therefore all "not zero" and do not qualify.
 */
function isGenuineZero(raw: unknown): boolean {
  return typeof raw === 'number' && raw === 0;
}

/**
 * The object-shaped values of one `byMode` map, keyless and total.
 *
 * Keyless because the three key spaces are storage constants D-20 forbids importing (see
 * `AchievementSnapshot`). Total because the map is `Partial` — a value may be `undefined`
 * — and because a tampered blob may put a `null`, a number or a string in a cell:
 * `sanitizeAggregateMap` copies every key it finds on read with no bound (WINDOWS #27), so
 * whatever is in the blob arrives here. Non-object cells are dropped, which under-reports.
 */
function valuesOf(
  map: Readonly<Partial<Record<string, AchievementCounters>>> | undefined,
): readonly AchievementCounters[] {
  if (map == null || typeof map !== 'object') {
    return [];
  }
  return Object.values(map).filter(
    (v): v is AchievementCounters => v != null && typeof v === 'object',
  );
}

/** One counter summed across a `byMode` map's values, every garbage cell contributing zero. */
function sumOf(
  map: Readonly<Partial<Record<string, AchievementCounters>>> | undefined,
  pick: (c: AchievementCounters) => unknown,
): number {
  let total = 0;
  for (const value of valuesOf(map)) {
    total += counter(pick(value));
  }
  return total;
}

/**
 * The shipped catalog, in display order (SC-1 / D-09 / D-10 / D-11 / D-12).
 *
 * **Twelve entries, one tier, no ladder (D-09).** Twelve is the top of D-09's 8-12 range.
 * No bronze/silver/gold: tiering multiplies the thresholds needing justification and adds
 * a ladder that must be shown sane at both ends, for a game no human has played.
 *
 * **THE ORDER IS CONTRACT, and it is authored rather than incidental.** `13-UI-SPEC.md`
 * makes catalog declaration order the panel's order, and its `n >= 3` case names the FIRST
 * unlocked entry and counts the rest — so this sequence decides which achievement a player
 * who unlocks four at once actually reads. Entries are grouped lifetime, then campaign,
 * then endless, then daily, with the one most worth naming first inside each group.
 *
 * **D-10's split is documented here and deliberately NOT encoded.** Five entries are
 * CUMULATIVE and cannot be failed, only waited out: 1 `bricks-1000`, 5 `runs-50`,
 * 6 `pickups-100`, 8 `campaign-25`, 10 `endless-runs-20`. Seven are SKILL-GATED and are
 * earned by playing well: 2 `combo-25`, 3 `rally-60`, 4 `cascade-12`, 7 `flawless-clear`,
 * 9 `endless-wave-10`, 11 `daily-perfect`, 12 `daily-streak-7`. The mix is the decision;
 * a catalog of only the first kind rewards patience and a catalog of only the second
 * punishes a new player on their first evening.
 *
 * There is deliberately **no `kind` field on `Achievement`** to make that split
 * machine-readable. Nothing in this phase renders it, Phase 14 has not asked for it, and
 * adding a field so that a test can assert a property this comment already states is a
 * gate invented for its own sake. The omission is a decision; it is not something a later
 * reader should "fix" absent a consumer.
 *
 * **Every threshold below is a JUDGEMENT and says so at its own site (D-11).** No human
 * has played this game — both `11-UAT.md` and `12-UAT.md` record that as still true — so
 * there is no distribution to derive a number from. Each JSDoc states what the number is,
 * the reasoning that produced it, the anchors it sits between where any exist, that it is
 * a judgement rather than a measurement, and what a re-tune would cost. Exactly one
 * threshold in this array has a real published anchor (entry 9); the rest say plainly that
 * none exists rather than inventing a plausible-sounding one. The whole set is routed to
 * human review in plan 13-05 rather than presented as calibrated.
 *
 * **Ids are permanent from the first shipped build; names and thresholds are not.**
 * Re-tuning a threshold, rewording a name or adding a thirteenth entry is a one-file edit
 * with no code change anywhere (SC-1). Renaming a shipped ID is not reversible: the read
 * path drops an id the catalog does not mint (D-15) and D-17 says nothing un-earns an
 * unlock, so an id change silently un-earns the achievement for every player who has it.
 */
export const ACHIEVEMENT_CATALOG: readonly Achievement[] = [
  {
    id: 'bricks-1000',
    name: '1000 Bricks',
    description: 'Break 1,000 bricks across every mode',
    /**
     * Why 1,000, and why this is the entry the tracer proved the phase on.
     *
     * It is CUMULATIVE (D-10's cumulative half), so it cannot be failed — only waited out.
     * A player who does not have it yet is not being told they played badly; they are being
     * told they have not played that much yet, which is the only honest reading of a
     * counter that never falls.
     *
     * It reads `lifetime`, so it is reachable from campaign, endless AND daily play. That
     * is what makes it the right entry to prove the D-12 placement claim with: the
     * evaluation sits outside every mode gate, and the three-mode case in
     * `tests/achievements.record.test.ts` drives a run through each one and asserts all
     * three unlock. A catalog that only read `lifetime` forever would satisfy the LETTER of
     * SC-5 and not its point, which is what the eleven entries below reach past.
     *
     * The number is a JUDGEMENT, not a measurement, and says so (D-11). No human has played
     * this game — both `11-UAT.md` and `12-UAT.md` record that as still true — so there is
     * no distribution to derive a threshold from. The reasoning available is the shipped
     * board sizes: `level-01` is 32 bricks and `level-03` is 94, so 1,000 is on the order
     * of 15-30 cleared boards. Far enough out that it is not handed over on the first
     * session, close enough that a player who keeps coming back reaches it without being
     * told to grind. It is routed to human verification in plan 13-05 rather than presented
     * as calibrated. A re-tune costs nothing in code: the catalog is data (SC-1).
     */
    predicate: (s) => counter(s.lifetime.bricksBroken) >= 1000,
  },
  {
    id: 'combo-25',
    name: '25x Combo',
    description: 'Hit 25 bricks in a row without touching the paddle',
    /**
     * Why 25.
     *
     * `bestComboEver` is a running max of consecutive brick hits WITHOUT paddle contact
     * (storage D-06, stated in `src/services/storage/telemetry.ts`) — an aggression streak,
     * and deliberately not the same metric as `longestRallyEver` below. So this is SKILL-
     * GATED (D-10): it is a thing the player did, not a thing they waited for.
     *
     * The reasoning, and the two anchors it sits between. The generator's published table
     * (`docs/ops/BOARD-GENERATOR.md`) puts `d = 10` at 72 bricks, and its calibration line
     * puts `d = 0` at `level-01`'s 32 bricks and `d ~ 13` at `level-03`'s 94-brick
     * showpiece. 25 is therefore most of a tutorial board, about a third of a mid-scale
     * one, and roughly a quarter of the showpiece — a long unbroken sequence on any of
     * them, and not a whole board on any of them either. Both of those matter: a threshold
     * at a full board's brick count would be unreachable without a fireball, and one at
     * five would fire on the first lucky bounce.
     *
     * It is a JUDGEMENT and not a measurement. The anchors bound how much of a BOARD 25 is;
     * nothing anywhere says how much of a board a competent player actually clears between
     * paddle contacts, because no human has played this game. A re-tune costs nothing in
     * code (SC-1) and is exactly what plan 13-05's human review exists to inform.
     */
    predicate: (s) => counter(s.lifetime.bestComboEver) >= 25,
  },
  {
    id: 'rally-60',
    name: '60 Rally',
    description: 'Return the ball 60 times without losing a life',
    /**
     * Why 60, and the honest admission that it is anchored against nothing.
     *
     * `longestRallyEver` is a running max of consecutive PADDLE hits without losing a life
     * (storage D-10) — a survival streak, the complement of the combo above rather than a
     * second spelling of it. Skill-gated (D-10).
     *
     * The reasoning: 60 was chosen as "about a minute of unbroken play" at a plausible
     * paddle-contact cadence of roughly one return per second. **That cadence is itself
     * unmeasured** — it is an estimate from ball speed and field height, not a figure from
     * a sweep or a playtest, and this is the entry where the estimate is most load-bearing.
     * No published document in this repo anchors a rally length; `docs/ops/BALANCE-E2.md`
     * and the generator sweep record clear TIMES, not return counts, and a clear time
     * cannot be converted into one without exactly the cadence being assumed.
     *
     * So: a JUDGEMENT, not a measurement, resting on a second judgement. If plan 13-05's
     * human review finds a minute of unbroken play is trivial or impossible, this number
     * is the first one that should move; the move costs nothing in code (SC-1).
     */
    predicate: (s) => counter(s.lifetime.longestRallyEver) >= 60,
  },
  {
    id: 'cascade-12',
    name: '12 Cascade',
    description: 'Set off a single chain reaction that breaks 12 bricks',
    /**
     * Why 12.
     *
     * `largestCascadeEver` is a running max over ONE chain reaction, grouped by grid
     * adjacency (`src/runtime/runStats.ts`, storage D-08). Skill-gated, and it is the one
     * entry whose metric is documented as conservative in the other direction: the narrow
     * fallback for a break with no resolvable lattice cell counts that break as its own
     * singleton group, so the recorded figure can only ever UNDERcount. A threshold over an
     * undercounting metric is harder than it reads, never easier.
     *
     * The anchors. Explosive bricks exist and their blast shape is documented
     * (`docs/ops/EXPLOSIVE-BRICKS.md`); the generator's published table
     * (`docs/ops/BOARD-GENERATOR.md`) places `nE = 3` explosives per HALF board at
     * `d = 10`, so six on a full mid-scale board of 72 bricks. 12 is therefore a chain a
     * well-placed shot into a dense region with a couple of explosives in it could
     * plausibly reach, and one a stray shot into a sparse region could not. Those two are
     * the bounds the number sits between.
     *
     * A JUDGEMENT and not a measurement: nothing published records the distribution of
     * cascade sizes a real player produces, because no human has played this game. A
     * re-tune is data only (SC-1).
     */
    predicate: (s) => counter(s.lifetime.largestCascadeEver) >= 12,
  },
  {
    id: 'runs-50',
    name: '50 Runs',
    description: 'Finish 50 runs in any mode',
    /**
     * Why 50, and the plain statement that no anchor exists for it.
     *
     * CUMULATIVE across every mode (D-10's unfailable half) and the broadest entry in the
     * catalog: a run counts whether it was won, lost or abandoned, because the claim is
     * about coming back rather than about succeeding.
     *
     * The reasoning: 50 runs is a returning player rather than a curious one. At a few runs
     * per sitting it is on the order of ten sittings — far enough out that a player who
     * tried the game once does not have it, near enough that it does not require a habit
     * nobody has formed yet. **No published anchor exists.** There is no retention curve,
     * no session-length measurement and no cohort — `11-UAT.md` and `12-UAT.md` both record
     * that no human has played this game — so "ten sittings" is a shape, not a figure.
     *
     * A JUDGEMENT, and the one in this array most likely to be wrong in the boring
     * direction (too low is a cheap achievement; too high is an invisible one). Data only
     * to change (SC-1).
     */
    predicate: (s) => counter(s.lifetime.runsPlayed) >= 50,
  },
  {
    id: 'pickups-100',
    name: '100 Pickups',
    description: 'Collect 100 power-ups of any kind',
    /**
     * Why 100, and why it is ONE entry rather than five.
     *
     * The sum of the five cumulative pickup counters — multiball, expand, extra life, slow
     * and fireball. Summing rather than shipping five near-identical entries is deliberate:
     * five "collect N of kind X" achievements is the tiering D-09 rejected wearing a
     * different hat, five thresholds to justify instead of one, and five panel lines that
     * say the same thing. It also means a player who favours one power-up is not penalised
     * for never collecting another.
     *
     * The reasoning: 100 across five kinds is roughly 20 of each, which reads as "you have
     * used the power-up system", the thing the entry is actually about. **No published
     * anchor exists** — nothing records how often a pickup spawns per board or how many a
     * typical run collects, and `docs/ops/POWERUPS-B2.md` documents the effects rather than
     * a rate. So the divide-by-five is arithmetic and the 100 is not.
     *
     * A JUDGEMENT, not a measurement (D-11). Cumulative, so unfailable. Data only to
     * change (SC-1).
     */
    predicate: (s) =>
      counter(s.lifetime.pickupMultiball) +
        counter(s.lifetime.pickupExpand) +
        counter(s.lifetime.pickupExtraLife) +
        counter(s.lifetime.pickupSlow) +
        counter(s.lifetime.pickupFireball) >=
      100,
  },
  {
    id: 'flawless-clear',
    name: 'Flawless Clear',
    description: 'Win a campaign level having never lost a life on it',
    /**
     * Why "one win and zero lives lost", and why that is DELIBERATELY conservative.
     *
     * The first campaign-only entry (D-12 / SC-5): it reads `byMode.campaign` and nothing
     * else, so it is unreachable from endless or daily play. Skill-gated, and the archetype
     * D-10 names by example — "clear a level without losing a life".
     *
     * **The aggregate is per level ACROSS runs, so this is stronger than it looks and the
     * strength is chosen.** One campaign cell's `livesLost` — the cell for `level-03`, say —
     * is every life lost on that level in the player's whole history, not in the winning
     * run. (That sentence deliberately does not spell the map-index form; the rule that no
     * predicate names a `byMode` key literally is checked by reading the predicates, and a
     * text-level check cannot tell this paragraph from one. Plan 13-01 shipped exactly that
     * defect against a grep-level gate.) So the condition
     * means *you have won this level and have NEVER lost a life on it* — strictly stronger
     * than "cleared it once without losing a life". A player who fumbled `level-01` on
     * their first evening and later plays it perfectly will not get this on `level-01`;
     * they will get it on the next level they never fumble.
     *
     * That under-reports on purpose, and under-reporting is this tree's chosen direction
     * everywhere a policy reads an aggregate — the same direction `evaluate.ts` folds a
     * throwing predicate in and `streak.ts` folds a degenerate window in. A lifetime best
     * invented out of an aggregate is a worse failure than one that arrives late: the first
     * tells the player something untrue about themselves, the second tells them something
     * true on their next clean level. The exact alternative — a per-run "flawless" flag —
     * is not available from stored telemetry at all, and inventing one would mean a new
     * counter in the v4 blob for one achievement.
     *
     * The threshold is the PAIR (at least one win, exactly zero lives lost) rather than a
     * number, so there is nothing numeric to anchor and none is claimed. It is still a
     * JUDGEMENT: whether "never lost a life on this level" is the right bar for the word
     * flawless is exactly what plan 13-05 asks a human. Data only to change (SC-1).
     */
    predicate: (s) =>
      valuesOf(s.byMode.campaign).some(
        (c) => counter(c.runsWon) >= 1 && isGenuineZero(c.livesLost),
      ),
  },
  {
    id: 'campaign-25',
    name: '25 Clears',
    description: 'Win 25 campaign levels',
    /**
     * Why 25, as the cumulative companion to `flawless-clear`.
     *
     * `runsWon` summed over every `byMode.campaign` value — campaign-only (D-12) and
     * CUMULATIVE (D-10), so it cannot be failed. The pairing is the point: entry 7 rewards
     * precision on one level, this one rewards persistence across the campaign, and a
     * catalog with only one of the two says only half of what campaign play is.
     *
     * The reasoning: five levels are playable (`PLAYABLE_LEVEL_ORDER`), so 25 wins is on
     * the order of five clean passes of the whole campaign — or, much more likely, a great
     * many replays of the levels the player likes. Both readings are fine, which is why
     * summed wins is the right metric here rather than distinct levels cleared: replaying
     * one level twenty-five times IS persistence, and calling it not-persistence would need
     * a per-level rule this entry deliberately does not have.
     *
     * **No published anchor exists** for how many campaign wins a returning player
     * accumulates; there is no cohort. A JUDGEMENT, not a measurement (D-11). Data only to
     * change (SC-1).
     */
    predicate: (s) => sumOf(s.byMode.campaign, (c) => c.runsWon) >= 25,
  },
  {
    id: 'endless-wave-10',
    name: 'Wave 10',
    description: 'Reach wave 10 of endless mode',
    /**
     * Why 10 — **the one threshold in this catalog with a real published anchor.**
     *
     * `endless.bestWave` is the deepest wave ever reached, a depth record and not a count
     * of waves played (storage `EndlessRecord`). Endless-only (D-12) and skill-gated
     * (D-10).
     *
     * The anchor, and it is a relationship rather than a round number. `DAILY_DIFFICULTY`
     * is documented at `src/services/daily/dateKey.ts` as fixed at 10, justified there
     * against the generator's published table (`docs/ops/BOARD-GENERATOR.md`): `d = 10` is
     * 12 rows, 72 bricks, 116 authored HP, 3 explosives and 3 steel pairs per half, sitting
     * between `level-01`'s 32 bricks at `d = 0` and `level-03`'s 94-brick showpiece at
     * `d ~ 13`, with a per-difficulty median clear time near two minutes. The endless ramp
     * is `difficultyForWave(wave) = wave - 1` clamped (`src/services/endless/ramp.ts`), so
     * **wave 10 is difficulty 9 and wave 11 is exactly the daily board's difficulty**.
     * Reaching wave 10 therefore means having survived the ramp right up to the difficulty
     * every daily board is fixed at — a point on the scale the player already knows from
     * the daily challenge, rather than a number chosen for its shape. Those are the two
     * anchors it sits between: one step below the daily board's own difficulty, and well
     * above the tutorial level's.
     *
     * It is STILL a JUDGEMENT, and the judgement is a different one from the others: the
     * relationship is real, but whether that depth is worth an achievement — and whether a
     * player who cannot yet clear a daily board should be handed one — is not something the
     * table can answer. Plan 13-05 asks a human. Data only to change (SC-1).
     */
    predicate: (s) => counter(s.endless.bestWave) >= 10,
  },
  {
    id: 'endless-runs-20',
    name: '20 Endless',
    description: 'Finish 20 endless runs',
    /**
     * Why 20, with no anchor to offer.
     *
     * `runsPlayed` summed over every `byMode.endless` value — endless-only (D-12) and
     * CUMULATIVE (D-10). An endless run almost always ends in a loss by construction, which
     * is exactly why this entry counts runs PLAYED rather than won: an endless achievement
     * gated on winning would be gated on something the mode does not have.
     *
     * The reasoning: 20 is deliberately less than entry 5's 50 lifetime runs, because
     * endless is one mode of three and a player who splits their time across all three
     * should still be able to reach a mode-specific entry. It is the ratio that carries the
     * argument, not the number.
     *
     * **No published anchor exists** — nothing records how a player divides time between
     * modes, because no human has played this game. A JUDGEMENT, not a measurement (D-11).
     * Data only to change (SC-1).
     */
    predicate: (s) => sumOf(s.byMode.endless, (c) => c.runsPlayed) >= 20,
  },
  {
    id: 'daily-perfect',
    name: 'Perfect Daily',
    description: 'Win a daily challenge having never lost a life on one',
    /**
     * Why "one win and zero lives lost", and why this is HARDER than entry 7 rather than
     * the same claim in a different mode.
     *
     * Daily-only (D-12) and skill-gated (D-10), symmetric with `flawless-clear` in shape
     * and conservative for the same reason: the aggregate is across runs, so the condition
     * reads *you have won a daily and have never lost a life on one*.
     *
     * **The daily-specific fact that makes the two NOT equivalent, stated because a reader
     * will otherwise assume they are.** `byMode.daily` is keyed by a SINGLE constant
     * (`DAILY_TELEMETRY_KEY`, phase 12 D-15 — a per-date key would create a map nothing
     * ever trims). So unlike campaign, which has one aggregate per level and therefore
     * five chances at a clean one, daily has exactly ONE aggregate spanning every date the
     * player has ever played. One lost life on any daily, ever, closes this permanently.
     * That makes it the hardest entry in the catalog, and it is the one most likely to come
     * back from plan 13-05's human review as too harsh.
     *
     * Deliberately not "fixed" by keying the daily map per date: that is phase 12's D-15
     * decision, it exists because `sanitizeAggregateMap` copies every key it finds with no
     * bound (WINDOWS #27), and re-opening it for one achievement would trade an unbounded
     * stored map for a friendlier threshold.
     *
     * The threshold is a pair rather than a number, so no numeric anchor exists or is
     * claimed. A JUDGEMENT (D-11), data only to change (SC-1).
     */
    predicate: (s) =>
      valuesOf(s.byMode.daily).some(
        (c) => counter(c.runsWon) >= 1 && isGenuineZero(c.livesLost),
      ),
  },
  {
    id: 'daily-streak-7',
    name: '7 Day Streak',
    description: 'Play the daily challenge seven days in a row',
    /**
     * Why 7 — and **this is the entry where D-16 binds, so it says so at the read site.**
     *
     * `daily.longestStreak` is read **AS STORED** and is never recomputed here. That
     * inherits T-12-06's ACCEPTED tamper model verbatim (D-16): the value is hand-writable
     * on a rooted device, and both `11-SECURITY.md` and `12-SECURITY.md` close local record
     * tampering as an accepted risk rather than a defect, because there is no server, no
     * leaderboard and no asset being protected. Under D-17 the resulting unlock is
     * permanent. That is a recorded decision; it is registered as T-13-04 so a later round
     * finds a decision rather than a defect.
     *
     * **The rejected alternative, named in the same breath because it looks like the safer
     * choice and is not.** Deriving the streak from the stored date history instead would
     * make a streak longer than the 400-entry window (`DAILY_HISTORY_BOUND`) read as the
     * window length — precisely the failure phase 12 re-opened D-16 mid-phase to eliminate,
     * reappearing on a new surface. A player's real 500-day streak would silently become
     * 400. Choosing the tamperable field over the truncating derivation is the trade D-16
     * already made, and this entry does not re-litigate it.
     *
     * Why seven: seven days is a week, the unit a daily habit is actually measured in, and
     * the smallest streak that cannot be produced by a single enthusiastic weekend. **No
     * anchor exists for whether a week is the right week** — there is no retention data and
     * no cohort. A JUDGEMENT, not a measurement (D-11). Skill-gated in D-10's sense: it can
     * be broken, unlike every cumulative entry above. Data only to change (SC-1).
     */
    predicate: (s) => counter(s.daily.longestStreak) >= 7,
  },
];

/*
 * Deliberately NOT declared: `type AchievementId = 'bricks-1000' | …`, a union of string
 * literals over the catalog's ids.
 *
 * It is the obvious-looking alternative, so the reason it is refused belongs here rather
 * than in a review comment. A literal union would put a value-level dependency on THIS
 * module into `src/services/storage/types.ts` (D-19's `RecordRunEndResult`) and into every
 * test fixture that names an id — and a value import of storage from here combined with a
 * value import of here from `parseBlob.ts` or the stores would be a module cycle. More to
 * the point, it answers the wrong question: what D-15 needs is a RUNTIME membership check
 * against a hostile blob, and a compile-time union cannot perform one. The id type stays
 * `string` and `isKnownAchievementId` is the gate.
 */

/**
 * Every id the catalog mints, DERIVED at module load — never a hand-written list.
 *
 * `tests/ui/certLevelPlan.test.ts`'s argument, applied to the read path: a hand-written
 * list would go on ACCEPTING an id the catalog had dropped and go on REJECTING one it had
 * gained, and nothing would say so. Deriving it meant plan 13-02's expansion from one
 * entry to twelve moved this set with it, for free, and a thirteenth will move it again.
 */
const KNOWN_IDS: ReadonlySet<string> = new Set(
  ACHIEVEMENT_CATALOG.map((a) => a.id),
);

/**
 * Whether `raw` is an id this catalog mints (D-15).
 *
 * A TOTAL type predicate over `unknown`, living beside the catalog that mints the ids —
 * exactly as `isValidDateKey` lives beside `localDateKey` in `src/services/daily/dateKey.ts`,
 * and imported across the module boundary by `parseBlob.ts` in plan 13-03 for the same
 * reason: the parser must not restate a closed set that belongs to another module.
 *
 * An unknown id is DROPPED, never coerced and never `safeCounter`-ed — an id is not a
 * counter, and there is no "nearest valid id". That drop is also what CAPS the stored
 * collection: the natural bound on a legitimate unlock set is the catalog's own size.
 * `ACHIEVEMENT_UNLOCK_BOUND` is the fence that survives a future relaxation of this check;
 * the pattern map's rule is that the collection must have one or the other and must not
 * have neither.
 */
export function isKnownAchievementId(raw: unknown): raw is string {
  return typeof raw === 'string' && KNOWN_IDS.has(raw);
}
