/**
 * @vitest-environment node
 *
 * 13-02 Task 1 — the catalog is DATA, and every claim about it is quantified over the
 * shipped export (N-ACH-01 / N-ACH-03 / D-09 / D-10 / D-11 / D-12 / D-20).
 *
 * WHAT THIS GUARDS. `ACHIEVEMENT_CATALOG` is the only place an achievement id, display
 * name or threshold is minted. Five things downstream read it — the evaluator, both
 * stores' run-end write, the read path's id predicate, and the panel's id-to-name
 * mapping — so a malformed entry is malformed in five places at once. N-ACH-01's
 * "declared as data, with a pure predicate over a telemetry snapshot" is a property of
 * this array, and this file is where it becomes an assertion rather than a sentence in a
 * document.
 *
 * WHY THE DOMAIN IS DERIVED AND NOT LISTED. Copied from
 * `tests/ui/certLevelPlan.test.ts:13-18`, subject changed. The set of achievements
 * belongs to `src/services/achievements/catalog.ts`, not here. A hand-written list of ids
 * or names would go on passing while a thirteenth achievement escaped the table entirely
 * — and this phase's whole reason for existing is that the catalog GROWS. Every case
 * below quantifies over the exported array at runtime, so a catalog change reds this file
 * instead of silently shrinking its coverage.
 *
 * WHAT IDIOMS ARE BORROWED. `new Set(...).size` for the uniqueness claims
 * (`tests/endless.ramp.test.ts:12`, borrowed there from
 * `tests/levelgen.determinism.test.ts:52`). The `walk` + forbidden-regex source scan for
 * `no clock no storage` (`tests/core.purity.test.ts:1-45`, the only source-level purity
 * idiom in this repo). The `expect(value, 'why')` second argument everywhere, and in each
 * absence case the message is where the reason the case is not vacuous is recorded.
 *
 * **No assertion in this file pins a literal threshold constant, and that rule is
 * load-bearing here rather than stylistic.** D-11 makes every threshold in this catalog a
 * JUDGEMENT — no human has played this game, so there is no distribution to derive one
 * from — and plan 13-05 routes the whole set to human review. A case asserting that the
 * combo threshold is 25 would red the moment that review legitimately re-tunes it, which
 * would make the review expensive and therefore make it not happen. This file asserts
 * SHAPE and DERIVED properties only: entries are data, ids are unique, names fit the
 * exported budget, the three modes are each reachable, nothing fires at zero, and the
 * size sits inside D-09's range. `ACHIEVEMENT_NAME_MAX` is read from the module, never
 * written as a number here.
 *
 * Deliberately NOT covered here:
 * - Whether a threshold is the RIGHT number. It is a judgement (D-11) and no assertion
 *   can settle it; plan 13-05 routes it to a human, and `13-UAT.md` is where the answer
 *   lands.
 * - The evaluator's determinism, idempotency, retroactive flood and hostile-input
 *   totality. Those are `tests/achievements.evaluate.test.ts` (this plan, Task 2) — this
 *   file calls `qualifyingAchievements` only as the instrument for D-12's behavioural
 *   mode-coverage claim.
 * - The store write, the persisted shape and the widened return —
 *   `tests/achievements.record.test.ts` (plan 13-01).
 * - That a 16-character name renders on ONE line on a real 320px panel. That is a layout
 *   property, jsdom performs no layout, and it is a DEVICE backstop (WINDOWS #16)
 *   discharged by plan 13-05. The length assertion below is the `explicit` half of that
 *   pair and is not evidence for the other half.
 *
 * Plain vitest, node environment, no jsdom and no mocks — the subject is pure.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_NAME_MAX,
  qualifyingAchievements,
  type AchievementCounters,
  type AchievementSnapshot,
} from '../src/services/achievements';

/**
 * D-09's declared range, restated as the two bounds of a RANGE rather than an equality.
 *
 * An equality on today's twelve would red on a re-order-free, behaviour-free thirteenth
 * entry, which D-09 explicitly allows later ("a 20th achievement later needs no code
 * edit"). The bounds are the decision; the current count is not.
 */
const D09_MIN_ENTRIES = 8;
const D09_MAX_ENTRIES = 12;

/**
 * Far past any threshold D-09's catalog could reasonably set — the `FAR_WAVE = 10000`
 * idiom (`tests/endless.ramp.test.ts:33`), which exists precisely so no assertion here
 * pins a dial that is legitimately re-tunable (D-11).
 *
 * It is used to populate ONE mode's region at a time in the `three modes` case: a value
 * this large crosses whatever that mode's entries ask for without this file knowing what
 * they ask for.
 */
const FAR_PAST_ANY_THRESHOLD = 1_000_000;

/**
 * An all-zero counter block, hand-built and deliberately NOT derived from
 * `defaultTelemetryAggregate()`.
 *
 * Deriving the fixture from the same storage helper the subject consumes would let a
 * broken pair agree by computing the same wrong answer twice — the reason
 * `tests/storage.progress-v4.test.ts` gives about its own date fixture. It is also a
 * storage import, which D-20 keeps out of this policy's test as well as out of its
 * source.
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

/** Every counter at `FAR_PAST_ANY_THRESHOLD`, except `livesLost`, which the skill-gated entries require to be zero. */
function farCounters(): AchievementCounters {
  return {
    runsPlayed: FAR_PAST_ANY_THRESHOLD,
    runsWon: FAR_PAST_ANY_THRESHOLD,
    livesLost: 0,
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

/** A snapshot in which nothing whatsoever has happened — the base every case overrides. */
function zeroSnapshot(): AchievementSnapshot {
  return {
    lifetime: zeroCounters(),
    byMode: { campaign: {}, endless: {}, daily: {} },
    endless: { bestWave: 0, bestScore: 0 },
    daily: { longestStreak: 0, totalDaysPlayed: 0 },
  };
}

describe('ACHIEVEMENT_CATALOG shape (N-ACH-01, 13-02)', () => {
  it('every entry is data — an id, a name, a description and a unary pure predicate', () => {
    expect(
      ACHIEVEMENT_CATALOG.length,
      'an empty catalog would make every quantified case in this file pass by having nothing to quantify over',
    ).toBeGreaterThan(0);

    for (const entry of ACHIEVEMENT_CATALOG) {
      expect(
        typeof entry.id === 'string' && entry.id.length > 0,
        `every entry needs a non-empty string id: it is the key the v4 blob stores and the only thing \`isKnownAchievementId\` can validate (D-15). Offender: ${JSON.stringify(entry.id)}`,
      ).toBe(true);
      expect(
        typeof entry.name === 'string' && entry.name.length > 0,
        `every entry needs a non-empty display name: the panel renders \`Unlocked · {name}\` and an empty one renders a bare separator (N-ACH-03). Offender: ${entry.id}`,
      ).toBe(true);
      expect(
        typeof entry.description === 'string' && entry.description.length > 0,
        `every entry needs a description now rather than later: writing it later means re-deriving a threshold's intent from its predicate, which is the reading D-11 exists to make unnecessary. Offender: ${entry.id}`,
      ).toBe(true);
      expect(
        typeof entry.predicate,
        `N-ACH-01: an achievement is declared as DATA with a pure predicate — a non-function here means the entry is code pretending to be data. Offender: ${entry.id}`,
      ).toBe('function');
      expect(
        entry.predicate.length,
        `the predicate takes exactly one argument, the snapshot: a second parameter would be a second input the evaluator would have to source, and D-03 fixes the inputs at (catalog, snapshot, unlocked set). Offender: ${entry.id}`,
      ).toBe(1);
    }
  });

  it('ids unique — and so are the descriptions', () => {
    const ids = ACHIEVEMENT_CATALOG.map((a) => a.id);
    expect(
      new Set(ids).size,
      'two entries sharing an id collapse into one stored unlock, so the second achievement can never be earned and nothing would say so',
    ).toBe(ACHIEVEMENT_CATALOG.length);

    const descriptions = ACHIEVEMENT_CATALOG.map((a) => a.description);
    expect(
      new Set(descriptions).size,
      'two entries sharing a description means one of them was written by copying the other and the copy was never finished — the Achievements screen would show the same sentence twice',
    ).toBe(ACHIEVEMENT_CATALOG.length);
  });

  it('name within 16 chars — every display name fits the exported budget', () => {
    const offenders = ACHIEVEMENT_CATALOG.filter(
      (a) => a.name.length > ACHIEVEMENT_NAME_MAX,
    ).map((a) => `${a.id} (${a.name.length} chars: "${a.name}")`);

    expect(
      offenders,
      // The consequence, not the rule: a name past the budget wraps to a second visual
      // line and silently adds 24px, and 24px is most of the 26px of spare height the
      // whole two-row reduction bought (D-05 AMENDED). The failure a player sees is not a
      // ragged line; it is `Menu` clipped off the bottom of a non-scrolling panel.
      //
      // This is the `explicit` half of a pair. The other half — that a 16-character name
      // really does render on one line on a real 320px panel — is a DEVICE backstop
      // (WINDOWS #16) that no `render()` in this repo can close, because jsdom performs
      // no layout. Plan 13-05 discharges it.
      `a display name longer than ACHIEVEMENT_NAME_MAX (${ACHIEVEMENT_NAME_MAX}) wraps the unlock line to a second visual row, adding 24px to a panel that has 26px of spare and no scroll — the player loses the Menu button, not just the line break`,
    ).toEqual([]);
  });

  it('no clock no storage — the source-level second reader of D-03 and D-20', () => {
    // PRIMARY ENFORCER: the `src/services/achievements/**` block in `eslint.config.js`.
    // That block is AST-level, `error`-severity, and immune to a comment mentioning a
    // banned construct — which matters, because the catalog's own header explains the ban
    // by naming all five constructs in prose.
    //
    // This scan is the PORTABLE second reader, and it exists because `13-VALIDATION.md`
    // maps N-ACH-01's purity row to a vitest case and `npm run lint` is not a vitest
    // case. Neither gate is redundant with the other: the lint block catches a construct
    // this text scan's regex does not spell, and this case runs wherever vitest runs,
    // including where a lint config has drifted.
    //
    // Being text-level, it MUST strip comments before matching, or the module header that
    // explains the ban would fail the gate it explains. That is not hypothetical — plan
    // 13-01 shipped exactly that defect against a grep-based `numberOfLines` gate and had
    // to rewrite the prose to get out of it.
    const FORBIDDEN_CLOCK_RNG_STORAGE =
      /Math\s*\.\s*random|Date\s*\.\s*now|performance\s*\.\s*now|new\s+Date|from\s*['"][^'"]*storage/;

    const stripComments = (src: string): string =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
      });

    const files = walk('src/services/achievements').filter(
      (p) => !p.includes('.test.'),
    );
    expect(
      files.length,
      'a scan over zero files passes vacuously — the directory must exist and hold the policy modules',
    ).toBeGreaterThanOrEqual(2);

    const offenders = files.filter((p) =>
      FORBIDDEN_CLOCK_RNG_STORAGE.test(stripComments(readFileSync(p, 'utf8'))),
    );
    expect(
      offenders,
      'D-03 / D-20: the achievement policy reads no clock, no RNG and imports no storage module. A predicate that depends on when it runs is not a pure function of the snapshot, and SC-2 asserts exactly that it is; a storage import makes every catalog test need a storage harness, which is what makes N-ACH-01 untestable',
    ).toEqual([]);
  });

  it('three modes — campaign, endless and daily each reach at least one entry (D-12 / SC-5)', () => {
    const base = zeroSnapshot();

    const campaignOnly: AchievementSnapshot = {
      ...base,
      byMode: { ...base.byMode, campaign: { 'level-01': farCounters() } },
    };
    const endlessOnly: AchievementSnapshot = {
      ...base,
      byMode: { ...base.byMode, endless: { endless: farCounters() } },
      endless: {
        bestWave: FAR_PAST_ANY_THRESHOLD,
        bestScore: FAR_PAST_ANY_THRESHOLD,
      },
    };
    const dailyOnly: AchievementSnapshot = {
      ...base,
      byMode: { ...base.byMode, daily: { daily: farCounters() } },
      daily: {
        longestStreak: FAR_PAST_ANY_THRESHOLD,
        totalDaysPlayed: FAR_PAST_ANY_THRESHOLD,
      },
    };

    expect(
      qualifyingAchievements(base),
      // THE POSITIVE CONTROL, and it is what keeps the other three assertions
      // non-vacuous: a catalog whose entries all fired unconditionally would satisfy them
      // all and mean nothing. It is also a cross-plan stability constraint rather than
      // only a test — `tests/achievements.record.test.ts` (13-01/13-03) and the UI
      // batteries (13-04) each assert "a run that crosses nothing reports nothing", so an
      // entry that fired at zero would red those suites from this plan's commit.
      'an all-zero snapshot must qualify for NOTHING: every threshold is strictly above zero, because "played no runs" is not an achievement, and three later plans assert absence against exactly this',
    ).toEqual([]);

    expect(
      qualifyingAchievements(campaignOnly).length,
      'D-12: a snapshot whose ONLY populated region is byMode.campaign must qualify something — a catalog reading only `lifetime` satisfies the LETTER of SC-5 and not its point',
    ).toBeGreaterThan(0);
    expect(
      qualifyingAchievements(endlessOnly).length,
      'D-12: a snapshot whose ONLY populated region is the endless one must qualify something',
    ).toBeGreaterThan(0);
    expect(
      qualifyingAchievements(dailyOnly).length,
      'D-12: a snapshot whose ONLY populated region is the daily one must qualify something',
    ).toBeGreaterThan(0);
  });

  it('catalog size — inside D-09\'s 8..12, a range and not an equality', () => {
    expect(
      ACHIEVEMENT_CATALOG.length,
      'D-09: fewer than eight is not a catalog a player would browse, and the phase committed to filling it rather than shipping a tracer entry alone',
    ).toBeGreaterThanOrEqual(D09_MIN_ENTRIES);
    expect(
      ACHIEVEMENT_CATALOG.length,
      'D-09: more than twelve locks this phase into calibrating thresholds for a game no human has played. A range rather than an equality, so re-ordering or re-tuning is free and a thirteenth entry is a decision',
    ).toBeLessThanOrEqual(D09_MAX_ENTRIES);
  });
});
