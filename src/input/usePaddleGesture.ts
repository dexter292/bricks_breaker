/**
 * UI-thread relative-drag + mode-gated tap-serve (PHYS-01 / PHYS-05 / D-04…D-12).
 *
 * uiPhase SharedValue map (Plan 04/05):
 *   0 = playing
 *   1 = paused
 *   2 = countdown
 *
 * simPhase SharedValue map (mirror SimPhase numeric):
 *   0 = docked
 *   1 = playing
 *   2 = won
 *   3 = lost
 *
 * Never writes paddle from finger absolute X; Resume is never a playfield tap.
 */
import { Gesture, type ComposedGesture } from 'react-native-gesture-handler';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import {
  LOGICAL_WIDTH_VU,
  PADDLE_GAIN,
  PAN_MIN_DISTANCE_PX,
  SMOOTH_ALPHA,
  TAP_MAX_DISTANCE_PX,
} from './constants';
import { shouldAcceptServeTap } from './gestureGates';
import { computeRelativePaddleX } from './paddleIntent';

/** PADDLE_WIDTH/2 — passed as arg so input never imports core (LC-05). */
const PADDLE_HALF_W = 36;

export type PaddleGestureOptions = {
  /** SharedValue 0=docked,1=playing,2=won,3=lost — mirror SimPhase numeric */
  simPhase: SharedValue<number>;
  /** SharedValue ui shell: 0=playing,1=paused,2=countdown */
  uiPhase: SharedValue<number>;
  camScale: SharedValue<number>;
  /** Initial / current absolute paddle center VU */
  initialPaddleX?: number;
};

export type PaddleGestureHandle = {
  paddleTarget: SharedValue<number>;
  launchFlag: SharedValue<number>;
  panActive: SharedValue<boolean>;
  /** Composed Race(Pan, Tap) — RNGH ComposedGesture (Gesture.Race return) */
  gesture: ComposedGesture;
};

function panModeAllowed(simPhase: number, uiPhase: number): boolean {
  'worklet';
  return (simPhase === 0 || simPhase === 1) && uiPhase === 0;
}

export function usePaddleGesture(
  options: PaddleGestureOptions,
): PaddleGestureHandle {
  const { simPhase, uiPhase, camScale, initialPaddleX } = options;
  const startX = initialPaddleX ?? 180;

  const paddleTarget = useSharedValue(startX);
  const launchFlag = useSharedValue(0);
  const panActive = useSharedValue(false);
  const anchorPaddleX = useSharedValue(startX);

  const pan = Gesture.Pan()
    .minDistance(PAN_MIN_DISTANCE_PX)
    .onBegin(() => {
      'worklet';
      if (!panModeAllowed(simPhase.value, uiPhase.value)) {
        return;
      }
      panActive.value = true;
      // Anchor from current paddle — never finger absolute X (D-04)
      anchorPaddleX.value = paddleTarget.value;
    })
    .onStart(() => {
      'worklet';
      if (!panModeAllowed(simPhase.value, uiPhase.value)) {
        return;
      }
      panActive.value = true;
      anchorPaddleX.value = paddleTarget.value;
    })
    .onUpdate((e) => {
      'worklet';
      if (!panModeAllowed(simPhase.value, uiPhase.value)) {
        return;
      }
      paddleTarget.value = computeRelativePaddleX({
        anchorPaddleX: anchorPaddleX.value,
        translationXPx: e.translationX,
        camScale: camScale.value,
        gain: PADDLE_GAIN,
        prevTarget: paddleTarget.value,
        smoothAlpha: SMOOTH_ALPHA,
        paddleHalfW: PADDLE_HALF_W,
        logicalWidth: LOGICAL_WIDTH_VU,
      });
    })
    .onFinalize(() => {
      'worklet';
      panActive.value = false;
    });

  const tap = Gesture.Tap()
    .maxDistance(TAP_MAX_DISTANCE_PX)
    .onEnd(() => {
      'worklet';
      // Docked + playing-shell gates + !panActive (D-11); no Resume here
      if (
        shouldAcceptServeTap({
          simPhaseDocked: simPhase.value === 0,
          uiPaused: uiPhase.value === 1,
          countdown: uiPhase.value === 2,
          panActive: panActive.value,
        })
      ) {
        launchFlag.value = 1;
      }
    });

  // Race: movement activates Pan and cancels Tap; stationary lift → Tap
  const gesture = Gesture.Race(pan, tap);

  return {
    paddleTarget,
    launchFlag,
    panActive,
    gesture,
  };
}
