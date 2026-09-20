import { Pressable, StyleSheet, Text, View } from 'react-native';import { GestureDetector, type ComposedGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SharedValue } from 'react-native-reanimated';
import type { SkPicture, SkSize } from '@shopify/react-native-skia';
import { GameCanvas } from '../render/GameCanvas';
import { CountdownOverlay } from './overlays/CountdownOverlay';
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
};

/**
 * Props-driven playfield + chrome + overlays.
 * Gestures composed in app/ (LC-05) — this file must not import src/input.
 * Canvas first in JSX (opaque z-order), then chrome/overlays.
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
}: GameScreenProps) {
  const insets = useSafeAreaInsets();

  const showPauseChrome = uiPhase === 'playing' && result == null;
  const showPauseOverlay = uiPhase === 'paused' && result == null;
  const showCountdown =
    uiPhase === 'countdown' && result == null && countdownNumeral != null;

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
      {/*
        GestureDetector must wrap a flex:1 host — absoluteFill under a
        zero-height detector collapses Skia Canvas (Phase 1 used flex:1 root).
      */}
      <GestureDetector gesture={playfieldGesture}>
        <View style={styles.playfield} collapsable={false}>
          <GameCanvas picture={picture} onSize={surfaceSize} />
        </View>
      </GestureDetector>

      {/* Chrome after canvas (absolute over flex playfield) */}
      <Text style={[styles.lives, { top: insets.top + 16, left: insets.left + 16 }]}>
        {`Lives · ${lives}`}
      </Text>

      {showPauseChrome ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pause game"
          onPress={onPause}
          style={[
            styles.pauseButton,
            { top: insets.top + 16, right: insets.right + 16 },
          ]}
        >
          <Text style={styles.pauseLabel}>Pause</Text>
        </Pressable>
      ) : null}

      {showServeHint && showPauseChrome ? (
        <Text
          style={[styles.serveHint, { bottom: insets.bottom + 48 }]}
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

      {result != null ? (
        <ResultOverlay kind={result} onRetry={onRetry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  playfield: {
    flex: 1,
  },
  lives: {
    position: 'absolute',
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  pauseButton: {
    position: 'absolute',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12121f',
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
    alignSelf: 'center',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
});
