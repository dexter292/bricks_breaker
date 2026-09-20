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
 * Opaque Skia canvas (SurfaceView on Android). Must sit lowest in host z-order.
 * Picture is already recorded at surface size — draw 1:1 full-bleed.
 */
export function GameCanvas({ picture, onSize }: Props) {
  return (
    <Canvas style={styles.canvas} opaque onSize={onSize}>
      {/* Navy fallback so a missing Picture is never pure black */}
      <Fill color="#1a1a2e" />
      <Picture picture={picture} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});
