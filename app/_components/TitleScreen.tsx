import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  best: number;
  onPlay: () => void;
};

/**
 * Cold-start Title shell (UI-SPEC / D-01, D-02, D-12).
 * Brand → Best · N → Play. No ads/shop/login chrome (D-18).
 */
export function TitleScreen({ best, onPlay }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.brand}>Neon Brick Breaker</Text>
        <Text style={styles.best}>{`Best · ${best}`}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start game"
          onPress={onPlay}
          style={styles.playButton}
        >
          <Text style={styles.playLabel}>Play</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 48,
    fontWeight: '600',
    lineHeight: 48,
    textAlign: 'center',
  },
  best: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 24,
  },
  playButton: {
    marginTop: 64,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  playLabel: {
    color: '#1a1a2e',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
});
