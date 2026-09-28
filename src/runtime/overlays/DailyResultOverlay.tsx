import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The Daily Result panel (N-DAILY-02 / N-DAILY-03 / D-06 / D-10 / D-12 / D-17;
 * `12-UI-SPEC.md` § Copywriting Contract, § A new component, § The countdown line).
 *
 * A SEPARATE component, and that is the contract: `ResultOverlay`'s `mode` prop stays
 * `'campaign' | 'endless'` and is never widened to admit a third mode. It already
 * carries `best`, `wave`, `bestWave`, `waveBuildFailedWave`, `stars`, `onNext` and
 * `isNewRecord`, several mutually exclusive by mode — a third mode needing five more
 * lines, no `Retry` on a closed date, a different badge rule and a live countdown would
 * make every prop conditionally meaningless, which is the exact shape that once let a
 * campaign number render on an endless panel.
 *
 * Every value is a SCALAR prop selected by the host. That is SC-5 at the prop
 * signature, where it is checkable by reading the type rather than by tracing a branch:
 * this file cannot import `src/services` at all (`eslint.config.js` allows a `runtime`
 * element only `core`/`runtime`/`render`/`vfx`), so `previousBestRef`,
 * `store.getBestForLevel(...)`, `telemetry.endless` and `stars` are unreachable from
 * here by construction. Lint is the ONLY mechanism that observes that boundary rule —
 * no unit test does — which is why this plan runs it as a gate rather than leaving it
 * to the suite.
 *
 * The chrome values below are copied VERBATIM from `ResultOverlay.tsx`'s
 * `StyleSheet.create`, which is what `12-UI-SPEC.md` § A new component transcribes as
 * its chrome table. The star styles are deliberately NOT copied: D-12 keeps stars
 * campaign-only, and `starEmpty`'s `#6B7280` measures 3.84:1 on this panel and fails
 * AA — the UI-SPEC fences that colour to dev borders.
 *
 * WHAT THIS PANEL DOES NOT RENDER, all of it contract rather than omission:
 *  - No `Retry` on a CLOSED date. D-06 gives one attempt per date, so a closed date's
 *    only control is `Menu`. There is no disabled or greyed variant either — a control
 *    the rule forbids is ABSENT, because a greyed button invites a tap and then
 *    explains itself. `Retry` is legitimate on the board-failure variant and only
 *    there, because that date is still OPEN — the same single rule (D-01), not an
 *    exception to it.
 *  - No `Next`. Daily has no next level.
 *  - No star row (D-12).
 *  - No `Best ·` score line, ever. One attempt per date means there is no per-date
 *    score to beat, and no lifetime best daily SCORE is stored; filling such a line
 *    from the campaign or endless watermark would break SC-5 outright.
 *
 * TWO PROHIBITIONS THIS FILE CARRIES, both `status: unresolved` in plan 12-05 and
 * neither optional:
 *  1. The streak surface states the fact that a streak ended and stops there (D-17).
 *     No shaming, no guilt, no loss-aversion framing — and no offer to restore,
 *     protect, freeze or buy back a streak: no rewarded ad, no in-app purchase, no
 *     streak-freeze item. The roadmap goal's own phrase, "a streak they would be
 *     annoyed to lose", is exactly the framing that invites a monetised recovery hook,
 *     which is why the prohibition is written down beside the copy rather than assumed.
 *  2. This panel never displays a streak length it cannot derive. `endedStreakLength`
 *     arrives already derived (or absent) from `src/services/daily/streak.ts`; when it
 *     is absent the line is OMITTED and `longestStreak` is never substituted, because
 *     that lifetime scalar may belong to an entirely different, earlier run and would
 *     state a number that was never the streak that just ended.
 */

/**
 * The countdown line's three render forms plus the omit case
 * (`12-UI-SPEC.md` § The countdown line).
 *
 * An exported pure classifier rather than a JSX ternary, for the reason
 * `ResultOverlay.tsx`'s `waveBuildFailureKind` is one: so the visible line and the
 * spoken label can never disagree about which case they are in. Two readers deriving
 * the same boundary independently is how they come to disagree.
 */
export type CountdownForm =
  | { kind: 'omit' }
  | { kind: 'hours'; text: string; label: string }
  | { kind: 'minutes'; text: string; label: string }
  | { kind: 'under-a-minute'; text: string; label: string };

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

/**
 * Classify the remaining milliseconds until the next local midnight.
 *
 * BOTH components are FLOORED, and that is contract rather than taste: at 23 hours 59
 * minutes 30 seconds remaining, a ceiling would print `24h 0m`, which is longer than a
 * day and reads as a bug.
 *
 * The hour component is a plain integer with NO two-character assumption and NO clamp
 * at 24. A 25-hour local day is real — it is the DST fall-back day — and the board
 * genuinely does change at the next local midnight, so 25 hours is the honest value.
 * The rare correct surprising output is exactly the kind that gets "fixed" into a wrong
 * one, which is why it has its own case in `tests/ui/DailyResultOverlay.test.tsx`.
 *
 * A non-positive, non-finite or not-a-number remainder OMITS the line rather than
 * rendering a negative duration or expiring in place (§ Clock policy rule 5). The
 * caller's response to an omission is to re-derive the local date key; the panel itself
 * branches on nothing here, because the countdown is decoration and never a gate
 * (rule 1).
 */
export function countdownForm(remainingMs: number): CountdownForm {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return { kind: 'omit' };
  }
  const totalMinutes = Math.floor(remainingMs / MS_PER_MINUTE);
  if (totalMinutes < 1) {
    return {
      kind: 'under-a-minute',
      text: 'New board in under a minute',
      // Already a full sentence in words, so the spoken form is the visible form.
      label: 'New board in under a minute',
    };
  }
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours < 1) {
    return {
      kind: 'minutes',
      text: `New board in ${minutes}m`,
      label: `New board in ${minutes} minutes`,
    };
  }
  return {
    kind: 'hours',
    text: `New board in ${hours}h ${minutes}m`,
    // `7h 12m` reads as letters through a screen reader (§ Accessibility labels).
    label: `New board in ${hours} hours ${minutes} minutes`,
  };
}

/**
 * D-17's streak-ended sentence, or nothing.
 *
 * The five-case DERIVATION lives in `src/services/daily/streak.ts` `endedStreakLength`,
 * over the stored window — it needs the dates, which this panel cannot reach. What
 * arrives here is the already-derived length or nothing, and this function does not
 * attempt to reconstruct the rule: it folds one value into one sentence.
 *
 * The `>= 2` guard is a TOTALITY fold, not a second derivation site. `endedStreakLength`
 * already applies the floor and never returns 1, so this branch is unreachable from the
 * real caller; it exists so the function is total over any number a future caller could
 * hand it rather than rendering "Your 1-day streak ended", which is not a loss worth
 * stating. The floor is also what removes the only pluralisation branch in the phase —
 * at two or more, `{n}-day` is always correct English, so there is no `1-day` string to
 * get wrong.
 *
 * What this function must NEVER do is fall back to the lifetime `longestStreak` when it
 * is handed nothing. See prohibition 2 in the file header.
 */
export function streakEndedCopy(
  endedLength: number | null | undefined,
): string | null {
  if (
    endedLength == null ||
    !Number.isFinite(endedLength) ||
    endedLength < 2
  ) {
    return null;
  }
  return `Your ${Math.floor(endedLength)}-day streak ended`;
}

type Props = {
  /**
   * The STORED outcome for this date (D-10), or the board-failure variant.
   *
   * `'board-failure'` is NOT a third outcome — it is the state in which today's board
   * could not be generated, so nothing was played, nothing was written, and the date
   * stays OPEN. It renders the accent-white `Daily` heading rather than the `Lose` red
   * (nothing was lost) and suppresses every line that describes a closed date.
   */
  kind: 'win' | 'lose' | 'board-failure';
  /**
   * The date this panel is showing, as the stored `YYYY-MM-DD` key.
   *
   * Rendered VERBATIM with no formatting step. A locale-formatted date would be a
   * second representation of the same day that can disagree with the key the board was
   * derived from, and SC-1's whole claim is that those are one thing.
   */
  dateKey: string;
  /** This date's stored score. Suppressed on the board-failure variant. */
  score: number;
  /**
   * `currentDailyStreak` over the stored RECORD — the run ending at this date
   * (D-13 / D-14). The host supplies it; this tier cannot import `src/services`.
   *
   * **`streakFrom` over the stored keys is NOT the source, and naming it here was the
   * stale line review IN-01 found.** `streakFrom` walks the TRIMMED window and saturates
   * at `DAILY_HISTORY_BOUND`: MEASURED over 450 consecutive closes it returns 400 against
   * a stored `longestStreak` of 450, which both states a streak the player does not have
   * AND silently stops the record badge firing, since the badge predicate is
   * `streak === longestStreak`. 12-05 removed that derivation for exactly this reason
   * (WINDOWS #19). The prop is the one place a reader of this panel would find a
   * derivation named, so it must name the right one.
   */
  streak: number;
  /** `DailyRecord.longestStreak` — the lifetime maximum (D-16). */
  longestStreak: number;
  /** `DailyRecord.totalDaysPlayed` — the line that gives that scalar a reader (D-16). */
  totalDaysPlayed: number;
  /**
   * The already-derived length of the streak that just ended, or nothing (D-17).
   *
   * Produced by `endedStreakLength` in the host tier, which returns nothing in four
   * distinct cases — including the one where the backward walk reached the floor of the
   * bounded window while still consecutive. Nothing means OMIT the line. See
   * prohibition 2 in the file header for why the lifetime scalar is never substituted.
   */
  endedStreakLength: number | null;
  /**
   * The instant the countdown is computed against — INJECTED, never read from a clock
   * inside this render (`12-UI-SPEC.md` § The panel is a pure function of the stored
   * daily record).
   *
   * Two reasons, and both are load-bearing. `reactCompiler` is on and
   * `react-hooks/purity` fails the build on an impure call during render. And without
   * injection the 23-hour-59-minute case, the sub-minute case and the rollover case are
   * not testable deterministically, which would make the countdown the one line in the
   * phase no test can pin.
   */
  nowMs: number;
  /**
   * The next local-midnight instant, from `nextLocalMidnightMs` in the host tier.
   *
   * Calendar arithmetic, not "now plus a fixed day": under DST a local day is 23 or 25
   * hours and the displayed value simply reflects that, which is correct because the
   * BOARD changes at local midnight too.
   */
  nextBoundaryMs: number;
  /**
   * The board-failure variant's `Retry`. Omitted elsewhere, and — following the shipped
   * `onNext` precedent — the control is absent rather than gated off when it is absent,
   * because a control that cannot work must not render.
   */
  onRetry?: (() => void) | null;
  onMenu: () => void;
};

export function DailyResultOverlay({
  kind,
  dateKey,
  score,
  streak,
  longestStreak,
  totalDaysPlayed,
  endedStreakLength,
  nowMs,
  nextBoundaryMs,
  onRetry = null,
  onMenu,
}: Props) {
  const insets = useSafeAreaInsets();
  const isFailure = kind === 'board-failure';
  const isWin = kind === 'win';
  // Every line that describes a CLOSED date hangs off this one flag, so the failure
  // variant cannot half-suppress: score, days played, the streak-ended line, the badge
  // and the countdown all describe a date that is done, and this one is still open.
  const isClosed = !isFailure;

  const endedCopy = isClosed ? streakEndedCopy(endedStreakLength) : null;
  // `===` and not `>`: the panel is a pure function of the STORED record, and by the
  // time it renders `longestStreak` has already absorbed this date's close — so
  // `streak > longestStreak` is false and the badge would appear once at the end of a
  // run and then vanish on re-open the same day. `===` is stable across re-opens and
  // needs no extra stored field. The copy is `Best streak ever` rather than
  // `New Record` because `===` is also true on a TIE with an earlier run's longest,
  // where `New Record` would be a false statement.
  const showBadge = isClosed && streak >= 2 && streak === longestStreak;
  const countdown = isClosed
    ? countdownForm(nextBoundaryMs - nowMs)
    : { kind: 'omit' as const };
  const showRetry = isFailure && onRetry != null;

  return (
    <View
      style={[
        styles.scrim,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
      pointerEvents="auto"
    >
      <View style={styles.panel}>
        {/*
          12-UI-SPEC § Daily Result panel, "line order is contract": heading → body →
          `Daily ·` → `Score ·` → `Streak ·` → `Best streak ·` → `Days played ·` →
          the streak-ended line → the badge → the countdown → `Menu`. The order reads
          as what happened → to which date → what today scored → the streak block →
          what was lost → what was gained → when the next one comes → the way out.
          `·` is U+00B7 MIDDLE DOT, matching every shipped metric line.

          Each optional line is a ternary to `null`, never a disabled or greyed
          variant — the shipped conditional-line pattern.
        */}
        <Text style={[styles.heading, kind === 'lose' && styles.loseHeading]}>
          {isFailure ? 'Daily' : isWin ? 'Win' : 'Lose'}
        </Text>
        <Text style={styles.body}>
          {isFailure
            ? "Today's board could not be built — tap Retry"
            : isWin
              ? 'All clear'
              : 'Out of lives'}
        </Text>
        <Text style={styles.metric}>Daily · {dateKey}</Text>
        {isClosed ? (
          <Text style={styles.metric}>Score · {score}</Text>
        ) : null}
        {/*
          The three streak readouts each carry a spoken label: `·` is announced
          inconsistently across screen readers, and the streak is the number this
          feature is about. The labels are not rendered visually, so they have no
          layout path of their own.
        */}
        <Text
          style={styles.metric}
          accessibilityLabel={`Streak: ${streak} days`}
        >
          Streak · {streak}
        </Text>
        <Text
          style={styles.metric}
          accessibilityLabel={`Best streak: ${longestStreak} days`}
        >
          Best streak · {longestStreak}
        </Text>
        {isClosed ? (
          <Text
            style={styles.metric}
            accessibilityLabel={`Days played: ${totalDaysPlayed}`}
          >
            Days played · {totalDaysPlayed}
          </Text>
        ) : null}
        {/*
          The one palette extension in this phase: `#E85D5D`, previously scoped to the
          `Lose` heading, also carries this line. The justification is semantic rather
          than decorative — D-17 exists because the loss is the point of the feature,
          and a loss statement rendered in the same accent white as `Days played · 45`
          states it without meaning it. It carries no spoken label on purpose: the
          visible string is already a full sentence, so a label would only restate it.
          The `Streak · {n}` line beside it stays accent white — the new streak is not
          itself a loss.
        */}
        {endedCopy != null ? (
          <Text style={[styles.metric, styles.streakEnded]}>{endedCopy}</Text>
        ) : null}
        {showBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Best streak ever</Text>
          </View>
        ) : null}
        {countdown.kind !== 'omit' ? (
          <Text style={styles.metric} accessibilityLabel={countdown.label}>
            {countdown.text}
          </Text>
        ) : null}
        {showRetry ? (
          <Pressable
            accessibilityRole="button"
            // § Accessibility labels: `Retry level` is FALSE here — there is no level.
            // This regenerates today's date-derived board, and the date is still open,
            // which is the same D-01 rule that forbids a Retry once it has closed.
            accessibilityLabel="Retry today's daily board"
            onPress={onRetry}
            style={[styles.button, styles.buttonSpaced]}
          >
            <Text style={styles.buttonLabel}>Retry</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to title"
          onPress={onMenu}
          style={[styles.menuButton, styles.buttonSpaced]}
        >
          <Text style={styles.menuLabel}>Menu</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    backgroundColor: '#12121f',
    padding: 24,
    minWidth: 200,
    maxWidth: 320,
    alignItems: 'stretch',
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  loseHeading: {
    color: '#E85D5D',
  },
  body: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  metric: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  // The metric style with ONLY its colour overridden — no other property changes, and
  // no new colour, type size or spacing token is introduced by this phase.
  streakEnded: {
    color: '#E85D5D',
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: '#F2CC8F',
    padding: 4,
    marginBottom: 16,
  },
  badgeLabel: {
    color: '#1a1a2e',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  buttonLabel: {
    color: '#1a1a2e',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  buttonSpaced: {
    marginTop: 16,
  },
  menuButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12121f',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  menuLabel: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});
