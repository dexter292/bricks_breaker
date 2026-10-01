import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MAX_FONT_SCALE } from './textScale';

export type HudStripProps = {
  score: number;
  combo: number;
  lives: number;
  stallTier: number;
  showStall: boolean;
  showPause: boolean;
  onPause: () => void;
  /** Safe-area top inset — strip sits under the notch. */
  top: number;
  left: number;
  right: number;
};

/**
 * Compact 48px top HUD strip (UI-SPEC / D-06…D-09).
 * Props are discrete React mirrors only — never SharedValues.
 */
export function HudStrip({
  score,
  combo,
  lives,
  stallTier,
  showStall,
  showPause,
  onPause,
  top,
  left,
  right,
}: HudStripProps) {
  return (
    <View
      style={[
        styles.strip,
        {
          top,
          left,
          right,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.metrics} pointerEvents="none">
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.metric}>{`Score · ${score}`}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.metric}>{`×${combo}`}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.metric}>{`Lives · ${lives}`}</Text>
        {showStall ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.metric}>{`Stall! · ${stallTier}`}</Text>
        ) : null}
      </View>

      {showPause ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pause game"
          onPress={onPause}
          pointerEvents="auto"
          hitSlop={8}
          style={styles.pauseButton}
        >
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.pauseLabel}>
            Pause
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(18,18,31,0.8)',
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 4,
  },
  metric: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  pauseButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  pauseLabel: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});
