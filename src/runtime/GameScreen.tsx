import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, type ComposedGesture } from 'react-native-gesture-handler';
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
 * Full-bleed canvas; HUD/overlays are a separate elevated layer above Skia.
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
    <View style={styles.root}>
      <GestureDetector gesture={playfieldGesture}>
        <View style={styles.playfield} collapsable={false}>
          <GameCanvas picture={picture} onSize={surfaceSize} />
        </View>
      </GestureDetector>

      {/*
        Elevated above opaque Skia SurfaceView. box-none so only the Pause
        Pressable (and overlays) steal touches — labels never block serve.
      */}
      <View style={styles.chrome} pointerEvents="box-none">
        <View
          style={[
            styles.hud,
            {
              paddingTop: insets.top + 16,
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
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
          ) : (
            <View style={styles.pausePlaceholder} />
          )}
        </View>

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

        {result != null ? (
          <ResultOverlay kind={result} onRetry={onRetry} />
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
  playfield: {
    flex: 1,
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
  },
  hud: {
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
  pausePlaceholder: {
    minHeight: 44,
    minWidth: 44,
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
