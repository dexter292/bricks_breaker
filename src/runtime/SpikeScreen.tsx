import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { runOnUI } from 'react-native-worklets';
import { CLIFF_RAMP, PERF_OVERLAY } from '../devflags';
import { SpikeCanvas } from '../render/SpikeCanvas';
import { SPRITE_CAP } from './constants';
import { useSpikeLoop } from './useSpikeLoop';

const CLIFF_STEP = 32;
const CLIFF_MAX = 300;

/**
 * Thin spike host: opaque canvas (lowest z) + optional cliff-ramp control (D-07 / D-13).
 * Cliff control is outside the per-frame path — only writes a SharedValue on press.
 */
export function SpikeScreen() {
  useKeepAwake();

  const { picture, spriteTarget, surfaceSize } = useSpikeLoop(
    PERF_OVERLAY,
    SPRITE_CAP,
  );

  const onCliffRamp = useCallback(() => {
    // Discrete press → UI runtime write only (D-07 / D-14).
    runOnUI((step: number, max: number, reset: number) => {
      'worklet';
      const next = spriteTarget.value + step;
      spriteTarget.value = next > max ? reset : next;
    })(CLIFF_STEP, CLIFF_MAX, SPRITE_CAP);
  }, [spriteTarget]);

  return (
    <View style={styles.root}>
      <SpikeCanvas picture={picture} onSize={surfaceSize} />
      {CLIFF_RAMP ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ramp sprite count"
          onPress={onCliffRamp}
          style={styles.cliffButton}
        >
          <Text style={styles.cliffLabel}>Cliff +{CLIFF_STEP}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  cliffButton: {
    position: 'absolute',
    right: 16,
    bottom: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#00ffaa',
  },
  cliffLabel: {
    color: '#00ffaa',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
