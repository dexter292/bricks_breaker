import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, type ComposedGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SharedValue } from 'react-native-reanimated';
import type { SkPicture, SkSize } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { GameCanvas } from '../render/GameCanvas';
import type { ValidationIssue } from './loadLevel';
import { CountdownOverlay } from './overlays/CountdownOverlay';
import { LevelErrorOverlay } from './overlays/LevelErrorOverlay';
import { PauseOverlay } from './overlays/PauseOverlay';
import { ResultOverlay } from './overlays/ResultOverlay';

export type GameScreenUiPhase = 'playing' | 'paused' | 'countdown';

export type GameScreenProps = {
  picture: SharedValue<SkPicture>;
  surfaceSize: SharedValue<SkSize>;
  playfieldGesture: ComposedGesture;
  uiPhase: GameScreenUiPhase;
  result: null | 'win' | 'lose';
  lives: number;
  countdownNumeral: number | null;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  /** Optional docked serve hint (UI-SPEC). */
  showServeHint?: boolean;
  /** Validation failure — blocks pause/result chrome (D-13). */
  levelError?: ValidationIssue[] | null;
  /** __DEV__-only level switch control (D-11). */
  devLevelSwitch?: ReactNode;
};

/**
 * Playfield letterboxes inside the safe area (black root = bars).
 * HUD + overlays are explicitly absolute so they cannot fall to the bottom.
 */
export function GameScreen({
  picture,
  surfaceSize,
  playfieldGesture,
  uiPhase,
  result,
  lives,
  countdownNumeral,
  onPause,
  onResume,
  onRetry,
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

  const padH = Math.max(insets.left, 16);
  const padR = Math.max(insets.right, 16);

  return (
    <View style={styles.root}>
      {/* Safe-area playfield — Skia letterboxes into this box (D-03). */}
      <View
        style={[
          styles.playfieldSafe,
          {
            top: insets.top,
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
        <View
          style={[
            styles.hud,
            {
              top: insets.top + 16,
              left: padH,
              right: padR,
            },
          ]}
          pointerEvents="box-none"
        >
          <Text pointerEvents="none" style={styles.lives}>
            {`Lives · ${lives}`}
          </Text>

          {showPauseChrome ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pause game"
              onPress={onPause}
              pointerEvents="auto"
              hitSlop={8}
              style={styles.pauseButton}
            >
              <Text style={styles.pauseLabel}>Pause</Text>
            </Pressable>
          ) : null}
        </View>

        {devLevelSwitch != null ? (
          <View
            style={[
              styles.devSwitchSlot,
              { top: insets.top + 60, right: padR },
            ]}
            pointerEvents="box-none"
          >
            {devLevelSwitch}
          </View>
        ) : null}

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
          <PauseOverlay onResume={onResume} onRetry={onRetry} />
        ) : null}

        {showCountdown ? (
          <CountdownOverlay numeral={countdownNumeral} />
        ) : null}

        {showResult ? (
          <ResultOverlay kind={result!} onRetry={onRetry} />
        ) : null}

        {hasLevelError ? <LevelErrorOverlay issues={levelError!} /> : null}
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
  hud: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lives: {
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
    backgroundColor: '#12121f',
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
