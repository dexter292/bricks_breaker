import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onResume: () => void;
  onRetry: () => void;
};

/**
 * Full-screen pause scrim + panel (UI-SPEC). Resume is Pressable-only — never a playfield tap.
 * Centered in the safe area (not under notch / Dynamic Island).
 */
export function PauseOverlay({ onResume, onRetry }: Props) {
  const insets = useSafeAreaInsets();
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
        <Text style={styles.heading}>Paused</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resume game"
          onPress={onResume}
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>Resume</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry level"
          onPress={onRetry}
          style={[styles.button, styles.buttonSpaced]}
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
    marginBottom: 32,
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
});
