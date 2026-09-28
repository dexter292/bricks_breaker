import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, type ComposedGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SharedValue } from 'react-native-reanimated';
import type { SkPicture, SkSize } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { GameCanvas } from '../render/GameCanvas';
import type { ValidationIssue } from './loadLevel';
import { HudStrip } from './HudStrip';
import { CountdownOverlay } from './overlays/CountdownOverlay';
import { LevelErrorOverlay } from './overlays/LevelErrorOverlay';
import { PauseOverlay } from './overlays/PauseOverlay';
import { ResultOverlay } from './overlays/ResultOverlay';
import { DailyResultOverlay } from './overlays/DailyResultOverlay';

export type GameScreenUiPhase = 'playing' | 'paused' | 'countdown';

/** Mirror SimPhase.PLAYING — app/runtime must not import src/core (LC-05). */
const SIM_PLAYING = 1;

/** HUD strip content height (UI-SPEC) — playfield starts below notch + strip. */
const HUD_STRIP_CONTENT = 48;

export type GameScreenProps = {
  picture: SharedValue<SkPicture>;
  surfaceSize: SharedValue<SkSize>;
  playfieldGesture: ComposedGesture;
  uiPhase: GameScreenUiPhase;
  result: null | 'win' | 'lose';
  lives: number;
  score: number;
  best: number;
  /**
   * Which record domain the Results overlay is reading (11-08 / gap 2; 12-01 adds
   * `'daily'`). `src/runtime` receives plain numbers and a discriminant — it never
   * imports the storage layer, so the boundaries matrix is unchanged (LC-05).
   *
   * `'daily'` routes to `DailyResultOverlay`, a SEPARATE component.
   * `ResultOverlay.mode` keeps its two-value type and is never widened (12-UI-SPEC
   * § A new component) — the route below narrows rather than widening.
   */
  mode: 'campaign' | 'endless' | 'daily';
  /**
   * Daily only — the stored `YYYY-MM-DD` key of the date being shown, rendered
   * verbatim with no formatting step (N-DAILY-01 / SC-1). Required rather than
   * defaulted: a blank fallback would render `Daily · ` on a real panel, and the host
   * always knows the date by the time a daily result exists.
   */
  dailyDateKey: string;
  /**
   * Daily only — the streak block and the countdown, as SCALARS (12-05).
   *
   * Seven flat props rather than one object, following the shipped `wave` /
   * `bestWave` / `waveBuildFailedWave` precedent. Flatness is what makes SC-5
   * checkable by READING this type: there is no per-level best, no campaign personal
   * best, no endless record and no star count anywhere in the daily group, and an
   * object prop would put that guarantee one indirection away.
   *
   * Required rather than optional-with-a-default, for the reason 12-01 gave for
   * `dailyDateKey`: a zero default is a silent path to rendering `Streak · 0`, a state
   * `12-UI-SPEC.md § Empty and zero states` marks UNREACHABLE on this panel.
   */
  dailyStreak: number;
  /** Daily only — `DailyRecord.longestStreak`, the lifetime maximum (D-16). */
  dailyLongestStreak: number;
  /** Daily only — `DailyRecord.totalDaysPlayed` (D-16). */
  dailyTotalDaysPlayed: number;
  /**
   * Daily only — the already-derived length of the streak that just ended, or null
   * (D-17). Null means OMIT the line; the panel never substitutes the lifetime
   * longest streak for a length it could not derive.
   */
  dailyEndedStreakLength: number | null;
  /**
   * Daily only — the instant the countdown is computed against, INJECTED from the
   * host (`12-UI-SPEC.md` § Clock policy). `src/runtime` receives an instant, never a
   * clock: the panel reading one during its own render would fail
   * `react-hooks/purity` and would make the rollover and sub-minute cases untestable.
   */
  dailyNowMs: number;
  /** Daily only — the next local-midnight instant, calendar arithmetic in the host. */
  dailyNextBoundaryMs: number;
  /** Endless only — the wave this run reached (11-UI-SPEC § Endless copy line 1). */
  wave: number;
  /** Endless only — `telemetry.endless.bestWave`, post-merge (line 4). */
  bestWave: number;
  /**
   * Endless only — the wave that could not be built, or null. Replaces the lose body
   * with the wave-build-failure copy; the four metric lines still render.
   * Deliberately NOT routed to `LevelErrorOverlay`: that overlay has no controls and
   * `showResult` is suppressed while `levelError` is set, which would leave the
   * player facing a live sim behind a modal with no exit (11-UI-SPEC `Error state
   * (board)`).
   */
  waveBuildFailedWave?: number | null;
  isNewRecord: boolean;
  combo: number;
  stallTier: number;
  /** Numeric SimPhase mirror from host (0=DOCKED, 1=PLAYING, …). */
  simPhaseNum?: number;
  countdownNumeral: number | null;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onMenu: () => void;
  /** Win stars from blob after handleRunEnded (optional until PlayingHost wires C2-03). */
  stars?: 1 | 2 | 3 | null;
  /** Next CTA — omit control when null/undefined (D-11). */
  onNext?: (() => void) | null;
  /** Optional docked serve hint (UI-SPEC). */
  showServeHint?: boolean;
  /** Validation failure — blocks pause/result chrome (D-13). */
  levelError?: ValidationIssue[] | null;
  /** __DEV__-only level switch control (D-11). */
  devLevelSwitch?: ReactNode;
};

/**
 * Playfield letterboxes inside the safe area below the HUD strip (black root = bars).
 * HUD + overlays are explicitly absolute so they cannot fall to the bottom.
 */
export function GameScreen({
  picture,
  surfaceSize,
  playfieldGesture,
  uiPhase,
  result,
  lives,
  score,
  best,
  mode,
  dailyDateKey,
  dailyStreak,
  dailyLongestStreak,
  dailyTotalDaysPlayed,
  dailyEndedStreakLength,
  dailyNowMs,
  dailyNextBoundaryMs,
  wave,
  bestWave,
  waveBuildFailedWave = null,
  isNewRecord,
  combo,
  stallTier,
  simPhaseNum = 0,
  countdownNumeral,
  onPause,
  onResume,
  onRetry,
  onMenu,
  stars = null,
  onNext = null,
  showServeHint = false,
  levelError = null,
  devLevelSwitch = null,
}: GameScreenProps) {
  const insets = useSafeAreaInsets();
  const hasLevelError = levelError != null && levelError.length > 0;

  const showPauseChrome =
    !hasLevelError && uiPhase === 'playing' && result == null;
  const showPauseOverlay =
    !hasLevelError && uiPhase === 'paused' && result == null;
  const showCountdown =
    !hasLevelError &&
    uiPhase === 'countdown' &&
    result == null &&
    countdownNumeral != null;
  const showResult = !hasLevelError && result != null;
  // D-09 / D-18: stall persists across life reset, but chrome only during active play.
  const showStall =
    stallTier > 0 &&
    result == null &&
    uiPhase === 'playing' &&
    simPhaseNum === SIM_PLAYING;

  const playfieldTop = insets.top + HUD_STRIP_CONTENT;
  const padR = Math.max(insets.right, 16);

  return (
    <View style={styles.root}>
      {/* Safe-area playfield below HUD strip — Skia letterboxes into this box (D-14/D-15). */}
      <View
        style={[
          styles.playfieldSafe,
          {
            top: playfieldTop,
            bottom: insets.bottom,
            left: insets.left,
            right: insets.right,
          },
        ]}
      >
        <GestureDetector gesture={playfieldGesture}>
          <View style={styles.playfield} collapsable={false}>
            <GameCanvas picture={picture} onSize={surfaceSize} />
          </View>
        </GestureDetector>
      </View>

      {/* Chrome above opaque canvas — every child is position:absolute. */}
      <View style={styles.chrome} pointerEvents="box-none">
        <HudStrip
          score={score}
          combo={combo}
          lives={lives}
          stallTier={stallTier}
          showStall={showStall}
          showPause={showPauseChrome}
          onPause={onPause}
          top={insets.top}
          left={insets.left}
          right={insets.right}
        />

        {showServeHint && showPauseChrome ? (
          <Text
            pointerEvents="none"
            style={[
              styles.serveHint,
              { bottom: Math.max(insets.bottom, 16) + 48 },
            ]}
          >
            Tap to launch
          </Text>
        ) : null}

        {showPauseOverlay ? (
          <PauseOverlay
            onResume={onResume}
            onRetry={onRetry}
            onMenu={onMenu}
          />
        ) : null}

        {showCountdown ? (
          <CountdownOverlay numeral={countdownNumeral} />
        ) : null}

        {/*
          12-UI-SPEC § A new component: daily gets its own overlay rather than a third
          arm on `ResultOverlay`. The ternary NARROWS — inside the else branch `mode` is
          `'campaign' | 'endless'`, which is what lets `ResultOverlay.mode` keep its
          two-value type. Widening that prop instead would put a campaign/endless-shaped
          `best`, `wave`, `bestWave`, `stars` and `onNext` on a panel for which every
          one of them is meaningless.
        */}
        {showResult ? (
          mode === 'daily' ? (
            <DailyResultOverlay
              kind={result!}
              dateKey={dailyDateKey}
              score={score}
              streak={dailyStreak}
              longestStreak={dailyLongestStreak}
              totalDaysPlayed={dailyTotalDaysPlayed}
              endedStreakLength={dailyEndedStreakLength}
              nowMs={dailyNowMs}
              nextBoundaryMs={dailyNextBoundaryMs}
              onMenu={onMenu}
            />
          ) : (
            <ResultOverlay
              kind={result!}
              mode={mode}
              score={score}
              best={best}
              wave={wave}
              bestWave={bestWave}
              waveBuildFailedWave={waveBuildFailedWave}
              isNewRecord={isNewRecord}
              stars={stars}
              onRetry={onRetry}
              onMenu={onMenu}
              onNext={onNext}
            />
          )
        ) : null}

        {hasLevelError ? <LevelErrorOverlay issues={levelError!} /> : null}

        {/* Above pause/result scrims so __DEV__ level cycle stays tappable during smoke. */}
        {devLevelSwitch != null ? (
          <View
            style={[
              styles.devSwitchSlot,
              {
                top: insets.top + HUD_STRIP_CONTENT + 8,
                right: padR,
                zIndex: 20,
              },
            ]}
            pointerEvents="box-none"
          >
            {devLevelSwitch}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  playfieldSafe: {
    position: 'absolute',
  },
  playfield: {
    flex: 1,
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
  },
  serveHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  devSwitchSlot: {
    position: 'absolute',
  },
});
