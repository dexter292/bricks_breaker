/**
 * N-DAILY-01 — one date key, one board, everywhere, every day (SC-1).
 *
 * The date key is the ONLY input to a daily board. `tests/daily.date-key.test.ts` proves
 * the key is the same string on every device; this file proves that string is enough —
 * that it maps to a stable board, that two years of consecutive dates never collide, and
 * that nothing on the path reaches the network to ask what today's board should be.
 *
 * Analog: `tests/endless.ramp.test.ts` — the same constants-at-the-top-with-their-reason
 * shape, the same `describe('<fn> (<criterion> / <requirement>, <plan>)')` naming, the
 * same `expect(value, 'why')` convention, and the `new Set(...).size` uniqueness idiom it
 * in turn borrowed from `tests/levelgen.determinism.test.ts:52`. The requirement INVERTS
 * between the two: endless asserts two runs differ, daily asserts one date repeats.
 *
 * **No assertion here pins a literal dial constant.** `DAILY_DIFFICULTY` is asserted by
 * derived property — integer, non-negative, inside the generator's own declared `D_MAX`,
 * and producing a board with bricks — for the reason the ramp test states: it is a
 * discretionary number the plan set may legitimately re-tune, and a test that pinned it
 * would fail on a legitimate retune while catching nothing. `D_MAX` is read from the
 * generator barrel, never restated.
 *
 * Deliberately NOT covered here:
 *  - **Whether a generated board realises its difficulty.** That is exact-weight equality
 *    in `tests/levelgen.sweep.test.ts`, a Phase 10 asset, and it stays there. This file is
 *    about boards being distinct and stable, not about them being correctly weighted.
 *  - **Whether the board is solvable.** `scripts/assert-level-solvability.mjs` and the
 *    Phase 10 sweep own that; the sweep recorded 0 non-wins across every generated board,
 *    which is the evidence D-13's "the streak counts dates PLAYED" rests on.
 *  - **The zone.** Every case here walks the calendar through the module's own arithmetic
 *    anchored at LOCAL noon, so it is correct in any ambient zone and pins none. The
 *    zone-sensitive claims are the neighbouring file's.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { D_MAX, generate } from '../src/levelgen';
import { DAILY_DIFFICULTY, localDateKey, nextLocalMidnightMs } from '../src/services/daily';
import type { LevelFileV1 } from '../src/core/levels/schema';

/**
 * Two years plus one day of consecutive dates — the exact span 12-RESEARCH § Seed
 * diffusion replayed, which measured 731 distinct `hashSeed`, 731 distinct `mixSeed` and
 * 731 distinct 8-draw signatures with a consecutive-key hamming mean of 17.18 against an
 * ideal 16. Walking from 2026-01-01 this ends on 2028-01-01.
 *
 * NOTE: this span contains no leap day — 2026 and 2027 are both common years. The leap
 * rollover is covered where it belongs, in `tests/daily.date-key.test.ts`'s rollover case
 * (2028-02-28 → 2028-02-29); the dedicated leap-day board case below closes the gap here.
 */
const UNIQUE_DAYS = 731;

/**
 * Local noon on 2026-01-01, built with the local-field constructor so the walk starts on
 * that named calendar date in EVERY ambient zone. An instant expressed in UTC would start
 * a day early or late depending on the machine running the suite.
 */
const FIRST_DAY_LOCAL_NOON = new Date(2026, 0, 1, 12, 0, 0, 0).getTime();

/** The leap day this file checks explicitly, since the 731-day span above misses it. */
const LEAP_DAY_LOCAL_NOON = new Date(2028, 1, 29, 12, 0, 0, 0).getTime();

/**
 * The network primitives a daily board must never reach. The whole point of D-11 is that
 * the board is DERIVED, not fetched: a server that has to be asked is a server that can
 * be down, can be slow, and can hand two players different boards on the same date.
 */
const NETWORK_PRIMITIVES = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'navigator.sendBeacon',
  'axios',
  "'node:http",
  "'node:https",
] as const;

/** The daily policy sources whose text the no-network contract is asserted over. */
const DAILY_POLICY_SOURCES = [
  'src/services/daily/dateKey.ts',
  'src/services/daily/index.ts',
] as const;

/**
 * The whole level file, as the plan's analog does. Used for the SAME-key identity cases,
 * where "byte-identical" is the claim and every field is in scope.
 */
function boardFingerprint(level: LevelFileV1): string {
  return JSON.stringify(level);
}

/**
 * The PLAYFIELD only — grid, brick types and cells, with `id` and `name` removed.
 *
 * Used for every DISTINCTNESS case, and the reason is that the whole-file fingerprint
 * cannot falsify distinctness: `generate` builds `id` as `gen-${hashSeed.toString(16)}-${d}`
 * (`src/levelgen/generate.ts:326`), so a whole-file `JSON.stringify` reports 731 distinct
 * strings the moment 731 keys hash distinctly — even if every one of those 731 boards laid
 * out the identical playfield. An instrument that reports success from the label rather
 * than from the thing labelled proves nothing, so distinctness is asserted over the cells.
 */
function playfieldFingerprint(level: LevelFileV1): string {
  return JSON.stringify({
    grid: level.grid,
    brickTypes: level.brickTypes,
    cells: level.cells,
  });
}

/** Non-empty cells in a board — the cheap "this is a real board" measure. */
function brickCount(level: LevelFileV1): number {
  let n = 0;
  for (const row of level.cells) {
    for (const ch of row) {
      if (ch !== '.') {
        n++;
      }
    }
  }
  return n;
}

/** Cells that differ between two boards laid out on the same grid. */
function cellDifference(a: LevelFileV1, b: LevelFileV1): number {
  let n = 0;
  for (let r = 0; r < a.cells.length; r++) {
    const rowA = a.cells[r] ?? '';
    const rowB = b.cells[r] ?? '';
    for (let c = 0; c < Math.max(rowA.length, rowB.length); c++) {
      if (rowA[c] !== rowB[c]) {
        n++;
      }
    }
  }
  return n;
}

/**
 * `UNIQUE_DAYS` consecutive date keys, walked with the module's OWN next-day arithmetic
 * rather than by string manipulation — so the walk exercises the same rollover behaviour
 * a real device's midnight boundary does, month and year boundaries included.
 */
function walkKeys(fromMs: number, days: number): string[] {
  const keys: string[] = [];
  let t = fromMs;
  for (let i = 0; i < days; i++) {
    keys.push(localDateKey(t));
    t = nextLocalMidnightMs(t);
  }
  return keys;
}

/** Comment-stripped source text, so prose naming a banned API is not a false positive. */
function strippedSource(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

/** Which of `NETWORK_PRIMITIVES` appear in a piece of source text. */
function networkPrimitivesIn(source: string): string[] {
  return NETWORK_PRIMITIVES.filter((p) => source.includes(p));
}

describe('daily board derivation (SC-1 / N-DAILY-01, 12-02)', () => {
  it('the same date key yields a byte-identical board (D-11)', () => {
    const key = '2026-09-27';
    const first = generate(key, DAILY_DIFFICULTY);
    const second = generate(key, DAILY_DIFFICULTY);
    expect(
      boardFingerprint(second),
      'the same date must give the same board, or two players on the same day are not playing the same puzzle',
    ).toBe(boardFingerprint(first));
  });

  it('a key rebuilt character by character yields the same board — the seed is the string content, not its identity', () => {
    const literal = '2026-09-27';
    // Built so it cannot be the same object reference as the literal above. This is the
    // in-process proxy for the real claim, which is cross-DEVICE: two phones never share
    // a string instance, so a board that depended on identity rather than content would
    // diverge between them and SC-1 would fail invisibly in this suite.
    const rebuilt = literal.split('').join('');
    expect(rebuilt === literal, 'the two keys must have equal content').toBe(true);
    expect(
      boardFingerprint(generate(rebuilt, DAILY_DIFFICULTY)),
      'a key with equal content must produce the same board',
    ).toBe(boardFingerprint(generate(literal, DAILY_DIFFICULTY)));
  });

  it('731 consecutive date keys yield 731 distinct boards (SC-1)', () => {
    const keys = walkKeys(FIRST_DAY_LOCAL_NOON, UNIQUE_DAYS);
    expect(keys[0], 'the walk must start on the date the research replayed').toBe('2026-01-01');
    expect(
      new Set(keys).size,
      `${UNIQUE_DAYS} steps of the calendar walk must produce ${UNIQUE_DAYS} distinct dates`,
    ).toBe(UNIQUE_DAYS);

    const playfields = new Set<string>();
    for (const key of keys) {
      const before = playfields.size;
      playfields.add(playfieldFingerprint(generate(key, DAILY_DIFFICULTY)));
      expect(
        playfields.size,
        `date ${key} produced a playfield already seen on an earlier date`,
      ).toBe(before + 1);
    }
    expect(
      playfields.size,
      `${UNIQUE_DAYS} dates must produce ${UNIQUE_DAYS} distinct playfields — a repeat is a day a player has already solved`,
    ).toBe(UNIQUE_DAYS);
  });

  it('consecutive dates are not correlated — the difference is never confined to one cell', () => {
    const keys = walkKeys(FIRST_DAY_LOCAL_NOON, UNIQUE_DAYS);
    let worst = Number.POSITIVE_INFINITY;
    let worstPair = '';
    for (let i = 1; i < keys.length; i++) {
      const diff = cellDifference(
        generate(keys[i - 1]!, DAILY_DIFFICULTY),
        generate(keys[i]!, DAILY_DIFFICULTY),
      );
      if (diff < worst) {
        worst = diff;
        worstPair = `${keys[i - 1]} -> ${keys[i]}`;
      }
    }
    // A one-character difference between adjacent ISO keys is fully diffused before it
    // reaches the board: 12-RESEARCH § Seed diffusion measured a consecutive-key mixSeed
    // hamming mean of 17.18 against an ideal 16. The claim asserted is only that the
    // boards differ in MORE THAN ONE cell; the measured minimum over this span is 70, so
    // the margin is wide and the bound is not a re-tuned dial.
    expect(
      worst,
      `the closest consecutive pair (${worstPair}) differs in ${worst} cells; yesterday's board must not be today's with one brick moved`,
    ).toBeGreaterThan(1);
  });

  it('the 2028 leap day gets its own board, distinct from the days either side', () => {
    const leap = localDateKey(LEAP_DAY_LOCAL_NOON);
    expect(leap, 'the local-field constructor must accept 29 February 2028').toBe('2028-02-29');
    const before = localDateKey(new Date(2028, 1, 28, 12, 0, 0, 0).getTime());
    const after = localDateKey(nextLocalMidnightMs(LEAP_DAY_LOCAL_NOON));
    expect(after, 'the day after the leap day is 1 March').toBe('2028-03-01');
    const prints = new Set(
      [before, leap, after].map((k) => playfieldFingerprint(generate(k, DAILY_DIFFICULTY))),
    );
    expect(
      prints.size,
      'a leap day is a playable date like any other and must not share a board with its neighbours',
    ).toBe(3);
  });

  it("DAILY_DIFFICULTY lands inside the generator's declared range and produces a board with bricks (D-11)", () => {
    expect(
      Number.isInteger(DAILY_DIFFICULTY),
      `the difficulty fed to generate must be an integer, got ${DAILY_DIFFICULTY}`,
    ).toBe(true);
    expect(DAILY_DIFFICULTY, 'difficulty lower bound').toBeGreaterThanOrEqual(0);
    expect(
      DAILY_DIFFICULTY,
      "difficulty must sit inside the generator's own D_MAX, which is read here and never restated",
    ).toBeLessThanOrEqual(D_MAX);
    const board = generate('2026-09-27', DAILY_DIFFICULTY);
    expect(
      brickCount(board),
      'a daily board with no bricks would be cleared before the first ball launch',
    ).toBeGreaterThan(0);
    expect(board.schemaVersion, 'the generated board is a v1 level file').toBe(1);
  });
});

describe('daily board no network (SC-1 / N-DAILY-01, 12-02)', () => {
  it('no network primitive is reachable from the daily policy module — no network (D-11)', () => {
    // A SOURCE contract, not a runtime spy, and the distinction matters: there is nothing
    // to spy on. The claim is that no such call EXISTS, and a spy can only observe calls
    // made on the paths a test happens to drive — it would stay silent about a fetch on a
    // branch the test never enters, which is exactly where one would hide.
    //
    // Its limit, stated rather than implied: this reads the two daily policy files. It is
    // evidence about them and about their reachable set (asserted empty below), not about
    // the whole app.
    for (const path of DAILY_POLICY_SOURCES) {
      const source = strippedSource(path);
      expect(
        networkPrimitivesIn(source),
        `${path} must reach no network primitive — a daily board is derived, never fetched`,
      ).toEqual([]);
    }

    // The reachable set of `dateKey.ts` is `dateKey.ts`: it imports nothing at all, so the
    // scan above is complete for it rather than merely local. The barrel re-exports only
    // from that file.
    expect(
      strippedSource('src/services/daily/dateKey.ts').includes('import'),
      'dateKey.ts must import nothing, so its reachable set is itself',
    ).toBe(false);
    // The barrel's own reachable set: every module it pulls from. Asserted as the SET of
    // import sources rather than as the barrel's literal text, so plan 12-03/12-05 adding
    // an export to this barrel does not red a case about the network.
    const barrelSources = [
      ...strippedSource('src/services/daily/index.ts').matchAll(/from\s+'([^']+)'/g),
    ].map((m) => m[1]);
    expect(
      [...new Set(barrelSources)],
      'the barrel must re-export only from the daily policy module, whose own imports are empty',
    ).toEqual(['./dateKey']);

    // Non-vacuity: the detector must actually detect. Without this the case above would
    // pass just as happily with an empty primitive list or a broken matcher.
    expect(
      networkPrimitivesIn('async function today() { return fetch("/api/daily"); }'),
      'the detector must find a network primitive in a control that has one',
    ).toEqual(['fetch']);
  });
});
