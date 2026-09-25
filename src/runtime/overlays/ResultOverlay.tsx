import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  kind: 'win' | 'lose';
  score: number;
  best: number;
  isNewRecord: boolean;
  /** Win only — merged best stars after handleRunEnded (D-10). */
  stars?: 1 | 2 | 3 | null;
  onRetry: () => void;
  onMenu: () => void;
  /** Omit Next when null/undefined (D-11); do not show a gated-off control. */
  onNext?: (() => void) | null;
};

function StarRow({ filled }: { filled: 1 | 2 | 3 }) {
  const glyphs = [0, 1, 2].map((i) => ({
    glyph: i < filled ? '★' : '☆',
    filled: i < filled,
  }));
  return (
    <View
      style={styles.starsRow}
      accessibilityLabel={`${filled} of 3 stars`}
    >
      {glyphs.map((g, i) => (
        <Text
          key={i}
          style={[
            styles.starGlyph,
            g.filled ? styles.starFilled : styles.starEmpty,
          ]}
        >
          {g.glyph}
        </Text>
      ))}
    </View>
  );
}

/**
 * Win / Lose overlay + Score/Best/New Record + Retry + Next? + Menu (UI-SPEC D-11/D-12).
 * No confirmation. Centered in safe area. Next control omitted when gated off (D-11).
 */
export function ResultOverlay({
  kind,
  score,
  best,
  isNewRecord,
  stars,
  onRetry,
  onMenu,
  onNext,
}: Props) {
  const insets = useSafeAreaInsets();
  const isWin = kind === 'win';
  const showNext = isWin && typeof onNext === 'function';
  const showStars =
    isWin && (stars === 1 || stars === 2 || stars === 3);

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
        <Text style={[styles.heading, !isWin && styles.loseHeading]}>
          {isWin ? 'Win' : 'Lose'}
        </Text>
        <Text style={styles.body}>{isWin ? 'All clear' : 'Out of lives'}</Text>
        <Text style={styles.metric}>Score · {score}</Text>
        <Text style={styles.metric}>Best · {best}</Text>
        {showStars ? <StarRow filled={stars} /> : null}
        {isNewRecord ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>New Record</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry level"
          onPress={onRetry}
          style={[styles.button, styles.retrySpaced]}
        >
          <Text style={styles.buttonLabel}>Retry</Text>
        </Pressable>
        {showNext ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play next level"
            onPress={onNext}
            style={[styles.button, styles.buttonSpaced]}
          >
            <Text style={styles.buttonLabel}>Next</Text>
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
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  starGlyph: {
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  starFilled: {
    color: '#FFFFFF',
  },
  starEmpty: {
    color: '#6B7280',
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
  retrySpaced: {
    marginTop: 16,
  },
  buttonSpaced: {
    marginTop: 16,
  },
  buttonLabel: {
    color: '#1a1a2e',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
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
