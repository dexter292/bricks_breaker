import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DAILY_TELEMETRY_KEY,
  ENDLESS_TELEMETRY_KEY,
  PLAYABLE_LEVEL_ORDER,
  createDefaultProgressStore,
  defaultProgressBlob,
  defaultTelemetryAggregate,
  type ProgressBlob,
  type ProgressStore,
} from '../../src/services/storage';
import { LEVEL_LABEL } from './SelectScreen';
import { MAX_FONT_SCALE } from '../../src/runtime/textScale';

type StatisticsScreenProps = {
  onBack: () => void;
  /** Optional inject for tests; default createDefaultProgressStore() */
  store?: ProgressStore;
};

type StatRowProps = {
  label: string;
  meta: string;
  accessibilityLabel: string;
};

/**
 * The one row renderer for all ten rows (N-STAT-03, 14-03) — both lifetime rows and By
 * mode rows render through this and nothing else, which is what makes "every row is
 * truncation-clamped" a structural property rather than a counted one.
 */
function StatRow({ label, meta, accessibilityLabel }: StatRowProps) {
  return (
    <View style={styles.row} accessibilityLabel={accessibilityLabel}>
      <Text
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={styles.rowLabel}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={styles.rowMeta}
        numberOfLines={1}
      >
        {meta}
      </Text>
    </View>
  );
}

/**
 * Statistics screen (N-STAT-03 / N-UI-02, 14-03).
 *
 * Reads the player's record exactly ONCE per mount (SC-2) and derives nothing (D-15):
 * every rendered number is a field of `telemetry.lifetime` or `telemetry.byMode` read
 * directly. A read failure degrades to zeros with no error copy — there is no boundary,
 * no banner and no retry affordance anywhere on this screen.
 */
export function StatisticsScreen({ onBack, store: storeProp }: StatisticsScreenProps) {
  const insets = useSafeAreaInsets();
  const store = useMemo(
    () => storeProp ?? createDefaultProgressStore(),
    [storeProp],
  );
  const [progress, setProgress] = useState<ProgressBlob>(() =>
    defaultProgressBlob(),
  );

  useEffect(() => {
    let cancelled = false;
    void store
      .getSnapshot()
      .then((snap) => {
        if (!cancelled) setProgress(snap);
      })
      .catch(() => {
        if (!cancelled) setProgress(defaultProgressBlob());
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const { lifetime, byMode } = progress.telemetry;
  const endless = byMode.endless[ENDLESS_TELEMETRY_KEY] ?? defaultTelemetryAggregate();
  const daily = byMode.daily[DAILY_TELEMETRY_KEY] ?? defaultTelemetryAggregate();

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to title"
          onPress={onBack}
          style={styles.backButton}
        >
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.backLabel}>
            Back
          </Text>
        </Pressable>

        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.heading}>
          Statistics
        </Text>

        <View style={styles.lifetimeBlock}>
          <StatRow
            label="Bricks broken"
            meta={`${lifetime.bricksBroken}`}
            accessibilityLabel={`Bricks broken: ${lifetime.bricksBroken}`}
          />
          <StatRow
            label="Best combo"
            meta={`${lifetime.bestComboEver}`}
            accessibilityLabel={`Best combo: ${lifetime.bestComboEver}`}
          />
          <StatRow
            label="Longest rally"
            meta={`${lifetime.longestRallyEver}`}
            accessibilityLabel={`Longest rally: ${lifetime.longestRallyEver}`}
          />
        </View>

        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sectionLabel}>
          By mode
        </Text>

        <View style={styles.table}>
          {PLAYABLE_LEVEL_ORDER.map((id) => {
            const aggregate = byMode.campaign[id] ?? defaultTelemetryAggregate();
            const label = LEVEL_LABEL[id];
            return (
              <StatRow
                key={id}
                label={label}
                meta={`${aggregate.runsWon} won · ${aggregate.runsPlayed} runs`}
                accessibilityLabel={`${label}: ${aggregate.runsWon} won of ${aggregate.runsPlayed} runs`}
              />
            );
          })}
          <StatRow
            label="Endless"
            meta={`${endless.runsPlayed} runs`}
            accessibilityLabel={`Endless: ${endless.runsPlayed} runs`}
          />
          <StatRow
            label="Daily"
            meta={`${daily.runsWon} won · ${daily.runsPlayed} runs`}
            accessibilityLabel={`Daily: ${daily.runsWon} won of ${daily.runsPlayed} runs`}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
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
  backLabel: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 24,
  },
  lifetimeBlock: {
    marginTop: 24,
    gap: 4,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginTop: 16,
    marginBottom: 4,
  },
  table: {
    gap: 2,
  },
  row: {
    // No minHeight/44pt tap target: these rows are not interactive (no
    // accessibilityRole="button"), so the SelectScreen tap-target convention does
    // not apply — the vertical budget for ten rows on one non-scrolling screen
    // (UI-SPEC § S2) does not have room for it.
    paddingVertical: 2,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  rowMeta: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
});
