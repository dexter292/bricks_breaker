import { StyleSheet, Text, View } from 'react-native';

type Props = {
  /** Display numeral 3 | 2 | 1 */
  numeral: number;
};

/**
 * Frozen countdown scrim — numerals only (UI-SPEC). No Resume control.
 */
export function CountdownOverlay({ numeral }: Props) {
  return (
    <View style={styles.scrim} pointerEvents="auto">
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
    lineHeight: 48,
    textAlign: 'center',
  },
});
