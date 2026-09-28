/**
 * The achievement catalog (N-ACH-01 / SC-1 / D-03 / D-09 / D-11 / D-20).
 *
 * Achievements are DATA: an id, a display name, a description, and a pure predicate over
 * a read-only telemetry view. Nothing in this file reads a clock, a store or a random
 * number, and nothing in it renders. Its guards are `tests/achievements.record.test.ts`
 * (this plan) and `tests/achievements.catalog.test.ts` (plan 13-02).
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
 * the array below and needs no edit anywhere else. `ACHIEVEMENT_CATALOG` reaches D-09's
 * 8-12 entries in plan 13-02; the single entry here is not a placeholder and ships
 * unchanged.
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
 * NOT happen is a throw, and `evaluate.ts` is where that is folded.
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
 * way and is therefore no evidence the block exists.
 *
 * SECURITY: nothing here protects anything. An unlock guards no asset and can be granted
 * by hand on a rooted device (T-13-03 / T-13-04, inheriting AR-11-02 and AR-12-02).
 */

/**
 * The counters a predicate may read, as a read-only view of `TelemetryAggregate`.
 *
 * Deliberately the SUBSET the shipped predicates actually read, not all sixteen: the
 * sixteen names belong to `src/services/storage/types.ts` and restating them here would be
 * a second schema to keep in step. Plan 13-02 widens this view as its entries land, one
 * field per field a predicate needs.
 */
export type AchievementCounters = {
  /** Bricks destroyed. Cumulative — it sums across runs and never falls. */
  readonly bricksBroken: number;
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
    readonly history: readonly {
      readonly date: string;
      readonly outcome: 'win' | 'lose';
    }[];
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
 * catalog is `explicit` evidence that needs no layout and is plan 13-02's
 * `tests/achievements.catalog.test.ts -t "name within 16 chars"`; this plan's single entry
 * is 11 characters. The horizontal claim itself — that a 16-character name renders on one
 * line on a real 320px panel — is a DEVICE backstop (WINDOWS #16, extended by this phase)
 * and no jsdom render is evidence for it. `numberOfLines={1}` on the unlock lines is the
 * weaker backstop, not the gate.
 */
export const ACHIEVEMENT_NAME_MAX = 16 as const;

/**
 * The shipped catalog, in display order (SC-1 / D-09 / D-12).
 *
 * **One entry in plan 13-01, by design.** This is the tracer's single path: catalog entry
 * to pure predicate to store evaluation to persisted union to display name to panel line.
 * Plan 13-02 takes the catalog to D-09's 8-12 entries across all three modes, and this
 * entry is unchanged by it — it is a real shipping achievement, not a placeholder.
 */
export const ACHIEVEMENT_CATALOG: readonly Achievement[] = [
  {
    id: 'bricks-1000',
    name: '1000 Bricks',
    description: 'Break 1,000 bricks across every mode',
    /**
     * Why 1,000, and why this is the entry the tracer proves the phase on.
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
     * SC-5 and not its point, which is why plan 13-02's entries reach the mode-specific
     * records.
     *
     * The number is a JUDGEMENT, not a measurement, and says so (D-11). No human has played
     * this game — both `11-UAT.md` and `12-UAT.md` record that as still true — so there is
     * no distribution to derive a threshold from. The reasoning available is the shipped
     * board sizes: `level-01` is 32 bricks and `level-03` is 94, so 1,000 is on the order
     * of 15-30 cleared boards. Far enough out that it is not handed over on the first
     * session, close enough that a player who keeps coming back reaches it without being
     * told to grind. It is routed to human verification in plan 13-05 rather than presented
     * as calibrated.
     */
    predicate: (s) => s.lifetime.bricksBroken >= 1000,
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
 * gained, and nothing would say so. Deriving it means plan 13-02's catalog expansion moves
 * this set with it, for free.
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
