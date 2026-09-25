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

        {showResult ? (
          <ResultOverlay
            kind={result!}
            score={score}
            best={best}
            isNewRecord={isNewRecord}
            stars={stars}
            onRetry={onRetry}
            onMenu={onMenu}
            onNext={onNext}
          />
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
