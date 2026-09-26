import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  kind: 'win' | 'lose';
  /**
   * Which record domain this overlay is showing (11-08 / gap 2). The two modes share
   * one component precisely so neither can read the other's numbers: everything mode
   * specific is a prop selected by the host, and nothing in here reaches storage.
   */
  mode: 'campaign' | 'endless';
  score: number;
  /** Campaign: the level PB. Endless: `telemetry.endless.bestScore`, post-merge. */
  best: number;
  /** Endless only — the wave this run reached (11-UI-SPEC § Endless copy line 1). */
  wave: number;
  /** Endless only — `telemetry.endless.bestWave`, post-merge (line 4). */
  bestWave: number;
  isNewRecord: boolean;
  /**
   * Endless only — the wave that could NOT be built, or null (11-07 Task 4).
   *
   * The FAILED wave, not the last good one, which is what lets one number pick the
   * body copy with no arithmetic and no second flag. A mid-run failure is always
   * `waveRef.current + 1`, and `waveRef` is 1 from the first successful build, so a
   * mid-run value is always >= 2. A Retry-time failure is always exactly 1 — a Retry
   * that cannot build wave 1 is by construction a wave-1 failure. The two cases are
   * therefore distinguishable from the value alone.
   */
  waveBuildFailedWave?: number | null;
  /** Win only — merged best stars after handleRunEnded (D-10). */
  stars?: 1 | 2 | 3 | null;
  onRetry: () => void;
  onMenu: () => void;
  /** Omit Next when null/undefined (D-11); do not show a gated-off control. */
  onNext?: (() => void) | null;
};

function StarRow({ filled }: { filled: 1 | 2 | 3 }) {
  const glyphs = [0, 1, 2].map((i) => ({
    glyph: i < filled ? '★' : '☆',
    filled: i < filled,
  }));
  return (
    <View
      style={styles.starsRow}
      accessibilityLabel={`${filled} of 3 stars`}
    >
      {glyphs.map((g, i) => (
        <Text
          key={i}
          style={[
            styles.starGlyph,
            g.filled ? styles.starFilled : styles.starEmpty,
          ]}
        >
          {g.glyph}
        </Text>
      ))}
    </View>
  );
}

/**
 * Win / Lose overlay + Score/Best/New Record + Retry + Next? + Menu (UI-SPEC D-11/D-12).
 * No confirmation. Centered in safe area. Next control omitted when gated off (D-11).
 */
export function ResultOverlay({
  kind,
  mode,
  score,
  best,
  wave,
  bestWave,
  isNewRecord,
  waveBuildFailedWave = null,
  stars,
  onRetry,
  onMenu,
  onNext,
}: Props) {
  const insets = useSafeAreaInsets();
  const isEndless = mode === 'endless';
  /**
   * SC-1: an endless run never ends on a cleared wave — a cleared board is a WAVE
   * boundary, intercepted in `applyChrome` before any run-end branch. So `kind` is
   * always the lose variant in endless, and 11-UI-SPEC § Endless copy says the `Win`
   * heading, the `All clear` body, the star row and the `Next` control are
   * "unreachable and must not render". Forcing it here rather than trusting the
   * caller means a future caller that passes `stars` or `onNext` in endless — the
   * campaign-shaped mistake — cannot put campaign chrome on an endless overlay.
   */
  const isWin = kind === 'win' && !isEndless;
  const showNext = isWin && typeof onNext === 'function';
  const showStars =
    isWin && (stars === 1 || stars === 2 || stars === 3);
  /**
   * 11-UI-SPEC § Endless copy, the two `Wave-build failure body` rows. `1` is the
   * Retry-time case and says `tap Retry`; anything above is mid-run and says
   * `run saved`. The mid-run wording is deliberately NOT reused at Retry time —
   * there is no in-flight run to save, so it would state something untrue
   * (11-07 Task 3, decided `retry-in-place` by the owner on 2026-09-26). `Wave 1` in
   * the Retry-time string is contract copy and is NOT templated.
   */
  const failedWave = isEndless ? waveBuildFailedWave : null;
  const body =
    failedWave == null
      ? isWin
        ? 'All clear'
        : 'Out of lives'
      : failedWave <= 1
        ? 'Wave 1 could not be built — tap Retry'
        : `Wave ${failedWave} could not be built — run saved`;

  return (
    <View
      style={[
        styles.scrim,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
      pointerEvents="auto"
    >
      <View style={styles.panel}>
        <Text style={[styles.heading, !isWin && styles.loseHeading]}>
          {isWin ? 'Win' : 'Lose'}
        </Text>
        <Text style={styles.body}>{body}</Text>
        {/*
          11-UI-SPEC § Endless copy, "Line order is contract": heading → body →
          `Wave ·` → `Score ·` → `Best ·` → `Best wave ·` → badge → Retry → Menu.
          Wave precedes score because depth is what an endless run is about, and the
          two `Best` lines sit adjacent so the pair reads as ONE record block. Both
          endless lines reuse `styles.metric` verbatim — no new size, weight or color,
          and deliberately no tint distinguishing the two records: electing a primary
          record is the Phase 14 decision this contract refuses to make (A-08).
        */}
        {isEndless ? (
          <Text style={styles.metric}>Wave · {wave}</Text>
        ) : null}
        <Text style={styles.metric}>Score · {score}</Text>
        <Text style={styles.metric}>Best · {best}</Text>
        {isEndless ? (
          <Text style={styles.metric}>Best wave · {bestWave}</Text>
        ) : null}
        {showStars ? <StarRow filled={stars} /> : null}
        {isNewRecord ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>New Record</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          // 11-UI-SPEC § Accessibility labels, the endless `Retry` row. `Retry level`
          // is FALSE in endless: there is no level, and after 11-07 the control
          // restarts a new run at wave 1 rather than refilling the current board. The
          // VISIBLE label is unchanged — only what a screen reader announces differs.
          accessibilityLabel={
            isEndless ? 'Retry endless run from wave 1' : 'Retry level'
          }
          onPress={onRetry}
          style={[styles.button, styles.retrySpaced]}
        >
          <Text style={styles.buttonLabel}>Retry</Text>
        </Pressable>
        {showNext ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play next level"
            onPress={onNext}
            style={[styles.button, styles.buttonSpaced]}
          >
            <Text style={styles.buttonLabel}>Next</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to title"
          onPress={onMenu}
          style={[styles.menuButton, styles.buttonSpaced]}
        >
          <Text style={styles.menuLabel}>Menu</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    backgroundColor: '#12121f',
    padding: 24,
    minWidth: 200,
    maxWidth: 320,
    alignItems: 'stretch',
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  loseHeading: {
    color: '#E85D5D',
  },
  body: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  metric: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
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
  starEmpty: {
    color: '#6B7280',
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: '#F2CC8F',
    padding: 4,
    marginBottom: 16,
  },
  badgeLabel: {
    color: '#1a1a2e',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  retrySpaced: {
    marginTop: 16,
  },
  buttonSpaced: {
    marginTop: 16,
  },
  buttonLabel: {
    color: '#1a1a2e',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  menuButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12121f',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  menuLabel: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});
