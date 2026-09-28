/**
 * @vitest-environment node
 *
 * Plan 13-04 Task 1 — `achievementLines`, the shared classifier both result panels
 * render from (N-ACH-03 / D-05 AMENDED / D-06).
 *
 * WHAT THIS GUARDS. `13-UI-SPEC.md` § One shared pure classifier makes the unlock block
 * ONE function with TWO consumers rather than two designs: `ResultOverlay.tsx` (plan
 * 13-01) and `DailyResultOverlay.tsx` (this plan). Every property in that section's
 * required-properties table is contract, and each owes a case here — the cap, purity,
 * order preservation, and totality over hostile input. A rule with two readers is a rule
 * that can be half-changed, which is the defect `certLevelPlan.ts` records and this file
 * is the answer to.
 *
 * SHAPE COPIED FROM two files. The environment and the plain-vitest form come from
 * `tests/ui/certLevelPlan.test.ts:1-12` — plain vitest, node environment, no jsdom and no
 * mocks, because the subject is pure. The case shapes come from
 * `tests/ui/DailyResultOverlay.test.tsx:101-171`, the two pure-classifier `describe`
 * blocks (`countdownForm`, `streakEndedCopy`) that sit above the component cases there.
 * `vitest.config.ts` runs the `node` environment by default and jsdom is opt-in per
 * file, so the ABSENCE of a jsdom docblock is the deliberate act, not an omission: this
 * file imports no React, renders nothing, and would gain only an unused renderer.
 *
 * DELIBERATELY NOT COVERED HERE, stated so the file's silence is not read as coverage.
 * Nothing about LAYOUT. This file proves what the function RETURNS and nothing about how
 * any of it renders, wraps, fits or is spoken by a real screen reader. It is not evidence
 * that a 16-character name occupies one line at 320px, that two added rows fit inside the
 * safe area with `Menu` reachable, or that the bottom inset is zero — and that last one is
 * what the whole two-row budget rests on. Those are `WINDOWS.md` #16, #17, #28 and #29;
 * they are device backstops a human discharges in plan 13-05, and no assertion below may
 * be recorded as having verified one of them. `13-UI-SPEC.md` § Measurement Provenance
 * says so in those terms.
 *
 * The names below are LITERALS. The classifier takes display-name strings and knows
 * nothing about a catalog (D-08); importing `src/services` here to derive them would
 * assert a coupling neither it nor either panel has.
 */
import { describe, it, expect } from 'vitest';
import {
  achievementLines,
  ACHIEVEMENT_LINES_MAX,
} from '../../src/runtime/overlays/achievementLines';

/**
 * The measured consequence of losing the cap, quoted in the cap cases' messages so the
 * reason is at the assertion rather than only in the contract: three rows put the
 * campaign-win `ResultOverlay` at 554px against 548px usable at 320x568pt, which clips
 * `Menu` — and `12-UI-SPEC.md` forbids scrolling on that panel.
 */
const WHY_THE_CAP =
  'the cap is a property of the CLASSIFIER and not a promise by the host: three rows put the campaign-win panel at 554px against 548 usable, which clips `Menu` on a panel that cannot scroll, so a host bug must not be able to defeat it';

describe('achievementLines (13-UI-SPEC § One shared pure classifier)', () => {
  it('no unlocks give no lines — an absence, not an empty state', () => {
    expect(
      achievementLines([]),
      'the zero state renders NOTHING: no block, no divider, no reserved space, no placeholder. A `No achievements this run` line would cost 32px on every result panel forever to say nothing',
    ).toEqual([]);
  });

  it('one unlock gives one name line, and the spoken label is produced beside it', () => {
    const lines = achievementLines(['1000 Bricks']);
    expect(lines, 'one unlock is one line, never a heading plus a line').toHaveLength(
      1,
    );
    expect(lines[0]!.kind, 'a single unlock is a `name` line, never an overflow').toBe(
      'name',
    );
    expect(
      lines[0]!.text,
      '`Unlocked ·` is 11 characters and matches the `·` form of every other line on both panels; `Achievement unlocked` would be 21 and leave 6 for the name against the measured 27-character budget',
    ).toBe('Unlocked · 1000 Bricks');
    expect(
      lines[0]!.label,
      'the visible text and the spoken label are produced TOGETHER, which is the whole reason this is one function: `·` is announced inconsistently across screen readers, and two readers deriving the label separately is how it comes to disagree with the line',
    ).toBe('Achievement unlocked: 1000 Bricks');
  });

  it('two unlocks give two name lines in input order, each with its own spoken label', () => {
    const lines = achievementLines(['1000 Bricks', 'Wave 20']);
    expect(lines, 'two is the cap, so both names are named').toHaveLength(2);
    expect(
      lines.map((l) => l.kind),
      'at n = 2 the second row is the SECOND NAME, never the overflow count — the two forms of row 2 are mutually exclusive',
    ).toEqual(['name', 'name']);
    expect(
      lines.map((l) => l.text),
      'input order, which is the host catalog declaration order',
    ).toEqual(['Unlocked · 1000 Bricks', 'Unlocked · Wave 20']);
    expect(
      lines.map((l) => l.label),
      'every line carries its own spoken form; a shared or missing label on the second row is the drift this shape exists to prevent',
    ).toEqual([
      'Achievement unlocked: 1000 Bricks',
      'Achievement unlocked: Wave 20',
    ]);
  });

  it('at three it names one and counts the rest as "and n more", spoken as a sentence', () => {
    const lines = achievementLines(['1000 Bricks', 'Wave 20', 'Seven Days']);
    expect(lines, 'still two rows at n = 3').toHaveLength(2);
    expect(
      lines[0]!.text,
      'D-05 rejected a bare count: it tells the player something happened without telling them what, so n >= 3 still NAMES one',
    ).toBe('Unlocked · 1000 Bricks');
    expect(lines[1]!.kind, 'the second row becomes the overflow row').toBe(
      'overflow',
    );
    expect(
      lines[1]!.text,
      'no leading ellipsis: the lowercase `and` already reads as a continuation of the line above, and dropping U+2026 keeps the copy inside the ASCII + U+00B7 set every shipped line uses',
    ).toBe('and 2 more');
    expect(
      lines[1]!.label,
      '`and 2 more` is not a sentence on its own when read aloud, so the label states what the count is a count OF',
    ).toBe('And 2 more achievements unlocked');
    expect(
      lines.some((l) => l.text.includes('Wave 20')),
      'the SECOND name is not rendered at n >= 3 — naming two and counting the rest would need a third row, and a third row does not fit',
    ).toBe(false);
  });

  it('caps at two lines for a 50-element array, which is the hostile-host case', () => {
    const fifty = Array.from({ length: 50 }, (_, i) => `Name ${i}`);
    const lines = achievementLines(fifty);
    expect(lines.length, WHY_THE_CAP).toBe(2);
    expect(
      lines[1]!.text,
      'the overflow count is the honest remainder of the WHOLE input, not of a truncated copy of it',
    ).toBe('and 49 more');
    expect(
      lines[1]!.label,
      'the spoken form counts the same remainder',
    ).toBe('And 49 more achievements unlocked');
  });

  it('caps at two against ACHIEVEMENT_LINES_MAX for every length from 0 to 12, never a literal', () => {
    expect(
      ACHIEVEMENT_LINES_MAX,
      'D-05 was AMENDED to two on measured grounds; the constant is the single place the number lives, and the device check in plan 13-05 may yet drop it to 1 if the bottom safe-area inset is not zero',
    ).toBe(2);
    for (let n = 0; n <= 12; n += 1) {
      const names = Array.from({ length: n }, (_, i) => `N${i}`);
      expect(
        achievementLines(names).length,
        `${WHY_THE_CAP} (n = ${n})`,
      ).toBeLessThanOrEqual(ACHIEVEMENT_LINES_MAX);
    }
    expect(
      achievementLines(['a', 'b', 'c']).length,
      'and the bound is REACHED, so the loop above is not vacuously green on a function that returns nothing',
    ).toBe(ACHIEVEMENT_LINES_MAX);
  });

  it('preserves input order and never sorts — an unsorted pair comes back unsorted', () => {
    expect(
      achievementLines(['Wave 20', '1000 Bricks']).map((l) => l.text),
      'sorting is the obvious-looking improvement, so the refusal is asserted rather than assumed. Alphabetical is meaningless to the player and re-orders whenever a name is edited; catalog declaration order is authored, and it is what lets the catalog author decide which achievement the n >= 3 case names',
    ).toEqual(['Unlocked · Wave 20', 'Unlocked · 1000 Bricks']);
  });

  it('never de-duplicates — the same name twice is two lines', () => {
    const lines = achievementLines(['1000 Bricks', '1000 Bricks']);
    expect(
      lines.map((l) => l.text),
      'de-duplicating would silently drop a row and make the rendered line count disagree with the count the overflow row reports. It is also why neither panel may use the TEXT as a React key',
    ).toEqual(['Unlocked · 1000 Bricks', 'Unlocked · 1000 Bricks']);
  });

  it('drops non-strings, empty and whitespace-only entries, and counts n AFTER the drop', () => {
    const hostile = [
      '1000 Bricks',
      '',
      '   ',
      null,
      42,
      undefined,
      { name: 'Wave 20' },
      'Seven Days',
      'Ten Days',
    ] as unknown as readonly string[];
    const lines = achievementLines(hostile);
    expect(
      lines[0]!.text,
      'the first SURVIVING entry is named; a dropped entry never becomes a blank `Unlocked ·` line',
    ).toBe('Unlocked · 1000 Bricks');
    expect(
      lines[1]!.text,
      'three names survive, so the remainder is 2. A count taken BEFORE the drop would print `and 8 more` — the function degrades downward like every other v4 read path (D-15): it never invents a name and never inflates the count',
    ).toBe('and 2 more');
    expect(
      achievementLines(['', '  ', '\t\n'] as unknown as readonly string[]),
      'an input of nothing but blanks is the zero state, not a block of empty rows',
    ).toEqual([]);
  });

  it('does not mutate the caller array — an in-place sort is the shape this forbids', () => {
    const names = ['Wave 20', '1000 Bricks', 'Seven Days'];
    const before = [...names];
    achievementLines(names);
    expect(
      names,
      'the panels pass a prop straight in, so a `.sort()` on the argument would re-order the HOST’s array as a side effect — an ordering violation that surfaces in the caller and that no assertion on the RETURN value would see',
    ).toEqual(before);
  });

  it('is total over a non-array input, degrading downward to no lines', () => {
    expect(
      achievementLines(undefined as unknown as readonly string[]),
      'totality over anything a future caller could hand it, in `streakEndedCopy`’s own terms — the failure degrades to the zero state, which is the same answer every failure in this phase gives (§ Error state: there is no error copy in this phase at all)',
    ).toEqual([]);
    expect(
      achievementLines('1000 Bricks' as unknown as readonly string[]),
      'a bare string is iterable by character and would otherwise produce `Unlocked · 1`',
    ).toEqual([]);
  });

  it('reads its case from the kind discriminant, so a consumer never re-derives it from the text', () => {
    expect(
      achievementLines(['A', 'B']).map((l) => l.kind),
      'both panels key their React element and their presence test on `kind`; re-deriving the case by matching the text would break on a name that happens to contain `more`',
    ).toEqual(['name', 'name']);
    expect(
      achievementLines(['A', 'B', 'C']).map((l) => l.kind),
      'the discriminant, and not the text, is what distinguishes the two forms of row 2',
    ).toEqual(['name', 'overflow']);
  });

  it('returns deeply equal results for the same array twice — SC-2 at the classifier', () => {
    const names = ['1000 Bricks', 'Wave 20', 'Seven Days'];
    expect(
      achievementLines(names),
      'no clock, no storage, no randomness and no module-level state: the same array gives the same lines however many times it is asked, which is what carries SC-2 determinism from the evaluator out to the surface the player actually reads',
    ).toEqual(achievementLines(names));
  });
});
