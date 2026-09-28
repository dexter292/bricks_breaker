import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The Daily Result panel (N-DAILY-02 / D-06 / D-10 / D-12; `12-UI-SPEC.md`
 * § Copywriting Contract, § A new component).
 *
 * A SEPARATE component, and that is the contract: `ResultOverlay`'s `mode` prop stays
 * `'campaign' | 'endless'` and is never widened to admit a third mode. It already
 * carries `best`, `wave`, `bestWave`, `waveBuildFailedWave`, `stars`, `onNext` and
 * `isNewRecord`, several mutually exclusive by mode — a third mode needing different
 * lines, no `Retry` and no star row would make every prop conditionally meaningless,
 * which is the exact shape that once let a campaign number render on an endless panel.
 *
 * Every value is a SCALAR prop selected by the host. That is SC-5 at the prop
 * signature, where it is checkable by reading the type rather than by tracing a branch:
 * this file cannot import `src/services` at all (`eslint.config.js:257-263` allows a
 * `runtime` element only `core`/`runtime`/`render`/`vfx`), so `previousBestRef`,
 * `store.getBestForLevel(...)`, `telemetry.endless` and `stars` are unreachable from
 * here by construction.
 *
 * The chrome values below are copied VERBATIM from `ResultOverlay.tsx:242-358`, which
 * is what `12-UI-SPEC.md` § A new component transcribes as its chrome table. The star
 * styles are deliberately NOT copied: D-12 keeps stars campaign-only, and
 * `starEmpty`'s `#6B7280` measures 3.84:1 on this panel and fails AA — the UI-SPEC
 * fences that colour to dev borders.
 *
 * WHAT THIS PANEL DOES NOT RENDER, all of it contract rather than omission:
 *  - No `Retry`. D-06 gives one attempt per date, so a closed date's only control is
 *    `Menu`. There is no disabled or greyed variant either — a control the rule forbids
 *    is ABSENT, because a greyed button invites a tap and then explains itself.
 *  - No `Next`. Daily has no next level.
 *  - No star row (D-12).
 *  - No `Best ·` score line, ever. One attempt per date means there is no per-date
 *    score to beat, and no lifetime best daily SCORE is stored; filling such a line
 *    from the campaign or endless watermark would break SC-5 outright.
 *
 * The streak block, the record badge, the countdown and the board-failure variant are
 * plan 12-05's and are NOT stubbed here — no empty slot, no placeholder text, no
 * disabled control. Each is additive to this panel's line order when it lands.
 */
type Props = {
  /** The STORED outcome for this date (D-10): a cleared board, or out of lives. */
  kind: 'win' | 'lose';
  /**
   * The date this panel is showing, as the stored `YYYY-MM-DD` key.
   *
   * Rendered VERBATIM with no formatting step. A locale-formatted date would be a
   * second representation of the same day that can disagree with the key the board was
   * derived from, and SC-1's whole claim is that those are one thing.
   */
  dateKey: string;
  score: number;
  onMenu: () => void;
};

export function DailyResultOverlay({ kind, dateKey, score, onMenu }: Props) {
  const insets = useSafeAreaInsets();
  const isWin = kind === 'win';

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
          `Daily ·` → `Score ·` → `Menu`. The order reads as what happened → to which
          date → what today scored → the way out. `·` is U+00B7 MIDDLE DOT, matching
          every shipped metric line.
        */}
        <Text style={[styles.heading, !isWin && styles.loseHeading]}>
          {isWin ? 'Win' : 'Lose'}
        </Text>
        <Text style={styles.body}>{isWin ? 'All clear' : 'Out of lives'}</Text>
        <Text style={styles.metric}>Daily · {dateKey}</Text>
        <Text style={styles.metric}>Score · {score}</Text>
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
