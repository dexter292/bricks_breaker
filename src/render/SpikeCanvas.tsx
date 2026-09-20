import {
  Canvas,
  Fill,
  Group,
  Picture,
  fitbox,
  rect,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import type { SkPicture, SkSize } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';

/** Must match core logical play-field (allocate/step). */
const LOGICAL = rect(0, 0, 360, 640);

type Props = {
  picture: SharedValue<SkPicture>;
};

/**
 * Opaque Skia canvas (SurfaceView on Android). Must sit lowest in host z-order (Pattern E).
 * Picture is recorded in logical 360×640 — scale to the full surface via onSize
 * (otherwise content sits 1:1 in the top-left on large phones).
 */
export function SpikeCanvas({ picture }: Props) {
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });

  const transform = useDerivedValue(() => {
    const w = size.value.width;
    const h = size.value.height;
    if (w <= 0 || h <= 0) {
      return [];
    }
    return fitbox('fill', LOGICAL, rect(0, 0, w, h));
  });

  return (
    <Canvas style={styles.canvas} opaque onSize={size}>
      <Fill color="black" />
      <Group transform={transform}>
        <Picture picture={picture} />
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});
