import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  kind: 'win' | 'lose';
  score: number;
  best: number;
  isNewRecord: boolean;
  onRetry: () => void;
  onMenu: () => void;
};

/**
 * Win / Lose overlay + Score/Best/New Record + Retry + Menu (UI-SPEC D-11).
 * No confirmation. Centered in safe area.
 */
export function ResultOverlay({
  kind,
  score,
  best,
  isNewRecord,
  onRetry,
  onMenu,
}: Props) {
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
        <Text style={[styles.heading, !isWin && styles.loseHeading]}>
          {isWin ? 'Win' : 'Lose'}
        </Text>
        <Text style={styles.body}>{isWin ? 'All clear' : 'Out of lives'}</Text>
        <Text style={styles.metric}>Score · {score}</Text>
        <Text style={styles.metric}>Best · {best}</Text>
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
    ...StyleSheet.absoluteFillObject,
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
