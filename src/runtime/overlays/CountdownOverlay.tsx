import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  /** Display numeral 3 | 2 | 1 */
  numeral: number;
};

/**
 * Frozen countdown scrim — numerals only (UI-SPEC). No Resume control.
 * Centered in the safe area (not under notch / Dynamic Island).
 */
export function CountdownOverlay({ numeral }: Props) {
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
      <Text style={styles.numeral}>{String(numeral)}</Text>
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
  numeral: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 48,
    fontWeight: '600',
    lineHeight: 56,
    textAlign: 'center',
  },
});
