import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  /**
   * Which mode the paused run belongs to (12-05). It changes exactly ONE thing: what a
   * screen reader announces for `Retry`. Every visible label, every style and every
   * other prop is identical across modes — this is not a new component and not a
   * variant, it is one spoken string that would otherwise be false.
   */
  mode: 'campaign' | 'endless' | 'daily';
  onResume: () => void;
  onRetry: () => void;
  onMenu: () => void;
};

/**
 * Full-screen pause scrim + panel (UI-SPEC). Resume is Pressable-only — never a playfield tap.
 * Resume → Retry → Menu (outline). No confirmation (D-03 / RUN-03).
 * Centered in the safe area (not under notch / Dynamic Island).
 */
export function PauseOverlay({ mode, onResume, onRetry, onMenu }: Props) {
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
          // 12-UI-SPEC § Accessibility labels, the daily `Pause Retry` row, following
          // the shipped mode-dependent-spoken-label precedent in `ResultOverlay`.
          // The shipped campaign label is FALSE during a daily run, for its own
          // reason: this restarts the SAME date-derived board (D-08), not a level and
          // not a new seed — re-minting one would break SC-1 outright. The VISIBLE
          // label is unchanged; only what a screen reader announces differs, and the
          // campaign string appears exactly ONCE below, inside the ternary, so the two
          // branches cannot drift into two hardcoded labels.
          accessibilityLabel={
            mode === 'daily' ? "Restart today's board" : 'Retry level'
          }
          onPress={onRetry}
          style={[styles.button, styles.buttonSpaced]}
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
