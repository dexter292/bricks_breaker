import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createDefaultProgressStore,
  defaultProgressBlob,
  type ProgressBlob,
  type ProgressStore,
} from '../../src/services/storage';
import { ACHIEVEMENT_CATALOG } from '../../src/services/achievements';

type AchievementsScreenProps = {
  onBack: () => void;
  /** Optional inject for tests; default createDefaultProgressStore() */
  store?: ProgressStore;
};

type Marker = 'Locked' | 'Unlocked' | 'New';

/**
 * Achievements screen (N-ACH-03 / N-UI-02, 14-05).
 *
 * All twelve `ACHIEVEMENT_CATALOG` entries render always, in catalog declaration order,
 * with their name AND description in both the locked and unlocked state (D-08, SC-3) — no
 * sort, no filter, no grouping.
 *
 * **The first production `testID` in this repo.** `testID="achievements-scroll"` on the
 * `ScrollView` below. `git grep testID src app` is zero elsewhere; every occurrence in the
 * repo is inside a `vi.mock` factory. This screen's fixed-header-outside-the-scroll
 * structure has no in-repo render-tree analog to assert on, react-native-web's internal
 * class names are brittle to assert on directly, and a source contract alone cannot
 * observe a render tree — so a `testID` is the minimum instrument that makes the
 * load-bearing half of that structure observable. It is inert in production.
 */
export function AchievementsScreen({ onBack, store: storeProp }: AchievementsScreenProps) {
  const insets = useSafeAreaInsets();
  const store = useMemo(
    () => storeProp ?? createDefaultProgressStore(),
    [storeProp],
  );
  const [progress, setProgress] = useState<ProgressBlob>(() =>
    defaultProgressBlob(),
  );
  /**
   * The unseen ids AT THE MOMENT OF THE READ (D-11, D-12) — deliberately NOT derived from
   * `progress` with a `useMemo` or selector. Opening this screen also CLEARS the stored
   * unseen set (the seen write below, same `.then()`), and if the New marker were derived
   * from the live snapshot it would vanish the instant the clear lands — invisible in the
   * one case it exists to show. This frozen copy is read once at mount and never updated
   * again, so the marks the player is looking at cannot be erased out from under them by
   * the write their own visit triggered.
   */
  const [unseenAtMount, setUnseenAtMount] = useState<readonly string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void store
      .getSnapshot()
      .then((snap) => {
        if (cancelled) return;
        setProgress(snap);
        setUnseenAtMount(snap.telemetry.achievements.unseen);
        // D-12: opening this screen IS the seen event — no confirmation, because the
        // write records that the player looked at a list and destroys nothing. Optional
        // call + swallowed catch: several test harnesses build their store as a bare
        // object literal inside a vi.mock factory and are not contextually typed as
        // ProgressStore, so this must not throw when the method is absent. A failed
        // write simply re-shows the marks on the next open (accepted cost) — it is NOT
        // hoisted out of this success arm, because a failed READ must write nothing.
        void store.markAchievementsSeen?.().catch(() => {});
      })
      .catch(() => {
        if (!cancelled) {
          setProgress(defaultProgressBlob());
          setUnseenAtMount([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const unlockedIds = useMemo(
    () => new Set(progress.telemetry.achievements.unlocked.map((e) => e.id)),
    [progress],
  );
  const unseenIds = useMemo(() => new Set(unseenAtMount), [unseenAtMount]);

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

        <Text style={styles.heading}>Achievements</Text>

        <ScrollView
          testID="achievements-scroll"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {ACHIEVEMENT_CATALOG.map((entry) => {
            const isUnlocked = unlockedIds.has(entry.id);
            const marker: Marker = !isUnlocked
              ? 'Locked'
              : unseenIds.has(entry.id)
                ? 'New'
                : 'Unlocked';
            const a11yState =
              marker === 'New'
                ? 'unlocked, new'
                : marker === 'Unlocked'
                  ? 'unlocked'
                  : 'locked';

            return (
              <View
                key={entry.id}
                style={styles.row}
                accessibilityLabel={`${entry.name}, ${a11yState}. ${entry.description}`}
              >
                <View style={styles.rowHeader}>
                  <Text
                    style={[styles.name, isUnlocked && styles.nameUnlocked]}
                    numberOfLines={1}
                  >
                    {entry.name}
                  </Text>
                  <Text
                    style={[styles.marker, marker === 'New' && styles.markerNew]}
                    numberOfLines={1}
                  >
                    {marker}
                  </Text>
                </View>
                <Text style={styles.description}>{entry.description}</Text>
              </View>
            );
          })}
        </ScrollView>
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
  scroll: {
    flex: 1,
    marginTop: 24,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
  },
  row: {
    gap: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  name: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    flexShrink: 1,
  },
  nameUnlocked: {
    fontWeight: '600',
  },
  marker: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  markerNew: {
    fontWeight: '600',
  },
  description: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});
