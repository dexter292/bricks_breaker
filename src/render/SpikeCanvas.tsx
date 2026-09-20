import { Canvas, Fill, Picture } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { SkPicture } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';

type Props = {
  picture: SharedValue<SkPicture>;
};

/**
 * Opaque Skia canvas (SurfaceView on Android). Must sit lowest in host z-order (Pattern E).
 */
export function SpikeCanvas({ picture }: Props) {
  return (
    <Canvas style={styles.canvas} opaque>
      <Fill color="black" />
      <Picture picture={picture} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});
