import { Canvas, Fill, Picture } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { SkPicture, SkSize } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';

type Props = {
  picture: SharedValue<SkPicture>;
  /** Live canvas size in points — drives recordFrame surface scale. */
  onSize: SharedValue<SkSize>;
};

/**
 * Opaque Skia canvas (SurfaceView on Android). Must sit lowest in host z-order (Pattern E).
 * Picture is already recorded at surface size — draw 1:1 full-bleed.
 */
export function SpikeCanvas({ picture, onSize }: Props) {
  return (
    <Canvas style={styles.canvas} opaque onSize={onSize}>
      <Fill color="black" />
      <Picture picture={picture} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
