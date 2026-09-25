import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LevelId } from '../../src/runtime/loadLevel';
import {
  PLAYABLE_LEVEL_ORDER,
  createDefaultProgressStore,
  defaultProgressBlob,
  selectRowState,
  type ProgressBlob,
  type ProgressStore,
} from '../../src/services/storage';

type SelectScreenProps = {
  onBack: () => void;
  onChoose: (id: LevelId) => void;
  /** Optional inject for tests; default createDefaultProgressStore() */
  store?: ProgressStore;
};

const LEVEL_LABEL: Record<(typeof PLAYABLE_LEVEL_ORDER)[number], string> = {
  'level-01': 'Level 01',
  'level-03': 'Level 03',
  'level-04': 'Level 04',
  'level-05': 'Level 05',
  'level-06': 'Level 06',
};

function starGlyphs(filled: number): { glyph: string; filled: boolean }[] {
  const n = Math.max(0, Math.min(3, filled));
  return [0, 1, 2].map((i) => ({
    glyph: i < n ? '★' : '☆',
    filled: i < n,
  }));
}

/**
 * Level select shell (N-LVL-02 / D-17…D-21 / D-23 / D-25).
 * Mount getSnapshot every visit; three row states; locked tap ignore.
 */
export function SelectScreen({ onBack, onChoose, store: storeProp }: SelectScreenProps) {
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
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <Text style={styles.heading}>Levels</Text>

        <View style={styles.list}>
          {PLAYABLE_LEVEL_ORDER.map((id) => {
            const label = LEVEL_LABEL[id];
            const best = progress.bestByLevel[id];
            const state = selectRowState(id, progress.unlocked, best);
            const locked = state === 'locked';

            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={
                  locked ? `${label} locked` : `Play ${label}`
                }
                accessibilityState={{ disabled: locked }}
                disabled={locked}
                onPress={() => {
                  if (locked) return;
                  onChoose(id);
                }}
                style={styles.row}
              >
                <Text style={[styles.rowLabel, locked && styles.muted]}>
                  {label}
                </Text>
                {locked ? (
                  <Text style={[styles.lockedAffordance, styles.muted]}>
                    Locked
                  </Text>
                ) : (
                  <View style={styles.rowMeta}>
                    <StarRow
                      filled={
                        state === 'cleared' &&
                        (best?.stars === 1 ||
                          best?.stars === 2 ||
                          best?.stars === 3)
                          ? best.stars
                          : 0
                      }
                      a11y={
                        state === 'cleared' &&
                        (best?.stars === 1 ||
                          best?.stars === 2 ||
                          best?.stars === 3)
                          ? `${best.stars} of 3 stars`
                          : undefined
                      }
                    />
                    {state === 'cleared' && best != null ? (
                      <Text style={styles.best}>{`Best · ${best.score}`}</Text>
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function StarRow({
  filled,
  a11y,
}: {
  filled: number;
  a11y?: string;
}) {
  const glyphs = starGlyphs(filled);
  // Uncleared / legacy cleared-without-stars: compact ☆☆☆ for queryability
  if (filled === 0) {
    return (
      <Text
        style={styles.emptyStars}
        accessibilityLabel={a11y}
      >
        ☆☆☆
      </Text>
    );
  }
  return (
    <View
      style={styles.starsRow}
      accessibilityLabel={a11y}
    >
      {glyphs.map((g, i) => (
        <Text
          key={i}
          style={[styles.starGlyph, g.filled ? styles.starFilled : styles.muted]}
        >
          {g.glyph}
        </Text>
      ))}
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
    marginTop: 32,
    marginBottom: 0,
  },
  list: {
    marginTop: 32,
    gap: 8,
  },
  row: {
    minHeight: 44,
    paddingVertical: 12,
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
  muted: {
    color: '#6B7280',
  },
  lockedAffordance: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starGlyph: {
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  starFilled: {
    color: '#FFFFFF',
  },
  emptyStars: {
    color: '#6B7280',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  best: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
});
