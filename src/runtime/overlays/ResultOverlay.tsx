import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  kind: 'win' | 'lose';
  onRetry: () => void;
};

/**
 * Minimal Win / Lose overlay + Retry (UI-SPEC D-17…D-19). No confirmation.
 */
export function ResultOverlay({ kind, onRetry }: Props) {
  const isWin = kind === 'win';
  return (
    <View style={styles.scrim} pointerEvents="auto">
      <View style={styles.panel}>
        <Text style={[styles.heading, !isWin && styles.loseHeading]}>
          {isWin ? 'Win' : 'Lose'}
        </Text>
        <Text style={styles.body}>
          {isWin ? 'All clear' : 'Out of lives'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry level"
          onPress={onRetry}
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>Retry</Text>
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
    gap: 32,
    minWidth: 200,
    alignItems: 'stretch',
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
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
});
