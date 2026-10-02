import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DISPLAY_NAME } from '../_brand';
import { MAX_FONT_SCALE } from '../../src/runtime/textScale';

type Props = {
  best: number;
  /** Whether today's local date already has a stored daily result (N-UI-01 / D-05). */
  dailyPlayedToday: boolean;
  /** `currentDailyStreak` over the stored record — rendered only when played today. */
  dailyStreak: number;
  /** Count of unseen achievement unlocks; zero renders as an absence, never `0 new`. */
  unseenCount: number;
  onCampaign: () => void;
  onEndless: () => void;
  onDaily: () => void;
  onStats: () => void;
  onAchievements: () => void;
};

/**
 * Cold-start Title shell — the seven-row composition (N-UI-01 / N-UI-02, 14-06).
 * Brand → Best · N → Campaign → Endless → Daily → Statistics → Achievements.
 * No ads/shop/login chrome (D-18). Never scrolls (D-01/D-02/D-03).
 */
export function TitleScreen({
  best,
  dailyPlayedToday,
  dailyStreak,
  unseenCount,
  onCampaign,
  onEndless,
  onDaily,
  onStats,
  onAchievements,
}: Props) {
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
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.brand}>
          {DISPLAY_NAME}
        </Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.best}>
          {`Best · ${best}`}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play campaign mode"
          onPress={onCampaign}
          style={styles.modeButtonFirst}
        >
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.modeLabel}
            numberOfLines={1}
          >
            Campaign
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play endless mode"
          onPress={onEndless}
          style={styles.modeButton}
        >
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.modeLabel}
            numberOfLines={1}
          >
            Endless
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            dailyPlayedToday
              ? `Daily, played today, ${dailyStreak}-day streak`
              : "Play today's daily challenge"
          }
          onPress={onDaily}
          style={[styles.modeButton, styles.modeButtonRow]}
        >
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.modeLabel}
            numberOfLines={1}
          >
            Daily
          </Text>
          {dailyPlayedToday ? (
            <Text
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={styles.modeMeta}
              numberOfLines={1}
            >
              {`Played · ${dailyStreak}-day streak`}
            </Text>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View statistics"
          onPress={onStats}
          style={styles.secondaryButtonFirst}
        >
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.secondaryLabel}
            numberOfLines={1}
          >
            Statistics
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            unseenCount > 0
              ? `View achievements, ${unseenCount} new`
              : 'View achievements'
          }
          onPress={onAchievements}
          style={[styles.secondaryButton, styles.secondaryButtonRow]}
        >
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={styles.secondaryLabel}
            numberOfLines={1}
          >
            Achievements
          </Text>
          {unseenCount > 0 ? (
            <Text
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={styles.secondaryMeta}
              numberOfLines={1}
            >
              {`${unseenCount} new`}
            </Text>
          ) : null}
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
    alignItems: 'stretch',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 320,
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
  modeButtonFirst: {
    marginTop: 24,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  modeButton: {
    marginTop: 16,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  modeButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeLabel: {
    color: '#1a1a2e',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  modeMeta: {
    color: '#1a1a2e',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  secondaryButtonFirst: {
    marginTop: 24,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  secondaryButton: {
    marginTop: 8,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  secondaryButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryLabel: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  secondaryMeta: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});
