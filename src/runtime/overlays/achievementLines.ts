/**
 * The unlock block's lines, for both result panels (N-ACH-03 / D-05 AMENDED / D-06 /
 * D-08).
 *
 * One exported pure classifier, two consumers. It exists as its own module for
 * `app/_components/certLevelPlan.ts`'s reason — that file records the same question being
 * written twice inside one function and the two copies drifting apart in three consecutive
 * rounds of phase 11 — and it returns `countdownForm`'s shape for
 * `DailyResultOverlay.tsx`'s reason: *"so the visible line and the spoken label can never
 * disagree about which case they are in. Two readers deriving the same boundary
 * independently is how they come to disagree."* Here there are literally two readers, two
 * panel files maintained in parallel, so the risk is not hypothetical.
 *
 * `ResultOverlay.tsx` is this plan's consumer. `DailyResultOverlay.tsx` is plan 13-04's,
 * and it changes nothing about this file.
 *
 * Pure: no React, no refs, no side effects, no clock, no storage — and **no import at
 * all**, which is the strengthened form of `certLevelPlan.ts`'s own purity sentence.
 * `src/runtime/overlays/` is inside the `runtime` boundary and `runtime -> runtime` is
 * permitted by `eslint.config.js` `boundaries/dependencies`, so both panels may import it.
 */

/**
 * The hard cap on rendered unlock lines (D-05, AMENDED to two on measured grounds).
 *
 * The binding case is a campaign WIN on `ResultOverlay`: 48 pad + 40 heading + 40 body +
 * 32 Score + 32 Best + 32 stars + 44 badge + 64 Retry + 64 Next + 62 Menu = 458px, against
 * 548px usable at 320x568pt. Two added rows is 522 with 26px spare; three is 554, which is
 * over by 6px and CLIPS `Menu` — and `12-UI-SPEC.md` forbids scrolling on this panel.
 *
 * The 26px of spare rests on a bottom safe-area inset of zero, which is UNVERIFIED. The
 * device check (WINDOWS #28, discharged by plan 13-05) must confirm the INSETS and not
 * merely the fit: if the bottom inset is non-zero the spare goes negative and this
 * constant drops to 1.
 */
export const ACHIEVEMENT_LINES_MAX = 2;

/**
 * One rendered line — the visible text and the spoken label, produced together.
 *
 * Exactly `CountdownForm`'s shape (`DailyResultOverlay.tsx`). `kind` is the discriminant a
 * consumer keys on; it must never re-derive which case it is in from the text.
 */
export type AchievementLine =
  | { kind: 'name'; text: string; label: string }
  | { kind: 'overflow'; text: string; label: string };

/** The visible prefix. `·` is U+00B7 MIDDLE DOT, matching every shipped metric line. */
const PREFIX = 'Unlocked · ';

/**
 * Project newly-unlocked display names onto at most `ACHIEVEMENT_LINES_MAX` lines
 * (`13-UI-SPEC.md` § The block).
 *
 * | n (after dropping) | Lines |
 * |---|---|
 * | 0 | none — an ABSENCE, not an empty state |
 * | 1 | `Unlocked · {name₁}` |
 * | 2 | `Unlocked · {name₁}`, `Unlocked · {name₂}` |
 * | >= 3 | `Unlocked · {name₁}`, `and {n − 1} more` |
 *
 * ## Totality, and why the cap is here rather than in the host
 *
 * Non-string, empty and whitespace-only entries are dropped FIRST, and `n` is the count
 * AFTER dropping — so the function never invents a name and never inflates the count. That
 * is the same downward degradation every v4 read path takes (D-15).
 *
 * The cap is a TOTALITY fold, in `streakEndedCopy`'s own terms: it returns at most
 * `ACHIEVEMENT_LINES_MAX` entries for ANY input, including a 50-element array, **because
 * the cap is a property of the component and not a promise by the host.** A host bug must
 * not be able to push `Menu` off the bottom of a non-scrolling panel — see the constant
 * above for the measured 554-against-548 that makes this load-bearing rather than
 * defensive.
 *
 * ## Order is preserved, never sorted and never de-duplicated
 *
 * Sorting is the obvious-looking improvement, so the reason it is refused belongs here.
 * Recency is not available: under D-04's retroactive flood every unlock carries the SAME
 * timestamp — the one `recordRunEnd` that evaluated them — so recency order is arbitrary
 * there and would make the NAMED achievement vary between two runs of one snapshot, which
 * breaks SC-2 at the surface the player actually sees. Alphabetical is meaningless to the
 * player and re-orders whenever a name is edited. Catalog declaration order is stable,
 * authored, and lets the catalog author put the achievement most worth naming first —
 * which is exactly the decision the `n >= 3` case needs someone to have made.
 *
 * ## The copy, and what is deliberately absent
 *
 * `Unlocked ·` and not `Achievement unlocked`: 21 characters of prefix would leave 6 for
 * the name against the measured 27-character budget, and the `·` form matches every other
 * line on both panels so the block reads as part of the panel rather than as a
 * notification pasted onto it. `and {n − 1} more` carries no leading ellipsis — the
 * lowercase `and` already reads as a continuation. No heading row (it would cost a third
 * row, which does not fit). No `!`, no "Congratulations" (every other line on these panels
 * states a fact). No count-only form (D-05 rejected a bare count: it tells the player
 * something happened without telling them what). No total-progress line — that is a
 * completion meter and it belongs to Phase 14's screen.
 *
 * Spoken labels exist because `·` is announced inconsistently across screen readers and
 * the visible strings are terse — the convention `12-UI-SPEC.md` set for `Streak · {n}`.
 */
export function achievementLines(
  names: readonly string[],
): readonly AchievementLine[] {
  const clean = (Array.isArray(names) ? names : []).filter(
    (n): n is string => typeof n === 'string' && n.trim() !== '',
  );
  const n = clean.length;
  if (n === 0) {
    return [];
  }
  const first: AchievementLine = {
    kind: 'name',
    text: `${PREFIX}${clean[0]!}`,
    label: `Achievement unlocked: ${clean[0]!}`,
  };
  if (n === 1) {
    return [first];
  }
  if (n === 2) {
    return [
      first,
      {
        kind: 'name',
        text: `${PREFIX}${clean[1]!}`,
        label: `Achievement unlocked: ${clean[1]!}`,
      },
    ];
  }
  const rest = n - 1;
  return [
    first,
    {
      kind: 'overflow',
      text: `and ${rest} more`,
      // Not a sentence on its own when read aloud, so the label states what the count is
      // a count OF.
      label: `And ${rest} more achievements unlocked`,
    },
  ];
}
