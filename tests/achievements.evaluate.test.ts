/**
 * @vitest-environment node
 *
 * 13-02 Task 2 — the evaluator: determinism, idempotency, D-04's retroactive flood and
 * totality over a hostile snapshot (N-ACH-02 / SC-2 / D-02 / D-03 / D-04 / D-17).
 *
 * WHAT THIS GUARDS. SC-2 has TWO halves with two different mechanisms, and each owes its
 * own case. `qualifyingAchievements` owns DETERMINISM — it is a pure function of its
 * arguments, so the same snapshot yields the same set by construction.
 * `newlyUnlockedAchievements` owns IDEMPOTENCY — D-02's set difference, so an id already
 * in the stored set announces nothing. They are two functions for exactly that reason and
 * a case that exercised only one of them would leave half of SC-2 unasserted.
 *
 * ANALOG: `tests/endless.ramp.test.ts:1-37`. Copied structure — the criterion first, the
 * analog named, the borrowed idiom named with a reference, the no-literal-dials rule, and
 * a closing "Deliberately NOT covered here" paragraph so this file's silence is not read
 * as coverage. Constants sit at the top, each with the reason it exists
 * (`tests/endless.ramp.test.ts:30-37`).
 *
 * BORROWED IDIOMS. The `expect(value, 'why')` second argument throughout, and in every
 * absence case the message is where the reason the case is not vacuous is recorded. The
 * degenerate-input loop is `tests/daily.streak.test.ts:290-309`, which exists because
 * `src/services/daily/streak.ts` promises the degenerate case fails safe and is asserted
 * that way rather than assumed — the same promise `src/services/achievements/evaluate.ts`
 * makes in its "Why totality lives in this body" paragraph.
 *
 * THE SNAPSHOT FIXTURE IS HAND-BUILT AND IS NOT DERIVED FROM `defaultTelemetryBlob()`.
 * `tests/storage.progress-v4.test.ts` gives the reason about its own fixture: a fixture
 * computed with the very helper the subject consumes lets a broken pair agree by computing
 * the same wrong answer twice. It is also a storage import, which D-20 keeps out of this
 * policy's tests as well as out of its source — the point of the structurally-compatible
 * view is that a catalog test needs no storage harness at all.
 *
 * **No assertion in this file pins a literal threshold constant, and the rule is
 * load-bearing here rather than stylistic.** D-11 makes every threshold in the catalog a
 * JUDGEMENT — no human has played this game — and plan 13-05 routes the whole set to human
 * review. A case asserting that the combo threshold is 25 would red the moment that review
 * legitimately re-tunes it, which would make the review expensive and therefore make it not
 * happen. Every snapshot below is built by pushing one region far past whatever it asks for
 * (`FAR_PAST_ANY_THRESHOLD`), so this file never learns what any threshold is.
 *
 * Deliberately NOT covered here:
 * - The catalog's own shape — entry data, unique ids, the 16-character name budget, the
 *   source-level purity scan and D-12's three-mode coverage. Those are
 *   `tests/achievements.catalog.test.ts` (this plan, Task 1).
 * - Whether a threshold is the RIGHT number. It is a judgement (D-11); plan 13-05 routes
 *   it to a human and `13-UAT.md` is where the answer lands.
 * - The STORE. Where the evaluation runs, what it persists, the timestamps and the widened
 *   return are `tests/achievements.record.test.ts` (plan 13-01), and the read-path
 *   sanitizer is plan 13-03's. Nothing here touches storage.
 * - The PANEL. `tests/ui/ResultOverlay.achievements.test.tsx` owns the markup; nothing here
 *   renders.
 *
 * Plain vitest, node environment, no jsdom and no mocks — the subject is pure.
 */
import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_CATALOG,
  newlyUnlockedAchievements,
  qualifyingAchievements,
  type Achievement,
  type AchievementCounters,
  type AchievementSnapshot,
} from '../src/services/achievements';

/**
 * Far past any threshold D-09's catalog could reasonably set — the `FAR_WAVE = 10000`
 * idiom (`tests/endless.ramp.test.ts:33`), and the reason this file pins no dial: a value
 * this large crosses whatever an entry asks for without this file knowing what it asks
 * for.
 */
const FAR_PAST_ANY_THRESHOLD = 1_000_000;

/**
 * The floor the retroactive case asserts against, and it comes from the UI rather than
 * from the catalog.
 *
 * `13-UI-SPEC.md`'s unlock block renders one name plus `and n-1 more` at three or more
 * unlocks, so three is the smallest flood that exercises the case the ORDERING claim below
 * matters for. Deliberately not "twelve": the count is the catalog's business and D-09
 * allows it to move, while three is a property of the panel.
 */
const RETROACTIVE_MIN_IDS = 3;

/**
 * A stored unlock set long enough to be worth folding badly — the hostile-input case feeds
 * this many entries, none of them strings.
 *
 * It is `ACHIEVEMENT_UNLOCK_BOUND`-shaped rather than equal to it on purpose: that bound
 * belongs to `src/services/storage/types.ts`, D-20 forbids importing it here, and a
 * hand-copied constant would be the same number written in two places.
 */
const HOSTILE_UNLOCKED_LENGTH = 50;

/**
 * An all-zero counter block — the base every snapshot below overrides. Hand-built; see the
 * fixture paragraph in the header for why it is not derived.
 */
function zeroCounters(): AchievementCounters {
  return {
    runsPlayed: 0,
    runsWon: 0,
    livesLost: 0,
    bricksBroken: 0,
    bestComboEver: 0,
    longestRallyEver: 0,
    largestCascadeEver: 0,
    pickupMultiball: 0,
    pickupExpand: 0,
    pickupExtraLife: 0,
    pickupSlow: 0,
    pickupFireball: 0,
  };
}

/**
 * Every counter far past any threshold, except `livesLost` — which the skill-gated entries
 * require to be exactly zero, and which is therefore the one counter a "maximum" fixture
 * must leave alone.
 */
function farCounters(): AchievementCounters {
  return {
    ...zeroCounters(),
    runsPlayed: FAR_PAST_ANY_THRESHOLD,
    runsWon: FAR_PAST_ANY_THRESHOLD,
    bricksBroken: FAR_PAST_ANY_THRESHOLD,
    bestComboEver: FAR_PAST_ANY_THRESHOLD,
    longestRallyEver: FAR_PAST_ANY_THRESHOLD,
    largestCascadeEver: FAR_PAST_ANY_THRESHOLD,
    pickupMultiball: FAR_PAST_ANY_THRESHOLD,
    pickupExpand: FAR_PAST_ANY_THRESHOLD,
    pickupExtraLife: FAR_PAST_ANY_THRESHOLD,
    pickupSlow: FAR_PAST_ANY_THRESHOLD,
    pickupFireball: FAR_PAST_ANY_THRESHOLD,
  };
}

/** A snapshot in which nothing has happened. */
function zeroSnapshot(): AchievementSnapshot {
  return {
    lifetime: zeroCounters(),
    byMode: { campaign: {}, endless: {}, daily: {} },
    endless: { bestWave: 0, bestScore: 0 },
    daily: { longestStreak: 0, totalDaysPlayed: 0 },
  };
}

/**
 * The "years of play across all three modes" snapshot — D-04's retroactive case, and the
 * clean reading every hostile variant below is compared against.
 *
 * Built fresh on each call rather than shared, so no case can mutate another's input. The
 * map keys are arbitrary strings: the catalog reads these maps by their VALUES (D-20), so
 * what they are keyed by is not something this file gets to assert or needs to know.
 */
function veteranSnapshot(): AchievementSnapshot {
  return {
    lifetime: farCounters(),
    byMode: {
      campaign: { 'a-level': farCounters(), 'another-level': farCounters() },
      endless: { 'the-endless-key': farCounters() },
      daily: { 'the-daily-key': farCounters() },
    },
    endless: {
      bestWave: FAR_PAST_ANY_THRESHOLD,
      bestScore: FAR_PAST_ANY_THRESHOLD,
    },
    daily: {
      longestStreak: FAR_PAST_ANY_THRESHOLD,
      totalDaysPlayed: FAR_PAST_ANY_THRESHOLD,
    },
  };
}

/** The catalog index of each returned id — the instrument for the declaration-order claim. */
function catalogIndices(ids: readonly string[]): readonly number[] {
  return ids.map((id) => ACHIEVEMENT_CATALOG.findIndex((a) => a.id === id));
}

describe('qualifyingAchievements (SC-2 determinism, 13-02)', () => {
  it('same snapshot twice — the same set, in the same order, and by VALUE not by identity', () => {
    const s = veteranSnapshot();

    const first = qualifyingAchievements(s);
    const second = qualifyingAchievements(s);

    expect(
      first.length,
      'a snapshot carrying years of play in every mode must qualify for SOMETHING, or the equality below holds because both calls returned nothing',
    ).toBeGreaterThan(0);
    expect(
      second,
      'SC-2: evaluating the same snapshot twice yields the same set — INCLUDING order, because catalog declaration order is the panel display order (13-UI-SPEC § Ordering is contract) and a set that re-ordered would change which achievement the player reads',
    ).toEqual(first);

    // A structurally identical but DISTINCT object, built by the same helper rather than
    // spread from `s`: the claim is about the snapshot's VALUE, not about object identity,
    // and a `===` cache keyed on the argument would pass the two calls above.
    const twin = veteranSnapshot();
    expect(
      twin === s,
      'the twin must be a different object, or this assertion repeats the one above',
    ).toBe(false);
    expect(
      qualifyingAchievements(twin),
      'SC-2 is a claim about the snapshot value: a structurally identical snapshot must yield an identical set, so no memoisation on object identity can satisfy it',
    ).toEqual(first);
  });
});

describe('newlyUnlockedAchievements (SC-2 idempotency as a set difference, 13-02)', () => {
  it('does not re-fire — an already-unlocked id yields an empty delta, and the empty set yields everything', () => {
    const s = veteranSnapshot();
    const qualifying = qualifyingAchievements(s);

    // THE POSITIVE CONTROL, and it lives in this case on purpose: "nothing re-fired" is
    // trivially true of an evaluator that never fires at all, which is exactly the trap
    // `13-VALIDATION.md`'s non-vacuity rule was written for.
    expect(
      newlyUnlockedAchievements(s, []),
      'against an EMPTY stored set the delta is everything that qualifies — this is what makes the absence assertion below a statement about idempotency rather than about a dropped evaluation',
    ).toEqual(qualifying);
    expect(
      qualifying.length,
      'and that delta must be non-empty, or both halves of this case are vacuous',
    ).toBeGreaterThan(0);

    expect(
      newlyUnlockedAchievements(s, qualifying),
      'D-02: idempotency is a SET DIFFERENCE, not a per-achievement "already fired" flag a future write path could forget to set. Every qualifying id is already stored, so the difference is empty by construction',
    ).toEqual([]);

    // Sharper than "empty vs everything": hold all but the first and exactly the first
    // comes back. No id is named — it is read out of the catalog's own ordering.
    const allButFirst = qualifying.slice(1);
    expect(
      newlyUnlockedAchievements(s, allButFirst),
      'the difference is exact, not approximate: dropping one id from the stored set brings back exactly that id, in catalog order',
    ).toEqual(qualifying.slice(0, 1));
  });

  it('retroactive — a player with years of telemetry and an empty unlocked set unlocks many at once, in catalog declaration order (D-04)', () => {
    const s = veteranSnapshot();

    const delta = newlyUnlockedAchievements(s, []);

    expect(
      delta.length,
      'D-04: a player who already has telemetry unlocks RETROACTIVELY and is told — a delta of one would mean the evaluation only looked at the run that just ended',
    ).toBeGreaterThanOrEqual(RETROACTIVE_MIN_IDS);

    const indices = catalogIndices(delta);
    expect(
      indices.includes(-1),
      'every returned id must be a catalog id — an id from nowhere would mean the evaluator invented one',
    ).toBe(false);
    for (let i = 1; i < indices.length; i++) {
      expect(
        indices[i]!,
        // This ordering claim is what the UI-SPEC's `n >= 3` case rests on: under D-04
        // every unlock in a flood carries the SAME timestamp, so a recency sort would make
        // the NAMED achievement vary between two runs of one snapshot — SC-2 broken at the
        // only surface the player actually sees.
        `catalog declaration order must survive the set difference: entry at position ${i} of the delta came back before the one at ${i - 1}, so the panel would name a different achievement depending on nothing`,
      ).toBeGreaterThan(indices[i - 1]!);
    }
  });
});

describe('totality (13-02)', () => {
  it('hostile snapshot — degenerate input yields FEWER ids and never throws', () => {
    const clean = qualifyingAchievements(veteranSnapshot());
    expect(
      clean.length,
      'the clean reading must qualify for something, or "the hostile reading is no larger" is satisfied by two empty arrays',
    ).toBeGreaterThan(0);

    const nanCounters = {
      ...farCounters(),
      bricksBroken: Number.NaN,
      bestComboEver: Number.POSITIVE_INFINITY,
      longestRallyEver: Number.NEGATIVE_INFINITY,
      largestCascadeEver: -1,
      runsPlayed: -FAR_PAST_ANY_THRESHOLD,
      livesLost: Number.NaN,
    };

    /**
     * Each entry is a snapshot the read path can actually deliver. `parseBlob.ts` starts
     * from a default and copies field by field, but `sanitizeAggregateMap` copies every key
     * it finds with no bound (WINDOWS #27) and `safeCounter` bounds a counter DOWNWARD only
     * — the phase-11 audit measured `Number.MAX_VALUE` surviving intact — so non-finite
     * numbers and non-object cells reach a predicate for real.
     */
    const hostileSnapshots: readonly { readonly what: string; readonly s: AchievementSnapshot }[] = [
      { what: 'byMode missing entirely', s: { ...veteranSnapshot(), byMode: undefined } as unknown as AchievementSnapshot },
      { what: 'byMode present but its three maps absent', s: { ...veteranSnapshot(), byMode: {} } as unknown as AchievementSnapshot },
      { what: 'lifetime absent', s: { ...veteranSnapshot(), lifetime: undefined } as unknown as AchievementSnapshot },
      { what: 'endless and daily records absent', s: { ...veteranSnapshot(), endless: undefined, daily: undefined } as unknown as AchievementSnapshot },
      { what: 'NaN, Infinity and negative counters throughout', s: { ...veteranSnapshot(), lifetime: nanCounters, endless: { bestWave: Number.NaN, bestScore: Number.NaN }, daily: { longestStreak: Number.POSITIVE_INFINITY, totalDaysPlayed: -1 } } as unknown as AchievementSnapshot },
      { what: 'byMode.campaign values are null', s: { ...veteranSnapshot(), byMode: { campaign: { 'a-level': null, 'another-level': null }, endless: {}, daily: {} } } as unknown as AchievementSnapshot },
      { what: 'byMode.campaign values are primitives', s: { ...veteranSnapshot(), byMode: { campaign: { a: 7, b: 'not a counter' }, endless: {}, daily: {} } } as unknown as AchievementSnapshot },
      { what: 'byMode maps are not objects', s: { ...veteranSnapshot(), byMode: { campaign: 'nope', endless: 3, daily: null } } as unknown as AchievementSnapshot },
      { what: 'the whole snapshot is null', s: null as unknown as AchievementSnapshot },
    ];

    // NON-VACUITY for the loop below: `<=` is satisfied by a corruption that changes
    // nothing, so at least one variant must actually COST something. Recorded as a
    // property of the set rather than pinned to one variant, so re-ordering or adding a
    // variant cannot quietly make the loop toothless.
    const strictlyFewer = hostileSnapshots.filter(
      ({ s }) => qualifyingAchievements(s).length < clean.length,
    );
    expect(
      strictlyFewer.length,
      'at least one hostile variant must qualify for STRICTLY fewer achievements than the clean reading, or every assertion in the loop below is satisfied by corruption that costs nothing and the under-reporting claim is untested',
    ).toBeGreaterThan(0);

    for (const { what, s } of hostileSnapshots) {
      expect(
        () => qualifyingAchievements(s),
        // The DIRECTION is chosen, not incidental. `13-UI-SPEC.md` § Error state requires a
        // thrown evaluator to yield an ABSENT unlock block — and this code runs on the
        // run-end write, so a policy that threw would cost the player the score they just
        // earned rather than a line of copy (T-13-06).
        `a tampered blob must not escape as a throw (${what}): this runs inside recordRunEnd, so a throw costs the player their result and not merely the unlock line`,
      ).not.toThrow();

      const got = qualifyingAchievements(s);
      expect(
        got.length,
        `degenerate input must UNDER-report (${what}): a non-finite counter reading as a qualification would invent an achievement out of corruption, which is the one direction this tree refuses`,
      ).toBeLessThanOrEqual(clean.length);
      expect(
        got.filter((id) => !clean.includes(id)),
        `and it must not invent an id the clean reading does not have (${what})`,
      ).toEqual([]);
    }

    /**
     * The `unlocked` ARGUMENT is the one place the degradation direction inverts, and
     * `evaluate.ts` says so at that parameter: a non-array degrades to an empty set, which
     * UNDER-reports what the player holds and therefore OVER-reports the delta. That
     * failure is a cosmetic repeat of an unlock they already had; the inverse — swallowing
     * a real delta — is the achievement they earned and never heard about, which the phase
     * goal's verb ("tells them") forbids. So these cases assert no-throw and
     * no-larger-than-the-clean-QUALIFYING-set, which is the correct instrument for them.
     */
    const hostileUnlocked: readonly { readonly what: string; readonly unlocked: readonly string[] }[] = [
      // No real catalog id appears in any of these: what is under test is the SHAPE the
      // fold receives, and naming an id here would be the hand-written-list defect wearing
      // a fixture's clothes — it would go on passing while the id it names left the
      // catalog entirely.
      { what: 'unlocked is not an array', unlocked: 'a-string-not-an-array' as unknown as readonly string[] },
      { what: 'unlocked is null', unlocked: null as unknown as readonly string[] },
      { what: 'unlocked is an object', unlocked: { 0: 'looks-indexable' } as unknown as readonly string[] },
      {
        what: `unlocked is ${HOSTILE_UNLOCKED_LENGTH} non-strings`,
        unlocked: Array.from({ length: HOSTILE_UNLOCKED_LENGTH }, (_, i) => i) as unknown as readonly string[],
      },
    ];

    for (const { what, unlocked } of hostileUnlocked) {
      const s = veteranSnapshot();
      expect(
        () => newlyUnlockedAchievements(s, unlocked),
        `a tampered unlocked set must not escape as a throw either (${what})`,
      ).not.toThrow();
      const got = newlyUnlockedAchievements(s, unlocked);
      expect(
        got.length,
        `the delta can never exceed what the snapshot qualifies for (${what}) — that is the bound a corrupt stored set must not be able to break`,
      ).toBeLessThanOrEqual(clean.length);
      expect(
        got.filter((id) => !clean.includes(id)),
        `and it must contain no id the snapshot does not qualify for (${what})`,
      ).toEqual([]);
    }

    // The paired positive control for the whole case: with a WELL-FORMED unlocked set the
    // fold still works, so "nothing escaped" above is not true because everything was
    // dropped.
    expect(
      newlyUnlockedAchievements(veteranSnapshot(), []),
      'and the well-formed reading still returns the full set — the guards fold garbage, they do not disable the function',
    ).toEqual(clean);
  });

  it('throwing predicate — it costs its own achievement and nothing else', () => {
    /**
     * A LOCAL catalog handed through `qualifyingAchievements`'s trailing parameter.
     *
     * **This case is the only reason that parameter exists.** D-03 defines the evaluator as
     * a pure function of (catalog, snapshot, unlocked set), so the catalog is an ARGUMENT
     * and the default keeps both production call sites free of one they would only ever
     * pass the same value for. The parameter is what lets this case hand the evaluator a
     * throwing predicate with no module mock at all — and a test that needed `vi.mock` to
     * state this property would be asserting something about the mock.
     */
    const local: readonly Achievement[] = [
      {
        id: 'probe-throws',
        name: 'Throws',
        description: 'A predicate that escapes',
        predicate: () => {
          throw new Error('a tampered blob made a predicate escape');
        },
      },
      {
        id: 'probe-qualifies',
        name: 'Qualifies',
        description: 'A predicate that holds',
        predicate: () => true,
      },
      {
        id: 'probe-not-a-function',
        name: 'Malformed',
        description: 'An entry whose predicate is not callable',
        predicate: undefined as unknown as (s: AchievementSnapshot) => boolean,
      },
      {
        id: 'probe-returns-a-number',
        name: 'Truthy',
        description: 'A predicate returning a count rather than a boolean',
        predicate: (() => 7) as unknown as (s: AchievementSnapshot) => boolean,
      },
    ];

    const s = zeroSnapshot();
    expect(
      () => qualifyingAchievements(s, local),
      'a throwing predicate must be contained: the entry is skipped, the run is not',
    ).not.toThrow();
    expect(
      qualifyingAchievements(s, local),
      'the sibling entry still qualifies — a throw costs its own achievement and nothing else (the under-reporting direction). `probe-returns-a-number` is absent because the check is `=== true` and not a truthiness test, so a predicate accidentally returning a count cannot unlock on everything-but-zero',
    ).toEqual(['probe-qualifies']);

    // The parameter is an argument, not a mutation: the default is untouched by the call
    // above, so no later call in this process inherits a probe catalog.
    expect(
      qualifyingAchievements(veteranSnapshot()).filter((id) => id.startsWith('probe-')),
      'passing a local catalog must not replace the default — a sticky catalog would leak between the store call sites',
    ).toEqual([]);
  });
});
